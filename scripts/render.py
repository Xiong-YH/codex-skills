#!/usr/bin/env python3
"""Render a full film or a source-aligned excerpt using Chrome and AVFoundation."""
import argparse
import json
from pathlib import Path
import platform
import re
import shutil
import subprocess
import sys
from project_contract import check

SCRIPTS = Path(__file__).resolve().parent


def run(*args):
    subprocess.run([str(a) for a in args], check=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('project', type=Path)
    parser.add_argument('--name', default='film')
    parser.add_argument('--start', type=float, default=0)
    parser.add_argument('--end', type=float)
    parser.add_argument('--silent', action='store_true')
    parser.add_argument('--overwrite', action='store_true')
    args = parser.parse_args()
    root = args.project.resolve()
    config = check(root, require_audio=not args.silent, require_score=not args.silent)
    end = config['duration'] if args.end is None else args.end
    if not re.fullmatch(r'[a-zA-Z0-9][a-zA-Z0-9_-]*', args.name):
        parser.error('--name must be a filename stem made of letters, numbers, _ and -')
    if round(end*config['fps'])-round(args.start*config['fps']) < 2:
        parser.error('A video excerpt needs at least two frames')
    if not (0 <= args.start < end <= config['duration']):
        parser.error('Source interval must be inside the film')
    if platform.system() != 'Darwin':
        parser.error('Video encoding currently requires macOS AVFoundation; the HTML preview is portable')
    for command in ['node','swift']:
        if not shutil.which(command):
            parser.error(f'Missing required executable: {command}')
    result = root/'outputs'/f'{args.name}.mp4'
    if result.exists() and not args.overwrite:
        parser.error('Output already exists; choose another --name or explicitly pass --overwrite')
    result.parent.mkdir(parents=True, exist_ok=True)
    work = root/'work'/args.name
    frames = root/'work'/f'{args.name}-frames'
    work.mkdir(parents=True, exist_ok=True)
    build = [sys.executable, SCRIPTS/'project.py', 'build', root]
    if args.silent:
        build.append('--silent')
    run(*build)
    run('node', SCRIPTS/'render_frames.cjs', root, frames, args.start, end)
    metrics = json.loads((frames/'render-metrics.json').read_text())
    silent = work/'silent.mp4'
    run('swift','-suppress-warnings',SCRIPTS/'encode_video.swift',frames,silent,metrics['frameCount'],config['fps'])
    if args.silent:
        shutil.copy2(silent,result)
    else:
        run('swift','-suppress-warnings',SCRIPTS/'mux_video.swift',silent,root/'animation-sfx.wav',result,metrics['sourceStart'])
    verify = root/'outputs'/f'{args.name}-verification'
    run('swift','-suppress-warnings',SCRIPTS/'inspect_video.swift',result,verify)
    actual = json.loads((verify/'metadata.json').read_text())
    expected_audio = 0 if args.silent else 1
    valid = (actual['decodedFrames'] == metrics['frameCount'] and actual['distinctTimestamps'] == metrics['frameCount']
             and abs(actual['durationSeconds']-metrics['durationSeconds']) < 1/config['fps']/2
             and abs(actual['fps']-config['fps']) < .001 and actual['audioTracks'] == expected_audio
             and (actual['width'],actual['height']) == (config['width'],config['height'])
             and abs(actual['minimumFrameInterval']-1/config['fps']) < 1e-5
             and abs(actual['maximumFrameInterval']-1/config['fps']) < 1e-5)
    if not valid:
        raise SystemExit('Media contract failed; inspect the generated metadata before delivering')
    print(result)


if __name__ == '__main__':
    main()
