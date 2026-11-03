const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const api=require('../modules/components/character/offer-receive.js');
for(const t of [null,undefined,'1',NaN,Infinity,-Infinity])assert.throws(()=>api.stateAt(t),TypeError);
assert.deepEqual(api.stateAt(-10),api.stateAt(0));
assert.deepEqual(api.stateAt(20),api.stateAt(api.duration));
const forward=Array.from({length:193},(_,i)=>api.stateAt(i/60));
for(let i=192;i>=0;i--)assert.deepEqual(api.stateAt(i/60),forward[i]);
for(const s of forward){assert.equal(s.objectCount,1);assert.equal(s.objectId,'offer-1');assert(s.frame>=0&&s.frame<8);assert.equal(s.owner,s.frame<2?'table':'candidate');}
assert.equal(api.stateAt(.679).owner,'table');assert.equal(api.stateAt(.68).owner,'candidate');
assert.equal(api.stateAt(2).phase,'hold');
assert.throws(()=>api.create({spriteSheet:{width:0,height:0}}),TypeError);
const actor=api.create({spriteSheet:{width:1774,height:887}});
const noDraw=new Proxy({}, {get(){throw Error('Drawing must not start');}});
for(const o of [{width:0},{height:-1},{x:NaN},{time:Infinity},{label:3},{label:'12345678901'}])assert.throws(()=>actor.draw(noDraw,o),TypeError);
const bytes=fs.readFileSync(path.join(__dirname,'../modules/components/character/assets/amo-offer-receive.png'));
assert.equal(bytes.subarray(1,4).toString(),'PNG');assert.equal(bytes.readUInt32BE(16),1774);assert.equal(bytes.readUInt32BE(20),887);
console.log('offer-receive: state identity, ownership boundary, reverse seek, hold, input and source geometry checks passed');
