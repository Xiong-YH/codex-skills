(function(P){
  'use strict';
  const ease=v=>{v=P.clamp(v);return v*v*v*(10+v*(-15+6*v));};
  const mix=(a,b,t)=>a+(b-a)*t;
  const cameras={wide:{x:240,y:135,zoom:1},focus:{x:315,y:158,zoom:1.68},layout:{x:240,y:135,zoom:1.07},plan:{x:305,y:150,zoom:1.48}};
  const sizes={board:[300,146],time:[81,94],calendar:[263,123]};
  // Width is the sole size parameter. Content, border and shadow move as a
  // rigid object; changing the layout cannot squeeze text or morph its shape.
  const card=(id,type,x,y,w,extra={})=>({id,type,x,y,w,h:w*sizes[type][1]/sizes[type][0],...extra});
  const board=()=>card('board','board',315,158,198);
  const stack=i=>card('time'+i,'time',365+i*5,157-i*4,68,{index:i});
  const spread=i=>card('time'+i,'time',113+i*127,122,90,{index:i});
  const plan=()=>card('calendar','calendar',351,195,104);
  const camera=(a,b,t)=>({x:mix(a.x,b.x,t),y:mix(a.y,b.y,t),zoom:Math.exp(mix(Math.log(a.zoom),Math.log(b.zoom),t))});
  const move=(a,b,t)=>card(a.id,a.type,mix(a.x,b.x,t),mix(a.y,b.y,t),mix(a.w,b.w,t),{index:a.index});
  function layout(phase,t,prep=0,planEntry=1){
    const q=ease(t),cards=[];let cam,shade=0;
    if(phase==='question'){cam=cameras.wide;cards.push(board());}
    else if(phase==='training'){
      cam=camera(cameras.wide,cameras.focus,q);cards.push(board());
      if(prep>0)for(let i=0;i<3;i++){const c=stack(i);c.y+=140*(1-prep);cards.push(c);}
    }else if(phase==='cost'){
      cam=camera(cameras.focus,cameras.layout,q);shade=.14*q;
      const b=board();b.y+=200*ease(t/.9);cards.push(b);
      for(let i=0;i<3;i++){
        const u=ease((t-i*.065)/.87),c=move(stack(i),spread(i),u);
        c.y-=7*Math.sin(Math.PI*u);cards.push(c);
      }
      if(planEntry>0){const c=plan();c.y+=100*(1-planEntry);cards.push(c);}
    }else{
      cam=camera(cameras.layout,cameras.plan,q);shade=.14+.08*q;
      for(let i=0;i<3;i++){
        const c=spread(i),u=ease((t-i*.035)/.9);
        c.x+=[-165,-205,190][i]*u;c.y+=16*u;c.light=1-.25*u;cards.push(c);
      }
      const c=move(plan(),card('calendar','calendar',305,150,238),q);
      c.y-=5*Math.sin(Math.PI*q);cards.push(c);
    }
    return {camera:cam,cards,shade};
  }
  function texture(e,key,w,h,version,draw){
    let t=e.propCache[key];if(!t)t=e.propCache[key]={canvas:e.createCanvas(w*4,h*4)};
    if(t.version!==version){const g=t.canvas.getContext('2d');g.setTransform(4,0,0,4,0,0);g.clearRect(0,0,w,h);g.globalAlpha=1;
      draw({...e,ctx:g,width:480,height:270,pixel:1});t.version=version;}
    return t.canvas;
  }
  function room(e,shot,actor,frame){
    const key='cinema:flat-room:'+Boolean(actor),version=actor?frame:0;
    let t=e.propCache[key];if(!t)t=e.propCache[key]={canvas:e.createCanvas(e.width,e.height)};
    if(t.version!==version){const ne={...e,ctx:t.canvas.getContext('2d')};
      P.style.background(ne,{...shot,params:{...shot.params,environment:'workspace'}});
      if(actor)P.library.actor(ne,{...shot,actor:'actor.azong.v3'},frame);
      t.version=version;}
    return t.canvas;
  }
  function text(e,value,x,y,size,color,alpha=1,max=.88){const g=e.ctx;g.save();g.globalAlpha=alpha;P.text.draw(e,value,x*e.width,y*e.height,size*e.height,color,max*e.width);g.restore();}
  function drawWorld(e,shot,frame){
    const a=shot.params,phase=a.phase;
    if(!['cinematic','gameplay'].includes(a.presentation)||!['question','training','cost','trial'].includes(phase))return false;
    const game=a.presentation==='gameplay',G=P.competitionFeedback;
    const event=k=>P.scenes.eventFrame(shot,a[k]),n=event('settleEvent')-shot.startFrame,local=frame-shot.startFrame;
    const prep=ease((frame-event('prepareEvent'))/Math.max(1,event('handoffEvent')-event('prepareEvent')));
    const p=P.clamp((frame-event('startEvent'))/Math.max(1,event('completeEvent')-event('startEvent')));
    const title=ease((frame-event('settleEvent'))/Math.max(1,event('readEvent')-event('settleEvent')))*(1-prep);
    const t=P.clamp((local-6)/Math.max(1,n-12));
    const state=layout(phase,t,prep,phase==='cost'?prep:1);
    const selection=phase==='question'?prep:phase==='training'?1-ease(local/24):0;
    const algo=phase==='question'?0:phase==='training'?p:1;
    const budget=game?G.budgetState(G.cues(shot).filter(c=>c.kind==='transfer'),frame,phase==='trial'):null;
    const visible=new Set(state.cards.map(c=>c.id)),textures={};
    if(visible.has('board'))textures.board=texture(e,'cinema:rigid-board:'+game,300,146,game?frame:`${algo}:${selection}`,ne=>game?G.board(ne,shot,frame,selection):P.competitionCards.problem(ne,algo,selection));
    for(let i=0;i<3;i++)if(visible.has('time'+i))textures['time'+i]=texture(e,'cinema:rigid-time:'+game+':'+i,81,94,game?frame:phase==='cost'?p:phase==='trial'?1:0,
      ne=>game?G.timeCard(ne,i,budget,[a.feedbackLabels.competition,a.feedbackLabels.course,a.feedbackLabels.project,a.feedbackLabels.budgetUnit]):P.competitionCards.timeCard(ne,i,phase==='cost'?p:phase==='trial'?1:0,true));
    if(visible.has('calendar'))textures.calendar=texture(e,'cinema:rigid-calendar:'+game,263,123,game?frame:phase==='trial'?p:0,
      ne=>game?G.calendar(ne,shot,frame):P.competitionCards.calendar(ne,phase==='trial'?p:0,1));
    const actor=e.includePresenter!==false&&(phase==='question'||phase==='training'),roomFrame=phase==='question'?frame:shot.startFrame;
    const g=e.ctx;g.save();g.scale(e.width/480,e.height/270);
    // A single front-facing camera covers the original room and every object.
    // No mirrored background, skew, independent x/y scale or orbit projection.
    const cam=state.camera;g.translate(240,135);g.scale(cam.zoom,cam.zoom);g.translate(-cam.x,-cam.y);
    g.imageSmoothingEnabled=true;g.drawImage(room(e,shot,actor,roomFrame),0,0,480,270);
    g.fillStyle=`rgba(3,10,19,${state.shade})`;g.fillRect(0,0,480,270);
    for(const c of state.cards){
      const x=c.x-c.w/2,y=c.y-c.h/2;
      g.fillStyle='rgba(0,5,11,.18)';g.fillRect(x+3,y+5,c.w,c.h);
      g.fillStyle='rgba(0,5,11,.27)';g.fillRect(x+1.5,y+2.5,c.w,c.h);
      g.drawImage(textures[c.id],x,y,c.w,c.h);
      if(c.light!==undefined){g.fillStyle=`rgba(3,10,19,${1-c.light})`;g.fillRect(x,y,c.w,c.h);}
    }
    if(game&&phase==='cost')G.flying({...e,ctx:g,width:480,height:270,pixel:1},state,budget);
    g.restore();
    if(phase==='question'){
      text(e,a.heading,.645,.165,.048,e.colors.ink,title,.60);text(e,a.kicker,.645,.247,.023,e.colors.gold,title,.60);
      text(e,'兴趣 · 目标 · 时间投入',.645,84/270,8.5/270,e.colors.gold,title,.60);
    }else{text(e,a.heading,.5,.084,.045,e.colors.ink,title);text(e,a.kicker,.5,.139,.023,e.colors.gold,title);}
    return true;
  }
  P.competitionCinematic={drawWorld,layout};
})(globalThis.PixelVideo=globalThis.PixelVideo||{});
