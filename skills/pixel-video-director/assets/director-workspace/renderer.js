(function(root){
'use strict';
const M=root.DirectorModel,images=new Map();
const NS='http://www.w3.org/2000/svg';
function sketch(doc,data){
 const figure=doc.createElement('figure');figure.className='sketch';
 if(!data){const empty=doc.createElement('div');empty.className='sketch-empty';empty.textContent='这一段的构思草图还没有画。';figure.append(empty);}
 else{M.validateSketch(data);const svg=doc.createElementNS(NS,'svg');svg.setAttribute('viewBox','0 0 960 540');svg.setAttribute('role','img');svg.setAttribute('aria-label','构思参考：'+data.elements.map(e=>e.label).join('、'));
  const add=(type,attrs,parent=svg)=>{const e=doc.createElementNS(NS,type);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,String(v)));parent.append(e);return e;};
  add('rect',{width:960,height:540,fill:'#fafaf8'});
  for(const e of data.elements){const x=e.x*9.6,y=e.y*5.4,w=e.w*9.6,h=e.h*5.4;
   if(e.kind==='person'){add('circle',{cx:x+w/2,cy:y+h*.18,r:Math.min(w*.18,h*.12),fill:'none',stroke:'#656c71','stroke-width':3});add('path',{d:`M${x+w/2},${y+h*.31}v${h*.32}m0,-${h*.22}l-${w*.3},${h*.19}m${w*.3},-${h*.19}l${w*.3},${h*.19}m-${w*.3},${h*.03}l-${w*.25},${h*.3}m${w*.25},-${h*.3}l${w*.25},${h*.3}`,fill:'none',stroke:'#656c71','stroke-width':3});}
   else add('rect',{x,y,width:w,height:h,rx:5,fill:'#f2f2ed',stroke:'#81858a','stroke-width':2,'stroke-dasharray':'7 5'});
   const label=add('text',{x:x+w/2,y:e.kind==='person'?y-14:y+h/2+10,'text-anchor':'middle',fill:'#41484e','font-size':30});label.textContent=e.label;
  }
  for(const a of data.arrows||[]){const x1=a.x1*9.6,y1=a.y1*5.4,x2=a.x2*9.6,y2=a.y2*5.4,angle=Math.atan2(y2-y1,x2-x1),size=14;
   add('path',{d:`M${x1},${y1} L${x2},${y2} M${x2-size*Math.cos(angle-.5)},${y2-size*Math.sin(angle-.5)} L${x2},${y2} L${x2-size*Math.cos(angle+.5)},${y2-size*Math.sin(angle+.5)}`,fill:'none',stroke:'#6556bb','stroke-width':3});const label=add('text',{x:(x1+x2)/2+12,y:(y1+y2)/2-12,fill:'#6556bb','font-size':26});label.textContent=a.label||'';
  }figure.append(svg);
 }
 const caption=doc.createElement('figcaption');caption.textContent='构思参考 · 用来说明内容，后续可调整、替换或不采纳。';figure.append(caption);return figure;
}
async function prepare(plan){const src=plan.background?.image;if(!src||images.has(src))return;const image=new Image();const ready=new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('背景图无法读取，请重新选择图片。'));});image.src=src;await ready;images.set(src,image);}
function wrap(ctx,text,max){const lines=[];let line='';for(const c of text){if(c==='\n'||ctx.measureText(line+c).width>max){lines.push(line);line=c==='\n'?'':c;}else line+=c;}if(line)lines.push(line);return lines;}
function frame(canvas,project,segment,time){
 const p=segment.plan,ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);ctx.fillStyle=p.background?.color||'#eeeee8';ctx.fillRect(0,0,w,h);const image=images.get(p.background?.image);if(image){const scale=Math.max(w/image.width,h/image.height),iw=image.width*scale,ih=image.height*scale;ctx.drawImage(image,(w-iw)/2,(h-ih)/2,iw,ih);}
 ctx.save();if((p.transition||'cut')==='fade')ctx.globalAlpha=Math.min(1,time/.35);
 for(const e of p.elements||[]){const pos=M.position(e,time),x=pos.x*w/100,y=pos.y*h/100,ew=e.w*w/100,eh=e.h*h/100;ctx.save();ctx.globalAlpha*=pos.opacity;ctx.strokeStyle='#414b50';ctx.fillStyle='#f8f8f2';ctx.lineWidth=2;ctx.setLineDash([]);
  if(e.kind==='person'){ctx.beginPath();ctx.arc(x+ew/2,y+eh*.17,Math.min(ew*.17,eh*.11),0,Math.PI*2);ctx.moveTo(x+ew/2,y+eh*.29);ctx.lineTo(x+ew/2,y+eh*.64);ctx.moveTo(x+ew*.2,y+eh*.49);ctx.lineTo(x+ew/2,y+eh*.36);ctx.lineTo(x+ew*.8,y+eh*.49);ctx.moveTo(x+ew*.22,y+eh*.94);ctx.lineTo(x+ew/2,y+eh*.64);ctx.lineTo(x+ew*.78,y+eh*.94);ctx.stroke();}
  else{ctx.fillRect(x,y,ew,eh);ctx.strokeRect(x,y,ew,eh);}
  ctx.fillStyle='#27353a';ctx.font=`${Math.max(14,w/50)}px "Microsoft YaHei",sans-serif`;ctx.textAlign='center';ctx.fillText(e.label.slice(0,30),x+ew/2,e.kind==='person'?y+eh+22:y+eh/2+7,Math.max(10,ew-10));ctx.restore();
 }ctx.restore();
 const subtitle=(p.subtitles||[]).filter(s=>time>=s.from&&time<s.to).map(s=>project.stages.copy.find(c=>c.id===s.cueId)?.text||'').join('\n');
 if(subtitle){ctx.font=`${w/32}px "Microsoft YaHei",sans-serif`;const lines=wrap(ctx,subtitle,w*.86),lh=w/24;ctx.fillStyle='rgba(20,28,32,.86)';ctx.fillRect(w*.04,h-lh*(lines.length+1),w*.92,lh*(lines.length+.6));ctx.fillStyle='#fff';ctx.textAlign='center';lines.forEach((line,i)=>ctx.fillText(line,w/2,h-lh*(lines.length-i-.05)));}
 ctx.font=`${w/85}px "Microsoft YaHei",sans-serif`;ctx.textAlign='left';ctx.fillStyle='rgba(30,40,45,.7)';ctx.fillText('动态白模 · 无音轨 · 时长预估',w*.025,h*.045);
}
async function exportVideo(canvas,project,timeline,onProgress,signal){
 if(!canvas.captureStream||typeof MediaRecorder==='undefined')throw Error('当前浏览器不支持导出样板视频，请用 Chromium/Edge 打开。');
 for(const t of timeline)await prepare(t.segment.plan);const mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(x=>MediaRecorder.isTypeSupported(x));if(!mime)throw Error('当前浏览器不支持 WebM 编码。');
 const duration=timeline.at(-1)?.end||0;if(!duration)throw Error('没有可导出的片段。');const stream=canvas.captureStream(25),recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:1800000}),chunks=[];
 const stopped=new Promise((resolve,reject)=>{recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder.onstop=resolve;recorder.onerror=()=>reject(Error('样板视频编码失败。'));});
 const start=performance.now();recorder.start(200);
 try{await new Promise((resolve,reject)=>{function tick(){if(signal?.aborted){reject(Error('已取消导出。'));return;}const t=Math.min(duration,(performance.now()-start)/1000),item=timeline.find(x=>t<x.end)||timeline.at(-1);try{frame(canvas,project,item.segment,Math.min(item.segment.plan.duration-.001,t-item.start));onProgress?.(t/duration);if(t>=duration)resolve();else requestAnimationFrame(tick);}catch(error){reject(error);}}tick();});recorder.stop();await stopped;return new Blob(chunks,{type:mime});}
 finally{if(recorder.state!=='inactive'){recorder.stop();await stopped.catch(()=>{});}stream.getTracks().forEach(t=>t.stop());}
}
root.DirectorRender={sketch,prepare,frame,exportVideo};
})(typeof window!=='undefined'?window:globalThis);
