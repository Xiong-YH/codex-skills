"""Generated sound recipes, cut anchors, and workbench audio parity."""
import os
from pathlib import Path
import shutil
import sys
import tempfile
import unittest

import numpy as np

SKILL = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SKILL))
from engine.builder import build
from engine.compiler import compile_project, read_json, write_json
from engine.workbench_bridge import require_supported
from modules.audio.synthesis import RATE, recipe_key, render_many, resolve_sfx


SOUNDS = {item['id']: item for item in read_json(SKILL / 'modules/audio/catalog.json')['items']}
WHOOSH = SOUNDS['synth.whoosh.v1']
POP = SOUNDS['synth.pop.v1']
RISER = SOUNDS['synth.riser.v1']


class SynthRecipeTests(unittest.TestCase):
    def test_peak_alignment_uses_whole_frames_and_preserves_sample_offset(self):
        for fps in (30, 60):
            with self.subTest(fps=fps):
                cue = {'id': 'cut', 'params': {'duration': .38, 'peak': .63}, 'align': 'peak'}
                resolve_sfx(cue, WHOOSH, 60, fps)
                self.assertLess(cue['frame'], 60)
                self.assertEqual(cue['anchorFrame'], 60)
                self.assertEqual(cue['peakOffsetSamples'], round(.38 * RATE * .63))
                self.assertEqual(cue['frame'] * (RATE // fps) + cue['paddingSamples'] + cue['peakOffsetSamples'],
                                 60 * (RATE // fps))

    def test_riser_ends_at_the_visual_anchor(self):
        cue = {'id': 'lift', 'params': {'duration': .415}, 'align': 'end'}
        resolve_sfx(cue, RISER, 60, 30)
        self.assertEqual(cue['anchorFrame'], 60)
        self.assertEqual(cue['endOffsetSamples'], 19_920)
        self.assertEqual(cue['frame'] * 1600 + cue['paddingSamples'] + cue['endOffsetSamples'], 96_000)

    def test_invalid_parameters_and_anchors_fail_at_compile_time(self):
        for sound, fields, frame, error in (
            (POP, {'params': {'pitch': 70}}, 30, 'unsupported sound parameters'),
            (POP, {'params': {'note': True}}, 30, 'invalid value'),
            (POP, {'params': {'note': 'H4'}}, 30, 'invalid value'),
            (POP, {'params': {'decay': .9}}, 30, 'invalid value'),
            (POP, {'align': 'peak'}, 30, 'does not support peak alignment'),
            (WHOOSH, {'align': 'end'}, 30, 'does not support end alignment'),
            (WHOOSH, {'align': 'peak'}, 0, 'needs .* frames before its event'),
            (SOUNDS['arcade-seat'], {'params': {}}, 30, 'only synthesized sounds'),
        ):
            with self.subTest(sound=sound['id'], fields=fields):
                with self.assertRaisesRegex(ValueError, error):
                    resolve_sfx({'id': 'sound', **fields}, sound, frame, 60)


@unittest.skipUnless(shutil.which(os.environ.get('PIXEL_NODE') or 'node'), 'Node.js required for SFX synthesis')
class SynthRenderTests(unittest.TestCase):
    def test_catalog_defaults_render_and_recipe_changes_sound(self):
        recipes = []
        for sound in SOUNDS.values():
            if 'synthesis' in sound:
                cue = {'id': sound['id']}
                resolve_sfx(cue, sound, 30, 60)
                recipes.append(cue['synthesis'])
        self.assertEqual(len(recipes), 33)
        altered = {'id': 'higher', 'params': {'note': 84}}
        resolve_sfx(altered, POP, 30, 60)
        recipes.append(altered['synthesis'])
        chord = {'id': 'named-chord', 'params': {'notes': ['Eb4', 67, 'Bb4'], 'duration': .18}}
        resolve_sfx(chord, SOUNDS['synth.pad.v1'], 30, 60)
        recipes.append(chord['synthesis'])
        rendered = render_many([*recipes, recipes[0]])
        self.assertEqual(len(rendered), len(recipes))
        for recipe in recipes:
            with self.subTest(voice=recipe['voice'], params=recipe['params']):
                clip = rendered[recipe_key(recipe)]
                self.assertEqual(clip.shape[1], 2)
                self.assertTrue(np.isfinite(clip).all())
                self.assertAlmostEqual(float(np.max(np.abs(clip))), .65, places=6)
        pop = next(recipe for recipe in recipes if recipe['voice'] == 'pop')
        self.assertFalse(np.array_equal(rendered[recipe_key(pop)], rendered[recipe_key(altered['synthesis'])]))
        whoosh = next(recipe for recipe in recipes if recipe['voice'] == 'whoosh')
        clip = rendered[recipe_key(whoosh)]
        self.assertFalse(np.array_equal(clip[:, 0], clip[:, 1]))
        np.testing.assert_array_equal(clip, render_many([whoosh])[recipe_key(whoosh)])

    def test_same_mixed_sound_and_independent_stems_on_both_backends(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder) / 'film'
            shutil.copytree(SKILL / 'assets/remotion-project-template', root)
            project = read_json(root / 'project.json')
            timeline = read_json(root / 'timeline.json')
            shutil.copyfile(SKILL / 'modules/audio/assets/arcade-motion/select.wav', root / 'foley.wav')
            write_json(root / 'audio.json', {'masterGain': 1.3, 'cues': [
                {'id': 'air', 'sound': WHOOSH['id'], 'at': {'event': 's01.choose'},
                 'align': 'peak', 'params': {'duration': .38, 'peak': .63}},
                {'id': 'button', 'sound': 'arcade-select', 'at': {'event': 's01.choose'}},
                {'id': 'foley', 'file': 'foley.wav', 'at': {'event': 's01.parked'}},
            ]})
            mixes = []
            for backend in ('remotion', 'canvas'):
                if backend == 'canvas':
                    timeline['shots'][0].update(
                        scene='scenes.choice.v1', actor=None, motions=[],
                        params={'options': ['A', 'B'], 'selectEvent': 'choose', 'selectedIndex': 1})
                    write_json(root / 'timeline.json', timeline)
                project.update(renderBackend=backend, audioMode='sfx-only')
                write_json(root / 'project.json', project)
                resolved = compile_project(root, write=True)
                self.assertEqual(resolved['mix']['masterGain'], 1.3)
                build(root, resolved, SKILL)
                status = require_supported(root, resolved)
                air, button, foley = status['manifest']['sfx']
                self.assertEqual(air['from'], resolved['audio'][0]['frame'])
                self.assertEqual(button['from'], resolved['audio'][0]['anchorFrame'])
                self.assertEqual(foley['from'], resolved['audio'][2]['frame'])
                self.assertIn('foley.wav', read_json(root / 'build/project-lock.json')['inputFiles'])
                self.assertEqual(status['audioReport']['maxAbsPcmError'], 0)
                mixes.append((root / 'build/animation-sfx.wav').read_bytes())
            self.assertEqual(mixes[0], mixes[1])


if __name__ == '__main__':
    unittest.main()
