"""Observable compilation invariants; run with unittest discovery."""
import copy
import json
from pathlib import Path
import shutil
import sys
import tempfile
import unittest

SKILL = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SKILL))
from engine.compiler import compile_project, read_json, write_json


class ContractTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name) / "project"
        shutil.copytree(SKILL / "assets/project-template", self.root)

    def tearDown(self):
        self.temp.cleanup()

    def change(self, file, fn):
        data = read_json(self.root / file)
        fn(data)
        write_json(self.root / file, data)

    def test_events_move_text_audio_and_motion_together(self):
        before_bytes = {p.name: p.read_bytes() for p in self.root.glob("*.json")}
        before = compile_project(self.root)
        self.assertEqual(before["durationFrames"], 720)
        self.assertEqual(before_bytes, {p.name: p.read_bytes() for p in self.root.glob("*.json")})
        self.change("timeline.json", lambda d: d["shots"][0].update(durationFrames=300))
        after = compile_project(self.root)
        self.assertEqual(after["events"]["s02.enter"], before["events"]["s02.enter"] + 60)
        self.assertEqual(after["cues"][1]["startFrame"], before["cues"][1]["startFrame"] + 60)
        self.assertEqual(after["audio"][1]["frame"], before["audio"][1]["frame"] + 60)
        self.assertEqual(after["shots"][1]["motions"][0]["startFrame"], before["shots"][1]["motions"][0]["startFrame"] + 60)
        self.assertNotEqual(after["inputHash"], before["inputHash"])

    def test_unknown_event_and_unimplemented_recipe_fail(self):
        self.change("audio.json", lambda d: d["cues"][0]["at"].update(event="s01.missing"))
        with self.assertRaisesRegex(ValueError, "unknown event"):
            compile_project(self.root)
        shutil.copy2(SKILL / "assets/project-template/audio.json", self.root)
        self.change("timeline.json", lambda d: d["shots"][0]["motions"][0].update(recipe="motion.imaginary.v1"))
        with self.assertRaisesRegex(ValueError, "unavailable capability"):
            compile_project(self.root)

    def test_motion_overflow_and_overlapping_subtitles_fail(self):
        self.change("timeline.json", lambda d: d["shots"][0]["motions"][0].update(durationFrames=300))
        with self.assertRaisesRegex(ValueError, "outside shot"):
            compile_project(self.root)
        shutil.copy2(SKILL / "assets/project-template/timeline.json", self.root)
        def overlap(data):
            extra = copy.deepcopy(data["cues"][0])
            extra["id"] = "overlap"
            data["cues"].append(extra)
        self.change("text.json", overlap)
        with self.assertRaisesRegex(ValueError, "overlapping subtitles"):
            compile_project(self.root)

    def test_sound_variant_and_extra_parameter_fail(self):
        self.change("audio.json", lambda d: d["cues"][0].update(variant=99))
        with self.assertRaisesRegex(ValueError, "variant"):
            compile_project(self.root)
        shutil.copy2(SKILL / "assets/project-template/audio.json", self.root)
        self.change("timeline.json", lambda d: d["shots"][0]["params"].update(unknown=1))
        with self.assertRaisesRegex(ValueError, "unsupported parameters"):
            compile_project(self.root)

    def test_strict_frames_and_boundary_audio(self):
        self.change("timeline.json", lambda d: d["shots"][0].update(durationFrames=240.5))
        with self.assertRaises(ValueError):
            compile_project(self.root)
        shutil.copy2(SKILL / "assets/project-template/timeline.json", self.root)
        self.change("audio.json", lambda d: d["cues"][0]["at"].update(event="s03.exit"))
        with self.assertRaisesRegex(ValueError, "outside video"):
            compile_project(self.root)

    def test_hash_and_compilation_deterministic(self):
        self.assertEqual(compile_project(self.root), compile_project(self.root, write=True))
        self.assertTrue((self.root / "build/project-lock.json").is_file())

    def test_presenter_board_requires_a_presenter_and_existing_unique_objects(self):
        data=read_json(self.root/'timeline.json');shot=data['shots'][0]
        shot.update(scene='scenes.presenter-board.v1',actor='actor.azong.v3',motions=[],
                    objects=[{'id':'cap','asset':'prop.grad-cap.v1','x':.49,'y':.49}],
                    params={'layout':'hero','heading':'选择条件','kicker':'目标先行',
                            'items':[{'object':'cap','label':'读研','detail':'研究兴趣','event':'reveal'}]})
        write_json(self.root/'timeline.json',data);compile_project(self.root)
        shot['actor']=None;write_json(self.root/'timeline.json',data)
        with self.assertRaisesRegex(ValueError,'requires a presenter'):compile_project(self.root)
        shot['actor']='actor.azong.v3';shot['params']['items'][0]['object']='missing';write_json(self.root/'timeline.json',data)
        with self.assertRaisesRegex(ValueError,'existing object'):compile_project(self.root)

    def test_counter_backwards_and_invisible_exit_events_fail(self):
        def counter(data):
            shot = data["shots"][0]
            shot["scene"] = "scenes.counter.v1"
            shot["params"] = {"from": 0, "to": 3, "startEvent": "reveal", "endEvent": "enter"}
        self.change("timeline.json", counter)
        with self.assertRaises(ValueError):
            compile_project(self.root)
        shutil.copy2(SKILL / "assets/project-template/timeline.json", self.root)
        self.change("timeline.json", lambda d: d["shots"][1]["params"]["items"][0].update(event="exit"))
        with self.assertRaises(ValueError):
            compile_project(self.root)

    def test_counter_requires_safe_integers_and_distinct_frames(self):
        def counter(data):
            shot = data["shots"][0]
            shot["scene"] = "scenes.counter.v1"
            shot["params"] = {"from": 0, "to": 3, "startEvent": "enter", "endEvent": "reveal"}
        self.change("timeline.json", counter)
        compile_project(self.root)
        for invalid in (1.5, True, 9007199254740992):
            self.change("timeline.json", lambda d: d["shots"][0]["params"].update(to=invalid))
            with self.assertRaisesRegex(ValueError, "safe integer"):
                compile_project(self.root)
        self.change("timeline.json", lambda d: d["shots"][0]["params"].update(to=3))
        self.change("timeline.json", lambda d: d["shots"][0]["events"][0].update(frame=0))
        with self.assertRaisesRegex(ValueError, "after startEvent"):
            compile_project(self.root)


if __name__ == "__main__":
    unittest.main()
