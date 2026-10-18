"""Fixed-frame browser rendering, FFmpeg encoding, and decoded-media verification.

The CLI builds first. This module deliberately consumes a completed build and
never changes authoring data. Technical checks do not approve visual/audio quality.
"""
from __future__ import annotations

import hashlib
import json
import math
import os
from pathlib import Path
import platform
import re
import shutil
import subprocess
import sys
import tempfile
from fractions import Fraction
from datetime import datetime, timezone
import wave


ENGINE = Path(__file__).resolve().parent


def _json(path: Path, data: dict) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def _hash(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open('rb') as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def _executable(environment: str, fallback: str) -> str:
    value = os.environ.get(environment) or fallback
    found = shutil.which(value)
    if not found:
        raise RuntimeError(f'Missing executable {fallback}; put it on PATH or set {environment}.')
    return found


def _run(command: list[str], *, binary: bool = False) -> bytes | str:
    result = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                            creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0)
    if result.returncode:
        message = result.stderr.decode('utf-8', errors='replace').strip()
        raise RuntimeError(f'{Path(command[0]).name} failed ({result.returncode}): {message[-5000:]}')
    return result.stdout if binary else result.stdout.decode('utf-8', errors='replace')


def _version(executable: str) -> str:
    result = _run([executable, '-version'])
    return result.splitlines()[0].strip() if result else 'unknown'


def _read_contract(root: Path, start_frame: int, end_frame: int | None) -> tuple[dict, int]:
    timeline = root / 'build' / 'resolved-timeline.json'
    if not timeline.is_file() or not (root / 'build' / 'film.html').is_file():
        raise ValueError('Missing built timeline or film.html; run build before render.')
    resolved = json.loads(timeline.read_text(encoding='utf-8'))
    project = resolved.get('project', {})
    for key in ('width', 'height', 'fps'):
        value = project.get(key)
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or value <= 0:
            raise ValueError(f'Compiled project.{key} must be a positive finite number.')
    if any(not isinstance(project[key], int) or project[key] % 2 for key in ('width', 'height')):
        raise ValueError('H.264 yuv420p output requires positive even integer width and height.')
    duration = resolved.get('durationFrames')
    if isinstance(duration, bool) or not isinstance(duration, int) or duration < 1:
        raise ValueError('Compiled durationFrames must be a positive integer.')
    if not re.fullmatch(r'[a-fA-F0-9]{64}', str(resolved.get('inputHash', ''))):
        raise ValueError('Compiled timeline must include a SHA-256 inputHash.')
    last = duration if end_frame is None else end_frame
    if any(isinstance(value, bool) or not isinstance(value, int) for value in (start_frame, last)):
        raise ValueError('Source start/end must be integer frame indices.')
    if not 0 <= start_frame < last <= duration:
        raise ValueError('Source frame range must be inside the timeline; end_frame is exclusive.')
    if last - start_frame < 2:
        raise ValueError('A video render requires at least two frames.')
    return resolved, last


def _build_bindings(root: Path, input_hash: str) -> dict:
    """Check the compiled lock against today's source/runtime, without recompiling."""
    lock_path = root / 'build' / 'project-lock.json'
    if not lock_path.is_file():
        return {'buildLock': False, 'currentSourceFiles': False, 'currentRuntimeFiles': False}
    lock = json.loads(lock_path.read_text(encoding='utf-8'))

    def matches(base: Path, entries: dict) -> bool:
        if not entries:
            return False
        for relative, expected in entries.items():
            target = (base / relative).resolve()
            if not target.is_relative_to(base) or not target.is_file() or _hash(target) != expected:
                return False
        return True

    authoring_valid = True
    project_file = root / 'project.json'
    if project_file.is_file() and json.loads(project_file.read_text(encoding='utf-8-sig')).get('authoringMode') == 'director':
        mapping_path = root / 'source-map.json'
        if not mapping_path.is_file():
            authoring_valid = False
        else:
            mapping = json.loads(mapping_path.read_text(encoding='utf-8-sig'))
            source_hashes = mapping.get('sourceHashes', {})
            authoring_valid = bool(source_hashes)
            for relative, expected in source_hashes.items():
                source = (root / relative).resolve()
                if not source.is_relative_to(root.parent) or not source.is_file() or _hash(source) != expected:
                    authoring_valid = False
                    break
    return {'buildLock': lock.get('inputHash') == input_hash,
            'currentSourceFiles': matches(root, lock.get('inputFiles', {})),
            'currentRuntimeFiles': matches(ENGINE.parent, lock.get('runtimeFiles', {})),
            'currentAuthoringSources': authoring_valid}


