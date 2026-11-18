"""File safety policy for installable skills and standalone project runtimes."""
import os
from pathlib import Path
import shutil

from .dependencies import runtime_files


EXCLUDED_PARTS = {'__pycache__', 'node_modules', '.venv', '.cache', '.remotion', 'work', 'build', 'outputs',
                  '.git', '.tmp', 'scratch', 'sfx-bank', 'arcade-expanded', 'arcade-charge'}
EXCLUDED_SUFFIXES = {'.pyc', '.pyo', '.log', '.exe', '.dll', '.so', '.dylib'}
WORKBENCH_GENERATED = {'node_modules', 'dist', 'exports', 'gen', 'proj', 'public',
                       '.parity', '.render-public', '.vite', '.cache', '.remotion', '.segment-cache'}
WORKBENCH_GENERATED_FILES = {'workbench/src/projMeta.ts', 'workbench/src/mediaManifest.ts'}
EDITOR_FILES = {
    Path(name) for name in (
        'requirements-jianying.txt', 'references/jianying-export.md', 'modules/text/soft-highlight.mjs',
        'modules/audio/import_bgm.py', 'modules/audio/music.py', 'modules/audio/mixer.py',
        'modules/audio/palette.py', 'modules/audio/game_audio.py', 'modules/audio/arcade.py',
        'modules/audio/assets/common-motion/manifest.json',
        'modules/audio/workbench-bank.mjs', 'modules/audio/render-sfx.mjs', 'modules/audio/tactile.mjs',
        'modules/audio/vendor/garden-skills/scripts/lib/synth.mjs',
        'modules/audio/vendor/garden-skills/LICENSE', 'modules/audio/vendor/garden-skills/NOTICE.md',
    )
}
EDITOR_DIRS = tuple(Path(name) for name in (
    'workbench', 'engine/vendor', 'modules/audio/assets/arcade-motion', 'modules/audio/assets/common-motion'))


def skill_files(root, *, include_tests=True):
    root = Path(root).resolve()
    for folder, directories, names in os.walk(root):
        parent = Path(folder)
        branch = parent.relative_to(root).parts
        workbench = branch[:1] == ('workbench',)
        excluded = EXCLUDED_PARTS | WORKBENCH_GENERATED if workbench else EXCLUDED_PARTS
        if not include_tests and branch in ((), ('workbench',)):
            excluded = excluded | {'tests'}
        directories[:] = [name for name in sorted(directories)
                          if name not in excluded and (parent / name).resolve() == parent / name]
        for name in sorted(names):
            path = parent / name
            relative = path.relative_to(root)
            if name in excluded or path.is_symlink() or not path.is_file():
                continue
            if workbench and (name.startswith(('.dev.', '.dev-')) or path.suffix == '.tsbuildinfo' or
                              relative.as_posix() in WORKBENCH_GENERATED_FILES):
                continue
            if path.suffix.lower() in EXCLUDED_SUFFIXES or relative.as_posix() == 'modules/audio/charge.py':
                continue
            yield relative


def _copy_files(source, destination, files):
    for relative in files:
        target = destination / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source / relative, target)


def copy_skill(source, destination, *, include_tests=True):
    source, destination = Path(source), Path(destination)
    _copy_files(source, destination, skill_files(source, include_tests=include_tests))


def copy_project_runtime(source, destination, resolved):
    source, destination = Path(source).resolve(), Path(destination)
    required = {Path(name) for name in runtime_files(source, resolved)} | EDITOR_FILES
    files = [relative for relative in skill_files(source, include_tests=False)
             if relative in required or any(relative.is_relative_to(folder) for folder in EDITOR_DIRS)]
    missing = required.difference(files)
    if missing:
        raise ValueError('Missing portable runtime files: ' + ', '.join(path.as_posix() for path in sorted(missing)))
    _copy_files(source, destination, files)
