import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {segmentPlan,publishEntry,validEntry} from '../scripts/segment-cache.mjs';
import {analyzeGray} from '../scripts/media-check.mjs';
const clip=(id,start,props={})=>({id,cardId:'test',start,duration:180,props});
const project=()=>({name:'T',fps:30,width:320,height:180,tracks:[{id:'s',role:'shot',clips:[clip('a',0),clip('b',180)]}]});
test('editing one segment reuses other keys, dependencies and timeline length invalidate safely',()=>{
  const p=project(),before=segmentPlan(p,'code');p.tracks[0].clips[1].props.text='changed';
  const after=segmentPlan(p,'code');assert.equal(before[0].key,after[0].key);assert.notEqual(before[1].key,after[1].key);
  assert.notEqual(after[0].key,segmentPlan(p,'changed code')[0].key);
  p.tracks[0].clips[1].duration++;assert.notEqual(after[0].key,segmentPlan(p,'code')[0].key);
});
test('transitions include hidden source dependencies beyond the segment range',()=>{
  const p=project();p.tracks[0].clips[0].props.sourceUnitId='a';
  p.tracks.push({id:'t',role:'transition',clips:[clip('turn',180,{outgoingShotId:'a'})]});
  const before=segmentPlan(p,'code');p.tracks[0].clips[0].props.text='changed';
  assert.notEqual(before[1].key,segmentPlan(p,'code')[1].key);
});
test('corrupt or incomplete cached files are never reused',()=>{
  const root=mkdtempSync(path.join(tmpdir(),'segment-cache-test-'));
  try{const part=path.join(root,'part'),file=path.join(root,'cache.mp4');writeFileSync(part,'frame bytes');
    assert.equal(validEntry(file),false);publishEntry(part,file);assert.equal(validEntry(file),true);
    writeFileSync(file,'corrupt');assert.equal(validEntry(file),false);
  }finally{rmSync(root,{recursive:true,force:true});}
});
test('flat and still frames report review hints without claiming visual approval',()=>{
  const r=analyzeGray(Buffer.alloc(160*90*10),160,90);assert.equal(r.sampledFrames,10);
  assert.ok(r.issues.some(i=>i.kind==='long-still'));assert.ok(r.issues.every(i=>i.level==='review'));
});
