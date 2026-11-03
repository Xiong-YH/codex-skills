"""Read-only discovery view; runtime catalogs and validators keep their contracts."""
from __future__ import annotations

import copy
import json
from pathlib import Path

from .backend_caps import REMOTION_ACTORS, REMOTION_MOTIONS, REMOTION_SCENES, REMOTION_STYLES
from .registry import is_available

MODULES = ('style', 'library', 'components', 'text', 'motion', 'audio', 'scenes')
STATUSES = ('registered', 'workflow', 'legacy', 'standalone', 'unavailable', 'not_implemented')
EDITING = ('project-config', 'shot-props', 'text-track', 'transition-track', 'audio-track',
           'overlay-track', 'not-integrated')
REFERENCE_KINDS = ('documentation', 'examples', 'tests')
SKILL_ROOT = Path(__file__).resolve().parents[1]


def _read(path):
    return json.loads(path.read_text(encoding='utf-8-sig'))


def _inside(root, relative):
    if not isinstance(relative, str) or not relative or Path(relative).is_absolute():
        raise ValueError('Capability references must be relative local paths')
    path = (root / relative).resolve()
    if not path.is_relative_to(root.resolve()):
        raise ValueError('Capability reference escapes the skill: ' + relative)
    return path


def _merge(base, override):
    result = copy.deepcopy(base)
    for key, value in override.items():
        if key == 'notes' and isinstance(value, list) and isinstance(result.get(key), list):
            result[key] = list(dict.fromkeys(result[key] + value))
        elif isinstance(value, dict) and isinstance(result.get(key), dict):
            result[key] = _merge(result[key], value)
        else:
            result[key] = copy.deepcopy(value)
    return result


def _records(root, module):
    source = f'modules/{module}/catalog.json'
    records = [(item, 'registry', source) for item in _read(root / source)['items']]
    if module == 'library':
        source = 'modules/library/backgrounds/catalog.json'
        records += [({'id': ident, **item}, 'background', source)
                    for ident, item in _read(root / source)['assets'].items()]
    elif module == 'components':
        source = 'modules/components/object-components.json'
        records += [(item, 'standalone', source) for item in _read(root / source)['items']]
    return records


def _resources(module, raw, source_kind):
    if source_kind == 'background':
        return ['modules/library/' + raw['file']]
    root = f'modules/{module}/'
    if source_kind == 'standalone':
        return ([root + raw[key] for key in ('example', 'runtime') if raw.get(key)]
                + [root + path for path in raw.get('dependencies', []) + raw.get('assets', [])])
    if module == 'style':
        return [root + raw[key] for key in ('file', 'runtime') if raw.get(key)] + [
            'modules/scenes/' + raw[key] for key in ('scenePreset', 'sceneRuntime') if raw.get(key)]
    if module == 'library' and raw.get('path'):
        return [root + raw['path']]
    return []


def _validate_notes(notes):
    if not isinstance(notes, dict) or set(notes) - {'references', 'notes', 'workbench'}:
        raise ValueError('Capability annotations may contain only references, notes and workbench')
    if not isinstance(notes.get('notes', []), list) or any(not isinstance(v, str) for v in notes.get('notes', [])):
        raise ValueError('Capability notes must be a list of strings')
    refs = notes.get('references', {})
    if not isinstance(refs, dict) or set(refs) - set(REFERENCE_KINDS):
        raise ValueError('Unknown capability reference category')
    for values in refs.values():
        if not isinstance(values, list) or any(not isinstance(v, str) for v in values):
            raise ValueError('Capability reference categories must contain lists of local paths')
    workbench = notes.get('workbench', {})
    if not isinstance(workbench, dict) or set(workbench) - {'editing', 'track', 'independentTrack', 'export'}:
        raise ValueError('Unknown workbench capability annotation')
    if 'editing' in workbench and workbench['editing'] not in EDITING:
        raise ValueError('Unknown workbench editing mode')
    if 'independentTrack' in workbench and not isinstance(workbench['independentTrack'], bool):
        raise ValueError('independentTrack must be boolean')
    if 'track' in workbench and workbench['track'] not in (None, 'shots', 'captions', 'transitions', 'overlays', 'sfx', 'narration', 'bgm'):
        raise ValueError('Unknown workbench track')
    if 'export' in workbench and workbench['export'] not in ('via-track', 'project-config', 'not-integrated'):
        raise ValueError('Unknown workbench export mode')


