import copy
import importlib.util
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
from unittest.mock import patch

from engine.jianying_export import build_export_plan, default_project, export_jianying, frame_range, resolve_audio


def manifest():
    return {'name': 'export test', 'revision': 'test-revision', 'fps': 30, 'width': 1920, 'height': 1080, 'total': 90,
        'order': ['captions', 'transitions', 'overlays'],
        'shots': [{'id': 's1', 'cardId': 's1', 'from': 0, 'duration': 45, 'component': 'DeskShotUnit', 'props': {'heading': 'one'}},
                  {'id': 's2', 'cardId': 's2', 'from': 45, 'duration': 45, 'component': 'DeskShotUnit', 'props': {'heading': 'two'}}],
        'captions': [{'id': 'c1', 'cardId': 'c1', 'from': 3, 'duration': 30, 'component': 'CaptionUnit',
                      'props': {'cueIndex': 0, 'text': 'original', 'fontSize': 48, 'color': '#f5ebd4', 'x': .5, 'y': .87}}],
        'transitions': [], 'overlays': [],
        'sfx': [{'src': 'audio/test.wav', 'from': 12, 'duration': 18, 'volume': .8, 'label': 'sound'}]}


class ExportPlanTests(unittest.TestCase):
    def test_rounds_absolute_boundaries_without_adjacent_gaps(self):
        segments = [frame_range(frame, frame + 1, 60) for frame in range(10)]
        self.assertEqual(segments[0]['duration'], 16667)
        self.assertEqual(segments[1]['duration'], 16666)
        for left, right in zip(segments, segments[1:]):
            self.assertEqual(left['start'] + left['duration'], right['start'])

    def test_current_edits_and_hidden_tracks_drive_export(self):
        m = manifest(); project = default_project(m)
        project['tracks'][0]['clips'][0]['props']['text'] = 'edited text'
        shots = next(track for track in project['tracks'] if track['id'] == 'shot')['clips']
        shots[-1]['duration'] = 57
        audio = next(track for track in project['tracks'] if track['id'] == 'sfx')['clips'][0]
        audio.update(start=15, inOffset=3, speed=1.5)
        audio['props']['volume'] = .75
        project['tracks'].append({'id': 'hidden', 'hidden': True, 'clips': [{'cardId': 'unknown', 'start': 0, 'duration': 999}]})
        plan = build_export_plan(m, project)
        self.assertEqual(plan['totalFrames'], 102)
        self.assertEqual(plan['cuts'][-1]['endFrame'], 102)
        self.assertEqual(plan['captions'][0]['props']['text'], 'edited text')
        self.assertEqual(plan['audio'][0]['inOffset'], 3)
        self.assertEqual(plan['audio'][0]['speed'], 1.5)
        self.assertEqual(plan['audio'][0]['props']['volume'], .75)
        self.assertEqual(plan['hiddenTracksSkipped'], ['hidden'])
        self.assertEqual(project['source'], plan['savedSource'])

    def test_unknown_visible_card_rejected_and_old_revision_reported(self):
        m = manifest(); project = default_project(m); project['source'] = 'old-version'
        self.assertFalse(build_export_plan(m, project)['sourceRevisionMatches'])
        project['tracks'][0]['clips'][0]['cardId'] = 'unrecognized-title'
        with self.assertRaisesRegex(ValueError, 'Unsupported visible card'):
            build_export_plan(m, project)

    def test_captions_below_baked_visuals_are_not_silently_relayered(self):
        m = manifest(); project = default_project(m)
        project['tracks'][0], project['tracks'][1] = project['tracks'][1], project['tracks'][0]
        with self.assertRaisesRegex(ValueError, 'below an overlapping'):
            build_export_plan(m, project)

    def test_nondefault_theme_is_explicitly_rejected(self):
        m = manifest()
        for changes in ({'themeId': 'custom'}, {'themeColors': {'ink': '#ff0000'}}):
            project = {**default_project(m), **changes}
            with self.assertRaisesRegex(ValueError, 'default theme'):
                build_export_plan(m, project)

    def test_audio_paths_remain_inside_public_or_foundation(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp) / 'project'; skill = Path(temp) / 'skill'
            audio = root / 'build/remotion/public/audio/test.wav'; audio.parent.mkdir(parents=True); audio.write_bytes(b'wav')
            foundation = skill / 'modules/audio/assets/arcade-motion/stems/select.wav'
            foundation.parent.mkdir(parents=True); foundation.write_bytes(b'foundation')
            self.assertEqual(resolve_audio(root, skill, 'audio/test.wav'), audio.resolve())
            self.assertEqual(resolve_audio(root, skill, 'foundation-sfx/stems/select.wav'), foundation.resolve())
            for relative in ('../private.wav', '/tmp/private.wav', 'https://example.com/audio.wav'):
                with self.assertRaises(ValueError): resolve_audio(root, skill, relative)
            (audio.parent / 'escape.wav').symlink_to(foundation)
            with self.assertRaises(ValueError): resolve_audio(root, skill, 'audio/escape.wav')


