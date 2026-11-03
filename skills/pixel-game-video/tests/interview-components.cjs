// State/API contracts only. Actual drawing, occlusion and readability are
// checked separately in the browser preview; these checks do not claim pixels.
const assert=require('node:assert/strict');
const cards=require('../modules/components/interview/cards.js');
const stamp=require('../modules/components/interview/stamp.js');
const task=require('../modules/components/interview/task-station.js');

function sampled(component){
  const last=Math.round(component.duration*60);
  const times=Array.from({length:last+1},(_,frame)=>frame/60);
  const states=times.map(time=>component.stateAt(time));
  // Seek backwards through odd frames, then through even frames. This must
  // produce exactly the same state as playing forward from the beginning.
  const order=times.map((_,index)=>index).filter(index=>index%2).reverse()
    .concat(times.map((_,index)=>index).filter(index=>index%2===0).reverse());
  for(const index of order)assert.deepEqual(component.stateAt(times[index]),states[index]);
  assert.deepEqual(component.stateAt(-1),component.stateAt(0));
  assert.deepEqual(component.stateAt(component.duration+1),component.stateAt(component.duration));
  return states;
}

function finitePoint(point){
  assert(Number.isFinite(point.x));assert(Number.isFinite(point.y));
}

function checkInputs(component){
  const invalidTimes=[NaN,Infinity,-Infinity,'1',null,undefined,{},[]];
  for(const value of invalidTimes)assert.throws(()=>component.stateAt(value),TypeError);
  // A Proxy that throws a non-TypeError prevents a missing canvas method from
  // making an invalid-argument check pass accidentally. No draw is simulated.
  const undrawable=new Proxy({}, {get(){throw new Error('Canvas must not be accessed for invalid arguments');}});
  for(const options of [
    {x:NaN},{x:Infinity},{y:-Infinity},{y:'0'},
    {width:0},{width:-1},{width:NaN},{width:'960'},
    {height:0},{height:-1},{height:Infinity},{height:null}
  ])assert.throws(()=>component.draw(undrawable,{time:0,...options}),TypeError);
  for(const value of [NaN,Infinity,-Infinity,'1']){
    assert.throws(()=>component.draw(undrawable,{time:value}),TypeError);
  }
  return {invalidTimes:invalidTimes.length,invalidRectangles:12,invalidDrawTimes:4};
}

function checkCards(){
  const states=sampled(cards),initial=cards.stateAt(0),final=cards.stateAt(cards.duration);
  const ids=initial.cards.map(card=>card.id);
  for(const state of states){
    assert.equal(state.cardCount,3);assert.equal(state.cards.length,3);
    assert.deepEqual(state.cards.map(card=>card.id),ids);
    assert.equal(new Set(state.cards.map(card=>card.id)).size,3);
    assert(state.cards.filter(card=>card.held).length<=1);
    assert.equal(state.heldCard,state.cards.find(card=>card.held)?.id||null);
    for(const card of state.cards){
      finitePoint(card);assert(Number.isFinite(card.rotation));assert(card.scale>0);
      assert(card.flipProgress>=0&&card.flipProgress<=1);
      assert(['back','front'].includes(card.face));
    }
  }
  assert(initial.cards.every(card=>card.face==='back'));
  assert(final.cards.every(card=>card.face==='front'&&!card.held));
  assert.equal(final.frontCount,3);assert.equal(final.heldCard,null);
  for(let index=0;index<3;index++){
    const a=initial.cards[index],b=final.cards[index];
    assert.deepEqual({x:b.x,y:b.y,scale:b.scale,rotation:b.rotation},
      {x:a.x,y:a.y,scale:a.scale,rotation:a.rotation});
  }
  const turns=[
    [0,cards.events.campusFlip,cards.events.campusOpen],
    [1,cards.events.projectFlip,cards.events.projectOpen],
    [2,cards.events.problemFlip,cards.events.problemOpen]
  ];
  for(const [index,start,end] of turns){
    const middle=cards.stateAt((start+end)/2).cards[index];
    assert(middle.flipProgress>0&&middle.flipProgress<1);
    assert.equal(middle.edgeOn,true);
    assert.equal(cards.stateAt(start).cards[index].face,'back');
    assert.equal(cards.stateAt(end).cards[index].face,'front');
  }
  const held=cards.stateAt((cards.events.held+cards.events.returnStart)/2);
  assert.equal(held.heldCard,ids[0]);
  assert(held.cards[0].y<initial.cards[0].y);
  return {frames:states.length,identities:3,midFlipEdges:turns.length,originalPositionsRestored:true,
    ...checkInputs(cards)};
}

