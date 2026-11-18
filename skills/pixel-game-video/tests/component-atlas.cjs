// Run after building the guide and its R41 gallery. Exercises actual rendering.
const path=require('node:path');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PIXEL_NODE_MODULES?path.join(process.env.PIXEL_NODE_MODULES,'playwright'):'playwright');

(async()=>{
  const file=path.resolve(process.argv[2]||path.join(__dirname,'../modules/components/examples/style-atlas/build/index.html'));
  const browser=await chromium.launch({headless:true,executablePath:process.env.PIXEL_BROWSER_EXECUTABLE});
  try{
    const page=await browser.newPage({viewport:{width:1440,height:1080}});
    const errors=[],external=[];
    page.on('pageerror',error=>errors.push(error.message));
    page.on('request',request=>{if(/^https?:/.test(request.url()))external.push(request.url());});
    await page.goto(pathToFileURL(file).href);
    await page.waitForFunction(()=>window.componentGallery?.ready);
    assert.equal(await page.locator('#clips .card').count(),22);
    const report=await page.evaluate(()=>{
      const {gallery,payload}=JSON.parse(document.querySelector('#package').textContent);
      const canvas=document.querySelector('#preview');
      let samples=0;
      for(const clip of gallery.clips){
        componentGallery.select(clip.id);
        for(const mark of clip.markers){
          componentGallery.seek(mark.frame);
          const before=canvas.toDataURL();
          componentGallery.seek(clip.frames-1);
          componentGallery.seek(0);
          componentGallery.seek(mark.frame);
          if(canvas.toDataURL()!==before)throw Error('History-dependent draw '+clip.id);
          samples++;
        }
      }
      const shot=payload.resolved.shots.find(shot=>shot.id==='metric');
      const component=shot.components[0], data=component.data;
      const begin=PixelVideo.scenes.eventFrame(shot,data.startEvent);
      const end=PixelVideo.scenes.eventFrame(shot,data.endEvent);
      const total=end-begin;
      const states=[0,.2,.5,.8,1].map(p=>PixelVideo.components.state(component,shot,begin+total*p).value);
      if(states.at(-1)!==data.to||states.some((v,i)=>i&&v<states[i-1]))throw Error('Counter endpoints');
      if(states[1]>(data.to-data.from)*.2+data.from)throw Error('Acceleration starts too fast');
      return {clips:gallery.clips.length,samples,states};
    });
    await page.getByRole('button',{name:'对话与状态',exact:true}).click();
    assert.equal(await page.locator('#clips .card:visible').count(),2);
    await page.getByRole('button',{name:'全部',exact:true}).click();
    await page.locator('[data-clip="chat"]').click();
    await page.locator('#play').click();
    await page.waitForFunction(()=>componentGallery.frame()>18);
    await page.locator('#pause').click();
    await page.locator('#next').click();
    const value=await page.evaluate(()=>componentGallery.frame());
    await page.locator('#back').click();
    assert.equal(await page.evaluate(()=>componentGallery.frame()),value-1);
    await page.locator('#example').click();
    assert.equal(JSON.parse(await page.locator('#json').inputValue()).shots[0].components[0].kind,'chat');
    await page.locator('#close').click();
    await page.setViewportSize({width:580,height:900});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    assert.deepEqual(errors,[]);
    assert.deepEqual(external,[]);
    console.log(JSON.stringify({...report,localOnly:true,deterministic:true,narrowLayout:true}));
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
