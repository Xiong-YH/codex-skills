"""Materialize music as portable project PCM; never edits authoring sources."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import wave


def import_bgm(project, source=None, *, overwrite=False):
    root = Path(project).resolve()
    if not root.is_dir():
        raise ValueError('Create the video or director project before importing BGM')
    direct = root / 'project.json'
    if direct.is_file() and json.loads(direct.read_text(encoding='utf-8')).get('authoringMode') == 'director':
        raise ValueError('Import BGM into the director source project, then run handoff')
    board = root / ('storyboard.json' if (root / 'storyboard.json').is_file() else 'timeline.json')
    shots = json.loads(board.read_text(encoding='utf-8'))['shots']
    if not shots:
        raise ValueError('BGM requires an existing storyboard or timeline')
    bundled = source is None
    music_dir = Path(__file__).resolve().parent / 'assets/music'
    metadata = json.loads((music_dir / 'chill-wave.json').read_text(encoding='utf-8')) if bundled else {}
    source = music_dir / metadata['file'] if bundled else Path(source).resolve()
    if not source.is_file():
        raise ValueError('BGM source audio file is missing')
    if bundled and hashlib.sha256(source.read_bytes()).hexdigest() != metadata['sha256']:
        raise ValueError('Bundled Chill Wave differs from its source manifest')
    destination = root / 'media' / ('chill-wave.wav' if bundled else 'bgm.wav')
    if not destination.resolve().is_relative_to(root):
        raise ValueError('BGM destination must stay inside the project')
    if destination.exists() and not overwrite:
        raise FileExistsError('BGM file already exists; use --overwrite to replace it')
    ffmpeg = shutil.which(os.environ.get('PIXEL_FFMPEG', 'ffmpeg'))
    if not ffmpeg:
        raise RuntimeError('BGM import requires FFmpeg; set PIXEL_FFMPEG or put ffmpeg on PATH')
    destination.parent.mkdir(parents=True, exist_ok=True)
    fd, name = tempfile.mkstemp(prefix='bgm-import-', suffix='.wav', dir=destination.parent)
    os.close(fd)
    temporary = Path(name)
    try:
        result = subprocess.run([ffmpeg, '-hide_banner', '-loglevel', 'error', '-y', '-i', str(source),
                                 '-vn', '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s16le', str(temporary)],
                                capture_output=True, text=True)
        if result.returncode:
            raise RuntimeError('BGM conversion failed: ' + result.stderr[-2000:])
        with wave.open(str(temporary), 'rb') as stream:
            samples = stream.getnframes()
            if (stream.getframerate(), stream.getsampwidth(), stream.getnchannels(), stream.getcomptype()) != (48000, 2, 2, 'NONE') or samples < 1:
                raise ValueError('BGM conversion did not produce nonempty 48kHz stereo PCM')
        temporary.replace(destination)
    finally:
        temporary.unlink(missing_ok=True)
    config = {'id': 'bgm', 'file': destination.relative_to(root).as_posix(),
              'at': {'event': shots[0]['id'] + '.enter'}, 'end': {'event': shots[-1]['id'] + '.exit'},
              'gain': 0.18, 'loop': True, 'trimStartSeconds': 0.0,
              'fadeInFrames': 60, 'fadeOutFrames': 90, 'speechDuck': 0.25,
              **{key: metadata.get(key, '') for key in ('title', 'artist', 'sourceUrl', 'licenseUrl')},
              'changes': 'Converted to 48kHz PCM; trimmed/looped, faded and mixed as configured.'}
    return {'file': config['file'], 'samples': samples, 'sha256': hashlib.sha256(destination.read_bytes()).hexdigest(),
            'bgm': config, 'note': 'Add bgm to production-plan.json (director) or audio.json (direct); source JSON was not edited.'}
