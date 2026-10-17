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
                # Rest uses the approved original smile, including its lip pixels.
                # Speech changes only the original 6 x 2 mouth area. A continuous
                # dark opening reads as a mouth; a pink pixel underneath reads as
                # a protruding tongue at this sprite's small display size.
                if mouth:
                    draw.rectangle((14, 20, 19, 21), fill='#f8c9b3')
                    shapes = {
                        1: ((15, 20, 18, 20), '#a87870'),  # relaxed articulation
                        2: ((15, 20, 18, 21), '#93665e'),  # open vowel, two pixels high
                        3: ((16, 20, 17, 21), '#93665e'),  # rounded vowel
                        4: ((15, 20, 18, 20), '#93665e'),  # narrow vowel
                    }
                    bounds, color = shapes[mouth]
                    draw.rectangle(bounds, fill=color)
                if blink:
                    for x in (10, 20):
                        draw.rectangle((x, 15, x + 2, 18), fill='#f8c9b3')
                        draw.rectangle((x, 17, x + 2, 17), fill='#30354b')
                for y in range(original.height):
                    for x in range(original.width):
                        mouth_pixel = 14 <= x <= 19 and 20 <= y <= 21
                        eyelid_pixel = blink and 15 <= y <= 18 and (10 <= x <= 12 or 20 <= x <= 22)
                        if not (mouth_pixel or eyelid_pixel) and image.getpixel((x, y)) != original.getpixel((x, y)):
                            raise ValueError('Expression changed pixels outside mouth/eyelid anchors')
                assets[f"{record['id']}:{blink}-{mouth}"] = encode(image)
    return assets
