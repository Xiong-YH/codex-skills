const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {createCanvas}=require(process.env.PIXEL_CANVAS_MODULE||'@napi-rs/canvas');
vm.runInThisContext(fs.readFileSync(require('node:path').join(__dirname,'../modules/text/runtime.js'),'utf8'));
const canvas=createCanvas(800,300),g=canvas.getContext('2d'),e={ctx:g,width:800,height:300,colors:{ink:'#253a37'},style:{fontFamily:'sans-serif',safeArea:{top:0,bottom:0,x:0},textRoles:{subtitle:.1}}};
const cue={id:'test',text:'A and B: only one.',role:'subtitle',fontSize:28,startFrame:0,endFrame:60,showBackdrop:false,richTextJson:JSON.stringify({left:.1,right:.95,y:.8,emphasis:[{text:'A',color:'#39785d',treatment:'chip'},{text:'only one',color:'#996021',treatment:'underline'}]})};
function pixels(c=cue,f=1){g.clearRect(0,0,800,300);PixelVideo.text.overlays(e,[c],f);return Buffer.from(g.getImageData(0,0,800,300).data);}
const first=pixels();assert(first.some(Boolean));assert.equal(g.getImageData(10,240,1,1).data[3],0,'caption must not draw a full plate');
assert.notDeepEqual(pixels({...cue,text:'B has no award.'}),first,'editing canonical text must change the result');
assert.deepEqual(pixels(cue,60),Buffer.alloc(800*300*4),'half-open cue range');
assert.deepEqual(pixels(),first,'repeat render must be deterministic');
assert.throws(()=>pixels({...cue,text:'long '.repeat(80)}),/overflows/,'never silently squeeze a long line');
assert.throws(()=>pixels({...cue,richTextJson:'{"left":0.9,"right":0.1,"y":0.8}'}),/invalid/);
assert.notDeepEqual(pixels({...cue,richTextJson:JSON.stringify({...JSON.parse(cue.richTextJson),rotation:-.065})}),first,'rotation must follow the object');
assert.throws(()=>pixels({...cue,richTextJson:JSON.stringify({...JSON.parse(cue.richTextJson),rotation:'bad'})}),/invalid/);
console.log('Rich captions: editable text, transparent backdrop, cue bounds, deterministic seek and overflow checks passed.');
