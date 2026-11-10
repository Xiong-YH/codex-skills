"""Event/frame-driven mix for PCM masters and synthesized cues."""
import json
import numpy as np
import palette as P
import game_audio as S
import narration
import synthesis


def sfx_parts(resolved, project_root=None):
    """Yield the same stereo clips for the source mix and the workbench stems."""
    fps = resolved['project']['fps']
    events = resolved.get('audio', [])
    rendered = synthesis.render_many(event['synthesis'] for event in events if 'synthesis' in event)
    for event in events:
        if 'file' in event:
            clip = narration.read_pcm(project_root, event, label='SFX')
            policy = 'project-pcm-master'
        elif 'synthesis' in event:
            clip = rendered[synthesis.recipe_key(event['synthesis'])]
            padding = event.get('paddingSamples', 0)
            if padding:
                clip = np.pad(clip, ((padding, 0), (0, 0)))
            policy = 'synthesis-peak-calibrated'
        else:
            clip = P.sound(event['sound'], event.get('variant', 0))
            policy = 'native-stereo-master'
        pan = .5 + (event.get('x', .5) - .5) * .32
        balance = np.array([np.cos(pan * np.pi / 2), np.sin(pan * np.pi / 2)])
        start = round(event['frame'] / fps * S.RATE)
        if clip.ndim == 2:
            # Center-unity balance preserves the approved stereo rebound and level.
            balance *= np.sqrt(2)
        else:
            rms = max(float(np.sqrt(np.mean(clip ** 2))), 1e-8)
            clip *= min(.10 / rms, .65 / max(float(np.max(np.abs(clip))), 1e-8))
            clip = clip[:, None]
            policy = 'legacy-mono-normalized'
        record = {**event, 'sample': start, 'durationSamples': len(clip), 'gainPolicy': policy}
        yield record, clip * balance * event.get('level', 1)


def render_sfx(resolved, project_root=None):
    fps = resolved['project']['fps']
    samples = round(resolved['durationFrames'] / fps * S.RATE)
    mixed = np.zeros((samples, 2))
    records = []
    for record, clip in sfx_parts(resolved, project_root):
        start = record['sample']
        n = min(len(clip), samples - start)
        if n > 0:
            mixed[start:start + n] += clip[:n]
        records.append(record)
    return mixed, records


def render(resolved, output, project_root=None):
    mixed, records = render_sfx(resolved, project_root)
    samples = len(mixed)
    mixed, voices = narration.mix(resolved, project_root, mixed)
    bgm = None
    if resolved.get('bgm'):
        import music
        bed, bgm = music.render(resolved, project_root, samples)
        # Narration ducks SFX only. The music bed has its own speech envelope.
        mixed += bed
    options = resolved.get('mix') or {}
    gain = options.get('masterGain', .8)
    mastered = .8 * np.tanh(mixed * gain / .8)
    output.mkdir(parents=True, exist_ok=True)
    S.write_wav(output / 'animation-sfx.wav', mastered)
    peak = float(np.max(np.abs(mastered))) if samples else 0
    rms = float(np.sqrt(np.mean(mastered ** 2))) if samples else 0
    source = 'Arcade PCM / procedural G2'
    if any('synthesis' in event for event in records):
        source += ' / Garden SFX synthesis'
    if any('file' in event for event in records):
        source += ' / project PCM SFX'
    report = {'sampleRate': S.RATE, 'channels': 2, 'samples': samples, 'durationSeconds': samples / S.RATE,
              'source': source + ' plus optional project PCM narration and music', 'voiceover': bool(voices), 'musicBed': bool(bgm),
              'speechDuck': options.get('speechDuck', .28),
              'peakDbfs': round(20 * np.log10(peak), 3) if peak else None,
              'rmsDbfs': round(20 * np.log10(rms), 3) if rms else None, 'events': records, 'narration': voices, 'bgm': bgm}
    (output / 'sfx-events.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    return output / 'animation-sfx.wav'
