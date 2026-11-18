(function(P){
  'use strict';

  const normal = {
    ink:'#35524a', muted:'#638274', cream:'#edddba', ivory:'#fff0d0', rule:'#ab9972',
    pine:'#233b38', pineRim:'#84a087', well:'#263b39', edge:'#bca881', shadow:'#221c1bab',
    light:'#fff1d0', leaf:'#a9c9ac', blue:'#b0cec5', warm:'#e7c18b', rose:'#d7b0a1',
  };
  const swatches = {
    accent: {face:'#adc9ae',edge:'#6c947d',light:'#e1edca',ink:'#2a4c42'},
    gold: {face:'#deb783',edge:'#ac8050',light:'#f7deb0',ink:'#543c2c'},
    secondary: {face:'#405e56',edge:'#759887',light:'#9ebca5',ink:'#faeaca'},
    danger: {face:'#d7b0a1',edge:'#956b61',light:'#f1d3bc',ink:'#693e35'},
  };
  const gray = {face:'#cbd5ce',edge:'#82978b',light:'#eaf0e6',ink:'#2f4842'};
  const icons = {
    project: [[[.06,.12],[.94,.12],[.94,.91],[.06,.91],[.06,.12]],[[.06,.29],[.94,.29]],
      [[.39,.46],[.23,.61],[.39,.75]],[[.61,.46],[.77,.61],[.61,.75]],[[.55,.44],[.45,.77]]],
    paper: [[[.18,.25],[.03,.25],[.03,.96],[.74,.96],[.74,.83]],[[.18,.08],[.67,.08],[.86,.27],[.86,.83],[.18,.83],[.18,.08]],
      [[.67,.08],[.67,.27],[.86,.27]],[[.3,.42],[.70,.42]],[[.3,.55],[.67,.55]],[[.3,.68],[.46,.68]],[[.55,.65],[.61,.72],[.74,.58]]],
    book: [[[.05,.16],[.30,.12],[.5,.25],[.71,.12],[.95,.16],[.95,.84],[.70,.81],[.5,.94],[.3,.81],[.05,.84],[.05,.16]],
      [[.5,.25],[.5,.94]],[[.19,.39],[.37,.43]],[[.63,.43],[.82,.39]]],
    search: [[[.22,.07],[.54,.07],[.72,.23],[.72,.50],[.54,.68],[.22,.68],[.08,.51],[.08,.23],[.22,.07]],[[.65,.61],[.94,.94]]],
    chat: [[[.07,.13],[.93,.13],[.93,.69],[.48,.69],[.24,.90],[.24,.69],[.07,.69],[.07,.13]],[[.24,.32],[.74,.32]],[[.24,.49],[.61,.49]]],
    check: [[[.12,.52],[.37,.78],[.9,.19]]],
    clock: [[[.28,.07],[.71,.07],[.92,.28],[.92,.72],[.71,.93],[.28,.93],[.08,.72],[.08,.28],[.28,.07]],[[.50,.23],[.50,.51],[.73,.63]]],
    person: [[[.32,.08],[.68,.08],[.75,.18],[.75,.43],[.63,.54],[.37,.54],[.25,.43],[.25,.18],[.32,.08]],
      [[.10,.91],[.10,.75],[.27,.62],[.73,.62],[.90,.75],[.90,.91]]],
    folder: [[[.07,.25],[.36,.25],[.47,.36],[.94,.36],[.94,.88],[.07,.88],[.07,.25]],[[.19,.51],[.81,.51]]],
    play: [[[.29,.13],[.83,.50],[.29,.87],[.29,.13]]],
    pin: [[[.22,.14],[.78,.14],[.67,.48],[.84,.64],[.16,.64],[.33,.48],[.22,.14]],[[.50,.64],[.50,.93]]],
    arrow: [[[.08,.50],[.89,.50]],[[.64,.23],[.89,.50],[.64,.77]]],
    grid: [[[.09,.1],[.41,.1],[.41,.42],[.09,.42],[.09,.1]],[[.59,.1],[.91,.1],[.91,.42],[.59,.42],[.59,.1]],
      [[.09,.58],[.41,.58],[.41,.9],[.09,.9],[.09,.58]],[[.59,.58],[.91,.58],[.91,.9],[.59,.9],[.59,.58]]],
  };

  const box = (x,y,w,h) => ({x,y,w,h});
  const offset = (b,dx,dy) => box(b.x+dx,b.y+dy,b.w,b.h);
  const inset = (b,x,y=x) => box(b.x+x,b.y+y,b.w-2*x,b.h-2*y);
  const cx = b => b.x+b.w/2;
  const cy = b => b.y+b.h/2;
  const out = v => 1-(1-P.clamp(v))**3;

  function rect(g,x,y,w,h,color){
    if(w<=0||h<=0)return;
    g.fillStyle=color;
    g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));
  }

  function poly(g,points,color){
    g.beginPath();
    g.moveTo(...points[0]);
    for(const point of points.slice(1))g.lineTo(...point);
    g.closePath();
    g.fillStyle=color;
    g.fill();
  }

  // Two steps on each corner, as in the R41 reference at 1280 × 720.
  function plate(g,b,color,corner=9){
    const {x,y,w,h}=b;
    const step=Math.max(0,Math.min(Math.round(corner/2),Math.floor(Math.min(w,h)/5)));
    rect(g,x+2*step,y,w-4*step,h,color);
    if(step){
      rect(g,x+step,y+step,w-2*step,h-2*step,color);
      rect(g,x,y+2*step,w,h-4*step,color);
    }
  }

  function border(g,b,face,edge,size=2,corner=9){
    if(edge)plate(g,b,edge,corner);
    plate(g,edge?inset(b,size):b,face,corner);
  }

  function line(g,x,y,x2,y2,color,width=2){
    if(Math.abs(y2-y)<.1){rect(g,Math.min(x,x2),y,Math.abs(x2-x),width,color);return;}
    if(Math.abs(x2-x)<.1){rect(g,x,Math.min(y,y2),width,Math.abs(y2-y),color);return;}
    g.beginPath();
    g.moveTo(Math.round(x),Math.round(y));
    g.lineTo(Math.round(x2),Math.round(y2));
    g.strokeStyle=color;
    g.lineWidth=width;
    g.stroke();
  }

  function alpha(g,opacity,draw){
    if(opacity<=0)return;
    g.save();
    g.globalAlpha*=P.clamp(opacity);
    try{draw();}finally{g.restore();}
  }

  function crop(g,b,draw){
    g.save();
    g.beginPath();
    g.rect(b.x,b.y,Math.max(0,b.w),Math.max(0,b.h));
    g.clip();
    try{draw();}finally{g.restore();}
  }

  function colors(e){
    if(!e.whitebox)return normal;
    return {...normal,cream:'#e2e7df',ivory:'#f1eee2',rule:'#9ca9a1',ink:'#304841',muted:'#61776e',
      leaf:'#b9cbbd',blue:'#c3d4cd',warm:'#d9d0bc',rose:'#dccac2',edge:'#a9afa0'};
  }

  function tone(e,name){return e.whitebox?gray:swatches[name]||swatches.gold;}

  function paper(g,b,p,{layers=1,face=p.cream,corner=12}={}){
    const {x,y,w,h}=b;
    const depth=Math.min(1,h/55,w/110);
    plate(g,offset(b,4*depth,(5+layers*3)*depth),p.shadow,corner);
    for(let i=layers;i>0;i--){
      const dx=i*3*depth, dy=i*4*depth;
      plate(g,box(x+dx,y+dy,w-dx,h),i%2?'#b39770':'#c4ad85',corner);
      rect(g,x+11+dx,y+h+dy-2,w-23-2*dx,1.8,'#796653');
    }
    plate(g,b,p.edge,corner);
    plate(g,box(x+2,y+2,w-4,h-5),face,corner-2);
    rect(g,x+10,y+3,w-22,2,p.light);
    if(h>=60){
      rect(g,x+w-18,y+3,10,3,'#d6c296');
      rect(g,x+w-13,y+6,6,3,'#d6c296');
    }
  }

  function chip(g,b,t,corner=9){
    plate(g,offset(b,3,4),'#24312a88',corner);
    border(g,b,t.face,t.edge,2.5,corner);
    rect(g,b.x+8,b.y+4,b.w-16,2,t.light);
  }

  function panel(g,b,p){
    plate(g,offset(b,7,8),'#122720a6',17);
    border(g,b,p.pine,p.pineRim,3.5,17);
    line(g,b.x+19,b.y+b.h-12,b.x+b.w-19,b.y+b.h-12,'#516f63',1.4);
  }

  function notebook(g,b,p,{ruled=false}={}){
    paper(g,b,p,{layers:3});
    const spine=Math.min(26,b.w*.055);
    rect(g,b.x+12,b.y+10,spine,b.h-22,'#cfb98e');
    line(g,b.x+spine+28,b.y+13,b.x+spine+28,b.y+b.h-15,'#b4936c',1.6);
    const spacing=Math.max(21,Math.min(36,b.h/8));
    for(let y=b.y+spacing*.9;y<b.y+b.h-16;y+=spacing){
      rect(g,b.x+5,y,spine*1.02,3,'#9e8f6c');
      rect(g,b.x+spine*.85+5,y-2,8,7,'#7d6b50');
    }
    const area=box(b.x+spine+46,b.y+17,b.w-spine-68,b.h-38);
    if(ruled){
      for(let y=area.y+54;y<area.y+area.h;y+=34)line(g,area.x,y,area.x+area.w,y,p.rule,1.2);
    }
    return area;
  }

  function icon(g,name,b,color,width=2){
    const path=icons[name];
    if(!path)return;
    const size=Math.min(b.w,b.h);
    const x=cx(b)-size/2,y=cy(b)-size/2;
    g.strokeStyle=color;
    g.lineWidth=Math.max(1,Math.min(width,size*.10));
    g.lineJoin='miter';
    for(const points of path){
      g.beginPath();
      g.moveTo(Math.round(x+points[0][0]*size),Math.round(y+points[0][1]*size));
      for(const [a,z] of points.slice(1))g.lineTo(Math.round(x+a*size),Math.round(y+z*size));
      g.stroke();
    }
  }

  function spark(g,x,y,p,color,count=7){
    if(p<0||p>=1)return;
    alpha(g,(1-p)**1.4,()=>{
      for(let i=0;i<count;i++){
        const angle=i*2.399-1.1, radius=(9+i%4*5)*out(p)+2;
        const size=i%3===0?3:2;
        rect(g,x+Math.cos(angle)*radius,y+Math.sin(angle)*radius,size,size,color);
      }
    });
  }

  function desk(g,w=1280,h=720){
    g.save();
    g.scale(w/1280,h/720);
    const bands=[[0,106,'#6e543f'],[106,52,'#51443a'],[158,134,'#534539'],[292,109,'#483c34'],
      [401,116,'#514035'],[517,111,'#43382f'],[628,92,'#4d3c33']];
    for(const [y,height,color] of bands){
      rect(g,0,y,1280,height,color);
      rect(g,0,y,1280,4,'#342f2b');
    }
    for(let y=0;y<495;y+=4){
      const edge=Math.round((190-y*.29)/4)*4;
      const bar=(y>=104&&y<130)||(y>=286&&y<310);
      rect(g,0,y,edge,4,bar?'#52443a':'#715540');
      if(!bar)rect(g,edge,y,4,4,'#876747');
    }
    border(g,box(190,-27,914,728),'#283e3c','#515948',5,22);
    rect(g,205,8,4,673,'#3a5149');
    rect(g,214,687,866,4,'#3d5047');
    for(const [x,y,width,height,color] of [[1080,-69,184,185,'#3b5152'],[1101,-62,175,177,'#786248'],[1125,-70,179,167,'#59654d']]){
      plate(g,box(x+8,y+8,width,height),'#292d2a',14);
      border(g,box(x,y,width,height),color,'#927753',3,14);
      rect(g,x+12,0,4,y+height-10,'#a8936a');
    }
    g.restore();
  }

  P.componentLook={box,offset,inset,cx,cy,out,rect,poly,plate,border,line,alpha,crop,colors,tone,paper,chip,panel,notebook,icon,spark,desk};
})(globalThis.PixelVideo=globalThis.PixelVideo||{});
