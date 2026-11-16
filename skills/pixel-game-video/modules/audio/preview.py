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
import synthesis


BANKS = ('arcade', 'arcade-core', 'common', 'garden', 'library', 'all')


def audio_tag(path):
    return f'<audio controls preload="none" src="{html.escape(path, quote=True)}"></audio>'


def build(out, bank='arcade'):
    if bank not in BANKS:
        raise ValueError(f'Unavailable audition bank: {bank}')
    out.mkdir(parents=True, exist_ok=True)
    catalog = json.loads(Path(__file__).with_name('catalog.json').read_text(encoding='utf-8'))['items']
    bank_groups = {'arcade': {'arcade-core', 'common'}, 'library': {'arcade-core', 'common', 'garden'}}
    groups = bank_groups.get(bank, {bank})
    selected = [item for item in catalog if bank == 'all' or item.get('bank') in groups]
    recipes = {}
    for item in selected:
        if 'synthesis' in item:
            cue = {'id': item['id']}
            synthesis.resolve_sfx(cue, item, 0, 60)
            recipes[item['id']] = cue['synthesis']
    rendered = synthesis.render_many(recipes.values())
    records = []
    for item in selected:
        ident = item['id']
        filename = ident + '.wav'
        record = {**item, 'file': filename, 'stems': {}}
        if ident in recipes:
            recipe = recipes[ident]
            game_audio.write_wav(out / filename, rendered[synthesis.recipe_key(recipe)])
            record['material'] = 'Garden · ' + recipe['voice']
        elif ident.startswith('arcade-'):
            shutil.copyfile(arcade.asset(ident), out / filename)
            record['material'] = palette.MATERIALS[ident]
            files = next(entry['files'] for entry in arcade.entries() if entry['id'] == ident)
            for layer in [key for key in files if key != 'master']:
                stem = ident + '-' + layer + '.wav'
                shutil.copyfile(arcade.asset(ident, layer), out / stem)
                record['stems'][layer] = stem
        else:
            record['material'] = palette.MATERIALS[ident]
            clip = palette.sound(ident, 0)
            clip *= min(.10 / max(float(np.sqrt(np.mean(clip ** 2))), 1e-8), .65 / max(float(np.max(np.abs(clip))), 1e-8))
            game_audio.write_wav(out / filename, np.stack([clip, clip], axis=1) * .65)
        records.append(record)

    cards = []
    labels = {'electronic': '电子主体', 'drums': '鼓点层', 'motion': '回弹层'}
    for item in records:
        stems = ''.join(f'<label>{label}{audio_tag(item["stems"][key])}</label>' for key, label in labels.items() if key in item['stems'])
        status = '旧 G2 材质'
        if 'synthesis' in item:
            status = '可调合成'
        elif item.get('status') == 'user-approved':
            status = '已确认'
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
    intro = '选择一种材质试听。Garden 的样本使用各音色的默认参数，街机样本保持原 WAV 母版。'
    page = template.replace('__COUNT__', str(len(records))).replace('__INTRO__', intro).replace('__CARDS__', ''.join(cards))
    (out / 'index.html').write_text(page, encoding='utf-8')
    return manifest


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--out', type=Path, required=True)
    parser.add_argument('--bank', choices=BANKS, default='arcade')
    args = parser.parse_args()
    manifest = build(args.out, args.bank)
    print(f'{len(manifest["items"])} sounds exported; PCM masters preserved')


if __name__ == '__main__':
    main()
