'use strict';

// Keyframes use a fixed text anchor. The renderer samples motion/impact-reference
// at the landing event for rebound, background shake, and the flash color.
function depthSlamCaption(landingFrame, { fps = 24 } = {}) {
  if (!Number.isInteger(fps) || fps < 24 || !Number.isInteger(landingFrame)) {
    throw new RangeError('Expected an integer landing frame and at least 24 fps.');
  }
  if (landingFrame < 2) throw new RangeError('Leave time for a hidden frame before landing.');
  const start = landingFrame / fps;

  return {
    keyframes: [
      { at: 0, opacity: 0 },
      { at: (landingFrame - 1) / fps, opacity: 0, scale: 1.4 },
      { at: start, opacity: 1 },
      { at: start + 2 / 30, scale: 1 },
    ],
    impact: {
      start,
      strength: 1,
      duration: 5 / 30,
      screen: true,
      flash: { duration: 2 / 30, opacity: .50 },
    },
  };
}

module.exports = { depthSlamCaption };
