"""Score the full film with the approved G2 game palette; no voice, music bed, or air layer."""
import argparse
import json
from pathlib import Path
import numpy as np
import game_audio as S
import palette as P

ROOT = Path(__file__).resolve().parent.parent
RATE = S.RATE


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--out', type=Path, default=ROOT)
    args = parser.parse_args()
    duration = json.loads((ROOT / 'project.json').read_text())['duration']
    score = json.loads((ROOT / 'sound-score.json').read_text())
    args.out.mkdir(parents=True, exist_ok=True)
    bank = args.out / 'sfx-bank'
    bank.mkdir(exist_ok=True)
    mix = np.zeros((round(RATE * duration), 2))
    records = []
    for event in score:
        at, kind, variant, level, x = (event[k] for k in ['at', 'kind', 'variant', 'level', 'x'])
        clip = P.sound(kind, variant)
        clip *= min(.10 / max(np.sqrt(np.mean(clip ** 2)), 1e-6), .65 / max(np.max(np.abs(clip)), 1e-6))
        pan = .5 + (x / 320 - .5) * .32
        S.place(mix, at, clip, pan, level)
        filename = f'{kind}-{variant + 1:02}.wav'
        stem = np.stack([clip, clip], axis=1) * .65
        S.write_wav(bank / filename, stem)
        records.append({'at': at, 'kind': kind, 'material': P.MATERIALS[kind], 'variant': variant, 'level': level,
                        'pan': round(pan, 4), 'duration': round(len(clip) / RATE, 4), 'bankFile': 'sfx-bank/' + filename})
    gain = .033 / max(np.sqrt(np.mean(mix ** 2)), 1e-6)
    for _ in range(5):
        mastered = .60 * np.tanh(mix * gain / .60)
        gain *= .033 / max(np.sqrt(np.mean(mastered ** 2)), 1e-6)
    S.write_wav(args.out / 'animation-sfx.wav', mastered)
    active_frames = np.any(np.abs(mastered) > .001, axis=1)
    report = {'durationSeconds': duration, 'sampleRate': RATE, 'channels': 2,
              'approvedDirection': 'G2 cyber-arena, diversified material palette', 'eventCount': len(records),
              'cueFamilies': len({r['kind'] for r in records}),
              'humanVoice': False, 'musicBed': False, 'windNoise': False, 'noiseSweeps': False,
              'peakDbfs': round(float(20 * np.log10(np.max(np.abs(mastered)))), 2),
              'rmsDbfs': round(float(20 * np.log10(np.sqrt(np.mean(mastered ** 2)))), 2),
              'activeSecondsAboveMinus60Dbfs': round(float(np.sum(active_frames) / RATE), 3),
              'events': records}
    (args.out / 'sfx-events.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({k: v for k, v in report.items() if k != 'events'}, indent=2))


if __name__ == '__main__':
    main()
