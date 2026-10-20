"""Build the editable workbench branch from the compiled Remotion timeline.

This is an adapter, not a second authoring timeline. The generated manifest and
initial clip times are derived only from resolved-timeline.json. Workbench JSON
saved later is an independent edit and is never written into director sources.
"""
from __future__ import annotations

import copy
import importlib.util
import json
import math
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import wave


def _write(path: Path, value: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def support_error(resolved: dict) -> str | None:
    if resolved['project'].get('renderBackend') != 'remotion':
        return 'The local workbench currently requires renderBackend=remotion; Canvas remains the default backend.'
    if any(shot['scene'] != 'scenes.focus-desk.v1' for shot in resolved['shots']):
        return 'The local workbench currently supports only native Remotion scenes.focus-desk.v1 shots.'
    if any(motion['recipe'] not in {'motion.camera-track.v1', 'motion.book-sweep.v1'}
           for shot in resolved['shots'] for motion in shot['motions']):
        return 'The local workbench cannot yet split this motion recipe into independent editable clips.'
    if any(motion['recipe'] == 'motion.book-sweep.v1' and index == 0
           for index, shot in enumerate(resolved['shots']) for motion in shot['motions']):
        return 'A workbench book-sweep transition requires a preceding focus-desk shot.'
    if resolved.get('narration') or resolved.get('bgm'):
        return 'Narration/BGM builds remain supported, but this workbench bridge currently accepts only silent or SFX-only projects.'
    if any(cue['role'] == 'title' for cue in resolved.get('cues', [])):
        return ('Standalone title cues are not supported by this workbench bridge yet; use each focus-desk '
                "shot's editable heading. Normal Remotion builds still support title cues.")
    return None


def _schema(kind: str, key: str, label: str, value, **options) -> dict:
    return {'type': kind, 'key': key, 'label': label, 'default': value, **options}


def _heading_props(shot: dict, payload: dict) -> dict:
    style = payload['style']
    return {'heading': shot['params']['heading'],
            'titleFontSize': payload['resolved']['project']['height'] * style.get('textRoles', {}).get('title', .03),
            'titleColor': style['colors'].get('gold', '#eac47c'), 'titleX': .5, 'titleY': .105}


def _heading_schema(props: dict) -> list[dict]:
    return [_schema('textarea', 'heading', '主标题', props['heading']),
            _schema('number', 'titleFontSize', '标题字号', props['titleFontSize'], min=12, max=140, step=1, unit='px'),
            _schema('color', 'titleColor', '标题颜色', props['titleColor']),
            _schema('slider', 'titleX', '标题水平位置', props['titleX'], min=.1, max=.9, step=.01),
            _schema('slider', 'titleY', '标题垂直位置', props['titleY'], min=.07, max=.9, step=.01)]


def _visual_manifest(resolved: dict, payload: dict) -> dict:
    project, style = resolved['project'], payload['style']
    shots, transitions, captions = [], [], []
    for index, shot in enumerate(resolved['shots']):
        props = {'shotIndex': index, 'sourceUnitId': shot['id'], **_heading_props(shot, payload),
                 **{f'label{i + 1}': label for i, label in enumerate(shot['params']['labels'])}}
        shots.append({'id': shot['id'], 'label': shot['params']['heading'], 'from': shot['startFrame'],
                      'duration': shot['durationFrames'],
                      'component': 'DeskShotUnit', 'props': props,
                      'schema': _heading_schema(props) + [_schema('text', f'label{i + 1}', f'任务纸 {i + 1}', label)
                                                        for i, label in enumerate(shot['params']['labels'])],
                      'cardId': shot['id'], 'cardName': shot['params']['heading']})
        for motion_index, motion in enumerate(shot['motions']):
            if motion['recipe'] != 'motion.book-sweep.v1':
                continue
            previous = resolved['shots'][index - 1]
            props = {'shotIndex': index, 'outgoingShotId': previous['id'], 'motionIndex': motion_index,
                     'x': motion['params'].get('x', .36), 'y': motion['params'].get('y', .67),
                     **_heading_props(previous, payload),
                     **{f'label{i + 1}': label for i, label in enumerate(previous['params']['labels'])}}
            transitions.append({'id': f"{shot['id']}.{motion['id']}", 'label': '翻书转场',
                                'from': motion['startFrame'], 'duration': motion['endFrame'] - motion['startFrame'],
                                'component': 'BookSweepUnit', 'props': props,
                                'schema': _heading_schema(props) + [
                                    _schema('slider', 'x', '翻书起点 X', props['x'], min=0, max=1, step=.01),
                                    _schema('slider', 'y', '翻书起点 Y', props['y'], min=0, max=1, step=.01)],
                                'cardId': f"{shot['id']}.{motion['id']}", 'cardName': '翻书转场'})
    defaults = {'title': .105, 'subtitle': .87, 'annotation': .22, 'label': .68}
    for index, cue in enumerate(resolved['cues']):
        props = {'cueIndex': index, 'text': cue['text'],
                 'fontSize': project['height'] * style.get('textRoles', {}).get(cue['role'], .03),
                 'color': style['colors'].get('accent', '#7ed5c8') if cue.get('accent') else style['colors'].get('ink', '#f5ebd4'),
                 'x': cue['x'] if cue.get('x') is not None else .5,
                 'y': cue['y'] if cue.get('y') is not None else defaults.get(cue['role'], .5)}
        captions.append({'id': cue['id'], 'label': cue['text'], 'from': cue['startFrame'],
                         'duration': cue['endFrame'] - cue['startFrame'],
                         'component': 'CaptionUnit', 'props': props,
                         'schema': [_schema('textarea', 'text', '文案', props['text']),
                                    _schema('number', 'fontSize', '字号', props['fontSize'], min=12, max=140, step=1, unit='px'),
                                    _schema('color', 'color', '颜色', props['color']),
                                    _schema('slider', 'x', '水平位置', props['x'], min=.1, max=.9, step=.01),
                                    _schema('slider', 'y', '垂直位置', props['y'], min=.07, max=.9, step=.01)],
                         'cardId': cue['id'], 'cardName': cue['text']})
    return {'name': project['title'], 'fps': project['fps'], 'width': project['width'], 'height': project['height'],
            'total': resolved['durationFrames'], 'background': '#111820', 'revision': resolved['inputHash'],
            'shots': shots, 'transitions': transitions, 'captions': captions, 'overlays': [],
            'order': ['captions', 'transitions', 'overlays'], 'sfx': [], 'bgm': []}


def _pcm(path: Path):
    import numpy as np
    with wave.open(str(path), 'rb') as stream:
        if (stream.getsampwidth(), stream.getframerate(), stream.getnchannels()) != (2, 48000, 2):
            raise ValueError('Workbench parity expects the original 48kHz stereo PCM mix.')
        return np.frombuffer(stream.readframes(stream.getnframes()), dtype='<i2').reshape(-1, 2).astype('int32')


def _split_audio(root: Path, skill: Path, resolved: dict, public: Path) -> tuple[list[dict], dict]:
    import numpy as np
    fps = resolved['project']['fps']
    if resolved['project']['audioMode'] == 'silent':
        return [], {'sampleRate': 48000, 'channels': 2, 'events': [], 'maxAbsPcmError': 0, 'empty': True}
    directory = skill / 'modules/audio'
    sys.path.insert(0, str(directory))
    try:
        spec = importlib.util.spec_from_file_location('pixel_workbench_mixer', directory / 'mixer.py')
        mixer = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mixer)
        original = _pcm(public / 'animation.wav')
        reconstructed = np.zeros_like(original)
        entries, records = [], []
        gain = resolved.get('mix', {}).get('masterGain', .8)
        for index, event in enumerate(resolved.get('audio', [])):
            single = copy.deepcopy(resolved)
            single['audio'] = [{**event, 'frame': 0}]
            mixed, source_records = mixer.render_sfx(single)
            at = round(event['frame'] / fps * mixer.S.RATE)
            count = min(source_records[0]['durationSamples'], len(original) - at)
            mastered = .8 * np.tanh(mixed[:count] * gain / .8)
            ident = re.sub(r'[^A-Za-z0-9_.-]+', '-', event['id']).strip('-') or 'event'
            relative = f'audio/sfx/{index + 1:02d}-{ident}.wav'
            path = public / relative
            path.parent.mkdir(parents=True, exist_ok=True)
            mixer.S.write_wav(path, mastered)
            decoded = _pcm(path)
            reconstructed[at:at + count] += decoded
            entries.append({'from': event['frame'], 'duration': max(1, math.ceil(count / mixer.S.RATE * fps)),
                            'src': relative, 'volume': 1, 'label': event['id']})
            records.append({**event, 'src': relative, 'sample': at, 'samples': count,
                            'sourceLevel': event.get('level', 1), 'masterGain': gain,
                            'gainPolicy': source_records[0]['gainPolicy'],
                            'note': 'Source event level, pan, normalization and master soft-clip are baked into this independent WAV; workbench volume is a relative multiplier.'})
        difference = np.abs(reconstructed - original)
        return entries, {'sampleRate': 48000, 'channels': 2, 'events': records,
                         'maxAbsPcmError': int(difference.max()) if difference.size else 0,
                         'empty': not records,
                         'comparison': 'Integer PCM sum of independent WAVs at original event sample offsets versus original animation.wav.'}
    finally:
        sys.path.remove(str(directory))


