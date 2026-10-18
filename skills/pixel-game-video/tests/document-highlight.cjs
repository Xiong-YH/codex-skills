const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const P={clamp:x=>Math.max(0,Math.min(1,x)),ease:x=>1-Math.pow(1-Math.max(0,Math.min(1,x)),3),
 text:{draw(){}},scenes:{eventFrame:(s,id)=>s.events.find(e=>e.id===id).frame}};
const sandbox={PixelVideo:P};sandbox.globalThis=sandbox;
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../modules/scenes/document-highlight.js'),'utf8'),sandbox);
const labels=new Proxy({target:'138****1234'},{get:(o,k)=>o[k]||String(k)});
const colors={ink:'#fff',muted:'#aaa',edge:'#444',gold:'#fc8',accent:'#7ec',danger:'#e97',secondary:'#9bf'};
function draw(phase,frame){
 const strokes=[],texts=[];
 const ctx={save(){},restore(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fill(){},fillRect(){},setLineDash(){},
  strokeRect(x,y,w,h){strokes.push({x,y,w,h,color:this.strokeStyle})}};
 P.text.draw=(e,text,x,y)=>texts.push({text,x,y});
 const shot={actor:null,startFrame:0,durationFrames:300,
  events:[20,80,140,200].map((f,i)=>({id:'e'+i,frame:f})),
  params:{phase,heading:'标题',kicker:'说明',labels,stageEvents:['e0','e1','e2','e3']}};
 P.documentHighlight.draw({ctx,width:1920,height:1080,fps:60,colors,style:{}},shot,frame);
 return {strokes,texts};
}
// Explaining the failure must never silently repair the selected document range.
for(const f of [21,81,141,201])assert.ok(draw('drift',f).strokes.some(s=>s.color===colors.danger));
// Every candidate must change the selected position; only the final match passes.
const search=[21,81,141,201].map(f=>draw('search',f).strokes[0]);
assert.ok(search.every(Boolean));
assert.ok(search[0].x<search[1].x&&search[1].x<search[2].x&&search[2].x<search[3].x);
assert.ok(search.slice(0,3).every(s=>s.color===colors.danger));
assert.equal(search[3].color,colors.accent);
assert.ok(search.every(s=>Math.abs(s.w-search[0].w)<1e-7),'selection length must remain eleven characters');
assert.ok(draw('search',201).texts.some(t=>String(t.text).includes('102')));
console.log('Document scene: failure stays visible; four candidates move; only confirmed match passes.');
