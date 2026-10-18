import importlib.util
import sys
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('competition_contract',ROOT/'modules/scenes/contract.py')
contract=importlib.util.module_from_spec(spec);spec.loader.exec_module(contract)

class CompetitionRoutesTests(unittest.TestCase):
    def test_phases_reject_mismatched_spaces_and_invalid_events(self):
        base={'phase':'training','environment':'training','heading':'解题训练','kicker':'看兴趣',
              'labels':['分析','编码','复盘'],'startEvent':'begin','completeEvent':'done','sourceShots':[]}
        events=[{'id':'begin','localFrame':36},{'id':'done','localFrame':200},{'id':'exit','localFrame':300}]
        for phase,space in [('question','workspace'),('training','training'),('cost','atlas'),('trial','atlas'),('project','workshop')]:
            contract.validate('scenes.competition-routes.v1',{**base,'phase':phase,'environment':space},events,[])
        for patch in [{'environment':'workspace'},{'completeEvent':'begin'},{'startEvent':'exit'},{'sourceShots':['future']},{'unsupported':1}]:
            with self.assertRaises(ValueError):contract.validate('scenes.competition-routes.v1',{**base,**patch},events,[])
        with self.assertRaises(ValueError):contract.validate('scenes.competition-routes.v1',base,events,[{'id':'stray'}])

    def test_decision_needs_distinct_card_sources(self):
        params={'phase':'decision','environment':'atlas','heading':'选择','kicker':'按目标',
                'labels':['竞赛','开发','适合自己'],'startEvent':'begin','completeEvent':'done','sourceShots':['train','work']}
        events=[{'id':'begin','localFrame':36},{'id':'done','localFrame':200}]
        contract.validate('scenes.competition-routes.v1',params,events,[])
        for sources in [[],['train'],['train','train']]:
            with self.assertRaises(ValueError):contract.validate('scenes.competition-routes.v1',{**params,'sourceShots':sources},events,[])

    def test_paced_board_requires_ordered_reading_and_handoff_events(self):
        params={'phase':'cost','environment':'training','heading':'投入','kicker':'看时间',
          'labels':['竞赛','课程','项目'],'startEvent':'read','completeEvent':'complete','sourceShots':[],
          'presentation':'paced','settleEvent':'settle','readEvent':'read','prepareEvent':'prepare','handoffEvent':'handoff',
          'budgetLabel':'预算示意','calendarLabel':'两周试练','prepareLabel':'训练需要时间'}
        events=[{'id':name,'localFrame':f} for name,f in [('settle',72),('read',84),('complete',250),('prepare',300),('handoff',320),('exit',333)]]
        contract.validate('scenes.competition-routes.v1',params,events,[])
        for patch in [{'readEvent':'settle'},{'prepareEvent':'read'},{'handoffEvent':'exit'},{'environment':'atlas'},{'presentation':'unknown'}]:
            with self.assertRaises(ValueError):contract.validate('scenes.competition-routes.v1',{**params,**patch},events,[])
        spatial={**params,'presentation':'cinematic','environment':'workspace'}
        for phase in ['question','training','cost','trial']:
            contract.validate('scenes.competition-routes.v1',{**spatial,'phase':phase},events,[])
        with self.assertRaises(ValueError):
            contract.validate('scenes.competition-routes.v1',{**spatial,'environment':'training'},events,[])
        with self.assertRaisesRegex(ValueError,'retired'):
            contract.validate('scenes.competition-routes.v1',{**spatial,'presentation':'spatial'},events,[])
        for key in ('budgetLabel','calendarLabel','prepareLabel','labels'):
            spatial.pop(key,None)
        contract.validate('scenes.competition-routes.v1',spatial,events,[])

    def test_gameplay_requires_real_ordered_feedback_events(self):
        import copy
        params={'phase':'training','environment':'workspace','heading':'挑战','kicker':'试一试','labels':['分析','编码','复盘'],
                'startEvent':'read','completeEvent':'complete','sourceShots':[],'presentation':'gameplay',
                'settleEvent':'settle','readEvent':'read','prepareEvent':'prepare','handoffEvent':'handoff',
                'budgetLabel':'时间','calendarLabel':'试练','prepareLabel':'投入'}
        keys=['boardTitle','idle','active','passed','checks','boardFooter','budgetUnit','competition','course','project','calendarTitle','calendarFooter','settled']
        params['feedbackLabels']={key:'状态' for key in keys};params['feedbackCues']=[]
        events=[{'id':n,'localFrame':f} for n,f in [('settle',30),('read',42),('complete',220),('prepare',240),('handoff',280),('exit',300)]]
        for kind,index,times in [('node',i,(50+i*32,80+i*32,92+i*32)) for i in range(4)]+[('confirm',0,(190,200,214))]:
            c={'kind':kind,'index':index}
            for key,f in zip(['startEvent','hitEvent','endEvent'],times):
                c[key]=f'{kind}{index}{key}';events.append({'id':c[key],'localFrame':f})
            params['feedbackCues'].append(c)
        contract.validate('scenes.competition-routes.v1',params,events,[])
        minimal=copy.deepcopy(params)
        for key in ('budgetLabel','calendarLabel','prepareLabel','labels'):minimal.pop(key)
        for key in ('calendarTitle','calendarFooter','settled'):minimal['feedbackLabels'].pop(key)
        contract.validate('scenes.competition-routes.v1',minimal,events,[])
        minimal['feedbackLabels'].pop('boardTitle')
        with self.assertRaisesRegex(ValueError,'feedbackLabels'):
            contract.validate('scenes.competition-routes.v1',minimal,events,[])
        for patch in ['overlap','missing-event','early-confirm','duplicate','wrong-mode','unknown-label']:
            p=copy.deepcopy(params)
            if patch=='overlap':p['feedbackCues'][1]['startEvent']=p['feedbackCues'][0]['startEvent']
            if patch=='missing-event':p['feedbackCues'][0]['hitEvent']='missing'
            if patch=='early-confirm':p['feedbackCues'][-1]['hitEvent']='read'
            if patch=='duplicate':p['feedbackCues'][1]['index']=0
            if patch=='wrong-mode':p['presentation']='cinematic'
            if patch=='unknown-label':p['feedbackLabels']['extra']='状态'
            with self.subTest(patch=patch),self.assertRaises(ValueError):contract.validate('scenes.competition-routes.v1',p,events,[])

if __name__=='__main__':unittest.main()
