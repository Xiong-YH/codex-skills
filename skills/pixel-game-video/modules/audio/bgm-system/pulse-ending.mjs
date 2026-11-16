export function addPulseEnding(s, keys, pads, chord, start) {
  const keyboard = s.keys(chord, 1.65, { index: .36, decay: .87, release: .57 });
  keys.add(s.fade(keyboard, .24, .04), start, { gain: .18 });
  pads.add(s.pad(chord, 1.32, {
    attack: .32, release: .82, cutoff: 750, voices: 3, wave: 'tri',
  }), start, { gain: .37 });
}
