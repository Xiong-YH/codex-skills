import copy
from pathlib import Path
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from engine.compiler import compile_project, write_json


class ExpandedComponents(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        write_json(self.root / 'project.json', {'title':'Components', 'style':'style.pixel-editorial.v1', 'audioMode':'silent'})
        write_json(self.root / 'text.json', {'cues':[]})
        write_json(self.root / 'audio.json', {'cues':[]})

    def validate(self, kind, data):
        write_json(self.root / 'timeline.json', {'shots':[{'id':'s1', 'scene':'scenes.canvas.v1', 'actor':None, 'durationFrames':240,
            'events':[{'id':'a','frame':30},{'id':'b','frame':90},{'id':'c','frame':150}],
            'components':[{'id':'card', 'kind':kind, 'showEvent':'a', 'x':.1, 'y':.15, 'width':.8, 'height':.6, 'data':data}]}]})
        return compile_project(self.root)

    def fixture(self, kind, count=3):
        if kind == 'takeaway': return {'title':'原则','detail':'解释'}
        item = {'event':'b'}
        if kind in ('flow','timeline','hierarchy'): item['title']='步骤'
        if kind in ('timeline','checklist','bars'): item['label']='条件'
        if kind == 'code': item['text']='  return true;'
        if kind == 'bars': item.update(value=30,endEvent='c')
        data = {'title':'示例','items':[copy.deepcopy(item) for _ in range(count)]}
        if kind == 'hierarchy': data['rootTitle']='系统'
        if kind == 'bars': data['max']=100
        return data

    def test_all_seven_families_and_count_limits_compile(self):
        for kind, low, high in [('flow',2,5),('timeline',3,5),('checklist',2,5),('hierarchy',2,4),('bars',2,4),('code',2,7)]:
            for count in (low, high):
                with self.subTest(kind=kind,count=count): self.validate(kind,self.fixture(kind,count))
            for count in (low-1,high+1):
                with self.subTest(kind=kind,count=count),self.assertRaises(ValueError): self.validate(kind,self.fixture(kind,count))
        self.validate('takeaway',self.fixture('takeaway'))

    def test_sequential_reading_order_and_reachable_events(self):
        for kind in ('flow','timeline','code'):
            data=self.fixture(kind);data['items'][0]['event']='c'
            with self.assertRaisesRegex(ValueError,'reading order'): self.validate(kind,data)
        for kind in ('flow','timeline','checklist','hierarchy','bars','code'):
            for event in ('enter','exit','missing'):
                data=self.fixture(kind);data['items'][0]['event']=event
                with self.assertRaises(ValueError): self.validate(kind,data)
        data=self.fixture('checklist');data['items'][0]['event']='c'
        self.validate('checklist',data)  # Conditions may complete in any order.

    def test_bars_require_truthful_shared_zero_based_scale(self):
        for maximum in (0,-1,True,float('inf')):
            data=self.fixture('bars');data['max']=maximum
            with self.assertRaises(ValueError): self.validate('bars',data)
        for value in (-1,101,True,float('nan'),'30'):
            data=self.fixture('bars');data['items'][0]['value']=value
            with self.assertRaises(ValueError): self.validate('bars',data)
        data=self.fixture('bars');data['items'][0]['endEvent']='b'
        with self.assertRaisesRegex(ValueError,'endEvent'): self.validate('bars',data)
        data=self.fixture('bars');data['items'][0]['value']=0;data['items'][1]['value']=100
        self.validate('bars',data)

    def test_code_preserves_spaces_and_rejects_multiline_or_tabs(self):
        result=self.validate('code',self.fixture('code'))
        self.assertEqual(result['shots'][0]['components'][0]['data']['items'][0]['text'],'  return true;')
        for line in ('one\ntwo','\treturn true;','one\rtwo',' '):
            data=self.fixture('code');data['items'][0]['text']=line
            with self.assertRaises(ValueError): self.validate('code',data)

    def test_unknown_fields_and_malformed_items_rejected(self):
        for kind in ('flow','timeline','checklist','hierarchy','bars','code','takeaway'):
            data=self.fixture(kind);data['imaginaryOption']=True
            with self.assertRaises(ValueError): self.validate(kind,data)
        for kind in ('flow','timeline','checklist','hierarchy','bars','code'):
            for item in (None,{},'invalid'):
                data=self.fixture(kind);data['items'][0]=item
                with self.assertRaises(ValueError): self.validate(kind,data)


if __name__ == '__main__': unittest.main()
