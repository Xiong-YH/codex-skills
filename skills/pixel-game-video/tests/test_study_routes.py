import importlib.util
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from engine.compiler import _motion_params, compile_project, read_json, write_json
spec=importlib.util.spec_from_file_location('study_contract',ROOT/'modules/scenes/contract.py')
contract=importlib.util.module_from_spec(spec);spec.loader.exec_module(contract)

class StudyRoutesTests(unittest.TestCase):
    def test_scene_previews_cannot_recurse_or_reference_future(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory)/'project';shutil.copytree(ROOT/'assets/project-template',root)
            project=read_json(root/'project.json');project['style']='style.pixel-study.v1';write_json(root/'project.json',project)
            timeline=read_json(root/'timeline.json');shot=timeline['shots'][-1]
            shot.update(scene='scenes.study-routes.v1',objects=[],motions=[],params={
                'phase':'decision','environment':'atlas','heading':'选路线','kicker':'看目标','labels':['研究','就业','岗位要求'],
                'startEvent':'enter','completeEvent':'route-done','sourceShots':['s01','s02']})
            shot['events'].append({'id':'route-done','frame':150});write_json(root/'timeline.json',timeline)
            compile_project(root)
            for sources in [['s01','s03'],['s01','missing']]:
                shot['params']['sourceShots']=sources;write_json(root/'timeline.json',timeline)
                with self.assertRaisesRegex(ValueError,'preceding shots'):compile_project(root)

    def test_card_destination_stays_on_screen(self):
        _motion_params('motion.scene-to-card.v1',{'x':.54,'y':.30,'width':.29})
        for params in [{'x':.9,'width':.4},{'y':.9,'width':.4},{'width':'large'}]:
            with self.assertRaises(ValueError):_motion_params('motion.scene-to-card.v1',params)

    def test_phase_events_and_preview_contract(self):
        params={'phase':'decision','environment':'atlas','heading':'选路线','kicker':'看目标',
                'labels':['研究','就业','岗位要求'],'startEvent':'start','completeEvent':'end','sourceShots':['research','work']}
        events=[{'id':'start','localFrame':40},{'id':'end','localFrame':170},{'id':'exit','localFrame':288}]
        contract.validate('scenes.study-routes.v1',params,events,[])
        for patch in [{'environment':'workspace'},{'sourceShots':['work','work']},{'completeEvent':'start'},{'startEvent':'exit'}]:
            with self.assertRaises(ValueError):contract.validate('scenes.study-routes.v1',{**params,**patch},events,[])

if __name__=='__main__':unittest.main()
