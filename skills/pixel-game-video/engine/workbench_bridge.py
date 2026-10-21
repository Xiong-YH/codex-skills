"""Build the editable workbench branch from the compiled Remotion timeline.

This is an adapter, not a second authoring timeline. The generated manifest and
initial clip times are derived only from resolved-timeline.json. Workbench JSON
saved later is an independent edit and is never written into director sources.
"""
from __future__ import annotations

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
    if resolved['project'].get('renderBackend', 'canvas') == 'canvas':
        return None  # The selected Canvas runtime executes inside live units.
    if resolved['project'].get('renderBackend') != 'remotion':
        return 'Unknown workbench render backend.'
    if any(shot['scene'] != 'scenes.focus-desk.v1' for shot in resolved['shots']):
        return 'The local workbench currently supports only native Remotion scenes.focus-desk.v1 shots.'
    if any(motion['recipe'] not in {'motion.camera-track.v1', 'motion.book-sweep.v1'}
           for shot in resolved['shots'] for motion in shot['motions']):
        return 'The local workbench cannot yet split this motion recipe into independent editable clips.'
    if any(motion['recipe'] == 'motion.book-sweep.v1' and index == 0
           for index, shot in enumerate(resolved['shots']) for motion in shot['motions']):
        return 'A workbench book-sweep transition requires a preceding focus-desk shot.'
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


def _canvas_visual_manifest(resolved: dict, payload: dict) -> dict:
    """Expose the compiled scene data, never a baked picture of the film."""
    project = resolved['project']
    shots, transitions = [], []
    transition_recipes = {
        'motion.focus-punch.v1', 'motion.mosaic-pullback.v1', 'motion.panel-slide.v1',
        'motion.pixel-iris.v1', 'motion.shatter-reveal.v1', 'motion.book-sweep.v1',
        'motion.shelf-travel.v1', 'motion.scene-to-card.v1', 'motion.match-dissolve.v1'}
    fields = [('params', '场景参数'), ('components', '信息组件'), ('objects', '道具'),
              ('performance', '人物姿态'), ('background', '背景素材'), ('replacement', '替换素材')]
    for index, shot in enumerate(resolved['shots']):
        props = {'shotIndex': index, 'sourceUnitId': shot['id'], 'actor': shot.get('actor') or ''}
        schema = [_schema('text', 'actor', '人物素材 ID（空为无人）', props['actor'])]
        for key, label in fields:
            value = shot.get(key, [] if key in ('components', 'objects', 'performance') else None)
            props[key + 'Json'] = json.dumps(value, ensure_ascii=False, indent=2)
            schema.append(_schema('textarea', key + 'Json', label + ' JSON', props[key + 'Json']))
        camera = [m for m in shot['motions'] if m['recipe'] not in transition_recipes]
        props['cameraJson'] = json.dumps(camera, ensure_ascii=False, indent=2)
        schema.append(_schema('textarea', 'cameraJson', '相机与局部动作 JSON', props['cameraJson']))
        label = shot.get('params', {}).get('heading') or shot.get('params', {}).get('label') or shot['id']
        shots.append({'id': shot['id'], 'label': label, 'from': shot['startFrame'],
                      'duration': shot['durationFrames'], 'component': 'CanvasShotUnit',
                      'props': props, 'schema': schema, 'cardId': shot['id'], 'cardName': label})
        for motion_index, motion in enumerate(shot['motions']):
            if motion['recipe'] not in transition_recipes:
                continue
            params = json.dumps(motion['params'], ensure_ascii=False, indent=2)
            transitions.append({'id': shot['id'] + '.' + motion['id'], 'label': motion['recipe'],
                'from': motion['startFrame'], 'duration': motion['endFrame'] - motion['startFrame'],
                'component': 'CanvasTransitionUnit', 'cardId': shot['id'] + '.' + motion['id'],
                'props': {'shotIndex': index, 'motionIndex': motion_index, 'paramsJson': params,
                          'outgoingShotId': resolved['shots'][index - 1]['id'] if index else '',
                          'incomingShotId': shot['id']},
                'schema': [_schema('textarea', 'paramsJson', '转场参数 JSON', params)]})
    overlays = []
    if resolved.get('progress'):
        progress = json.dumps(resolved['progress'], ensure_ascii=False, indent=2)
        overlays.append({'id': 'narrative-progress', 'label': '叙事进度', 'from': 0,
            'duration': resolved['durationFrames'], 'component': 'CanvasProgressUnit',
            'props': {'progressJson': progress}, 'schema': [_schema('textarea', 'progressJson', '进度配置 JSON', progress)]})
    manifest = _manifest_base(resolved, payload)
    manifest.update(shots=shots, transitions=transitions, overlays=overlays)
    return manifest


