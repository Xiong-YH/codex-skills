(function(P){
 'use strict';
 function imageBounds(e,c,b){
  if(c.kind!=='identity'||!(c.data.imageKey||c.data.sourceShot))return null;
  if(c.visualStyle==='plain'){const p=30*e.height/1080;return c.data.fit==='full'?b:{x:b.x+p,y:b.y+p,width:b.width*.37,height:b.height-2*p};}
  const S=b.width/480,HH=b.height/S,u=e.height/1080;
  if(HH<180){const size=Math.max(1,b.height-48*u);return{x:b.x+24*u,y:b.y+24*u,width:size,height:size};}
  return{x:b.x+52*S,y:b.y+39*S,width:129*S,height:(HH-81)*S};
 }
 // A wide identity is a row/banner, not a flattened portrait apparatus.
 // Keep output-sized text and the same material tokens during layout reflow.
 function compactIdentity(e,c,b,t,H){
  const g=e.ctx,u=e.height/1080,p=24*u,d=c.data,edge=t.mechanical?t.rim:t.charge;
  const r=(x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
  if(t.styleVariant==='open'){
   r(b.x,b.y+b.height-3*u,b.width,2*u,edge);r(b.x,b.y,3*u,12*u,t.rim);r(b.x+b.width-3*u,b.y,3*u,12*u,t.rim);
  }else if(t.styleVariant==='relay'){
   const yy=b.y+b.height-7*u;r(b.x,yy,b.width,5*u,t.metal);r(b.x,yy,b.width,1*u,edge);
   const at=b.x+(b.width-10*u)*P.ease(t.action);r(at,yy-4*u,10*u,12*u,edge);
   if(t.mechanical)for(let k=0;k<b.width;k+=14*u)r(b.x+k,yy-4*u,6*u,4*u,t.rim);
  }else{
  r(b.x+5*u,b.y+7*u,b.width,b.height,t.deep);r(b.x+4*u,b.y,b.width-8*u,b.height,edge);r(b.x,b.y+4*u,b.width,b.height-8*u,edge);
  r(b.x+3*u,b.y+3*u,b.width-6*u,b.height-6*u,t.metal);r(b.x+8*u,b.y+8*u,b.width-16*u,b.height-16*u,t.inset);
  r(b.x+11*u,b.y+10*u,b.width-22*u,2*u,t.light);r(b.x+11*u,b.y+b.height-12*u,b.width-22*u,3*u,t.deep);
  }
  if(t.stack){r(b.x+6*u,b.y+b.height+3*u,b.width-12*u,3*u,t.metal);r(b.x+12*u,b.y+b.height+8*u,b.width-24*u,2*u,t.rim);}
  const image=imageBounds(e,c,b);if(image)H.picture(e,d,image);
  const x=image?image.x+image.width+p:b.x+p,w=b.x+b.width-p-x,row=b.height/b.width<.24;
  if(row){H.text(e,d.title,{x,y:b.y+p,width:w*.36,height:b.height-p*2},38,t.ink,'left',1);
    if(d.detail)H.text(e,d.detail,{x:x+w*.40,y:b.y+p,width:w*.60,height:b.height-p*2},26,t.muted,'left',2);
  }else{H.text(e,d.title,{x,y:b.y+b.height*.16,width:w,height:b.height*.36},40,t.ink,'left',2);
    if(d.detail)H.text(e,d.detail,{x,y:b.y+b.height*.58,width:w,height:b.height*.26},26,t.muted,'left',2);}
  return true;
 }
 function draw(e,c,b,t,s,H){
  const g=e.ctx,W=480,S=b.width/W,HH=b.height/S,U=1;
  if(c.kind==='identity'&&HH<180)return compactIdentity(e,c,b,t,H);
  const local={...e,width:W,height:1080},M=t.mechanical,V=t.styleVariant||'inset',ink=t.ink,muted=t.muted,gold='#efb758',dark='#0b1b25',cyan='#74c6c9';
  const r=(x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))};
  const poly=(pts,col)=>{g.beginPath();pts.forEach(([x,y],i)=>i?g.lineTo(Math.round(x),Math.round(y)):g.moveTo(Math.round(x),Math.round(y)));g.closePath();g.fillStyle=col;g.fill()};
  const line=(pts,col,w=2)=>{g.beginPath();pts.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.strokeStyle=col;g.lineWidth=w;g.stroke()};
  const text=(value,x,y,w,h,size=13,col=ink,align='center',lines=2)=>H.text(local,value,{x,y,width:w,height:h},size,col,align,lines);
  const pic=(data,x,y,w,h)=>H.picture(local,data,{x,y,width:w,height:h});
  const phase=id=>t.phase(id),ease=P.ease,clamp=P.clamp;
  function glow(x,y,size,a=.35){if(M||a<=0)return;g.save();g.globalAlpha*=a;const v=g.createRadialGradient(x,y,0,x,y,size);v.addColorStop(0,cyan);v.addColorStop(1,'transparent');g.fillStyle=v;g.fillRect(x-size,y-size,size*2,size*2);g.restore()}
  function cog(x,y,R,p=1,sign=1){
   const id='brass',record=e.style.componentGearAssets?.[id],asset=record&&e.assets[record.assetKey];
   if(!asset)throw Error('Missing approved gear sprite: '+id+'; rebuild the project with component assets');
   const crop=record.crop,angle=p>0&&p<1?ease(p)*Math.PI*2*sign:0,cache=e.propCache||(e.propCache={});
   // A single thin side surface, not several translated copies of the gear.
   // Extrusion stays down/right in world space while the front face rotates.
   const tick=Math.round(angle*48/(Math.PI*2)),frontAngle=t.stack?tick*Math.PI*2/48:angle;
   g.save();try{g.translate(x,y);g.imageSmoothingEnabled=false;
    if(t.stack){const key='gear-sidewall-v2.'+id+'.'+((tick%48+48)%48);let side=cache[key];
     if(!side){const n=128,faceSize=104,dx=3,dy=2,steps=6,face=e.createCanvas(n,n),fg=face.getContext('2d');fg.imageSmoothingEnabled=false;fg.translate(n/2,n/2);fg.rotate(frontAngle);fg.drawImage(asset,...crop,-faceSize/2,-faceSize/2,faceSize,faceSize);const alpha=fg.getImageData(0,0,n,n).data;
      side=e.createCanvas(n+dx,n+dy);const sg=side.getContext('2d'),pixels=sg.createImageData(side.width,side.height);
      for(let step=steps;step>=1;step--){const sx=Math.round(dx*step/steps),sy=Math.round(dy*step/steps),shade=1-step/steps;
       for(let yy=0;yy<n;yy++)for(let xx=0;xx<n;xx++){if(alpha[(yy*n+xx)*4+3]<200)continue;const tx=xx+sx,ty=yy+sy;if(tx<n&&ty<n&&alpha[(ty*n+tx)*4+3]>32)continue;const j=(ty*side.width+tx)*4;pixels.data[j]=Math.round(99+shade*42);pixels.data[j+1]=Math.round(65+shade*28);pixels.data[j+2]=Math.round(34+shade*14);pixels.data[j+3]=255;}
      }sg.putImageData(pixels,0,0);cache[key]=side;
     }const scale=R*2/104;g.drawImage(side,-64*scale,-64*scale,side.width*scale,side.height*scale);
    }
    g.rotate(frontAngle);g.drawImage(asset,...crop,-R,-R,R*2,R*2);
   }finally{g.restore()}
  }
  function metalSolid(x,y,w,h){P.componentMaterials.iron(g,x,y,w,h);}
  // Variant changes the carrier, not just its edge colour. Small hardware stays solid.
  function metal(x,y,w,h){
   if(V==='inset'||w<62||h<23)return metalSolid(x,y,w,h);
   if(t.stack){r(x+5,y+h+3,w-10,3,'#634126');r(x+10,y+h+7,w-20,2,'#a77c46')}
   if(V==='open'){r(x,y+h-3,w,3,'#a76f33');r(x,y+h-3,w,1,'#f8d28b');r(x,y,3,9,gold);r(x+w-3,y,3,9,gold);return}
   r(x,y,w,5,'#734d28');r(x,y,w,1,'#f8d28b');r(x,y+h-4,w,4,'#7d5830');
   for(let k=5;k<w-5;k+=12)r(x+k,y-3,5,3,gold);
   const px=x+(w-8)*P.ease(t.action);r(px,y-2,8,9,'#e6bc70');
  }
  function base(x,y,w,active=true){
   const edge=M?'#b98948':active?'#7bb9b0':'#59716e';
   if(V==='open'&&!t.stack){r(x,y,w,2,edge);return;}
   P.componentMaterials.base(g,x,y,w,{edge,stack:t.stack,active});
  }
  function housing(x,y,w,h){
   if(M)return metal(x,y,w,h);
   if(t.stack){r(x+5,y+5,w,h,'#2d484e');r(x+8,y+8,w,h,'#172b33')}
   if(V==='open'){r(x,y+h-2,w,2,'#83cdbf');r(x,y+4,2,Math.max(2,h-11),'#668d8b');r(x+w-2,y+4,2,Math.max(2,h-11),'#668d8b');metalSolid(x-2,y-2,12,7);metalSolid(x+w-10,y-2,12,7);return}
   if(V==='relay'){route([[x,y+h-2],[x+w,y+h-2]],t.action);metalSolid(x-2,y+h-7,12,12);metalSolid(x+w-10,y+h-7,12,12);r(x,y,2,9,'#d2b16b');r(x+w-2,y,2,9,'#d2b16b');return}
   const glass=g.createLinearGradient(x,y,x,y+h);glass.addColorStop(0,'#3e6869e6');glass.addColorStop(.22,'#23474de6');glass.addColorStop(1,'#172f3ae6');g.fillStyle=glass;g.fillRect(x,y,w,h);
   r(x+2,y,w-4,1,'#9acdbb');r(x,y+2,1,h-4,'#75a7a0');r(x+w-1,y+2,1,h-4,'#486f76');r(x+6,y+6,w-12,1,'#a4e2d13f');
   for(const a of [x-2,x+w-10])for(const z of [y-2,y+h-5])metalSolid(a,z,12,7);
   if(w>28)r(x+12,y+h-3,w-24,1,'#52827e');
  }
  function tube(x,y,w,h,fill,active=true){
   if(w<=0||h<=0)return;
   const inset=Math.min(5,w*.22,h*.22);
   const chamber=h-2*inset,depth=chamber*clamp(fill),surface=y+h-inset-depth;
   r(x-2,y,w+4,h,'#102932');
   r(x,y,w,h,'#467175');
   r(x+inset,y+inset,w-2*inset,chamber,'#15363d');
   if(depth>0){
    r(x+inset,surface,w-2*inset,depth,'#2d8079');
    r(x+inset+w*.13,surface,w*.38,depth,'#5fa995');
    r(x+inset,surface,w-2*inset,Math.min(2,depth),'#cbeed3');
    glow(x+w/2,surface,w*1.05,active?.13:.05);
   }
   r(x+inset,y+inset,Math.min(2,w*.14),chamber,'#c0e3d378');
   r(x+w-inset-1,y+inset,1,chamber,'#78a99d');
   const cap=Math.min(10,h*.33),lip=Math.min(5,w*.27);
   for(const capY of [y-cap*.6,y+h-cap*.3]){
    r(x-lip,capY,w+2*lip,cap,'#695435');
    r(x-lip,capY,w+2*lip,Math.min(2,cap*.25),'#e7c892');
    r(x-lip+1,capY+cap*.26,w+2*lip-2,cap*.39,'#aa8653');
   }
   for(let k=1;k<5;k++)r(x+w+3,y+k*h/5,4,1,'#76988f');
  }
  function rotorPod(x,y,R,p,active=true,foot){
   if(M){
    cog(x,y,R,p);
    if(foot!==undefined||V==='inset')r(x-3,y+R-3,6,(foot??y+R+14)-(y+R-3),'#a16a35');
    return;
   }
   if(foot!==undefined)r(x-3,y+R-3,6,foot-(y+R-3),'#527d79');
   poly([[x-R,y],[x-R*.6,y-R],[x+R*.6,y-R],[x+R,y],[x+R*.6,y+R],[x-R*.6,y+R]],'#195674');
   poly([[x-R+4,y],[x-R*.5,y-R+4],[x+R*.5,y-R+4],[x+R-4,y],[x+R*.5,y+R-4],[x-R*.5,y+R-4]],'#0b2d43');
   if(active){glow(x,y,R*2,.35);poly([[x-9,y],[x,y-13],[x+9,y],[x,y+13]],cyan);r(x-2,y-7,3,7,'#e3ffff')}
  }
  function route(points,p,active=true){
   line(points,dark,M?8:9);
   line(points,'#365461',M?5:6);
   if(!active)return;
   if(M){line(points,'#9c783d',5);line(points,gold,1);return;}
   const {trace,head}=P.motion.tracePath(points,ease(p));
   if(trace.length>1){line(trace,'#27767d',5);line(trace,cyan,2);}
   if(p>0&&p<1){r(head[0]-2,head[1]-2,4,4,'#e6ffff');glow(head[0],head[1],14,.42);}
  }
  const title=value=>text(value,0,0,W,24,16,ink,'left',1);
  function detail(value,y=HH-27){if(value)text(value,8,y,W-16,24,11,muted,'center',2)}
  const glyphs=['111101101101111','010110010010111','111001111100111','111001111001111','101101111001001','111100111001111','111100111101111','111001001001001','111101111101111','111101111001111'];
  function readout(value,unit,x,y,w,h,pixel=true,color=gold){
   const str=String(value),unitSize=Math.min(21,h*.45);g.save();g.font=`600 ${unitSize}px ${e.style.fontFamily}`;const unitW=unit?Math.ceil(g.measureText(unit).width)+8:0;g.restore();const numberW=w-unitW;
   if(numberW<16)throw Error('Metric unit leaves no readable number area; enlarge the component or shorten the unit');
   if(pixel&&/^\d{1,4}$/.test(str)){const k=Math.min(12,Math.floor((h-4)/5),Math.floor(numberW/(str.length*4-1)));if(k<2)throw Error('Metric readout is too small');const total=(str.length*4-1)*k,origin=x+(numberW-total)/2,yy=y+(h-5*k)/2;[...str].forEach((ch,n)=>[...glyphs[Number(ch)]].forEach((v,i)=>{if(v==='1')r(origin+n*4*k+(i%3)*k,yy+Math.floor(i/3)*k,k-1,k-1,'#ffdda2')}));}
   else{let size=Math.min(pixel?42:32,h*.8);for(;size>=14;size--){g.save();g.font=`600 ${size}px ${e.style.fontFamily}`;const fits=g.measureText(str).width<=numberW;g.restore();if(fits)break}if(size<14)throw Error('Metric number is too long for its readout');text(str,x,y,numberW,h,size,color,'center',1)}
   if(unit)text(unit,x+numberW+8,y,unitW-8,h,unitSize,color,'left',1);
  }
  function metric(){
    const d=c.data,top=38,bottom=HH-43,h=Math.max(85,bottom-top),cy=top+h*.5;title(d.title);
    if(V==='open'){
     if(M){cog(61,cy,30,t.action);readout(s.value,d.unit,116,cy-32,280,65,true);r(112,cy+46,284,2,'#d2a663')}
     else{tube(48,top+10,30,h-19,ease(t.reveal)*(d.to===d.from?1:clamp((s.value-d.from)/(d.to-d.from))));readout(s.value,d.unit,121,cy-31,279,64,false,cyan);r(118,cy+46,280,2,'#76bfb5')}
     if(t.stack){r(119,cy+52,270,3,t.metal);r(125,cy+58,256,2,t.rim)}detail(d.detail);return;
    }
    if(V==='relay'){
     const y=bottom-12,p=d.to===d.from?1:clamp((s.value-d.from)/(d.to-d.from));
     if(M){cog(42,y-23,24,t.action);r(68,y,376,7,'#8d6332');for(let x=0;x<376;x+=10)r(68+x,y-4,5,4,gold);r(69+365*p,y-8,10,21,'#f4d494')}
     else{tube(28,y-56,27,49,p);route([[55,y-14],[74,y-14],[74,y+2],[450,y+2]],t.action);metalSolid(441,y-4,17,15)}
     readout(s.value,d.unit,120,top+19,292,Math.max(49,h-58),M,M?gold:cyan);if(t.stack)base(77,y+14,366);detail(d.detail);return;
    }
    if(M){const x=130,w=220;metal(x,top+12,w,h-13);r(x+19,top+29,w-38,h-48,'#0c1921');r(x+24,top+33,w-48,3,'#657369');r(x+24,bottom-19,w-48,3,'#8a653b');r(x+57,top+23,5,h-36,'#a8af92');r(x+w-62,top+23,5,h-36,'#a8af92');cog(92,cy+14,35,t.action);cog(382,cy+10,25,t.action,-1);r(112,cy+11,17,6,'#946a36');r(351,cy+7,9,6,'#946a36');g.save();g.beginPath();g.rect(x+28,top+36,w-56,h-58);g.clip();readout(s.value,d.unit,x+30,top+37,w-60,h-62);g.restore();metal(x+11,bottom-2,24,8);metal(x+w-35,bottom-2,24,8);}
    else{
      const discrete=d.from===0&&Number.isInteger(d.to)&&d.to>=1&&d.to<=5,n=discrete?d.to:1,tubeH=Math.max(68,h-35),tw=discrete?34:100,gap=discrete?25:0,total=n*tw+(n-1)*gap,x=(W-total)/2;
      for(let i=0;i<n;i++){const fill=discrete?clamp(s.value-i):(d.to===d.from?1:clamp((s.value-d.from)/(d.to-d.from)));tube(x+i*(tw+gap),top+13,tw,tubeH,fill);if(discrete)text(String(i+1).padStart(2,'0'),x+i*(tw+gap)-4,top-12,tw+8,15,9,muted,'center',1)}
      base(x-24,bottom-4,total+48);readout(s.value,d.unit,W-105,top+h*.35,103,44,false,cyan);
    }detail(d.detail);
  }
  function flow(){
   const d=c.data,n=d.items.length,w=W/n,baseY=HH-75,R=Math.min(25,w*.22),cy=baseY-R-14;
   title(d.title);
   for(let i=1;i<n;i++)route([[w*(i-.5)+R+4,cy],[w*(i+.5)-R-4,cy]],phase(d.items[i].event),s.items[i]);
   d.items.forEach((item,i)=>{
    const x=w*(i+.5),p=phase(item.event),active=s.items[i];
    g.save();
    if(!active)g.globalAlpha*=.38;
    if(t.stack&&active)g.translate(0,(1-ease(p))*12);
    if(M){
     rotorPod(x,cy,R,p,active,baseY);
     base(x-w*.34,baseY,w*.68);
     metal(x-w*.30,cy-R-29,w*.60,17);
     text(String(i+1).padStart(2,'0'),x-w*.29,cy-R-28,w*.58,15,10,gold,'center',1);
    }else{
     tube(x-13,cy-R-9,26,R*2+18,active?ease(p):0,active);
     base(x-w*.31,baseY,w*.62);
    }
    text(item.title,i*w+4,baseY+15,w-8,30,13,ink,'center',2);
    if(item.detail)text(item.detail,i*w+4,HH-30,w-8,26,10,muted,'center',2);
    g.restore();
   });
  }
  function checklist(){const d=c.data,n=d.items.length,row=(HH-43)/n;title(d.title);text(`${s.completed} / ${n}`,W-70,0,70,24,12,M?gold:cyan,'right',1);d.items.forEach((item,i)=>{const y=38+i*row,h=Math.max(26,row-11),p=phase(item.event),done=s.items[i];
    if(M){metal(39,y,W-71,h);cog(24,y+h*.5,Math.min(16,h*.32),p);r(47,y+5,42,h-10,dark);r(50,y+h*.5-2,35,4,'#68543a');r(51+ease(p)*21,y+7,11,h-14,done?gold:'#776b54');r(53+ease(p)*21,y+8,7,3,'#f6d89a');}
    else{housing(38,y,W-71,h);tube(12,y+5,15,h-10,done?ease(p):0,done);r(W-57,y+h*.5-5,10,10,done?cyan:'#244d68');glow(W-52,y+h*.5,24,done?.28:0);}
    text(item.label,M?104:63,y+(item.detail?2:4),M?W-154:W-117,item.detail?h*.53:h-8,Math.min(13,h*.5),done?ink:muted,'left',1);if(item.detail)text(item.detail,M?104:63,y+h*.55,M?W-154:W-117,h*.37,Math.min(10,h*.34),muted,'left',1);if(t.stack)base(43,y+h+3,W-85,done);
   })}
  function hierarchy(){const d=c.data,n=d.items.length,cy=30+(HH-40)*.5,R=Math.min(48,(HH-70)*.22),right=235,row=(HH-38)/n;title(d.title);for(let i=0;i<n;i++){const y=38+row*(i+.5);route([[102+R,cy],[198,cy],[198,y],[right+18,y]],phase(d.items[i].event),s.items[i])}rotorPod(102,cy,R,t.action,true);base(42,cy+R+12,120);text(d.rootTitle,25,cy-R-36,154,29,15,ink,'center',2);if(d.detail)text(d.detail,25,Math.min(cy+R+33,HH-30),154,30,10,muted,'center',2);d.items.forEach((item,i)=>{const y=38+i*row,p=phase(item.event),h=Math.max(28,row-12);g.save();if(!s.items[i])g.globalAlpha*=.4;if(t.stack&&s.items[i])g.translate((1-ease(p))*14,0);if(M){metal(right+40,y,W-right-49,h);cog(right+21,y+h*.5,Math.min(16,h*.3),p)}else{housing(right+30,y,W-right-39,h);tube(right+8,y+5,13,h-10,s.items[i]?ease(p):0)}text(item.title,right+53,y+3,W-right-77,item.detail?h*.5:h-6,Math.min(13,h*.48),ink,'left',1);if(item.detail)text(item.detail,right+53,y+h*.54,W-right-77,h*.36,Math.min(10,h*.34),muted,'left',1);g.restore()})}
  function timeline(){
   const d=c.data,n=d.items.length,w=W/n,baseY=HH-75;
   const R=Math.min(24,w*.21,Math.max(10,(baseY-71)/2)),cy=baseY-R-14;
   const labelY=Math.max(26,cy-R-39);
   title(d.title);
   for(let i=1;i<n;i++){
    route([[w*(i-.5),cy],[w*(i+.5),cy]],phase(d.items[i].event),s.items[i]);
   }
   d.items.forEach((item,i)=>{
    const x=w*(i+.5),p=phase(item.event);
    g.save();
    if(!s.items[i])g.globalAlpha*=.4;
    text(item.label,i*w+3,labelY,w-6,27,11,M?gold:cyan,'center',2);
    rotorPod(x,cy,R,p,s.items[i],baseY);
    base(x-w*.32,baseY,w*.64,s.items[i]);
    text(item.title,i*w+3,baseY+15,w-6,30,13,ink,'center',2);
    if(item.detail)text(item.detail,i*w+3,HH-30,w-6,26,10,muted,'center',2);
    g.restore();
   });
  }
  function bars(){const d=c.data,n=d.items.length,top=44,row=(HH-78)/n,x=110,pw=288;title(d.title);for(const v of [0,.5,1]){text(String(d.max*v),x+pw*v-22,HH-25,44,20,10,muted,'center',1)}d.items.forEach((item,i)=>{const y=top+i*row,h=Math.min(24,row*.5),p=s.progress[i],cy=y+row*.5,fw=pw*item.value/d.max*p;text(item.label,0,cy-15,92,30,13,ink,'right',1);if(M){metal(x-5,cy-h/2-5,pw+10,h+10);r(x,cy-h/2,pw,h,dark);r(x+2,cy-2,Math.max(0,fw-2),4,'#9d773f');for(let k=0;k<fw;k+=10)r(x+k,cy-5,4,3,gold);r(x+fw-3,cy-h/2-4,7,h+8,gold);r(x+fw-1,cy-h/2-2,3,h+4,'#f6dda5');}else{housing(x-5,cy-h/2-5,pw+10,h+10);r(x,cy-h/2,pw,h,'#0a2538');r(x,cy-h/2,fw,h,'#268da7');r(x+2,cy-h/2+3,Math.max(0,fw-4),h-6,cyan);r(x+2,cy-h/2+2,Math.max(0,fw-4),2,'#dcffff');glow(x+fw,cy,24,p>0?.22:0)}if(t.stack)base(x,cy+h/2+8,pw);const value=p===1?item.value:Number((item.value*p).toFixed(2));text(String(value)+(d.unit||''),416,cy-15,64,30,13,M?gold:cyan,'left',1)})}
  function identity(){const d=c.data,top=25,h=HH-53,left=35,w=163;housing(left,top,w,h);if(M){metal(left+10,top+10,w-20,h-20);cog(left-11,top+h*.7,23,t.action);r(left+4,top+8,11,20,gold);r(left+w-15,top+h-30,11,20,gold)}else{tube(left-18,top+10,12,h-20,ease(t.reveal));glow(left+w/2,top+h/2,w*.7,.2)}if(!pic(d,left+17,top+14,w-34,h-28))text(d.title.slice(0,2),left+18,top+20,w-36,h-40,28,M?gold:cyan,'center',1);base(left-5,top+h+5,w+10);const x=235;if(d.eyebrow)text(d.eyebrow,x,top+8,W-x-5,25,10,M?gold:cyan,'left',1);text(d.title,x,top+h*.27,W-x-5,h*.25,24,ink,'left',2);if(d.detail)text(d.detail,x,top+h*.61,W-x-5,h*.25,12,muted,'left',2);route([[x,top+h*.55],[W-15,top+h*.55]],t.action)}
  function comparison(){
   const d=c.data,w=W/d.items.length,top=37,h=HH-top-20;
   title(d.title);
   d.items.forEach((item,i)=>{
    const x=i*w+10,ww=w-20,active=s.items[i],p=phase(item.event);
    g.save();
    if(!active)g.globalAlpha*=.32;
    housing(x+9,top+15,ww-18,h-28);
    if(M){
     cog(x+ww/2,top+12,15,p);
     r(x+ww/2-3,top+26,6,9,gold);
    }else{
     tube(x,top+28,10,h-59,active?ease(p):0);
     glow(x+ww*.5,top+h*.5,ww*.6,active?.2:0);
    }
    base(x+4,top+h-5,ww-8,active);
    if(active){
     const headingY=top+Math.min(31,h*.21),imageY=headingY+24;
     const detailY=top+h*.77,valueY=detailY-Math.max(18,h*.16)-3;
     text(item.title,x+20,headingY,ww-40,24,13,M?gold:cyan,'center',1);
     const imageEnd=item.value?valueY:item.detail?detailY:top+h-12;
     const imageHeight=imageEnd-imageY-4,roomForPreview=imageHeight>0;
     const image=pic(item,x+23,roomForPreview?imageY:top+67,ww-46,roomForPreview?imageHeight:h*.36);
     if(item.value){
      const y=image?(roomForPreview?valueY:top+h*.59):top+h*.40;
      const height=image&&roomForPreview?Math.max(18,h*.16):h*.23;
      text(item.value,x+20,y,ww-40,height,image?18:27,ink,'center',1);
     }
     if(item.detail)text(item.detail,x+18,detailY,ww-36,h*.14,10,muted,'center',1);
    }
    g.restore();
   });
  }
  function annotation(){const d=c.data,h=Math.min(HH-8,65),y=(HH-h)/2,x=M?45:26,w=W-x-8;const tx=(d.targetX*e.width-b.x)/S,ty=(d.targetY*e.height-b.y)/S,sy=y+h*.5;route([[W/2,y+h],[W/2,(y+h+ty)*.5],[tx,ty]],t.action);if(M){metal(x,y,w,h);cog(25,sy,19,t.action);r(42,sy-3,4,6,gold)}else{housing(x,y,w,h);rotorPod(12,sy,10,t.action,true)}text(d.label,x+18,y+5,w-36,h-10,13,ink,'center',1);if(M){r(tx-5,ty-5,10,10,gold);r(tx-2,ty-2,4,4,dark)}else{glow(tx,ty,25,.4);r(tx-4,ty-4,8,8,cyan)}}
  function chapter(){
   const d=c.data,cy=HH*.47,p=ease(t.reveal),accent=M?gold:cyan;
   const number=(x,y,w,h,size)=>{let sz=size;while(sz>9){g.font=`600 ${sz}px ${e.style.fontFamily}`;if(g.measureText(d.index).width<=w)break;sz--}text(d.index,x,y,w,h,sz,accent,'left',1)};
   const copy=(x,y,w,compact=false)=>{g.save();g.beginPath();g.rect(x,y,w*p,HH);g.clip();text(d.title,x,y,w,HH*(compact?.26:.34),24,ink,'left',2);if(d.detail)text(d.detail,x,y+HH*(compact?.30:.39),w,HH*(compact?.18:.24),12,muted,'left',2);g.restore()};
   if(V==='open'){
    if(M)cog(31,cy,25,t.action);else{tube(13,cy-28,14,53,p);tube(37,cy-13,11,38,p)}
    number(70,cy-30,76,59,43);r(148,cy-22,1,49,M?'#846c43':'#628e84');copy(165,cy-24,308);
    if(t.stack){r(72,cy+35,59,3,t.metal);r(78,cy+40,47,2,t.rim)}
   }else if(V==='inset'){
    const y=HH*.12,h=HH*.77;
    if(t.stack){r(43,y+7,430,h,t.deep);r(48,y+11,420,h, M?'#694b2f':'#28484d')}
    if(M)metalSolid(40,y,432,h);else housing(18,y,454,h);
    if(M)cog(31,cy,28,t.action);else tube(31,y+17,16,h-34,p);
    number(78,cy-26,67,50,33);r(151,y+13,1,h-26,M?'#9e7c45':'#5b8e87');copy(170,cy-23,287);
   }else{
    const y=HH*.79,R=Math.min(24,HH*.19);
    if(M){cog(31,y-R, R,t.action);r(58,y,408*p,8,'#805a2d');r(58,y,408*p,1,'#e6be72');for(let a=0;a<408*p-6;a+=10)r(58+a,y-4,5,4,gold)}
    else{tube(21,y-52,21,46,p);route([[45,y-13],[61,y-13],[61,y+3],[468,y+3]],t.reveal);metalSolid(459,y-3,14,13)}
    text('CHAPTER '+d.index,90,0,380,HH*.18,10,M?gold:'#d8b67a','left',1);copy(90,HH*.22,380,true);
    if(t.stack)base(60,y+10,405);
   }
  }
  function code(){const d=c.data,top=44,bottom=HH-19,row=(bottom-top-16)/d.items.length;if(row<14)throw Error('Code rows are too short; enlarge the component or show fewer lines');title(d.title);if(d.language)text(d.language,W-100,0,100,24,10,M?gold:cyan,'right',1);const x=42,w=420;housing(x,top,w,bottom-top);if(M){cog(25,top+20,17,t.action);cog(W-16,bottom-20,14,t.action,-1);r(19,top+40,9,Math.max(0,bottom-top-68),'#665439')}else{tube(15,top+7,14,bottom-top-14,s.current<0?0:(s.current+1)/d.items.length);glow(x+w/2,top+(bottom-top)/2,100,.13)}d.items.forEach((item,i)=>{const y=top+8+i*row,active=s.current===i;if(active){r(x+6,y,w-12,row,M?'#6a4d2d':'#15536a');r(x+6,y,3,row,M?gold:cyan);if(!M)glow(x+w*.6,y+row/2,55,.25)}text(String(i+1),x+12,y,22,row,9,muted,'center',1);g.save();g.font=`500 12px Consolas, "Microsoft YaHei", monospace`;if(g.measureText(item.text).width>w-60){g.restore();throw Error('Code line overflows; widen the component or shorten the line')}g.fillStyle=active?ink:muted;g.textBaseline='middle';g.textAlign='left';g.fillText(item.text,x+43,y+row/2);g.restore()});if(t.stack)base(x+4,bottom+3,w-8)}
  function takeaway(){const d=c.data,top=37,h=HH-67;
   if(V!=='inset'){
    if(d.eyebrow)text(d.eyebrow,65,0,W-130,24,11,M?gold:'#d8b67a','center',1);
    if(V==='open'){
     if(M){cog(31,top+h*.4,22,t.action);cog(W-31,top+h*.4,22,t.action,-1)}else{tube(16,top+8,14,h-16,ease(t.reveal));tube(W-30,top+8,14,h-16,ease(t.reveal))}
     text(d.title,65,top,W-130,h*.58,25,ink,'center',2);if(d.detail)text(d.detail,65,top+h*.68,W-130,h*.30,12,muted,'center',2);
    }else{
     if(M){cog(30,top+h-20,23,t.action);r(58,top+h,385*ease(t.reveal),6,'#ab7d3c');for(let a=0;a<385*ease(t.reveal)-5;a+=11)r(58+a,top+h-4,5,4,gold)}else{tube(21,top+h-49,18,43,ease(t.reveal));route([[42,top+h-12],[60,top+h-12],[60,top+h+3],[449,top+h+3]],t.reveal)}
     text(d.title,80,top,W-110,h*.55,25,ink,'left',2);if(d.detail)text(d.detail,80,top+h*.61,W-110,h*.29,12,muted,'left',2);
    }
    if(t.stack)base(65,top+h+15,W-130);return;
   }
if(d.eyebrow)text(d.eyebrow,60,0,W-120,24,11,M?gold:cyan,'center',1);if(M){cog(37,top+18,25,t.action);cog(W-37,top+18,25,t.action,-1);metal(65,top+4,W-130,16);r(73,top+20,W-146,h-13,'#263b40');r(78,top+21,W-156,3,'#d5b075');r(72,top+h,W-144,9,'#9b713d');r(69,top+h+7,W-138,3,'#e3bc75')}else{rotorPod(30,top+25,15,t.action,true);rotorPod(W-30,top+25,15,t.action,true);housing(59,top,W-118,h+8);glow(W/2,top+h*.5,125,.3)}text(d.title,83,top+h*.16,W-166,h*.48,25,ink,'center',2);if(d.detail)text(d.detail,83,top+h*.73,W-166,h*.24,12,muted,'center',2);if(t.stack)base(72,top+h+13,W-144)}
  const render={metric,flow,checklist,hierarchy,timeline,bars,identity,comparison,annotation,chapter,code,takeaway}[c.kind];
  if(!render)return false;
  g.save();try{g.translate(b.x,b.y);g.scale(S,S);g.imageSmoothingEnabled=false;render();}finally{g.restore()}return true;
 }
 P.componentApparatus={draw,imageBounds};
})(globalThis.PixelVideo=globalThis.PixelVideo||{});
