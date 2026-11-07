/* Optional real-browser regression. node test_workspace_browser.cjs [packages-dir] [browser-channel] */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {chromium}=require(process.argv[2]?path.join(process.argv[2],'playwright'):'playwright');
const builder=require('../scripts/build-workspace.cjs'),M=require('../assets/director-workspace/model.js');
const root=path.resolve(__dirname,'../../..'),out=path.join(root,'.tmp/director-browser-tests');fs.mkdirSync(out,{recursive:true});
const project=builder.readJSON(path.resolve(__dirname,'../examples/director-workflow/project.json'));
const pageFile=path.join(out,'script-creator.html');builder.build(project,pageFile);
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.argv[3]?{channel:process.argv[3]}:{})});
 try{
  const context=await browser.newContext({viewport:{width:1280,height:960},acceptDownloads:true}),page=await context.newPage(),errors=[];
  page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.dismiss());
  await page.goto(pathToFileURL(pageFile).href);
  assert.equal(await page.title(),'导演工作台');
  await page.getByRole('button',{name:/放下成绩单，进入模拟/}).click();
  assert.ok(await page.locator('.sketch svg').count());
  assert.match(await page.locator('.sketch figcaption').innerText(),/可调整、替换或不采纳/);
  await page.screenshot({path:path.join(out,'plain.png'),fullPage:true});
  const before=await page.evaluate(()=>DirectorWorkspace.getProject().stages.director.segments[1].plan);
  await page.locator('#plain-description').fill(project.stages.director.segments[1].description+' 改为先露出左边的人。');
  assert.match(await page.locator('.basis-note').innerText(),/重新核对/);
  await page.getByRole('button',{name:/03\s*设计与白模/}).click();
  assert.equal(await page.getByRole('button',{name:'导出本段样板',exact:true}).isDisabled(),true);
  assert.deepEqual(await page.evaluate(()=>DirectorWorkspace.getProject().stages.director.segments[1].plan),before);
  await page.locator('.more > summary').click();await page.getByRole('button',{name:'撤销上次改稿'}).click();await page.locator('.more > summary').click();
  await page.getByRole('button',{name:'导出本段样板',exact:true}).waitFor({state:'visible'});
  await page.waitForFunction(()=>!Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='导出本段样板').disabled);
  const canvas=page.locator('canvas');
  const initial=await canvas.evaluate(c=>c.toDataURL());
  await page.locator('input[aria-label="样板视频时间"]').fill('1.6');
  await page.waitForTimeout(150);
  assert.notEqual(await canvas.evaluate(c=>c.toDataURL()),initial,'the grade sheet actually moves in the preview');
  await page.screenshot({path:path.join(out,'dynamic.png'),fullPage:true});
  await page.locator('#feedback-segment-s2').fill('成绩单完全退下后，再保持一会儿。');
  await page.reload();assert.equal(await page.locator('#feedback-segment-s2').inputValue(),'成绩单完全退下后，再保持一会儿。');
  const actualBefore=await page.evaluate(()=>DirectorWorkspace.getProject().stages.director.phase);
  await page.getByRole('button',{name:/01\s*拆大模块/}).click();
  assert.equal(await page.evaluate(()=>DirectorWorkspace.getProject().stages.director.phase),actualBefore,'browsing never advances actual progress');
  await page.getByRole('button',{name:/03\s*设计与白模/}).click();
  await page.getByRole('button',{name:'连看前段与本段'}).click();
  await page.waitForTimeout(180);
  assert.match(await page.locator('.player-controls output').innerText(),/6\.0 s/);
  await page.getByRole('button',{name:'暂停',exact:true}).click();

  const downloads=[];page.on('download',d=>downloads.push(d));
  await page.getByRole('button',{name:'导出本段样板',exact:true}).click();
  await page.waitForFunction(()=>document.getElementById('cancel-export').hidden,{},{timeout:20000});
  for(let i=0;i<50&&downloads.length<2;i++)await new Promise(r=>setTimeout(r,100));
  assert.equal(downloads.length,2,'real video plus same-export manifest');
  for(const d of downloads)await d.saveAs(path.join(out,d.suggestedFilename()));
  const media=path.join(out,'animatic-s2.webm'),manifest=JSON.parse(fs.readFileSync(path.join(out,'animatic-s2.manifest.json'),'utf8'));
  assert.ok(fs.statSync(media).size>2000);assert.equal(manifest.audio,'none');assert.equal(manifest.segments[0].planHash,M.hash(project.stages.director.segments[1].plan));
  const meta=await page.evaluate(async encoded=>{const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0)),url=URL.createObjectURL(new Blob([bytes],{type:'video/webm'})),video=document.createElement('video');video.muted=true;video.src=url;await new Promise((resolve,reject)=>{video.onloadeddata=resolve;video.onerror=()=>reject(Error('Exported WebM cannot decode.'));});const canvas=document.createElement('canvas');canvas.width=960;canvas.height=540;const ctx=canvas.getContext('2d');async function at(time){await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Recorded video seek timed out.')),6000);video.addEventListener('seeked',()=>{clearTimeout(timeout);resolve();},{once:true});video.currentTime=time;});ctx.drawImage(video,0,0);return canvas.toDataURL();}const a=await at(.15),b=await at(1.7),result={width:video.videoWidth,height:video.videoHeight,motion:a!==b};URL.revokeObjectURL(url);return result;},fs.readFileSync(media).toString('base64'));
  assert.deepEqual(meta,{width:960,height:540,motion:true},'actual exported frames must contain the visible movement');
  await page.getByRole('button',{name:/整理修改/}).click();const payload=await page.locator('#request-payload').inputValue();assert.ok(payload.includes('成绩单完全退下后'));assert.ok(payload.includes(project.projectId));assert.ok(payload.includes('s2'));await page.getByRole('button',{name:'关闭请求',exact:true}).click();

  await page.setViewportSize({width:390,height:844});
  await page.getByRole('button',{name:/02\s*大白话与草图/}).click();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'mobile layout must not overflow');
  await page.screenshot({path:path.join(out,'mobile.png'),fullPage:true});
  assert.deepEqual(errors,[]);
  const oldReturn={schema:'script-review/1',kind:'return',id:'old-review',revision:'unknown-old-source',suggestions:[{shotId:'s2',dimension:'layout',sourceKey:'stage-3-field-2',sourceValue:'旧原文',proposal:'旧审阅建议，需要核对'}]};
  const returnFile=path.join(out,'old-review-return.json');fs.writeFileSync(returnFile,JSON.stringify(oldReturn));const originalDescription=await page.evaluate(()=>DirectorWorkspace.getProject().stages.director.segments[1].description);
  await page.locator('#import-project').setInputFiles(returnFile);await page.waitForFunction(()=>DirectorWorkspace.getRecord().importedReviews.length===1);assert.equal(await page.evaluate(()=>DirectorWorkspace.getRecord().importedReviews.length),1);assert.equal(await page.evaluate(()=>DirectorWorkspace.getProject().stages.director.segments[1].description),originalDescription,'old review suggestions never overwrite current source');
  await page.reload();assert.equal(await page.evaluate(()=>DirectorWorkspace.getRecord().importedReviews.length),1);

  // Preserve an old-page draft and quarantine a same-revision source conflict across refreshes.
  await page.evaluate(({id,revision})=>{localStorage.setItem(`script-creator-${id}-revision-${revision}`,JSON.stringify({'stage-0-field-2':'旧记忆点草稿'}));localStorage.setItem(`director-workspace-${id}-revision-${revision}`,JSON.stringify({schema:'director-draft/1',projectId:id,revision,baseHash:'different-source',changes:[],notes:{global:'来源不同的意见'}}));},{id:project.projectId,revision:project.revision});
  await page.reload();assert.equal(await page.locator('#conflict-banner').isVisible(),true);
  await page.getByRole('button',{name:/01\s*拆大模块/}).click();await page.reload();
  assert.equal(await page.locator('#conflict-banner').isVisible(),true);
  await page.getByRole('button',{name:/整理修改/}).click();const preserved=await page.locator('#request-payload').inputValue();assert.ok(preserved.includes('旧记忆点草稿'));assert.ok(preserved.includes('来源不同的意见'));
  await page.goto(pathToFileURL(pageFile).href+'#creator-state='+encodeURIComponent(JSON.stringify({invalid:true})));await page.reload();
  assert.match(await page.locator('#conflict-banner').innerText(),/导入地址无效/);
  assert.equal(await page.evaluate(()=>DirectorWorkspace.getProject().projectId),project.projectId);
  assert.deepEqual(errors,[]);await context.close();
  console.log('PASS: sketches, stale-preview blocking, real movement, adjacent playback, actual decodable WebM+manifest, comments, source conflicts, legacy drafts and mobile layout.');
  console.log('Artifacts: '+out);
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
