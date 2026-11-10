"""Read-only change planning. Successful builds alone advance the baseline."""
import copy
import hashlib
import json
from pathlib import Path


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=False).encode()).hexdigest()


def localize(value, start):
    if isinstance(value, list):
        return [localize(x, start) for x in value]
    if not isinstance(value, dict):
        return value
    return {k: v - start if k in ('frame', 'startFrame', 'endFrame', 'anchorFrame') and isinstance(v, int)
            else localize(v, start) for k, v in value.items()}


def snapshot(resolved, skill):
    from .dependencies import runtime_files
    shots = {}
    components = {}
    fps = resolved['project']['fps']
    for shot in resolved['shots']:
        sid, start, end = shot['id'], shot['startFrame'], shot['endFrame']
        # Runtime dependency discovery is the same contract used by build locking.
        used = dict(project=resolved['project'], shots=[shot], audio=resolved['audio'],
                    progress=resolved.get('progress'), bgm=resolved.get('bgm'))
        files = runtime_files(skill, used)
        dependencies = {f: hashlib.sha256((Path(skill) / f).read_bytes()).hexdigest() for f in files}
        text = [c for c in resolved['cues'] if c['startFrame'] < end and c['endFrame'] > start]
        audio = [c for c in resolved['audio'] if c['frame'] < end and (
            c.get('anchorFrame', c['frame']) >= start or c.get('samples', 0) > (start - c['frame']) * 48000 / fps)]
        narration = [c for c in resolved['narration'] if c['frame'] < end and
                     c['frame'] / fps + c['samples'] / 48000 > start / fps]
        content = localize(copy.deepcopy(shot), start)
        content.pop('startFrame', None)
        content.pop('endFrame', None)
        for c in shot['components']:
            key = 'components.' + c['kind'] + '.v1'
            record = components.setdefault(key, {'shots': [], 'implementationHash': digest(
                {k: v for k, v in dependencies.items() if '/components/' in k})})
            if sid not in record['shots']:
                record['shots'].append(sid)
        shots[sid] = {'startFrame': start, 'endFrame': end,
                      'visual': digest(content), 'text': digest(localize(text, start)),
                      'audio': digest(localize([audio, narration, resolved.get('bgm'), resolved.get('mix')], start)),
                      'dependencies': dependencies,
                      'project': digest(resolved['project']),
                      'media': digest(resolved.get('media', {}))}
    return {'schemaVersion': 1, 'inputHash': resolved['inputHash'], 'shots': shots,
            'components': components}


def preflight(resolved):
    issues = []
    fps = resolved['project']['fps']
    for shot in resolved['shots']:
        start, end = shot['startFrame'], shot['endFrame']
        intervals = [(c['startFrame'], c['endFrame']) for c in resolved['cues']]
        intervals += [(m['startFrame'], m['endFrame']) for m in shot['motions']]
        intervals += [(p['startFrame'], p['endFrame']) for p in shot['performance']]
        intervals += [(n['frame'], n['frame'] + round(n['samples'] / 48000 * fps)) for n in resolved['narration']]
        relevant = [(a, b) for a, b in intervals if a < end and b > start]
        if relevant:
            last = min(end, max(b for _, b in relevant))
            if end - last > fps:
                issues.append({'shotId': shot['id'], 'kind': 'tail-hold', 'level': 'review',
                    'startFrame': last, 'endFrame': end,
                    'message': '已知讲述/文字/动作区间结束后仍有停留；请核对阅读、情绪或接镜目的，不自动裁短。'})
    return {'status': 'needs_review' if issues else 'no_findings', 'issues': issues,
            'coverage': 'compiled timing only; no pixel-layout, listening or semantic approval',
            'visualReview': 'not_reviewed', 'audioReview': 'not_reviewed' if resolved['narration'] or resolved['audio'] else 'not_applicable'}


def plan(current, previous=None, resolved=None):
    old = (previous or {}).get('shots', {})
    changed, unchanged = [], []
    for sid, state in current['shots'].items():
        before = old.get(sid)
        reasons = ['new'] if before is None else [k for k in state if state[k] != before.get(k)]
        if reasons:
            changed.append({'shotId': sid, 'reasons': reasons,
                            'startFrame': state['startFrame'], 'endFrame': state['endFrame']})
        else:
            unchanged.append(sid)
    changed_ids = {x['shotId'] for x in changed}
    order = list(current['shots'])
    neighbours = set()
    for i, sid in enumerate(order):
        if sid in changed_ids:
            neighbours.update(order[max(0, i - 1): i + 2])
    return {'schemaVersion': 1, 'inputHash': current['inputHash'],
            'baselineHash': (previous or {}).get('inputHash'), 'changed': changed,
            'unchanged': unchanged, 'removed': sorted(set(old) - set(current['shots'])),
            'reviewShots': [sid for sid in order if sid in neighbours],
            'components': current['components'],
            'preflight': preflight(resolved) if resolved else None,
            'preview': 'current' if previous and current['inputHash'] == previous.get('inputHash') else 'rebuild_required',
            'review': 'not_reviewed', 'note': 'Source plan; saved workbench edits remain independent.'}


def inspect(root, skill):
    from .compiler import compile_project, read_json
    root = Path(root)
    baseline = root / 'build/project-state.json'
    previous = read_json(baseline) if baseline.is_file() else None
    resolved = compile_project(root, skill_root=skill)
    return plan(snapshot(resolved, skill), previous, resolved)
