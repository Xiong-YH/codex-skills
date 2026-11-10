import {readFileSync} from 'node:fs';
import * as synth from './vendor/garden-skills/scripts/lib/synth.mjs';

const timed = voice => ({duration, ...options}) => voice(duration, options);
const pitched = voice => ({note, duration, ...options}) => voice(note, duration, options);
const chord = voice => ({notes, duration, ...options}) => voice(notes, duration, options);

// Only call known sound generators. Project inputs describe parameters, never JS.
const voices = {
  kick: synth.kick,
  snare: synth.snare,
  clap: synth.clap,
  hat: synth.hat,
  crash: ({duration, ...options}) => synth.crash({dur: duration, ...options}),
  tom: ({note, ...options}) => synth.tom(note, options),
  shaker: synth.shaker,
  rim: synth.rim,
  cowbell: synth.cowbell,
  bass: pitched(synth.bass),
  sub: pitched(synth.sub),
  pad: chord(synth.pad),
  pluck: pitched(synth.pluck),
  keys: chord(synth.keys),
  bell: pitched(synth.bell),
  lead: pitched(synth.lead),
  mallet: pitched(synth.mallet),
  organ: chord(synth.organ),
  vox: chord(synth.vox),
  riser: timed(synth.riser),
  downlifter: timed(synth.downlifter),
  whoosh: timed(synth.whoosh),
  impact: synth.impact,
  boom: synth.boom,
  reverseCymbal: timed(synth.reverseCymbal),
  click: synth.click,
  tick: synth.tick,
  pop: ({note, decay}) => synth.pop(note, {decay}),
  blip: ({note, duration}) => synth.blip(note, duration),
  swipe: timed(synth.swipe),
  glitch: timed(synth.glitch),
  shimmer: ({duration, note, ...options}) => synth.fade(synth.shimmer(duration, {root: note, ...options}), 0, .02),
  ambience: timed(synth.ambience),
};

function render({voice, params}) {
  if (!Object.hasOwn(voices, voice)) throw new Error(`Unknown SFX voice: ${voice}`);
  const signal = voices[voice](params);
  const {L, R} = signal instanceof Float32Array ? {L: signal, R: signal} : signal;
  if (!L.length || L.length !== R.length || L.length > 12 * synth.SR) throw new Error(`Invalid SFX length: ${voice}`);
  let peak = 0;
  for (let i = 0; i < L.length; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  if (!Number.isFinite(peak)) throw new Error(`Invalid SFX signal: ${voice}`);
  const target = voice === 'ambience' ? .65 * params.amount : .65;
  const gain = peak ? target / peak : 1;
  const pcm = Buffer.allocUnsafe(L.length * 8);
  for (let i = 0; i < L.length; i++) {
    pcm.writeFloatLE(L[i] * gain, i * 8);
    pcm.writeFloatLE(R[i] * gain, i * 8 + 4);
  }
  return pcm.toString('base64');
}

const batch = JSON.parse(readFileSync(0, 'utf8'));
if (!Array.isArray(batch) || batch.length > 16) throw new Error('Expected a batch of up to 16 compiled SFX recipes');
process.stdout.write(JSON.stringify(batch.map(render)));