def generate(project_root: Path | str, resolved: dict, payload: dict, skill_root: Path | str) -> dict:
    root, skill = Path(project_root).resolve(), Path(skill_root).resolve()
    output = root / 'build'
    generated = output / 'remotion'
    status = {'contractVersion': 1, 'inputHash': resolved['inputHash'], 'supported': False}
    error = support_error(resolved)
    if error:
        status['reason'] = error
        _write(output / 'workbench-manifest.json', status)
        return status
    manifest = _visual_manifest(resolved, payload)
    if payload.get('audio') is None:
        audio = {'sampleRate': 48000, 'channels': 2, 'events': [], 'maxAbsPcmError': 0, 'empty': True}
    else:
        manifest['sfx'], audio = _split_audio(root, skill, resolved, generated / 'public')
    status['audioReport'] = audio
    if audio['maxAbsPcmError'] > 1:
        status['reason'] = ('Independent SFX differ from the original nonlinear master by more than one PCM unit '
                            '(usually overlapping SFX); use the normal Remotion export until this mix is supported.')
        _write(output / 'workbench-manifest.json', status)
        return status
    source = generated / 'src'
    _write(source / 'workbench-payload.json', payload)
    (source / 'workbench-payload.ts').write_text(
        "import data from './workbench-payload.json';\nimport type {Payload} from './types';\n"
        '// JSON tuple literals are widened by TypeScript; the Python compiler validates the payload contract.\n'
        'export const WORKBENCH_PAYLOAD = data as unknown as Payload;\n', encoding='utf-8')
    serialized = json.dumps(manifest, ensure_ascii=False, indent=2)
    (source / 'workbench.ts').write_text(
        "// Generated from resolved-timeline.json; edits in the workbench live in its saved project JSON.\n"
        "import React from 'react';\nimport {PixelFilm} from './Root';\n"
        "import {DeskShotUnit, CaptionUnit, BookSweepUnit} from './WorkbenchUnits';\n"
        "import {WORKBENCH_PAYLOAD} from './workbench-payload';\n"
        f'const data = {serialized};\n'
        'const components = {DeskShotUnit, CaptionUnit, BookSweepUnit};\n'
        'const visual = (units: typeof data.shots | typeof data.transitions | typeof data.captions) => units.map(unit => ({...unit,\n'
        '  component: components[unit.component as keyof typeof components] as React.ComponentType<Record<string, unknown>>,\n'
        '}));\n'
        'const Original: React.FC<Record<string, unknown>> = () => React.createElement(PixelFilm, {payload: WORKBENCH_PAYLOAD});\n'
        'export const WORKBENCH = {...data, shots: visual(data.shots), transitions: visual(data.transitions),\n'
        '  captions: visual(data.captions), original: Original};\n', encoding='utf-8')
    status.update(supported=True, manifest=manifest,
                  editBranch='Saved workbench project JSON; it does not rewrite director JSON.',
                  generatedProject='build/remotion', entryPoint='src/workbench.ts')
    _write(output / 'workbench-manifest.json', status)
    return status


