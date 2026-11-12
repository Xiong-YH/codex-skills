"""Files actually consumed by a project, shared by preview assembly and locking."""
import json
from pathlib import Path


SCENE_SCRIPTS = {
    'scenes.cache-journey.v1': ['library/computing.js', 'scenes/cache-journey.js'],
    'scenes.cache-adventure.v1': ['library/computing.js', 'library/actor-performance.js',
                                  'motion/staging.js', 'scenes/cache-journey.js', 'scenes/cache-adventure.js'],
    'scenes.presenter-board.v1': ['scenes/presenter-board.js'],
    'scenes.study-routes.v1': ['library/education.js', 'scenes/study-routes.js'],
}
NARRATIVE_RECIPES = {'motion.book-sweep.v1',
                     'motion.scene-to-card.v1', 'motion.match-dissolve.v1', 'motion.cross-dissolve.v1', 'motion.fade-through-black.v1'}


def read(path):
    return json.loads(path.read_text(encoding='utf-8-sig'))


def inside(root, relative):
    path = (root / relative).resolve()
    if not path.is_relative_to(root.resolve()):
        raise ValueError('Dependency must stay inside its module: ' + str(relative))
    return path


def selected_style(skill, resolved):
    root = Path(skill) / 'modules/style'
    selected = next(item for item in read(root / 'catalog.json')['items']
                    if item['id'] == resolved['project']['style'])
    style = read(inside(root, selected['file']))
    if selected.get('scenePreset'):
        layout = read(inside(Path(skill) / 'modules/scenes', selected['scenePreset']))
        allowed = {'libraryAssets', 'backgrounds', 'presenter', 'transitionTextures'}
        if not isinstance(layout, dict) or set(layout) - allowed or set(layout) & set(style):
            raise ValueError('Scene preset must contain only distinct layout/resource fields')
        style.update(layout)
    return selected, style


def visual_asset_files(skill, style):
    """Resolve library images and legacy style-local images without path escapes."""
    skill = Path(skill)
    legacy = style.get('assets', {})
    if not isinstance(legacy, dict):
        raise ValueError('Style assets must map stable IDs to module-relative image files')
    files = {ident: inside(skill / 'modules/style', relative)
             for ident, relative in legacy.items()}
    ids = style.get('libraryAssets', [])
    if not isinstance(ids, list) or any(not isinstance(ident, str) for ident in ids):
        raise ValueError('libraryAssets must be a list of stable image IDs')
    if ids:
        records = read(skill / 'modules/library/backgrounds/catalog.json')['assets']
        if len(ids) != len(set(ids)):
            raise ValueError('Duplicate library image IDs')
        for ident in ids:
            if ident in files:
                raise ValueError('Duplicate visual asset ID: ' + ident)
            if ident not in records:
                raise ValueError('Unknown library image ID: ' + ident)
            files[ident] = inside(skill / 'modules/library', records[ident]['file'])
    return files


def actor_ids(resolved):
    result = {shot['actor'] for shot in resolved['shots'] if shot.get('actor')}
    # The competition room currently owns the presenter in its first two phases.
    if any(shot['scene'] == 'scenes.competition-routes.v1' and
           shot['params'].get('presentation') in ('cinematic', 'gameplay') and
           shot['params']['phase'] in ('question', 'training') for shot in resolved['shots']):
        result.add('actor.azong.v3')
    return result


def actor_actions(resolved):
    result = {}
    for shot in resolved['shots']:
        if shot.get('performance'):
            result.setdefault(shot['actor'], set()).update(['neutral', *(p['pose'] for p in shot['performance'])])
    return result


def javascript_files(skill, resolved):
    selected, _ = selected_style(skill, resolved)
    paths = ['style/runtime.js']
    if selected.get('runtime'):
        style_root = (Path(skill) / 'modules/style').resolve()
        paths.append('style/' + inside(style_root, selected['runtime']).relative_to(style_root).as_posix())
    if selected.get('sceneRuntime'):
        scene_root = (Path(skill) / 'modules/scenes').resolve()
        paths.append('scenes/' + inside(scene_root, selected['sceneRuntime']).relative_to(scene_root).as_posix())
    paths += ['text/runtime.js', 'library/runtime.js', 'motion/runtime.js', 'scenes/runtime.js']
    if actor_actions(resolved):
        paths.append('scenes/presenter-actions.js')
    if resolved.get('progress'):
        paths.append('text/narrative-progress.js')
    if any(shot.get('background') or shot.get('replacement') or shot.get('components') for shot in resolved['shots']):
        paths += ['scenes/media.js']
    if any(shot.get('components') for shot in resolved['shots']):
        paths += ['components/style-layers.js', 'components/plain.js', 'components/apparatus.js']
        if any(component.get('visualStyle') == 'paper'
               for shot in resolved['shots'] for component in shot.get('components', [])):
            paths.append('components/paper.js')
        paths.append('components/runtime.js')
    scenes = {shot['scene'] for shot in resolved['shots']}
    objects = {obj['asset'] for shot in resolved['shots'] for obj in shot.get('objects', [])}
    records = read(Path(skill) / 'modules/library/catalog.json')['items']
    for renderer in ('computing', 'education'):
        if any(item['id'] in objects and item.get('renderer') == renderer for item in records):
            paths.append('library/' + renderer + '.js')
    for scene in sorted(scenes):
        paths += SCENE_SCRIPTS.get(scene, [])
    if 'scenes.competition-routes.v1' in scenes:
        paths.append('scenes/competition-routes.js')
        modes = {shot['params'].get('presentation') for shot in resolved['shots']
                 if shot['scene'] == 'scenes.competition-routes.v1'}
        if modes & {'paced', 'cinematic', 'gameplay'}:
            paths.append('scenes/competition-paced.js')
        if modes & {'cinematic', 'gameplay'}:
            paths += ['scenes/competition-cards.js', 'scenes/competition-cinematic.js']
        if 'gameplay' in modes:
            paths += ['motion/game-feedback.js', 'scenes/competition-feedback.js']
    recipes = {motion['recipe'] for shot in resolved['shots'] for motion in shot.get('motions', [])}
    if 'motion.actor-blocking.v1' in recipes:
        paths.append('motion/actor-blocking.js')
    if 'motion.contact-fx.v1' in recipes:
        paths.append('motion/contact-fx.js')
    if recipes & {'motion.component-handoff.v1', 'motion.line-handoff.v1', 'motion.preview-expand.v1', 'motion.panel-occlusion.v1'}:
        paths.extend(['motion/scene-exchange.js', 'motion/content-handoffs.js'])
    if recipes & NARRATIVE_RECIPES:
        paths.append('motion/narrative-transitions.js')
    paths += ['motion/pulse-spec.js', 'motion/pulse.js']  # Shared grammar, then runtime.
    return list(dict.fromkeys('modules/' + path for path in paths)) + ['engine/player.js']


