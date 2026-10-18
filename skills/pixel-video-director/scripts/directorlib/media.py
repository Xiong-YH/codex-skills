"""Replace one shot's visual media without rewriting timing, text or sound."""
import hashlib
from pathlib import Path
import shutil

from .authoring import handoff, load_sources
from .common import guard_generated, read_json, write_json


def replace_media(project, shot_id, source=None, *, layer='background', clear=False,
                  fit='cover', trim_start=0, hold=False, foundation=None):
    project = Path(project).resolve()
    guard_generated(project)
    load_sources(project)
    path = project / 'production-plan.json'
    before = path.read_bytes()
    plan = read_json(path)
    shot = next((s for s in plan['shots'] if s['id'] == shot_id), None)
    if shot is None:
        raise ValueError('Unknown shot ID: ' + shot_id)
    if clear:
        shot.pop(layer, None)
    else:
        source = Path(source).resolve()
        kind = 'image' if source.suffix.lower() in {'.png', '.jpg', '.jpeg', '.webp'} else 'video' if source.suffix.lower() in {'.mp4', '.webm'} else None
        if not kind or not source.is_file():
            raise ValueError('Choose a PNG/JPG/WebP image or MP4/WebM video')
        digest = hashlib.sha256(source.read_bytes()).hexdigest()
        relative = 'media/' + digest[:20] + source.suffix.lower()
        destination = project / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        if source != destination:
            shutil.copy2(source, destination)
        shot[layer] = {'file': relative, 'kind': kind, 'fit': fit, 'trimStartSeconds': trim_start,
                       'shortage': 'hold' if hold else 'error'}
    try:
        write_json(path, plan)
        result = handoff(project, foundation)
    except Exception:
        path.write_bytes(before)
        raise
    return {**result, 'shotId': shot_id, 'layer': layer, 'source': shot.get(layer),
            'note': 'Shot IDs, duration, cues and audio are preserved. Footage source audio is muted. Rebuild to preview.'}
