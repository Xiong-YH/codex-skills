// Short, dry Foley-inspired cues and a quiet interface family. No sampled media.
import {SR, addInto, expEnv, fade, highpass, hz, lowpass, mul, noise, osc} from './vendor/garden-skills/scripts/lib/synth.mjs';

const count = seconds => Math.round(seconds * SR);

function grain(seconds, seed, lo, hi, decay, attack = .0015) {
  const band = highpass(lowpass(noise(seconds, seed), hi), lo);
  return fade(mul(band, expEnv(band.length, decay, attack)), .0005, .008);
}

function body(seconds, modes) {
  const out = new Float32Array(count(seconds));
  for (const [frequency, gain, decay] of modes) {
    addInto(out, mul(osc(out.length, frequency), expEnv(out.length, decay, .0018)), 0, gain);
  }
  return fade(out, .0005, .012);
}

export function paperSlide({seed}) {
  const out = new Float32Array(count(.23));
  // Irregular rubs of the paper edge and fingers rather than a pitched sweep.
  addInto(out, grain(.092, seed, 700, 3900, .032, .012), 0, .64);
  addInto(out, grain(.142, seed + 1, 420, 2750, .065, .022), count(.037), .88);
  addInto(out, grain(.056, seed + 2, 930, 3450, .02, .007), count(.149), .43);
  return out;
}

export function paperSeat({seed}) {
  const out = grain(.115, seed, 720, 4300, .009);
  addInto(out, body(.10, [[488, .24, .016], [1120, .14, .011]]));
  addInto(out, grain(.067, seed + 1, 1000, 3000, .014), count(.022), .39);
  return out;
}

export function woodSeat({seed}) {
  const out = body(.15, [[255, .47, .029], [517, .27, .017], [894, .14, .010]]);
  addInto(out, grain(.055, seed, 700, 3100, .007), 0, .72);
  addInto(out, grain(.048, seed + 1, 480, 2000, .006), count(.026), .24);
  return out;
}

export function metalLatch({seed}) {
  const out = grain(.145, seed, 1300, 5100, .006, .001);
  addInto(out, body(.095, [[655, .24, .016], [1771, .26, .021], [2708, .19, .013], [3804, .12, .008]]), 0, .9);
  addInto(out, body(.077, [[472, .31, .018], [1445, .23, .014], [3170, .14, .009]]), count(.024));
  return out;
}

function pip(seconds, pitch, glide, decay, tint) {
  const frequency = hz(pitch);
  const length = count(seconds);
  const bend = i => frequency * (1 + glide * Math.exp(-i / SR / .022));
  const out = osc(length, bend);
  addInto(out, osc(length, i => 2 * bend(i)), 0, tint);
  return fade(mul(out, expEnv(length, decay, .004)), .001, .016);
}

export const messageSend = ({pitch}) => pip(.105, pitch, -.23, .025, .15);

export function messageReply({pitch}) {
  const out = new Float32Array(count(.18));
  addInto(out, pip(.105, pitch + 7, 0, .028, .10));
  addInto(out, pip(.123, pitch, .01, .038, .10), count(.057), .74);
  return out;
}

export function ackSoft({pitch}) {
  const out = new Float32Array(count(.22));
  addInto(out, pip(.102, pitch, -.04, .031, .11), 0, .78);
  addInto(out, pip(.149, pitch + 5, 0, .049, .13), count(.071));
  return out;
}

export function blockSoft({pitch}) {
  const out = pip(.135, pitch, .18, .031, .22);
  addInto(out, grain(.06, 307, 580, 1650, .015), 0, .25);
  return out;
}

export function seriesPaperLand({seed}) {
  // A card catching against a surface: a brief paper edge over an audible knock.
  const out = body(.145, [[337, .45, .027], [619, .23, .014], [987, .09, .009]]);
  addInto(out, grain(.077, seed, 650, 2900, .012), 0, .46);
  addInto(out, grain(.046, seed + 1, 1000, 3150, .012), count(.024), .15);
  return out;
}

export function seriesEmptyResult({pitch}) {
  // A muted contact and one short falling note for a result with no payoff.
  const out = pip(.170, pitch, .26, .038, .18);
  addInto(out, grain(.044, 413, 550, 2300, .011), 0, .32);
  addInto(out, body(.075, [[345, .29, .019], [690, .13, .01]]), 0, .50);
  return out;
}

export function seriesSend({pitch}) {
  const out = pip(.111, pitch, -.24, .026, .22);
  addInto(out, grain(.035, 421, 760, 2800, .008), 0, .38);
  addInto(out, body(.062, [[372, .25, .012], [740, .14, .008]]), 0, .55);
  return out;
}

