from pathlib import Path
import base64
import hashlib
import html
import io
import json
import sys
import wave


import argparse
parser = argparse.ArgumentParser(description='Export one offline HTML with the nine registered SFX, music and rules.')
parser.add_argument('--out', type=Path, required=True)
args = parser.parse_args()
AUDIO = Path(__file__).resolve().parent
sys.path.insert(0, str(AUDIO))
import arcade
OUT = args.out.resolve()
OUT.mkdir(parents=True, exist_ok=True)
count = 0

def player(raw, mime='audio/wav'):
    global count
    count += 1
    return '<audio controls preload="none" src="data:' + mime + ';base64,' + base64.b64encode(raw).decode() + '"></audio>'

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

music = json.loads((AUDIO / 'assets/music/chill-wave.json').read_text(encoding='utf-8'))
music_raw = (AUDIO / 'assets/music' / music['file']).read_bytes()
assert hashlib.sha256(music_raw).hexdigest() == music['sha256']
bgm = f'<article class="wide" data-kind="music"><span class="badge approved">已有配乐 · 原曲</span><h3>Chill Wave</h3><p>Kevin MacLeod · 约 4 分钟 · CC BY 4.0</p>{player(music_raw,"audio/mpeg")}<p>试听播放原曲。制作时另设配乐轨，按项目调整音量、淡入淡出、循环及旁白压低。</p><p><a href="{music["sourceUrl"]}">曲目来源</a> · <a href="{music["licenseUrl"]}">许可与署名要求</a></p></article>'
voices = ''.join('<article data-kind="voice"><span class="badge">历史音色参考</span><h3>' + title + '</h3>' + player((AUDIO / 'assets/voices' / file).read_bytes(), 'audio/mpeg') + '<p>仅核对音色，不是本次台词，也不是背景音乐。</p></article>'
                 for file, title in [('jieshuo-xiaoshuai-demo.mp3','解说小帅 · 原始试听'),('jieshuo-xiaoshuai-generated.mp3','解说小帅 · 历史台词样本')])
guide_text = (AUDIO / 'GUIDE.md').read_text(encoding='utf-8')
rule_cards = []
for line in guide_text.splitlines():
    if len(line) > 3 and line[0] in '12345' and line[1:3] == '. ':
        parts = line[3:].split('**', 2)
        if len(parts) == 3:
            rule_cards.append('<div><h3>' + line[0] + ' · ' + html.escape(parts[1]) + '</h3><p>' + html.escape(parts[2].strip()).replace('`', '') + '</p></div>')
assert len(rule_cards) == 5, 'Expected the five rules in GUIDE.md'
rules = '<div class="rules">' + ''.join(rule_cards) + '</div>'
source_docs = ''.join('<details><summary>' + title + ' · 完整规范快照</summary><pre>' + html.escape((AUDIO / file).read_text(encoding='utf-8')) + '</pre></details>'
                      for file, title in [('GUIDE.md','声音与混音'),('ARCADE.md','原子音效与扩充方向'),('MUSIC.md','配乐工作流')])
