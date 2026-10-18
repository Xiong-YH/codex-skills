const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const P={clamp:v=>Math.max(0,Math.min(1,v)),motion:{},competitionRoutes:{draw(){}}};
const ctx=vm.createContext({PixelVideo:P});
for(const name of ['scenes/competition-cinematic.js'])vm.runInContext(fs.readFileSync(path.join(root,'modules',name),'utf8'),ctx);
const layout=P.competitionCinematic.layout;
const ratios={board:300/146,time:81/94,calendar:263/123};
let frames=0;
for(const phase of ['training','cost','trial'])for(let i=0;i<=240;i++){
 const t=i/240,s=layout(phase,t,0,phase==='cost'?0:1),c=s.camera;
 // A flat source room must cover the viewport without mirrors or edge fills.
 assert(c.x-240/c.zoom>=-1e-8&&c.x+240/c.zoom<=480+1e-8,`${phase} horizontal backdrop coverage at ${t}`);
 assert(c.y-135/c.zoom>=-1e-8&&c.y+135/c.zoom<=270+1e-8,`${phase} vertical backdrop coverage at ${t}`);
 for(const card of s.cards){assert(Math.abs(card.w/card.h-ratios[card.type])<1e-10,'Card aspect changed');assert([card.x,card.y,card.w,card.h].every(Number.isFinite));}
 frames++;
}
for(const [a,b,prep,entry] of [['question','training',0,1],['training','cost',1,0],['cost','trial',0,1]]){
 const before=layout(a,1,prep,entry),after=layout(b,0,0,entry);
 assert.deepEqual(before.camera,after.camera,'Camera must carry through a cut');
 const ids=a==='question'?['board']:a==='training'?['board','time0','time1','time2']:['time0','time1','time2','calendar'];
 for(const id of ids){const x=before.cards.find(c=>c.id===id),y=after.cards.find(c=>c.id===id);for(const k of ['x','y','w','h'])assert(Math.abs(x[k]-y[k])<1e-9,`${id} jumps at ${a}->${b}`);}
}
// Settled content must stay out of title and subtitle bands.
for(const [phase,ids] of [['training',['board']],['cost',['time0','time1','time2','calendar']],['trial',['calendar']]]){
 const s=layout(phase,1),cam=s.camera;
 for(const id of ids){const c=s.cards.find(c=>c.id===id),top=135+(c.y-c.h/2-cam.y)*cam.zoom,bottom=135+(c.y+c.h/2-cam.y)*cam.zoom;
  assert(top>44&&bottom<228,`${phase} ${id} intrudes into text bands: ${top},${bottom}`);}
}
console.log(JSON.stringify({samples:frames,constantAspect:'passed',roomCoverage:'passed',cutContinuity:'passed',readingBounds:'passed'}));
