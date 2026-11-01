// Run after building modules/components/examples/guide. Tests the actual engine.
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PIXEL_NODE_MODULES?path.join(process.env.PIXEL_NODE_MODULES,'playwright'):'playwright');
(async()=>{
  const project=path.resolve(process.argv[2]),browser=await chromium.launch({headless:true,...(process.env.PIXEL_BROWSER_EXECUTABLE?{executablePath:process.env.PIXEL_BROWSER_EXECUTABLE}:{})});
  try{
    const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(pathToFileURL(path.join(project,'build/film.html')).href+'?render');await page.evaluate(async()=>{await sceneReady;await document.fonts.ready});
    const report=await page.evaluate(async()=>{
      const configs=['mechanical','energy'].flatMap(visualStyle=>['open','inset','relay'].flatMap(styleVariant=>[[],['stack']].map(features=>({visualStyle,styleVariant,features})))),original=payload.resolved.shots.map(s=>s.components.map(c=>({visualStyle:c.visualStyle,styleVariant:c.styleVariant,features:c.features})));
      const kinds=[...new Set(payload.resolved.shots.flatMap(s=>s.components.map(c=>c.kind)))];let samples=0;
      const set=config=>payload.resolved.shots.forEach(s=>s.components.forEach(c=>{c.visualStyle=config.visualStyle;c.styleVariant=config.styleVariant;c.features=[...config.features]}));
      // A new renderer owns a fresh sourceShot snapshot cache for each combination.
      const assets={};await Promise.all(Object.entries(payload.assets).map(([key,src])=>new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>{assets[key]=i;resolve()};i.onerror=reject;i.src=src})));
      const canvas=document.createElement('canvas'),createCanvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c};
      const make=()=>PixelVideo.createRenderer({canvas,createCanvas,assets,resolved:payload.resolved,mouth:payload.mouth,style:payload.style});
      try{
        const hashes=[];
        for(const config of configs){
          set(config);const renderer=make(),pictures=[];
          for(const kind of kinds){const shot=payload.resolved.shots.find(s=>s.id===kind);if(!shot)throw Error('Missing guide shot '+kind);
            for(const f of [0,12,24,35,45,80,90,130,145,180,215,239]){renderer.draw((shot.startFrame+f)/60);samples++}
            const final=canvas.toDataURL();renderer.draw(shot.startFrame/60);renderer.draw((shot.endFrame-1)/60);if(final!==canvas.toDataURL())throw Error('Non-deterministic '+kind);pictures.push(final);
          }
          hashes.push(pictures);
          const holder=payload.resolved.shots[0],saved=holder.components;
          try{
            for(const [kind,count]of Object.entries({flow:5,timeline:5,checklist:5,hierarchy:4,bars:4,code:7})){
              const source=payload.resolved.shots.flatMap(s=>s.components).find(c=>c.kind===kind),card=JSON.parse(JSON.stringify(source));
              Object.assign(card,{x:.08,y:.16,width:.84,height:.60,showEvent:'enter',visualStyle:config.visualStyle,styleVariant:config.styleVariant,features:[...config.features]});
              card.data.items=Array.from({length:count},()=>({...card.data.items[0],event:'e1',...(kind==='bars'?{endEvent:'e2'}:{})}));
              holder.components=[card];make().draw((holder.startFrame+120)/60);
            }
          }finally{holder.components=saved}
        }
        if(hashes.some((pictures,i)=>i&&pictures.every((p,j)=>p===hashes[i-1][j])))throw Error('A combination has no visual effect');
        const chapter=payload.resolved.shots.find(s=>s.id==='chapter'),badge=chapter.components[0],savedIndex=badge.data.index;
        const metric=payload.resolved.shots.find(s=>s.id==='metric'),readout=metric.components[0],savedUnit=readout.data.unit;
        try{
          for(const config of configs){
            set(config);const renderer=make(),ctx=canvas.getContext('2d'),time=(chapter.startFrame+215)/60;
            badge.data.index='02';renderer.draw(time);const before=ctx.getImageData(0,0,canvas.width,canvas.height);
            badge.data.index='12';renderer.draw(time);const after=ctx.getImageData(0,0,canvas.width,canvas.height);let count=0;
            for(let i=0;i<before.data.length;i+=4)if(before.data[i]!==after.data[i]||before.data[i+1]!==after.data[i+1]||before.data[i+2]!==after.data[i+2]){
              const index=i/4,x=index%canvas.width,y=Math.floor(index/canvas.width);count++;
              const scale=badge.width*canvas.width/480,localX=(x-badge.x*canvas.width)/scale,localY=(y-badge.y*canvas.height)/scale,localH=badge.height*canvas.height/scale;
              const inWindow=config.styleVariant==='relay'?localX>=90&&localX<=330&&localY<=localH*.18:localX>=70&&localX<=146&&localY>=localH*.47-31&&localY<=localH*.47+31;
              if(!inWindow)throw Error('Chapter number affects gear/core or leaves its text area');
            }
            if(!count)throw Error('Chapter index change is invisible');
            readout.data.unit='毫秒';for(const frame of [30,40,50,215])renderer.draw((metric.startFrame+frame)/60);
          }
        }finally{badge.data.index=savedIndex;readout.data.unit=savedUnit;}
        const shot=payload.resolved.shots.find(s=>s.id==='metric'),at=(shot.startFrame+215)/60;
        set(configs[6]);make().draw(at);const a=canvas.toDataURL();set(configs[0]);make().draw(at);if(a===canvas.toDataURL())throw Error('Styles not visually distinct');
        let rejected=0;for(const value of [{visualStyle:['mechanical','energy']},{visualStyle:'stack'},{visualStyle:'energy',features:['energy']},{visualStyle:'mechanical',features:['stack','stack']},{styleLayers:['mechanical','energy']},{styleVariant:'wrong'}])try{PixelVideo.componentStyles.normalize(value)}catch(e){rejected++}if(rejected!==6)throw Error('Invalid style/feature selection accepted');
        return{componentKinds:kinds.length,visualStyles:2,styleVariants:3,forms:12,sampledFrames:samples,deterministic:true,stylesMutuallyExclusive:true,invalidSelectionsRejected:true,numberWindowsIsolated:true,multiCharacterUnit:true};
      }finally{payload.resolved.shots.forEach((s,i)=>s.components.forEach((c,j)=>Object.assign(c,original[i][j])))}
    });
    assert.deepEqual(errors,[]);if(process.argv[3])await fs.writeFile(process.argv[3],JSON.stringify(report,null,2));console.log(JSON.stringify(report));
  }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