def runtime_files(skill, resolved):
    skill = Path(skill)
    remotion = resolved['project'].get('renderBackend', 'canvas') == 'remotion'
    files = set() if remotion else set(javascript_files(skill, resolved))
    files.update(path.relative_to(skill).as_posix() for path in (skill / 'engine').glob('*.py')
                 if remotion or path.name != 'remotion_backend.py')
    # Canvas projects also use these React units and locked dependencies when
    # edited/exported in the workbench. Keep the original Canvas runtime locked.
    backend_root = skill / 'engine/remotion'
    files.update(path.relative_to(skill).as_posix() for path in backend_root.rglob('*')
                 if path.is_file() and not set(path.relative_to(backend_root).parts) &
                 {'node_modules', '.cache', '.remotion', 'build', 'outputs', '__pycache__'})
    if not remotion:
        files.update({'engine/player.html', 'engine/render_frames.cjs', 'package.json'})
    files.update({'scripts/video.py', 'requirements.txt', 'modules/library/prepare.py',
                  'modules/scenes/contract.py', 'modules/scenes/performance.py', 'modules/components/contract.py',
                  'modules/audio/narration.py', 'modules/motion/handoffs.py'})
    files.update({'modules/motion/pulse_contract.py', 'modules/motion/actor_blocking.py', 'modules/motion/FRAMETELL-NOTICE.md',
                  'modules/motion/licenses/AGPL-3.0.txt'})
    # Catalogs are validation contracts; lock these even when only one entry is selected.
    files.update('modules/' + name + '/catalog.json'
                 for name in ('style', 'library', 'text', 'motion', 'audio', 'scenes', 'components'))
    if any(shot.get('components') for shot in resolved['shots']):
        component_root = skill / 'modules/components'
        files.add('modules/components/assets/gears/manifest.json')
        for item in read(component_root / 'assets/gears/manifest.json')['items']:
            files.add(inside(component_root, item['file']).relative_to(skill).as_posix())
    selected, style = selected_style(skill, resolved)
    files.add('modules/style/' + selected['file'])
    if selected.get('scenePreset'):
        files.add(inside(skill / 'modules/scenes', selected['scenePreset']).relative_to(skill).as_posix())
    if style.get('libraryAssets'):
        files.add('modules/library/backgrounds/catalog.json')
    files.update(path.relative_to(skill).as_posix() for path in visual_asset_files(skill, style).values())
    for item in read(skill / 'modules/library/catalog.json')['items']:
        if item['id'] in actor_ids(resolved):
            files.add('modules/library/' + item['path'])
    actions = actor_actions(resolved)
    if actions:
        manifest = 'modules/library/characters/performance.json'
        files.add(manifest)
        for actor, poses in actions.items():
            for pose in poses:
                relative = read(skill / manifest)['actors'][actor][pose]['file']
                files.add(inside(skill / 'modules/library', relative).relative_to(skill).as_posix())
    if resolved['project'].get('audioMode') != 'silent':
        files.update('modules/audio/' + name for name in
                     ('mixer.py', 'palette.py', 'game_audio.py', 'arcade.py'))
        if resolved.get('bgm'):
            files.add('modules/audio/music.py')
        sounds = {cue['sound'] for cue in resolved.get('audio', []) if 'sound' in cue}
        if any(cue.get('synthesis') for cue in resolved.get('audio', [])):
            files.update('modules/audio/' + name for name in (
                'synthesis.py', 'render-sfx.mjs', 'vendor/garden-skills/scripts/lib/synth.mjs',
                'vendor/garden-skills/LICENSE', 'vendor/garden-skills/NOTICE.md'))
        for bank in ('arcade-motion', 'common-motion'):
            directory = 'modules/audio/assets/' + bank + '/'
            manifest = directory + 'manifest.json'
            files.add(manifest)  # palette reads both banks at import time.
            for item in read(skill / manifest)['atoms']:
                if item['id'] in sounds:
                    relative = directory + item['files']['master']['file']
                    files.add(inside(skill, relative).relative_to(skill).as_posix())
    return sorted(files)
