(function(P){
  'use strict';
  const colors=['#b58b50','#527c9b','#4b9c8b'];
  const edge=['#f2cf8e','#b4d4ed','#a5e0cb'];
  const r=(g,x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
  function line(g,pts,c,w=1){g.strokeStyle=c;g.lineWidth=w;g.beginPath();pts.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.stroke();}
  function text(e,s,x,y,size=7,c=e.colors.ink,max=270){P.text.draw(e,s,x,y,size,c,max);}
  function card(e,w,h,draw){
    const g=e.ctx;g.save();g.translate(w/2,h/2);
    g.fillStyle='rgba(1,7,15,.62)';g.fillRect(-w/2+3,-h/2+4,w,h);
    g.translate(-w/2,-h/2);
    r(g,0,0,w,h,'#5b7f88');r(g,2,2,w-4,h-4,'#0b1e2c');
    r(g,3,3,w-6,1,'#8fa7a4');draw(w,h);
    g.restore();
  }
  function problem(e,p,selected=0){
    const g=e.ctx;card(e,300,146,(w,h)=>{
      g.save();g.scale(w/300,h/146);
      r(g,5,5,290,19,'#284a59');r(g,10,10,4,4,'#ffd28b');
      text(e,'01  算法题板',155,14,8,e.colors.ink,230);
      const pts=[[27,49],[84,73],[145,44],[207,70],[271,48]];
      for(let i=0;i<4;i++){
        line(g,[pts[i],pts[i+1]],'#385b6b',2);
        const q=P.clamp(p*4-i);if(q>0)line(g,[pts[i],[pts[i][0]+(pts[i+1][0]-pts[i][0])*q,pts[i][1]+(pts[i+1][1]-pts[i][1])*q]],'#91ddc9',2);
      }
      pts.forEach(([x,y],i)=>{r(g,x-5,y-5,10,10,p*4>=i?'#efc47e':'#426478');r(g,x-2,y-2,4,4,'#102a39');});
      for(let i=0;i<3;i++){r(g,25+i%2*9,92+i*10,90+i*29,2,['#7acfb8','#b8a5d0','#d7b47b'][i]);}
      text(e,'分析  →  编码  →  复盘',150,132,8,'#c3d4d4',265);
      if(selected>0){g.strokeStyle=`rgba(255,208,132,${selected})`;g.lineWidth=2;g.strokeRect(1,1,298,144);}
      g.restore();
    });
  }
  function timeCard(e,index,taken,expanded){
    const g=e.ctx;card(e,81,94,(w,h)=>{
      g.save();g.scale(w/81,h/94);r(g,3,3,75,88,colors[index]);r(g,4,4,73,18,'#152d3a');
      text(e,['竞赛','课程','项目'][index],40,13,9,edge[index],70);
      for(let j=0;j<4;j++){
        const i=index*4+j,occupied=[4,8,5].slice(0,Math.floor(P.clamp(taken)*3)).includes(i);
        const x=10+j%2*34,y=29+Math.floor(j/2)*27;
        r(g,x,y,27,21,occupied?'#d8ac62':'#112d3a');r(g,x+2,y+2,23,2,occupied?'#ffe2a5':edge[index]);
        text(e,String(i+1).padStart(2,'0'),x+13,y+13,7,occupied?'#152530':edge[index],22);
      }
      if(expanded)text(e,'时间单位 × 4',40,86,5.5,'#edf3e1',72);
      g.restore();
    });
  }
  function calendar(e,p,selected=0){
    const g=e.ctx;card(e,263,123,(w,h)=>{
      g.save();g.beginPath();g.rect(3,3,w-6,h-6);g.clip();
      r(g,3,3,w-6,18,'#315c60');
      text(e,'试练计划 · 14天',w/2,12,Math.min(9,w/18),e.colors.gold,w-12);
      const dx=(w-24)/7,cw=dx-5;
      for(let i=0;i<14;i++){
        const x=12+i%7*dx,y=36+Math.floor(i/7)*34,done=p>=(i+1)/14;
        r(g,x,y,cw,27,done?'#4d8f7e':'#829e96');r(g,x+2,y+2,cw-4,2,'#c8d6bd');
        if(done)line(g,[[x+cw/2-5,y+15],[x+cw/2-1,y+18],[x+cw/2+6,y+9]],'#e6edd1',2);
        else text(e,String(i+1),x+cw/2,y+16,7,'#e9efdb',cw-2);
      }
      text(e,'兴趣 · 进步 · 时间投入',w/2,115,8,'#b8d7c9',w-24);g.restore();
      if(selected){g.strokeStyle=`rgba(255,205,128,${selected})`;g.lineWidth=1.5;g.strokeRect(.5,.5,w-1,h-1);}
    });
  }
  P.competitionCards={problem,timeCard,calendar};
})(globalThis.PixelVideo=globalThis.PixelVideo||{});
