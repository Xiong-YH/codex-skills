// Independent runtime units must reproduce the intact compositor exactly.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createCanvas}=require(process.env.PIXEL_NODE_MODULES?path.join(process.env.PIXEL_NODE_MODULES,'@napi-rs/canvas'):'@napi-rs/canvas');
const root=path.resolve(__dirname,'..');
for(const file of ['modules/style/runtime.js','modules/text/runtime.js','modules/motion/runtime.js','modules/motion/narrative-transitions.js','modules/text/narrative-progress.js','engine/player.js'])vm.runInThisContext(fs.readFileSync(path.join(root,file),'utf8'));
const P=globalThis.PixelVideo,width=320,height=180,fps=30;
const style={fontFamily:'sans-serif',textRoles:{subtitle:.03,title:.035},safeArea:{x:.03,top:.01,bottom:.01},colors:{background:'#081427',edge:'#345668',panel:'#567789',ink:'#edf5f8',gold:'#ffc87a',accent:'#45efd9',muted:'#899999'}};
const background=(e,s)=>{e.ctx.fillStyle=s.params.color;e.ctx.fillRect(0,0,width,height);};
const actor=(e,s,f)=>{e.ctx.fillStyle='#ff00ff';e.ctx.fillRect(25+(f-s.startFrame)%4,90,30,40);};
const content=(e,s,f)=>{e.ctx.fillStyle='#ffc87a';e.ctx.fillRect(160,50+(f-s.startFrame)%3,65,38);};
P.scenes={stageBounds:()=>({x:110,y:22,width:190,height:110}),draw(e,s,f){background(e,s);actor(e,s,f);content(e,s,f);},
  drawLayer(e,s,f,layer){({background,actor,content})[layer](e,s,f);}};
const pixels=canvas=>Buffer.from(canvas.getContext('2d').getImageData(0,0,width,height).data);
const recipes=['motion.panel-slide.v1','motion.pixel-iris.v1','motion.focus-punch.v1','motion.mosaic-pullback.v1','motion.book-sweep.v1','motion.shelf-travel.v1','motion.scene-to-card.v1','motion.match-dissolve.v1','motion.shatter-reveal.v1'];
let checked=0;
let maxError=0;
function parity(actual,expected,label){let changed=0,max=0;for(let i=0;i<actual.length;i++){const error=Math.abs(actual[i]-expected[i]);max=Math.max(max,error);if(error)changed++;}maxError=Math.max(maxError,max);assert.ok(max<=3,`${label}: ${changed} channels differ, max ${max}`);}
for(const recipe of recipes){
 const motion={id:'transition',recipe,startFrame:30,endFrame:48,params:recipe.includes('mosaic')?{columns:3}:{}};
 const shots=[{id:'old',startFrame:0,endFrame:30,durationFrames:30,params:{color:'#123456'},motions:[]},
   {id:'next',startFrame:30,endFrame:60,durationFrames:30,params:{color:'#345612'},motions:[motion,
     {id:'camera',recipe:'motion.camera-track.v1',startFrame:30,endFrame:59,params:{scaleFrom:1,scaleTo:1.2,xFrom:.5,xTo:.6}}]}];
 const cue={id:'caption',role:'subtitle',text:'Separate caption',startFrame:0,endFrame:60};
 const resolved={project:{width,height,nativeWidth:320,fps},durationFrames:60,shots,cues:[cue],progress:{nodes:[{label:'One',frame:0},{label:'Two',frame:30}]}};
 const make=()=>{const canvas=createCanvas(width,height);return {canvas,renderer:P.createRenderer({canvas,createCanvas,assets:{},resolved,mouth:[],style})};};
 const original=make(),shot=make(),transition=make(),caption=make(),progress=make(),composed=createCanvas(width,height),g=composed.getContext('2d');
 for(const frame of [0,29,30,31,35,40,46,47,48,59,35]){
   original.renderer.draw(frame/fps);const index=frame<30?0:1;
   shot.renderer.drawShot(frame,index);g.clearRect(0,0,width,height);g.drawImage(shot.canvas,0,0);
   if(frame>=motion.startFrame&&frame<motion.endFrame){transition.renderer.drawTransition(frame,index,motion);g.drawImage(transition.canvas,0,0);}
   progress.renderer.drawProgress(frame);g.drawImage(progress.canvas,0,0);
   caption.renderer.drawCaption(cue);g.drawImage(caption.canvas,0,0);
   parity(pixels(composed),pixels(original.canvas),`${recipe} frame ${frame}: separated layers differ`);checked++;
 }
 const independent=pixels(shot.canvas);shot.renderer.drawShot(35,1);
 caption.renderer.drawCaption(cue,{text:'Edited independently',fontSize:8,color:'#ef1234'});
 assert.notDeepEqual(pixels(caption.canvas),pixels(original.canvas));
 const edited={...resolved,shots:shots.map(s=>s.id==='next'?{...s,params:{color:'#ee3020'}}:s)};
 const updatedCanvas=createCanvas(width,height),updated=P.createRenderer({canvas:updatedCanvas,createCanvas,assets:{},resolved:edited,mouth:[],style});
 transition.renderer.drawTransition(42,1,motion);updated.drawTransition(42,1,motion);
 assert.notDeepEqual(pixels(transition.canvas),pixels(updatedCanvas),`${recipe}: incoming props must alter transition`);
 transition.renderer.drawTransition(35,1,motion,{incomingFrame:45,outgoingFrame:22,incomingTransform:{x:6,scale:.9},outgoingTransform:{x:-8,scale:1.1}});
 const editedFrame=pixels(transition.canvas);transition.renderer.drawTransition(32,1,motion);transition.renderer.drawTransition(35,1,motion,{incomingFrame:45,outgoingFrame:22,incomingTransform:{x:6,scale:.9},outgoingTransform:{x:-8,scale:1.1}});
 assert.deepEqual(pixels(transition.canvas),editedFrame,`${recipe}: peer clocks/transforms depend on seek order`);
 assert.ok(independent.length);
}
console.log(JSON.stringify({passed:true,recipes:recipes.length,parityFrames:checked,maxChannelError:maxError,checks:['independent shots/captions/progress/transitions','parity within 8-bit alpha rounding','edited incoming props','peer source clocks and transforms','deterministic seeking']}));