export function seriesReply({pitch}) {
  // Two taps share one contact texture. The second has a little more body.
  const out = new Float32Array(count(.186));
  const second = count(.049);
  addInto(out, pip(.100, pitch + 7, 0, .031, .17), 0, .72);
  addInto(out, pip(.137, pitch, .035, .042, .20), second);
  addInto(out, grain(.031, 427, 740, 2750, .008), 0, .32);
  addInto(out, grain(.040, 428, 630, 2560, .011), second, .36);
  addInto(out, body(.077, [[358, .31, .019], [716, .12, .011]]), second, .52);
  return out;
}

// The v2 sounds use more energy close to the start while leaving distinct
// textures and lengths for the eight actions.
function shapeImpact(signal, drive) {
  return signal.map(sample => Math.tanh(sample * drive));
}

export function seriesPaperPullV2({seed}) {
  // The paper edge breaks free, then drags over the stack.
  const out = body(.176, [[247, .29, .023], [653, .43, .038], [1128, .13, .015]]);
  addInto(out, grain(.075, seed, 830, 3650, .028, .002), 0, .76);
  addInto(out, grain(.103, seed + 1, 510, 2700, .035, .006), count(.027), .78);
  addInto(out, grain(.042, seed + 2, 920, 3500, .012, .004), count(.107), .32);
  return shapeImpact(out, 3.2);
}

export function seriesPaperLandV2({seed}) {
  const out = body(.148, [[189, .33, .047], [381, .62, .046], [674, .32, .025], [1490, .12, .011]]);
  addInto(out, grain(.056, seed, 690, 4200, .014), 0, .69);
  addInto(out, body(.083, [[359, .27, .024], [688, .15, .017]]), count(.026), .68);
  addInto(out, grain(.035, seed + 1, 1180, 3640, .008), count(.027), .35);
  return shapeImpact(out, 3.4);
}

export function seriesStampV2({pitch}) {
  const out = body(.168, [[146, .68, .046], [316, .56, .042], [776, .26, .016], [1376, .14, .011]]);
  addInto(out, grain(.047, 643, 700, 4150, .012), 0, .76);
  addInto(out, pip(.115, pitch, -.12, .038, .25), count(.012), .51);
  addInto(out, grain(.038, 644, 1150, 3980, .009), count(.035), .32);
  return shapeImpact(out, 3.5);
}

export function seriesLockV2({pitch}) {
  // A weighted block seats in the slot and the latch snaps shut.
  const out = body(.224, [[111, .58, .083], [248, .57, .052], [503, .39, .041], [1150, .21, .017]]);
  addInto(out, grain(.051, 655, 800, 4550, .012), 0, .69);
  addInto(out, pip(.140, pitch, -.08, .050, .27), count(.019), .58);
  addInto(out, body(.094, [[383, .29, .032], [995, .34, .018], [1838, .21, .008]]), count(.039), .78);
  addInto(out, grain(.028, 656, 1310, 4200, .007), count(.040), .56);
  return shapeImpact(out, 3.5);
}

export function seriesEmptyResultV2({pitch}) {
  const out = pip(.164, pitch, .42, .057, .23);
  addInto(out, body(.118, [[165, .44, .039], [333, .47, .031], [685, .17, .015]]), 0, .82);
  addInto(out, grain(.041, 675, 540, 2270, .009), 0, .53);
  return shapeImpact(out, 3.0);
}

export function seriesSendV2({pitch}) {
  const out = pip(.122, pitch, -.42, .048, .30);
  addInto(out, body(.084, [[283, .35, .026], [591, .29, .022], [1297, .15, .012]]), 0, .77);
  addInto(out, grain(.035, 680, 920, 3800, .008), 0, .55);
  return shapeImpact(out, 3.0);
}

export function seriesReplyV2({pitch}) {
  const out = new Float32Array(count(.191));
  const second = count(.053);
  addInto(out, pip(.117, pitch + 7, -.08, .046, .25), 0, .95);
  addInto(out, body(.095, [[253, .36, .028], [524, .37, .028], [1181, .18, .013]]), 0, .78);
  addInto(out, grain(.037, 703, 980, 3900, .009), 0, .60);
  addInto(out, pip(.138, pitch, .028, .044, .23), second, .65);
  addInto(out, body(.091, [[357, .29, .023], [763, .20, .016]]), second, .51);
  addInto(out, grain(.032, 704, 860, 3500, .008), second, .38);
  return shapeImpact(out, 3.0);
}

export function seriesUnfoldV2({pitch}) {
  // The opening starts with a knock and rises in three steps.
  const out = body(.270, [[163, .44, .048], [329, .41, .037], [677, .32, .021]]);
  addInto(out, grain(.054, 720, 690, 4200, .015), 0, .61);
  addInto(out, pip(.137, pitch, -.15, .050, .25), 0, .81);
  addInto(out, pip(.146, pitch + 5, -.065, .048, .27), count(.061), .64);
  addInto(out, pip(.147, pitch + 12, 0, .040, .21), count(.123), .60);
  addInto(out, grain(.037, 721, 970, 3700, .009), count(.123), .41);
  return shapeImpact(out, 3.25);
}
