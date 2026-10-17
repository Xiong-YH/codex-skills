"""Small text-timed poses. This is rehearsal timing, never audio alignment."""


def pose(syllable):
    if any(part in syllable for part in ('uang', 'uan', 'uo', 'ong', 'ou', 'un', 'ui', 'u')):
        return 3
    if 'a' in syllable:
        return 2
    if any(part in syllable for part in ('i', 'e')):
        return 4
    return 1


def schedule(cues, fps):
    result = []
    for cue in cues:
        if cue['role'] != 'subtitle':
            continue
        groups = cue.get('phrases', [])
        if isinstance(groups, str):
            groups = [groups]
        if not groups:
            raise ValueError(f"Caption {cue['id']} needs phrase groups for mouth timing")
        words = [group.split() for group in groups]
        count = sum(len(group) for group in words)
        span = cue['endFrame'] - cue['startFrame']
        pause = min(round(.14 * fps), max(1, span // (count * 5 + len(groups))))
        usable = span - pause * (len(groups) + 1)
        if count < 1 or usable < count:
            raise ValueError(f"Caption {cue['id']} is too short for its phrase groups")
        at = cue['startFrame'] + pause
        unit = usable / count
        for group in words:
            for word in group:
                start, end = round(at), round(at + unit)
                closed = min(max(1, round(.035 * fps)), max(0, end - start - 1)) if word[0].lower() in 'bpm' else 0
                if closed:
                    result.append({'cueId': cue['id'], 'startFrame': start, 'endFrame': start + closed, 'pose': 0})
                result.append({'cueId': cue['id'], 'startFrame': start + closed, 'endFrame': end, 'pose': pose(word.lower())})
                at += unit
            at += pause
    return result
