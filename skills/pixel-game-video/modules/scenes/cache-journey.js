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
  P.cacheJourney={state,draw(e,shot,frame){
    const s=state(shot,frame,e.fps);if(s.phase==='store')store(e,shot,s);else world(e,shot,s);
  }};
})(globalThis.PixelVideo=globalThis.PixelVideo||{});
