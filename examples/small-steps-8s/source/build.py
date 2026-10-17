"""Build a portable, self-contained pixel film preview from the project data."""
import argparse
import base64
import io
import wave
import html
import json
from prepare_assets import main as prepare, HERE, TARGET, ROOT
from mouth import main as prepare_mouth


def stamp(seconds):
    ms = round(seconds * 1000)
    return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}'


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--silent', action='store_true')
    args = parser.parse_args()
    prepare()
    prepare_mouth()
    config = json.loads((ROOT / 'project.json').read_text())
    config['previewSilent'] = args.silent
    captions = json.loads((ROOT / 'captions.json').read_text())
    # Escape markup delimiters before embedding user-authored text in an inline script.
    def js(value):
        return json.dumps(value, ensure_ascii=False).replace('<', chr(92) + 'u003c')
    (HERE / 'captions.js').write_text('window.Narration=' + js(captions) + ';\n')
    scripts = ['pixels.js', 'assets.js', 'captions.js', 'mouth.js', 'visual.js',
               'motion.js', 'film.js', 'player.js']
    code = '<script>window.Runtime=' + js(config) + ';</script>\n'
    code += '\n'.join('<script>\n' + (HERE / name).read_text() + '\n</script>' for name in scripts)
    if args.silent:
        silence = io.BytesIO()
        with wave.open(silence, 'wb') as track:
            track.setnchannels(1)
            track.setsampwidth(2)
            track.setframerate(8000)
            track.writeframes(b'\0\0' * round(config['duration']*8000))
        audio_bytes = silence.getvalue()
    else:
        audio_bytes = (ROOT / 'animation-sfx.wav').read_bytes()
    audio = 'data:audio/wav;base64,' + base64.b64encode(audio_bytes).decode()
    chapters = ''.join(f'<button data-shot="{i}" aria-pressed="false">{i+1:02} · {html.escape(s["name"])}</button>'
                       for i, s in enumerate(config['chapters']))
    clock = f'00:00 / {int(config["duration"])//60:02}:{int(config["duration"])%60:02}'
    page = (HERE / 'shell.html').read_text()
    replacements = {'CHAPTERS': chapters, 'AUDIO_SOURCE': audio, '<!-- SCRIPTS -->': code,
                    'PROJECT_TITLE': html.escape(config['title']), 'PROJECT_MAX': str(config['duration']-.001),
                    'PROJECT_CLOCK': clock, 'PROJECT_SPEC': f'{config["duration"]}s · {config["fps"]}fps · 游戏任务视觉版'}
    if args.silent:
        replacements['PROJECT_SPEC'] += ' · 静音视觉预览'
    for key, value in replacements.items():
        page = page.replace(key, value)
    (TARGET / 'film.html').write_text(page)
    cues = [f"{i+1}\n{stamp(s['start'])} --> {stamp(s['end'])}\n{s['text']}\n" for i,s in enumerate(captions['segments'])]
    (TARGET / 'captions.srt').write_text('\n'.join(cues), encoding='utf-8')
    print(TARGET / 'film.html')


if __name__ == '__main__':
    main()
