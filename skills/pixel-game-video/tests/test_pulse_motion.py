"""Validate authoring and workbench routing, including rejection of ambiguous inputs."""
from pathlib import Path
import json
import shutil
import sys
import tempfile
import unittest
SKILL = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SKILL))
from engine.compiler import compile_project, read_json, write_json
from engine.dependencies import javascript_files, runtime_files
from engine.workbench_bridge import _canvas_visual_manifest


class PulseMotionTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        shutil.copytree(SKILL / 'assets/project-template', self.root, dirs_exist_ok=True)

    def compile(self, recipe, params, extra=None, duration=60):
        timeline = read_json(SKILL / 'assets/project-template/timeline.json')
        timeline['shots'][1]['motions'] = [{'id':'pulse', 'recipe':recipe, 'target':'scene',
            'start':{'event':'s02.enter'}, 'durationFrames':duration, 'params':params}, *(extra or [])]
        write_json(self.root / 'timeline.json', timeline)
        return compile_project(self.root)

    def test_presets_path_shake_layer_and_page_compile(self):
        for recipe, params in [('motion.camera-pulse.v1', {'kind':'slam'}),
                              ('motion.camera-path.v1', {'keys':[{'atFrame':0,'durationFrames':17,'scale':1.25}]}),
                              ('motion.camera-shake.v1', {}),
                              ('motion.layer-move.v1', {'layer':'content','xTo':.1}),
                              ('motion.page-turn.v1', {})]:
            with self.subTest(recipe=recipe):
                resolved=self.compile(recipe,params)
                self.assertIn('modules/motion/pulse.js',javascript_files(SKILL,resolved))
                self.assertIn('modules/motion/licenses/AGPL-3.0.txt',runtime_files(SKILL,resolved))

    def test_invalid_parameters_and_key_windows_fail(self):
        for recipe,params in [('motion.camera-pulse.v1',{'kind':'orbit'}),
                              ('motion.camera-pulse.v1',{'kind':'back','scale':1.5}),
                              ('motion.camera-shake.v1',{'amplitude':True}),
                              ('motion.layer-move.v1',{'layer':'unknown'}),
                              ('motion.page-turn.v1',{'blur':100}),
                              ('motion.camera-path.v1',{'keys':[{'atFrame':50,'durationFrames':20}]}),
                              ('motion.camera-path.v1',{'keys':[{'atFrame':0,'durationFrames':40},{'atFrame':20,'durationFrames':10}]})]:
            with self.subTest(params=params),self.assertRaises(ValueError):self.compile(recipe,params)

    def test_workbench_exposes_page_on_transition_track(self):
        resolved=self.compile('motion.page-turn.v1',{'blur':5})
        manifest=_canvas_visual_manifest(resolved,{'style':{'colors':{}}})
        unit=next(t for t in manifest['transitions'] if t['id']=='s02.pulse')
        self.assertEqual(unit['component'],'CanvasTransitionUnit')
        self.assertNotIn('motion.page-turn',manifest['shots'][1]['props']['cameraJson'])
        self.assertEqual(json.loads(unit['props']['paramsJson']),{'blur':5})

    def test_shake_can_overlay_camera_but_framing_cannot_overlap(self):
        extra={'id':'overlay','recipe':'motion.camera-shake.v1','target':'scene',
               'start':{'event':'s02.enter'},'durationFrames':15,'params':{}}
        self.compile('motion.camera-pulse.v1',{},[extra])
        extra['recipe']='motion.camera-path.v1';extra['params']={'keys':[{'atFrame':0,'durationFrames':10}]}
        with self.assertRaisesRegex(ValueError,'overlapping motion'):self.compile('motion.camera-pulse.v1',{},[extra])
