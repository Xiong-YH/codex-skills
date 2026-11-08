/* Build the portable workspace from maintained source modules and one project. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const skill=path.resolve(__dirname,'..'),assets=path.join(skill,'assets/director-workspace');
const template=path.join(skill,'assets/templates/workflow-overview.html'),welcomePath=path.join(skill,'assets/templates/creator-welcome.json');
const model=require(path.join(assets,'model.js'));
function readJSON(file){if(fs.statSync(file).size>12000000)throw Error('Project JSON exceeds 12 MB.');return JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));}
function literal(value){return JSON.stringify(value).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');}
function build(project,output){
 model.validate(project);let html=fs.readFileSync(template,'utf8').replace(/\r\n/g,'\n');
 const media={};
 if(output){const outputDir=path.dirname(output),director=project.stages.director;const videos=[director?.production?.artifacts?.video,...(director?.segments||[]).flatMap(segment=>[segment.plan?.artifacts?.video,segment.production?.artifacts?.video])];for(const video of new Set(videos)){if(typeof video!=='string'||!/^[-a-z\d_./]+\.mp4$/i.test(video)||video.startsWith('/')||video.split('/').includes('..'))continue;const file=path.join(outputDir,video);if(fs.existsSync(file)&&fs.statSync(file).size<=20000000)media[video]='data:video/mp4;base64,'+fs.readFileSync(file).toString('base64');}}
 const runtime='window.DirectorMedia='+literal(media)+';\n'+['model.js','renderer.js'].map(file=>fs.readFileSync(path.join(assets,file),'utf8')).concat(fs.readFileSync(path.join(skill,'assets/segment-review/script-bridge.js'),'utf8'),fs.readFileSync(path.join(assets,'workspace.js'),'utf8')).join('\n');
 for(const marker of ['/* workspace-style */','/* workspace-project */','/* workspace-runtime */'])if(!html.includes(marker))throw Error('Workspace marker missing: '+marker);
 html=html.replace('/* workspace-style */',()=>fs.readFileSync(path.join(assets,'workspace.css'),'utf8')).replace('/* workspace-project */',()=>'let CREATOR_PROJECT='+literal(project)+';').replace('/* workspace-runtime */',()=>runtime);
 new vm.Script(html.match(/<script>([\s\S]*?)<\/script>/)[1]);
 if(output){fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,html);}
 return html;
}
function main(){
 const args=process.argv.slice(2);
 let stateFile=path.resolve('work/script-creator/script-creator.json'),output;
 for(let i=0;i<args.length;i++){
  const arg=args[i];
  if(arg==='--state'||arg==='--output'){
   if(!args[i+1]||args[i+1].startsWith('--'))throw Error('Missing value for '+arg);
   if(arg==='--state')stateFile=path.resolve(args[++i]);
   else output=path.resolve(args[++i]);
  }else if(!arg.startsWith('-'))output=path.resolve(arg);
  else throw Error('Unknown argument: '+arg);
 }
 output??=path.join(path.dirname(stateFile),'script-creator.html');
 if(!fs.existsSync(stateFile)){
  fs.mkdirSync(path.dirname(stateFile),{recursive:true});
  fs.copyFileSync(welcomePath,stateFile);
 }
 const state=readJSON(stateFile);
 build(state,output);
 console.log('Updated workspace: '+output+'; project: '+state.projectId+'; revision: '+state.revision);
}
if(require.main===module)main();module.exports={build,readJSON};
