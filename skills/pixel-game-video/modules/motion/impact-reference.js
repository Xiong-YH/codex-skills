(function (root) {
  'use strict';

  // V3 impact timing expressed in 30 fps reference frames. The caller owns the event.
  function sampleImpact(elapsedSeconds, { strength = 1, duration = 11 / 30 } = {}) {
    if (!Number.isFinite(elapsedSeconds) || !Number.isFinite(strength) ||
        strength < 0 || strength > 1 || !Number.isFinite(duration) || duration <= 0) {
      throw new RangeError('Impact needs finite time, strength in [0, 1], and positive duration.');
    }
    if (strength === 0 || elapsedSeconds < 0 || elapsedSeconds >= duration) {
      return { scale: 1, x: 0, y: 0, flash: 0 };
    }

    const frame = 11 * elapsedSeconds / duration;
    let scale;
    if (frame < 3) scale = 1.62 - 0.43 * frame / 3;
    else if (frame < 7) scale = 1.19 - 0.065 * (frame - 3);
    else scale = 0.93 + 0.0175 * (frame - 7);

    function shake(at) {
      return at < 0 || at >= 11 ? 0 : Math.sin(at * 2.4) * (1 - at / 11);
    }

    return {
      scale: 1 + (scale - 1) * strength,
      x: 13 * shake(frame) * strength,
      y: 2 * shake(frame + 1) * strength,
      flash: 0.12 * Math.max(0, 1 - frame) * strength
    };
  }

  // The V3 screen layer has its own timing and stays independent of object strength.
  function sampleScreenImpact(elapsedSeconds) {
    const frame = elapsedSeconds * 30;
    const shake = frame >= 0 && frame <= 10
      ? Math.sin(frame * 2.4) * (1 - frame / 11)
      : 0;
    return {
      backgroundX: 5 * shake,
      backgroundY: 3 * shake,
      backgroundScale: 1.012,
      flash: frame >= 0 && frame < 1 ? 0.12 : 0,
      flashColor: '#fff3d5'
    };
  }

  const api = { sampleImpact, sampleScreenImpact };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.PixelVideo ||= {}).impactReference = api;
})(globalThis);