def _audio_slice(source: Path, target: Path, first: int, last: int, fps: float) -> dict:
    if not source.is_file():
        raise ValueError('Missing build/animation-sfx.wav; build audio or request a silent render.')
    with wave.open(str(source), 'rb') as audio:
        if audio.getcomptype() != 'NONE':
            raise ValueError('Built audio must be an uncompressed PCM WAV.')
        rate = audio.getframerate()
        start_sample = round(Fraction(first * rate) / Fraction(str(fps)))
        end_sample = round(Fraction(last * rate) / Fraction(str(fps)))
        if end_sample > audio.getnframes():
            raise ValueError('Built WAV is shorter than the requested frame range; rebuild audio.')
        audio.setpos(start_sample)
        with wave.open(str(target), 'wb') as sliced:
            sliced.setparams(audio.getparams())
            remaining = end_sample - start_sample
            while remaining:
                count = min(remaining, rate)
                sliced.writeframesraw(audio.readframes(count))
                remaining -= count
        return {'source': 'build/animation-sfx.wav', 'sourceSha256': _hash(source),
                'sourceSampleRate': rate, 'startSample': start_sample, 'endSample': end_sample,
                'startSeconds': start_sample / rate, 'endSeconds': end_sample / rate,
                'roundingToleranceSeconds': 0.5 / rate}


def _encode(ffmpeg: str, frames: Path, output: Path, audio: Path | None,
            config: dict, frame_count: int, work: Path) -> str:
    from PIL import Image
    encoders = _run([ffmpeg, '-hide_banner', '-encoders'])
    codec = next((name for name in ('libx264', 'libo264rt', 'libopenh264')
                  if re.search(r'\b' + name + r'\b', encoders)), None)
    if codec is None:
        raise RuntimeError('FFmpeg must provide a software H.264 encoder (libx264, libo264rt, or libopenh264).')
    width, height, fps = config['width'], config['height'], config['fps']
    command = [ffmpeg, '-hide_banner', '-y', '-f', 'rawvideo', '-pixel_format', 'rgb24',
               '-video_size', f'{width}x{height}', '-framerate', str(fps), '-i', 'pipe:0']
    if audio:
        command += ['-i', str(audio)]
    command += ['-map', '0:v:0']
    if audio:
        command += ['-map', '1:a:0']
    command += ['-c:v', codec]
    if codec == 'libx264':
        command += ['-crf', '17', '-preset', 'medium']
    else:
        command += ['-b:v', str(max(2_000_000, round(width * height * fps * 0.10))), '-g', str(round(fps * 2))]
    command += ['-pix_fmt', 'yuv420p', '-color_primaries', 'bt709', '-color_trc', 'bt709',
                '-colorspace', 'bt709', '-r', str(fps), '-frames:v', str(frame_count)]
    if audio:
        command += ['-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2']
    else:
        command += ['-an']
    command += ['-t', format(frame_count / fps, '.12g'), '-movflags', '+faststart', str(output)]
    with (work / 'encode.log').open('wb') as log:
        process = subprocess.Popen(command, stdin=subprocess.PIPE, stdout=log, stderr=log,
                                   creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0)
        try:
            for index in range(frame_count):
                with Image.open(frames / f'frame_{index:06d}.png') as frame:
                    if frame.size != (width, height):
                        raise ValueError(f'Unexpected dimensions in rendered frame {index}.')
                    process.stdin.write(frame.convert('RGB').tobytes())
            process.stdin.close()
            code = process.wait()
        except BaseException:
            if process.poll() is None:
                process.kill()
                process.wait()
            raise
    if code:
        raise RuntimeError(f'FFmpeg encoding failed ({code}); inspect {work / "encode.log"}.')
    return codec