def _manifest_base(resolved: dict, payload: dict) -> dict:
    project, style = resolved['project'], payload['style']
    canvas = project.get('renderBackend', 'canvas') == 'canvas'
    defaults = {'title': .105, 'subtitle': .87, 'annotation': .22, 'label': .68}
    captions = []
    for index, cue in enumerate(resolved['cues']):
        # Leave Canvas's own defaults in charge (its subtitle baseline differs
        # from the native HTML text unit). Inspector still exposes explicit x/y.
        y = cue.get('y')
        if y is None:
            y = defaults.get(cue['role'], .5)
        props = {'cueIndex': index, 'role': cue['role'], 'text': cue['text'],
                 'fontSize': project['height'] * style.get('textRoles', {}).get(cue['role'], .03),
                 'color': style['colors'].get('accent', '#7ed5c8') if cue.get('accent') else style['colors'].get('ink', '#f5ebd4'),
                 'x': cue['x'] if cue.get('x') is not None else .5, 'y': y}
        captions.append({'id': cue['id'], 'label': cue['text'], 'from': cue['startFrame'],
            'duration': cue['endFrame'] - cue['startFrame'],
            'component': 'CanvasCaptionUnit' if canvas else 'CaptionUnit', 'props': props,
            'schema': [_schema('textarea', 'text', '文案', props['text']),
                       _schema('number', 'fontSize', '字号', props['fontSize'], min=12, max=140, step=1, unit='px'),
                       _schema('color', 'color', '颜色', props['color']),
                       _schema('slider', 'x', '水平位置', props['x'], min=.05, max=.95, step=.01),
                       _schema('slider', 'y', '垂直位置', props['y'], min=.03, max=.95, step=.01)],
            'cardId': cue['id'], 'cardName': cue['text']})
    return {'name': project['title'], 'fps': project['fps'], 'width': project['width'], 'height': project['height'],
            'total': resolved['durationFrames'], 'background': style['colors'].get('background', '#111820'),
            'revision': resolved['inputHash'], 'shots': [], 'transitions': [], 'captions': captions,
            'overlays': [], 'order': ['captions', 'overlays', 'transitions'], 'sfx': [], 'narration': [], 'bgm': []}


