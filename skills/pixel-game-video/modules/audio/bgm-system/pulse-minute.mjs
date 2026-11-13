import { BPM, harmony, presets } from './score.mjs';

export const BARS = 30;
export const DUR = BARS * 4 * 60 / BPM;
export const sections = [
  { id: 'intro', bar: 0, label: '动机入场' },
  { id: 'groove', bar: 4, label: '鼓组推进' },
  { id: 'lift', bar: 10, label: '切分加速' },
  { id: 'break', bar: 14, label: '撤鼓留白' },
  { id: 'drop', bar: 18, label: '全乐队回归' },
  { id: 'outro', bar: 26, label: '回落收尾' },
];

const bridge = [
  ['Db2', ['Ab3', 'C4', 'Db4', 'F4'], ['F5', 'C5', 'Ab4']],
  ['Eb2', ['G3', 'Bb3', 'D4', 'F4'], ['Bb4', 'D5', 'F5']],
  ['F2', ['Ab3', 'C4', 'Eb4', 'G4'], ['C5', 'Eb5', 'G5']],
  ['C2', ['G3', 'Bb3', 'Db4', 'E4'], ['E5', 'Db5', 'C5']],
];
const ending = [harmony[4], bridge[0], bridge[3], ['F2', ['Ab3', 'C4', 'F4', 'G4'], ['G5', 'Eb5', 'C5']]];

