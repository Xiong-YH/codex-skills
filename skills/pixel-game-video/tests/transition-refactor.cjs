const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {createCanvas}=require(path.join(process.env.PIXEL_NODE_MODULES,'@napi-rs/canvas'));
const root=path.resolve(__dirname,'..');
for(const file of ['modules/style/runtime.js','modules/motion/runtime.js','modules/motion/narrative-transitions.js','engine/player.js'])vm.runInThisContext(fs.readFileSync(path.join(root,file),'utf8'));
const P=PixelVideo,w=320,h=180,old=createCanvas(w,h),next=createCanvas(w,h),out=createCanvas(w,h);
const data=c=>Buffer.from(c.getContext('2d').getImageData(0,0,w,h).data);
for(const [c,color] of [[old,'#be2030'],[next,'#2040be']]){const g=c.getContext('2d');g.fillStyle=color;g.fillRect(0,0,w,h)}
const e={ctx:out.getContext('2d'),width:w,height:h,pixel:1,colors:{ink:'#102030',accent:'#aabbcc',gold:'#ddaa77'},propCache:{}};
for(const recipe of ['motion.cross-dissolve.v1','motion.fade-through-black.v1']){
 const motion={recipe,startFrame:0,endFrame:101,params:{}};
 for(const f of [0,50,100]){e.ctx.clearRect(0,0,w,h);P.motion.worldTransition(e,old,next,motion,f);const d=data(out);if(f===0)assert.deepEqual(d,data(old));if(f===100)assert.deepEqual(d,data(next));if(f===50){if(recipe.includes('black'))assert.deepEqual([...d.subarray(0,3)],[0,0,0]);else assert.ok(d[0]>80&&d[0]<160&&d[2]>80&&d[2]<160)}}
}
const shatter={recipe:'motion.shatter-reveal.v1',startFrame:0,endFrame:61,params:{x:.62,y:.5,seed:7}};
const drawGlass=f=>{e.ctx.drawImage(next,0,0);P.motion.shatter(e,old,shatter,f);return data(out)};
const middle=drawGlass(30);drawGlass(8);assert.deepEqual(drawGlass(30),middle);
const cells=Object.values(e.propCache)[0];assert.ok(cells.length>25);assert.ok(cells.some(c=>c.points.length>=5));
const area=c=>Math.abs(c.points.reduce((sum,p,i)=>{const q=c.points[(i+1)%c.points.length];return sum+p[0]*q[1]-q[0]*p[1]},0))/2;
assert.ok(Math.abs(cells.reduce((sum,c)=>sum+area(c),0)-w*h)<.01,'Crack cells cover the entire source without missing wedges');
shatter.params.seed=8;assert.notDeepEqual(drawGlass(30),middle,'Different seeds change the fracture');
assert.throws(()=>P.motion.worldTransition(e,old,next,{recipe:'motion.shelf-travel.v1',startFrame:0,endFrame:10},5),/Unknown/);
P.text={overlays(){}};
function bg(e,s){e.ctx.fillStyle=s.id==='old'?'#123456':'#345612';e.ctx.fillRect(0,0,w,h)}
function actor(e,s){if(s.actor){e.ctx.fillStyle='#ff00ff';e.ctx.fillRect(25,80,24,60)}}
function content(e){e.ctx.fillStyle='#ddaa77';e.ctx.fillRect(160,85,40,30)}
P.scenes={draw(e,s){bg(e,s);actor(e,s);content(e)},drawLayer(e,s,f,l){({background:bg,actor,content})[l](e,s)}};
const motion={recipe:'motion.scene-to-card.v1',startFrame:60,endFrame:120,params:{}};
const shots=[{id:'old',startFrame:0,endFrame:60,durationFrames:60,actor:'presenter',motions:[]},{id:'next',startFrame:60,endFrame:150,durationFrames:90,actor:null,motions:[motion]}];
const canvas=createCanvas(w,h),renderer=P.createRenderer({canvas,createCanvas,assets:{},resolved:{project:{width:w,height:h,nativeWidth:320,fps:60},shots,durationFrames:150,cues:[]},mouth:[],style:{colors:e.colors}});
const hasActor=c=>{const d=data(c);for(let i=0;i<d.length;i+=4)if(d[i]===255&&d[i+1]===0&&d[i+2]===255)return true;return false};
renderer.draw(59/60);const before=data(canvas);renderer.draw(60/60);assert.deepEqual(data(canvas),before,'Presenter stays in its original screen position at entry');
renderer.draw(90/60);assert.equal(hasActor(canvas),false,'Narrator must never shrink into the card');const integrated=data(canvas);
renderer.drawTransition(90,1,motion);assert.deepEqual(data(canvas),integrated,'Independent transition uses the same presenter-free source');
console.log(JSON.stringify({passed:true,checks:['fade endpoints and black midpoint','irregular glass covers source','fracture deterministic by seed','deleted shelf rejected','presenter-free card and workbench parity']}));
