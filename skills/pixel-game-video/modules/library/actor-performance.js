(function(P){
  'use strict';
  // Articulate the approved sprite in the renderer; source PNG and face stay intact.
  P.library.perform=function(e,id,x,feet,height,o={}){
    const g=e.ctx,t=o.time||0,face=o.facing||1,walk=o.walk||0;
    const stride=Math.sin(t*18),bob=walk*Math.abs(stride)*.8;
    const blink=(Math.floor(t*60)%211)>204?1:0,image=e.assets[`${id}:${blink}-0`];
    if(!image)throw Error('Missing performance actor '+id);
    const unit=height/36,reach=o.reach||0,carry=o.carry||0;
    g.save();g.fillStyle='#020711';g.globalAlpha=.4;
    g.fillRect(x-height*.22,feet-height*.012,height*.44,height*.026);g.restore();
    g.save();g.translate(Math.round(x),Math.round(feet));g.scale(unit*face,unit);
    g.translate(0,-bob);g.imageSmoothingEnabled=false;
    function part(sx,sy,w,h,px,py,angle,dx=0,dy=0){
      g.save();g.translate(px,py);g.rotate(angle);g.drawImage(image,sx,sy,w,h,dx,dy,w,h);g.restore();
    }
    const jump=o.react?Math.sin(P.clamp(o.react)*Math.PI)*1.3:0;
    g.translate(0,-jump);
    part(11,29,6,5,-2,-4,walk*stride*.43, -3,0);
    part(17,29,6,5,4,-4,-walk*stride*.43,-2,0);
    part(9,25,4,5,-4,-8,walk*stride*.6+carry*.65,-3,0);
    // Collar and torso use the original pixel rows, independent of the arms.
    g.drawImage(image,10,24,13,2,-6,-9,13,2);
    g.drawImage(image,13,26,9,4,-3,-7,9,4);
    const lean=walk*.055+reach*.045+(o.think?-.055:0);
    part(0,0,32,24,0,-10,lean,-16,-23);
    part(22,25,4,5,7,-8,-walk*stride*.6-reach*1.15-carry*.9,-1,0);
    g.restore();
    return {x:x+face*height*(.25+reach*.08),y:feet-height*(.16+reach*.05)-unit*bob};
  };
})(globalThis.PixelVideo=globalThis.PixelVideo||{});
