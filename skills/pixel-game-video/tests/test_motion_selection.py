import importlib.util
import unittest
from unittest.mock import patch
from pathlib import Path
MOTION=Path(__file__).resolve().parents[1]/'modules/motion'
spec=importlib.util.spec_from_file_location('motion_selection',MOTION/'library.py')
lib=importlib.util.module_from_spec(spec);spec.loader.exec_module(lib)

class SelectionTests(unittest.TestCase):
    def test_defaults_are_executable_and_hide_designs_and_legacy(self):
        data=lib.resolve();items=lib.select(data)
        self.assertTrue(items)
        self.assertTrue(all(x['status']=='ready' and x['exposure']=='primary' and 'canvas' in x['backends'] for x in items))
        self.assertEqual(len([x for x in lib.select(data,designs=True) if x['status']=='approved-design']),6)

    def test_native_backend_and_explicit_choices_do_not_fallback(self):
        data=lib.resolve();items=lib.select(data,backend='remotion',compatibility=True)
        self.assertEqual({x['binding']['recipe'] for x in items if x['binding']},{'motion.camera-track.v1','motion.book-sweep.v1'})
        with self.assertRaises(ValueError):lib.select(data,backend='remotion',ident='design.motion.slam')
        with self.assertRaises(ValueError):lib.select(data,intent='invented')

    def test_generated_view_matches_source_and_every_runtime_recipe_is_bound(self):
        data=lib.resolve()
        self.assertEqual((MOTION/'library.html').read_text(encoding='utf-8'),lib.generated(data))
        source=lib.read(MOTION/'catalog.json')
        self.assertEqual({x['binding']['recipe'] for x in data['entries'] if x['binding']},{x['id'] for x in source['items'] if x.get('status')!='unavailable'})

    def test_bad_resource_or_preset_binding_is_rejected(self):
        with self.assertRaises(ValueError):lib.local('../../outside.json')
        original=lib.read
        def corrupted(path):
            data=original(path)
            if path.name=='selection.json':
                next(x for x in data['entries'] if x['id']=='design.motion.push')['binding']['params']['kind']='orbit'
            return data
        with patch.object(lib,'read',side_effect=corrupted),self.assertRaises(ValueError):lib.resolve()

    def test_disallowed_runtime_is_not_misrepresented_as_ready(self):
        original=lib.read
        def corrupted(path):
            data=original(path)
            if path.name=='selection.json':
                next(x for x in data['entries'] if x['id']=='design.motion.study-whip').update(status='ready')
            return data
        with patch.object(lib,'read',side_effect=corrupted),self.assertRaises(ValueError):lib.resolve()
