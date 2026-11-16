(() => {
  const root = document.getElementById('cache-route-canvas');
  const canvas = root.querySelector('canvas');
  const ink = canvas.getContext('2d');
  const slider = root.querySelector('input');
  const timer = root.querySelector('[data-time]');
  const playButton = root.querySelector('[data-play]');
  const rateButton = root.querySelector('[data-rate]');
  const soundButton = root.querySelector('[data-sound]');
  const status = root.querySelector('[data-status]');
  const { fps, frames, cues } = globalThis.cacheRouteTimeline;
  const duration = frames / fps;
  const lastFrame = frames - 1;
  const atlas = new Image();
  const sprite = new Image();
  const audio = root.querySelector('[data-track]');
  audio.preservesPitch = true;
  let frame = 0;
  let shownFrame = -1;
  let rate = 1;
  let running = false;
  let sound = true;
  let startTime = 0;
  let origin = 0;
  let raf = 0;
  let generation = 0;
  let audioClock = false;

  slider.max = lastFrame;

  function draw(force = false) {
    const next = Math.min(lastFrame, Math.floor(frame + 1e-6));
    if (!force && next === shownFrame) return;
    shownFrame = next;
    globalThis.cacheRouteFilm.render(ink, next, atlas, sprite);
    slider.value = next;
    const elapsed = frame >= frames ? duration : next / fps;
    slider.setAttribute('aria-valuetext', `${elapsed.toFixed(2)} 秒，第 ${next + 1} 帧`);
    timer.textContent = `${elapsed.toFixed(2)} / ${duration.toFixed(2)} 秒`;
  }

  function updateClock(now) {
    if (audioClock && !audio.paused && !audio.seeking && !audio.ended && audio.readyState >= 3) {
      // Once it is playing, use the media time for frame and sound cues.
      frame = Math.min(frames, Math.max(frame, audio.currentTime * fps));
      origin = frame;
      startTime = now;
      return;
    }
    frame = Math.min(frames, origin + (now - startTime) * fps * rate / 1000);
  }

  function setAudioTime() {
    if (audio.readyState === 0) return;
    const target = Math.min(audio.duration, frame / fps);
    if (Math.abs(audio.currentTime - target) < .02) return;
    audio.currentTime = target;
  }

  function stopAudio() {
    generation++;
    audioClock = false;
    audio.pause();
  }

  function startAudio() {
    if (!sound || audio.error) return;
    const attempt = ++generation;
    audio.playbackRate = rate;
    setAudioTime();
    audio.play().catch(() => {
      if (attempt !== generation || !running || !sound) return;
      status.textContent = '点一下声音按钮可重试。';
      status.hidden = false;
      sound = false;
      updateSoundButton();
    });
  }

  function updateSoundButton() {
    soundButton.textContent = sound ? '声音开' : '声音关';
    soundButton.setAttribute('aria-pressed', String(sound));
  }

  function pause() {
    if (!running) return;
    updateClock(performance.now());
    running = false;
    cancelAnimationFrame(raf);
    stopAudio();
    playButton.textContent = frame >= frames ? '重播' : '播放';
    draw(true);
  }

  function tick(now) {
    if (!running) return;
    updateClock(now);
    if (frame >= frames) {
      pause();
      return;
    }
    draw();
    raf = requestAnimationFrame(tick);
  }

  function play() {
    if (frame >= lastFrame) frame = 0;
    origin = frame;
    startTime = performance.now();
    running = true;
    playButton.textContent = '暂停';
    draw();
    raf = requestAnimationFrame(tick);
    startAudio();
  }

  function seek(target) {
    pause();
    frame = Math.max(0, Math.min(lastFrame, target));
    draw(true);
  }

  playButton.addEventListener('click', () => running ? pause() : play());
  slider.addEventListener('input', () => seek(Number(slider.value)));
  root.querySelectorAll('[data-step]').forEach(button => {
    button.addEventListener('click', () => seek(shownFrame + Number(button.dataset.step)));
  });
  root.querySelectorAll('[data-cue]').forEach(button => {
    button.addEventListener('click', () => seek(cues[button.dataset.cue]));
  });
  rateButton.addEventListener('click', () => {
    const now = performance.now();
    if (running) updateClock(now);
    rate = rate === 1 ? .5 : 1;
    origin = frame;
    startTime = now;
    audio.playbackRate = rate;
    if (running) setAudioTime();
    rateButton.textContent = rate === 1 ? '1×' : '½×';
    rateButton.setAttribute('aria-pressed', String(rate === .5));
  });
  soundButton.addEventListener('click', () => {
    sound = !sound;
    updateSoundButton();
    if (sound && !audio.error) status.hidden = true;
    if (!sound) stopAudio();
    else if (running) startAudio();
  });

  audio.addEventListener('playing', () => {
    if (!running || !sound || audio.paused || audioClock) return;
    updateClock(performance.now());
    if (Math.abs(audio.currentTime - frame / fps) > .14) setAudioTime();
    audioClock = true;
  });
  audio.addEventListener('waiting', () => { audioClock = false; });
  audio.addEventListener('error', () => {
    status.textContent = '音轨加载失败，画面可以继续播放。';
    status.hidden = false;
    sound = false;
    soundButton.disabled = true;
    updateSoundButton();
  });
  atlas.addEventListener('load', () => draw(true));
  sprite.addEventListener('load', () => draw(true));

  draw(true);
  atlas.src = root.dataset.poses || 'media/modern-poses.webp';
  sprite.src = root.dataset.sprite || 'media/azong-sprite.webp';
  audio.src = root.dataset.music || 'media/pulse-preview.mp3';
})();