function checkStamp(){
  const states=sampled(stamp);
  for(const state of states){
    assert.equal(state.stampCount,1);assert.equal(state.stamp.id,'judgment');
    assert.equal(state.resumeMarked,false);assert.equal(state.paperContact,false);
    finitePoint(state.stamp);finitePoint({x:state.hand.gripX,y:state.hand.gripY});
    assert.equal(state.stamp.bottomY,state.stamp.y);
    if(state.time<stamp.events.withdraw)assert(state.hoverGap>0);
    if(state.tableContact){
      assert(state.stamp.x-state.stamp.width/2>state.paper.x+state.paper.width);
      assert(state.time>=stamp.events.contact);
    }
  }
  const hover=stamp.stateAt(stamp.events.hover);
  assert.equal(hover.phase,'suspended');assert(hover.hoverGap>0);
  for(const state of states.filter(s=>s.time>=stamp.events.hover&&s.time<stamp.events.withdraw)){
    assert.deepEqual(state.stamp,hover.stamp);
  }
  // Approach and withdrawal meet the same suspended pose. Positional state
  // cannot jump at an event even when a consumer seeks across its boundary.
  const epsilon=1e-6;
  for(const event of Object.values(stamp.events)){
    const before=stamp.stateAt(event-epsilon),after=stamp.stateAt(event+epsilon);
    assert(Math.hypot(before.stamp.x-after.stamp.x,before.stamp.y-after.stamp.y)<.02);
    assert(Math.hypot(before.hand.gripX-after.hand.gripX,before.hand.gripY-after.hand.gripY)<.02);
  }
  const final=stamp.stateAt(stamp.duration);
  assert.equal(final.phase,'rest');assert.equal(final.tableContact,true);
  assert.equal(final.release,1);assert.equal(final.resumeMarked,false);
  return {frames:states.length,uniqueStamp:true,suspensionGap: hover.hoverGap,
    continuousEventBoundaries:Object.keys(stamp.events).length,finalContact:'table-only',
    ...checkInputs(stamp)};
}

function checkSubmit(){
  const entry=Object.freeze({id:'entry-1',name:'已有同学',invalid:false});
  const records=Object.freeze([entry]);
  const before=JSON.parse(JSON.stringify(records));
  const legacy=task.submit({validationInstalled:false,name:' \t\n ',records});
  assert.equal(legacy.accepted,true);assert.equal(legacy.invalid,true);
  assert.equal(legacy.records.at(-1).name,'');
  const rejected=task.submit({validationInstalled:true,name:' \t\n ',records});
  assert.equal(rejected.accepted,false);assert.equal(rejected.invalid,true);
  assert.deepEqual(rejected.records,before);assert.notEqual(rejected.records,records);
  const accepted=task.submit({validationInstalled:true,name:'  同学 \n',records});
  assert.equal(accepted.accepted,true);assert.equal(accepted.invalid,false);
  assert.equal(accepted.records.length,2);assert.equal(accepted.records[1].name,'同学');
  assert.notEqual(accepted.records,records);assert.deepEqual(records,before);
  const invalidValues=[null,0,false,[],{}];
  for(const name of invalidValues)assert.throws(()=>task.submit({name}),TypeError);
  for(const validationInstalled of [null,0,'false',[],{}]){
    assert.throws(()=>task.submit({validationInstalled}),TypeError);
  }
  for(const badRecords of [null,0,false,'records',{}]){
    assert.throws(()=>task.submit({records:badRecords}),TypeError);
  }
  assert.throws(()=>task.submit(null),TypeError);
  return {sourceRecordsUnchanged:true,whitespaceTrimmed:true,
    missingRuleReproducesDefect:true,installedRuleRejectsBlank:true,validNameAccepted:true,invalidInputs:16};
}

function checkTask(){
  const states=sampled(task),taskIds=new Set();
  for(const state of states){
    taskIds.add(state.taskId);assert.equal(state.moduleCount,1);
    assert(['source','in-flight','installed'].includes(state.moduleOwnership));
    finitePoint(state.module);assert(state.module.width>0&&state.module.height>0);
    assert(state.patchProgress>=0&&state.patchProgress<=1);
    assert.equal(state.validationInstalled,state.moduleOwnership==='installed');
    assert(state.records.length<=1);
    if(state.validSubmissionAccepted){
      assert(state.validationInstalled);assert(state.invalidInputRejected);
      assert.equal(state.records.length,1);assert.equal(state.records[0].invalid,false);
      assert(state.records[0].name.trim());
    }
  }
  assert.equal(taskIds.size,1);
  const legacy=task.stateAt(task.events.issue);
  assert.equal(legacy.validationInstalled,false);assert.equal(legacy.legacySubmissionAccepted,true);
  assert.equal(legacy.result.accepted,true);assert.equal(legacy.result.invalid,true);
  const patch=task.stateAt(task.events.patchSettled);
  assert.equal(patch.moduleOwnership,'installed');assert.equal(patch.validationInstalled,true);
  const rejected=task.stateAt(task.events.invalidRejected);
  assert.equal(rejected.invalidInputRejected,true);assert.equal(rejected.result.accepted,false);
  assert.equal(rejected.records.length,0);
  const final=task.stateAt(task.duration);
  assert.equal(final.validSubmissionAccepted,true);assert.equal(final.records.length,1);
  return {frames:states.length,taskIdentities:taskIds.size,uniqueRuleModule:true,
    finalValidRecords:final.records.length,...checkSubmit(),...checkInputs(task)};
}

try{
  const report={cards:checkCards(),stamp:checkStamp(),task:checkTask(),
    scope:'state-and-input-contracts; visual verification is separate'};
  console.log(JSON.stringify(report));
}catch(error){
  console.error(error);process.exitCode=1;
}
