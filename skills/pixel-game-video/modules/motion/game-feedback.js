(function(P){
  'use strict';
  const smooth=v=>{v=P.clamp(v);return v*v*v*(10+v*(-15+6*v));};
  const mix=(a,b,t)=>a+(b-a)*t;
  // A brief positional response: never stretches the object or the whole room.
  const impact=t=>t>=0&&t<1?Math.sin(t*Math.PI*2)*Math.exp(-4*t):0;
  function flight(a,b,t,lift=18){const q=smooth(t);return{x:mix(a.x,b.x,q),y:mix(a.y,b.y,q)-lift*Math.sin(Math.PI*q),size:mix(a.size,b.size,q)};}
  function corners(g,r,t,color){
    const pad=2+7*(1-smooth(t)),length=7;
    g.save();g.strokeStyle=color;g.lineWidth=1.5;
    for(const [sx,sy] of [[-1,-1],[1,-1],[-1,1],[1,1]]){
      const x=r.x+r.w/2+sx*(r.w/2-pad),y=r.y+r.h/2+sy*(r.h/2-pad);
      g.beginPath();g.moveTo(x-sx*length,y);g.lineTo(x,y);g.lineTo(x,y-sy*length);g.stroke();
    }g.restore();
  }
  function burst(g,x,y,t,color,radius=8){
    if(t<0||t>=1)return;g.save();g.globalAlpha=1-t;g.fillStyle=color;
    for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]){
      const d=3+radius*smooth(t);g.fillRect(x+dx*d-1,y+dy*d-1,2,2);
    }g.restore();
  }
  P.motion.gameFeedback={smooth,mix,impact,flight,corners,burst};
})(globalThis.PixelVideo=globalThis.PixelVideo||{});
