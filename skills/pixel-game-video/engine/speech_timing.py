"""Text-only rehearsal. Produces ordinary events; never claims audio alignment."""
import math
import re


TOKEN = re.compile(r'[A-Za-z_]+|.', re.DOTALL)


def quantize(seconds, fps):
    return math.floor(seconds * fps + 0.5)


def simulate(shot, texts, fps):
    config = shot.get('rehearsal')
    if not config:
        if any(e.get('speech') for e in shot['events']):
            raise ValueError('speech event requires shot.rehearsal')
        return []
    ids = config['cueIds']
    if len(ids) != len(set(ids)):
        raise ValueError('rehearsal cueIds must be unique')
    t = config['startFrame'] / fps
    rows = []
    by_id = {}
    for ident in ids:
        if ident not in texts:
            raise ValueError(f'unknown rehearsal cue: {ident}')
        text = texts[ident]['text']
        start = t
        onsets = [t] * len(text)
        for match in TOKEN.finditer(text):
            token = match.group()
            for i in range(match.start(), match.end()):
                onsets[i] = t
            if token in '，、；：,—–':
                t += config['commaSeconds']
            elif token in '。！？.!?':
                t += config['stopSeconds']
            elif token.isspace():
                pass
            elif token.isascii() and re.fullmatch(r'[A-Za-z_]+', token):
                t += max(1, len(token.replace('_', '')) / 3.2) / config['unitsPerSecond']
            elif token.isalnum():
                t += (0.9 if token.isdigit() else 1) / config['unitsPerSecond']
        if t <= start:
            raise ValueError(f'rehearsal cue has no spoken units: {ident}')
        row = dict(cueId=ident, text=text, startFrame=quantize(start, fps),
                   endFrame=quantize(t, fps), characterFrames=[quantize(x, fps) for x in onsets],
                   mode='estimated', algorithm='text-units-v1')
        if row['endFrame'] > shot['durationFrames']:
            raise ValueError(f'{shot["id"]}.{ident}: rehearsal exceeds shot; extend shot or adjust pace')
        if row['endFrame'] <= row['startFrame']:
            raise ValueError(f'{ident}: rehearsal is shorter than one frame')
        rows.append(row)
        by_id[ident] = row
        t += config['gapSeconds']
    for event in shot['events']:
        anchor = event.get('speech')
        if not anchor:
            continue
        row = by_id.get(anchor['cueId'])
        if row is None:
            raise ValueError(f'{event["id"]}: cue is not in this shot rehearsal')
        edge = anchor['edge']
        if edge == 'word':
            word = anchor['word']
            if not word.strip():
                raise ValueError('word anchor requires a nonempty word')
            pos, begin = -1, 0
            for _ in range(anchor['occurrence'] + 1):
                pos = row['text'].find(word, begin)
                if pos < 0:
                    raise ValueError(f'{event["id"]}: word occurrence not found: {word}')
                begin = pos + len(word)
            frame = row['characterFrames'][pos]
        else:
            if anchor['word'] or anchor['occurrence']:
                raise ValueError('start/end anchors cannot specify word or occurrence')
            frame = row['startFrame' if edge == 'start' else 'endFrame']
        event['frame'] = frame + anchor['offsetFrames']
        if not 0 <= event['frame'] < shot['durationFrames']:
            raise ValueError(f'{event["id"]}: speech event outside shot')
    return rows
