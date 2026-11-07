import {existsSync,realpathSync} from 'node:fs';
import {execFile} from 'node:child_process';
import path from 'node:path';
export const createProjectStateMiddleware = ({rootDir, python=process.env.PIXEL_PYTHON||'python3'}) => (req,res) => {
  const send=(code,value)=>{res.statusCode=code;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(value));};
  if(req.method!=='GET'){send(405,{error:'仅支持只读检查'});return;}
  if(req.headers.origin){try{if(new URL(req.headers.origin).host!==req.headers.host)throw new Error();}catch{send(403,{error:'仅允许同源检查'});return;}}
  try{
    const source=realpathSync(path.join(rootDir,'proj'));
    const video=path.resolve(source,'../../..');
    const cli=path.resolve(rootDir,'../scripts/video.py');
    if(path.basename(source)!=='src'||path.basename(path.dirname(source))!=='remotion'||path.basename(path.dirname(path.dirname(source)))!=='build'||!existsSync(path.join(video,'project.json'))||!existsSync(cli))throw new Error('当前没有可检查的基础源工程');
    execFile(python,[cli,'changes',video],{cwd:rootDir,timeout:30000,maxBuffer:4*1024*1024,env:{...process.env,PYTHONUTF8:'1'}},(e,out,err)=>{
      if(e){send(409,{error:(err||e.message).slice(-1500)});return;}
      try{send(200,JSON.parse(out));}catch{send(500,{error:'源检查输出无法读取'});}
    });
  }catch(e){send(409,{error:e.message});}
};
