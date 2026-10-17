(function (P) {
  'use strict';
  P.motion = {
    camera(motions, frame) {
      let result = {scale:1,x:.62,y:.5};
      for (const m of [...motions].sort((a,b)=>a.startFrame-b.startFrame)) {
        if (m.recipe !== 'motion.camera-push.v1' || frame < m.startFrame) continue;
        const p = P.ease(P.progress(frame,m.startFrame,m.endFrame)), a = m.params || {};
        const targetScale=a.scale ?? 1.1,targetX=a.x ?? result.x,targetY=a.y ?? result.y;
        result = {scale:result.scale+(targetScale-result.scale)*p,x:result.x+(targetX-result.x)*p,y:result.y+(targetY-result.y)*p};
      }
      return result;
    },
    objectTransform(motions, target, frame) {
      const matching=motions.filter(m=>m.recipe==='motion.object-reveal.v1'&&m.target===target).sort((a,b)=>a.startFrame-b.startFrame);
      const m=matching.filter(m=>frame>=m.startFrame).at(-1)||matching[0];
      let result = {scale:1,flip:1};
      if(m){
        const p = P.progress(frame,m.startFrame,m.endFrame), a = m.params || {}, eased = P.ease(p);
        // Intentional 2D layer flip: positive width never mirrors front-face artwork.
        result = {scale:(a.scaleFrom || .25) + (1-(a.scaleFrom || .25))*eased,
                  flip:Math.max(.035,Math.abs(Math.cos((1-eased)*Math.PI*(a.turns === undefined ? 1 : a.turns))))};
      }
      return result;
    },
    shatter(e, previous, motion, frame) {
      const p = P.progress(frame,motion.startFrame,motion.endFrame);
      if (p >= 1) return;
      const g=e.ctx,w=e.width,h=e.height,a=motion.params || {}, cx=(a.x === undefined ? .62:a.x)*w,cy=(a.y === undefined ? .5:a.y)*h;
      const points=[[0,0],[w*.33,0],[w*.66,0],[w,0],[w,h*.33],[w,h*.66],[w,h],[w*.66,h],[w*.33,h],[0,h],[0,h*.66],[0,h*.33]];
      for(let i=0;i<points.length;i++) {
        const q=points[i],r=points[(i+1)%points.length],mx=(cx+q[0]+r[0])/3,my=(cy+q[1]+r[1])/3;
        const seed=(a.seed ?? e.seed ?? 1), variation=(Math.sin((i+seed)*127.1)*43758.5453)%1;
        const fly=Math.max(0,(p-.13)/.87),distance=(fly*.25+fly*fly*1.05)*(1+Math.abs(variation)*.3);
        g.save(); g.globalAlpha=1-P.clamp((p-.5)/.5); g.translate((mx-cx)*distance,(my-cy)*distance);
        g.translate(mx,my);g.rotate((i%2 ? 1:-1)*fly*.18);g.translate(-mx,-my);
        g.beginPath();g.moveTo(cx,cy);g.lineTo(q[0],q[1]);g.lineTo(r[0],r[1]);g.closePath();g.clip();
        g.drawImage(previous,0,0,w,h);
        if(p<.3) {g.strokeStyle=e.colors.ink;g.globalAlpha=Math.min(.75,p*6);g.lineWidth=e.pixel*.5;g.stroke();}
        g.restore();
      }
    },
    effects(e,motions,frame) {
      for(const m of motions) {
        if(m.recipe!=='motion.gold-burst.v1'||frame<m.startFrame||frame>=m.endFrame)continue;
        const p=P.progress(frame,m.startFrame,m.endFrame),a=m.params||{},x=(a.x===undefined?.64:a.x)*e.width,y=(a.y===undefined?.48:a.y)*e.height;
        const g=e.ctx,envelope=Math.sin(Math.PI*p)*(1-p),r=e.height*(.05+p*.27);
        g.save();g.fillStyle=e.colors.gold;g.globalAlpha=envelope*.7;
        for(let i=0;i<12;i++){const angle=i*Math.PI/6;const size=e.pixel*(1+((i*7)%3));g.fillRect(x+Math.cos(angle)*r-size/2,y+Math.sin(angle)*r-size/2,size,size);}
        g.restore();
      }
    }
  };
})(globalThis.PixelVideo = globalThis.PixelVideo || {});
