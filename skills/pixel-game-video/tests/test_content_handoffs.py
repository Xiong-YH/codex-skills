"""References, contracts and source-backed workbench tracks for the nine designs."""
import copy
from pathlib import Path
import shutil
import sys
import tempfile
import unittest

SKILL = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SKILL))
from engine.compiler import compile_project, read_json, write_json, _motion_params
from engine.dependencies import javascript_files, runtime_files, selected_style
from engine.workbench_bridge import _canvas_visual_manifest


class ContentHandoffTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name) / 'project'
        shutil.copytree(SKILL / 'examples/content-handoffs', self.root,
                        ignore=shutil.ignore_patterns('build', '__pycache__'))

    def change(self, fn):
        data = read_json(self.root / 'timeline.json')
        fn(data['shots'])
        write_json(self.root / 'timeline.json', data)

    def test_nine_designs_compile_into_independent_editable_tracks(self):
        resolved = compile_project(self.root)
        manifest = _canvas_visual_manifest(resolved, {'style': selected_style(SKILL, resolved)[1]})
        self.assertEqual(len(manifest['transitions']), 9)
        self.assertEqual(len(manifest['shots']), 18)
        for unit in manifest['transitions']:
            self.assertEqual(unit['component'], 'CanvasTransitionUnit')
            self.assertIn('paramsJson', unit['props'])
            self.assertNotEqual(unit['props']['outgoingShotId'], unit['props']['incomingShotId'])
        self.assertIn('modules/motion/content-handoffs.js', javascript_files(SKILL, resolved))
        self.assertIn('modules/motion/handoffs.py', runtime_files(SKILL, resolved))

    def test_unknown_and_duplicate_component_ids_are_rejected(self):
        self.change(lambda shots: shots[1]['motions'][0]['params']['pairs'][0].update(to='missing'))
        with self.assertRaisesRegex(ValueError, 'unknown incoming component'):
            compile_project(self.root)
        with self.assertRaisesRegex(ValueError, 'duplicate component'):
            _motion_params('motion.component-handoff.v1', {'mode': 'reflow',
                            'pairs': [{'from': 'a', 'to': 'b'}, {'from': 'a', 'to': 'c'}]})

    def test_overview_keeps_aspect_and_keyword_keeps_identity(self):
        self.change(lambda shots: shots[11]['components'][0].update(width=.30))
        with self.assertRaisesRegex(ValueError, 'aspect ratio'):
            compile_project(self.root)
        shutil.copy2(SKILL / 'examples/content-handoffs/timeline.json', self.root / 'timeline.json')
        self.change(lambda shots: shots[-1]['components'][0]['data'].update(title='不同的概念'))
        with self.assertRaisesRegex(ValueError, 'both component titles'):
            compile_project(self.root)

    def test_preview_must_reference_the_actual_incoming_background(self):
        self.change(lambda shots: shots[7]['background'].update(file='media/workshop.png'))
        with self.assertRaisesRegex(ValueError, 'matching the incoming background'):
            compile_project(self.root)

    def test_malformed_coordinates_and_unrecognized_fields_are_rejected(self):
        for params in ({'source':'x','window':[.8,.8,.5,.5]},
                       {'source':'x','window':[0,0,float('nan'),.4]},
                       {'source':'x','unexpected':True}):
            with self.subTest(params=params), self.assertRaises(ValueError):
                _motion_params('motion.preview-expand.v1', params)

    def test_fixed_camera_boundary_is_enforced(self):
        def change(shots):
            shots[0]['motions'] = [{'id':'camera','recipe':'motion.camera-push.v1','target':'scene',
                                    'start':{'event':shots[0]['id']+'.enter'},'durationFrames':75,'params':{'scale':1.05}}]
        self.change(change)
        with self.assertRaisesRegex(ValueError, 'fixed cameras'):
            compile_project(self.root)

    def test_transparent_portrait_apparatus_cannot_conceal_a_cut(self):
        self.change(lambda shots: shots[8]['components'][0].update(width=.35,height=.40))
        with self.assertRaisesRegex(ValueError, 'opaque wide identity'):
            compile_project(self.root)


if __name__ == '__main__':
    unittest.main()
