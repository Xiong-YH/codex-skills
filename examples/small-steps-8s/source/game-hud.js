(() => {
  const {smooth,mix,label}=Motion;
  function screen(g,t){
    const visible=smooth(t,8.1,8.6);
    mix(g,visible,()=>{
      const names=['需求','设计','验证','交付'],starts=[8.3,11.2,15.2,23.95],done=[11.2,15.2,18.76,29];
      for(let i=0;i<4;i++){
        const x=155+i*40,active=t>=starts[i],complete=t>=done[i];
        g.fillStyle=complete?'#315f64':active?'#3c536e':'#243a54';g.fillRect((x-18)*6,34*6,36*6,9*6);
        V.dot(g,x-18,34,1,active?'#a0e4cf':'#617792');
        V.text(g,(complete?'✓ ':'')+names[i],x,40.5,23,complete?'#c3f8e5':active?'#f2e2b4':'#7893ad');
      }
    });
    label(g,'主线任务 / 解决问题',26,40,25,'#a6c9da','left',visible);
  }
  function actor(g,t){
    const a=smooth(t,8.15,8.65);if(!a)return;
    label(g,'开发者',49,77,28,'#c8f3de','center',a);
    for(let i=0;i<3;i++){
      const on=smooth(t,[11.2,18.76,29][i],[11.2,18.76,29][i]+.25);
      V.dot(g,39+i*7,79,5,'#254154',a);V.dot(g,40+i*7,80,3,on>.5?'#9ee6c5':'#567c90',a);
    }
    const boost=smooth(t,29,29.25)*(1-smooth(t,30.2,30.6));
    label(g,'能力解锁 +1',49,66-(t-29)*1.5,25,'#f5dfa9','center',boost);
    GameBoard.burst(g,t,29,49,139,'#f2d88f',12);
  }
  window.GameHUD={screen,actor};
})();
