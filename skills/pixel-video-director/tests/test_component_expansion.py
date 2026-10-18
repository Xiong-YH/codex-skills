from pathlib import Path
import shutil
import sys
import tempfile
import unittest

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from directorlib.authoring import handoff,impact,load_sources
from directorlib.common import read_json,write_json


class ComponentExpansionTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup)
        self.project=Path(self.tmp.name)/'project'
        shutil.copytree(ROOT/'examples/component-expansion',self.project)

    def test_numeric_bars_and_code_labels_keep_their_owners(self):
        result=handoff(self.project,ROOT.parent/'pixel-game-video')
        self.assertEqual(result['durationFrames'],2100)
        timeline=read_json(self.project/'video/timeline.json')
        self.assertEqual(timeline['shots'][4]['components'][0]['data']['items'][0]['value'],36)
        self.assertTrue(timeline['shots'][5]['components'][0]['data']['items'][2]['text'].startswith('  ?'))
        mapping=read_json(self.project/'video/source-map.json')['mappings']
        line=next(m for m in mapping if m['jsonPointer']=='/shots/5/components/0/data/items/2/text')
        value=next(m for m in mapping if m['jsonPointer']=='/shots/4/components/0/data/items/0/value')
        self.assertEqual(line['sourceFile'],'../script.json')
        self.assertEqual(value['sourceFile'],'../storyboard.json')
        self.assertEqual([s['shotId'] for s in impact(self.project,'script.json',line['stableId'])['affectedShots']],['s6'])

    def test_raw_code_and_root_title_cannot_bypass_script_labels(self):
        original=read_json(self.project/'storyboard.json')
        for index,key in [(3,'rootTitle'),(5,'language')]:
            board=read_json(self.project/'storyboard.json')
            board['shots'][index]['components'][0]['data'][key]='raw text'
            write_json(self.project/'storyboard.json',board)
            with self.assertRaisesRegex(ValueError,'script.labels'): load_sources(self.project)
            write_json(self.project/'storyboard.json',original)
        board=read_json(self.project/'storyboard.json')
        board['shots'][5]['components'][0]['data']['items'][0]['text']='raw code'
        write_json(self.project/'storyboard.json',board)
        with self.assertRaisesRegex(ValueError,'script.labels'): load_sources(self.project)


if __name__=='__main__':unittest.main()
