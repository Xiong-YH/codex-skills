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
  function textRows(g,value,width){
    const rows=[];
    for(const paragraph of String(value).split('\n')){
      let row='';
      for(const char of Array.from(paragraph)){
        if(g.measureText(char).width>width)return null;
        if(row&&g.measureText(row+char).width>width){rows.push(row);row=char;}else row+=char;
      }
      rows.push(row);
    }
    return rows;
  }
  function fitTextSize(e,value,width,height,size,maxLines,minimum){
    const g=e.ctx,unit=e.height/1080;
    g.save();
    try{
      function fits(candidate){
        const px=candidate*unit;
        g.font=`600 ${px}px ${e.style.fontFamily}`;
        const rows=textRows(g,value,width);
        return rows&&rows.length<=maxLines&&px*(1+(rows.length-1)*1.3)<=height;
      }
      if(fits(size))return size;
      let lower=minimum,upper=size;
      while(upper-lower>1){
        const middle=(lower+upper)/2;
        if(fits(middle))lower=middle;
        else upper=middle;
      }
      return lower;
    }finally{g.restore();}
  }
  function text(e,value,b,size,color,align='left',maxLines=2){
    if(value===undefined)return;
    const g=e.ctx,u=e.height/1080,s=size*u;
    g.save();
    try {
      g.font=`600 ${s}px ${e.style.fontFamily}`;
      const rows=textRows(g,value,b.width);
      if(!rows)throw new Error('Component column is too narrow');
      if(rows.length>maxLines||s+(rows.length-1)*s*1.3>b.height)
        throw new Error(`Component text overflows: ${value}. Enlarge the component or shorten the label.`);
      g.fillStyle=color;g.textBaseline='middle';g.textAlign=align;
      const x=b.x+(align==='center'?b.width/2:align==='right'?b.width:0),cy=b.y+b.height/2;
      rows.forEach((row,i)=>g.fillText(row,x,cy+(i-(rows.length-1)/2)*s*1.3));
    }finally{g.restore();}
  }
  function picture(e,data,b){
    const source=data.sourceShot?e.shotPreview(data.sourceShot):data.imageKey?(e.frameAssets?.(data.imageKey,e.frame)||e.assets[data.imageKey]):null;
    if(source)P.media.image(e,source,b,data.sourceShot?'cover':'contain');
    return Boolean(source);
  }
  const layout={box,tokens,text,picture,fitTextSize};
  P.componentLayout=layout;
  P.componentRenderer=P.components={state,draw};
  function draw(e,shot,f){
    for(const c of shot.components||[]){
      const config=c.visualStyle==='plain'?P.componentStyles.normalize(c):null;
      const s=state(c,shot,f,e.fps);if(!s.visible||s.alpha<=0)continue;
      const b=box(c.x*e.width,c.y*e.height,c.width*e.width,c.height*e.height);
      const style=config||P.componentStyles.normalize(c),base=tokens(e,c);
      e.ctx.save();e.ctx.globalAlpha*=s.alpha;
      try{
        if(style.visualStyle==='plain'){
          P.componentPlain.drawCard(e,c,shot,f,b,base,s);
          continue;
        }
        const t=P.componentStyles.prepare(e,c,shot,f,base,style);
        P.componentStyles.entry(e,t);
        if(style.visualStyle==='paper')P.componentPaper.draw(e,c,b,t,s,text);
        else if(!P.componentApparatus.draw(e,c,b,t,s,layout))throw Error('Unsupported component kind: '+c.kind);
      }finally{e.ctx.restore();}
    }
  }
})(globalThis.PixelVideo=globalThis.PixelVideo||{});
