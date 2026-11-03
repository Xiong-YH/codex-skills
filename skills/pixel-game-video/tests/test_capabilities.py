"""Discovery must preserve executor boundaries, portability and review honesty."""
import copy
import importlib.util
import io
import json
from pathlib import Path
import shutil
import sys
import tempfile
import unittest
from contextlib import redirect_stderr, redirect_stdout
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from engine import capabilities
from engine.backend_caps import validate as validate_backend
from engine.compiler import catalog, compile_project, read_json, write_json
from engine import compiler

spec = importlib.util.spec_from_file_location('capability_cli', ROOT / 'scripts/video.py')
cli = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cli)


class CapabilityTests(unittest.TestCase):
    def item(self, ident):
        return next(item for group in capabilities.query(ident=ident)['modules'] for item in group['items'])

    def test_interview_actions_expose_their_own_coverage_without_claiming_a_test_run(self):
        cases = {
            'object.interview-cards.v1': 'tests/interview-components.cjs',
            'object.judgment-stamp.v1': 'tests/interview-components.cjs',
            'object.task-workbench.v1': 'tests/interview-components.cjs',
            'object.character-offer-receive.v1': 'tests/offer-receive.cjs',
            'object.transcript-reach-hold.v1': 'tests/transcript-reach.cjs',
        }
        for ident, test in cases.items():
            with self.subTest(ident=ident):
                item = self.item(ident)
                self.assertEqual(item['references']['tests'], [test])
                self.assertEqual(item['status'], 'standalone')
                self.assertEqual(item['workbench']['editing'], 'not-integrated')
                self.assertEqual(item['verification']['testRun'], 'not_run')

    def test_existing_catalog_output_and_source_files_are_unchanged(self):
        paths = list((ROOT / 'modules').glob('*/catalog.json'))
        before = {path: path.read_bytes() for path in paths}
        for module in (None, *capabilities.MODULES):
            stream = io.StringIO()
            with redirect_stdout(stream):
                cli.main(['catalog'] + ([module] if module else []))
            expected = catalog()[module] if module else catalog()
            self.assertEqual(json.loads(stream.getvalue()), expected)
        capabilities.check()
        self.assertEqual(before, {path: path.read_bytes() for path in paths})

    def test_native_discovery_agrees_with_actual_backend_rejections(self):
        base = {'scene': 'scenes.focus-desk.v1', 'actor': None, 'components': [],
                'objects': [], 'motions': []}
        for module in ('style', 'library', 'motion', 'scenes'):
            for item in capabilities.query(module=module)['modules'][0]['items']:
                if item['source']['kind'] != 'registry':
                    continue
                if module == 'library' and item['kind'] != 'actor':
                    continue
                project, shot = {'renderBackend': 'remotion', 'style': 'style.pixel-editorial.v1'}, copy.deepcopy(base)
                if module == 'style':
                    project['style'] = item['id']
                elif module == 'library':
                    shot['actor'] = item['id']
                elif module == 'motion':
                    shot['motions'] = [{'recipe': item['id']}]
                else:
                    shot['scene'] = item['id']
                try:
                    validate_backend(project, [shot])
                    supported = True
                except ValueError:
                    supported = False
                self.assertEqual(item['backends']['remotion']['supported'], supported, item['id'])

    def test_planned_and_draft_entries_are_unavailable_in_both_discovery_and_compiler(self):
        original_read = capabilities._read
        with tempfile.TemporaryDirectory() as folder:
            project = Path(folder) / 'project'
            shutil.copytree(ROOT / 'assets/project-template', project)
            ident = read_json(project / 'project.json')['style']
            for status in ('planned', 'draft', 'unavailable', 'not_implemented'):
                source = catalog()
                next(item for item in source['style']['items'] if item['id'] == ident)['status'] = status
                def read(path):
                    return source['style'] if path == ROOT / 'modules/style/catalog.json' else original_read(path)
                with self.subTest(status=status), patch.object(capabilities, '_read', side_effect=read):
                    item = self.item(ident)
                    self.assertEqual(item['sourceStatus'], status)
                    self.assertNotEqual(item['status'], 'registered')
                    self.assertFalse(any(backend['supported'] for backend in item['backends'].values()))
                    self.assertEqual(item['workbench']['editing'], 'not-integrated')
                with patch.object(compiler, 'catalog', return_value=source):
                    with self.assertRaisesRegex(ValueError, 'unavailable capability'):
                        compile_project(project)

    def test_demos_and_missing_features_never_become_registered_or_editable(self):
        demo = self.item('object.resource-bundle-into-tray.v1')
        self.assertEqual(demo['status'], 'standalone')
        self.assertTrue(demo['backends']['canvas']['supported'])
        self.assertEqual(demo['workbench']['editing'], 'not-integrated')
        self.assertNotIn(demo['id'], {item['id'] for item in catalog()['components']['items']})
        for ident in ('audio.tts.v1', 'scenes.local-mouth.v1', 'motion.shelf-travel.v1'):
            item = self.item(ident)
            self.assertFalse(any(backend['supported'] for backend in item['backends'].values()))
            self.assertFalse(item['workbench']['independentTrack'])
        self.assertTrue(any('specialized-or-legacy' in note for note in self.item('motion.focus-punch.v1')['notes']))
        self.assertTrue(any('replacement:' in note for note in self.item('motion.stage-focus-punch.v1')['notes']))
        with tempfile.TemporaryDirectory() as folder:
            project = Path(folder) / 'project'
            shutil.copytree(ROOT / 'assets/project-template', project)
            timeline = read_json(project / 'timeline.json')
            timeline['shots'][0]['scene'] = 'scenes.actor-performance.v1'
            write_json(project / 'timeline.json', timeline)
            with self.assertRaises(ValueError):
                compile_project(project)

    def test_editor_modes_distinguish_props_tracks_and_frozen_audio(self):
        for ident in ('components.metric.v1', 'motion.camera-track.v1', 'actor.azong.v3'):
            self.assertEqual(self.item(ident)['workbench']['editing'], 'shot-props')
            self.assertFalse(self.item(ident)['workbench']['independentTrack'])
        self.assertTrue(self.item('motion.cross-dissolve.v1')['workbench']['independentTrack'])
        self.assertEqual(self.item('text.narrative-progress.v1')['workbench']['track'], 'overlays')
        self.assertEqual(self.item('audio.narration-import.v1')['workbench']['track'], 'narration')
        self.assertEqual(self.item('audio.bgm-mix.v1')['workbench']['track'], 'bgm')
        self.assertTrue(any('PCM' in note for note in self.item('audio.bgm-mix.v1')['notes']))

    def test_standalone_action_without_gallery_keeps_runtime_assets_and_scope(self):
        action = self.item('object.transcript-reach-hold.v1')
        self.assertEqual(action['status'], 'standalone')
        self.assertEqual(action['references']['examples'], [])
        self.assertIn('modules/components/character/transcript-reach.js', action['source']['resources'])
        self.assertIn('modules/components/character/assets/a-transcript-reach.png', action['source']['resources'])
        self.assertEqual(action['workbench']['editing'], 'not-integrated')
        cards = self.item('object.interview-cards.v1')
        self.assertIn('modules/components/interview/drawing.js', cards['source']['resources'])

    def test_query_filters_and_reference_check_do_not_claim_tests_or_review(self):
        native = capabilities.query(backend='remotion')
        self.assertGreater(native['count'], 0)
        for group in native['modules']:
            for item in group['items']:
                self.assertTrue(item['backends']['remotion']['supported'])
                self.assertEqual(item['verification']['testRun'], 'not_run')
                self.assertEqual(item['verification']['visualReview'], 'not_reviewed')
        legacy = capabilities.query(module='audio', status='legacy')
        self.assertTrue(all(item['status'] == 'legacy' for item in legacy['modules'][0]['items']))
        self.assertFalse(capabilities.check()['testsExecuted'])
        self.assertEqual(capabilities.check()['omittedTestReferences'], [])
        with self.assertRaisesRegex(ValueError, 'Unknown capability ID'):
            capabilities.query(ident='not-a-capability')
        with redirect_stderr(io.StringIO()), self.assertRaises(SystemExit):
            cli.main(['catalog', '--backend', 'remotion'])

    def test_metadata_typos_missing_references_and_path_escapes_fail(self):
        original_read = capabilities._read
        for mutation, message in [
            (lambda data: data.update(items={'unknown.id': {}}), 'Unknown capability metadata IDs'),
            (lambda data: data['defaults']['references'].update(examples=['absent/example.json']), 'Missing capability reference'),
            (lambda data: data['defaults']['references'].update(examples=['../outside']), 'escapes the skill'),
            (lambda data: data['defaults'].update(status='registered'), 'annotations may contain only'),
            (lambda data: data.update(features=[{'id': 'fake', 'title': 'fake', 'status': 'registered', 'invocation': 'fake'}]), 'registration comes from catalogs'),
        ]:
            def read(path, mutation=mutation):
                result = original_read(path)
                if path == ROOT / 'modules/style/capabilities.json':
                    mutation(result)
                return result
            with self.subTest(message=message), patch.object(capabilities, '_read', side_effect=read):
                with self.assertRaisesRegex(ValueError, message):
                    capabilities.check()

    def test_testless_delivery_keeps_discovery_and_reports_omitted_coverage(self):
        with tempfile.TemporaryDirectory() as folder:
            target = Path(folder)
            data = capabilities.inventory()
            sources = {f'modules/{name}/capabilities.json' for name in capabilities.MODULES}
            sources.update(item['source']['file'] for group in data['modules'] for item in group['items'])
            for relative in sources:
                path = target / relative
                path.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(ROOT / relative, path)
            for group in data['modules']:
                required = [group['guide']]
                for item in group['items']:
                    required += item['source']['resources']
                    required += item['references'].get('documentation', []) + item['references'].get('examples', [])
                for relative in required:
                    path = target / relative
                    path.parent.mkdir(parents=True, exist_ok=True)
                    if not path.exists():
                        path.touch()
            report = capabilities.check(target)
            self.assertTrue(report['omittedTestReferences'])
            self.assertFalse(report['testsExecuted'])
            self.assertEqual(capabilities.query(target)['count'], capabilities.query()['count'])


if __name__ == '__main__':
    unittest.main()
