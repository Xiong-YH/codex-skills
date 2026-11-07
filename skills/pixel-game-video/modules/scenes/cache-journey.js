(function(P){
  'use strict';
  const program=[.16,.57],origin=[.84,.54],cache=[.43,.61];
  const far=[[.19,.47],[.19,.27],[.84,.27],[.84,.39]];
  const near=[[.19,.47],[.43,.47],[.43,.51]];
  function state(shot,frame,fps=60){
    const a=shot.params,at=id=>P.scenes.eventFrame(shot,id);
    const start=at(a.startEvent),arrive=at(a.arriveEvent),end=at(a.completeEvent);
    return {phase:a.phase,started:frame>=start,arrived:frame>=arrive,complete:frame>=end,
      p:P.clamp((frame-start)/(arrive-start)),q:P.clamp((frame-arrive)/(end-arrive)),
      cacheKey:['hit','miss','summary'].includes(a.phase)||(a.phase==='store'&&frame>=end)?'A':null,
      requestedKey:a.phase==='miss'?'B':'A',time:(frame-shot.startFrame)/fps};
  }
  function point(e,path,p){
    const lengths=path.slice(1).map((v,i)=>Math.hypot((v[0]-path[i][0])*e.width,(v[1]-path[i][1])*e.height));
    let d=P.clamp(p)*lengths.reduce((a,b)=>a+b,0);
    for(let i=0;i<lengths.length;i++){
      if(d<=lengths[i]||i===lengths.length-1){const q=P.clamp(d/lengths[i]);return [path[i][0]+(path[i+1][0]-path[i][0])*q,path[i][1]+(path[i+1][1]-path[i][1])*q];}
      d-=lengths[i];
    }
    return path[0];
  }
  function route(e,path,color,alpha=.65){
    const g=e.ctx;g.save();g.strokeStyle=color;g.globalAlpha=alpha;g.lineWidth=e.pixel*.7;
    g.setLineDash([e.pixel*2,e.pixel*2]);g.beginPath();path.forEach((p,i)=>{if(i)g.lineTo(p[0]*e.width,p[1]*e.height);else g.moveTo(p[0]*e.width,p[1]*e.height);});g.stroke();g.restore();
  }
  function label(e,text,x,y,size=.026,color){P.text.draw(e,text,x*e.width,y*e.height,e.height*size,color||e.colors.ink,e.width*.40);}
  function device(e,id,p,size,o){P.library.computing(e,id,p[0]*e.width,p[1]*e.height,size*e.height,o);}
  function data(e,p,key,size=.20){device(e,'prop.data-token.v1',p,size,{key});}
  function query(e,p,key){
    const g=e.ctx,s=e.pixel*1.8;g.save();g.fillStyle=key==='B'?e.colors.gold:e.colors.secondary;
    g.fillRect(p[0]*e.width-s,p[1]*e.height-s,s*2,s*2);g.fillStyle=e.colors.background;g.fillRect(p[0]*e.width-s*.35,p[1]*e.height-s*.35,s*.7,s*.7);g.restore();
  }
  function highlight(e,p,t,color){
    if(t<0||t>1)return;const g=e.ctx,r=e.height*(.04+.12*t),px=e.pixel;
    g.save();g.strokeStyle=color;g.globalAlpha=(1-t)*.75;g.lineWidth=px*.6;
    g.strokeRect(p[0]*e.width-r,p[1]*e.height-r,r*2,r*2);g.restore();
  }
  function platform(e){
    const g=e.ctx,w=e.width,h=e.height,p=e.pixel;
    g.save();g.fillStyle='#08131e';g.fillRect(w*.075,h*.717,w*.85,p*2.2);
    g.fillStyle=e.colors.edge;g.fillRect(w*.075,h*.717,w*.85,p*.55);
    g.fillStyle=e.colors.gold;for(const x of [.09,.29,.68,.86])g.fillRect(w*x,h*.718,w*.035,p*.4);g.restore();
  }
  function world(e,shot,s){
    const c=e.colors,l=shot.params.labels,has=s.cacheKey==='A';
    platform(e);device(e,'prop.cache-terminal.v1',program,.31);device(e,'prop.data-vault.v1',origin,.36);
    label(e,l.requester,program[0],.765,.025);label(e,l.origin,origin[0],.765,.025);
    if(['hit','miss','summary'].includes(s.phase)){
      device(e,'prop.cache-crate.v1',cache,.235,{filled:has,key:'A'});label(e,l.cache,cache[0],.765,.025,c.accent);
    }
    if(s.phase==='question'||s.phase==='fetch'){
      route(e,far,c.secondary,.70);label(e,l.longRoute,.53,.205,.025,c.muted);
      if(s.phase==='question'){
        data(e,[.84,.39],'A');if(s.started&&!s.complete)query(e,point(e,far,s.p*.7),'A');
      }else if(s.started){
        if(!s.arrived)query(e,point(e,far,s.p),'A');else data(e,point(e,far,1-s.q),'A');
        if(s.arrived)highlight(e,[.84,.39],s.q*3,c.gold);
      }
    }else if(s.phase==='hit'||s.phase==='summary'){
      route(e,far,c.edge,.20);route(e,near,c.accent,.85);
      label(e,l.shortRoute,.36,.355,.026,c.accent);
      if(s.phase==='hit'&&s.started){
        if(!s.arrived)query(e,point(e,near,s.p),'A');else data(e,point(e,near,1-s.q),'A');
        if(s.arrived){label(e,l.hit,.60,.48,.039,c.accent);highlight(e,[.43,.51],s.q*1.8,c.gold);}
      }else if(s.phase==='summary'){
        const q=(s.time%2.4)/2.4;data(e,point(e,near,1-P.clamp(q/.58)),'A');
        label(e,l.result,.5,.17,.038,c.ink);label(e,l.hit,.60,.48,.039,c.accent);
      }
    }else if(s.phase==='miss'){
      route(e,near,c.gold,.80);route(e,far,c.secondary,s.arrived?.8:.22);
      if(s.started&&!s.arrived)query(e,point(e,near,s.p),'B');
      if(s.arrived){
        label(e,l.miss,.59,.43,.035,c.gold);
        // B is absent locally: the A copy remains intact while B is fetched.
        if(s.q<.42)query(e,point(e,far,s.q/.42),'B');else data(e,point(e,far,1-(s.q-.42)/.58),'B');
      }
    }
  }
  function store(e,shot,s){
    const c=e.colors,l=shot.params.labels,dock=[.60,.51],original=[.25,.51];
    platform(e);device(e,'prop.cache-terminal.v1',[.18,.56],.28);
    device(e,'prop.cache-crate.v1',dock,.47,{filled:s.complete,key:'A'});
    label(e,l.requester,.19,.765,.025);label(e,l.cache,.60,.765,.028,c.accent);
    route(e,[[.23,.42],[.60,.42]],c.accent,.6);
    if(s.started&&!s.arrived)data(e,[.23+(.60-.23)*P.ease(s.p),.42],'A',.21);
    if(s.arrived){
      // One identity, two visible copies. The source is never turned into B.
      data(e,original,'A',.21);label(e,l.dataA,.25,.65,.027,c.muted);
      label(e,l.copy,.60,.23,.037,c.accent);highlight(e,dock,s.q*1.7,c.gold);
      if(!s.complete)data(e,[.60,.42+(.51-.42)*P.ease(s.q)],'A',.16*(1-s.q));
    }
  }
  function comparison(e,shot,frame){
    const t=frame-shot.startFrame, a=shot.params, g=e.ctx;
    const hit=a.hitFrame, power=a.hitStrength;
    const client=[.17,.73], slot=[.44,.73], server=[.84,.72];
    const mouth=[.44,.645], port=[.84,.562], terminal=[.17,.635];
    const short=[terminal,[.17,.57],[.44,.57],mouth];
    const long=[mouth,[.44,.475],[.84,.475],port];
    const mint='#87ffe1', blue='#719ed1', amber='#ffcb76';
    const travel=(path,from,to)=>point(e,path,(t-from)/(to-from));
    const w=e.width,h=e.height;
    g.fillStyle='#0b1628';g.fillRect(0,0,w,h);
    g.fillStyle='#101f36';g.fillRect(0,h*.405,w,h*.40);
    for(const x of [.027,.095,.64,.705,.93]){
      g.fillStyle='#0c192c';g.fillRect(w*x,h*.42,w*.048,h*.37);
      g.fillStyle='#182c48';
      for(let row=0;row<7;row++)g.fillRect(w*(x+.005),h*(.44+row*.045),w*.036,h*.027);
      g.fillStyle='#31516a';g.fillRect(w*(x+.031),h*.455,w*.007,h*.009);
    }
    g.fillStyle='#192b43';g.fillRect(0,h*.80,w,h*.012);
    g.fillStyle='#0e1c31';g.fillRect(0,h*.812,w,h*.188);
    g.fillStyle='#253957';g.fillRect(w*.08,h*.115,w*.84,h*.004);
    g.fillStyle='#87ffe1';g.fillRect(w*.08,h*.115,w*.055,h*.004);
    route(e,long,blue,t<60?.24:t<132?.95:.52);
    route(e,short,mint,t<hit?.35:1);
    device(e,'prop.cache-terminal.v1',client,.29);
    device(e,'prop.cache-crate.v1',slot,.32,{filled:t>=128,key:'A'});
    device(e,'prop.data-vault.v1',server,.32);
    label(e,a.labels.requester,.17,.865,.029);
    label(e,a.labels.cache,.44,.865,.029,mint);
    label(e,a.labels.origin,.84,.865,.029);
    if(t<42)query(e,travel(short,0,42),'A');
    else if(t<60)query(e,mouth,'A');
    else if(t<92)query(e,travel(long,60,92),'A');
    else if(t<128)data(e,travel([...long].reverse(),97,128),'A',.21);
    if(t>=92&&t<107)highlight(e,port,(t-92)/15,amber);
    if(t>=128&&t<137)highlight(e,slot,(t-128)/9,mint);
    if(t>=132&&t<hit)query(e,travel(short,132,hit),'A');
    if(t>=hit+7&&t<190)data(e,travel([...short].reverse(),hit+7,190),'A',.21);
    const age=t-hit;
    if(age>=0&&age<13){
      const q=age/13, x=slot[0]*e.width,y=(slot[1]+.018)*e.height;
      const w=e.height*(.132+.055*q*power),h=e.height*(.112+.044*q*power);
      g.save();g.globalAlpha=P.clamp((1-q)*power);
      g.strokeStyle=mint;g.lineWidth=e.height*.014;
      g.strokeRect(x-w,y-h,2*w,2*h);
      for(let i=0;i<8;i++){
        const side=i%2?1:-1, spread=(i%4-1.5)*.045;
        g.fillStyle=i%3?mint:'#f3fff8';
        g.fillRect(x+side*(w+e.height*(.016+q*.085*power)),y+e.height*(spread+q*spread),e.height*.018,e.height*.018);
      }
      g.restore();
    }
  }
  P.cacheJourney={state,draw(e,shot,frame){
    if(shot.params.phase==="comparison"){comparison(e,shot,frame);return;}
    const s=state(shot,frame,e.fps);if(s.phase==='store')store(e,shot,s);else world(e,shot,s);
  }};
})(globalThis.PixelVideo=globalThis.PixelVideo||{});
