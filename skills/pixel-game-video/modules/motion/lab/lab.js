/* HTML adapter for the formal runtime. No screenshots or duplicate easing formulas. */
(()=>{
'use strict';
const P=globalThis.PixelVideo,spec=P.motionSpec,get=id=>document.getElementById(id),fps=get('fps'),easing=get('easing');
let selected='push',frame=0,playing=false,last=0;
const extra={path:'连续关键帧',layer:'图层组',page:'页面转场'};
const descriptions={push:'关注点移动到中心并推近，快速起步、慢慢收住。',pan:'保持景别，从右侧关注点转向左侧；结束后保持落点。',slam:'先超过目标变化量的8%，再收回；不是把最终倍率再乘1.08。',shake:'在当前构图上叠加确定性衰减震动，结束后归零。',back:'从特写拉回中心和1倍全景。',path:'一条路径内分三次运动：推近、平移、回全景；间隔保留阅读。',layer:'只移动内容组，背景、固定标题和字幕不动。',page:'旧页淡出、轻移与模糊；新页重叠淡入，落稳后阅读。'};
for(const [key,label]of [...Object.entries(spec.presets).map(([k,v])=>[k,v.label]),...Object.entries(extra)]){const button=document.createElement('button');button.type='button';button.textContent=label;button.dataset.kind=key;button.onclick=()=>choose(key);get('preset-buttons').appendChild(button);}
for(const name of Object.keys(spec.curves)){const option=document.createElement('option');option.value=name;option.textContent=name;easing.appendChild(option);}
const count=seconds=>Math.max(1,Math.round(seconds*Number(fps.value)));
function config(){
 const start=count(.6),kind=selected;
 if(kind==='page')return {recipe:'motion.page-turn.v1',startFrame:0,endFrame:count(spec.page.seconds),params:{...spec.page,seconds:undefined}};
 if(kind==='layer')return {recipe:'motion.layer-move.v1',startFrame:start,endFrame:start+count(.35),params:{layer:'content',xTo:-.12,scaleTo:.9,rotationTo:-4,ease:easing.value}};
 if(kind==='path')return {recipe:'motion.camera-path.v1',startFrame:start,endFrame:start+count(2.3),params:{bounds:'free',keys:[{atFrame:0,durationFrames:count(.28),x:.65,y:.47,scale:1.25,ease:easing.value},{atFrame:count(.75),durationFrames:count(.3),x:.33,y:.47,scale:1.25,ease:easing.value},{atFrame:count(1.5),durationFrames:count(.5),x:.5,y:.5,scale:1,ease:easing.value}]}};
 const preset=spec.presets[kind];
 return {recipe:kind==='shake'?'motion.camera-shake.v1':'motion.camera-pulse.v1',startFrame:start,endFrame:start+count(preset.seconds),params:kind==='shake'?{amplitude:preset.amplitude}:kind==='back'?{kind,ease:easing.value}:{kind,x:kind==='pan'?.33:.65,y:.47,...(preset.scale?{scale:preset.scale}:{}),ease:easing.value,bounds:'free'}};
}
function motions(){const m=config();if(selected==='back'||selected==='pan')return [{recipe:'motion.camera-pulse.v1',startFrame:0,endFrame:1,params:{kind:'push',x:.65,y:.47,scale:1.4,bounds:'free'}},m];return[m];}
function curveName(){return selected==='page'?'draw':easing.value;}
function drawCurve(){
 const name=curveName(),fn=spec.curves[name];get('curve').setAttribute('d',Array.from({length:101},(_,i)=>{const u=i/100;return (i?'L':'M')+(35+285*u).toFixed(2)+' '+(155-120*fn(u)).toFixed(2);}).join(' '));
 get('formula').textContent=selected==='page'?'页面采用 smoothstep：u²(3−2u)；不是所选相机缓动':spec.curveText[name];
 // The page curve is evaluated from the same transition progress convention.
 if(selected==='page'||selected==='shake'){get('curve').setAttribute('d',Array.from({length:101},(_,i)=>{const u=i/100;return(i?'L':'M')+(35+285*u)+' '+(155-120*(selected==='page'?spec.pageProgress(u):1-u));}).join(' '));}
 if(selected==='shake')get('formula').textContent=`振幅包络 A=A₀(1−u)；x=A·sin(${spec.shake.frequencyX}u)，y=A·cos(${spec.shake.frequencyY}u)`;
}
function updateConfig(){
 const m=config(),c={id:selected,recipe:m.recipe,target:'scene',start:{event:'s01.enter',...(m.startFrame?{offsetFrames:m.startFrame}:{})},durationFrames:m.endFrame-m.startFrame,params:m.params};
 const calls=selected==='back'||selected==='pan'?[{id:'prepare',recipe:'motion.camera-pulse.v1',target:'scene',start:{event:'s01.enter'},durationFrames:1,params:{kind:'push',x:.65,y:.47,scale:1.4,bounds:'free'}},c]:[c];
 get('config').value=JSON.stringify(calls,null,2);get('facts').replaceChildren();
 const facts={'运动时长':((m.endFrame-m.startFrame)/Number(fps.value)).toFixed(3)+' s','帧数':String(m.endFrame-m.startFrame),'末态':'保持（震动结束归零）','关注点':'场景归一化坐标','边界':'示意使用 free；成片可选 cover'};
 for(const [key,value]of Object.entries(facts)){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=key;dd.textContent=value;get('facts').append(dt,dd);}
 get('curve-note').textContent=selected==='shake'?'曲线图不是震动轨迹；震动使用两轴正弦×衰减包络。':selected==='path'?'图中显示每一小段的缓动，不把阅读停留画成持续运动。':'帧窗口终点精确落稳；改变帧率时重新换算帧数。';
 drawCurve();
}
function render(){
 const m=config(),list=motions(),camera=P.motion.camera(list,frame),tr=P.motion.cameraTransform(camera,1920,1080),group=P.motion.layerTransform(list,'content',frame);
 get('world-a').style.transform=`translate(${tr.x/2}px,${tr.y/2}px) scale(${tr.scale})`;
 get('group-a').style.transform=`translate(${group.x*960}px,${group.y*540}px) rotate(${group.rotation}deg) scale(${group.scale})`;get('group-a').style.opacity=group.opacity;
 get('page-a').style.opacity='1';get('page-a').style.transform='none';get('page-a').style.filter='none';get('page-b').style.opacity='0';
 if(selected==='page'){
  const p=P.progress(frame,m.startFrame,m.endFrame),q=spec.pageProgress(p);get('page-a').style.opacity=1-q;get('page-a').style.transform=`translateX(${-spec.page.exitPixels*q/2}px)`;get('page-a').style.filter=`blur(${spec.page.blur*q/2}px)`;get('page-b').style.opacity=q;get('page-b').style.transform=`translateX(${spec.page.enterPixels*(1-q)/2}px)`;
 }
 const p=P.progress(frame,m.startFrame,m.endFrame),y=selected==='page'?spec.pageProgress(p):selected==='shake'?1-p:spec.curves[curveName()](p);
 get('curve-dot').setAttribute('cx',35+285*p);get('curve-dot').setAttribute('cy',155-120*y);
 get('phase').textContent=frame<m.startFrame?'保持':frame<m.endFrame?'运动':'落稳／阅读';get('timeline').value=frame;get('time-label').textContent=(frame/Number(fps.value)).toFixed(2)+' s';
}
function stop(){playing=false;get('play').textContent='播放';}
function tick(now){if(!playing)return;frame=Math.min(count(3)-1,frame+(now-last)/1000*Number(fps.value)*Number(get('speed').value));last=now;render();if(frame>=count(3)-1)stop();else requestAnimationFrame(tick);}
function play(){if(frame>=count(3)-1)frame=0;playing=true;last=performance.now();get('play').textContent='暂停';requestAnimationFrame(tick);}
function choose(kind){stop();selected=kind;frame=0;easing.value=spec.presets[kind]?.ease||'out';easing.disabled=['shake','page'].includes(kind);for(const button of get('preset-buttons').children)button.setAttribute('aria-pressed',String(button.dataset.kind===kind));get('description').textContent=descriptions[kind];updateConfig();render();}
get('play').onclick=()=>playing?stop():play();get('replay').onclick=()=>{stop();frame=0;play();};get('timeline').oninput=()=>{stop();frame=Number(get('timeline').value);render();};
fps.onchange=()=>{stop();frame=0;get('timeline').max=count(3)-1;updateConfig();render();};easing.onchange=()=>{stop();frame=0;get('description').textContent=descriptions[selected]+' 当前手动缓动 '+easing.value+' 覆盖预设；实际运动以曲线为准。';updateConfig();render();};
get('copy').onclick=async()=>{try{await navigator.clipboard.writeText(get('config').value);get('copy-status').textContent='已复制';}catch{get('config').select();get('copy-status').textContent='已选中，可手动复制';}};
new ResizeObserver(()=>{get('scene-fit').style.transform=`scale(${get('viewport').clientWidth/960})`;}).observe(get('viewport'));
const query=new URLSearchParams(location.search);document.body.classList.toggle('embedded',query.get('embed')==='1');
choose(['push','pan','slam','shake','back','path','layer','page'].includes(query.get('effect'))?query.get('effect'):'push');
})();
