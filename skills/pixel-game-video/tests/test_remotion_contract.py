"""Backend capability and timeline invariants; these do not render a video."""
import copy
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

SKILL = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SKILL))
from engine.compiler import compile_project, read_json, write_json
from engine.builder import build
from engine.remotion_backend import verify_build
from engine.render import render


class RemotionContractTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.project = Path(self.temp.name) / "project"
        shutil.copytree(SKILL / "assets/project-template", self.project)

    def tearDown(self):
        self.temp.cleanup()

    def change(self, name, edit):
        path = self.project / name
        data = read_json(path)
        edit(data)
        write_json(path, data)

    def remotion_project(self):
        self.change("project.json", lambda d: d.update(
            renderBackend="remotion", style="style.pixel-editorial.v1", audioMode="silent"))
        shots = []
        for sid, phase, start, done in [("s1", "overload", 36, 126), ("s2", "choose", 64, 150)]:
            shots.append({"id": sid, "durationFrames": 240, "scene": "scenes.focus-desk.v1",
                          "actor": "actor.azong.v3", "objects": [],
                          "params": {"phase": phase, "heading": "先选一件",
                                     "labels": ["写方案", "回消息", "查资料"],
                                     "startEvent": "start", "completeEvent": "done"},
                          "events": [{"id": "start", "frame": start}, {"id": "done", "frame": done}],
                          "motions": []})
        shots[0]["motions"] = [{"id": "track", "recipe": "motion.camera-track.v1", "target": "scene",
                                "start": {"event": "s1.enter", "offsetFrames": 24}, "durationFrames": 120,
                                "params": {"scaleFrom": 1.0, "scaleTo": 1.08,
                                           "xFrom": 0.5, "xTo": 0.56, "yFrom": 0.5, "yTo": 0.5}}]
        shots[1]["motions"] = [{"id": "page", "recipe": "motion.book-sweep.v1", "target": "scene",
                                "start": {"event": "s2.enter"}, "durationFrames": 48,
                                "params": {"x": 0.36, "y": 0.67}}]
        write_json(self.project / "timeline.json", {"shots": shots})
        write_json(self.project / "text.json", {"cues": [
            {"id": "c1", "role": "subtitle", "text": "事情太多，先别同时开始。", "phrases": ["shi qing tai duo"],
             "start": {"event": "s1.enter", "offsetFrames": 12}, "end": {"event": "s1.exit", "offsetFrames": -12}},
            {"id": "c2", "role": "subtitle", "text": "挑出一件，其余放一边。", "phrases": ["tiao chu yi jian"],
             "start": {"event": "s2.enter", "offsetFrames": 60}, "end": {"event": "s2.exit", "offsetFrames": -12}}
        ]})
        write_json(self.project / "audio.json", {"cues": []})

    def test_legacy_project_without_backend_keeps_canvas_and_input_bytes(self):
        self.change("project.json", lambda d: d.pop("renderBackend", None))
        original = {path.name: path.read_bytes() for path in self.project.glob("*.json")}
        resolved = compile_project(self.project)
        self.assertEqual(resolved["project"]["renderBackend"], "canvas")
        self.assertEqual(resolved["durationFrames"], 720)
        self.assertEqual(original, {path.name: path.read_bytes() for path in self.project.glob("*.json")})

    def test_init_backend_remotion_creates_a_compilable_native_project(self):
        destination = Path(self.temp.name) / "native-init"
        result = subprocess.run([sys.executable, str(SKILL / "scripts/video.py"), "init", str(destination),
                                 "--backend", "remotion", "--title", "原生后端样例"],
                                capture_output=True, text=True, encoding="utf-8")
        self.assertEqual(result.returncode, 0, result.stderr)
        resolved = compile_project(destination)
        self.assertEqual(resolved["project"]["renderBackend"], "remotion")
        self.assertEqual(resolved["project"]["title"], "原生后端样例")
        self.assertEqual(resolved["project"]["style"], "style.pixel-editorial.v1")
        self.assertTrue(all(shot["scene"] == "scenes.focus-desk.v1" for shot in resolved["shots"]))
        self.assertGreater(resolved["durationFrames"], 0)

    def test_dependency_lock_isolates_native_and_canvas_visual_runtimes(self):
        compile_project(self.project, write=True)
        canvas_files = read_json(self.project / "build/project-lock.json")["runtimeFiles"]
        self.assertIn("engine/player.js", canvas_files)
        self.assertIn("modules/scenes/runtime.js", canvas_files)
        self.assertIn("engine/render_frames.cjs", canvas_files)
        self.assertFalse(any(name.startswith("engine/remotion/") for name in canvas_files))
        self.remotion_project()
        compile_project(self.project, write=True)
        native_files = read_json(self.project / "build/project-lock.json")["runtimeFiles"]
        for name in ("engine/remotion/src/index.tsx", "engine/remotion/src/FocusDesk.tsx",
                     "engine/remotion/driver.cjs", "engine/remotion/package-lock.json"):
            self.assertIn(name, native_files)
        for name in ("engine/player.js", "engine/player.html", "engine/render_frames.cjs",
                     "modules/scenes/runtime.js", "modules/motion/runtime.js", "modules/text/runtime.js"):
            self.assertNotIn(name, native_files)

    def test_remotion_scene_cannot_silently_run_in_canvas(self):
        self.remotion_project()
        self.change("project.json", lambda d: d.update(renderBackend="canvas"))
        with self.assertRaisesRegex(ValueError, "renderBackend=canvas"):
            compile_project(self.project)

    def test_supported_backend_preserves_user_frames_and_transition_ownership(self):
        self.remotion_project()
        before_bytes = {path.name: path.read_bytes() for path in self.project.glob("*.json")}
        resolved = compile_project(self.project)
        self.assertEqual(resolved["project"]["renderBackend"], "remotion")
        self.assertEqual(resolved["durationFrames"], 480)
        self.assertEqual(resolved["durationSeconds"], 8.0)
        self.assertEqual(resolved["events"]["s1.done"], 126)
        self.assertEqual(resolved["events"]["s2.start"], 304)
        page = resolved["shots"][1]["motions"][0]
        self.assertEqual((page["startFrame"], page["endFrame"]), (240, 288))
        self.assertEqual(resolved["cues"][1]["startFrame"], 300)
        self.assertEqual(before_bytes, {path.name: path.read_bytes() for path in self.project.glob("*.json")})
        self.change("timeline.json", lambda d: d["shots"][0].update(durationFrames=300))
        shifted = compile_project(self.project)
        self.assertEqual(shifted["durationFrames"], 540)
        self.assertEqual(shifted["events"]["s2.start"], 364)
        self.assertEqual(shifted["cues"][1]["startFrame"], 360)
        self.assertEqual(shifted["shots"][1]["motions"][0]["startFrame"], 300)
        self.assertNotEqual(resolved["inputHash"], shifted["inputHash"])

    def test_remotion_rejects_other_scene_style_and_motion_capabilities(self):
        changes = [
            ("project.json", lambda d: d.update(style="style.cyberpunk.v1")),
            ("timeline.json", lambda d: d["shots"][0].update(scene="scenes.canvas.v1", params={})),
            ("timeline.json", lambda d: d["shots"][0]["motions"][0].update(
                recipe="motion.camera-push.v1", params={"scale": 1.1})),
        ]
        for name, edit in changes:
            with self.subTest(name=name):
                self.remotion_project()
                self.change(name, edit)
                with self.assertRaisesRegex(ValueError, "Remotion|renderBackend=remotion"):
                    compile_project(self.project)

    def test_composition_owned_props_components_and_media_are_rejected(self):
        patches = [
            {"objects": [{"id": "cap", "asset": "prop.grad-cap.v1", "x": 0.5, "y": 0.5}]},
            {"components": [{"id": "note", "kind": "annotation", "x": 0.4, "y": 0.4,
                             "width": 0.3, "height": 0.2,
                             "data": {"label": "旁注", "targetX": 0.5, "targetY": 0.5}}]},
            {"background": {"file": "media/unavailable.png"}},
            {"replacement": {"file": "media/unavailable.png"}},
        ]
        for patch in patches:
            with self.subTest(field=next(iter(patch))):
                self.remotion_project()
                self.change("timeline.json", lambda d: d["shots"][0].update(patch))
                with self.assertRaisesRegex(ValueError, "owns its props|Remotion.*composition"):
                    compile_project(self.project)

    def test_canvas_presenter_performance_is_rejected_by_remotion(self):
        self.remotion_project()
        self.change("timeline.json", lambda d: d["shots"][0].update(performance=[
            {"pose": "talk", "start": {"event": "s1.start"}, "end": {"event": "s1.done"}}
        ]))
        with self.assertRaisesRegex(ValueError, "Remotion actor performance is not supported"):
            compile_project(self.project)

    def test_canvas_narrative_progress_is_rejected_by_remotion(self):
        self.remotion_project()
        self.change("timeline.json", lambda d: d.update(progress={"nodes": [
            {"label": "问题", "at": {"event": "s1.enter"}},
            {"label": "选择", "at": {"event": "s2.enter"}}
        ]}))
        with self.assertRaisesRegex(ValueError, "Remotion narrative progress is not supported"):
            compile_project(self.project)

    def test_focus_desk_rejects_invalid_labels_phase_and_action_order(self):
        patches = [{"phase": "unknown"}, {"heading": " "}, {"heading": "字" * 49},
                   {"labels": ["一", "二"]}, {"labels": ["一", "二", 3]},
                   {"labels": ["一", "二", "字" * 49]}, {"startEvent": "missing"},
                   {"completeEvent": "start"}, {"startEvent": "done", "completeEvent": "start"},
                   {"completeEvent": "exit"}, {"unused": True}]
        for patch in patches:
            with self.subTest(params=patch):
                self.remotion_project()
                self.change("timeline.json", lambda d: d["shots"][0]["params"].update(patch))
                with self.assertRaises(ValueError):
                    compile_project(self.project)

    def test_existing_motion_parameter_limits_and_transition_rules_still_apply(self):
        self.remotion_project()
        self.change("timeline.json", lambda d: d["shots"][0]["motions"][0]["params"].update(scaleTo=1.76))
        with self.assertRaisesRegex(ValueError, "scaleTo"):
            compile_project(self.project)
        self.remotion_project()
        self.change("timeline.json", lambda d: d["shots"][1]["motions"][0]["params"].update(zoom=3))
        with self.assertRaisesRegex(ValueError, "unsupported parameter"):
            compile_project(self.project)
        self.remotion_project()
        self.change("timeline.json", lambda d: d["shots"][1]["motions"][0]["start"].update(offsetFrames=1))
        with self.assertRaisesRegex(ValueError, "start at shot.enter"):
            compile_project(self.project)
        self.remotion_project()

        def first_shot_transition(data):
            page = copy.deepcopy(data["shots"][1]["motions"][0])
            page["start"] = {"event": "s1.enter"}
            data["shots"][0]["motions"] = [page]

        self.change("timeline.json", first_shot_transition)
        with self.assertRaisesRegex(ValueError, "previous shot"):
            compile_project(self.project)

    def test_null_actor_uses_same_scene_and_duration(self):
        self.remotion_project()
        self.change("timeline.json", lambda d: d["shots"][0].update(actor=None))
        resolved = compile_project(self.project)
        self.assertIsNone(resolved["shots"][0]["actor"])
        self.assertEqual(resolved["shots"][0]["endFrame"], 240)

    def test_native_build_rejects_edited_generated_source_and_payload(self):
        self.remotion_project()
        resolved = compile_project(self.project, write=True)
        manifest_path = build(self.project, resolved, SKILL)
        self.assertEqual(manifest_path.name, "remotion-build.json")
        self.assertFalse((self.project / "build/film.html").exists())
        manifest = verify_build(self.project, resolved)
        self.assertEqual(manifest["inputHash"], resolved["inputHash"])
        payload = read_json(self.project / "build/remotion/public/payload.json")
        self.assertEqual(payload["resolved"]["events"]["s2.start"], 304)
        self.assertEqual(payload["resolved"]["durationFrames"], 480)
        self.assertIsNone(payload["audio"])
        for name in ("build/remotion/src/index.tsx", "build/remotion/public/payload.json"):
            with self.subTest(generated=name):
                path = self.project / name
                original = path.read_bytes()
                path.write_bytes(original + b"\n")
                with self.assertRaisesRegex(ValueError, "Generated Remotion file changed"):
                    verify_build(self.project, resolved)
                path.write_bytes(original)
                verify_build(self.project, resolved)

    def test_native_build_must_match_the_current_compiled_timeline(self):
        self.remotion_project()
        resolved = compile_project(self.project, write=True)
        build(self.project, resolved, SKILL)
        self.change("timeline.json", lambda d: d["shots"][0]["events"][0].update(frame=42))
        changed = compile_project(self.project)
        with self.assertRaisesRegex(ValueError, "different timeline"):
            verify_build(self.project, changed)

    def test_render_dispatches_nonzero_source_range_and_records_native_artifact(self):
        self.remotion_project()
        resolved = compile_project(self.project, write=True)
        build(self.project, resolved, SKILL)
        first, last = 300, 360
        metrics = {"nodeVersion": "fixture-node", "browserVersion": "fixture-browser",
                   "remotionVersion": "4.0.534", "frameCount": last - first}

        def encode_fixture(ffmpeg, frames, output, audio, config, frame_count, work):
            self.assertIsNone(audio)
            self.assertEqual(frame_count, last - first)
            output.write_bytes(b"synthetic encoded fixture; not a playable video")
            return "fixture-codec"

        # Keep contract/build hashing and manifest writing real. The media boundary
        # is synthetic so this test neither invokes a browser nor approves footage.
        with patch("engine.render._executable", side_effect=lambda env, fallback: fallback), \
                patch("engine.remotion_backend.render_frames", return_value=metrics) as capture, \
                patch("engine.render._encode", side_effect=encode_fixture), \
                patch("engine.render._verify", return_value={"technicalStatus": "passed", "checks": {}}), \
                patch("engine.render._version", return_value="fixture-version"), \
                patch("engine.render._decode_stills", return_value={"decodedStills": []}), \
                patch("engine.render.subprocess.run") as browser_capture:
            output = render(self.project, name="native-range-fixture", start_frame=first,
                            end_frame=last, silent=True)
        browser_capture.assert_not_called()
        args = capture.call_args.args
        self.assertEqual((args[0], args[2], args[3]), (self.project.resolve(), first, last))
        self.assertEqual(args[1].name, "frames")
        self.assertEqual(capture.call_count, 1)
        self.assertTrue(output.is_file())
        verification = self.project / "outputs/native-range-fixture-verification"
        manifest = read_json(verification / "render-manifest.json")
        metadata = read_json(verification / "metadata.json")
        self.assertEqual(manifest["backend"], "remotion")
        self.assertEqual(manifest["buildArtifact"], "build/remotion-build.json")
        self.assertEqual(manifest["sourceRange"], {"startFrame": first, "endFrame": last,
                         "durationFrames": last - first, "fps": 60, "startSeconds": 5.0, "endSeconds": 6.0})
        self.assertEqual(metadata["sourceRange"], manifest["sourceRange"])
        self.assertEqual(metadata["backend"], "remotion")
        self.assertEqual(manifest["environment"]["remotion"], "4.0.534")
        self.assertNotIn("playwright", manifest["environment"])
        self.assertEqual(manifest["review"]["visual"], "not_reviewed")


if __name__ == "__main__":
    unittest.main()
