(function(P){
  'use strict';

  function cutRect(g,x,y,w,h,cut,color){
    const k=Math.min(cut,w/4,h/4);
    g.fillStyle=color;g.beginPath();
    g.moveTo(x+k,y);g.lineTo(x+w,y);g.lineTo(x+w,y+h-k);
    g.lineTo(x+w-k,y+h);g.lineTo(x,y+h);g.lineTo(x,y+k);
    g.closePath();g.fill();
  }

  P.style.background=function(e){
    const {ctx:g,width:w,height:h}=e;
    const plate=e.assets['style.cyberpunk-city.v1'];
    if(!plate)throw new Error('Missing cyberpunk background asset; rebuild the project');
    const scale=Math.max(w/plate.width,h/plate.height);
    const sw=w/scale,sh=h/scale;
    g.save();g.imageSmoothingEnabled=false;
    g.drawImage(plate,(plate.width-sw)/2,(plate.height-sh)/2,sw,sh,0,0,w,h);
    g.restore();
  };

  P.style.panel=function(e,x,y,w,h,color){
    const {ctx:g,pixel:px,colors:c}=e;
    const rim=color||c.edge,cut=px*2;
    g.save();
    // A stepped silhouette and inset metal layers keep the UI on the pixel grid.
    cutRect(g,x+px,y+px*2,w,h,cut,'rgba(2,5,15,0.78)');
    cutRect(g,x,y,w,h,cut,rim);
    cutRect(g,x+px,y+px,w-px*2,h-px*2,px,c.panel);
    g.fillStyle=c.panelHighlight;
    g.fillRect(x+px*2,y+px,w-px*3,px*.5);
    g.fillStyle=c.panelInset;
    g.fillRect(x+px,y+h-px*2,w-px*3,px);
    // Short emissive seams make active terminals legible without a glowing frame.
    const seam=Math.min(w*.14,px*8);
    g.fillStyle=color===c.accent?c.accent:c.secondary;
    g.fillRect(x+px*2,y,seam,px);
    g.fillStyle=c.accent;
    g.fillRect(x+w-seam-px*2,y+h-px,seam,px);
    g.fillStyle=c.panelHighlight;
    g.fillRect(x+w-px*4,y+px*2,px,px);
    g.fillRect(x+w-px*2,y+px*2,px*.5,px);
    g.restore();
  };
})(globalThis.PixelVideo=globalThis.PixelVideo||{});
