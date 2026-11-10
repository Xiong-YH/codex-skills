"""Resolve catalog parameters and render bounded, deterministic SFX batches."""
import base64
import json
import math
import os
from pathlib import Path
import re
import shutil
import subprocess


RATE = 48_000
RENDERER = Path(__file__).with_name('render-sfx.mjs')
PARAM_TYPES = {'number': (int, float), 'integer': (int,), 'boolean': (bool,), 'string': (str,)}
NOTE_NAMES = dict(zip('CDEFGAB', (0, 2, 4, 5, 7, 9, 11)))


def valid_note(value):
    if type(value) in (int, float):
        return 0 <= value <= 127
    match = re.fullmatch(r'([A-Ga-g])([#b]{0,3})(-?[0-9]{1,2})', value.strip()) if isinstance(value, str) else None
    if not match:
        return False
    name, accidentals, octave = match.groups()
    pitch = (int(octave) + 1) * 12 + NOTE_NAMES[name.upper()]
    return 0 <= pitch + accidentals.count('#') - accidentals.count('b') <= 127


def valid_param(value, rule):
    kind = rule['type']
    if kind == 'note':
        return valid_note(value)
    if kind == 'notes':
        if isinstance(value, list):
            return 1 <= len(value) <= 8 and all(valid_note(note) for note in value)
        return valid_note(value)
    if type(value) not in PARAM_TYPES[kind]:
        return False
    if 'minimum' in rule:
        return rule['minimum'] <= value <= rule['maximum']
    if 'enum' in rule:
        return value in rule['enum']
    if 'pattern' in rule:
        return re.fullmatch(rule['pattern'], value) is not None
    return True


def resolve_sfx(cue, sound, frame, fps):
    """Resolve an authored event to an audio start on the workbench frame grid."""
    overrides = cue.pop('params', None)
    alignment = cue.pop('align', 'start')
    recipe = sound.get('synthesis')
    cue['frame'] = frame
    if not recipe:
        if overrides is not None or alignment != 'start':
            raise ValueError(f"{cue['id']}: only synthesized sounds accept params or alignment other than start")
        return

    rules = recipe['params']
    supplied = overrides or {}
    unknown = set(supplied) - set(rules)
    if unknown:
        raise ValueError(f"{cue['id']}: unsupported sound parameters: {', '.join(sorted(unknown))}")
    params = {}
    for key, rule in rules.items():
        if key not in supplied and 'default' not in rule:
            continue
        value = supplied[key] if key in supplied else rule['default']
        if not valid_param(value, rule):
            raise ValueError(f"{cue['id']}: invalid value for {sound['id']}.{key}; see audio catalog")
        # Canonicalize numeric spellings so equal recipes share a rendered clip.
        params[key] = float(value) if rule['type'] == 'number' else value

    cue.update(synthesis={'voice': recipe['voice'], 'params': params}, align=alignment, anchorFrame=frame)
    if alignment == 'start':
        return
    if not recipe.get(f'{alignment}Alignment'):
        raise ValueError(f"{cue['id']}: {sound['id']} does not support {alignment} alignment")
    samples_per_frame = RATE // fps
    duration_samples = math.floor(params['duration'] * RATE + .5)
    offset = math.floor(duration_samples * params['peak'] + .5) if alignment == 'peak' else duration_samples
    lead_frames = math.ceil(offset / samples_per_frame)
    if frame < lead_frames:
        raise ValueError(f"{cue['id']}: {alignment}-aligned sound needs {lead_frames} frames before its event")
    # Keep the clip on the workbench frame grid and the anchor on its sample.
    cue['frame'] = frame - lead_frames
    cue['paddingSamples'] = lead_frames * samples_per_frame - offset
    cue[f'{alignment}OffsetSamples'] = offset


def recipe_key(spec):
    return json.dumps(spec, sort_keys=True, separators=(',', ':'))


def render_many(specs):
    """Deduplicate recipes; existing WAV-only projects never launch Node."""
    unique = {recipe_key(spec): spec for spec in specs}
    if not unique:
        return {}
    import numpy as np

    node = shutil.which(os.environ.get('PIXEL_NODE') or 'node')
    if not node:
        raise RuntimeError('Synthesized SFX require Node.js on PATH or PIXEL_NODE.')
    entries = list(unique.items())
    rendered = {}
    for start in range(0, len(entries), 16):
        batch = entries[start:start + 16]
        try:
            result = subprocess.run([node, str(RENDERER)], input=json.dumps([spec for _, spec in batch]),
                                    capture_output=True, encoding='utf-8', timeout=30, check=True)
        except subprocess.CalledProcessError as error:
            raise RuntimeError(f'SFX synthesis failed: {error.stderr.strip()}') from error
        except subprocess.TimeoutExpired as error:
            raise RuntimeError('SFX synthesis timed out after 30 seconds.') from error
        encoded = json.loads(result.stdout)
        for (ident, _), pcm in zip(batch, encoded, strict=True):
            rendered[ident] = np.frombuffer(base64.b64decode(pcm, validate=True), dtype='<f4').reshape(-1, 2)
    return rendered
