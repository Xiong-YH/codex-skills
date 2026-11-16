(function () {
  'use strict';

  const { clamp, ease, motion, particleEffects, signalParticles } = PixelVideo;
  const width = 640, height = 360, fps = 60;
  const cues = { approach:10, contact:28, release:34, settled:56, end:95 };
  const C = {
    background:'#14252c', line:'#324b50', plate:'#254048', muted:'#a5b9b3',
    light:'#ecf0de', mint:'#9de2cd', paper:'#eed8a9', gold:'#ffd391',
    shadow:'#0d2027', chalk:'#ddd5b9'
  };
  const colors = { gold:C.gold, accent:C.mint, ink:C.shadow };
  const receivers = [[437,129],[487,129],[487,207],[431,207]];
  const checkPattern = [
    '.......', '.....##', '....##.', '#..##..', '####...', '.##....', '.......'
  ];
  const cells = checkPattern.flatMap((row,y) => [...row].flatMap((value,x) =>
    value==='#'?[[236+x*24,90+y*24,y<3?'#c1e1c7':'#8fcab8']]:[]));
  const fraction = (frame, start = cues.contact, end = cues.settled) => clamp((frame-start)/(end-start));

  function rect(g,x,y,w,h,color) {
    g.fillStyle=color;
    g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));
  }
  function label(g,text,x,y,color=C.light,size=25) {
    g.font=`600 ${size}px "Microsoft YaHei",system-ui,sans-serif`;
    g.fillStyle=color;
    g.textAlign='center';
    g.textBaseline='middle';
    g.fillText(text,x,y);
  }
  function path(g,points,color,width) {
    g.beginPath();
    g.moveTo(...points[0]);
    for (const point of points.slice(1)) g.lineTo(...point);
    g.strokeStyle=color;
    g.lineWidth=width;
    g.stroke();
  }
  function plate(g,x,y,w,h,color) {
    rect(g,x+5,y+5,w,h,C.shadow);
    rect(g,x+5,y,w-10,h,color);
    rect(g,x,y+5,w,h-10,color);
    rect(g,x+7,y+3,w-14,2,'#ffffff36');
  }
  function field(g) {
    rect(g,0,0,width,height,C.background);
    for(let x=32;x<width;x+=32)rect(g,x,0,1,height,'#97b6aa0c');
    for(let y=24;y<height;y+=24)rect(g,0,y,width,1,'#97b6aa0c');
    rect(g,42,284,556,1,C.line);
  }
  function signal(g,frame) {
    const { contact, release, settled } = cues;
    const moving=ease(fraction(frame,cues.approach,contact));
    const landed=frame>=contact, ready=frame>=settled;
    const recoil=landed?Math.round(Math.sin(Math.PI*fraction(frame,contact,release+6))*7):0;
    const left=Math.round(108+(299-108)*moving)+recoil;
    plate(g,296,99,145,60,C.shadow);
    const points=[[receivers[0][0]+recoil,receivers[0][1]],...receivers.slice(1)];
    path(g,points,ready?'#7eb49c':C.line,3);
    plate(g,296,185,135,45,ready?C.mint:C.plate);
    label(g,'确认',363,208,ready?C.shadow:C.muted);
    plate(g,left,107,130,43,landed?C.mint:C.paper);
    label(g,'凭条',left+65,129,C.shadow);
    rect(g,429+recoil,106,8,45,frame>=contact&&frame<contact+5?C.light:C.muted);
    signalParticles.draw(g,{points,contact,release,arrival:settled,size:9,color:'#88cdb9',highlight:'#e5ffec'},frame);
    label(g,ready?'已解锁':'待确认',320,313,ready?C.mint:C.muted);
  }

  function gather(g,frame) {
    rect(g,225,67,190,190,C.line);
    rect(g,227,69,186,186,C.shadow);
    particleEffects.gather(g,{cells,size:24,spread:103,seed:7},fraction(frame));
    const done=frame>=cues.settled;
    label(g,done?'图标已就绪':'等待拼合',320,313,done?C.mint:C.muted);
  }

  function dust(g,frame) {
    const groundY=249;
    const fall=fraction(frame,cues.approach,cues.contact);
    const rebound=frame>=cues.contact?Math.sin(Math.PI*fraction(frame,cues.contact,cues.release+2))*5:0;
    const bottom=Math.round(groundY-125*(1-fall**2)-rebound);
    rect(g,76,groundY,488,18,'#36494a');
    rect(g,76,groundY,488,3,'#7f8e79');
    rect(g,243,groundY+4,154,7,'#20343a');
    const p=(frame-cues.contact)/(cues.settled-cues.contact);
    for (const x of [252,388]) {
      particleEffects.dust(g,{x,groundY,reach:70,size:7,color:C.chalk,seed:x},p);
    }
    plate(g,252,bottom-65,136,65,C.paper);
    rect(g,263,bottom-62,114,45,'#b59565');
    rect(g,265,bottom-60,110,41,C.paper);
    label(g,'木箱',320,bottom-40,C.shadow);
    const done=frame>=cues.settled;
    label(g,done?'已落稳':'落箱',320,313,done?C.mint:C.muted);
  }

  function confirm(g,frame,emphasis) {
    const done=frame>=cues.contact;
    const x=320,y=159;
    plate(g,x-41,y-41,82,82,done?'#4e9d89':C.plate);
    if(done)path(g,[[x-18,y],[x-5,y+13],[x+20,y-14]],C.light,7);
    else rect(g,x-14,y-3,28,6,'#759493');
    if (emphasis) {
      const recipe={recipe:'motion.gold-burst.v1',startFrame:cues.contact,endFrame:cues.settled,
        params:{x:x/width,y:y/height}};
      motion.effects({ctx:g,width,height,pixel:4,colors},[recipe],frame);
    } else if (done) {
      g.save();
      g.translate(x,y);
      g.scale(2,2);
      motion.gameFeedback.burst(g,0,0,(frame-cues.contact)/17,'#e7fff1',60);
      g.restore();
    }
    label(g,done?'已校验':'待校验',320,313,done?C.mint:C.muted);
  }

  function sparks(g,frame) {
    const done=frame>=cues.contact;
    const hit=fraction(frame,cues.contact,cues.release+7);
    const shift=done?Math.round(Math.sin(Math.PI*hit)*10):0;
    const x=Math.round(128+(318-128)*ease(fraction(frame,cues.approach,cues.contact)))+shift;
    rect(g,83,156,335,14,'#586165');
    plate(g,x,111,92,47,'#c39a58');
    label(g,'推杆',x+46,134,C.shadow);
    rect(g,410+shift,105,18,66,done?C.gold:'#8a8472');
    const recipe={recipe:'motion.contact-fx.v1',startFrame:cues.contact,endFrame:cues.settled,
      params:{style:'sparks',profile:'impact',direction:0,x:410/width,y:133/height,radius:.27,strength:.97,seed:13}};
    motion.effects({ctx:g,width,height,pixel:3,colors,seed:13},[recipe],frame);
    label(g,done?'已触底':'推杆入位',320,313,done?C.gold:C.muted);
  }

  const textures=new WeakMap();
  function shatter(g,frame) {
    const parent=g.canvas;
    if (!textures.has(parent)) {
      const previous=document.createElement('canvas');
      previous.width=width;
      previous.height=height;
      const ink=previous.getContext('2d');
      rect(ink,0,0,width,height,'#354952');
      for (let x=24;x<width;x+=32) rect(ink,x,0,1,height,'#a5b8ba30');
      plate(ink,158,102,324,117,'#213139');
      label(ink,'旧面板',320,158,C.light,40);
      textures.set(parent,{previous,propCache:{}});
    }
    const {previous,propCache}=textures.get(parent);
    plate(g,170,110,300,104,'#477f70');
    label(g,'新结构',320,158,C.light,40);
    const recipe={startFrame:cues.contact,endFrame:cues.settled,params:{x:.58,y:.41,seed:17}};
    motion.shatter({ctx:g,width,height,pixel:3,colors,propCache},previous,recipe,frame);
    label(g,frame>=cues.settled?'新场已露出':'面板切换',320,313,C.muted);
  }

  const effects = {
    signal:{ title:'导槽传递', use:'把输入送到接收端，建立操作与结果的先后。', trigger:'凭条碰到止挡，像素块沿槽转弯。', end:'粒子到达帧解锁，按钮保持可用。', call:'独立 Canvas · signalParticles.draw', draw:signal },
    gather:{ title:'像素汇聚', use:'把已有片段组织成一个看得懂的结果。', trigger:'开始组装后，像素各自向目标格移动。', end:'组成勾选图标，直接保持成形结果。', call:'独立 Canvas · particleEffects.gather', draw:gather },
    dust:{ title:'触地扬尘', use:'让贴地接触有重量，适合干燥地面上的落箱。', trigger:'箱底首次到达承托面，尘粒沿地面散开。', end:'尘粒消散，木箱留在原落点。', call:'独立 Canvas · particleEffects.dust', draw:dust },
    confirm:{ title:'四向确认点', use:'轻提示一个条件已通过。', trigger:'结果标签变为已校验，四周短暂亮点。', end:'亮点收掉，保留确认文字。', call:'场景辅助 · motion.gameFeedback.burst', draw:(g,f)=>confirm(g,f,false) },
    sparks:{ title:'定向火花', use:'强调金属碰撞或有材质依据的放电。', trigger:'推杆撞止挡，火花向受力方向扇出。', end:'火花消散，推杆与止挡落稳。', call:'Canvas 配方 · motion.contact-fx.v1', draw:sparks },
    gold:{ title:'金色完成爆发', use:'让真实完成的阈值或阶段成为主拍。', trigger:'校验状态变化时启动一次径向爆发。', end:'爆发消散，结果仍能读。', call:'Canvas 配方 · motion.gold-burst.v1', draw:(g,f)=>confirm(g,f,true) },
    shatter:{ title:'纹理碎片揭示', use:'演出旧覆盖层破开并露出下一画面。', trigger:'切入新镜，裂纹从指定点展开。', end:'旧纹理全部离场，新画面接住。', call:'Canvas 配方 · motion.shatter-reveal.v1', draw:shatter }
  };
  const get=id=>document.getElementById(id);
  const query=new URLSearchParams(location.search);
  const embedded=query.get('embed')==='1';
  if(embedded)document.body.dataset.embed='1';
  const sides=embedded?['left']:['left','right'];
  const selected={left:'signal',right:'gather'};
  const effect=query.get('effect');
  if(Object.hasOwn(effects,effect))selected.left=effect;
  for (const side of sides) {
    const select=get(side+'-effect');
    for (const [key, entry] of Object.entries(effects)) {
      const option=document.createElement('option');
      option.value=key;
      option.textContent=entry.title;
      select.appendChild(option);
    }
    select.value=selected[side];
    select.onchange=()=>{
      selected[side]=select.value;
      annotate(side);
      show(frame);
    };
    annotate(side);
  }
  function annotate(side) {
    const entry=effects[selected[side]];
    for (const key of ['title','use','trigger','end','call']) {
      get(side+'-'+key).textContent=entry[key];
    }
  }
  function render(g,id,frame) {
    field(g);
    effects[id].draw(g,frame);
  }

  const play=get('play'), speed=get('speed'), seek=get('seek'), clock=get('clock');
  seek.max=cues.end;
  let frame=0, rate=Number(speed.value), start=0, request=null;
  function show(value) {
    frame=Math.round(clamp(Number(value),0,cues.end));
    for (const side of sides) render(get(side+'-canvas').getContext('2d'),selected[side],frame);
    seek.value=frame;
    clock.value=(frame/fps).toFixed(2)+' / '+(cues.end/fps).toFixed(2)+' 秒';
  }
  function pause() {
    if(request!==null)cancelAnimationFrame(request);
    request=null;
    play.textContent=frame===cues.end?'重播':'播放';
  }
  function tick(now) {
    show((now-start)*fps*rate/1000);
    if(frame===cues.end)pause();
    else request=requestAnimationFrame(tick);
  }
  function jump(frame) {
    pause();
    show(frame);
    if(frame!==cues.end)play.textContent='播放';
  }
  play.onclick=()=>{
    if(request!==null){pause();return;}
    if(frame===cues.end)show(0);
    start=performance.now()-frame*1000/(fps*rate);
    play.textContent='暂停';
    request=requestAnimationFrame(tick);
  };
  speed.onchange=()=>{
    rate=Number(speed.value);
    if(request!==null)start=performance.now()-frame*1000/(fps*rate);
  };
  seek.oninput=()=>jump(seek.value);
  get('contact').onclick=()=>jump(cues.contact);
  get('end').onclick=()=>jump(cues.settled);
  show(0);
})();
