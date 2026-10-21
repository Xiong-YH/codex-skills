"""Package the actual Canvas renderer as editable Remotion workbench units.

No rendered plate is used: the generated module contains the same selected
runtime and assets as film.html. The saved workbench timeline owns later edits.
"""
from __future__ import annotations

import copy
import hashlib
import json
from pathlib import Path
import shutil


def _hash(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def build(root: Path, resolved: dict, payload: dict, runtime: str, skill: Path) -> Path:
    output, generated = root / 'build', root / 'build/remotion'
    source = skill / 'engine/remotion'
    generated.mkdir(parents=True, exist_ok=True)
    for name in ('src', 'public'):
        target = generated / name
        if target.exists():
            shutil.rmtree(target)
    shutil.copytree(source / 'src', generated / 'src')
    public = generated / 'public'
    public.mkdir()
    for name in ('package.json', 'package-lock.json'):
        shutil.copy2(source / name, generated / name)
    (generated / 'tsconfig.json').write_text(json.dumps({
        'compilerOptions': {'target': 'ES2020', 'lib': ['ES2020', 'DOM'], 'jsx': 'react-jsx',
                            'module': 'ESNext', 'moduleResolution': 'Bundler', 'strict': True,
                            'esModuleInterop': True, 'skipLibCheck': True,
                            'resolveJsonModule': True, 'noEmit': True}, 'include': ['src']
    }), encoding='utf-8')
    # Each generated project owns its runtime namespace; two open projects cannot
    # overwrite one another's style/scenes or asset caches.
    (generated / 'src/canvas-runtime.ts').write_text(
        '// @ts-nocheck\n// Generated selected runtime; edit the owning module, then rebuild.\n'
        'export const PIXEL_CANVAS_RUNTIME = (() => {\n'
        'const globalThis = {PixelVideo: {}};\n' + runtime +
        '\nreturn globalThis.PixelVideo;\n})();\n', encoding='utf-8')
    workbench_payload = copy.deepcopy(payload)
    if payload.get('audio') is not None:
        shutil.copy2(output / 'animation-sfx.wav', public / 'animation.wav')
        workbench_payload['audio'] = 'animation.wav'
    (public / 'payload.json').write_text(json.dumps(workbench_payload, ensure_ascii=False), encoding='utf-8')
    from .workbench_bridge import generate
    generate(root, resolved, workbench_payload, skill)
    files = {p.relative_to(root).as_posix(): _hash(p)
             for folder in (generated / 'src', generated / 'public')
             for p in sorted(folder.rglob('*')) if p.is_file()}
    for name in ('package.json', 'package-lock.json', 'tsconfig.json'):
        p = generated / name
        files[p.relative_to(root).as_posix()] = _hash(p)
    for name in ('runtime.js', 'payload.json', 'film.html', 'workbench-manifest.json'):
        p = output / name
        files[p.relative_to(root).as_posix()] = _hash(p)
    manifest = output / 'canvas-workbench-build.json'
    manifest.write_text(json.dumps({'contractVersion': 1, 'backend': 'canvas',
        'inputHash': resolved['inputHash'], 'builtFiles': files}, indent=2) + '\n', encoding='utf-8')
    return manifest


def verify_build(root: Path, resolved: dict) -> dict:
    path = root / 'build/canvas-workbench-build.json'
    if not path.is_file():
        raise ValueError('Missing Canvas workbench build; rebuild the project.')
    manifest = json.loads(path.read_text(encoding='utf-8'))
    if (manifest.get('contractVersion') != 1 or manifest.get('backend') != 'canvas'
            or manifest.get('inputHash') != resolved['inputHash']):
        raise ValueError('Canvas workbench build belongs to a different timeline; rebuild.')
    expected = manifest.get('builtFiles', {})
    required = {'build/remotion/package.json', 'build/remotion/package-lock.json',
                'build/remotion/tsconfig.json', 'build/runtime.js', 'build/payload.json',
                'build/film.html', 'build/workbench-manifest.json'}
    for folder in (root / 'build/remotion/src', root / 'build/remotion/public'):
        required.update(p.relative_to(root).as_posix() for p in folder.rglob('*') if p.is_file())
    if not required.issubset(expected):
        raise ValueError('Canvas workbench build manifest is incomplete; rebuild.')
    for relative, digest in expected.items():
        target = (root / relative).resolve()
        if not target.is_relative_to(root / 'build') or not target.is_file() or _hash(target) != digest:
            raise ValueError(f'Generated Canvas workbench file changed: {relative}; rebuild.')
    payload = json.loads((root / 'build/remotion/public/payload.json').read_text(encoding='utf-8'))
    if payload.get('resolved') != resolved:
        raise ValueError('Canvas workbench payload differs from compiled timeline; rebuild.')
    return manifest
