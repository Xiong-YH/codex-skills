"""Guard the approved face and the release/rest part of simulated speech."""
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
    @classmethod
    def setUpClass(cls):
        cls.original = Image.open(SKILL / 'modules/library/assets/02-brown-fluffy.png').convert('RGBA')
        cls.assets = {
            key.rsplit(':', 1)[-1]: Image.open(io.BytesIO(base64.b64decode(uri.split(',')[1]))).convert('RGBA')
            for key, uri in prepare(SKILL / 'modules/library').items()
        }

    def test_rest_is_original_and_face_edits_stay_inside_anchors(self):
        self.assertEqual(self.assets['0-0'].tobytes(), self.original.tobytes())
        for key, image in self.assets.items():
            blink, _ = map(int, key.split('-'))
            for y in range(36):
                for x in range(32):
                    mouth = 14 <= x <= 19 and 20 <= y <= 21
                    eyelid = blink and 15 <= y <= 18 and (10 <= x <= 12 or 20 <= x <= 22)
                    if not (mouth or eyelid):
                        self.assertEqual(image.getpixel((x, y)), self.original.getpixel((x, y)), (key, x, y))

    def test_opening_has_no_detached_pink_tongue(self):
        skin = self.original.getpixel((13, 20))
        for shape in range(1, 5):
            image = self.assets[f'0-{shape}']
            opening = {(x, y) for y in (20, 21) for x in range(14, 20) if image.getpixel((x, y)) != skin}
            colors = {image.getpixel(point) for point in opening}
            self.assertEqual(len(colors), 1, 'A separate lower highlight reads as a hanging tongue')
            self.assertLessEqual(max(x for x, _ in opening) - min(x for x, _ in opening) + 1, 4)
            if any(y == 21 for _, y in opening):
                self.assertEqual({x for x, y in opening if y == 20}, {x for x, y in opening if y == 21})

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
