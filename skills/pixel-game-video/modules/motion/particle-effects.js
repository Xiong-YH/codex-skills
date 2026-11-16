(function (P) {
  'use strict';

  function sample(seed, x, y) {
    const value = Math.sin(seed * 17.713 + x * .127 + y * .319) * 43758.5453;
    return value - Math.floor(value);
  }

  // Each source block owns one cell in the final shape, including at the landing frame.
  function gather(ctx, { cells, size, spread, seed = 1 }, progress) {
    const p = P.clamp(progress);
    ctx.save();
    try {
      for (const [x, y, color] of cells) {
        const angle = sample(seed, x, y) * Math.PI * 2;
        const distance = spread * (.55 + .45 * sample(seed + 1, x, y));
        const delay = .2 * sample(seed + 2, x, y);
        const remaining = 1 - P.ease((p - delay) / (1 - delay));
        const px = x + Math.round(Math.cos(angle) * distance * remaining);
        const py = y + Math.round(Math.sin(angle) * distance * remaining);
        ctx.fillStyle = color;
        ctx.fillRect(px, py, size, size);
      }
    } finally {
      ctx.restore();
    }
  }

  // World-space ground contact. Dust spreads along the surface and stays above it.
  function dust(ctx, { x, groundY, reach, size, color, seed = 1 }, progress) {
    if (progress < 0 || progress >= 1) return;
    const opacity = ctx.globalAlpha;
    ctx.save();
    try {
      ctx.fillStyle = color;
      for (const side of [-1, 1]) {
        for (let index = 0; index < 7; index++) {
          const delay = (index % 4) * .047;
          if (progress < delay) continue;
          const p = P.clamp((progress - delay) / (1 - delay));
          const speed = .45 + .55 * sample(seed, side, index);
          const block = size * (.55 + .65 * sample(seed + 1, side, index));
          const offset = (size + reach * speed * P.ease(p)) * side;
          const lift = Math.sin(Math.PI * p) * size * (1 + 3 * speed);
          ctx.globalAlpha = opacity * (.48 + .34 * speed) * (1 - p) ** 1.5;
          ctx.fillRect(Math.round(x + offset - block / 2),
            Math.floor(groundY - lift - block), block, block);
        }
      }
    } finally {
      ctx.restore();
    }
  }

  P.particleEffects = { gather, dust };
})(globalThis.PixelVideo = globalThis.PixelVideo || {});
