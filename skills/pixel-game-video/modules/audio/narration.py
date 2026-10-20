"""Portable recorded/synthesized PCM narration; no dependency on a TTS service."""
import hashlib
from pathlib import Path
import wave


def inspect_clip(root, relative, *, label='Narration'):
    root = Path(root).resolve()
    path = (root / relative).resolve()
    if Path(relative).is_absolute() or not path.is_relative_to(root):
        raise ValueError(f'{label} file must stay inside the project')
    if path.suffix.lower() != '.wav':
        raise ValueError(f'{label} requires a PCM WAV file')
    with wave.open(str(path), 'rb') as stream:
        if (stream.getcomptype(), stream.getframerate(), stream.getsampwidth()) != ('NONE', 48000, 2) or stream.getnchannels() not in (1, 2):
            raise ValueError(f'{label} requires 48kHz, 16-bit mono/stereo PCM WAV')
        samples = stream.getnframes()
        if samples < 1:
            raise ValueError(f'{label} clip is empty')
    return path, {'samples': samples, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}


def duck_envelope(samples, intervals, amount):
    """Hold the whole speech window, with 50ms attack and 120ms release."""
    import numpy as np
    duck = np.ones(samples)
    for start, end in intervals:
        before, after = max(0, start - 2400), min(samples, end + 5760)
        duck[before:start] = np.minimum(duck[before:start], np.linspace(1, amount, start-before))
        duck[start:end] = np.minimum(duck[start:end], amount)
        duck[end:after] = np.minimum(duck[end:after], np.linspace(amount, 1, after-end))
    return duck


def mix(resolved, root, sfx):
    import numpy as np
    voice = np.zeros_like(sfx)
    speech_duck = resolved.get('mix', {}).get('speechDuck', .28)
    records = []
    for cue in resolved.get('narration', []):
        path, info = inspect_clip(root, cue['file'])
        if info['sha256'] != cue['sha256']:
            raise ValueError('Narration changed after compilation; rebuild')
        with wave.open(str(path), 'rb') as stream:
            data = np.frombuffer(stream.readframes(stream.getnframes()), dtype='<i2').reshape(-1, stream.getnchannels()).astype(float) / 32768
        if data.shape[1] == 1:
            data = np.repeat(data, 2, axis=1)
        start = round(cue['frame'] / resolved['project']['fps'] * 48000)
        end = start + len(data)
        rms = max(float(np.sqrt(np.mean(data ** 2))), 1e-8)
        data *= min(.15 / rms, .85 / max(float(np.max(np.abs(data))), 1e-8)) * cue['gain']
        voice[start:end] += data
        records.append({**cue, 'startSample':start, 'endSample':end})
    # A fixed speech-window duck avoids pumping between spoken syllables.
    duck = duck_envelope(len(sfx), [(cue['startSample'], cue['endSample']) for cue in records], speech_duck)
    return sfx * duck[:, None] + voice, records
