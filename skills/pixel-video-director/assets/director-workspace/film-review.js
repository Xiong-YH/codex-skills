(function(root){
'use strict';

function create(take,{node,button,feedback,browse,notes,download,segments}){
 const positions=new Map(take.shots.map(shot=>[shot.id,shot]));
 const labels=new Map(segments.map(s=>[s.id,s.title||s.id]));
 const scope=id=>'film-review:'+take.sha256.slice(0,12)+':'+id;
 const end=shot=>shot.start+shot.frames;
 const clock=frame=>{
  const centi=Math.floor(frame*100/take.fps+1e-6),two=value=>String(value).padStart(2,'0');
  return two(Math.floor(centi/6000))+':'+two(Math.floor(centi/100)%60)+'.'+two(centi%100);
 };
 const range=shot=>clock(shot.start)+'–'+clock(end(shot));
 const panel=node('section',undefined,'paper film-review');
 const heading=node('div',undefined,'film-review-heading');
 const info=node('div'),liveBox=node('div',undefined,'film-review-live');
 const selectedRange=node('p',undefined,'muted');
 const live=node('output','','film-review-current');
 live.setAttribute('aria-live','polite');
 const locate=button('定位到播放片段',()=>browse(playingShot().id,{keepTime:true}),'quiet');
 info.append(node('h3','成片逐段审看'),selectedRange);
 liveBox.append(live,locate);
 heading.append(info,liveBox);
 const video=node('video');
 video.controls=true;
 video.playsInline=true;
 video.preload='metadata';
 video.setAttribute('aria-label','逐段审看成片');
 const message=node('p','','muted film-review-status');
 message.setAttribute('role','status');
 const notesHost=node('div',undefined,'film-review-notes');
 const buttons=node('div',undefined,'export-row');
 const clockLabel=node('output','','film-review-time');
 const playPart=button('从本段播放',async()=>{
  try { setPosition(active.start);await video.play(); }
  catch { message.textContent='成片播放失败，请检查本地 MP4。'; }
 },'quiet');
 const stamp=button('记下当前时间',()=>{
  const frame=currentFrame();
  video.pause();
  const shot=playingShot();
  browse(shot.id,{keepTime:true});
  const area=notesHost.querySelector('textarea');
  if(!area)return;
  const text='['+clock(frame)+' · '+shot.id+'] ';
  const value=[area.value.trimEnd(),text].filter(Boolean).join('\n');
  if(value.length>area.maxLength)return;
  area.value=value;
  area.dispatchEvent(new Event('input',{bubbles:true}));
  area.focus({preventScroll:true});
  area.setSelectionRange(value.length,value.length);
 },'quiet');
 const exportNotes=button('下载逐段意见',()=>{
  const record=notes();
  const result=take.shots.flatMap(shot=>{
   const text=record[scope(shot.id)]?.trim();
   return text?[{id:shot.id,startFrame:shot.start,endFrame:end(shot),timeRange:range(shot),text}]:[];
  });
  download({schema:'director-video-review/1',projectId:take.projectId,sourceRevision:take.revision,
   sourceHash:take.sourceHash,video:take.file,videoSha256:take.sha256,fps:take.fps,frames:take.frames,notes:result},'director-video-review.json');
 },'quiet');
 buttons.append(playPart,stamp,exportNotes,clockLabel);
 panel.append(heading,video,buttons,message,notesHost);

 let active,requested=null,ready=false,animation=0;
 function currentFrame(){
  return Math.max(0,Math.min(take.frames-1,Math.floor(video.currentTime*take.fps+1e-6)));
 }
 function playingShot(){
  const frame=currentFrame();
  return take.shots.find(shot=>frame<end(shot));
 }
 function setPosition(frame){
  if(!ready){requested=frame;return;}
  video.currentTime=frame/take.fps;
 }
 function update(){
  const shot=playingShot();
  const caption='当前画面 · '+labels.get(shot.id);
  if(live.textContent!==caption)live.textContent=caption;
  clockLabel.textContent=clock(currentFrame())+' / '+clock(take.frames);
  playPart.disabled=!ready||!active;
  stamp.disabled=locate.disabled=!ready;
 }
 function select(id,{keepTime=false}={}){
  active=positions.get(id);
  selectedRange.textContent=active?'本段 '+range(active):'当前成片未包含这个片段。';
  notesHost.replaceChildren();
  if(active){
   notesHost.append(feedback(scope(active.id),'这一段的成片修改意见'));
   if(!keepTime){video.pause();setPosition(active.start);}
  }else if(!ready){
   requested=null;
  }
  update();
 }
 function tick(){
  update();
  if(!video.paused&&!video.ended)animation=requestAnimationFrame(tick);
 }
 video.addEventListener('loadedmetadata',()=>{
  ready=Number.isFinite(video.duration)&&Math.abs(video.duration-take.frames/take.fps)<=1/take.fps;
  message.textContent=ready?'':'视频时长与同版片段帧范围不一致。';
  if(ready&&requested!==null){setPosition(requested);requested=null;}
  update();
 });
 video.addEventListener('error',()=>{
  ready=false;
  message.textContent='成片无法读取，请检查同版 MP4。';
  update();
 });
 video.addEventListener('play',()=>{cancelAnimationFrame(animation);tick();});
 for(const event of ['timeupdate','seeked','pause','ended'])video.addEventListener(event,update);
 video.src=root.DirectorMedia?.[take.file]||take.file;
 update();

 return {panel,select,has:id=>positions.has(id),dispose(){video.pause();cancelAnimationFrame(animation);}};
}

root.DirectorFilmReview={create};
})(window);
