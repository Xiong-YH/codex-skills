// Standalone Pixel Game Video validation, 2026-10-21.
export const MAX_PROJECT_BYTES = 5 * 1024 * 1024;
const fail = message => { throw new Error(message); };
const finite = (value, low, high, label, integer = false) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < low || value > high || (integer && !Number.isInteger(value))) fail(`${label} 无效`);
};
export const validateProject = (p, knownCards) => {
  if (!p || typeof p !== 'object' || typeof p.name !== 'string' || !Array.isArray(p.tracks)) fail('缺少工程名称或轨道');
  finite(p.fps, 1, 120, '帧率');
  finite(p.width, 16, 7680, '画布宽度', true);
  finite(p.height, 16, 4320, '画布高度', true);
  if (p.exportDurationInFrames !== undefined) finite(p.exportDurationInFrames, 1, p.fps * 3600, '导出总帧数', true);
  if (p.tracks.length > 100) fail('轨道超过 100 条');
  const ids = new Set();
  let clips = 0;
  const trackIds = new Set();
  for (const t of p.tracks) {
    if (!t || typeof t.id !== 'string' || typeof t.name !== 'string' || !Array.isArray(t.clips)) fail('轨道格式无效');
    if (trackIds.has(t.id)) fail('轨道 ID 重复');
    trackIds.add(t.id);
    if (t.hidden !== undefined && typeof t.hidden !== 'boolean') fail('轨道可见状态无效');
    for (const c of t.clips) {
      if (++clips > 10000) fail('片段超过 10000 个');
      if (!c || typeof c.id !== 'string' || ids.has(c.id) || typeof c.cardId !== 'string') fail('片段 ID 无效或重复');
      ids.add(c.id);
      if (knownCards && !knownCards[c.cardId]) fail(`当前工程没有组件：${c.cardId}`);
      finite(c.start, 0, p.fps * 3600, '起始帧', true);
      finite(c.duration, 1, p.fps * 3600, '持续帧数', true);
      if (c.sourceDurationInFrames !== undefined) finite(c.sourceDurationInFrames, 1, p.fps * 3600, '源持续帧数', true);
      if (c.start + c.duration > p.fps * 3600) fail('时间线超过一小时');
      finite(c.inOffset, 0, p.fps * 3600, '裁入点');
      finite(c.speed, 0.05, 16, '播放速度');
      finite(c.opacity, 0, 1, '不透明度');
      finite(c.scale, 0.01, 100, '缩放');
      finite(c.x, -50000, 50000, '水平位置');
      finite(c.y, -50000, 50000, '垂直位置');
      if (!c.props || typeof c.props !== 'object' || Array.isArray(c.props)) fail('片段属性无效');
      if (['audio-clip', 'video-clip'].includes(c.cardId) && c.props.volume !== undefined) finite(c.props.volume, 0, 8, '音量');
      if (['audio-clip','video-clip','image-clip'].includes(c.cardId) && c.props.file) {
        const f = c.props.file;
        if (typeof f !== 'string' || /(^[\\/]|^[a-z]+:|(^|[\\/])\.\.([\\/]|$))/i.test(f)) fail('媒体路径必须是 public/ 内的相对路径');
      }
    }
  }
  if (!clips) fail('时间线没有片段');
  return p;
};
export const parseProjectJson = (raw, knownCards) => {
  if (new TextEncoder().encode(raw).length > MAX_PROJECT_BYTES) fail('工程 JSON 超过 5 MB');
  return validateProject(JSON.parse(raw), knownCards);
};
