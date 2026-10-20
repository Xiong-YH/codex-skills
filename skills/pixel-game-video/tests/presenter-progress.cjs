// Real browser regression: visible pose changes, seek determinism, fixed narrative bar.
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PIXEL_NODE_MODULES?path.join(process.env.PIXEL_NODE_MODULES,'playwright'):'playwright');
(async()=>{
 const project=path.resolve(process.argv[2]),out=path.resolve(process.argv[3]);await fs.mkdir(out,{recursive:true});
 const browser=await chromium.launch({headless:true,...(process.env.PIXEL_BROWSER_EXECUTABLE?{executablePath:process.env.PIXEL_BROWSER_EXECUTABLE}:{})});
 try{
  const page=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.join(project,'build/film.html')).href+'?render');await page.evaluate(async()=>{await sceneReady;await document.fonts.ready});
  const report=await page.evaluate(async()=>{
   const crop=async f=>{await renderFrame(f/60);const a=document.createElement('canvas');a.width=320;a.height=480;a.getContext('2d').drawImage(document.querySelector('#film'),210,380,320,480,0,0,320,480);return a.toDataURL()};
   const a=await crop(30),b=await crop(75),c=await crop(112),d=await crop(200);
   if(new Set([a,b,c,d]).size!==4)throw Error('Presenter does not visibly change between authored poses');
   await crop(30);if(await crop(112)!==c)throw Error('Pose output depends on playback order');
   if(payload.resolved.progress.nodes.length!==6)throw Error('Missing narrative nodes');
   const s=payload.resolved.shots.find(x=>x.actor);const layout=payload.resolved.actorPoseLayout[s.actor];
   if(!layout.neutral||!layout.talk)throw Error('Missing neutral/talk assets');
   return {poseFrames:[30,75,112,200],differentPoses:true,deterministicSeeking:true,nodes:payload.resolved.progress.nodes,sourceMode:'event-keyed poses; no phoneme alignment',samples:payload.resolved.shots.map(s=>[s.id,s.startFrame+Math.min(s.durationFrames-15,Math.round(s.durationFrames*.72))])};
  });
  for(const [name,f] of [...report.samples,...report.poseFrames.map(f=>['pose-'+f,f]),...report.nodes.map((n,i)=>['progress-'+i,n.frame+5])]){
   await page.evaluate(f=>renderFrame(f/60),f);await page.locator('canvas#film').screenshot({path:path.join(out,name+'.png')});
  }
  assert.deepEqual(errors,[]);report.pageErrors=errors;
  await fs.writeFile(path.join(out,'presenter-progress.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({poseChanges:true,seekDeterminism:true,narrativeNodes:6,pageErrors:errors}));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
