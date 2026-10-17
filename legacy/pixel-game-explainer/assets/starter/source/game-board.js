(() => {
  const {smooth,fade,lerp,mix,label}=Motion;
  function burst(g,t,at,x,y,color='#d1f7db',count=9){
    const p=(t-at)/.52;if(p<0||p>1)return;
    for(let i=0;i<count;i++){
      const a=i*Math.PI*2/count+.3,d=2+19*(1-(1-p)**2),s=i%3?1:1.7;
      V.dot(g,x+Math.cos(a)*d,y+Math.sin(a)*d*.65,s,color,(1-p)**1.5);
    }
  }
  function stage(g,t){
    const enter=smooth(t,8.05,8.7);
    Art.draw(g,'arena-stage',218,87,lerp(.73,1,enter),enter);
  }
  function core(g,t,x,y,scale=1,alpha=1){Art.draw(g,'project-core',x,y+Math.sin(t*3)*.7,scale,alpha);}
  function quest(g,t){
    const system=smooth(t,11.2,12.1),exit=1-smooth(t,15.2,16.05),enter=smooth(t,8.3,8.65);
    if(!exit)return;
    mix(g,enter*exit,()=>{
      const positions=[174,218,262];
      V.link(g,[[174,98],[262,98]],1,'#456779',1.1);
      V.link(g,[[174,98],[262,98]],smooth(t,11.5,12.25),'#92d8c5',1.2);
      positions.forEach((x,i)=>{
        const at=[8.3,9.43,10.28][i],on=smooth(t,at,at+.3);
        Art.draw(g,'quest-pad',x,99,1,.3+.7*on);
        Art.draw(g,['quest-person','target','quest-flag'][i],x,84-(1-on)*4,[.8,.52,.7][i],on*(1-system));
        Art.draw(g,['database','system','app'][i],x,84,.48,on*system);
        label(g,['用户','目标','验收'][i],x,68,28,'#e5e9ff','center',on*(1-system));
        label(g,['输入','处理','输出'][i],x,68,28,'#b6eddd','center',system);
        Art.draw(g,'verified',x+10,106,.19,smooth(t,at+.2,at+.5)*(1-system));
        burst(g,t,at+.07,x,87);
      });
      let x=t<9.43?174:t<10.28?lerp(174,218,smooth(t,9.43,9.9)):lerp(218,262,smooth(t,10.28,10.75));
      if(t>11.2)x=lerp(262,174,smooth(t,11.2,11.9));
      if(t>12.0)x=lerp(174,262,smooth(t,12.0,14.8));
      Art.draw(g,'cursor',x,84,1.15,(1-system)*.85);
      label(g,'任务目标逐一确认',218,145,27,'#b6cbd6','center',1-system);
      label(g,'连接模块，让数据走通',218,145,27,'#b6cbd6','center',system);
      if(system>.1)for(let i=0;i<3;i++){
        const p=(t*.65+i/3)%1;V.dot(g,lerp(174,262,p),97,1.3,'#d1f7db',system);
      }
    });
  }
  function challenge(g,t){
    const enter=smooth(t,15.2,16.05),exit=1-smooth(t,19.7,20.45);
    if(!enter||!exit)return;
    mix(g,exit,()=>{
      Art.draw(g,'shield',204,88,.9,enter);
      label(g,'边界护盾',204,61,28,'#b7efe0','center',enter);
      const hits=[16.45,17.10,17.76],repairs=[18.13,18.42,18.76];
      const health=1-.2*hits.reduce((n,at)=>n+smooth(t,at+.18,at+.32),0)+.2*repairs.reduce((n,at)=>n+smooth(t,at,at+.2),0);
      V.link(g,[[187,117],[220,117]],1,'#1b3047',2.5);V.link(g,[[187,117],[220,117]],health,'#90e6c5',2.5);
      for(const [i,name,at,x,y] of [[0,'空值',16.45,257,71],[1,'超时',17.10,270,91],[2,'权限',17.76,257,111]]){
        const fixedAt=[18.13,18.42,18.76][i],on=smooth(t,at-.1,at+.15),fixed=smooth(t,fixedAt-.06,fixedAt+.18);
        Art.draw(g,'hazard',x,y,.72,on*(1-fixed));Art.draw(g,'hazard-clear',x,y,.72,on*fixed);
        label(g,name,x,y-11,23,fixed>.5?'#b5e7cc':'#efb2b1','center',on);
        mix(g,fade(t,at,at+.08,at+.18,at+.45),()=>V.link(g,[[x-10,y],[236,y],[228,89]],1,'#f0b2b0',.7));
        const flight=PX.clamp((t-at)/.24),flying=t>=at&&t<at+.24;
        if(flying){
          V.dot(g,lerp(x-12,228,flight),lerp(y,87,flight),2,'#ffcab2',1);
          V.dot(g,lerp(x-10,230,flight),lerp(y,87,flight),1,'#cf8a9a',.8);
        }
        burst(g,t,at+.24,229,87,'#f2b6b3',6);burst(g,t,fixedAt,x,y,'#b7efda',6);
      }
      Art.draw(g,'verified',204,87,.68,smooth(t,18.76,19.05));
      label(g,'异常已处理',218,145,27,'#b5efda','center',smooth(t,18.76,19.05));
    });
  }
  function movingCore(g,t){
    const alpha=smooth(t,11.2,12.1)*(1-smooth(t,18.76,19.05));if(!alpha)return;
    const move=smooth(t,15.2,16.05);
    const route=t<12?lerp(262,174,smooth(t,11.2,11.9)):lerp(174,262,smooth(t,12,14.8));
    core(g,t,lerp(route,204,move),lerp(116,87,move),lerp(.38,.81,move),alpha);
  }
  window.GameBoard={stage,quest,challenge,movingCore,core,burst};
})();
