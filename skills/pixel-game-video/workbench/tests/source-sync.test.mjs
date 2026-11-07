import test from 'node:test';
import assert from 'node:assert/strict';
import {attachSourceBaseline,planSourceUpdate,inspectEdit} from '../src/sourceSync.js';
const clip=(key,start=0)=>({sourceKey:key,id:key,cardId:'test',start,duration:120,sourceDurationInFrames:120,inOffset:0,speed:1,opacity:1,scale:1,x:0,y:0,props:{text:'before'}});
const project=()=>attachSourceBaseline({name:'Test',source:'v1',fps:60,width:1920,height:1080,tracks:[{id:'shot',role:'shot',name:'shots',clips:[clip('shot:a'),clip('shot:b',120)]}]});
test('three-way update changes untouched clips and preserves manual edits, IDs and input JSON',()=>{
  const p=project(),next=project();p.tracks[0].clips[1].props.text='manual';
  next.source='v2';next.tracks[0].clips.forEach(c=>{c.start+=10;c.props.text='new';});
  const original=JSON.stringify(p),result=planSourceUpdate(p,next);
  assert.equal(result.project.tracks[0].clips[0].start,10);
  assert.equal(result.project.tracks[0].clips[1].props.text,'manual');
  assert.equal(result.conflicts.length,1);assert.equal(result.project.source,'v1');
  assert.equal(JSON.stringify(p),original);
  const retry=planSourceUpdate(result.project,next);assert.equal(retry.applied.length,0);assert.equal(retry.conflicts.length,1);
});
test('split, hidden and deleted clips are conflicts, removed untouched units are deleted',()=>{
  for(const mutate of [p=>p.tracks[0].clips.push({...p.tracks[0].clips[0],id:'split'}),p=>p.tracks[0].hidden=true,p=>p.tracks[0].clips.shift()]){
    const p=project(),next=project();mutate(p);next.tracks[0].clips[0].duration=150;
    assert.ok(planSourceUpdate(p,next).conflicts.length);
  }
  const p=project(),next=project();next.tracks[0].clips.pop();const r=planSourceUpdate(p,next);
  assert.equal(r.project.tracks[0].clips.length,1);assert.equal(r.conflicts.length,0);
});
test('legacy and incompatible frame rates do not overwrite edits; gaps and tails are review hints',()=>{
  const p=project(),next=project();delete p.sourceBase;
  assert.equal(planSourceUpdate(p,next).applied.length,0);
  next.fps=30;assert.equal(planSourceUpdate(project(),next).applied.length,0);
  const q=project();q.tracks[0].clips[1].start=150;
  q.tracks.push({id:'caption',role:'caption',name:'caption',clips:[{...clip('caption:a'),duration:30}]});
  assert.deepEqual(inspectEdit(q).map(i=>i.kind),['tail','gap']);
});
test('new caption lanes preserve source layer order above shots',()=>{
  const p=project(),next=project();next.tracks.unshift({id:'caption',role:'caption',name:'captions',clips:[clip('caption:new')]});
  const r=planSourceUpdate(p,next);assert.equal(r.conflicts.length,0);assert.equal(r.project.tracks[0].role,'caption');
});
test('runtime-only source version can be explicitly acknowledged without replacing clips',()=>{
  const p=project(),next=project();next.source='v2';const r=planSourceUpdate(p,next);
  assert.deepEqual(r.applied,['source-version']);assert.equal(r.project.source,'v2');assert.deepEqual(r.project.tracks,p.tracks);
});
