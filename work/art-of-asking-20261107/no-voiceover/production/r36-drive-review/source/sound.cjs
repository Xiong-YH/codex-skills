'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const garden = require(path.resolve(__dirname,
  '../../../../../../skills/pixel-game-video/modules/audio/vendor/garden-skills/scripts/lib/synth.mjs'));
const { SR, rim, pop, noise, expEnv, addInto, mul, bandpass, lowpass, impact, fade, whoosh, osc } = garden;

function patch(voice, seed) {
  switch (voice) {
    case 'title': return lowpass(impact({ size: .31, seed: seed + 31 }), 2050);
    case 'paper': {
      const rub = bandpass(noise(.114, seed + 71), 1120, .85);
      mul(rub, expEnv(rub.length, .027, .003));
      addInto(rub, rim({ tone: .82, decay: .024, seed }), 0, .72);
      return fade(rub, .002, .012);
    }
    case 'clip': return lowpass(rim({ tone: 1.28, decay: .021, seed }), 3150);
    case 'send': return lowpass(rim({ tone: 1.32, decay: .021, seed }), 2500);
    case 'receive': return lowpass(pop('G4', { decay: .029 }), 1450);
    case 'burst': return lowpass(impact({ size: .29, seed: seed + 61 }), 2760);
    case 'step': {
      const tone = 1.04 + (seed % 5) * .087;
      return lowpass(rim({ tone, decay: .01, seed }), 3220);
    }
    case 'lock': return lowpass(rim({ tone: .72, decay: .045, seed }), 2100);
    case 'zero': {
      const len = Math.round(.56 * SR);
      const fall = mul(osc(len, i => 68 + 85 * Math.exp(-i / (SR * .063))), expEnv(len, .143, .004));
      addInto(fall, mul(lowpass(noise(.56, seed + 191), 440), expEnv(len, .092, .005)), 0, .40);
      // A dry edge makes the reveal audible on small speakers as the low note dies away.
      addInto(fall, lowpass(rim({ tone: .68, decay: .026, seed }), 1190), 0, .25);
      return fade(fall, .005, .05);
    }
    case 'empty': {
      const air = lowpass(noise(.23, seed + 93), 760);
      mul(air, expEnv(air.length, .056, .006));
      addInto(air, lowpass(rim({ tone: .62, decay: .03, seed }), 1680), 0, .62);
      return fade(air, .002, .022);
    }
    default: throw new Error('Unknown sound ' + voice);
  }
}

function makeAudio(file, samples, cut) {
  const framesToSamples = frame => Math.round(frame * SR / cut.fps);
  const count = framesToSamples(cut.frames);
  assert.equal(samples.length, count * 8);
  const zero = framesToSamples(cut.sfx.find(item => item.id === 'invitations-zero').frame);
  const smooth = value => {
    const x = Math.max(0, Math.min(1, value));
    return x * x * (3 - 2 * x);
  };
  const left = new Float32Array(count), right = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const lead = (i - zero) / SR;
    const dip = lead > -.28 && lead < .025 ? smooth((lead + .28) / .16) * (1 - smooth((lead + .055) / .08)) : 0;
    const gain = 1 - .34 * dip;
    left[i] = samples.readFloatLE(i * 8) * gain;
    right[i] = samples.readFloatLE(i * 8 + 4) * gain;
  }

  for (const [index, event] of cut.sfx.entries()) {
    const at = framesToSamples(event.frame);
    if (event.voice === 'flip') {
      const duration = .158, peak = .44;
      const sound = whoosh(duration, { from: 520, to: 2140, peak, pan: .42, seed: 64 + index });
      addInto(left, sound.L, at - SR * duration * peak, event.level);
      addInto(right, sound.R, at - SR * duration * peak, event.level);
      continue;
    }
    const mono = patch(event.voice, 21 + index);
    const angle = (event.pan + 1) * Math.PI / 4;
    addInto(left, mono, at, event.level * Math.cos(angle));
    addInto(right, mono, at, event.level * Math.sin(angle));
  }

  let peak = 0;
  for (let i = 0; i < count; i++) peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
  assert.ok(peak < .98, 'Mix exceeds headroom: ' + peak);
  garden.writeWav(file, left, right, 24);
  return { rate: SR, samplePeakDbfs: Number((20 * Math.log10(peak)).toFixed(2)), revealLead: { seconds: .28, reduction: .34 } };
}

module.exports = { makeAudio };