export default function score(s) {
  const pulse = presets.pulse;
  s.tempo(BPM);
  const drums = s.bus('drums', { gain: .83 });
  const bass = s.bus('bass', { gain: .68, duck: .28 });
  const keys = s.bus('keys', { gain: .69, highpass: 125, reverb: .11, duck: .18 });
  const air = s.bus('air', { gain: .40, highpass: 180, reverb: .23, duck: .18 });
  const kick = s.kick({ tone: 48, decay: .18, click: .48 });
  const snare = s.snare({ decay: .08, snappy: .60 });
  const rim = s.rim({ tone: .71, decay: .028 });
  const hat = s.hat({ tone: .65, decay: .036 });
  const clap = s.clap({ decay: .17, seed: 27 });
  const shaker = s.shaker({ decay: .095, attack: .004, seed: 16 });

  for (let bar = 0; bar < BARS; bar++) {
    const part = sections.findLast(section => bar >= section.bar).id;
    const base = s.bar(bar);
    const at = beat => base + s.beat(beat);
    const dense = part === 'lift' || part === 'drop';
    const bare = part === 'break';
    const last = bar === BARS - 1;
    const pickup = bar === 3 || bar === 9 || bar === 13 || bar === 17 || bar === 25;
    const [root, chord, motif] = part === 'outro' ? ending[bar - 26] :
      part === 'lift' || bare ? bridge[(bar - 10) % 4] :
      harmony[part === 'drop' ? bar - 18 : bar % 8];

    const chordLength = last ? 1.24 : bare ? 1.23 : .72;
    keys.add(s.keys(chord, chordLength, { index: bare ? .79 : 1.3, decay: bare || last ? .82 : .52 }),
      base, { gain: pulse.keys * (bare ? .82 : .96) });
    if (!bare && !last && part !== 'intro') {
      keys.add(s.keys(chord, .23, { index: 1.8, decay: .39 }), at(2.52), { gain: .22, pan: .16 });
    }
    if (bar === 6 || bar === 18 || bar === 22 || bare) {
      air.add(s.pad(chord, bare ? 1.06 : 1.45, { attack: .14, release: .55, cutoff: bare ? 830 : 1490, voices: 3 }),
        base, { gain: bare ? .31 : .35 });
    }

    const kicks = last ? [] : bare ? (bar === 14 ? [] : [0]) :
      part === 'intro' ? (bar < 2 ? [0] : [0, 2]) :
      part === 'outro' ? [0] : bar === 7 ? [0, 2.5] :
      dense ? [0, 1.5, 2, 2.75] : [0, 2];
    for (const beat of kicks) {
      const weight = beat === 0 ? 1 : beat === 2 ? .73 : .56;
      drums.add(kick, at(beat), { gain: pulse.kick * weight * (bare ? .52 : 1) });
      s.duck(at(beat), weight * .72);
    }
    if (!last) {
      const backbeat = bare ? (bar < 17 ? [2] : []) : bar === 0 ? [] :
        bar < 4 || part === 'outro' ? [3] : pickup ? [1] : [1, 3];
      for (const beat of backbeat) {
        drums.add(bare || bar < 4 || part === 'outro' ? rim : snare, at(beat), { gain: bare ? .23 : pulse.snare });
        if (part === 'drop') drums.add(clap, at(beat), { gain: .29, pan: .12 });
      }
    }

    if (!bare && !last) {
      const hats = part === 'intro' || part === 'outro' ? [1.52, 3.52] :
        dense ? [.52, 1.02, 1.52, 2.02, 2.52, 3.02, 3.52, 3.78] : [.52, 1.52, 2.52, 3.52];
      for (const [index, beat] of hats.entries()) {
        if (pickup && beat > 3) continue;
        drums.add(hat, at(beat), { gain: (dense ? .25 : .22) * (index % 2 ? .78 : 1), pan: index % 2 ? .25 : -.23 });
      }
      if (dense) for (const beat of [.76, 1.76, 2.76]) drums.add(shaker, at(beat), { gain: .20, pan: -.28 });
    }

    const bassBeats = last ? [0] : bare ? (bar === 14 ? [] : [0]) :
      part === 'intro' || part === 'outro' ? [0, 2.29] :
      dense ? [0, .78, 1.52, 2.28, 3.04] : [0, 2.29, 3.29];
    for (const beat of bassBeats) {
      if (pickup && beat >= 3) continue;
      const duration = last ? .60 : bare ? .48 : beat === 0 ? .37 : .17;
      bass.add(s.bass(root, duration, {
        wave: 'triangle', cutoff: dense ? 1210 : bare ? 420 : 810, sub: dense ? .39 : .28, drive: .16,
      }), at(beat), { gain: pulse.bass * (bare ? .63 : beat === 0 ? .95 : .68) });
    }

    const answers = bare ? (bar === 17 ? [1.5, 2.5] : [1.5]) :
      last ? [1, 2, 2.75] : dense ? [.48, 1.27, 2.77] : [.48, 1.54, 2.94];
    answers.forEach((beat, index) => {
      const note = motif[index];
      keys.add(s.pluck(note, last ? .30 : .32, { bright: bare ? .33 : pulse.bright, seed: 19 + bar * 3 + index }),
        at(beat), { gain: pulse.keys * (index === 0 ? .59 : .42), pan: index === 1 ? -.26 : .16 });
      if (part === 'drop' && index !== 0) {
        air.add(s.pluck(s.midi(note) + 12, .20, { bright: .71, seed: 71 + bar + index }),
          at(beat + .24), { gain: .21, pan: index === 1 ? .33 : -.34 });
      }
    });
    if (pickup && bar !== 13) {
      const fill = bar === 17 ? [2.75, 3, 3.25, 3.5] : [3, 3.5, 3.75];
      fill.forEach((beat, index) => drums.add(index < fill.length - 1 ? snare : s.tom('C3', { decay: .18 }),
        at(beat), { gain: .16 + index * .072, pan: (index - 1) * .12 }));
    }
  }
  air.add(s.reverseCymbal(.75, { seed: 37 }), s.bar(18) - 1, { gain: .33 });
  drums.add(s.crash({ dur: 1.45, seed: 43 }), s.bar(18), { gain: .25 });
  keys.add(s.bell('F5', .85, { ratio: 2, index: 1.2, decay: .32 }), s.bar(29) + .25, { gain: .27 });
}
