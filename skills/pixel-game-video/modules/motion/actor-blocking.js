(function(P) {
  'use strict';
  const recipe = 'motion.actor-blocking.v1';
  const ease = p => { p = P.clamp(p); return p * p * (3 - 2 * p); };
  const mix = (a,b,p) => a + (b-a)*p;

  function walk(from, to, height, p) {
    const distance = to - from;
    const count = Math.max(2, Math.round(Math.abs(distance) / (height * .23)));
    const stride = distance / count;
    const clock = ease(p) * (count + 1);
    const step = Math.min(count, Math.floor(clock));
    const progress = clock - step;
    const root = from + Math.min(count, clock) * stride;
    const planted = from + step * stride;
    const swing = from + mix(Math.max(0,step-1),Math.min(count,step+1),ease(progress)) * stride;
    const lift = Math.sin(Math.PI * progress);
    return { x: root, shoes: step % 2
      ? [{ x: swing, lift }, { x: planted, lift: 0 }]
      : [{ x: planted, lift: 0 }, { x: swing, lift }],
      bob: lift, swing: lift * (step % 2 ? -1 : 1) };
  }

  function state(track, frame, w, h) {
    const selected = track.findLast(m => m.startFrame <= frame) || track[0];
    const a = selected.params;
    const p = P.clamp((frame - selected.startFrame) / (selected.endFrame - selected.startFrame));
    const height = a.height * h;
    const [fromX, foot] = a.from;
    const facing = a.facing ? (a.facing === 'left' ? -1 : 1) : a.to[0] < fromX ? -1 : 1;
    const ground = a.action === 'walk' ? walk(fromX*w,a.to[0]*w,height,p) :
      { x:fromX*w, shoes:[{x:fromX*w,lift:0},{x:fromX*w,lift:0}], bob:0,swing:0 };
    let reach = 0;
    if (a.action === 'reach') {
      reach = frame <= selected.contactFrame
        ? ease((frame-selected.startFrame)/(selected.contactFrame-selected.startFrame))
        : 1-ease((frame-selected.contactFrame)/(selected.endFrame-selected.contactFrame));
    }
    return {...ground, foot:foot*h, height, facing, reach, hand:a.hand};
  }

  function sprite(g, s, w, h, whitebox) {
    const unit = s.height / 36;
    const ink = whitebox ? '#41505b' : '#27333d';
    const coat = whitebox ? '#96a7aa' : '#6ab99e';
    const shade = whitebox ? '#70888e' : '#3b7d76';
    const skin = whitebox ? '#e2dfd4' : '#f6c691';
    const trousers = whitebox ? '#667782' : '#3b546b';
    const gold = whitebox ? '#adb2ad' : '#e8aa5c';
    const hair = whitebox ? '#78848c' : '#9e5e34';
    const paper = whitebox ? '#e9e7dd' : '#fff0d1';
    const rect = (x,y,ww,hh,color) => {
      g.fillStyle = color;
      g.fillRect(Math.round(x), Math.round(y), ww, hh);
    };
    function segment(a,b,size,color) {
      const steps = Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])));
      for (let i=0; i<=steps; i++) {
        const p=i/steps;
        rect(mix(a[0],b[0],p)-size/2,mix(a[1],b[1],p)-size/2,size,size,color);
      }
    }
    function limb(a,b,c,size,color) {
      segment(a,b,size+2,ink); segment(b,c,size+2,ink);
      segment(a,b,size,color); segment(b,c,size,color);
    }
    const hip = -12 - s.bob * .8;
    s.shoes.forEach((shoe,index) => {
      const offset = index === 0 ? -3 : 3;
      const x = (shoe.x - s.x) / (unit * s.facing) + offset;
      const y = -2 - shoe.lift * 4;
      limb([offset,hip],[mix(offset,x,.52),mix(hip,y,.56)-shoe.lift],[x,y],4,trousers);
      rect(x-3,y,8,2,ink);
      rect(x-2,y-1,7,2,paper);
    });
    const swing = s.swing * 3;
    limb([-5,hip-7],[-7-swing,hip-4],[-8-swing,hip],3,shade);
    rect(-6,hip-8,12,9,ink);
    rect(-5,hip-7,10,7,coat);
    rect(-1,hip-7,3,7,paper);
    rect(-5,hip-3,3,3,shade);
    rect(3,hip-6,2,2,gold);

    const head = hip-9;
    rect(-9,head-13,18,13,ink);
    rect(-8,head-12,17,8,hair);
    rect(-9,head-11,3,5,hair);
    rect(-6,head-14,12,3,gold);
    rect(-4,head-15,5,2,gold);
    rect(3,head-13,6,4,gold);
    rect(-5,head-7,13,7,skin);
    rect(1,head-6,8,5,skin);
    rect(-3,head-6,2,3,ink);
    rect(4,head-6,2,3,ink);
    rect(2,head-2,3,1,hair);
    rect(-7,head-6,3,3,skin);

    const targetX = s.hand ? (s.hand[0]*w - s.x) / (unit*s.facing) : 8;
    const targetY = s.hand ? (s.hand[1]*h - s.foot) / unit : hip;
    const hand = [mix(8+swing,targetX,s.reach),mix(hip,targetY,s.reach)];
    limb([5,hip-7],[mix(5,hand[0],.48),mix(hip-7,hand[1],.48)+1.5],hand,3,coat);
    rect(hand[0]-1,hand[1]-1,3,3,skin);
  }

  function draw(e, shot, frame) {
    const track = shot.motions.filter(m => m.recipe === recipe).sort((a,b) => a.startFrame-b.startFrame);
    const s = state(track,frame,e.width,e.height);
    const unit = s.height/36;
    const tile = e.propCache['actor-blocking:sprite'] ||= e.createCanvas(72,52);
    const source = tile.getContext('2d');
    source.setTransform(1,0,0,1,0,0);
    source.clearRect(0,0,tile.width,tile.height);
    source.translate(36,44);
    sprite(source,s,e.width,e.height,e.whitebox);
    const g = e.ctx;
    g.save();
    g.fillStyle = e.colors.edge;
    g.globalAlpha *= .34;
    g.fillRect(s.x-s.height*.28,s.foot-2,s.height*.56,Math.max(2,unit*.55));
    g.restore();
    g.save();
    g.translate(s.x,s.foot);
    g.scale(unit*s.facing,unit);
    g.imageSmoothingEnabled = false;
    g.drawImage(tile,-36,-44);
    g.restore();
  }
  P.actorBlocking = { recipe, state, draw };
})(globalThis.PixelVideo = globalThis.PixelVideo || {});