def _verify(ffprobe: str, video_path: Path, config: dict, frame_count: int, silent: bool) -> dict:
    raw = json.loads(_run([ffprobe, '-v', 'error', '-count_frames', '-show_streams',
                           '-show_format', '-of', 'json', str(video_path)]))
    # ffprobe reports decoded best-effort timestamps, not just container metadata.
    decoded = json.loads(_run([ffprobe, '-v', 'error', '-select_streams', 'v:0', '-show_frames',
                               '-show_entries', 'frame=best_effort_timestamp_time', '-of', 'json', str(video_path)]))
    timestamps = [float(frame['best_effort_timestamp_time']) for frame in decoded.get('frames', [])]
    videos = [stream for stream in raw.get('streams', []) if stream.get('codec_type') == 'video']
    audios = [stream for stream in raw.get('streams', []) if stream.get('codec_type') == 'audio']
    video = videos[0] if videos else {}
    fps = config['fps']
    actual_fps = float(Fraction(video.get('avg_frame_rate', '0/1')))
    duration = frame_count / fps
    intervals = [right - left for left, right in zip(timestamps, timestamps[1:])]
    video_duration = float(video.get('duration', 0))
    container_duration = float(raw.get('format', {}).get('duration', 0))
    audio_tolerance = 1024 / 48000 + 0.000002
    checks = {
        'oneH264VideoTrack': len(videos) == 1 and video.get('codec_name') == 'h264',
        'dimensions': (video.get('width'), video.get('height')) == (config['width'], config['height']),
        'frameRate': abs(actual_fps - fps) < 0.00001,
        'decodedFrameCount': int(video.get('nb_read_frames', 0)) == frame_count and len(timestamps) == frame_count,
        'distinctTimestamps': len(set(timestamps)) == frame_count,
        'everyFrameTimestamp': len(timestamps) == frame_count and all(abs(timestamp - index / fps) < 0.000002 for index, timestamp in enumerate(timestamps)),
        'videoDuration': abs(video_duration - duration) < 0.5 / fps,
        'containerDuration': abs(container_duration - duration) <= max(0.5 / fps, audio_tolerance),
        'audioTrackCount': len(audios) == (0 if silent else 1),
    }
    if not silent:
        audio = audios[0] if audios else {}
        checks.update({
            'audioFormat': audio.get('codec_name') == 'aac' and audio.get('channels') == 2 and int(audio.get('sample_rate', 0)) == 48000,
            'audioStart': abs(float(audio.get('start_time', '-1'))) <= audio_tolerance,
            'audioDuration': abs(float(audio.get('duration', 0)) - duration) <= audio_tolerance,
        })
    return {
        'technicalStatus': 'passed' if all(checks.values()) else 'failed',
        'checks': checks, 'visualReview': 'not_reviewed',
        'audioReview': 'not_applicable' if silent else 'not_reviewed',
        'width': video.get('width'), 'height': video.get('height'), 'fps': actual_fps,
        'decodedFrames': len(timestamps), 'distinctTimestamps': len(set(timestamps)),
        'durationSeconds': container_duration, 'videoDurationSeconds': video_duration,
        'minimumFrameInterval': min(intervals, default=None), 'maximumFrameInterval': max(intervals, default=None),
        'frameTimestamps': timestamps, 'audioTracks': len(audios),
        'streams': [{key: value for key, value in stream.items() if key != 'tags'} for stream in raw.get('streams', [])],
    }


