(() => {
  const canvas=document.getElementById('film'),g=canvas.getContext('2d'),audio=document.getElementById('effects');
  const play=document.getElementById('play'),timeline=document.getElementById('timeline'),clock=document.getElementById('clock');
  if(Runtime.previewSilent){
    audio.muted=true;const sound=document.getElementById('sound');sound.disabled=true;sound.textContent='静音预览';sound.setAttribute('aria-pressed','false');
  }
  const duration=Runtime.duration,format=t=>`${String(Math.floor(t/60)).padStart(2,'0')}:${String(Math.floor(t%60)).padStart(2,'0')}`;
  let position=0,playing=false;
  function draw(t){
    position=Math.min(duration-.001,Math.max(0,t));g.drawImage(ProgrammerFilm.draw(position),0,0);
    timeline.value=position;timeline.style.setProperty('--progress',`${position/duration*100}%`);
    clock.textContent=`${format(position)} / ${format(duration)}`;
    const index=ProgrammerFilm.shots.findIndex(s=>position>=s.start&&position<s.end);
    for(const button of document.querySelectorAll('[data-shot]'))button.setAttribute('aria-pressed',String(Number(button.dataset.shot)===index));
  }
  function stop(){playing=false;audio.pause();play.textContent='播放';}
  play.onclick=()=>{
    if(playing){stop();return;}
    if(position>duration-.03)position=0;audio.currentTime=position;
    audio.play().then(()=>{playing=true;play.textContent='暂停';}).catch(stop);
  };
  audio.onended=()=>{stop();draw(duration-.001);};
  timeline.oninput=()=>{draw(Number(timeline.value));audio.currentTime=position;};
  for(const button of document.querySelectorAll('[data-shot]'))button.onclick=()=>{
    draw(ProgrammerFilm.shots[Number(button.dataset.shot)].start+.28);audio.currentTime=position;
  };
  document.getElementById('sound').onclick=e=>{audio.muted=!audio.muted;e.currentTarget.setAttribute('aria-pressed',String(!audio.muted));e.currentTarget.textContent=audio.muted?'音效关':'音效开';};
  document.getElementById('fullscreen').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen();else document.getElementById('stage').requestFullscreen();};
  document.addEventListener('keydown',e=>{if(e.code==='Space'&&e.target.tagName!=='INPUT'){e.preventDefault();play.click();}});
  function tick(){if(playing)draw(audio.currentTime);requestAnimationFrame(tick);}
  Promise.all([ProgrammerFilm.ready,document.fonts.ready]).then(()=>{
    window.renderFrame=draw;window.sceneReady=true;window.sceneDuration=duration;window.sceneFrameRate=Runtime.fps;
    draw(0);if(!new URLSearchParams(location.search).has('render'))requestAnimationFrame(tick);
  });
})();
