import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {Readable,Writable} from 'node:stream';
import {mkdtempSync,realpathSync,mkdirSync,writeFileSync,readFileSync,symlinkSync,rmSync,existsSync,cpSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createExportMiddleware,parseExportRequest,renderArguments,activeVideoProject} from '../scripts/export-service.mjs';
import {excludesFromPlate,renderPropsForKind} from '../src/renderMode.js';
const clip=(cardId,start,duration,props={})=>({id:`${cardId}-${start}`,cardId,start,duration,inOffset:0,speed:1,opacity:1,scale:1,x:0,y:0,props});
const currentProject=()=>({name:'Edited Demo',fps:60,width:1920,height:1080,tracks:[{id:'captions',name:'captions',clips:[clip('proj:caption:c1',650,250,{text:'用户当前字幕'})]},{id:'shots',name:'shots',clips:[clip('proj:shot:s1',0,600,{heading:'用户当前标题'})]},{id:'sound',name:'sound',clips:[clip('audio-clip',870,30,{file:'audio/click.wav',volume:.2})]}]});
const request=(middleware,{method='POST',url='/',body,origin='http://127.0.0.1:5208'}={})=>new Promise((resolve,reject)=>{
  const req=Readable.from(body===undefined?[]:[Buffer.from(typeof body==='string'?body:JSON.stringify(body))]);
  req.method=method;req.url=url;req.headers={host:'127.0.0.1:5208','content-type':'application/json',...(origin?{origin}:{})};
  const chunks=[];
  const res=new Writable({write(chunk,encoding,next){chunks.push(Buffer.from(chunk));next();}});
  res.headers={};res.statusCode=200;res.setHeader=(key,value)=>res.headers[key.toLowerCase()]=value;
  res.once('finish',()=>{const text=Buffer.concat(chunks).toString();resolve({status:res.statusCode,headers:res.headers,text,json:()=>JSON.parse(text)});});
  res.once('error',reject);middleware(req,res);
});
const fixture=()=>{
  const base=realpathSync(mkdtempSync(path.join(tmpdir(),'pixel-export-service-')));
  const root=path.join(base,'skill/workbench'),video=path.join(base,'video');
  mkdirSync(path.join(root,'public/audio'),{recursive:true});mkdirSync(path.join(video,'build/remotion/src'),{recursive:true});mkdirSync(path.join(base,'skill/scripts'),{recursive:true});
  writeFileSync(path.join(root,'public/audio/click.wav'),'sound');writeFileSync(path.join(video,'project.json'),'{}');writeFileSync(path.join(base,'skill/scripts/video.py'),'# exporter');
  symlinkSync(path.join(video,'build/remotion/src'),path.join(root,'proj'));
  return {root,video,cleanup:()=>rmSync(base,{recursive:true,force:true})};
};
const fakeProcesses=({failExporter=false,failDependency=false}={})=>{
  const calls=[];
  const spawnProcess=(command,args,options)=>{
    calls.push({command,args,options});const child=new EventEmitter();child.stdout=new EventEmitter();child.stderr=new EventEmitter();
    process.nextTick(()=>{
      if(failDependency&&args[0]==='-c'&&args[1]==='import pyJianYingDraft'){child.stderr.emit('data',Buffer.from('ModuleNotFoundError: pyJianYingDraft\n'));child.emit('close',1);return;}
      if(args[1]==='render'){
        const props=JSON.parse(readFileSync(args.find(a=>a.startsWith('--props=')).slice(8),'utf8'));
        calls.at(-1).props=props;writeFileSync(args[4],'fake rendered video');child.stdout.emit('data',Buffer.from('Rendered 900/900\n'));
      }else if(args[1]==='export-jianying'){
        if(failExporter){child.stderr.emit('data',Buffer.from('Error: 不支持的剪映字幕卡 unknown\n'));child.emit('close',1);return;}
        const dest=args[3];mkdirSync(path.join(dest,'Resources'),{recursive:true});
        for(const name of ['draft_content.json','draft_meta_info.json','export-manifest.json'])writeFileSync(path.join(dest,name),'{}');
        cpSync(args[args.indexOf('--plate')+1],path.join(dest,'Resources/plate.mp4'));
      }else if(args[0]==='-c'&&args[1].includes('zipfile')){
        assert.ok(existsSync(path.join(args[2],'draft_content.json')));writeFileSync(args[3],'PK fake archive');
      }
      child.emit('close',0);
    });return child;
  };
  return {calls,spawnProcess};
};
const done=async(middleware,id)=>{
  for(let i=0;i<30;i++){
    const state=(await request(middleware,{method:'GET',url:`/${id}`})).json();
    if(state.status!=='running')return state;
    await new Promise(resolve=>setImmediate(resolve));
  }
  throw Error('fake export did not finish');
};
test('plate excludes caption/audio layers but preserves shot headings and the original project length',()=>{
  const p=currentProject();const props=renderPropsForKind(p,'jianying');
  assert.equal(props.project,p);assert.equal(props.renderExact,true);assert.equal(props.plate,true);
  assert.equal(props.project.tracks[0].clips[0].start+props.project.tracks[0].clips[0].duration,900);
  assert.ok(excludesFromPlate(p.tracks[0].clips[0],{}));assert.ok(excludesFromPlate(p.tracks[2].clips[0],{kind:'audio'}));
  assert.equal(excludesFromPlate(p.tracks[1].clips[0],{}),false);
  assert.equal(renderPropsForKind(p,'mp4').plate,undefined);
});
test('request never accepts a caller output path and active project must be a generated foundation project',()=>{
  assert.throws(()=>parseExportRequest(JSON.stringify({project:currentProject(),destination:'/outside'})),/输出路径/);
  assert.throws(()=>parseExportRequest(JSON.stringify({project:currentProject(),kind:'other'})),/导出类型/);
  const f=fixture();try{assert.equal(activeVideoProject(f.root),f.video);rmSync(path.join(f.root,'proj'));symlinkSync(f.root,path.join(f.root,'proj'));assert.throws(()=>activeVideoProject(f.root),/foundation/);}finally{f.cleanup();}
  assert.ok(renderArguments({output:'x',propsFile:'p',publicDir:'d',browser:'b',kind:'jianying'}).includes('--muted'));
  assert.ok(!renderArguments({output:'x',propsFile:'p',publicDir:'d',browser:'b',kind:'mp4'}).includes('--muted'));
});
test('Jianying API uses the current edited JSON, renders a muted plate, runs CLI, and returns ZIP plus paired JSON',async()=>{
  const f=fixture(),processes=fakeProcesses();try{
    const middleware=createExportMiddleware({rootDir:f.root,browserLookup:()=>'/installed/chrome',spawnProcess:processes.spawnProcess,python:'configured-python'});
    const p=currentProject();const response=await request(middleware,{body:{project:p,kind:'jianying'}});assert.equal(response.status,202);
    const state=await done(middleware,response.json().id);assert.equal(state.kind,'jianying');assert.equal(state.status,'done');assert.equal(state.progress,1);
    const render=processes.calls.find(c=>c.args[1]==='render');assert.equal(render.props.plate,true);assert.deepEqual(render.props.project,p);assert.ok(render.args.includes('--muted'));
    const exporter=processes.calls.find(c=>c.args[1]==='export-jianying');assert.equal(exporter.command,'configured-python');assert.equal(exporter.args[2],f.video);assert.ok(exporter.args[3].startsWith(path.join(f.root,'exports')));
    const zip=await request(middleware,{method:'GET',url:state.downloadUrl.replace('/api/export','')});assert.equal(zip.headers['content-type'],'application/zip');assert.match(zip.text,/^PK/);
    const snapshot=await request(middleware,{method:'GET',url:state.projectUrl.replace('/api/export','')});assert.deepEqual(snapshot.json(),p);
  }finally{f.cleanup();}
});
test('existing MP4 API path stays unmuted and returns MP4 and exact snapshot',async()=>{
  const f=fixture(),processes=fakeProcesses();try{
    const middleware=createExportMiddleware({rootDir:f.root,browserLookup:()=>'/installed/chrome',spawnProcess:processes.spawnProcess});
    const p=currentProject();const response=await request(middleware,{body:{project:p}});const state=await done(middleware,response.json().id);
    assert.equal(state.status,'done');assert.equal(state.kind,'mp4');assert.equal(processes.calls.length,1);assert.equal(processes.calls[0].props.plate,undefined);assert.ok(!processes.calls[0].args.includes('--muted'));
    const output=await request(middleware,{method:'GET',url:state.downloadUrl.replace('/api/export','')});assert.equal(output.headers['content-type'],'video/mp4');
    assert.deepEqual((await request(middleware,{method:'GET',url:state.projectUrl.replace('/api/export','')})).json(),p);
  }finally{f.cleanup();}
});
test('unsupported exporter content surfaces an error without offering an incomplete ZIP',async()=>{
  const f=fixture(),processes=fakeProcesses({failExporter:true});try{
    const middleware=createExportMiddleware({rootDir:f.root,browserLookup:()=>'/installed/chrome',spawnProcess:processes.spawnProcess});
    const response=await request(middleware,{body:{project:currentProject(),kind:'jianying'}});const state=await done(middleware,response.json().id);
    assert.equal(state.status,'error');assert.match(state.lastLine,/不支持/);assert.equal(state.downloadUrl,undefined);assert.ok(state.projectUrl);
  }finally{f.cleanup();}
});
test('export API rejects cross-origin requests and unknown job paths',async()=>{
  const f=fixture();try{
    const middleware=createExportMiddleware({rootDir:f.root,browserLookup:()=>'/installed/chrome'});
    assert.equal((await request(middleware,{body:{project:currentProject()},origin:'https://other.example'})).status,403);
    assert.equal((await request(middleware,{method:'GET',url:'/../../outside/download'})).status,404);
  }finally{f.cleanup();}
});


