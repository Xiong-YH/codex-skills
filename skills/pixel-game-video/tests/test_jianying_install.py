import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

from engine.jianying_install import install_bundle, validate_bundle, mac_is_running
from engine import jianying_install


class InstallTests(unittest.TestCase):
    def test_adapter_import_does_not_write_into_portable_package(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            platforms = root / '_platforms'
            platforms.mkdir()
            (platforms / 'mac_draft.py').write_text('loaded = True\n')
            before = sorted(p.relative_to(root) for p in root.rglob('*'))
            with patch.object(jianying_install, '__file__', str(root / 'install.py')), \
                 patch.object(sys, 'dont_write_bytecode', False):
                self.assertTrue(jianying_install.adapter('mac').loaded)
                self.assertFalse(sys.dont_write_bytecode)
            self.assertEqual(sorted(p.relative_to(root) for p in root.rglob('*')), before)

    def make_bundle(self, root):
        source = root / 'portable'
        (source / 'Resources').mkdir(parents=True)
        (source / 'Resources/plate.mp4').write_bytes(b'test plate')
        content = {'name': 'demo', 'duration': 1000000, 'platform': {},
                   'last_modified_platform': {}, 'materials': {'videos': [
                       {'id': 'video1', 'path': 'Resources/plate.mp4',
                        'duration': 1000000, 'width': 1920, 'height': 1080}], 'audios': []}}
        (source / 'draft_content.json').write_text(json.dumps(content))
        (source / 'draft_meta_info.json').write_text(json.dumps({'draft_id': 'draft-test',
            'draft_materials': [{'type': 0, 'value': []}]}))
        return source

    def test_rejects_external_or_missing_media(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp); source = self.make_bundle(root)
            p = source / 'draft_content.json'; content = json.loads(p.read_text())
            for path in ('../private.mp4', '/tmp/private.mp4', 'Resources/missing.mp4'):
                content['materials']['videos'][0]['path'] = path
                p.write_text(json.dumps(content))
                with self.assertRaises(ValueError): validate_bundle(source)

    def test_local_mac_install_preserves_portable_bundle_and_existing_projects(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp); source = self.make_bundle(root)
            before = (source / 'draft_content.json').read_bytes()
            drafts = root / 'drafts'; drafts.mkdir()
            registry = drafts / 'root_meta_info.json'
            registry.write_text(json.dumps({'all_draft_store': [{'draft_name': 'keep-me'}]}))
            donor = root / 'local-donor'; donor.mkdir()
            (donor / 'draft_info.json').write_text(json.dumps({'platform': {
                'os': 'mac', 'device_id': 'test-only-device', 'app_version': '11.2.0'}}))
            with patch('subprocess.run', return_value=subprocess.CompletedProcess([], 0, stdout='', stderr='')):
                checked = install_bundle(source, 'new-demo', 'mac', drafts, donor, True)
                self.assertTrue(checked['ready']); self.assertFalse((drafts / 'new-demo').exists())
                self.assertFalse(list(drafts.glob('*.bak')))
                result = install_bundle(source, 'new-demo', 'mac', drafts, donor)
                installed = Path(result['installed'])
                local = json.loads((installed / 'draft_info.json').read_text())
                self.assertEqual(local['platform']['device_id'], 'test-only-device')
                self.assertTrue(Path(local['materials']['videos'][0]['path']).is_file())
                self.assertEqual((source / 'draft_content.json').read_bytes(), before)
                self.assertNotIn('device_id', (source / 'draft_content.json').read_text())
                self.assertTrue(Path(result['registryBackup']).is_file())
                records = json.loads(registry.read_text())['all_draft_store']
                self.assertEqual([r['draft_name'] for r in records], ['new-demo', 'keep-me'])
                registry_before = registry.read_bytes()
                with self.assertRaises(FileExistsError):
                    install_bundle(source, 'new-demo', 'mac', drafts, donor)
                self.assertEqual(registry.read_bytes(), registry_before)
                second = install_bundle(source, 'second-demo', 'mac', drafts, donor)
                second_content = json.loads((Path(second['installed']) / 'draft_info.json').read_text())
                self.assertNotEqual(local['id'], second_content['id'])
                second_meta = json.loads((Path(second['installed']) / 'draft_meta_info.json').read_text())
                self.assertEqual(second_content['id'], second_meta['draft_id'])

    def test_missing_mac_donor_writes_nothing(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp); source = self.make_bundle(root)
            drafts = root / 'drafts'; drafts.mkdir()
            registry = drafts / 'root_meta_info.json'; registry.write_text('{"all_draft_store": []}')
            before = registry.read_bytes()
            with patch('subprocess.run', return_value=subprocess.CompletedProcess([], 0, stdout='', stderr='')), \
                 patch('engine.jianying_install.detected_mac_version', return_value='11.3.0'):
                with self.assertRaises(RuntimeError):
                    install_bundle(source, 'new-demo', 'mac', drafts)
            self.assertEqual(registry.read_bytes(), before)
            self.assertEqual(sorted(p.name for p in drafts.iterdir()), ['root_meta_info.json'])

    def test_verified_mac_112_installs_without_device_identifiers(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp); source = self.make_bundle(root)
            drafts = root / 'drafts'; drafts.mkdir()
            (drafts / 'root_meta_info.json').write_text('{"all_draft_store": []}')
            with patch('subprocess.run', return_value=subprocess.CompletedProcess([], 0, stdout='', stderr='')), \
                 patch('engine.jianying_install.detected_mac_version', return_value='11.2.0'):
                checked = install_bundle(source, 'demo', 'mac', drafts, check=True)
                self.assertEqual(checked['platformMetadataPolicy'], 'verified-no-device-identifiers')
                result = install_bundle(source, 'demo', 'mac', drafts)
            content = json.loads((Path(result['installed']) / 'draft_info.json').read_text())
            self.assertEqual(content['platform'], {'os': 'mac', 'app_version': '11.2.0'})
            self.assertNotIn('device_id', json.dumps(content))

    def test_mac_guard_recognizes_videofusion_and_its_helpers(self):
        for name in ('VideoFusion-macOS', 'VideoFusion-macOS Helper (GPU)', 'VideoFusion-macOS Helper (Renderer)'):
            with patch('subprocess.run', return_value=subprocess.CompletedProcess([], 0,
                       stdout=f'/Applications/VideoFusion-macOS.app/Contents/MacOS/{name}\n', stderr='')):
                self.assertTrue(mac_is_running())
        with patch('subprocess.run', return_value=subprocess.CompletedProcess([], 0,
                   stdout='/bin/zsh\n/usr/bin/python3\n/Applications/VideoFusion-macOSTrayHelper\n', stderr='')):
            self.assertFalse(mac_is_running())


if __name__ == '__main__':
    unittest.main()
