"""Verified 02 artwork and face-only variants; no project-specific timing."""
import base64
import hashlib
import io
import json
from pathlib import Path
from PIL import Image, ImageDraw


def encode(image):
    output = io.BytesIO()
    image.save(output, format='PNG')
    return 'data:image/png;base64,' + base64.b64encode(output.getvalue()).decode('ascii')


def prepare(module_root: Path):
    records = json.loads((module_root / 'catalog.json').read_text(encoding='utf-8'))['items']
    assets = {}
    for record in records:
        if record['kind'] != 'actor':
            continue
        path = module_root / record['path']
        if hashlib.sha256(path.read_bytes()).hexdigest() != record['sha256']:
            raise ValueError(f"Character bytes changed: {record['id']}")
        original = Image.open(path).convert('RGBA')
        if original.size != (32, 36) or record.get('expressions') != 'lead02':
            raise ValueError('New actors require their own face geometry adapter')
        for blink in (0, 1):
            for mouth in range(5):
                image = original.copy()
                draw = ImageDraw.Draw(image)
                draw.rectangle((14, 20, 19, 21), fill='#f8c9b3')
                if mouth == 0:
                    draw.rectangle((15, 20, 18, 20), fill='#dfa99b')
                elif mouth == 1:
                    draw.rectangle((16, 20, 18, 20), fill='#a87870')
                elif mouth == 2:
                    draw.rectangle((15, 20, 18, 20), fill='#8f6262')
                    draw.rectangle((16, 21, 17, 21), fill='#d8988d')
                elif mouth == 3:
                    draw.rectangle((16, 20, 18, 20), fill='#936463')
                    draw.point((17, 21), fill='#d8988d')
                else:
                    draw.rectangle((15, 20, 18, 20), fill='#9e6e67')
                    draw.rectangle((16, 21, 17, 21), fill='#e1a294')
                if blink:
                    for x in (10, 20):
                        draw.rectangle((x, 15, x + 2, 18), fill='#f8c9b3')
                        draw.rectangle((x, 17, x + 2, 17), fill='#30354b')
                if image.crop((0, 23, 32, 36)).tobytes() != original.crop((0, 23, 32, 36)).tobytes():
                    raise ValueError('Expression changed body pixels')
                assets[f"{record['id']}:{blink}-{mouth}"] = encode(image)
    return assets
