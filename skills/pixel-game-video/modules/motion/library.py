"""Resolve director choices against the actual runtime catalog; generate the offline UI."""
import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SKILL = ROOT.parents[1]


def read(path):
    return json.loads(path.read_text(encoding='utf-8-sig'))


def local(path):
    result=(ROOT/path).resolve()
    if not result.is_relative_to(ROOT) or not result.is_file():
        raise ValueError('Missing or escaping motion resource: '+path)
    return result


def resolve():
    data=read(ROOT/'selection.json')
    if data.get('schemaVersion')!=1:
        raise ValueError('Unsupported selection schema')
    catalog={x['id']:x for x in read(ROOT/'catalog.json')['items']}
    import importlib.util
    spec=importlib.util.spec_from_file_location('motion_backends',SKILL/'engine/backend_caps.py')
    backend=importlib.util.module_from_spec(spec);spec.loader.exec_module(backend)
    seen=set();used=set();entries=[]
    for raw in data['entries']:
        item=dict(raw);ident=item['id']
        if ident in seen or not ident.startswith('design.motion.'):
            raise ValueError('Invalid or duplicate design ID: '+ident)
        seen.add(ident)
        if item['intent'] not in data['intents'] or item['status'] not in {'ready','approved-design','retired'} or item['exposure'] not in {'primary','compatibility'}:
            raise ValueError('Invalid selection state: '+ident)
        local(item['documentation'])
        if item['implementation']:local(item['implementation'])
        if item['preview']:
            local(item['preview']['path'])
        binding=item['binding'];item['parameters']=None
        if binding:
            recipe=binding['recipe'];cap=catalog.get(recipe)
            if not cap or cap.get('status')=='unavailable' or item['status']!='ready':
                raise ValueError('Selection incorrectly exposes runtime capability: '+ident)
            for key,value in binding['params'].items():
                if key not in cap.get('params',{}) or isinstance(cap['params'][key],list) and value not in cap['params'][key]:
                    raise ValueError('Invalid preset binding: '+ident)
            used.add(recipe);item['parameters']=cap.get('params',{})
            item['backends']=['canvas']+(['remotion'] if recipe in backend.REMOTION_MOTIONS else [])
        else:
            item['backends']=['canvas','remotion'] if ident=='design.motion.hold' else []
            if item['status']=='ready' and ident!='design.motion.hold':
                raise ValueError('Ready selection needs a binding')
        entries.append(item)
    expected={k for k,v in catalog.items() if v.get('status')!='unavailable'}
    if used!=expected:raise ValueError('Unmapped runtime recipes: '+str(sorted(expected-used)))
    return {**data,'entries':entries}


def select(data,intent=None,backend='canvas',designs=False,compatibility=False,ident=None):
    if intent is not None and intent not in data['intents']:raise ValueError('Unknown intent: '+intent)
    choices=[x for x in data['entries'] if (not ident or x['id']==ident) and
        (not intent or x['intent']==intent) and x['status']!='retired' and
        (x['exposure']=='primary' or compatibility) and
        (x['status']=='ready' and backend in x['backends'] or designs and x['status']=='approved-design')]
    if ident and not choices:raise ValueError('Selection is unavailable under these filters: '+ident)
    return choices


def generated(data):
    encoded=json.dumps(data,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')
    return (ROOT/'library.template.html').read_text(encoding='utf-8').replace('__MOTION_DATA__',encoded)


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--intent');parser.add_argument('--backend',choices=['canvas','remotion'],default='canvas')
    parser.add_argument('--include-designs',action='store_true');parser.add_argument('--include-compatibility',action='store_true')
    parser.add_argument('--id');parser.add_argument('--check',action='store_true');parser.add_argument('--build',action='store_true')
    args=parser.parse_args();data=resolve()
    if args.build:(ROOT/'library.html').write_text(generated(data),encoding='utf-8')
    if args.check:
        if not (ROOT/'library.html').is_file() or (ROOT/'library.html').read_text(encoding='utf-8')!=generated(data):
            raise ValueError('Stale HTML selection directory; run library.py --build')
        print(json.dumps({'status':'passed','entries':len(data['entries']),'catalogCoverage':'complete'},ensure_ascii=False));return
    if args.build:print('Built motion/library.html');return
    if not args.intent and not args.id:
        print(json.dumps({'intents':data['intents'],'next':'Select one --intent to receive focused choices; design IDs are not recipes.'},ensure_ascii=False,indent=2));return
    print(json.dumps({'intent':args.intent,'backend':args.backend,'choices':select(data,args.intent,args.backend,args.include_designs,args.include_compatibility,args.id)},ensure_ascii=False,indent=2))

if __name__=='__main__':main()
