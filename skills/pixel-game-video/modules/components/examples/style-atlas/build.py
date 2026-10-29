"""Build the complete component atlas from the real guide renderer.

First build ../guide with scripts/video.py. The generated HTML is a local preview,
not a second rendering implementation. --output can update a stable preview URL.
"""
from pathlib import Path
import argparse
import base64
import json
import hashlib

HERE = Path(__file__).resolve().parent
MODULE = HERE.parents[1]


def data_uri(file):
    mime = 'image/png' if file.suffix == '.png' else 'image/jpeg'
    return 'data:' + mime + ';base64,' + base64.b64encode(file.read_bytes()).decode()


def inline_custom(folder):
    html = (MODULE / 'examples' / folder / 'index.html').read_text(encoding='utf-8')
    if folder == 'resource-into-tray':
        html = html.replace('../../assets/object-style/tokens-containers.png', data_uri(MODULE/'assets/object-style/tokens-containers.png'))
    else:
        html = html.replace('<script src="../../fusion-component.js"></script>', '<script>' + (MODULE/'fusion-component.js').read_text(encoding='utf-8') + '</script>')
        html = html.replace('../../../style/assets/engineering-workshop-v1.png', data_uri(MODULE.parent/'style/assets/engineering-workshop-v1.png'))
    return html


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=HERE/'build/index.html')
    args = parser.parse_args()
    project = MODULE/'examples/guide'
    lock = json.loads((project/'build/project-lock.json').read_text(encoding='utf-8'))
    for base, records in ((project, lock['inputFiles']), (MODULE.parents[1], lock['runtimeFiles'])):
        for relative, expected in records.items():
            if hashlib.sha256((base/relative).read_bytes()).hexdigest() != expected:
                raise RuntimeError('Guide source/runtime changed; rebuild guide before atlas: ' + relative)
    film = (MODULE/'examples/guide/build/film.html').read_text(encoding='utf-8')
    hook = 'const renderer=PixelVideo.createRenderer({canvas,createCanvas,assets,resolved:payload.resolved,mouth:payload.mouth,style:payload.style});'
    if hook not in film:
        raise RuntimeError('Guide renderer hook changed; update atlas binding')
    film = film.replace('window.sceneDuration=', "payload.assets['@atlas.bg']=" + json.dumps(data_uri(MODULE.parent/'style/assets/engineering-workshop-v1.png')) + ';window.sceneDuration=', 1)
    film = film.replace(hook, hook.replace('const renderer=', 'let renderer=') + '''
window.atlasConfigure=(config,background=true)=>{
 config=PixelVideo.componentStyles.normalize(config);
 for(const shot of payload.resolved.shots){
  for(const c of shot.components)Object.assign(c,config,{features:[...config.features]});
  if(background)shot.background={assetKey:'@atlas.bg',kind:'image',fit:'cover',anchorX:.5,anchorY:.5,dim:.40};else delete shot.background;
 }
 renderer=PixelVideo.createRenderer({canvas,createCanvas,assets,resolved:payload.resolved,mouth:payload.mouth,style:payload.style});
};
window.atlasDraw=async(kind,f=215,capture=true)=>{const shot=payload.resolved.shots.find(s=>s.id===kind);if(!shot)throw Error('Unknown kind '+kind);await window.renderFrame((shot.startFrame+Math.min(239,Math.max(0,f)))/60);return capture?canvas.toDataURL('image/jpeg',.88):null};
window.atlasResolved=()=>payload.resolved;
''')
    film = film.replace('</style>', 'body{display:block;min-height:0}main{width:100%}nav{display:none}</style>')
    catalog = json.loads((MODULE/'catalog.json').read_text(encoding='utf-8'))
    entries = json.loads((MODULE/'examples/guide/gallery.json').read_text(encoding='utf-8'))['entries']
    kinds = [{**item, 'title':next(x['title'] for x in entries if x['id']==item['kind'])} for item in catalog['items']]
    template = (HERE/'template.html').read_text(encoding='utf-8')
    source_shots = json.loads((MODULE/'examples/guide/timeline.json').read_text(encoding='utf-8'))['shots']
    inputs = {item['kind']:next(c for s in source_shots for c in s.get('components',[]) if c['kind']==item['kind']) for item in kinds}
    package = {'film':film,'kinds':kinds,'inputs':inputs,'custom':{
        'tray':inline_custom('resource-into-tray'),
        'assembly':inline_custom('energy-actuator-assembly')},
        'customPreview': data_uri(MODULE/'assets/reference/energy-actuator-assembly.png')}
    html = template.replace('__PACKAGE__',json.dumps(package,ensure_ascii=False).replace('</','<\\/'))
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(html,encoding='utf-8')
    print(json.dumps({'atlas':str(args.output),'kinds':12,'styleVariants':6,'baseExamples':84,'withStack':156,'customCases':2},ensure_ascii=False))


if __name__ == '__main__':
    main()
