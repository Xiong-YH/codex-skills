"""Canvas input becomes source-backed independent tracks, not a baked plate."""
import json
from pathlib import Path
import shutil
import sys
import tempfile
import unittest

SKILL = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SKILL))
from engine.builder import build
from engine.compiler import compile_project, read_json, write_json
from engine.workbench_bridge import require_supported


class CanvasWorkbenchTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name) / 'project'
        shutil.copytree(SKILL / 'assets/project-template', self.root)

    def build(self):
        resolved = compile_project(self.root, write=True)
        build(self.root, resolved, SKILL)
        return resolved, require_supported(self.root, resolved)

    def test_canvas_scene_and_transition_are_live_units_with_editable_source(self):
        resolved, status = self.build()
        manifest = status['manifest']
        self.assertEqual(len(manifest['shots']), len(resolved['shots']))
        self.assertEqual(len(manifest['transitions']), 2)
        for source, unit in zip(resolved['shots'], manifest['shots']):
            self.assertEqual(unit['component'], 'CanvasShotUnit')
            self.assertEqual(json.loads(unit['props']['paramsJson']), source['params'])
            self.assertEqual(json.loads(unit['props']['objectsJson']), source['objects'])
            self.assertEqual((unit['from'], unit['duration']), (source['startFrame'], source['durationFrames']))
        transition = manifest['transitions'][0]
        self.assertEqual(transition['props']['outgoingShotId'], resolved['shots'][0]['id'])
        self.assertEqual(transition['props']['incomingShotId'], resolved['shots'][1]['id'])
        runtime = (self.root / 'build/remotion/src/canvas-runtime.ts').read_text()
        self.assertIn('P.createRenderer', runtime)
        self.assertIn('PIXEL_CANVAS_RUNTIME', runtime)
        self.assertNotIn('.mp4', runtime)
        entry = (self.root / 'build/remotion/src/workbench.ts').read_text()
        self.assertIn('CanvasOriginal', entry)
        self.assertTrue((self.root / 'build/film.html').is_file())
        self.assertEqual(status['audioReport']['maxAbsPcmError'], 0)

    def test_components_media_progress_and_title_remain_separate(self):
        from PIL import Image
        (self.root / 'media').mkdir()
        Image.new('RGB', (320, 180), '#153040').save(self.root / 'media/back.png')
        project = read_json(self.root / 'project.json')
        project['audioMode'] = 'silent'
        write_json(self.root / 'project.json', project)
        timeline = read_json(self.root / 'timeline.json')
        timeline['shots'][0].update(scene='scenes.canvas.v1', actor=None, params={}, objects=[],
            background={'file': 'media/back.png'}, components=[{
                'id': 'conclusion', 'kind': 'takeaway', 'x': .1, 'y': .2, 'width': .8, 'height': .4,
                'data': {'title': '独立场景参数'}}])
        timeline['shots'][0]['motions'] = []
        timeline['progress'] = {'nodes': [{'label': '起点', 'at': {'event': 's01.enter'}},
                                         {'label': '结果', 'at': {'event': 's03.enter'}}]}
        write_json(self.root / 'timeline.json', timeline)
        write_json(self.root / 'text.json', {'cues': [{'id': 'title', 'role': 'title', 'text': '可移动标题',
            'start': {'event': 's01.enter'}, 'end': {'event': 's01.exit'}}]})
        resolved, status = self.build()
        manifest = status['manifest']
        self.assertEqual(json.loads(manifest['shots'][0]['props']['componentsJson'])[0]['data']['title'], '独立场景参数')
        self.assertEqual(manifest['captions'][0]['props']['role'], 'title')
        self.assertEqual(manifest['captions'][0]['component'], 'CanvasCaptionUnit')
        self.assertEqual(manifest['overlays'][0]['component'], 'CanvasProgressUnit')
        public_payload = read_json(self.root / 'build/remotion/public/payload.json')
        self.assertTrue(public_payload['assets']['@s01.background'].startswith('data:image/png;'))
        generated = self.root / 'build/remotion/src/canvas-runtime.ts'
        generated.write_text(generated.read_text() + '\n// tampered')
        with self.assertRaisesRegex(ValueError, 'changed'):
            require_supported(self.root, resolved)

    def test_pose_project_reopens_from_saved_compiled_timeline(self):
        timeline = read_json(self.root / 'timeline.json')
        timeline['shots'][0]['performance'] = [{'pose': 'talk', 'start': {'event': 's01.reveal'},
                                              'end': {'event': 's01.exit'}}]
        write_json(self.root / 'timeline.json', timeline)
        resolved, _ = self.build()
        saved = read_json(self.root / 'build/resolved-timeline.json')
        self.assertEqual(saved, resolved)
        self.assertIn('talk', saved['actorPoseLayout']['actor.azong.v3'])
        self.assertTrue(require_supported(self.root)['supported'])


if __name__ == '__main__':
    unittest.main()
