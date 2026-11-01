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
})(globalThis.PixelVideo=globalThis.PixelVideo||{});
