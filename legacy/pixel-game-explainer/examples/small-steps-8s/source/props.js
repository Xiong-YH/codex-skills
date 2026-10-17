(() => {
  const {make,ctx,R,L,P,E,panel,check}=PX;
  function add(name,w,h,paint,ax=w/2,ay=h/2){
    const native=make(w,h);paint(ctx(native));
    const hi=make(w*12,h*12);ctx(hi).drawImage(native,0,0,hi.width,hi.height);
    Art.items[name]={native,hi,w,h,ax,ay};
  }
  // A smaller cache keeps the distant code wall efficient without animating the pixel grid.
  const originalDraw=Art.draw;
  Art.draw=(g,name,x,y,scale=1,alpha=1,angle=0)=>{
    const a=Art.items[name];
    if(scale>=.55||!a){originalDraw(g,name,x,y,scale,alpha,angle);return;}
    if(alpha<=0)return;
    if(!a.mid){a.mid=make(a.w*3,a.h*3);ctx(a.mid).drawImage(a.native,0,0,a.mid.width,a.mid.height);}
    g.save();g.globalAlpha*=alpha;g.translate(x*6,y*6);g.rotate(angle);g.scale(scale,scale);
    g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
    g.drawImage(a.mid,-a.ax*6,-a.ay*6,a.w*6,a.h*6);g.restore();
  };
  function terminal(g,variant=0){
    P(g,[[108,8],[112,12],[112,76],[12,76],[4,71]],'#627d9f');
    panel(g,4,4,104,68,'#20344e','#8ba6c8');
    R(g,7,7,98,6,['#536b96','#5a7d92','#6e6997','#777689'][variant]);
    for(let i=0;i<3;i++)R(g,10+i*4,9,2,2,['#eaa29d','#e7ce91','#a2dbbb'][i]);
    R(g,8,15,2,54,'#36506e');
    for(let i=0;i<7;i++){
      const y=20+i*6,indent=(i+variant)%3*4;
      R(g,14+indent,y,12+(i*7%21),2,['#9fc3e6','#b3a8df','#97d6c2'][i%3]);
      R(g,40+indent+(i*7%11),y,19+(i*5%21),2,'#5e7c9d');
      if(i%2===0)R(g,83-i*2,y,10,2,'#d1b782');
    }
    R(g,48,74,16,7,'#728aa7');R(g,36,81,40,3,'#4f6687');R(g,38,80,36,2,'#a7bfd7');
  }
  for(let i=0;i<4;i++)add('terminal-'+i,112,86,g=>terminal(g,i),56,39);
  add('terminal-empty',112,86,g=>{terminal(g);R(g,11,16,92,53,'#20344e');},56,39);
  add('paper-fill',98,54,g=>{
    R(g,0,0,98,54,'#f2f7fc');R(g,0,0,98,2,'#deebf6');
    R(g,4,49,90,1,'#e4edf6');
  },49,27);
  add('selection',122,96,g=>{
    for(const [x,y,sx,sy] of [[0,0,1,1],[121,0,-1,1],[0,95,1,-1],[121,95,-1,-1]]){
      R(g,x+(sx<0?-15:0),y,16,2,'#eed095');R(g,x+(sx<0?-1:0),y+(sy<0?-13:0),2,14,'#eed095');
    }
  },61,48);
  add('workshop',320,180,g=>{
    R(g,0,0,320,180,'#293f5b');R(g,0,0,119,141,'#354c6b');
    P(g,[[119,0],[241,0],[293,141],[161,141]],'#2e4662');
    panel(g,17,39,89,66,'#799dbf','#536f91');
    R(g,20,42,83,58,'#9db9d0');
    E(g,89,52,5,5,'#e9e3c7');
    for(let i=0;i<7;i++){const h=9+i*11%25;R(g,21+i*13,100-h,10,h,i%2?'#7f9db9':'#89a8c3');R(g,23+i*13,103-h,2,2,'#c0d6e5');}
    R(g,58,42,2,60,'#d3e2ed');R(g,20,77,83,2,'#d3e2ed');R(g,13,104,98,4,'#819bb6');
    R(g,10,37,7,69,'#7283ad');R(g,106,37,7,69,'#7283ad');R(g,11,40,2,60,'#8f9dc4');
    for(let row=0;row<3;row++){
      R(g,278,38+row*24,33,3,'#526783');R(g,279,37+row*24,31,1,'#7b8ba2');
      for(let j=0;j<5;j++){const h=11+(j*3+row*5)%8;R(g,280+j*6,37+row*24-h,4,h,['#698a9d','#8e9bb8','#a6aaab','#769f9c','#9a8f99'][j]);}
    }
    R(g,0,141,320,39,'#49647f');R(g,0,140,320,2,'#91abc1');
    for(let i=0;i<7;i++)L(g,i*61,143,i*61-22,180,'#405a77');
    L(g,0,165,320,165,'#405a77');
    P(g,[[92,147],[296,147],[316,164],[104,164]],'#354e6a');
    E(g,47,153,28,4,'#304c68');
    R(g,111,123,5,31,'#8e929d');R(g,294,123,5,31,'#8e929d');
    R(g,104,120,201,14,'#9fa5af');R(g,106,123,197,9,'#a7aab0');
    R(g,102,116,205,7,'#b69f98');R(g,100,115,209,5,'#d4c1ad');R(g,103,120,203,1,'#f0e4d3');
    for(let i=0;i<5;i++)L(g,104,117+i,305,117+i,'#c7b29f');
    R(g,132,74,2,40,'#bcc8d0');R(g,123,112,21,3,'#8b9cae');
    L(g,133,74,143,66,'#b8cad2',2);
    P(g,[[133,61],[152,61],[159,69],[126,69]],'#78b8a7');R(g,128,69,29,2,'#c7e3cc');
    for(let i=8;i>=1;i--)P(g,[[129,71],[157,71],[176+i*2,115],[112-i*2,115]],['#3d505c','#455863','#51626a','#626f72','#717b7a','#7d8580','#8d8e85','#9d978b'][8-i]);
    R(g,286,108,7,7,'#d9e6e8');R(g,287,107,5,1,'#9dbfb4');
  },0,0);
  add('product-face',98,54,g=>{
    R(g,0,0,98,54,'#eff7fb');R(g,0,0,98,5,'#7abbaa');
    for(let i=0;i<3;i++)R(g,3+i*4,2,2,1,'white');
    panel(g,4,9,24,38,'#c7e4de','#aacdc9');
    R(g,8,14,16,3,'#82bbb1');R(g,8,21,14,2,'#add2ca');R(g,8,27,16,2,'#add2ca');
    panel(g,33,9,60,15,'white','#d1e2ee');R(g,38,13,24,2,'#9cbbd8');R(g,38,18,47,1,'#d4e4ef');
    for(let i=0;i<3;i++)panel(g,33+i*21,29,18,18,['#e3e7f8','#deeee9','#eee8da'][i],'#c4d7e4');
    R(g,38,34,8,4,'#9badd8');R(g,59,34,8,4,'#89c1ad');R(g,80,34,8,4,'#c9b184');
  },49,27);
  add('process-tag',38,17,g=>{
    R(g,2,3,36,14,'#596e8a');panel(g,0,0,36,14,'#e3edf5','#8eabc3');R(g,2,2,32,2,'#b5ded1');
  });
  add('fault',36,36,g=>{
    E(g,18,18,16,16,'#edc4c5');E(g,18,18,12,12,'#c67d8c');
    L(g,12,11,23,22,'white',3);L(g,23,11,12,22,'white',3);
  });
  add('check-row',39,14,g=>{
    panel(g,0,0,39,14,'#35506b','#607e98');
  });
  window.Props={add};
})();
