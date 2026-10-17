"""Event/frame-driven G2 mix. A fixed bus gain preserves authored dynamics."""
import json
import numpy as np
import palette as P
import game_audio as S


def render(resolved, output):
    fps = resolved['project']['fps']
    samples = round(resolved['durationFrames'] / fps * S.RATE)
    mixed = np.zeros((samples, 2))
    records = []
    for event in resolved['audio']:
        clip = P.sound(event['sound'], event.get('variant', 0))
        rms = max(float(np.sqrt(np.mean(clip ** 2))), 1e-8)
        clip *= min(.10 / rms, .65 / max(float(np.max(np.abs(clip))), 1e-8))
        pan = .5 + (event.get('x', .5) - .5) * .32
        S.place(mixed, event['frame'] / fps, clip, pan, event.get('level', 1))
        records.append({**event, 'sample': round(event['frame'] / fps * S.RATE), 'durationSamples': len(clip)})
    options = resolved.get('mix') or {}
    gain = options.get('masterGain', .8)
    mastered = .8 * np.tanh(mixed * gain / .8)
    output.mkdir(parents=True, exist_ok=True)
    S.write_wav(output / 'animation-sfx.wav', mastered)
    peak = float(np.max(np.abs(mastered))) if samples else 0
    rms = float(np.sqrt(np.mean(mastered ** 2))) if samples else 0
    report = {'sampleRate': S.RATE, 'channels': 2, 'samples': samples, 'durationSeconds': samples / S.RATE,
              'source': 'G2 procedural palette, retained from approved source', 'humanVoice': False, 'musicBed': False,
              'peakDbfs': round(20 * np.log10(peak), 3) if peak else None,
              'rmsDbfs': round(20 * np.log10(rms), 3) if rms else None, 'events': records}
    (output / 'sfx-events.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    return output / 'animation-sfx.wav'