@unittest.skipUnless(importlib.util.find_spec('pyJianYingDraft') and shutil.which('ffmpeg'), 'Optional Jianying dependency and FFmpeg required')
class NativeDraftTests(unittest.TestCase):
    def test_portable_native_tracks_keep_edits_audio_trim_speed_and_volume(self):
        import wave
        import numpy as np
        m = manifest(); project = default_project(m)
        project['tracks'][0]['clips'][0]['props']['text'] = 'edit survives'
        project['tracks'][0]['clips'][0]['opacity'] = .4
        audio = next(track for track in project['tracks'] if track['id'] == 'sfx')['clips'][0]
        audio.update(start=15, inOffset=3, speed=1.5); audio['props']['volume'] = .75
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp) / 'project'; public = root / 'build/remotion/public'; public.mkdir(parents=True)
            sound = public / 'audio/test.wav'; sound.parent.mkdir()
            values = np.zeros((48000, 2), dtype='<i2')
            with wave.open(str(sound), 'wb') as stream:
                stream.setparams((2, 2, 48000, 0, 'NONE', 'not compressed')); stream.writeframes(values.tobytes())
            payload = {'style': {'colors': {'ink': '#f5ebd4'}}, 'resolved': {'cues': [{'role': 'subtitle', 'text': 'original'}]}}
            (public / 'payload.json').write_text(json.dumps(payload))
            plate = Path(temp) / 'plate.mp4'
            subprocess.run(['ffmpeg', '-v', 'error', '-f', 'lavfi', '-i', 'color=c=black:s=1920x1080:r=30:d=3',
                            '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', '-an', str(plate)], check=True)
            output = Path(temp) / 'portable'
            with patch('engine.compiler.compile_project', return_value={'inputHash': 'fresh'}), patch('engine.workbench_bridge.require_supported', return_value={'manifest': m}):
                result = export_jianying(root, output, plate=plate, workbench_project=project)
            self.assertFalse(result['installed'])
            content = json.loads((output / 'draft_content.json').read_text())
            exported = json.loads((output / 'export-manifest.json').read_text())
            self.assertEqual(len(exported['shots']), 2)
            self.assertEqual(exported['nativeCaptions'][0]['text'], 'edit survives')
            entry = exported['nativeAudio'][0]
            self.assertEqual(entry['targetStartMicroseconds'], 500000)
            self.assertEqual(entry['sourceStartMicroseconds'], 100000)
            self.assertEqual(entry['speed'], 1.5)
            self.assertEqual(entry['volume'], .75)
            self.assertEqual(content['duration'], 3000000)
            self.assertEqual(content['platform'], {})
            self.assertEqual(content['last_modified_platform'], {})
            text_segment = next(track for track in content['tracks'] if track['type'] == 'text')['segments'][0]
            self.assertEqual(text_segment['clip']['alpha'], .4)
            meta = json.loads((output / 'draft_meta_info.json').read_text())
            self.assertEqual(content['id'], meta['draft_id'])
            second = Path(temp) / 'portable-second'
            with patch('engine.compiler.compile_project', return_value={'inputHash': 'fresh'}), patch('engine.workbench_bridge.require_supported', return_value={'manifest': m}):
                export_jianying(root, second, plate=plate, workbench_project=project)
            second_content = json.loads((second / 'draft_content.json').read_text())
            self.assertNotEqual(content['id'], second_content['id'])
            for kind in ('videos', 'audios'):
                for material in content['materials'][kind]:
                    self.assertFalse(Path(material['path']).is_absolute())
                    self.assertTrue((output / material['path']).is_file())
            moved = Path(temp) / 'new-parent' / 'moved'
            moved.parent.mkdir(); shutil.move(output, moved)
            for kind in ('videos', 'audios'):
                for material in content['materials'][kind]: self.assertTrue((moved / material['path']).is_file())


if __name__ == '__main__':
    unittest.main()
