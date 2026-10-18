"""Narration media bindings and semantic scene boundaries, independent of topic wording."""
from pathlib import Path
import hashlib,importlib.util,json,shutil,sys,tempfile,unittest,wave
import numpy as np

SKILL=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(SKILL))
from engine.compiler import compile_project,read_json,write_json
spec=importlib.util.spec_from_file_location('tested_narration',SKILL/'modules/audio/narration.py')
N=importlib.util.module_from_spec(spec);spec.loader.exec_module(N)

class CacheNarrationTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup)
        self.root=Path(self.tmp.name)/'project';shutil.copytree(SKILL/'assets/project-template',self.root)
        self.media=self.root/'media';self.media.mkdir()
        self.clip=self.media/'voice.wav'
        with wave.open(str(self.clip),'wb') as f:
            f.setparams((1,2,48000,0,'NONE','not compressed'));f.writeframes((np.sin(np.arange(12000)*.07)*2000).astype('<i2').tobytes())

    def narrated(self,**cue):
        p=read_json(self.root/'project.json');p['audioMode']='narration+sfx';write_json(self.root/'project.json',p)
        write_json(self.root/'audio.json',{'cues':[],'narration':[{'id':'v1','file':'media/voice.wav','at':{'event':'s01.enter','offsetFrames':60},'gain':.9,**cue}]})

    def test_voice_media_content_is_bound_to_project_hash(self):
        self.narrated();before=compile_project(self.root,write=True)
        self.assertEqual(before['narration'][0]['samples'],12000)
        self.assertIn('media/voice.wav',read_json(self.root/'build/project-lock.json')['inputFiles'])
        with wave.open(str(self.clip),'wb') as f:
            f.setparams((1,2,48000,0,'NONE','not compressed'));f.writeframes(b'\0\0'*12000)
        self.assertNotEqual(before['inputHash'],compile_project(self.root)['inputHash'])

    def test_voice_starts_at_its_event_with_no_earlier_samples(self):
        self.narrated();resolved=compile_project(self.root)
        mixed,records=N.mix(resolved,self.root,np.zeros((576000,2)))
        self.assertFalse(np.any(mixed[:48000]));self.assertTrue(np.any(mixed[48000:60000]));self.assertFalse(np.any(mixed[60000:]))
        self.assertEqual(records[0]['startSample'],48000)

    def test_duck_changes_sfx_only_and_releases_after_voice(self):
        self.narrated();resolved=compile_project(self.root)
        source=np.full((576000,2),.01)
        voice,_=N.mix(resolved,self.root,np.zeros_like(source))
        default,_=N.mix(resolved,self.root,source)
        resolved['mix']['speechDuck']=.55
        changed,records=N.mix(resolved,self.root,source)
        voice_after,_=N.mix(resolved,self.root,np.zeros_like(source))
        np.testing.assert_array_equal(voice,voice_after)
        np.testing.assert_allclose((default-voice)[48000:60000],.0028,atol=1e-15)
        np.testing.assert_allclose((changed-voice)[48000:60000],.0055,atol=1e-15)
        np.testing.assert_allclose((changed-voice)[70000:71000],.01,atol=1e-15)
        self.assertEqual(records[0]['startSample'],48000)

    def test_voice_escape_overflow_and_overlap_are_rejected(self):
        self.narrated(file='../outside.wav')
        with self.assertRaisesRegex(ValueError,'inside the project'):compile_project(self.root)
        self.narrated(at={'event':'s03.exit','offsetFrames':-1})
        with self.assertRaisesRegex(ValueError,'outside video'):compile_project(self.root)
        self.narrated();a=read_json(self.root/'audio.json');a['narration'].append({**a['narration'][0],'id':'v2'});write_json(self.root/'audio.json',a)
        with self.assertRaisesRegex(ValueError,'overlap'):compile_project(self.root)

    def test_scene_requires_ordered_events_and_explicit_data_labels(self):
        t=read_json(self.root/'timeline.json');s=t['shots'][0]
        labels={k:k for k in ('requester','origin','cache','dataA','dataB','hit','miss','copy','longRoute','shortRoute','result')}
        s.update(scene='scenes.cache-journey.v1',actor=None,objects=[],motions=[],params={'phase':'hit','environment':'workspace','startEvent':'enter','arriveEvent':'reveal','completeEvent':'done','labels':labels})
        s['events'].append({'id':'done','frame':180});write_json(self.root/'timeline.json',t)
        compile_project(self.root)
        s['scene']='scenes.cache-adventure.v1';write_json(self.root/'timeline.json',t)
        with self.assertRaisesRegex(ValueError,'requires an actor'):compile_project(self.root)
        s['actor']='actor.azong.v3';write_json(self.root/'timeline.json',t);compile_project(self.root)
        s['params']['completeEvent']='enter';write_json(self.root/'timeline.json',t)
        with self.assertRaisesRegex(ValueError,'start < arrive < complete'):compile_project(self.root)

if __name__=='__main__':unittest.main()
