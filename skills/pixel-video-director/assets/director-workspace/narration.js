(function(root){
'use strict';

let database;
function openDatabase(){
 if(!database){
  database=new Promise((resolve,reject)=>{
   const request=indexedDB.open('director-narration',1);
   request.onupgradeneeded=()=>request.result.createObjectStore('recordings');
   request.onsuccess=()=>resolve(request.result);
   request.onerror=()=>reject(request.error);
  });
 }
 return database;
}

async function read(projectId){
 const db=await openDatabase();
 return new Promise((resolve,reject)=>{
  const request=db.transaction('recordings').objectStore('recordings').get(projectId);
  request.onsuccess=()=>resolve(request.result||null);
  request.onerror=()=>reject(request.error);
 });
}

async function write(projectId,previous,next){
 const db=await openDatabase();
 return new Promise((resolve,reject)=>{
  const transaction=db.transaction('recordings','readwrite');
  const store=transaction.objectStore('recordings');
  const request=store.get(projectId);
  let conflict=false;
  request.onsuccess=()=>{
   if((request.result?.version||0)!==(previous?.version||0)){
    conflict=true;
    transaction.abort();
    return;
   }
   store.put(next,projectId);
  };
  transaction.oncomplete=resolve;
  transaction.onabort=()=>reject(Error(conflict?'另一个页面已修改旁白。请刷新后继续。':'旁白无法保存，请检查浏览器存储空间。'));
 });
}

function probe(url){
 return new Promise((resolve,reject)=>{
  const media=document.createElement('audio');
  const finish=(error,duration)=>{
   clearTimeout(timeout);
   media.removeAttribute('src');
   media.load();
   if(error)reject(Error(error));else resolve(duration);
  };
  const timeout=setTimeout(()=>finish('读取录音超时。'),15000);
  media.addEventListener('loadedmetadata',()=>{
   const duration=Math.round(media.duration*1000);
   if(!Number.isSafeInteger(duration)||duration<2)finish('无法读取录音时长。');
   else finish(null,duration);
  },{once:true});
  media.addEventListener('error',()=>finish('无法播放这份录音，请尝试 WAV、MP3 或 M4A。'),{once:true});
  media.preload='metadata';
  media.src=url;
 });
}

function mount(host,project,{node,button,download},{reviewOnly=false}={}){
 const M=root.DirectorModel,R=root.DirectorRender;
 const segments=M.view(project).segments;
 const byId=new Map(segments.map(segment=>[segment.id,segment]));
 const prepared=project.stages.director?.narration;
 const labelOf=segment=>segment.title||segment.id;
 const box=node('section',undefined,reviewOnly?'narration narration-review':'paper narration');
 const input=node('input');
 input.type='file';
 input.accept='audio/*,.wav,.mp3,.m4a,.aac,.ogg,.flac,.webm';
 input.setAttribute('aria-label','导入旁白录音');
 const audio=node('audio');
 audio.controls=true;
 audio.preload='metadata';
 audio.setAttribute('aria-label',reviewOnly?'配音版播放进度':'整段旁白');
 const clock=node('input');
 clock.type='number';
 clock.min='0';
 clock.step='.001';
 const timeLabel=node('label',undefined,'narration-time');
 timeLabel.append(node('span','播放位置（秒）'),clock);
 const status=node('p','正在读取本地旁白…','muted');
 status.setAttribute('role','status');
 const rows=node('div',undefined,'narration-rows');
 const preview=node('div',undefined,'narration-preview');
 const controls=node('div',undefined,'export-row');
 const playLabel=reviewOnly?'播放配音版':'连播全片（含旁白）';
 const continuous=button(playLabel,()=>void playContinuous(),'primary');
 const split=button('在播放位置切开',splitAtPlayhead,'primary');
 const handoff=button('下载对位表',exportAlignment);
 const loadPrepared=button('载入本次已对位旁白',()=>void importPrepared());
 loadPrepared.hidden=true;
 controls.append(continuous);
 if(reviewOnly){
  box.append(preview,controls,audio,status);
 }else{
  controls.append(timeLabel,split,handoff);
  box.append(node('h2','旁白对位'),node('p','导入整段录音，在每个镜头的讲述边界切开，再为每段选择镜头。','muted'),input,loadPrepared,status,audio,controls,preview,rows);
 }
 host.append(box);

 let record=null,sourceUrl='',busy=true,disposed=false;
 let audition=null,raf=0;

 function seconds(ms){return (ms/1000).toFixed(3);}
 function allAssigned(){return record?.clips.length&&record.clips.every(clip=>byId.has(clip.segmentId));}
 function disableControls(){
  input.disabled=busy;
  loadPrepared.disabled=busy;
  loadPrepared.hidden=!prepared||record?.file.name===prepared.recording?.name;
  clock.disabled=busy||!record;
  continuous.disabled=busy||!allAssigned();
  split.disabled=busy||!record;
  handoff.disabled=busy||!record?.clips.some(clip=>byId.has(clip.segmentId));
  for(const control of rows.querySelectorAll('button,input,select'))control.disabled=busy||control.dataset.unavailable==='true';
 }

 function showRecording(next,url){
  if(sourceUrl)URL.revokeObjectURL(sourceUrl);
  sourceUrl=url||URL.createObjectURL(next.file);
  audio.src=sourceUrl;
  clock.max=seconds(next.durationMs);
  clock.value='0';
  controls.hidden=false;
  audio.hidden=reviewOnly;
 }

 function showClips(){
  if(!reviewOnly){
   renderRows();
  }else if(allAssigned()){
   cueClips(record.clips,true);
  }else{
   status.textContent='请先在「旁白对位」为录音配好镜头。';
  }
 }

 function stopAudition(clear=false){
  cancelAnimationFrame(raf);
  audio.pause();
  audition?.video?.pause();
  audition=null;
  if(reviewOnly)audio.hidden=true;
  updateContinuousButton();
  if(clear)preview.replaceChildren();
 }

 function updateContinuousButton(){
  if(!audition?.continuous){
   continuous.textContent=playLabel;
  }else if(!audio.paused){
   continuous.textContent='暂停连播';
  }else{
   continuous.textContent=audio.currentTime>audition.clips[0].startMs/1000?'继续连播':playLabel;
  }
 }

 function updateClock(){
  if(document.activeElement!==clock)clock.value=seconds(Math.round(audio.currentTime*1000));
 }

 async function save(next,url){
  busy=true;
  disableControls();
  next.version=(record?.version||0)+1;
  try{
   await write(project.projectId,record,next);
   if(disposed)return;
   record=next;
   if(url)showRecording(next,url);
   status.textContent=`${next.file.name} · ${seconds(next.durationMs)} 秒 · 已保存到当前浏览器`;
   showClips();
  }catch(error){
   if(url)URL.revokeObjectURL(url);
   if(!disposed)status.textContent=error.message;
  }finally{
   busy=false;
   if(!disposed)disableControls();
   if(disposed&&url)URL.revokeObjectURL(url);
  }
 }

 async function importRecording(){
  const file=input.files[0];
  input.value='';
  if(!file||busy)return;
  if(record&&!window.confirm('更换录音会清空这份旁白的切点和镜头配对。继续更换？'))return;
  stopAudition(true);
  busy=true;
  disableControls();
  status.textContent='正在读取录音…';
  const url=URL.createObjectURL(file);
  try{
   const durationMs=await probe(url);
   if(disposed){URL.revokeObjectURL(url);return;}
   await save({file,durationMs,clips:[{startMs:0,endMs:durationMs,segmentId:'',offsetMs:0}]},url);
  }catch(error){
   URL.revokeObjectURL(url);
   if(!disposed)status.textContent=error.message;
  }finally{
   busy=false;
   if(!disposed)disableControls();
  }
 }

 async function importPrepared(){
  if(record&&!window.confirm('切换到本次已对位旁白会替换当前浏览器的录音和切点。继续切换？'))return;
  stopAudition(true);
  busy=true;
  disableControls();
  status.textContent='正在载入已对位的旁白…';
  let url;
  try{
   const {recording,clips}=prepared;
   if(!M.localArtifactPath(recording?.path)||!Array.isArray(clips)||!clips.length)throw Error('本次旁白的对位数据不完整。');
   const response=await fetch(root.DirectorMedia?.[recording.path]||recording.path);
   if(!response.ok)throw Error('本次旁白录音无法读取。');
   const file=new File([await response.blob()],recording.name,{type:'audio/mpeg'});
   url=URL.createObjectURL(file);
   const durationMs=await probe(url);
   if(disposed){URL.revokeObjectURL(url);return;}
   if(Math.abs(durationMs-recording.durationMs)>50||clips.at(-1).endMs!==recording.durationMs||
    clips.some((clip,index)=>!byId.has(clip.segmentId)||clip.startMs!==(clips[index-1]?.endMs??0)||clip.endMs<=clip.startMs)){
    throw Error('录音时长或切点与本次对位数据不匹配。');
   }
   const imported=clips.map(clip=>({...clip}));
   imported.at(-1).endMs=durationMs;
   await save({file,durationMs,clips:imported},url);
  }catch(error){
   if(url)URL.revokeObjectURL(url);
   if(!disposed)status.textContent=error.message;
  }finally{
   busy=false;
   if(!disposed)disableControls();
  }
 }

 function editClips(edit){
  if(busy||!record)return;
  stopAudition(true);
  const clips=record.clips.map(clip=>({...clip}));
  edit(clips);
  void save({...record,clips});
 }

 function splitAtPlayhead(){
  const time=Math.round(audio.currentTime*1000);
  const index=record.clips.findIndex(clip=>time>clip.startMs&&time<clip.endMs);
  if(index<0){status.textContent='请选择一段录音内部的位置作为切点。';return;}
  editClips(clips=>{
   const left=clips[index];
   const right={startMs:time,endMs:left.endMs,segmentId:'',offsetMs:0};
   left.endMs=time;
   clips.splice(index+1,0,right);
  });
 }

 function numberField(label,value,callback,{min=0,max,step='.001'}={}){
  const field=node('label',undefined,'narration-number');
  const control=node('input');
  control.type='number';
  control.min=String(min);
  if(max!==undefined)control.max=String(max);
  control.step=step;
  control.value=value;
  control.addEventListener('change',()=>{
   if(control.value===''||!control.validity.valid){control.value=value;return;}
   callback(Math.round(Number(control.value)*1000));
  });
  field.append(node('span',label),control);
  return field;
 }

 function renderRows(){
  rows.replaceChildren();
  record.clips.forEach((clip,index)=>{
   const row=node('div',undefined,'narration-row');
   const title=node('strong',`第 ${index+1} 段 · ${seconds(clip.startMs)}–${seconds(clip.endMs)} 秒`);
   const segment=byId.get(clip.segmentId);
   const tools=node('div',undefined,'narration-row-tools');
   const assignment=node('label');
   const select=node('select');
   select.setAttribute('aria-label',`第 ${index+1} 段对应镜头`);
   const addOption=(value,label)=>{
    const option=node('option',label);
    option.value=value;
    select.append(option);
   };
   addOption('','待分配');
   for(const segment of segments)addOption(segment.id,labelOf(segment));
   if(clip.segmentId&&!byId.has(clip.segmentId))addOption(clip.segmentId,'原镜头已移除 · '+clip.segmentId);
   select.value=clip.segmentId;
   select.addEventListener('change',()=>editClips(clips=>{
    clips[index].segmentId=select.value;
    clips[index].offsetMs=0;
   }));
   assignment.append(node('span','对应镜头'),select);
   tools.append(assignment);
   if(segment)tools.append(numberField('镜内起播（秒）',seconds(clip.offsetMs),value=>editClips(clips=>{clips[index].offsetMs=value;}),{max:segment.plan?.duration??180}));
   const next=record.clips[index+1];
   if(next){
    tools.append(numberField('本段结束切点（秒）',seconds(clip.endMs),value=>editClips(clips=>{
     clips[index].endMs=value;
     clips[index+1].startMs=value;
    }),{min:seconds(clip.startMs+1),max:seconds(next.endMs-1)}));
    const merge=button('合并下一段',()=>editClips(clips=>{
     clips[index].endMs=clips[index+1].endMs;
     clips.splice(index+1,1);
    }));
    if(next.segmentId){
     merge.dataset.unavailable='true';
     merge.title='先将下一段设为待分配，再合并。';
    }
    tools.append(merge);
   }
   tools.append(button('试听第 '+(index+1)+' 段',()=>void playClips([clip])));
   row.append(title,tools);
   if(clip.needsReview)row.append(node('small','这个切点的停顿较短，建议试听微调。'));
   const endInShot=clip.endMs-clip.startMs+clip.offsetMs;
   if(segment?.plan?.duration&&endInShot>segment.plan.duration*1000+1){
    row.append(node('small',`旁白到镜内 ${seconds(endInShot)} 秒，镜头预估 ${segment.plan.duration} 秒。`));
   }
   rows.append(row);
  });
 }

 function playContinuous(){
  if(!audition?.continuous)return playClips(record.clips,true);
  if(audio.paused)return resumeAudio(audition);
  audio.pause();
 }

 function cueClips(clips,continuous){
  stopAudition(true);
  const playback={clips,continuous};
  audition=playback;
  const preparation=showClip(playback,0);
  audio.currentTime=clips[0].startMs/1000;
  if(reviewOnly)audio.hidden=false;
  return {playback,preparation};
 }

 async function playClips(clips,continuous=false){
  const {playback,preparation}=cueClips(clips,continuous);
  preview.scrollIntoView({block:'nearest'});
  if(preparation)await preparation;
  if(audition!==playback||disposed)return;
  await resumeAudio(playback);
 }

 async function resumeAudio(playback){
  try{await audio.play();}
  catch{
   if(audition!==playback)return;
   stopAudition();
   status.textContent='无法播放旁白，请检查录音。';
  }
 }

 function showClip(playback,index){
  const clip=playback.clips[index];
  const segment=byId.get(clip.segmentId);
  const picture=prepared?.picture;
  const range=picture?.ranges?.[clip.segmentId];
  const path=[range&&picture.video,segment?.production?.artifacts?.video,segment?.plan?.artifacts?.video].find(M.localArtifactPath);
  const video=path&&path===playback.path?playback.video:null;
  playback.video?.pause();
  playback.index=index;
  playback.clip=clip;
  playback.segment=segment;
  playback.path=path;
  playback.canvas=null;
  playback.video=video;
  playback.pictureStart=range?range.startMs/1000:0;
  playback.pictureEnd=range?(range.endMs-range.startMs)/1000-1/picture.fps:undefined;
  if(!playback.info){
   playback.info=node('div');
   preview.append(playback.info);
  }
  const progress=playback.continuous?`连播第 ${index+1} / ${playback.clips.length} 段 · `:'';
  playback.info.replaceChildren(node('p',`${progress}试听范围 ${seconds(clip.startMs)}–${seconds(clip.endMs)} 秒`,'muted'));
  if(segment){
   playback.info.append(node('strong',labelOf(segment)));
   if(!reviewOnly)playback.info.append(node('p',M.cueText(project,segment),'copy-quote'));
  }
  if(video){
   syncPicture(playback,Math.max(0,audio.currentTime-clip.startMs/1000)+clip.offsetMs/1000,true);
   return;
  }
  playback.media?.remove();
  playback.media=null;
  if(path){
   const video=node('video');
   video.muted=true;
   video.playsInline=true;
   video.preload='auto';
   video.setAttribute('aria-label','对应镜头画面');
   if(range){
    video.style.visibility='hidden';
    video.addEventListener('seeked',()=>{video.style.visibility='';},{once:true});
    video.addEventListener('loadeddata',()=>{if(!video.seeking)video.style.visibility='';},{once:true});
   }
   video.addEventListener('loadedmetadata',()=>{
    if(audition===playback&&playback.video===video)tick();
   },{once:true});
   video.addEventListener('error',()=>{
    if(audition===playback&&playback.video===video)status.textContent='镜头画面无法播放，仍可试听旁白。';
   });
   playback.media=playback.video=video;
   video.src=root.DirectorMedia?.[path]||path;
   preview.append(video);
  }else if(segment?.plan&&!segment.plan.rendererSource){
   const canvas=node('canvas');
   canvas.width=960;
   canvas.height=540;
   canvas.setAttribute('aria-label','对应镜头白模');
   playback.media=canvas;
   preview.append(canvas);
   return R.prepare(segment.plan).then(()=>{
    if(audition===playback&&playback.media===canvas)playback.canvas=canvas;
   }).catch(error=>{
    if(audition!==playback||playback.media!==canvas)return;
    canvas.remove();
    status.textContent=error.message;
   });
  }else if(segment){
   playback.info.append(node('p','这个镜头还没有可对位播放的画面。','muted'));
  }
 }

 function syncPicture(playback,local,force=false){
  const {segment,video,canvas,pictureStart,pictureEnd}=playback;
  if(canvas)R.frame(canvas,project,segment,Math.min(local,segment.plan.duration));
  if(video?.readyState>=1){
   const end=pictureEnd??video.duration;
   const target=pictureStart+Math.min(local,end);
   const playing=!audio.paused&&local<end;
   const tolerance=playing?.12:.02;
   if(!playing&&!video.paused)video.pause();
   if(force||(!video.seeking&&Math.abs(video.currentTime-target)>tolerance))video.currentTime=target;
   if(playing&&!video.seeking&&video.readyState>=2&&video.paused)video.play().catch(()=>{});
  }
 }

 function tick(){
  const playback=audition;
  if(!playback)return;
  // Keep the original recording running and switch picture against its clock.
  const current=audio.currentTime;
  const end=playback.clips.at(-1).endMs/1000;
  if(audio.ended||current>=end){
   const last=playback.clips.at(-1);
   if(playback.clip===last)syncPicture(playback,(last.endMs-last.startMs+last.offsetMs)/1000,true);
   stopAudition();
   if(!audio.ended)audio.currentTime=end;
   updateClock();
   return;
  }
  if(current<playback.clip.startMs/1000||current>=playback.clip.endMs/1000){
   const index=playback.clips.findIndex(clip=>current>=clip.startMs/1000&&current<clip.endMs/1000);
   if(index>=0)showClip(playback,index);
  }
  const clip=playback.clip;
  syncPicture(playback,Math.max(0,current-clip.startMs/1000)+clip.offsetMs/1000);
  updateClock();
  cancelAnimationFrame(raf);
  if(!audio.paused)raf=requestAnimationFrame(tick);
 }

 function exportAlignment(){
  const clips=record.clips.filter(clip=>byId.has(clip.segmentId));
  download({
   schema:'director-narration/1',
   projectId:project.projectId,
   revision:project.revision,
   recording:{name:record.file.name,durationMs:record.durationMs},
   clips
  },'narration-alignment.json');
 }

 audio.hidden=controls.hidden=true;
 disableControls();
 input.addEventListener('change',()=>void importRecording());
 clock.addEventListener('input',()=>{
  if(!record||clock.value==='')return;
  if(!audition?.continuous)stopAudition();
  audio.currentTime=Math.min(record.durationMs/1000,Math.max(0,Number(clock.value)||0));
 });
 clock.addEventListener('change',()=>{clock.value=seconds(Math.round(audio.currentTime*1000));});
 audio.addEventListener('playing',()=>{updateContinuousButton();tick();});
 audio.addEventListener('timeupdate',()=>{updateClock();if(audition)tick();});
 audio.addEventListener('pause',()=>{cancelAnimationFrame(raf);audition?.video?.pause();updateContinuousButton();});
 audio.addEventListener('ended',()=>{if(audition)tick();else updateClock();});
 audio.addEventListener('error',()=>{if(!disposed)status.textContent='录音无法播放，请重新选择可播放的音频文件。';});
 audio.addEventListener('seeking',()=>{
  if(audition&&!audition.continuous&&audio.currentTime<audition.clip.startMs/1000)stopAudition();
 });
 void read(project.projectId).then(saved=>{
  if(disposed)return;
  record=saved;
  if(saved){
   showRecording(saved);
   status.textContent=`${saved.file.name} · ${seconds(saved.durationMs)} 秒 · 已载入本地旁白`;
   showClips();
  }else if(prepared){
   void importPrepared();
   return;
  }else status.textContent='录音和对位保存在当前浏览器。';
  busy=false;
  disableControls();
 }).catch(()=>{
  if(!disposed)status.textContent='浏览器无法访问本地录音存储，请使用同一工作台的本地服务地址。';
 });

 return ()=>{
  disposed=true;
  stopAudition(true);
  audio.removeAttribute('src');
  audio.load();
  if(sourceUrl)URL.revokeObjectURL(sourceUrl);
 };
}

root.DirectorNarration={mount};
})(window);
