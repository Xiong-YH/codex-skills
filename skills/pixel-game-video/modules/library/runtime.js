(function (P) {
  'use strict';
  function cyberProp(g, asset, c) {
    const rect = (x,y,w,h,color) => { g.fillStyle = color; g.fillRect(x,y,w,h); };
    const shell = c.propShell || '#101b32', recess = c.propRecess || '#090f22';
    const bevel = c.propBevel || '#344264', light = c.propLight || '#7188a7';
    const pink = c.neonPink || '#ed67ca';
    if (asset === 'prop.book.v1') {
      // A portable archive: a bound silhouette, recessed screen and exposed contacts.
      rect(9,7,30,35,recess); rect(8,5,29,35,bevel); rect(8,4,27,34,shell);
      rect(8,4,4,34,recess); rect(12,4,21,1,light); rect(12,5,1,32,bevel);
      rect(34,7,3,28,recess); rect(35,9,2,2,c.gold); rect(35,15,2,2,c.gold);
      rect(35,21,2,2,c.gold); rect(35,27,2,2,c.gold);
      rect(16,10,15,13,bevel); rect(17,11,13,11,recess);
      rect(19,13,9,1,c.accent); rect(19,16,6,1,c.accent); rect(19,19,3,1,pink);
      rect(26,18,2,2,c.gold); rect(16,27,8,1,light); rect(16,30,12,1,bevel);
      rect(28,27,3,2,pink); rect(16,34,3,1,c.accent); rect(21,34,3,1,c.accent);
      rect(11,38,25,2,recess); rect(14,38,19,1,light); rect(14,40,22,1,bevel);
      rect(9,8,1,8,c.accent); rect(9,28,1,5,pink);
    } else if (asset === 'prop.core.v1') {
      // Stepped octagonal housing keeps the reactor readable at scene scale.
      rect(17,3,14,4,recess); rect(10,7,28,4,recess); rect(6,11,36,26,recess);
      rect(10,37,28,4,recess); rect(17,41,14,4,recess);
      rect(17,5,14,3,bevel); rect(11,8,26,4,bevel); rect(8,12,32,23,bevel);
      rect(12,35,24,4,bevel); rect(18,39,12,3,bevel);
      rect(14,10,20,2,light); rect(10,13,1,10,light);
      rect(16,13,16,3,shell); rect(12,16,24,16,shell); rect(16,32,16,3,shell);
      rect(19,14,10,2,c.accent); rect(14,19,2,10,c.accent);
      rect(32,19,2,10,pink); rect(19,32,10,2,pink);
      rect(19,18,10,12,recess); rect(17,20,14,8,recess);
      rect(21,19,6,10,c.gold); rect(19,21,10,6,c.gold);
      rect(22,21,4,5,c.ink); rect(21,22,6,3,c.ink);
      [[3,21],[41,21],[21,3],[21,41]].forEach(([x,y],i) => {
        rect(x,y,4,4,shell); rect(x+1,y+1,2,2,i % 2 ? pink : c.accent);
      });
      rect(11,32,3,2,c.gold); rect(34,13,3,2,c.gold);
    } else {
      // Socketed task chip: sparse traces lead to one unmistakable status glyph.
      rect(9,9,30,31,recess); rect(7,7,30,30,bevel); rect(8,8,28,28,shell);
      rect(9,8,24,1,light); rect(8,9,1,23,light); rect(11,11,22,22,recess);
      [13,19,25,31].forEach(n => {
        rect(n,4,2,3,c.gold); rect(n,37,2,3,c.gold);
        rect(4,n,3,2,c.gold); rect(37,n,3,2,c.gold);
      });
      rect(12,13,6,1,bevel); rect(12,14,1,6,bevel);
      rect(27,25,5,1,bevel); rect(31,21,1,4,bevel);
      rect(15,20,4,4,c.accent); rect(19,24,4,4,c.accent); rect(23,16,4,8,c.accent);
      rect(15,20,3,1,c.ink); rect(23,16,3,1,c.ink);
      rect(29,12,3,2,pink); rect(12,29,3,2,pink);
      rect(21,33,11,1,c.accent);
    }
  }
  function propCanvas(e, asset) {
    const key = asset + ':' + e.style.id + ':' + e.colors.accent;
    if (e.propCache[key]) return e.propCache[key];
    const canvas = e.createCanvas(48, 48), g = canvas.getContext('2d'), c = e.colors;
    const rect = (x,y,w,h,color) => { g.fillStyle = color; g.fillRect(x,y,w,h); };
    if (e.style.id === 'style.cyberpunk.v1') {
      cyberProp(g, asset, c);
    } else if (asset === 'prop.book.v1') {
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
      if(shot.scene==='scenes.cache-adventure.v1')return;
      const pose = P.scenes.performance(e.mouth, frame), blinkTime = frame - Math.round(e.fps * 2.8);
      const blink = blinkTime >= 0 && (blinkTime % Math.round(e.fps * 3.7)) < Math.max(1, Math.round(e.fps * .1)) ? 1 : 0;
      const image = e.assets[`${shot.actor}:${blink}-${pose}`];
      if (!image) throw new Error('Missing actor asset ' + shot.actor);
      const placement=e.style.presenter||{};
      const height = e.height * (placement.height??.40), width = height * 32 / 36;
      const x = e.width * (placement.x??.20), base = e.height * (placement.baseline??.75);
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
