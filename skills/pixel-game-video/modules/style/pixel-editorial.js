(function(P){
  'use strict';
  // Neutral fallback; scene-specific plates are project-owned, not baked into this theme.
  P.style.background=function(e){
    const g=e.ctx;g.fillStyle=e.colors.background;g.fillRect(0,0,e.width,e.height);
    g.fillStyle=e.colors.panelInset;g.fillRect(0,e.height*.78,e.width,e.height*.22);
  };
})(globalThis.PixelVideo=globalThis.PixelVideo||{});
