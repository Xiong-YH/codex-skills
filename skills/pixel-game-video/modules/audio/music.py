"""Project PCM music bed, normalized separately and ducked beneath narration."""
import math
import wave

import numpy as np

from narration import duck_envelope, inspect_clip


RATE = 48000
TARGET_RMS = .10
PEAK_LIMIT = .65


def render(resolved, root, samples):
    """Return an unmastered stereo bed; the mixer owns the single final bus."""
    bed = np.zeros((samples, 2))
    cue = resolved.get('bgm')
    if not cue:
        return bed, None
    path, info = inspect_clip(root, cue['file'], label='BGM')
    if info['sha256'] != cue['sha256'] or info['samples'] != cue['samples']:
        raise ValueError('BGM changed after compilation; rebuild')
    with wave.open(str(path), 'rb') as stream:
        data = np.frombuffer(stream.readframes(stream.getnframes()), dtype='<i2').reshape(-1, stream.getnchannels()).astype(float) / 32768
    if data.shape[1] == 1:
        data = np.repeat(data, 2, axis=1)

    fps = resolved['project']['fps']
    start, end = (round(cue[field] / fps * RATE) for field in ('frame', 'endFrame'))
    if not 0 <= start < end <= samples:
        raise ValueError('BGM interval must stay inside the video')
    trim_seconds = cue.get('trimStartSeconds', 0)
    if not math.isfinite(trim_seconds) or trim_seconds < 0:
        raise ValueError('BGM trim must be a finite nonnegative time')
    trim = round(trim_seconds * RATE)
    if trim >= len(data):
        raise ValueError('BGM trim must leave playable audio')
    source = data[trim:]
    length = end - start
    loop = cue.get('loop', True)
    if not loop and len(source) < length:
        raise ValueError('BGM source is shorter than its interval with loop disabled')

    source_rms = float(np.sqrt(np.mean(source ** 2)))
    source_peak = float(np.max(np.abs(source)))
    normalization = min(TARGET_RMS / max(source_rms, 1e-8), PEAK_LIMIT / max(source_peak, 1e-8))
    gain = cue.get('gain', .18)
    # One scalar preserves the source's left/right balance and stereo phase.
    if loop and len(source) < length:
        data = np.tile(source, (math.ceil(length / len(source)), 1))[:length]
    else:
        data = source[:length].copy()
    data *= normalization * gain

    fade_in = min(length, round(cue.get('fadeInFrames', 60) / fps * RATE))
    fade_out = min(length, round(cue.get('fadeOutFrames', 90) / fps * RATE))
    envelope = np.ones(length)
    if fade_in:
        envelope[:fade_in] *= np.linspace(0, 1, fade_in)
    if fade_out:
        envelope[-fade_out:] *= np.linspace(1, 0, fade_out)
    intervals = [(round(voice['frame'] / fps * RATE), round(voice['frame'] / fps * RATE) + voice['samples'])
                 for voice in resolved.get('narration', [])]
    speech_duck = cue.get('speechDuck', .25)
    duck = duck_envelope(samples, intervals, speech_duck)
    bed[start:end] = data * (envelope * duck[start:end])[:, None]

    record = {**cue, 'startSample': start, 'endSample': end,
              'sourceStartSample': trim, 'sourceEndSample': trim + min(length, len(source)),
              'availableSourceSamples': len(source), 'loop': loop,
              'loopCount': math.ceil(length / len(source)) if loop else 1,
              'gain': gain, 'normalizationGain': normalization, 'targetRms': TARGET_RMS,
              'peakLimit': PEAK_LIMIT, 'sourceRms': source_rms, 'sourcePeak': source_peak,
              'gainPolicy': 'shared-stereo-rms-with-peak-limit',
              'fadeInSamples': fade_in, 'fadeOutSamples': fade_out,
              'speechDuck': speech_duck, 'duckAttackSamples': 2400, 'duckReleaseSamples': 5760,
              'speechWindows': [{'startSample': a, 'endSample': b} for a, b in intervals]}
    return bed, record
