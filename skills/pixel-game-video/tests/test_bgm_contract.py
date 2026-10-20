"""Music is event-owned, content-bound, portable, and shared by both backends."""
import importlib.util
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
import wave

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from engine.compiler import compile_project, read_json, write_json
from engine.builder import build

spec = importlib.util.spec_from_file_location('bgm_cli', ROOT / 'scripts/video.py')
cli = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cli)
spec = importlib.util.spec_from_file_location('bgm_importer', ROOT / 'modules/audio/import_bgm.py')
importer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(importer)


class BgmContractTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.project = Path(self.temp.name) / 'project'
        shutil.copytree(ROOT / 'assets/project-template', self.project)
        self.clip = self.project / 'media/music.wav'
        self.clip.parent.mkdir()
        self.write_clip(440)
        self.bgm = {'file': 'media/music.wav', 'at': {'event': 's01.enter'},
                    'end': {'event': 's03.exit'}, 'title': 'Test music', 'loop': True}
        self.save()

    def write_clip(self, frequency):
        data = (np.sin(np.arange(48000) * 2 * np.pi * frequency / 48000) * 3000).astype('<i2')
        with wave.open(str(self.clip), 'wb') as stream:
            stream.setparams((1, 2, 48000, 0, 'NONE', 'not compressed'))
            stream.writeframes(data.tobytes())

    def save(self):
        write_json(self.project / 'audio.json', {'cues': [], 'bgm': self.bgm})

    def test_event_shift_and_music_bytes_change_bindings_without_editing_inputs(self):
        original = (self.project / 'audio.json').read_bytes()
        before = compile_project(self.project, write=True)
        self.assertEqual((self.project / 'audio.json').read_bytes(), original)
        self.assertEqual((before['bgm']['frame'], before['bgm']['endFrame']), (0, 720))
        lock = read_json(self.project / 'build/project-lock.json')
        self.assertIn('media/music.wav', lock['inputFiles'])
        self.assertIn('modules/audio/music.py', lock['runtimeFiles'])
        timeline = read_json(self.project / 'timeline.json')
        timeline['shots'][0]['durationFrames'] += 60
        write_json(self.project / 'timeline.json', timeline)
        self.assertEqual(compile_project(self.project)['bgm']['endFrame'], 780)
        self.write_clip(660)
        self.assertNotEqual(before['inputHash'], compile_project(self.project)['inputHash'])

    def test_bad_source_interval_fades_trim_and_silent_are_rejected(self):
        for patch, message in [
            ({'file': '../outside.wav'}, 'inside the project'),
            ({'end': {'event': 's01.enter'}}, 'interval'),
            ({'at': {'event': 's01.enter', 'offsetFrames': -1}}, 'interval'),
            ({'end': {'event': 's03.exit', 'offsetFrames': 1}}, 'interval'),
            ({'fadeInFrames': 721}, 'fades'),
            ({'trimStartSeconds': 1.0}, 'trim'),
            ({'loop': False}, 'too short'),
        ]:
            with self.subTest(patch=patch):
                write_json(self.project / 'audio.json', {'bgm': {**self.bgm, **patch}})
                with self.assertRaisesRegex(ValueError, message):
                    compile_project(self.project)
        self.save()
        project = read_json(self.project / 'project.json')
        project['audioMode'] = 'silent'
        write_json(self.project / 'project.json', project)
        with self.assertRaisesRegex(ValueError, 'non-silent'):
            compile_project(self.project)

    def test_export_carries_music_and_rebuilds_without_the_original(self):
        before = compile_project(self.project)
        destination = Path(self.temp.name) / 'export'
        cli.export_project(self.project, destination)
        exported = destination / 'project'
        self.clip.unlink()
        self.assertTrue((exported / 'media/music.wav').is_file())
        resolved = compile_project(exported, destination / 'pixel-game-video', write=True)
        self.assertEqual(before['bgm'], resolved['bgm'])
        result = subprocess.run([sys.executable, str(destination / 'pixel-game-video/scripts/video.py'),
                                 'build', str(exported)], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(read_json(exported / 'build/sfx-events.json')['musicBed'])

    def test_native_build_contains_the_same_mixed_music_track(self):
        shutil.copytree(ROOT / 'assets/remotion-project-template', self.project, dirs_exist_ok=True)
        project = read_json(self.project / 'project.json')
        project['audioMode'] = 'sfx-only'
        write_json(self.project / 'project.json', project)
        self.bgm.update(at={'event': 's01.enter'}, end={'event': 's01.exit'})
        self.save()
        resolved = compile_project(self.project, write=True)
        build(self.project, resolved, ROOT)
        mixed = self.project / 'build/animation-sfx.wav'
        self.assertEqual(mixed.read_bytes(), (self.project / 'build/remotion/public/animation.wav').read_bytes())
        self.assertTrue(read_json(self.project / 'build/sfx-events.json')['musicBed'])

    @unittest.skipUnless(shutil.which('ffmpeg'), 'FFmpeg is required for audio import')
    def test_import_materializes_pcm_without_editing_authoring_and_guards_overwrite(self):
        original = {p.name: p.read_bytes() for p in self.project.glob('*.json')}
        result = importer.import_bgm(self.project, self.clip)
        self.assertEqual(original, {p.name: p.read_bytes() for p in self.project.glob('*.json')})
        with wave.open(str(self.project / result['file']), 'rb') as stream:
            self.assertEqual((stream.getframerate(), stream.getnchannels(), stream.getsampwidth()), (48000, 2, 2))
        with self.assertRaises(FileExistsError):
            importer.import_bgm(self.project, self.clip)
        importer.import_bgm(self.project, self.clip, overwrite=True)


if __name__ == '__main__':
    unittest.main()
