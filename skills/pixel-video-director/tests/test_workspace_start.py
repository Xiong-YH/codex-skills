"""The workspace CLI selects only an explicitly supplied project."""
import json
from pathlib import Path
import subprocess
import tempfile
import unittest

CLI = Path(__file__).resolve().parents[1] / 'scripts/build-workspace.cjs'


class WorkspaceStartTests(unittest.TestCase):
    def test_no_arguments_do_not_create_an_implicit_work_project(self):
        with tempfile.TemporaryDirectory() as folder:
            result = subprocess.run(['node', str(CLI)], cwd=folder, capture_output=True, text=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn('Pass --state', result.stderr)
            self.assertFalse(list(Path(folder).iterdir()))

    def test_explicit_project_creates_reopenable_workspace(self):
        with tempfile.TemporaryDirectory() as folder:
            state = Path(folder) / 'film' / 'script-creator.json'
            subprocess.run(['node', str(CLI), '--state', str(state)], cwd=folder,
                           check=True, capture_output=True)
            before = state.read_bytes()
            self.assertEqual(json.loads(before)['projectId'], 'welcome')
            self.assertTrue(state.with_suffix('.html').is_file())
            subprocess.run(['node', str(CLI), '--state', str(state)], cwd=folder,
                           check=True, capture_output=True)
            self.assertEqual(before, state.read_bytes())


if __name__ == '__main__':
    unittest.main()
