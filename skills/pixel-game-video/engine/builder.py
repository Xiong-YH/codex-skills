"""Build a portable preview from compiled frames; inputs are never rewritten."""
import base64
import html
import importlib.util
import json
import sys
from pathlib import Path
from .dependencies import actor_ids, javascript_files


def load_module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def style_file(style_root, relative):
    path = (style_root / relative).resolve()
    if not path.is_relative_to(style_root):
        raise ValueError('Style files must stay inside the style module')
    return path


def build(project_root: Path, resolved: dict, skill_root: Path, silent=False) -> Path:
    project_root, skill_root = Path(project_root), Path(skill_root)
    output = project_root / 'build'
    output.mkdir(parents=True, exist_ok=True)
    modules = skill_root / 'modules'
    prepare = load_module('pixel_video_prepare', modules / 'library' / 'prepare.py')
    mouth_module = load_module('pixel_video_mouth', modules / 'scenes' / 'performance.py')
    style_root = (modules / 'style').resolve()
    style_catalog = json.loads((style_root / 'catalog.json').read_text(encoding='utf-8'))['items']
    selected = next((item for item in style_catalog if item['id'] == resolved['project']['style']), None)
    if not selected or not selected.get('file'):
        raise ValueError('Style has no runtime preset: ' + resolved['project']['style'])
    preset_path = style_file(style_root, selected['file'])
    style = json.loads(preset_path.read_text(encoding='utf-8'))
    if style['id'] != selected['id']:
        raise ValueError('Style catalog and preset identity differ')
    assets = prepare.prepare(modules / 'library', actor_ids=actor_ids(resolved))
    library_asset_count = len(assets)
    style_assets = style.get('assets', {})
    if not isinstance(style_assets, dict):
        raise ValueError('Style assets must map stable IDs to module-relative image files')
    mime_types = {'.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp'}
    for ident, relative in style_assets.items():
        if ident in assets:
            raise ValueError('Style asset ID collides with the library: ' + ident)
        image_path = style_file(style_root, relative)
        mime = mime_types.get(image_path.suffix.lower())
        if not mime:
            raise ValueError('Unsupported style image type: ' + image_path.suffix)
        assets[ident] = 'data:' + mime + ';base64,' + base64.b64encode(image_path.read_bytes()).decode('ascii')
    for key, item in resolved.get('media', {}).items():
        assets[key] = 'data:' + item['mime'] + ';base64,' + base64.b64encode((project_root / item['file']).read_bytes()).decode('ascii')
    mouth = mouth_module.schedule(resolved['cues'], resolved['project']['fps'])
    audio_uri = None
    if not silent and resolved['project'].get('audioMode') != 'silent':
        # palette is the retained standalone procedural audio implementation.
        audio_dir = modules / 'audio'
        sys.path.insert(0, str(audio_dir))
        try:
            mixer = load_module('pixel_video_mixer', audio_dir / 'mixer.py')
            wav = mixer.render(resolved, output, project_root)
            audio_uri = 'data:audio/wav;base64,' + base64.b64encode(wav.read_bytes()).decode('ascii')
        finally:
            sys.path.remove(str(audio_dir))
    else:
        # Prevent an earlier audible build from being accidentally remuxed.
        for name in ('animation-sfx.wav', 'sfx-events.json'):
            stale = output / name
            if stale.is_file():
                stale.unlink()
    payload = {'resolved': resolved, 'style': style, 'assets': assets, 'mouth': mouth, 'audio': audio_uri}
    runtime = '\n'.join((skill_root / path).read_text(encoding='utf-8')
                         for path in javascript_files(skill_root, resolved))
    serialized = json.dumps(payload, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
    template = (skill_root / 'engine' / 'player.html').read_text(encoding='utf-8')
    document = template.replace('__TITLE__', html.escape(resolved['project']['title']))
    document = document.replace('__RUNTIME__', runtime).replace('__PAYLOAD__', serialized)
    target = output / 'film.html'
    target.write_text(document, encoding='utf-8')
    (output / 'runtime.js').write_text(runtime, encoding='utf-8')
    (output / 'payload.json').write_text(json.dumps(payload, ensure_ascii=False), encoding='utf-8')
    (output / 'mouth-timing.json').write_text(json.dumps({'mode':'text-timed rehearsal; no voice alignment','cues':mouth}, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    (output / 'build-report.json').write_text(json.dumps({'contractVersion':resolved['contractVersion'],'inputHash':resolved['inputHash'],
        'durationFrames':resolved['durationFrames'],'audioEnabled':audio_uri is not None,'actorVariants':library_asset_count,
        'actorPreviewMode':'reference-static','actorMouthAnimation':False,'actorSkeletalAnimation':False,
        'styleAssets':len(style_assets),
        'mouthSegments':len(mouth),'preview':'film.html'}, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    return target
