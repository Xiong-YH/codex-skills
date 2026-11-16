(function(P){
  'use strict';
  function state(c,shot,frame,fps=60){
    const at=id=>P.scenes.eventFrame(shot,id),show=at(c.showEvent);
    const result={visible:frame>=show,alpha:P.ease((frame-show)/(fps*.24)),focused:!!c.focusEvent&&frame>=at(c.focusEvent)};
    if(c.kind==='metric'){
      const d=c.data,p=P.clamp((frame-at(d.startEvent))/Math.max(1,at(d.endEvent)-at(d.startEvent)));
      result.value=p===1?d.to:p===0?d.from:Number((d.from+(d.to-d.from)*p).toFixed(2));
    }
    if(c.kind==='comparison')result.items=c.data.items.map(i=>frame>=at(i.event));
    if(['flow','timeline','checklist','hierarchy','bars','code'].includes(c.kind)){
      result.items=c.data.items.map(i=>frame>=at(i.event));
      result.current=-1;result.items.forEach((active,i)=>{if(active)result.current=i});
      result.completed=result.items.filter(Boolean).length;
    }
    if(c.kind==='bars')result.progress=c.data.items.map(i=>P.clamp((frame-at(i.event))/Math.max(1,at(i.endEvent)-at(i.event))));
    return result;
  }
  const box=(x,y,width,height)=>({x,y,width,height});
  function tokens(e,c){
    const s=e.style.components||{};
    return {unit:e.height/1080,edge:e.colors[c.tone]||e.colors.gold,ink:e.colors.ink,muted:e.colors.muted,
      panel:s.panel||e.colors.panel,inset:s.inset||e.colors.panelInset||e.colors.background,
      shadow:e.colors.background,grid:s.grid||4};
  }
  function text(e,value,b,size,color,align='left',maxLines=2){
    if(value===undefined)return;
    const g=e.ctx,u=e.height/1080,s=size*u,rows=[];
    g.save();g.font=`600 ${s}px ${e.style.fontFamily}`;
    for(const paragraph of String(value).split('\n')){
      let row='';
      for(const char of Array.from(paragraph)){
        if(g.measureText(char).width>b.width)throw new Error('Component column is too narrow');
        if(row&&g.measureText(row+char).width>b.width){rows.push(row);row=char;}else row+=char;
      }
      rows.push(row);
    }
    if(rows.length>maxLines||s+(rows.length-1)*s*1.3>b.height){g.restore();throw new Error(`Component text overflows: ${value}. Enlarge the component or shorten the label.`);}
    g.fillStyle=color;g.textBaseline='middle';g.textAlign=align;
    const x=b.x+(align==='center'?b.width/2:align==='right'?b.width:0),cy=b.y+b.height/2;
    rows.forEach((row,i)=>g.fillText(row,x,cy+(i-(rows.length-1)/2)*s*1.3));g.restore();
  }
  function picture(e,data,b){
    const source=data.sourceShot?e.shotPreview(data.sourceShot):data.imageKey?(e.frameAssets?.(data.imageKey,e.frame)||e.assets[data.imageKey]):null;
    if(source)P.media.image(e,source,b,data.sourceShot?'cover':'contain');
    return Boolean(source);
  }
  P.components={state,draw(e,shot,f){
    for(const c of shot.components||[]){
      if(c.visualStyle==='plain'){P.componentStyles.normalize(c);P.componentPlain.draw(e,{...shot,components:[c]},f);continue;}
      const s=state(c,shot,f,e.fps);if(!s.visible||s.alpha<=0)continue;
      const t=P.componentStyles.prepare(e,c,shot,f,tokens(e,c)),b=box(c.x*e.width,c.y*e.height,c.width*e.width,c.height*e.height);
      e.ctx.save();e.ctx.globalAlpha*=s.alpha;
      try{
        P.componentStyles.entry(e,t);
        if(c.visualStyle==='paper')P.componentPaper.draw(e,c,b,t,s,text);
        else if(!P.componentApparatus.draw(e,c,b,t,s,{text,picture}))throw Error('Unsupported component kind: '+c.kind);
      }finally{e.ctx.restore();}
    }
  }};
})(globalThis.PixelVideo=globalThis.PixelVideo||{});
