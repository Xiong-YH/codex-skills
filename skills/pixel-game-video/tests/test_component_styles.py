import importlib.util
import base64
import hashlib
import json
from pathlib import Path
import sys
import unittest
import tempfile

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from engine.models import Component
from engine.dependencies import javascript_files
from engine.dependencies import runtime_files
from engine.compiler import compile_project, write_json
from engine.builder import build

spec = importlib.util.spec_from_file_location('component_style_contract', ROOT / 'modules/components/contract.py')
contract = importlib.util.module_from_spec(spec)
spec.loader.exec_module(contract)


class ComponentStyles(unittest.TestCase):
    def component(self, **extra):
        return Component.model_validate(dict(id='m', kind='metric', x=.1, y=.1, width=.8, height=.6,
            data={'title':'完成', 'from':0, 'to':3, 'startEvent':'begin', 'endEvent':'land'}, **extra)).model_dump()

    def validate(self, component):
        shot={'durationFrames':180,'events':[{'id':'enter','frame':0},{'id':'begin','frame':30},{'id':'land','frame':50}]}
        contract.validate(component, shot, set())
        return component

    def test_all_twelve_forms_and_default(self):
        self.assertEqual(self.component()['visualStyle'], 'mechanical')
        self.assertEqual(self.component()['styleVariant'], 'inset')
        self.assertEqual(self.component()['features'], [])
        for style in ('mechanical', 'energy'):
            for variant in ('open', 'inset', 'relay'):
                for features in ([], ['stack']):
                    result=self.validate(self.component(visualStyle=style,styleVariant=variant,features=features))
                    self.assertEqual((result['visualStyle'],result['styleVariant'],result['features']), (style,variant,features))

    def test_feature_preserves_style_and_information_semantics(self):
        before=self.component(visualStyle='energy',features=['stack'])
        after=self.validate(before)
        self.assertEqual(after['visualStyle'], 'energy')
        self.assertEqual(after['data'], self.component()['data'])

    def test_mixed_styles_unknown_features_and_retired_field_fail(self):
        for style in ('stack','mechanical+energy',['mechanical','energy']):
            with self.assertRaises(ValueError):self.validate(self.component(visualStyle=style))
        for features in (['unknown'],['stack','stack'],['energy']):
            with self.assertRaises(ValueError):self.validate(self.component(features=features))
        for extra in ({'styleLayers':['mechanical']},{'stylePreset':'gear'}):
            with self.assertRaises(ValueError):self.component(**extra)
        for variant in ('unknown', ['open', 'inset']):
            with self.assertRaises(ValueError):self.component(styleVariant=variant)
        invalid=self.component();invalid['styleVariant']='unknown'
        with self.assertRaises(ValueError):self.validate(invalid)

    def test_style_runtime_is_locked_before_component_runtime(self):
        resolved={'project':{'style':'style.pixel-editorial.v1'},'shots':[{'scene':'scenes.canvas.v1','components':[self.component()]}]}
        scripts=javascript_files(ROOT,resolved)
        self.assertLess(scripts.index('modules/components/style-layers.js'), scripts.index('modules/components/runtime.js'))
        self.assertLess(scripts.index('modules/components/apparatus.js'), scripts.index('modules/components/runtime.js'))

    def test_schema_separates_style_from_features(self):
        fields=Component.model_json_schema()['properties']
        self.assertNotIn('styleLayers', fields)
        self.assertEqual(fields['visualStyle']['enum'], ['plain','mechanical','energy'])
        self.assertEqual(fields['styleVariant']['enum'], ['open','inset','relay'])
        self.assertEqual(fields['features']['items']['const'], 'stack')
        self.assertEqual(fields['features']['maxItems'], 1)

    def test_plain_is_original_simple_option_not_a_mixed_style(self):
        result=self.validate(self.component(visualStyle='plain'))
        self.assertEqual(result['features'], [])
        for extra in ({'features':['stack']}, {'styleVariant':'relay'}):
            with self.assertRaises(ValueError):self.validate(self.component(visualStyle='plain',**extra))
        resolved={'project':{'style':'style.pixel-editorial.v1'},'shots':[{'scene':'scenes.canvas.v1','components':[result]}]}
        scripts=javascript_files(ROOT,resolved)
        self.assertLess(scripts.index('modules/components/plain.js'),scripts.index('modules/components/runtime.js'))

    def test_exact_gear_images_embedded_and_locked_even_for_energy(self):
        with tempfile.TemporaryDirectory() as folder:
            project=Path(folder)
            write_json(project/'project.json',{'title':'Gear assets','style':'style.pixel-editorial.v1','audioMode':'silent'})
            write_json(project/'timeline.json',{'shots':[{'id':'s1','scene':'scenes.canvas.v1','actor':None,'durationFrames':180,
                'components':[{'id':'chapter','kind':'chapter','x':.1,'y':.2,'width':.8,'height':.4,'visualStyle':'energy',
                    'data':{'index':'02','title':'章节'}}]}]})
            for name in ('text','audio'):write_json(project/(name+'.json'),{'cues':[]})
            resolved=compile_project(project,write=True)
            build(project,resolved,ROOT,silent=True)
            payload=json.loads((project/'build/payload.json').read_text(encoding='utf-8'))
            manifest=json.loads((ROOT/'modules/components/assets/gears/manifest.json').read_text(encoding='utf-8'))
            locked=set(runtime_files(ROOT,resolved))
            self.assertEqual(len(payload['style']['componentGearAssets']),3)
            for item in manifest['items']:
                encoded=payload['assets'][item['assetKey']].split(',',1)[1]
                self.assertEqual(hashlib.sha256(base64.b64decode(encoded)).hexdigest(),item['sha256'])
                self.assertIn('modules/components/'+item['file'],locked)


if __name__=='__main__':unittest.main()
