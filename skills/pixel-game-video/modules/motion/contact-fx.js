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

  function squareRim(g, x, y, rx, ry, pixel, color) {
    g.strokeStyle = color;
    g.lineWidth = pixel;
    g.strokeRect(Math.round(x-rx), Math.round(y-ry), Math.round(2*rx), Math.round(2*ry));
  }

  function impactSparks(g, p, x, y, r, pixel, seed, color) {
    const spread = P.ease(p);
    const opacity = (1-p) ** 1.7;
    g.save();
    g.globalAlpha *= opacity * .83;
    squareRim(g,x,y,r*(.51+.54*spread),r*(.27+.29*spread),pixel*.74,color);
    if (p < .36) {
      g.globalAlpha *= 1-p/.36;
      squareRim(g,x,y,r*(.41+.44*spread),r*(.22+.24*spread),pixel*.55,'#effff0');
    }
    g.restore();
    g.globalAlpha *= opacity;
    for (let i = 0; i < 28; i++) {
      const angle = (i + random(seed,i)) * Math.PI / 14;
      const distance = (.50 + .89*spread) * r * (.57 + .43*random(seed,i+31));
      const size = pixel * (i%7 === 0 ? 2.35 : i%3 === 0 ? 1.5 : 1);
      const dx = Math.cos(angle), dy = Math.sin(angle)*.67;
      const sx = Math.round((x+dx*distance)/pixel)*pixel, sy = Math.round((y+dy*distance+r*p*p*.19)/pixel)*pixel;
      g.fillStyle = i%4 ? color : '#effff0';
      g.fillRect(sx,sy,size,size);
      if (i%3 === 0) {
        g.fillStyle = color;
        g.fillRect(sx-dx*size*2.3,sy-dy*size*2.3,pixel*.7,pixel*.7);
      }
    }
  }

  function impactBloom(g, p, x, y, r, pixel, color) {
    const spread = P.ease(p), fade = (1-p) ** 1.5;
    const radius = r * (.43 + .57 * spread);
    g.save();
    g.translate(x,y);
    g.scale(1,.63);
    const glow = g.createRadialGradient(0,0,0,0,0,radius);
    glow.addColorStop(0,'#f3ffed');
    glow.addColorStop(.18,color);
    glow.addColorStop(.52,color);
    glow.addColorStop(1,'transparent');
    g.globalAlpha *= .89 * fade;
    g.fillStyle = glow;
    g.fillRect(-radius,-radius,2*radius,2*radius);
    g.restore();
    g.globalAlpha *= .83 * fade;
    squareRim(g,x,y,r*(.39+.57*spread),r*(.22+.25*spread),pixel*.7,color);
  }

  function impactSweep(g, p, x, y, r, pixel, color) {
    g.beginPath();
    g.rect(x-r,y-r*.45,2*r,.9*r);
    g.clip();
    const front = x + r * (-1.42 + 2.84*p);
    const half = r*.34, skew = r*.33;
    const glow = g.createLinearGradient(front-half,y+r*.45,front+half,y-r*.45);
    glow.addColorStop(0,'transparent');
    glow.addColorStop(.40,color);
    glow.addColorStop(.51,'#effff0');
    glow.addColorStop(.60,color);
    glow.addColorStop(1,'transparent');
    g.globalAlpha *= Math.sin(Math.PI*p) ** .75 * .9;
    g.fillStyle = glow;
    g.fillRect(front-half-skew,y-r*.45,2*(half+skew),r*.9);
    g.fillStyle = '#effff0';
    for (let i = 0; i < 5; i++) {
      const row = y-r*.44 + i*r*.19;
      g.fillRect(front+(2-i)*skew*.43,row,pixel*2.3,pixel*.9);
    }
  }

  function draw(e, motion, frame) {
    const {style='sparks',profile='soft',tone='gold',x=.65,y=.48,radius=.15,strength=.7,seed=e.seed} = motion.params;
    const g = e.ctx, p = P.progress(frame,motion.startFrame,motion.endFrame);
    const cx = x*e.width, cy = y*e.height, r = radius*e.height;
    const color = e.colors[tone] || e.colors.gold;
    g.save();
    g.globalAlpha *= strength;
    if (profile === 'impact') {
      if (style === 'bloom') impactBloom(g,p,cx,cy,r,e.pixel,color);
      else if (style === 'light-sweep') impactSweep(g,p,cx,cy,r,e.pixel,color);
      else impactSparks(g,p,cx,cy,r,e.pixel,seed || 1,color);
    }
    else if (style === 'bloom') bloom(g,p,cx,cy,r,color);
    else if (style === 'light-sweep') lightSweep(g,p,cx,cy,r,color);
    else sparks(g,p,cx,cy,r,e.pixel,seed || 1,color);
    g.restore();
  }

  P.contactFx = { draw };
})(globalThis.PixelVideo = globalThis.PixelVideo || {});
