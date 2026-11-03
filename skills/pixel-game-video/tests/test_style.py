"""Style switching must produce self-contained previews from clean projects."""
import base64
import json
from pathlib import Path
import shutil
import sys
import tempfile
import unittest
from PIL import Image

SKILL = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SKILL))
from engine.builder import build, style_file
from engine.compiler import compile_project, read_json, write_json
from engine.dependencies import selected_style, visual_asset_files
from engine.delivery import copy_skill


class StyleBuildTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / 'project'
        shutil.copytree(SKILL / 'assets/project-template', self.root)

    def use_style(self, ident):
        project = read_json(self.root / 'project.json')
        project['style'] = ident
        write_json(self.root / 'project.json', project)
        target = build(self.root, compile_project(self.root), SKILL, silent=True)
        return target.read_text(encoding='utf-8'), read_json(self.root / 'build/payload.json')

    def test_cyberpunk_preview_embeds_exact_backdrop_bytes(self):
        document, payload = self.use_style('style.cyberpunk.v1')
        uri = payload['assets']['style.cyberpunk-city.v1']
        self.assertTrue(uri.startswith('data:image/png;base64,'))
        self.assertEqual(base64.b64decode(uri.split(',', 1)[1]),
                         (SKILL / 'modules/library/backgrounds/cyberpunk-city.png').read_bytes())
        self.assertIn(uri, document)
        self.assertNotIn(str(SKILL), document)
        runtime = (self.root / 'build/runtime.js').read_text(encoding='utf-8')
        self.assertIn((SKILL / 'modules/style/cyberpunk.js').read_text(encoding='utf-8'), runtime)

    def test_switching_back_to_daylight_removes_cyberpunk_dependencies(self):
        self.use_style('style.cyberpunk.v1')
        document, payload = self.use_style('style.modern-pixel.v1')
        self.assertNotIn('style.cyberpunk-city.v1', payload['assets'])
        self.assertEqual(payload['style']['colors']['background'], '#edf3e6')
        self.assertNotIn('data:image/png;base64,' + base64.b64encode(
            (SKILL / 'modules/library/backgrounds/cyberpunk-city.png').read_bytes()).decode('ascii'), document)

    def test_style_paths_are_confined_to_the_module(self):
        style_root = (SKILL / 'modules/style').resolve()
        with self.assertRaisesRegex(ValueError, 'inside the style module'):
            style_file(style_root, '../library/runtime.js')

    def cache_scene(self, *, scene='scenes.cache-journey.v1', phase='fetch', environment='archive'):
        timeline = read_json(self.root / 'timeline.json')
        labels = {key: '测试' for key in ('requester', 'origin', 'cache', 'dataA', 'dataB',
                                        'hit', 'miss', 'copy', 'longRoute', 'shortRoute', 'result')}
        for shot in timeline['shots']:
            shot.update(scene=scene, actor='actor.azong.v3' if scene.endswith('adventure.v1') else None,
                        objects=[], motions=[], params={'phase': phase, 'environment': environment,
                        'startEvent': 'enter', 'arriveEvent': 'auditArrive',
                        'completeEvent': 'auditComplete', 'labels': labels})
            shot['events'] += [{'id': 'auditArrive', 'frame': 80}, {'id': 'auditComplete', 'frame': 160}]
        write_json(self.root / 'timeline.json', timeline)
        project = read_json(self.root / 'project.json')
        project['style'] = 'style.pixel-study.v1'
        write_json(self.root / 'project.json', project)
        return timeline

    def test_missing_scene_environment_fails_before_build_and_compatible_style_builds(self):
        self.cache_scene()
        with self.assertRaisesRegex(ValueError, "needs background environment 'archive'"):
            compile_project(self.root)
        project = read_json(self.root / 'project.json')
        project['style'] = 'style.pixel-computing.v1'
        write_json(self.root / 'project.json', project)
        build(self.root, compile_project(self.root), SKILL, silent=True)
        self.assertIn('archive', read_json(self.root / 'build/payload.json')['style']['backgrounds'])

    def test_internal_room_switches_are_checked_even_when_declared_room_exists(self):
        self.cache_scene(scene='scenes.cache-adventure.v1', phase='fetch', environment='workspace')
        with self.assertRaisesRegex(ValueError, "needs background environment 'archive'"):
            compile_project(self.root)

    def test_project_background_can_replace_the_unavailable_style_environment(self):
        timeline = self.cache_scene()
        (self.root / 'media').mkdir()
        Image.new('RGB', (160, 90), '#243849').save(self.root / 'media/room.png')
        for shot in timeline['shots']:
            shot['background'] = {'file': 'media/room.png', 'kind': 'image'}
        write_json(self.root / 'timeline.json', timeline)
        compile_project(self.root)

    def test_layout_and_background_changes_bind_only_selected_resources(self):
        runtime = Path(self.temp.name) / 'runtime'
        copy_skill(SKILL, runtime, include_tests=False)
        project = read_json(self.root / 'project.json')
        project['style'] = 'style.pixel-computing.v1'
        write_json(self.root / 'project.json', project)
        before = compile_project(self.root, runtime)
        unused = runtime / 'modules/library/backgrounds/cyberpunk-city.png'
        unused.write_bytes(unused.read_bytes() + b'\n')
        self.assertEqual(before['inputHash'], compile_project(self.root, runtime)['inputHash'])
        layout = runtime / 'modules/scenes/layouts/pixel-computing.json'
        original = layout.read_bytes()
        data = read_json(layout)
        data['presenter']['x'] += .05
        write_json(layout, data)
        after = compile_project(self.root, runtime)
        self.assertNotEqual(before['inputHash'], after['inputHash'])
        build(self.root, after, runtime, silent=True)
        self.assertEqual(read_json(self.root / 'build/payload.json')['style']['presenter']['x'], data['presenter']['x'])
        layout.write_bytes(original)
        selected = runtime / 'modules/library/backgrounds/pixel-workbench.png'
        selected.write_bytes(selected.read_bytes() + b'\n')
        self.assertNotEqual(before['inputHash'], compile_project(self.root, runtime)['inputHash'])

    def test_scene_and_library_references_cannot_escape_their_modules(self):
        runtime = Path(self.temp.name) / 'runtime'
        copy_skill(SKILL, runtime, include_tests=False)
        catalog_path = runtime / 'modules/style/catalog.json'
        catalog = read_json(catalog_path)
        catalog['items'][0]['scenePreset'] = '../style/preset.json'
        write_json(catalog_path, catalog)
        resolved = {'project': {'style': catalog['items'][0]['id']}}
        with self.assertRaisesRegex(ValueError, 'inside its module'):
            selected_style(runtime, resolved)
        assets = runtime / 'modules/library/backgrounds/catalog.json'
        manifest = read_json(assets)
        ident = next(iter(manifest['assets']))
        manifest['assets'][ident]['file'] = '../style/preset.json'
        write_json(assets, manifest)
        with self.assertRaisesRegex(ValueError, 'inside its module'):
            visual_asset_files(runtime, {'libraryAssets': [ident]})

    def test_legacy_style_local_assets_still_build(self):
        runtime = Path(self.temp.name) / 'runtime'
        copy_skill(SKILL, runtime, include_tests=False)
        image = runtime / 'modules/style/legacy.png'
        image.write_bytes((runtime / 'modules/library/backgrounds/cyberpunk-city.png').read_bytes())
        preset = runtime / 'modules/style/preset.json'
        data = read_json(preset)
        data['assets'] = {'legacy.background': 'legacy.png'}
        write_json(preset, data)
        project = read_json(self.root / 'project.json')
        project['style'] = 'style.modern-pixel.v1'
        write_json(self.root / 'project.json', project)
        build(self.root, compile_project(self.root, runtime), runtime, silent=True)
        uri = read_json(self.root / 'build/payload.json')['assets']['legacy.background']
        self.assertEqual(base64.b64decode(uri.split(',', 1)[1]), image.read_bytes())


if __name__ == '__main__':
    unittest.main()
