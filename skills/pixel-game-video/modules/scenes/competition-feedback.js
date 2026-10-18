(function(P){
  'use strict';
  const F=()=>P.motion.gameFeedback;
  const colors=['#d9b164','#719db8','#62b6a4'],light=['#ffe1a0','#b8d9ee','#b9ebd4'];
  const routes=[{id:4,from:1,to:0,slot:4},{id:8,from:2,to:0,slot:5},{id:5,from:1,to:0,slot:6}];
  const slots=[[24,35],[57,35],[24,56],[57,56],[16,75],[39,75],[62,75]];
  const rect=(g,x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(x,y,w,h);};
  const txt=(e,s,x,y,size=7,c='#e1e9df',width=270)=>P.text.draw(e,s,x,y,size,c,width);
  function line(g,pts,c,width=1){g.beginPath();g.strokeStyle=c;g.lineWidth=width;pts.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.stroke();}
  function check(g,x,y,color,scale=1){line(g,[[x-4*scale,y],[x-1*scale,y+3*scale],[x+5*scale,y-4*scale]],color,1.6*scale);}
  function panel(g,w,h,color='#5b7f88'){rect(g,0,0,w,h,color);rect(g,2,2,w-4,h-4,'#091e2b');rect(g,3,3,w-6,1,'#9eafa8');}
  function cues(shot){return(shot.params.feedbackCues||[]).map(c=>({...c,start:P.scenes.eventFrame(shot,c.startEvent),hit:P.scenes.eventFrame(shot,c.hitEvent),end:P.scenes.eventFrame(shot,c.endEvent)}));}
  const progress=(frame,c)=>P.clamp((frame-c.start)/(c.hit-c.start));
  const tail=(frame,c)=>(frame-c.hit)/(c.end-c.hit);
  function budgetState(moves,frame,completed=false){
    const tokens=Array.from({length:12},(_,id)=>({id,owner:Math.floor(id/4),slot:id%4,origin:Math.floor(id/4)}));
    for(let i=0;i<routes.length;i++){
      const r=routes[i],c=moves.find(m=>m.index===i),token=tokens[r.id];
      if(completed||(c&&frame>=c.hit)){token.owner=r.to;token.slot=r.slot;token.arrival=c?tail(frame,c):2;}
      else if(c&&frame>=c.start){token.owner=null;token.route=r;token.progress=progress(frame,c);}
    }
    return{tokens,counts:[0,1,2].map(i=>tokens.filter(t=>t.owner===i).length),flying:tokens.filter(t=>t.owner===null)};
  }
  function board(e,shot,frame,selected){
    const g=e.ctx,l=shot.params.feedbackLabels,phase=shot.params.phase,cs=cues(shot),nodes=cs.filter(c=>c.kind==='node');
    const done=phase==='cost'||phase==='trial',confirm=cs.find(c=>c.kind==='confirm');
    const passed=done||confirm&&frame>=confirm.hit,active=nodes.some(c=>frame>=c.start);
    panel(g,300,146);rect(g,5,5,290,19,'#284a59');rect(g,11,11,4,4,'#e8c47f');
    txt(e,l.boardTitle,124,14,8,'#e3ece3',210);
    rect(g,244,8,47,13,passed?'#2a6559':'#173843');txt(e,passed?l.passed:active?l.active:l.idle,267,14,6.5,passed?'#bff1cd':'#a9c5c7',43);
    const points=[[29,55],[88,77],[150,49],[213,74],[270,54]];
    let reached=0;
    for(let i=0;i<4;i++){
      const c=nodes.find(n=>n.index===i),p=done?1:c?progress(frame,c):0,a=points[i],b=points[i+1];
      line(g,[a,b],'#355565',2);if(p>0){const q=F().smooth(p),end=[F().mix(a[0],b[0],q),F().mix(a[1],b[1],q)];line(g,[a,end],'#8ce5c4',2.5);if(p<1)rect(g,end[0]-2,end[1]-2,4,4,'#fff0b4');}
      if(p>=1)reached++;
    }
    points.forEach(([x,y],i)=>{
      const c=nodes.find(n=>n.index===i-1),t=c?tail(frame,c):2,dy=-1.7*F().impact(t);
      rect(g,x-5,y-5+dy,10,10,i<=reached?'#edc982':'#456879');rect(g,x-2,y-2+dy,4,4,'#142e38');
      if(c)F().burst(g,x,y,t,'#d5f5ce',6);
    });
    txt(e,l.checks,34,110,7,'#b9cdd0',55);
    for(let i=0;i<4;i++){
      const x=75+i*28;rect(g,x,102,21,17,i<reached?'#316c5c':'#173541');
      if(i<reached)check(g,x+10,110,'#ccebc7',.75);else rect(g,x+9,109,3,3,'#5e8190');
    }
    if(passed){const t=confirm?tail(frame,confirm):2,dy=-2*F().impact(t);rect(g,204,101+dy,85,19,'#3d7461');txt(e,l.passed,246,111+dy,8,'#dbf1bd',78);if(t>=0&&t<1){g.save();g.globalAlpha=1-t;F().corners(g,{x:202,y:99+dy,w:89,h:23},1,'#f5db8f');g.restore();}}
    txt(e,l.boardFooter,150,134,7.5,'#b8d4d0',280);
    const focus=cs.find(c=>c.kind==='focus');
    if(focus&&frame>=focus.start)F().corners(g,{x:1,y:1,w:298,h:144},progress(frame,focus),'#f9d487');
    else if(selected>0){g.save();g.globalAlpha=selected;F().corners(g,{x:1,y:1,w:298,h:144},1,'#f9d487');g.restore();}
  }
  function chip(e,token,x,y,size,owner){
    const g=e.ctx,color=colors[owner],pale=light[owner];
    rect(g,x-size/2+1,y-size/2+2,size,size,'#06131d');rect(g,x-size/2,y-size/2,size,size,color);
    rect(g,x-size/2+1.5,y-size/2+1.5,size-3,1.5,pale);rect(g,x-size/2+1.5,y+size/2-2,size-3,1,'rgba(0,0,0,.22)');
    txt(e,String(token.id+1).padStart(2,'0'),x,y+.5,size*.37,'#0b2430',size-2);
  }
  function timeCard(e,index,state,labels){
    const g=e.ctx;panel(g,81,94,colors[index]);rect(g,4,4,73,18,'#16313b');txt(e,labels[index],40.5,13,9,light[index],69);
    for(let i=0;i<(index===0?7:4);i++){
      const [x,y]=slots[i],s=i<4?20:16;rect(g,x-s/2,y-s/2,s,s,'#183540');rect(g,x-2,y-.5,4,1,'#375460');
    }
    for(const token of state.tokens.filter(t=>t.owner===index)){
      const [x,y]=slots[token.slot],s=token.slot<4?18:14,dy=-1.8*F().impact(token.arrival??2);
      chip(e,token,x,y+dy,s,index);
      if(token.arrival>=0&&token.arrival<1){g.save();g.globalAlpha=1-token.arrival;F().corners(g,{x:x-s/2-3,y:y+dy-s/2-3,w:s+6,h:s+6},1,light[index]);g.restore();}
    }
    txt(e,`${state.counts[index]} ${labels[3]}`,40.5,88,6.7,light[index],72);
  }
  function point(card,slot){const [x,y]=slots[slot],scale=card.w/81;return{x:card.x-card.w/2+x*scale,y:card.y-card.h/2+y*scale,size:(slot<4?18:14)*scale};}
  function flying(e,layout,state){
    for(const token of state.flying){
      const r=token.route,a=point(layout.cards.find(c=>c.id==='time'+r.from),token.id%4),b=point(layout.cards.find(c=>c.id==='time0'),r.slot),p=F().flight(a,b,token.progress,21);
      chip(e,token,p.x,p.y,p.size,token.origin);
    }
  }
  function calendar(e,shot,frame){
    const g=e.ctx,l=shot.params.feedbackLabels,cs=cues(shot),weeks=cs.filter(c=>c.kind==='milestone'),result=cs.find(c=>c.kind==='settle');
    const arrived=[];
    for(let i=0;i<14;i++){const c=weeks.find(c=>c.index===Math.floor(i/7));arrived.push(c?c.start+(c.hit-c.start)*(i%7+1)/7:Infinity);}
    const count=arrived.filter(t=>frame>=t).length,finished=result&&frame>=result.hit;
    panel(g,263,123,'#d4b573');rect(g,3,3,257,20,'#315c60');txt(e,l.calendarTitle,108,13,8.5,'#f4d49a',198);txt(e,`${count}/14`,239,13,8,'#c8e8d1',37);
    rect(g,12,28,239,3,'#203c44');rect(g,12,28,239*count/14,3,'#8ac7aa');
    for(let i=0;i<14;i++){
      const x=12+(i%7)*34.14,y=39+Math.floor(i/7)*32,c=weeks.find(c=>c.index===Math.floor(i/7));
      const t=c?(frame-arrived[i])/(c.end-c.hit):2,dy=-1.25*F().impact(t),yes=frame>=arrived[i];
      rect(g,x,y+dy,28,24,yes?'#4a917a':'#476470');rect(g,x+2,y+2+dy,24,2,yes?'#b8ddbc':'#77939c');
      if(yes)check(g,x+14,y+12+dy,'#e9efca',.9);else txt(e,String(i+1),x+14,y+13,7,'#c9d5ce',24);
    }
    if(finished){const t=tail(frame,result),dy=-1.5*F().impact(t);rect(g,8,102+dy,247,16,'#34574e');txt(e,l.settled,131.5,110+dy,7,'#f0d79e',237);F().corners(g,{x:0,y:0,w:263,h:123},1,'#f5d48b');}
    else txt(e,l.calendarFooter,131.5,111,7,'#bbd8ca',240);
  }
  P.competitionFeedback={cues,budgetState,board,timeCard,calendar,flying,routes,slots};
})(globalThis.PixelVideo=globalThis.PixelVideo||{});
