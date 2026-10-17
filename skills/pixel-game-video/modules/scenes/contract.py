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
        'scenes.cache-journey.v1': {'phase','environment','startEvent','arriveEvent','completeEvent','labels'},
        'scenes.cache-adventure.v1': {'phase','environment','startEvent','arriveEvent','completeEvent','labels'},
        'scenes.presenter-board.v1': {'layout','heading','kicker','items'},
        'scenes.study-routes.v1': {'phase','environment','heading','kicker','labels','startEvent','completeEvent','sourceShots'},
    }
    if scene_id not in allowed:
        raise ValueError(f'Unknown scene: {scene_id}')
    extras = set(params) - allowed[scene_id]
    if extras:
        raise ValueError(f'{scene_id}: unsupported parameters {sorted(extras)}')
    if scene_id == 'scenes.study-routes.v1':
        environments={'question':'workspace','research':'research','practice':'workshop','decision':'atlas'}
        if params.get('phase') not in environments or params.get('environment')!=environments[params['phase']]:
            raise ValueError('study-routes: phase and environment must match')
        if objects:raise ValueError('study-routes owns its prop layout; objects must be empty')
        label(params.get('heading'),'heading');label(params.get('kicker'),'kicker')
        rows=params.get('labels')
        if not isinstance(rows,list) or len(rows)!=3:raise ValueError('study-routes requires three labels')
        for item in rows:label(item,'labels')
        for key in ('startEvent','completeEvent'):event(params.get(key))
        start=event_frames.get(params['startEvent']);end=event_frames.get(params['completeEvent'])
        if start is not None and end is not None and start>=end:raise ValueError('study-routes requires start before complete')
        sources=params.get('sourceShots')
        count=2 if params['phase']=='decision' else 0
        if not isinstance(sources,list) or len(sources)!=count or any(not isinstance(s,str) or not s for s in sources) or len(set(sources))!=len(sources):
            raise ValueError('study-routes: decision needs two distinct preceding source shots; other phases none')
    elif scene_id == 'scenes.presenter-board.v1':
        layout=params.get('layout');rows=params.get('items')
        limits={'pair':(2,2),'hero':(1,1),'checklist':(1,3)}
        if layout not in limits:raise ValueError('presenter-board: unknown layout')
        low,high=limits[layout]
        if not isinstance(rows,list) or not low<=len(rows)<=high:raise ValueError('presenter-board: incorrect item count')
        label(params.get('heading'),'heading');label(params.get('kicker'),'kicker')
        used=set();known={o['id'] for o in objects}
        for row in rows:
            if not isinstance(row,dict) or set(row)!={'object','label','detail','event'}:raise ValueError('presenter-board item requires object,label,detail,event')
            if row['object'] not in known or row['object'] in used:raise ValueError('presenter-board: each item needs a unique existing object')
            used.add(row['object']);label(row['label'],'label');label(row['detail'],'detail');event(row['event'])
        if used!=known:raise ValueError('presenter-board: objects and items must match')
    elif scene_id in ('scenes.cache-journey.v1','scenes.cache-adventure.v1'):
        if params.get('phase') not in ('question','fetch','store','hit','miss','summary'):
            raise ValueError('cache-journey: unknown phase')
        if params.get('environment') not in ('workspace','archive'):
            raise ValueError('cache-journey: unknown environment')
        if objects:
            raise ValueError('cache-journey owns its device placements; objects must be empty')
        keys={'requester','origin','cache','dataA','dataB','hit','miss','copy','longRoute','shortRoute','result'}
        labels=params.get('labels')
        if not isinstance(labels,dict) or set(labels)!=keys:
            raise ValueError('cache-journey requires its complete label set')
        for key,value in labels.items():label(value,key)
        order=[]
        for key in ('startEvent','arriveEvent','completeEvent'):
            event(params.get(key));order.append(event_frames.get(params[key]))
        if all(v is not None for v in order) and not order[0]<order[1]<order[2]:
            raise ValueError('cache-journey requires start < arrive < complete')
    elif scene_id == 'scenes.steps.v1':
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