page = '''<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>声音库 · 试听与使用规范</title><style>
:root{color-scheme:dark;--bg:#11161b;--panel:#1b232b;--line:#34414c;--text:#edf4f6;--muted:#a8b7c2;--mint:#a5e5c8}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:16px/1.7 "Segoe UI","Microsoft YaHei",sans-serif}main{max-width:1240px;margin:auto;padding:48px 28px 80px}header{padding:10px 0 28px}h1{font-size:clamp(30px,5vw,48px);line-height:1.2;margin:12px 0}h2{font-size:25px;margin:0}h3{font-size:19px;margin:12px 0 5px}p{margin:10px 0}a{color:var(--mint)}.eyebrow{color:var(--mint);letter-spacing:3px;font-size:12px}.muted,code{color:var(--muted)}code{font-size:13px;overflow-wrap:anywhere}.intro{max-width:880px;color:var(--muted)}nav,.tools{display:flex;gap:10px;flex-wrap:wrap;margin:18px 0}nav a,button{border:1px solid var(--line);border-radius:9px;padding:8px 14px;background:var(--panel);color:var(--text);text-decoration:none;cursor:pointer}button.active{border-color:var(--mint);color:var(--mint)}input{flex:1;min-width:210px;background:var(--panel);color:var(--text);border:1px solid var(--line);border-radius:9px;padding:10px 14px;font:inherit}section{margin-top:36px;scroll-margin-top:20px}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin-top:18px}article,.rules>div{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:22px;min-width:0}article p{font-size:14px}audio{display:block;width:100%;height:40px;margin:12px 0 18px}label{display:block;font-size:13px;color:var(--muted);margin-top:14px}.badge{display:inline-block;font-size:12px;border-radius:6px;padding:3px 9px;background:#303b46;color:#ccd7df}.approved{background:#233e35;color:#afe6ca}.new{background:#4b3821;color:#ffce88}.pending{border:1px dashed #79603b;padding:12px;border-radius:8px;color:#ffce88;font-size:13px;margin-top:18px}.wide{grid-column:1/-1}.rules{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:18px}.rules h3{color:var(--mint);margin-top:0}.rules p{font-size:14px;color:#c5d1d8}summary{cursor:pointer;color:var(--mint);padding:10px 0}details{margin-top:12px}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:var(--panel);padding:22px;border-radius:12px;font:13px/1.8 "Microsoft YaHei",sans-serif}.note{border-left:3px solid var(--mint);padding:12px 18px;background:#19262a}.hidden,[hidden]{display:none!important}footer{margin-top:40px;color:var(--muted);font-size:13px}@media(max-width:900px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:580px){main{padding:26px 16px}.grid,.rules{grid-template-columns:1fr}article{padding:18px}}
</style></head><body><main><header><div class="eyebrow">PIXEL VIDEO / SOUND LIBRARY</div><h1>先听声音，再决定怎么用。</h1><p class="intro">常用可调用库：9 种正式 WAV 原子音效；另有 18 个街机分层、1 首配乐与 2 段历史音色参考。所有音频内嵌在本 HTML，离线可听。</p><p class="note">新增三种已正式注册：轻选择确认（含鼓点）、焦点移动、系统展开。均从 skill 内固定 WAV 读取；旧试听稿和对照缓存已清理。</p><nav><a href="#core">常用九种</a><a href="#music">配乐</a><a href="#rules">Skill 规范</a></nav><div class="tools"><input id="search" placeholder="搜索名称或音效 ID" aria-label="搜索声音"><button id="stop">停止全部</button></div><p class="muted">每次只播放一个声音。播放器可单独调音量；九种音效保持正式母版 PCM，配乐保留原曲响度；各类未统一感知响度。</p></header>
<section id="core"><h2>常用音效 · 九种正式原子</h2><p class="muted">六种原街机音效保持不变，新增三种已注册正式 ID，可按事件直接调用。</p><div class="grid">__CORE__</div></section>
<section id="music"><h2>背景音乐 · 1 首</h2><div class="grid">__BGM__</div></section>
<section id="rules"><h2>Skill 使用规范 · 先控制密度</h2>__RULES__<details><summary>查看仓库完整规范（2026-10-28 快照）</summary>__DOCS__</details></section>
<section id="voices"><h2>附：历史人声音色参考</h2><p class="muted">与音乐、事件音效分开；不触发配音生成。</p><div class="grid">__VOICES__</div></section><footer>本页为试听参考，不替代实际成片的听觉验收。九种正式原子已进入 catalog 和可移植素材包，历史母版保持不变。</footer></main><script>
const sounds=[...document.querySelectorAll('audio')];sounds.forEach(a=>a.addEventListener('play',()=>sounds.forEach(b=>{if(b!==a)b.pause()})));document.querySelector('#stop').onclick=()=>sounds.forEach(a=>{a.pause();a.currentTime=0});document.querySelector('#search').addEventListener('input',e=>{const q=e.target.value.trim().toLowerCase();document.querySelectorAll('article').forEach(a=>a.hidden=q&&!a.textContent.toLowerCase().includes(q))});
</script></body></html>'''
for key, value in [('CORE', ''.join(core)), ('BGM', bgm), ('RULES', rules), ('DOCS', source_docs), ('VOICES', voices)]:
    page = page.replace('__' + key + '__', value)
target = OUT / 'index.html'
target.write_text(page, encoding='utf-8')
assert count == 30, count
print(json.dumps({'file': str(target), 'players': count, 'masters': 9, 'stems': 18, 'music': 1, 'voiceReferences': 2}, ensure_ascii=False))
