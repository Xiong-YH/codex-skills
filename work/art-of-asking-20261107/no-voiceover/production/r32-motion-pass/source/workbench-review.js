(function (take, picture) {
  'use strict';

  const shots = new Map(take.shots.map(shot => [shot.id, shot]));
  const scope = id => take.notePrefix + id;
  const clock = frame => {
    const hundredths = Math.round(frame * 100 / take.fps);
    return String(Math.floor(hundredths / 6000)).padStart(2, '0') + ':' +
      ((hundredths % 6000) / 100).toFixed(2).padStart(5, '0');
  };
  const shotEnd = shot => shot.start + shot.frames;
  const range = shot => clock(shot.start) + '–' + clock(shotEnd(shot));
  const ordinal = shot => String(shot.number).padStart(2, '0');
  const bound = frame => Math.max(0, Math.min(take.frames - 1, Math.round(frame)));
  const make = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
  };
  const button = (label, action) => {
    const element = make('button', '', label);
    element.type = 'button';
    element.addEventListener('click', action);
    return element;
  };

  let panel, media, slider, notes, rangeLabel, live, position, play, jump, alert;
  let active, keepFrame = false, ready = false, shown = 0, animation, playing = false;
  let sequence = 0;
  let resumeLimit = null;
  let limit = take.frames;

  function available(project) {
    return project.projectId === take.projectId && project.revision === take.revision;
  }

  function liveFrame() {
    return playing ? bound(Math.floor(media.currentTime * take.fps + 1e-6)) : shown;
  }

  function shotAt(frame) {
    return take.shots.find(shot => frame < shotEnd(shot)) ?? take.shots.at(-1);
  }

  function paint(frame) {
    shown = bound(frame);
    if (ready) picture.render(shown);
    const current = shotAt(shown);
    slider.value = shown;
    const label = '第 ' + ordinal(current) + ' 段 · ' + current.label;
    if (live.textContent !== label) live.textContent = label;
    position.textContent = clock(shown) + ' / ' + clock(take.frames);
  }

  function pause() {
    sequence++;
    cancelAnimationFrame(animation);
    if (!media) return;
    if (playing) paint(liveFrame());
    playing = false;
    media.pause();
    play.textContent = '播放';
  }

  async function start(frame, end = take.frames) {
    if (!ready) return;
    pause();
    const token = sequence;
    limit = end;
    paint(frame);
    alert.hidden = true;
    try {
      media.currentTime = shown / take.fps;
      await media.play();
      if (token !== sequence) return;
      playing = true;
      play.textContent = '暂停';
      function tick() {
        if (token !== sequence) return;
        const time = Math.floor(media.currentTime * take.fps + 1e-6);
        if (media.ended || time >= limit) {
          pause();
          paint(limit - 1);
          return;
        }
        if (time !== shown) paint(time);
        animation = requestAnimationFrame(tick);
      }
      animation = requestAnimationFrame(tick);
    } catch (error) {
      if (token !== sequence) return;
      alert.textContent = '配乐读取失败。请确认 R32 工程旁的 R31 配乐文件可读取。';
      alert.hidden = false;
    }
  }

  function locate(focus, frame) {
    const current = shotAt(frame);
    if (current.id !== active?.id) {
      keepFrame = true;
      try { window.DirectorWorkspace.selectSegment(current.id); }
      finally { keepFrame = false; }
    }
    if (current.id !== active?.id) return null;
    const area = notes.querySelector('textarea');
    if (focus) area?.focus({ preventScroll: true });
    return area;
  }

  function mark() {
    if (!ready) return;
    const frame = liveFrame();
    pause();
    paint(frame);
    const area = locate(true, frame);
    if (!area) return;
    const current = shotAt(frame);
    const stamp = '[' + take.edition + ' ' + clock(frame) + ' · ' + current.id + '] ';
    const value = [area.value.trimEnd(), stamp].filter(Boolean).join('\n');
    if (value.length > area.maxLength && area.maxLength > 0) return;
    area.value = value;
    area.dispatchEvent(new Event('input', { bubbles: true }));
    area.setSelectionRange(area.value.length, area.value.length);
  }

  function initialize() {
    panel = make('section', 'paper shot-review');
    const heading = make('h3', '', take.label + ' · 逐段审片');
    rangeLabel = make('p', 'shot-review-range');
    const selection = make('div', 'shot-review-selection');
    selection.append(heading, rangeLabel);
    live = make('output', 'shot-review-current');
    live.setAttribute('aria-live', 'polite');
    jump = button('定位到播放片段', () => locate(true, liveFrame()));
    const liveBar = make('div', 'shot-review-live');
    liveBar.append(live, jump);
    const head = make('div', 'shot-review-heading');
    head.append(selection, liveBar);

    const canvas = document.getElementById('film');
    canvas.className = 'shot-review-canvas';
    canvas.setAttribute('aria-label', take.label + ' Canvas 画面');
    media = make('audio', '');
    media.preload = 'metadata';
    media.src = take.audio;
    slider = make('input', 'shot-review-slider');
    slider.type = 'range';
    slider.min = 0;
    slider.max = take.frames - 1;
    slider.step = 1;
    slider.setAttribute('aria-label', '审片进度');
    position = make('output', 'shot-review-position');
    const seekBar = make('div', 'shot-review-seek');
    seekBar.append(slider, position);
    play = button('播放', () => playing ? pause() : void start(shown >= take.frames - 1 ? 0 : shown));
    const playShot = button('播放本段', () => void start(active.start, shotEnd(active)));
    const addMark = button('记下当前时间', mark);
    const mute = make('input', '');
    mute.type = 'checkbox';
    mute.checked = true;
    mute.addEventListener('change', () => { media.muted = !mute.checked; });
    const audioLabel = make('label', 'shot-review-audio');
    audioLabel.append(mute, document.createTextNode(' 配乐'));
    const tools = make('div', 'shot-review-tools');
    tools.append(play, playShot, addMark, audioLabel);
    alert = make('p', 'shot-review-error');
    alert.setAttribute('role', 'status');
    alert.hidden = true;
    notes = make('div', 'shot-review-notes');
    panel.append(head, canvas, seekBar, tools, media, alert, notes);

    slider.addEventListener('input', () => {
      const frame = Number(slider.value);
      if (playing) resumeLimit = limit;
      pause();
      paint(frame);
    });
    slider.addEventListener('change', () => {
      const end = resumeLimit;
      resumeLimit = null;
      if (end && shown < end) void start(shown, end);
    });
    const needPicture = [jump, slider, play, playShot, addMark];
    for (const control of needPicture) control.disabled = true;
    picture.ready.then(() => {
      ready = true;
      paint(shown);
      for (const control of needPicture) control.disabled = false;
    }).catch(() => {
      alert.textContent = 'R32 画面素材加载失败。请重开工作台。';
      alert.hidden = false;
    });
  }

  function report(project, baseHash, current, draftNotes) {
    return {
      schema: 'director-canvas-review/1',
      projectId: project.projectId,
      sourceRevision: project.revision,
      sourceHash: baseHash,
      edition: take.edition,
      label: take.label,
      canvas: take.preview,
      manifest: take.manifest,
      pictureSha256: take.sha256,
      fps: take.fps,
      selected: current,
      notes: take.shots.flatMap(shot => {
        const text = draftNotes[scope(shot.id)]?.trim();
        return text ? [{ id: shot.id, number: shot.number, label: shot.label, startFrame: shot.start,
          endFrame: shotEnd(shot), timeRange: range(shot), text }] : [];
      }),
    };
  }

  function prompt(report) {
    const notesText = report.notes.map(note =>
      '第 ' + String(note.number).padStart(2, '0') + ' 段 · ' + note.id + ' · ' + note.timeRange +
      ' · ' + note.label + '\n' + note.text).join('\n\n');
    return [
      take.label + ' · 逐段审片意见',
      '项目 ' + report.projectId + ' · 编导源 R' + report.sourceRevision + ' · 来源摘要 ' + report.sourceHash,
      '画面 ' + report.canvas,
      '工程 ' + report.manifest,
      '画面 SHA-256 ' + report.pictureSha256,
      '当前片段 ' + report.selected,
      notesText || '本轮还没有填写片段意见。',
    ].join('\n\n');
  }

  window.DirectorShotReview = {
    available, scope, report, prompt, pause,
    cueText: id => shots.get(id)?.copy.join(' / ') ?? '',
    context(project, id) {
      const shot = shots.get(id);
      return available(project) && shot
        ? '\n当前审看 ' + take.label + ' · ' + range(shot) + ' · ' + take.preview + ' · SHA-256 ' + take.sha256 + '\n'
        : '';
    },
    production(project) {
      if (!available(project)) return null;
      return { summary: take.label + ' · ' + clock(take.frames) + ' · 逐段意见在「大白话与草图」。',
        artifacts: { preview: take.preview, project: take.manifest } };
    },
    mount(host, id, field) {
      const item = shots.get(id);
      if (!item) return;
      if (!panel) initialize();
      const change = active?.id !== item.id;
      active = item;
      rangeLabel.textContent = '本段 ' + range(item);
      notes.replaceChildren(field);
      if (panel.parentElement !== host) host.append(panel);
      if (change && !keepFrame) {
        resumeLimit = null;
        pause();
        paint(item.start);
      }
    },
  };
})(window.DIRECTOR_REVIEW_TAKE, window.AskingRecut);
