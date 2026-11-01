(function(P){
  'use strict';
  P.createRenderer=function({canvas,createCanvas,assets,resolved,mouth,style,frameAssets}){
    const project=resolved.project,width=project.width,height=project.height;
    canvas.width=width;canvas.height=height;
    const ctx=canvas.getContext('2d'),world=createCanvas(width,height),incoming=createCanvas(width,height),incomingWorld=createCanvas(width,height),plainScratch=createCanvas(width,height);
    const base={width,height,pixel:width/project.nativeWidth,colors:style.colors,style,
                assets,resolved,mouth,frameAssets,createCanvas,propCache:{},fps:project.fps,seed:project.seed??1};
    const history=new Map(),contentHistory=new Map(),worldHistory=new Map();
    const contentRecipes=new Set(['motion.panel-slide.v1','motion.pixel-iris.v1']);
    const handoffRecipes=new Set(['motion.component-handoff.v1','motion.line-handoff.v1','motion.preview-expand.v1','motion.panel-occlusion.v1']);
    const worldRecipes=new Set([...handoffRecipes,'motion.focus-punch.v1','motion.mosaic-pullback.v1','motion.book-sweep.v1','motion.scene-to-card.v1','motion.match-dissolve.v1', 'motion.cross-dissolve.v1', 'motion.fade-through-black.v1']);
    base.shotPreview=id=>{
      const index=resolved.shots.findIndex(s=>s.id===id);
      if(index<0)throw new Error('Unknown preview shot '+id);
      return snapshot(index,true);
    };
    function plainWorld(shot,frame,target,includePresenter=true){
      const flat=plainScratch,g=flat.getContext('2d');g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,width,height);
      const e={...base,ctx:g,frame,includePresenter};
      if(includePresenter)P.scenes.draw(e,shot,frame);
      else{
        // Overview tiles contain complete rooms, without multiplying a separate
        // presenter overlay. Preserve the scene's original content coordinates.
        P.scenes.drawLayer(e,shot,frame,'background');P.scenes.drawLayer(e,shot,frame,'content');
      }
      composite(target.getContext('2d'),flat,shot,frame);
      return target;
    }
    function gallery(){
      return resolved.shots.map((shot,index)=>{
        if(!worldHistory.has(index))worldHistory.set(index,plainWorld(shot,Math.min(shot.endFrame-1,shot.startFrame+Math.floor(shot.durationFrames*.72)),createCanvas(width,height),false));
        return worldHistory.get(index);
      });
    }
    function contentAt(shot,frame,target){
      const g=target.getContext('2d');g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,width,height);
      P.scenes.drawLayer({...base,ctx:g,frame},shot,frame,'content');return target;
    }
    function previousContent(index){
      if(!contentHistory.has(index)){
        const shot=resolved.shots[index],target=createCanvas(width,height);
        contentHistory.set(index,contentAt(shot,shot.endFrame-1,target));
      }
      return contentHistory.get(index);
    }
    function worldAt(shot,frame,target){
      const g=target.getContext('2d');g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,width,height);
      const e={...base,ctx:g,frame};
      const transition=(shot.motions||[]).find(m=>contentRecipes.has(m.recipe)&&frame>=m.startFrame&&frame<m.endFrame);
      if(transition){
        const index=resolved.shots.findIndex(s=>s.id===shot.id);
        if(index<1)throw new Error('A content transition needs a previous shot');
        P.scenes.drawLayer(e,shot,frame,'background');P.scenes.drawLayer(e,shot,frame,'actor');
        P.motion.transition({...e,stage:P.scenes.stageBounds(e,shot)},previousContent(index-1),contentAt(shot,frame,incoming),transition,frame);
      }else P.scenes.draw(e,shot,frame);
      return target;
    }
    function composite(g,source,shot,frame,background=true){
      const camera=P.motion.camera(shot.motions||[],frame);
      g.save();if(background){g.fillStyle=base.colors.background;g.fillRect(0,0,width,height);}
      if(camera.mode==='track'){
        g.translate(P.clamp(width/2-camera.x*width*camera.scale,width-width*camera.scale,0),
                    P.clamp(height/2-camera.y*height*camera.scale,height-height*camera.scale,0));
        g.scale(camera.scale,camera.scale);
      }else{
        g.translate(camera.x*width,camera.y*height);g.scale(camera.scale,camera.scale);g.translate(-camera.x*width,-camera.y*height);
      }
      g.imageSmoothingEnabled=false;g.drawImage(source,0,0);g.restore();
    }
    function snapshot(index,excludePresenter=false){
      const key=index+':'+excludePresenter;
      if(history.has(key))return history.get(key);
      const shot=resolved.shots[index],frame=shot.endFrame-1,target=createCanvas(width,height),flat=createCanvas(width,height);
      if(excludePresenter)plainWorld(shot,frame,target,false);
      else{worldAt(shot,frame,flat);composite(target.getContext('2d'),flat,shot,frame);}
      history.set(key,target);return target;
    }
    function presenterAt(shot,frame){
      const flat=createCanvas(width,height),target=createCanvas(width,height);
      // Replacement media has no separately removable presenter layer.
      if(!shot.replacement)P.scenes.drawLayer({...base,ctx:flat.getContext('2d'),frame},shot,frame,'actor');
      composite(target.getContext('2d'),flat,shot,frame,false);return target;
    }
    function handoffContext(index,motion,outgoingFrame,incomingFrame,options={}){
      const owners={old:resolved.shots[index-1],next:resolved.shots[index]},frames={old:outgoingFrame,next:incomingFrame};
      const transforms={old:options.outgoingTransform,next:options.incomingTransform};
      const find=(side,id)=>{const c=(owners[side].components||[]).find(c=>c.id===id);if(!c)throw new Error('Unknown handoff component '+side+':'+id);return c;};
      const box=(side,id)=>{const c=find(side,id),t=transforms[side]||{},scale=t.scale??1;return [(c.x-.5)*scale+.5+(t.x||0)/width,(c.y-.5)*scale+.5+(t.y||0)/height,c.width*scale,c.height*scale];};
      return {box,item:find,verifyPreview(id){const c=find('old',id),bg=owners.next.background;if(c.kind!=='identity'||!bg||c.data.image!==bg.file||bg.dim)throw new Error('preview-expand image must match the incoming background');},rect(side,b){const t=transforms[side]||{},s=t.scale??1;return[(b[0]-.5)*s+.5+(t.x||0)/width,(b[1]-.5)*s+.5+(t.y||0)/height,b[2]*s,b[3]*s];},opacity(side){return transforms[side]?.opacity??1;},scale(side){return transforms[side]?.scale??1;},scene(side,excluded){
        const shot={...owners[side],components:(owners[side].components||[]).filter(c=>!excluded.includes(c.id))};
        return transformed(plainWorld(shot,frames[side],createCanvas(width,height)),transforms[side]);
      },component(side,id,rect){
        const original=find(side,id),[x,y,w,h]=rect,c={...original,x,y,width:w,height:h};
        // Incoming geometry is read at landing, not its first entry-animation frame.
        const f=side==='next'?Math.min(owners.next.endFrame-1,motion.endFrame-1):frames.old;
        const t=transforms[side]||{};ctx.save();ctx.globalAlpha*=t.opacity??1;
        try{P.components.draw({...base,ctx,frame:f},{...owners[side],components:[c]},f);}finally{ctx.restore();}
      },previewBox(id){
        const c=find('old',id),asset=base.assets[c.data.imageKey];
        if(!asset||Math.abs(asset.width/asset.height-width/height)>.001)throw new Error('preview-expand image must match the project aspect ratio');
        const b=box('old',id),bounds=P.componentApparatus.imageBounds(base,c,{x:b[0]*width,y:b[1]*height,width:b[2]*width,height:b[3]*height});
        if(!bounds)throw new Error('preview-expand source requires an image viewport');
        const {x:bx,y:by,width:bw,height:bh}=bounds;
        const scale=Math.min(bw/asset.width,bh/asset.height),rw=asset.width*scale,rh=asset.height*scale;
        return [(bx+(bw-rw)/2)/width,(by+(bh-rh)/2)/height,rw/width,rh/height];
      },preview(){const c=createCanvas(width,height);P.scenes.drawLayer({...base,ctx:c.getContext('2d'),frame:frames.next},owners.next,frames.next,'background');return c;}};
    }
    function clear(){ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,width,height);}
    function transformed(source,transform={}){
      if(!(transform.x||transform.y||transform.scale!==undefined&&transform.scale!==1||transform.opacity!==undefined&&transform.opacity!==1))return source;
      const target=createCanvas(width,height),g=target.getContext('2d'),scale=transform.scale??1;
      g.globalAlpha=transform.opacity??1;g.translate((transform.x||0)+width/2,(transform.y||0)+height/2);
      g.scale(scale,scale);g.translate(-width/2,-height/2);g.drawImage(source,0,0);return target;
    }
    function shotFrame(index,frame){
      const shot=resolved.shots[index];if(!shot)throw new Error('Unknown workbench shot '+index);
      return Math.max(shot.startFrame,Math.min(shot.endFrame-1,frame));
    }
    function shotCanvas(index,frame){
      const target=createCanvas(width,height),shot=resolved.shots[index];
      plainWorld(shot,shotFrame(index,frame),target);return target;
    }
    // These entry points render original runtime layers. No intermediate video
    // is baked: workbench props reconstruct the same scene at its source clock.
    return {drawShot(frame,index){
      clear();const shot=resolved.shots[index];frame=shotFrame(index,frame);
      plainWorld(shot,frame,canvas);P.motion.effects({...base,ctx},shot.motions||[],frame);return canvas;
    },drawTransition(frame,index,motion,options={}){
      clear();if(index<1)throw new Error('A workbench transition needs a previous shot');
      const shot=resolved.shots[index],previous=resolved.shots[index-1];
      const incomingFrame=shotFrame(index,options.incomingFrame??frame);
      const outgoingFrame=shotFrame(index-1,options.outgoingFrame??previous.endFrame-1);
      const isCard=motion.recipe==='motion.scene-to-card.v1';
      const old=isCard?plainWorld(previous,outgoingFrame,createCanvas(width,height),false):
        (options.outgoingFrame===undefined?snapshot(index-1):shotCanvas(index-1,outgoingFrame));
      const next=shotCanvas(index,incomingFrame),e={...base,ctx,handoff:handoffRecipes.has(motion.recipe)?handoffContext(index,motion,outgoingFrame,incomingFrame,options):null};
      if(worldRecipes.has(motion.recipe)){
        P.motion.worldTransition({...e,outgoingPresenter:isCard?transformed(presenterAt(previous,outgoingFrame),options.outgoingTransform):null,gallery:motion.recipe==='motion.mosaic-pullback.v1'?gallery():[]},
          transformed(old,options.outgoingTransform),transformed(next,options.incomingTransform),motion,frame);
      }else if(contentRecipes.has(motion.recipe)){
        const g=world.getContext('2d');g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,width,height);
        const incomingTransform=options.incomingTransform||{},outgoingTransform=options.outgoingTransform||{};
        const source={...base,ctx:g,frame:incomingFrame};g.save();g.globalAlpha=incomingTransform.opacity??1;
        P.scenes.drawLayer(source,shot,incomingFrame,'background');P.scenes.drawLayer(source,shot,incomingFrame,'actor');g.restore();
        // Conjugate the outgoing clip transform through the incoming camera.
        // This preserves the content-only recipe and its exact original mask.
        const camera=P.motion.camera(shot.motions||[],incomingFrame),cs=camera.scale;
        const cx=camera.mode==='track'?P.clamp(width/2-camera.x*width*cs,width-width*cs,0):camera.x*width*(1-cs);
        const cy=camera.mode==='track'?P.clamp(height/2-camera.y*height*cs,height-height*cs,0):camera.y*height*(1-cs);
        const si=incomingTransform.scale??1,so=outgoingTransform.scale??1;
        const oldContent=createCanvas(width,height),og=oldContent.getContext('2d');
        og.globalAlpha=outgoingTransform.opacity??1;
        if(si!==0){og.translate(((outgoingTransform.x||0)-(incomingTransform.x||0)+(so-si)*(cx-width/2))/(si*cs),
          ((outgoingTransform.y||0)-(incomingTransform.y||0)+(so-si)*(cy-height/2))/(si*cs));og.scale(so/si,so/si);}
        og.drawImage(contentAt(previous,outgoingFrame,createCanvas(width,height)),0,0);
        const nextContent=transformed(contentAt(shot,incomingFrame,incoming),{opacity:incomingTransform.opacity??1});
        P.motion.transition({...source,stage:P.scenes.stageBounds(source,shot)},oldContent,nextContent,motion,frame);
        const target=createCanvas(width,height);composite(target.getContext('2d'),world,shot,incomingFrame,false);
        ctx.drawImage(transformed(target,{...incomingTransform,opacity:1}),0,0);
      }else if(motion.recipe==='motion.shatter-reveal.v1'){
        ctx.drawImage(transformed(next,options.incomingTransform),0,0);
        P.motion.shatter(e,transformed(old,options.outgoingTransform),motion,frame);
      }else throw new Error('Unknown independent transition '+motion.recipe);
      P.motion.effects(e,shot.motions||[],incomingFrame);return canvas;
    },drawCaption(cue,overrides={}){
      clear();P.text.overlays({...base,ctx},[{...cue,...overrides,startFrame:0,endFrame:1}],0);return canvas;
    },drawProgress(frame,progress){
      clear();if(resolved.progress)P.narrativeProgress.draw({...base,ctx,resolved:progress?{...resolved,progress}:resolved},frame);return canvas;
    },draw(seconds){
      const frame=Math.max(0,Math.min(resolved.durationFrames-1,Math.floor(seconds*project.fps+1e-6)));
      const index=resolved.shots.findIndex(s=>frame>=s.startFrame&&frame<s.endFrame);
      if(index<0)throw new Error('Timeline has no shot at frame '+frame);
      const shot=resolved.shots[index],full=(shot.motions||[]).find(m=>worldRecipes.has(m.recipe)&&frame>=m.startFrame&&frame<m.endFrame);
      ctx.setTransform(1,0,0,1,0,0);
      if(full){
        if(index===0)throw new Error('A world transition needs a previous shot');
        const target=plainWorld(shot,frame,incomingWorld);
        const isCard=full.recipe==='motion.scene-to-card.v1';
        P.motion.worldTransition({...base,ctx,handoff:handoffRecipes.has(full.recipe)?handoffContext(index,full,resolved.shots[index-1].endFrame-1,frame):null,outgoingPresenter:isCard?presenterAt(resolved.shots[index-1],resolved.shots[index-1].endFrame-1):null,gallery:full.recipe==='motion.mosaic-pullback.v1'?gallery():[]},snapshot(index-1,isCard),target,full,frame);
      }else{worldAt(shot,frame,world);composite(ctx,world,shot,frame);}
      const e={...base,ctx};
      for(const m of shot.motions||[]){
        if(m.recipe==='motion.shatter-reveal.v1'&&frame>=m.startFrame&&frame<m.endFrame){
          if(index===0)throw new Error('A reveal transition needs a previous shot');
          P.motion.shatter(e,snapshot(index-1),m,frame);
        }
      }
      P.motion.effects(e,shot.motions||[],frame);
      if(resolved.progress)P.narrativeProgress.draw(e,frame);
      P.text.overlays(e,resolved.cues,frame);
      return canvas;
    }};
  };
})(globalThis.PixelVideo=globalThis.PixelVideo||{});