test('dedicated Jianying Python overrides the generic runtime and dependency guidance uses requirements file',async()=>{
  const f=fixture(),processes=fakeProcesses({failDependency:true});
  const original=process.env.PIXEL_JIANYING_PYTHON,legacy=process.env.PIXEL_PYTHON;
  try{
    process.env.PIXEL_JIANYING_PYTHON='jianying-python';process.env.PIXEL_PYTHON='generic-python';
    const middleware=createExportMiddleware({rootDir:f.root,browserLookup:()=>'/installed/chrome',spawnProcess:processes.spawnProcess});
    const response=await request(middleware,{body:{project:currentProject(),kind:'jianying'}});const state=await done(middleware,response.json().id);
    assert.equal(processes.calls[0].command,'jianying-python');assert.equal(processes.calls.length,1);
    assert.equal(state.status,'error');assert.match(state.lastLine,/PIXEL_JIANYING_PYTHON/);assert.match(state.lastLine,/requirements-jianying\.txt/);assert.doesNotMatch(state.lastLine,/0\.3\.1/);
  }finally{
    if(original===undefined)delete process.env.PIXEL_JIANYING_PYTHON;else process.env.PIXEL_JIANYING_PYTHON=original;
    if(legacy===undefined)delete process.env.PIXEL_PYTHON;else process.env.PIXEL_PYTHON=legacy;
    f.cleanup();
  }
});
