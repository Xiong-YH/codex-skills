(function(P){
  'use strict';
  const ids=new Set(['prop.grad-cap.v1','prop.work-case.v1','prop.project-laptop.v1','prop.goal-target.v1']);
  function sprite(e,id){
    const key='education:'+id+':'+e.style.id;
    if(e.propCache[key])return e.propCache[key];
    const canvas=e.createCanvas(64,64),g=canvas.getContext('2d'),c=e.colors;
    const r=(x,y,w,h,color)=>{g.fillStyle=color;g.fillRect(x,y,w,h);};
    const dark='#081524',rim='#426879',body='#203e52',light='#accacb',paper='#dce1ce';
    if(id==='prop.grad-cap.v1'){
      r(10,42,44,13,dark);r(12,42,40,10,light);r(15,44,35,6,paper);r(16,46,33,1,'#9cafa4');r(13,51,40,3,c.accent);
      r(16,23,32,21,dark);r(18,24,28,17,rim);r(20,26,24,13,body);r(20,39,24,2,c.accent);
      for(let y=0;y<12;y++){
        const half=4+Math.min(y,11-y)*4;
        r(32-half,12+y,half*2,2,dark);r(33-half,12+y,half*2-2,1,y<6?rim:body);
      }
      r(28,15,8,2,light);r(47,22,2,18,c.gold);r(46,38,4,7,c.gold);r(47,40,1,5,paper);
      r(16,43,6,1,'#f0eedb');
    }else if(id==='prop.work-case.v1'){
      r(23,12,18,12,dark);r(25,14,14,9,c.gold);r(28,17,8,6,dark);
      r(8,24,49,31,dark);r(7,22,48,29,rim);r(10,25,42,23,body);
      r(10,25,42,2,light);r(10,28,1,18,light);r(50,28,2,20,'#112a3d');
      r(10,36,42,2,dark);r(17,23,3,28,'#527882');r(43,23,3,28,'#527882');
      r(28,34,10,8,dark);r(29,34,8,6,c.gold);r(31,35,4,2,paper);r(31,39,4,2,'#9b733d');
      r(13,50,35,2,dark);r(11,52,7,3,body);r(45,52,7,3,body);
    }else if(id==='prop.project-laptop.v1'){
      r(11,9,43,35,dark);r(10,8,42,34,rim);r(13,11,36,27,light);r(15,13,32,23,dark);
      r(17,16,28,1,'#24445a');r(17,19,8,2,c.accent);r(27,19,13,2,light);
      r(20,24,18,1,rim);r(20,27,22,1,c.gold);r(17,31,12,2,c.accent);
      r(10,42,43,4,body);r(8,46,47,3,rim);r(5,49,53,5,light);r(7,54,49,3,dark);
      for(let y=46;y<52;y+=2)for(let x=13;x<50;x+=4)r(x,y,3,1,body);
      r(26,52,13,2,rim);r(30,39,4,1,c.gold);
    }else{
      r(10,10,44,44,dark);r(13,13,38,38,rim);r(16,16,32,32,body);
      r(20,20,24,24,c.accent);r(23,23,18,18,dark);r(27,27,10,10,c.gold);
      r(30,30,4,4,paper);r(34,27,3,3,light);r(37,23,3,4,light);r(40,20,3,4,light);
      r(43,12,3,10,c.gold);r(44,12,9,3,c.gold);r(44,17,5,3,light);
      r(16,52,5,4,body);r(43,52,5,4,body);
    }
    e.propCache[key]=canvas;return canvas;
  }
  const original=P.library.prop;
  P.library.prop=function(e,id,x,y,size,transform){
    if(!ids.has(id))return original(e,id,x,y,size,transform);
    const tr=transform||{scale:1,flip:1},g=e.ctx,s=size||e.height*.27;
    g.save();g.translate(x,y);g.scale(tr.scale*tr.flip,tr.scale);g.imageSmoothingEnabled=false;
    g.drawImage(sprite(e,id),-s/2,-s/2,s,s);g.restore();
  };
})(globalThis.PixelVideo=globalThis.PixelVideo||{});
