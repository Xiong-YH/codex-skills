// Experimental 8-second renderer, not a general production renderer.
// Pure local rendering of trusted, authored scene JS using Skia Canvas; no browser or network.
// Usage: node native-canvas-render.cjs PROJECT OUTPUT.mp4 [--preview-only] [--frames-only]
const fs=require('node:fs/promises'),path=require('node:path'),vm=require('node:vm'),cp=require('node:child_process');
const loadDependency=name=>require(process.env.PIXEL_NODE_MODULES?path.join(path.resolve(process.env.PIXEL_NODE_MODULES),name):name);
const {createCanvas,Image,GlobalFonts}=loadDependency('@napi-rs/canvas');
const sharp=loadDependency('sharp');
async function main(){
 const [projectArg,outputArg,...flags]=process.argv.slice(2);if(!projectArg||!outputArg)throw Error('Need PROJECT and OUTPUT.mp4');
 const project=path.resolve(projectArg),output=path.resolve(outputArg),work=path.join(project,'work','windows-render'),frames=path.join(work,'frames');
 const config=JSON.parse(await fs.readFile(path.join(project,'project.json'),'utf8'));
 if(config.duration!==8||config.fps!==60||config.width!==1920||config.height!==1080)throw Error('Expected 8s/60fps/1920x1080');
 await fs.mkdir(frames,{recursive:true});
 if(process.platform==='win32'&&process.env.SystemRoot){
   for(const [font,family] of [['msyh.ttc','Microsoft YaHei'],['msyhbd.ttc','Microsoft YaHei'],['seguiemj.ttf','Segoe UI Emoji']]){
     const fontPath=path.join(process.env.SystemRoot,'Fonts',font);try{GlobalFonts.registerFromPath(fontPath,family);}catch{}
   }
 }
 const context={console,Image,Runtime:config,setTimeout,clearTimeout,URLSearchParams,document:{createElement(tag){if(tag!=='canvas')throw Error('Unsupported element '+tag);return createCanvas(300,150);}}};
 context.window=context;vm.createContext(context);
 for(const name of ['pixels.js','assets.js','captions.js','mouth.js','visual.js','motion.js','film.js']){
   const source=await fs.readFile(path.join(project,'source',name),'utf8');vm.runInContext(source,context,{filename:name,timeout:20000});
 }
 await context.ProgrammerFilm.ready;
 const previewTimes=[.7,2.3,2.85,3.5,4,4.8,6.4,7.8],previews=[];
 for(const time of previewTimes){
   const buffer=await context.ProgrammerFilm.draw(time).encode('png');previews.push(buffer);
   await fs.writeFile(path.join(work,`preview-${time}.png`),buffer);
 }
 const thumbs=await Promise.all(previews.map(buffer=>sharp(buffer).resize(480,270,{kernel:'nearest'}).png().toBuffer()));
 await sharp({create:{width:1920,height:540,channels:3,background:'#171d2b'}}).composite(thumbs.map((input,i)=>({input,left:(i%4)*480,top:Math.floor(i/4)*270}))).png().toFile(path.join(work,'contact-sheet.png'));
 console.log('Preview: '+path.join(work,'contact-sheet.png'));if(flags.includes('--preview-only'))return;
 for(let i=0;i<480;i++){
   const buffer=await context.ProgrammerFilm.draw(i/60).encode('png');
   await fs.writeFile(path.join(frames,`frame_${String(i).padStart(4,'0')}.png`),buffer);
   if(i%60===0)console.log(`Rendered ${i}/480`);
 }
 await fs.writeFile(path.join(work,'render-metrics.json'),JSON.stringify({renderer:'@napi-rs/canvas (local Skia)',duration:8,fps:60,width:1920,height:1080,frameCount:480,sourceStart:0,sourceEnd:8,durationSeconds:8,pageErrors:[]},null,2));
 if(flags.includes('--frames-only'))return;
 const child=cp.spawn(process.execPath,[path.join(__dirname,'windows-render.cjs'),project,output,'--encode-only'],{windowsHide:true,stdio:'inherit'});
 child.on('exit',code=>{process.exitCode=code??1;});
}
main().catch(error=>{console.error(error);process.exitCode=1;});
