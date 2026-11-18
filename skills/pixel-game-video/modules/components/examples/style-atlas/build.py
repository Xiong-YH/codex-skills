"""Build the R41 component gallery using the same runtime as the Canvas workbench."""
import argparse
import base64
import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
SKILL = HERE.parents[3]
REFERENCE_IMAGES = {
    'deck': 'lessons', 'comparison': 'research', 'chat': 'chat', 'applications': 'counter',
    'checklist': 'summary', 'action': 'practice', 'chapter': 'title', 'template': 'template',
    'handoff-out': 'handoff',
}


def read(path):
    return json.loads(path.read_text(encoding='utf-8'))


def verify(project, payload):
    lock = read(project / 'build/project-lock.json')
    if payload['resolved']['inputHash'] != lock['inputHash']:
        raise ValueError('Gallery guide was updated. Build the guide again.')
    for parent, files in ((project, lock['inputFiles']), (SKILL, lock['runtimeFiles'])):
        for relative, expected in files.items():
            if hashlib.sha256((parent / relative).read_bytes()).hexdigest() != expected:
                raise ValueError(f'Gallery guide or runtime changed. Rebuild the guide: {relative}')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--project', type=Path, default=HERE.parent / 'guide')
    parser.add_argument('--output', type=Path, default=HERE / 'build/index.html')
    parser.add_argument('--reference-dir', type=Path, help='Optional local R41 PNG captures for the comparison dialog')
    args = parser.parse_args()
    project = args.project.resolve()
    payload = read(project / 'build/payload.json')
    verify(project, payload)
    gallery = read(project / 'gallery.json')
    source = read(project / 'timeline.json')['shots']
    shots = {shot['id']: shot for shot in payload['resolved']['shots']}
    frames = payload['resolved']['durationFrames']
    for clip in gallery['clips']:
        first = shots[clip['id']]['startFrame'] + clip.pop('fromOffset', 0)
        stop = first + clip['frames']
        markers = [mark['frame'] for mark in clip['markers']]
        if not 0 <= first < stop <= frames or any(not 0 <= f < clip['frames'] for f in [clip['poster'], *markers]):
            raise ValueError(f"Invalid gallery range: {clip['id']}")
        clip['start'] = first
        clip['example'] = {'shots': [item for item in source if
                                    shots[item['id']]['startFrame'] < stop and shots[item['id']]['endFrame'] > first]}
        ref = clip.get('reference')
        if args.reference_dir and ref and clip['id'] in REFERENCE_IMAGES:
            image = args.reference_dir / (REFERENCE_IMAGES[clip['id']] + '.png')
            if image.is_file():
                ref['image'] = 'data:image/png;base64,' + base64.b64encode(image.read_bytes()).decode('ascii')
    script = (project / 'build/runtime.js').read_text(encoding='utf-8').replace('</script', '<\\/script')
    packed = json.dumps({'gallery':gallery, 'payload':payload}, ensure_ascii=False).replace('</', '<\\/')
    template = (HERE / 'template.html').read_text(encoding='utf-8')
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(template.replace('__RUNTIME__', script).replace('__PACKAGE__', packed), encoding='utf-8')
    print(json.dumps({'gallery':str(args.output), 'clips':len(gallery['clips']), 'frames':frames}, ensure_ascii=False))


if __name__ == '__main__':
    main()
