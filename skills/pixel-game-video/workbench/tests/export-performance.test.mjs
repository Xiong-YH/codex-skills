import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
import {runInNewContext} from 'node:vm';
import {resolveRenderConcurrency,updateRenderProgress} from '../scripts/render-settings.mjs';
import {createLinkedPropsResolver,resolveLinkedProps} from '../src/linkedProps.js';

test('concurrency is configurable without accepting invalid or excessive worker counts',()=>{
  assert.equal(resolveRenderConcurrency('2'),2);
  assert.equal(resolveRenderConcurrency('4'),4);
  assert.equal(resolveRenderConcurrency('6'),6);
  for(const value of ['',0,-1,1.5,'auto','4;echo',33,Infinity]) assert.throws(()=>resolveRenderConcurrency(value),/1–32/);
});

test('render estimates use rendered frame deltas and do not confuse concurrent encoding with completion',()=>{
  const job={};
  updateRenderProgress(job,'Bundling 10%',0);assert.equal(job.phase,'bundling');
  updateRenderProgress(job,'Rendered 20/100',1000);
  updateRenderProgress(job,'Encoded 10/100',1500);assert.equal(job.phase,'renderingAndEncoding');
  updateRenderProgress(job,'Rendered 60/100',3000);
  assert.equal(job.renderFps,20);assert.equal(job.renderEtaSeconds,2);
  updateRenderProgress(job,'Rendered 100/100',5000);
  updateRenderProgress(job,'Encoded 100/100',5500);
  assert.equal(job.phase,'encoding');assert.equal(job.renderEtaSeconds,undefined);
  const skippedFinalLog={renderedFrames:99,totalFrames:100};
  updateRenderProgress(skippedFinalLog,'Encoded 100/100',6000);
  assert.equal(skippedFinalLog.renderedFrames,100);assert.equal(skippedFinalLog.encodedFrames,100);
  updateRenderProgress(job,'Rendered 0/0',6000);assert.equal(job.totalFrames,100);
});

const clip=(id,start,props={})=>({id,cardId:'shot',start,duration:60,inOffset:3,speed:1.5,x:4,y:8,scale:1,opacity:1,props});
test('indexed props preserve duplicate selection, hidden references, title edges and source clocks',()=>{
  const early=clip('early',0,{sourceUnitId:'scene',heading:'early'});
  const late=clip('late',100,{sourceUnitId:'scene',heading:'late'});
  const transition=clip('transition',120,{outgoingShotId:'scene',incomingShotId:'next'});
  const incoming=clip('next',140,{sourceUnitId:'next'});
  const title={...clip('title',125,{role:'title'}),duration:3};
  const project={tracks:[{hidden:true,clips:[late,early,incoming]},{clips:[transition,title]}]};
  const resolve=createLinkedPropsResolver(project);
  for(const frame of [0,124,125,127,128,150,125])for(const current of [early,late,incoming,transition,title]) {
    assert.deepEqual(resolve(current,{frame}),resolveLinkedProps(project,current,{frame}));
  }
  assert.equal(resolve(transition,{frame:125}).heading,'late');
  assert.equal(resolve(transition,{frame:125}).hideHeading,true);
  assert.equal(resolve(transition,{frame:128}).hideHeading,false);
  assert.deepEqual(resolve(transition),resolveLinkedProps(project,transition));
  const edited={tracks:project.tracks.map(track=>({...track,clips:track.clips.map(current=>current===late?{...late,props:{...late.props,heading:'edited'}}:current)}))};
  assert.equal(createLinkedPropsResolver(edited)(transition,{frame:125}).heading,'edited');
});

test('indexed rendering does not rescan the project after its resolver has been built',()=>{
  const shot=clip('shot',0,{sourceUnitId:'scene'}),transition=clip('transition',30,{outgoingShotId:'scene'});
  const project={tracks:[{clips:[shot,transition]}]};
  const resolve=createLinkedPropsResolver(project);
  Object.defineProperty(project,'tracks',{get(){throw new Error('unexpected full timeline scan');}});
  for(let frame=0;frame<100;frame++)assert.equal(resolve(transition,{frame}).outgoingProps.sourceUnitId,'scene');
});

test('Canvas transition keeps its scene across frame/transform changes and invalidates it for scene edits',async()=>{
  const source=fileURLToPath(new URL('../../engine/remotion/src/CanvasWorkbenchUnits.tsx',import.meta.url));
  const result=await build({entryPoints:[source],bundle:true,write:false,format:'cjs',platform:'node',jsx:'transform',
    external:['react','remotion','./canvas-runtime','./workbench-payload'],logLevel:'silent'});
  const slots=[];let cursor=0,frame=0;
  const react={createElement:(component,props)=>({component,props}),useMemo:(factory,deps)=>{
    const position=cursor++,previous=slots[position];
    if(previous&&deps.every((value,index)=>Object.is(value,previous.deps[index])))return previous.value;
    const value=factory();slots[position]={deps,value};return value;
  }};
  const shot=(id,startFrame)=>({id,startFrame,endFrame:startFrame+100,durationFrames:100,params:{},components:[],motions:[],objects:[]});
  const outgoing=shot('outgoing',0),incoming=shot('incoming',100);
  incoming.motions=[{startFrame:100,endFrame:124,params:{}}];
  const payload={resolved:{project:{fps:60,width:1920,height:1080},shots:[outgoing,incoming],media:{}},assets:{},style:{}};
  const module={exports:{}};
  runInNewContext(result.outputFiles[0].text,{module,exports:module.exports,require:name=>{
    if(name==='react')return react;
    if(name==='remotion')return {useCurrentFrame:()=>frame};
    if(name==='./canvas-runtime')return {PIXEL_CANVAS_RUNTIME:{}};
    if(name==='./workbench-payload')return {WORKBENCH_PAYLOAD:payload};
    throw new Error(`Unexpected module ${name}`);
  }});
  const render=props=>{cursor=0;return module.exports.CanvasTransitionUnit(props).props.request;};
  const props={outgoingShotId:'outgoing',incomingShotId:'incoming',incomingSourceFrame:0,outgoingSourceFrame:99};
  const initial=render(props);
  frame=1;
  const advanced=render({...props,incomingSourceFrame:1,outgoingTransform:{x:20},paramsJson:'{"strength":2}'});
  assert.equal(advanced.resolved,initial.resolved);
  assert.equal(advanced.frame,101);
  assert.equal(advanced.videoFrames[100],101);
  const calls=[];advanced.draw({drawTransition:(...args)=>calls.push(args)});
  assert.equal(calls[0][2].params.strength,2);assert.equal(calls[0][3].outgoingTransform.x,20);
  const edited=render({...props,outgoingProps:{paramsJson:'{"heading":"edited"}'}});
  assert.notEqual(edited.resolved,initial.resolved);
  assert.equal(edited.resolved.shots[0].params.heading,'edited');
});
