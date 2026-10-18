"""Event/frame-driven mix with native stereo masters and legacy mono synthesis."""
import json
import numpy as np
import palette as P
import game_audio as S


def render_sfx(resolved):
    fps = resolved['project']['fps']
    samples = round(resolved['durationFrames'] / fps * S.RATE)
    mixed = np.zeros((samples, 2))
    records = []
    for event in resolved['audio']:
        clip = P.sound(event['sound'], event.get('variant', 0))
        pan = .5 + (event.get('x', .5) - .5) * .32
        start = round(event['frame'] / fps * S.RATE)
        if clip.ndim == 2:
            # Center-unity balance preserves the approved stereo rebound and level.
            n = min(len(clip), samples - start)
            balance = np.sqrt(2) * np.array([np.cos(pan * np.pi / 2), np.sin(pan * np.pi / 2)])
            if n > 0:
                mixed[start:start + n] += clip[:n] * balance * event.get('level', 1)
            policy = 'native-stereo-master'
        else:
            rms = max(float(np.sqrt(np.mean(clip ** 2))), 1e-8)
            clip *= min(.10 / rms, .65 / max(float(np.max(np.abs(clip))), 1e-8))
            S.place(mixed, event['frame'] / fps, clip, pan, event.get('level', 1))
            policy = 'legacy-mono-normalized'
        records.append({**event, 'sample': start, 'durationSamples': len(clip), 'gainPolicy': policy})
    return mixed, records


def render(resolved, output, project_root=None):
    mixed, records = render_sfx(resolved)
    samples = len(mixed)
    import narration
    mixed, voices = narration.mix(resolved, project_root, mixed)
    options = resolved.get('mix') or {}
    gain = options.get('masterGain', .8)
    mastered = .8 * np.tanh(mixed * gain / .8)
    output.mkdir(parents=True, exist_ok=True)
    S.write_wav(output / 'animation-sfx.wav', mastered)
    peak = float(np.max(np.abs(mastered))) if samples else 0
    rms = float(np.sqrt(np.mean(mastered ** 2))) if samples else 0
    report = {'sampleRate': S.RATE, 'channels': 2, 'samples': samples, 'durationSeconds': samples / S.RATE,
              'source': 'Arcade PCM / procedural G2 plus optional project PCM narration', 'voiceover': bool(voices), 'musicBed': False,
              'speechDuck': options.get('speechDuck', .28),
              'peakDbfs': round(20 * np.log10(peak), 3) if peak else None,
              'rmsDbfs': round(20 * np.log10(rms), 3) if rms else None, 'events': records, 'narration': voices}
    (output / 'sfx-events.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    return output / 'animation-sfx.wav'