def _validate_metadata(metadata):
    if not isinstance(metadata, dict) or metadata.get('schemaVersion') != 1:
        raise ValueError('Unsupported capability metadata version')
    if set(metadata) - {'schemaVersion', 'defaults', 'items', 'features'}:
        raise ValueError('Unknown capability metadata field')
    _validate_notes(metadata.get('defaults', {}))
    if not isinstance(metadata.get('items', {}), dict) or not isinstance(metadata.get('features', []), list):
        raise ValueError('Capability items must be a map and features must be a list')
    for notes in metadata.get('items', {}).values():
        _validate_notes(notes)
    for feature in metadata.get('features', []):
        if not isinstance(feature, dict) or set(feature) - {'id', 'title', 'status', 'invocation', 'references', 'notes', 'workbench'}:
            raise ValueError('Unknown capability feature field')
        if any(not isinstance(feature.get(key), str) or not feature[key] for key in ('id', 'title', 'invocation')):
            raise ValueError('Features require id, title and invocation')
        if feature.get('status') not in ('workflow', 'not_implemented'):
            raise ValueError('Features describe workflows or missing implementations; runtime registration comes from catalogs')
        _validate_notes({key: feature[key] for key in ('references', 'notes', 'workbench') if key in feature})


def _status(raw, source_kind):
    if not is_available(raw):
        if raw.get('status') == 'not_implemented':
            return 'not_implemented'
        return 'unavailable'
    if source_kind == 'standalone':
        return 'standalone'
    if source_kind == 'feature':
        return raw['status']
    return 'legacy' if raw.get('status') == 'legacy-compatibility' else 'registered'


def _backends(module, raw, source_kind, status):
    ident = raw['id']
    if status in ('unavailable', 'not_implemented'):
        return {name: {'supported': False, 'scope': 'No callable implementation'}
                for name in ('canvas', 'remotion')}
    native = {
        'style': ident in REMOTION_STYLES,
        'library': ident in REMOTION_ACTORS,
        'components': False,
        'text': source_kind == 'registry',
        'motion': ident in REMOTION_MOTIONS,
        'audio': True,
        'scenes': ident in REMOTION_SCENES,
    }[module]
    canvas = not (module == 'scenes' and 'canvas' not in raw.get('backends', ['canvas']))
    return {
        'canvas': {'supported': canvas,
                   'scope': 'Standalone Canvas demo only; not a VideoSpec kind'
                   if source_kind == 'standalone' else 'Canvas runtime; project constraints still apply'},
        'remotion': {'supported': native,
                     'scope': 'Native focus-desk composition only; obey backend_caps.validate'
                     if native else 'Not supported by the native Remotion executor'},
    }


def _invocation(module, raw, source_kind):
    if source_kind == 'feature':
        return raw['invocation']
    if source_kind == 'standalone':
        return 'Standalone HTML/Canvas; not shot.components.kind'
    if source_kind == 'background':
        return 'Scene preset libraryAssets ID; not project.style or a project media file'
    return {
        'style': 'project.style',
        'library': 'timeline.shots[].actor' if raw.get('kind') == 'actor' else 'timeline.shots[].objects[].asset',
        'components': 'timeline.shots[].components[].kind=' + str(raw.get('kind', '')),
        'text': 'text.cues[].role=' + str(raw.get('role', '')),
        'motion': 'timeline.shots[].motions[].recipe',
        'audio': 'audio.cues[].sound',
        'scenes': 'timeline.shots[].scene',
    }[module]


def _workbench(module, raw, source_kind, status):
    if status in ('standalone', 'unavailable', 'not_implemented'):
        return {'editing': 'not-integrated', 'track': None, 'independentTrack': False,
                'export': 'not-integrated'}
    editing, track, independent = {
        'style': ('project-config', None, False),
        'library': ('shot-props', 'shots', False),
        'components': ('shot-props', 'shots', False),
        'text': ('text-track', 'captions', True),
        'motion': ('transition-track', 'transitions', True)
        if raw.get('kind') == 'transition' else ('shot-props', 'shots', False),
        'audio': ('audio-track', 'sfx', True),
        'scenes': ('shot-props', 'shots', True),
    }[module]
    if source_kind == 'background':
        editing, track, independent = 'project-config', None, False
    return {'editing': editing, 'track': track, 'independentTrack': independent,
            'export': 'project-config' if editing == 'project-config' else 'via-track'}


