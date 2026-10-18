(function(P){
  'use strict';
  const smooth=v=>{v=P.clamp(v);return v*v*(3-2*v);};
  const mix=(a,b,p)=>a+(b-a)*p;
  const rect=(g,x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
  function line(g,points,c,width=1){g.strokeStyle=c;g.lineWidth=width;g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.stroke();}
  function check(g,x,y,c){line(g,[[x-4,y],[x-1,y+3],[x+6,y-5]],c,2);}
  function native(e,draw){
    const key='competition-paced:canvas';let canvas=e.propCache[key];
    if(!canvas)canvas=e.propCache[key]=e.createCanvas(480,270);
    const g=canvas.getContext('2d');g.setTransform(1,0,0,1,0,0);g.globalAlpha=1;g.clearRect(0,0,480,270);draw(g);
    e.ctx.save();e.ctx.imageSmoothingEnabled=false;e.ctx.drawImage(canvas,0,0,e.width,e.height);e.ctx.restore();
  }
  function text(e,s,x,y,size=.03,color,max=.52,alpha=1){
    if(alpha<=0)return;e.ctx.save();e.ctx.globalAlpha=alpha;
    P.text.draw(e,s,x*e.width,y*e.height,size*e.height,color||e.colors.ink,max*e.width);e.ctx.restore();
  }
  function board(g){
    rect(g,182,87,258,124,'#061320');rect(g,184,85,254,124,'#526f7c');
    rect(g,187,88,248,117,'#122b3c');rect(g,190,91,242,111,'#0b1d2c');
    rect(g,190,91,242,8,'#294858');
    for(let i=0;i<3;i++)rect(g,195+i*6,94,2,2,['#e8ac83','#ebce8e','#89d6c4'][i]);
    rect(g,198,209,226,3,'#172f3e');rect(g,296,212,28,7,'#4f6c77');rect(g,273,219,74,3,'#7c959a');
  }
  function algorithm(g,p,alpha=1){
    if(alpha<=0)return;g.save();g.globalAlpha=alpha;
    const points=[[212,126],[260,145],[307,119],[355,144],[408,123]];
    for(let i=0;i<4;i++){
      line(g,[points[i],points[i+1]],'#35576a',2);
      const q=P.clamp(p*4-i),a=points[i],b=points[i+1];
      if(q>0)line(g,[a,[mix(a[0],b[0],q),mix(a[1],b[1],q)]],'#87d9c6',2);
    }
    points.forEach(([x,y],i)=>{rect(g,x-5,y-5,10,10,p*4>=i?'#e5be7d':'#456477');rect(g,x-2,y-2,4,4,'#112837');});
    g.restore();
  }
  function code(g,p,alpha=1){
    if(alpha<=0)return;g.save();g.globalAlpha=alpha;
    for(let i=0;i<4;i++){
      const q=P.clamp(p*5-i);if(q>0)rect(g,210+(i%2)*9,165+i*8,(85+(i%3)*28)*q,2,['#82d3bf','#c4b2df','#dbbe89'][i%3]);
    }g.restore();
  }
  // A six-by-two budget keeps its identity as it expands out of the training board.
  function budget(g,expanded,taken,alpha=1){
    if(alpha<=0)return;g.save();g.globalAlpha=alpha;
    const x=mix(243,205,expanded),y=mix(174,121,expanded),dx=mix(23,36,expanded),dy=mix(15,36,expanded),w=mix(18,29,expanded),h=mix(10,26,expanded);
    const assigned=[4,8,5].slice(0,Math.floor(P.clamp(taken)*3));
    for(let i=0;i<12;i++){
      const original=i<4?0:i<8?1:2,owner=assigned.includes(i)?0:original;
      const xx=x+i%6*dx,yy=y+Math.floor(i/6)*dy;
      rect(g,xx,yy,w,h,['#c09857','#527b9b','#4a9d90'][owner]);
      rect(g,xx+2,yy+2,w-4,Math.max(1,Math.round(h*.12)),['#efd298','#a8c5db','#9edccd'][owner]);
      if(owner!==original)rect(g,xx+w*.46,yy+h*.48,Math.max(2,w*.13),Math.max(2,h*.19),'#ffe2a8');
    }g.restore();
  }
  function calendar(g,p,alpha=1){
    if(alpha<=0)return;g.save();g.globalAlpha=alpha;
    for(let i=0;i<14;i++){
      const x=205+i%7*31,y=121+Math.floor(i/7)*36,done=p>=(i+1)/14;
      rect(g,x,y,25,26,done?'#4a8b7d':'#8eaba4');rect(g,x+2,y+2,21,2,done?'#acd7bb':'#c7d5c4');
      if(done)check(g,x+12,y+14,'#e2ebce');
    }g.restore();
  }
  function project(g,p){
    rect(g,220,101,157,93,'#071422');rect(g,222,99,153,91,'#547582');rect(g,226,103,145,81,'#102837');
    rect(g,230,107,137,7,'#2b4c5d');
    for(let i=0;i<7;i++){const q=P.clamp(p*8-i);if(q>0)rect(g,237+(i%3)*5,124+i*7,(45+i%3*13)*q,2,['#80d5c0','#c6b4da','#e0c18b'][i%3]);}
    rect(g,217,191,163,7,'#83a5aa');rect(g,261,198,71,3,'#405f6f');
    const q=smooth((p-.4)/.6);g.save();g.globalAlpha=q;
    rect(g,389,120,43,65,'#081724');rect(g,391,118,39,63,'#6b9299');rect(g,395,123,31,51,'#d2d9c3');
    for(let i=0;i<3;i++)rect(g,400,131+i*7,20-i%2*5,2,'#6b928a');check(g,410,160,'#387e70');
    line(g,[[379,156],[387,156]],'#88d8c2',2);g.restore();
  }
  P.competitionPaced={draw(e,shot,frame){
    const a=shot.params;
    const event=id=>P.scenes.eventFrame(shot,id),enter=shot.startFrame,settle=event(a.settleEvent),read=event(a.readEvent),prepare=event(a.prepareEvent),handoff=event(a.handoffEvent);
    const start=event(a.startEvent),end=event(a.completeEvent),p=P.clamp((frame-start)/Math.max(1,end-start));
    const titleAlpha=smooth((frame-settle)/Math.max(1,read-settle))*(a.phase==='decision'?1:1-smooth((frame-prepare)/Math.max(1,handoff-prepare)));
    const prep=smooth((frame-prepare)/Math.max(1,handoff-prepare));
    const transition=smooth(((frame-enter)/Math.max(1,settle-enter)-.18)/.64),l=a.labels,c=e.colors,phase=a.phase;
    if(phase==='decision'){
      // Original decision layout owns the card destinations. Its text appears
      // after the actual scene-to-card movement has landed.
      const oldHeading=a.heading,oldKicker=a.kicker,oldLabels=a.labels;
      P.competitionRoutes.drawBase(e,{...shot,params:{...a,heading:'',kicker:'',labels:['','','']}},frame);
      text(e,oldHeading,.5,.15,.05,c.ink,.80,titleAlpha);
      text(e,oldLabels[0],.335,.263,.033,c.gold,.27,titleAlpha);text(e,oldLabels[1],.685,.263,.033,c.accent,.27,titleAlpha);
      text(e,oldLabels[2],.5,.74,.04,c.ink,.75,titleAlpha);text(e,oldKicker,.5,.80,.027,c.gold,.70,titleAlpha);return;
    }
    text(e,a.heading,.645,.165,.048,c.ink,.60,titleAlpha);
    text(e,a.kicker,.645,.247,.023,c.gold,.60,titleAlpha);
    if(phase==='project')native(e,g=>project(g,p));
    else native(e,g=>{
      board(g);
      if(phase==='question'){algorithm(g,0);code(g,.3);}
      if(phase==='training'){
        algorithm(g,p);code(g,p,1-prep);budget(g,0,0,prep);
      }
      if(phase==='cost'){
        algorithm(g,1,1-transition);budget(g,transition,p);
      }
      if(phase==='trial'){
        const raw=(frame-enter)/Math.max(1,settle-enter);
        budget(g,1,1,1-smooth((raw-.15)/.25));
        calendar(g,p,smooth((raw-.5)/.3));
      }
    });
    if(phase==='question'){
      text(e,l[0],.645,.75,.036,c.gold,.5,titleAlpha);
    }else if(phase==='training'){
      l.forEach((v,i)=>text(e,v,.47+i*.17,.77,.028,[c.gold,c.accent,c.ink][i],.21,titleAlpha*(1-smooth(prep*3))));
      text(e,a.prepareLabel,.645,.79,.026,c.gold,.53,smooth((prep-.5)/.5));
    }else if(phase==='cost'){
      text(e,a.prepareLabel,.645,.79,.026,c.gold,.53,1-transition);
      text(e,a.budgetLabel,.645,.39,.024,c.muted,.53,transition);
      l.forEach((v,i)=>text(e,v,.47+i*.17,.765,.027,[c.gold,c.secondary,c.accent][i],.21,titleAlpha));
    }else if(phase==='trial'){
      text(e,a.budgetLabel,.645,.39,.024,c.muted,.53,1-smooth(((frame-enter)/Math.max(1,settle-enter)-.15)/.25));
      text(e,a.calendarLabel,.645,.39,.025,c.gold,.53,smooth(((frame-enter)/Math.max(1,settle-enter)-.5)/.3));
      l.forEach((v,i)=>text(e,v,.47+i*.17,.77,.025,[c.gold,c.accent,c.secondary][i],.21,titleAlpha));
    }else{
      l.forEach((v,i)=>text(e,v,.51+i*.15,.77,.029,[c.accent,c.accent,c.gold][i],.21,titleAlpha));
    }
  }};
})(globalThis.PixelVideo=globalThis.PixelVideo||{});
