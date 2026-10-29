(function(P){
  'use strict';
  function normalize(value={}){
    if(!value||typeof value!=='object'||Array.isArray(value)||'styleLayers' in value)throw Error('Select one visualStyle and optional features; styleLayers mixing is retired');
    const {visualStyle='mechanical',styleVariant='inset',features=[]}=value;
    if(!['plain','mechanical','energy'].includes(visualStyle))throw Error('visualStyle must be plain, mechanical OR energy');
    if(!Array.isArray(features)||features.length>1||features.some(x=>x!=='stack'))throw Error('features allows only optional stack');
    if(!['open','inset','relay'].includes(styleVariant))throw Error('styleVariant must be open, inset or relay');
    if(visualStyle==='plain'&&(features.length||styleVariant!=='inset'))throw Error('plain uses original simple components without styled variants or stack');
    return {visualStyle,styleVariant,features:[...features]};
  }
  function prepare(e,c,shot,f,t){
    const config=normalize(c),mechanical=config.visualStyle==='mechanical',at=id=>P.scenes.eventFrame(shot,id),fps=e.fps||60;
    const phase=id=>P.clamp((f-at(id))/(fps*.36));
    const ids=[c.showEvent,...(c.focusEvent?[c.focusEvent]:[]),...(c.data.startEvent?[c.data.startEvent,c.data.endEvent]:[]),...(c.data.items||[]).flatMap(i=>[i.event,...(i.endEvent?[i.endEvent]:[])])];
    const latest=ids.map(at).filter(v=>v<=f).sort((a,b)=>b-a)[0]??at(c.showEvent);
    const palette=mechanical?{edge:'#f0b35a',ink:'#f5e6c9',muted:'#c0ac89',panel:'#513927',inset:'#1d252a',metal:'#a36e35',rim:'#f8d498',deep:'#30261e',light:'#ffdda2',charge:'#f0b35a'}:
      {edge:'#9ed8c1',ink:'#e4e9d3',muted:'#a8bcb7',panel:'#28444b',inset:'#0d2631',metal:'#8f6c3c',rim:'#f2cd8c',deep:'#152a31',light:'#d6f3d6',charge:'#74c6c9'};
    return {...t,...palette,...config,mechanical,energy:config.visualStyle==='energy',stack:config.features.includes('stack'),phase,
      action:P.clamp((f-latest)/(fps*.36)),reveal:phase(c.showEvent),
    };
  }
  function entry(e,t){if(t.stack)e.ctx.translate(0,(1-P.ease(t.reveal))*40*t.unit);}
  P.componentStyles={normalize,prepare,entry};
})(globalThis.PixelVideo=globalThis.PixelVideo||{});
