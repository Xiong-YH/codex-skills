// Decode a two-second fixture: one red second then one blue second, trim .5s, hold to 3s.
const fs=require('node:fs/promises'),path=require('node:path'),{pathToFileURL}=require('node:url'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PIXEL_NODE_MODULES?path.join(process.env.PIXEL_NODE_MODULES,'playwright'):'playwright');
(async()=>{
 const project=path.resolve(process.argv[2]);
 const browser=await chromium.launch({headless:true,...(process.env.PIXEL_BROWSER_EXECUTABLE?{executablePath:process.env.PIXEL_BROWSER_EXECUTABLE}:{})});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.join(project,'build/film.html')).href+'?render');await page.evaluate(()=>sceneReady);
  const pixels=await page.evaluate(async()=>{
    const values=[];for(const t of [0,.6,2.9,0,2.9]){await renderFrame(t);values.push([...document.querySelector('canvas').getContext('2d').getImageData(960,540,1,1).data]);}return values;
  });
  assert.ok(pixels[0][0]>220&&pixels[0][2]<30);assert.ok(pixels[1][2]>220&&pixels[1][0]<30);
  assert.deepEqual(pixels[2],pixels[1]);assert.deepEqual(pixels[3],pixels[0]);assert.deepEqual(pixels[4],pixels[2]);assert.deepEqual(errors,[]);
  const report={trim:true,hold:true,nonSequentialSeek:true,pixels};await fs.writeFile(path.join(project,'browser-media-check.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
