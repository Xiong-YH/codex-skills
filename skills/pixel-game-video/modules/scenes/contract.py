"""Scene-specific data validation; timing resolution belongs to the compiler."""


def validate(scene_id, params, events, objects):
    event_ids = {e['id'] if isinstance(e, dict) else e for e in events} | {'enter', 'exit'}
    event_frames = {e['id']: e.get('localFrame', e.get('frame')) for e in events if isinstance(e, dict)}

    def event(value):
        if value not in event_ids:
            raise ValueError(f'{scene_id}: unknown local event {value!r}')
        exit_frame = event_frames.get('exit')
        action_frame = event_frames.get(value)
        if exit_frame is not None and action_frame is not None and action_frame >= exit_frame:
            raise ValueError(f'{scene_id}: {value!r} occurs after the last visible frame; use an earlier action event')

    def label(value, name):
        if not isinstance(value, str) or not value.strip() or len(value) > 48:
            raise ValueError(f'{scene_id}: {name} needs 1–48 characters')

    def parts(key, minimum):
        rows = params.get(key)
        if not isinstance(rows, list) or not minimum <= len(rows) <= 5:
            raise ValueError(f'{scene_id}: {key} needs {minimum}–5 items')
        for row in rows:
            if not isinstance(row, dict) or set(row) != {'label', 'event'}:
                raise ValueError(f'{scene_id}: each {key} item must contain label and event')
            label(row['label'], key)
            event(row['event'])

    allowed = {
        'scenes.steps.v1': {'items'},
        'scenes.counter.v1': {'from', 'to', 'label', 'unit', 'startEvent', 'endEvent'},
        'scenes.choice.v1': {'options', 'selectedIndex', 'selectEvent'},
        'scenes.assembly.v1': {'parts', 'resultLabel'},
        'scenes.focus.v1': {'label', 'detail'},
    }
    if scene_id not in allowed:
        raise ValueError(f'Unknown scene: {scene_id}')
    extras = set(params) - allowed[scene_id]
    if extras:
        raise ValueError(f'{scene_id}: unsupported parameters {sorted(extras)}')
    if scene_id == 'scenes.steps.v1':
        parts('items', 1)
    elif scene_id == 'scenes.assembly.v1':
        parts('parts', 2)
    elif scene_id == 'scenes.choice.v1':
        options = params.get('options', [])
        if not isinstance(options, list) or not 2 <= len(options) <= 3:
            raise ValueError('choice requires 2–3 options')
        for value in options:
            label(value, 'option')
        index = params.get('selectedIndex')
        if isinstance(index, bool) or not isinstance(index, int) or not 0 <= index < len(options):
            raise ValueError('selectedIndex must identify an option')
        event(params.get('selectEvent'))
    elif scene_id == 'scenes.counter.v1':
        for key in ('from', 'to'):
            value = params.get(key)
            if type(value) is not int or abs(value) > 9007199254740991:
                raise ValueError(f'counter {key} must be an integer within the JavaScript safe integer range')
        event(params.get('startEvent'))
        event(params.get('endEvent'))
        if params['startEvent'] == params['endEvent']:
            raise ValueError('counter startEvent and endEvent must differ')
        start = event_frames.get(params['startEvent'])
        end = event_frames.get(params['endEvent'])
        if start is not None and end is not None and end <= start:
            raise ValueError('counter endEvent must occur after startEvent')
    for key in ('label', 'detail', 'resultLabel', 'unit'):
        if key in params and params[key] != '':
            label(params[key], key)
