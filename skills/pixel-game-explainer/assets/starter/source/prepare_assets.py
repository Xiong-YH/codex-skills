"""Package the supplied cast; expression edits are confined to the lead's face."""
import base64
import hashlib
import io
import json
from pathlib import Path
import shutil
from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
TARGET = ROOT / 'build'
CAST = HERE / 'characters'
LEAD = json.loads((ROOT / 'project.json').read_text())['lead']


def encode(image):
    data = io.BytesIO()
    image.save(data, format='PNG')
    return 'data:image/png;base64,' + base64.b64encode(data.getvalue()).decode()


def main():
    TARGET.mkdir(parents=True, exist_ok=True)
    records = json.loads((CAST / 'characters.json').read_text())
    assets = {}
    for record in records:
        path = CAST / record['nativePath']
        image = Image.open(path).convert('RGBA')
        if hashlib.sha256(path.read_bytes()).hexdigest() != record['sha256']:
            raise RuntimeError('Supplied character bytes changed: ' + record['id'])
        if record['id'] == LEAD:
            assets[record['id']] = encode(image)
    lead_record = next(r for r in records if r['id'] == LEAD)
    original = Image.open(CAST / lead_record['nativePath']).convert('RGBA')
    if original.size != (32, 36):
        raise ValueError('Adapt the expression geometry before using a different character grid')
    expressions = {}
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
            elif mouth == 4:
                draw.rectangle((15, 20, 18, 20), fill='#9e6e67')
                draw.rectangle((16, 21, 17, 21), fill='#e1a294')
            if blink:
                for x in (10, 20):
                    draw.rectangle((x, 15, x + 2, 18), fill='#f8c9b3')
                    draw.rectangle((x, 17, x + 2, 17), fill='#30354b')
            if image.crop((0, 23, 32, 36)).tobytes() != original.crop((0, 23, 32, 36)).tobytes():
                raise RuntimeError('Lead body pixels must stay identical')
            expressions[f'{blink}-{mouth}'] = encode(image)
    (HERE / 'assets.js').write_text('window.CastAssets=' + json.dumps({'cast': assets, 'lead': expressions}) + ';\n')
    original.save(TARGET / 'lead-02.png')
    print(f'{len(records)} character asset(s) verified; 10 face variants preserve the body')


if __name__ == '__main__':
    main()
