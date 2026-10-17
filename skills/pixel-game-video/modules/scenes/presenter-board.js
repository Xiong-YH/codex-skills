(function(P){
  'use strict';
  P.presenterBoard={draw(e,shot,frame){
    const a=shot.params,c=e.colors,g=e.ctx,w=e.width,h=e.height;
    const text=(value,x,y,size,color,maxWidth=.54)=>P.text.draw(e,value,x*w,y*h,size*h,color||c.ink,w*maxWidth);
    const pair=a.layout==='pair',list=a.layout==='checklist';
    text(a.heading,.66,pair?.215:.20,pair?.047:.041,c.ink);
    text(a.kicker,.66,pair?.315:.275,.023,c.muted);
    a.items.forEach((item,index)=>{
      const at=P.scenes.eventFrame(shot,item.event);if(frame<at)return;
      const p=P.clamp((frame-at)/(e.fps*.2)),pop=1-Math.pow(1-p,3);
      const object=shot.objects.find(o=>o.id===item.object);
      const transform=P.motion.objectTransform(shot.motions||[],object.id,frame);
      const size=list?.145:pair?.28:.35;
      P.library.prop(e,object.asset,object.x*w,(object.y-(1-pop)*.018)*h,h*size,transform);
      g.save();g.globalAlpha=pop;
      if(pair){
        text(item.label,object.x,.665,.036,index===0?c.accent:c.gold,.25);
        text(item.detail,object.x,.715,.023,c.muted,.25);
      }else if(list){
        text(item.label,.70,object.y-.012,.032,c.accent,.35);
        text(item.detail,.70,object.y+.036,.023,c.muted,.35);
      }else{
        text(item.label,.70,.445,.037,c.accent,.31);
        text(item.detail,.70,.54,.027,c.muted,.30);
        g.fillStyle=c.gold;g.fillRect(w*.65,h*.605,w*.10,e.pixel*.55);
      }
      g.restore();
    });
  }};
})(globalThis.PixelVideo=globalThis.PixelVideo||{});
