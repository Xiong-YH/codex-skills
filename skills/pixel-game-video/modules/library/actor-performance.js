(function(P){
  'use strict';
  // A layout proxy for existing narrative paths, without skeletal or mouth animation.
  P.library.perform=function(e,id,x,baseline,height,options={}){
    return P.library.reference(e,id,x,baseline,height,{
      facing:options.facing||1,tilt:options.think?-.035:0
    });
  };
})(globalThis.PixelVideo=globalThis.PixelVideo||{});
