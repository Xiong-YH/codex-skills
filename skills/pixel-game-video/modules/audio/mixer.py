"""Event/frame-driven mix for PCM masters and synthesized cues."""
import json
import numpy as np
import palette as P
import game_audio as S
import narration
import synthesis


def dbfs(peak):
    return round(20 * np.log10(peak), 3) if peak else None


def rms_dbfs(samples):
    return dbfs(float(np.sqrt(np.mean(samples ** 2))))


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
    compare_to_music = bool(resolved.get('bgm')) and not resolved.get('narration')
    for record, clip in sfx_parts(resolved, project_root):
        start = record['sample']
        n = max(0, min(len(clip), samples - start))
        if n > 0:
            mixed[start:start + n] += clip[:n]
        anchor = record.get('anchorFrame', record['frame'])
        record.update(anchorFrame=anchor, anchorSample=round(anchor / fps * S.RATE),
                      signalStartSample=start + record.get('paddingSamples', 0),
                      playedSamples=n, truncatedSamples=len(clip) - n,
                      placedPeakDbfs=dbfs(float(np.max(np.abs(clip[:n]))) if n else 0))
        if compare_to_music and n:
            # Compare the cue and music over the same moment, including the crest of
            # a pre-lap and the rise immediately before an end-aligned cue.
            window_samples = S.RATE // 10
            lead = {'peak': window_samples // 2, 'end': window_samples}.get(record.get('align'), 0)
            first = max(record['signalStartSample'], record['anchorSample'] - lead)
            last = min(first + window_samples, start + n)
            if first < last:
                record['onsetLevels'] = {'startSample': first, 'endSample': last,
                                         'sfxRmsDbfs': rms_dbfs(clip[first - start:last - start])}
        records.append(record)
    return mixed, records


def sound_design_report(records, *, music_bed):
    """Flag listening decisions. Signal levels are before speech ducking and master."""
    warnings = []
    anchors = {}
    nonzero = 0
    for record in records:
        ident = record['id']
        if record['placedPeakDbfs'] is None:
            warnings.append({'code': 'sfx-zero-signal', 'cueIds': [ident]})
        else:
            nonzero += 1
            anchors.setdefault(record['anchorFrame'], []).append(ident)
        if record['truncatedSamples']:
            warnings.append({'code': 'sfx-tail-trimmed', 'cueIds': [ident], 'samples': record['truncatedSamples']})
    if music_bed and not nonzero:
        warnings.append({'code': 'bgm-without-sfx', 'cueIds': []})
    for frame, ids in sorted(anchors.items()):
        if len(ids) > 1:
            warnings.append({'code': 'sfx-shared-anchor', 'cueIds': ids, 'anchorFrame': frame})
    return {'cueCount': len(records), 'nonzeroCueCount': nonzero, 'warnings': warnings,
            'subjectiveListening': 'not_reviewed'}


def render(resolved, output, project_root=None):
    mixed, records = render_sfx(resolved, project_root)
    samples = len(mixed)
    mixed, voices = narration.mix(resolved, project_root, mixed)
    bgm = None
    if resolved.get('bgm'):
        import music
        bed, bgm = music.render(resolved, project_root, samples)
        for record in records:
            levels = record.get('onsetLevels')
            if levels is not None:
                music_rms = rms_dbfs(bed[levels['startSample']:levels['endSample']])
                sfx_rms = levels['sfxRmsDbfs']
                levels['bgmRmsDbfs'] = music_rms
                levels['sfxVsBgmDb'] = round(sfx_rms - music_rms, 2) if None not in (sfx_rms, music_rms) else None
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
        source += ' / procedural SFX synthesis'
    if any('file' in event for event in records):
        source += ' / project PCM SFX'
    report = {'inputHash': resolved.get('inputHash'), 'sampleRate': S.RATE, 'channels': 2, 'samples': samples,
              'durationSeconds': samples / S.RATE,
              'source': source + ' plus optional project PCM narration and music', 'voiceover': bool(voices), 'musicBed': bool(bgm),
              'speechDuck': options.get('speechDuck', .28),
              'peakDbfs': dbfs(peak), 'rmsDbfs': dbfs(rms), 'events': records, 'narration': voices, 'bgm': bgm,
              'soundDesign': sound_design_report(records, music_bed=bool(bgm))}
    (output / 'sfx-events.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    return output / 'animation-sfx.wav'
