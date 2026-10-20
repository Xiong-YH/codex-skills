import test from 'node:test';
import assert from 'node:assert/strict';
import {parseProjectJson, validateProject, MAX_PROJECT_BYTES} from '../src/projectValidation.js';
import {resolveLinkedProps} from '../src/linkedProps.js';
const clip = (props = {}) => ({id:'c1',cardId:'shot',start:0,duration:180,inOffset:0,speed:1,opacity:1,scale:1,x:0,y:0,props});
const project = (clips = [clip()]) => ({name:'Demo',fps:60,width:1920,height:1080,tracks:[{id:'t1',name:'shots',clips}]});
test('saved JSON retains edited text, clip timing and independent sound properties', () => {
  const p = project([clip({heading:'修改后的文案'}),{...clip({file:'audio/seat.wav',volume:.2}),id:'sfx',cardId:'audio-clip',start:71,duration:40}]);
  assert.deepEqual(parseProjectJson(JSON.stringify(p),{shot:{},'audio-clip':{}}),p);
});
test('rejects oversized, malformed, unknown-card and invalid-time project JSON', () => {
  assert.throws(() => parseProjectJson(' '.repeat(MAX_PROJECT_BYTES + 1)), /5 MB/);
  assert.throws(() => parseProjectJson('{'), SyntaxError);
  assert.throws(() => validateProject(project(),{}), /没有组件/);
  assert.throws(() => validateProject(project([{...clip(),speed:0}])), /播放速度/);
  assert.throws(() => validateProject(project([{...clip(),duration:Infinity}])), /持续帧数/);
});
test('media files must stay in public relative namespace', () => {
  for(const file of ['../secrets.txt','/private/file','https://example.test/a.wav','audio/../../secret']) {
    assert.throws(() => validateProject(project([{...clip({file}),cardId:'audio-clip'}])), /相对路径/);
  }
  assert.doesNotThrow(() => validateProject(project([{...clip({file:'sfx/select.wav'}),cardId:'audio-clip'}])));
});
test('linked transition text follows source edits while retaining transition parameters', () => {
  const source = clip({sourceUnitId:'opening',heading:'新标题',label1:'新标签',titleFontSize:62,titleX:18,accent:'#00aa00'});
  const transition={...clip({outgoingShotId:'opening',heading:'旧标题',label1:'旧标签',accent:'#ff00aa'}),id:'turn',start:175};
  const original=project([source,transition]);
  assert.deepEqual(resolveLinkedProps(original,transition),{outgoingShotId:'opening',heading:'新标题',label1:'新标签',titleFontSize:62,titleX:18,accent:'#ff00aa'});
  assert.equal(transition.props.heading,'旧标题');
});
test('missing outgoing shot keeps snapshot; duplicated shot chooses closest preceding copy', () => {
  const transition={...clip({outgoingShotId:'opening',heading:'snapshot'}),id:'turn',start:300};
  assert.equal(resolveLinkedProps(project([transition]),transition).heading,'snapshot');
  const a=clip({sourceUnitId:'opening',heading:'first'});
  const b={...clip({sourceUnitId:'opening',heading:'second'}),id:'copy',start:200};
  assert.equal(resolveLinkedProps(project([a,b,transition]),transition).heading,'second');
});

// Bundle the production importer (type-only imports removed), then execute it with real data.
const {build} = await import('esbuild');
const {fileURLToPath} = await import('node:url');
const {unlinkSync} = await import('node:fs');
const importerFile = new URL('./.bundle-importer.mjs', import.meta.url);
await build({entryPoints:[fileURLToPath(new URL('../src/projectImport.ts',import.meta.url))],outfile:fileURLToPath(importerFile),bundle:true,format:'esm',platform:'node',packages:'external',logLevel:'silent'});
const {buildProjectFromManifest} = await import(importerFile.href);
unlinkSync(importerFile);
test('manifest import preserves 60fps timing, visual layers and independent overlapping sounds', () => {
  const component=()=>null;
  const m={name:'15s',fps:60,width:1920,height:1080,total:900,background:'#121212',
    shots:[{id:'a',from:0,duration:300,component,props:{heading:'标题'}},{id:'b',from:300,duration:600,component,props:{heading:'第二幕'}}],
    captions:[{id:'sub',from:20,duration:280,component,props:{text:'字幕'}}],
    transitions:[{id:'wipe',from:290,duration:20,component}],
    sfx:[{from:40,duration:90,src:'audio/select.wav',volume:.2},{from:50,duration:90,src:'audio/reward.wav',volume:.3}],
  };
  const p=buildProjectFromManifest(m);
  assert.equal(p.fps,60);
  const shots=p.tracks.find(t=>t.clips.some(c=>c.props.heading));
  assert.deepEqual(shots.clips.map(c=>[c.start,c.duration,c.speed]),[[0,300,1],[300,600,1]]);
  const audio=p.tracks.filter(t=>t.clips.some(c=>c.cardId==='audio-clip'));
  assert.equal(audio.length,2,'overlapping cues need independently editable lanes');
  assert.deepEqual(audio.map(t=>t.clips[0].props.volume),[.2,.3]);
  assert.match(p.tracks[0].clips[0].cardId,/^proj:transition:/);
  assert.match(p.tracks[1].clips[0].cardId,/^proj:caption:/);
  assert.doesNotThrow(()=>validateProject(p));
});

