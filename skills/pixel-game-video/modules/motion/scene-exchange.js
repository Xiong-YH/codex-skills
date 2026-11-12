(function(P) {
  'use strict';

  // The outgoing world is already on the destination. Exclude the matched
  // object from both worlds and draw that object once after this reveal.
  function reveal(destination, incoming, scratch, p, direction) {
    const {width, height} = scratch;
    if (p <= 0) return;
    if (p >= 1) {
      destination.drawImage(incoming,0,0,width,height);
      return;
    }
    const feather = width * .08125;
    const margin = feather + height * .125;
    const left = direction === 'left';
    const edge = left ? width + margin - (width + 2*margin)*p : -margin + (width + 2*margin)*p;
    const ctx = scratch.getContext('2d');
    ctx.save();
    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0,0,width,height);
    ctx.drawImage(incoming,0,0,width,height);
    const mask = ctx.createLinearGradient(edge-feather,height*.507,edge+feather,height*.456);
    mask.addColorStop(0,left?'transparent':'#000');
    mask.addColorStop(1,left?'#000':'transparent');
    ctx.globalCompositeOperation='destination-in';
    ctx.fillStyle=mask;
    ctx.fillRect(0,0,width,height);
    ctx.restore();
    destination.drawImage(scratch,0,0,width,height);
  }

  P.sceneExchange = { reveal };
})(globalThis.PixelVideo = globalThis.PixelVideo || {});
