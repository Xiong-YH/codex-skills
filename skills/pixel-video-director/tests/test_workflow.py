"""Contract and provenance tests. Synthetic media here is not a visual review."""
import hashlib
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

SKILL = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SKILL / "scripts"))

from directorlib.authoring import handoff, impact, initialize, load_sources, transform
from directorlib.common import (digest, foundation_root, guard_generated, read_json,
                                write_json)
from directorlib.review import check_review, initialize_review


class WorkflowTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.project = Path(self.tmp.name) / "project"
        initialize(self.project, example=True)
        self.foundation = SKILL.parent / "pixel-game-video"

    def tearDown(self):
        self.tmp.cleanup()

    def change(self, file, edit):
        path = self.project / file
        data = read_json(path)
        edit(data)
        write_json(path, data)

    def fixture_render(self):
        result = handoff(self.project, self.foundation)
        outputs = self.project / "video/outputs"
        outputs.mkdir()
        media = outputs / "film.mp4"
        media.write_bytes(b"synthetic media fixture; do not present as a rendered video")
        verification = outputs / "film-verification"
        manifest = {"inputHash": result["inputHash"], "videoSha256": digest(media),
                    "video": "outputs/film.mp4", "sourceRange": {"startFrame": 0,
                    "endFrame": 720, "durationFrames": 720, "fps": 60}}
        write_json(verification / "render-manifest.json", manifest)
        write_json(verification / "metadata.json", {**manifest, "technicalStatus": "passed"})
        return verification / "render-manifest.json"

    def test_handoff_joins_stable_ids_and_resolves_scene_labels(self):
        self.change("script.json", lambda d: d["cues"].reverse())
        handoff(self.project, self.foundation)
        text = read_json(self.project / "video/text.json")
        timeline = read_json(self.project / "video/timeline.json")
        self.assertEqual(text["cues"][0]["id"], "c1")
        self.assertEqual(timeline["shots"][0]["params"]["options"][0], "方案甲")
        mapping = read_json(self.project / "video/source-map.json")
        owner = next(m for m in mapping["mappings"] if m["generatedFile"] == "timeline.json"
                     and m["jsonPointer"] == "/shots/0/params/options/0")
        self.assertEqual((owner["sourceFile"], owner["stableId"], owner["field"]),
                         ("../script.json", "optionA", "/text"))

    def test_generated_edit_is_not_silently_overwritten(self):
        handoff(self.project, self.foundation)
        target = self.project / "video/text.json"
        target.write_bytes(target.read_bytes() + b" ")
        original = target.read_bytes()
        with self.assertRaisesRegex(ValueError, "被手改"):
            handoff(self.project, self.foundation)
        self.assertEqual(target.read_bytes(), original)

    def test_explicit_null_actor_handoffs_with_source_ownership(self):
        self.change("production-plan.json", lambda d: d["shots"][0].update(actor=None))
        handoff(self.project, self.foundation)
        timeline = read_json(self.project / "video/timeline.json")
        self.assertIn("actor", timeline["shots"][0])
        self.assertIsNone(timeline["shots"][0]["actor"])
        mapping = read_json(self.project / "video/source-map.json")
        owner = next(m for m in mapping["mappings"] if m["generatedFile"] == "timeline.json"
                     and m["jsonPointer"] == "/shots/0/actor")
        self.assertEqual((owner["sourceFile"], owner["stableId"], owner["field"]),
                         ("../production-plan.json", "s1", "/actor"))

    def test_actor_choice_must_be_explicit(self):
        self.change("production-plan.json", lambda d: d["shots"][0].pop("actor"))
        with self.assertRaisesRegex(ValueError, "actor"):
            load_sources(self.project)

    def test_invalid_capability_preserves_previous_generation(self):
        handoff(self.project, self.foundation)
        previous = (self.project / "video/timeline.json").read_bytes()
        self.change("production-plan.json", lambda d: d["shots"][0].update(actor="actor.missing.v1"))
        with self.assertRaisesRegex(ValueError, "基础 VideoSpec"):
            handoff(self.project, self.foundation)
        self.assertEqual((self.project / "video/timeline.json").read_bytes(), previous)

    def test_owned_source_edit_can_be_regenerated(self):
        handoff(self.project, self.foundation)
        self.change("script.json", lambda d: d["cues"][0].update(text="先确定选择标准。"))
        with self.assertRaisesRegex(ValueError, "尚未 handoff"):
            guard_generated(self.project, require_current_sources=True)
        handoff(self.project, self.foundation)
        guard_generated(self.project, require_current_sources=True)

    def test_duplicate_cue_and_duplicated_scene_text_are_rejected(self):
        self.change("script.json", lambda d: d["cues"].append(d["cues"][0]))
        with self.assertRaisesRegex(ValueError, "重复"):
            load_sources(self.project)
        self.change("script.json", lambda d: d["cues"].pop())
        self.change("storyboard.json", lambda d: d["shots"][0]["params"]["options"].__setitem__(0, "手写标签"))
        with self.assertRaisesRegex(ValueError, "script.labels"):
            load_sources(self.project)

    def test_missing_explicit_dependency_does_not_fallback(self):
        with patch.dict(os.environ, {}, clear=True):
            with self.assertRaisesRegex(ValueError, "找不到 pixel-game-video"):
                foundation_root(self.project / "missing")

    def test_impact_localizes_text_and_downstream_timing(self):
        result = impact(self.project, "script.json", "c2", "/text")
        self.assertEqual([s["shotId"] for s in result["affectedShots"]], ["s2"])
        result = impact(self.project, "script.json", "goal", "/text")
        self.assertEqual([s["shotId"] for s in result["affectedShots"]], ["s2"])
        result = impact(self.project, "storyboard.json", "s3", "/durationFrames")
        self.assertEqual([s["shotId"] for s in result["affectedShots"]], ["s2", "s3", "s4"])

    def test_review_starts_pending_and_rejects_metadata_only_visual_pass(self):
        manifest = self.fixture_render()
        initialize_review(self.project, manifest, foundation=self.foundation)
        result = check_review(self.project, foundation=self.foundation)
        self.assertEqual(result["status"], "not_reviewed")
        report = read_json(self.project / "review.json")
        technical = next(c for c in report["checks"] if c["category"] == "technical")
        visual = next(c for c in report["checks"] if c["category"] == "visual")
        visual.update(status="passed", evidence=technical["evidence"])
        write_json(self.project / "review.json", report)
        result = check_review(self.project, foundation=self.foundation)
        self.assertEqual(result["status"], "failed")
        self.assertTrue(any("playback" in e for e in result["errors"]))
        frame = self.project / "frame.png"
        frame.write_bytes(b"synthetic frame fixture")
        visual["evidence"] = [{"kind": "frame", "path": "frame.png", "description": "only one frame", "checked": True}]
        write_json(self.project / "review.json", report)
        result = check_review(self.project, foundation=self.foundation)
        self.assertTrue(any("playback" in e for e in result["errors"]))

    def test_changed_media_and_partial_render_cannot_reuse_review(self):
        manifest = self.fixture_render()
        data = read_json(manifest)
        data["sourceRange"]["endFrame"] = 180
        write_json(manifest, data)
        with self.assertRaisesRegex(ValueError, "完整成片"):
            initialize_review(self.project, manifest, foundation=self.foundation)
        data["sourceRange"]["endFrame"] = 720
        write_json(manifest, data)
        (self.project / "video/outputs/film.mp4").write_bytes(b"different media")
        with self.assertRaisesRegex(ValueError, "SHA256"):
            initialize_review(self.project, manifest, foundation=self.foundation)

    def test_review_issue_must_locate_an_actual_source_field(self):
        manifest = self.fixture_render()
        initialize_review(self.project, manifest, foundation=self.foundation)
        report = read_json(self.project / "review.json")
        evidence = {"kind": "playback", "path": "video/outputs/film.mp4",
                    "description": "contract test fixture", "checked": True}
        report["issues"].append({"issueId": "i1", "category": "text", "severity": "major",
            "shotId": "s1", "timeRange": {"startFrame": 8, "endFrame": 172},
            "evidence": [evidence], "expected": "readable subtitle", "ownerModule": "text",
            "sourceRef": {"file": "production-plan.json", "stableId": "c1", "field": "/missing"},
            "status": "failed"})
        write_json(self.project / "review.json", report)
        result = check_review(self.project, foundation=self.foundation)
        self.assertTrue(any("sourceRef.field" in e for e in result["errors"]))

    def test_local_frame_fix_does_not_claim_full_visual_review(self):
        manifest = self.fixture_render()
        initialize_review(self.project, manifest, foundation=self.foundation)
        report = read_json(self.project / "review.json")
        frame = self.project / "evidence/frame.png"
        frame.parent.mkdir()
        frame.write_bytes(b"synthetic frame fixture")
        report["issues"].append({"issueId": "local-fix", "category": "visual", "severity": "major",
            "shotId": "s4", "timeRange": {"startFrame": 640, "endFrame": 642},
            "evidence": [{"kind": "frame", "path": "evidence/frame.png", "description": "localized fix", "checked": True}],
            "expected": "one core", "ownerModule": "scenes",
            "sourceRef": {"file": "storyboard.json", "stableId": "s4", "field": "/objects"},
            "status": "passed"})
        write_json(self.project / "review.json", report)
        result = check_review(self.project, foundation=self.foundation)
        self.assertEqual(result["errors"], [])
        self.assertEqual(result["unresolvedIssues"], [])
        self.assertEqual(result["status"], "not_reviewed")
        self.assertIn("visual", result["pending"])
        report["issues"][0]["category"] = "motion"
        write_json(self.project / "review.json", report)
        result = check_review(self.project, foundation=self.foundation)
        self.assertTrue(any("playback" in e for e in result["errors"]))


if __name__ == "__main__":
    unittest.main()
