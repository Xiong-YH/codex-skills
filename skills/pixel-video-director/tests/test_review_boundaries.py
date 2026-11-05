"""Regression tests for misleading success signals; no aesthetic approval."""
import contextlib
import io
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

SKILL = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SKILL / 'scripts'))
import director
from directorlib.authoring import initialize
from directorlib.common import read_json, write_json
from directorlib.workbench_review import initialize_workbench_review, check_workbench_review


class BoundaryTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def cli(self, *args):
        output = io.StringIO()
        with patch.object(sys, 'argv', ['director', *map(str, args)]), contextlib.redirect_stdout(output):
            code = director.main()
        return code, json.loads(output.getvalue())

    def test_missing_visual_is_not_valid_and_valid_structure_is_not_review(self):
        project = self.root / 'director'
        initialize(project, example=True)
        board = read_json(project / 'storyboard.json')
        for shot in board['shots']:
            shot['visual'] = dict(question='比较什么', form='scene', subject='选项',
                                  action='选择', result='保留主项', continuity='接续结果')
        write_json(project / 'storyboard.json', board)
        code, result = self.cli('check', project)
        self.assertEqual(code, 0)
        self.assertEqual(result['actionImplementation'], 'not_reviewed')
        board = read_json(project / 'storyboard.json')
        board['shots'][0]['visual'] = None
        write_json(project / 'storyboard.json', board)
        code, result = self.cli('check', project)
        self.assertEqual(code, 2)
        self.assertFalse(result['valid'])

    def test_doctor_runs_foundation_and_propagates_not_ready(self):
        response = subprocess.CompletedProcess([], 0, json.dumps({'ready': False}), '')
        with patch('director.subprocess.run', return_value=response) as run:
            code, result = self.cli('doctor', '--backend', 'remotion')
        self.assertEqual(code, 2)
        self.assertIn('--backend', run.call_args.args[0])
        self.assertEqual(result['audiovisualReview'], 'not_reviewed')

    def fixture(self):
        clip = {'id': 'c1', 'cardId': 'test', 'start': 0, 'duration': 30,
                'inOffset': 0, 'speed': 1, 'opacity': 1, 'scale': 1, 'x': 0, 'y': 0, 'props': {}}
        write_json(self.root / 'edit.json', {'name': 'test', 'fps': 30, 'width': 1280,
                   'height': 720, 'tracks': [{'id': 't1', 'name': 'shot', 'clips': [clip]}]})
        (self.root / 'film.mp4').write_bytes(b'synthetic fixture, not playable')

    def probe(self, *args, **kwargs):
        if '--input-type=module' in args[0]:
            return self.real_run(*args, **kwargs)
        return subprocess.CompletedProcess([], 0, json.dumps({'streams': [{
            'codec_type': 'video', 'width': 1280, 'height': 720,
            'avg_frame_rate': '30/1', 'nb_read_frames': '30'}]}), '')

    def test_workbench_pending_evidence_and_stale_bindings(self):
        self.fixture()
        self.real_run = subprocess.run
        with patch('directorlib.workbench_review.subprocess.run', side_effect=self.probe):
            initialize_workbench_review(self.root, 'edit.json', 'film.mp4')
            self.assertEqual(check_workbench_review(self.root)['status'], 'not_reviewed')
            report = read_json(self.root / 'workbench-review.json')
            for check in report['checks']:
                check['status'] = 'passed'
            write_json(self.root / 'workbench-review.json', report)
            self.assertEqual(check_workbench_review(self.root)['status'], 'failed')
            for check in report['checks']:
                kind = 'metadata' if check['category'] in ('technical', 'audio') else 'playback'
                check['evidence'] = [{'kind': kind, 'path': 'film.mp4', 'description': 'synthetic test only', 'checked': True}]
            write_json(self.root / 'workbench-review.json', report)
            self.assertEqual(check_workbench_review(self.root)['status'], 'passed')
            report['issues'] = [{'issueId': 'i1', 'category': 'motion', 'clipId': 'c1',
                                 'timeRange': {'startFrame': 0, 'endFrame': 10},
                                 'expected': '动作兑现', 'evidence': report['checks'][0]['evidence'],
                                 'status': 'failed'}]
            write_json(self.root / 'workbench-review.json', report)
            self.assertEqual(check_workbench_review(self.root)['status'], 'failed')
            (self.root / 'film.mp4').write_bytes(b'changed video')
            with self.assertRaisesRegex(ValueError, '过期'):
                check_workbench_review(self.root)
            (self.root / 'film.mp4').write_bytes(b'synthetic fixture, not playable')
            project = read_json(self.root / 'edit.json')
            project['name'] = 'changed'
            write_json(self.root / 'edit.json', project)
            with self.assertRaisesRegex(ValueError, '过期'):
                check_workbench_review(self.root)

    def test_media_mismatch_rejected(self):
        self.fixture()
        self.real_run = subprocess.run
        project = read_json(self.root / 'edit.json')
        project['tracks'][0]['clips'][0]['duration'] = 31
        write_json(self.root / 'edit.json', project)
        with patch('directorlib.workbench_review.subprocess.run', side_effect=self.probe):
            with self.assertRaisesRegex(ValueError, '不符'):
                initialize_workbench_review(self.root, 'edit.json', 'film.mp4')


if __name__ == '__main__':
    unittest.main()
