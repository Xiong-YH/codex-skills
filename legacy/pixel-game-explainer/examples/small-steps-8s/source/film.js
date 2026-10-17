(() => {
  const {make,ctx,R,L,P,E,spark,check}=PX;
  const {smooth,lerp,mix}=Motion;
  const canvas=make(1920,1080),g=ctx(canvas),sprites={};
  const font='"Microsoft YaHei", "PingFang SC", sans-serif';

  function asset(name,w,h,paint){
    const native=make(w,h);paint(ctx(native));
    const hi=make(w*12,h*12);ctx(hi).drawImage(native,0,0,hi.width,hi.height);
    sprites[name]={hi,w,h};
  }
  function image(name,x,y,sx=1,sy=sx,alpha=1){
    if(alpha<=0)return;
    const a=sprites[name];g.save();g.globalAlpha*=alpha;
    g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
    g.drawImage(a.hi,x*6,y*6,a.w*sx*6,a.h*sy*6);g.restore();
  }
  function txt(text,x,y,size=32,color='#eaf5ff',align='center',weight=600){
    V.text(g,text,x,y,size,color,align,weight);
  }
  asset('world',320,180,c=>{
    R(c,0,0,320,180,'#16293e');
    R(c,0,40,320,65,'#1a3048');
    R(c,0,105,320,38,'#21384d');
    for(const [x,y,s] of [[17,53,1],[47,43,1],[79,60,2],[99,44,1],[136,52,1],[210,43,1],[279,44,2],[303,67,1]]){
      R(c,x,y,s,s,'#7695ad');
    }
    R(c,20,69,24,2,'#314f65');R(c,16,71,32,3,'#314f65');
    R(c,277,58,22,2,'#314f65');R(c,272,60,30,3,'#314f65');
    P(c,[[0,130],[0,111],[19,111],[19,101],[33,101],[33,116],[53,116],[53,126],[76,126],[76,108],[91,108],[91,120],[110,120],[110,143],[0,143]],'#29465a');
    P(c,[[238,143],[238,114],[255,114],[255,104],[272,104],[272,117],[291,117],[291,94],[309,94],[309,112],[320,112],[320,143]],'#29465a');
    R(c,0,144,320,36,'#102538');R(c,0,143,320,2,'#416477');
    R(c,0,145,320,2,'#294252');
    for(let x=0;x<320;x+=16){R(c,x,149,9,1,'#1d384b');R(c,x+7,156,11,1,'#1b3446');}
    P(c,[[0,180],[0,165],[320,165],[320,180]],'#13283b');
    R(c,16,135,2,8,'#427c70');R(c,12,136,4,2,'#71bc9b');R(c,18,133,4,2,'#71bc9b');
    R(c,297,135,2,8,'#427c70');R(c,293,134,4,2,'#71bc9b');R(c,299,138,4,2,'#71bc9b');
    for(const [x,y] of [[7,153],[95,151],[275,151],[313,159]])R(c,x,y,2,2,'#476274');
  });
  asset('slab',96,24,c=>{
    P(c,[[3,0],[92,0],[96,4],[96,20],[92,24],[3,24],[0,20],[0,4]],'#101f32');
    R(c,2,2,92,19,'#456379');R(c,2,2,92,4,'#91b4b6');
    R(c,4,2,88,2,'#adcac8');R(c,3,6,89,2,'#54798b');
    R(c,5,19,85,2,'#294557');R(c,90,7,3,12,'#304d60');
    R(c,7,10,13,2,'#53778b');R(c,27,15,18,2,'#3b586e');R(c,66,10,16,2,'#53778b');
    L(c,52,7,48,11,'#304c60');L(c,48,11,52,15,'#304c60');
    R(c,6,5,2,12,'#668e9c');
  });
  asset('slab-lit',96,24,c=>{
    P(c,[[3,0],[92,0],[96,4],[96,20],[92,24],[3,24],[0,20],[0,4]],'#183f48');
    R(c,2,2,92,19,'#2a6668');R(c,2,2,92,4,'#82e0ba');
    R(c,4,2,88,2,'#c1ffe0');R(c,3,6,89,2,'#53a691');
    R(c,5,19,85,2,'#204a54');R(c,90,7,3,12,'#25505a');
    R(c,8,12,11,2,'#397f79');R(c,71,12,13,2,'#397f79');
    R(c,6,5,2,12,'#63b6a0');
  });
  asset('flag',20,31,c=>{
    R(c,2,0,2,29,'#d7e7dc');R(c,1,29,8,2,'#4f7b7d');
    P(c,[[4,1],[19,1],[15,7],[19,12],[4,12]],'#ffd27c');
    R(c,5,2,10,2,'#fff0ba');R(c,5,10,12,2,'#c49a5f');
  });
  asset('diamond',9,11,c=>{
    P(c,[[4,0],[8,5],[4,10],[0,5]],'#75dcbc');
    P(c,[[4,1],[4,8],[1,5]],'#c4ffe5');
  });
  asset('check',14,13,c=>check(c,2,3,'#c0ffe0',1));

  const landings=[2.85,3.85,4.85],stepXs=[128,185,242],stepTops=[126,102,78];
  function stepPose(i,t){
    const p=smooth(t,1.8+i*.045,2.5+i*.045);
    return {x:lerp(178,stepXs[i],p),y:lerp(116-i*24,stepTops[i],p),sx:lerp(1,52/96,p),sy:lerp(1,.75,p),p};
  }
  function hero(t){
    let x=52,y=143;
    const route=[{a:2.50,b:2.85,x:128,y:126,h:23},{a:3.45,b:3.85,x:185,y:102,h:18},{a:4.45,b:4.85,x:242,y:78,h:12}];
    let ox=x,oy=y;
    for(const jump of route){
      if(t<jump.a)break;
      const p=Math.min(1,Math.max(0,(t-jump.a)/(jump.b-jump.a)));
      const eased=p*p*(3-2*p);
      x=lerp(ox,jump.x,eased);y=lerp(oy,jump.y,p)-Math.sin(p*Math.PI)*jump.h;
      if(p<1)break;
      ox=jump.x;oy=jump.y;
    }
    if(t>=5.1)x+=9*smooth(t,5.1,5.55);
    return {x,y};
  }
  function particles(t,at,x,y,color='#b5efda',count=9){
    const age=t-at;
    if(age<0||age>.65)return;
    const p=age/.65;
    g.save();g.globalAlpha*=Math.pow(1-p,1.2);g.fillStyle=color;
    for(let i=0;i<count;i++){
      const angle=(i/count)*Math.PI*2-.3;
      const dx=Math.cos(angle)*(5+20*p),dy=Math.sin(angle)*(4+14*p)+12*p*p;
      g.fillRect((x+dx)*6,(y+dy)*6,(i%3===0?2:1)*6,(i%3===0?2:1)*6);
    }
    g.restore();
  }
  function environment(t){
    image('world',0,0);
    // The ground is a single shared anchor across the whole shot.
    g.fillStyle='#90e4bf';g.fillRect(27*6,142*6,53*6,1*6);
    const reveal=smooth(t,1.75,2.55);
    for(let i=0;i<3;i++){
      const o=stepPose(i,t),lit=smooth(t,landings[i],landings[i]+.12);
      image('slab',o.x-48*o.sx,o.y,o.sx,o.sy);
      if(lit)image('slab-lit',o.x-48*o.sx,o.y,o.sx,o.sy,lit);
      mix(g,reveal,()=>txt(['先开始','做一点','再一点'][i],o.x,o.y+12.5,27,lit?'#d6ffe9':'#c5d6df'));
      const wait=reveal*(1-smooth(t,landings[i]-.04,landings[i]+.08));
      image('diamond',o.x-4.5,o.y-51+Math.sin(t*2.2+i)*1.2,1,1,wait*.9);
      particles(t,landings[i],stepXs[i],stepTops[i]-4);
    }
    mix(g,1-smooth(t,1.65,1.95),()=>{
      txt('一个大任务',178,101,48,'#edf8fb');
      txt('不知道从哪里开始',178,114,25,'#bdced9','center',500);
    });
    const f=smooth(t,2.05,2.60),raise=smooth(t,5.62,5.92);
    mix(g,f,()=>{
      const fy=47;
      g.fillStyle='#658a8b';g.fillRect(263*6,fy*6,2*6,31*6);
      if(raise>0)image('flag',261,lerp(62,47,raise),1,1,raise);
    });
    const h=hero(t);
    // The supplied tiny-body character keeps its original pixel proportions.
    V.actor(g,Runtime.lead,h.x,h.y-1,1.15,t,true);
    if(t<2.1){
      mix(g,smooth(t,.25,.5)*(1-smooth(t,1.6,1.85)),()=>{
        g.fillStyle='#ffd283';g.fillRect(89*6,109*6,2*6,9*6);g.fillRect(89*6,121*6,2*6,2*6);
      });
    }
    particles(t,5.65,262,46,'#ffdb8b',16);
    const done=smooth(t,5.68,6.10);
    mix(g,done,()=>{
      image('check',94,70,1.4);
      txt('任务完成',147,85,64,'#c0ffe0');
      txt('每一步，都算进度。',147,99,29,'#abc9cd','center',500);
    });
  }
  function headings(t){
    let text='任务太大，无从下手？';
    if(t>=1.8&&t<5.6)text='把大任务，拆成小步。';
    if(t>=5.6)text='小步，也能走到终点。';
    txt(text,22,29,62,t>=5.6?'#bdf3d8':'#f0f6ff','left',700);
    txt('PIXEL QUEST  /  01',22,12,19,'#7fa1b4','left',500);
    const n=landings.filter(at=>t>=at).length;
    txt(`${String(n).padStart(2,'0')} / 03`,298,28,26,'#90bead','right',500);
    for(let i=0;i<3;i++){
      g.fillStyle=t>=landings[i]?'#a8ebcd':'#355366';
      g.fillRect((274+i*9)*6,35*6,6*6,2*6);
    }
  }
  function draw(t){
    t=Math.max(0,Math.min(Runtime.duration-.001,t));
    g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,1920,1080);
    environment(t);headings(t);V.captions(g,t,true);
    return canvas;
  }
  window.ProgrammerFilm={draw,shots:Runtime.chapters,duration:Runtime.duration,fps:Runtime.fps,ready:V.ready,hero,stepPose};
})();
