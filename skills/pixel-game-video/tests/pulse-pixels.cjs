// Browser/Canvas counterpart: actual source rendering vs independent workbench layers.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {createCanvas,loadImage}=require(path.join(process.env.PIXEL_NODE_MODULES,'@napi-rs/canvas'));
const root=path.resolve(__dirname,'..'),example=path.join(root,'examples/pulse-motion'),out=process.argv[2];
(async()=>{
const payload=JSON.parse(fs.readFileSync(path.join(example,'build/payload.json'),'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(example,'build/runtime.js'),'utf8'));
const assets={};for(const [id,uri]of Object.entries(payload.assets))assets[id]=await loadImage(uri);
const w=payload.resolved.project.width,h=payload.resolved.project.height;
const source=createCanvas(w,h),layer=createCanvas(w,h),a=PixelVideo.createRenderer({...payload,canvas:source,createCanvas,assets}),b=PixelVideo.createRenderer({...payload,canvas:layer,createCanvas,assets});
const bytes=c=>Buffer.from(c.getContext('2d').getImageData(0,0,w,h).data);
const noCaptions={...payload,resolved:{...payload.resolved,cues:[]}},plain=PixelVideo.createRenderer({...noCaptions,canvas:source,createCanvas,assets});
let frames=0;const sheet=createCanvas(960,8*160),g=sheet.getContext('2d');
for(const [index,shot]of payload.resolved.shots.entries()){
 const transition=shot.motions.find(m=>m.recipe==='motion.page-turn.v1');
 for(const offset of [0,36,43,50,70,100,150,179]){
  const frame=shot.startFrame+offset;plain.draw(frame/60);const expected=bytes(source);
  if(transition&&frame<transition.endFrame)b.drawTransition(frame,index,transition);else b.drawShot(frame,index);
  assert.deepEqual(bytes(layer),expected,'source/workbench parity at '+frame);
  for(let i=3;i<expected.length;i+=4)assert.equal(expected[i],255,'opaque frame');
  plain.draw(0);plain.draw(frame/60);assert.deepEqual(bytes(source),expected,'random seek at '+frame);frames++;
 }
 for(const [col,offset]of [36,44,100].entries()){a.draw((shot.startFrame+offset)/60);g.drawImage(source,col*320,index*160,320,160);}
}
if(out){fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'contact.png'),sheet.toBuffer('image/png'));}
console.log(JSON.stringify({passed:true,frames,checks:['actual source/workbench layer parity','opaque output','random seek determinism','all eight demo segments']}));
})().catch(e=>{console.error(e);process.exit(1);});
