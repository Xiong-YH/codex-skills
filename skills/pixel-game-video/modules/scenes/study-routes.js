(function(P){
  'use strict';
  function rect(g,x,y,w,h,color){g.fillStyle=color;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
  // All props are drawn on one native pixel grid, then enlarged without filtering.
  function openBook(g,x,y,s,progress){
    g.save();g.translate(x,y);g.scale(s,s);
    rect(g,-48,-20,96,51,'#081627');rect(g,-46,-22,92,49,'#567278');
    rect(g,-43,-23,41,45,'#c5c8af');rect(g,2,-23,41,45,'#ddd8b8');
    rect(g,-1,-24,3,51,'#998e70');rect(g,-43,22,41,3,'#8a9c94');rect(g,2,22,41,3,'#aaa68c');
    for(let i=0;i<6;i++){
      rect(g,-37,-16+i*6,25-(i%3)*4,1,'#6b8688');
      if(i/6<=progress)rect(g,9,-16+i*6,25-(i%2)*8,1,i===2?'#517e81':'#8f9b8a');
    }
    rect(g,31,-21,4,29,'#dca45c');rect(g,31,8,4,4,'#9d6b46');
    g.restore();
  }
  function laptop(g,x,y,s,p){
    g.save();g.translate(x,y);g.scale(s,s);
    rect(g,-53,-37,106,67,'#050d1b');rect(g,-51,-39,102,65,'#4b6d7c');
    rect(g,-48,-36,96,59,'#132638');rect(g,-45,-32,90,51,'#081827');
    rect(g,-45,-32,90,6,'#233e51');
    for(let i=0;i<3;i++)rect(g,-41+i*5,-30,2,2,['#db927b','#dfbb72','#79d4bd'][i]);
    for(let i=0;i<7;i++){
      const show=P.clamp(p*9-i);if(show<=0)continue;
      rect(g,-39+(i%3)*5,-20+i*5,(17+i%4*9)*show,2,['#7ccebf','#c4ac78','#729cbc'][i%3]);
      if(show===1)rect(g,-8+(i%3)*8,-20+i*5,10+(i%2)*12,2,'#426376');
    }
    rect(g,-53,27,106,5,'#2b475a');rect(g,-57,32,114,6,'#6f8b95');rect(g,-60,38,120,5,'#a0b6b7');
    for(let yy=31;yy<=38;yy+=3)for(let xx=-43;xx<46;xx+=7)rect(g,xx,yy,5,1,'#182b3e');
    rect(g,-13,39,26,2,'#597781');g.restore();
  }
  function line(g,points,color,width=1){g.strokeStyle=color;g.lineWidth=width;g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.stroke();}
  function native(e,draw){
    let c=e.propCache['study-routes:canvas'];if(!c)c=e.propCache['study-routes:canvas']=e.createCanvas(480,270);
    const g=c.getContext('2d');g.setTransform(1,0,0,1,0,0);g.globalAlpha=1;g.clearRect(0,0,480,270);draw(g);
    e.ctx.save();e.ctx.imageSmoothingEnabled=false;e.ctx.drawImage(c,0,0,e.width,e.height);e.ctx.restore();
  }
  function text(e,s,x,y,size=.032,color,max=.55){P.text.draw(e,s,x*e.width,y*e.height,size*e.height,color||e.colors.ink,max*e.width);}
  function chip(e,label,x,y,width,color){
    const g=e.ctx,w=e.width,h=e.height;g.fillStyle='#0b1c2b';g.fillRect((x-width/2)*w,(y-.027)*h,width*w,h*.054);
    g.fillStyle=color;g.fillRect((x-width/2)*w,(y-.027)*h,e.pixel,h*.054);text(e,label,x,y,.026,color,width-.015);
  }
  P.studyRoutes={draw(e,shot,frame){
    const a=shot.params,c=e.colors,g=e.ctx,phase=a.phase,l=a.labels;
    const start=P.scenes.eventFrame(shot,a.startEvent),end=P.scenes.eventFrame(shot,a.completeEvent);
    const p=P.clamp((frame-start)/Math.max(1,end-start)),clock=(frame-shot.startFrame)/e.fps;
    if(phase==='decision'){
      text(e,a.heading,.5,.155,.052,c.ink,.68);
      const previews=a.sourceShots.map(id=>e.shotPreview(id));
      const boxes=[[.19,.30,.29],[.54,.30,.29]];
      boxes.forEach(([x,y,w],i)=>{
        g.fillStyle=i?c.accent:c.gold;g.fillRect(x*e.width-e.pixel,y*e.height-e.pixel,w*e.width+2*e.pixel,w*e.height+2*e.pixel);
        g.drawImage(previews[i],x*e.width,y*e.height,w*e.width,w*e.height);
        text(e,l[i],x+w/2,.263,.035,i?c.accent:c.gold,.27);
      });
      native(e,ng=>{
        const alpha=P.ease(p*2);ng.globalAlpha=alpha;
        line(ng,[[160,162],[160,178],[240,178],[240,184]],'#c9aa72',2);
        line(ng,[[329,162],[329,178],[240,178]],'#78cdbd',2);
        rect(ng,237,181,6,6,'#d9c18a');
      });
      text(e,l[2],.50,.725,.042,c.ink,.70);
      text(e,a.kicker,.5,.79,.027,c.gold,.68);
      return;
    }
    text(e,a.heading,.64,.19,phase==='question'?.060:.048,c.ink,.57);
    text(e,a.kicker,.64,.275,.025,phase==='question'?c.gold:c.muted,.53);
    if(phase==='question'){
      native(e,ng=>{
        openBook(ng,247,143,.86,1);laptop(ng,371,141,.60,1);
        line(ng,[[232,181],[232,190],[310,190],[310,184]],'#c2a475',1);
        line(ng,[[370,179],[370,190],[310,190]],'#609d9e',1);
        rect(ng,308,188,4,4,'#f0c77e');
      });
      text(e,l[0],.515,.66,.037,c.gold,.23);text(e,l[1],.775,.66,.037,c.accent,.23);
      text(e,l[2],.645,.755,.027,c.muted,.5);
    }else if(phase==='research'){
      native(e,ng=>{
        openBook(ng,266,158,1.15,p);
        const nodes=[[218,101],[273,91],[311,113]];
        line(ng,[[266,134],[266,119],[218,119],[218,101]],'#967f59');
        line(ng,[[266,119],[273,91],[311,113]],'#6a9c9b');
        nodes.forEach(([x,y],i)=>{
          const q=P.ease((p-i*.18)*2.8),yy=y+(1-q)*12;
          ng.save();ng.globalAlpha=q;rect(ng,x-9,yy-12,19,24,'#324e59');rect(ng,x-7,yy-10,15,20,'#c9cdb3');
          for(let n=0;n<4;n++)rect(ng,x-4,yy-5+n*4,9-(n%2)*3,1,'#638184');ng.restore();
        });
        // A restrained moving packet follows the diagram; the character stays put.
        const t=(clock*.35)%1;rect(ng,266+(273-266)*t,119+(91-119)*t,2,2,'#f2d99a');
      });
      P.library.prop(e,'prop.grad-cap.v1',e.width*.80,e.height*.43,e.height*.22);
      chip(e,l[0],.80,.57,.23,c.gold);chip(e,l[1],.80,.65,.23,c.accent);
      text(e,l[2],.56,.755,.032,c.gold,.40);
    }else{
      native(e,ng=>{
        laptop(ng,282,145,1.12,p);
        const q=P.ease((p-.35)/.65),xx=354+(1-q)*25;
        ng.save();ng.globalAlpha=q;
        rect(ng,xx,118,46,49,'#122736');rect(ng,xx+2,116,42,47,'#77959c');rect(ng,xx+5,120,36,39,'#d1d1b3');
        rect(ng,xx+10,126,20,2,'#476872');rect(ng,xx+10,132,25,1,'#76918c');rect(ng,xx+10,137,19,1,'#76918c');
        line(ng,[[xx+12,148],[xx+18,153],[xx+28,143]],'#3b8076',3);ng.restore();
        if(p>.6)line(ng,[[346,153],[353,153]],'#a1d7c7',2);
      });
      text(e,l[0],.58,.73,.039,c.accent,.31);text(e,l[1],.79,.67,.030,c.gold,.20);
      text(e,l[2],.64,.79,.024,c.muted,.5);
    }
  }};
})(globalThis.PixelVideo=globalThis.PixelVideo||{});
