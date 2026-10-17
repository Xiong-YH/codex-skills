(function (P) {
  'use strict';
  P.clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  P.ease = p => 1 - Math.pow(1 - P.clamp(p), 3);
  P.progress = (frame, start, end) => P.clamp((frame - start) / Math.max(1, end - start - 1));
  P.style = {
    background(e) {
      const {ctx:g, width:w, height:h, colors:c, pixel:px} = e;
      g.fillStyle = c.background; g.fillRect(0, 0, w, h);
      g.fillStyle = c.panel;
      for (let x = 0; x < w; x += px * 16) {
        for (let y = px * 28; y < h * .8; y += px * 16) g.fillRect(x, y, px, px);
      }
      g.fillStyle = c.edge; g.fillRect(w * .05, h * .75, w * .9, px);
      g.fillStyle = c.panel; g.fillRect(w * .05, h * .75 + px, w * .9, px * 3);
    },
    panel(e, x, y, w, h, color) {
      const {ctx:g, pixel:px, colors:c} = e;
      g.fillStyle = color || c.edge; g.fillRect(x, y, w, h);
      g.fillStyle = c.panel; g.fillRect(x + px, y + px, w - px * 2, h - px * 2);
    }
  };
})(globalThis.PixelVideo = globalThis.PixelVideo || {});
