(() => {
  const {smooth,mix}=Motion;
  function environment(g,t,alpha){
    mix(g,alpha,()=>Motion.view(g,t,()=>{
      Art.draw(g,'arena-room',0,0);
      V.actor(g,Runtime.lead,49,151,1.95,t,false);
      GameHUD.actor(g,t);
    }));
  }
  function content(g,t,o){
    const enter=smooth(t,8.05,8.7);
    Art.draw(g,'terminal-0',o.x,o.y,o.scale,1-enter);
    GameBoard.stage(g,t);GameBoard.quest(g,t);GameBoard.challenge(g,t);GameBoard.movingCore(g,t);
    GameLoot.choices(g,t);GameLoot.project(g,t);
  }
  window.Workbench={environment,content};
})();
