"""Schedule small mouth poses from Mandarin syllables and phrase pauses, without audio."""
import json
from prepare_assets import HERE, TARGET, ROOT



def pose(syllable):
    if any(x in syllable for x in ('uang', 'uan', 'uo', 'ong', 'ou', 'un', 'ui', 'u')):
        return 3
    if 'a' in syllable:
        return 2
    if any(x in syllable for x in ('i', 'e')):
        return 4
    return 1


def weights(group):
    syllables = group.split()
    return [(.82 if s in ('de', 'le', 'he', 'yi', 'ge') else 1)
            + (.16 if i == len(syllables) - 1 else 0)
            for i, s in enumerate(syllables)]


def main():
    narration = json.loads((ROOT / 'captions.json').read_text())
    segments = narration['segments']
    phrase_groups = json.loads((ROOT / 'mouth-phrases.json').read_text())
    if len(phrase_groups) != len(segments):
        raise ValueError('Every caption segment needs matching mouth phrase groups')
    cues, phrases = [], []
    for segment, groups in zip(segments, phrase_groups):
        count = sum(sum(weights(p)) for p in groups)
        pause = .22
        span = segment['end'] - segment['start'] - .15 - .26 - pause * (len(groups) - 1)
        if span <= 0 or count <= 0:
            raise ValueError('Caption too short for mouth pauses or empty phrase group')
        unit = span / count
        at = segment['start'] + .15
        for group in groups:
            start = at
            for index, (syllable, weight) in enumerate(zip(group.split(), weights(group))):
                syllable_length = unit * weight
                shape = pose(syllable)
                # Lip closures occur at bilabial consonants, rather than at a fixed frequency.
                if syllable[0] in 'bpm':
                    cues.append({'start': round(at, 4), 'end': round(at + .045, 4), 'pose': 0})
                    onset = .045
                else:
                    onset = 0
                tail = 4 if syllable.endswith(('ai', 'ei')) else 3 if syllable.endswith(('ao', 'ou')) else 1
                release = .05 if syllable.endswith(('ai', 'ei', 'ao', 'ou')) else .035 if index % 3 == 1 else 0
                cues.append({'start': round(at + onset, 4), 'end': round(at + syllable_length - release, 4), 'pose': shape})
                if release:
                    cues.append({'start': round(at + syllable_length - release, 4), 'end': round(at + syllable_length, 4), 'pose': tail})
                at += syllable_length
            phrases.append({'start': round(start, 4), 'end': round(at, 4), 'text': group})
            at += pause
    data = {'duration': narration['duration'], 'mode': 'text-timed Mandarin mouth rehearsal; no voice or phoneme alignment',
            'maximumNativeMouthSize': [4, 2], 'poses': ['rest', 'narrow', 'open', 'round', 'wide'],
            'cues': cues, 'phrases': phrases}
    (TARGET / 'mouth-timing.json').write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    js = '(() => {const cues=' + json.dumps(cues) + ';window.Mouth={cues,state(t){const c=cues.find(c=>t>=c.start&&t<c.end);return c?c.pose:0;}};})();\n'
    (HERE / 'mouth.js').write_text(js)
    print(f'Mouth: {len(phrases)} phrases, five small poses, explicit pauses; no voice generated')


if __name__ == '__main__':
    main()
