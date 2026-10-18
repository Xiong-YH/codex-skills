import copy
import importlib.util
import json
from pathlib import Path
import shutil
import sys
import tempfile
import unittest
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from engine.compiler import compile_project,read_json,write_json
from engine.builder import build


class ComponentMediaTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup)
        self.project=Path(self.tmp.name)/'project'
        shutil.copytree(ROOT/'assets/project-template',self.project)
        config=read_json(self.project/'project.json');config.update(style='style.pixel-editorial.v1',audioMode='silent');write_json(self.project/'project.json',config)
        write_json(self.project/'audio.json',{'cues':[]});write_json(self.project/'text.json',{'cues':[]})
        self.shot={'id':'s1','scene':'scenes.canvas.v1','actor':None,'durationFrames':180,'events':[{'id':'begin','frame':10},{'id':'done','frame':100}],
                   'components':[{'id':'metric','kind':'metric','x':.2,'y':.2,'width':.6,'height':.5,'data':{'title':'计数','from':0,'to':3,'startEvent':'begin','endEvent':'done'}}]}
        self.save()

    def save(self):write_json(self.project/'timeline.json',{'shots':[self.shot]})

    def test_component_dependency_and_final_event_are_compiled(self):
        result=compile_project(self.project,write=True)
        build(self.project,result,ROOT,silent=True)
        runtime=(self.project/'build/runtime.js').read_text(encoding='utf-8')
        self.assertIn('P.components=',runtime)
        self.assertEqual(result['shots'][0]['components'][0]['data']['endEvent'],'done')

    def test_invalid_events_fields_and_geometry_rejected(self):
        original=copy.deepcopy(self.shot)
        mutations=[lambda c:c['data'].update(endEvent='exit'),lambda c:c['data'].update(endEvent='begin'),
                   lambda c:c.update(x=.9),lambda c:c['data'].update(extra='unsupported'),lambda c:c['data'].update(to=True)]
        for mutate in mutations:
            self.shot=copy.deepcopy(original);mutate(self.shot['components'][0]);self.save()
            with self.assertRaises(ValueError):compile_project(self.project)

    def test_future_snapshot_is_rejected(self):
        self.shot['components'][0].update(kind='identity',data={'title':'快照','sourceShot':'s1'});self.save()
        with self.assertRaisesRegex(ValueError,'preceding'):compile_project(self.project)

    def test_images_affect_hash_and_are_embedded_and_exported(self):
        media=self.project/'media';media.mkdir();image=media/'plate.png'
        Image.new('RGB',(64,36),'#ff0000').save(image)
        self.shot['background']={'file':'media/plate.png'};self.save()
        before=compile_project(self.project,write=True)
        Image.new('RGB',(64,36),'#00ff00').save(image)
        after=compile_project(self.project,write=True)
        self.assertNotEqual(before['inputHash'],after['inputHash'])
        build(self.project,after,ROOT,silent=True)
        self.assertIn('@s1.background',read_json(self.project/'build/payload.json')['assets'])
        spec=importlib.util.spec_from_file_location('media_export',ROOT/'scripts/video.py');cli=importlib.util.module_from_spec(spec);spec.loader.exec_module(cli)
        export=Path(self.tmp.name)/'export';cli.export_project(self.project,export)
        self.assertEqual(image.read_bytes(),(export/'project/media/plate.png').read_bytes())
        self.assertEqual(compile_project(export/'project')['durationFrames'],180)

    def test_media_paths_and_types_cannot_escape_or_use_trim_for_images(self):
        for source in [{'file':'../outside.png'},{'file':'C:/outside.png'},{'file':'project.json'},{'file':'media/../project.json'}]:
            self.shot['background']=source;self.save()
            with self.assertRaises(ValueError):compile_project(self.project)
        (self.project/'media').mkdir();Image.new('RGB',(64,36)).save(self.project/'media/plate.png')
        self.shot['background']={'file':'media/plate.png','trimStartSeconds':1};self.save()
        with self.assertRaisesRegex(ValueError,'Still images'):compile_project(self.project)

    def test_snapshot_graph_can_only_reference_earlier_shots(self):
        second=copy.deepcopy(self.shot);second['id']='s2';second['components'][0].update(kind='identity',data={'title':'回顾','sourceShot':'s1'})
        write_json(self.project/'timeline.json',{'shots':[self.shot,second]})
        self.assertEqual(compile_project(self.project)['durationFrames'],360)


if __name__=='__main__':unittest.main()
