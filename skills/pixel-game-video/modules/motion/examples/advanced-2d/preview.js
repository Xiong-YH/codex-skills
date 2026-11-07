gsap.registerPlugin(Flip);
const get=id=>document.getElementById(id),scene=get('scene');let tl,mode='relay';
const cases={
relay:['焦点接力','GSAP · Timeline','在同一空间连续讲三步','完整流程建立位置关系，再依次看输入、处理、输出，最后回到整体。每次移动之间都有阅读停留。','看相邻焦点接续，而不是三个独立的放大镜头。','输入 → 处理 → 输出，最后回看全貌。'],
parallax:['分层视差','GSAP · Layer transforms','前景、内容、远景分开运动','同一横移中，远处窗户移动最少，主体居中跟随，近处柱子移动最多。全部由二维HTML图层组成。','看窗、工作台和前景柱子的相对速度。','前景走得快，远景走得慢。'],
whip:['甩镜接场','GSAP · Timeline + CSS filter','快速掠过，再在新场景落稳','旧场景快速横移退出，新场景同方向接住；速度最高的位置模糊最强，两端恢复清晰。','慢放能看见模糊先增强再消失，正常速度看整体衔接。','迅速转向下一处，落稳后继续读。'],
match:['对象匹配','GSAP · Flip','让同一对象跨布局延续','中间的处理单元从流程中抽出，进入新的说明版面。实际使用Flip记录布局，再计算对象位置与尺度的过渡。','黄色对象始终是同一个DOM元素；周围版面改变。','保留同一个对象，进入下一层解释。'],
occlude:['前景遮挡','GSAP · Occlusion timeline','借真实前景完成切换','一面前景墙横向经过，完整遮住画面时切换场景，再离开露出下一处。不是简单加一层淡化。','拖到墙遮满画面的位置，再往后看场景变化。','经过前景，进入另一个场所。'],
spring:['弹性落稳','GSAP · Elastic easing','略带惯性地接近重点','镜头快速接近对象，轻微超过目标后收束。这里用GSAP elastic曲线演示弹性观感，不声称调用Motion的物理弹簧。','看回收幅度和尾部是否影响阅读；不是所有镜头都适合弹性。','接近重点，轻轻收住。']};
function room(id,next=false){return `<div id="${id}" class="page ${next?'new':''}"><div class="world"><div class="room"></div><div class="floor"></div><div class="rail"></div><div class="rail second"></div><div class="node n1"><b>01</b><span>${next?'新线索':'输入'}</span><small>INPUT</small></div><div class="node n2"><b>02</b><span>${next?'新判断':'处理'}</span><small>PROCESS</small></div><div class="node n3"><b>03</b><span>${next?'新结果':'输出'}</span><small>RESULT</small></div></div></div>`;}
function choose(key){
 if(tl)tl.kill();mode=key;scene.innerHTML=room('a');const c=cases[key];get('source').textContent=c[1];get('name').textContent=c[2];get('description').textContent=c[3];get('watch').textContent=c[4];get('subtitle').textContent=c[5];get('scene-title').textContent=c[0];
 for(const button of get('choices').children)button.setAttribute('aria-pressed',String(button.dataset.mode===key));
 tl=gsap.timeline({paused:true,onUpdate:update,onComplete:()=>get('play').textContent='播放'});const world=scene.querySelector('.world');
 if(key==='relay')tl.to(world,{duration:.34,scale:1.65,x:220,y:-190,ease:'power3.out'},.55).to(world,{duration:.34,x:-390,y:-190,ease:'power3.out'},1.3).to(world,{duration:.34,x:-1000,y:-190,ease:'power3.out'},2.05).to(world,{duration:.5,scale:1,x:0,y:0,ease:'power3.out'},2.85);
 if(key==='parallax'){
  scene.innerHTML=`<div class="room"></div><div class="floor"></div><div class="layer far"><div class="back-wall"><div class="window"></div><div class="window"></div><div class="window"></div><div class="window"></div></div></div><div class="layer mid"><div class="middle"></div><div class="node n2" style="top:215px"><b>02</b><span>处理中心</span></div></div><div class="layer near"><div class="front"><div class="pillar-small"></div><div class="pillar-small"></div><div class="pillar-small"></div></div></div>`;
  tl.to(scene.querySelector('.far'),{x:-50,duration:1.6,ease:'power2.inOut'},.65).to(scene.querySelector('.mid'),{x:-180,duration:1.6,ease:'power2.inOut'},.65).to(scene.querySelector('.near'),{x:-520,duration:1.6,ease:'power2.inOut'},.65);
 }
 if(key==='whip'){
  scene.insertAdjacentHTML('beforeend',room('b',true));gsap.set(get('b'),{x:1200});
  tl.to(get('a'),{x:-1200,duration:.58,ease:'power3.inOut'},.8).to(get('b'),{x:0,duration:.58,ease:'power3.inOut'},.8)
   .to([get('a'),get('b')],{filter:'blur(22px)',duration:.26,ease:'power2.in'},.8).to([get('a'),get('b')],{filter:'blur(0px)',duration:.32,ease:'power2.out'},1.06);
 }
 if(key==='match'){
  scene.querySelector('.n2').style.visibility='hidden';scene.insertAdjacentHTML('beforeend','<div id="sheet" class="sheet"><h3>处理机制</h3><div class="bar"></div><div class="bar short"></div></div><div id="hero" class="hero"><b>02</b><span>处理</span></div>');
  gsap.set(get('sheet'),{opacity:0});const state=Flip.getState(get('hero'));gsap.set(get('hero'),{left:740,top:210,width:230,height:220});
  const flip=Flip.from(state,{duration:1.1,ease:'power3.inOut',absolute:true,scale:true});tl.add(flip,.75).to(get('a'),{opacity:0,duration:.7},.75).to(get('sheet'),{opacity:1,duration:.7},.95);
 }
 if(key==='occlude'){
  scene.insertAdjacentHTML('beforeend',room('b',true)+'<div id="wall" class="shutter"></div>');gsap.set(get('b'),{opacity:0});
  tl.to(get('wall'),{x:1400,duration:.55,ease:'power2.in'},.7).set(get('a'),{opacity:0},1.25).set(get('b'),{opacity:1},1.25).to(get('wall'),{x:2800,duration:.55,ease:'power2.out'},1.25);
 }
 if(key==='spring')tl.to(world,{duration:1.4,scale:1.3,x:-180,y:-98,ease:'elastic.out(1,0.55)'},.65);
 tl.to({},{duration:.01},3.99);tl.seek(0,false).pause();tl.timeScale(Number(get('speed').value));get('play').textContent='播放';update();
}
function update(){if(!tl)return;get('seek').value=tl.time();get('clock').textContent=tl.time().toFixed(2)+' / 4.00 s';}
for(const [key,c]of Object.entries(cases)){const b=document.createElement('button');b.textContent=c[0];b.type='button';b.dataset.mode=key;b.onclick=()=>choose(key);get('choices').appendChild(b);}
get('play').onclick=()=>{if(tl.paused()||tl.time()>=tl.duration()){if(tl.time()>=tl.duration())tl.seek(0,false);tl.play();get('play').textContent='暂停';}else{tl.pause();get('play').textContent='播放';}};
get('replay').onclick=()=>{tl.restart();get('play').textContent='暂停';};get('seek').oninput=()=>{tl.pause().seek(Number(get('seek').value),false);get('play').textContent='播放';};get('speed').onchange=()=>tl.timeScale(Number(get('speed').value));
new ResizeObserver(()=>get('fit').style.transform=`scale(${get('stage').clientWidth/1200})`).observe(get('stage'));
if(!window.gsap||!window.Flip)throw Error('本地GSAP文件缺失，请完整保留vendor目录');
const query=new URLSearchParams(location.search);document.body.classList.toggle('embedded',query.get('embed')==='1');choose(Object.hasOwn(cases,query.get('effect'))?query.get('effect'):'relay');
// Test/debug surface: no additional playback clock or state-changing callbacks.
window.motionPreview={choose,get timeline(){return tl;},get mode(){return mode;}};


