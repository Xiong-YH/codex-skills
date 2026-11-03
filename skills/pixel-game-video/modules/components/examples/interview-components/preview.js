(function(){
  'use strict';
  const $=id=>document.getElementById(id),D=window.PixelInterviewDrawing;
  const studies={
    cards:{api:window.PixelInterviewCards,title:'同一副牌，翻开三类经历',description:'三张实体牌始终保留，A / B 在同一张牌上比较。',
      meaning:'校园、项目、解决问题：比较的是同类经历，牌面不累计成总分。',
      motion:'依次翻开，再拿起校园牌。正反面、牌边厚度与持牌位置保持连续。',
      result:'始终只有三张牌。拿起后归位，已有经历仍然可见。',
      beats:[['初态',0],['校园',window.PixelInterviewCards.events.campusOpen+.2],['项目',window.PixelInterviewCards.events.projectOpen+.2],['问题',window.PixelInterviewCards.events.problemOpen+.2],['拿起',window.PixelInterviewCards.events.held+.2],['归位',window.PixelInterviewCards.duration]],
      contract:{表达:'同类经历对照；三张牌身份和数量连续。',形态:'固定视角纸质厚牌，黄铜角件，A/B 身份色；两种宿主位置与尺寸。',动作:'翻开、抬起、持牌、归位；中间过程可拖动检查。',素材:'代码绘制牌背、牌面、边缘、投影与手部；不依赖外部图片。',能力:'局部 Canvas 试样；固定内容与视角。尚未注册为 shot.components.kind，也未验证工作台交付。'}},
    stamp:{api:window.PixelJudgmentStamp,title:'判决停住，简历保持干净',description:'第一次停在纸面上方；结尾从同一位置继续，把印章放到桌边。',
      meaning:'一次求职结果没有被盖成对整个人的判决。',
      motion:'接近、悬停、移离、落桌。悬停留出可见间隙，印章始终只有一枚。',
      result:'纸面从未被盖印；末态保留原简历与桌边的印章。',
      beats:[['接近',0],['悬停',window.PixelJudgmentStamp.events.hover+.2],['继续',window.PixelJudgmentStamp.events.withdraw+.2],['放下',window.PixelJudgmentStamp.duration]],
      contract:{表达:'接近判决→停止→放下；不生成合格或不合格的盖印结果。',形态:'木柄、红胶章与纸质简历；固定视角，印章和纸面有明确间距。',动作:'短促接近与撤回，中段冻结；末态落在桌边，手部按实际持握进退。',素材:'代码绘制印章、简历与相关接触层；投影与实体同步。',能力:'局部 Canvas 试样；仅此悬停与放下动作，未提供盖章、任意视角或工作台接入。'}},
    task:{api:window.PixelTaskWorkbench,title:'试一个任务，再补一个缺口',description:'空表提交暴露问题，补上必填校验，回同一张表单重新试。',
      meaning:'岗位要求变成可检验的任务，学习直接回应实际缺口。',
      motion:'第一次试做、发现缺口、装入校验、空表重试、有效提交。',
      result:'空提交被拦住；填写姓名后才保留一条有效报名。',
      beats:[['试做',0],['发现问题',window.PixelTaskWorkbench.events.issue+.2],['补校验',window.PixelTaskWorkbench.events.patchSettled+.2],['空表重试',window.PixelTaskWorkbench.events.invalidRejected+.2],['有效提交',window.PixelTaskWorkbench.duration]],
      contract:{表达:'同一任务通过实际失败与复试推进，不自动生成 offer。',形态:'实体报名终端、纸质任务单和一枚必填校验模块；不做空泛流程图。',动作:'试提交→暴露缺口→补齐→回原任务复试，结果持续保留。',素材:'代码绘制终端、按钮、字段、工单和校验模块；表单逻辑为本地模拟。',能力:'固定示意任务和字段；可用下方表单实际检查空值与有效提交，未连接真实报名服务或工作台。'}}
  };
  for(const [key,study] of Object.entries(studies))if(!study.api)throw new Error('组件未载入：'+key);
  const canvas=$('canvas'),ctx=canvas.getContext('2d');
  let selected='cards',time=0,playing=!matchMedia('(prefers-reduced-motion: reduce)').matches,last=0;
  let alternate=false,background=true,lastKey='',trial=null;
  const manual={validationInstalled:false,records:[]};

  function effectiveState(){
    const api=studies[selected].api;
    return selected==='task'&&trial?api.stateAt(time,trial):api.stateAt(time);
  }
  function resetManualModel(){
    manual.validationInstalled=false;manual.records=[];trial=null;$('trial-name').value='';
    $('trial-result').textContent='你的试做尚未开始：先留空提交。';$('trial-fix').disabled=false;
    $('trial-fix').textContent='补上必填校验';
  }

  function drawBackground(){
    ctx.setTransform(2,0,0,2,0,0);ctx.clearRect(0,0,960,540);
    D.rect(ctx,0,0,960,540,background?'#263a3b':'#132228');
    if(!background)return;
    for(let y=0;y<540;y+=5){
      const band=Math.floor(y/108),tone=['#2e413e','#30423e','#2c3e3b','#2f403b','#293b38'][band];
      D.rect(ctx,0,y,960,5,tone);
      for(let x=0;x<960;x+=24){
        const v=(x*13+y*7)%113;
        if(v<19)D.rect(ctx,x+(y%17),y,12+v,2,'#56614a17');
      }
      if(y%108<5)D.rect(ctx,0,y,960,2,'#182d2d');
    }
    const light=ctx.createRadialGradient(430,180,30,480,270,590);
    light.addColorStop(0,'#d4b57c12');light.addColorStop(.55,'#101c2200');light.addColorStop(1,'#07141b88');
    ctx.fillStyle=light;ctx.fillRect(0,0,960,540);
    D.rect(ctx,0,0,960,3,'#7d7c5725');
  }
  function render(){
    const study=studies[selected];drawBackground();
    // Arms leave the composition at its right/bottom edges. Keep the smaller
    // study aligned to those edges instead of cutting a sleeve in mid-table.
    const options=alternate?{x:192,y:108,width:768,height:432}:{x:0,y:0,width:960,height:540};
    study.api.draw(ctx,{...options,time,...(selected==='task'&&trial?{trial}:{} )});
    const state=effectiveState();
    $('phase').textContent=state.label||state.phase;
    $('clock').textContent=time.toFixed(2)+' / '+study.api.duration.toFixed(2)+'s';
    $('seek').value=Math.round(time*1000);$('play').textContent=playing?'暂停':'播放';
  }
  function seek(value){
    if(selected==='task')resetManualModel();
    time=D.clamp(Number(value),0,studies[selected].api.duration);playing=false;trial=null;last=0;render();
  }
  function select(key,{autoplay=true}={}){
    if(!studies[key])throw new Error('Unknown study');
    selected=key;time=0;trial=null;last=0;playing=autoplay&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(key==='task')resetManualModel();
    const s=studies[key];
    document.querySelectorAll('[data-study]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.study===key)));
    $('study-title').textContent=s.title;$('study-description').textContent=s.description;
    canvas.setAttribute('aria-label',s.title);$('meaning').textContent=s.meaning;$('motion').textContent=s.motion;$('result').textContent=s.result;
    $('seek').max=Math.round(s.api.duration*1000);$('trial').hidden=key!=='task';
    $('beats').replaceChildren();
    for(const [label,at] of s.beats){
      const b=document.createElement('button');b.className='beat';b.textContent=label;b.onclick=()=>seek(at);$('beats').append(b);
    }
    $('contract').replaceChildren();
    for(const [label,content] of Object.entries(s.contract)){
      const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=content;$('contract').append(dt,dd);
    }
    render();
  }
  function resetTrial(){
    resetManualModel();seek(0);
  }
  $('trial-form').onsubmit=e=>{
    e.preventDefault();const api=studies.task.api,name=$('trial-name').value;
    const result=api.submit({validationInstalled:manual.validationInstalled,name,records:manual.records});
    manual.records=result.records;playing=false;
    trial={name,validationInstalled:manual.validationInstalled,result,records:manual.records};
    $('trial-result').textContent=result.accepted?(name.trim()?'报名成功，当前记录 '+result.records.length+' 条。':'空值也被接受了：必填检查还没有起作用。'):(result.error||'请填写姓名后重试。');
    time=manual.validationInstalled?api.duration:api.events.issue+.2;render();
  };
  $('trial-fix').onclick=()=>{
    manual.validationInstalled=true;manual.records=[];playing=false;
    $('trial-fix').disabled=true;$('trial-fix').textContent='必填校验已补上';
    $('trial-result').textContent='校验已补上，旧的无效试验记录已清理。回原表单试试空提交。';
    time=studies.task.api.events.patchSettled;trial={name:$('trial-name').value,validationInstalled:true,result:null,records:[]};render();
  };
  $('trial-reset').onclick=resetTrial;
  $('play').onclick=()=>{if(selected==='task'&&trial)resetManualModel();trial=null;if(time>=studies[selected].api.duration)time=0;playing=!playing;last=0;render();};
  $('replay').onclick=()=>{if(selected==='task')resetManualModel();time=0;trial=null;playing=true;last=0;render();};
  $('seek').oninput=e=>seek(Number(e.target.value)/1000);
  $('layout').onclick=()=>{alternate=!alternate;$('layout').setAttribute('aria-pressed',String(alternate));render();};
  $('background').onclick=()=>{background=!background;$('background').setAttribute('aria-pressed',String(background));$('background').textContent='桌面背景 · '+(background?'开':'关');render();};
  document.querySelectorAll('[data-study]').forEach(b=>b.onclick=()=>select(b.dataset.study));
  document.addEventListener('visibilitychange',()=>last=0);
  function tick(now){
    if(playing&&last){
      time+=Math.min(.08,(now-last)/1000)*Number($('speed').value);
      if(time>=studies[selected].api.duration){
        if($('loop').checked)time=0;else{time=studies[selected].api.duration;playing=false;}
      }
    }
    last=now;
    const key=[selected,time,playing,alternate,background].join('|');
    if(key!==lastKey){render();lastKey=key;}
    requestAnimationFrame(tick);
  }
  window.interviewStudies=Object.freeze({
    select:key=>select(key,{autoplay:false}),seek,
    state:()=>({selected,time,playing,alternate,background,trial,component:effectiveState()}),
    setLayout:value=>{alternate=Boolean(value);$('layout').setAttribute('aria-pressed',String(alternate));render();},
    setBackground:value=>{background=Boolean(value);$('background').setAttribute('aria-pressed',String(background));$('background').textContent='桌面背景 · '+(background?'开':'关');render();},
    studies:Object.fromEntries(Object.entries(studies).map(([key,s])=>[key,{id:s.api.id,duration:s.api.duration,beats:s.beats}]))
  });
  select('cards');window.interviewStudiesReady=true;requestAnimationFrame(tick);
})();
