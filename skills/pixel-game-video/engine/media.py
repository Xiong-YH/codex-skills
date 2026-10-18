"""Project-owned images and silent footage, independent of the style's samples."""
import hashlib
import json
import os
from pathlib import Path, PurePosixPath, PureWindowsPath
import shutil
import subprocess

IMAGE_TYPES = {'.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp'}
VIDEO_TYPES = {'.mp4': 'video/mp4', '.webm': 'video/webm'}


def local_file(root, relative):
    root = Path(root).resolve()
    portable = PurePosixPath(relative)
    if '\\' in relative or PureWindowsPath(relative).is_absolute() or portable.is_absolute() or portable.parts[:1] != ('media',) or '..' in portable.parts:
        raise ValueError('Project media must use a portable relative path inside media/')
    path = (root / relative).resolve()
    if not path.is_relative_to(root / 'media') or not path.is_file():
        raise ValueError('Missing or escaping project media: ' + relative)
    return path


def inspect(root, source, duration, fps):
    path = local_file(root, source['file'])
    kind = source.get('kind', 'image')
    types = IMAGE_TYPES if kind == 'image' else VIDEO_TYPES
    if path.suffix.lower() not in types:
        raise ValueError('Media kind and file extension disagree: ' + source['file'])
    result = {'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'mime': types[path.suffix.lower()]}
    if kind == 'image':
        if source.get('trimStartSeconds', 0) or source.get('shortage', 'error') != 'error':
            raise ValueError('Still images do not accept video trim or shortage settings')
        from PIL import Image
        with Image.open(path) as image:
            result.update(width=image.width, height=image.height)
            image.verify()
    else:
        probe = os.environ.get('PIXEL_FFPROBE') or shutil.which('ffprobe')
        if not probe:
            raise ValueError('Video replacement needs FFprobe; set PIXEL_FFPROBE')
        process = subprocess.run([probe, '-v', 'error', '-select_streams', 'v:0', '-show_streams', '-show_format', '-of', 'json', str(path)], capture_output=True, text=True, encoding='utf-8', check=True)
        info = json.loads(process.stdout)
        if not info.get('streams'):
            raise ValueError('Replacement has no video stream')
        stream = info['streams'][0]
        length = float(stream.get('duration') or info.get('format', {}).get('duration', 0))
        if length <= 0 or source.get('trimStartSeconds', 0) >= length:
            raise ValueError('Video trim starts outside the source')
        if source.get('shortage', 'error') == 'error' and source.get('trimStartSeconds', 0) + duration > length + 1/fps:
            raise ValueError('Replacement video is shorter than the shot; choose a longer source or shortage=hold')
        rate = stream.get('avg_frame_rate', '0/1').split('/')
        source_fps = float(rate[0]) / max(1, float(rate[-1]))
        result.update(width=stream['width'], height=stream['height'], durationSeconds=length, sourceFps=source_fps or fps)
    return result


def compile_media(root, shots, fps):
    records = {}
    for shot in shots:
        for field in ('background', 'replacement'):
            source = shot.get(field)
            if source:
                key = '@' + shot['id'] + '.' + field
                records[key] = {**source, **inspect(root, source, shot['durationFrames']/fps, fps),
                                'shotStartFrame': shot['startFrame'], 'shotEndFrame': shot['endFrame']}
                source['assetKey'] = key
        for component in shot['components']:
            data = component['data']
            for item in [data, *data.get('items', [])]:
                if item.get('image'):
                    key = '@image:' + item['image']
                    source = {'file': item['image'], 'kind': 'image'}
                    if key not in records:
                        records[key] = {**source, **inspect(root, source, 0, fps)}
                    item['imageKey'] = key
    return records
