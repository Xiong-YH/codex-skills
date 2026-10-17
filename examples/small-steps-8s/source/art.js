(() => {
  const {make,ctx,R,L,P,E,panel,check}=PX,items={};
  function add(name,w,h,paint,ax=w/2,ay=h/2){
    const native=make(w,h);paint(ctx(native));
    const hi=make(w*12,h*12);ctx(hi).drawImage(native,0,0,hi.width,hi.height);
    items[name]={native,hi,w,h,ax,ay};
  }
  function draw(g,name,x,y,scale=1,alpha=1,angle=0){
    if(alpha<=0)return;
    const a=items[name];g.save();g.globalAlpha*=alpha;
    g.translate(x*6,y*6);g.rotate(angle);g.scale(scale,scale);
    g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
    g.drawImage(a.hi,-a.ax*6,-a.ay*6,a.w*6,a.h*6);g.restore();
  }
  function studio(g){
    R(g,0,0,320,180,'#e4ebf8');R(g,289,0,31,142,'#c6d3ea');
    P(g,[[145,0],[289,0],[289,142],[184,142]],'#d7e1f3');
    panel(g,21,49,104,61,'#d3e2fa','#c0cde6');
    E(g,102,63,6,6,'#ffd18f');
    for(let i=0;i<7;i++){let h=11+(i*7)%20;R(g,25+i*14,106-h,10,h,i%2?'#b5c8e8':'#c0d2ed');}
    R(g,72,50,2,57,'white');R(g,23,88,100,2,'white');
    R(g,18,108,111,4,'slate');R(g,20,108,107,2,'white');
    R(g,13,47,7,63,'lilac');R(g,126,47,7,63,'lilac');
    R(g,0,140,320,40,'#bdcce3');R(g,0,139,320,2,'white');
    P(g,[[22,142],[122,142],[188,179],[41,179]],'#dce6f4');
    for(let i=0;i<6;i++)L(g,i*70,143,i*70-23,180,'#afc2dd');
    R(g,0,161,320,1,'#afc2dd');
    R(g,158,124,4,28,'woodShade');R(g,274,124,4,28,'woodShade');
    R(g,151,120,135,5,'woodShade');R(g,149,118,139,4,'woodLight');R(g,153,123,131,1,'white');
    E(g,218,148,67,4,'#9db1cf');
    panel(g,173,134,31,14,'wood','woodShade');R(g,185,137,8,2,'white');
    R(g,280,110,6,8,'white');R(g,281,109,5,1,'mint');
    L(g,283,109,283,88,'mintDark');
    for(const [x,y] of [[277,95],[288,99],[280,87]]){E(g,x,y,5,3,'mint');L(g,283,105,x,y,'mintDark');}
  }
  add('studio',320,180,studio,0,0);
  add('paper',320,180,g=>{
    R(g,0,0,320,180,'#edf1fa');P(g,[[0,0],[196,0],[256,180],[0,180]],'#e3eaf7');
    R(g,0,143,320,37,'#d2deee');R(g,0,142,320,1,'white');
    for(let i=0;i<8;i++)R(g,24+i*42,143,1,37,'#c7d5e9');
    R(g,0,165,320,1,'#c7d5e9');
    panel(g,29,47,105,57,'#f6f8ff','#cad7ec');
    R(g,36,55,50,3,'#d4dff3');R(g,36,63,77,2,'#e2e9f6');
    R(g,36,70,64,2,'#e2e9f6');R(g,36,78,75,2,'#e2e9f6');
    R(g,28,105,111,3,'#c0cee5');
    E(g,166,152,131,6,'#c0d0e8');
  },0,0);
  add('dark',320,180,g=>{
    R(g,0,0,320,180,'#192b45');
    for(let i=10;i>0;i--)E(g,180,87,i*14,i*9,['#192b45','#1b2e49','#1e324e','#213752'][Math.min(3,Math.floor((10-i)/3))]);
    for(let i=0;i<14;i++)R(g,i*24,45,1,100,'#233c59');
    for(let y=47;y<150;y+=24)R(g,0,y,320,1,'#233c59');
    R(g,0,146,320,34,'#203750');R(g,0,146,320,1,'#405475');
    P(g,[[25,151],[286,151],[318,173],[0,173]],'#243f59');
    L(g,11,166,304,166,'#35516d');
  },0,0);
  add('document',96,80,g=>{
    P(g,[[88,8],[94,14],[94,78],[14,78],[8,70]],'#708bb6');
    panel(g,8,6,80,64,'#f4f8ff','#95b4df');
    R(g,10,8,1,60,'white');R(g,12,10,72,3,'#b5efda');
    R(g,27,60,42,1,'#dbe7f4');R(g,33,64,29,1,'#e6eef8');
  },48,38);
  add('code',36,30,g=>{
    L(g,9,5,3,11,'blueDark',2);L(g,3,11,9,17,'blueDark',2);
    L(g,28,5,34,11,'blueDark',2);L(g,34,11,28,17,'blueDark',2);
    L(g,20,3,16,19,'mintDark',2);
    R(g,5,23,13,2,'blueLight');R(g,21,23,10,2,'lilac');R(g,10,27,18,1,'ice');
  });
  add('target',36,30,g=>{
    E(g,18,15,14,14,'#d4e8ee');E(g,18,15,11,11,'#7fcdb8');
    E(g,18,15,7,7,'#ecfff8');E(g,18,15,3,3,'#68b69f');
    L(g,19,14,29,4,'#d7ad69',2);P(g,[[25,3],[32,1],[30,8]],'#ffd18f');
  });
  add('system',36,30,g=>{
    L(g,8,9,27,9,'blueLight',2);L(g,18,9,18,23,'blueLight',2);
    for(const [x,y] of [[2,3],[24,3],[13,20]]){panel(g,x,y,10,8,'#b5efda','mintDark');R(g,x+2,y+2,5,1,'white');}
  });
  add('verified',36,30,g=>{
    E(g,18,15,14,14,'#c4f3df');E(g,18,15,11,11,'#77cdb5');
    check(g,10,10,'#f4fff8',1.5);
  });
  add('choice',36,30,g=>{
    L(g,18,27,18,15,'#96acd0',2);L(g,18,15,7,7,'#96acd0',2);L(g,18,15,29,7,'#77cdb5',2);
    E(g,7,7,5,5,'#c8d5ee');E(g,29,7,5,5,'#77cdb5');R(g,27,5,3,3,'white');
  });
  add('app',36,30,g=>{
    panel(g,1,2,34,26,'#edf5ff','#7d98c2');R(g,3,4,30,4,'blue');
    for(let i=0;i<3;i++)R(g,5+i*3,5,1,1,'white');
    panel(g,4,11,11,13,'#c6e8de','#a1c8c2');R(g,18,11,12,2,'#b5c9e6');
    R(g,18,16,10,1,'ice');R(g,18,20,10,4,'mint');
  });
  add('chip',44,44,g=>{
    for(let i=0;i<4;i++){R(g,4,10+i*7,36,3,'#627ba7');R(g,10+i*7,4,3,36,'#627ba7');}
    panel(g,8,8,28,28,'#5367c9','#98bbff');panel(g,12,12,20,20,'#778be2','#b7c9fb');
    R(g,16,17,3,4,'#ecfff8');R(g,25,17,3,4,'#ecfff8');R(g,18,25,8,2,'#b5efda');
  });
  add('brick',32,14,g=>{
    R(g,2,3,30,11,'#7894be');panel(g,0,0,30,11,'#e0eaff','#9ab5df');
    R(g,4,4,5,2,'blue');R(g,11,4,10,2,'lilac');R(g,23,4,3,2,'mint');
  });
  add('module',58,34,g=>{
    P(g,[[2,2],[53,2],[57,7],[57,33],[6,33],[2,29]],'#617eaa');
    panel(g,1,1,52,28,'#f1f6ff','#91aeda');R(g,5,5,44,3,'mintLight');
    for(let y=13;y<26;y+=6){R(g,7,y,5,2,'blueLight');R(g,16,y,27,2,'ice');}
  });
  add('database',36,36,g=>{
    R(g,4,9,28,22,'#8eb2d4');E(g,18,30,14,5,'#6b92ba');
    E(g,18,9,14,5,'#d5e6fa');E(g,18,9,11,3,'#a5c9e6');
    for(let y=16;y<29;y+=7){L(g,5,y,5,y+2,'#d8e9ff',1);L(g,8,y+3,28,y+3,'#b8d4ee',1);}
    R(g,9,15,2,13,'#d5e6fa');
  });
  add('magnifier',56,58,g=>{
    P(g,[[32,34],[38,29],[53,48],[47,54]],'#718ab2');
    P(g,[[35,37],[38,35],[50,49],[47,51]],'#a6bee2');
    E(g,23,23,20,20,'#6382b3');E(g,23,23,17,17,'#c9ddf4');
    g.globalCompositeOperation='destination-out';E(g,23,23,14,14,'white');g.globalCompositeOperation='source-over';
    L(g,10,17,14,11,'white',2);L(g,14,11,20,8,'white',2);
  },23,23);
  add('step',78,33,g=>{
    P(g,[[3,12],[66,12],[76,3],[76,22],[65,31],[3,31]],'#96b1d3');
    P(g,[[3,12],[66,12],[76,3],[14,3]],'#e8f5f5');
    L(g,3,13,65,13,'white',1);L(g,66,13,76,4,'#b5efda',1);
    R(g,10,19,48,2,'#b5c9e5');
  });
  window.Art={draw,items};
})();
