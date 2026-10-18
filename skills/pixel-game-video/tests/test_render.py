"""Focused render contracts; run with `python -m unittest discover -s tests`."""
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import wave
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from engine.render import ENGINE, _audio_slice, _build_bindings, _frame_selection, _hash, _key_frames, _read_contract, _verify, render


class RenderContractTests(unittest.TestCase):
    def test_large_frame_selection_preserves_indices_with_shallow_expression(self):
        frames=[1,2,3,10]+list(range(20,900,3))
        expression=_frame_selection(frames)
        self.assertIn('between(n,1,3)',expression)
        depth=maximum=0
        for char in expression:
            depth += (char=='(')-(char==')')
            maximum=max(maximum,depth)
        self.assertLess(maximum,16)
        for n in range(905):
            result=eval(expression,{'eq':lambda a,b:a==b,'between':lambda x,a,b:a<=x<=b,'n':n,'__builtins__':{}})
            self.assertEqual(bool(result),n in frames)

    def setUp(self):
        self.scratch = tempfile.TemporaryDirectory()
        self.addCleanup(self.scratch.cleanup)
        self.root = Path(self.scratch.name)
        (self.root / 'build').mkdir()
        (self.root / 'build' / 'film.html').write_text('<canvas id="film"></canvas>', encoding='utf-8')
        self.config = {'width': 640, 'height': 360, 'fps': 24}
        self.resolved = {'project': self.config, 'durationFrames': 72, 'inputHash': 'a' * 64}
        self.write_timeline()

    def write_timeline(self):
        (self.root / 'build' / 'resolved-timeline.json').write_text(json.dumps(self.resolved), encoding='utf-8')

    def test_variable_duration_and_frame_boundaries(self):
        resolved, last = _read_contract(self.root, 0, None)
        self.assertEqual(last, 72)
        self.assertEqual(resolved['project']['fps'], 24)
        for first, last in ((-1, 24), (0, 73), (1.5, 24), (24, 24), (0, 1), (True, 24)):
            with self.subTest(first=first, last=last), self.assertRaises(ValueError):
                _read_contract(self.root, first, last)

    def test_output_names_cannot_escape_project(self):
        for name in ('../outside', '/absolute', 'bad/name', '', '..'):
            with self.subTest(name=name), self.assertRaises(ValueError):
                render(self.root, name=name)

    def test_odd_yuv420_dimensions_are_rejected(self):
        self.resolved['project']['width'] = 641
        self.write_timeline()
        with self.assertRaisesRegex(ValueError, 'even integer'):
            _read_contract(self.root, 0, None)

    def test_audio_excerpt_uses_source_frame_offset(self):
        source, target = self.root / 'source.wav', self.root / 'clip.wav'
        # Distinct bytes make a wrong zero-origin crop observable without listening.
        samples = b''.join(index.to_bytes(2, 'little', signed=True) for index in range(1200))
        with wave.open(str(source), 'wb') as stream:
            stream.setparams((1, 2, 400, 0, 'NONE', 'not compressed'))
            stream.writeframes(samples)
        evidence = _audio_slice(source, target, 24, 48, 24)
        self.assertEqual((evidence['startSample'], evidence['endSample']), (400, 800))
        with wave.open(str(target), 'rb') as stream:
            self.assertEqual(stream.readframes(stream.getnframes()), samples[800:1600])

    def test_short_audio_is_rejected_before_encoding(self):
        source = self.root / 'short.wav'
        with wave.open(str(source), 'wb') as stream:
            stream.setparams((1, 2, 48000, 0, 'NONE', 'not compressed'))
            stream.writeframes(b'\x00\x00' * 10)
        with self.assertRaisesRegex(ValueError, 'shorter'):
            _audio_slice(source, self.root / 'clip.wav', 0, 24, 24)

    def test_source_and_upstream_director_changes_invalidate_inspection(self):
        source = self.root / 'project.json'
        source.write_text(json.dumps({'authoringMode': 'director'}), encoding='utf-8')
        authoring = self.root / 'script.json'
        authoring.write_text('{"text":"first version"}', encoding='utf-8')
        mapping = {'sourceHashes': {'script.json': _hash(authoring)}}
        (self.root / 'source-map.json').write_text(json.dumps(mapping), encoding='utf-8')
        lock = {'inputHash': self.resolved['inputHash'], 'inputFiles': {'project.json': _hash(source)},
                'runtimeFiles': {'engine/render.py': _hash(ENGINE / 'render.py')}}
        (self.root / 'build/project-lock.json').write_text(json.dumps(lock), encoding='utf-8')
        self.assertTrue(all(_build_bindings(self.root, self.resolved['inputHash']).values()))
        authoring.write_text('{"text":"changed script"}', encoding='utf-8')
        self.assertFalse(_build_bindings(self.root, self.resolved['inputHash'])['currentAuthoringSources'])
        source.write_text('{"authoringMode":"direct"}', encoding='utf-8')
        self.assertFalse(_build_bindings(self.root, self.resolved['inputHash'])['currentSourceFiles'])
        with self.assertRaisesRegex(ValueError, 'rebuild'):
            render(self.root)

    def test_decoded_timestamp_jitter_fails_even_with_correct_metadata(self):
        raw = {'streams': [{'codec_type': 'video', 'codec_name': 'h264', 'width': 640, 'height': 360,
                            'nb_read_frames': '3', 'avg_frame_rate': '24/1', 'duration': '0.125'}],
               'format': {'duration': '0.125'}}
        bad_frames = {'frames': [{'best_effort_timestamp_time': value} for value in ('0', '0.041667', '0.090000')]}
        with patch('engine.render._run', side_effect=[json.dumps(raw), json.dumps(bad_frames)]):
            report = _verify('ffprobe', self.root / 'clip.mp4', self.config, 3, True)
        self.assertEqual(report['technicalStatus'], 'failed')
        self.assertFalse(report['checks']['everyFrameTimestamp'])
        self.assertEqual(report['visualReview'], 'not_reviewed')

    def test_review_frames_cover_motion_progress_and_scene_events(self):
        resolved = {'shots': [{'startFrame': 0, 'endFrame': 120,
                              'events': [{'id': 'reveal', 'frame': 40}],
                              'motions': [{'startFrame': 60, 'endFrame': 90}]}]}
        selected = _key_frames(resolved, 0, 120)
        for frame in (0, 119, 39, 40, 41, 59, 60, 61, 75, 89, 90, 91):
            self.assertIn(frame, selected)
        self.assertTrue(all(20 <= frame < 80 for frame in _key_frames(resolved, 20, 80)))


if __name__ == '__main__':
    unittest.main()
