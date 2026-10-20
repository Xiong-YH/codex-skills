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
NARRATIVE_RECIPES = {'motion.book-sweep.v1', 'motion.shelf-travel.v1',
                     'motion.scene-to-card.v1', 'motion.match-dissolve.v1'}


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
    return selected, read(inside(root, selected['file']))


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
    paths += ['text/runtime.js', 'library/runtime.js', 'motion/runtime.js', 'scenes/runtime.js']
    if actor_actions(resolved):
        paths.append('library/presenter-actions.js')
    if resolved.get('progress'):
        paths.append('text/narrative-progress.js')
    if any(shot.get('background') or shot.get('replacement') or shot.get('components') for shot in resolved['shots']):
        paths += ['scenes/media.js']
    if any(shot.get('components') for shot in resolved['shots']):
        paths += ['components/runtime.js']
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
    if recipes & NARRATIVE_RECIPES:
        paths.append('motion/narrative-transitions.js')
    return list(dict.fromkeys('modules/' + path for path in paths)) + ['engine/player.js']


def runtime_files(skill, resolved):
    skill = Path(skill)
    remotion = resolved['project'].get('renderBackend', 'canvas') == 'remotion'
    files = set() if remotion else set(javascript_files(skill, resolved))
    files.update(path.relative_to(skill).as_posix() for path in (skill / 'engine').glob('*.py')
                 if remotion or path.name != 'remotion_backend.py')
    if remotion:
        backend_root = skill / 'engine/remotion'
        files.update(path.relative_to(skill).as_posix() for path in backend_root.rglob('*')
                     if path.is_file() and not set(path.relative_to(backend_root).parts) &
                     {'node_modules', '.cache', '.remotion', 'build', 'outputs', '__pycache__'})
    else:
        files.update({'engine/player.html', 'engine/render_frames.cjs', 'package.json'})
    files.update({'scripts/video.py', 'requirements.txt', 'modules/library/prepare.py',
                  'modules/scenes/contract.py', 'modules/scenes/performance.py', 'modules/components/contract.py',
                  'modules/audio/narration.py'})
    # Catalogs are validation contracts; lock these even when only one entry is selected.
    files.update('modules/' + name + '/catalog.json'
                 for name in ('style', 'library', 'text', 'motion', 'audio', 'scenes', 'components'))
    selected, style = selected_style(skill, resolved)
    files.add('modules/style/' + selected['file'])
    for relative in style.get('assets', {}).values():
        files.add(inside(skill / 'modules/style', relative).relative_to(skill).as_posix())
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
        manifest = 'modules/audio/assets/arcade-motion/manifest.json'
        files.add(manifest)  # palette reads the bank's semantic metadata at import time.
        sounds = {cue['sound'] for cue in resolved.get('audio', [])}
        for item in read(skill / manifest)['atoms']:
            if item['id'] in sounds:
                relative = 'modules/audio/assets/arcade-motion/' + item['files']['master']['file']
                files.add(inside(skill, relative).relative_to(skill).as_posix())
    return sorted(files)
