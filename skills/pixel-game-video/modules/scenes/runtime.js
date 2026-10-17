(function(P){
  'use strict';
  function eventFrame(shot,id){
    if(id==='enter')return shot.startFrame;
    if(id==='exit')return shot.endFrame;
    const event=shot.events.find(e=>e.id===id);
    if(!event)throw new Error(`Unknown event ${shot.id}.${id}`);
    return event.frame;
  }
  function label(e,value,x,y,size=.026,color,maxWidth=.40){
    P.text.draw(e,value,x*e.width,y*e.height,size*e.height,color||e.colors.ink,e.width*maxWidth);
  }
  function line(e,x1,y1,x2,y2,color){
    const g=e.ctx;g.strokeStyle=color||e.colors.edge;g.lineWidth=e.pixel;
    g.beginPath();g.moveTo(x1*e.width,y1*e.height);g.lineTo(x2*e.width,y2*e.height);g.stroke();
  }
  function steps(e,shot,frame){
    const rows=shot.params.items,g=e.ctx,c=e.colors,w=e.width,h=e.height;
    const top=.47-(rows.length-1)*.047;
    rows.forEach((item,i)=>{
      const y=top+i*.094,at=eventFrame(shot,item.event),done=frame>=at;
      const pop=done?Math.sin(P.clamp((frame-at)/(e.fps*.25))*Math.PI)*.07:0;
      P.style.panel(e,w*.40,h*(y-.033),w*.49,h*.066,done?c.accent:c.edge);
      g.fillStyle=done?c.accent:c.edge;g.fillRect(w*.42,h*(y-.019),h*.038*(1+pop),h*.038*(1+pop));
      label(e,done?'✓':String(i+1),.431,y,.026,done?c.background:c.ink,.08);
      P.text.draw(e,item.label,w*.47,h*y,h*.029,done?c.ink:c.muted,w*.38,'left');
    });
    const done=rows.filter(item=>frame>=eventFrame(shot,item.event)).length;
    g.fillStyle=c.edge;g.fillRect(w*.40,h*.735,w*.49,e.pixel);
    g.fillStyle=c.accent;g.fillRect(w*.40,h*.735,w*.49*done/rows.length,e.pixel);
  }
  function counter(e,shot,frame){
    const a=shot.params,start=eventFrame(shot,a.startEvent),end=eventFrame(shot,a.endEvent);
    const p=P.clamp((frame-start)/Math.max(1,end-start));
    const interpolated=a.from+(a.to-a.from)*p;
    const value=p>=1?a.to:(a.to>=a.from?Math.floor(interpolated):Math.ceil(interpolated)),g=e.ctx,c=e.colors,w=e.width,h=e.height;
    P.style.panel(e,w*.40,h*.29,w*.49,h*.40);
    if(a.label)label(e,a.label,.645,.35,.028,c.muted);
    label(e,String(value)+(a.unit||''),.645,.49,.095,c.accent,.44);
    g.fillStyle=c.edge;g.fillRect(w*.445,h*.62,w*.40,h*.018);
    g.fillStyle=c.accent;g.fillRect(w*.445,h*.62,w*.40*p,h*.018);
  }
  function choice(e,shot,frame){
    const a=shot.params,n=a.options.length,c=e.colors,w=e.width,h=e.height;
    const selected=frame>=eventFrame(shot,a.selectEvent),left=.39,total=.52,gap=.018,card=(total-gap*(n-1))/n;
    a.options.forEach((value,i)=>{
      const x=left+i*(card+gap),isSelected=selected&&i===a.selectedIndex,y=isSelected?.365:.38;
      P.style.panel(e,w*x,h*y,w*card,h*.24,isSelected?c.accent:c.edge);
      P.library.prop(e,'prop.task-block.v1',w*(x+card/2),h*(y+.065),h*.10);
      label(e,value,x+card/2,y+.155,.028,isSelected?c.ink:c.muted,card-.018);
      if(isSelected)label(e,'✓',x+card/2,.675,.035,c.accent,.1);
    });
  }
  function assembly(e,shot,frame){
    const a=shot.params,c=e.colors,g=e.ctx,w=e.width,h=e.height,cx=.65,cy=.49;
    let assembled=0;
    a.parts.forEach((part,i)=>{
      const angle=a.parts.length===2?Math.PI+i*Math.PI:(a.parts.length===4?-Math.PI*.75:-Math.PI/2)+i*Math.PI*2/a.parts.length;
      const at=eventFrame(shot,part.event),p=P.ease((frame-at)/(e.fps*.32));
      if(frame>=at)assembled++;
      const outerX=cx+Math.cos(angle)*.215,outerY=cy+Math.sin(angle)*.185;
      const innerX=cx+Math.cos(angle)*.105,innerY=cy+Math.sin(angle)*.115;
      const x=outerX+(innerX-outerX)*p,y=outerY+(innerY-outerY)*p;
      line(e,cx,cy,x,y,frame>=at?c.accent:c.edge);
      g.fillStyle=frame>=at?c.accent:c.edge;g.fillRect(w*x-h*.027,h*y-h*.027,h*.054,h*.054);
      // Labels stay outside the assembly paths and the reserved result row.
      const labelY=outerY+(Math.sin(angle)<-.3?-.05:.05);
      label(e,part.label,outerX,labelY,.023,frame>=at?c.ink:c.muted,.16);
    });
    P.library.prop(e,'prop.core.v1',w*cx,h*cy,h*.18);
    if(assembled===a.parts.length && a.resultLabel)label(e,a.resultLabel,cx,.715,.030,c.ink,.44);
  }
  function focus(e,shot,frame){
    if(!(shot.objects||[]).length)P.library.prop(e,'prop.core.v1',e.width*.65,e.height*.48,e.height*.28);
    if(shot.params.label)label(e,shot.params.label,.65,.68,.033,e.colors.ink,.46);
    if(shot.params.detail)label(e,shot.params.detail,.65,.27,.026,e.colors.muted,.46);
  }
  const handlers={'scenes.steps.v1':steps,'scenes.counter.v1':counter,'scenes.choice.v1':choice,'scenes.assembly.v1':assembly,'scenes.focus.v1':focus};
  function content(e,shot,frame){
    if(shot.scene==='scenes.study-routes.v1'){P.studyRoutes.draw(e,shot,frame);return;}
    if(shot.scene==='scenes.presenter-board.v1'){P.presenterBoard.draw(e,shot,frame);return;}
    if(shot.scene==='scenes.cache-adventure.v1'){P.cacheAdventure.draw(e,shot,frame);return;}
    if(shot.scene==='scenes.cache-journey.v1'){P.cacheJourney.draw(e,shot,frame);return;}
    const handler=handlers[shot.scene];if(!handler)throw new Error('Unknown scene '+shot.scene);
    const g=e.ctx;g.save();
    // A shot without a presenter gives the mechanism the centre of the screen.
    // Keep the authoring coordinates stable; this composition belongs to scenes.
    if(!shot.actor){g.translate(e.width*.5,e.height*.40);g.scale(1.3,1.3);g.translate(-e.width*.65,-e.height*.48);}
    handler(e,shot,frame);P.library.objects(e,shot,frame);g.restore();
  }
  P.scenes={eventFrame,performance(mouth,frame){const cue=mouth.find(c=>frame>=c.startFrame&&frame<c.endFrame);return cue?cue.pose:0;},
  stageBounds(e,shot){
    if(shot&&!shot.actor)return{x:e.width*.06,y:e.height*.08,width:e.width*.88,height:e.height*.70};
    const s=shot?.contentStage||e.resolved.contentStage;
    if(!s)throw new Error('Missing compiled content stage; rebuild the project');
    return {x:s.x*e.width,y:s.y*e.height,width:s.width*e.width,height:s.height*e.height};
  },
  drawLayer(e,shot,frame,layer){
    if(layer==='background')P.style.background(e,shot);
    else if(layer==='actor')P.library.actor(e,shot,frame);
    else if(layer==='content')content(e,shot,frame);
    else throw new Error('Unknown scene layer '+layer);
  },draw(e,shot,frame){
    P.style.background(e,shot);P.library.actor(e,shot,frame);content(e,shot,frame);
  }};
})(globalThis.PixelVideo=globalThis.PixelVideo||{});
