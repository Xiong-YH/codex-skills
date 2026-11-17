const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const {chromium}=require(path.join(process.env.PIXEL_NODE_MODULES,'playwright'));
(async()=>{
 assert(process.argv[2], 'Pass an output directory outside the skill');
 const output=path.resolve(process.argv[2]);
 const source=path.resolve(__dirname,'../examples/asking-motion');
 assert(!output.startsWith(path.resolve(__dirname,'..')+path.sep), 'Output must be outside the skill');
 fs.cpSync(source,output,{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:process.env.PIXEL_BROWSER_EXECUTABLE});
 try{
 const page=await browser.newPage({viewport:{width:1300,height:1000}}),errors=[],external=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('request',req=>{if(/^https?:/.test(req.url()))external.push(req.url());});
 await page.goto(pathToFileURL(path.join(output,'index.html')).href+'#full-reference');
 await page.waitForFunction(()=>!document.querySelector('#play').disabled);
 await page.evaluate(()=>new Promise(resolve=>{const a=document.querySelector('audio');if(a.readyState>=1)resolve();else a.addEventListener('loadedmetadata',resolve,{once:true});}));
 assert.equal(await page.locator('#clip-list button').count(),9);
 assert(Math.abs(await page.locator('audio').evaluate(a=>a.duration)-88)<.05);
 const samples=[];
 for(const clip of ['first-drum','chat-reaction','course-stack','count-reveal','outcome-bubbles','question-title','paper-handoff','practice']){
  await page.evaluate(id=>location.hash=id,clip);
  await page.waitForFunction(id=>document.querySelector('#clip-list button[aria-current="true"]')?.textContent.includes(window.ASKING_MOTION_CLIPS.find(c=>c.id===id).title),clip);
  const bounds=await page.locator('#seek').evaluate(el=>[+el.min,+el.max]);
  const target=Math.round((bounds[0]+bounds[1])/2);
  await page.locator('#seek').evaluate((el,f)=>{el.value=f;el.dispatchEvent(new Event('input'));},target);
  const before=await page.locator('canvas').evaluate(c=>c.toDataURL());
  await page.locator('#next').click();await page.locator('#back').click();
  assert.equal(await page.locator('canvas').evaluate(c=>c.toDataURL()),before);
  samples.push({clip,bounds,target});
 }
 await page.locator('#play').click();
 await page.waitForFunction(()=>document.querySelector('audio').currentTime>77.2);
 await page.locator('#play').click();
 await page.screenshot({path:path.join(output,'browser-check.png')});
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 console.log(JSON.stringify({passed:true,isolated:true,audioDuration:88,samples,errors,external},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
