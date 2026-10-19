"""Compile complete illustration poses at storyboard events into silent footage."""
import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath, PureWindowsPath
import shutil
import subprocess
import tempfile
from directorlib.common import digest, encoded, read_json, write_json


def media_file(root, relative, *, existing=True):
    if not isinstance(relative,str):raise ValueError('Media file must be a relative string')
    parts=PurePosixPath(relative)
    if '\\' in relative or PureWindowsPath(relative).is_absolute() or parts.is_absolute() or parts.parts[:1]!=('media',) or '..' in parts.parts:
        raise ValueError('Illustration files must stay inside project media/')
    target=(root/relative).resolve()
    if not target.is_relative_to((root/'media').resolve()):raise ValueError('Escaping illustration media')
    if existing and not target.is_file():raise ValueError('Missing illustration: '+relative)
    return target


def compile_plan(project, plan_file='illustration-plan.json'):
    root=Path(project).resolve()
    path=(root/plan_file).resolve()
    if not path.is_relative_to(root):raise ValueError('Plan must stay inside project')
    plan=read_json(path)
    if set(plan)!={'schemaVersion','shotId','output','states'} or plan['schemaVersion']!=1:raise ValueError('Unknown illustration plan fields/version')
    board=read_json(root/'storyboard.json');production=read_json(root/'production-plan.json')
    shots=[s for s in board['shots'] if s['id']==plan['shotId']]
    if len(shots)!=1:raise ValueError('Plan needs one existing storyboard shot')
    shot=shots[0];duration=shot['durationFrames'];spec=production['output']
    if type(duration) is not int or duration<=0:raise ValueError('Shot duration must be positive integer frames')
    if spec['fps'] not in (30,60) or any(type(spec[k]) is not int or spec[k]<=0 or spec[k]%2 for k in ('width','height')):raise ValueError('Use supported fps and positive even dimensions')
    events={'enter':0}
    for event in shot['events']:
        if event['id'] in events or event['id']=='exit':raise ValueError('Duplicate/reserved event')
        events[event['id']]=event['frame']
    states=plan['states']
    if not isinstance(states,list) or not 2<=len(states)<=80:raise ValueError('Use 2–80 complete-frame states')
    compiled=[]
    for state in states:
        if not isinstance(state,dict) or set(state)!={'event','file'}:raise ValueError('States map only event and file; timing belongs to storyboard')
        frame=events.get(state['event'])
        if type(frame) is not int or not 0<=frame<duration:raise ValueError('Pose event must be visible inside the shot')
        if compiled and frame<=compiled[-1]['frame']:raise ValueError('Pose events must be strictly increasing')
        image=media_file(root,state['file'])
        if image.suffix.lower() not in ('.png','.jpg','.jpeg','.webp'):raise ValueError('Pose source must be a whole raster image')
        compiled.append({**state,'frame':frame,'sha256':digest(image)})
    if compiled[0]['frame']!=0:raise ValueError('First complete pose must start at enter')
    output=media_file(root,plan['output'],existing=False)
    if output.suffix.lower()!='.mp4' or plan['output'] in {s['file'] for s in states}:raise ValueError('Output must be a separate generated MP4')
    result={'schemaVersion':1,'shotId':shot['id'],'output':plan['output'],'durationFrames':duration,
            'fps':spec['fps'],'width':spec['width'],'height':spec['height'],'states':compiled,'rendererSha256':digest(Path(__file__))}
    result['sourceHash']=hashlib.sha256(encoded(result)).hexdigest()
    return root,output,result


