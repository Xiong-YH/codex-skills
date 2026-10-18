"""Approved bank integrity, stereo event placement and legacy compatibility."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / 'modules/audio'))
import arcade
import game_audio as S
import mixer
import palette
from engine.models import Audio


class GameAudioTests(unittest.TestCase):
    def test_catalog_variants_are_finite_deterministic_and_tapered(self):
        items = json.loads((ROOT / 'modules/audio/catalog.json').read_text(encoding='utf-8'))['items']
        for item in items:
            for variant in range(item['maxVariant'] + 1):
                with self.subTest(sound=item['id'], variant=variant):
                    clip = palette.sound(item['id'], variant)
                    self.assertTrue(np.isfinite(clip).all())
                    self.assertGreater(np.sqrt(np.mean(clip ** 2)), 1e-5)
                    self.assertLessEqual(len(clip), round(item.get('durationSeconds', .9) * S.RATE))
                    self.assertTrue((clip[[0, -1]] == 0).all())
                    np.testing.assert_array_equal(clip, palette.sound(item['id'], variant))

    def test_approved_assets_reconstruct_without_clipping_or_stereo_loss(self):
        self.assertEqual(len(arcade.manifest()['atoms']), 6)
        for item in arcade.manifest()['atoms']:
            with self.subTest(sound=item['id']):
                master = arcade.sound(item['id'])
                stems = [arcade.sound(item['id'], layer=layer) for layer in ['electronic', 'drums', 'motion']]
                self.assertEqual(master.shape[1], 2)
                self.assertLessEqual(np.max(np.abs(master - sum(stems))), 1.01 / 32768)
                self.assertLessEqual(np.max(np.abs(master)), 10 ** (-1.99 / 20))
                side = (master[:, 0] - master[:, 1]) / 2
                mid = master.mean(axis=1)
                self.assertGreater(np.sqrt(np.mean(side ** 2)), 0)
                self.assertLess(np.sqrt(np.mean(side ** 2)) / np.sqrt(np.mean(mid ** 2)), .08)
                master[:] = 0
                self.assertGreater(np.max(np.abs(arcade.sound(item['id']))), .1)
                with self.assertRaises(ValueError):
                    arcade.sound(item['id'], 1)

    def test_stereo_level_frame_placement_and_end_truncation(self):
        clip = arcade.sound('arcade-pickup')
        cue = {'id': 'take', 'sound': 'arcade-pickup', 'frame': 10, 'level': .61, 'x': .5}
        resolved = {'project': {'fps': 60}, 'durationFrames': 30, 'audio': [cue]}
        audio, report = mixer.render_sfx(resolved)
        np.testing.assert_array_equal(audio[:8000], 0)
        np.testing.assert_allclose(audio[8000:], clip[:16000] * .61, atol=1e-15)
        self.assertEqual(report[0]['gainPolicy'], 'native-stereo-master')
        self.assertEqual(report[0]['sample'], 8000)
        resolved['audio'][0]['x'] = .1
        panned, _ = mixer.render_sfx(resolved)
        self.assertGreater(np.sqrt(np.mean(panned[:, 0] ** 2)), np.sqrt(np.mean(panned[:, 1] ** 2)))

    def test_legacy_mono_mix_is_unchanged(self):
        clip = palette.sound('lock', 1)
        clip *= min(.10 / float(np.sqrt(np.mean(clip ** 2))), .65 / float(np.max(np.abs(clip))))
        expected = np.zeros((48000, 2))
        S.place(expected, .2, clip, .5 + (.3 - .5) * .32, .27)
        actual, _ = mixer.render_sfx({'project': {'fps': 60}, 'durationFrames': 60,
            'audio': [{'id': 'land', 'sound': 'lock', 'variant': 1, 'frame': 12, 'x': .3, 'level': .27}]})
        np.testing.assert_array_equal(actual, expected)

    def test_preview_copies_approved_pcm_exactly(self):
        with tempfile.TemporaryDirectory() as folder:
            subprocess.run([sys.executable, str(ROOT / 'modules/audio/preview.py'), '--bank', 'arcade-core', '--out', folder], check=True, capture_output=True)
            target = Path(folder)
            self.assertEqual(len(list(target.glob('*.wav'))), 24)
            for item in arcade.manifest()['atoms']:
                self.assertEqual((target / (item['id'] + '.wav')).read_bytes(), arcade.asset(item['id']).read_bytes())

    def test_speech_duck_bounds_and_legacy_default(self):
        self.assertEqual(Audio().speechDuck, .28)
        self.assertEqual(Audio(speechDuck=.75).speechDuck, .75)
        for invalid in [-.01, 1.01, float('nan'), float('inf')]:
            with self.assertRaises(ValueError):
                Audio(speechDuck=invalid)


if __name__ == '__main__':
    unittest.main()
