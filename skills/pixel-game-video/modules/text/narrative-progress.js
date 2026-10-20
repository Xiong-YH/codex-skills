(function(P){
 'use strict';
 P.narrativeProgress={draw(e,frame){
   const g=e.ctx,c=e.colors,w=e.width,h=e.height,nodes=e.resolved.progress.nodes;
   const left=w*.065,right=w*.935,y=h*.034,barHeight=Math.max(e.pixel*3,h*.022),total=e.resolved.durationFrames-1;
   const p=P.clamp(frame/Math.max(1,total)),current=nodes.filter(n=>n.frame<=frame).length-1;
   g.save();g.fillStyle='#08121bef';g.fillRect(0,0,w,h*.115);
   // A solid rectangular track and continuous rectangular fill; no point markers.
   g.fillStyle=c.edge;g.fillRect(left,y,right-left,barHeight);
   g.fillStyle=c.accent;g.fillRect(left,y,(right-left)*p,barHeight);
   nodes.forEach((n,i)=>{
     const x=left+(right-left)*n.frame/Math.max(1,total),active=i===current,done=i<current;
     if(i>0){g.fillStyle='#08121b';g.fillRect(x-1,y,2,barHeight);}
     P.text.draw(e,n.label,x,h*.082,h*.023,active?c.ink:done?c.accent:c.muted,w*.14,'center');
   });g.restore();
 }};
})(globalThis.PixelVideo=globalThis.PixelVideo||{});
