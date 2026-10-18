// Browser verification for the component-expansion source example, after build.
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PIXEL_NODE_MODULES?path.join(process.env.PIXEL_NODE_MODULES,'playwright'):'playwright');
(async()=>{
  const root=path.resolve(process.argv[2]),output=process.argv[3]&&path.resolve(process.argv[3]);
  const browser=await chromium.launch({headless:true,...(process.env.PIXEL_BROWSER_EXECUTABLE?{executablePath:process.env.PIXEL_BROWSER_EXECUTABLE}:{})});
  try{
    const page=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(pathToFileURL(path.join(root,'build/film.html')).href+'?render');
    await page.evaluate(async()=>{await sceneReady;await document.fonts.ready});
    const result=await page.evaluate(async()=>{
      const shots=payload.resolved.shots,fps=payload.resolved.project.fps,samples=new Set();
      for(let f=0;f<payload.resolved.durationFrames;f+=15)samples.add(f);
      for(const shot of shots){
        for(const ev of shot.events)for(const delta of [-1,0,1,15]){
          const f=ev.frame+delta;if(f>=0&&f<payload.resolved.durationFrames)samples.add(f);
        }
        for(const card of shot.components){
          const at=id=>PixelVideo.scenes.eventFrame(shot,id);
          const state=f=>PixelVideo.components.state(card,shot,f,fps);
          if(state(at(card.showEvent)-1).visible)throw Error('Premature reveal');
          const final=state(shot.endFrame-1);
          if(card.data.items){
            if(final.completed!==card.data.items.length)throw Error('Final item state missing');
            card.data.items.forEach((item,i)=>{
              if(state(at(item.event)-1).items[i]||!state(at(item.event)).items[i])throw Error('Item event boundary is inaccurate');
              if(card.kind==='bars'&&(state(at(item.endEvent)).progress[i]!==1||final.progress[i]!==1))throw Error('Bar did not hold its exact final length');
            });
          }
          if(card.kind==='code'&&final.current!==card.data.items.length-1)throw Error('Wrong final code line');
        }
      }
      for(const f of [...samples].sort((a,b)=>a-b))await renderFrame(f/fps);
      const capture=async f=>{await renderFrame(f/fps);return document.querySelector('canvas').toDataURL()};
      const f=shots[4].endFrame-1,expected=await capture(f);await capture(0);
      if(expected!==await capture(f))throw Error('Nonsequential rendering changed pixels');
      const original=shots[0].components,limits={flow:5,timeline:5,checklist:5,hierarchy:4,bars:4,code:7};
      try{
        for(const [kind,count] of Object.entries(limits)){
          const card=JSON.parse(JSON.stringify(shots.flatMap(s=>s.components).find(c=>c.kind===kind)));
          Object.assign(card,{x:.08,y:.16,width:.84,height:.60,showEvent:'enter'});
          card.data.items=Array.from({length:count},()=>({...card.data.items[0],event:'e1',...(kind==='bars'?{endEvent:'e2'}:{})}));
          shots[0].components=[card];await renderFrame(2);
        }
        const card=shots[0].components[0];card.data.items[0].text='X'.repeat(96);
        let rejected=false;try{await renderFrame(2)}catch(error){rejected=error.message.includes('Code line overflows')}
        if(!rejected)throw Error('Long code line silently clipped');
        card.data.items[0].text='return true;';card.height=.25;
        rejected=false;try{await renderFrame(2)}catch(error){rejected=error.message.includes('Code rows are too short')}
        if(!rejected)throw Error('Short code rows silently shrank');
      }finally{shots[0].components=original;}
      return {samples:samples.size,maximumItemLayouts:6,overflowRejected:true,deterministic:true,shots:shots.map(s=>({id:s.id,time:(s.endFrame-30)/fps}))};
    });
    assert.deepEqual(errors,[]);
    if(output){await fs.mkdir(output,{recursive:true});for(const shot of result.shots){await page.evaluate(t=>renderFrame(t),shot.time);await page.locator('canvas').screenshot({path:path.join(output,shot.id+'.png')});}await fs.writeFile(path.join(output,'browser-review.json'),JSON.stringify(result,null,2));}
    console.log(JSON.stringify(result));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
