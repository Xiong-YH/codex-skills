"""Validate the small project contract; no optional runtime packages required."""
import hashlib
import json
import math
from pathlib import Path
import wave


def read(path):
    return json.loads(path.read_text(encoding='utf-8'))


def audio_fingerprint(root):
    digest = hashlib.sha256()
    digest.update(str(read(root/'project.json')['duration']).encode())
    for name in ['sound-score.json', 'source/score.py', 'source/palette.py', 'source/game_audio.py']:
        digest.update(name.encode())
        digest.update((root/name).read_bytes())
    return digest.hexdigest()


def audio_provenance(root, origin):
    return {'inputSha256': audio_fingerprint(root),
            'wavSha256': hashlib.sha256((root/'animation-sfx.wav').read_bytes()).hexdigest(),
            'origin': origin}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def check(root, require_audio=True, require_score=True):
    config = read(root/'project.json')
    duration, fps = config['duration'], config['fps']
    require(isinstance(duration, (float, int)) and math.isfinite(duration) and duration > 0,
            'duration must be a positive finite number')
    require(isinstance(fps, int) and fps > 0, 'fps must be a positive integer')
    require(abs(duration*fps-round(duration*fps)) < 1e-6, 'duration must align with the selected frame rate')
    require((config['width'], config['height'], config['nativeWidth'], config['nativeHeight']) == (1920,1080,320,180),
            'This starter uses a 6x composite; adapt the engine before changing output/native dimensions')
    require(config['audioMode'] == 'sfx-only', 'Adapt the audio pipeline explicitly for other audio modes')
    captions = read(root/'captions.json')
    require(captions['duration'] == duration, 'Caption and project durations differ')
    segments = captions['segments']
    groups = read(root/'mouth-phrases.json')
    require(len(segments) > 0 and len(groups) == len(segments), 'Each caption needs one matching phrase group list')
    previous = 0
    for i, (segment, phrases) in enumerate(zip(segments, groups)):
        require(segment['start'] == previous and segment['start'] < segment['end'] <= duration,
                f'Caption {i} must continue the contiguous caption timeline')
        require(isinstance(segment['text'], str) and segment['text'].strip(), f'Caption {i} is empty')
        require(segment['accent'] in segment['text'], f'Caption {i} accent is not in its text')
        require(isinstance(phrases, list) and len(phrases) > 0 and all(isinstance(p,str) and p.strip() for p in phrases),
                f'Caption {i} needs nonempty pinyin phrase groups')
        require(segment['end']-segment['start'] > .41+.22*(len(phrases)-1), f'Caption {i} is too short for its pauses')
        previous = segment['end']
    require(previous == duration, 'Captions must cover the full film duration')
    previous = 0
    for i, chapter in enumerate(config['chapters']):
        require(chapter['start'] == previous and previous < chapter['end'] <= duration,
                f'Chapter {i} must continue the chapter timeline')
        require(isinstance(chapter['name'], str) and chapter['name'].strip(), f'Chapter {i} has no name')
        previous = chapter['end']
    require(previous == duration, 'Chapters must cover the film duration')
    for i, (start, end, title) in enumerate(config['headings']):
        require(0 <= start < duration and start < end and title.strip(), f'Invalid heading {i}')
    if require_score:
        for i, event in enumerate(read(root/'sound-score.json')):
            require(0 <= event['at'] < duration, f'Sound event {i} is outside the film')
            require(isinstance(event['kind'], str) and event['kind'], f'Sound event {i} has no kind')
            require(isinstance(event['variant'], int) and event['variant'] >= 0, f'Sound event {i} has invalid variant')
            require(math.isfinite(event['level']) and 0 <= event['level'] <= 1, f'Sound event {i} has invalid level')
            require(0 <= event['x'] <= config['nativeWidth'], f'Sound event {i} has invalid x')
    characters = root/'source/characters'
    records = read(characters/'characters.json')
    require(any(r['id'] == config['lead'] for r in records), 'Selected lead is missing from the character catalog')
    for record in records:
        asset = (characters/record['nativePath']).resolve()
        require(asset.is_relative_to(characters.resolve()), 'Character asset must remain inside the character folder')
        require(hashlib.sha256(asset.read_bytes()).hexdigest() == record['sha256'], f'Character bytes changed: {record["id"]}')
    if require_audio:
        with wave.open(str(root/'animation-sfx.wav'), 'rb') as track:
            require((track.getframerate(),track.getnchannels(),track.getsampwidth()) == (48000,2,2),
                    'Expected a 48 kHz stereo PCM16 effects WAV')
            require(abs(track.getnframes()/track.getframerate()-duration) <= 1/48000,
                    'Effects duration differs; regenerate sounds for this timeline')
        provenance = read(root/'audio-provenance.json')
        require(provenance['inputSha256'] == audio_fingerprint(root),
                'Sound score or synthesis changed; run project.py sound before building')
        require(provenance['wavSha256'] == hashlib.sha256((root/'animation-sfx.wav').read_bytes()).hexdigest(),
                'Effects WAV changed outside the recorded sound build; regenerate or record its intentional provenance')
    return config
