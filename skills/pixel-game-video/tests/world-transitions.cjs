// Compositor regression: complete rooms share one camera; no cropped room layer.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createCanvas}=require(process.env.PIXEL_NODE_MODULES?path.join(process.env.PIXEL_NODE_MODULES,'@napi-rs/canvas'):'@napi-rs/canvas');
const root=path.resolve(__dirname,'..');
for(const f of ['modules/style/runtime.js','modules/motion/runtime.js','engine/player.js'])vm.runInThisContext(fs.readFileSync(path.join(root,f),'utf8'));
const P=globalThis.PixelVideo,width=320,height=180;
P.text={overlays(){}};
const background=(e,s)=>{const g=e.ctx;g.fillStyle=s.id==='old'?'#123456':'#345612';g.fillRect(0,0,width,height);g.fillStyle='#16d9ef';g.fillRect(0,130,width,3);};
const actor=e=>{e.ctx.fillStyle='#ff00ff';e.ctx.fillRect(40,80,25,50);};
const content=e=>{e.ctx.fillStyle='#ffc87a';e.ctx.fillRect(145,73,30,30);};
P.scenes={draw(e,s){background(e,s);actor(e);content(e);},drawLayer(e,s,f,layer){({background:()=>background(e,s),actor:()=>actor(e),content:()=>content(e)})[layer]();}};
function data(canvas){return canvas.getContext('2d').getImageData(0,0,width,height).data;}
function hasPresenter(canvas){const d=data(canvas);for(let i=0;i<d.length;i+=4)if(d[i]===255&&d[i+1]===0&&d[i+2]===255)return true;return false;}
let calls=0,frames=0;
for(const recipe of ['motion.focus-punch.v1','motion.mosaic-pullback.v1']){
 const duration=recipe.includes('mosaic')?48:36;
 const shots=[{id:'old',startFrame:0,endFrame:60,durationFrames:60,actor:'actor.azong.v3',motions:[]},
 {id:'next',startFrame:60,endFrame:120,durationFrames:60,actor:'actor.azong.v3',motions:[{recipe,startFrame:60,endFrame:60+duration,params:recipe.includes('mosaic')?{columns:5}:{x:.5,y:.49,zoom:7,incomingX:.5,incomingY:.49,incomingZoom:5.5}}]}];
 const resolved={project:{width,height,nativeWidth:320,fps:60},shots,durationFrames:120,cues:[]};
 const canvas=createCanvas(width,height),renderer=P.createRenderer({canvas,createCanvas,assets:{},mouth:[],resolved,style:{colors:{background:'#081427',ink:'#edf5f8',gold:'#ffc87a'}}});
 const original=P.motion.worldTransition;
 P.motion.worldTransition=(e,old,next,m,f)=>{
   calls++;assert.equal(old.width,width);assert.equal(old.height,height);assert.equal(next.width,width);assert.equal(next.height,height);
   assert.ok(hasPresenter(old)&&hasPresenter(next),'Standing presenter is part of the complete world');
   if(recipe.includes('mosaic')){assert.equal(e.gallery.length,2);assert.ok(e.gallery.every(c=>!hasPresenter(c)),'Overview tiles do not multiply the separate presenter layer');}
   return original(e,old,next,m,f);
 };
 const draw=f=>{renderer.draw(f/60);return Buffer.from(data(canvas));};
 const before=draw(59);assert.deepEqual(draw(60),before,'No change at the world transition first frame');
 for(let f=60;f<60+duration;f++){
   const pixels=draw(f);frames++;for(let i=3;i<pixels.length;i+=4)assert.equal(pixels[i],255,'No transparent corners');
 }
 assert.deepEqual(draw(60+duration-1),draw(60+duration),'Complete-world landing is exact');
 const middle=draw(78);draw(63);assert.deepEqual(draw(78),middle,'Random seeking is deterministic');
 if(!recipe.includes('mosaic')){
   let changed=0;for(let y=0;y<height;y++)for(let x=0;x<110;x++){const i=(y*width+x)*4;if(!middle.subarray(i,i+4).equals(before.subarray(i,i+4)))changed++;}
   assert.ok(!hasPresenter(canvas),'Standing presenter leaves the view as the shared camera pushes into the distant prop');
   assert.ok(changed>25*50,'Presenter footprint and room line both move with the camera');
   const nextCut=draw(79);assert.ok(!hasPresenter(canvas),'Incoming focus keeps the presenter outside the close-up before returning with the room');
   const gold=d=>{let n=0;for(let i=0;i<d.length;i+=4)if(d[i]===255&&d[i+1]===200&&d[i+2]===122)n++;return n;};
   // The impact tint affects one frame; compare the last outgoing close-up to
   // the next untinted incoming frame, allowing its first two settle steps.
   assert.ok(gold(draw(80))>gold(middle)*.65,'Incoming image remains a close-up across the cut');
 }
 P.motion.worldTransition=original;
}
assert.equal(P.motion.stageTransition,undefined,'Withdrawn cropped-background executor is absent');
console.log(JSON.stringify({passed:true,frames,worldTransitionCalls:calls,checks:['complete-frame sources','single camera across room and presenter','actor-free peripheral gallery','exact endpoints','opaque corners','deterministic seeking']}));
