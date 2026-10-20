"""PCM music gain, stereo, looping and independent speech ducking."""
import copy
import json
from pathlib import Path
import sys
import tempfile
import unittest
import wave
from unittest.mock import patch

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'modules/audio'))
import mixer
import music
import narration

RATE = 48000


class BgmMixTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.project = Path(self.temp.name)
        (self.project / 'media').mkdir()

    def pcm(self, name, data):
        data = np.asarray(data)
        if data.ndim == 1:
            data = data[:, None]
        path = self.project / 'media' / name
        with wave.open(str(path), 'wb') as stream:
            stream.setparams((data.shape[1], 2, RATE, 0, 'NONE', 'not compressed'))
            stream.writeframes(np.round(data * 32767).astype('<i2').tobytes())
        return 'media/' + name

    def cue(self, file, **options):
        _, info = narration.inspect_clip(self.project, file, label='BGM')
        return {'id': 'music', 'file': file, 'frame': 0, 'endFrame': 180, **info,
                'gain': .18, 'loop': True, 'trimStartSeconds': 0,
                'fadeInFrames': 0, 'fadeOutFrames': 0, 'speechDuck': .25, **options}

    def resolved(self, bgm, **options):
        return {'project': {'fps': 60}, 'durationFrames': 180, 'audio': [], 'narration': [],
                'bgm': bgm, 'mix': {'speechDuck': .28}, **options}

    def test_normalization_preserves_stereo_balance_and_gain(self):
        file = self.pcm('stereo.wav', np.tile([.30, .15], (RATE, 1)))
        resolved = self.resolved(self.cue(file))
        bed, record = music.render(resolved, self.project, RATE * 3)
        self.assertAlmostEqual(float(np.sqrt(np.mean(bed ** 2))), .10 * .18, places=12)
        np.testing.assert_allclose(bed[:, 0] / bed[:, 1], 2, rtol=3e-4)
        self.assertEqual(record['startSample'], 0)
        self.assertEqual(record['endSample'], RATE * 3)
        self.assertEqual(record['loopCount'], 3)
        self.assertLess(float(np.max(np.abs(bed))), .65 * .18)
        quieter, _ = music.render(self.resolved(self.cue(file, gain=.09)), self.project, RATE * 3)
        np.testing.assert_array_equal(quieter, bed / 2)

    def test_trim_loop_repeats_selected_pcm_and_nonloop_shortage_fails(self):
        signal = np.r_[np.full(RATE // 2, .6), np.full(RATE // 4, .2), np.full(RATE // 4, -.2)]
        file = self.pcm('pattern.wav', signal)
        resolved = self.resolved(self.cue(file, trimStartSeconds=.5))
        bed, record = music.render(resolved, self.project, RATE * 3)
        self.assertGreater(bed[0, 0], 0)
        self.assertLess(bed[RATE // 4, 0], 0)
        np.testing.assert_array_equal(bed[:RATE // 2], bed[RATE // 2:RATE])
        self.assertEqual(record['sourceStartSample'], RATE // 2)
        self.assertEqual(record['sourceEndSample'], RATE)
        self.assertEqual(record['loopCount'], 6)
        resolved['bgm']['loop'] = False
        with self.assertRaisesRegex(ValueError, 'shorter.*loop disabled'):
            music.render(resolved, self.project, RATE * 3)
        resolved['bgm']['loop'] = True
        resolved['bgm']['trimStartSeconds'] = 1
        with self.assertRaisesRegex(ValueError, 'leave playable audio'):
            music.render(resolved, self.project, RATE * 3)

    def test_nonloop_uses_only_the_authored_interval_and_reports_source_range(self):
        file = self.pcm('long.wav', np.full(RATE * 4, .3))
        resolved = self.resolved(self.cue(file, frame=30, endFrame=90,
                                          trimStartSeconds=1, loop=False))
        bed, record = music.render(resolved, self.project, RATE * 3)
        self.assertFalse(np.any(bed[:RATE // 2]))
        self.assertTrue(np.all(bed[RATE // 2:RATE * 3 // 2] > 0))
        self.assertFalse(np.any(bed[RATE * 3 // 2:]))
        self.assertEqual(record['startSample'], RATE // 2)
        self.assertEqual(record['endSample'], RATE * 3 // 2)
        self.assertEqual(record['sourceStartSample'], RATE)
        self.assertEqual(record['sourceEndSample'], RATE * 2)

    def test_fade_endpoints_are_zero_and_overlapping_fades_remain_finite(self):
        file = self.pcm('constant.wav', np.full(RATE, .3))
        resolved = self.resolved(self.cue(file, fadeInFrames=60, fadeOutFrames=60))
        bed, record = music.render(resolved, self.project, RATE * 3)
        np.testing.assert_array_equal(bed[[0, -1]], 0)
        self.assertAlmostEqual(bed[RATE // 2, 0], .009, delta=1e-6)
        self.assertAlmostEqual(bed[RATE + 1, 0], .018, places=12)
        self.assertEqual(record['fadeInSamples'], RATE)
        self.assertEqual(record['fadeOutSamples'], RATE)
        resolved['bgm'].update(endFrame=30, fadeInFrames=60, fadeOutFrames=90)
        overlap, _ = music.render(resolved, self.project, RATE * 3)
        self.assertTrue(np.isfinite(overlap).all())
        np.testing.assert_array_equal(overlap[[0, RATE // 2 - 1]], 0)
        self.assertGreater(overlap[RATE // 4, 0], 0)
        self.assertFalse(np.any(overlap[RATE // 2:]))

    def test_voice_window_ducks_music_once_and_leaves_voice_unchanged(self):
        bgm = self.pcm('bed.wav', np.full(RATE, .3))
        voice_file = self.pcm('voice.wav', np.full(RATE // 2, .2))
        _, voice_info = narration.inspect_clip(self.project, voice_file)
        resolved = self.resolved(self.cue(bgm))
        resolved['narration'] = [dict(id='voice', file=voice_file, frame=60, gain=.8, **voice_info)]
        bed, record = music.render(resolved, self.project, RATE * 3)
        self.assertAlmostEqual(bed[RATE // 2, 0], .018, places=12)
        self.assertAlmostEqual(bed[RATE + 100, 0], .018 * .25, places=12)
        self.assertAlmostEqual(bed[2 * RATE, 0], .018, places=12)
        self.assertGreater(bed[RATE - 1200, 0], .018 * .25)
        self.assertLess(bed[RATE - 1200, 0], .018)
        self.assertEqual(record['speechWindows'], [{'startSample': RATE, 'endSample': RATE * 3 // 2}])
        voices, _ = narration.mix(resolved, self.project, np.zeros_like(bed))
        self.assertAlmostEqual(voices[RATE + 100, 0], .15 * .8, places=12)
        changed = copy.deepcopy(resolved)
        changed['mix']['speechDuck'] = 0
        changed_voices, _ = narration.mix(changed, self.project, np.zeros_like(bed))
        np.testing.assert_array_equal(changed_voices, voices)
        captured = []
        for index, value in enumerate((resolved, changed)):
            out = self.project / ('mix-' + str(index))
            with patch('mixer.S.write_wav', side_effect=lambda path, audio: captured.append(audio.copy())):
                mixer.render(value, out, self.project)
            report = json.loads((out / 'sfx-events.json').read_text())
            self.assertTrue(report['musicBed'])
            self.assertEqual(report['bgm']['sha256'], value['bgm']['sha256'])
            self.assertEqual(report['bgm']['speechDuck'], .25)
        np.testing.assert_array_equal(captured[0], captured[1])
        np.testing.assert_allclose(captured[0], .8 * np.tanh((voices + bed) * .8 / .8), atol=1e-15)

    def test_changed_music_bytes_are_rejected_before_mixing(self):
        file = self.pcm('locked.wav', np.full(RATE, .3))
        resolved = self.resolved(self.cue(file))
        self.pcm('locked.wav', np.full(RATE, .1))
        with self.assertRaisesRegex(ValueError, 'BGM changed after compilation'):
            music.render(resolved, self.project, RATE * 3)

    def test_absent_music_keeps_a_silent_bed_and_existing_narration_errors(self):
        bed, record = music.render(self.resolved(None), self.project, RATE)
        np.testing.assert_array_equal(bed, 0)
        self.assertIsNone(record)
        with self.assertRaisesRegex(ValueError, 'Narration file must stay inside'):
            narration.inspect_clip(self.project, '../outside.wav')
        with self.assertRaisesRegex(ValueError, 'BGM file must stay inside'):
            narration.inspect_clip(self.project, '../outside.wav', label='BGM')


if __name__ == '__main__':
    unittest.main()
