"""Semantic component contracts; positions and timing remain shot-owned."""
import math

ICONS = {'project', 'paper', 'book', 'search', 'chat', 'check', 'clock', 'person', 'folder',
         'play', 'pin', 'arrow', 'grid'}


def validate(component, shot, previous_ids):
    kind, data = component['kind'], component['data']
    if component.get('entryFrom') is not None and (kind != 'identity' or data.get('fit') != 'full'):
        raise ValueError('entryFrom is available for full image identity cards')
    features = component.get('features', [])
    if not isinstance(features, list) or len(features) > 1 or any(feature != 'stack' for feature in features):
        raise ValueError('features allows only the optional stack feature')
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

    def icon(item):
        if 'icon' in item and (not isinstance(item['icon'], str) or item['icon'] not in ICONS):
            raise ValueError(f"{component['id']}: unknown component icon {item['icon']!r}")

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
            icon(item)
        return entries

    show = event(component['showEvent'])
    if component.get('focusEvent') and event(component['focusEvent']) < show:
        raise ValueError('Component focus must follow its reveal')
    if component.get('dimEvent') and event(component['dimEvent']) < show:
        raise ValueError('Component dimming must follow its reveal')
    if component['x'] + component['width'] > 1 or component['y'] + component['height'] > 1:
        raise ValueError('Component bounds must fit inside the frame')
    if kind == 'identity':
        keys(data, {'title'}, {'eyebrow', 'detail', 'image', 'sourceShot', 'fit'})
        picture(data)
        if 'fit' in data and (data['fit'] != 'full' or 'image' not in data or
                              {'eyebrow', 'detail', 'sourceShot'} & data.keys()):
            raise ValueError('Full identity image needs an image and a title')
    elif kind == 'metric':
        keys(data, {'title', 'from', 'to', 'startEvent', 'endEvent'}, {'unit', 'detail', 'curve'})
        if data.get('curve', 'linear') not in ('linear', 'accelerate'):
            raise ValueError('Metric curve must be linear or accelerate')
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
            keys(item, {'title', 'event'}, {'value', 'detail', 'image', 'sourceShot', 'icon'})
            if event(item['event']) < show:
                raise ValueError('Comparison items must follow the group reveal')
            picture(item)
            icon(item)
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
        items(2, 5, {'label', 'event'}, {'detail', 'icon'})
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
    elif kind == 'chat':
        keys(data, {'title', 'items'}, {'visibleRows'})
        rows = data.get('visibleRows', 3)
        if type(rows) is not int or not 2 <= rows <= 4:
            raise ValueError('Chat visibleRows must be an integer between 2 and 4')
        for item in items(1, 8, {'side', 'text', 'event'}, {'image'}, ordered=True):
            if item['side'] not in ('incoming', 'outgoing'):
                raise ValueError('Chat message side must be incoming or outgoing')
            if '\r' in item['text'] or '\n' in item['text']:
                raise ValueError('Chat wraps message text automatically; use one string per bubble')
            picture(item)
    elif kind == 'tag':
        keys(data, {'title'}, {'icon', 'endEvent'})
        if 'endEvent' in data and event(data['endEvent']) <= show:
            raise ValueError('Tag endEvent must follow reveal')
    elif kind in ('notebook', 'template'):
        keys(data, {'title', 'items'}, set())
        items(1 if kind == 'notebook' else 2, 5, {'label', 'detail', 'event'}, set(), ordered=True)
    elif kind == 'deck':
        keys(data, {'title', 'items'}, {'detail', 'status'})
        if 'status' in data and 'detail' not in data:
            raise ValueError('Deck status needs a footer label in detail')
        for item in items(2, 6, {'title', 'event'}, {'detail', 'icon', 'label', 'markEvent'}, ordered=True):
            if ('label' in item) != ('markEvent' in item):
                raise ValueError('Deck stamp needs both label and markEvent')
            if 'markEvent' in item and event(item['markEvent']) < event(item['event']):
                raise ValueError('Deck stamp must land after its card')
    elif kind == 'tray':
        keys(data, {'items'}, {'title'})
        items(1, 12, {'event'}, set(), ordered=True)
    elif kind == 'choice':
        keys(data, {'title', 'items', 'selectionEvent', 'selectedIndex'}, {'detail'})
        options = items(2, 5, {'title', 'event'}, {'icon'}, ordered=True)
        index = data['selectedIndex']
        if type(index) is not int or not 0 <= index < len(options):
            raise ValueError('Choice selectedIndex must address an item')
        if event(data['selectionEvent']) < event(options[index]['event']):
            raise ValueError('Choice selection must follow its option reveal')
    elif kind == 'action':
        keys(data, {'title', 'label', 'button', 'detail', 'startEvent'}, {'eyebrow', 'icon'})
        if event(data['startEvent']) < show:
            raise ValueError('Action starts after its control appears')
    icon(data)
    for field in ('title', 'label', 'button', 'status', 'eyebrow', 'detail', 'unit', 'rootTitle', 'language'):
        if field in data:
            text(data[field], field)


def images(component):
    data = component['data']
    return [item['image'] for item in [data, *data.get('items', [])] if item.get('image')]
