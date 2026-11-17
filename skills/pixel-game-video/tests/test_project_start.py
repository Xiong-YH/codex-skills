"""New films start without inheriting the runtime regression example."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

SKILL = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SKILL))
from engine.compiler import compile_project
from engine.builder import build


class ProjectStartTests(unittest.TestCase):
    def test_init_builds_an_independent_neutral_project(self):
        with tempfile.TemporaryDirectory() as folder:
            project = Path(folder) / 'new-film'
            subprocess.run([sys.executable, str(SKILL / 'scripts/video.py'), 'init',
                            str(project), '--title', '当前主题'], check=True, capture_output=True)
            resolved = compile_project(project)
            self.assertEqual(resolved['project']['title'], '当前主题')
            self.assertEqual(resolved['project']['audioMode'], 'silent')
            self.assertFalse(resolved['audio'])
            for shot in resolved['shots']:
                self.assertIsNone(shot['actor'])
                self.assertFalse(shot['objects'])
                self.assertFalse(shot['motions'])
            build(project, resolved, SKILL, silent=True)
            self.assertTrue((project / 'build/film.html').is_file())
            payload = json.loads((project / 'build/payload.json').read_text())
            self.assertFalse(payload['assets'])
            self.assertIsNone(payload['audio'])


if __name__ == '__main__':
    unittest.main()