def require_supported(project_root: Path | str, resolved: dict | None = None) -> dict:
    root = Path(project_root).resolve()
    if resolved is None:
        resolved = json.loads((root / 'build/resolved-timeline.json').read_text(encoding='utf-8'))
    error = support_error(resolved)
    if error:
        raise ValueError(error)
    from .remotion_backend import verify_build
    verify_build(root, resolved)
    path = root / 'build/workbench-manifest.json'
    if not path.is_file():
        raise ValueError('Missing workbench manifest; rebuild this Remotion project.')
    status = json.loads(path.read_text(encoding='utf-8'))
    if status.get('contractVersion') != 1 or status.get('inputHash') != resolved['inputHash']:
        raise ValueError('Workbench manifest belongs to a different compiled timeline; rebuild the project.')
    if not status.get('supported'):
        raise ValueError(status.get('reason', 'This project cannot yet be imported into the workbench.'))
    if not (root / 'build/remotion/src/workbench.ts').is_file():
        raise ValueError('Missing generated src/workbench.ts; rebuild the project.')
    return status


def open_workbench(project_root: Path | str, skill_root: Path | str, port: int = 5208,
                   no_open: bool = False) -> dict:
    root, skill = Path(project_root).resolve(), Path(skill_root).resolve()
    require_supported(root)
    if not 1024 <= port <= 65535:
        raise ValueError('Workbench port must be between 1024 and 65535.')
    executable = shutil.which(os.environ.get('PIXEL_NODE') or 'node')
    if not executable:
        raise RuntimeError('Missing Node.js; put node on PATH or set PIXEL_NODE.')
    script = skill / 'workbench/scripts/open.mjs'
    if not script.is_file():
        raise ValueError('Missing bundled workbench/scripts/open.mjs.')
    command = [executable, str(script), str(root / 'build/remotion'), '--port', str(port)]
    if no_open:
        command.append('--no-open')
    result = subprocess.run(command, text=True)
    if result.returncode:
        raise RuntimeError(f'Workbench launch failed ({result.returncode}); inspect its output above.')
    return {'workbench': f'http://localhost:{port}/?import=project', 'project': str(root / 'build/remotion'),
            'editBranch': 'Save workbench project JSON separately; director sources remain independent.'}
