from pathlib import Path
import base64
import html
import json
import sys


import argparse
parser = argparse.ArgumentParser(description='Export an offline gallery for the nine registered arcade sound effects.')
parser.add_argument('--out', type=Path, required=True)
args = parser.parse_args()
AUDIO = Path(__file__).resolve().parent
sys.path.insert(0, str(AUDIO))
import arcade
OUT = args.out.resolve()
OUT.mkdir(parents=True, exist_ok=True)
count = 0

def player(raw):
    global count
    count += 1
    return '<audio controls preload="none" src="data:audio/wav;base64,' + base64.b64encode(raw).decode() + '"></audio>'

items = json.loads((AUDIO / 'catalog.json').read_text(encoding='utf-8'))['items']
core = []
for item in sorted((i for i in items if i['id'].startswith('arcade-')), key=lambda i: i.get('bank') != 'common'):
    ident = item['id']
    entry = next(x for x in arcade.entries() if x['id'] == ident)
    layers = ''.join('<label>' + label + player(arcade.asset(ident, layer).read_bytes()) + '</label>'
                     for layer, label in [('electronic', '电子主体'), ('drums', '鼓点层'), ('motion', '回弹层')]
                     if layer in entry['files'])
    details = '<details><summary>听三个分层</summary>' + layers + '</details>' if layers else ''
    badge = '新增 · 正式原子' if item.get('bank') == 'common' else '已确认 · 固定原子'
    use = html.escape('、'.join(item['use']))
    avoid = html.escape('、'.join(item['avoid']))
    core.append(f'<article data-kind="core"><span class="badge approved">{badge}</span><h3>{item["name"]}</h3><code>{ident}</code><p>{item["durationSeconds"]:.3f} 秒 · variant=0</p>{player(arcade.asset(ident).read_bytes())}<p>用于：{use}</p><p class="muted">避用：{avoid}</p>{details}</article>')

source_docs = ''.join('<details><summary>' + title + ' · 完整规范快照</summary><pre>' + html.escape((AUDIO / file).read_text(encoding='utf-8')) + '</pre></details>'
                      for file, title in [('GARDEN.md', 'Garden 声音工作流'), ('SYNTHESIS.md', '完整音库'),
                                          ('ARCADE.md', '街机 WAV'), ('MUSIC.md', '配乐导入')])
page = '''<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>声音库 · 试听与使用规范</title><style>
:root{color-scheme:dark;--bg:#11161b;--panel:#1b232b;--line:#34414c;--text:#edf4f6;--muted:#a8b7c2;--mint:#a5e5c8}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:16px/1.7 "Segoe UI","Microsoft YaHei",sans-serif}main{max-width:1240px;margin:auto;padding:48px 28px 80px}header{padding:10px 0 28px}h1{font-size:clamp(30px,5vw,48px);line-height:1.2;margin:12px 0}h2{font-size:25px;margin:0}h3{font-size:19px;margin:12px 0 5px}p{margin:10px 0}a{color:var(--mint)}.eyebrow{color:var(--mint);letter-spacing:3px;font-size:12px}.muted,code{color:var(--muted)}code{font-size:13px;overflow-wrap:anywhere}.intro{max-width:880px;color:var(--muted)}nav,.tools{display:flex;gap:10px;flex-wrap:wrap;margin:18px 0}nav a,button{border:1px solid var(--line);border-radius:9px;padding:8px 14px;background:var(--panel);color:var(--text);text-decoration:none;cursor:pointer}button.active{border-color:var(--mint);color:var(--mint)}input{flex:1;min-width:210px;background:var(--panel);color:var(--text);border:1px solid var(--line);border-radius:9px;padding:10px 14px;font:inherit}section{margin-top:36px;scroll-margin-top:20px}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin-top:18px}article{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:22px;min-width:0}article p{font-size:14px}audio{display:block;width:100%;height:40px;margin:12px 0 18px}label{display:block;font-size:13px;color:var(--muted);margin-top:14px}.badge{display:inline-block;font-size:12px;border-radius:6px;padding:3px 9px;background:#303b46;color:#ccd7df}.approved{background:#233e35;color:#afe6ca}.new{background:#4b3821;color:#ffce88}.pending{border:1px dashed #79603b;padding:12px;border-radius:8px;color:#ffce88;font-size:13px;margin-top:18px}.wide{grid-column:1/-1}summary{cursor:pointer;color:var(--mint);padding:10px 0}details{margin-top:12px}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:var(--panel);padding:22px;border-radius:12px;font:13px/1.8 "Microsoft YaHei",sans-serif}.note{border-left:3px solid var(--mint);padding:12px 18px;background:#19262a}.hidden,[hidden]{display:none!important}footer{margin-top:40px;color:var(--muted);font-size:13px}@media(max-width:900px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:580px){main{padding:26px 16px}.grid{grid-template-columns:1fr}article{padding:18px}}
</style></head><body><main><header><h1>街机音效试听</h1><p class="intro">9 种事件音效及 18 个街机分层，支持离线试听。</p><p class="note">完整音库由 preview.py --bank library 生成。</p><nav><a href="#core">事件音效</a><a href="#rules">声音工作流</a></nav><div class="tools"><input id="search" placeholder="搜索名称或音效 ID" aria-label="搜索声音"><button id="stop">停止全部</button></div></header>
<section id="core"><h2>常用音效 · 九种正式原子</h2><p class="muted">九种街机音效都可按分镜事件直接调用。</p><div class="grid">__CORE__</div></section>
<section id="rules"><h2>声音工作流</h2>__DOCS__</section>
</main><script>
const sounds=[...document.querySelectorAll('audio')];sounds.forEach(a=>a.addEventListener('play',()=>sounds.forEach(b=>{if(b!==a)b.pause()})));document.querySelector('#stop').onclick=()=>sounds.forEach(a=>{a.pause();a.currentTime=0});document.querySelector('#search').addEventListener('input',e=>{const q=e.target.value.trim().toLowerCase();document.querySelectorAll('article').forEach(a=>a.hidden=q&&!a.textContent.toLowerCase().includes(q))});
</script></body></html>'''
for key, value in [('CORE', ''.join(core)), ('DOCS', source_docs)]:
    page = page.replace('__' + key + '__', value)
target = OUT / 'index.html'
target.write_text(page, encoding='utf-8')
assert count == 27, count
print(json.dumps({'file': str(target), 'players': count, 'masters': 9, 'stems': 18}, ensure_ascii=False))
