"""Rehearsal must move real consumers together and reject ambiguous clocks."""
import copy
from pathlib import Path
import shutil
import sys
import tempfile
import unittest

SKILL = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SKILL))
from engine.compiler import compile_project, read_json, write_json
from engine.models import Event


class SpeechTimingTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name) / 'project'
        shutil.copytree(SKILL / 'examples/speech-rehearsal', self.root)

    def tearDown(self):
        self.temp.cleanup()

    def test_pace_moves_text_motion_audio_and_component_event(self):
        before = compile_project(self.root)
        source = read_json(self.root / 'timeline.json')
        source['shots'][0]['rehearsal']['unitsPerSecond'] = 3.0
        write_json(self.root / 'timeline.json', source)
        after = compile_project(self.root)
        delta = after['events']['s01.hit'] - before['events']['s01.hit']
        self.assertGreater(delta, 0)
        self.assertEqual(after['cues'][1]['startFrame'] - before['cues'][1]['startFrame'], delta)
        self.assertEqual(after['shots'][0]['motions'][0]['startFrame'] - before['shots'][0]['motions'][0]['startFrame'], delta)
        self.assertEqual(after['audio'][0]['frame'] - before['audio'][0]['frame'], delta)
        self.assertEqual(after['shots'][0]['components'][0]['focusEvent'], 'hit')
        self.assertNotEqual(before['inputHash'], after['inputHash'])
        self.assertEqual(after['speechRehearsal'][0]['mode'], 'estimated')

    def test_repeat_missing_word_overflow_and_non_mutation(self):
        saved = {p.name: p.read_bytes() for p in self.root.glob('*.json')}
        compile_project(self.root)
        self.assertEqual(saved, {p.name: p.read_bytes() for p in self.root.glob('*.json')})
        original = read_json(self.root / 'timeline.json')
        for change, message in [
            (lambda s: s['events'][1]['speech'].update(word='不存在'), 'not found'),
            (lambda s: s['events'][1]['speech'].update(occurrence=1), 'not found'),
            (lambda s: s['rehearsal'].update(unitsPerSecond=0.1), 'exceeds shot'),
            (lambda s: s['events'][1]['speech'].update(offsetFrames=-9999), 'outside shot'),
        ]:
            data = copy.deepcopy(original)
            change(data['shots'][0])
            write_json(self.root / 'timeline.json', data)
            with self.assertRaisesRegex(ValueError, message):
                compile_project(self.root)

    def test_exclusive_clock_and_legacy_compatibility(self):
        for data in [dict(id='a'), dict(id='a', frame=0, speech=dict(cueId='line1', word='命中'))]:
            with self.assertRaises(ValueError):
                Event.model_validate(data)
        legacy = compile_project(SKILL / 'assets/project-template')
        self.assertEqual(legacy['durationFrames'], 720)
        self.assertNotIn('speechRehearsal', legacy)

    def test_fps_and_repeated_word(self):
        from engine.models import Shot
        from engine.speech_timing import simulate
        for fps in (30, 60):
            shot = Shot.model_validate(dict(id='s', scene='scenes.canvas.v1', durationFrames=1000,
                rehearsal=dict(cueIds=['line'], startFrame=0),
                events=[dict(id='second', speech=dict(cueId='line', word='缓存', occurrence=1))])).model_dump(exclude_none=True)
            rows = simulate(shot, {'line': {'text': '缓存，缓存。'}}, fps)
            self.assertGreater(shot['events'][0]['frame'], 0)
            self.assertEqual(shot['events'][0]['frame'], rows[0]['characterFrames'][3])


if __name__ == '__main__':
    unittest.main()
