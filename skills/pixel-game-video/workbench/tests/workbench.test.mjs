import test from 'node:test';
import assert from 'node:assert/strict';
import {parseProjectJson, validateProject, MAX_PROJECT_BYTES} from '../src/projectValidation.js';
import {resolveLinkedProps,titleActiveAt} from '../src/linkedProps.js';
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
  assert.deepEqual(resolveLinkedProps(original,transition),{outgoingShotId:'opening',heading:'新标题',label1:'新标签',titleFontSize:62,titleX:18,accent:'#ff00aa',outgoingProps:source.props,outgoingTransform:{x:0,y:0,scale:1,opacity:1}});
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

test('title cues import on their own lane; one-frame tail units stay one frame and audio never extends the film',()=>{
  const component=()=>null;
  const m={name:'tail',fps:60,width:1920,height:1080,total:300,
    shots:[{id:'scene',from:0,duration:300,component}],
    captions:[{id:'title',from:10,duration:50,component,props:{role:'title',text:'标题'}},
      {id:'sub',from:299,duration:1,component,props:{role:'caption',text:'尾字幕'}}],
    sfx:[{from:299,duration:20,src:'audio/tail.wav',volume:1},{from:300,duration:30,src:'audio/past.wav',volume:1}]};
  const p=buildProjectFromManifest(m);
  assert.equal(p.tracks.find(t=>t.role==='title').clips[0].props.text,'标题');
  assert.equal(p.tracks.find(t=>t.role==='caption').clips[0].duration,1);
  const sounds=p.tracks.filter(t=>t.role==='sfx').flatMap(t=>t.clips);
  assert.equal(sounds.length,1);assert.equal(sounds[0].duration,1);
  assert.equal(titleActiveAt(p,10),true);assert.equal(titleActiveAt(p,60),false);
  assert.equal(Math.max(...p.tracks.flatMap(t=>t.clips.map(c=>c.start+c.duration))),300);
});

