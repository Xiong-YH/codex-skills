(function(P){
  'use strict';
  P.createRenderer=function({canvas,createCanvas,assets,resolved,mouth,style}){
    const project=resolved.project,width=project.width,height=project.height;
    canvas.width=width;canvas.height=height;
    const ctx=canvas.getContext('2d'),world=createCanvas(width,height),worldCtx=world.getContext('2d');
    const base={width,height,pixel:width/project.nativeWidth,colors:style.colors,style,
                assets,resolved,mouth,createCanvas,propCache:{},fps:project.fps,seed:project.seed??1};
    const history=new Map();
    function worldAt(shot,frame,target){
      const g=target.getContext('2d');g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,width,height);
      P.scenes.draw({...base,ctx:g},shot,frame);
      return target;
    }
    function composite(g,source,shot,frame){
      const camera=P.motion.camera(shot.motions||[],frame);
      g.save();g.fillStyle=base.colors.background;g.fillRect(0,0,width,height);
      g.translate(camera.x*width,camera.y*height);g.scale(camera.scale,camera.scale);g.translate(-camera.x*width,-camera.y*height);
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
      const shot=resolved.shots[index];worldAt(shot,frame,world);ctx.setTransform(1,0,0,1,0,0);composite(ctx,world,shot,frame);
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
