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
        'scenes.canvas.v1': set(),
        'scenes.document-highlight.v1': {'phase','environment','heading','kicker','labels','stageEvents'},
        'scenes.steps.v1': {'items'},
        'scenes.counter.v1': {'from', 'to', 'label', 'unit', 'startEvent', 'endEvent'},
        'scenes.choice.v1': {'options', 'selectedIndex', 'selectEvent'},
        'scenes.assembly.v1': {'parts', 'resultLabel'},
        'scenes.focus.v1': {'label', 'detail'},
        'scenes.cache-journey.v1': {'phase','environment','startEvent','arriveEvent','completeEvent','labels'},
        'scenes.cache-adventure.v1': {'phase','environment','startEvent','arriveEvent','completeEvent','labels'},
        'scenes.presenter-board.v1': {'layout','heading','kicker','items'},
        'scenes.study-routes.v1': {'phase','environment','heading','kicker','labels','startEvent','completeEvent','sourceShots'},
        'scenes.competition-routes.v1': {'phase','environment','heading','kicker','labels','startEvent','completeEvent','sourceShots','presentation','settleEvent','readEvent','prepareEvent','handoffEvent','budgetLabel','calendarLabel','prepareLabel','feedbackCues','feedbackLabels'},
    }
    if scene_id not in allowed:
        raise ValueError(f'Unknown scene: {scene_id}')
    extras = set(params) - allowed[scene_id]
    if extras:
        raise ValueError(f'{scene_id}: unsupported parameters {sorted(extras)}')
    if scene_id == 'scenes.document-highlight.v1':
        phases = {'intro','task','mask','pipeline','exception','structure','drift','verify','match','search','success','reflection','summary'}
        if params.get('phase') not in phases:
            raise ValueError('document-highlight: unknown phase')
        if params.get('environment') not in {'workspace','workshop','atlas'}:
            raise ValueError('document-highlight: unknown environment')
        if objects:
            raise ValueError('document-highlight owns its document and index layout')
        label(params.get('heading'),'heading');label(params.get('kicker'),'kicker')
        labels = params.get('labels')
        keys = {'target','identity','backend','frontend','preview','contract','search','locate','range','highlight','plain','document','break','page','table','hidden','theory','actual','mismatch','check','yes','no','previous','next','found','success','normal','experience','why','fallback','limit','interview','candidate','question','rawPhone','rawIdentity'}
        if not isinstance(labels,dict) or set(labels) != keys:
            raise ValueError('document-highlight: complete label set required')
        for key,value in labels.items(): label(value,key)
        stages = params.get('stageEvents')
        if not isinstance(stages,list) or not 1 <= len(stages) <= 8:
            raise ValueError('document-highlight: 1–8 stage events required')
        for value in stages: event(value)
        frames = [event_frames.get(value) for value in stages]
        if all(value is not None for value in frames) and any(b <= a for a,b in zip(frames,frames[1:])):
            raise ValueError('document-highlight: stages must be in strictly increasing order')
    elif scene_id in ('scenes.study-routes.v1','scenes.competition-routes.v1'):
        environments=({'question':'workspace','research':'research','practice':'workshop','decision':'atlas'}
                      if scene_id=='scenes.study-routes.v1' else
                      {'question':'workspace','training':'training','cost':'atlas','project':'workshop','trial':'atlas','decision':'atlas'})
        mode=params.get('presentation')
        if mode=='spatial':
            raise ValueError('competition-routes: spatial is retired; use cinematic/gameplay or the historical snapshot')
        full_camera=scene_id=='scenes.competition-routes.v1' and mode in ('cinematic','gameplay')
        paced=scene_id=='scenes.competition-routes.v1' and mode in ('paced','cinematic','gameplay')
        full_world=full_camera and params.get('phase') in ('question','training','cost','trial')
        if 'presentation' in params and not paced:
            raise ValueError('competition-routes: presentation must be paced, cinematic or gameplay when specified')
        if paced:
            environments.update(cost='training',trial='training')
            if full_camera:environments.update(training='workspace',cost='workspace',trial='workspace')
            for key in ('settleEvent','readEvent','prepareEvent','handoffEvent'):event(params.get(key))
            needed_labels=({'training':{'prepareLabel'},'cost':{'budgetLabel','prepareLabel'},
                            'trial':{'budgetLabel','calendarLabel'}}.get(params.get('phase'),set())
                           if mode=='paced' else set())
            for key in ('budgetLabel','calendarLabel','prepareLabel'):
                if key in params or key in needed_labels:label(params.get(key),key)
            ordered=[event_frames.get(params[key]) for key in ('settleEvent','readEvent','prepareEvent','handoffEvent')]
            if all(v is not None for v in ordered) and not ordered[0]<ordered[1]<ordered[2]<ordered[3]:
                raise ValueError('competition-routes paced: settle < read < prepare < handoff required')
        if params.get('phase') not in environments or params.get('environment')!=environments[params['phase']]:
            raise ValueError('study-routes: phase and environment must match')
        if objects:raise ValueError('study-routes owns its prop layout; objects must be empty')
        label(params.get('heading'),'heading');label(params.get('kicker'),'kicker')
        rows=params.get('labels',[] if full_world else None)
        if not isinstance(rows,list) or (len(rows)!=3 and not(full_world and not rows)):
            raise ValueError('study-routes requires three labels except full-world competition phases')
        for item in rows:label(item,'labels')
        for key in ('startEvent','completeEvent'):event(params.get(key))
        start=event_frames.get(params['startEvent']);end=event_frames.get(params['completeEvent'])
        if start is not None and end is not None and start>=end:raise ValueError('study-routes requires start before complete')
        sources=params.get('sourceShots')
        count=2 if params['phase']=='decision' else 0
        if not isinstance(sources,list) or len(sources)!=count or any(not isinstance(s,str) or not s for s in sources) or len(set(sources))!=len(sources):
            raise ValueError('study-routes: decision needs two distinct preceding source shots; other phases none')
        if params.get('presentation')=='gameplay':
            kinds={'question':{'focus':1},'training':{'node':4,'confirm':1},'cost':{'transfer':3},'trial':{'milestone':2,'settle':1}}
            expected=kinds.get(params['phase'])
            if expected is None:raise ValueError('gameplay feedback is available in question/training/cost/trial only')
            board_keys={'boardTitle','idle','active','passed','checks','boardFooter'}
            time_keys={'budgetUnit','competition','course','project'}
            calendar_keys={'calendarTitle','calendarFooter','settled'}
            keys=board_keys|time_keys|calendar_keys
            required={'question':board_keys,'training':board_keys|time_keys,
                      'cost':keys,'trial':time_keys|calendar_keys}[params['phase']]
            labels=params.get('feedbackLabels')
            if not isinstance(labels,dict) or not required<=set(labels) or set(labels)-keys:
                raise ValueError('gameplay requires the feedbackLabels used by its phase; unknown keys are not allowed')
            for key,value in labels.items():label(value,key)
            rows=params.get('feedbackCues')
            if not isinstance(rows,list) or len(rows)!=sum(expected.values()):raise ValueError('gameplay: incomplete feedbackCues')
            seen=set();groups={}
            for row in rows:
                if not isinstance(row,dict) or set(row)!={'kind','index','startEvent','hitEvent','endEvent'}:raise ValueError('gameplay cue requires kind,index,startEvent,hitEvent,endEvent')
                kind=row['kind'];index=row['index']
                if kind not in expected or type(index) is not int or not 0<=index<expected[kind] or (kind,index) in seen:raise ValueError('gameplay cue kind/index must be unique and match its phase')
                seen.add((kind,index));frames=[]
                for key in ('startEvent','hitEvent','endEvent'):event(row[key]);frames.append(event_frames.get(row[key]))
                if all(v is not None for v in frames) and not frames[0]<frames[1]<frames[2]:raise ValueError('gameplay requires start < hit < end')
                groups.setdefault(kind,[]).append((index,frames))
                settled=event_frames.get(params['settleEvent'])
                if frames[0] is not None and settled is not None and frames[0]<settled:raise ValueError('gameplay feedback must start after the scene has settled')
            for kind,group in groups.items():
                group.sort()
                for (_,before),(_,after) in zip(group,group[1:]):
                    boundary=before[1] if kind=='node' else before[2]
                    if boundary is not None and after[0] is not None and after[0]<boundary:raise ValueError('gameplay cue groups must progress in order without overlapping primary actions')
            for status,steps in [('confirm','node'),('settle','milestone')]:
                if status in groups:
                    hit=groups[status][0][1][1];ends=[row[1][1] for row in groups[steps]]
                    if hit is not None and all(v is not None for v in ends) and hit<max(ends):raise ValueError('gameplay confirmation cannot precede its completed steps')
        elif 'feedbackCues' in params or 'feedbackLabels' in params:
            raise ValueError('feedback parameters require presentation=gameplay')
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
