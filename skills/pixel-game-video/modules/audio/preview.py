"""Generate independent audition clips without creating a video project."""
import argparse
import json
from pathlib import Path
import numpy as np
import palette
import game_audio


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    items = json.loads(Path(__file__).with_name('catalog.json').read_text(encoding='utf-8'))['items']
    records = []
    for item in items:
        clip = palette.sound(item['id'], 0)
        clip *= min(.10 / max(float(np.sqrt(np.mean(clip ** 2))), 1e-8), .65 / max(float(np.max(np.abs(clip))), 1e-8))
        filename = item['id'] + '.wav'
        game_audio.write_wav(args.out / filename, np.stack([clip, clip], axis=1) * .65)
        records.append({'id': item['id'], 'file': filename, 'material': palette.MATERIALS[item['id']]})
    (args.out / 'index.json').write_text(json.dumps(records, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    print(f'{len(records)} audition WAV files generated')


if __name__ == '__main__':
    main()
