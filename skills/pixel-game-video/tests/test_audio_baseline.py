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
                    'arcade-launch', 'arcade-reject', 'arcade-reward',
                    'arcade-confirm-soft', 'arcade-focus', 'arcade-unfold'}
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
            self.assertEqual(len(manifest['items']), 9)
            self.assertEqual(len(list(out.glob('*.wav'))), 27)
            self.assertNotIn('arcade-charge', {item['id'] for item in manifest['items']})
            copied = temp / 'skill'
            copy_skill(ROOT, copied, include_tests=False)
            script = "import sys;from pathlib import Path;sys.path.insert(0,str(Path('skill/modules/audio').resolve()));import arcade;assert len(arcade.entries())==9;assert all(arcade.sound(x['id']).shape[1]==2 for x in arcade.entries());print('portable')"
            result = subprocess.run([sys.executable, '-I', '-c', script], cwd=temp, capture_output=True, text=True, check=True)
            self.assertIn('portable', result.stdout)
            gallery = temp / 'gallery'
            subprocess.run([sys.executable, str(copied / 'modules/audio/gallery.py'), '--out', str(gallery)],
                           capture_output=True, text=True, check=True)
            page = (gallery / 'index.html').read_text(encoding='utf-8')
            self.assertEqual(page.count('<audio '), 30)
            self.assertNotIn('data-kind="selected"', page)
            import base64
            for item in arcade.manifest('common')['atoms']:
                self.assertIn(base64.b64encode(arcade.asset(item['id']).read_bytes()).decode(), page)

    def test_new_ids_compile_mix_and_lock_the_selected_masters(self):
        import mixer
        from engine.dependencies import runtime_files
        with tempfile.TemporaryDirectory() as folder:
            project = Path(folder) / 'project'
            shutil.copytree(ROOT / 'assets/project-template', project)
            ids = ['arcade-confirm-soft', 'arcade-focus', 'arcade-unfold']
            write_json(project / 'audio.json', {'cues': [
                {'id': kind, 'sound': kind, 'at': {'event': 's01.reveal'}, 'level': .5}
                for kind in ids]})
            resolved = compile_project(project)
            audio, records = mixer.render_sfx(resolved)
            self.assertGreater(abs(audio).max(), 0)
            self.assertEqual({r['sound'] for r in records}, set(ids))
            self.assertTrue(all(r['gainPolicy'] == 'native-stereo-master' for r in records))
            dependencies = runtime_files(ROOT, resolved)
            for kind in ids:
                self.assertIn(f'modules/audio/assets/common-motion/{kind}.wav', dependencies)

    def test_default_preview_excludes_legacy_and_copies_new_pcm_exactly(self):
        with tempfile.TemporaryDirectory() as folder:
            out = Path(folder)
            manifest = preview.build(out)
            self.assertEqual(len(manifest['items']), 9)
            for item in arcade.manifest('common')['atoms']:
                self.assertEqual((out / (item['id'] + '.wav')).read_bytes(), arcade.asset(item['id']).read_bytes())


if __name__ == '__main__':
    unittest.main()
