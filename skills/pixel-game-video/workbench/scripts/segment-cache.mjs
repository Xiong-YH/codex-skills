// Cache only muted video. Render one full WAV, then encode audio once at final mux.
import {createHash} from 'node:crypto';
import {existsSync,lstatSync,mkdirSync,readdirSync,readFileSync,renameSync,statSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {canonical} from '../src/sourceSync.js';
const hash = x=>createHash('sha256').update(typeof x==='string'||Buffer.isBuffer(x)?x:canonical(x)).digest('hex');
const bytes = file=>hash(readFileSync(file));
export const directoryDigest = dirs => {
  const found=[];
  const walk=(p,prefix)=>{if(!existsSync(p))return;if(statSync(p).isDirectory()){
    for(const name of readdirSync(p).sort())if(!name.startsWith('.')&&!['node_modules','exports','cardpreviews'].includes(name))walk(path.join(p,name),prefix+'/'+name);
  }else found.push([prefix,bytes(p)]);};
  dirs.forEach((p,i)=>walk(p,String(i)));return hash(found);
};
export const segmentPlan = (project, dependencyHash, seconds=6) => {
  const total=Math.max(2,project.exportDurationInFrames??0,...project.tracks.filter(t=>!t.hidden).flatMap(t=>t.clips.map(c=>c.start+c.duration)));
  const step=Math.max(1,Math.round(project.fps*seconds)), result=[];
  for(let a=0;a<total;a+=step){const b=Math.min(total,a+step), selected=new Set();
    const all=project.tracks.flatMap(t=>t.clips);
    for(const t of project.tracks)if(!t.hidden)for(const c of t.clips)if(c.start<b&&c.start+c.duration>a)selected.add(c);
    // Transition links and soft-caption continuity can reach outside the current chunk.
    let changed=true;
    while(changed){changed=false;for(const c of [...selected]){
      const linked=[c.props?.outgoingShotId,c.props?.incomingShotId].filter(Boolean);
      for(const candidate of all)if(!selected.has(candidate)&&(linked.includes(candidate.props?.sourceUnitId)||
        (c.cardId==='soft-highlight-caption'&&candidate.cardId===c.cardId&&candidate.start+candidate.duration===c.start))){selected.add(candidate);changed=true;}
    }}
    const {tracks,sourceBase,source,...global}=project;
    const content=tracks.map(t=>({...t,clips:t.clips.filter(c=>selected.has(c))})).filter(t=>t.clips.length);
    result.push({a,b,key:hash(['video-segments-v1',dependencyHash,global,content,total,a,b])});
  }
  return result;
};
export const validEntry = file => {
  try{const meta=JSON.parse(readFileSync(file+'.json','utf8'));return !lstatSync(file).isSymbolicLink()&&statSync(file).size>0&&meta.sha256===bytes(file);}catch{return false;}
};
export const publishEntry = (part,file) => {
  if(lstatSync(part).isSymbolicLink()||!statSync(part).size)throw new Error('无效片段缓存');
  if(existsSync(file+'.json')&&lstatSync(file+'.json').isSymbolicLink())throw new Error('缓存元数据不能是符号链接');
  renameSync(part,file);writeFileSync(file+'.json',JSON.stringify({sha256:bytes(file)}));
};
export const renderWithSegments = async ({rootDir,project,propsFile,publicDir,browser,concurrency,output,job,run}) => {
  const {RenderInternals,renderMedia,selectComposition}=await import('@remotion/renderer');
  const {bundle}=await import('@remotion/bundler');
  const ffmpeg=RenderInternals.getExecutablePath({type:'ffmpeg',indent:false,logLevel:'error',binariesDirectory:null});
  const cache=path.join(rootDir,'.segment-cache');
  if(existsSync(cache)&&lstatSync(cache).isSymbolicLink())throw new Error('片段缓存不能是符号链接');
  mkdirSync(cache,{recursive:true});
  const dependencyPaths=[path.join(rootDir,'src'),path.join(rootDir,'proj'),path.join(rootDir,'package-lock.json'),path.resolve(rootDir,'../modules/text'),publicDir];
  const dependencies=directoryDigest(dependencyPaths);
  const version=hash([dependencies,hash(readFileSync(new URL(import.meta.url))),browser,statSync(browser).mtimeMs,concurrency]);
  const plan=segmentPlan(project,version);
  job.cache={total:plan.length,reused:0,rendered:0};
  // Freeze one compiled bundle for every chunk and the full audio pass. If the source
  // changes while compiling, reject this run instead of mixing versions in one film.
  job.phase='bundling';const bundleStarted=performance.now();
  const serveUrl=await bundle({entryPoint:path.join(rootDir,'src/remotion/index.ts'),publicDir,outDir:publicDir+'-bundle',
    onProgress:p=>{job.lastLine=`编译本次导出快照 ${p}%`;},
    webpackOverride:c=>({...c,resolve:{...c.resolve,symlinks:false,alias:{...c.resolve?.alias,'@proj':path.join(rootDir,existsSync(path.join(rootDir,'proj'))?'proj':'proj-stub')}}})});
  job.timingsMs.bundling=performance.now()-bundleStarted;
  if(directoryDigest(dependencyPaths)!==dependencies)throw new Error('编译期间源代码或素材改变，请按新版本重新导出');
  const inputProps=JSON.parse(readFileSync(propsFile,'utf8'));
  const composition=await selectComposition({serveUrl,id:'Main',inputProps,browserExecutable:browser,logLevel:'error'});
  const draw=async(outputLocation,extra,phase,base,scale)=>{
    const started=performance.now();job.phase=phase;
    try{await renderMedia({serveUrl,composition,inputProps,outputLocation,browserExecutable:browser,concurrency,
      imageFormat:'jpeg',logLevel:'error',overwrite:true,...extra,onProgress:p=>{
        job.progress=Math.max(job.progress,Math.min(.99,base+scale*p.progress));
        job.lastLine=`${phase==='audio'?'声音':'片段'} ${Math.round(p.progress*100)}%`;
      }});}finally{job.timingsMs[phase]=(job.timingsMs[phase]??0)+performance.now()-started;}
  };
  for(const [i,s] of plan.entries()){
    const file=path.join(cache,s.key+'.mp4');s.file=file;
    if(validEntry(file)){job.cache.reused++;continue;}
    const part=path.join(cache,s.key+'.part.mp4');
    if(existsSync(part)&&lstatSync(part).isSymbolicLink())throw new Error('缓存临时文件不能是符号链接');
    await draw(part,{muted:true,codec:'h264',frameRange:[s.a,s.b-1]},'segments',.85*i/plan.length,.85/plan.length);
    publishEntry(part,file);job.cache.rendered++;
  }
  // List references are generated from SHA keys, never from a user-controlled filename.
  const list=output+'.concat.txt',wav=output+'.audio.wav';
  writeFileSync(list,plan.map(s=>`file '${s.file.replace(/\\/g,'/').replace(/'/g,"'\\''")}'`).join('\n'));
  await draw(wav,{codec:'wav',enforceAudioTrack:true},'audio',.85,.1);
  await run(ffmpeg,['-y','-v','error','-f','concat','-safe','0','-i',list,'-i',wav,'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','192k','-frames:v',String(plan.at(-1).b),'-movflags','+faststart',output],job,{phase:'mux',progressBase:.95,progressScale:.04});
};
