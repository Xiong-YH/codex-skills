(() => {
  const clamp=PX.clamp,lerp=(a,b,p)=>a+(b-a)*p;
  function smooth(t,a,b){const p=clamp((t-a)/(b-a));return p*p*p*(p*(p*6-15)+10);}
  function fade(t,a,b,c,d){return smooth(t,a,b)*(1-smooth(t,c,d));}
  const exp=(a,b,p)=>Math.exp(lerp(Math.log(a),Math.log(b),p));
  function mix(g,alpha,paint){if(alpha<=0)return;g.save();g.globalAlpha*=alpha;paint();g.restore();}
  function label(g,value,x,y,size,color='#eef5ff',align='center',alpha=1){
    mix(g,alpha,()=>V.text(g,value,x,y,size,color,align));
  }
  function camera(t){
    return 1+.06*smooth(t,10.7,12.25)+.035*smooth(t,14.7,16.0)-.075*smooth(t,19.5,20.6)
      +.025*smooth(t,23.6,24.7)-.045*smooth(t,28,29.5);
  }
  function view(g,t,paint){
    const z=camera(t);g.save();g.translate(198*6,94*6);g.scale(z,z);g.translate(-198*6,-94*6);paint();g.restore();
  }
  window.Motion={clamp,lerp,smooth,fade,exp,mix,label,camera,view};
})();
