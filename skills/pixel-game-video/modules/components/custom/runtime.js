(function (root) {
  'use strict';
  const finite = (v, name) => { if (!Number.isFinite(v)) throw new Error(name + ' must be finite'); return v; };
  const clamp = v => Math.max(0, Math.min(1, v));
  function event(events, name) {
    const v = events[name];
    if (!Number.isInteger(v) || v < 0) throw new Error('Missing or invalid event: ' + name);
    return v;
  }
  function progress(frame, events, start, end) {
    finite(frame, 'frame');
    const a = event(events, start), b = event(events, end);
    if (b <= a) throw new Error(end + ' must follow ' + start);
    return clamp((frame - a) / (b - a));
  }
  function noise(seed, id) {
    let h = 2166136261;
    for (const c of String(seed) + ':' + String(id)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    return (h >>> 0) / 4294967296;
  }
  function place(ctx, bounds, designSize, draw) {
    const {x, y, width, height} = bounds;
    [x, y, width, height, designSize.width, designSize.height].forEach(v => finite(v, 'bounds'));
    if (Math.min(width, height, designSize.width, designSize.height) <= 0) throw new Error('Dimensions must be positive');
    const scale = Math.min(width / designSize.width, height / designSize.height);
    ctx.save();
    try {
      ctx.translate(x + (width - designSize.width * scale) / 2, y + (height - designSize.height * scale) / 2);
      ctx.scale(scale, scale);
      draw(ctx);
    } finally { ctx.restore(); }
  }
  root.PixelCustomRuntime = {clamp, finite, event, progress, noise, place};
  if (typeof module !== 'undefined') module.exports = root.PixelCustomRuntime;
})(globalThis);
