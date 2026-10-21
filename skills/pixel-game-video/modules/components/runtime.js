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
  function frame(e,b,t,focus=false){
    const g=e.ctx,u=t.unit,k=8*u;
    g.fillStyle=t.shadow;g.fillRect(b.x+6*u,b.y+8*u,b.width,b.height);
    g.fillStyle=t.edge;
    g.fillRect(b.x+k,b.y,b.width-2*k,b.height);g.fillRect(b.x,b.y+k,b.width,b.height-2*k);
    g.fillStyle=t.panel;g.fillRect(b.x+2*u,b.y+2*u,b.width-4*u,b.height-4*u);
    g.fillStyle=t.inset;g.fillRect(b.x+8*u,b.y+8*u,b.width-16*u,b.height-16*u);
    g.fillStyle=t.edge;
    for(const [x,y] of [[b.x+8*u,b.y+8*u],[b.x+b.width-28*u,b.y+8*u],[b.x+8*u,b.y+b.height-10*u],[b.x+b.width-28*u,b.y+b.height-10*u]])g.fillRect(x,y,20*u,2*u);
    if(focus)g.fillRect(b.x+18*u,b.y+17*u,5*u,b.height-34*u);
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
  function identity(e,c,b,t,s){
    const d=c.data,u=t.unit,p=30*u,hasImage=!!(d.imageKey||d.sourceShot);
    frame(e,b,t,s.focused);
    const imageW=hasImage?b.width*.37:0,x=b.x+p+(hasImage?imageW+24*u:0),w=b.x+b.width-p-x;
    if(hasImage)picture(e,d,box(b.x+p,b.y+p,imageW,b.height-2*p));
    if(d.eyebrow)text(e,d.eyebrow,box(x,b.y+p,w,35*u),25,t.edge,'left',1);
    text(e,d.title,box(x,b.y+b.height*.30,w,b.height*.28),46,t.ink);
    if(d.detail)text(e,d.detail,box(x,b.y+b.height*.65,w,b.height*.23),28,t.muted);
  }
  function metric(e,c,b,t,s){
    const d=c.data,u=t.unit,p=30*u;
    frame(e,b,t,s.focused);
    text(e,d.title,box(b.x+p,b.y+24*u,b.width-2*p,45*u),30,t.muted,'left',1);
    text(e,String(s.value)+(d.unit||''),box(b.x+p,b.y+b.height*.30,b.width-2*p,b.height*.34),Math.min(100,b.height/u*.27),t.edge,'center',1);
    e.ctx.fillStyle=t.edge;e.ctx.fillRect(b.x+p,b.y+b.height*.73,b.width-2*p,3*u);
    if(d.detail)text(e,d.detail,box(b.x+p,b.y+b.height*.78,b.width-2*p,b.height*.16),26,t.ink,'center',1);
  }
  function comparison(e,c,b,t,s){
    const d=c.data,u=t.unit,gap=20*u,p=24*u;
    text(e,d.title,box(b.x,b.y,b.width,54*u),38,t.ink,'left',1);
    const cardW=(b.width-gap*(d.items.length-1))/d.items.length,top=b.y+76*u,h=b.height-76*u;
    d.items.forEach((item,i)=>{
      const tile=box(b.x+i*(cardW+gap),top,cardW,h),active=s.items[i];
      e.ctx.save();if(!active)e.ctx.globalAlpha*=.30;frame(e,tile,t,active);e.ctx.restore();
      if(!active)return;
      text(e,item.title,box(tile.x+p,tile.y+20*u,tile.width-2*p,50*u),32,t.edge,'left',1);
      const hasImage=picture(e,item,box(tile.x+p,tile.y+84*u,tile.width-2*p,h*.43));
      if(item.value)text(e,item.value,box(tile.x+p,tile.y+h*(hasImage?.66:.29),tile.width-2*p,h*.19),hasImage?38:62,t.ink,'center',1);
      if(item.detail)text(e,item.detail,box(tile.x+p,tile.y+h*.82,tile.width-2*p,h*.13),25,t.muted,'center',1);
    });
  }
  function annotation(e,c,b,t){
    const d=c.data,g=e.ctx,u=t.unit,tx=d.targetX*e.width,ty=d.targetY*e.height;
    const sx=tx<b.x?b.x:tx>b.x+b.width?b.x+b.width:b.x+b.width/2;
    const sy=ty<b.y?b.y:ty>b.y+b.height?b.y+b.height:b.y+b.height/2;
    g.strokeStyle=t.edge;g.lineWidth=3*u;g.beginPath();g.moveTo(sx,sy);g.lineTo((sx+tx)/2,sy);g.lineTo(tx,ty);g.stroke();
    g.fillStyle=t.edge;g.fillRect(tx-5*u,ty-5*u,10*u,10*u);
    frame(e,b,t);text(e,d.label,box(b.x+18*u,b.y+12*u,b.width-36*u,b.height-24*u),30,t.ink,'center',1);
  }
  function chapter(e,c,b,t){
    const d=c.data,g=e.ctx,u=t.unit,n=Math.min(b.height*.56,150*u),x=b.x,y=b.y+(b.height-n)/2;
    g.strokeStyle=t.edge;g.lineWidth=4*u;g.strokeRect(x,y,n,n);
    g.fillStyle=t.inset;g.fillRect(x+8*u,y+8*u,n-16*u,n-16*u);
    text(e,d.index,box(x+12*u,y+12*u,n-24*u,n-24*u),48,t.edge,'center',1);
    const tx=x+n+34*u,tw=b.width-n-34*u;
    text(e,d.title,box(tx,b.y+b.height*.18,tw,b.height*.34),52,t.ink,'left',1);
    g.fillStyle=t.edge;g.fillRect(tx,b.y+b.height*.60,Math.min(tw,180*u),3*u);
    if(d.detail)text(e,d.detail,box(tx,b.y+b.height*.69,tw,b.height*.20),28,t.muted,'left',1);
  }
  function heading(e,d,b,t){text(e,d.title,box(b.x,b.y,b.width,54*t.unit),38,t.ink,'left',1);}
  function stroke(e,points,color,width){
    const g=e.ctx;g.strokeStyle=color;g.lineWidth=width;g.beginPath();
    points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.stroke();
  }
  function flow(e,c,b,t,s){
    const d=c.data,u=t.unit,g=e.ctx,gap=38*u,w=(b.width-gap*(d.items.length-1))/d.items.length;
    heading(e,d,b,t);
    const h=Math.min((b.height-88*u)*.82,320*u),top=b.y+88*u+(b.height-88*u-h)/2;
    d.items.forEach((item,i)=>{
      const x=b.x+i*(w+gap),cy=top+h/2,active=s.items[i];
      if(i){
        const color=active?t.edge:e.colors.muted;
        stroke(e,[[x-gap+8*u,cy],[x-8*u,cy]],color,3*u);
        stroke(e,[[x-16*u,cy-7*u],[x-8*u,cy],[x-16*u,cy+7*u]],color,3*u);
      }
      g.save();if(!active)g.globalAlpha*=.35;frame(e,box(x,top,w,h),t,s.current===i);
      text(e,String(i+1).padStart(2,'0'),box(x+32*u,top+20*u,w-52*u,38*u),25,t.edge,'left',1);
      text(e,item.title,box(x+20*u,top+h*.30,w-40*u,h*.25),34,t.ink,'center',2);
      if(item.detail)text(e,item.detail,box(x+20*u,top+h*.66,w-40*u,h*.25),25,t.muted,'center',2);
      g.restore();
    });
  }
  function timeline(e,c,b,t,s){
    const d=c.data,u=t.unit,g=e.ctx,w=b.width/d.items.length,y=b.y+b.height*.46;
    heading(e,d,b,t);
    stroke(e,[[b.x+w/2,y],[b.x+b.width-w/2,y]],e.colors.muted,3*u);
    if(s.current>0)stroke(e,[[b.x+w/2,y],[b.x+w*(s.current+.5),y]],t.edge,5*u);
    d.items.forEach((item,i)=>{
      const x=b.x+i*w,cx=x+w/2,active=s.items[i];
      g.save();if(!active)g.globalAlpha*=.35;
      text(e,item.label,box(x+8*u,y-b.height*.20,w-16*u,b.height*.13),27,t.edge,'center',2);
      g.fillStyle=t.panel;g.fillRect(cx-15*u,y-15*u,30*u,30*u);
      g.strokeStyle=t.edge;g.lineWidth=3*u;g.strokeRect(cx-15*u,y-15*u,30*u,30*u);
      if(active){g.fillStyle=t.edge;g.fillRect(cx-8*u,y-8*u,16*u,16*u);}
      text(e,item.title,box(x+12*u,y+34*u,w-24*u,b.height*.14),32,t.ink,'center',2);
      if(item.detail)text(e,item.detail,box(x+12*u,y+b.height*.24,w-24*u,b.height*.22),24,t.muted,'center',2);
      g.restore();
    });
  }
  function checklist(e,c,b,t,s){
    const d=c.data,u=t.unit,g=e.ctx,p=28*u;
    frame(e,b,t,s.focused);
    text(e,d.title,box(b.x+p,b.y+23*u,b.width*.72,48*u),34,t.ink,'left',1);
    text(e,`${s.completed} / ${d.items.length}`,box(b.x+b.width*.77,b.y+23*u,b.width*.18,48*u),28,t.edge,'right',1);
    const row=(b.height-108*u)/d.items.length;
    d.items.forEach((item,i)=>{
      const y=b.y+86*u+i*row,cy=y+row/2,done=s.items[i];
      stroke(e,[[b.x+p,y+row-4*u],[b.x+b.width-p,y+row-4*u]],t.panel,2*u);
      g.strokeStyle=done?t.edge:t.muted;g.lineWidth=2*u;g.strokeRect(b.x+p,cy-15*u,30*u,30*u);
      if(done)stroke(e,[[b.x+p+6*u,cy],[b.x+p+13*u,cy+7*u],[b.x+p+25*u,cy-9*u]],t.edge,4*u);
      const x=b.x+p+52*u,w=b.width-2*p-52*u;
      text(e,item.label,box(x,y+row*(item.detail?.05:.18),w,row*(item.detail?.47:.64)),30,done?t.ink:t.muted,'left',1);
      if(item.detail)text(e,item.detail,box(x,y+row*.53,w,row*.39),23,t.muted,'left',1);
    });
  }
  function hierarchy(e,c,b,t,s){
    const d=c.data,u=t.unit,g=e.ctx,top=b.y+82*u,body=b.height-82*u,rw=b.width*.28,rh=Math.min(body*.46,220*u);
    heading(e,d,b,t);
    const root=box(b.x,top+(body-rh)/2,rw,rh),mid=top+body/2,lx=b.x+b.width*.46,row=body/d.items.length;
    d.items.forEach((item,i)=>{
      const y=top+i*row+8*u,h=row-16*u,cy=y+h/2,knee=b.x+b.width*.37,active=s.items[i];
      g.save();if(!active)g.globalAlpha*=.35;
      stroke(e,[[b.x+rw,mid],[knee,mid],[knee,cy],[lx,cy]],t.edge,3*u);
      frame(e,box(lx,y,b.width*.54,h),t,active);
      text(e,item.title,box(lx+26*u,y+h*(item.detail?.10:.20),b.width*.54-52*u,h*(item.detail?.43:.60)),30,t.ink,'left',1);
      if(item.detail)text(e,item.detail,box(lx+26*u,y+h*.57,b.width*.54-52*u,h*.31),23,t.muted,'left',1);
      g.restore();
    });
    frame(e,root,t,true);
    text(e,d.rootTitle,box(root.x+22*u,root.y+rh*(d.detail?.18:.20),rw-44*u,rh*(d.detail?.40:.60)),36,t.ink,'center',2);
    if(d.detail)text(e,d.detail,box(root.x+22*u,root.y+rh*.68,rw-44*u,rh*.22),24,t.muted,'center',1);
  }
  function bars(e,c,b,t,s){
    const d=c.data,u=t.unit,g=e.ctx,left=b.x+b.width*.22,pw=b.width*.58,top=b.y+84*u,body=b.height-144*u,row=body/d.items.length;
    heading(e,d,b,t);
    [0,.5,1].forEach(p=>{
      g.save();g.globalAlpha*=.22;stroke(e,[[left+pw*p,top],[left+pw*p,top+body]],t.muted,2*u);g.restore();
      text(e,String(d.max*p),box(left+pw*p-60*u,top+body+12*u,120*u,38*u),22,t.muted,'center',1);
    });
    d.items.forEach((item,i)=>{
      const cy=top+row*(i+.5),h=Math.min(34*u,row*.31),progress=s.progress[i];
      text(e,item.label,box(b.x,cy-28*u,b.width*.19,56*u),30,s.items[i]?t.ink:t.muted,'right',1);
      g.fillStyle=t.panel;g.fillRect(left,cy-h/2,pw,h);
      g.fillStyle=t.edge;g.fillRect(left,cy-h/2,pw*item.value/d.max*progress,h);
      const value=progress===1?item.value:Number((item.value*progress).toFixed(2));
      text(e,String(value)+(d.unit||''),box(left+pw+18*u,cy-28*u,b.width*.18-18*u,56*u),28,t.ink,'left',1);
    });
  }
  function code(e,c,b,t,s){
    const d=c.data,u=t.unit,g=e.ctx,p=28*u;
    frame(e,b,t,s.focused);
    text(e,d.title,box(b.x+p,b.y+20*u,b.width*.70,48*u),34,t.ink,'left',1);
    if(d.language)text(e,d.language,box(b.x+b.width*.75,b.y+20*u,b.width*.21-p,48*u),23,t.edge,'right',1);
    stroke(e,[[b.x+p,b.y+82*u],[b.x+b.width-p,b.y+82*u]],t.edge,2*u);
    const row=(b.height-118*u)/d.items.length,top=b.y+98*u;
    if(row<40*u)throw new Error('Code rows are too short; enlarge the component or show fewer lines');
    d.items.forEach((item,i)=>{
      const y=top+i*row,active=s.current===i;
      if(active){g.save();g.globalAlpha*=.15;g.fillStyle=t.edge;g.fillRect(b.x+p,y,b.width-2*p,row);g.restore();g.fillStyle=t.edge;g.fillRect(b.x+p,y,4*u,row);}
      text(e,String(i+1),box(b.x+p+10*u,y,40*u,row),22,t.muted,'center',1);
      g.save();g.font=`500 ${30*u}px Consolas, "Microsoft YaHei", monospace`;
      if(g.measureText(item.text).width>b.width-2*p-84*u)throw new Error('Code line overflows; widen the component or shorten the line');
      g.fillStyle=active?t.ink:t.muted;g.textBaseline='middle';g.textAlign='left';g.fillText(item.text,b.x+p+70*u,y+row/2);g.restore();
    });
  }
  function takeaway(e,c,b,t){
    const d=c.data,u=t.unit,g=e.ctx,x=b.x+38*u,w=b.width-38*u;
    g.fillStyle=t.edge;g.fillRect(b.x,b.y+12*u,8*u,b.height-24*u);
    if(d.eyebrow)text(e,d.eyebrow,box(x,b.y,w,b.height*.13),25,t.edge,'left',1);
    text(e,d.title,box(x,b.y+b.height*.23,w,b.height*.42),64,t.ink,'left',2);
    if(d.detail)text(e,d.detail,box(x,b.y+b.height*.75,w,b.height*.20),29,t.muted,'left',2);
  }
  const renderers={identity,metric,comparison,annotation,chapter,flow,timeline,checklist,hierarchy,bars,code,takeaway};
  P.components={state,draw(e,shot,f){
    for(const c of shot.components||[]){
      const s=state(c,shot,f,e.fps);if(!s.visible||s.alpha<=0)continue;
      const t=tokens(e,c),b=box(c.x*e.width,c.y*e.height,c.width*e.width,c.height*e.height);
      e.ctx.save();e.ctx.globalAlpha*=s.alpha;
      renderers[c.kind](e,c,b,t,s);e.ctx.restore();
    }
  }};
})(globalThis.PixelVideo=globalThis.PixelVideo||{});
