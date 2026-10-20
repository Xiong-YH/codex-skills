"""Export a verified workbench branch to a portable, neutral Jianying draft.

Only the optional export command imports pyJianYingDraft. Rendering remains in
Remotion: its clean plate bakes camera/scene/transition/heading animation, while
caption text and individual audio clips become native Jianying segments.
"""
from __future__ import annotations

import copy
import hashlib
import importlib.metadata
import json
import math
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import subprocess
import tempfile
import uuid


def frame_us(frame: float, fps: int) -> int:
    """Round absolute endpoints independently; never round duration in isolation."""
    return round(frame * 1_000_000 / fps)


def frame_range(start: int, end: int, fps: int) -> dict:
    if end <= start:
        raise ValueError('A Jianying segment requires an end after its start.')
    first, last = frame_us(start, fps), frame_us(end, fps)
    return {'start': first, 'duration': last - first}


def _number(value, name: str, *, minimum=None, maximum=None) -> float:
    if type(value) not in (int, float) or not math.isfinite(value):
        raise ValueError(f'{name} must be a finite number.')
    if minimum is not None and value < minimum or maximum is not None and value > maximum:
        raise ValueError(f'{name} is outside its allowed range.')
    return value


def _integer(value, name: str, *, minimum=0) -> int:
    if type(value) is not int or value < minimum:
        raise ValueError(f'{name} must be an integer >= {minimum}.')
    return value


def _source_key(manifest: dict) -> str:
    return f"{manifest['name']}@{manifest['total']}f#{manifest['revision']}"


def _known_cards(manifest: dict) -> dict:
    known = {}
    for kind, key in [('shot', 'shots'), ('transition', 'transitions'), ('caption', 'captions'), ('overlay', 'overlays')]:
        for unit in manifest.get(key, []):
            ident = f"proj:{kind}:{unit.get('cardId', unit['id'])}"
            if ident in known and known[ident]['unit']['component'] != unit['component']:
                raise ValueError(f'Ambiguous manifest card {ident}; rebuild with unique card ids.')
            known.setdefault(ident, {'kind': kind, 'unit': unit})
    return known


def default_project(manifest: dict) -> dict:
    """A deterministic equivalent of workbench's initial manifest import."""
    tracks = []
    for kind in [*(key[:-1] for key in manifest.get('order', ['transitions', 'captions', 'overlays'])), 'shot']:
        units = manifest.get(kind + 's', [])
        clips = []
        for unit in units:
            start = max(0, round(unit['from']))
            duration = max(2, min(round(unit['duration']), manifest['total'] - start))
            clips.append({'id': f"{kind}-{unit['id']}", 'cardId': f"proj:{kind}:{unit.get('cardId', unit['id'])}",
                          'start': start, 'duration': duration, 'inOffset': 0, 'speed': 1, 'opacity': 1,
                          'scale': 1, 'x': 0, 'y': 0, 'props': copy.deepcopy(unit.get('props', {})),
                          'label': unit.get('label', unit['id'])})
        if clips:
            tracks.append({'id': kind, 'name': kind, 'clips': clips})
    for key in ('bgm', 'sfx'):
        clips = []
        for index, audio in enumerate(manifest.get(key, [])):
            start = max(0, round(audio['from']))
            clips.append({'id': f'{key}-{index}', 'cardId': 'audio-clip', 'start': start,
                          'duration': max(2, min(round(audio.get('duration', 90)), manifest['total'] - start)),
                          'inOffset': 0, 'speed': 1, 'opacity': 1, 'scale': 1, 'x': 0, 'y': 0,
                          'props': {'file': audio['src'], 'volume': audio['volume']}, 'label': audio.get('label', audio['src'])})
        if clips:
            tracks.append({'id': key, 'name': key, 'clips': clips})
    return {'name': manifest['name'], 'source': _source_key(manifest), 'fps': manifest['fps'],
            'width': manifest['width'], 'height': manifest['height'], 'tracks': tracks,
            'background': manifest.get('background', '#111820')}


