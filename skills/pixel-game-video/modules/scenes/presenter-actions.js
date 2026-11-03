(function(P){
  'use strict';
  // Event-keyed pose animation. Source pixels stay intact; feet anchor each pose.
  // No perpetual bobbing, facial warping or claim of phoneme alignment.
  P.presenterActions={draw(e,shot,frame){
    const active=shot.performance.find(p=>frame>=p.startFrame&&frame<p.endFrame);
    const pose=active?.pose||'neutral',layout=e.resolved.actorPoseLayout[shot.actor][pose];
    const image=e.assets[`${shot.actor}:pose:${pose}`];
    if(!image)throw Error(`Missing presenter pose ${shot.actor}.${pose}`);
    const placement=e.style.presenter||{},h=e.height*(placement.height??.4);
    const [left,top,right,bottom]=layout.bounds,scale=h/(layout.referenceHeight||bottom-top);
    const x=e.width*(placement.x??.2),y=e.height*(placement.baseline??.75);
    const g=e.ctx;g.save();g.imageSmoothingEnabled=false;
    g.drawImage(image,left,top,right-left,bottom-top,x+(left-layout.footX)*scale,y+(top-layout.footY)*scale,(right-left)*scale,(bottom-top)*scale);
    g.restore();
  }};
})(globalThis.PixelVideo=globalThis.PixelVideo||{});
