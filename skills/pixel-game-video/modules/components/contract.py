"""Semantic component contracts; positions and timing remain shot-owned."""
import math


def validate(component, shot, previous_ids):
    kind, data = component['kind'], component['data']
    events = {e['id']: e.get('localFrame', e['frame']) for e in shot['events']}

    def event(name):
        if not isinstance(name, str) or name not in events or events[name] >= shot['durationFrames']:
            raise ValueError(f"{component['id']}: unreachable component event {name!r}")
        return events[name]

    def text(value, field, limit=48):
        if not isinstance(value, str) or not value.strip() or len(value) > limit:
            raise ValueError(f"{component['id']}.{field}: expected 1–{limit} characters")

    def keys(value, required, optional):
        if not isinstance(value, dict) or not required <= value.keys() or value.keys() - required - optional:
            raise ValueError(f"{component['id']}: invalid {kind} fields")

    def picture(item):
        if item.get('image') and item.get('sourceShot'):
            raise ValueError('Choose image or sourceShot, not both')
        if 'image' in item:
            text(item['image'], 'image', 240)
        if 'sourceShot' in item:
            text(item['sourceShot'], 'sourceShot', 100)
            if item['sourceShot'] not in previous_ids:
                raise ValueError('Component snapshots must refer to preceding shots')

    def items(minimum, maximum, required, optional, ordered=False):
        entries = data.get('items')
        if not isinstance(entries, list) or not minimum <= len(entries) <= maximum:
            raise ValueError(f'{kind} requires {minimum}–{maximum} items')
        previous = show
        for item in entries:
            keys(item, required, optional)
            at = event(item['event'])
            if at < show or (ordered and at < previous):
                raise ValueError(f'{kind} events must follow reveal and reading order')
            previous = at
            for field in ('title', 'label', 'detail', 'text'):
                if field in item:
                    text(item[field], field, 96 if field == 'text' else 48)
        return entries

    show = event(component['showEvent'])
    if component.get('focusEvent') and event(component['focusEvent']) < show:
        raise ValueError('Component focus must follow its reveal')
    if component['x'] + component['width'] > 1 or component['y'] + component['height'] > 1:
        raise ValueError('Component bounds must fit inside the frame')
    if kind == 'identity':
        keys(data, {'title'}, {'eyebrow', 'detail', 'image', 'sourceShot'})
        picture(data)
    elif kind == 'metric':
        keys(data, {'title', 'from', 'to', 'startEvent', 'endEvent'}, {'unit', 'detail'})
        for key in ('from', 'to'):
            if type(data[key]) not in (int, float) or not math.isfinite(data[key]) or abs(data[key]) > 2**53-1:
                raise ValueError('Metric values must be finite JavaScript-safe numbers')
        if not show <= event(data['startEvent']) < event(data['endEvent']):
            raise ValueError('Metric events must be ordered after reveal')
    elif kind == 'comparison':
        keys(data, {'title', 'items'}, set())
        if not isinstance(data['items'], list) or not 2 <= len(data['items']) <= 3:
            raise ValueError('Comparison requires two or three items')
        for item in data['items']:
            keys(item, {'title', 'event'}, {'value', 'detail', 'image', 'sourceShot'})
            if event(item['event']) < show:
                raise ValueError('Comparison items must follow the group reveal')
            picture(item)
            for field in ('title', 'value', 'detail'):
                if field in item:
                    text(item[field], field)
    elif kind == 'annotation':
        keys(data, {'label', 'targetX', 'targetY'}, set())
        for field in ('targetX', 'targetY'):
            if type(data[field]) not in (int, float) or not 0 <= data[field] <= 1:
                raise ValueError('Annotation target must be inside the frame')
    elif kind == 'chapter':
        keys(data, {'index', 'title'}, {'detail'})
        text(data['index'], 'index', 12)
    elif kind in ('flow', 'timeline'):
        keys(data, {'title', 'items'}, set())
        required = {'title', 'event'} | ({'label'} if kind == 'timeline' else set())
        items(2 if kind == 'flow' else 3, 5, required, {'detail'}, ordered=True)
    elif kind == 'checklist':
        keys(data, {'title', 'items'}, set())
        items(2, 5, {'label', 'event'}, {'detail'})
    elif kind == 'hierarchy':
        keys(data, {'title', 'rootTitle', 'items'}, {'detail'})
        items(2, 4, {'title', 'event'}, {'detail'})
    elif kind == 'bars':
        keys(data, {'title', 'max', 'items'}, {'unit'})
        if type(data['max']) not in (int, float) or not math.isfinite(data['max']) or not 0 < data['max'] <= 2**53-1:
            raise ValueError('Bar maximum must be a positive finite JavaScript-safe number')
        for item in items(2, 4, {'label', 'value', 'event', 'endEvent'}, set()):
            value = item['value']
            if type(value) not in (int, float) or not math.isfinite(value) or not 0 <= value <= data['max']:
                raise ValueError('Bar values must be finite and between zero and max')
            if event(item['endEvent']) <= event(item['event']):
                raise ValueError('Bar endEvent must follow its reveal')
    elif kind == 'code':
        keys(data, {'title', 'items'}, {'language'})
        entries = items(2, 7, {'text', 'event'}, set(), ordered=True)
        for item in entries:
            if any(char in item['text'] for char in ('\n', '\r', '\t')):
                raise ValueError('Code items are single lines; use spaces for indentation')
    elif kind == 'takeaway':
        keys(data, {'title'}, {'eyebrow', 'detail'})
    for field in ('title', 'label', 'eyebrow', 'detail', 'unit', 'rootTitle', 'language'):
        if field in data:
            text(data[field], field)


def images(component):
    data = component['data']
    return [item['image'] for item in [data, *data.get('items', [])] if item.get('image')]
