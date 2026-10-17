(function (P) {
  'use strict';
  function propCanvas(e, asset) {
    const key = asset + ':' + e.colors.accent;
    if (e.propCache[key]) return e.propCache[key];
    const canvas = e.createCanvas(48, 48), g = canvas.getContext('2d'), c = e.colors;
    const rect = (x,y,w,h,color) => { g.fillStyle = color; g.fillRect(x,y,w,h); };
    if (asset === 'prop.book.v1') {
      rect(9,5,29,38,c.edge); rect(11,3,27,38,c.ink); rect(9,3,25,36,c.accent);
      rect(9,3,4,36,c.edge); rect(17,11,12,2,c.background); rect(17,16,12,2,c.background);
      rect(19,23,8,8,c.gold); rect(21,21,4,12,c.gold); rect(13,39,25,2,c.muted);
    } else if (asset === 'prop.core.v1') {
      rect(18,3,12,4,c.edge); rect(11,7,26,4,c.edge); rect(7,11,34,26,c.edge);
      rect(11,37,26,4,c.edge); rect(18,41,12,4,c.edge); rect(13,13,22,22,c.accent);
      rect(17,17,14,14,c.background); rect(21,21,6,6,c.gold);
      [[3,21],[41,21],[21,3],[21,41]].forEach(([x,y]) => rect(x,y,4,4,c.gold));
    } else {
      rect(7,11,32,28,c.edge); rect(7,7,28,28,c.accent); rect(11,11,20,20,c.panel);
      rect(16,18,4,4,c.accent); rect(20,22,4,4,c.accent); rect(24,14,4,8,c.accent);
      rect(11,7,16,2,c.ink);
    }
    e.propCache[key] = canvas;
    return canvas;
  }
  P.library = {
    actor(e, shot, frame) {
      if (!shot.actor) return;
      const pose = P.scenes.performance(e.mouth, frame), blink = (frame % Math.round(e.fps * 3.7)) < Math.max(1, Math.round(e.fps * .1)) ? 1 : 0;
      const image = e.assets[`${shot.actor}:${blink}-${pose}`];
      if (!image) throw new Error('Missing actor asset ' + shot.actor);
      const height = e.height * .40, width = height * 32 / 36;
      const x = e.width * .20, base = e.height * .75;
      e.ctx.imageSmoothingEnabled = false;
      e.ctx.drawImage(image, x - width / 2, base - height * 33 / 36, width, height);
    },
    prop(e, asset, x, y, size, transform) {
      const g = e.ctx, s = size || e.height * .24;
      const tr = transform || {scale:1,flip:1};
      g.save(); g.translate(x,y); g.scale(tr.scale * tr.flip, tr.scale);
      g.imageSmoothingEnabled = false; g.drawImage(propCanvas(e,asset),-s/2,-s/2,s,s); g.restore();
    },
    objects(e, shot, frame) {
      for (const object of shot.objects || []) {
        const transform = P.motion.objectTransform(shot.motions || [], object.id, frame);
        P.library.prop(e, object.asset, object.x * e.width, object.y * e.height, e.height * .27, transform);
      }
    }
  };
})(globalThis.PixelVideo = globalThis.PixelVideo || {});
