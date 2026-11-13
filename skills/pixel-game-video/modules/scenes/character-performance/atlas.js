(function(P) {
  'use strict';
  const tracks = new WeakMap();

  function draw(e, atlas, frame) {
    let track = tracks.get(atlas);
    if (!track) {
      const keys = atlas.poses.map((pose, index) => ({id: String(index), pose, time: pose.frame / e.fps}));
      track = P.characterPerformance.compile({
        fps: e.fps,
        duration: e.resolved.durationSeconds,
        events: [{id: 'start', time: 0}, ...keys.map(({id, time}) => ({id, time}))],
        poses: [{at: 'start', pose: '0'}, ...keys.filter(({time}) => time > 0).map(({id}) => ({at: id, pose: id}))],
        assets: Object.fromEntries(keys.map(({id, pose}) => [id, pose])),
      });
      tracks.set(atlas, track);
    }
    const {sourceRect: rect, offset} = P.characterPerformance.sample(track, frame).asset;
    const image = e.assets[atlas.assetKey];
    if (!image) throw new Error('Missing character pose atlas ' + atlas.file);
    const g = e.ctx, h = atlas.height * e.height, scale = h / rect[3], w = rect[2] * scale;
    const x = atlas.x * e.width - w / 2 + offset[0] * scale;
    const y = atlas.y * e.height - h + offset[1] * scale;
    g.save();
    g.imageSmoothingEnabled = false;
    if (e.whitebox) g.filter = 'grayscale(1)';
    g.drawImage(image, ...rect, Math.round(x), Math.round(y), w, h);
    g.restore();
  }
  P.poseAtlas = { draw };
})(globalThis.PixelVideo = globalThis.PixelVideo || {});
