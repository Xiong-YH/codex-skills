(function (root) {
  'use strict';
  const R = root.PixelCustomRuntime || (typeof require === 'function' && require('./runtime.js'));
  const size = Object.freeze({width: 640, height: 320});
  function stateAt({frame, events, params = {}, seed = 1}) {
    if (!Number.isInteger(frame)) throw new Error('frame must be an integer');
    const count = params.count ?? 24, from = params.from ?? 0, to = params.to ?? 1000;
    if (Object.keys(params).some(k => !['count', 'from', 'to'].includes(k))) throw new Error('Unknown state-meter parameter');
    if (!Number.isInteger(count) || count < 4 || count > 40) throw new Error('count must be 4..40');
    R.finite(from, 'from'); R.finite(to, 'to');
    if (Math.max(Math.abs(from), Math.abs(to)) > Number.MAX_SAFE_INTEGER) throw new Error('Unsafe value');
    const names = ['enter', 'start', 'full', 'risk', 'break', 'settled'];
    const times = names.map(n => R.event(events, n));
    if (times.some((v, i) => i && (i === 1 ? v < times[i - 1] : v <= times[i - 1]))) throw new Error('Invalid event order');
    const visible = frame >= times[0], growth = R.progress(frame, events, 'start', 'full');
    const falling = R.progress(frame, events, 'break', 'settled');
    const stage = frame < times[2] ? 'growing' : frame < times[3] ? 'full' : frame < times[4] ? 'warning' : frame < times[5] ? 'breaking' : 'settled';
    const items = Array.from({length: count}, (_, i) => {
      const id = 'segment-' + i, sourceX = 48 + i * (544 / count), sourceY = 126;
      const targetX = 32 + i * (576 / count), targetY = 290 - R.noise(seed, id) * 6;
      const u = 1 - (1 - falling) ** 2;
      return {id, active: visible && i < Math.ceil(growth * count),
        owner: frame < times[4] ? 'meter' : frame < times[5] ? 'falling' : 'ground',
        x: sourceX + (targetX - sourceX) * u,
        y: sourceY + (targetY - sourceY) * falling ** 2 - 24 * Math.sin(Math.PI * falling),
        angle: (R.noise(seed, id + '-angle') - .5) * 2 * u,
        width: 544 / count - 4, height: 17 - 8 * u};
    });
    return {visible, stage, value: Math.round(from + (to - from) * growth),
      level: Math.round(100 * growth * (1 - falling)), items};
  }
  function draw(ctx, state, options = {}) {
    if (!state.visible) return;
    const c = {...{panel:'#15252f',ink:'#f3e7c8',muted:'#a5b8b8',edge:'#98794e',normal:'#74c69d',danger:'#ec655b'}, ...options.colors};
    const labels = {...{value:'DAY',level:'安心值（示意）',normal:'持续积累',warning:'检测到风险',failed:'已失效'}, ...options.labels};
    ctx.save();
    try {
      const rect = (x,y,w,h,color) => {ctx.fillStyle=color;ctx.fillRect(x,y,w,h);};
      const text = (s,x,y,fontSize,color) => {ctx.fillStyle=color;ctx.font=`500 ${fontSize}px "Microsoft YaHei",sans-serif`;ctx.fillText(s,x,y);};
      rect(28,18,584,148,c.panel);ctx.strokeStyle=c.edge;ctx.lineWidth=2;ctx.strokeRect(28,18,584,148);
      for (const x of [28,606]) for (const y of [18,160]) rect(x,y,6,6,c.edge);
      text(labels.value,48,44,14,c.muted);text(String(state.value),48,84,32,c.ink);
      const failed = ['breaking','settled'].includes(state.stage), warning = state.stage === 'warning';
      text(failed?labels.failed:warning?labels.warning:labels.normal,280,70,22,failed||warning?c.danger:c.ink);
      text(labels.level,48,112,14,c.muted);text(state.level+'%',535,112,18,c.ink);
      rect(48,126,544,17,c.muted);
      for (const item of state.items) if (item.active) {
        ctx.save();
        try {
          ctx.translate(item.x+item.width/2,item.y+item.height/2);ctx.rotate(item.angle);
          rect(-item.width/2,-item.height/2,item.width,item.height,failed||warning?c.danger:c.normal);
        } finally {ctx.restore();}
      }
    } finally {ctx.restore();}
  }
  root.PixelStateMeter = {id:'object.state-meter-break.v1',size,stateAt,draw};
  if (typeof module !== 'undefined') module.exports = root.PixelStateMeter;
})(globalThis);
