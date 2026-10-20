"""Whole-frame compilation preserves event boundaries and protects edited art."""
import importlib.util,json,os,sys,tempfile,unittest
from pathlib import Path
from PIL import Image
SKILL=Path(__file__).resolve().parents[1];sys.path.insert(0,str(SKILL/'scripts'))
spec=importlib.util.spec_from_file_location('whole_illustration',SKILL/'scripts/render-illustration.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)


class WholeIllustrationTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup);self.project=Path(self.temp.name)
        (self.project/'media').mkdir();Image.new('RGB',(160,90),'red').save(self.project/'media/a.png');Image.new('RGB',(160,90),'blue').save(self.project/'media/b.png')
        self.board={'shots':[{'id':'s1','durationFrames':12,'events':[{'id':'change','frame':6}]}]}
        self.plan={'schemaVersion':1,'shotId':'s1','output':'media/clip.mp4','states':[{'event':'enter','file':'media/a.png'},{'event':'change','file':'media/b.png'}]}
        self.save('storyboard.json',self.board);self.save('production-plan.json',{'output':{'fps':60,'width':160,'height':90}});self.save('illustration-plan.json',self.plan)

    def save(self,name,value):(self.project/name).write_text(json.dumps(value),encoding='utf-8')

    def test_storyboard_events_and_art_bytes_invalidate_clip(self):
        original=module.compile_plan(self.project)[2]['sourceHash']
        self.board['shots'][0]['events'][0]['frame']=7;self.save('storyboard.json',self.board)
        self.assertNotEqual(original,module.compile_plan(self.project)[2]['sourceHash'])
        changed=module.compile_plan(self.project)[2]['sourceHash'];Image.new('RGB',(160,90),'green').save(self.project/'media/b.png')
        self.assertNotEqual(changed,module.compile_plan(self.project)[2]['sourceHash'])

    def test_reversed_exit_and_escaping_sources_are_rejected(self):
        for states in [list(reversed(self.plan['states'])),[self.plan['states'][0],{'event':'exit','file':'media/b.png'}],
                       [self.plan['states'][0],{'event':'change','file':'media/../../outside.png'}]]:
            self.plan['states']=states;self.save('illustration-plan.json',self.plan)
            with self.assertRaises(ValueError):module.compile_plan(self.project)

    def test_unowned_output_is_never_replaced(self):
        output=self.project/'media/clip.mp4';output.write_bytes(b'personal edit')
        with self.assertRaisesRegex(ValueError,'unowned or edited'):module.render(self.project)
        self.assertEqual(output.read_bytes(),b'personal edit')

    @unittest.skipUnless(os.environ.get('PIXEL_FFMPEG') and os.environ.get('PIXEL_FFPROBE'),'Requires configured ffmpeg/ffprobe')
    def test_decoded_pose_switch_occurs_on_its_exact_event_frame(self):
        import subprocess
        Image.new('RGB',(161,91),'green').save(self.project/'media/c.png')
        self.board['shots'][0]['durationFrames']=24
        self.board['shots'][0]['events'] += [{'id':'third','frame':12},{'id':'back','frame':18}]
        self.plan['states'] += [{'event':'third','file':'media/c.png'},{'event':'back','file':'media/a.png'}]
        self.save('storyboard.json',self.board);self.save('illustration-plan.json',self.plan)
        result=module.render(self.project);self.assertEqual(result['decodedFrames'],24)
        raw=subprocess.check_output([os.environ['PIXEL_FFMPEG'],'-v','error','-i',str(self.project/'media/clip.mp4'),'-f','rawvideo','-pix_fmt','rgb24','-'])
        frame_bytes=160*90*3
        # Includes a differently sized third image, plus a return to the first.
        # Every boundary must survive normalization/concatenation, not just frame 6.
        for frame in range(24):
            offset=frame*frame_bytes+(45*160+80)*3
            pixel=raw[offset:offset+3]
            active=0 if frame<6 or frame>=18 else 2 if frame<12 else 1
            self.assertGreater(pixel[active],110 if active==1 else 200)
            self.assertTrue(all(pixel[c]<30 for c in range(3) if c!=active))
        self.board['shots'][0]['events'][0]['frame']=7;self.save('storyboard.json',self.board)
        with self.assertRaisesRegex(ValueError,'stale'):module.render(self.project,check=True)


if __name__=='__main__':unittest.main()
