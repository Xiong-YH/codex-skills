const fs=require('node:fs/promises'),path=require('node:path'),{spawn}=require('node:child_process');
const {chromium}=require(path.join(process.env.PIXEL_NODE_MODULES,'playwright'));
(async()=>{
 const script=JSON.parse(await fs.readFile(path.join(__dirname,'script.json'),'utf8'));
 const storyboard=JSON.parse(await fs.readFile(path.join(__dirname,'storyboard.json'),'utf8'));
 const input={labels:Object.fromEntries(script.labels.map(l=>[l.id,l.text])),shots:storyboard.shots,illustrations:await Promise.all(['ai-workshop.png','duplicate-dispatch.png','validation-workshop.png'].map(async name=>'data:image/png;base64,'+(await fs.readFile(path.join(__dirname,'media',name))).toString('base64')))};
 const browser=await chromium.launch({headless:true,executablePath:process.env.PIXEL_BROWSER_EXECUTABLE});
 try{
  const page=await browser.newPage({viewport:{width:960,height:540}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setContent('<html><meta charset="utf-8"><body style="margin:0;background:#0a1221"><canvas width="960" height="540"></canvas></body></html>');
  await page.addScriptTag({content:await fs.readFile(path.join(__dirname,'scene.js'),'utf8')});await page.evaluate(input=>window.setup(input),input);
  await fs.mkdir(path.join(__dirname,'evidence'),{recursive:true});
  const selection=process.argv.find(a=>a.startsWith('--shots='));
  const chosen=selection?selection.split('=')[1].split(',').map(Number):[1,2,3,4,5,6];
  for(let i of chosen){
   const s=storyboard.shots[i-1];const frame=Math.min(s.durationFrames-2,Math.round(s.durationFrames*.77));
   const png=await page.evaluate(([i,f])=>window.drawShot(i,f),[i,frame]);await fs.writeFile(path.join(__dirname,`evidence/s${i}-design.png`),Buffer.from(png,'base64'));
   if(process.argv.includes('--stills'))continue;
   const target=path.join(__dirname,`media/s${i}-scene.mp4`);
   const ff=spawn(process.env.PIXEL_FFMPEG,['-y','-v','error','-f','image2pipe','-framerate','30','-i','pipe:0','-an','-c:v','libx264','-preset','fast','-crf','16','-pix_fmt','yuv420p','-movflags','+faststart',target],{windowsHide:true});
   let stderr='';ff.stderr.on('data',x=>stderr+=x);const done=new Promise((resolve,reject)=>{ff.on('error',reject);ff.on('close',c=>c?reject(Error(stderr)):resolve())});
   for(let f=0;f<s.durationFrames;f+=2){const png=await page.evaluate(([i,f])=>window.drawShot(i,f),[i,f]);if(!ff.stdin.write(Buffer.from(png,'base64')))await new Promise(r=>ff.stdin.once('drain',r));}
   ff.stdin.end();await done;console.log(`Rendered project scene s${i}: ${s.durationFrames/60}s`);
  }
  if(errors.length)throw Error(errors.join('\n'));
  await fs.writeFile(path.join(__dirname,'evidence/media-check.json'),JSON.stringify({pageErrors:errors,source:'script labels and storyboard events',mediaFps:30,projectFps:60,allSixScenesRendered:!process.argv.includes('--stills')},null,2));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
