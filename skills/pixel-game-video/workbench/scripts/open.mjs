#!/usr/bin/env node
// Adapted from video-shotcraft, 2026-10-21: standalone local-only workbench, port 5208,
// no unverified process termination and no deletion of saved edits.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, openSync, readFileSync, readdirSync, realpathSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const wb = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const portAt = args.indexOf('--port');
const port = Number(portAt < 0 ? 5208 : args[portAt + 1]);
const projectArg = args.find((arg, i) => !arg.startsWith('--') && (portAt < 0 || i !== portAt + 1));
const log = message => console.log(`[workbench] ${message}`);
const die = message => {console.error(`[workbench] ${message}`); process.exit(1);};
if (!Number.isInteger(port) || port < 1024 || port > 65535) die('--port 必须在 1024–65535');
for (const arg of args.filter(a => a.startsWith('--'))) if (!['--port','--no-open','--no-import'].includes(arg)) die(`未知选项：${arg}`);
const link = join(wb, 'proj');
const isLink = p => {try {return lstatSync(p).isSymbolicLink();} catch {return false;}};
const relink = Boolean(projectArg);
let src;
if (projectArg) {
  const p = resolve(projectArg);
  src = [join(p,'src'),join(p,'remotion','src')].find(dir => ['workbench.ts','workbench.tsx'].some(f => existsSync(join(dir,f))));
  if (!src) die(`工程没有 src/workbench.ts 清单：${p}`);
} else if (isLink(link)) src=realpathSync(link);
else die('首次使用：node scripts/open.mjs <Remotion工程目录> [--port 5208] [--no-open]');
const url=`http://127.0.0.1:${port}/`;
const alive = async () => {try {const r=await fetch(url,{signal:AbortSignal.timeout(1000)});return r.status > 0;}catch{return false;}};
const pidFile=join(wb,`.dev-${port}.pid`), viteBin=join(wb,'node_modules/vite/bin/vite.js');
const pidAlive = pid => {try {process.kill(pid,0);return true;}catch{return false;}};
let managed;
if (existsSync(pidFile)) {
  const pid=Number(readFileSync(pidFile,'utf8').trim());
  const ps=spawnSync('ps',['-o','command=','-p',String(pid)],{encoding:'utf8'});
  if (Number.isInteger(pid) && pid > 1 && pidAlive(pid) && ps.status===0 && ps.stdout.includes(viteBin) && ps.stdout.includes(`--port ${port}`)) managed=pid;
  else unlinkSync(pidFile);
}
if (await alive()) {
  if (!managed) die(`端口 ${port} 已被其他进程使用。请换 --port；脚本不会停止未知进程。`);
  if (relink) {
    process.kill(managed);unlinkSync(pidFile);
    const deadline=Date.now()+10000;
    while(await alive()) {if(Date.now()>deadline)die('旧工作台未停止，请手动检查后重试');await new Promise(r=>setTimeout(r,250));}
  }
}
if (relink) {
  if (existsSync(link) && !isLink(link)) die('proj 是真实目录，拒绝覆盖。请先备份后移走。');
  const pub=join(wb,'public'), projectPublic=join(dirname(src),'public');
  mkdirSync(pub,{recursive:true});
  // Verify real-file collisions before changing any links.
  const entries=existsSync(projectPublic)?readdirSync(projectPublic).filter(n=>!n.startsWith('.')):[];
  for(const name of entries) if(existsSync(join(pub,name))&&!isLink(join(pub,name)))die(`public/${name} 是真实文件，拒绝覆盖`);
  if(isLink(link))unlinkSync(link);symlinkSync(src,link);
  for(const name of readdirSync(pub))if(isLink(join(pub,name)))unlinkSync(join(pub,name));
  for(const name of entries)symlinkSync(join(projectPublic,name),join(pub,name));
  log(`已链接 ${dirname(src)}（${entries.length} 项素材）`);
}
if(!existsSync(join(wb,'node_modules'))){
  log('安装工作台依赖…');
  const r=spawnSync('npm',['ci','--ignore-scripts','--no-audit','--no-fund'],{cwd:wb,stdio:'inherit'});
  if(r.status!==0)die('依赖安装失败，请检查网络后重试 npm ci --ignore-scripts');
}
const gen=spawnSync(process.execPath,[join(wb,'scripts/gen-index.mjs')],{cwd:wb,stdio:'inherit'});
if(gen.status!==0)die('素材索引生成失败');
if(!(await alive())){
  const fd=openSync(join(wb,'.dev.log'),'a');
  const child=spawn(process.execPath,[viteBin,'--host','127.0.0.1','--port',String(port),'--strictPort'],{cwd:wb,detached:true,stdio:['ignore',fd,fd]});
  child.unref();writeFileSync(pidFile,String(child.pid));
  const deadline=Date.now()+60000;
  while(!(await alive())){if(!pidAlive(child.pid)||Date.now()>deadline)die(`工作台启动失败，查看 ${join(wb,'.dev.log')}`);await new Promise(r=>setTimeout(r,400));}
}
const openUrl=url+(args.includes('--no-import')?'':'?import=project');
if(!args.includes('--no-open')){
  const cmd=process.platform==='darwin'?'open':process.platform==='win32'?'cmd':'xdg-open';
  const browserArgs=process.platform==='win32'?['/c','start','',openUrl]:[openUrl];
  spawn(cmd,browserArgs,{stdio:'ignore',detached:true}).unref();
}
log(`工作台：${openUrl}`);
log(`停止本工作台进程前请先保存工程 JSON；PID 文件：${pidFile}`);
