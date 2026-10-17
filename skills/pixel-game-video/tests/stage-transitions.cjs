// node tests/stage-transitions.cjs; canvas may be provided by PIXEL_NODE_MODULES.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createCanvas}=require(process.env.PIXEL_NODE_MODULES?path.join(process.env.PIXEL_NODE_MODULES,'@napi-rs/canvas'):'@napi-rs/canvas');
const root=path.resolve(__dirname,'..');
for(const file of ['style/runtime.js','motion/runtime.js'])vm.runInThisContext(fs.readFileSync(path.join(root,'modules',file),'utf8'));
const P=globalThis.PixelVideo,width=320,height=180,stage={x:112,y:24,width:190,height:116};
const colors={gold:'#ffd080',ink:'#081427',wallGap:'#081427',wallShade:'#081427'};
function plate(color){const c=createCanvas(stage.width,stage.height),g=c.getContext('2d');g.fillStyle=color;g.fillRect(0,0,c.width,c.height);return c;}
const outgoing=plate('#19446b'),incoming=plate('#245f53'),gallery=['#19446b','#245f53','#604272','#694b21'].map(plate);
const og=outgoing.getContext('2d');og.fillStyle='#ffd080';og.fillRect(44,60,8,8);
function render(recipe,frame){
  const c=createCanvas(width,height),g=c.getContext('2d');
  g.fillStyle='#162036';g.fillRect(0,0,width,height);
  g.fillStyle='#e4b567';g.fillRect(25,85,36,58); // Fixed presenter stand-in.
  P.motion.stageTransition({ctx:g,width,height,pixel:1,colors,stage,gallery},outgoing,incoming,
    {recipe,startFrame:0,endFrame:recipe.includes('mosaic')?48:36,params:recipe.includes('mosaic')?{columns:5}:{x:.5,y:88/180,zoom:7}},frame);
  return g.getImageData(0,0,width,height).data;
}
let checked=0;
for(const recipe of ['motion.stage-focus-punch.v1','motion.stage-mosaic-pullback.v1']){
  const end=recipe.includes('mosaic')?48:36,first=render(recipe,0);
  for(let frame=0;frame<end;frame++){
    const pixels=render(recipe,frame);checked++;
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const i=(y*width+x)*4;
      assert.equal(pixels[i+3],255,'No transparent stage edges');
      if(x<stage.x||x>=stage.x+stage.width||y<stage.y||y>=stage.y+stage.height)
        assert.deepEqual(pixels.subarray(i,i+4),first.subarray(i,i+4),'Presenter, surrounding world and caption region remain fixed');
    }
  }
  for(const frame of [0,end-1]){
    const expected=(frame?incoming:outgoing).getContext('2d').getImageData(0,0,stage.width,stage.height).data;
    const actual=render(recipe,frame);
    for(let y=0;y<stage.height;y++){
      const offset=((stage.y+y)*width+stage.x)*4;
      assert.deepEqual(actual.subarray(offset,offset+stage.width*4),expected.subarray(y*stage.width*4,(y+1)*stage.width*4),'Exact endpoint crop');
    }
  }
  const repeat=render(recipe,17);render(recipe,3);assert.deepEqual(render(recipe,17),repeat,'Random access is deterministic');
}
function goldCount(data){let count=0;for(let i=0;i<data.length;i+=4)if(data[i]===255&&data[i+1]===208&&data[i+2]===128)count++;return count;}
assert.ok(goldCount(render('motion.stage-focus-punch.v1',18))>goldCount(render('motion.stage-focus-punch.v1',0))*8,'Focus target grows substantially before the cut');
console.log(JSON.stringify({passed:true,checkedFrames:checked,checks:['exact endpoints','fixed presenter and caption region','opaque edges','deterministic seeking','large focus scale change']}));
