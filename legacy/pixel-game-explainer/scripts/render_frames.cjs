// Fixed-time Canvas rendering; browser speed does not determine the movie timing.
const fs=require('node:fs/promises'),path=require('node:path');
const {createRequire}=require('node:module');
const {pathToFileURL}=require('node:url');
(async()=>{
  const [project,folder,startText,endText]=process.argv.slice(2);
  const root=path.resolve(project),frames=path.resolve(folder);
  const localRequire=createRequire(path.join(root,'package.json'));
  const {chromium}=process.env.PIXEL_PLAYWRIGHT_MODULE?require(process.env.PIXEL_PLAYWRIGHT_MODULE):localRequire('playwright');
  const options={headless:true};
  if(process.env.PIXEL_BROWSER_EXECUTABLE)options.executablePath=process.env.PIXEL_BROWSER_EXECUTABLE;
  const browser=await chromium.launch(options);
  try{
    const page=await browser.newPage({viewport:{width:1360,height:980}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(pathToFileURL(path.join(root,'build/film.html')).href+'?render');
    await page.waitForFunction(()=>window.sceneReady);
    const meta=await page.evaluate(()=>({duration:sceneDuration,fps:sceneFrameRate,width:document.querySelector('canvas').width,height:document.querySelector('canvas').height}));
    const start=Number(startText),end=Number(endText),first=Math.round(start*meta.fps),last=Math.round(end*meta.fps);
    if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end>meta.duration||first>=last)throw Error('Invalid source interval');
    await fs.mkdir(frames,{recursive:true});
    for(let i=first;i<last;i++){
      const png=await page.evaluate(t=>{renderFrame(t);return document.querySelector('canvas').toDataURL('image/png').split(',')[1]},i/meta.fps);
      await fs.writeFile(path.join(frames,`frame_${String(i-first).padStart(4,'0')}.png`),Buffer.from(png,'base64'));
      if((i-first)%240===0)console.log(`Rendered ${i-first}/${last-first}`);
    }
    if(errors.length)throw Error('Browser errors: '+errors.join('; '));
    const metrics={...meta,sourceStart:first/meta.fps,sourceEnd:last/meta.fps,frameCount:last-first,durationSeconds:(last-first)/meta.fps,pageErrors:errors};
    await fs.writeFile(path.join(frames,'render-metrics.json'),JSON.stringify(metrics,null,2)+'\n');
    console.log(JSON.stringify(metrics));
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
