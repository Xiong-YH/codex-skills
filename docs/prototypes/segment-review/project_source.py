"""Read bounded director sources and expose traceable review objects, without mutating them."""
import hashlib,json
from pathlib import Path
NAMES=('brief.json','script.json','storyboard.json','production-plan.json')
def sha(path):
 h=hashlib.sha256()
 with path.open('rb') as f:
  for b in iter(lambda:f.read(65536),b''):h.update(b)
 return h.hexdigest()
def read(path):
 if path.stat().st_size>1024*1024:raise ValueError('创作源超过 1 MiB')
 return json.loads(path.read_text(encoding='utf-8-sig'))
def manifest(root):
 data={n:read(root/n) for n in NAMES};brief,script,board,plan=[data[n] for n in NAMES]
 fps=plan['output']['fps'];offset=0;segments=[];objects=[]
 def obj(shot,module,id,title,config,refs,design='',bounds=None,capability=None):
  value={'id':shot+'.'+id,'shotId':shot,'module':module,'title':title,'configuration':config,'sourceRefs':refs,'design':design,'bounds':bounds,'capabilityId':capability or module,'execution':'source-review-required'};objects.append(value);return value
 def ref(file,id,field):return {'file':file,'stableId':id,'field':field}
 labels={x['id']:x['text'] for x in script.get('labels',[])};cues={x['id']:x for x in script.get('cues',[])}
 for shot in board['shots']:
  sid=shot['id'];ps=next((x for x in plan['shots'] if x['id']==sid),{});end=offset+shot['durationFrames'];events={e['id']:e['frame'] for e in shot.get('events',[])}
  obj(sid,'style','style','画风',{'style':plan['style']},[ref('production-plan.json',plan['id'],'/style')])
  media=ps.get('replacement') or ps.get('background')
  if media:obj(sid,'library','media','镜头素材',media,[ref('production-plan.json',sid,'/replacement' if ps.get('replacement') else '/background')],'完整媒体的修改需回源，不能直接拆出内部人物。')
  if ps.get('actor'):obj(sid,'library','actor','人物',{'actor':ps['actor']},[ref('production-plan.json',sid,'/actor')])
  for comp in shot.get('components',[]):obj(sid,'components',comp['id'],comp['id'],{k:comp[k] for k in ('kind','visualStyle','styleVariant') if k in comp},[ref('storyboard.json',comp['id'],'/')],capability='components.'+comp['kind'])
  for cp in shot.get('cues',[]):
   cue=cues[cp['cueId']];tp=next((t for t in plan.get('text',[]) if t['cueId']==cue['id']),{})
   obj(sid,'text',cue['id'],cue['text'],{k:tp[k] for k in ('role','x','y','accent') if k in tp},[ref('script.json',cue['id'],'/text'),ref('production-plan.json',cue['id'],'/')],cue.get('meaning',''),capability='text.cue')
  for motion in ps.get('motions',[]):obj(sid,'motion',motion['id'],motion['id'],motion,[ref('production-plan.json',sid,'/motions')])
  for sound in plan.get('audio',[]):
   if sound.get('at',{}).get('event','').startswith(sid+'.'):obj(sid,'audio',sound['id'],sound['sound'],{k:sound[k] for k in ('sound','level','x') if k in sound},[ref('production-plan.json',sound['id'],'/')],capability='audio.event')
  if plan.get('bgm'):obj(sid,'audio','bgm','配乐',{'gain':plan['bgm']['gain'],'file':plan['bgm']['file']},[ref('production-plan.json',plan['bgm']['id'],'/')],capability='audio.bgm')
  obj(sid,'scenes','scene','场景与承接',{'scene':shot['scene']},[ref('storyboard.json',sid,'/scene'),ref('storyboard.json',sid,'/visual')],shot.get('visual',{}).get('continuity',''))
  # Named semantic boundaries are source events, not an inferred second timeline.
  cuts=[0]+[events[e] for e in ('copy','edit') if e in events]+[shot['durationFrames']];cuts=sorted(set(cuts))
  for i,(a,b) in enumerate(zip(cuts,cuts[1:])):
   ids=[o['id'] for o in objects if o['shotId']==sid];event=next((e for e,f in events.items() if f==a),'enter')
   segments.append({'id':sid+'.'+event,'number':str(len(segments)+1).zfill(2),'title':f'{sid} · '+({'enter':'开场','copy':'保存版本','edit':'修改对照'}.get(event,event)),'start':(offset+a)/fps,'end':(offset+b)/fps,'preview':(offset+a+min(30,max(0,b-a-1)))/fps,'quote':' '.join(labels[k] for k in ('lead','key') if k in labels) or ' / '.join(cues[c['cueId']]['text'] for c in shot.get('cues',[])),'purpose':shot.get('visual',{}).get('question',''),'note':shot.get('intent',''),'event':event,'shotId':sid,'objectIds':ids,'design':{m:shot.get('visual',{}).get({'text':'question','motion':'action','scenes':'continuity'}.get(m,'subject'),'') for m in ('style','library','components','text','motion','audio','scenes')}})
  offset=end
 # Optional project-owned map for custom video internals; exact references must resolve.
 mapping=root/'review-map.json'
 if mapping.exists():
  for x in read(mapping).get('objects',[]):
   for r in x['sourceRefs']:
    if r['file'] not in data:raise ValueError('自定义原子引用未知源文件')
    if r['stableId'] not in json.dumps(data[r['file']],ensure_ascii=False):raise ValueError('自定义原子引用缺失')
   objects.append(x)
   for seg in segments:
    if seg['shotId']==x['shotId']:seg['objectIds'].append(x['id'])
 hashes={n:sha(root/n) for n in NAMES}
 if mapping.exists():hashes['review-map.json']=sha(mapping)
 revision=hashlib.sha256(json.dumps(hashes,sort_keys=True).encode()).hexdigest()
 videos=list((root/'video/outputs').glob('*.mp4'));video=max(videos,key=lambda p:p.stat().st_mtime) if videos else None
 return {'schemaVersion':1,'project':{'id':brief['id'],'title':plan['title'],'fps':fps,'durationSeconds':offset/fps,'revision':revision,'sourceHashes':hashes,'videoSha256':sha(video) if video else None},'segments':segments,'objects':objects,'video':video}
