import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess

from PIL import Image


PROJECT = Path(__file__).resolve().parents[1]
FOUNDATION = PROJECT.parents[1] / 'skills' / 'pixel-game-video'
MEDIA = PROJECT / 'media'
SCRATCH = PROJECT / '.tmp'
CHARACTER = FOUNDATION / 'modules/library/characters'
BGM = FOUNDATION / 'modules/audio/bgm-system'
SFX = FOUNDATION / 'modules/audio/assets/arcade-motion'
POSES = [
    ('neutral', (140, 6, 442, 494), (299, 494)),
    ('dazed-right', (132, 0, 429, 492), (240, 492)),
]
SOUNDS = [
    ('miss', 'reject', .47),
    ('land', 'seat', .64),
    ('open', 'pickup', .49),
    ('copy', 'select', .34),
    ('complete', 'reward', .49),
]


def record(file):
    return {
        'path': file.relative_to(PROJECT.parents[1]).as_posix(),
        'sha256': hashlib.sha256(file.read_bytes()).hexdigest(),
    }


def make_atlas():
    path = MEDIA / 'modern-poses.webp'
    atlas = Image.new('RGBA', (400, 280))
    poses = []
    for index, (name, crop, foot) in enumerate(POSES):
        source = CHARACTER / f'actions/00-lead/{name}.png'
        with Image.open(source) as original:
            pose = original.convert('RGBA').crop(crop)
        factor = 270 / (crop[3] - crop[1])
        pose = pose.resize(tuple(round(side * factor) for side in pose.size), Image.Resampling.LANCZOS)
        x = 200 * index + 100 - round((foot[0] - crop[0]) * factor)
        atlas.paste(pose, (x, 276 - pose.height))
        poses.append({
            'name': name, 'source': record(source), 'sourceCropLTRB': crop,
            'sourceFoot': foot, 'atlasRectXYWH': [200 * index, 0, 200, 280], 'atlasFoot': [100, 276],
        })
    atlas.save(path, lossless=True, method=6)
    return {'file': record(path), 'poses': poses}


def make_sprite_atlas():
    manifest = MEDIA / 'azong-sprite-poses.json'
    data = json.loads(manifest.read_text(encoding='utf-8'))
    layout = data['atlas']
    width, height = layout['tileWidth'], layout['tileHeight']
    atlas_foot_x, atlas_foot_y = layout['foot']
    atlas = Image.new('RGBA', (width * len(data['poses']), height))
    sheets = {}
    for name in data['sheets']:
        with Image.open(MEDIA / name) as image:
            if image.mode != 'RGBA':
                raise ValueError(f'角色图集缺少透明通道：{name}')
            sheets[name] = image.copy()

    poses = []
    for index, item in enumerate(data['poses']):
        left, top, right, bottom = item['crop']
        source_foot_x, source_foot_y = item['foot']
        pose = sheets[item['sheet']].crop((left, top, right, bottom))
        # The top silhouette sets a shared scale. Crouching can still lower the head.
        head = pose.getchannel('A').crop((0, 0, pose.width, pose.height // 3))
        head_left, _, head_right, _ = head.point(lambda alpha: 255 if alpha > 180 else 0).getbbox()
        factor = layout['headWidth'] / (head_right - head_left)
        resized = pose.resize(tuple(round(size * factor) for size in pose.size), Image.Resampling.NEAREST)
        x = atlas_foot_x - round((source_foot_x - left) * factor)
        y = atlas_foot_y - round((source_foot_y - top) * factor)
        if not (0 <= x <= width - resized.width and 0 <= y <= height - resized.height):
            raise ValueError(f'角色姿态超出图集单元：{item["name"]}')
        atlas.paste(resized, (index * width + x, y))
        poses.append({
            'name': item['name'], 'source': item['sheet'], 'sourceCropLTRB': item['crop'],
            'sourceFoot': item['foot'], 'atlasRectXYWH': [index * width, 0, width, height], 'atlasFoot': layout['foot'],
        })

    path = MEDIA / 'azong-sprite.webp'
    atlas.save(path, lossless=True, method=6)
    return {
        'file': record(path), 'manifest': record(manifest),
        'visualReference': record(PROJECT.parents[1] / data['reference']),
        'sheets': [record(MEDIA / name) for name in sheets], 'poses': poses,
    }


def make_audio(ffmpeg, wav):
    time = (PROJECT / 'src/timeline.js').read_text(encoding='utf-8')
    timeline = json.loads(re.fullmatch(r'globalThis\.cacheRouteTimeline = (\{.*\});\s*', time, re.S)[1])
    cue = timeline['cues']
    duration = timeline['frames'] / timeline['fps']
    sample_rate = 48_000
    in_sample = timeline['scoreIn'] * sample_rate
    end_sample = in_sample + round(duration * sample_rate)
    filters = [
        f'[0:a]aresample={sample_rate},atrim=start_sample={in_sample}:end_sample={end_sample},'
        f'asetpts=PTS-STARTPTS,volume=0.68,afade=t=out:st={duration - .65}:d=0.65[bed]'
    ]
    command = [ffmpeg, '-hide_banner', '-loglevel', 'error', '-y', '-i', str(wav)]
    events = []
    for i, (event, name, gain) in enumerate(SOUNDS, 1):
        path = SFX / f'{name}.wav'
        command += ['-i', str(path)]
        sample = round(cue[event] / timeline['fps'] * sample_rate)
        filters.append(f'[{i}:a]aresample={sample_rate},aformat=channel_layouts=stereo,volume={gain},adelay={sample}S:all=1[s{i}]')
        events.append({'cue': event, 'frame': cue[event], 'delaySamples': sample, 'gain': gain, 'source': record(path)})
    mix = '[bed]' + ''.join(f'[s{i}]' for i in range(1, len(SOUNDS) + 1))
    filters.append(f'{mix}amix=inputs={len(SOUNDS) + 1}:duration=first:normalize=0,alimiter=limit=0.91:level=false:latency=true[out]')
    output = MEDIA / 'pulse-preview.mp3'
    subprocess.run(command + [
        '-filter_complex', ';'.join(filters), '-map', '[out]', '-ar', str(sample_rate), '-ac', '2',
        '-c:a', 'libmp3lame', '-b:a', '96k', str(output)
    ], check=True)
    return {
        'file': record(output), 'score': record(BGM / 'pulse-minute.mjs'),
        'masterSha256': hashlib.sha256(wav.read_bytes()).hexdigest(),
        'scoreInSeconds': timeline['scoreIn'], 'scoreOutSeconds': timeline['scoreIn'] + duration,
        'bpm': 120, 'sampleRate': sample_rate, 'events': events,
    }


def main():
    parser = argparse.ArgumentParser(description='构建 Canvas 使用的小体积素材。')
    parser.add_argument('--ffmpeg', default='ffmpeg')
    parser.add_argument('--pulse-wav', type=Path, help='现有的一分钟步进 WAV。省略时从库里的编曲重建。')
    args = parser.parse_args()
    MEDIA.mkdir(exist_ok=True)
    SCRATCH.mkdir(exist_ok=True)
    if args.pulse_wav is None:
        subprocess.run(['node', str(BGM / 'build.mjs'), '--out', str(SCRATCH), '--preset', 'pulse-minute'],
                       env={**os.environ, 'PIXEL_FFMPEG': args.ffmpeg}, check=True)
    info = {
        'modern': make_atlas(),
        'sprite': make_sprite_atlas(),
        'audio': make_audio(args.ffmpeg, args.pulse_wav or SCRATCH / 'pulse-minute.wav'),
    }
    (MEDIA / 'sources.json').write_text(json.dumps(info, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
