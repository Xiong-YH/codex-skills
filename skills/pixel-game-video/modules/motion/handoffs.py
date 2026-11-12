"""Contracts for content-driven transitions; coordinates belong to the project."""
import math

RECIPES = {'motion.component-handoff.v1', 'motion.line-handoff.v1',
           'motion.preview-expand.v1', 'motion.panel-occlusion.v1'}
MODES = {'match', 'reflow', 'overview', 'merge', 'keyword'}


def _number(value, lo, hi, label):
    if type(value) not in (int, float) or not math.isfinite(value) or not lo <= value <= hi:
        raise ValueError(f'{label}: expected finite number in [{lo}, {hi}]')


def _rect(value, label):
    if not isinstance(value, list) or len(value) != 4:
        raise ValueError(f'{label}: expected [x,y,width,height]')
    for n in value:
        _number(n, 0, 1, label)
    x, y, w, h = value
    if w <= 0 or h <= 0 or x+w > 1.000001 or y+h > 1.000001:
        raise ValueError(f'{label}: rectangle must fit inside the frame')


def _id(value):
    if not isinstance(value, str) or not value:
        raise ValueError('handoff component ID must be a nonempty string')


def validate_params(recipe, p):
    if recipe not in RECIPES:
        return False
    if recipe == 'motion.component-handoff.v1':
        mode = p.get('mode')
        if mode not in MODES:
            raise ValueError('component-handoff.mode must be match, reflow, overview, merge or keyword')
        allowed = {'mode', 'sources', 'target'} if mode == 'merge' else {'mode', 'pairs'}
        if mode == 'merge':
            sources = p.get('sources')
            if not isinstance(sources, list) or not 2 <= len(sources) <= 6:
                raise ValueError('merge requires 2–6 sources')
            for ident in sources:
                _id(ident)
            if len(set(sources)) != len(sources):
                raise ValueError('merge source IDs must be unique')
            _id(p.get('target'))
        else:
            pairs = p.get('pairs')
            if not isinstance(pairs, list) or not 1 <= len(pairs) <= 6 or (mode != 'reflow' and len(pairs) != 1):
                raise ValueError('handoff requires one pair, or 1–6 reflow pairs')
            for pair in pairs:
                if not isinstance(pair, dict) or set(pair) != {'from', 'to'}:
                    raise ValueError('handoff pair requires exactly from/to component IDs')
                _id(pair['from']); _id(pair['to'])
            for key in ('from', 'to'):
                if len({pair[key] for pair in pairs}) != len(pairs):
                    raise ValueError('handoff pairs must not duplicate component IDs')
        if mode == 'keyword':
            allowed |= {'word', 'fromRect', 'toRect', 'fontFrom', 'fontTo'}
            if not isinstance(p.get('word'), str) or not 1 <= len(p['word']) <= 16:
                raise ValueError('keyword requires a word of 1–16 characters')
            for key in ('fromRect', 'toRect'):
                _rect(p.get(key), key)
            for key in ('fontFrom', 'fontTo'):
                _number(p.get(key, .045), .015, .12, key)
        if mode == 'match':
            allowed.add('roomReveal')
            if 'roomReveal' in p and p['roomReveal'] not in ('left', 'right'):
                raise ValueError('match roomReveal must be left or right')
    elif recipe == 'motion.line-handoff.v1':
        allowed = {'source', 'target', 'startLine', 'points'}
        _id(p.get('source')); _id(p.get('target'))
        for key, minimum, maximum in [('startLine', 2, 2), ('points', 2, 8)]:
            points = p.get(key)
            if not isinstance(points, list) or not minimum <= len(points) <= maximum:
                raise ValueError(f'{key}: expected {minimum}–{maximum} points')
            for point in points:
                if not isinstance(point, list) or len(point) != 2:
                    raise ValueError(f'{key}: expected [x,y] points')
                for n in point:
                    _number(n, 0, 1, key)
    elif recipe == 'motion.preview-expand.v1':
        allowed = {'window', 'source'}
        _id(p.get('source'))
        if 'window' in p:
            _rect(p['window'], 'window')
    else:
        allowed = {'source', 'direction'}
        _id(p.get('source'))
        if p.get('direction', 'left') not in ('left', 'right'):
            raise ValueError('panel-occlusion.direction must be left or right')
    if set(p) - allowed:
        raise ValueError(f'{recipe}: unsupported parameters {sorted(set(p)-allowed)}')
    return True


