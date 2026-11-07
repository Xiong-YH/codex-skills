(()=>{
const get=id=>document.getElementById(id),canvas=get('actor'),ctx=canvas.getContext('2d'),poses=window.CASE_POSES,actor='actor.azong.v3',assets={};let t=0,playing=false,last=0,run=0;
const clamp=x=>Math.max(0,Math.min(1,x)),out=x=>1-(1-x)**3,mix=(a,b,p)=>a+(b-a)*p,ramp=(t,a,d)=>out(clamp((t-a)/d));
const keys=[[0,'neutral'],[.72,'dazed-right'],[1.42,'dazed-left'],[2.12,'overwhelmed'],[3.35,'dazed-right'],[3.98,'neutral'],[4.2,'talk'],[5.2,'neutral']];
const intervals=keys.map(([time,pose],i)=>({startFrame:Math.round(time*60),endFrame:i<keys.length-1?Math.round(keys[i+1][0]*60):481,pose}));
const e={ctx,width:1200,height:675,assets,resolved:{actorPoseLayout:{[actor]:poses}},style:{presenter:{x:0,baseline:0,height:.55}}};
function pulse(time,start,duration){const p=clamp((time-start)/duration);return Math.sin(p*Math.PI)*(1-p*.4);}
function sample(time){const frame=Math.min(480,Math.floor(time*60+1e-6)),pose=intervals.find(p=>frame>=p.startFrame&&frame<p.endFrame)?.pose||'neutral';
 const hits=pulse(time,.72,.4)+pulse(time,1.42,.4)+pulse(time,2.12,.48),retreat=ramp(time,.72,.25)*8+ramp(time,1.42,.25)*9+ramp(time,2.12,.25)*10,approach=ramp(time,3.9,.35),reach=ramp(time,4.2,.24),release=ramp(time,5.2,.4);
 return {frame,pose,x:348-retreat+approach*30+reach*12-release*7,y:580+hits*3-pulse(time,5.2,.45)*4,angle:(-hits*2.3-1.2*ramp(time,2.12,.3))*(1-approach)+pulse(time,4.05,.32)*1.3,mirror:pose==='talk',selected:ramp(time,4.46,.18),clear:ramp(time,4.85,.48),work:clamp((time-5.65)/1.5),reach};
}
function render(){const s=sample(t);ctx.clearRect(0,0,1200,675);ctx.save();ctx.translate(s.x,s.y);ctx.rotate(s.angle*Math.PI/180);ctx.scale(s.mirror?-1:1,1);PixelVideo.presenterActions.draw(e,{actor,performance:intervals},s.frame);ctx.restore();
 for(let i=0;i<3;i++){
  const enter=ramp(t,.45+i*.7,.27),card=get('task'+i);let x=500+i*32,y=350-i*37,angle=i*4-4,scale=1;
  if(i===0){const offer=ramp(t,3.55,.32);x=mix(x,480,offer);y=mix(y,367,offer);angle=mix(angle,0,offer);x=mix(x,560,s.clear);y=mix(y,286,s.clear);scale=mix(1,1.1,s.clear);}
  else{x=mix(x,875+(i-1)*8,s.clear);y=mix(y,335+(i-1)*10,s.clear);angle=mix(angle,-3+(i-1)*3,s.clear);scale=mix(1,.60,s.clear);}
  const impact=pulse(t,.72+i*.7,.22);y+=impact*7;angle+=impact*2;
  card.style.transform=`translate(${mix(1280,x,enter)}px,${y}px) rotate(${angle}deg) scale(${scale})`;card.style.opacity=enter?1:0;
 }
 get('task0').style.borderColor=s.selected>.01?'#e6bd67':'#87734f';get('task0').style.boxShadow=s.selected>.01?'0 0 0 5px #d8bc5d33,8px 10px 0 #0a1e2155':'8px 10px 0 #0a1e2155';
 get('progress').style.width=s.work*100+'%';get('done').style.opacity=s.work>=1?1:0;get('light').style.opacity=mix(.35,1,s.clear);
 const count=t<.45?0:t<1.15?1:t<1.85?2:3;get('task-state').textContent=t<5.33?'待办 '+count+' 项':'当前只做 1 项';get('work-state').textContent=s.work>=1?'已完成 1 项':'完成 0 项';
 get('caption').textContent=t<2.12?'怎么又来一件……':t<3.35?'等等，脑袋要装不下了。':t<4.46?'先做这件。':t<5.65?'其他的，放到稍后。':t<7.15?'一次，只推进一件事。':'好了，完成一件。';
 get('pose-label').textContent=t<.72?'待机，事件尚未发生':t<2.12?'任务落下后，错开反应并后缩':t<3.35?'压力顶点：抱头并停顿':t<3.98?'恢复视线，注意重点':t<4.2?'先回正，准备伸手':t<4.46?'伸手靠近，卡片暂不响应':t<5.2?'手势确认后，重点亮起并归位':'身体回正，放松落稳';
 get('event-label').textContent=t<2.12?'卡片先进入，人物随后反应':t<3.35?'停住，让情绪被看见':t<4.46?'重点卡片靠近手势位置':t<5.65?'确认后再响应，其他任务收走':t<7.15?'保留稳定阅读，进度推进':'结果保持';
 get('seek').value=t;get('clock').textContent=t.toFixed(2)+' / 8.00 s';
}
function stop(){playing=false;run++;get('play').textContent='播放';}
function play(){if(t>=8)t=0;playing=true;last=performance.now();get('play').textContent='暂停';const token=++run;function tick(now){if(!playing||token!==run)return;t=Math.min(8,t+(now-last)/1000*Number(get('speed').value));last=now;render();if(t>=8)stop();else requestAnimationFrame(tick);}requestAnimationFrame(tick);}
get('play').disabled=get('replay').disabled=get('seek').disabled=true;
get('play').onclick=()=>playing?stop():play();get('replay').onclick=()=>{stop();t=0;render();play();};get('seek').oninput=()=>{stop();t=Number(get('seek').value);render();};
new ResizeObserver(()=>get('stage').style.transform=`scale(${get('viewport').clientWidth/1200})`).observe(get('viewport'));
window.caseReady=Promise.all(Object.entries(poses).map(async([pose,meta])=>{const image=new Image();image.src=meta.src||'../../../../library/'+meta.file;await image.decode();assets[actor+':pose:'+pose]=image;})).then(()=>{render();get('play').disabled=get('replay').disabled=get('seek').disabled=false;return true;});
window.characterCase={sample,play,stop,seek(time){stop();t=Math.max(0,Math.min(8,time));render();},get poses(){return intervals;},assetCount:Object.keys(poses).length};
})();