test('narration, music and effects import as independently editable tracks', () => {
  const m={name:'speech',fps:60,width:1920,height:1080,total:1800,shots:[],
    narration:[{from:24,duration:1663,src:'audio/narration/voice.wav',volume:1}],
    bgm:[{from:0,duration:1800,src:'audio/bgm/music.wav',volume:1}],
    sfx:[{from:100,duration:30,src:'audio/sfx/select.wav',volume:1}]};
  const p=buildProjectFromManifest(m);
  assert.equal(p.tracks.length,3);
  assert.deepEqual(p.tracks.map(t=>t.clips[0].props.file),
    ['audio/narration/voice.wav','audio/bgm/music.wav','audio/sfx/select.wav']);
  assert.deepEqual(p.tracks.map(t=>t.clips[0].start),[24,0,100]);
  const changed=buildProjectFromManifest({...m,narration:[{...m.narration[0],from:25}]});
  assert.notEqual(changed.source,p.source,'unversioned narration edits must change manifest identity');
});

// Exercise the real library -> registry -> store.addClip path with browser storage isolated in Node.
const fixture = fileURLToPath(new URL('./fixtures/workbench.ts', import.meta.url));
const storeBundleFile = new URL('./.bundle-library-store.mjs', import.meta.url);
await build({entryPoints:[fileURLToPath(new URL('../src/store.ts',import.meta.url))],outfile:fileURLToPath(storeBundleFile),bundle:true,format:'esm',platform:'node',packages:'external',logLevel:'silent',plugins:[{
  name:'fixture-manifest', setup(builder){builder.onResolve({filter:/^@proj\/workbench$/},()=>({path:fixture}));},
}]});
const stored = new Map();
globalThis.localStorage={getItem:key=>stored.get(key)??null,setItem:(key,value)=>stored.set(key,value)};
globalThis.window={location:{search:'?import=project',pathname:'/'},history:{replaceState(){}},addEventListener(){}};
globalThis.document={addEventListener(){},visibilityState:'visible'};
const {useStore} = await import(storeBundleFile.href);
unlinkSync(storeBundleFile);
test('dragging third scene and caption from library preserves fixed source selectors and complete defaults', () => {
  const track = useStore.getState().project.tracks.find(t=>t.clips.some(c=>c.cardId==='proj:shot:s3'));
  useStore.getState().addClip('proj:shot:s3',track.id,900,{props:{heading:'New third shot'}});
  const third=useStore.getState().project.tracks.flatMap(t=>t.clips).find(c=>c.start===900);
  assert.equal(third.props.shotIndex,2);
  assert.equal(third.props.sourceUnitId,'s3');
  assert.equal(third.props.heading,'New third shot');
  assert.equal(third.duration,300);
  assert.equal(third.speed,1);
  useStore.getState().addClip('proj:caption:c3',track.id,1200);
  const caption=useStore.getState().project.tracks.flatMap(t=>t.clips).find(c=>c.start===1200);
  assert.equal(caption.props.cueIndex,2);
  assert.equal(caption.props.motionIndex,12);
  assert.equal(caption.props.heading,'Caption 3');
  assert.doesNotThrow(()=>validateProject(useStore.getState().project));
});

const utilitiesBundleFile=new URL('./.bundle-card-utilities.mjs',import.meta.url);
await build({entryPoints:[fileURLToPath(new URL('./fixtures/card-utils.ts',import.meta.url))],outfile:fileURLToPath(utilitiesBundleFile),bundle:true,format:'esm',platform:'node',packages:'external',logLevel:'silent'});
const {defaultsOf,zodFromCard,projectEndFrame,projectDuration}=await import(utilitiesBundleFile.href);
unlinkSync(utilitiesBundleFile);
test('card preview defaults and Studio parsing retain fixed selectors outside schema',()=>{
  const card={schema:[{type:'textarea',key:'heading',label:'文案',default:'fallback'}],initialProps:{heading:'Third shot',shotIndex:2,sourceUnitId:'s3',cueIndex:2,motionIndex:12,outgoingShotId:'s2'}};
  assert.deepEqual(defaultsOf(card),card.initialProps);
  assert.deepEqual(zodFromCard(card).parse(defaultsOf(card)),card.initialProps);
});
test('hidden trailing scene or sound does not extend exported content; editing lanes retain space',()=>{
  const p=project([{...clip(),duration:300}]);
  p.tracks.push({id:'hidden-shot',name:'hidden',hidden:true,clips:[{...clip(),id:'hidden',start:600,duration:300}]});
  p.tracks.push({id:'hidden-sound',name:'hidden sound',hidden:true,clips:[{...clip({file:'audio/select.wav'}),id:'sound',cardId:'audio-clip',start:880,duration:90}]});
  assert.equal(projectEndFrame(p),300);
  assert.equal(projectDuration(p),1030);
});