def probe(path, spec):
    executable=os.environ.get('PIXEL_FFPROBE') or shutil.which('ffprobe')
    if not executable:raise ValueError('Missing ffprobe; set PIXEL_FFPROBE')
    result=subprocess.run([executable,'-v','error','-count_frames','-show_streams','-of','json',str(path)],capture_output=True,text=True,encoding='utf-8',check=True)
    streams=json.loads(result.stdout)['streams']
    if len(streams)!=1 or streams[0]['codec_type']!='video':raise ValueError('Illustration footage must contain one silent video track')
    stream=streams[0];num,den=map(int,stream['avg_frame_rate'].split('/'))
    if stream['width']!=spec['width'] or stream['height']!=spec['height'] or num/den!=spec['fps'] or int(stream['nb_read_frames'])!=spec['durationFrames']:
        raise ValueError('Encoded illustration differs from storyboard: '+json.dumps({'actual':[stream['width'],stream['height'],num/den,int(stream['nb_read_frames'])],
                         'expected':[spec['width'],spec['height'],spec['fps'],spec['durationFrames']]}))
    return {'decodedFrames':int(stream['nb_read_frames']),'fps':num/den,'dimensions':[stream['width'],stream['height']]}


def render(project, plan_file='illustration-plan.json', *, check=False):
    root,output,spec=compile_plan(project,plan_file);manifest=output.with_suffix('.illustration.json')
    previous=read_json(manifest) if manifest.exists() else None
    if output.exists() and (not previous or digest(output)!=previous.get('outputSha256')):
        raise ValueError('Refusing to overwrite an unowned or edited output: '+spec['output'])
    if check:
        if not output.is_file() or not previous or previous.get('sourceHash')!=spec['sourceHash']:raise ValueError('Illustration clip is stale; regenerate it')
        return {**probe(output,spec),'sourceHash':spec['sourceHash'],'current':True}
    executable=os.environ.get('PIXEL_FFMPEG') or shutil.which('ffmpeg')
    if not executable:raise ValueError('Missing ffmpeg; set PIXEL_FFMPEG')
    output.parent.mkdir(parents=True,exist_ok=True)
    # Normalize each input independently before concatenating. A shared fps filter
    # reinitializes on differently sized source images and can silently drop poses.
    with tempfile.TemporaryDirectory(prefix='illustration-',dir=root/'media') as temporary:
        stage=Path(temporary);inputs=[];filters=[]
        for index,state in enumerate(spec['states']):
            source=media_file(root,state['file']);name=f'pose-{index:03d}{source.suffix.lower()}'
            shutil.copy2(source,stage/name)
            end=spec['states'][index+1]['frame'] if index+1<len(spec['states']) else spec['durationFrames']
            inputs.extend(['-loop','1','-framerate',str(spec['fps']),'-i',str(stage/name)])
            filters.append(f"[{index}:v]scale={spec['width']}:{spec['height']}:force_original_aspect_ratio=decrease:flags=neighbor,pad={spec['width']}:{spec['height']}:(ow-iw)/2:(oh-ih)/2:color=0x0a1221,setsar=1,trim=end_frame={end-state['frame']},setpts=PTS-STARTPTS[v{index}]")
        filters.append(''.join(f'[v{i}]' for i in range(len(spec['states'])))+f"concat=n={len(spec['states'])}:v=1:a=0[whole]")
        command=[executable,'-v','error',*inputs,'-filter_complex_threads','1','-filter_complex',';'.join(filters),'-map','[whole]','-frames:v',str(spec['durationFrames']),
                 '-an','-r',str(spec['fps']),'-fps_mode','cfr','-c:v','libx264','-preset','medium','-crf','16','-pix_fmt','yuv420p','-movflags','+faststart',str(stage/'clip.mp4')]
        try:subprocess.run(command,check=True,capture_output=True)
        except subprocess.CalledProcessError as error:raise ValueError(error.stderr.decode('utf-8',errors='replace')) from error
        checks=probe(stage/'clip.mp4',spec)
        spec.update(outputSha256=digest(stage/'clip.mp4'),checks=checks,
                    technique='Whole-frame key-pose limited animation; no detached body parts, optical-flow morphing or phoneme alignment.')
        os.replace(stage/'clip.mp4',output)
        write_json(manifest,spec)
    return {**checks,'output':spec['output'],'sourceHash':spec['sourceHash']}


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('project',type=Path);parser.add_argument('--plan',default='illustration-plan.json');parser.add_argument('--check',action='store_true')
    args=parser.parse_args()
    try:print(json.dumps(render(args.project,args.plan,check=args.check),ensure_ascii=False))
    except (OSError,ValueError,KeyError,subprocess.SubprocessError) as error:raise SystemExit(str(error))
