// Real HTML interaction test; runtime curves and copied VideoSpec must agree.
const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
const {chromium}=require(path.join(process.env.PIXEL_NODE_MODULES,'playwright'));
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.PIXEL_BROWSER_EXECUTABLE,args:['--no-proxy-server']});try{
const page=await browser.newPage({viewport:{width:1100,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(pathToFileURL(path.resolve(__dirname,'../modules/motion/lab/index.html')).href);await page.waitForSelector('#preset-buttons button');
let configs=0,states=0;
for(const kind of ['push','pan','slam','shake','back','path','layer','page']){
 await page.locator(`[data-kind="${kind}"]`).click();
 const result=await page.evaluate(()=>{const source=JSON.parse(document.getElementById('config').value);for(const m of source)PixelVideo.motion.validatePulse({...m,startFrame:m.start.offsetFrames||0,endFrame:(m.start.offsetFrames||0)+m.durationFrames});return source;});configs+=result.length;
 for(const frame of [0,36,43,50,90,179]){await page.evaluate(f=>{const input=document.getElementById('timeline');input.value=f;input.dispatchEvent(new Event('input'));},frame);states++;assert.ok(!/NaN|undefined/.test(await page.locator('#world-a').getAttribute('style')));}
}
await page.getByRole('button',{name:'冲击',exact:true}).click();await page.locator('#fps').selectOption('30');
assert.equal(JSON.parse(await page.locator('#config').inputValue())[0].durationFrames,11);
await page.locator('#easing').selectOption('inOut');assert.match(await page.locator('#formula').innerText(),/4u/);
await page.getByRole('button',{name:'播放',exact:true}).click();await page.waitForTimeout(350);await page.getByRole('button',{name:'暂停',exact:true}).click();assert.ok(Number(await page.locator('#timeline').inputValue())>0);
for(const width of [360,1100]){await page.setViewportSize({width,height:1000});await page.waitForTimeout(100);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow at '+width);}
if(process.argv[2]){fs.mkdirSync(process.argv[2],{recursive:true});await page.screenshot({path:path.join(process.argv[2],'motion-lab.png'),fullPage:true});}
assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,presets:8,configs,seekStates:states,checks:['shared curves','valid copied JSON','30/60fps conversion','play and pause','360/1100px layout']}));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});
