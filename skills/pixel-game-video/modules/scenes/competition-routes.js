(function(P){
  'use strict';
  const r=(g,x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
  function line(g,points,c,width=1){g.strokeStyle=c;g.lineWidth=width;g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.stroke();}
  function pixels(e,draw){
    const key='competition:canvas';let canvas=e.propCache[key];
    if(!canvas)canvas=e.propCache[key]=e.createCanvas(480,270);
    const g=canvas.getContext('2d');g.setTransform(1,0,0,1,0,0);g.globalAlpha=1;g.clearRect(0,0,480,270);draw(g);
    e.ctx.save();e.ctx.imageSmoothingEnabled=false;e.ctx.drawImage(canvas,0,0,e.width,e.height);e.ctx.restore();
  }
  function txt(e,s,x,y,size=.03,color,max=.5){P.text.draw(e,s,x*e.width,y*e.height,size*e.height,color||e.colors.ink,max*e.width);}
  function trophy(g,x,y,s=1){
    g.save();g.translate(x,y);g.scale(s,s);
    r(g,-23,-30,46,6,'#f5d9a0');r(g,-21,-24,42,23,'#d9a254');
    r(g,-17,-23,11,21,'#f4cd80');r(g,-17,-1,34,9,'#bb793b');r(g,-11,8,22,5,'#9a6437');
    r(g,-4,12,8,17,'#e8b665');r(g,-20,29,40,8,'#a47b4e');r(g,-24,37,48,6,'#243847');
    line(g,[[-22,-20],[-34,-20],[-34,-4],[-18,6]],'#c48c49',5);
    line(g,[[22,-20],[34,-20],[34,-4],[18,6]],'#c48c49',5);
    r(g,-4,-16,8,8,'#fff1c0');r(g,-8,-12,16,3,'#fff1c0');g.restore();
  }
  function terminal(g,x,y,s,p){
    g.save();g.translate(x,y);g.scale(s,s);
    r(g,-58,-38,116,77,'#071120');r(g,-56,-40,112,75,'#426376');r(g,-52,-36,104,66,'#0b1b29');
    r(g,-48,-32,96,7,'#294b5d');
    for(let i=0;i<3;i++)r(g,-44+i*5,-30,2,2,['#e8aa80','#e4d899','#89d6c4'][i]);
    for(let i=0;i<7;i++){
      const q=P.clamp(p*9-i);if(!q)continue;
      r(g,-43+(i%3)*6,-19+i*6,(25+(i%4)*8)*q,2,['#88dfcb','#b8a9dd','#dcb87a'][i%3]);
      if(q===1)r(g,10+(i%2)*5,-19+i*6,21,2,'#34576d');
    }
    r(g,-59,35,118,5,'#38566b');r(g,-64,40,128,7,'#8aabb0');r(g,-23,43,46,2,'#456779');g.restore();
  }
  function check(g,x,y,c){line(g,[[x-5,y],[x-1,y+4],[x+7,y-5]],c,3);}
  function heading(e,a,center=false){const x=center?.5:.645;txt(e,a.heading,x,.165,center?.05:.048,e.colors.ink,center?.80:.60);txt(e,a.kicker,x,.247,.024,e.colors.gold,center?.80:.59);}

  function drawBase(e,shot,frame){
    const a=shot.params,l=a.labels,c=e.colors,g=e.ctx;
    const start=P.scenes.eventFrame(shot,a.startEvent),end=P.scenes.eventFrame(shot,a.completeEvent);
    const p=P.clamp((frame-start)/Math.max(1,end-start));
    if(a.phase==='decision')txt(e,a.heading,.5,.15,.05,c.ink,.80);
    else heading(e,a,['cost','trial'].includes(a.phase));
    if(a.phase==='question'){
      pixels(e,ng=>{trophy(ng,247,139,.88);terminal(ng,374,138,.7,1);line(ng,[[245,188],[245,201],[372,201],[372,188]],'#769b9c',1);r(ng,307,198,5,5,'#e6bf7d');});
      txt(e,l[0],.513,.69,.035,c.gold,.22);txt(e,l[1],.78,.69,.035,c.accent,.22);txt(e,l[2],.646,.787,.028,c.muted,.55);
    }else if(a.phase==='training'){
      // The same problem changes from disconnected nodes to a solved route.
      pixels(e,ng=>{
        terminal(ng,304,151,1.02,.4+.6*p);
        const nodes=[[210,94],[250,110],[296,89],[338,110],[382,89]];
        for(let i=0;i<nodes.length-1;i++){
          line(ng,[nodes[i],nodes[i+1]],'#355567',2);
          const q=P.clamp(p*4-i),a=nodes[i],b=nodes[i+1];
          if(q>0)line(ng,[a,[a[0]+(b[0]-a[0])*q,a[1]+(b[1]-a[1])*q]],'#82dec8',2);
        }
        nodes.forEach(([x,y],i)=>{r(ng,x-5,y-5,10,10,p*4>=i?'#e8c082':'#39596b');r(ng,x-2,y-2,4,4,'#0b202d');});
        if(p>=1)check(ng,367,183,'#a0ecd8');
      });
      txt(e,l[0],.47,.715,.029,c.gold,.22);txt(e,l[1],.66,.715,.029,c.accent,.22);txt(e,l[2],.805,.785,.027,c.ink,.28);
    }else if(a.phase==='cost'){
      // Twelve equal slots illustrate a finite budget, without implying survey data.
      pixels(e,ng=>{
        r(ng,70,87,340,112,'#091927');r(ng,74,91,332,104,'#1d3444');
        const taken=Math.floor(p*3);
        for(let i=0;i<12;i++){
          const x=94+(i%6)*51,y=108+Math.floor(i/6)*42;
          const original=i<4?0:i<8?1:2,owner=[4,8,5].slice(0,taken).includes(i)?0:original;
          r(ng,x,y,37,26,['#bf904e','#557b9b','#4b9b90'][owner]);r(ng,x+3,y+3,31,3,['#efc57e','#a6c4db','#96ded0'][owner]);
          if(owner===0&&original!==0)r(ng,x+16,y+11,5,6,'#ffe0a6');
        }
      });
      [c.gold,c.secondary,c.accent].forEach((color,i)=>{g.fillStyle=color;g.fillRect((.23+i*.27)*e.width,.767*e.height,.012*e.width,.024*e.height);txt(e,l[i],.30+i*.27,.78,.03,color,.23);});
    }else if(a.phase==='project'){
      pixels(e,ng=>{
        terminal(ng,273,143,1.0,p);
        const q=P.ease((p-.35)/.65),x=353+(1-q)*24;
        ng.save();ng.globalAlpha=q;
        r(ng,x,114,52,58,'#0b1927');r(ng,x+2,112,48,56,'#678c94');r(ng,x+6,116,40,48,'#cbd6bf');
        r(ng,x+12,123,27,2,'#456c75');r(ng,x+12,130,22,2,'#6e9a94');r(ng,x+12,137,26,2,'#6e9a94');check(ng,x+25,151,'#397f72');
        line(ng,[[333,151],[x-3,151]],'#92dbc9',2);ng.restore();
      });
      txt(e,l[0],.51,.72,.031,c.accent,.22);txt(e,l[1],.67,.72,.031,c.accent,.22);txt(e,l[2],.81,.72,.031,c.gold,.22);
    }else if(a.phase==='trial'){
      pixels(e,ng=>{
        r(ng,109,86,262,106,'#081522');r(ng,112,83,256,106,'#7d9b9c');r(ng,117,91,246,92,'#cbd3bc');r(ng,117,91,246,12,'#486a74');
        for(let i=0;i<14;i++){
          const x=130+i%7*32,y=117+Math.floor(i/7)*33,done=p>=((i+1)/14);
          r(ng,x,y,24,23,done?'#3e8377':'#a4b6a8');r(ng,x+2,y+2,20,2,done?'#a2d4b5':'#dce0c9');if(done)check(ng,x+11,y+12,'#dbe8c4');
        }
      });
      l.forEach((v,i)=>txt(e,v,.25+i*.25,.765,.029,[c.gold,c.accent,c.secondary][i],.24));
    }else{
      // The last shot becomes the right-hand card, keeping the transition's source.
      const previews=a.sourceShots.map(id=>e.shotPreview(id));
      [[.19,.30,.29],[.54,.30,.29]].forEach(([x,y,w],i)=>{
        g.fillStyle=i?c.accent:c.gold;g.fillRect(x*e.width-e.pixel,y*e.height-e.pixel,w*e.width+2*e.pixel,w*e.height+2*e.pixel);
        g.drawImage(previews[i],x*e.width,y*e.height,w*e.width,w*e.height);txt(e,l[i],x+w/2,.263,.033,i?c.accent:c.gold,.27);
      });
      // Kicker lives below the cards, leaving the card labels clear.
      pixels(e,ng=>{ng.globalAlpha=P.ease(p*2);line(ng,[[160,165],[160,179],[240,179],[240,184]],'#bf9c64',2);line(ng,[[329,165],[329,179],[240,179]],'#71c7b8',2);r(ng,237,182,6,6,'#e5d1a1');});
      txt(e,l[2],.5,.74,.04,c.ink,.75);
      txt(e,a.kicker,.5,.80,.027,c.gold,.70);
    }
  }
  function drawWorld(e,shot,frame){
    return Boolean(P.competitionCinematic?.drawWorld(e,shot,frame));
  }
  P.competitionRoutes={drawBase,drawWorld,draw(e,shot,frame){
    if(drawWorld(e,shot,frame))return;
    if(shot.params.presentation)return P.competitionPaced.draw(e,shot,frame);
    return drawBase(e,shot,frame);
  }};
})(globalThis.PixelVideo=globalThis.PixelVideo||{});
