(function(P){
  'use strict';
  const {box,offset,inset,cx,cy,out,rect,border,line,alpha,tone,paper,chip,notebook,panel,icon,spark}=P.componentLook;
  const text=(...args)=>P.componentText.text(...args);

  function heading(e,title,area,p){
    const head=box(area.x,area.y,area.w,area.h*.19);
    text(e,title,head,37,p.ink,{weight:850});
    line(e.ctx,head.x,head.y+head.h,head.x+head.w,head.y+head.h,p.rule,1.8);
  }

  function flow(e,c,b,p,s,t){
    const d=c.data,g=e.ctx;
    const area=notebook(g,b,p);
    heading(e,d.title,area,p);
    const n=d.items.length,gap=Math.min(24,area.w*.044),w=(area.w-gap*(n-1))/n;
    d.items.forEach((item,i)=>{
      const x=area.x+i*(w+gap), base=box(x,area.y+area.h*.36,w,area.h*.36);
      const k=out(t.phase(item.event,.23));
      if(i)icon(g,'arrow',box(x-gap+3,cy(base)-gap/2,gap-5,gap),s.items[i]?p.ink:p.rule,2);
      border(g,base,'#e4d7b5','#c3b38d',2,8);
      if(!s.items[i])return;
      const current=i===s.current;
      const skin=tone(e,current?'gold':'accent');
      const node=offset(base,0,(1-k)*11);
      alpha(g,k,()=>{
        chip(g,node,skin,9);
        text(e,item.title,inset(node,7,0),27,skin.ink,{align:'center',rows:2,weight:850});
        if(item.detail)text(e,item.detail,box(x,node.y+node.h+13,w,area.h*.19),20,p.muted,{align:'center',rows:2});
      });
      if(current)spark(g,cx(node),node.y,t.since(item.event,.22),'#f1ca7c',8);
    });
  }

  function timeline(e,c,b,p,s,t){
    const d=c.data,g=e.ctx;
    const area=notebook(g,b,p);
    heading(e,d.title,area,p);
    const n=d.items.length, slot=area.w/n, mid=area.y+area.h*.56;
    const x0=area.x+slot*.5;
    line(g,x0,mid,area.x+area.w-slot*.5,mid,p.rule,3);
    if(s.current>=1)line(g,x0,mid,x0+slot*s.current,mid,p.muted,3);
    d.items.forEach((item,i)=>{
      const live=s.items[i], chosen=i===s.current,x=x0+slot*i;
      const skin=tone(e,chosen?'gold':live?'accent':'secondary');
      const point=box(x-8,mid-6,16,16);
      border(g,point,skin.face,skin.edge,2,5);
      const tag=box(x-slot*.43,area.y+area.h*.29,slot*.86,area.h*.15);
      chip(g,tag,skin,6);
      text(e,item.label,inset(tag,6,0),24,skin.ink,{align:'center'});
      const label=box(x-slot*.45,mid+20,slot*.9,area.h*.20);
      text(e,item.title,label,25,live?p.ink:p.muted,{align:'center',rows:2,weight:820});
      if(item.detail)text(e,item.detail,offset(label,0,label.h),17,p.muted,{align:'center'});
      if(chosen)spark(g,x,mid,t.since(item.event,.22),'#efc88b',6);
    });
  }

  function hierarchy(e,c,b,p,s,t){
    const g=e.ctx,d=c.data;
    const area=notebook(g,b,p);
    heading(e,d.title,area,p);
    const parent=box(area.x+area.w*.23,area.y+area.h*.26,area.w*.54,area.h*.20);
    const host=tone(e,'secondary');
    chip(g,parent,host,9);
    text(e,d.rootTitle,inset(parent,10,0),31,host.ink,{align:'center'});
    const mid=area.y+area.h*.56,n=d.items.length,gap=area.w*.035,w=(area.w-gap*(n-1))/n;
    line(g,cx(parent),parent.y+parent.h,cx(parent),mid,p.muted,2.5);
    line(g,area.x+w/2,mid,area.x+area.w-w/2,mid,p.rule,2.5);
    d.items.forEach((item,i)=>{
      const home=box(area.x+(gap+w)*i,area.y+area.h*.68,w,area.h*(d.detail?.17:.24));
      const live=s.items[i];
      line(g,cx(home),mid,cx(home),home.y,live?p.muted:p.rule,2.4);
      paper(g,home,p,{layers:1,face:live?'#dbe2bf':'#e4d7b7',corner:8});
      const title=item.detail?box(home.x+8,home.y,home.w-16,home.h*.58):inset(home,8,2);
      text(e,item.title,title,25,live?p.ink:p.muted,{align:'center',rows:2});
      if(item.detail)text(e,item.detail,box(home.x+7,home.y+home.h*.58,home.w-14,home.h*.38),17,p.muted,{align:'center'});
      if(live)spark(g,cx(home),home.y,t.since(item.event,.22),'#e5c386',5);
    });
    if(d.detail)text(e,d.detail,box(area.x,area.y+area.h*.88,area.w,area.h*.12),20,p.muted,{align:'center'});
  }

  function bars(e,c,b,p,s,t){
    const d=c.data,g=e.ctx;
    const area=notebook(g,b,p);
    heading(e,d.title,area,p);
    const start=area.x+area.w*.26, labelW=start-area.x-15;
    const trackW=area.w*.59, bottom=area.y+area.h*.88, top=area.y+area.h*.29;
    const row=(bottom-top)/d.items.length;
    for(let tick=0;tick<=4;tick++){
      const x=start+trackW*tick/4;
      line(g,x,top-7,x,bottom,p.rule,tick?1:2);
    }
    d.items.forEach((item,i)=>{
      const y=top+row*i;
      const b0=box(start,y+row*.21,trackW,row*.53);
      border(g,b0,'#e3d7b4','#b9aa81',1.5,5);
      const pct=s.progress[i], ratio=item.value/d.max;
      rect(g,b0.x,b0.y+1,b0.w*ratio*pct,b0.h-2,i===s.current?'#caa06d':'#a0bea0');
      if(pct>0)rect(g,b0.x,b0.y+2,b0.w*ratio*pct,2,'#e1e7c3');
      text(e,item.label,box(area.x,y,labelW,row),24,p.ink,{rows:2});
      text(e,s.items[i]?String(Math.round(item.value*pct*100)/100)+(d.unit||''):'',
        box(start+trackW+13,y,area.w*.14,row),24,p.ink,{align:'right'});
    });
    text(e,'0',box(start-6,bottom+5,22,area.h*.09),18,p.muted);
    text(e,String(d.max),box(start+trackW-40,bottom+5,53,area.h*.09),18,p.muted,{align:'right'});
  }

  function code(e,c,b,p,s,t){
    const g=e.ctx,d=c.data;
    panel(g,b,p);
    const area=inset(b,Math.min(b.w*.06,27),Math.min(b.h*.085,23));
    const head=box(area.x,area.y,area.w,area.h*.16);
    border(g,head,'#405e56','#6e9580',2,8);
    icon(g,'project',box(head.x+11,head.y+head.h*.21,head.h*.57,head.h*.57),'#d8e1b8',2);
    text(e,d.title,box(head.x+head.h*.73+13,head.y,head.w*.73,head.h),29,p.ivory);
    if(d.language)text(e,d.language,box(head.x+head.w*.77,head.y,head.w*.21,head.h),21,'#b4cdb1',{align:'right'});
    const row=area.h*.76/d.items.length;
    d.items.forEach((item,i)=>{
      const y=area.y+area.h*.22+row*i;
      const active=i===s.current;
      rect(g,area.x,y,area.w,row*.91,active?'#536a54':i%2?'#2a4941':'#293f39');
      if(active)rect(g,area.x,y,3,row*.91,'#e3be7d');
      text(e,String(i+1),box(area.x+8,y,34,row*.91),18,active?'#f0dba8':'#8fac98',{align:'center',font:'Consolas, monospace'});
      text(e,item.text,box(area.x+52,y,area.w-62,row*.91),27,active?p.ivory:'#bacdb6',{font:'Consolas, monospace',weight:600});
    });
  }

  P.componentInformation={flow,timeline,hierarchy,bars,code};
})(globalThis.PixelVideo=globalThis.PixelVideo||{});
