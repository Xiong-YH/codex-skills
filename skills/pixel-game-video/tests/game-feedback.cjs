const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const P={clamp:v=>Math.max(0,Math.min(1,v)),motion:{}};const ctx=vm.createContext({PixelVideo:P});
for(const file of ['motion/game-feedback.js','scenes/competition-feedback.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../modules',file),'utf8'),ctx);
const G=P.competitionFeedback,F=P.motion.gameFeedback;
const moves=Array.from({length:3},(_,index)=>({index,start:140+index*42,hit:168+index*42,end:180+index*42}));
for(let frame=0;frame<=333;frame+=.25){
 const s=G.budgetState(moves,frame);assert.equal(s.tokens.length,12);assert.equal(new Set(s.tokens.map(t=>t.id)).size,12);
 assert.equal(s.counts.reduce((a,b)=>a+b)+s.flying.length,12,'Budget conservation including transit');assert(s.flying.length<=1);
 const occupied=new Set();for(const t of s.tokens.filter(t=>t.owner!==null)){const k=t.owner+':'+t.slot;assert(!occupied.has(k),'Two tokens occupy the same slot');occupied.add(k);}
}
assert.deepEqual(Array.from(G.budgetState(moves,0).counts),[4,4,4]);assert.deepEqual(Array.from(G.budgetState(moves,333).counts),[7,2,3]);
for(const c of moves){assert.equal(G.budgetState(moves,c.start).tokens[G.routes[c.index].id].owner,null);assert.equal(G.budgetState(moves,c.hit).tokens[G.routes[c.index].id].owner,0);}
const a={x:200,y:160,size:18},b={x:110,y:180,size:14};
for(const t of [0,1]){const p=F.flight(a,b,t);for(const k of ['x','y','size'])assert(Math.abs(p[k]-(t===0?a:b)[k])<1e-8);}
assert.equal(F.impact(-1),0);assert.equal(F.impact(1),0);assert.equal(F.impact(2),0);
console.log(JSON.stringify({budgetSamples:1333,uniqueTokens:12,finalCounts:[7,2,3],flightEndpoints:'passed',transientFeedback:'passed'}));
