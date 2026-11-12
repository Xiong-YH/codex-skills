(function(P) {
  'use strict';

  function random(seed, index) {
    const hash = Math.sin(seed * .119 + index * 17.713) * 43758.5453;
    return hash - Math.floor(hash);
  }

  function sparks(g, p, x, y, r, pixel, seed, color) {
    const travel = P.ease(p);
    g.globalAlpha *= (1-p) ** 2;
    g.fillStyle = color;
    for (let i=0; i<18; i++) {
      const angle = (i + random(seed,i)) * Math.PI / 9;
      const distance = (.1 + .9 * travel) * r * (.3 + .7 * random(seed,i+37));
      const size = pixel * (1 + Math.floor(random(seed,i+82)*2));
      const cx = x + Math.cos(angle)*distance;
      const cy = y + Math.sin(angle)*distance*.64 + r*p*p*.2;
      g.fillRect(Math.round(cx/pixel)*pixel,Math.round(cy/pixel)*pixel,size,size);
    }
  }

  function bloom(g, p, x, y, r, color) {
    const radius = r * (.14 + .86 * P.ease(p));
    const glow = g.createRadialGradient(x,y,0,x,y,radius);
    glow.addColorStop(0,color);
    glow.addColorStop(.34,color);
    glow.addColorStop(1,'transparent');
    g.globalAlpha *= .52 * (1-p) ** 1.6;
    g.fillStyle = glow;
    g.fillRect(x-radius,y-radius,radius*2,radius*2);
  }

  function lightSweep(g, p, x, y, r, color) {
    g.beginPath();
    g.ellipse(x,y,r,r*.54,0,0,Math.PI*2);
    g.clip();
    const pos = x + r*(P.ease(p)*2.8-1.4);
    const light = g.createLinearGradient(pos-r*.36,y+r*.36,pos+r*.36,y-r*.36);
    light.addColorStop(0,'transparent');
    light.addColorStop(.5,color);
    light.addColorStop(1,'transparent');
    g.globalAlpha *= .48 * Math.sin(Math.PI*p);
    g.fillStyle = light;
    g.fillRect(x-r,y-r,r*2,r*2);
  }

  function draw(e, motion, frame) {
    const {style='sparks',tone='gold',x=.65,y=.48,radius=.15,strength=.7,seed=e.seed} = motion.params;
    const g = e.ctx, p = P.progress(frame,motion.startFrame,motion.endFrame);
    const cx = x*e.width, cy = y*e.height, r = radius*e.height;
    const color = e.colors[tone] || e.colors.gold;
    g.save();
    g.globalAlpha *= strength;
    if (style === 'bloom') bloom(g,p,cx,cy,r,color);
    else if (style === 'light-sweep') lightSweep(g,p,cx,cy,r,color);
    else sparks(g,p,cx,cy,r,e.pixel,seed || 1,color);
    g.restore();
  }

  P.contactFx = { draw };
})(globalThis.PixelVideo = globalThis.PixelVideo || {});
