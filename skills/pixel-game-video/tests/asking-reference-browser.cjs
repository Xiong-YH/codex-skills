const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {pathToFileURL}=require('node:url');
const {chromium}=require(path.join(process.env.PIXEL_NODE_MODULES,'playwright'));
(async()=>{
 assert(process.argv[2], 'Pass an output directory outside the skill');
 const output=path.resolve(process.argv[2]);
 const source=path.resolve(__dirname,'../examples/asking-motion');
 assert(!output.startsWith(path.resolve(__dirname,'..')+path.sep), 'Output must be outside the skill');
 fs.cpSync(source,output,{recursive:true});
 const {durationSeconds,frames,fps,reference}=JSON.parse(fs.readFileSync(path.join(output,'source.json'),'utf8'));
 for(const {file,sha256} of [reference.renderer,reference.clips,reference.mix,reference.overview]){
  const hash=createHash('sha256').update(fs.readFileSync(path.join(output,file))).digest('hex');
  assert.equal(hash,sha256,file);
 }
 const clips=[{id:'full-reference',frames:[0,frames]},...reference.frameRanges.clips];
 const browser=await chromium.launch({headless:true,executablePath:process.env.PIXEL_BROWSER_EXECUTABLE});
 try{
 const page=await browser.newPage({viewport:{width:1300,height:1000}}),errors=[],external=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('request',req=>{if(/^https?:/.test(req.url()))external.push(req.url());});
 await page.goto(pathToFileURL(path.join(output,'index.html')).href+'#full-reference');
 await page.waitForFunction(()=>!document.querySelector('#play').disabled);
 await page.evaluate(()=>new Promise(resolve=>{const a=document.querySelector('audio');if(a.readyState>=1)resolve();else a.addEventListener('loadedmetadata',resolve,{once:true});}));
 assert.equal(await page.locator('#clip-list button').count(),clips.length);
 assert.equal(await page.evaluate(()=>window.ASKING_RECUT.frames),frames);
 const audioDuration=await page.locator('audio').evaluate(a=>a.duration);
 assert(Math.abs(audioDuration-durationSeconds)<.05);
 const samples=[];
 for(const [index,{id,frames:[from,to]}] of clips.entries()){
  await page.evaluate(clipId=>location.hash=clipId,id);
  await page.locator('#clip-list button').nth(index).and(page.locator('[aria-current="true"]')).waitFor();
  const bounds=await page.locator('#seek').evaluate(el=>[+el.min,+el.max]);
  assert.deepEqual(bounds,[from,to-1],id);
  const moments=await page.locator('.moment').evaluateAll(items=>items.map(item=>Number(item.dataset.frame)));
  assert(moments.length>0&&moments.every(frame=>from<=frame&&frame<to),id);
  const target=Math.round((bounds[0]+bounds[1])/2);
  await page.locator('#seek').evaluate((el,f)=>{el.value=f;el.dispatchEvent(new Event('input'));},target);
  const before=await page.locator('canvas').evaluate(c=>c.toDataURL());
  await page.locator('#next').click();await page.locator('#back').click();
  assert.equal(await page.locator('canvas').evaluate(c=>c.toDataURL()),before);
  samples.push({clip:id,bounds,target});
 }
 await page.locator('#play').click();
 const last=samples.at(-1);
 await page.waitForFunction(start=>document.querySelector('audio').currentTime>start,last.target/fps+.1);
 await page.locator('#play').click();
 await page.screenshot({path:path.join(output,'browser-check.png')});
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 console.log(JSON.stringify({passed:true,isolated:true,audioDuration,samples,errors,external},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
