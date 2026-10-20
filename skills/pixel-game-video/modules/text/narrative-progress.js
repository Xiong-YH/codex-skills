(function(P){
 'use strict';
 P.narrativeProgress={draw(e,frame){
   const g=e.ctx,c=e.colors,w=e.width,h=e.height,nodes=e.resolved.progress.nodes;
   const left=w*.065,right=w*.935,y=h*.045,total=e.resolved.durationFrames-1;
   const p=P.clamp(frame/Math.max(1,total)),current=nodes.filter(n=>n.frame<=frame).length-1;
   g.save();g.fillStyle='#08121bef';g.fillRect(0,0,w,h*.115);
   g.fillStyle=c.edge;g.fillRect(left,y-2,right-left,4);
   g.fillStyle=c.accent;g.fillRect(left,y-2,(right-left)*p,4);
   nodes.forEach((n,i)=>{
     const x=left+(right-left)*n.frame/Math.max(1,total),active=i===current,done=i<current;
     g.fillStyle=active?c.gold:done?c.accent:c.edge;g.fillRect(x-6,y-6,12,12);
     P.text.draw(e,n.label,x,h*.082,h*.023,active?c.ink:done?c.accent:c.muted,w*.14,'center');
   });g.restore();
 }};
})(globalThis.PixelVideo=globalThis.PixelVideo||{});
