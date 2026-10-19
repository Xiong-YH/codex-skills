"""Remotion remains a backend choice owned by the existing creative sources."""
from pathlib import Path
import shutil
import sys
import tempfile
import unittest

SKILL = Path(__file__).resolve().parents[1]
FOUNDATION = SKILL.parent / "pixel-game-video"
sys.path.insert(0, str(SKILL / "scripts"))
sys.path.insert(0, str(FOUNDATION))
from directorlib.authoring import handoff, load_sources, transform
from directorlib.common import read_json, write_json
from engine.compiler import compile_project


class RemotionHandoffTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.project = Path(self.temp.name) / "project"
        shutil.copytree(SKILL / "examples/remotion-focus-desk", self.project)

    def tearDown(self):
        self.temp.cleanup()

    def change(self, name, edit):
        path = self.project / name
        data = read_json(path)
        edit(data)
        write_json(path, data)

    def test_backend_and_scene_labels_keep_their_source_owners(self):
        outputs, mappings = transform(load_sources(self.project))
        self.assertEqual(outputs["project.json"]["renderBackend"], "remotion")
        backend = next(m for m in mappings if m["generatedFile"] == "project.json"
                       and m["jsonPointer"] == "/renderBackend")
        self.assertEqual((backend["sourceFile"], backend["stableId"], backend["field"]),
                         ("../production-plan.json", "remotion-focus-desk-plan", "/renderBackend"))
        self.assertEqual(outputs["timeline.json"]["shots"][0]["params"]["heading"], "同时开始，处处打断")
        self.assertEqual(outputs["timeline.json"]["shots"][0]["params"]["labels"], ["写方案", "回消息", "查资料"])
        owners = {m["jsonPointer"]: m for m in mappings if m["generatedFile"] == "timeline.json"}
        for pointer, label_id in [("/shots/0/params/heading", "overloadHeading"),
                                  ("/shots/0/params/labels/0", "mainTask")]:
            self.assertEqual((owners[pointer]["sourceFile"], owners[pointer]["stableId"], owners[pointer]["field"]),
                             ("../script.json", label_id, "/text"))

    def test_omitted_backend_in_existing_plan_defaults_to_canvas(self):
        legacy = Path(self.temp.name) / "legacy"
        shutil.copytree(SKILL / "examples/bounded-choice", legacy)
        path = legacy / "production-plan.json"
        plan = read_json(path)
        plan.pop("renderBackend", None)
        write_json(path, plan)
        original = path.read_bytes()
        outputs, _ = transform(load_sources(legacy))
        self.assertEqual(outputs["project.json"]["renderBackend"], "canvas")
        self.assertEqual(original, path.read_bytes())
        handoff(legacy, FOUNDATION)
        self.assertEqual(compile_project(legacy / "video")["project"]["renderBackend"], "canvas")

    def test_handoff_does_not_add_frames_for_transition_or_change_source_timing(self):
        original = {path.name: path.read_bytes() for path in self.project.glob("*.json")}
        handoff(self.project, FOUNDATION)
        resolved = compile_project(self.project / "video")
        self.assertEqual(resolved["project"]["renderBackend"], "remotion")
        self.assertEqual((resolved["durationFrames"], resolved["durationSeconds"]), (720, 12.0))
        self.assertEqual([s["startFrame"] for s in resolved["shots"]], [0, 240, 480])
        self.assertEqual([s["durationFrames"] for s in resolved["shots"]], [240, 240, 240])
        self.assertEqual(resolved["events"]["s2.choose"], 304)
        self.assertEqual(resolved["events"]["s3.ready"], 626)
        page = resolved["shots"][1]["motions"][0]
        self.assertEqual((page["startFrame"], page["endFrame"]), (240, 288))
        self.assertEqual(resolved["cues"][1]["startFrame"], 300)
        self.assertEqual(original, {name: (self.project / name).read_bytes() for name in original})

    def test_duration_change_ripples_from_storyboard_to_later_runtime_frames(self):
        handoff(self.project, FOUNDATION)
        before = compile_project(self.project / "video")
        self.change("storyboard.json", lambda d: d["shots"][0].update(durationFrames=300))
        self.change("brief.json", lambda d: d.update(durationRangeSeconds=[12.0, 13.0]))
        handoff(self.project, FOUNDATION)
        after = compile_project(self.project / "video")
        self.assertEqual(after["durationFrames"], 780)
        self.assertEqual(after["events"]["s2.choose"], before["events"]["s2.choose"] + 60)
        self.assertEqual(after["cues"][1]["startFrame"], before["cues"][1]["startFrame"] + 60)
        self.assertEqual(after["shots"][1]["motions"][0]["startFrame"], 300)

    def test_scene_text_edit_updates_only_the_owned_script_label(self):
        outputs, _ = transform(load_sources(self.project))
        board_bytes = (self.project / "storyboard.json").read_bytes()
        self.change("script.json", lambda d: next(label for label in d["labels"] if label["id"] == "mainTask").update(text="写报告"))
        changed, _ = transform(load_sources(self.project))
        for before, after in zip(outputs["timeline.json"]["shots"], changed["timeline.json"]["shots"]):
            self.assertEqual(before["params"]["labels"][0], "写方案")
            self.assertEqual(after["params"]["labels"][0], "写报告")
            self.assertEqual(before["events"], after["events"])
        self.assertEqual(board_bytes, (self.project / "storyboard.json").read_bytes())


if __name__ == "__main__":
    unittest.main()
