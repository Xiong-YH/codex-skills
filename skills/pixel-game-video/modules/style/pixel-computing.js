(function(P){
  'use strict';
  P.style.background=function(e,shot){
    const {ctx:g,width:w,height:h}=e;
    const key=e.style.backgrounds[shot?.params?.environment||'workspace'];
    const plate=e.assets[key];
    if(!plate)throw Error('Missing pixel-computing background '+key);
    const scale=Math.max(w/plate.width,h/plate.height),sw=w/scale,sh=h/scale;
    g.save();g.imageSmoothingEnabled=false;
    g.drawImage(plate,(plate.width-sw)/2,(plate.height-sh)/2,sw,sh,0,0,w,h);
    g.restore();
  };
  P.style.panel=function(e,x,y,w,h,color){
    const {ctx:g,pixel:p,colors:c}=e;
    g.save();g.fillStyle='#030910';g.fillRect(x+p,y+p*2,w,h);
    g.fillStyle=color||c.edge;g.fillRect(x,y,w,h);
    g.fillStyle=c.panel;g.fillRect(x+p,y+p,w-2*p,h-2*p);
    g.fillStyle=c.panelHighlight;g.fillRect(x+p,y+p,w-2*p,p*.5);
    g.fillStyle=c.gold;g.fillRect(x+p*2,y,p*5,p*.6);g.restore();
  };
})(globalThis.PixelVideo=globalThis.PixelVideo||{});
