// Actual compiled scenes/components, plus parity with independent workbench units.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {createCanvas,loadImage}=require(path.join(process.env.PIXEL_NODE_MODULES,'@napi-rs/canvas'));
const root=path.resolve(__dirname,'..'),example=path.join(root,'examples/content-handoffs'),output=process.argv[2]||path.join(root,'outputs/content-handoffs');
async function main(){
 const payload=JSON.parse(fs.readFileSync(path.join(example,'build/payload.json'),'utf8')),gallery=JSON.parse(fs.readFileSync(path.join(example,'gallery.json'),'utf8'));
 vm.runInThisContext(fs.readFileSync(path.join(example,'build/runtime.js'),'utf8'));
 const assets={},cache=new Map();await Promise.all(Object.keys(payload.assets).map(async key=>{const media=payload.resolved.media?.[key],file=media?path.join(example,media.file):path.join(root,'modules/style',payload.style.assets[key]);if(!cache.has(file))cache.set(file,loadImage(file));assets[key]=await cache.get(file)}));
 fs.mkdirSync(output,{recursive:true});const w=payload.resolved.project.width,h=payload.resolved.project.height;
 const canvas=createCanvas(w,h),renderer=PixelVideo.createRenderer({...payload,canvas,createCanvas,assets});
 const other=createCanvas(w,h),independent=PixelVideo.createRenderer({...payload,canvas:other,createCanvas,assets});
 const pixels=c=>Buffer.from(c.getContext('2d').getImageData(0,0,w,h).data),contact=createCanvas(1200,9*152),cg=contact.getContext('2d');
 let frames=0,maxError=0;
 for(const [row,pair]of gallery.pairs.entries()){
   const index=payload.resolved.shots.findIndex(s=>s.id===pair.incoming),shot=payload.resolved.shots[index],previous=payload.resolved.shots[index-1],motion=shot.motions[0];
   for(const [column,p]of [0,.25,.5,.75,1].entries()){
     const frame=Math.round(motion.startFrame+(motion.endFrame-motion.startFrame-1)*p);
     renderer.draw(frame/payload.resolved.project.fps);const expected=pixels(canvas);
     independent.drawTransition(frame,index,motion);const actual=pixels(other);
     for(let j=0;j<actual.length;j++){const error=Math.abs(actual[j]-expected[j]);maxError=Math.max(maxError,error);assert.ok(error<=2,`${pair.number}: independent mismatch at ${p}, channel ${j}`);}
     for(let j=3;j<actual.length;j+=4)assert.equal(actual[j],255,'No uncovered frame areas');
     cg.drawImage(canvas,column*240,row*152,240,135);frames++;
     if(p===0){independent.drawShot(previous.endFrame-1,index-1);assert.deepEqual(pixels(other),expected,'Entry must equal the previous complete scene');}
     if(p===1){independent.drawShot(frame,index);assert.deepEqual(pixels(other),expected,'Landing must equal the incoming scene');}
     if(p===.5&&pair.number===5){const altered=JSON.parse(JSON.stringify(payload.resolved));altered.shots[index].background.assetKey=previous.background.assetKey;
       const coverCanvas=createCanvas(w,h),probe=PixelVideo.createRenderer({...payload,resolved:altered,canvas:coverCanvas,createCanvas,assets});probe.drawTransition(frame,index,motion);assert.deepEqual(pixels(coverCanvas),actual,'Opaque panel must conceal the actual cut');
     }
     if(p===.5){const first=pixels(canvas);renderer.draw((shot.endFrame-2)/payload.resolved.project.fps);renderer.draw(frame/payload.resolved.project.fps);assert.deepEqual(pixels(canvas),first,'Random seeking must be deterministic');}
     if(p===1||p===0)fs.writeFileSync(path.join(output,`${String(pair.number).padStart(2,'0')}-${p}.png`),canvas.toBuffer('image/png'));
   }
   cg.fillStyle='#c2a26e';cg.font='12px sans-serif';cg.fillText(String(pair.number).padStart(2,'0')+'  '+pair.title,8,row*152+148);
   // Workbench peers may be moved independently; their edit must be consumed.
   const f=motion.startFrame+Math.floor((motion.endFrame-motion.startFrame)/4);independent.drawTransition(f,index,motion);const baseline=pixels(other);
   independent.drawTransition(f,index,motion,{incomingTransform:{x:15,scale:.94},outgoingTransform:{x:-12,scale:.96}});
   assert.notDeepEqual(pixels(other),baseline,'Peer transforms must reach independent transitions');
 }
 fs.writeFileSync(path.join(output,'contact.png'),contact.toBuffer('image/png'));
 const index=payload.resolved.shots.findIndex(s=>s.id==='h07-in'),probeResolved=JSON.parse(JSON.stringify(payload.resolved));
 probeResolved.shots[index-1].actor=probeResolved.shots[index].actor='actor.handoff-probe';
 const actor=PixelVideo.library.actor;PixelVideo.library.actor=(e,shot,f)=>{if(shot.actor==='actor.handoff-probe'){e.ctx.fillStyle='#ff00ff';e.ctx.fillRect(60,760,24,60);}else actor(e,shot,f);};
 try{
   const target=createCanvas(w,h),probe=PixelVideo.createRenderer({...payload,resolved:probeResolved,canvas:target,createCanvas,assets}),motion=probeResolved.shots[index].motions[0];
   probe.drawTransition(motion.startFrame+Math.floor((motion.endFrame-motion.startFrame)/2),index,motion);
   const d=pixels(target);let marker=0;for(let y=0;y<h;y++)for(let x=0;x<w;x++){const k=(y*w+x)*4;if(d[k]===255&&d[k+1]===0&&d[k+2]===255){assert.ok(x>=60&&x<84&&y>=760&&y<820,'Presenter must remain in screen coordinates');marker++;}}
   assert.equal(marker,24*60,'Presenter must not shrink into a report');
   assert.throws(()=>probe.drawTransition(motion.startFrame+30,index,{...motion,params:{...motion.params,mode:'invalid'}}),/Unknown component handoff mode/);
 }finally{PixelVideo.library.actor=actor;}
 console.log(JSON.stringify({passed:true,designs:9,recipeFamilies:5,frames,maxError,checks:['exact endpoints','complete coverage','opaque cut concealment','actual component redraw','independent transition parity','peer transforms','deterministic seeking','presenter stays outside components','invalid edited mode rejected']}));
}
main().catch(e=>{console.error(e);process.exitCode=1});
