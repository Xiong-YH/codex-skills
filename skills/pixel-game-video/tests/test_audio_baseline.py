"""Approved audio stays portable; rejected experimental IDs remain unavailable."""
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / 'modules/audio'))
import arcade
import preview
from engine.compiler import compile_project, write_json
from engine.delivery import copy_skill


class ChargeAudioTests(unittest.TestCase):
    def test_only_approved_arcade_masters_are_selectable(self):
        expected = {'arcade-select', 'arcade-pickup', 'arcade-seat',
                    'arcade-launch', 'arcade-reject', 'arcade-reward'}
        self.assertEqual({item['id'] for item in arcade.entries()}, expected)
        for kind in ['arcade-charge', 'arcade-navigate', 'arcade-unlock']:
            with self.subTest(kind=kind), self.assertRaisesRegex(ValueError, 'Unknown arcade sound'):
                arcade.sound(kind)

    def test_retired_ids_fail_before_project_build(self):
        with tempfile.TemporaryDirectory() as folder:
            project = Path(folder) / 'project'
            shutil.copytree(ROOT / 'assets/project-template', project)
            for kind in ['arcade-charge', 'arcade-navigate', 'arcade-unlock']:
                cue = {'id': 'event', 'sound': kind, 'at': {'event': 's01.reveal'}, 'level': .6}
                write_json(project / 'audio.json', {'cues': [cue]})
                with self.subTest(kind=kind), self.assertRaisesRegex(ValueError, 'unavailable capability'):
                    compile_project(project)

    def test_delivery_preview_and_portable_module_only_need_approved_assets(self):
        with tempfile.TemporaryDirectory() as folder:
            temp = Path(folder)
            out = temp / 'preview'
            with self.assertRaisesRegex(ValueError, 'Unavailable audition bank'):
                preview.build(out, 'arcade-charge')
            manifest = preview.build(out, 'arcade')
            self.assertEqual(len(manifest['items']), 6)
            self.assertEqual(len(list(out.glob('*.wav'))), 24)
            self.assertNotIn('arcade-charge', {item['id'] for item in manifest['items']})
            copied = temp / 'skill'
            copy_skill(ROOT, copied, include_tests=False)
            script = "import sys;from pathlib import Path;sys.path.insert(0,str(Path('skill/modules/audio').resolve()));import arcade;assert len(arcade.entries())==6;assert arcade.sound('arcade-select').shape[1]==2;print('portable')"
            result = subprocess.run([sys.executable, '-I', '-c', script], cwd=temp, capture_output=True, text=True, check=True)
            self.assertIn('portable', result.stdout)


if __name__ == '__main__':
    unittest.main()
