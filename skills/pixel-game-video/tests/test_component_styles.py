"""R41 appearance migration and component event contracts."""
import copy
import importlib.util
import json
from pathlib import Path
import shutil
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from engine.models import Component
from engine.dependencies import javascript_files, runtime_files
from engine.compiler import compile_project
from engine.builder import build

spec = importlib.util.spec_from_file_location('component_contract', ROOT / 'modules/components/contract.py')
contract = importlib.util.module_from_spec(spec)
spec.loader.exec_module(contract)
SOURCE = ROOT / 'modules/components/examples/guide'


class ComponentStyles(unittest.TestCase):
    def setUp(self):
        self.shots = json.loads((SOURCE / 'timeline.json').read_text(encoding='utf-8'))['shots']

    def fixture(self, kind):
        for shot in self.shots:
            for component in shot['components']:
                if component['kind'] == kind:
                    return copy.deepcopy(component), copy.deepcopy(shot)
        self.fail(kind)

    def validate(self, component, shot):
        shot['events'].append({'id': 'enter', 'frame': 0})
        data = Component.model_validate(component).model_dump()
        contract.validate(data, shot, set())
        return data

    def test_saved_appearances_upgrade_without_changing_content_or_input(self):
        component, shot = self.fixture('metric')
        for old in ('plain', 'mechanical', 'energy', 'paper'):
            for variant in ('open', 'inset', 'relay'):
                source = {**component, 'visualStyle': old, 'styleVariant': variant}
                original = copy.deepcopy(source)
                result = self.validate(source, copy.deepcopy(shot))
                self.assertEqual(source, original)
                self.assertEqual(result['data'], component['data'])
                self.assertNotIn('visualStyle', result)
                self.assertNotIn('styleVariant', result)
        for old in ('unknown', ['energy', 'mechanical']):
            with self.assertRaises(ValueError):
                Component.model_validate({**component, 'visualStyle': old})
        self.assertNotIn('visualStyle', Component.model_json_schema()['properties'])

    def test_new_catalog_and_entire_sample_compile_with_current_runtime(self):
        with tempfile.TemporaryDirectory() as folder:
            project = Path(folder)
            for name in ('project.json', 'timeline.json', 'text.json', 'audio.json'):
                shutil.copy2(SOURCE / name, project / name)
            resolved = compile_project(project, write=True)
            names = {item['kind'] for item in json.loads((ROOT / 'modules/components/catalog.json').read_text(encoding='utf-8'))['items']}
            self.assertEqual({c['kind'] for shot in resolved['shots'] for c in shot['components']}, names)
            self.assertEqual(len(names), 20)
            build(project, resolved, ROOT, silent=True)
            payload = json.loads((project / 'build/payload.json').read_text(encoding='utf-8'))
            self.assertFalse(any(key.startswith('@components.gear.') for key in payload['assets']))
            locked = runtime_files(ROOT, resolved)
            self.assertTrue(all('gears' not in path for path in locked))
            scripts = javascript_files(ROOT, resolved)
            self.assertLess(scripts.index('modules/components/look.js'), scripts.index('modules/components/runtime.js'))

    def test_partial_deck_stamp_and_out_of_range_choice_are_rejected(self):
        component, shot = self.fixture('deck')
        del component['data']['items'][0]['markEvent']
        with self.assertRaisesRegex(ValueError, 'stamp'):
            self.validate(component, shot)
        component, shot = self.fixture('choice')
        component['data']['selectedIndex'] = len(component['data']['items'])
        with self.assertRaisesRegex(ValueError, 'selectedIndex'):
            self.validate(component, shot)
        component, shot = self.fixture('tag')
        component['dimEvent'] = 'missing'
        with self.assertRaisesRegex(ValueError, 'unreachable'):
            self.validate(component, shot)

    def test_chat_event_order_count_side_and_viewport_are_checked(self):
        component, shot = self.fixture('chat')
        self.validate(component, copy.deepcopy(shot))
        mutations = [
            {'visibleRows': 1}, {'visibleRows': True},
            {'items': component['data']['items'][::-1]},
            {'items': [{**component['data']['items'][0], 'side': 'middle'}]},
            {'items': component['data']['items'] * 2},
        ]
        for mutation in mutations:
            with self.subTest(mutation=mutation), self.assertRaises(ValueError):
                self.validate({**component, 'data': {**component['data'], **mutation}}, copy.deepcopy(shot))

    def test_metric_curve_and_shared_feature_validation(self):
        component, shot = self.fixture('metric')
        for curve in ('linear', 'accelerate'):
            component['data']['curve'] = curve
            self.validate(component, copy.deepcopy(shot))
        component['data']['curve'] = 'bounce'
        with self.assertRaisesRegex(ValueError, 'curve'):
            self.validate(component, copy.deepcopy(shot))
        component, shot = self.fixture('identity')
        for features in (['unknown'], ['stack', 'stack']):
            with self.assertRaises(ValueError):
                self.validate({**component, 'features': features}, copy.deepcopy(shot))


if __name__ == '__main__':
    unittest.main()