def inventory(skill_root=SKILL_ROOT):
    """Combine declarations and discovery notes, without changing runtime registration."""
    root = Path(skill_root)
    modules, seen = [], set()
    for module in MODULES:
        metadata_path = f'modules/{module}/capabilities.json'
        metadata = _read(root / metadata_path)
        _validate_metadata(metadata)
        records = _records(root, module)
        features = metadata.get('features', [])
        records += [(item, 'feature', metadata_path) for item in features]
        ids = {item['id'] for item, _, _ in records}
        unknown = set(metadata.get('items', {})) - ids
        if unknown:
            raise ValueError('Unknown capability metadata IDs: ' + ', '.join(sorted(unknown)))
        items = []
        for raw, source_kind, source in records:
            ident = raw['id']
            if ident in seen:
                raise ValueError('Duplicate capability ID: ' + ident)
            seen.add(ident)
            status = _status(raw, source_kind)
            if status not in STATUSES:
                raise ValueError('Unknown capability status: ' + ident)
            notes = _merge(metadata.get('defaults', {}), metadata.get('items', {}).get(ident, {}))
            if source_kind == 'feature':
                notes = _merge(notes, {k: raw[k] for k in ('references', 'notes', 'workbench') if k in raw})
            item = {'id': ident, 'module': module,
                    'title': raw.get('title') or raw.get('name') or raw.get('purpose') or ident,
                    'kind': 'background' if source_kind == 'background' else raw.get('kind', raw.get('role', source_kind)),
                    'status': status, 'sourceStatus': raw.get('status'),
                    'source': {'file': source, 'kind': source_kind,
                               'resources': _resources(module, raw, source_kind)},
                    'invocation': _invocation(module, raw, source_kind),
                    'backends': _backends(module, raw, source_kind, status),
                    'workbench': _merge(_workbench(module, raw, source_kind, status), notes.get('workbench', {})),
                    'references': notes.get('references', {}), 'notes': notes.get('notes', []),
                    'verification': {'testRun': 'not_run', 'visualReview': 'not_reviewed',
                                     'referenceScope': 'Listed files are reference/coverage sources, not per-item pass evidence'}}
            # No metadata annotation may turn a demo or a missing executor into an editor feature.
            if status in ('standalone', 'unavailable', 'not_implemented'):
                item['workbench'] = _workbench(module, raw, source_kind, status)
            item['notes'] += [key + ': ' + str(raw[key]) for key in ('selection', 'reason', 'replacement')
                              if raw.get(key)]
            if source_kind == 'standalone':
                item['notes'] += [raw.get('scope', ''), raw.get('currentUse', '')]
                item['references']['examples'] = ([f'modules/{module}/' + raw['example']]
                                                   if raw.get('example') else [])
            items.append(item)
        modules.append({'module': module, 'guide': f'modules/{module}/GUIDE.md', 'items': items})
    return {'schemaVersion': 1, 'modules': modules}


def query(skill_root=SKILL_ROOT, *, module=None, ident=None, backend=None, status=None):
    if module is not None and module not in MODULES:
        raise ValueError('Unknown capability module: ' + module)
    if backend is not None and backend not in ('canvas', 'remotion'):
        raise ValueError('Unknown capability backend: ' + backend)
    if status is not None and status not in STATUSES:
        raise ValueError('Unknown capability status: ' + status)
    data = inventory(skill_root)
    if ident is not None and not any(item['id'] == ident for group in data['modules']
                                     if module is None or group['module'] == module for item in group['items']):
        raise ValueError('Unknown capability ID in selected module: ' + ident)
    groups = []
    for group in data['modules']:
        if module is not None and group['module'] != module:
            continue
        items = [item for item in group['items']
                 if (ident is None or item['id'] == ident)
                 and (backend is None or item['backends'][backend]['supported'])
                 and (status is None or item['status'] == status)]
        groups.append({**group, 'items': items})
    return {**data, 'modules': groups, 'count': sum(len(group['items']) for group in groups)}


def check(skill_root=SKILL_ROOT):
    """Validate local discovery references; never interpret this as running their tests."""
    root, data = Path(skill_root), inventory(skill_root)
    references, tests, omitted = set(), set(), []
    for group in data['modules']:
        references.add(group['guide'])
        for item in group['items']:
            references.add(item['source']['file'])
            references.update(item['source']['resources'])
            workbench = item['workbench']
            if workbench['editing'] not in EDITING or not isinstance(workbench['independentTrack'], bool):
                raise ValueError('Invalid workbench capability: ' + item['id'])
            if set(item['references']) - set(REFERENCE_KINDS):
                raise ValueError('Unknown capability reference category: ' + item['id'])
            for values in item['references'].values():
                if not isinstance(values, list):
                    raise ValueError('Capability reference categories must contain lists')
                references.update(values)
            tests.update(item['references'].get('tests', []))
    for relative in sorted(references):
        if not _inside(root, relative).exists():
            if relative in tests and not (root / 'tests').exists():
                omitted.append(relative)
                continue
            raise ValueError('Missing capability reference: ' + relative)
    return {'schemaVersion': 1, 'status': 'passed', 'modules': len(data['modules']),
            'items': sum(len(group['items']) for group in data['modules']),
            'referencesChecked': len(references) - len(omitted),
            'omittedTestReferences': omitted, 'testsExecuted': False}
