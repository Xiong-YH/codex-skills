(function(P){
  'use strict';
  // A foreground rack passes the lens while an action changes location.
  P.motion.foregroundWipe=function(e,p){
    if(p<=0||p>=1)return;
    const g=e.ctx,w=e.width,h=e.height,x=w*(1.15-2.42*p),size=w*1.12;
    g.save();g.fillStyle='#07101b';g.fillRect(x,0,size,h);
    g.fillStyle='#203748';g.fillRect(x+size*.06,0,e.pixel*3,h);
    g.fillStyle='#365262';g.fillRect(x+size*.075,0,e.pixel,h);
    for(let y=0;y<h;y+=e.pixel*13){g.fillStyle='#132536';g.fillRect(x+size*.12,y,size*.75,e.pixel*3);}
    g.restore();
  };
})(globalThis.PixelVideo=globalThis.PixelVideo||{});
