const {test}=require('node:test');
const assert=require('node:assert/strict');
const R=require('../modules/components/custom/runtime.js');
const M=require('../modules/components/custom/state-meter.js');
const events={enter:10,start:20,full:100,risk:130,break:150,settled:180};
const at=(frame,extra={})=>M.stateAt({frame,events,...extra});
test('event boundaries preserve initial and final states',()=>{
  assert.equal(at(9).visible,false);assert.equal(at(10).visible,true);
  assert.equal(at(20).value,0);assert.equal(at(60).value,500);
  assert.equal(at(100).stage,'full');assert.equal(at(100).level,100);
  assert.equal(at(130).stage,'warning');assert.equal(at(150).stage,'breaking');
  assert.equal(at(180).stage,'settled');assert.equal(at(180).level,0);
  assert.deepEqual(at(180),at(900));
});
test('stable object identities move through exclusive ownership',()=>{
  const before=at(149),during=at(165),after=at(180);
  assert.deepEqual(before.items.map(i=>i.id),after.items.map(i=>i.id));
  for(const [state,owner] of [[before,'meter'],[during,'falling'],[after,'ground']]){
    assert.equal(new Set(state.items.map(i=>i.id)).size,24);
    assert(state.items.every(i=>i.owner===owner&&i.active));
  }
  assert(after.items.every((i,n)=>i.y!==before.items[n].y));
  assert.equal(after.value,before.value);
});
test('random access and repeated calls match sequential evaluation',()=>{
  const expected=at(165);for(const f of [480,0,180,20,149,165])at(f);
  assert.deepEqual(at(165),expected);
  assert.notDeepEqual(at(180,{seed:2}).items,at(180,{seed:3}).items);
});
test('changed content and count keep actual quantity and end value',()=>{
  for(const count of [4,12,40]){const s=at(180,{params:{count,from:10,to:42}});
    assert.equal(s.items.length,count);assert.equal(s.value,42);
    assert(s.items.every(i=>i.width>0&&Number.isFinite(i.angle)));
  }
});
test('invalid inputs and incomplete or unordered events fail',()=>{
  for(const count of [0,3,41,2.5])assert.throws(()=>at(60,{params:{count}}));
  for(const to of [NaN,Infinity,Number.MAX_SAFE_INTEGER+1])assert.throws(()=>at(60,{params:{to}}));
  assert.throws(()=>at(60.5));assert.throws(()=>at(60,{events:{...events,risk:99}}));
  const missing={...events};delete missing.settled;assert.throws(()=>at(60,{events:missing}));
  assert.throws(()=>at(60,{params:{fakeEffect:true}}));
  assert.throws(()=>R.progress(1,{a:2,b:2},'a','b'));
});
test('time translation changes no state; caller owns event positions',()=>{
  const shifted=Object.fromEntries(Object.entries(events).map(([k,v])=>[k,v+60]));
  assert.deepEqual(at(165),at(225,{events:shifted}));
});
test('placement uses one contain transform and restores context on failure',()=>{
  const calls=[],ctx={save(){calls.push('save')},restore(){calls.push('restore')},translate(...v){calls.push(v)},scale(...v){calls.push(v)}};
  R.place(ctx,{x:10,y:20,width:1280,height:800},M.size,()=>calls.push('draw'));
  assert.deepEqual(calls,['save',[10,100],[2,2],'draw','restore']);
  assert.throws(()=>R.place(ctx,{x:0,y:0,width:640,height:320},M.size,()=>{throw Error('drawing failed')}));
  assert.equal(calls.at(-1),'restore');
  assert.throws(()=>R.place(ctx,{x:0,y:0,width:0,height:100},M.size,()=>{}));
});
test('draw restores context and does not clear caller canvas',()=>{
  let depth=0;
  const ctx={save(){depth++},restore(){depth--},translate(){},rotate(){},fillRect(){},strokeRect(){},fillText(){},clearRect(){assert.fail('component must not clear canvas')}};
  for(const f of [0,100,130,165,180]){M.draw(ctx,at(f));assert.equal(depth,0);}
  ctx.fillText=()=>{throw Error('text failed')};assert.throws(()=>M.draw(ctx,at(100)));assert.equal(depth,0);
  ctx.fillText=()=>{};ctx.rotate=()=>{throw Error('segment failed')};assert.throws(()=>M.draw(ctx,at(165)));assert.equal(depth,0);
});
