(() => {
  const {make,ctx}=PX,{smooth,lerp,exp,mix}=Motion;
  const canvas=make(1920,1080),g=ctx(canvas);
  const shots=Runtime.chapters;
  function wallState(t){
    const pull=smooth(t,2.45,5.6),focus=smooth(t,5.75,8.05);
    const scale=t<5.75?exp(1.9,.24,pull):exp(.24,1.04,focus),cx=248*focus;
    // Keep the selected tile on one path while the surrounding wall expands.
    const x=t<5.75?178:lerp(178+248*.24,218,focus)-(248-cx)*scale;
    return {scale,cx,x,y:lerp(92,78,focus)};
  }
  function tilePose(i,j,w){return {x:w.x+(i*124-w.cx)*w.scale,y:w.y+j*91*w.scale,scale:w.scale};}
  function primary(t){return t<8.05?tilePose(2,0,wallState(t)):{x:218,y:78,scale:1.04};}
  function codeTile(g,i,j,w,t){
    const o=tilePose(i,j,w),variant=(i===2&&j===0)?0:Math.abs(i*3+j*7)%4;
    if(o.x+62*o.scale<0||o.x-62*o.scale>320||o.y+47*o.scale<0||o.y-47*o.scale>180)return;
    if(i===0&&j===0&&t<2.45){
      Art.draw(g,'terminal-empty',o.x,o.y,o.scale);
      const p=smooth(t,.15,2.15);
      g.save();g.beginPath();g.rect((o.x-45*o.scale)*6,(o.y-23*o.scale)*6,92*o.scale*6,53*o.scale*6*p);g.clip();
      Art.draw(g,'terminal-0',o.x,o.y,o.scale);g.restore();
    }else Art.draw(g,'terminal-'+variant,o.x,o.y,o.scale,(i===0&&j===0)?1:smooth(t,2.45,2.95));
  }
  function wall(t){
    const w=wallState(t),room=smooth(t,7.05,8.05),skipPrimary=t>=7.05;
    const spanX=Math.ceil(320/(124*w.scale))+2,spanY=Math.ceil(180/(91*w.scale))+2;
    mix(g,1-room,()=>{
      for(let j=-spanY;j<=spanY;j++)for(let i=-spanX;i<=spanX;i++){
        if(skipPrimary&&i===2&&j===0)continue;
        codeTile(g,i,j,w,t);
      }
    });
    const target=tilePose(2,0,w);
    Art.draw(g,'selection',target.x,target.y,target.scale,Motion.fade(t,5.62,5.9,8.2,8.6));
    mix(g,1-smooth(t,2.35,2.9),()=>V.actor(g,Runtime.lead,36,151,1.03,t,false));
  }
  function headings(t){
    const entries=Runtime.headings;
    for(const [start,end,text] of entries){
      const a=(start===0?1:smooth(t,start-.12,start+.16))*(1-smooth(t,end-.12,end+.16));
      mix(g,a,()=>V.text(g,text,26,25,58,start>=28.2?'#b5efda':'#eef5ff','left',600));
    }
    V.text(g,Runtime.brand,305,12,21,'#a9bdcf','right',500);
  }
  function draw(t){
    t=Math.min(Runtime.duration-.001,Math.max(0,t));g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,1920,1080);
    g.fillStyle='#20344e';g.fillRect(0,0,1920,1080);
    const room=smooth(t,7.05,8.05);
    Workbench.environment(g,t,room);
    if(t<8.6)wall(t);
    if(t>=7.05)Motion.view(g,t,()=>Workbench.content(g,t,primary(t)));
    headings(t);GameHUD.screen(g,t);V.captions(g,t,true);
    return canvas;
  }
  window.ProgrammerFilm={draw,shots,duration:Runtime.duration,fps:Runtime.fps,ready:V.ready,wallState,primary};
})();