def build_export_plan(manifest: dict, project: dict | None = None) -> dict:
    """Validate visible cards and derive cuts/text/audio without optional packages."""
    project = copy.deepcopy(project) if project is not None else default_project(manifest)
    if project.get('themeId') or project.get('themeColors'):
        raise ValueError('Native Jianying captions currently require the default theme; clear themeId/themeColors before exporting.')
    for key in ('fps', 'width', 'height'):
        if _integer(project.get(key), key, minimum=1) != manifest[key]:
            raise ValueError(f'Workbench {key} differs from the connected manifest; render a matching project plate.')
    if not isinstance(project.get('tracks'), list):
        raise ValueError('Workbench JSON must have a tracks array.')
    known = _known_cards(manifest)
    visible, hidden = [], []
    ids = set()
    total = 0
    for track_index, track in enumerate(project['tracks']):
        if not isinstance(track, dict) or not isinstance(track.get('clips'), list):
            raise ValueError('Each workbench track requires a clips array.')
        if track.get('hidden'):
            hidden.append(track.get('id', track.get('name', str(track_index))))
            continue
        for clip_index, clip in enumerate(track['clips']):
            if not isinstance(clip, dict) or not isinstance(clip.get('props', {}), dict):
                raise ValueError('Each workbench clip requires an object with props.')
            ident = clip.get('id')
            if not isinstance(ident, str) or not ident or ident in ids:
                raise ValueError('Visible workbench clips require unique, nonempty ids.')
            ids.add(ident)
            card = clip.get('cardId')
            if card == 'audio-clip':
                kind, unit = 'audio', None
            elif card in known:
                kind, unit = known[card]['kind'], known[card]['unit']
            else:
                raise ValueError(f'Unsupported visible card {card!r}; it cannot be silently omitted from Jianying export.')
            start = _integer(clip.get('start'), f'{ident}.start')
            duration = _integer(clip.get('duration'), f'{ident}.duration', minimum=1)
            _number(clip.get('inOffset', 0), f'{ident}.inOffset', minimum=0)
            _number(clip.get('speed', 1), f'{ident}.speed', minimum=.01, maximum=100)
            _number(clip.get('opacity', 1), f'{ident}.opacity', minimum=0, maximum=1)
            _number(clip.get('scale', 1), f'{ident}.scale', minimum=.01, maximum=100)
            for axis in ('x', 'y'):
                _number(clip.get(axis, 0), f'{ident}.{axis}')
            props = {**(unit.get('props', {}) if unit else {}), **clip.get('props', {})}
            visible.append({'id': ident, 'cardId': card, 'kind': kind, 'startFrame': start,
                            'endFrame': start + duration, 'durationFrames': duration,
                            'trackIndex': track_index, 'clipIndex': clip_index, 'props': props,
                            'inOffset': clip.get('inOffset', 0), 'speed': clip.get('speed', 1),
                            'opacity': clip.get('opacity', 1), 'scale': clip.get('scale', 1),
                            'x': clip.get('x', 0), 'y': clip.get('y', 0), 'label': clip.get('label', ident)})
            total = max(total, start + duration)
    if total < 2:
        raise ValueError('No visible workbench content to export.')
    baked = [clip for clip in visible if clip['kind'] in ('shot', 'transition', 'overlay')]
    captions = [clip for clip in visible if clip['kind'] == 'caption']
    for caption in captions:
        for visual in baked:
            if caption['trackIndex'] > visual['trackIndex'] and max(caption['startFrame'], visual['startFrame']) < min(caption['endFrame'], visual['endFrame']):
                raise ValueError('A caption below an overlapping baked visual cannot be reproduced as native text; move the caption track above the visuals first.')
    bounds = {0, total}
    for clip in visible:
        if clip['kind'] == 'shot' and clip['opacity'] > 0:
            bounds.update((clip['startFrame'], clip['endFrame']))
    ordered = sorted(bounds)
    fps = project['fps']
    cuts = [{'startFrame': a, 'endFrame': b, **frame_range(a, b, fps)} for a, b in zip(ordered, ordered[1:])]
    return {'project': project, 'fps': fps, 'width': project['width'], 'height': project['height'],
            'totalFrames': total, 'durationMicroseconds': frame_us(total, fps), 'cuts': cuts,
            'captions': sorted(captions, key=lambda c: (-c['trackIndex'], c['clipIndex'])),
            'audio': [clip for clip in visible if clip['kind'] == 'audio'], 'bakedVisuals': baked,
            'hiddenTracksSkipped': hidden, 'sourceRevisionMatches': project.get('source') == _source_key(manifest),
            'savedSource': project.get('source'), 'connectedSource': _source_key(manifest)}


