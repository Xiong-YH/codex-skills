"""Prepare approved references without inventing mouth or skeletal frames."""
import base64
import hashlib
import io
import json
from pathlib import Path
from PIL import Image


def encode(image):
    output = io.BytesIO()
    image.save(output, format='PNG')
    return 'data:image/png;base64,' + base64.b64encode(output.getvalue()).decode('ascii')


def prepare(module_root: Path, actor_ids=None):
    module_root = Path(module_root).resolve()
    records = json.loads((module_root / 'catalog.json').read_text(encoding='utf-8'))['items']
    assets = {}
    for record in records:
        if record['kind'] != 'actor' or actor_ids is not None and record['id'] not in actor_ids:
            continue
        path = (module_root / record['path']).resolve()
        if not path.is_relative_to(module_root):
            raise ValueError('Character path must stay inside the library')
        if hashlib.sha256(path.read_bytes()).hexdigest() != record['sha256']:
            raise ValueError(f"Character bytes changed: {record['id']}")
        original = Image.open(path).convert('RGBA')
        if list(original.size) != record['nativeSize'] or record.get('expressions') != 'reference-static':
            raise ValueError('Character requires a declared reference-image adapter')
        left, top, right, bottom = record['previewBounds']
        if not (0 <= left < right <= original.width and 0 <= top < bottom <= original.height):
            raise ValueError('Character preview bounds must fit the source image')
        # Framing only: no facial edits, alpha cleanup or generated variants.
        assets[f"{record['id']}:reference"] = encode(original.crop((left, top, right, bottom)))
    return assets
