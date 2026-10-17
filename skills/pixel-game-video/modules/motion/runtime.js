(function (P) {
  'use strict';
  const smooth = p => {p=P.clamp(p);return p*p*(3-2*p);};
  function stage(e) {
    return e.stage || {x:e.width*.36,y:e.height*.18,width:e.width*.59,height:e.height*.585};
  }
  function clipStage(g,s) {g.beginPath();g.rect(s.x,s.y,s.width,s.height);g.clip();}
  function layer(e,source,s,dx,scale,alpha) {
    if(alpha<=0)return;
    const g=e.ctx,cx=s.x+s.width/2,cy=s.y+s.height/2;
    g.save();g.globalAlpha=alpha;g.imageSmoothingEnabled=false;
    g.translate(cx+dx,cy);g.scale(scale,scale);g.translate(-cx,-cy);
    g.drawImage(source,0,0,e.width,e.height);g.restore();
  }
  function slide(e,outgoing,incoming,motion,p) {
    const g=e.ctx,s=stage(e),a=motion.params||{},sign=a.direction==='right'?1:-1;
    const distance=s.width*(a.distance??.20),px=e.pixel;
    g.save();clipStage(g,s);
    // The reading layers exchange in two beats. Their opacity windows never
    // overlap, so a card cannot leave two readable sentences on the screen.
    if(p<.38){
      const q=P.clamp(p/.38),travel=q*q*(2-q),alpha=1-smooth((q-.16)/.84);
      layer(e,outgoing,s,sign*distance*travel,1-.028*smooth(q),alpha);
    }
    if(p>.40){
      const q=P.clamp((p-.40)/.60);
      // A small stop past the landing point gives the panel a tactile game-UI
      // settle; the final source has its original dimensions and position.
      const back=q-1,landing=1+2.1*back*back*back+1.1*back*back;
      const alpha=smooth(q/.23);
      layer(e,incoming,s,-sign*distance*(1-landing),.975+.025*P.ease(q),alpha);
    }
    // Three restrained grid marks join the two beats. They sit at the stage
    // edge and never pass across the actor, a caption, or the centre of a card.
    const accent=Math.sin(Math.PI*P.clamp((p-.12)/.68));
    if(p>.12&&p<.80){
      g.globalAlpha=accent*.55;g.fillStyle=e.colors.accent;
      const x=sign<0?s.x+px:s.x+s.width-px*3;
      const middle=s.y+s.height*.49;
      for(let i=-1;i<=1;i++)g.fillRect(x+(sign<0?1:-1)*Math.abs(i)*px,middle+i*px*5,px*2,px*(i===0?5:3));
    }
    g.restore();
  }
  function diamond(g,s,cx,cy,r,grid) {
    // Rectangular rows form a proper stair-step silhouette on the native grid.
    // It is rebuilt from absolute time, without an accumulated mask or cache.
    const top=Math.floor(s.y/grid)*grid,bottom=s.y+s.height;
    for(let y=top;y<bottom;y+=grid){
      const half=r-Math.abs(y+grid/2-cy);
      if(half<=0)continue;
      const left=Math.floor((cx-half)/grid)*grid,right=Math.ceil((cx+half)/grid)*grid;
      g.rect(left,y,Math.max(grid,right-left),grid);
    }
  }
  function iris(e,outgoing,incoming,motion,p) {
    const g=e.ctx,s=stage(e),a=motion.params||{},grid=e.pixel*2;
    const cx=P.clamp((a.x??((s.x+s.width/2)/e.width))*e.width,s.x,s.x+s.width);
    const cy=P.clamp((a.y??((s.y+s.height/2)/e.height))*e.height,s.y,s.y+s.height);
    const cover=Math.max(cx-s.x,s.x+s.width-cx)+Math.max(cy-s.y,s.y+s.height-cy)+grid*2;
    const minimum=grid*1.6;
    const closing=p<.46,q=closing?P.clamp(p/.46):P.clamp((p-.51)/.49);
    const amount=closing?1-smooth(q):P.ease(q);
    const r=minimum+(cover-minimum)*amount;
    const border=grid*.7,source=closing?outgoing:incoming;
    g.save();clipStage(g,s);
    // The iris exposes the stable daylight world around it. Only a small
    // cream-and-teal badge remains at closure; no full-stage black/white flash.
    g.beginPath();diamond(g,s,cx,cy,r+border,grid);diamond(g,s,cx,cy,r,grid);
    g.fillStyle=e.colors.accent;g.fill('evenodd');
    g.beginPath();diamond(g,s,cx,cy,r,grid);diamond(g,s,cx,cy,Math.max(0,r-border),grid);
    g.fillStyle=e.colors.panel;g.fill('evenodd');
    g.save();g.beginPath();diamond(g,s,cx,cy,Math.max(0,r-border),grid);g.clip();
    if(p<.435||p>.53){
      g.drawImage(source,0,0,e.width,e.height);
    }else{
      g.fillStyle=e.colors.panel;g.fillRect(s.x,s.y,s.width,s.height);
      const size=grid;g.fillStyle=e.colors.gold;
      g.fillRect(Math.round(cx/grid)*grid-size/2,Math.round(cy/grid)*grid-size/2,size,size);
    }
    g.restore();g.restore();
  }
  function fullFrame(e,source,scale,fx=.5,fy=.5,focusProgress=1) {
    const g=e.ctx,w=e.width,h=e.height;
    // A focus near an edge is bounded by the image, so accelerated movement
    // never reveals an empty corner or needs a blurred copy behind the shot.
    const x=.5+(fx-.5)*focusProgress,y=.5+(fy-.5)*focusProgress;
    const dx=P.clamp(w/2-x*w*scale,w-w*scale,0);
    const dy=P.clamp(h/2-y*h*scale,h-h*scale,0);
    g.imageSmoothingEnabled=false;g.drawImage(source,dx,dy,w*scale,h*scale);
  }
  function punch(e,outgoing,incoming,motion,frame,p) {
    const a=motion.params||{},g=e.ctx,cut=.54;
    if(p<cut){
      const q=P.clamp(p/cut),acceleration=Math.pow(q,2.65),zoom=a.zoom??6;
      const scale=Math.exp(Math.log(zoom)*acceleration);
      fullFrame(e,outgoing,scale,a.x??.65,a.y??.49,Math.pow(q,.85));
    }else{
      const q=P.clamp((p-cut)/(1-cut));
      fullFrame(e,incoming,1+.65*Math.pow(1-q,3));
      // One gold-tinted impact frame binds the cut without soft double images.
      const impact=motion.startFrame+Math.ceil((motion.endFrame-motion.startFrame-1)*cut);
      if(frame===impact){g.save();g.globalAlpha=.16;g.fillStyle=e.colors.gold;g.fillRect(0,0,e.width,e.height);g.restore();}
    }
  }
  function mosaic(e,outgoing,incoming,motion,p) {
    const g=e.ctx,w=e.width,h=e.height,a=motion.params||{},columns=a.columns??7;
    const half=(columns-1)/2,gap=.045,far=1/(columns+(columns-1)*gap);
    const pullEnd=.58,replace=.62,pushEnd=.965;
    let scale;
    if(p<pullEnd){
      scale=Math.exp(Math.log(far)*smooth(p/pullEnd));
    }else if(p<replace){
      scale=far;
    }else{
      const q=P.clamp((p-replace)/(pushEnd-replace));
      const landing=q*q*q*(10+q*(-15+6*q));
      scale=Math.exp(Math.log(far)*(1-landing));
    }
    const gallery=e.gallery?.length?e.gallery:[outgoing,incoming];
    const tw=w*scale,th=h*scale,pitchX=tw*(1+gap),pitchY=th*(1+gap);
    g.save();g.imageSmoothingEnabled=false;g.fillStyle=e.colors.ink;g.fillRect(0,0,w,h);
    for(let row=-half;row<=half;row++)for(let col=-half;col<=half;col++){
      const x=w/2+col*pitchX-tw/2,y=h/2+row*pitchY-th/2;
      if(x+tw<0||x>w||y+th<0||y>h)continue;
      const centre=row===0&&col===0;
      const index=((row+half)*columns+(col+half))*5+Math.abs(row*3-col*7);
      const source=centre?(p<replace?outgoing:incoming):gallery[index%gallery.length];
      g.drawImage(source,x,y,tw,th);
      if(!centre&&scale<.6){
        // A fixed palette shade separates thumbnails from the selected story.
        g.globalAlpha=.13;g.fillStyle=e.colors.ink;g.fillRect(x,y,tw,th);g.globalAlpha=1;
      }
    }
    // The central image keeps its position while the camera discovers a much
    // larger world. A crisp selection frame makes the return destination clear.
    const frameAlpha=smooth((1-scale)/.65);
    if(frameAlpha>0){
      const left=(w-tw)/2,top=(h-th)/2,line=e.pixel*.65;
      g.globalAlpha=frameAlpha;g.strokeStyle=e.colors.gold;g.lineWidth=line;
      g.strokeRect(left-line*.6,top-line*.6,tw+line*1.2,th+line*1.2);
      const length=Math.min(tw,th)*.17;
      g.fillStyle=e.colors.gold;
      for(const x of [left-line, left+tw-length+line]){
        g.fillRect(x,top-line,length,line*2);g.fillRect(x,top+th-line,length,line*2);
      }
    }
    g.restore();
  }
  P.motion = {
    worldTransition(e,outgoing,incoming,motion,frame) {
      const p=P.progress(frame,motion.startFrame,motion.endFrame);
      if(p<=0){e.ctx.drawImage(outgoing,0,0,e.width,e.height);return;}
      if(p>=1){e.ctx.drawImage(incoming,0,0,e.width,e.height);return;}
      if(motion.recipe==='motion.focus-punch.v1')punch(e,outgoing,incoming,motion,frame,p);
      else if(motion.recipe==='motion.mosaic-pullback.v1')mosaic(e,outgoing,incoming,motion,p);
      else throw new Error('Unknown world transition '+motion.recipe);
    },
    transition(e,outgoing,incoming,motion,frame) {
      const p=P.progress(frame,motion.startFrame,motion.endFrame);
      // Endpoint copies are exact: no clip edge, opacity, border, or subpixel
      // transform is allowed to alter the first and last source frame.
      if(p<=0){e.ctx.drawImage(outgoing,0,0,e.width,e.height);return;}
      if(p>=1){e.ctx.drawImage(incoming,0,0,e.width,e.height);return;}
      if(motion.recipe==='motion.panel-slide.v1')slide(e,outgoing,incoming,motion,p);
      else if(motion.recipe==='motion.pixel-iris.v1')iris(e,outgoing,incoming,motion,p);
      else throw new Error('Unknown content transition '+motion.recipe);
    },
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