def validate_shots(recipe, p, previous, incoming, project, start, end):
    if recipe not in RECIPES:
        return
    old = {c['id']: c for c in previous.get('components', [])}
    new = {c['id']: c for c in incoming.get('components', [])}
    if recipe == 'motion.component-handoff.v1':
        mode = p['mode']
        sources = p['sources'] if mode == 'merge' else [x['from'] for x in p['pairs']]
        targets = [p['target']] if mode == 'merge' else [x['to'] for x in p['pairs']]
    else:
        sources = [p['source']]
        targets = [p['target']] if recipe == 'motion.line-handoff.v1' else []
    for ids, lookup, label in [(sources, old, 'outgoing'), (targets, new, 'incoming')]:
        for ident in ids:
            if ident not in lookup:
                raise ValueError(f'{recipe}: unknown {label} component {ident}')
    if recipe == 'motion.component-handoff.v1':
        if mode == 'overview':
            a, b = old[sources[0]], new[targets[0]]
            if abs(a['width']/a['height']-b['width']/b['height']) > .001:
                raise ValueError('overview must preserve component aspect ratio')
        if mode == 'keyword' and any(p['word'] not in str(c['data'].get('title', ''))
                                     for c in (old[sources[0]], new[targets[0]])):
            raise ValueError('keyword must occur in both component titles')
        if 'roomReveal' in p:
            a, b = old[sources[0]], new[targets[0]]
            if a['kind'] not in ('identity', 'takeaway') or any(
                    a[key] != b[key] for key in ('kind', 'data', 'visualStyle', 'styleVariant', 'features', 'tone')):
                raise ValueError('roomReveal needs the same identity or takeaway card in both shots')
            for component, shot, last in ((a, previous, start - 1), (b, incoming, end - 1)):
                show = next(event['frame'] for event in shot['events'] if event['id'] == component['showEvent'])
                if show >= last:
                    raise ValueError('roomReveal card must be visible in the outgoing frame and by landing')
    if recipe == 'motion.preview-expand.v1':
        c = old[p['source']]
        if c['kind'] != 'identity' or not c['data'].get('image') or c['data']['image'] != incoming.get('background', {}).get('file'):
            raise ValueError('preview-expand requires an identity image matching the incoming background file')
        if incoming.get('background', {}).get('dim', 0):
            raise ValueError('preview-expand incoming background must have dim=0')
        x, y, w, h = p.get('window', [0,0,1,1])
        # Window is a full-frame thumbnail, not a perspective crop of a room.
        if abs(w/h-1) > .001:
            raise ValueError('preview-expand window must preserve the frame aspect ratio (width == height in normalized coordinates)')
    if recipe == 'motion.panel-occlusion.v1':
        c = old[p['source']]
        ratio = c['width']*project['width']/(c['height']*project['height'])
        if c['kind'] != 'identity' or ratio <= 480/180:
            raise ValueError('panel-occlusion requires an opaque wide identity panel; portrait apparatus has transparent gaps')
    for owner in (previous, incoming):
        for motion in owner.get('motions', []):
            if not motion['recipe'].startswith('motion.camera-'):
                continue
            # This first contract uses screen-coordinate component anchors.
            raise ValueError('content handoffs require fixed cameras in both shots')


def validate_media(shots, project, media):
    for shot in shots:
        if not any(m['recipe']=='motion.preview-expand.v1' for m in shot.get('motions', [])):
            continue
        source = shot['background']
        item = media[source['assetKey']]
        if item['kind'] != 'image' or abs(item['width']/item['height']-project['width']/project['height']) > .001:
            raise ValueError('preview-expand image must match the project aspect ratio and be a still image')
