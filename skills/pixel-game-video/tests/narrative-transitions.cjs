// The handoff owns geometry: page cover, occluded room join, and actual scene card.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createCanvas}=require(path.join(process.env.PIXEL_NODE_MODULES,'@napi-rs/canvas'));
const root=path.resolve(__dirname,'..');
for(const f of ['modules/style/runtime.js','modules/motion/runtime.js','modules/motion/narrative-transitions.js'])vm.runInThisContext(fs.readFileSync(path.join(root,f),'utf8'));
const P=PixelVideo,w=320,h=180,out=createCanvas(w,h),old=createCanvas(w,h),next=createCanvas(w,h);
const colors={accent:'#79edcf',gold:'#ffc87a'},e={ctx:out.getContext('2d'),width:w,height:h,pixel:1,colors};
function paint(c,color){const g=c.getContext('2d');g.fillStyle=color;g.fillRect(0,0,w,h)}
paint(old,'#bd173e');paint(next,'#0e4ca8');
old.getContext('2d').fillStyle='#ffff00';old.getContext('2d').fillRect(48,70,22,50);
const data=c=>Buffer.from(c.getContext('2d').getImageData(0,0,w,h).data);
let total=0;
for(const recipe of ['motion.book-sweep.v1','motion.shelf-travel.v1','motion.scene-to-card.v1','motion.match-dissolve.v1']){
 const duration=recipe.includes('match-dissolve')?72:recipe.includes('shelf')?48:36,m={recipe,startFrame:60,endFrame:60+duration,params:{}};
 const draw=f=>{e.ctx.clearRect(0,0,w,h);P.motion.worldTransition(e,old,next,m,f);return data(out)};
 assert.deepEqual(draw(60),data(old));assert.deepEqual(draw(60+duration-1),data(next));
 for(let f=60;f<60+duration;f++){
  const d=draw(f);total++;for(let i=3;i<d.length;i+=4)assert.equal(d[i],255);
  if(recipe.includes('shelf')&&f>62&&f<60+duration-3){
   const p=(f-60)/(duration-1),q=p*p*p*(10+p*(-15+6*p)),x=Math.min(w-1,Math.max(0,Math.floor((1.2-1.4*q)*w))),i=(90*w+x)*4;
   assert.notDeepEqual([...d.subarray(i,i+3)],[189,23,62],'Room join covered by shelf');
   assert.notDeepEqual([...d.subarray(i,i+3)],[14,76,168],'Room join covered by shelf');
  }
 }
 const first=draw(79);draw(65);assert.deepEqual(draw(79),first);
}
console.log(JSON.stringify({passed:true,transitionFrames:total,checks:['opaque full-frame transitions','exact endpoints','join occluded through horizontal travel','deterministic random seeking']}));
