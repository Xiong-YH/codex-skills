"""Portable arcade/drum masters, with approval state kept in their manifests."""
import hashlib
import json
from pathlib import Path
import wave

import numpy as np

BANK = Path(__file__).with_name('assets') / 'arcade-motion'
BANKS = {'core': BANK}


def manifest(bank='core'):
    return json.loads((BANKS[bank] / 'manifest.json').read_text(encoding='utf-8'))


def entries():
    return [item for name in BANKS for item in manifest(name)['atoms']]


def asset(kind, layer='master'):
    found = next(((folder, item) for name, folder in BANKS.items()
                  for item in manifest(name)['atoms'] if item['id'] == kind), None)
    if found is None:
        raise ValueError(f'Unknown arcade sound: {kind}')
    folder, item = found
    record = item['files'][layer]
    path = (folder / record['file']).resolve()
    if not path.is_relative_to(folder.resolve()):
        raise ValueError('Audio asset must remain inside its bank')
    if hashlib.sha256(path.read_bytes()).hexdigest() != record['sha256']:
        raise ValueError(f'Audio asset hash mismatch: {record["file"]}')
    return path


def sound(kind, variant=0, layer='master'):
    if variant != 0:
        raise ValueError('Arcade masters currently have variant 0 only')
    with wave.open(str(asset(kind, layer)), 'rb') as source:
        if (source.getframerate(), source.getnchannels(), source.getsampwidth(), source.getcomptype()) != (48000, 2, 2, 'NONE'):
            raise ValueError('Approved arcade assets must be 48 kHz stereo 16-bit PCM')
        return np.frombuffer(source.readframes(source.getnframes()), dtype='<i2').reshape(-1, 2).astype(float) / 32768