def _visual_manifest(resolved: dict, payload: dict) -> dict:
    if resolved['project'].get('renderBackend', 'canvas') == 'canvas':
        return _canvas_visual_manifest(resolved, payload)
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
            props = {'shotIndex': index, 'outgoingShotId': previous['id'], 'incomingShotId': shot['id'], 'motionIndex': motion_index,
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
    manifest = _manifest_base(resolved, payload)
    manifest.update(shots=shots, transitions=transitions)
    return manifest


def _pcm(path: Path):
    import numpy as np
    with wave.open(str(path), 'rb') as stream:
        if (stream.getsampwidth(), stream.getframerate(), stream.getnchannels()) != (2, 48000, 2):
            raise ValueError('Workbench parity expects the original 48kHz stereo PCM mix.')
        return np.frombuffer(stream.readframes(stream.getnframes()), dtype='<i2').reshape(-1, 2).astype('int32')


def _split_speech_music(root: Path, skill: Path, resolved: dict, public: Path) -> tuple[dict, dict]:
    """Split the current mix using a shared master envelope, then conserve PCM.

    Ducking and mastering are frozen at the authored mix. Subsequent edits move
    or scale these stems; they do not dynamically re-duck the other tracks.
    """
    import numpy as np
    directory = str(skill / 'modules/audio')
    sys.path.insert(0, directory)
    try:
        import mixer, narration
        original = _pcm(public / 'animation.wav')
        samples, fps = len(original), resolved['project']['fps']
        stems = []
        intervals = [(round(v['frame'] / fps * 48000), round(v['frame'] / fps * 48000) + v['samples'])
                     for v in resolved.get('narration', [])]
        duck = narration.duck_envelope(samples, intervals, resolved.get('mix', {}).get('speechDuck', .28))
        for event in resolved.get('audio', []):
            single = {**resolved, 'audio': [event]}
            raw, records = mixer.render_sfx(single)
            start = round(event['frame'] / fps * 48000)
            end = min(samples, start + records[0]['durationSamples'])
            # Retain only this event's audible interval. A full-film matrix per
            # event makes ordinary multi-minute videos consume tens of GB.
            stems.append(('sfx', event['id'], start, end, raw[start:end] * duck[start:end, None]))
        for cue in resolved.get('narration', []):
            single = {**resolved, 'narration': [cue]}
            raw, _ = narration.mix(single, root, np.zeros((samples, 2)))
            start = round(cue['frame'] / fps * 48000)
            end = start + cue['samples']
            stems.append(('narration', cue['id'], start, end, raw[start:end].copy()))
        if resolved.get('bgm'):
            import music
            raw, _ = music.render(resolved, root, samples)
            cue = resolved['bgm']
            start, end = (round(cue[field] / fps * 48000) for field in ('frame', 'endFrame'))
            stems.append(('bgm', cue.get('id', 'bgm'), start, end, raw[start:end].copy()))
        # Drop the last full-film render before allocating mastering buffers.
        if stems:
            del raw
        groups = {'sfx': [], 'narration': [], 'bgm': []}
        if not stems:
            return groups, {'maxAbsPcmError': int(np.abs(original).max()), 'events': [], 'empty': True}
        total = np.zeros((samples, 2))
        for _, _, start, end, part in stems:
            total[start:end] += part
        gain = resolved.get('mix', {}).get('masterGain', .8)
        factor = np.full_like(total, gain)
        np.divide(.8 * np.tanh(total * gain / .8), total, out=factor, where=total != 0)
        quantized = []
        reconstructed = np.zeros_like(original)
        # Select the largest contribution incrementally instead of stacking N
        # full-film arrays. Ties keep the first stem, matching numpy.argmax.
        owner = np.full(original.shape, -1, dtype='int32')
        largest = np.zeros_like(total)
        for index, (_, _, start, end, part) in enumerate(stems):
            pcm = np.rint(part * factor[start:end] * 32767).astype('int32')
            quantized.append(pcm)
            reconstructed[start:end] += pcm
            magnitude = np.abs(part)
            wins = magnitude > largest[start:end]
            np.copyto(largest[start:end], magnitude, where=wins)
            np.copyto(owner[start:end], index, where=wins)
        residual = original - reconstructed
        # Assign rounding remainder to the largest active contribution at each
        # sample/channel, without introducing sound outside a stem's interval.
        for index, ((_, _, start, end, _), pcm) in enumerate(zip(stems, quantized)):
            pcm += np.where(owner[start:end] == index, residual[start:end], 0)
        reconstructed.fill(0)
        records = []
        for index, ((kind, ident, start, end, _), pcm) in enumerate(zip(stems, quantized)):
            part = pcm
            if part.size and (part.min() < -32768 or part.max() > 32767):
                raise ValueError('Independent workbench stem exceeds PCM limits; lower source levels.')
            safe = re.sub(r'[^A-Za-z0-9_.-]+', '-', ident).strip('-') or 'audio'
            relative = f'audio/{kind}/{index + 1:02d}-{safe}.wav'
            path = public / relative
            path.parent.mkdir(parents=True, exist_ok=True)
            with wave.open(str(path), 'wb') as stream:
                stream.setparams((2, 2, 48000, 0, 'NONE', 'not compressed'))
                stream.writeframes(part.astype('<i2').tobytes())
            reconstructed[start:end] += _pcm(path)
            groups[kind].append({'from': start * fps // 48000,
                                 'duration': max(1, math.ceil((end - start) / 48000 * fps)),
                                 'src': relative, 'volume': 1, 'label': ident})
            records.append({'id': ident, 'kind': kind, 'src': relative, 'sample': start, 'samples': end - start})
        difference = np.abs(reconstructed - original)
        return groups, {'sampleRate': 48000, 'channels': 2, 'events': records,
                        'maxAbsPcmError': int(difference.max()), 'empty': False,
                        'stemStorageSamples': sum(end - start for _, _, start, end, _ in stems),
                        'denseStemStorageSamples': samples * len(stems),
                        'gainPolicy': 'shared-master-envelope-with-PCM-rounding-conservation',
                        'editPolicy': 'Source ducking/fades/master envelope are baked; edits do not dynamically re-duck other clips.'}
    finally:
        sys.path.remove(directory)


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
        groups, audio = _split_speech_music(root, skill, resolved, generated / 'public')
        manifest.update(groups)
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
    canvas = resolved['project'].get('renderBackend', 'canvas') == 'canvas'
    names = ['CanvasShotUnit', 'CanvasTransitionUnit', 'CanvasCaptionUnit', 'CanvasProgressUnit'] if canvas else ['DeskShotUnit', 'CaptionUnit', 'BookSweepUnit']
    imports = ("import {" + ', '.join(names + (['CanvasOriginal'] if canvas else [])) + "} from './" +
               ('CanvasWorkbenchUnits' if canvas else 'WorkbenchUnits') + "';\n")
    original = ('React.createElement(CanvasOriginal)' if canvas else
                'React.createElement(PixelFilm, {payload: WORKBENCH_PAYLOAD})')
    (source / 'workbench.ts').write_text(
        "// Generated from resolved-timeline.json; edits live in saved workbench project JSON.\n"
        "import React from 'react';\nimport {PixelFilm} from './Root';\n" + imports +
        "import {WORKBENCH_PAYLOAD} from './workbench-payload';\n" +
        f'const data = {serialized};\n' +
        'const components = {' + ', '.join(names) + '};\n' +
        'const visual = <T extends {component: string}>(units: T[]) => units.map(unit => ({...unit,\n'
        '  component: components[unit.component as keyof typeof components] as React.ComponentType<Record<string, unknown>>,\n'
        '}));\n' +
        'const Original: React.FC<Record<string, unknown>> = () => ' + original + ';\n' +
        'export const WORKBENCH = {...data, shots: visual(data.shots), transitions: visual(data.transitions),\n'
        '  captions: visual(data.captions), overlays: visual(data.overlays), original: Original};\n', encoding='utf-8')
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
    if resolved['project'].get('renderBackend', 'canvas') == 'canvas':
        from .canvas_workbench import verify_build
    else:
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
