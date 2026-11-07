import json
from pathlib import Path
import shutil
import sys
import tempfile
import unittest
from unittest.mock import patch

SKILL=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(SKILL))
from engine.compiler import compile_project,read_json,write_json
from engine.change_report import snapshot,plan,inspect


class ChangeReportTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.root=Path(self.temp.name)/'project'
        shutil.copytree(SKILL/'assets/project-template',self.root)

    def tearDown(self):
        self.temp.cleanup()

    def test_read_only_local_change_and_neighbours(self):
        resolved=compile_project(self.root)
        before=snapshot(resolved,SKILL)
        write_json(self.root/'build/project-state.json',before)
        self.assertEqual(inspect(self.root,SKILL)['changed'],[])
        text=read_json(self.root/'text.json');text['cues'][1]['text']='修改这一镜的字幕。'
        write_json(self.root/'text.json',text)
        old=(self.root/'build/project-state.json').read_bytes()
        report=inspect(self.root,SKILL)
        self.assertEqual([x['shotId'] for x in report['changed']],['s02'])
        self.assertEqual(report['reviewShots'],['s01','s02','s03'])
        self.assertEqual(report['preview'],'rebuild_required')
        self.assertEqual(old,(self.root/'build/project-state.json').read_bytes())

    def test_duration_shifts_downstream_and_preflight_is_advisory(self):
        before=snapshot(compile_project(self.root),SKILL)
        timeline=read_json(self.root/'timeline.json');timeline['shots'][0]['durationFrames']+=60
        write_json(self.root/'timeline.json',timeline)
        after=compile_project(self.root);report=plan(snapshot(after,SKILL),before,after)
        self.assertEqual(len(report['changed']),3)
        self.assertIn('startFrame',report['changed'][1]['reasons'])
        self.assertEqual(report['review'],'not_reviewed')
        self.assertEqual(report['preflight']['visualReview'],'not_reviewed')

    def test_component_usage_and_runtime_version(self):
        resolved=compile_project(SKILL/'examples/speech-rehearsal')
        report=plan(snapshot(resolved,SKILL),resolved=resolved)
        self.assertEqual(report['components']['components.identity.v1']['shots'],['s01'])
        self.assertEqual(report['preflight']['issues'][0]['kind'],'tail-hold')
        self.assertEqual(len(report['components']['components.identity.v1']['implementationHash']),64)

    def test_failed_build_does_not_advance_successful_baseline(self):
        import importlib.util
        spec=importlib.util.spec_from_file_location('video_change_test',SKILL/'scripts/video.py')
        cli=importlib.util.module_from_spec(spec);spec.loader.exec_module(cli)
        previous=snapshot(compile_project(self.root),SKILL)
        write_json(self.root/'build/project-state.json',previous)
        with patch('engine.builder.build',side_effect=RuntimeError('test build failure')):
            with self.assertRaisesRegex(RuntimeError,'test build failure'):
                cli.build(self.root)
        self.assertEqual(read_json(self.root/'build/project-state.json'),previous)


if __name__=='__main__':unittest.main()
