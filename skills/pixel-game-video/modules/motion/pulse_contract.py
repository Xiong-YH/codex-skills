"""Frame-based contract for the non-3D motion port. No engine exploration at runtime."""
import math

EASES = {'out', 'inOut', 'linear', 'slam', 'expo', 'back', 'draw'}
RECIPES = {'motion.camera-pulse.v1', 'motion.camera-path.v1', 'motion.camera-shake.v1',
           'motion.layer-move.v1', 'motion.page-turn.v1'}


def number(value, lo, hi, label):
    if type(value) not in (int, float) or not math.isfinite(value) or not lo <= value <= hi:
        raise ValueError(f'{label}: expected finite number in [{lo}, {hi}]')


def validate(recipe, params):
    if recipe not in RECIPES:
        return False
    rules = {'motion.camera-pulse.v1': {'x': (0, 1), 'y': (0, 1), 'scale': (1, 1.75)},
             'motion.camera-path.v1': {}, 'motion.camera-shake.v1': {'amplitude': (0, 40)},
             'motion.page-turn.v1': {'blur': (0, 12), 'exitPixels': (0, 120), 'enterPixels': (0, 120)},
             'motion.layer-move.v1': {**{k+s: limits for k, limits in
                 [('x', (-1, 1)), ('y', (-1, 1)), ('scale', (.05, 4)),
                  ('rotation', (-360, 360)), ('opacity', (0, 1))] for s in ['From', 'To']}}}[recipe]
    choices = {'ease': EASES} if recipe in {'motion.camera-pulse.v1', 'motion.layer-move.v1'} else {}
    if recipe in {'motion.camera-pulse.v1', 'motion.camera-path.v1'}:
        choices['bounds'] = {'cover', 'free'}
    if recipe == 'motion.camera-pulse.v1':
        choices['kind'] = {'push', 'pan', 'slam', 'back'}
        if params.get('kind') == 'back' and set(params) & {'x', 'y', 'scale'}:
            raise ValueError('back always returns to center at scale 1; remove x/y/scale')
    if recipe == 'motion.layer-move.v1':
        choices['layer'] = {'background', 'actor', 'content'}
        if 'layer' not in params:
            raise ValueError('layer-move requires layer')
    if recipe == 'motion.page-turn.v1':
        choices['direction'] = {'left', 'right'}
    for key, value in params.items():
        if key in choices:
            if not isinstance(value, str) or value not in choices[key]:
                raise ValueError(f'{recipe}.{key}: unsupported choice')
        elif key in rules:
            number(value, *rules[key], f'{recipe}.{key}')
        elif key != 'keys' or recipe != 'motion.camera-path.v1':
            raise ValueError(f'{recipe}: unsupported parameter {key}')
    if recipe == 'motion.camera-path.v1':
        keys = params.get('keys')
        if not isinstance(keys, list) or not 1 <= len(keys) <= 64:
            raise ValueError('camera-path.keys requires 1–64 keys')
        previous_end = 0
        for key in keys:
            if not isinstance(key, dict) or set(key) - {'atFrame', 'durationFrames', 'x', 'y', 'scale', 'ease'}:
                raise ValueError('camera-path key: unsupported fields')
            at, duration = key.get('atFrame'), key.get('durationFrames')
            if type(at) is not int or at < previous_end or type(duration) is not int or duration < 1:
                raise ValueError('camera-path keys require ordered non-overlapping integer frame windows')
            for name in ('x', 'y', 'scale'):
                if name in key:
                    number(key[name], 1 if name == 'scale' else 0, 1.75 if name == 'scale' else 1, name)
            if not isinstance(key.get('ease', 'inOut'), str) or key.get('ease', 'inOut') not in EASES:
                raise ValueError('camera-path key: unknown ease')
            previous_end = at + duration
    return True


def validate_window(recipe, params, duration):
    if recipe == 'motion.camera-path.v1' and params['keys'][-1]['atFrame'] + params['keys'][-1]['durationFrames'] > duration:
        raise ValueError('camera-path key extends outside motion durationFrames')
