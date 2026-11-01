(function(P){
  'use strict';
  const recipes=new Set(['motion.component-handoff.v1','motion.line-handoff.v1','motion.preview-expand.v1','motion.panel-occlusion.v1']);
  const clamp=v=>Math.max(0,Math.min(1,v)),smooth=v=>{v=clamp(v);return v*v*v*(10+v*(-15+6*v));},mix=(a,b,t)=>a+(b-a)*t;
  const part=(p,a,b)=>smooth((p-a)/(b-a)),lerp=(a,b,t)=>a.map((v,i)=>mix(v,b[i],t));
  function opacity(g,a,fn){if(a<=0)return;g.save();g.globalAlpha*=clamp(a);try{fn();}finally{g.restore();}}
  function scene(g,h,side,ids,a=1){opacity(g,a,()=>g.drawImage(h.scene(side,ids),0,0));}
  function component(g,h,side,id,box,a=1){opacity(g,a,()=>h.component(side,id,box));}
  function excluding(p,h,g,oldIds,newIds){const q=part(p,.15,.85);scene(g,h,'old',oldIds);scene(g,h,'next',newIds,q);}
  function handoff(e,old,next,m,p){
    const h=e.handoff;if(!h)throw new Error('Content handoff requires the renderer component context');
    const g=e.ctx,a=m.params,w=e.width,height=e.height;
    if(m.recipe==='motion.component-handoff.v1'){
      const mode=a.mode;
      if(!['match','reflow','overview','merge','keyword'].includes(mode))throw new Error('Unknown component handoff mode '+mode);
      if(mode==='merge'){
        if(!Array.isArray(a.sources)||a.sources.length<2||a.sources.length>6||new Set(a.sources).size!==a.sources.length)throw new Error('merge requires 2–6 unique sources');
        excluding(p,h,g,a.sources,[a.target]);
        const target=h.box('next',a.target),n=a.sources.length;
        a.sources.forEach((id,i)=>{
          const dest=[target[0]+target[2]*i/n,target[1],target[2]/n,target[3]],q=part(p,.05+i*.025,.68+i*.025);
          component(g,h,'old',id,lerp(h.box('old',id),dest,q),1-part(p,.35,.65));
        });
        component(g,h,'next',a.target,target,part(p,.46,.83));return;
      }
      if(!Array.isArray(a.pairs)||a.pairs.length<1||a.pairs.length>6||(mode!=='reflow'&&a.pairs.length!==1))throw new Error('Invalid component handoff pairs');
      const oldIds=a.pairs.map(x=>x.from),newIds=a.pairs.map(x=>x.to);
      if(new Set(oldIds).size!==oldIds.length||new Set(newIds).size!==newIds.length)throw new Error('Duplicate component handoff IDs');
      if(mode==='overview'){const from=h.box('old',oldIds[0]),to=h.box('next',newIds[0]);if(Math.abs(from[2]/from[3]-to[2]/to[3])>.001)throw new Error('overview must preserve component aspect ratio');}
      excluding(p,h,g,oldIds,newIds);
      if(mode==='keyword'){
        if(typeof a.word!=='string'||!a.word||!['old','next'].every((side,i)=>String(h.item(side,i?newIds[0]:oldIds[0]).data.title||'').includes(a.word)))throw new Error('keyword must occur in both component titles');
        const q=part(p,.16,.80),b=lerp(h.rect('old',a.fromRect),h.rect('next',a.toRect),q),size=mix((a.fontFrom??.045)*h.scale('old'),(a.fontTo??.045)*h.scale('next'),q)*height;
        const landing=part(p,.80,1),pair=a.pairs[0];
        opacity(g,(1-landing)*mix(h.opacity('old'),h.opacity('next'),q),()=>{g.save();g.fillStyle=e.colors.ink;g.font=`600 ${size}px ${e.style.fontFamily}`;g.textAlign='left';g.textBaseline='top';
          g.fillText(a.word,Math.round(b[0]*w),Math.round(b[1]*height));g.restore();});
        component(g,h,'next',pair.to,h.box('next',pair.to),landing);return;
      }
      a.pairs.forEach((pair,i)=>{
        const q=part(p,.06+i*.025,.88+i*.012),from=h.box('old',pair.from),to=h.box('next',pair.to),b=lerp(from,to,q),blend=part(p,.36+i*.02,.66+i*.02);
        // Re-render the component at the destination geometry. Text is never a
        // scaled screenshot. Incompatible intermediate layouts fail visibly.
        component(g,h,'old',pair.from,b,1-blend);component(g,h,'next',pair.to,b,blend);
      });return;
    }
    if(m.recipe==='motion.line-handoff.v1'){
      excluding(p,h,g,[a.source],[a.target]);
      component(g,h,'old',a.source,h.box('old',a.source),1-part(p,.02,.28));
      component(g,h,'next',a.target,h.box('next',a.target),part(p,.65,.94));
      const q=part(p,.08,.78),start=a.startLine.map(v=>h.rect('old',[...v,0,0]));
      opacity(g,1-part(p,.80,1),()=>{g.strokeStyle=e.colors.gold;g.lineWidth=Math.max(2,e.pixel);g.lineJoin='miter';g.beginPath();
        a.points.forEach((point,i)=>{const target=h.rect('next',[...point,0,0]),t=i/(a.points.length-1),x=mix(mix(start[0][0],start[1][0],t),target[0],q)*w,y=mix(mix(start[0][1],start[1][1],t),target[1],q)*height;
          if(i)g.lineTo(Math.round(x),Math.round(y));else g.moveTo(Math.round(x),Math.round(y));});g.stroke();});return;
    }
    if(m.recipe==='motion.preview-expand.v1'){
      h.verifyPreview(a.source);
      scene(g,h,'old',[]);
      const actual=h.previewBox(a.source);
      if(a.window&&h.rect('old',a.window).some((v,i)=>Math.abs(v-actual[i])>1/(i%2?height:w)))throw new Error('preview-expand window must match the actual component image viewport');
      const q=part(p,.04,.88),b=lerp(actual,h.rect('next',[0,0,1,1]),q);
      g.drawImage(h.preview(),Math.round(b[0]*w),Math.round(b[1]*height),Math.round(b[2]*w),Math.round(b[3]*height));
      opacity(g,1-part(p,.76,.93),()=>{g.strokeStyle=e.colors.gold;g.lineWidth=Math.max(2,e.pixel);g.strokeRect(b[0]*w,b[1]*height,b[2]*w,b[3]*height);});
      scene(g,h,'next',[],part(p,.88,1));return;
    }
    // A real component, rather than an invented giant book or paper texture,
    // supplies the coverage. It is redrawn using the project's own style.
    const sourceBox=h.box('old',a.source);
    if(h.item('old',a.source).kind!=='identity'||sourceBox[2]*w/(sourceBox[3]*height)<=480/180)throw new Error('panel-occlusion requires an opaque wide identity panel');
    scene(g,h,p<.5?'old':'next',p<.5?[a.source]:[]);
    const from=h.box('old',a.source),coverScale=Math.max(1.20/from[2],1.20/from[3]),cover=[(1-from[2]*coverScale)/2,(1-from[3]*coverScale)/2,from[2]*coverScale,from[3]*coverScale];
    const grow=part(p,.10,.42),leave=part(p,.58,1),b=lerp(from,cover,grow);
    b[0]+=(a.direction==='right'?1:-1)*(cover[2]+1.1)*leave;
    component(g,h,'old',a.source,b);
  }
  P.motion.handoffRecipes=recipes;
  const prior=P.motion.worldTransition;
  P.motion.worldTransition=function(e,old,next,m,frame){
    if(!recipes.has(m.recipe))return prior(e,old,next,m,frame);
    const p=P.progress(frame,m.startFrame,m.endFrame),g=e.ctx;
    g.save();g.imageSmoothingEnabled=false;
    try{if(p<=0)g.drawImage(old,0,0,e.width,e.height);else if(p>=1)g.drawImage(next,0,0,e.width,e.height);else handoff(e,old,next,m,p);}finally{g.restore();}
  };
})(globalThis.PixelVideo=globalThis.PixelVideo||{});
