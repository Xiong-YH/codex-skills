// Documentation screenshots from the actual engine, not hand-drawn mockups.
// Run video.py build modules/components/examples/guide before this script.
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const {createRequire} = require('node:module');
const {pathToFileURL} = require('node:url');

function dependency(name, project) {
  const loaders = [createRequire(path.join(project, 'package.json')), require];
  if (process.env.PIXEL_NODE_MODULES) loaders.push(name => require(path.join(path.resolve(process.env.PIXEL_NODE_MODULES), name)));
  for (const load of loaders) {
    try { return load(name); } catch (error) { if (error.code !== 'MODULE_NOT_FOUND') throw error; }
  }
  throw Error('Missing ' + name + '; install skill dependencies or set PIXEL_NODE_MODULES.');
}
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

async function main() {
  const project = path.join(__dirname, 'examples/guide');
  const out = path.join(__dirname, 'assets/reference');
  const read = async file => JSON.parse(await fs.readFile(file, 'utf8'));
  const gallery = await read(path.join(project, 'gallery.json'));
  const resolved = await read(path.join(project, 'build/resolved-timeline.json'));
  const payload = await read(path.join(project, 'build/payload.json'));
  const lock = await read(path.join(project, 'build/project-lock.json'));
  const catalog = await read(path.join(__dirname, 'catalog.json'));
  const wanted = catalog.items.filter(i => i.status === 'implemented').map(i => i.kind).sort();
  const available = gallery.entries.filter(i => i.group === 'component').map(i => i.id).sort();
  if (JSON.stringify(wanted) !== JSON.stringify(available)) throw Error('Guide examples must cover every implemented component exactly once.');
  if (payload.resolved.inputHash !== resolved.inputHash) throw Error('Stale payload; rebuild guide examples.');
  if (lock.inputHash !== resolved.inputHash) throw Error('Stale build lock; rebuild guide examples.');
  const skill=path.resolve(__dirname,'../..');
  for(const [base,files] of [[project,lock.inputFiles],[skill,lock.runtimeFiles]]) {
    if(!files||!Object.keys(files).length)throw Error('Missing build bindings; rebuild guide examples.');
    for(const [relative,expected] of Object.entries(files)) {
      const file=path.resolve(base,relative);
      const inside=path.relative(base,file);
      if(inside==='..'||inside.startsWith('..'+path.sep)||path.isAbsolute(inside))throw Error('Invalid build binding.');
      if(sha(await fs.readFile(file))!==expected)throw Error('Source/runtime changed; rebuild guide examples before capturing: '+relative);
    }
  }
  const {chromium} = dependency('playwright', project);
  const options = {headless:true};
  if (process.env.PIXEL_BROWSER_EXECUTABLE) options.executablePath = process.env.PIXEL_BROWSER_EXECUTABLE;
  const browser = await chromium.launch(options);
  try {
    const page = await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
    const errors=[];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(pathToFileURL(path.join(project,'build/film.html')).href+'?render', {waitUntil:'load'});
    await page.evaluate(async()=>{await window.sceneReady;await document.fonts.ready;});
    if (await page.evaluate(()=>window.sceneInputHash) !== resolved.inputHash) throw Error('Stale HTML; rebuild guide examples.');
    // Exercise all states to catch overflow between the selected stills.
    await page.evaluate(async count=>{for(let f=0;f<count;f++)await window.renderFrame(f/60);},resolved.durationFrames);
    const screenshots=[], previews=[];
    async function save(name,data) {
      const bytes=Buffer.from(data,'base64');
      await fs.mkdir(out,{recursive:true});
      await fs.writeFile(path.join(out,name),bytes);
      screenshots.push({file:'assets/reference/'+name,sha256:sha(bytes)});
    }
    async function capture(entry,localFrame) {
      const shot=resolved.shots.find(s=>s.id===entry.shotId);
      if(!shot||!Number.isInteger(localFrame)||localFrame<0||localFrame>=shot.durationFrames) throw Error('Invalid gallery frame: '+entry.id);
      return page.evaluate(async frame=>{
        await window.renderFrame(frame/60);
        return document.querySelector('canvas#film').toDataURL('image/jpeg',.94).split(',')[1];
      },shot.startFrame+localFrame);
    }
    for (const entry of gallery.entries) {
      const jpg=await capture(entry,entry.localFrame);
      await save(entry.id+'.jpg',jpg);
      previews.push({...entry,image:'data:image/jpeg;base64,'+jpg});
      if(entry.states.length) {
        const images=[];
        for(const state of entry.states) images.push({...state,image:'data:image/jpeg;base64,'+await capture(entry,state.frame)});
        const strip=await page.evaluate(async images=>{
          const canvas=document.createElement('canvas');canvas.width=1920;canvas.height=426;
          const g=canvas.getContext('2d');g.fillStyle='#111820';g.fillRect(0,0,1920,426);
          for(let i=0;i<images.length;i++) {
            const im=new Image();im.src=images[i].image;await im.decode();
            g.drawImage(im,i*640,0,640,360);
            g.fillStyle='#eac47c';g.font='600 28px "Microsoft YaHei", sans-serif';g.textAlign='center';g.fillText(images[i].label,i*640+320,402);
          }
          return canvas.toDataURL('image/jpeg',.94).split(',')[1];
        },images);
        await save(entry.id+'-states.jpg',strip);
      }
    }
    const overview=await page.evaluate(async entries=>{
      const canvas=document.createElement('canvas');canvas.width=1920;canvas.height=1880;
      const g=canvas.getContext('2d');g.fillStyle='#0c121a';g.fillRect(0,0,1920,1880);
      g.fillStyle='#f5ebd4';g.font='700 48px "Microsoft YaHei", sans-serif';g.fillText('12 类像素信息组件',36,64);
      g.fillStyle='#b4b8bb';g.font='25px "Microsoft YaHei", sans-serif';g.fillText('当前引擎实渲染 · 按信息关系选型 · 下方指南可查看大图与状态对照',36,108);
      for(let i=0;i<entries.length;i++) {
        const e=entries[i],x=36+(i%3)*628,y=142+Math.floor(i/3)*430;
        g.fillStyle='#eac47c';g.font='600 28px "Microsoft YaHei", sans-serif';g.fillText(String(i+1).padStart(2,'0')+'  '+e.title+'  /  '+e.id,x,y+34);
        const im=new Image();im.src=e.image;await im.decode();g.drawImage(im,x,y+54,600,337.5);
        g.strokeStyle='#394550';g.lineWidth=2;g.strokeRect(x,y+54,600,337.5);
      }
      return canvas.toDataURL('image/jpeg',.94).split(',')[1];
    },previews.filter(e=>e.group==='component'));
    await save('overview.jpg',overview);
    if(errors.length)throw Error(errors.join('\n'));
    const sources={};
    for(const name of ['project.json','timeline.json','text.json','audio.json','gallery.json','media/azong.png']) sources['examples/guide/'+name]=sha(await fs.readFile(path.join(project,name)));
    await fs.writeFile(path.join(out,'manifest.json'),JSON.stringify({schemaVersion:1,source:'Actual canvas output from the current pixel-game-video engine',inputHash:resolved.inputHash,style:resolved.project.style,sourceDimensions:[1920,1080],sourceHashes:sources,runtimeSha256:sha(await fs.readFile(path.join(project,'build/runtime.js'))),browser:browser.version(),pageErrors:errors,framesExercised:resolved.durationFrames,captures:gallery.entries,screenshots,note:'State strips are sampled states; no claim of continuous motion/audio review. Neutral plate is for documentation comparison, not a project default.'},null,2)+'\n');
    console.log(JSON.stringify({components:wanted.length,combinations:gallery.entries.length-wanted.length,images:screenshots.length,framesExercised:resolved.durationFrames,pageErrors:errors}));
  } finally {await browser.close();}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
