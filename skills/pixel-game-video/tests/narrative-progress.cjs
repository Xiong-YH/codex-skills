// Observable rectangle geometry and time-based fill, without a browser dependency.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const P={clamp:x=>Math.max(0,Math.min(1,x)),text:{draw(){}}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../modules/text/narrative-progress.js'),'utf8'),{PixelVideo:P});
function draw(frame){
 const rects=[],g={save(){},restore(){},fillRect(x,y,w,h){rects.push({x,y,w,h,color:this.fillStyle})}};
 P.narrativeProgress.draw({ctx:g,width:1920,height:1080,pixel:6,colors:{edge:'track',accent:'fill',gold:'gold',ink:'ink',muted:'muted'},style:{},resolved:{durationFrames:101,progress:{nodes:[{label:'问题',frame:0},{label:'验证',frame:50}]}}},frame);
 return rects;
}
const first=draw(0),half=draw(50),last=draw(100),beyond=draw(150);
for(const rects of [first,half,last,beyond]){
 const track=rects.find(r=>r.color==='track'),fill=rects.find(r=>r.color==='fill');
 assert.ok(track.h>=18,'Progress must have a solid rectangular thickness');
 assert.equal(fill.h,track.h);assert.equal(fill.x,track.x);assert.equal(fill.y,track.y);
 assert.ok(rects.every(r=>!(r.w===12&&r.h===12)),'No floating square node markers');
}
assert.equal(first.find(r=>r.color==='fill').w,0);
assert.equal(half.find(r=>r.color==='fill').w,half.find(r=>r.color==='track').w/2);
assert.equal(last.find(r=>r.color==='fill').w,last.find(r=>r.color==='track').w);
assert.equal(beyond.find(r=>r.color==='fill').w,last.find(r=>r.color==='track').w);
console.log(JSON.stringify({solidRectangle:true,noFloatingNodes:true,halfFill:true,endClamp:true}));
