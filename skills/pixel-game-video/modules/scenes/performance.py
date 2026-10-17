"""Small text-timed poses. This is rehearsal timing, never audio alignment."""


def pose(syllable):
    if any(part in syllable for part in ('uang', 'uan', 'uo', 'ong', 'ou', 'un', 'ui', 'u')):
        return 3
    if 'a' in syllable:
        return 2
    if any(part in syllable for part in ('i', 'e')):
        return 4
    return 1


def _syllable(start, end, syllable, fps):
    """A brief vowel peak followed by release/rest, rather than a held pose."""
    length = end - start
    if length < 1:
        return []
    if length == 1:
        return [(start, end, 1)]
    # Pose 1 is the soft closed lip used inside a phrase. Returning to the
    # original toothy smile every syllable would make the mouth flash white;
    # the smile returns in the phrase gaps and outside subtitles (runtime 0).
    rest = max(1, round(length * .20))
    leading = min(max(1, round(length * .15)), max(0, length - rest - 1)) if syllable[0] in 'bpm' else 0
    available = length - rest - leading
    peak = min(max(1, round(length * .45)), max(1, round(fps * .12)), available)
    attack = min(max(1, round(fps * .025)), max(0, available - peak - 1))
    release = min(max(1, round(fps * .035)), available - peak - attack)
    phases = ((leading, 1), (attack, 1), (peak, pose(syllable)), (release, 1),
              (length - leading - attack - peak - release, 1))
    result, at = [], start
    for frames, shape in phases:
        if frames:
            result.append((at, at + frames, shape))
            at += frames
    return result


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
        words = [group.lower().split() for group in groups]
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
                for first, last, shape in _syllable(start, end, word, fps):
                    segment = {'cueId': cue['id'], 'startFrame': first, 'endFrame': last, 'pose': shape}
                    if result and result[-1]['cueId'] == cue['id'] and result[-1]['endFrame'] == first and result[-1]['pose'] == shape:
                        result[-1]['endFrame'] = last
                    else:
                        result.append(segment)
                at += unit
            at += pause
    return result
