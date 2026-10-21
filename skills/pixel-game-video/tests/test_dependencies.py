"""Project isolation and real standalone builds, including rejected-file injection."""
import importlib.util
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from engine.builder import build
from engine.compiler import compile_project, read_json, write_json
from engine.delivery import copy_skill, skill_files
from engine.render import _build_bindings
from engine.workbench_bridge import require_supported

spec = importlib.util.spec_from_file_location('video_cli_for_delivery', ROOT / 'scripts/video.py')
cli = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cli)


class DependencyTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.project = self.root / 'project'
        shutil.copytree(ROOT / 'assets/project-template', self.project)
        project = read_json(self.project / 'project.json')
        project['style'] = 'style.modern-pixel.v1'
        write_json(self.project / 'project.json', project)

    def test_unused_scene_and_backdrop_changes_do_not_invalidate_project(self):
        runtime = self.root / 'runtime'
        copy_skill(ROOT, runtime, include_tests=False)
        before = compile_project(self.project, runtime, write=True)
        for relative in ('modules/scenes/competition-cinematic.js',
                         'modules/style/assets/cyberpunk-city.png'):
            path = runtime / relative
            path.write_bytes(path.read_bytes() + b'\n')
        self.assertEqual(before['inputHash'], compile_project(self.project, runtime)['inputHash'])
        with patch('engine.render.ENGINE', runtime / 'engine'):
            self.assertTrue(_build_bindings(self.project, before['inputHash'])['currentRuntimeFiles'])
            path = runtime / 'modules/scenes/runtime.js'
            path.write_bytes(path.read_bytes() + b'\n')
            self.assertFalse(_build_bindings(self.project, before['inputHash'])['currentRuntimeFiles'])
        self.assertNotEqual(before['inputHash'], compile_project(self.project, runtime)['inputHash'])

    def test_selected_audio_master_is_locked_but_other_masters_are_not(self):
        runtime = self.root / 'runtime'
        copy_skill(ROOT, runtime, include_tests=False)
        write_json(self.project / 'audio.json', {'cues': [
            {'id': 'pick', 'sound': 'arcade-pickup', 'at': {'event': 's01.reveal'}}]})
        before = compile_project(self.project, runtime)
        unused = runtime / 'modules/audio/assets/arcade-motion/reward.wav'
        unused.write_bytes(unused.read_bytes() + b'\0')
        self.assertEqual(before['inputHash'], compile_project(self.project, runtime)['inputHash'])
        selected = runtime / 'modules/audio/assets/arcade-motion/pickup.wav'
        selected.write_bytes(selected.read_bytes() + b'\0')
        self.assertNotEqual(before['inputHash'], compile_project(self.project, runtime)['inputHash'])

    def test_presenter_free_preview_does_not_embed_unused_actor_variants(self):
        timeline = read_json(self.project / 'timeline.json')
        for shot in timeline['shots']:
            shot['actor'] = None
        write_json(self.project / 'timeline.json', timeline)
        resolved = compile_project(self.project, write=True)
        build(self.project, resolved, ROOT, silent=True)
        payload = read_json(self.project / 'build/payload.json')
        self.assertEqual(payload['assets'], {})
        runtime = (self.project / 'build/runtime.js').read_text(encoding='utf-8')
        self.assertNotIn('P.competitionCinematic=', runtime)
        self.assertNotIn('P.cacheAdventure=', runtime)
        self.assertNotIn('getContext(\'webgl\'', runtime)

    def test_export_and_install_package_share_rejected_file_policy_and_build(self):
        source = self.root / 'source-skill'
        copy_skill(ROOT, source)
        forbidden = ['modules/audio/charge.py', 'modules/audio/assets/arcade-charge/charge.wav',
                     'modules/audio/assets/arcade-expanded/experiment.wav',
                     'node_modules/package/index.js', 'engine/__pycache__/cached.pyc', 'tools/runtime.exe']
        for relative in forbidden:
            path = source / relative
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(b'rejected fixture')
        installable = {path.as_posix() for path in skill_files(source)}
        self.assertFalse(installable & set(forbidden))
        exported = self.root / 'standalone'
        with patch.object(cli, 'SKILL_ROOT', source):
            cli.export_project(self.project, exported)
        exported_files = {path.relative_to(exported / 'pixel-game-video').as_posix()
                          for path in (exported / 'pixel-game-video').rglob('*') if path.is_file()}
        self.assertEqual(exported_files, {p.as_posix() for p in skill_files(source, include_tests=False)})
        bridge = require_supported(exported / 'project')
        self.assertTrue(bridge['supported'])
        self.assertTrue(all(unit['component'] == 'CanvasShotUnit' for unit in bridge['manifest']['shots']))
        run = (exported / 'RUN.md').read_text(encoding='utf-8')
        self.assertIn('must use the local workbench for both Canvas and native Remotion', run)
        self.assertIn('workbench project --port 5208', run)
        self.assertIn('Each track\'s export button', run)
        self.assertNotIn('render project`', run)
        result = subprocess.run([sys.executable, '-X', 'utf8',
            str(exported / 'pixel-game-video/scripts/video.py'), 'build', str(exported / 'project')],
            capture_output=True, text=True, encoding='utf-8')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue((exported / 'project/build/film.html').is_file())


if __name__ == '__main__':
    unittest.main()