def resolve_audio(root: Path, skill: Path, relative: str) -> Path:
    if not isinstance(relative, str) or not relative or '\\' in relative or ':' in relative:
        raise ValueError('Audio files must use a safe public-relative path.')
    parts = PurePosixPath(relative)
    if parts.is_absolute() or '..' in parts.parts:
        raise ValueError('Audio file path escapes the public assets directory.')
    if relative.startswith('foundation-sfx/'):
        base = skill / 'modules/audio/assets/arcade-motion'
        candidates = [(base, base / relative[len('foundation-sfx/'):])]
    else:
        candidates = [(base, base / relative) for base in (root / 'build/remotion/public', skill / 'workbench/public')]
    for base, path in candidates:
        target = path.resolve()
        if target.is_relative_to(base.resolve()) and target.is_file():
            return target
    raise ValueError(f'Audio file is missing or outside the allowed public assets: {relative}')


def _probe(path: Path) -> dict:
    executable = os.environ.get('PIXEL_FFPROBE') or shutil.which('ffprobe')
    if not executable:
        raise RuntimeError('FFprobe is required to verify the clean plate.')
    result = subprocess.run([executable, '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(path)], capture_output=True, text=True)
    if result.returncode:
        raise ValueError(f'Cannot inspect plate: {result.stderr.strip()}')
    return json.loads(result.stdout)


def validate_plate(plate: Path, plan: dict) -> dict:
    if not plate.is_file():
        raise ValueError(f'Clean plate does not exist: {plate}')
    probe = _probe(plate)
    videos = [stream for stream in probe['streams'] if stream['codec_type'] == 'video']
    if len(videos) != 1 or any(stream['codec_type'] == 'audio' for stream in probe['streams']):
        raise ValueError('Plate must have one video stream and no audio; render plate=true with muted audio.')
    video = videos[0]
    numerator, denominator = map(int, video['avg_frame_rate'].split('/'))
    duration = float(video.get('duration', probe['format']['duration']))
    if video['width'] != plan['width'] or video['height'] != plan['height'] or numerator / denominator != plan['fps']:
        raise ValueError('Plate dimensions/fps differ from the workbench project.')
    if abs(duration - plan['totalFrames'] / plan['fps']) > .5 / plan['fps']:
        raise ValueError('Plate duration differs from the exact visible workbench timeline; render a fresh matching clean plate.')
    if 'nb_frames' in video and int(video['nb_frames']) != plan['totalFrames']:
        raise ValueError('Plate frame count differs from the visible workbench timeline.')
    return {'width': video['width'], 'height': video['height'], 'fps': numerator / denominator,
            'durationSeconds': duration, 'frames': video.get('nb_frames'), 'audioStreams': 0}


def _hex_rgb(color: str) -> tuple:
    if not isinstance(color, str) or not re.fullmatch(r'#[0-9a-fA-F]{6}', color):
        raise ValueError(f'Native Jianying text requires a #RRGGBB color, got {color!r}.')
    return tuple(int(color[index:index + 2], 16) / 255 for index in (1, 3, 5))


def _caption_style(caption: dict, payload: dict, plan: dict) -> dict:
    props, style = caption['props'], payload['style']
    cue_index = _integer(props.get('cueIndex'), 'caption.cueIndex')
    if cue_index >= len(payload['resolved']['cues']):
        raise ValueError('Caption references an unavailable source cue.')
    cue = payload['resolved']['cues'][cue_index]
    text = props.get('text', cue['text'])
    if not isinstance(text, str):
        raise ValueError('Caption text must be a string.')
    width, height = plan['width'], plan['height']
    size = _number(props.get('fontSize', height * style.get('textRoles', {}).get(cue['role'], .03)), 'caption.fontSize', minimum=1)
    color = props.get('color', style['colors'].get('ink', '#f5ebd4'))
    x = _number(props.get('x', .5), 'caption.x')
    y = _number(props.get('y', .87), 'caption.y')
    scale = caption['scale']
    center_x = width / 2 + (x * width - width / 2) * scale + caption['x']
    center_y = height / 2 + (y * height - height / 2) * scale + caption['y']
    return {'text': text, 'size': size / (height / 100), 'fontSizePixels': size,
            'color': _hex_rgb(color), 'alpha': caption['opacity'], 'align': 1,
            'scale_x': scale, 'scale_y': scale, 'transform_x': (center_x - width / 2) / (width / 2),
            'transform_y': (height / 2 - center_y) / (height / 2),
            'subtitle': cue['role'] == 'subtitle', 'background': style.get('subtitle', {}).get('background', '#101720'),
            'backgroundAlpha': style.get('subtitle', {}).get('opacity', .86)}


def export_jianying(project_root: Path | str, destination: Path | str, *, plate: Path | str,
                   workbench_project: Path | str | dict | None = None, skill_root: Path | str | None = None) -> dict:
    root = Path(project_root).resolve()
    skill = Path(skill_root).resolve() if skill_root else Path(__file__).resolve().parents[1]
    destination, plate = Path(destination).resolve(), Path(plate).resolve()
    if destination.exists():
        raise ValueError(f'Jianying destination already exists; choose a new directory: {destination}')
    from .compiler import compile_project
    from .workbench_bridge import require_supported
    resolved = compile_project(root, skill_root=skill)
    status = require_supported(root, resolved)
    manifest = status['manifest']
    payload = json.loads((root / 'build/remotion/public/payload.json').read_text(encoding='utf-8'))
    if isinstance(workbench_project, (Path, str)):
        project = json.loads(Path(workbench_project).read_text(encoding='utf-8'))
    else:
        project = workbench_project
    plan = build_export_plan(manifest, project)
    plate_info = validate_plate(plate, plan)
    try:
        import pyJianYingDraft as draft
    except ImportError as exc:
        raise RuntimeError('Jianying export is optional: install requirements-jianying.txt with the Python interpreter used by this command.') from exc
    version = importlib.metadata.version('pyJianYingDraft')
    if version != '0.3.0':
        raise RuntimeError(f'Jianying exporter requires pyJianYingDraft==0.3.0; found {version}.')
    destination.parent.mkdir(parents=True, exist_ok=True)
    warnings = ['Scene headings, camera/scene motion, transitions and overlays are baked into the clean plate.',
                'Native caption font/background layout is an approximation and may need adjustment in Jianying.',
                'Generation does not install this draft. The 15-second demo was opened and played in Mac Jianying 11.2.0 build 477; each new draft still needs target-application checks. Native text editing previews and subjective audio listening were not reviewed.']
    if not plan['sourceRevisionMatches']:
        warnings.append('Saved source revision differs: this export uses the currently connected components/media and does not claim parity with the old source revision.')
    with tempfile.TemporaryDirectory(prefix='.pixel-jianying-', dir=destination.parent) as temporary:
        temporary = Path(temporary)
        script = draft.DraftFolder(str(temporary)).create_draft(destination.name, plan['width'], plan['height'], fps=plan['fps'], maintrack_adsorb=False)
        staged = temporary / destination.name
        resources = staged / 'Resources'
        resources.mkdir()
        shutil.copy2(plate, resources / 'plate.mp4')
        packaged = {str((resources / 'plate.mp4').resolve()): 'Resources/plate.mp4'}
        source_media = [{'file': 'Resources/plate.mp4', 'sha256': hashlib.sha256(plate.read_bytes()).hexdigest(), 'kind': 'plate'}]
        script.append_track(draft.TrackSpec(draft.TrackType.video, name='底片 · 镜头可重排'))
        video = draft.VideoMaterial(str(resources / 'plate.mp4'))
        # MediaInfo may round durations to whole milliseconds. The ffprobe frame
        # validation above establishes the exact valid endpoint for this plate.
        if abs(video.duration - plan['durationMicroseconds']) <= 1000:
            video.duration = plan['durationMicroseconds']
        for cut in plan['cuts']:
            timerange = draft.Timerange(cut['start'], cut['duration'])
            script.add_segment(draft.VideoSegment(video, timerange, source_timerange=timerange, volume=0), '底片 · 镜头可重排')
        captions = []
        for index, caption in enumerate(plan['captions']):
            styles = _caption_style(caption, payload, plan)
            track = f'字幕 {index + 1}'
            script.append_track(draft.TrackSpec(draft.TrackType.text, name=track))
            rng = frame_range(caption['startFrame'], caption['endFrame'], plan['fps'])
            segment = draft.TextSegment(styles['text'], draft.Timerange(**rng),
                style=draft.TextStyle(size=styles['size'], bold=True, color=styles['color'], alpha=1, align=1,
                                      auto_wrapping=True, max_line_width=.86),
                clip_settings=draft.ClipSettings(alpha=styles['alpha'], scale_x=styles['scale_x'], scale_y=styles['scale_y'],
                                                 transform_x=styles['transform_x'], transform_y=styles['transform_y']),
                background=draft.TextBackground(color=styles['background'], alpha=styles['backgroundAlpha']) if styles['subtitle'] else None)
            script.add_segment(segment, track)
            captions.append({'id': caption['id'], 'track': track, **rng, 'text': styles['text'], 'sourceStyle': styles})
        audios = []
        for index, audio in enumerate(plan['audio']):
            relative = audio['props'].get('file')
            source = resolve_audio(root, skill, relative)
            extension = source.suffix.lower()
            digest = hashlib.sha256(source.read_bytes()).hexdigest()
            name = f'{index + 1:02d}-{digest[:12]}{extension}'
            media = resources / name
            shutil.copy2(source, media)
            packaged[str(media.resolve())] = 'Resources/' + name
            source_media.append({'file': 'Resources/' + name, 'sha256': digest, 'kind': 'audio', 'publicSource': relative})
            material = draft.AudioMaterial(str(media))
            source_start = frame_us(math.floor(audio['inOffset'] + .5), plan['fps'])
            if source_start >= material.duration:
                raise ValueError(f"Audio trim point exceeds the file: {audio['label']}")
            target = frame_range(audio['startFrame'], audio['endFrame'], plan['fps'])
            source_duration = min(round(target['duration'] * audio['speed']), material.duration - source_start)
            volume = _number(audio['props'].get('volume', 1), 'audio.volume', minimum=0)
            track = f'音频 {index + 1} · {audio["label"]}'
            script.append_track(draft.TrackSpec(draft.TrackType.audio, name=track))
            segment = draft.AudioSegment(material, draft.Timerange(target['start'], target['duration']),
                source_timerange=draft.Timerange(source_start, source_duration), speed=audio['speed'], volume=volume)
            script.add_segment(segment, track)
            audios.append({'id': audio['id'], 'track': track, 'file': 'Resources/' + name, 'targetStartMicroseconds': target['start'],
                           'targetDurationMicroseconds': segment.target_timerange.duration, 'sourceStartMicroseconds': source_start,
                           'sourceDurationMicroseconds': source_duration, 'speed': audio['speed'], 'volume': volume})
        script.save()
        content_path = staged / 'draft_content.json'
        content = json.loads(content_path.read_text(encoding='utf-8'))
        content['id'] = uuid.uuid4().hex
        content['name'] = plan['project'].get('name', destination.name)
        for key in ('videos', 'audios'):
            for material in content['materials'].get(key, []):
                original = material.get('path')
                if original not in packaged:
                    raise ValueError('Generated draft contains a media reference outside its Resources package.')
                material['path'] = packaged[original]
        content['platform'] = {}
        content['last_modified_platform'] = {}
        content_path.write_text(json.dumps(content, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        meta_path = staged / 'draft_meta_info.json'
        meta = json.loads(meta_path.read_text(encoding='utf-8'))
        meta.update(draft_id=content['id'], draft_name=plan['project'].get('name', destination.name), draft_root_path='', draft_fold_path='',
                    tm_duration=plan['durationMicroseconds'])
        meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        install = skill / 'engine/jianying_install.py'
        platforms = skill / 'engine/vendor/jianying'
        if not install.is_file() or not platforms.is_dir():
            raise ValueError('Jianying portable export requires the bundled installation script and platform adapters.')
        shutil.copy2(install, staged / 'install.py')
        shutil.copytree(platforms, staged / '_platforms', ignore=shutil.ignore_patterns('__pycache__', '*.pyc'))
        export = {'contractVersion': 1, 'format': 'neutral-jianying-draft', 'pyJianYingDraft': version,
                  'inputHash': resolved['inputHash'], 'sourceRevisionMatches': plan['sourceRevisionMatches'],
                  'savedSource': plan['savedSource'], 'connectedSource': plan['connectedSource'],
                  'fps': plan['fps'], 'width': plan['width'], 'height': plan['height'], 'totalFrames': plan['totalFrames'],
                  'durationMicroseconds': plan['durationMicroseconds'], 'plate': plate_info, 'shots': plan['cuts'],
                  'nativeCaptions': captions, 'nativeAudio': audios, 'media': source_media,
                  'hiddenTracksSkipped': plan['hiddenTracksSkipped'], 'deviceFingerprintRead': False,
                  'installedIntoJianying': False, 'warnings': warnings}
        (staged / 'export-manifest.json').write_text(json.dumps(export, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        (staged / 'workbench.project.json').write_text(json.dumps(plan['project'], ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        (staged / 'README.md').write_text(
            '# Portable Jianying draft\n\nThis neutral package contains no local device fingerprint. Media paths are relative to Resources/. '
            'The plate bakes scene headings/motion/transitions; caption text and audio clips are editable native tracks.\n\n'
            'To check installation prerequisites on the receiving computer: `python install.py --check`. '
            'Completely quit Jianying, then install under a new, unused name with `python install.py --name NEW_NAME`. '
            'Existing drafts are never overwritten. The installer detects the Mac application version: exactly 11.2.0 supports '
            'the tested platform record containing only os=mac and app_version=11.2.0, without device identifiers or a plaintext donor. '
            'Other Mac versions require a usable local plaintext donor and stop if none is available. '
            'The actual 11.2.0 app can be named VideoFusion-macOS.app; save and Cmd+Q before installing. '
            'A standalone tray helper may remain after the main app and editing helpers exit; no process is force-quit. '
            'Installed Mac platform metadata stays on that computer and is not added to this package.\n\n'
            'The 15-second demo was opened and played to its end in Mac Jianying 11.2.0 build 477, with 3 shot segments, '
            '3 native text segments and 4 audio materials loaded and native text properties inspected. '
            'Existing projects were preserved. Native subtitle-edit previews, manual shot retiming and subjective audio listening '
            'were not reviewed. Other Mac versions and Windows still require their own application verification.\n\n'
            + '\n'.join('- ' + warning for warning in warnings) + '\n', encoding='utf-8')
        os.replace(staged, destination)
    return {'draft': str(destination), 'manifest': str(destination / 'export-manifest.json'),
            'totalFrames': plan['totalFrames'], 'nativeCaptionCount': len(captions), 'nativeAudioCount': len(audios),
            'installed': False, 'sourceRevisionMatches': plan['sourceRevisionMatches'], 'warnings': warnings}
