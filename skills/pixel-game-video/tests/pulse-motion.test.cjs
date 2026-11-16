const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
function runtime(){
 const box=vm.createContext({});
 const scripts=['style/runtime.js','motion/runtime.js','motion/pulse-spec.js','motion/contact-fx.js',
  'motion/signal-particles.js','motion/particle-effects.js'];
 for(const script of scripts)vm.runInContext(fs.readFileSync(path.join(root,'modules',script),'utf8'),box);
 box.PixelVideo.scenes={draw(){},drawLayer(){}};
 vm.runInContext(fs.readFileSync(path.join(root,'modules/motion/pulse.js'),'utf8'),box);
 return box.PixelVideo;
}
const m=(recipe,params={},startFrame=10,endFrame=30)=>({recipe,params,startFrame,endFrame});
test('a path follows segment length and lands on the exact receiver', () => {
 const { tracePath }=runtime().motion;
 const points=[[0,0],[0,0],[3,4],[3,9]];
 const middle=tracePath(points,.75);
 assert.deepEqual(Array.from(middle.head),[3,6.5]);
 assert.deepEqual(Array.from(tracePath(points,0).head),points[0]);
 assert.equal(tracePath(points,1).head,points.at(-1));
 assert.deepEqual(Array.from(tracePath([[2,3],[2,3]],.5).head),[2,3]);
});
test('signal blocks follow a bend and hand off at arrival', () => {
 const { signalParticles }=runtime();
 const options={points:[[10,12],[50,12],[50,72]],contact:8,release:12,arrival:32,
  size:8,color:'#92dfc9',highlight:'#e4ffeb'};
 function draw(frame){
  const blocks=[],stack=[];
  const ctx={globalAlpha:.8,fillStyle:'#111',x:0,y:0,
   save(){stack.push([this.globalAlpha,this.fillStyle,this.x,this.y]);},
   restore(){[this.globalAlpha,this.fillStyle,this.x,this.y]=stack.pop();},
   translate(x,y){this.x+=x;this.y+=y;},rotate(){},
   fillRect(x,y,w,h){if(this.globalAlpha>0)blocks.push([x+w/2+this.x,y+h/2+this.y]);}};
  signalParticles.draw(ctx,options,frame);
  assert.deepEqual([ctx.globalAlpha,ctx.fillStyle,ctx.x,ctx.y,stack.length],[.8,'#111',0,0,0]);
  return blocks;
 }
 assert.deepEqual(draw(7),[]);
 assert(draw(8).length>0);
 const beforeBend=draw(18),afterBend=draw(24);
 assert(beforeBend.some(([x,y])=>Math.abs(x-40)<1&&Math.abs(y-12)<1));
 assert(afterBend.some(([x,y])=>Math.abs(x-50)<1&&y>12));
 assert(draw(31).every(([x,y])=>Math.abs(x-50)<1&&y>60));
 assert.deepEqual(draw(32),[]);
 assert.deepEqual(draw(18),beforeBend);
});
test('gather preserves one block per target and holds the exact assembled shape', () => {
 const { gather }=runtime().particleEffects;
 const cells=[[18.5,32.5,'#bfe'],[26.5,32.5,'#9dc'],[26.5,40.5,'#9dc']];
 function draw(progress,seed=7){
  const blocks=[],stack=[];
  const ctx={fillStyle:'#111',save(){stack.push(this.fillStyle);},restore(){this.fillStyle=stack.pop();},
   fillRect(x,y,w,h){blocks.push([x,y,this.fillStyle,w,h]);}};
  gather(ctx,{cells,size:8,spread:54,seed},progress);
  assert.equal(ctx.fillStyle,'#111');
  return blocks;
 }
 const opening=draw(0),landing=cells.map(([x,y,color])=>[x,y,color,8,8]);
 assert.equal(opening.length,cells.length);
 assert.notDeepEqual(opening,landing);
 assert.notDeepEqual(draw(.25,9),draw(.25,7));
 assert.deepEqual(draw(1),landing);
 assert.deepEqual(draw(2),landing);
 assert.deepEqual(draw(0),opening);
});
test('dust starts at contact, stays above the surface and clears at the end', () => {
 const { dust }=runtime().particleEffects;
 function draw(progress){
  const blocks=[],stack=[];
  const ctx={globalAlpha:.8,fillStyle:'#111',
   save(){stack.push([this.globalAlpha,this.fillStyle]);},
   restore(){[this.globalAlpha,this.fillStyle]=stack.pop();},
   fillRect(x,y,w,h){blocks.push([x,y,w,h,this.globalAlpha]);}};
  dust(ctx,{x:90,groundY:100,reach:54,size:4,color:'#ddd',seed:13},progress);
  assert.deepEqual([ctx.globalAlpha,ctx.fillStyle,stack.length],[.8,'#111',0]);
  return blocks;
 }
 assert.deepEqual(draw(-.01),[]);
 const contact=draw(0),scatter=draw(.42);
 assert(contact.length>0);
 assert(scatter.some(([x])=>x<65)&&scatter.some(([x])=>x>112));
 assert(scatter.every(([,y,,h,opacity])=>y+h<=100&&opacity>0&&opacity<.8));
 assert.deepEqual(draw(1),[]);
 assert.deepEqual(draw(.42),scatter);
});
test('impact sparks follow the requested side and repeat on a random seek', () => {
 const P=runtime();
 function draw(direction, frame=20){
  const sparks=[];
  const ctx={ globalAlpha:1, save(){}, restore(){}, beginPath(){}, moveTo(){}, lineTo(){}, stroke(){},
   strokeRect(){}, fillRect(x,y){sparks.push([x,y]);} };
  const motion=m('motion.contact-fx.v1',{profile:'impact',x:.5,y:.5,radius:.18,seed:8,direction});
  P.contactFx.draw({ctx,width:400,height:400,pixel:3,colors:{gold:'#fe8'}},motion,frame);
  return sparks;
 }
 const right=draw(0),left=draw(180),radial=draw(undefined);
 assert.equal(right.length,22);
 assert.equal(left.length,22);
 assert(right.every(([x])=>x>200));
 assert(left.every(([x])=>x<200));
 assert(radial.some(([x])=>x>200)&&radial.some(([x])=>x<200));
 draw(0,27);
 assert.deepEqual(draw(0),right);
});
test('pulse focuses, pan inherits scale, back restores wide and seek is deterministic',()=>{
 const P=runtime(),motions=[m('motion.camera-pulse.v1',{kind:'push',x:.6,scale:1.4}),m('motion.camera-pulse.v1',{kind:'pan',x:.4},40,58),m('motion.camera-pulse.v1',{kind:'back'},70,100)];
 assert.equal(P.motion.camera(motions,0).scale,1);assert.equal(P.motion.camera(motions,39).scale,1.4);
 assert.equal(P.motion.camera(motions,60).scale,1.4);assert.equal(P.motion.camera(motions,60).x,.4);
 assert.equal(P.motion.camera(motions,120).scale,1);assert.equal(P.motion.camera(motions,120).x,.5);
 const first=JSON.stringify(P.motion.camera(motions,48));P.motion.camera(motions,120);assert.equal(JSON.stringify(P.motion.camera(motions,48)),first);
});
test('slam overshoots change then settles, shake overlays and completely ends',()=>{
 const P=runtime(),slam=m('motion.camera-pulse.v1',{kind:'slam',scale:1.2},0,101);
 assert.ok(P.motion.camera([slam],55).scale>1.2);assert.equal(P.motion.camera([slam],100).scale,1.2);
 const shake=m('motion.camera-shake.v1',{},10,30),state=P.motion.camera([slam,shake],15);
 assert.notEqual(state.shakeX,0);assert.equal(P.motion.camera([slam,shake],30).shakeX,0);
 assert.equal(P.motion.camera([slam,shake],15).scale,P.motion.camera([slam],15).scale);
});
test('path holds and boundaries preserve framing; legacy transformation is unchanged',()=>{
 const P=runtime(),motion=m('motion.camera-path.v1',{keys:[{atFrame:0,durationFrames:10,x:.6,scale:1.4},{atFrame:30,durationFrames:10,x:.5,scale:1}]},0,50);
 assert.equal(P.motion.camera([motion],25).scale,1.4);assert.equal(P.motion.camera([motion],49).scale,1);
 const cover=P.motion.cameraTransform({mode:'center',bounds:'cover',scale:1.25,x:.9,y:.5},1920,1080);
 const free=P.motion.cameraTransform({mode:'center',bounds:'free',scale:1.25,x:.9,y:.5},1920,1080);
 assert.equal(cover.x,-480);assert.ok(free.x<cover.x);
 assert.equal(P.motion.cameraTransform({scale:1.1,x:.62,y:.5},1920,1080).x,.62*1920*(1-1.1));
});
test('layer progress holds and independent groups retain defaults',()=>{
 const P=runtime(),move=m('motion.layer-move.v1',{layer:'content',xTo:.2,opacityTo:.5});
 assert.equal(P.motion.layerTransform([move],'content',50).x,.2);
 assert.equal(P.motion.layerTransform([move],'actor',50).opacity,1);
});
test('page transition preserves exact endpoints and restores filter/alpha state',()=>{
 const P=runtime(),calls=[],stack=[],g={globalAlpha:1,filter:'none',save(){stack.push([this.globalAlpha,this.filter]);},restore(){[this.globalAlpha,this.filter]=stack.pop();},drawImage(image){calls.push(image);},translate(){},fillRect(){}};
 const e={ctx:g,width:1920,height:1080,colors:{background:'#000'}},move=m('motion.page-turn.v1',{},0,37);
 P.motion.worldTransition(e,'old','new',move,0);assert.deepEqual(calls,['old']);calls.length=0;
 P.motion.worldTransition(e,'old','new',move,36);assert.deepEqual(calls,['new']);calls.length=0;
 P.motion.worldTransition(e,'old','new',move,18);assert.deepEqual(calls,['old','new']);assert.equal(g.filter,'none');assert.equal(g.globalAlpha,1);
});
