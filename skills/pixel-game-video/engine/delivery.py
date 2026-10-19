"""One file policy for standalone projects and installable skill packages."""
from pathlib import Path
import shutil


EXCLUDED_PARTS = {'__pycache__', 'node_modules', '.venv', '.cache', '.remotion', 'work', 'build', 'outputs',
                  '.git', 'sfx-bank', 'arcade-expanded', 'arcade-charge'}
EXCLUDED_SUFFIXES = {'.pyc', '.pyo', '.log', '.exe', '.dll', '.so', '.dylib'}


def skill_files(root, *, include_tests=True):
    root = Path(root)
    for path in sorted(root.rglob('*')):
        relative = path.relative_to(root)
        if not path.is_file() or set(relative.parts) & EXCLUDED_PARTS:
            continue
        if path.suffix.lower() in EXCLUDED_SUFFIXES or relative.as_posix() == 'modules/audio/charge.py':
            continue
        if not include_tests and relative.parts[0] == 'tests':
            continue
        yield relative


def copy_skill(source, destination, *, include_tests=True):
    source, destination = Path(source), Path(destination)
    for relative in skill_files(source, include_tests=include_tests):
        target = destination / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source / relative, target)
