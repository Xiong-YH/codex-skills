const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
function runtime(){const box={};vm.createContext(box);for(const f of ['modules/style/runtime.js','modules/motion/runtime.js','modules/motion/pulse-spec.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),box);box.PixelVideo.scenes={draw(){},drawLayer(){}};vm.runInContext(fs.readFileSync(path.join(root,'modules/motion/pulse.js'),'utf8'),box);return box.PixelVideo;}
const m=(recipe,params={},startFrame=10,endFrame=30)=>({recipe,params,startFrame,endFrame});
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
