const path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
const {chromium}=require(path.join(process.env.PIXEL_NODE_MODULES,'playwright'));
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.PIXEL_BROWSER_EXECUTABLE,args:['--no-proxy-server']});try{
const page=await browser.newPage({viewport:{width:1200,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(pathToFileURL(path.resolve(__dirname,'../modules/motion/library.html')).href);
await page.waitForSelector('#choices button');assert.match(await page.locator('#name').innerText(),/短促推近/);
await page.frameLocator('#preview').locator('#play').click();await page.waitForTimeout(200);await page.frameLocator('#preview').locator('#play').click();
await page.locator('#backend').selectOption('remotion');assert.equal(await page.locator('#choices button').count(),1);assert.match(await page.locator('#name').innerText(),/有边界/);
await page.locator('#intent').selectOption('handoff');assert.equal(await page.locator('#choices button').count(),0);assert.equal(await page.locator('#empty').isVisible(),true);
await page.locator('#legacy').check();assert.equal(await page.locator('#choices button').count(),1);assert.match(await page.locator('#name').innerText(),/翻页/);
await page.locator('#designs').check();await page.locator('[data-id="design.motion.study-whip"]').click();assert.match(await page.locator('#status').innerText(),/待完成/);assert.match(await page.locator('#details').innerText(),/暂无/);
const studyFrame=await (await page.locator('#preview').elementHandle()).contentFrame();await studyFrame.waitForFunction(()=>window.motionPreview?.mode==='whip');
assert.equal(await studyFrame.evaluate(()=>{motionPreview.timeline.pause().seek(0,false);const r=document.querySelector('#a .n2').getBoundingClientRect();return !!document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('.node');}),true,'offscreen incoming background cannot cover outgoing objects');
await page.frameLocator('#preview').locator('#play').click();await page.waitForTimeout(200);await page.frameLocator('#preview').locator('#play').click();
for(const width of [360,1200]){await page.setViewportSize({width,height:1000});await page.waitForTimeout(100);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
if(process.argv[2])await page.screenshot({path:process.argv[2],fullPage:true});assert.deepEqual(errors,[]);
console.log('PASS: focused defaults, real iframe playback, native filtering, legacy opt-in, blocked design invocation and narrow layout');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
