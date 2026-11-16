"""Build the complete component atlas from the real guide renderer.

First build ../guide with scripts/video.py. The generated HTML is a local preview,
not a second rendering implementation. --output can update a stable preview URL.
"""
from pathlib import Path
import argparse
import base64
import json
import hashlib
import re

HERE = Path(__file__).resolve().parent
MODULE = HERE.parents[1]
ACTION_EXAMPLES = (
    ('transfer', 'object.slot-transfer.v1', '状态交接', '独立 Canvas'),
    ('queue', 'object.request-queue-study.v1', '排队与积压', '曾获设计认可'),
    ('meter', 'object.state-meter-break.v1', '状态失效', '独立 Canvas'),
    ('tray', 'object.resource-bundle-into-tray.v1', '转移与遮挡', '曾获设计认可'),
    ('assembly', 'object.energy-actuator-assembly.v1', '逐件装配', '历史试样'),
)


def data_uri(file):
    mime = 'image/png' if file.suffix == '.png' else 'image/jpeg'
    return 'data:' + mime + ';base64,' + base64.b64encode(file.read_bytes()).decode()


def inline_custom(file):
    example = file.parent
    html = file.read_text(encoding='utf-8')
    if example.name == 'resource-into-tray':
        html = html.replace('../../assets/object-style/tokens-containers.png', data_uri(MODULE/'assets/object-style/tokens-containers.png'))
    if example.name == 'energy-actuator-assembly':
        html = html.replace('../../../library/backgrounds/engineering-workshop-v1.png', data_uri(MODULE.parent/'library/backgrounds/engineering-workshop-v1.png'))

    def inline_script(match):
        source = (example / match[1]).resolve()
        if not source.is_relative_to(MODULE.parent.resolve()):
            raise ValueError('Atlas example script must stay within modules')
        return '<script>' + source.read_text(encoding='utf-8') + '</script>'

    return re.sub(r'<script src="([^"]+)"></script>', inline_script, html)


def action_examples():
    records = json.loads((MODULE/'object-components.json').read_text(encoding='utf-8'))['items']
    by_id = {record['id']: record for record in records}
    custom = {}
    for key, ident, action, label in ACTION_EXAMPLES:
        record = by_id[ident]
        file = MODULE/record['example']
        if record['execution'] != 'standalone-canvas':
            raise ValueError('Atlas action expects a standalone Canvas demo: ' + ident)
        custom[key] = {'title': record['title'], 'action': action, 'label': label,
                       'description': record['selection'], 'html': inline_custom(file)}
        if key == 'meter':
            custom[key]['html'] = custom[key]['html'].replace(
                '<a href="design.md">设计、调用与能力边界</a> · ', '')
    return custom


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--project', type=Path, default=MODULE/'examples/guide')
    parser.add_argument('--output', type=Path, default=HERE/'build/index.html')
    args = parser.parse_args()
    project = args.project
    lock = json.loads((project/'build/project-lock.json').read_text(encoding='utf-8'))
    for base, records in ((project, lock['inputFiles']), (MODULE.parents[1], lock['runtimeFiles'])):
        for relative, expected in records.items():
            if hashlib.sha256((base/relative).read_bytes()).hexdigest() != expected:
                raise RuntimeError('Guide source/runtime changed; rebuild guide before atlas: ' + relative)
    film = (project/'build/film.html').read_text(encoding='utf-8')
    if f'"inputHash":"{lock["inputHash"]}"' not in film:
        raise RuntimeError('Guide HTML does not match project lock; rebuild guide before atlas')
    hook = 'const renderer=PixelVideo.createRenderer({canvas,createCanvas,assets,resolved:payload.resolved,mouth:payload.mouth,style:payload.style,whitebox});'
    if hook not in film:
        raise RuntimeError('Guide renderer hook changed; update atlas binding')
    film = film.replace('window.sceneDuration=', "payload.assets['@atlas.bg']=" + json.dumps(data_uri(MODULE.parent/'library/backgrounds/engineering-workshop-v1.png')) + ';window.sceneDuration=', 1)
    film = film.replace(hook, hook.replace('const renderer=', 'let renderer=') + '''
const atlasSource=payload.resolved.shots.map(shot=>structuredClone(shot.components));
const thumb=createCanvas(640,360), thumbContext=thumb.getContext('2d');
thumbContext.imageSmoothingEnabled=false;
let atlasConfig='';
window.atlasConfigure=(config,background=true)=>{
 config=PixelVideo.componentStyles.normalize(config);
 const next=JSON.stringify([config,background]);
 if(next===atlasConfig)return;
 for(const [index,shot] of payload.resolved.shots.entries()){
  shot.components=structuredClone(atlasSource[index]);
  if(config.visualStyle!=='paper'||shot.id.startsWith('paper-')){
   for(const c of shot.components)Object.assign(c,config,{features:[...config.features]});
  }
  if(background)shot.background={assetKey:'@atlas.bg',kind:'image',fit:'cover',anchorX:.5,anchorY:.5,dim:.40};else delete shot.background;
 }
 renderer=PixelVideo.createRenderer({canvas,createCanvas,assets,resolved:payload.resolved,mouth:payload.mouth,style:payload.style,whitebox});
 atlasConfig=next;
};
window.atlasDraw=async(id,f=215,capture=true)=>{
 const shot=payload.resolved.shots.find(s=>s.id===id);
 if(!shot)throw Error('Unknown atlas shot '+id);
 await window.renderFrame((shot.startFrame+Math.min(shot.durationFrames-1,Math.max(0,f)))/payload.resolved.project.fps);
 if(!capture)return;
 thumbContext.drawImage(canvas,0,0,thumb.width,thumb.height);
 return thumb.toDataURL('image/jpeg',.88);
};
''')
    film = film.replace('</style>', 'body{display:block;min-height:0}main{width:100%}nav{display:none}</style>')
    catalog = json.loads((MODULE/'catalog.json').read_text(encoding='utf-8'))
    entries = json.loads((project/'gallery.json').read_text(encoding='utf-8'))['entries']
    by_kind = {entry['id']: entry for entry in entries if entry['group']=='component'}
    kinds = [{**item, 'title':by_kind[item['kind']]['title'],
              'frames':by_kind[item['kind']]['states'],
              'previewFrame':by_kind[item['kind']]['localFrame']} for item in catalog['items']]
    template = (HERE/'template.html').read_text(encoding='utf-8')
    source_shots = json.loads((project/'timeline.json').read_text(encoding='utf-8'))['shots']
    by_id = {shot['id']: shot for shot in source_shots}
    paper_kinds = catalog['styleSystem']['paperSelection']['kinds']
    shot_ids = [item['kind'] for item in kinds] + ['paper-' + kind for kind in paper_kinds]
    inputs = {shot_id: by_id[shot_id]['components'][0] for shot_id in shot_ids}
    package = {'film':film,'kinds':kinds,'inputs':inputs,'paperKinds':paper_kinds,
        'styleSystem':catalog['styleSystem'],'custom':action_examples()}
    html = template.replace('__PACKAGE__',json.dumps(package,ensure_ascii=False).replace('</','<\\/'))
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(html,encoding='utf-8')
    print(json.dumps({'atlas':str(args.output),'kinds':len(kinds),
                      'examples':catalog['styleSystem']['totalExamples'],
                      'configurations':catalog['styleSystem']['totalConfigurations'],
                      'customCases':len(package['custom'])},ensure_ascii=False))


if __name__ == '__main__':
    main()
