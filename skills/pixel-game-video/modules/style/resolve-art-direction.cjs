#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const file=path.join(__dirname,'art-profiles.json');
const pack=JSON.parse(fs.readFileSync(file,'utf8'));
const hash=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const artDirection=require('./art-direction.js');
function resolve(main,fragment=null){
  return artDirection.resolve(pack,hash,main,fragment);
}
module.exports={resolve};
if(require.main===module){
  const args=process.argv.slice(2);
  if(args.length<1||args.length>2){console.error('Usage: node resolve-art-direction.cjs MAIN_STYLE [FRAGMENT_STYLE]');process.exitCode=1;}
  else try{console.log(JSON.stringify(resolve(args[0],args[1]||null),null,2));}catch(e){console.error(e.message);process.exitCode=1;}
}
