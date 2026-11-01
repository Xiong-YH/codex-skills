(function(P){
  'use strict';
  P.style.background=function(e,shot){
    const key=e.style.backgrounds[shot?.params?.environment||'workspace'];
    if(!key||!e.assets[key])throw Error('Missing study environment '+key);
    const cacheKey='study-plate:'+key;
    let plate=e.propCache[cacheKey];
    if(!plate){
      plate=e.propCache[cacheKey]=e.createCanvas(480,270);
      const g=plate.getContext('2d'),source=e.assets[key],scale=Math.max(480/source.width,270/source.height),sw=480/scale,sh=270/scale;
      g.imageSmoothingEnabled=false;g.drawImage(source,(source.width-sw)/2,(source.height-sh)/2,sw,sh,0,0,480,270);
    }
    e.ctx.save();e.ctx.imageSmoothingEnabled=false;e.ctx.drawImage(plate,0,0,e.width,e.height);e.ctx.restore();
  };
})(globalThis.PixelVideo=globalThis.PixelVideo||{});
