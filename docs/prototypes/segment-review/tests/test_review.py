"""Portable storage and real-source mapping checks. No browser or media copying."""
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import server
from project_source import manifest

class ReviewTests(unittest.TestCase):
    def raw(self):
        return {'module':'components','title':'版本图','design':'同一能力配置','configuration':{'visualStyle':'plain'},'basis':'current-render','capabilityId':'custom.version-card','tags':['版本'],'applicability':'比较版本状态','source':{'projectId':'demo','segmentId':'s1.enter','shotId':'s1','event':'enter','atomId':'s1.card','sourceVideoSha256':'a'*64,'timeSeconds':0}}
    def test_dedup_ignores_reworded_design_and_keeps_approval_scope(self):
        raw=self.raw();a=server.normalize(raw);raw['design']='说明换了一种说法';b=server.normalize(raw)
        self.assertEqual(a['contentHash'],b['contentHash'])
        self.assertEqual(a['sources'][0]['atomId'],'s1.card')
        self.assertFalse(a['approval']['wholeVideoApproved'])
    def test_rejects_large_and_nonfinite_config(self):
        for val in ['x'*121,float('nan'),float('inf')]:
            raw=self.raw();raw['configuration']['bad']=val
            with self.assertRaises(ValueError):server.normalize(raw)
    def test_capacity_rejection_preserves_previous_file(self):
        with tempfile.TemporaryDirectory() as temp:
            path=Path(temp)/'favorites.json';item=server.normalize(self.raw());server.atomic_save(path,{'schemaVersion':1,'items':[item]});original=path.read_bytes()
            with patch.object(server,'MAX_ITEMS',1):
                with self.assertRaises(ValueError):server.atomic_save(path,{'schemaVersion':1,'items':[item,item]})
            with patch.object(server,'MAX_BYTES',20):
                with self.assertRaises(ValueError):server.atomic_save(path,{'schemaVersion':1,'items':[item]})
            self.assertEqual(path.read_bytes(),original)
    def test_source_events_and_hashes_drive_manifest(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp);sources={'brief.json':{'id':'example'},'script.json':{'labels':[{'id':'lead','text':'原句'}],'cues':[]},'storyboard.json':{'shots':[{'id':'s1','durationFrames':360,'scene':'scenes.canvas.v1','events':[{'id':'copy','frame':132},{'id':'edit','frame':240}]}]},'production-plan.json':{'id':'plan','title':'示例','style':'pixel','output':{'fps':60},'shots':[{'id':'s1'}]}}
            for name,value in sources.items():(root/name).write_text(json.dumps(value),encoding='utf-8')
            out=root/'video/outputs';out.mkdir(parents=True);(out/'film.mp4').write_bytes(b'media-hash-fixture')
            first=manifest(root)
            self.assertEqual([s['start'] for s in first['segments']],[0,2.2,4])
            self.assertEqual(first['project']['durationSeconds'],6)
            self.assertTrue(all(o['sourceRefs'] for o in first['objects']))
            draft={'schemaVersion':1,'shots':[{'id':sid,'title':sid,'narration':'讲解','visual':'画面','transition':'直切后落稳','category':'普通内容片段'} for sid in ('s1','s2')]}
            (root/'review-script.json').write_text(json.dumps(draft),encoding='utf-8')
            with_script=manifest(root)
            self.assertEqual([s['status'] for s in with_script['scriptReview']['shots']],['rendered','planned'])
            self.assertEqual(with_script['project']['durationSeconds'],6)
            self.assertEqual(len(with_script['segments']),3)
            self.assertNotIn('start',with_script['scriptReview']['shots'][1])
            self.assertNotEqual(first['project']['revision'],with_script['project']['revision'])
            draft['shots'][0]['poster']='../brief.json'
            (root/'review-script.json').write_text(json.dumps(draft),encoding='utf-8')
            with self.assertRaises(ValueError):manifest(root)
            (root/'review-script.json').unlink()
            self.assertEqual(len(first['checkColumns']),9)  # plus segment / shot identity
            cells=first['segments'][0]['checkDimensions']
            self.assertEqual(cells['duration']['value']['seconds'],2.2)
            self.assertEqual(cells['copy']['value']['projectLabels'][0]['text'],'原句')
            self.assertIsNone(cells['transition']['value']['continuity'])
            self.assertIsNone(cells['background']['value']['replacement'])
            self.assertTrue(all(c['verification']=='not_reviewed' for c in cells.values()))
            sources['script.json']['labels'][0]['text']='新句';(root/'script.json').write_text(json.dumps(sources['script.json']),encoding='utf-8')
            self.assertNotEqual(first['project']['revision'],manifest(root)['project']['revision'])
            self.assertEqual(manifest(root)['segments'][0]['checkDimensions']['copy']['value']['projectLabels'][0]['text'],'新句')
            (root/'review-map.json').write_text(json.dumps({'objects':[{'sourceRefs':[{'file':'missing.json','stableId':'missing'}]}]}),encoding='utf-8')
            with self.assertRaises(ValueError):manifest(root)

if __name__=='__main__':unittest.main()
