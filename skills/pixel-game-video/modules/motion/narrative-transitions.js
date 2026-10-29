(function(P){
  'use strict';
  const smooth=p=>{p=P.clamp(p);return p*p*p*(10+p*(-15+6*p));};
  const mix=(a,b,p)=>a+(b-a)*p;
  // Opaque physical pages carry the cut. Neither background is a cropped plate.
  function book(e,old,next,m,p){
    const g=e.ctx,w=e.width,h=e.height,a=m.params||{};
    g.drawImage(p<.5?old:next,0,0,w,h);
    const opening=p<.5,q=opening?smooth(p/.48):smooth((p-.52)/.48);
    const cx=opening?mix((a.x??.53)*w,w*.5,q):w*.5-w*2*q;
    const cy=opening?mix((a.y??.53)*h,h*.5,q):h*.5+h*.12*q;
    const bw=opening?mix(w*.18,w*1.7,q):w*1.7,bh=opening?mix(h*.25,h*2.2,q):h*2.2;
    g.save();g.translate(cx,cy);g.rotate(opening?-.065*Math.sin(q*Math.PI):-.14*q);
    g.globalAlpha=opening?P.clamp(p/.055):1;
    const fold=Math.min(w*.19,bw*.28),left=-bw/2,right=bw/2,top=-bh/2,bottom=bh/2;
    // One thin page with a visible turning corner, not an unrelated giant book.
    g.fillStyle='#182935';g.fillRect(left+e.pixel*3,top+e.pixel*4,bw,bh);
    g.beginPath();g.moveTo(left,top);g.lineTo(right-fold,top);g.lineTo(right,top+fold);g.lineTo(right,bottom);g.lineTo(left,bottom);g.closePath();
    g.fillStyle='#decea6';g.fill();g.strokeStyle='#b89b68';g.lineWidth=e.pixel;g.stroke();
    g.fillStyle='#b6a27e';g.fillRect(left+e.pixel*3,top,e.pixel*2,bh);
    // A folded triangular face and its attached seam make the sweep readable.
    g.beginPath();g.moveTo(right-fold,top);g.lineTo(right-fold,top+fold);g.lineTo(right,top+fold);g.closePath();g.fillStyle='#f1e2bc';g.fill();
    g.strokeStyle='#9b815a';g.beginPath();g.moveTo(right-fold,top);g.lineTo(right-fold,top+fold);g.lineTo(right,top+fold);g.stroke();
    g.save();g.globalAlpha*=.26;g.fillStyle='#6d796e';
    for(let i=0;i<7;i++)g.fillRect(left+bw*.12,top+bh*.20+i*bh*.08,bw*(i%3===0?.47:.66),Math.max(e.pixel,bh*.006));g.restore();
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
  function dissolve(e,old,next,m,p){const g=e.ctx;g.drawImage(old,0,0,e.width,e.height);g.save();g.globalAlpha=smooth(p);g.drawImage(next,0,0,e.width,e.height);g.restore();}
  function fadeBlack(e,old,next,m,p){const g=e.ctx,q=p<.5?smooth(p*2):smooth((p-.5)*2);g.fillStyle='#000000';g.fillRect(0,0,e.width,e.height);g.save();g.globalAlpha=p<.5?1-q:q;g.drawImage(p<.5?old:next,0,0,e.width,e.height);g.restore();}
  const handlers={'motion.book-sweep.v1':book,'motion.scene-to-card.v1':card,'motion.match-dissolve.v1':matched,'motion.cross-dissolve.v1':dissolve,'motion.fade-through-black.v1':fadeBlack};
  const prior=P.motion.worldTransition;
  P.motion.worldTransition=function(e,old,next,m,frame){
    const handler=handlers[m.recipe];if(!handler)return prior(e,old,next,m,frame);
    const p=P.progress(frame,m.startFrame,m.endFrame),g=e.ctx;
    g.save();g.imageSmoothingEnabled=false;
    if(p<=0)g.drawImage(old,0,0,e.width,e.height);
    else if(p>=1)g.drawImage(next,0,0,e.width,e.height);
    else handler(e,old,next,m,p);
    // The outgoing presenter fades in screen coordinates, never inside the card.
    if(m.recipe==='motion.scene-to-card.v1'&&e.outgoingPresenter&&p<.22){
      g.save();g.globalAlpha=1-smooth(p/.22);g.drawImage(e.outgoingPresenter,0,0,e.width,e.height);g.restore();
    }
    g.restore();
  };
})(globalThis.PixelVideo=globalThis.PixelVideo||{});
