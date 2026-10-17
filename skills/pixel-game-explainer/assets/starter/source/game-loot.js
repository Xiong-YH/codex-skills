(() => {
  const {smooth,fade,lerp,mix,label}=Motion;
  function selectedPose(t){
    const p=smooth(t,19.7,20.45),choose=smooth(t,22.1,23.2);
    return {x:lerp(lerp(218,253,p),218,choose),y:lerp(87,84,p),scale:lerp(1,1.08,choose)};
  }
  function card(g,x,y,scale,type,selected,alpha){
    mix(g,alpha,()=>{
      g.save();g.translate(x*6,y*6);g.scale(scale,scale);g.translate(-x*6,-y*6);
      Art.draw(g,selected?'loot-selected':`loot-${type}`,x,y);
      V.text(g,`方案 ${type.toUpperCase()}`,x,y-19,31,selected?'#ffe3a3':type==='b'?'#b4f3df':'#c7c2ed');
      Art.draw(g,type==='a'?'code':'app',x,y-4,.42);
      for(let i=0;i<3;i++){
        const amount=(type==='a'?[.65,.8,.76]:[.82,.48,.35])[i];
        V.text(g,['收益','成本','风险'][i],x-10,y+11+i*8,21,'#a9c2d1','right');
        V.link(g,[[x-2,y+11.5+i*8],[x-2+23*amount,y+11.5+i*8]],1,i===0?'#91e1c6':i===1?'#c1b6e7':'#e3bfa0',2);
      }
      g.restore();
    });
  }
  function choices(g,t){
    const enter=smooth(t,19.7,20.45),choose=smooth(t,22.1,23.2),exit=1-smooth(t,23.95,24.8);
    if(!enter||!exit)return;
    const b=selectedPose(t);
    card(g,lerp(lerp(218,183,enter),164,choose),84,1,'a',false,enter*(1-choose)*exit);
    card(g,b.x,b.y,b.scale,'b',choose>.5,enter*exit);
    Art.draw(g,'cursor',b.x,b.y-1,2.5,fade(t,21.92,22.12,23.0,23.3));
    label(g,'比较收益、成本与风险',218,147,27,'#c6d6e5','center',fade(t,20.45,20.8,22.1,22.45));
    label(g,'选择适合交付的方案',218,147,27,'#f2dda7','center',fade(t,22.15,22.45,23.65,24.0));
    GameBoard.burst(g,t,23.1,218,84,'#f5d997',12);
  }
  function project(g,t){
    const enter=smooth(t,23.95,24.8),final=smooth(t,28.2,29.0);
    if(!enter)return;
    mix(g,enter,()=>{
      V.link(g,[[179,111],[218,111],[259,111]],smooth(t,24.3,26.8),'#8cdcc8',1.5);
      for(const [sprite,x,y,at,name] of [['module-requirement',183,109,24.91,'需求'],['module-system',218,105,25.61,'设计'],['module-verify',254,109,26.31,'验证']]){
        const p=smooth(t,at-.6,at+.07),settle=fade(t,at,at+.09,at+.11,at+.25);
        Art.draw(g,'quest-pad',x,115,.92,.5+.5*p);
        Art.draw(g,sprite,x,y-10*(1-p)+.7*settle,.8+.2*p,p);
        mix(g,smooth(t,at-.1,at+.2),()=>{
          g.fillStyle='#203a50';g.fillRect((x-13)*6,124*6,26*6,10*6);
          V.text(g,name,x-2,131.5,25,'#c9e8e7');
        });
        Art.draw(g,'verified',x+8,128,.18,smooth(t,at,at+.2));GameBoard.burst(g,t,at,x,y-8,'#c1ead9',8);
      }
      const power=smooth(t,26.76,27.12);
      label(g,'模块就位 · 项目上线',218,63,28,'#c5f6e3','center',power*(1-final));
      if(power)for(let i=0;i<6;i++){
        const p=(t*.45+i/6)%1;V.dot(g,lerp(185,253,p),110,1.1,'#ddfff0',power*.85);
      }
      Art.draw(g,'clear-banner',218,57,lerp(.88,1,final),final);
      label(g,'任务完成',218,60,42,'#e0fff1','center',final);
      label(g,'问题已解决 · 项目可交付',218,145,31,'#b6eddb','center',final);
      GameBoard.burst(g,t,29.0,218,73,'#f2d88f',18);
      for(let i=0;i<3;i++)Art.draw(g,'star',207+i*11,75,1,smooth(t,29+i*.11,29.25+i*.11));
    });
  }
  window.GameLoot={choices,project};
})();
