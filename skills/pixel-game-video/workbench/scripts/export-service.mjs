// Local-only export service, adapted from video-shotcraft Workbench; Apache-2.0. Modified 2026-10-21.
import {cpSync,createReadStream,existsSync,lstatSync,mkdirSync,readdirSync,realpathSync,rmSync,statSync,writeFileSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import {spawn} from 'node:child_process';
import path from 'node:path';
import {MAX_PROJECT_BYTES,validateProject} from '../src/projectValidation.js';
import {renderPropsForKind} from '../src/renderMode.js';

export const installedBrowser = () => {
  const candidates=process.env.PIXEL_BROWSER_EXECUTABLE?[process.env.PIXEL_BROWSER_EXECUTABLE]:[
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser',
    ...(process.platform==='win32'?[`${process.env.PROGRAMFILES}/Google/Chrome/Application/chrome.exe`]:[]),
  ];
  return candidates.find(p=>p&&existsSync(p));
};
export const parseExportRequest = raw => {
  const body=JSON.parse(raw);
  if(!body||typeof body!=='object'||Object.keys(body).some(k=>!['project','kind'].includes(k)))throw new Error('仅接受 project/kind；输出路径由工作台生成');
  const kind=body.kind??'mp4';
  if(!['mp4','jianying'].includes(kind))throw new Error('不支持的导出类型');
  return {project:validateProject(body.project),kind};
};
/** Only the active generated foundation project is eligible; no API argument can choose a path. */
export const activeVideoProject = rootDir => {
  const source=realpathSync(path.join(rootDir,'proj'));
  const remotion=path.dirname(source),build=path.dirname(remotion),video=path.dirname(build);
  if(path.basename(source)!=='src'||path.basename(remotion)!=='remotion'||path.basename(build)!=='build'||!existsSync(path.join(video,'project.json')))
    throw new Error('剪映导出需要已接入的 foundation 生成工程（PROJECT/build/remotion/src）');
  return video;
};
export const renderArguments = ({output,propsFile,publicDir,browser,kind}) => [
  'render','src/remotion/index.ts','Main',output,`--props=${propsFile}`,`--public-dir=${publicDir}`,`--browser-executable=${browser}`,'--log=info',
  ...(kind==='jianying'?['--muted']:[]),
];
const ZIP_SCRIPT=`from pathlib import Path
import sys, zipfile
base=Path(sys.argv[1]); output=Path(sys.argv[2])
items=sorted(base.rglob('*'))
if any(p.is_symlink() for p in items): raise ValueError('draft contains symbolic links')
with zipfile.ZipFile(output,'w',compression=zipfile.ZIP_DEFLATED) as archive:
 for p in items:
  if p.is_file(): archive.write(p, str(Path(base.name)/p.relative_to(base)))
`;
const safeName = name => name.replace(/[^\w一-龥·-]+/g,'_').slice(0,40)||'video';

/** spawnProcess is injected by tests; all process arguments come from validated data or server paths. */
export const createExportMiddleware = ({rootDir,browserLookup=installedBrowser,spawnProcess=spawn,python=process.env.PIXEL_JIANYING_PYTHON||process.env.PIXEL_PYTHON||'python3'}) => {
  const jobs=new Map();
  const outDir=path.join(rootDir,'exports');
  if(existsSync(outDir)&&lstatSync(outDir).isSymbolicLink())throw new Error('exports 不能是符号链接');
  mkdirSync(outDir,{recursive:true});
  for(const f of readdirSync(outDir))if(/^\.props-[a-f0-9]+\.json$/.test(f))rmSync(path.join(outDir,f),{force:true});
  const runCommand=(command,args,job,{progressBase=0,progressScale=.99}={})=>new Promise((resolve,reject)=>{
    const child=spawnProcess(command,args,{cwd:rootDir,env:{...process.env}});
    const onChunk=chunk=>{for(const line of chunk.toString().replace(/\x1b\[[0-9;]*[A-Za-z]/g,'').split(/[\r\n]+/).filter(Boolean)){
      job.lastLine=line.trim();job.logTail=[...job.logTail,line.trim()].slice(-60);
      const m=[...line.matchAll(/(\d+)\/(\d+)/g)].pop();
      if(m&&Number(m[2])>0)job.progress=Math.min(.99,progressBase+progressScale*Number(m[1])/Number(m[2]));
    }};
    child.stdout?.on('data',onChunk);child.stderr?.on('data',onChunk);
    child.once('error',reject);
    child.once('close',code=>code===0?resolve():reject(new Error(job.logTail.findLast?.(l=>/Error|错误|缺少|不支持|依赖/.test(l))??`${command} 退出码 ${code}：${job.lastLine}`)));
  });
  const runJob=async(job,project,{propsFile,renderPublic,plate,video,script,draftDir})=>{
    try{
      writeFileSync(propsFile,JSON.stringify(renderPropsForKind(project,job.kind)));
      writeFileSync(path.join(rootDir,job.projectOutput),JSON.stringify(project,null,2));
      if(job.kind==='jianying'){
        job.lastLine='检查剪映导出依赖…';
        try{await runCommand(python,['-c','import pyJianYingDraft'],job);}catch(error){throw new Error(`剪映导出依赖不可用：请设置 PIXEL_JIANYING_PYTHON，并在该 Python 环境安装 requirements-jianying.txt 中的依赖。${error.message}`);}
      }
      job.lastLine=job.kind==='jianying'?'渲染无字幕、无音频底片…':'同步静态素材…';
      mkdirSync(renderPublic,{recursive:true});
      if(existsSync(path.join(rootDir,'public')))for(const name of readdirSync(path.join(rootDir,'public'))){
        if(name==='cardpreviews'||name.startsWith('.'))continue;
        cpSync(path.join(rootDir,'public',name),path.join(renderPublic,name),{recursive:true,dereference:true});
      }
      const renderer=path.join(rootDir,'node_modules','@remotion','cli','remotion-cli.js');
      const renderedOutput=job.kind==='jianying'?plate:path.join(rootDir,job.output);
      await runCommand(process.execPath,[renderer,...renderArguments({output:renderedOutput,propsFile,publicDir:renderPublic,browser:job.browser,kind:job.kind})],job,{progressScale:job.kind==='jianying'?.8:.99});
      if(!existsSync(renderedOutput))throw new Error('渲染进程结束，但没有生成视频文件');
      if(job.kind==='jianying'){
        job.progress=.82;job.lastLine='生成原生剪映草稿…';
        await runCommand(python,[script,'export-jianying',video,draftDir,'--plate',plate,'--workbench-project',path.join(rootDir,job.projectOutput)],job,{progressBase:.82,progressScale:.12});
        for(const required of ['draft_content.json','draft_meta_info.json','export-manifest.json'])if(!existsSync(path.join(draftDir,required)))throw new Error(`剪映导出不完整：缺少 ${required}`);
        cpSync(path.join(rootDir,job.projectOutput),path.join(draftDir,path.basename(job.projectOutput)));
        job.progress=.96;job.lastLine='打包剪映草稿 ZIP…';
        await runCommand(python,['-c',ZIP_SCRIPT,draftDir,path.join(rootDir,job.output)],job,{progressBase:.96,progressScale:.03});
        rmSync(plate,{force:true});
      }
      if(!existsSync(path.join(rootDir,job.output)))throw new Error('导出进程结束，但没有生成可下载文件');
      job.status='done';job.progress=1;job.lastLine=job.kind==='jianying'?'剪映草稿导出完成':'导出完成';
    }catch(error){job.status='error';job.lastLine=error instanceof Error?error.message:String(error);}
    finally{rmSync(propsFile,{force:true});rmSync(renderPublic,{recursive:true,force:true});}
  };
  return (req,res)=>{
    const send=(code,body)=>{res.statusCode=code;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(body));};
    const origin=req.headers.origin;
    if(origin){try{const u=new URL(origin);if(!['127.0.0.1','localhost','[::1]'].includes(u.hostname)||u.host!==req.headers.host){send(403,{error:'仅允许工作台同源请求'});return;}}catch{send(403,{error:'Origin 无效'});return;}}
    const sub=(req.url??'/').split('?')[0];
    if(req.method==='POST'&&(sub==='/'||sub==='')){
      if(req.headers['content-type']?.split(';')[0]!=='application/json'){send(415,{error:'请使用 application/json'});return;}
      const chunks=[];let bytes=0,rejected=false;
      req.on('data',chunk=>{bytes+=chunk.length;if(bytes>MAX_PROJECT_BYTES){if(!rejected)send(413,{error:'工程 JSON 超过 5 MB'});rejected=true;}else chunks.push(chunk);});
      req.on('end',()=>{
        if(rejected)return;
        if([...jobs.values()].some(j=>j.status==='running')){send(409,{error:'已有导出在进行中'});return;}
        let project,kind,video,script;
        try{({project,kind}=parseExportRequest(Buffer.concat(chunks).toString('utf8')));
          if(kind==='jianying'){video=activeVideoProject(rootDir);script=path.resolve(rootDir,'../scripts/video.py');if(!existsSync(script))throw new Error('缺少剪映导出 CLI，请更新完整 pixel-game-video skill');}
        }catch(error){send(400,{error:error.message});return;}
        const browser=browserLookup();if(!browser){send(400,{error:'没有找到已安装 Chrome。请设置 PIXEL_BROWSER_EXECUTABLE 后重新启动工作台。不会自动下载浏览器。'});return;}
        const id=randomBytes(12).toString('hex'),stem=`${safeName(project.name)}-${id}${kind==='jianying'?'-jianying':''}`;
        const output=`exports/${stem}.${kind==='jianying'?'zip':'mp4'}`;
        const job={kind,status:'running',progress:0,output,projectOutput:`exports/${stem}.project.json`,lastLine:'准备导出…',logTail:[],browser};
        jobs.set(id,job);send(202,{id,kind});
        void runJob(job,project,{propsFile:path.join(outDir,`.props-${id}.json`),renderPublic:path.join(rootDir,'.render-public',id),plate:path.join(outDir,`${stem}.plate.mp4`),video,script,draftDir:path.join(outDir,stem)});
      });
      req.on('error',()=>{if(!rejected&&!res.writableEnded)send(400,{error:'上传中断'});});return;
    }
    const match=sub.match(/^\/([a-f0-9]+)(\/(download|project|reveal))?$/),job=match?jobs.get(match[1]):undefined;
    if(!job){send(404,{error:'任务不存在（工作台可能已重新启动）'});return;}
    const attachment=(relative,mime)=>{const file=path.join(rootDir,relative);if(!existsSync(file)){send(404,{error:'导出文件已移走'});return;}
      res.setHeader('Content-Type',mime);res.setHeader('Content-Length',statSync(file).size);res.setHeader('Content-Disposition',`attachment; filename*=UTF-8''${encodeURIComponent(path.basename(file))}`);createReadStream(file).pipe(res);};
    if(match[3]==='project'&&req.method==='GET'){attachment(job.projectOutput,'application/json');return;}
    if(match[3]==='download'&&req.method==='GET'){if(job.status!=='done'){send(409,{error:'导出尚未完成'});return;}attachment(job.output,job.kind==='jianying'?'application/zip':'video/mp4');return;}
    if(match[3]==='reveal'&&req.method==='POST'){if(job.status!=='done'){send(409,{error:'导出尚未完成'});return;}if(process.platform==='darwin')spawnProcess('open',['-R',path.join(rootDir,job.output)]);send(200,{ok:true});return;}
    if(req.method!=='GET'){send(405,{error:'不支持此操作'});return;}
    const {browser,...publicJob}=job;
    send(200,{...publicJob,downloadUrl:job.status==='done'?`/api/export/${match[1]}/download`:undefined,projectUrl:existsSync(path.join(rootDir,job.projectOutput))?`/api/export/${match[1]}/project`:undefined});
  };
};
