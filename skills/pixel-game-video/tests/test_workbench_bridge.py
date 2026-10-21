"""Observable authoring, independent audio and portable-manifest contracts."""
import copy
import json
from pathlib import Path
import shutil
import sys
import tempfile
import unittest
import wave

import numpy as np

SKILL = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SKILL))
from engine.builder import build
from engine.compiler import compile_project, read_json, write_json
from engine.remotion_backend import verify_build
from engine.workbench_bridge import require_supported


def pcm(path):
    with wave.open(str(path), 'rb') as audio:
        return np.frombuffer(audio.readframes(audio.getnframes()), dtype='<i2').reshape(-1, 2).astype('int32')


class WorkbenchBridgeTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.project = Path(self.temp.name) / 'film'
        shutil.copytree(SKILL / 'assets/remotion-project-template', self.project)

    def tearDown(self):
        self.temp.cleanup()

    def change(self, name, edit):
        data = read_json(self.project / name)
        edit(data)
        write_json(self.project / name, data)

    def build(self):
        resolved = compile_project(self.project, write=True)
        build(self.project, resolved, SKILL)
        return resolved, read_json(self.project / 'build/workbench-manifest.json')

    def test_manifest_uses_compiled_intervals_and_editable_local_cues(self):
        # Add a second scene and a real transition. All times remain event references.
        timeline = read_json(self.project / 'timeline.json')
        second = copy.deepcopy(timeline['shots'][0])
        second['id'] = 's02'
        second['params']['phase'] = 'focus'
        second['motions'] = [{
            'id': 'page', 'recipe': 'motion.book-sweep.v1', 'target': 'scene',
            'start': {'event': 's02.enter'}, 'durationFrames': 48,
            'params': {'x': .36, 'y': .67},
        }]
        timeline['shots'].append(second)
        write_json(self.project / 'timeline.json', timeline)
        text = read_json(self.project / 'text.json')
        text['cues'] = [{
            'id': 'caption', 'role': 'subtitle', 'text': '先选一件事',
            'phrases': ['xian xuan yi jian shi'],
            'start': {'event': 's02.enter', 'offsetFrames': 60},
            'end': {'event': 's02.exit', 'offsetFrames': -12},
        }]
        write_json(self.project / 'text.json', text)
        resolved, status = self.build()
        self.assertTrue(status['supported'])
        manifest = status['manifest']
        self.assertEqual(manifest['total'], resolved['durationFrames'])
        for authored, unit in zip(resolved['shots'], manifest['shots']):
            self.assertEqual((unit['from'], unit['duration']),
                             (authored['startFrame'], authored['endFrame'] - authored['startFrame']))
            self.assertEqual(unit['props']['sourceUnitId'], authored['id'])
        caption = manifest['captions'][0]
        cue = resolved['cues'][0]
        self.assertEqual((caption['from'], caption['duration']),
                         (cue['startFrame'], cue['endFrame'] - cue['startFrame']))
        self.assertEqual(caption['props']['text'], cue['text'])
        self.assertEqual({field['key'] for field in caption['schema']},
                         {'text', 'fontSize', 'color', 'x', 'y'})
        self.assertIsInstance(caption['props']['x'], (int, float))
        self.assertIsInstance(caption['props']['y'], (int, float))
        self.assertEqual(manifest['transitions'][0]['props']['outgoingShotId'], 's01')
        self.assertEqual(manifest['order'][0], 'captions')
        self.assertEqual(manifest['sfx'], [])
        self.assertTrue(status['audioReport']['empty'])
        require_supported(self.project, resolved)
        verify_build(self.project, resolved)

    def test_independent_sfx_recompose_to_original_pcm(self):
        self.change('project.json', lambda p: p.update(audioMode='sfx-only'))
        write_json(self.project / 'audio.json', {'cues': [
            {'id': 'choose', 'sound': 'arcade-select', 'at': {'event': 's01.choose'}, 'level': .22, 'x': .52},
            {'id': 'seat', 'sound': 'arcade-seat', 'at': {'event': 's01.parked'}, 'level': .18, 'x': .68},
        ]})
        resolved, status = self.build()
        self.assertTrue(status['supported'], status.get('reason'))
        self.assertEqual(len(status['manifest']['sfx']), 2)
        public = self.project / 'build/remotion/public'
        original = pcm(public / 'animation.wav')
        rebuilt = np.zeros_like(original)
        for cue, record in zip(status['manifest']['sfx'], status['audioReport']['events']):
            self.assertFalse(Path(cue['src']).is_absolute())
            stem = pcm(public / cue['src'])
            first = round(cue['from'] / resolved['project']['fps'] * 48000)
            rebuilt[first:first + len(stem)] += stem
            self.assertEqual(record['sample'], first)
            self.assertEqual(cue['volume'], 1)
        self.assertLessEqual(int(np.abs(original - rebuilt).max()), 1)
        self.assertLessEqual(status['audioReport']['maxAbsPcmError'], 1)

    def test_narration_bgm_and_overlapping_sfx_recompose_exactly(self):
        tone = (np.sin(np.arange(24000) * 2 * np.pi * 220 / 48000) * 12000).astype('<i2')
        for name in ('voice.wav', 'music.wav'):
            with wave.open(str(self.project / name), 'wb') as audio:
                audio.setparams((2, 2, 48000, 0, 'NONE', 'not compressed'))
                audio.writeframes(np.stack([tone, tone], axis=1).tobytes())
        self.change('project.json', lambda p: p.update(audioMode='narration+sfx'))
        write_json(self.project / 'audio.json', {'cues': [
            {'id': 'choose', 'sound': 'arcade-select', 'at': {'event': 's01.choose'}, 'level': .22},
            {'id': 'seat', 'sound': 'arcade-seat', 'at': {'event': 's01.choose'}, 'level': .18},
        ], 'narration': [{'id': 'voice', 'file': 'voice.wav', 'at': {'event': 's01.choose'}, 'gain': .9}],
            'bgm': {'file': 'music.wav', 'at': {'event': 's01.enter'}, 'end': {'event': 's01.exit'},
                    'gain': .18, 'loop': True}})
        resolved, status = self.build()
        self.assertTrue(status['supported'], status.get('reason'))
        manifest = status['manifest']
        self.assertEqual([len(manifest[k]) for k in ('sfx', 'narration', 'bgm')], [2, 1, 1])
        public = self.project / 'build/remotion/public'
        original = pcm(public / 'animation.wav')
        rebuilt = np.zeros_like(original)
        for kind in ('sfx', 'narration', 'bgm'):
            for cue in manifest[kind]:
                part = pcm(public / cue['src'])
                start = round(cue['from'] / resolved['project']['fps'] * 48000)
                rebuilt[start:start + len(part)] += part
                self.assertEqual(cue['volume'], 1)
        self.assertEqual(int(np.abs(original - rebuilt).max()), 0)
        self.assertEqual(status['audioReport']['maxAbsPcmError'], 0)
        stored = sum(len(pcm(public / cue['src'])) for kind in ('sfx', 'narration', 'bgm') for cue in manifest[kind])
        self.assertEqual(status['audioReport']['stemStorageSamples'], stored)
        self.assertLess(stored, status['audioReport']['denseStemStorageSamples'])
        require_supported(self.project, resolved)
        verify_build(self.project, resolved)

    def test_changed_source_cannot_open_stale_workbench(self):
        self.build()
        self.change('timeline.json', lambda t: t['shots'][0].update(durationFrames=300))
        changed = compile_project(self.project)
        with self.assertRaisesRegex(ValueError, 'different timeline|rebuild'):
            require_supported(self.project, changed)

    def test_title_cues_import_as_independent_editable_clips(self):
        write_json(self.project / 'text.json', {'cues': [{
            'id': 'title', 'role': 'title', 'text': '独立标题',
            'start': {'event': 's01.enter'}, 'end': {'event': 's01.exit'},
        }]})
        resolved, status = self.build()
        self.assertTrue(status['supported'])
        self.assertEqual(status['manifest']['captions'][0]['props']['role'], 'title')
        self.assertEqual(status['manifest']['captions'][0]['props']['text'], '独立标题')
        verify_build(self.project, resolved)
        require_supported(self.project, resolved)


if __name__ == '__main__':
    unittest.main()
