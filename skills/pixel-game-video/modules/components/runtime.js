(function(P){
  'use strict';
  const L=P.componentLook;
  const words=new Intl.Segmenter('zh',{granularity:'word'});

  function countProgress(p,curve){
    if(curve!=='accelerate')return p;
    const knee=.86, head=.81, power=2.5;
    if(p<knee)return head*(p/knee)**power;
    const tail=head*power*(1-knee)/(knee*(1-head));
    return 1-(1-head)*((1-p)/(1-knee))**tail;
  }

  function state(c,shot,frame,fps=60){
    const at=id=>P.scenes.eventFrame(shot,id), show=at(c.showEvent), d=c.data;
    const result={visible:frame>=show,alpha:L.out((frame-show)/(fps*.16)),focused:!!c.focusEvent&&frame>=at(c.focusEvent)};
    if(d.items){
      result.items=d.items.map(item=>frame>=at(item.event));
      result.current=result.items.lastIndexOf(true);
      result.completed=result.items.filter(Boolean).length;
    }
    if(c.kind==='metric'){
      const p=P.clamp((frame-at(d.startEvent))/Math.max(1,at(d.endEvent)-at(d.startEvent)));
      result.metricProgress=p;
      result.exact=d.from+(d.to-d.from)*countProgress(p,d.curve);
      result.value=p===1?d.to:p===0?d.from:Number(result.exact.toFixed(2));
    }
    if(c.kind==='bars'){
      result.progress=d.items.map(i=>P.clamp((frame-at(i.event))/Math.max(1,at(i.endEvent)-at(i.event))));
    }
    return result;
  }

  function lines(g,value,width){
    const result=[];
    for(const paragraph of String(value).split('\n')){
      let row='';
      for(const {segment} of words.segment(paragraph)){
        const breaksBefore=/^[，。！？、；：」）》]/u.test(segment);
        if(row&&!breaksBefore&&g.measureText(row+segment).width>width){result.push(row);row='';}
        row+=segment;
      }
      result.push(row);
    }
    return result;
  }

  function text(e,value,b,size,color,{align='left',rows=1,weight=760,font=e.style.fontFamily}={}){
    if(value===undefined||value===''||b.w<=0||b.h<=0)return;
    const g=e.ctx;
    // Standard hundreds are interpreted consistently by browser Canvas and Skia.
    const fontWeight=Math.round(weight/100)*100;
    let px=Math.min(size,b.h*.82), fitted=[String(value)];
    g.save();
    try{
      // Fit inside the authored geometry, then leave the same alignment for every frame.
      for(let attempt=0;attempt<16;attempt++){
        g.font=`${fontWeight} ${px}px ${font}`;
        if(rows>1)fitted=lines(g,value,b.w);
        const widest=Math.max(...fitted.map(row=>g.measureText(row).width));
        if(fitted.length<=rows&&widest<=b.w+.01&&px*(1+(fitted.length-1)*1.19)<=b.h)break;
        const ratio=Math.min(1,b.w/Math.max(1,widest),b.h/(px*(1+(fitted.length-1)*1.19)));
        px*=Math.min(.91,ratio);
      }
      g.textAlign=align;
      g.textBaseline='middle';
      g.fillStyle=color;
      const x=b.x+(align==='center'?b.w/2:align==='right'?b.w:0), y=L.cy(b);
      fitted.forEach((row,i)=>g.fillText(row,Math.round(x),Math.round(y+px*1.19*(i-(fitted.length-1)/2)),b.w));
    }finally{g.restore();}
  }

  function picture(e,data,b,fit='contain'){
    const img=data.sourceShot?e.shotPreview(data.sourceShot):data.imageKey&&
      (e.frameAssets?.(data.imageKey,e.frame)||e.assets[data.imageKey]);
    if(!img)return false;
    P.media.image(e,img,{x:b.x,y:b.y,width:b.w,height:b.h},data.sourceShot?'cover':fit);
    return true;
  }

  function portraitBounds(b){
    const gap=Math.min(23,b.w*.062,b.h*.14);
    return L.box(b.x+gap,b.y+gap,b.w*.36-gap,b.h-2*gap);
  }

  function imageBounds(e,component,b){
    const scale=e.height/720;
    if(component.data.fit==='full')return b;
    const q=portraitBounds(L.box(b.x/scale,b.y/scale,b.width/scale,b.height/scale));
    return {x:q.x*scale,y:q.y*scale,width:q.w*scale,height:q.h*scale};
  }

  function draw(e,shot,frame){
    const p=L.colors(e), fps=e.fps||60, g=e.ctx, scale=e.height/720;
    for(const c of shot.components||[]){
      const s=state(c,shot,frame,fps);
      if(!s.visible||!s.alpha)continue;
      const w=e.width/scale,h=e.height/scale;
      const home=L.box(c.x*w,c.y*h,c.width*w,c.height*h);
      const age=id=>frame-P.scenes.eventFrame(shot,id);
      const phase=(id,duration=.24)=>P.clamp(age(id)/Math.max(1,Math.round(duration*fps)));
      const since=(id,duration=.24)=>age(id)/Math.max(1,Math.round(duration*fps));
      const t={phase,since,age,ink: L.tone(e,c.tone),layers:c.features?.includes('stack')?3:1};
      let b=home;
      if(c.entryFrom){
        const travel=L.out(phase(c.showEvent,.26));
        b=L.offset(home,(c.entryFrom[0]*w-home.x)*(1-travel),
          (c.entryFrom[1]*h-home.y)*(1-travel)-Math.sin(travel*Math.PI)*h*.035);
      }
      const renderer=P.componentElements[c.kind]||P.componentCollections[c.kind]||P.componentInformation[c.kind];
      if(!renderer)throw Error('Unsupported component kind: '+c.kind);
      const dim=c.dimEvent?L.out(phase(c.dimEvent,.33))*.28:0;
      L.alpha(g,s.alpha*(1-dim),()=>{
        g.scale(scale,scale);
        renderer(e,c,b,p,s,t);
      });
    }
  }

  P.componentText={text,picture,portraitBounds};
  P.components=P.componentRenderer={state,draw,imageBounds};
})(globalThis.PixelVideo=globalThis.PixelVideo||{});
