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

    def test_plain_fades_are_separate_canvas_transition_units(self):
        for recipe in ('motion.cross-dissolve.v1', 'motion.fade-through-black.v1'):
            timeline=read_json(self.root/'timeline.json')
            motion=timeline['shots'][1]['motions'][0]
            motion.update(recipe=recipe,params={})
            write_json(self.root/'timeline.json',timeline)
            resolved,status=self.build()
            transition=next(unit for unit in status['manifest']['transitions']
                            if unit['props']['incomingShotId']==resolved['shots'][1]['id'])
            self.assertEqual(transition['component'],'CanvasTransitionUnit')
            self.assertEqual(json.loads(transition['props']['paramsJson']),{})

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
        runtime = (self.root / 'build/remotion/src/canvas-runtime.ts').read_text(encoding='utf-8')
        self.assertIn('P.createRenderer', runtime)
        self.assertIn('PIXEL_CANVAS_RUNTIME', runtime)
        self.assertNotIn('.mp4', runtime)
        entry = (self.root / 'build/remotion/src/workbench.ts').read_text(encoding='utf-8')
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
        generated.write_text(generated.read_text(encoding='utf-8') + '\n// tampered', encoding='utf-8')
        with self.assertRaisesRegex(ValueError, 'changed'):
            require_supported(self.root, resolved)

    def test_pose_project_reopens_from_saved_compiled_timeline(self):
        timeline = read_json(self.root / 'timeline.json')
        timeline['shots'][0]['actor'] = 'actor.azong.v3'
        timeline['shots'][0]['performance'] = [{'pose': 'talk', 'start': {'event': 's01.reveal'},
                                              'end': {'event': 's01.exit'}}]
        write_json(self.root / 'timeline.json', timeline)
        resolved, _ = self.build()
        saved = read_json(self.root / 'build/resolved-timeline.json')
        self.assertEqual(saved, resolved)
        self.assertIn('talk', saved['actorPoseLayout']['actor.azong.v3'])
        self.assertTrue(require_supported(self.root)['supported'])

    def test_pose_atlas_and_rich_title_reach_editable_canvas_units(self):
        from PIL import Image
        media = self.root / 'media'
        media.mkdir()
        Image.new('RGBA', (128, 64), '#355846').save(media / 'poses.png')
        project = read_json(self.root / 'project.json')
        project['audioMode'] = 'silent'
        write_json(self.root / 'project.json', project)
        write_json(self.root / 'audio.json', {'cues': []})
        timeline = read_json(self.root / 'timeline.json')
        first = timeline['shots'][0]
        first.update(scene='scenes.canvas.v1', actor=None, params={}, objects=[], motions=[],
                     poseAtlas={'file': 'media/poses.png', 'x': .22, 'y': .74, 'height': .4, 'poses': [
                         {'pose': 'ready', 'at': {'event': 's01.enter'}, 'sourceRect': [0, 0, 64, 64]},
                         {'pose': 'touch', 'at': {'event': 's01.reveal'}, 'sourceRect': [64, 0, 64, 64]},
                     ]})
        write_json(self.root / 'timeline.json', timeline)
        layout = {'left': .06, 'right': .94, 'y': .15, 'size': .069,
                  'emphasis': [{'text': '触点', 'color': '#bff8cc', 'treatment': 'underline'}]}
        write_json(self.root / 'text.json', {'cues': [{'id': 'title', 'role': 'title', 'text': '核对触点',
            'start': {'event': 's01.enter'}, 'end': {'event': 's01.exit'}, 'richText': layout}]})
        resolved, status = self.build()
        atlas = resolved['shots'][0]['poseAtlas']
        manifest = status['manifest']
        self.assertEqual(atlas['poses'][1]['frame'], resolved['events']['s01.reveal'])
        self.assertEqual(json.loads(manifest['shots'][0]['props']['poseAtlasJson']), atlas)
        self.assertEqual(json.loads(manifest['captions'][0]['props']['richTextJson']), layout)
        self.assertAlmostEqual(manifest['captions'][0]['props']['fontSize'], 1080 * .069)
        self.assertIn(atlas['assetKey'], read_json(self.root / 'build/payload.json')['assets'])
        first['poseAtlas']['poses'][1]['sourceRect'][0] = 65
        write_json(self.root / 'timeline.json', timeline)
        with self.assertRaisesRegex(ValueError, 'fit inside the image'):
            compile_project(self.root)


if __name__ == '__main__':
    unittest.main()
