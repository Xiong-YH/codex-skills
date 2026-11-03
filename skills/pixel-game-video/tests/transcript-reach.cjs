const assert=require('node:assert/strict');
const api=require('../modules/components/character/transcript-reach.js');
for(const time of [null,undefined,'1',NaN,Infinity])assert.throws(()=>api.stateAt(time),TypeError);
assert.deepEqual(api.stateAt(9),api.stateAt(3.6));assert.deepEqual(api.stateAt(-1),api.stateAt(0));
assert.equal(api.stateAt(3.599).phase,'reaching');assert.equal(api.stateAt(3.6).phase,'stopped');
const states=Array.from({length:217},(_,i)=>api.stateAt(i/60));
for(let i=216;i>=0;i--){assert.deepEqual(api.stateAt(i/60),states[i]);assert.equal(states[i].paperCount,1);assert.equal(states[i].paperId,'transcript-a');}
assert.equal(api.stateAt(0).lift,0);assert.equal(api.stateAt(1).lift,1);
assert.throws(()=>api.create({spriteSheet:{width:512,height:512}}),TypeError);
const actor=api.create({spriteSheet:{width:1182,height:1330}});
for(const options of [{time:NaN},{width:0},{height:-1},{x:Infinity}])assert.throws(()=>actor.draw({},options),TypeError);
console.log('transcript-reach: reverse seek, single paper, lift, stop-and-hold, registered source and input checks passed');