def _key_frames(resolved: dict, first: int, last: int) -> list[int]:
    """Cover cut neighbours, scene events, and motion start/middle/end."""
    candidates = {first, last - 1, (first + last - 1) // 2}
    for shot in resolved.get('shots', []):
        for key in ('startFrame', 'endFrame'):
            anchor = shot.get(key)
            if isinstance(anchor, int):
                candidates.update((anchor - 1, anchor, anchor + 1))
        for event in shot.get('events', []):
            anchor = event.get('frame')
            if isinstance(anchor, int):
                candidates.update((anchor - 1, anchor, anchor + 1))
        for motion in shot.get('motions', []):
            start, end = motion.get('startFrame'), motion.get('endFrame')
            if isinstance(start, int) and isinstance(end, int):
                candidates.update((start - 1, start, start + 1, (start + end) // 2, end - 1, end, end + 1))
    return sorted(frame for frame in candidates if first <= frame < last)


def _frame_selection(frames: list[int]) -> str:
    """Compact consecutive frames and balance the expression for FFmpeg's parser."""
    values = sorted(set(frames))
    if not values:
        return '0'
    ranges, start, end = [], values[0], values[0]
    for value in values[1:]:
        if value == end + 1:
            end = value
        else:
            ranges.append((start, end))
            start = end = value
    ranges.append((start, end))
    terms = [f'eq(n,{a})' if a == b else f'between(n,{a},{b})' for a, b in ranges]
    while len(terms) > 1:
        terms = [f'({terms[i]}+{terms[i+1]})' if i + 1 < len(terms) else terms[i]
                 for i in range(0, len(terms), 2)]
    return terms[0]


def _decode_stills(ffmpeg: str, video: Path, target: Path, resolved: dict, first: int, last: int) -> dict:
    from PIL import Image, ImageDraw
    config = resolved['project']
    width, height, fps = config['width'], config['height'], config['fps']
    source_frames = _key_frames(resolved, first, last)
    selected = _frame_selection([frame-first for frame in source_frames])
    # Select decoded frame indices in one pass, preserving every chosen frame.
    command = [ffmpeg, '-v', 'error', '-i', str(video), '-an', '-vf', f"select='{selected}'",
               '-fps_mode', 'passthrough', '-pix_fmt', 'rgb24', '-f', 'rawvideo', 'pipe:1']
    stride = width * height * 3
    thumbnail_width = min(480, width)
    thumbnail_height = round(height * thumbnail_width / width)
    manifest, sheets = [], []
    per_sheet = 36
    with (target.parent / 'decode-stills.log').open('wb') as log:
        process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=log,
                                   creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0)
        try:
            for index, source_frame in enumerate(source_frames):
                if index % per_sheet == 0:
                    batch_count = min(per_sheet, len(source_frames) - index)
                    columns = min(3, batch_count)
                    sheet = Image.new('RGB', (columns * thumbnail_width, math.ceil(batch_count / columns) * (thumbnail_height + 26)), '#17202b')
                    painter = ImageDraw.Draw(sheet)
                data = process.stdout.read(stride)
                if len(data) != stride:
                    raise RuntimeError('Decoded key-frame byte count differs from the selected video frames.')
                image = Image.frombytes('RGB', (width, height), data)
                name = f'frame-{source_frame:06d}.png'
                image.save(target / name)
                thumb = image.resize((thumbnail_width, thumbnail_height))
                local = index % per_sheet
                x, y = local % columns * thumbnail_width, local // columns * (thumbnail_height + 26)
                sheet.paste(thumb, (x, y))
                painter.text((x + 6, y + thumbnail_height + 6), f'source frame {source_frame} / {source_frame / fps:.3f}s', fill='white')
                manifest.append({'file': name, 'sourceFrame': source_frame, 'outputFrame': source_frame - first})
                if local == per_sheet - 1 or index == len(source_frames) - 1:
                    sheet_name = 'contact-sheet.jpg' if not sheets else f'contact-sheet-{len(sheets) + 1:02d}.jpg'
                    sheet.save(target / sheet_name, quality=92)
                    sheets.append(sheet_name)
            if process.stdout.read(1) or process.wait() != 0:
                raise RuntimeError('Video key-frame decoder failed or produced unexpected frames.')
        finally:
            process.stdout.close()
            if process.poll() is None:
                process.kill()
                process.wait()
    return {'contactSheet': sheets[0], 'contactSheets': sheets, 'decodedStills': manifest,
            'coverage': 'endpoints, midpoint, scene-event/cut neighbours, and motion start/middle/end; manual playback remains required'}


def render(project_root: Path | str, *, name: str = 'film', start_frame: int = 0,
           end_frame: int | None = None, silent: bool = False, overwrite: bool = False,
           backend: str = 'browser') -> Path:
    """Render [start_frame, end_frame), returning the technically verified MP4.

    Configure external dependencies with PIXEL_NODE, PIXEL_NODE_MODULES,
    PIXEL_BROWSER_EXECUTABLE, PIXEL_FFMPEG and PIXEL_FFPROBE. No automatic installs.
    """
    if backend != 'browser':
        raise ValueError('Supported renderer backend: browser. Other backends are not yet validated.')
    if not isinstance(name, str) or not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_-]*', name):
        raise ValueError('name must contain only letters, numbers, underscores, and hyphens.')
    root = Path(project_root).resolve()
    resolved, last = _read_contract(root, start_frame, end_frame)
    bindings = _build_bindings(root, resolved['inputHash'])
    if not all(bindings.values()):
        raise ValueError('Built project lock is missing or source/runtime changed; rebuild before render.')
    output = root / 'outputs' / f'{name}.mp4'
    verification = root / 'outputs' / f'{name}-verification'
    if (output.exists() or verification.exists()) and not overwrite:
        raise FileExistsError(f'Output or verification already exists for {name}; choose a new name or pass overwrite=True.')
    node = _executable('PIXEL_NODE', 'node')
    ffmpeg = _executable('PIXEL_FFMPEG', 'ffmpeg')
    ffprobe = _executable('PIXEL_FFPROBE', 'ffprobe')
    config = resolved['project']
    frame_count = last - start_frame
    (root / 'work').mkdir(parents=True, exist_ok=True)
    work = Path(tempfile.mkdtemp(prefix=f'render-{name}-', dir=root / 'work'))
    frames = work / 'frames'
    audio = None if silent else work / 'audio-slice.wav'
    audio_info = None if silent else _audio_slice(root / 'build' / 'animation-sfx.wav', audio, start_frame, last, config['fps'])
    subprocess.run([node, str(ENGINE / 'render_frames.cjs'), str(root), str(frames), str(start_frame), str(last)], check=True,
                   creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0)
    metrics = json.loads((frames / 'render-metrics.json').read_text(encoding='utf-8'))
    staged_video = work / 'encoded.mp4'
    codec = _encode(ffmpeg, frames, staged_video, audio, config, frame_count, work)
    metadata = _verify(ffprobe, staged_video, config, frame_count, silent)
    video_hash = _hash(staged_video)
    environment = {'system': platform.system(), 'release': platform.release(), 'machine': platform.machine(),
                   'python': platform.python_version(), 'node': metrics['nodeVersion'],
                   'playwright': metrics['playwrightVersion'], 'browser': metrics['browserVersion'],
                   'ffmpeg': _version(ffmpeg), 'ffprobe': _version(ffprobe), 'videoEncoder': codec}
    source_range = {'startFrame': start_frame, 'endFrame': last, 'durationFrames': frame_count, 'fps': config['fps'],
                    'startSeconds': start_frame / config['fps'], 'endSeconds': last / config['fps']}
    metadata.update({'inputHash': resolved['inputHash'], 'videoSha256': video_hash,
                     'backend': backend, 'sourceRange': source_range, 'environment': environment})
    _json(work / 'metadata.json', metadata)
    if metadata['technicalStatus'] != 'passed':
        failed = ', '.join(key for key, passed in metadata['checks'].items() if not passed)
        raise RuntimeError(f'Media verification failed ({failed}); inspect {work / "metadata.json"}.')
    staged_verification = work / 'verification'
    staged_verification.mkdir()
    decoded = _decode_stills(ffmpeg, staged_video, staged_verification, resolved, start_frame, last)
    manifest = {'schemaVersion': 1, 'createdAt': datetime.now(timezone.utc).isoformat(),
                'inputHash': resolved['inputHash'], 'videoSha256': video_hash,
                'video': output.relative_to(root).as_posix(), 'backend': backend, 'sourceRange': source_range,
                'environment': environment, 'audioSlice': audio_info, 'review': {'visual': 'not_reviewed', 'audio': 'not_applicable' if silent else 'not_reviewed'},
                'buildSha256': _hash(root / 'build' / 'film.html'), 'timelineSha256': _hash(root / 'build' / 'resolved-timeline.json'),
                **decoded}
    _json(staged_verification / 'metadata.json', metadata)
    _json(staged_verification / 'render-manifest.json', manifest)
    output.parent.mkdir(parents=True, exist_ok=True)
    # Replacing only after all checks preserves an earlier video if this run fails.
    staged_video.replace(output)
    verification.mkdir(exist_ok=True)
    for item in staged_verification.iterdir():
        item.replace(verification / item.name)
    return output


def inspect(project_root: Path | str, *, name: str = 'film') -> dict:
    """Re-decode an existing MP4 and check its binding to the current compiled build.

    This is read-only. It does not promote any human review status to approved.
    """
    if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_-]*', name):
        raise ValueError('name must contain only letters, numbers, underscores, and hyphens.')
    root = Path(project_root).resolve()
    video = root / 'outputs' / f'{name}.mp4'
    manifest_path = root / 'outputs' / f'{name}-verification' / 'render-manifest.json'
    if not video.is_file() or not manifest_path.is_file():
        raise ValueError('Missing rendered MP4 or render-manifest.json; render the project first.')
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    source_range = manifest['sourceRange']
    resolved, last = _read_contract(root, source_range['startFrame'], source_range['endFrame'])
    silent = manifest.get('audioSlice') is None
    report = _verify(_executable('PIXEL_FFPROBE', 'ffprobe'), video, resolved['project'],
                     last - source_range['startFrame'], silent)
    current_hash = _hash(video)
    report['checks'].update({
        'videoHash': current_hash == manifest.get('videoSha256'),
        'compiledInputHash': resolved['inputHash'] == manifest.get('inputHash'),
        'buildHash': _hash(root / 'build' / 'film.html') == manifest.get('buildSha256'),
        'timelineHash': _hash(root / 'build' / 'resolved-timeline.json') == manifest.get('timelineSha256'),
        'sourceFrameRate': resolved['project']['fps'] == source_range.get('fps'),
        **_build_bindings(root, resolved['inputHash']),
    })
    report.update({'technicalStatus': 'passed' if all(report['checks'].values()) else 'failed',
                   'inputHash': resolved['inputHash'], 'videoSha256': current_hash,
                   'backend': manifest['backend'], 'sourceRange': source_range,
                   'environment': manifest['environment']})
    return report
