"""Generate the portable foundation snapshot from the owned illustration example."""
import argparse,json,shutil,subprocess,sys,tempfile
from pathlib import Path
from directorlib.authoring import load_sources,transform,foundation_validate
from directorlib.common import SKILL_ROOT,GENERATED,digest,foundation_root,read_json,write_json


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--foundation');parser.add_argument('--check',action='store_true');args=parser.parse_args()
    foundation=foundation_root(args.foundation);source=SKILL_ROOT/'examples/whole-illustration';destination=foundation/'modules/scenes/examples/whole-illustration'
    subprocess.run([sys.executable,str(SKILL_ROOT/'scripts/render-illustration.py'),str(source),'--check'],check=True,capture_output=True)
    outputs,_=transform(load_sources(source));outputs['project.json']['authoringMode']='direct'
    media=set()
    def visit(value):
        if isinstance(value,dict):
            for key,item in value.items():
                if key in ('file','image') and isinstance(item,str) and item.startswith('media/'):media.add(item)
                else:visit(item)
        elif isinstance(value,list):
            for item in value:visit(item)
    visit(outputs)
    hashes={file.relative_to(source).as_posix():digest(file) for file in sorted(source.rglob('*')) if file.is_file() and not set(file.relative_to(source).parts)&{'build','video','outputs','__pycache__'} and not any(part.startswith('.') for part in file.relative_to(source).parts)}
    provenance=destination/'provenance.json'
    if provenance.exists():
        old=read_json(provenance)
        for name,expected in old['generatedHashes'].items():
            if not (destination/name).is_file() or digest(destination/name)!=expected:raise ValueError('Generated example edited; preserve changes before resync: '+name)
    elif destination.exists() and any(destination.iterdir()):raise ValueError('Unknown destination contents')
    if args.check:
        if not provenance.exists() or read_json(provenance)['sourceHashes']!=hashes:raise ValueError('Standalone example needs regeneration')
        print(json.dumps(foundation_validate(foundation,destination),ensure_ascii=False));return
    work=Path.cwd()/'work';work.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='whole-example-',dir=work) as temporary:
        stage=Path(temporary)
        for name,value in outputs.items():write_json(stage/name,value)
        for name in media:
            origin=(source/name).resolve();target=(stage/name).resolve()
            if not origin.is_relative_to(source/'media') or not target.is_relative_to(stage/'media'):raise ValueError('Escaping example media')
            target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(origin,target)
        validation=foundation_validate(foundation,stage)
        names=[*GENERATED,*sorted(media)]
        for name in names:
            target=destination/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(stage/name,target)
        write_json(provenance,{'schemaVersion':1,'sourcePackage':'pixel-video-director','sourceExample':'examples/whole-illustration',
          'sourceHashes':hashes,'generatedHashes':{name:digest(destination/name) for name in names},
          'note':'Standalone direct snapshot; runs without director or original image generation services.'})
    print(json.dumps(validation,ensure_ascii=False))


if __name__=='__main__':
    try:main()
    except (OSError,ValueError,KeyError,subprocess.SubprocessError) as error:raise SystemExit(str(error))
