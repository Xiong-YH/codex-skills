/* SPDX-License-Identifier: AGPL-3.0-only
 * Adapted from Frametell, Copyright (c) 2026 Sitor AI.
 * Source/version, changes and license: FRAMETELL-NOTICE.md.
 * Port: normalized scene coordinates, integer-frame events, Canvas/workbench.
 */
(function(P){
  'use strict';
  const clamp=P.clamp,mix=(a,b,p)=>a+(b-a)*p;
  if(!P.motionSpec)throw new Error('Load motion/pulse-spec.js before pulse.js');
  const spec=P.motionSpec,curves=spec.curves;
  const defaults=Object.fromEntries(Object.entries(spec.presets).map(([key,value])=>[key,value.seconds]));
  P.motion.pulseDefaults=Object.freeze(defaults);
  P.motion.easeAt=(name,p)=>{if(!curves[name])throw new Error('Unknown motion easing '+name);return curves[name](clamp(p));};
  P.motion.validatePulse=function(m){
    const r=m.recipe,a=m.params||{},rules={
      'motion.camera-pulse.v1':{x:[0,1],y:[0,1],scale:[1,1.75],kind:['push','pan','slam','back'],ease:Object.keys(curves),bounds:['cover','free']},
      'motion.camera-path.v1':{keys:'keys',bounds:['cover','free']},
      'motion.camera-shake.v1':{amplitude:[0,40]},
      'motion.page-turn.v1':{direction:['left','right'],blur:[0,12],exitPixels:[0,120],enterPixels:[0,120]},
      'motion.layer-move.v1':{layer:['background','actor','content'],ease:Object.keys(curves)},
    };
    if(!rules[r])return;
    if(!Number.isInteger(m.startFrame)||!Number.isInteger(m.endFrame)||m.endFrame<=m.startFrame)throw new Error('Motion window requires ordered integer frames');
    if(r==='motion.layer-move.v1'){
      for(const [k,limits] of Object.entries({x:[-1,1],y:[-1,1],scale:[.05,4],rotation:[-360,360],opacity:[0,1]}))for(const suffix of ['From','To'])rules[r][k+suffix]=limits;
      if(!a.layer)throw new Error('layer-move requires layer');
    }
    const check=(value,range,label)=>{if(typeof range[0]==='number'){if(typeof value!=='number'||!Number.isFinite(value)||value<range[0]||value>range[1])throw new Error('Invalid '+label);}else if(!range.includes(value))throw new Error('Invalid '+label);};
    for(const [key,value]of Object.entries(a)){const range=rules[r][key];if(!range)throw new Error(r+': unsupported parameter '+key);if(range!=='keys')check(value,range,key);}
    if(r==='motion.camera-pulse.v1'&&a.kind==='back'&&['x','y','scale'].some(k=>k in a))throw new Error('back always returns to center at scale 1');
    if(r==='motion.camera-path.v1'){
      if(!Array.isArray(a.keys)||!a.keys.length||a.keys.length>64)throw new Error('camera-path requires 1–64 keys');let end=0;
      for(const key of a.keys){
        if(!key||typeof key!=='object'||Object.keys(key).some(k=>!['atFrame','durationFrames','x','y','scale','ease'].includes(k)))throw new Error('Invalid camera-path key');
        if(!Number.isInteger(key.atFrame)||key.atFrame<end||!Number.isInteger(key.durationFrames)||key.durationFrames<1)throw new Error('camera-path windows must be ordered integer frames');
        for(const name of ['x','y','scale','ease'])if(name in key)check(key[name],name==='ease'?Object.keys(curves):name==='scale'?[1,1.75]:[0,1],name);
        end=key.atFrame+key.durationFrames;
      }if(end>m.endFrame-m.startFrame)throw new Error('camera-path exceeds motion window');
    }
  };
  const previousCamera=P.motion.camera;
  P.motion.camera=function(motions,frame){
    const keys=motions.filter(m=>['motion.camera-pulse.v1','motion.camera-path.v1'].includes(m.recipe)).sort((a,b)=>a.startFrame-b.startFrame);
    let state=keys.length?{mode:'center',scale:1,x:.5,y:.5,bounds:'cover'}:previousCamera(motions,frame);
    for(const m of keys){
      if(frame<m.startFrame)break;
      const a=m.params||{},before={...state};state.bounds=a.bounds||'cover';
      if(m.recipe==='motion.camera-path.v1'){
        for(const key of a.keys){
          const at=m.startFrame+key.atFrame;if(frame<at)break;
          const p=P.motion.easeAt(key.ease||'inOut',P.progress(frame,at,at+key.durationFrames));
          state={...state,x:mix(state.x,key.x??.5,p),y:mix(state.y,key.y??.5,p),scale:mix(state.scale,key.scale??1,p)};
        }
      }else{
        const kind=a.kind||'push',preset=spec.presets[kind],p=P.motion.easeAt(a.ease||preset.ease,P.progress(frame,m.startFrame,m.endFrame));
        const x=kind==='back'?.5:(a.x??.5),y=kind==='back'?.5:(a.y??.5);
        const scale=kind==='back'?1:(a.scale??(kind==='pan'?before.scale:preset.scale));
        state={...state,x:mix(before.x,x,p),y:mix(before.y,y,p),scale:mix(before.scale,scale,p)};
      }
    }
    let shakeX=0,shakeY=0;
    for(const m of motions){if(m.recipe!=='motion.camera-shake.v1'||frame<m.startFrame||frame>=m.endFrame)continue;
      const p=P.progress(frame,m.startFrame,m.endFrame),amp=(m.params.amplitude??spec.presets.shake.amplitude)*(1-p);
      shakeX+=amp*Math.sin(p*spec.shake.frequencyX);shakeY+=amp*Math.cos(p*spec.shake.frequencyY);
    }
    return {...state,shakeX,shakeY};
  };
  P.motion.layerTransform=function(motions,layer,frame){
    let result={x:0,y:0,scale:1,rotation:0,opacity:1};
    for(const m of motions.filter(m=>m.recipe==='motion.layer-move.v1'&&m.params.layer===layer).sort((a,b)=>a.startFrame-b.startFrame)){
      if(frame<m.startFrame)break;const a=m.params,p=P.motion.easeAt(a.ease||'out',P.progress(frame,m.startFrame,m.endFrame));
      for(const key of ['x','y','scale','rotation','opacity'])result[key]=mix(a[key+'From']??result[key],a[key+'To']??result[key],p);
    }return result;
  };
  // Layer motion belongs to world content; captions/progress stay in screen coordinates.
  const draw=P.scenes.draw,drawLayer=P.scenes.drawLayer;
  P.scenes.drawLayer=function(e,shot,frame,layer){
    if(!(shot.motions||[]).some(m=>m.recipe==='motion.layer-move.v1'&&m.params.layer===layer))return drawLayer(e,shot,frame,layer);
    const tr=P.motion.layerTransform(shot.motions,layer,frame),g=e.ctx;
    g.save();g.globalAlpha*=clamp(tr.opacity);g.translate(e.width*(.5+tr.x),e.height*(.5+tr.y));g.rotate(tr.rotation*Math.PI/180);g.scale(tr.scale,tr.scale);g.translate(-e.width/2,-e.height/2);
    drawLayer(e,shot,frame,layer);g.restore();
  };
  P.scenes.draw=function(e,shot,frame){
    if(!(shot.motions||[]).some(m=>m.recipe==='motion.layer-move.v1'))return draw(e,shot,frame);
    for(const layer of ['background','actor','content'])P.scenes.drawLayer(e,shot,frame,layer);
  };
  const worldTransition=P.motion.worldTransition;
  P.motion.worldTransition=function(e,old,next,m,frame){
    if(m.recipe!=='motion.page-turn.v1')return worldTransition(e,old,next,m,frame);
    const p=P.progress(frame,m.startFrame,m.endFrame),q=spec.pageProgress(p),g=e.ctx,w=e.width,h=e.height,a=m.params||{};
    g.save();
    if(p<=0)g.drawImage(old,0,0,w,h);
    else if(p>=1)g.drawImage(next,0,0,w,h);
    else{
      const sign=a.direction==='right'?-1:1;
      g.fillStyle=e.colors.background;g.fillRect(0,0,w,h);
      // Premultiplied overlap over a stable ground; no empty-paper gap.
      g.save();g.globalAlpha=1-q;g.filter=`blur(${(a.blur??spec.page.blur)*q}px)`;g.translate(-sign*(a.exitPixels??spec.page.exitPixels)*q,0);g.drawImage(old,0,0,w,h);g.restore();
      g.save();g.globalAlpha=q;g.translate(sign*(a.enterPixels??spec.page.enterPixels)*(1-q),0);g.drawImage(next,0,0,w,h);g.restore();
    }g.restore();
  };
})(globalThis.PixelVideo=globalThis.PixelVideo||{});