test('transitions resolve edited JSON, transforms and source clocks independently from their own timing',()=>{
  const outgoing={...clip({sourceUnitId:'old',paramsJson:'{"count":4}',actor:null}),id:'old',start:10,duration:100,sourceDurationInFrames:80,inOffset:12,speed:2,x:34,scale:1.2};
  const incoming={...clip({sourceUnitId:'next',backgroundJson:'{"color":"#123456"}',actor:'hero'}),id:'next',start:100,duration:100,sourceDurationInFrames:100,inOffset:5,speed:.5};
  const transition={...clip({outgoingShotId:'old',incomingShotId:'next',paramsJson:'{"tiles":24}'}),id:'transition',start:90,duration:30};
  const title={...clip({role:'title',text:'独立标题'}),cardId:'proj:caption:title',id:'title',start:95,duration:15};
  const p=project([outgoing,incoming,transition,title]);
  const resolved=resolveLinkedProps(p,transition,{frame:104});
  assert.equal(resolved.paramsJson,'{"tiles":24}');
  assert.equal(resolved.outgoingProps.paramsJson,'{"count":4}');
  assert.equal(resolved.incomingProps.backgroundJson,'{"color":"#123456"}');
  assert.equal(resolved.outgoingProps.actor,null);assert.equal(resolved.incomingProps.actor,'hero');
  assert.equal(resolved.outgoingSourceFrame,79);assert.equal(resolved.incomingSourceFrame,7);
  assert.deepEqual(resolved.outgoingTransform,{x:34,y:0,scale:1.2,opacity:1});
  assert.equal(resolved.hideHeading,true);
  title.start=120;
  assert.equal(resolveLinkedProps(p,outgoing,{frame:104}).hideHeading,false,'moving title restores the native scene heading');
  p.tracks.push({id:'hidden-title',name:'hidden',hidden:true,clips:[{...title,id:'hidden-title',start:100}]});
  assert.equal(resolveLinkedProps(p,outgoing,{frame:104}).hideHeading,false,'hidden title never masks the shot');
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

test('adding media without an explicit target creates independent music, narration and overlapping effect lanes',()=>{
  const s=useStore.getState();
  s.addClip('audio-clip',undefined,20,{props:{file:'audio/sfx/a.wav',volume:.3}});
  s.addClip('audio-clip',undefined,25,{props:{file:'audio/sfx/b.wav',volume:.4}});
  s.addClip('audio-clip',undefined,0,{props:{file:'audio/bgm/music.wav',volume:.2}});
  s.addClip('audio-clip',undefined,0,{props:{file:'audio/narration/voice.wav',volume:.7}});
  const audio=useStore.getState().project.tracks.filter(t=>['sfx','bgm','narration'].includes(t.role));
  assert.deepEqual(audio.map(t=>t.role),['sfx','sfx','bgm','narration']);
  assert.deepEqual(audio.map(t=>t.clips[0].props.volume),[.3,.4,.2,.7]);
  const effect=audio[0].clips[0],music=audio[2].clips[0];
  s.updateClip(effect.id,{start:80,duration:20});s.updateClipProps(effect.id,{volume:.1});
  assert.deepEqual(useStore.getState().project.tracks.find(t=>t.id===audio[2].id).clips[0],music,'effect editing must leave music untouched');
  assert.equal(parseProjectJson(JSON.stringify(useStore.getState().project)).tracks.find(t=>t.id===audio[0].id).clips[0].start,80);
});

const utilitiesBundleFile=new URL('./.bundle-card-utilities.mjs',import.meta.url);
await build({entryPoints:[fileURLToPath(new URL('./fixtures/card-utils.ts',import.meta.url))],outfile:fileURLToPath(utilitiesBundleFile),bundle:true,format:'esm',platform:'node',packages:'external',logLevel:'silent'});
const {defaultsOf,zodFromCard,projectEndFrame,projectDuration,projectForTrackExport}=await import(utilitiesBundleFile.href);
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

test('each track exports at its absolute time over full-film duration with every other lane hidden',()=>{
  const p=project([{...clip({sourceUnitId:'shot',paramsJson:'{"value":2}'}),id:'shot',duration:900}]);
  p.tracks.push({id:'transition',name:'转场',role:'transition',clips:[{...clip({outgoingShotId:'shot'}),id:'turn',start:300,duration:20}]});
  p.tracks.push({id:'caption',name:'字幕',role:'caption',clips:[{...clip({text:'新字幕'}),id:'sub',start:200,duration:90}]});
  p.tracks.push({id:'sound',name:'音效',role:'sfx',clips:[{...clip({file:'audio/sfx/click.wav',volume:.2}),cardId:'audio-clip',id:'sfx',start:320,duration:20}]});
  p.tracks.push({id:'music',name:'配乐',role:'bgm',clips:[{...clip({file:'audio/bgm/music.wav',volume:.1}),cardId:'audio-clip',id:'bgm',duration:900}]});
  for(const target of p.tracks){
    const solo=projectForTrackExport(p,target.id);
    assert.equal(projectEndFrame(solo),900);
    assert.deepEqual(solo.tracks.filter(t=>!t.hidden).map(t=>t.id),[target.id]);
    assert.deepEqual(solo.tracks.find(t=>t.id===target.id).clips,target.clips);
    assert.deepEqual(parseProjectJson(JSON.stringify(solo)),solo);
  }
  const transition=projectForTrackExport(p,'transition');
  assert.equal(resolveLinkedProps(transition,transition.tracks[1].clips[0],{frame:305}).outgoingProps.paramsJson,'{"value":2}','hidden scene references still feed solo transition');
  assert.equal(p.tracks.some(t=>t.hidden),false,'solo export never mutates the working edit');
  assert.throws(()=>projectForTrackExport(p,'missing'),/没有可导出/);
});
