// Actual browser checks. Run after building the director component-system example.
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PIXEL_NODE_MODULES?path.join(process.env.PIXEL_NODE_MODULES,'playwright'):'playwright');
(async()=>{
  const project=path.resolve(process.argv[2]),output=process.argv[3]&&path.resolve(process.argv[3]);
  const browser=await chromium.launch({headless:true,...(process.env.PIXEL_BROWSER_EXECUTABLE?{executablePath:process.env.PIXEL_BROWSER_EXECUTABLE}:{})});
  try{
    const page=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(pathToFileURL(path.join(project,'build/film.html')).href+'?render');await page.evaluate(async()=>{await sceneReady;await document.fonts.ready});
    const report=await page.evaluate(async()=>{
      const samples=new Set();for(let f=0;f<payload.resolved.durationFrames;f+=15)samples.add(f);
      for(const shot of payload.resolved.shots)for(const ev of shot.events)for(const d of [-1,0,1,15])if(ev.frame+d>=0&&ev.frame+d<payload.resolved.durationFrames)samples.add(ev.frame+d);
      for(const f of [...samples].sort((a,b)=>a-b))await renderFrame(f/payload.resolved.project.fps);
      const metric=payload.resolved.shots.find(s=>s.components.some(c=>c.kind==='metric'));
      const card=metric.components.find(c=>c.kind==='metric'),last=PixelVideo.components.state(card,metric,metric.endFrame-1);
      if(last.value!==card.data.to)throw Error('Metric did not hold its final value');
      const image=async f=>{await renderFrame(f/60);return document.querySelector('canvas').toDataURL()};
      const first=await image(metric.endFrame-1);await image(0);const again=await image(metric.endFrame-1);
      if(first!==again)throw Error('Rendering depends on playback order');
      return {samples:samples.size,shots:payload.resolved.shots.map(s=>({id:s.id,time:(s.endFrame-30)/60})),deterministic:true};
    });
    assert.deepEqual(errors,[]);
    if(output){await fs.mkdir(output,{recursive:true});for(const shot of report.shots){await page.evaluate(t=>renderFrame(t),shot.time);await page.locator('canvas').screenshot({path:path.join(output,shot.id+'.png')});}await fs.writeFile(path.join(output,'browser-review.json'),JSON.stringify(report,null,2));}
    console.log(JSON.stringify(report));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
