"""Transition composition, actor omission and conflict contracts."""
from pathlib import Path
import shutil
import sys
import tempfile
import unittest

SKILL = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SKILL))
from engine.compiler import compile_project, read_json, write_json


class TransitionTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / 'project'
        shutil.copytree(SKILL / 'assets/project-template', self.root)

    def edit(self, change):
        data = read_json(self.root / 'timeline.json')
        change(data['shots'])
        write_json(self.root / 'timeline.json', data)

    @staticmethod
    def motion(recipe='motion.focus-punch.v1', **kwargs):
        return {'id':'transition-test', 'recipe':recipe, 'target':'scene',
                'start':{'event':'s02.enter'}, 'durationFrames':36, 'params':{}, **kwargs}

    def test_explicit_null_actor_survives_compilation(self):
        self.edit(lambda shots: shots[1].update(actor=None))
        result = compile_project(self.root)
        self.assertIsNone(result['shots'][1]['actor'])
        self.assertEqual(result['shots'][0]['actor'], 'actor.azong.v3')
        self.assertEqual(result['durationFrames'], 720)

    def test_transition_requires_a_previous_shot_and_enter(self):
        self.edit(lambda shots: shots[0].update(motions=[self.motion(start={'event':'s01.enter'})]))
        with self.assertRaisesRegex(ValueError, 'previous shot'):
            compile_project(self.root)
        shutil.copy2(SKILL / 'assets/project-template/timeline.json', self.root)
        self.edit(lambda shots: shots[1].update(motions=[self.motion(start={'event':'s02.enter','offsetFrames':1})]))
        with self.assertRaisesRegex(ValueError, 'shot.enter'):
            compile_project(self.root)

    def test_different_transition_recipes_cannot_overlap(self):
        self.edit(lambda shots: shots[1].update(motions=[self.motion(), self.motion('motion.mosaic-pullback.v1', id='second')]))
        with self.assertRaisesRegex(ValueError, 'overlapping motion'):
            compile_project(self.root)

    def test_mosaic_grid_is_an_odd_integer(self):
        for columns in (2, 4, 10, 3.5, True):
            self.edit(lambda shots: shots[1].update(motions=[self.motion('motion.mosaic-pullback.v1', params={'columns':columns})]))
            with self.subTest(columns=columns), self.assertRaises(ValueError):
                compile_project(self.root)
        self.edit(lambda shots: shots[1].update(motions=[self.motion('motion.mosaic-pullback.v1', params={'columns':9})]))
        self.assertEqual(compile_project(self.root)['shots'][1]['motions'][0]['params']['columns'],9)

    def test_camera_track_bounds_and_camera_conflicts(self):
        track=self.motion('motion.camera-track.v1',params={'scaleFrom':1.1,'scaleTo':1.6,'xFrom':.2,'xTo':.8})
        self.edit(lambda shots:shots[1].update(motions=[track]))
        compile_project(self.root)
        track['params']['scaleTo']=1.9
        self.edit(lambda shots:shots[1].update(motions=[track]))
        with self.assertRaisesRegex(ValueError,'scaleTo'):compile_project(self.root)
        track['params']['scaleTo']=1.6
        self.edit(lambda shots:shots[1].update(motions=[track,self.motion('motion.camera-push.v1',id='other-camera')]))
        with self.assertRaisesRegex(ValueError,'overlapping motion'):compile_project(self.root)

    def test_light_transition_checks_stage_but_world_transition_accepts_full_frame(self):
        def setup(shots):
            shots[0]['objects'][0]['x'] = .2
            shots[1]['motions'] = [self.motion('motion.panel-slide.v1')]
        self.edit(setup)
        with self.assertRaisesRegex(ValueError, 'outside content stage'):
            compile_project(self.root)
        self.edit(lambda shots: shots[1].update(motions=[self.motion()]))
        compile_project(self.root)

    def test_withdrawn_stage_crops_cannot_silently_render(self):
        for recipe in ('motion.stage-focus-punch.v1','motion.stage-mosaic-pullback.v1'):
            self.edit(lambda shots:shots[1].update(motions=[self.motion(recipe)]))
            with self.subTest(recipe=recipe),self.assertRaisesRegex(ValueError,'unavailable capability'):compile_project(self.root)

    def test_world_transitions_preserve_standing_presenter_selection(self):
        for recipe in ('motion.focus-punch.v1','motion.mosaic-pullback.v1'):
            self.edit(lambda shots:shots[1].update(actor='actor.azong.v3',motions=[self.motion(recipe)]))
            resolved=compile_project(self.root)
            self.assertEqual(resolved['shots'][1]['actor'],'actor.azong.v3')

    def test_incoming_focus_anchors_are_bounded(self):
        self.edit(lambda shots:shots[1].update(motions=[self.motion(params={'incomingX':.49,'incomingY':.49,'incomingZoom':4.4})]))
        compile_project(self.root)
        for params in ({'incomingX':1.1},{'incomingY':-.1},{'incomingZoom':9}):
            self.edit(lambda shots:shots[1].update(motions=[self.motion(params=params)]))
            with self.subTest(params=params),self.assertRaises(ValueError):compile_project(self.root)


if __name__ == '__main__':
    unittest.main()
