(function(P){
  'use strict';
  const ids=new Set(['prop.cache-terminal.v1','prop.data-vault.v1','prop.cache-crate.v1','prop.data-token.v1']);
  function sprite(e,id,o){
    const key='computing:'+id+':'+e.style.id+':'+JSON.stringify(o);
    if(e.propCache[key])return e.propCache[key];
    const canvas=e.createCanvas(64,64),g=canvas.getContext('2d'),c=e.colors;
    const r=(x,y,w,h,color)=>{g.fillStyle=color;g.fillRect(x,y,w,h);};
    const dark='#071321',body='#193448',rim='#5c8290',light='#b9d2cd',cream='#c9c3a5';
    const signal=o.key==='B'?c.gold:c.accent;
    function grain(x,y,w,h,a,b){
      for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++){
        const n=(xx*17+yy*29+xx*yy*3)%41;
        if(n<3)r(xx,yy,1,1,a);else if(n===19)r(xx,yy,1,1,b);
      }
    }
    function screw(x,y){r(x,y,2,2,dark);r(x,y,1,1,light);}
    function token(x,y,scale=1){
      const q=(a,b,w,h,color)=>r(x+a*scale,y+b*scale,w*scale,h*scale,color);
      q(1,0,10,16,dark);q(0,1,12,14,rim);q(1,1,10,13,signal);
      q(2,2,8,10,dark);q(2,2,7,1,light);q(2,13,2,2,c.gold);q(5,13,2,2,c.gold);q(8,13,2,2,c.gold);
      q(1,3,1,8,rim);q(10,3,1,8,'#295865');q(2,11,3,1,rim);q(7,11,2,1,c.gold);
      const glyph=o.key==='B'?['110','101','110','101','110']:['010','101','111','101','101'];
      glyph.forEach((row,yy)=>[...row].forEach((v,xx)=>{if(v==='1')q(4+xx,5+yy,1,1,signal);}));
    }
    if(id==='prop.cache-terminal.v1'){
      r(8,9,48,37,dark);r(8,7,46,35,rim);r(10,8,42,32,cream);
      r(13,11,36,25,body);r(15,13,32,21,dark);r(17,15,13,2,c.accent);
      r(11,9,39,1,light);r(11,10,1,27,light);r(50,11,2,27,'#8c998f');
      r(14,12,33,1,'#294c5c');r(14,13,1,21,'#294c5c');
      grain(11,37,39,3,'#a3aa96','#e4d9b7');
      for(let y=16;y<33;y+=3)r(16,y,29,1,'#0b202c');
      r(31,15,10,1,rim);r(40,29,4,1,c.gold);r(40,31,2,1,c.accent);
      r(17,20,22,1,rim);r(17,24,16,1,rim);r(17,28,7,2,c.accent);
      r(43,37,3,1,c.gold);r(26,42,11,5,body);r(20,47,25,3,rim);
      r(7,51,49,8,dark);r(6,49,49,7,cream);r(10,51,39,1,rim);
      for(let yy=53;yy<=55;yy+=2)for(let xx=11;xx<49;xx+=4)r(xx,yy,3,1,body);
      r(18,57,29,2,body);
      for(let x=10;x<50;x+=5)r(x,50,3,1,light);r(17,58,31,1,rim);
      screw(10,9);screw(49,36);
    }else if(id==='prop.data-vault.v1'){
      r(9,5,47,55,dark);r(8,3,47,54,rim);r(11,5,41,49,body);
      r(13,7,36,3,light);r(13,12,36,1,dark);
      r(10,6,1,46,light);r(50,7,2,45,'#294859');grain(12,5,37,7,'#496576','#6f8d94');
      for(const y of [16,27,38]){
        r(14,y,34,9,dark);r(16,y+2,22,4,rim);r(17,y+3,18,1,light);
        r(41,y+2,3,2,c.accent);r(41,y+5,3,1,c.gold);
        r(16,y+2,21,1,light);r(17,y+6,18,1,'#234452');r(45,y+2,1,5,rim);
        for(let x=18;x<36;x+=3)r(x,y+3,1,2,dark);
      }
      r(16,51,12,2,dark);r(35,51,12,2,dark);r(11,56,5,4,body);r(46,56,5,4,body);
      for(const [x,y] of [[11,7],[49,7],[11,51],[49,51]])screw(x,y);
      r(29,49,4,4,dark);r(30,50,2,1,c.gold);r(13,54,36,1,'#2e5365');
    }else if(id==='prop.cache-crate.v1'){
      r(7,23,51,35,dark);r(6,20,51,34,rim);r(9,23,45,29,body);
      r(7,17,49,6,light);r(9,15,45,4,rim);r(12,14,39,2,body);
      r(13,27,36,17,dark);r(15,29,32,12,'#0e2634');
      r(12,47,12,2,rim);r(36,47,13,2,rim);r(9,53,5,5,dark);r(48,53,5,5,dark);
      r(11,20,5,2,c.gold);r(46,20,5,2,c.gold);r(50,47,2,2,o.filled?c.accent:rim);
      r(10,24,1,27,light);r(52,24,1,27,'#294859');grain(17,24,29,3,'#345766','#5c8290');
      for(let x=15;x<32;x+=3)r(x,48,1,2,dark);
      r(38,47,7,3,dark);r(39,48,2,1,c.gold);r(43,48,1,1,c.accent);
      for(const [x,y] of [[10,25],[50,25],[10,49],[50,49]])screw(x,y);
      if(o.filled)token(26,28,.7);
    }else token(20,15,2);
    e.propCache[key]=canvas;return canvas;
  }
  P.library.computing=function(e,id,x,y,size,options={}){
    if(!ids.has(id))throw Error('Unknown computing prop '+id);
    const g=e.ctx;g.save();g.imageSmoothingEnabled=false;
    g.drawImage(sprite(e,id,options),x-size/2,y-size/2,size,size);g.restore();
  };
  const original=P.library.prop;
  P.library.prop=function(e,id,x,y,size,transform){
    if(!ids.has(id))return original(e,id,x,y,size,transform);
    const g=e.ctx,tr=transform||{scale:1,flip:1};g.save();g.translate(x,y);g.scale(tr.scale*tr.flip,tr.scale);
    P.library.computing(e,id,0,0,size||e.height*.24);g.restore();
  };
})(globalThis.PixelVideo=globalThis.PixelVideo||{});
