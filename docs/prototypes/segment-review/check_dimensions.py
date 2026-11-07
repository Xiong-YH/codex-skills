"""Project the existing sources into stage-five columns; never infer media internals."""

COLUMNS = [('duration', '预估时长'), ('copy', '文案与屏幕文字'),
           ('action', '动作状态'), ('style', '画面风格'), ('layout', '画面布局'),
           ('subjects', '主体与组件设计'), ('background', '背景'),
           ('sound', '声音与音效'), ('transition', '转场与接镜')]


def dimensions(segment, shot, planned, script, plan, objects):
    sid = shot['id']
    visual = shot.get('visual', {})
    def ref(file, stable, field):
        return {'file': file, 'stableId': stable, 'field': field}
    board = lambda field: ref('storyboard.json', sid, field)
    production = lambda field: ref('production-plan.json', sid, field)
    result = {}
    def put(key, value, refs, note=''):
        result[key] = {'value': value, 'sourceRefs': refs, 'note': note,
                       'verification': 'not_reviewed'}
    put('duration', {'seconds': round(segment['end']-segment['start'], 4),
                     'start': segment['start'], 'end': segment['end']},
        [board('/durationFrames'), board('/events')], '工程区间；未验证与实际音轨对齐')
    cue_ids = {c['cueId'] for c in shot.get('cues', [])}
    cues = [c for c in script.get('cues', []) if c['id'] in cue_ids]
    labels = script.get('labels', [])
    put('copy', {'cues': cues, 'projectLabels': labels,
                 'placements': shot.get('cues', []),
                 'text': [t for t in plan.get('text', []) if t.get('cueId') in cue_ids]},
        [board('/cues')] + [ref('script.json', c['id'], '/text') for c in cues + labels],
        '标签为全片原文，未自动判定本段可见范围；显露与收束须对照源设计')
    put('action', {'action': visual.get('action'), 'result': visual.get('result'),
                   'events': shot.get('events', []), 'motions': planned.get('motions', [])},
        [board('/visual'), board('/events'), production('/motions')],
        '同源镜头上下文；事件名不自动等于主体动作，初态/触发/末态不全时需补设计')
    styled = [o for o in objects if o['module']=='components']
    put('style', {'projectStyle': plan.get('style'),
                  'components': [{'id': o['id'], 'appearance': {k:v for k,v in o['configuration'].items() if k in ('visualStyle','styleVariant','features','material','color')}} for o in styled]},
        [ref('production-plan.json', plan['id'], '/style')],
        '引擎 style ID 不代替场景美术约定；组件风格独立核对')
    spatial = [o for o in objects if o['module']!='audio' and (o.get('bounds') or any(k in o.get('configuration', {}) for k in ('x','y','width','height')))]
    put('layout', [{'object': o['title'], 'bounds': o.get('bounds'),
                    'configuration': o['configuration']} for o in spatial],
        [r for o in spatial for r in o['sourceRefs']],
        '已有位置参数；主次、尺度、遮挡和文字留白仍需核对，未映射部分待补')
    subjects = [o for o in objects if o['module']=='components' or o.get('capabilityId') in ('library.actor','custom.illustrated-actor')]
    if planned.get('actor'):
        subjects += [o for o in objects if o['id']==sid+'.actor']
    put('subjects', {'subject': visual.get('subject'),
                     'objects': [{'id': o['id'], 'design': o.get('design'), 'configuration': o['configuration']} for o in subjects],
                     'nativeObjects': shot.get('objects', []) + planned.get('objects', [])},
        [board('/visual/subject'), board('/objects'), production('/objects')] + [r for o in subjects for r in o['sourceRefs']],
        '媒体内部人物/道具需显式映射；未列出不等于没有')
    put('background', {'scene': shot.get('scene'), 'background': planned.get('background'),
                       'replacement': planned.get('replacement')},
        [board('/scene'), production('/background'), production('/replacement')],
        '整镜 replacement 不是独立背景；空间、沿用与变化未写明时待补设计')
    sounds = [s for s in plan.get('audio', []) if s.get('at', {}).get('event','').startswith(sid+'.')]
    put('sound', {'audioMode': plan.get('audioMode'), 'events': sounds,
                  'bgm': plan.get('bgm'), 'narration': plan.get('narration')},
        [ref('production-plan.json', s['id'], '/') for s in sounds] + [ref('production-plan.json', plan['id'], '/')],
        '同源镜头声音安排；旁白/配乐/环境声/音效未声明不等于无，触发需核对本段区间，未听音')
    put('transition', {'continuity': visual.get('continuity'),
                       'transition': planned.get('transition'), 'intent': shot.get('intent')},
        [board('/visual/continuity'), board('/intent'), production('/transition')],
        '核对前镜交出、本镜接住和出镜过程；同镜、首尾与直切也须明确，未验证播放连续性')
    return result
