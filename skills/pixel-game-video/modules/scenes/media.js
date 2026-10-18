(function(P){
  'use strict';
  function image(e,asset,box,fit='cover',anchorX=.5,anchorY=.5){
    if(!asset)throw new Error('Missing project image or video asset');
    const g=e.ctx,sw=asset.videoWidth||asset.width,sh=asset.videoHeight||asset.height;
    const scale=(fit==='contain'?Math.min:Math.max)(box.width/sw,box.height/sh);
    const w=sw*scale,h=sh*scale,x=box.x+(box.width-w)*anchorX,y=box.y+(box.height-h)*anchorY;
    g.save();g.beginPath();g.rect(box.x,box.y,box.width,box.height);g.clip();
    g.imageSmoothingEnabled=false;g.drawImage(asset,x,y,w,h);g.restore();
  }
  P.media={image,draw(e,source){
    const g=e.ctx;g.fillStyle=e.colors.background;g.fillRect(0,0,e.width,e.height);
    image(e,e.assets[source.assetKey],{x:0,y:0,width:e.width,height:e.height},source.fit,source.anchorX,source.anchorY);
    if(source.dim){g.save();g.globalAlpha=source.dim;g.fillStyle=e.colors.background;g.fillRect(0,0,e.width,e.height);g.restore();}
  }};
})(globalThis.PixelVideo=globalThis.PixelVideo||{});
