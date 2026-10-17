(function(P){
  'use strict';
  P.createRenderer=function({canvas,createCanvas,assets,resolved,mouth,style}){
    const project=resolved.project,width=project.width,height=project.height;
    canvas.width=width;canvas.height=height;
    const ctx=canvas.getContext('2d'),world=createCanvas(width,height),incoming=createCanvas(width,height),incomingWorld=createCanvas(width,height),plainScratch=createCanvas(width,height);
    const base={width,height,pixel:width/project.nativeWidth,colors:style.colors,style,
                assets,resolved,mouth,createCanvas,propCache:{},fps:project.fps,seed:project.seed??1};
    const history=new Map(),contentHistory=new Map(),worldHistory=new Map(),plateHistory=new Map(),plateGalleries=new Map();
    const contentRecipes=new Set(['motion.panel-slide.v1','motion.pixel-iris.v1']);
    const stageRecipes=new Set(['motion.stage-focus-punch.v1','motion.stage-mosaic-pullback.v1']);
    const worldRecipes=new Set(['motion.focus-punch.v1','motion.mosaic-pullback.v1']);
    const plateScratch=createCanvas(width,height);
    function plainWorld(shot,frame,target){
      const flat=plainScratch,g=flat.getContext('2d');g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,width,height);
      P.scenes.draw({...base,ctx:g},shot,frame);composite(target.getContext('2d'),flat,shot,frame);
      return target;
    }
    function gallery(){
      return resolved.shots.map((shot,index)=>{
        if(!worldHistory.has(index))worldHistory.set(index,plainWorld(shot,Math.min(shot.endFrame-1,shot.startFrame+Math.floor(shot.durationFrames*.72)),createCanvas(width,height)));
        return worldHistory.get(index);
      });
    }
    function contentAt(shot,frame,target){
      const g=target.getContext('2d');g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,width,height);
      P.scenes.drawLayer({...base,ctx:g},shot,frame,'content');return target;
    }
    function previousContent(index){
      if(!contentHistory.has(index)){
        const shot=resolved.shots[index],target=createCanvas(width,height);
        contentHistory.set(index,contentAt(shot,shot.endFrame-1,target));
      }
      return contentHistory.get(index);
    }
    function plateAt(shot,frame,s,target){
      const g=plateScratch.getContext('2d'),e={...base,ctx:g};
      g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,width,height);
      P.scenes.drawLayer(e,shot,frame,'background');P.scenes.drawLayer(e,shot,frame,'content');
      const crop=target.getContext('2d');crop.setTransform(1,0,0,1,0,0);crop.clearRect(0,0,s.width,s.height);
      crop.drawImage(plateScratch,s.x,s.y,s.width,s.height,0,0,s.width,s.height);return target;
    }
    function stageKey(s){return [s.x,s.y,s.width,s.height].join(':');}
    function previousPlate(index,s){
      const key=index+':'+stageKey(s);
      if(!plateHistory.has(key)){
        const shot=resolved.shots[index];plateHistory.set(key,plateAt(shot,shot.endFrame-1,s,createCanvas(s.width,s.height)));
      }
      return plateHistory.get(key);
    }
    function plateGallery(s){
      const key=stageKey(s);
      if(!plateGalleries.has(key))plateGalleries.set(key,resolved.shots.map(shot=>
        plateAt(shot,shot.startFrame+Math.floor(shot.durationFrames*.72),s,createCanvas(s.width,s.height))));
      return plateGalleries.get(key);
    }
    function worldAt(shot,frame,target){
      const g=target.getContext('2d');g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,width,height);
      const e={...base,ctx:g};
      const transition=(shot.motions||[]).find(m=>(contentRecipes.has(m.recipe)||stageRecipes.has(m.recipe))&&frame>=m.startFrame&&frame<m.endFrame);
      if(transition){
        const index=resolved.shots.findIndex(s=>s.id===shot.id);
        if(index<1)throw new Error('A content transition needs a previous shot');
        P.scenes.drawLayer(e,shot,frame,'background');P.scenes.drawLayer(e,shot,frame,'actor');
        const bounds=P.scenes.stageBounds(e,shot);
        if(stageRecipes.has(transition.recipe)){
          // Integer crop bounds make endpoint copies exact and keep the stage
          // independent from the presenter's fixed world coordinates.
          const s=Object.fromEntries(Object.entries(bounds).map(([k,v])=>[k,Math.round(v)]));
          const source=plateAt(shot,frame,s,createCanvas(s.width,s.height));
          const gallery=transition.recipe==='motion.stage-mosaic-pullback.v1'?plateGallery(s):[];
          P.motion.stageTransition({...e,stage:s,gallery},previousPlate(index-1,s),source,transition,frame);
        }else P.motion.transition({...e,stage:bounds},previousContent(index-1),contentAt(shot,frame,incoming),transition,frame);
      }else P.scenes.draw(e,shot,frame);
      return target;
    }
    function composite(g,source,shot,frame){
      const camera=P.motion.camera(shot.motions||[],frame);
      g.save();g.fillStyle=base.colors.background;g.fillRect(0,0,width,height);
      if(camera.mode==='track'){
        g.translate(P.clamp(width/2-camera.x*width*camera.scale,width-width*camera.scale,0),
                    P.clamp(height/2-camera.y*height*camera.scale,height-height*camera.scale,0));
        g.scale(camera.scale,camera.scale);
      }else{
        g.translate(camera.x*width,camera.y*height);g.scale(camera.scale,camera.scale);g.translate(-camera.x*width,-camera.y*height);
      }
      g.imageSmoothingEnabled=false;g.drawImage(source,0,0);g.restore();
    }
    function snapshot(index){
      if(history.has(index))return history.get(index);
      const shot=resolved.shots[index],frame=shot.endFrame-1,target=createCanvas(width,height),flat=createCanvas(width,height);
      worldAt(shot,frame,flat);composite(target.getContext('2d'),flat,shot,frame);history.set(index,target);return target;
    }
    return {draw(seconds){
      const frame=Math.max(0,Math.min(resolved.durationFrames-1,Math.floor(seconds*project.fps+1e-6)));
      const index=resolved.shots.findIndex(s=>frame>=s.startFrame&&frame<s.endFrame);
      if(index<0)throw new Error('Timeline has no shot at frame '+frame);
      const shot=resolved.shots[index],full=(shot.motions||[]).find(m=>worldRecipes.has(m.recipe)&&frame>=m.startFrame&&frame<m.endFrame);
      ctx.setTransform(1,0,0,1,0,0);
      if(full){
        if(index===0)throw new Error('A world transition needs a previous shot');
        const target=plainWorld(shot,frame,incomingWorld);
        P.motion.worldTransition({...base,ctx,gallery:full.recipe==='motion.mosaic-pullback.v1'?gallery():[]},snapshot(index-1),target,full,frame);
      }else{worldAt(shot,frame,world);composite(ctx,world,shot,frame);}
      const e={...base,ctx};
      for(const m of shot.motions||[]){
        if(m.recipe==='motion.shatter-reveal.v1'&&frame>=m.startFrame&&frame<m.endFrame){
          if(index===0)throw new Error('A reveal transition needs a previous shot');
          P.motion.shatter(e,snapshot(index-1),m,frame);
        }
      }
      P.motion.effects(e,shot.motions||[],frame);
      P.text.overlays(e,resolved.cues,frame);
      return canvas;
    }};
  };
})(globalThis.PixelVideo=globalThis.PixelVideo||{});
