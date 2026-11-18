(function(P){
  'use strict';
  const {box,offset,inset,cx,cy,out,rect,poly,plate,border,line,alpha,crop,tone,paper,chip,notebook,icon,spark}=P.componentLook;
  const text=(...args)=>P.componentText.text(...args);

  function comparison(e,c,b,p,s,t){
    const g=e.ctx,d=c.data;
    const area=notebook(g,b,p);
    const heading=box(area.x,area.y,area.w,area.h*.14);
    text(e,d.title,heading,31,p.ink,{weight:850});
    line(g,area.x,area.y+area.h*.15,area.x+area.w,area.y+area.h*.15,p.rule,1.7);
    const count=d.items.length, gap=Math.min(40,area.w*.09), width=(area.w-gap*(count-1))/count;
    const top=area.y+area.h*.22, height=area.h*.68;
    d.items.forEach((item,i)=>{
      const x=area.x+i*(width+gap), p0=t.phase(item.event,.26), move=out(p0);
      const home=box(x,top,width,height);
      if(i){
        line(g,x-gap,cy(home),x,cy(home),'#8bab97',2.1);
        const link=box(x-gap/2-11,cy(home)-12,22,24);
        chip(g,link,tone(e,'gold'),5);
        text(e,'?',inset(link,3),17,'#694c37',{align:'center',weight:820});
      }
      if(!s.items[i])return;
      const direction=i===0?-1:1;
      const card=offset(home,direction*(1-move)*37,(1-move)*15);
      alpha(g,move,()=>{
        paper(g,card,p,{layers:2,face:'#e7d9b4'});
        const title=box(card.x+10,card.y+9,card.w-20,card.h*.17);
        rect(g,title.x,title.y,title.w,title.h,i%2?'#d1d7ad':p.blue);
        alpha(g,out((move-.61)/.39),()=>{
          text(e,item.title,inset(title,8,0),29,p.ink,{weight:850});
          const art=box(card.x+card.w*.16,card.y+card.h*.25,card.w*.68,card.h*.40);
          const image=P.componentText.picture(e,item,art);
          if(!image&&item.icon)icon(g,item.icon,inset(art,4),p.ink,3.6);
          const withArt=image||item.icon;
          if(item.value){
            const top=withArt?.71:.43;
            const pill=box(card.x+card.w*.13,card.y+card.h*top,card.w*.74,card.h*.17);
            const marker=tone(e,i%2?'accent':'gold');
            chip(g,pill,marker,8);
            text(e,item.value,inset(pill,8,0),27,marker.ink,{align:'center',weight:830});
          }
          if(item.detail){
            const topY=withArt?(item.value?.89:.70):(item.value?.65:.39);
            text(e,item.detail,box(card.x+11,card.y+card.h*topY,card.w-22,card.h*(.98-topY)),withArt?20:27,p.muted,{align:'center',rows:2});
          }
        });
      });
      spark(g,home.x+home.w*.85,home.y+home.h*.84,t.since(item.event,.25)-.68,'#efd29a',10);
    });
  }

  function deck(e,c,b,p,s,t){
    const g=e.ctx,d=c.data;
    const area=notebook(g,b,p,{ruled:true});
    text(e,d.title,box(area.x,area.y,area.w,area.h*.13),32,p.ink,{weight:850});
    const count=d.items.length, columns=count<=4?2:3, rows=Math.ceil(count/columns);
    const gap=Math.min(24,area.w*.045), height=Math.min(140,(area.h*(d.detail?.69:.79)-(rows-1)*14)/rows);
    const width=(area.w-(columns-1)*gap)/columns;
    const faces=[p.warm,'#bfceac','#cad4b8','#e5bd98',p.blue,p.rose];
    d.items.forEach((item,i)=>{
      if(!s.items[i])return;
      const move=out(t.phase(item.event,.30));
      const column=i%columns, row=Math.floor(i/columns);
      const home=box(area.x+column*(width+gap)+((row%2)*8),area.y+area.h*.18+row*(height+14),width-7,height);
      const direction=i%2?-1:1;
      const rise=Math.sin(move*Math.PI)*18;
      g.save();
      g.translate(cx(home)-direction*(1-move)*(70+i*8),cy(home)+(1-move)*58-rise);
      g.rotate(direction*(.055+(1-move)*.14));
      const card=box(-home.w/2,-home.h/2,home.w,home.h);
      alpha(g,move,()=>{
        paper(g,card,p,{layers:2,face:faces[i]});
        const size=Math.min(card.h*.75,card.w*.35), iconBox=box(card.x+10,cy(card)-size/2,size,size);
        border(g,iconBox,i%3===2?'#5c5141':'#34574b','#839b81',2,8);
        icon(g,item.icon||'paper',inset(iconBox,size*.18),p.ivory,3);
        const tx=iconBox.x+size+12, max=card.x+card.w-13-tx;
        text(e,item.title,box(tx,card.y+card.h*.09,max,card.h*.34),29,p.ink,{rows:2,weight:850});
        line(g,tx,card.y+card.h*.45,tx+max,card.y+card.h*.45,p.rule,1.8);
        if(item.detail)text(e,item.detail,box(tx,card.y+card.h*.49,max,card.h*.21),18,p.muted);
        if(item.label&&t.age(item.markEvent)>=0){
          const stamp=out(t.phase(item.markEvent,.20));
          const mark=box(tx-3*(1-stamp),card.y+card.h*(item.detail?.73:.58)-9*(1-stamp),max+4,card.h*.27);
          const t0=tone(e,'accent');
          alpha(g,stamp,()=>{
            chip(g,mark,t0,7);
            text(e,item.label,inset(mark,7,0),22,t0.ink,{align:'center'});
          });
          spark(g,mark.x+mark.w*.84,cy(mark),t.since(item.markEvent,.22),'#f2e2ae',12);
        }
      });
      g.restore();
    });
    if(d.detail){
      const row=box(area.x,area.y+area.h*.88,area.w,area.h*.12);
      border(g,row,'#f1e5c3',p.edge,2,10);
      const left=box(row.x+18,row.y,row.w*(d.status?.55:.93),row.h);
      text(e,d.detail,left,24,p.ink,{weight:780});
      if(d.status){
        const right=box(row.x+row.w*.62,row.y,row.w*.34,row.h);
        text(e,d.status,right,24,t.ink.ink,{weight:780,align:'right'});
      }
    }
  }

  function tray(e,c,b,p,s,t){
    const g=e.ctx,d=c.data;
    const x=b.x,y=b.y,w=b.w,h=b.h;
    const depth=Math.min(w*.16,h*.22), lip=h*.14;
    const front=box(x,y+depth,w-depth,h-depth);
    const well=box(front.x+w*.065,front.y+h*.085,front.w-w*.13,front.h-h*.27);
    plate(g,offset(front,5,9),'#241f1cb0',12);
    poly(g,[[x,y+depth],[x+depth,y],[x+w,y],[x+w-depth,y+depth]],'#b3936e');
    poly(g,[[x+w-depth,y+depth],[x+w,y],[x+w,y+h-depth],[x+w-depth,y+h]],'#5c4839');
    border(g,front,'#5c493a','#ae9068',3.5,10);
    border(g,well,'#413830','#8b6d51',2.5,8);
    const cardW=well.w*.90, cardH=Math.min(lip*1.15,well.h*.43);
    const step=Math.min(h*.026,well.h*.58/Math.max(d.items.length-1,1));
    d.items.forEach((item,i)=>{
      if(!s.items[i])return;
      const move=out(t.phase(item.event,.29));
      const endX=well.x+well.w*.05+(i%3-1)*w*.015;
      const endY=well.y+well.h-cardH-step*i;
      const dx=endX-(1-move)*w*.85, dy=endY-(1-move)*h*.44-Math.sin(move*Math.PI)*h*.55;
      const draw=()=>{
        g.save();
        g.translate(dx,dy);
        g.rotate((i%3-1)*.035-(1-move)*.14);
        paper(g,box(0,0,cardW,cardH),p,{layers:1,face:i%2?'#dfcfaa':'#e5c79c',corner:7});
        rect(g,cardW*.10,cardH*.29,cardW*.48,2,'#77947f');
        rect(g,cardW*.10,cardH*.59,cardW*.69,1.4,'#a39272');
        g.restore();
      };
      if(move>.93)crop(g,well,draw);
      else alpha(g,move,draw);
      spark(g,endX+cardW*.90,endY+cardH*.70,t.since(item.event,.20)-.95,'#edca8e',7);
    });
    rect(g,front.x+5,well.y+well.h,front.w-10,front.y+front.h-well.y-well.h-5,'#77593e');
    rect(g,front.x+9,well.y+well.h,front.w-18,3,'#b08a60');
    if(d.title){
      text(e,d.title,box(front.x+8,well.y+well.h+4,front.w-16,front.y+front.h-well.y-well.h-9),20,p.ivory,{align:'center'});
    }
  }

  function noteRows(e,c,b,p,s,t,kind){
    const d=c.data,g=e.ctx;
    const area=notebook(g,b,p,{ruled:kind==='note'});
    const label=box(area.x,area.y,Math.min(area.w*.61,d.title.length*24+28),area.h*.13);
    const t0=tone(e,'secondary');
    chip(g,label,t0,8);
    text(e,d.title,inset(label,9,0),26,t0.ink,{align:'center'});
    line(g,label.x+label.w+14,cy(label),area.x+area.w,cy(label),p.rule,1.6);
    const row=area.h*.78/d.items.length;
    d.items.forEach((item,i)=>{
      const live=s.items[i], k=out(t.phase(item.event,.24));
      const home=box(area.x,area.y+area.h*.18+row*i,area.w,row*.81);
      if(kind==='note'||kind==='template'){
        const titleWidth=home.w*.30;
        const badge=box(home.x,home.y+home.h*.10,titleWidth,home.h*.60);
        if(kind==='template')border(g,badge,'#e2d3ab','#b4a17d',1.8,7);
        text(e,item.label,inset(badge,8,0),25,p.ink,{rows:2});
        line(g,home.x+titleWidth+12,home.y+home.h*.82,home.x+home.w,home.y+home.h*.82,p.rule,1.5);
        if(live){
          const field=box(home.x+titleWidth+12,home.y,home.w-titleWidth-12,home.h*.76);
          crop(g,box(field.x,field.y,field.w*k,field.h),()=>text(e,item.detail,field,27,p.ink,{rows:2}));
          spark(g,field.x+field.w*k,field.y+field.h*.82,t.since(item.event,.24),'#e9bf82',5);
        }
        return;
      }
      const ticket=offset(home,(i%2?1:-1)*(1-k)*Math.min(41,area.w*.05),0);
      plate(g,offset(ticket,4,5),'#6c56394c',10);
      border(g,ticket,live?'#f2e5c4':'#e5d9b6',live?'#b8a17a':'#bcaf8d',2.2,10);
      const size=Math.min(home.h*.65,45), art=box(ticket.x+10,cy(ticket)-size/2,size,size);
      border(g,art,live?(i%2?'#dbc096':'#cad8b8'):'#ded3b5','#a5a786',2,8);
      if(live||item.icon)icon(g,item.icon||'check',inset(art,Math.max(4,size*.17)),p.ink,2.4);
      const left=art.x+art.w+13;
      const titleBox=box(left,ticket.y,item.detail?ticket.w*.24:ticket.x+ticket.w-left-12,ticket.h);
      text(e,item.label,titleBox,27,live?p.ink:p.muted,{rows:2,weight:830});
      if(item.detail){
        const x=titleBox.x+titleBox.w+9;
        text(e,item.detail,box(x,ticket.y,ticket.x+ticket.w-x-12,ticket.h),25,p.ink,{rows:2});
      }
      if(live)spark(g,ticket.x+ticket.w-15,ticket.y+6,t.since(item.event,.23),'#f8e3af',8);
    });
  }

  function choice(e,c,b,p,s,t){
    const d=c.data,g=e.ctx;
    const area=notebook(g,b,p);
    text(e,d.title,box(area.x,area.y,area.w,area.h*.24),40,p.ink,{weight:850});
    const n=d.items.length,gap=Math.min(18,area.w*.025),w=(area.w-gap*(n-1))/n;
    const selected=t.age(d.selectionEvent)>=0;
    d.items.forEach((item,i)=>{
      if(!s.items[i])return;
      const active=selected&&i===d.selectedIndex;
      const p0=out(t.phase(item.event,.23));
      const pulse=active?Math.sin(t.phase(d.selectionEvent,.22)*Math.PI)*4:0;
      const chipBox=box(area.x+(w+gap)*i,area.y+area.h*.38+(1-p0)*16+pulse,w,area.h*.30);
      const colors=tone(e,active?'gold':'accent');
      alpha(g,p0,()=>{
        chip(g,chipBox,colors,8);
        const size=item.icon?Math.min(chipBox.h*.55,w*.19):0;
        if(size)icon(g,item.icon,box(chipBox.x+10,cy(chipBox)-size/2,size,size),colors.ink,2.4);
        text(e,item.title,box(chipBox.x+9+size,chipBox.y,w-18-size,chipBox.h),27,colors.ink,{align:'center',rows:2});
      });
      if(active){
        const underline=chipBox.y+chipBox.h+10;
        rect(g,chipBox.x+11,underline,chipBox.w-22,3,colors.edge);
        spark(g,cx(chipBox),underline,t.since(d.selectionEvent,.26),'#edca8b',10);
      }
    });
    if(selected&&d.detail)text(e,d.detail,box(area.x,area.y+area.h*.83,area.w,area.h*.17),23,p.muted,{align:'center'});
  }

  P.componentCollections={comparison,deck,tray,choice,
    notebook:(...args)=>noteRows(...args,'note'),checklist:(...args)=>noteRows(...args,'checklist'),
    template:(...args)=>noteRows(...args,'template')};
})(globalThis.PixelVideo=globalThis.PixelVideo||{});
