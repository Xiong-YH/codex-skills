"""Independent audition gallery; masters and stems are copied byte-for-byte."""
import argparse
import html
import json
from pathlib import Path
import shutil

import numpy as np
import arcade
import game_audio
import palette


def audio_tag(path):
    return f'<audio controls preload="none" src="{html.escape(path, quote=True)}"></audio>'


def build(out, bank='all'):
    if bank not in ['all', 'arcade', 'arcade-core']:
        raise ValueError(f'Unavailable audition bank: {bank}')
    out.mkdir(parents=True, exist_ok=True)
    catalog = json.loads(Path(__file__).with_name('catalog.json').read_text(encoding='utf-8'))['items']
    records = []
    for item in catalog:
        native = item['id'].startswith('arcade-')
        if bank == 'arcade' and not native:
            continue
        if bank == 'arcade-core' and item.get('bank') != bank:
            continue
        filename = item['id'] + '.wav'
        record = {**item, 'file': filename, 'material': palette.MATERIALS[item['id']], 'stems': {}}
        if native:
            shutil.copyfile(arcade.asset(item['id']), out / filename)
            files = next(entry['files'] for entry in arcade.entries() if entry['id'] == item['id'])
            for layer in [key for key in files if key != 'master']:
                stem = item['id'] + '-' + layer + '.wav'
                shutil.copyfile(arcade.asset(item['id'], layer), out / stem)
                record['stems'][layer] = stem
        else:
            clip = palette.sound(item['id'], 0)
            clip *= min(.10 / max(float(np.sqrt(np.mean(clip ** 2))), 1e-8), .65 / max(float(np.max(np.abs(clip))), 1e-8))
            game_audio.write_wav(out / filename, np.stack([clip, clip], axis=1) * .65)
        records.append(record)

    cards = []
    labels = {'electronic': '电子主体', 'drums': '鼓点层', 'motion': '回弹层'}
    for item in records:
        stems = ''.join(f'<label>{label}{audio_tag(item["stems"][key])}</label>' for key, label in labels.items() if key in item['stems'])
        status = {'user-approved': '已确认', 'available-for-audition': '新增 · 待试听反馈'}.get(item.get('status'), '旧 G2 材质')
        group = item.get('group', 'G2')
        use = html.escape('；'.join(item.get('use', [])))
        avoid = html.escape('；'.join(item.get('avoid', [])))
        semantics = f'<p class="use">用于：{use}</p><p class="avoid">避开：{avoid}</p>' if use else ''
        title = html.escape(item.get('name', item['id']))
        details = f'<details><summary>听分层</summary>{stems}</details>' if stems else ''
        cards.append(f'<article data-bank="{item.get("bank", "g2")}" data-group="{group}"><span class="badge">{status} · {group}</span>'
            f'<h2>{title}</h2><code>{html.escape(item["id"])}</code><p>{html.escape(item["material"])}</p>{semantics}'
            f'<label>完整音效{audio_tag(item["file"])}</label>{details}</article>')

    manifest = {'bank': bank, 'items': records, 'subjectiveListening': 'not_reviewed'}
    (out / 'index.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    template = Path(__file__).with_suffix('.html').read_text(encoding='utf-8')
    intro = '街机电子主体＋鼓点＋回弹的基础六种已确认，完整音效保持母版电平。扩展与蓄力实验已退出可选库。'
    page = template.replace('__COUNT__', str(len(records))).replace('__INTRO__', intro).replace('__CARDS__', ''.join(cards))
    (out / 'index.html').write_text(page, encoding='utf-8')
    return manifest


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--out', type=Path, required=True)
    parser.add_argument('--bank', choices=['all', 'arcade', 'arcade-core'], default='all')
    args = parser.parse_args()
    manifest = build(args.out, args.bank)
    print(f'{len(manifest["items"])} sounds exported; PCM masters preserved')


if __name__ == '__main__':
    main()
