(function(P){
  'use strict';
  const lerp=(a,b,p)=>a+(b-a)*P.clamp(p),ease=p=>{p=P.clamp(p);return p*p*(3-2*p);};
  function text(e,value,x,y,size=.028,color){P.text.draw(e,value,x*e.width,y*e.height,size*e.height,color||e.colors.ink,e.width*.64);}
  function device(e,id,x,ground,size,o={}){
    P.library.computing(e,id,x*e.width,(ground-size*.422)*e.height,size*e.height,o);
  }
  function token(e,x,y,key='A',size=.25){P.library.computing(e,'prop.data-token.v1',x*e.width,y*e.height,size*e.height,{key});}
  function actor(e,shot,s,x,foot,height,opts={}){
    return P.library.perform(e,shot.actor,x*e.width,foot*e.height,height*e.height,{time:s.time,...opts});
  }
  function held(e,hand,key='A',size=.23){token(e,hand.x/e.width,hand.y/e.height-.045,key,size);}
  function glint(e,x,y,p,color=e.colors.gold){
    if(p<0||p>1)return;
    const g=e.ctx,d=.018+.07*p,alpha=Math.sin(p*Math.PI);
    g.save();g.fillStyle=color;g.globalAlpha=alpha*.8;
    for(let i=0;i<6;i++){
      const angle=i*Math.PI/3,xx=x+Math.cos(angle)*d,yy=y+Math.sin(angle)*d;
      g.fillRect(xx*e.width,yy*e.height,e.pixel*(1-p*.5),e.pixel*(1-p*.5));
    }g.restore();
  }
  function workshop(e,s){
    const g=e.ctx,w=e.width,h=e.height,p=e.pixel;
    // The actor stands on the existing workbench rather than on a chart baseline.
    g.save();g.fillStyle='#6b422d';g.fillRect(0,h*.785,w,p*2);
    g.fillStyle='#b87e45';g.fillRect(0,h*.785,w,p*.65);
    for(const x of [.08,.32,.69,.86]){g.fillStyle='#92613b';g.fillRect(w*x,h*.795,w*.035,p*.4);}
    g.restore();
  }
  function room(e,shot,s,environment){
    P.style.background(e,{...shot,params:{...shot.params,environment}});
    if(environment==='workspace')workshop(e,s);
    else{
      const g=e.ctx,w=e.width,h=e.height,p=e.pixel;
      g.save();g.fillStyle='#0c1e30';g.fillRect(0,h*.77,w,h*.045);
      g.fillStyle='#365b6d';g.fillRect(0,h*.77,w,p*.5);
      for(let i=0;i<9;i++){g.fillStyle=i%2?'#1a3347':'#25485b';g.fillRect(w*(i*.13-.04),h*.79,w*.09,p*.7);}
      g.restore();
    }
  }
  function question(e,shot,s){
    const l=shot.params.labels,c=e.colors;
    device(e,'prop.cache-terminal.v1',.24,.785,.45);
    // A monitor request becomes a thought, then the character prepares to leave.
    const depart=ease((s.time-3.45)/1.35),x=lerp(.45,.59,depart);
    actor(e,shot,s,x,.785,.44,{think:s.time<2.7,walk:depart>0&&depart<1?1:0,reach:Math.sin(Math.min(s.time,1.5)*Math.PI/3)*.5});
    text(e,l.longRoute,.57,.22,.034,c.ink);
    if(s.time>.6){
      const p=ease((s.time-.6)/.5);token(e,.61,.42,'A',.22*p);
      text(e,'?',.70,.37,.055,c.gold);
      glint(e,.61,.42,(s.time-.7)/.7,c.accent);
    }
  }
  function fetch(e,shot,s){
    const l=shot.params.labels;
    device(e,'prop.data-vault.v1',.80,.77,.68);
    text(e,l.origin,.79,.17,.033,e.colors.muted);
    const pickup=s.arrived&&s.q<.16,back=P.clamp((s.q-.16)/.84),run=s.started&&!s.complete&&!pickup;
    let x=.18,face=1;
    if(s.started&&!s.arrived)x=lerp(.18,.65,ease(s.p));
    if(s.arrived){x=lerp(.65,.19,ease(back));face=pickup?1:-1;}
    const hand=actor(e,shot,s,x,.77,.43,{walk:run?1:0,facing:face,carry:s.arrived?1:0,reach:pickup?1:(!s.arrived&&s.p>.8?.7:0)});
    if(s.arrived){
      if(pickup){const p=ease(s.q/.16);token(e,lerp(.76,hand.x/e.width,p),lerp(.64,hand.y/e.height-.045,p),'A',.24);}
      else held(e,hand);
      glint(e,.76,.64,s.q*3);
    }else token(e,.76,.64,'A',.24);
  }
  function store(e,shot,s){
    const l=shot.params.labels,deposit=s.arrived?ease(s.q):0;
    device(e,'prop.cache-crate.v1',.67,.785,.56,{filled:s.complete,key:'A'});
    const hand=actor(e,shot,s,.30,.785,.58,{carry:1,reach:s.started?.9:0});
    held(e,hand,'A',.27);
    text(e,l.copy,.65,.20,.037,e.colors.accent);
    if(s.started&&!s.arrived){
      // Hand anticipation precedes copying; original A remains in the hand.
      glint(e,hand.x/e.width,hand.y/e.height-.04,s.p,e.colors.accent);
    }
    if(s.arrived&&!s.complete){
      const x=lerp(hand.x/e.width,.67,deposit),y=lerp(hand.y/e.height-.045,.575,deposit)-Math.sin(deposit*Math.PI)*.15;
      token(e,x,y,'A',.27*(1-.55*deposit));
      glint(e,.67,.575,deposit,e.colors.accent);
    }
    if(s.complete){text(e,l.cache,.67,.72,.024,e.colors.accent);glint(e,.67,.575,(s.time-3.8)/.5);}
  }
  function hit(e,shot,s,summary=false){
    const l=shot.params.labels;
    device(e,'prop.cache-terminal.v1',.20,.785,.37);
    device(e,'prop.cache-crate.v1',.64,.785,.34,{filled:true,key:'A'});
    let reach=0,x=.43,carry=0,react=0;
    if(!summary){
      if(s.started&&!s.arrived){reach=ease(s.p);x=lerp(.43,.49,reach);}
      if(s.arrived){reach=1-ease(s.q);x=lerp(.49,.43,ease(s.q));carry=1;react=s.q;}
    }else{reach=.45;carry=1;react=P.clamp(s.time/.55);}
    const hand=actor(e,shot,s,x,.785,.45,{reach,carry,react});
    if(carry)held(e,hand,'A',.24);
    if(s.arrived||summary){
      text(e,summary?l.result:l.hit,.64,.25,summary?.035:.047,e.colors.accent);
      if(!summary)glint(e,.64,.59,s.q*1.7);
    }else text(e,l.shortRoute,.64,.25,.035,e.colors.ink);
    if(summary){
      // A brief contented settle, then a quiet end pose rather than an endless loop.
      glint(e,.64,.59,s.time/1.1,e.colors.accent);
    }
  }
  function miss(e,shot,s){
    const l=shot.params.labels,c=e.colors,cut=.42;
    if(!s.arrived||s.q<cut){
      device(e,'prop.cache-terminal.v1',.20,.785,.37);
      device(e,'prop.cache-crate.v1',.64,.785,.34,{filled:true,key:'A'});
      const running=s.arrived,exit=running?ease(s.q/cut):0,x=running?lerp(.48,1.15,exit):lerp(.43,.48,ease(s.p));
      actor(e,shot,s,x,.785,.45,{reach:!running&&s.started?ease(s.p):0,walk:running?1:0,think:!running});
      if(s.arrived)text(e,l.miss,.64,.27,.043,c.gold);
      else{token(e,.39,.31,'B',.17);text(e,'?',.50,.32,.04,c.gold);}
    }else{
      const back=P.clamp((s.q-cut)/(1-cut));
      device(e,'prop.data-vault.v1',.80,.77,.68);
      const hand=actor(e,shot,s,lerp(.65,.19,ease(back)),.77,.43,{walk:!s.complete?1:0,facing:-1,carry:1});
      held(e,hand,'B');text(e,l.origin,.79,.17,.033,c.muted);
      glint(e,.78,.44,back*3,c.gold);
    }
    // Hide the action match behind a foreground server rack, not a dissolve.
    if(s.arrived)P.motion.foregroundWipe(e,(s.q-(cut-.10))/.20);
  }
  P.cacheAdventure={draw(e,shot,frame){
    if(!shot.actor)throw Error('cache-adventure needs a selected actor');
    const s=P.cacheJourney.state(shot,frame,e.fps);
    const archive=s.phase==='fetch'||(s.phase==='miss'&&s.arrived&&s.q>=.42);
    room(e,shot,s,archive?'archive':'workspace');
    if(s.phase==='question')question(e,shot,s);
    else if(s.phase==='fetch')fetch(e,shot,s);
    else if(s.phase==='store')store(e,shot,s);
    else if(s.phase==='hit')hit(e,shot,s);
    else if(s.phase==='miss')miss(e,shot,s);
    else hit(e,shot,s,true);
  }};
})(globalThis.PixelVideo=globalThis.PixelVideo||{});
