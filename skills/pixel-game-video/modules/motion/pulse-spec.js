/* SPDX-License-Identifier: AGPL-3.0-only
 * Frametell-derived motion grammar. Copyright (c) 2026 Sitor AI.
 * See FRAMETELL-NOTICE.md. This is the shared source for runtime and HTML lab.
 */
(function(P){
  'use strict';
  const mix=(a,b,p)=>a+(b-a)*p;
  const curves={
    out:p=>1-Math.pow(1-p,3),
    inOut:p=>p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2,
    linear:p=>p,
    expo:p=>p>=1?1:1-Math.pow(2,-10*p),
    back:p=>1+2.5*Math.pow(p-1,3)+1.5*Math.pow(p-1,2),
    draw:p=>p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2,
  };
  const slam={peakAt:.55,peakProgress:1.08};
  curves.slam=p=>p<slam.peakAt?mix(0,slam.peakProgress,curves.out(p/slam.peakAt)):mix(slam.peakProgress,1,curves.inOut((p-slam.peakAt)/(1-slam.peakAt)));
  P.motionSpec=Object.freeze({version:1,curves:Object.freeze(curves),slam:Object.freeze(slam),pageProgress:p=>p*p*(3-2*p),
    curveText:Object.freeze({out:'1 − (1 − u)³',inOut:'前半 4u³；后半 1 − (−2u + 2)³ / 2',linear:'u',expo:'1 − 2^(−10u)，终点精确归一',back:'1 + 2.5(u−1)³ + 1.5(u−1)²',draw:'前半 2u²；后半 1 − (−2u + 2)² / 2',slam:'前55%冲到108%；后45%收回100%'}),
    presets:Object.freeze({
      push:Object.freeze({label:'推近',seconds:.28,scale:1.25,ease:'out'}),
      pan:Object.freeze({label:'平移',seconds:.30,ease:'out'}),
      slam:Object.freeze({label:'冲击',seconds:.374,scale:1.2,ease:'slam'}),
      shake:Object.freeze({label:'震动',seconds:.25,amplitude:10}),
      back:Object.freeze({label:'回全景',seconds:.50,scale:1,ease:'out'}),
    }),
    shake:Object.freeze({frequencyX:47,frequencyY:39}),
    page:Object.freeze({seconds:.6,exitPixels:36,enterPixels:24,blur:5,direction:'left'}),
  });
})(globalThis.PixelVideo=globalThis.PixelVideo||{});
