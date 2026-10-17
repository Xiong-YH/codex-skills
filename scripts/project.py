#!/usr/bin/env python3
"""Initialize, validate, build, or rescore one portable pixel explainer project."""
import argparse
import json
from pathlib import Path
import shutil
import subprocess
import sys
from project_contract import audio_provenance, check

SKILL = Path(__file__).resolve().parent.parent


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['init','check','build','sound'])
    parser.add_argument('project', type=Path)
    parser.add_argument('--silent', action='store_true', help='Build/check visuals without sound inputs')
    args = parser.parse_args()
    root = args.project.resolve()
    if args.command == 'init':
        if root.exists():
            parser.error('Initialization refuses an existing directory; choose a new project path')
        shutil.copytree(SKILL/'assets/starter', root, ignore=shutil.ignore_patterns('__pycache__','*.pyc'))
        print(root)
        return
    if args.command == 'sound':
        check(root, require_audio=False)
        subprocess.run([sys.executable, str(root/'source/score.py'), '--out', str(root)], cwd=root, check=True)
        (root/'audio-provenance.json').write_text(json.dumps(audio_provenance(root,'synthesized from project sound score'),indent=2)+'\n')
    config = check(root, require_audio=not args.silent, require_score=not args.silent)
    print(f'Project contract OK: {config["duration"]}s, {config["fps"]}fps, {config["lead"]}', flush=True)
    if args.command == 'build':
        command = [sys.executable, str(root/'source/build.py')]
        if args.silent:
            command.append('--silent')
        subprocess.run(command, cwd=root, check=True)


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError, KeyError) as error:
        raise SystemExit(str(error)) from error
