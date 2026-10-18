"""Guard approved reference artwork and the independent simulated speech plan."""
import base64
import io
from pathlib import Path
import sys
import unittest

from PIL import Image

SKILL = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SKILL))
from modules.library.prepare import prepare
from modules.scenes.performance import schedule


class FacePerformanceTests(unittest.TestCase):
    def test_prepared_references_preserve_approved_pixels_and_actual_geometry(self):
        import hashlib
        import json
        library = SKILL / 'modules/library'
        records = [r for r in json.loads((library / 'catalog.json').read_text(encoding='utf-8'))['items']
                   if r['kind'] == 'actor']
        self.assertEqual(len(records), 5)
        assets = prepare(library)
        self.assertEqual(set(assets), {r['id'] + ':reference' for r in records})
        for record in records:
            source = library / record['path']
            original = Image.open(source).convert('RGBA')
            actual = Image.open(io.BytesIO(base64.b64decode(assets[record['id'] + ':reference'].split(',')[1]))).convert('RGBA')
            expected = original.crop(record['previewBounds'])
            self.assertEqual(actual.size, expected.size)
            self.assertEqual(actual.tobytes(), expected.tobytes())
            self.assertEqual(hashlib.sha256(source.read_bytes()).hexdigest(), record['sha256'])
            self.assertFalse(record['runtimeSpriteReady'])

    def test_selection_only_embeds_the_requested_character(self):
        selected = prepare(SKILL / 'modules/library', {'actor.lizi.v3'})
        self.assertEqual(set(selected), {'actor.lizi.v3:reference'})
        self.assertEqual(prepare(SKILL / 'modules/library', set()), {})

    def test_modified_master_is_rejected(self):
        import json
        import shutil
        import tempfile
        library = SKILL / 'modules/library'
        record = json.loads((library / 'catalog.json').read_text(encoding='utf-8'))['items'][0]
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            target = root / record['path']
            target.parent.mkdir(parents=True)
            shutil.copy2(library / record['path'], target)
            target.write_bytes(target.read_bytes() + b'changed')
            (root / 'catalog.json').write_text(json.dumps({'items':[record]}), encoding='utf-8')
            with self.assertRaisesRegex(ValueError, 'Character bytes changed'):
                prepare(root)

    def test_each_syllable_releases_and_long_vowels_do_not_freeze(self):
        for fps in (30, 60):
            cues = [{'id': 'line', 'role': 'subtitle', 'startFrame': 0, 'endFrame': fps * 4,
                     'phrases': ['a e u i']}]
            segments = schedule(cues, fps)
            peaks = [item for item in segments if item['pose'] in (2, 3, 4)]
            self.assertEqual(len(peaks), 4)
            for peak in peaks:
                self.assertLessEqual(peak['endFrame'] - peak['startFrame'], round(fps * .12))
                following = [item for item in segments if item['startFrame'] >= peak['endFrame']]
                self.assertTrue(following)
                self.assertEqual(following[0]['pose'], 1)
            self.assertNotIn(0, [item['pose'] for item in segments], 'Toothy smile should not flash between syllables')
            for previous, current in zip(segments, segments[1:]):
                self.assertLessEqual(previous['endFrame'], current['startFrame'])
            self.assertTrue(all(0 <= item['startFrame'] < item['endFrame'] <= fps * 4 for item in segments))

    def test_original_smile_returns_in_phrase_gaps(self):
        cue = {'id': 'line', 'role': 'subtitle', 'startFrame': 0, 'endFrame': 120, 'phrases': ['a e', 'u i']}
        segments = schedule([cue], 60)
        self.assertGreater(segments[0]['startFrame'], cue['startFrame'])
        self.assertLess(segments[-1]['endFrame'], cue['endFrame'])
        self.assertTrue(any(a['endFrame'] < b['startFrame'] for a, b in zip(segments, segments[1:])),
                        'Runtime defaults to original smile in the deliberate phrase gap')


if __name__ == '__main__':
    unittest.main()
