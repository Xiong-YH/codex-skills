export const BPM = 120;
export const BARS = 8;
export const LOOP_SECONDS = BARS * 4 * 60 / BPM;
export const DUR = LOOP_SECONDS * 3;

export const presets = {
  warm: { title: '暖光', purpose: '情境建立和阅读', kick: .45, snare: .28, bass: .49, keys: .67, bright: .34, reverb: .21 },
  pulse: { title: '步进', purpose: '组件推进和清楚的重拍', kick: .82, snare: .45, bass: .66, keys: .51, bright: .60, reverb: .09 },
  calm: { title: '归位', purpose: '结果比较和片尾', kick: .37, snare: .19, bass: .43, keys: .57, bright: .28, reverb: .25 },
};

export const harmony = [
  ['F2', ['Ab3','C4','Eb4','G4'], ['C5','Eb5','G5']],
  ['F2', ['Ab3','C4','Eb4','F4'], ['Ab4','C5','F5']],
  ['Db2', ['F3','Ab3','C4','Eb4'], ['C5','F5','Eb5']],
  ['Eb2', ['G3','Bb3','C4','F4'], ['Bb4','Eb5','F5']],
  ['Ab1', ['G3','Bb3','C4','Eb4'], ['C5','Eb5','Ab5']],
  ['C2', ['G3','Bb3','C4','Eb4'], ['G4','C5','Eb5']],
  ['Db2', ['F3','Ab3','C4','F4'], ['Ab4','C5','F5']],
  ['C2', ['G3','Bb3','Db4','E4'], ['Bb4','Db5','E5']],
];

export default function score(session) {
  const name = process.env.PIXEL_BGM_PRESET || 'pulse';
  if (!Object.hasOwn(presets, name)) throw new Error('Unknown BGM preset ' + name);
  const config = presets[name];
  session.tempo(BPM);
  const drums = session.bus('drums', { gain:.82 });
  const bass = session.bus('bass', { gain:.66, duck:.23 });
  const keys = session.bus('keys', { gain:.7, highpass:145, reverb:config.reverb, duck:.15 });
  const kick = session.kick({ tone:48, decay:.18, click:.48 });
  const snare = session.snare({ decay:.08, snappy:.6 });
  const rim = session.rim({ tone:.71, decay:.028 });
  const hat = session.hat({ tone:.65, decay:.036 });

  for (let bar=0; bar<BARS*3; bar++) {
    const cycle = bar % BARS;
    const [root,chord,motif] = harmony[cycle];
    const start = session.bar(bar);
    const phraseStart = cycle === 0 || cycle === 4;
    keys.add(session.keys(chord,name === 'calm' ? 1.27 : .72,{ index:1.3, decay:.52 }),
      start,{ gain:config.keys*(phraseStart ? .96 : .78) });
    if (name !== 'calm') {
      keys.add(session.keys(chord,.25,{ index:1.8, decay:.39 }),start+session.beat(2.52),
        { gain:config.keys*.39, pan:.16 });
    }
    for (let beat=0; beat<4; beat++) {
      const at = start + session.beat(beat);
      if (beat === 0 || (beat === 2 && name !== 'calm')) {
        const weight = beat === 0 ? (phraseStart ? 1 : .86) : .64;
        drums.add(kick,at,{gain:config.kick*weight});
        session.duck(at,weight*.72);
      }
      if (beat % 2) {
        drums.add(name === 'pulse' ? snare : rim,at,{gain:config.snare});
      }
      if (name === 'pulse' || beat < 3) {
        drums.add(hat,at+session.beat(.52),{gain:name === 'pulse' ? .24 : .14,pan:beat%2 ? .23 : -.18});
      }
      if (beat === 0 || (beat > 1 && name !== 'calm' && cycle !== 7)) {
        bass.add(session.bass(root,beat === 0 ? .37 : .2,{
          wave:'triangle', cutoff:name === 'pulse' ? 810 : 540, sub:.28, drive:.16,
        }),at+session.beat(beat === 0 ? 0 : .29),{gain:config.bass*(beat === 0 ? .95 : .62)});
      }
    }
    if (name !== 'calm' || cycle % 2 === 0) {
      const offsets = name === 'pulse' ? [.24,.77,1.47] : [.33,.89,1.44];
      motif.forEach((note,i) => {
        keys.add(session.pluck(note,.32,{ bright:config.bright, seed:19+cycle*3+i }),
          start+offsets[i],{gain:config.keys*(i===0 ? .59 : .42),pan:i===1 ? -.26 : .16});
      });
    }
  }
}
