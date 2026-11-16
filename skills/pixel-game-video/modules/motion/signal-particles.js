(function(P){
  'use strict';
  const lerp=(a,b,t)=>a+(b-a)*t;

  // Short, separated blocks transfer from the stop into a polyline.
  function draw(g, {points, contact, release, arrival, size, color, highlight}, frame){
    if(frame<contact||frame>=arrival)return;
    const launchStep=.18;
    const [x,y]=points[0], [nextX,nextY]=points[1];
    const angle=Math.atan2(nextY-y,nextX-x);
    const travel=(frame-release)/(arrival-release);
    const spread=P.clamp((frame-contact)/(release-contact));
    g.save();
    try{
      const opacity=g.globalAlpha;
      g.translate(x,y);
      g.rotate(angle);
      g.fillStyle=highlight;
      g.globalAlpha=opacity*.9*(1-P.clamp((frame-contact)/(release-contact+2)));
      g.fillRect(-size*.62,-size*1.8,size*.55,size*3.6);
      for(let index=0;index<4;index++){
        const launch=index*launchStep;
        if(travel>=launch)continue;
        const side=index%2===0?-1:1;
        const outer=index>=2;
        const across=(.7+spread+(outer?.95:0))*size;
        const length=(1.5+spread*.7)*size;
        const ready=P.clamp((travel+.15)/(launch+.15));
        const shrink=outer?.68:1;
        const target=size*(index===0?1.18:1-index*.16);
        const blockLength=lerp(length*shrink,target,ready);
        const blockHeight=lerp(size*(outer?.42:.64),target,ready);
        g.globalAlpha=opacity;
        g.fillStyle=index===0?highlight:color;
        g.fillRect(lerp(size*.85+blockLength/2,0,ready)-blockLength/2,
          side*across*(1-ready)-blockHeight/2,blockLength,blockHeight);
      }
    }finally{g.restore();}

    if(travel<0)return;
    g.save();
    try{
      for(let index=3;index>=0;index--){
        const launch=index*launchStep;
        if(travel<launch)continue;
        const progress=(travel-launch)/(1-launch);
        const {head}=P.motion.tracePath(points,progress);
        const side=index===0?size*1.18:size*(1-index*.16);
        g.fillStyle=index===0?highlight:color;
        g.fillRect(Math.round(head[0]-side/2),Math.round(head[1]-side/2),side,side);
      }
    }finally{g.restore();}
  }

  P.signalParticles={draw};
})(globalThis.PixelVideo=globalThis.PixelVideo||{});
