"""Guard presenter roles and visible text; these tests do not approve mouth animation."""
from pathlib import Path
import sys
import tempfile
import unittest

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from directorlib.authoring import initialize,load_sources,handoff
from directorlib.common import read_json,write_json


class SingleNarratorTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup)
        self.project=Path(self.tmp.name)/'project';initialize(self.project,example=True)
        self.change('brief.json',lambda d:d.update(singleNarrator={'narrator':'actor.azong.v3','hiddenCharacterNames':['阿棕','阿墨']}))

    def change(self,name,edit):
        path=self.project/name;data=read_json(path);edit(data);write_json(path,data)

    def test_internal_illustration_roles_and_offscreen_presenter_are_allowed(self):
        self.change('brief.json',lambda d:d.update(idea='阿墨只作为插图中的人物'))
        self.change('production-plan.json',lambda d:d['shots'][-1].update(actor=None))
        load_sources(self.project)
        handoff(self.project,ROOT.parent/'pixel-game-video')
        actors={s['actor'] for s in read_json(self.project/'video/timeline.json')['shots']}
        self.assertLessEqual(actors,{'actor.azong.v3',None})

    def test_supporting_character_cannot_take_over_presenter_slot(self):
        self.change('production-plan.json',lambda d:d['shots'][0].update(actor='actor.amo.v3'))
        with self.assertRaisesRegex(ValueError,'single-narrator presenter'):load_sources(self.project)

    def test_body_pose_swaps_are_not_treated_as_mouth_animation(self):
        self.change('storyboard.json',lambda d:d['shots'][0].update(performance=[{'pose':'talk','start':{'event':'s1.enter'},'end':{'event':'s1.exit'}}]))
        with self.assertRaisesRegex(ValueError,'not a mouth animation'):load_sources(self.project)

    def test_names_are_rejected_in_subtitles_and_labels(self):
        path=self.project/'script.json';original=read_json(path)
        self.change('script.json',lambda d:d['cues'][0].update(text='阿棕为你讲述'))
        with self.assertRaisesRegex(ValueError,'internal character names'):load_sources(self.project)
        write_json(path,original)
        self.change('script.json',lambda d:d['labels'][0].update(text='阿墨 · 提问'))
        with self.assertRaisesRegex(ValueError,'internal character names'):load_sources(self.project)

    def test_policy_is_opt_in_and_does_not_change_dialogue_projects(self):
        self.change('brief.json',lambda d:d.pop('singleNarrator'))
        self.change('production-plan.json',lambda d:d['shots'][0].update(actor='actor.amo.v3'))
        self.change('script.json',lambda d:d['cues'][0].update(text='阿墨出场'))
        load_sources(self.project)


if __name__=='__main__':unittest.main()
