// Render documentation from the portable whole-illustration example.
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const {pathToFileURL}=require('node:url'),{createRequire}=require('node:module');
const project=path.join(__dirname,'examples/whole-illustration'),out=path.join(__dirname,'assets/whole-illustration');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function dependency(name){
 const loaders=[createRequire(path.join(project,'package.json')),require];
 if(process.env.PIXEL_NODE_MODULES)loaders.push(n=>require(path.join(path.resolve(process.env.PIXEL_NODE_MODULES),n)));
 for(const load of loaders){try{return load(name);}catch(e){if(e.code!=='MODULE_NOT_FOUND')throw e;}}
 throw Error('Missing '+name+'; install dependencies or set PIXEL_NODE_MODULES.');
}
(async()=>{
 const read=async name=>JSON.parse(await fs.readFile(path.join(project,'build',name),'utf8'));
 const lock=await read('project-lock.json'),resolved=await read('resolved-timeline.json');
 if(lock.inputHash!==resolved.inputHash)throw Error('Rebuild example before capturing');
 for(const [root,files] of [[project,lock.inputFiles],[path.resolve(__dirname,'../..'),lock.runtimeFiles]]){
  if(!files||!Object.keys(files).length)throw Error('Missing build bindings');
  for(const [relative,expected] of Object.entries(files)){
   const file=path.resolve(root,relative),inside=path.relative(root,file);
   if(inside==='..'||inside.startsWith('..'+path.sep)||path.isAbsolute(inside))throw Error('Invalid binding');
   if(sha(await fs.readFile(file))!==expected)throw Error('Rebuild after changing '+relative);
  }
 }
 const {chromium}=dependency('playwright'),options={headless:true};if(process.env.PIXEL_BROWSER_EXECUTABLE)options.executablePath=process.env.PIXEL_BROWSER_EXECUTABLE;
 const browser=await chromium.launch(options);
 try{
  const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.join(project,'build/film.html')).href+'?render');await page.evaluate(async()=>{await window.sceneReady;await document.fonts.ready;});
  if(await page.evaluate(()=>window.sceneInputHash)!==resolved.inputHash)throw Error('Stale HTML');
  await page.evaluate(async({count,fps})=>{for(let f=0;f<count;f++)await window.renderFrame(f/fps);},{count:resolved.durationFrames,fps:resolved.project.fps});
  await fs.mkdir(out,{recursive:true});const captures=[],images=[];
  for(const [id,label] of [['enter','分心疲惫'],['hold_head','抬手抱头'],['slump','俯身趴下'],['focus','回到项目']]){
   const shot=resolved.shots[0],frame=id==='enter'?30:shot.events.find(e=>e.id===id).frame+1;
   const data=await page.evaluate(async({frame,fps})=>{await window.renderFrame(frame/fps);return document.querySelector('#film').toDataURL('image/jpeg',.94).split(',')[1];},{frame,fps:resolved.project.fps});
   const bytes=Buffer.from(data,'base64'),file=id+'.jpg';await fs.writeFile(path.join(out,file),bytes);
   captures.push({event:id,label,frame,file,sha256:sha(bytes)});images.push({label,image:'data:image/jpeg;base64,'+data});
  }
  const sheet=await page.evaluate(async images=>{
   const canvas=document.createElement('canvas');canvas.width=1920;canvas.height=1160;const g=canvas.getContext('2d');g.fillStyle='#0c121a';g.fillRect(0,0,1920,1160);
   for(let i=0;i<images.length;i++){const x=i%2*960,y=Math.floor(i/2)*580,im=new Image();im.src=images[i].image;await im.decode();g.drawImage(im,x,y,960,540);g.fillStyle='#ffcf86';g.font='600 26px "Microsoft YaHei", sans-serif';g.fillText(images[i].label,x+24,y+572);}
   return canvas.toDataURL('image/jpeg',.94).split(',')[1];
  },images);
  const bytes=Buffer.from(sheet,'base64');await fs.writeFile(path.join(out,'states.jpg'),bytes);
  if(errors.length)throw Error(errors.join('\n'));
  await fs.writeFile(path.join(out,'manifest.json'),JSON.stringify({schemaVersion:1,source:'Actual canvas output of the standalone whole-illustration example',inputHash:resolved.inputHash,
   sourceHashes:lock.inputFiles,runtimeSha256:sha(await fs.readFile(path.join(project,'build/runtime.js'))),browser:browser.version(),framesExercised:resolved.durationFrames,pageErrors:errors,
   captures,overview:{file:'states.jpg',sha256:sha(bytes)},note:'Whole-frame key-pose limited animation. New art is not user approved; stills do not certify continuous motion or listening quality.'},null,2)+'\n');
  console.log(JSON.stringify({images:5,framesExercised:resolved.durationFrames,pageErrors:errors}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
