"""Local prototype server with bounded, atomic repository favorites storage."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import argparse, hashlib, json, os, tempfile, threading, math
from datetime import datetime, timezone
from urllib.parse import unquote, urlsplit
import mimetypes
from project_source import manifest
ROOT = Path(__file__).resolve().parents[3]
WEB = Path(__file__).resolve().parent
MODULES = {'style','library','components','text','motion','audio','scenes'}
MAX_ITEMS, MAX_BYTES, MAX_ENTRY, MAX_BODY = 500, 2*1024*1024, 8192, 16384
LOCK = threading.Lock()
def encode(obj):
    return (json.dumps(obj, ensure_ascii=False, indent=2)+'\n').encode('utf-8')
def load_catalog(path):
    if not path.exists(): return {'schemaVersion':1,'items':[]}
    if path.stat().st_size > MAX_BYTES: raise ValueError('收藏文件超出容量上限，请先整理。')
    data=json.loads(path.read_text(encoding='utf-8-sig'))
    if data.get('schemaVersion')!=1 or not isinstance(data.get('items'),list): raise ValueError('收藏文件格式不正确，未覆盖原文件。')
    return data

def short_text(obj,key,limit=600):
    value=obj.get(key)
    if not isinstance(value,str) or not value.strip() or len(value)>limit: raise ValueError('字段不合法：'+key)
    return value.strip()

def normalize(raw):
    if not isinstance(raw,dict): raise ValueError('收藏格式不正确')
    module=short_text(raw,'module',20)
    if module not in MODULES: raise ValueError('未知模块')
    config=raw.get('configuration')
    if not isinstance(config,dict) or len(config)>16: raise ValueError('配置格式不正确')
    clean={}
    for key,val in config.items():
        if not isinstance(key,str) or len(key)>60 or not isinstance(val,(str,bool,int,float)) or isinstance(val,str) and len(val)>120: raise ValueError('仅允许小型结构化配置，不接受素材数据')
        if isinstance(val,float) and not math.isfinite(val): raise ValueError("配置数值必须有限")
        clean[key]=val
    design=short_text(raw,'design',1000)
    capability=raw.get('capabilityId',module)
    if not isinstance(capability,str) or len(capability)>100: raise ValueError('原子类别不正确')
    tags=raw.get('tags',[])
    if not isinstance(tags,list) or len(tags)>8 or any(not isinstance(t,str) or len(t)>32 for t in tags):raise ValueError('标签超出限制')
    applicability=raw.get('applicability','')
    if not isinstance(applicability,str) or len(applicability)>300:raise ValueError('适用条件过长')
    identity={'module':module,'capabilityId':capability,'configuration':clean}
    digest=hashlib.sha256(json.dumps(identity,sort_keys=True,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()
    source=raw.get('source')
    if not isinstance(source,dict): raise ValueError('缺少来源')
    origin={k:short_text(source,k,100) for k in ['projectId','segmentId','shotId','event','sourceVideoSha256']}
    if len(origin['sourceVideoSha256'])!=64 or any(c not in '0123456789abcdef' for c in origin['sourceVideoSha256']): raise ValueError('原片哈希格式不正确')
    t=source.get('timeSeconds')
    if isinstance(t,bool) or not isinstance(t,(int,float)) or not 0<=t<=86400: raise ValueError('来源时间不正确')
    origin['timeSeconds']=round(t,3)
    if raw.get('source',{}).get('atomId'):origin['atomId']=short_text(source,'atomId',100)
    basis=raw.get('basis')
    if basis not in ('current-render','proposed-config'): raise ValueError('缺少明确的认可范围')
    now=datetime.now(timezone.utc).isoformat()
    item={'id':'fav-'+digest[:20],'contentHash':digest,'title':short_text(raw,'title',100),'design':design,'tags':tags,'applicability':applicability,**identity,'approval':{'scope':'atom-design','basis':basis,'wholeVideoApproved':False},'sources':[origin],'createdAt':now,'updatedAt':now}
    if len(encode(item))>MAX_ENTRY: raise ValueError('单项收藏超过 8 KiB')
    return item

def atomic_save(path,data):
    payload=encode(data)
    if len(data['items'])>MAX_ITEMS or len(payload)>MAX_BYTES: raise ValueError('收藏夹已达 500 项或 2 MiB 上限，请先整理，不会自动删除旧收藏。')
    path.parent.mkdir(parents=True,exist_ok=True)
    name=None
    try:
        with tempfile.NamedTemporaryFile(dir=path.parent,prefix='.favorites-',suffix='.tmp',delete=False) as f:
            name=f.name;f.write(payload);f.flush();os.fsync(f.fileno())
        os.replace(name,path);name=None
    finally:
        if name and os.path.exists(name): os.unlink(name)

class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs): super().__init__(*args,directory=str(WEB),**kwargs)
    def reply(self,status,data):
        payload=encode(data);self.send_response(status);self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Cache-Control','no-store');self.send_header('Content-Length',str(len(payload)));self.end_headers();self.wfile.write(payload)
    def host_ok(self):
        return self.headers.get('Host') in {f'127.0.0.1:{self.server.server_port}',f'localhost:{self.server.server_port}'}
    def snapshot(self):
        data=load_catalog(self.server.favorites_file)
        return {**data,'storage':{'path':'collections/favorites/catalog.json','bytes':len(encode(data)),'maxBytes':MAX_BYTES,'maxItems':MAX_ITEMS,'maxEntryBytes':MAX_ENTRY}}
    def do_GET(self):
        if not self.host_ok(): return self.reply(403,{'error':'仅接受本机地址'})
        if self.path=='/api/project':
            try:
                data=manifest(self.server.project_root);data.pop('video');return self.reply(200,data)
            except (ValueError,OSError,KeyError) as exc:return self.reply(400,{'error':str(exc)})
        elif self.path=='/api/favorites':
            try:
                with LOCK: self.reply(200,self.snapshot())
            except (ValueError,OSError) as exc:self.reply(500,{'error':str(exc)})
        elif self.path.startswith('/project-assets/'):
            base=(self.server.project_root/'review-assets').resolve()
            file=(base/unquote(urlsplit(self.path).path[len('/project-assets/'):])).resolve()
            if not file.is_relative_to(base) or file.suffix.lower() not in {'.png','.jpg','.jpeg','.webp'} or not file.is_file():return self.reply(404,{'error':'参考图不存在'})
            payload=file.read_bytes();self.send_response(200);self.send_header('Content-Type',mimetypes.guess_type(file.name)[0]);self.send_header('Content-Length',str(len(payload)));self.end_headers();self.wfile.write(payload)
        elif self.path.split('?')[0]=='/assets/sample.mp4':
            media=manifest(self.server.project_root)['video'];size=media.stat().st_size;start=0;end=size-1
            ranged=self.headers.get('Range')
            if ranged:
                import re
                match=re.fullmatch(r'bytes=(\d+)-(\d*)',ranged)
                if not match:return self.reply(416,{'error':'无效媒体区间'})
                start=int(match[1]);end=min(int(match[2]) if match[2] else size-1,size-1)
                if start>end or start>=size:return self.reply(416,{'error':'媒体区间越界'})
            self.send_response(206 if ranged else 200);self.send_header('Content-Type','video/mp4');self.send_header('Accept-Ranges','bytes');self.send_header('Content-Length',str(end-start+1))
            if ranged:self.send_header('Content-Range',f'bytes {start}-{end}/{size}')
            self.end_headers()
            try:
                with media.open('rb') as f:
                    f.seek(start);left=end-start+1
                    while left:
                        chunk=f.read(min(left,65536))
                        if not chunk:break
                        self.wfile.write(chunk);left-=len(chunk)
            except (BrokenPipeError,ConnectionResetError):pass
        elif self.path.startswith('/api/'): self.reply(404,{'error':'接口不存在'})
        else: super().do_GET()
    def do_POST(self):
        origin=self.headers.get('Origin')
        allowed={f'http://127.0.0.1:{self.server.server_port}',f'http://localhost:{self.server.server_port}'}
        if not self.host_ok() or origin not in allowed or self.headers.get('X-Review-Client')!='segment-review-v2' or self.headers.get('Content-Type','').split(';')[0]!='application/json': return self.reply(403,{'error':'仅接受当前工作台的 JSON 请求'})
        if self.path not in ('/api/favorites/add','/api/favorites/remove'):return self.reply(404,{'error':'接口不存在'})
        try:
            size=int(self.headers.get('Content-Length','0'))
            if not 0<size<=MAX_BODY: return self.reply(413,{'error':'请求超过 16 KiB 或为空'})
            raw=json.loads(self.rfile.read(size))
            with LOCK:
                data=load_catalog(self.server.favorites_file)
                if self.path.endswith('/add'):
                    item=normalize(raw);existing=next((v for v in data['items'] if v['contentHash']==item['contentHash']),None)
                    if existing:
                        if item['sources'][0] not in existing['sources'] and len(existing['sources'])<8:existing['sources'].append(item['sources'][0])
                        if len(encode(existing))>MAX_ENTRY:raise ValueError('来源记录超过单项容量上限')
                        existing['title']=item['title'];existing['tags']=item['tags'];existing['applicability']=item['applicability'];existing['updatedAt']=item['updatedAt']
                    else:data['items'].append(item)
                else:
                    target=short_text(raw,'id',100);data['items']=[v for v in data['items'] if v['id']!=target]
                atomic_save(self.server.favorites_file,data)
                self.reply(200,self.snapshot())
        except (ValueError,KeyError,TypeError) as exc:self.reply(400,{'error':str(exc)})
        except OSError:self.reply(500,{'error':'本地收藏写入失败，原收藏保持不变'})

def main():
    p=argparse.ArgumentParser();p.add_argument('--port',type=int,default=5337);p.add_argument('--project',type=Path,default=ROOT/'work/save-first-6s-20261101');p.add_argument('--favorites-file',type=Path,default=ROOT/'collections/favorites/catalog.json');a=p.parse_args()
    server=ThreadingHTTPServer(('127.0.0.1',a.port),Handler);server.favorites_file=a.favorites_file.resolve();server.project_root=a.project.resolve()
    print(f'Preview: http://127.0.0.1:{server.server_port}/',flush=True)
    try:server.serve_forever()
    except KeyboardInterrupt:pass
    finally:server.server_close()
if __name__=='__main__':main()
