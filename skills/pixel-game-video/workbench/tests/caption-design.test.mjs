import test from 'node:test';
import assert from 'node:assert/strict';
import {validateCaptionDesign,applySoftCaptionDesign,previousCaptionText} from '../src/captionDesign.js';
import {parseExportRequest} from '../scripts/export-service.mjs';
import {measureSoftCaption} from '../../modules/text/soft-highlight.mjs';
const c=(id='c1',start=0,text='先保存一个版本。')=>({id,cardId:'proj:caption:original',start,duration:30,inOffset:0,speed:1,opacity:1,scale:1,x:0,y:0,props:{text},label:id});
const project=()=>({name:'Caption',width:1920,height:1080,fps:30,tracks:[{id:'captions',name:'字幕',role:'caption',clips:[c(),c('c2',30,'再继续修改。')]}]});
test('MP4 API rejects missing choice and mismatched actual caption cards',()=>{
  const p=project();assert.throws(()=>parseExportRequest(JSON.stringify({project:p})),/尚未选择/);
  p.captionDesign={mode:'soft-highlight'};assert.throws(()=>parseExportRequest(JSON.stringify({project:p})),/实际组件不符/);
  const migrated=applySoftCaptionDesign(p);assert.doesNotThrow(()=>parseExportRequest(JSON.stringify({project:migrated})));
  migrated.tracks[0].clips[1].cardId='proj:caption:plain';assert.throws(()=>validateCaptionDesign(migrated),/c2/);
});
test('custom choice requires an actual reason; hidden lanes and titles do not block other track exports',()=>{
  const p=project();p.captionDesign={mode:'custom',reason:''};assert.throws(()=>validateCaptionDesign(p),/原因/);
  p.captionDesign.reason='本片采用画面大字解释对比';assert.doesNotThrow(()=>validateCaptionDesign(p));
  delete p.captionDesign;p.tracks[0].hidden=true;assert.doesNotThrow(()=>validateCaptionDesign(p));
  p.tracks[0].hidden=false;
  for(const role of ['title','annotation','label']){
    p.tracks[0].clips.forEach(c=>c.props.role=role);assert.doesNotThrow(()=>validateCaptionDesign(p));
    assert.deepEqual(applySoftCaptionDesign(p).tracks[0],p.tracks[0]);
  }
});
test('conversion preserves text, timing and transforms without silently inventing emphasis',()=>{
  const p=project(),before=structuredClone(p),m=applySoftCaptionDesign(p);
  assert.deepEqual(p,before);
  for(let i=0;i<2;i++){
    const a=p.tracks[0].clips[i],b=m.tracks[0].clips[i];
    assert.deepEqual({...b,cardId:a.cardId,props:a.props},a);
    assert.equal(b.props.text,a.props.text);assert.equal(b.props.keywords,'');assert.equal(b.props.emphasis,'none');
  }
  p.tracks[0].clips[0].props={};assert.throws(()=>applySoftCaptionDesign(p),/缺少/);
});
test('adjacent caption plate follows edits and never bridges a real subtitle gap',()=>{
  const p=applySoftCaptionDesign(project()),track=p.tracks[0],cards={'soft-highlight-caption':{schema:[]}};
  assert.equal(previousCaptionText(track,track.clips[1],cards),'先保存一个版本。');
  track.clips[0].props.text='编辑后的上一句';assert.equal(previousCaptionText(track,track.clips[1],cards),'编辑后的上一句');
  track.clips[1].start++;assert.equal(previousCaptionText(track,track.clips[1],cards),'');
});
test('shared layout preserves longest emphasis terms, manual semantic lines and rejects unsafe layouts',()=>{
  const ctx={measureText:text=>({width:Array.from(text).length*24})};
  const l=measureSoftCaption(ctx,{text:'先保存一个版本。\n再继续修改。',keywords:'保存|保存一个版本'});
  assert.equal(l.rows.length,2);assert.deepEqual(l.rows[0].filter(r=>r.emphasis).map(r=>r.text),['保存一个版本']);
  assert.throws(()=>measureSoftCaption(ctx,{text:'一\n二\n三'}),/两行/);
  assert.throws(()=>measureSoftCaption(ctx,{text:'长'.repeat(100)}),/安全区/);
  assert.throws(()=>measureSoftCaption(ctx,{text:'安全区',y:.99}),/安全区/);
});
test('unsupported Jianying path rejects the preset before rendering',()=>{
  assert.throws(()=>parseExportRequest(JSON.stringify({project:applySoftCaptionDesign(project()),kind:'jianying'})),/尚未接入剪映/);
});
