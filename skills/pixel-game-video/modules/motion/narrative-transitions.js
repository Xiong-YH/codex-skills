(function(P){
  'use strict';
  const smooth=p=>{p=P.clamp(p);return p*p*p*(10+p*(-15+6*p));};
  const mix=(a,b,p)=>a+(b-a)*p;
  // Opaque physical pages carry the cut. Neither background is a cropped plate.
  function book(e,old,next,m,p){
    const g=e.ctx,w=e.width,h=e.height,a=m.params||{};
    g.drawImage(p<.5?old:next,0,0,w,h);
    const opening=p<.5,q=opening?smooth(p/.5):smooth((p-.5)/.5);
    const cx=opening?mix((a.x??.53)*w,w*.5,q):w*.5-w*2*q;
    const cy=opening?mix((a.y??.53)*h,h*.5,q):h*.5-h*.10*q;
    const bw=opening?mix(w*.22,w*1.7,q):w*1.7;
    const bh=opening?mix(h*.23,h*2,q):h*2;
    g.save();g.translate(cx,cy);g.rotate(opening?-.045*Math.sin(q*Math.PI):-.12*q);
    g.globalAlpha=opening?P.clamp(p/.09):1;
    for(let leaf=3;leaf>=0;leaf--){
      const off=leaf*e.pixel*2;
      g.fillStyle=['#cbbb96','#a99675','#756751','#1c3543'][leaf];
      g.fillRect(-bw/2-off,-bh/2+off,bw+off*2,bh);
    }
    g.fillStyle='#ad9e7f';g.fillRect(-e.pixel*2,-bh/2,e.pixel*4,bh);
    g.fillStyle='#e5d6ad';g.fillRect(e.pixel*3,-bh/2,bw*.015,bh);
    // Large typeset rules and a network diagram read as research, not random flash.
    g.fillStyle='#526a6a';
    for(let i=0;i<7;i++)g.fillRect(-bw*.42,-bh*.34+i*bh*.085,bw*(i%3===0?.29:.34),Math.max(e.pixel,bh*.009));
    g.strokeStyle='#486872';g.lineWidth=e.pixel;
    const nodes=[[.12,-.17],[.26,-.29],[.39,-.10],[.22,.13],[.38,.29]];
    g.beginPath();nodes.forEach(([x,y],i)=>{if(i===0)g.moveTo(x*bw,y*bh);else g.lineTo(x*bw,y*bh)});g.stroke();
    nodes.forEach(([x,y])=>{g.fillStyle='#274c58';g.fillRect(x*bw-e.pixel*2,y*bh-e.pixel*2,e.pixel*4,e.pixel*4)});
    g.restore();
  }
  // A full-room horizontal truck with foreground shelving at a faster depth.
  function shelf(e,old,next,m,p){
    const g=e.ctx,w=e.width,h=e.height,q=smooth(p),pixel=e.pixel;
    // Rooms are separated by the physical shelf width. It starts/ends offscreen,
    // without swelling the shelf or exposing a seam between two flat paintings.
    const bw=w*.40,travel=w+bw,x=w-q*travel;
    g.drawImage(old,-q*travel,0,w,h);g.drawImage(next,(1-q)*travel,0,w,h);
    const texture=e.assets?.[e.style?.transitionTextures?.shelf];
    if(texture){
      const key='motion:shelf-texture';let plate=e.propCache[key];
      if(!plate){plate=e.propCache[key]=e.createCanvas(180,270);const t=plate.getContext('2d');t.imageSmoothingEnabled=false;t.drawImage(texture,0,0,180,270);}
      g.fillStyle='#081521';g.fillRect(x-1,0,bw+2,h);g.drawImage(plate,x-1,0,bw+2,h);return;
    }
    g.save();g.fillStyle='#040c17';g.fillRect(x-1,0,bw+2,h);
    g.fillStyle='#142b3d';g.fillRect(x+pixel*3,0,bw-pixel*6,h);
    g.fillStyle='#5b7b87';g.fillRect(x+pixel*3,0,pixel,h);
    for(let row=0;row<7;row++){
      const y=row*h/7;
      g.fillStyle='#253e4a';g.fillRect(x+pixel*5,y,bw-pixel*10,h*.018);
      for(let col=0;col<7;col++){
        const bx=x+pixel*7+col*(bw-pixel*14)/7,bh=h*(.063+(col%3)*.014);
        g.fillStyle=['#9c8057','#345c66','#426583','#b18c51'][col%4];
        g.fillRect(bx,y+h*.135-bh,bw*.072,bh);
        g.fillStyle='#baa06b';g.fillRect(bx,y+h*.125,bw*.072,pixel*.6);
      }
    }
    g.fillStyle='#bba172';g.fillRect(x+bw-pixel*4,0,pixel,h);
    g.restore();
  }
  // The previous complete scene becomes a real postcard in the incoming atlas.
  function card(e,old,next,m,p){
    const g=e.ctx,w=e.width,h=e.height,a=m.params||{},q=smooth(p);
    g.drawImage(next,0,0,w,h);
    const rw=w*Math.exp(Math.log(a.width??.29)*q),rh=rw*h/w;
    const cx=mix(w/2,((a.x??.54)+(a.width??.29)/2)*w,q);
    const cy=mix(h/2,((a.y??.30)+(a.width??.29)/2)*h,q);
    g.save();g.translate(cx,cy);g.rotate(-.075*Math.sin(Math.PI*q));
    g.globalAlpha=1-q;g.fillStyle='#050c16';g.fillRect(-rw/2+e.pixel*2,-rh/2+e.pixel*3,rw,rh);g.globalAlpha=1;
    g.fillStyle=e.colors.accent;g.fillRect(-rw/2-e.pixel,-rh/2-e.pixel,rw+e.pixel*2,rh+e.pixel*2);
    g.drawImage(old,-rw/2,-rh/2,rw,rh);g.restore();
  }
  // Keep matched foreground geometry steady while complete rooms exchange.
  // First/last fifths are holds, so the dissolve has preparation and a landing.
  function matched(e,old,next,m,p){
    const g=e.ctx,q=smooth((p-.20)/.60);
    g.drawImage(old,0,0,e.width,e.height);
    if(q>0){g.save();g.globalAlpha=q;g.drawImage(next,0,0,e.width,e.height);g.restore();}
  }
  const handlers={'motion.book-sweep.v1':book,'motion.shelf-travel.v1':shelf,'motion.scene-to-card.v1':card,'motion.match-dissolve.v1':matched};
  const prior=P.motion.worldTransition;
  P.motion.worldTransition=function(e,old,next,m,frame){
    const handler=handlers[m.recipe];if(!handler)return prior(e,old,next,m,frame);
    const p=P.progress(frame,m.startFrame,m.endFrame),g=e.ctx;
    g.save();g.imageSmoothingEnabled=false;
    if(p<=0)g.drawImage(old,0,0,e.width,e.height);
    else if(p>=1)g.drawImage(next,0,0,e.width,e.height);
    else handler(e,old,next,m,p);
    g.restore();
  };
})(globalThis.PixelVideo=globalThis.PixelVideo||{});
