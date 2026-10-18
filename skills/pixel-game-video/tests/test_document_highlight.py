import copy
import importlib.util
from pathlib import Path
import unittest

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('document_contract',ROOT/'modules/scenes/contract.py')
contract=importlib.util.module_from_spec(spec);spec.loader.exec_module(contract)


class DocumentHighlightTests(unittest.TestCase):
    def setUp(self):
        keys='target identity backend frontend preview contract search locate range highlight plain document break page table hidden theory actual mismatch check yes no previous next found success normal experience why fallback limit interview candidate question rawPhone rawIdentity'.split()
        self.params={'phase':'search','environment':'workshop','heading':'校验目标','kicker':'位置示意',
                     'labels':{key:'标签' for key in keys},'stageEvents':['begin','compare','found']}
        self.events=[{'id':key,'localFrame':value} for key,value in [('begin',20),('compare',80),('found',140),('exit',200)]]

    def test_accepts_bounded_ordered_search_and_rejects_unreachable_states(self):
        contract.validate('scenes.document-highlight.v1',self.params,self.events,[])
        for stages in [[],['missing'],['exit'],['compare','begin'],['found','found']]:
            with self.subTest(stages=stages),self.assertRaises(ValueError):
                contract.validate('scenes.document-highlight.v1',{**self.params,'stageEvents':stages},self.events,[])

    def test_incomplete_labels_or_unknown_execution_capabilities_fail(self):
        for key,value in [('phase','unknown'),('environment','unknown'),('extra',True)]:
            with self.subTest(key=key),self.assertRaises(ValueError):
                contract.validate('scenes.document-highlight.v1',{**self.params,key:value},self.events,[])
        params=copy.deepcopy(self.params);del params['labels']['target']
        with self.assertRaises(ValueError):contract.validate('scenes.document-highlight.v1',params,self.events,[])
        with self.assertRaises(ValueError):contract.validate('scenes.document-highlight.v1',self.params,self.events,[{'id':'unowned'}])

if __name__=='__main__':unittest.main()
