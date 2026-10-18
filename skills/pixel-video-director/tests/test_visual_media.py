import copy
from pathlib import Path
import shutil
import sys
import tempfile
import unittest
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from directorlib.authoring import handoff,impact,load_sources
from directorlib.common import read_json,write_json
from directorlib.media import replace_media


class VisualMediaTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup)
        self.project=Path(self.tmp.name)/'project';shutil.copytree(ROOT/'examples/component-system',self.project)
        self.foundation=ROOT.parent/'pixel-game-video'

    def test_component_labels_keep_source_ownership_and_impact(self):
        handoff(self.project,self.foundation)
        maps=read_json(self.project/'video/source-map.json')['mappings']
        owner=next(m for m in maps if m['jsonPointer']=='/shots/0/components/0/data/title')
        self.assertEqual(owner['sourceFile'],'../script.json')
        self.assertIn('s1',[s['shotId'] for s in impact(self.project,'script.json',owner['stableId'],'/text')['affectedShots']])
        identity=read_json(self.project/'storyboard.json')['shots'][1]['components'][0]['data']['title']['labelId']
        self.assertEqual({s['shotId'] for s in impact(self.project,'script.json',identity,'/text')['affectedShots']},{'s2','s4'})

    def test_visual_intent_is_structured_but_legacy_can_omit_it(self):
        path=self.project/'storyboard.json';board=read_json(path)
        board['shots'][0]['visual']['action']='';write_json(path,board)
        with self.assertRaises(ValueError):load_sources(self.project)
        del board['shots'][0]['visual'];write_json(path,board)
        self.assertIsNone(load_sources(self.project)['storyboard.json']['shots'][0]['visual'])

    def test_replacement_preserves_timing_and_text_and_clear_restores_scene(self):
        source=Path(self.tmp.name)/'user.png';Image.new('RGB',(64,36),'#3a5371').save(source)
        original={name:(self.project/name).read_bytes() for name in ('script.json','storyboard.json')}
        result=replace_media(self.project,'s2',source,layer='replacement',foundation=self.foundation)
        self.assertEqual(result['durationFrames'],1260)
        for name,data in original.items():self.assertEqual((self.project/name).read_bytes(),data)
        copied=self.project/'video'/result['source']['file'];self.assertEqual(copied.read_bytes(),source.read_bytes())
        replace_media(self.project,'s2',clear=True,layer='replacement',foundation=self.foundation)
        self.assertNotIn('replacement',read_json(self.project/'production-plan.json')['shots'][1])

    def test_failed_import_restores_plan_and_previous_generation(self):
        handoff(self.project,self.foundation)
        plan=(self.project/'production-plan.json').read_bytes();timeline=(self.project/'video/timeline.json').read_bytes()
        source=Path(self.tmp.name)/'broken.png';source.write_bytes(b'not an image')
        with self.assertRaises(ValueError):replace_media(self.project,'s2',source,foundation=self.foundation)
        self.assertEqual((self.project/'production-plan.json').read_bytes(),plan)
        self.assertEqual((self.project/'video/timeline.json').read_bytes(),timeline)


if __name__=='__main__':unittest.main()
