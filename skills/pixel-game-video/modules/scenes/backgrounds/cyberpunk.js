(function(P){
  'use strict';
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

})(globalThis.PixelVideo=globalThis.PixelVideo||{});
