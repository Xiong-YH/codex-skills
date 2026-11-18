(function(P){
  'use strict';
  const {box,offset,inset,cx,cy,out,rect,poly,plate,border,line,alpha,crop,tone,paper,chip,panel,icon,spark}=P.componentLook;
  const text=(...args)=>P.componentText.text(...args);

  function identity(e,c,b,p,s,t){
    const g=e.ctx,d=c.data;
    if(d.fit==='full'){
      P.componentText.picture(e,d,b,'cover');
      text(e,d.title,box(b.x+b.w*.14,b.y+b.h*.16,b.w*.71,b.h*.44),Math.min(37,b.h*.29),p.ink);
      return;
    }
    paper(g,b,p,{layers:t.layers});
    const frame=P.componentText.portraitBounds(b);
    const visual=P.componentText.picture(e,d,frame);
    const gap=Math.min(25,b.w*.065,b.h*.17);
    const left=visual?b.x+b.w*.37+gap:b.x+gap;
    const inner=box(left,b.y+gap,b.x+b.w-gap-left,b.h-gap*2);
    if(s.focused)rect(g,b.x+5,b.y+10,3,b.h-22,t.ink.edge);
    if(d.eyebrow){
      const tag=box(left,inner.y,Math.min(inner.w,d.eyebrow.length*15+28),inner.h*.22);
      chip(g,tag,t.ink,6);
      text(e,d.eyebrow,inset(tag,9,0),17,t.ink.ink,{align:'center'});
    }
    const start=d.eyebrow?.29:0;
    text(e,d.title,box(left,inner.y+inner.h*start,inner.w,inner.h*(d.detail?.45:.82-start)),60,p.ink,{rows:2,weight:850});
    if(d.detail){
      line(g,left,inner.y+inner.h*.73,left+inner.w,inner.y+inner.h*.73,p.rule,1.7);
      text(e,d.detail,box(left,inner.y+inner.h*.75,inner.w,inner.h*.25),25,p.muted,{rows:2});
    }
  }

  function chapter(e,c,b,p,s,t){
    const g=e.ctx,d=c.data;
    const shift=1-out(t.phase(c.showEvent,.30));
    const b0=offset(b,0,shift*14);
    const insetPad=Math.min(14,b0.h*.10,b0.w*.03);
    plate(g,offset(b0,7,13),'#171e1bb5',19);
    border(g,b0,'#28423c','#b09061',4,18);
    border(g,inset(b0,insetPad),'#28423c','#d7b882',2,13);
    const side=Math.min(b0.w*.13,b0.h*.48);
    const badge=box(b0.x+insetPad*2,b0.y+(b0.h-side)/2,side,side);
    chip(g,badge,t.ink,8);
    text(e,d.index,inset(badge,6),Math.min(33,side*.45),t.ink.ink,{align:'center'});
    const left=badge.x+side+insetPad*1.8;
    const title=box(left,b0.y+b0.h*(d.detail?.10:.16),b0.x+b0.w-left-insetPad*2,b0.h*(d.detail?.50:.68));
    text(e,d.title,offset(title,0,5),72,'#8d603a',{weight:900});
    text(e,d.title,title,72,p.ivory,{weight:900});
    if(d.detail)text(e,d.detail,box(left,b0.y+b0.h*.62,title.w,b0.h*.20),25,'#cfd8b8',{weight:720});
    rect(g,b0.x+2*insetPad,b0.y+b0.h-insetPad*1.7,b0.w-4*insetPad,2,'#d5b27b');
    spark(g,b0.x+b0.w-insetPad*2,b0.y+insetPad,t.since(c.showEvent,.24),'#eac88a');
  }

  function metric(e,c,b,p,s,t){
    const g=e.ctx,d=c.data;
    const danger=c.tone==='danger', locked=s.metricProgress===1;
    const face=danger?'#e5c7b9':d.from!==d.to?'#d6ac75':p.cream;
    paper(g,b,p,{layers:Math.max(2,t.layers),face});
    const h=b.h,w=b.w, margin=Math.min(w*.08,24);
    const area=box(b.x+margin,b.y+h*.29,w-2*margin,h*(d.detail?.47:.59));
    const titleColor=danger?t.ink.ink:'#59422f';
    text(e,d.title,box(b.x+margin,b.y+h*.045,w-2*margin,h*.22),34,titleColor,{align:'center',weight:850});
    const compatible=Number.isInteger(d.from)&&Number.isInteger(d.to)&&d.from>=0&&d.to>=d.from&&d.to<1e6;
    const monospace='Consolas, "IBM Plex Mono", monospace';
    if(compatible&&d.to>0&&!danger){
      const digits=Math.max(String(d.to).length,String(d.from).length);
      const gap=Math.min(9,area.w*.035);
      const cell=Math.min((area.w-gap*(digits-1))/digits,area.h*.98);
      const left=cx(area)-(digits*cell+(digits-1)*gap)/2;
      for(let i=0;i<digits;i++){
        const place=10**(digits-1-i);
        const whole=Math.floor(s.exact/place)%10;
        const step=locked?0:P.clamp(s.exact%place-(place-1));
        const tile=box(left+i*(cell+gap),area.y,cell,area.h);
        border(g,tile,p.well,'#9a805d',2.6,9);
        crop(g,inset(tile,4),()=>{
          const style={align:'center',weight:850,font:monospace};
          const digitSize=Math.min(94,area.h*.78);
          text(e,String(whole),offset(tile,0,-area.h*step),digitSize,p.ivory,style);
          if(step>0)text(e,String((whole+1)%10),offset(tile,0,area.h*(1-step)),digitSize,p.ivory,style);
        });
      }
    }else{
      if(!danger)border(g,area,p.well,'#9a805d',2.5,9);
      text(e,String(s.value),inset(area,8,0),95,danger?t.ink.ink:p.ivory,{align:'center',weight:850,font:monospace});
    }
    if(d.detail)text(e,d.detail,box(b.x+margin,b.y+h*.80,w-2*margin,h*.14),22,p.ink,{align:'center'});
    if(d.unit)text(e,d.unit,box(b.x+margin,b.y+h*.88,w-2*margin,h*.09),18,titleColor,{align:'right'});
    if(locked&&d.to!==d.from)spark(g,b.x+w-margin,area.y+area.h*.63,t.since(d.endEvent,.24),'#f2d39c',12);
  }

  function tag(e,c,b,p,s,t){
    const g=e.ctx,d=c.data;
    const entry=out(t.phase(c.showEvent,.20));
    const exit=d.endEvent?t.phase(d.endEvent,.24):0;
    const home=offset(b,0,9*(1-entry)-21*exit);
    alpha(g,1-exit,()=>{
      chip(g,home,t.ink);
      const gap=Math.min(10,home.w*.07);
      const art=d.icon?Math.min(home.h*.50,home.w*.17):0;
      if(art)icon(g,d.icon,box(home.x+gap,cy(home)-art/2,art,art),t.ink.ink,2.2);
      text(e,d.title,box(home.x+gap+art,home.y,home.w-2*gap-art,home.h),32,t.ink.ink,{align:'center',weight:790});
    });
  }

  function chat(e,c,b,p,s,t){
    const g=e.ctx,d=c.data, visible=d.visibleRows||3;
    const head=Math.min(b.h*.17,48);
    const gap=Math.min(15,b.w*.026);
    const header=box(b.x+6,b.y+6,b.w-12,head);
    const view=box(b.x+gap,b.y+head+13,b.w-2*gap,b.h-head-30);
    const step=view.h/visible;
    const scroll=d.items.slice(visible).reduce((total,item)=>total+out(t.phase(item.event,.25)),0);
    panel(g,b,p);
    border(g,header,'#38574d','#58766b',1.6,9);
    rect(g,b.x+gap+5,cy(header)-4,8,8,'#bed4ad');
    text(e,d.title,box(b.x+gap+24,header.y,header.w-gap-23,header.h),27,p.ivory,{weight:820});
    crop(g,view,()=>{
      d.items.forEach((item,i)=>{
        const age=t.age(item.event);
        if(age<0)return;
        const k=out(t.phase(item.event,.23)), outgoing=item.side==='outgoing';
        const height=step*.81;
        const art=Math.min(height*.47,view.w*.085,42);
        const lane=view.w-2*(art+18);
        g.font=`800 30px ${e.style.fontFamily}`;
        const width=Math.min(lane,Math.max(lane*.76,g.measureText(item.text).width+46));
        const left=outgoing?view.x+view.w-art-12-width:view.x+art+12;
        const target=box(left,view.y+(i-scroll)*step+step*.07,width,height);
        const bubble=offset(target,(outgoing?1:-1)*(1-k)*34,(1-k)*15);
        const badge=box(outgoing?bubble.x+bubble.w+8:bubble.x-art-8,cy(bubble)-art/2,art,art);
        const rim=outgoing?'#b19873':'#729989';
        alpha(g,k,()=>{
          plate(g,offset(bubble,3,6),'#192928',11);
          border(g,bubble,outgoing?'#e7d7b2':'#426861',rim,2.6,11);
          rect(g,bubble.x+8,bubble.y+10,4,bubble.h-20,outgoing?'#c59d69':'#b3cfa8');
          chip(g,badge,tone(e,outgoing?'gold':'secondary'),7);
          if(!P.componentText.picture(e,item,inset(badge,4),'cover'))
            icon(g,'person',inset(badge,8),outgoing?'#76553d':'#d9e2be',2);
          alpha(g,out((k-.62)/.38),()=>text(e,item.text,inset(bubble,21,7),30,outgoing?'#293b3b':'#fff0d6',{rows:3}));
        });
        const landing=t.since(item.event,.23)-.54;
        spark(g,outgoing?bubble.x+bubble.w:bubble.x,bubble.y+height*.55,landing,outgoing?'#eec589':'#aaded0',10);
      });
    });
  }

  function action(e,c,b,p,s,t){
    const g=e.ctx,d=c.data;
    const w=b.w,h=b.h;
    const bezel=box(b.x+w*.075,b.y,w*.85,h*.80);
    panel(g,bezel,p);
    const screen=inset(bezel,w*.035,h*.043);
    const header=box(screen.x,screen.y,screen.w,screen.h*.22);
    border(g,screen,'#e6dbb6','#809982',2.7,9);
    plate(g,header,'#516e5d',8);
    const art=Math.min(header.h*.56,28);
    icon(g,d.icon||'project',box(header.x+13,cy(header)-art/2,art,art),'#ecd8a7',2.1);
    text(e,d.title,box(header.x+art+25,header.y,header.w*(d.eyebrow?.67:.87),header.h),26,p.ivory);
    if(d.eyebrow)text(e,d.eyebrow,box(header.x+header.w*.77,header.y,header.w*.20,header.h),22,'#ebd6a2',{align:'right'});
    const body=box(screen.x+screen.w*.045,header.y+header.h+screen.h*.08,screen.w*.91,screen.h*.61);
    const left=box(body.x,body.y,body.w*.32,body.h);
    border(g,left,'#b7ccb0','#90ac91',2.5,10);
    icon(g,d.icon||'project',inset(left,Math.min(left.w,left.h)*.24),p.ink,3);
    const right=box(left.x+left.w+body.w*.07,body.y,body.w*.61,body.h);
    text(e,d.label,box(right.x,right.y,right.w,right.h*.42),36,p.ink,{weight:850});
    rect(g,right.x,right.y+right.h*.48,right.w,2,p.muted);
    const age=t.since(d.startEvent,.24), pressed=age>=0;
    const release=out(age);
    const button=box(right.x,right.y+right.h*.66+(pressed?Math.sin(release*Math.PI)*6:0),right.w,right.h*.32);
    const style=tone(e,pressed?'accent':'gold');
    chip(g,button,style,9);
    text(e,pressed?d.detail:d.button,inset(button,8,0),27,style.ink,{align:'center',weight:830});
    if(pressed)spark(g,button.x+button.w*.82,button.y+button.h*.55,age,'#fff0c3',15);
    const top=bezel.y+bezel.h-h*.016, bottom=b.y+b.h;
    poly(g,[[bezel.x,top],[bezel.x+bezel.w,top],[b.x+w,bottom-h*.03],[b.x,bottom-h*.03]],'#416055');
    poly(g,[[b.x,bottom-h*.03],[b.x+w,bottom-h*.03],[b.x+w*.98,bottom],[b.x+w*.02,bottom]],'#192d2c');
    for(let row=0;row<3;row++){
      for(let key=0;key<11;key++)rect(g,b.x+w*(.108+key*.072-row*.011),top+h*(.032+.035*row),w*.063,h*.015,'#273e37');
    }
    border(g,box(b.x+w*.41,bottom-h*.086,w*.18,h*.035),'#2c493e','#899c81',1.6,5);
  }

  function annotation(e,c,b,p,s,t){
    const g=e.ctx,d=c.data, x=d.targetX*1280,y=d.targetY*720;
    const from=x<cx(b)?b.x:b.x+b.w;
    const span=out(t.phase(c.showEvent,.24));
    line(g,from,cy(b),from+(x-from)*span,cy(b)+(y-cy(b))*span,t.ink.edge,2.5);
    plate(g,box(x-4,y-4,8,8),t.ink.face,3);
    chip(g,b,t.ink,8);
    text(e,d.label,inset(b,8,0),27,t.ink.ink,{align:'center',rows:2});
  }

  function takeaway(e,c,b,p,s,t){
    const g=e.ctx,d=c.data;
    panel(g,b,p);
    const inner=inset(b,Math.min(b.w*.065,42),b.h*.13);
    const hasDetail=Boolean(d.detail);
    if(d.eyebrow){
      const marker=box(inner.x,inner.y,Math.min(inner.w*.48,d.eyebrow.length*20+24),inner.h*.21);
      chip(g,marker,t.ink,7);
      text(e,d.eyebrow,inset(marker,7,0),22,t.ink.ink,{align:'center'});
    }
    const title=box(inner.x,inner.y+inner.h*(d.eyebrow?.23:0),inner.w,inner.h*(hasDetail?.49:.77));
    text(e,d.title,title,52,p.ivory,{rows:2,weight:850});
    if(hasDetail){
      rect(g,inner.x,inner.y+inner.h*.75,inner.w*.70,2,'#718d79');
      text(e,d.detail,box(inner.x,inner.y+inner.h*.78,inner.w,inner.h*.22),25,'#b7ceb6',{rows:2});
    }
  }

  P.componentElements={identity,chapter,metric,chat,tag,action,annotation,takeaway};
})(globalThis.PixelVideo=globalThis.PixelVideo||{});
