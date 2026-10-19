"""Actor performance and narrative progress must follow events and lock their assets."""
import json
from pathlib import Path
import shutil
import sys
import tempfile
import unittest

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from engine.compiler import compile_project,read_json,write_json
from engine.builder import build


class PresenterProgressTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup)
        self.project=Path(self.temp.name)/'project'
        shutil.copytree(ROOT/'assets/project-template',self.project)
        self.timeline=read_json(self.project/'timeline.json')
        self.timeline['shots'][0]['performance']=[dict(pose='talk',start={'event':'s01.reveal'},end={'event':'s01.exit'})]
        self.timeline['progress']={'nodes':[dict(label='问题',at={'event':'s01.enter'}),dict(label='结果',at={'event':'s02.enter'})]}
        self.save()

    def save(self):write_json(self.project/'timeline.json',self.timeline)

    def test_event_shift_moves_pose_and_progress_without_retiming(self):
        before=compile_project(self.project)
        self.timeline['shots'][0]['events'][0]['frame']+=9
        self.timeline['shots'][0]['durationFrames']+=30;self.save()
        after=compile_project(self.project)
        self.assertEqual(after['shots'][0]['performance'][0]['startFrame'],before['shots'][0]['performance'][0]['startFrame']+9)
        self.assertEqual(after['progress']['nodes'][1]['frame'],before['progress']['nodes'][1]['frame']+30)
        self.assertNotEqual(before['inputHash'],after['inputHash'])

    def test_invisible_overlapping_and_cross_shot_performance_fail(self):
        shot=self.timeline['shots'][0];shot['actor']=None;self.save()
        with self.assertRaisesRegex(ValueError,'visible actor'):compile_project(self.project)
        shot['actor']='actor.azong.v3';shot['performance']*=2;self.save()
        with self.assertRaisesRegex(ValueError,'nonoverlapping'):compile_project(self.project)
        shot['performance']=shot['performance'][:1];shot['performance'][0]['end']={'event':'s02.exit'};self.save()
        with self.assertRaisesRegex(ValueError,'inside their shot'):compile_project(self.project)

    def test_progress_requires_order_and_zero_origin(self):
        self.timeline['progress']['nodes'][0]['at']={'event':'s01.reveal'};self.save()
        with self.assertRaisesRegex(ValueError,'frame zero'):compile_project(self.project)
        self.timeline['progress']['nodes'][0]['at']={'event':'s01.enter'}
        self.timeline['progress']['nodes'][1]['at']={'event':'s01.enter'};self.save()
        with self.assertRaisesRegex(ValueError,'strictly ordered'):compile_project(self.project)

    def test_build_embeds_only_used_poses_and_locks_actions_and_bar(self):
        resolved=compile_project(self.project,write=True)
        build(self.project,resolved,ROOT,silent=True)
        payload=read_json(self.project/'build/payload.json')
        pose_keys={k for k in payload['assets'] if ':pose:' in k}
        self.assertEqual(pose_keys,{'actor.azong.v3:pose:neutral','actor.azong.v3:pose:talk'})
        lock=read_json(self.project/'build/project-lock.json')['runtimeFiles']
        self.assertIn('modules/library/characters/actions/00-lead/talk.png',lock)
        self.assertIn('modules/text/narrative-progress.js',lock)
        self.assertNotIn('modules/library/characters/actions/00-lead/wave.png',lock)
        self.assertEqual(payload['resolved']['actorPoseLayout']['actor.azong.v3']['talk']['footY'],read_json(ROOT/'modules/library/characters/performance.json')['actors']['actor.azong.v3']['talk']['footY'])


if __name__=='__main__':unittest.main()
