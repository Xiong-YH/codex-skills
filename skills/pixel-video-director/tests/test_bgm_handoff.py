"""BGM authoring ownership, handoff and media provenance contracts."""
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
import wave

from pydantic import ValidationError

SKILL = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SKILL / "scripts"))

from directorlib.authoring import handoff, initialize, load_sources, transform
from directorlib.common import digest, guard_generated, read_json, write_json
from directorlib.review import find_stable, resolve_field


class BgmHandoffTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.project = Path(self.tmp.name) / "project"
        initialize(self.project, example=True)
        self.foundation = SKILL.parent / "pixel-game-video"
        self.clip = self.project / "media/music.wav"
        self.write_clip(1200)
        self.configure_bgm()

    def tearDown(self):
        self.tmp.cleanup()

    def write_clip(self, amplitude):
        self.clip.parent.mkdir(exist_ok=True)
        with wave.open(str(self.clip), "wb") as stream:
            stream.setparams((1, 2, 48000, 0, "NONE", "not compressed"))
            stream.writeframes(amplitude.to_bytes(2, "little", signed=True) * 48000)

    def configure_bgm(self, **changes):
        plan = read_json(self.project / "production-plan.json")
        plan["bgm"] = {"file": "media/music.wav", "at": {"event": "s1.enter"},
                       "end": {"event": "s4.exit"}, **changes}
        write_json(self.project / "production-plan.json", plan)

    def test_defaults_and_absent_or_null_bgm(self):
        sources = load_sources(self.project)
        outputs, _ = transform(sources)
        bgm = outputs["audio.json"]["bgm"]
        self.assertEqual(bgm["id"], "bgm")
        self.assertEqual((bgm["gain"], bgm["loop"], bgm["trimStartSeconds"]), (0.18, True, 0))
        self.assertEqual((bgm["fadeInFrames"], bgm["fadeOutFrames"], bgm["speechDuck"]), (60, 90, 0.25))
        self.assertEqual({name: bgm[name] for name in ("title", "artist", "sourceUrl", "licenseUrl", "changes")},
                         {name: "" for name in ("title", "artist", "sourceUrl", "licenseUrl", "changes")})
        plan = read_json(self.project / "production-plan.json")
        for remove in (False, True):
            if remove:
                plan.pop("bgm", None)
            else:
                plan["bgm"] = None
            write_json(self.project / "production-plan.json", plan)
            outputs, _ = transform(load_sources(self.project))
            self.assertNotIn("bgm", outputs["audio.json"])

    def test_handoff_preserves_parameters_events_metadata_and_source_ownership(self):
        self.configure_bgm(id="music-bed", at={"event": "s1.enter", "offsetFrames": 3},
                           end={"event": "s4.exit", "offsetFrames": -2}, gain=0.12,
                           loop=True, trimStartSeconds=0.125, fadeInFrames=12,
                           fadeOutFrames=20, speechDuck=0.2, title="Test track", artist="Test artist",
                           sourceUrl="https://example.org/music", licenseUrl="https://example.org/license",
                           changes="Trimmed and looped")
        sources = load_sources(self.project)
        handoff(self.project, self.foundation)
        bgm = read_json(self.project / "video/audio.json")["bgm"]
        self.assertEqual(bgm, sources["production-plan.json"]["bgm"])
        self.assertEqual(self.clip.read_bytes(), (self.project / "video/media/music.wav").read_bytes())
        mapping = read_json(self.project / "video/source-map.json")
        owners = [m for m in mapping["mappings"] if m["generatedFile"] == "audio.json"
                  and m["jsonPointer"].startswith("/bgm/")]
        self.assertTrue(owners)
        self.assertEqual({m["stableId"] for m in owners}, {"music-bed"})
        self.assertEqual({m["sourceFile"] for m in owners}, {"../production-plan.json"})
        source_objects = find_stable(sources["production-plan.json"], "music-bed")
        self.assertEqual(len(source_objects), 1)
        for owner in owners:
            self.assertEqual(resolve_field(source_objects[0], owner["field"]),
                             resolve_field(bgm, owner["jsonPointer"][len("/bgm"):]))
        owner = next(m for m in owners if m["jsonPointer"] == "/bgm/file")
        self.assertEqual(owner["field"], "/file")
        self.assertEqual(mapping["sourceHashes"]["../media/music.wav"], digest(self.clip))
        self.assertEqual(mapping["generatedHashes"]["media/music.wav"], digest(self.clip))

    def test_both_media_copies_are_guarded_and_source_changes_change_input_hash(self):
        previous = handoff(self.project, self.foundation)
        copied = self.project / "video/media/music.wav"
        original = self.clip.read_bytes()
        copied.write_bytes(original + b" ")
        with self.assertRaisesRegex(ValueError, "被手改"):
            handoff(self.project, self.foundation)
        copied.write_bytes(original)
        self.write_clip(2400)
        with self.assertRaisesRegex(ValueError, "创作源文件已变化"):
            guard_generated(self.project, require_current_sources=True)
        current = handoff(self.project, self.foundation)
        self.assertNotEqual(previous["inputHash"], current["inputHash"])
        self.assertEqual(self.clip.read_bytes(), copied.read_bytes())
        guard_generated(self.project, require_current_sources=True)

    def test_standalone_export_retains_bgm_and_its_authoring_source(self):
        handoff(self.project, self.foundation)
        destination = Path(self.tmp.name) / "export"
        result = subprocess.run([sys.executable, str(self.foundation / "scripts/video.py"),
                                 "export-project", str(self.project / "video"), str(destination)],
                                capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        for relative in ("project/media/music.wav", "authoring-sources/media/music.wav"):
            self.assertEqual((destination / relative).read_bytes(), self.clip.read_bytes())
        mapping = read_json(destination / "authoring-sources/source-map.json")
        self.assertEqual(mapping["sourceHashes"]["../media/music.wav"], digest(self.clip))
        self.assertEqual(read_json(destination / "project/audio.json")["bgm"]["file"], "media/music.wav")

    def test_silent_mode_rejects_explicit_bgm(self):
        plan = read_json(self.project / "production-plan.json")
        plan.update(audioMode="silent", audio=[])
        write_json(self.project / "production-plan.json", plan)
        with self.assertRaisesRegex(ValueError, "silent.*配乐"):
            load_sources(self.project)

    def test_bgm_id_cannot_ambiguously_match_another_source_object(self):
        plan = read_json(self.project / "production-plan.json")
        for identifier in (plan["id"], plan["shots"][0]["id"], plan["text"][0]["cueId"], plan["audio"][0]["id"]):
            with self.subTest(identifier=identifier):
                self.configure_bgm(id=identifier)
                with self.assertRaisesRegex(ValueError, "bgm.id.*唯一"):
                    load_sources(self.project)

    def test_invalid_ranges_and_missing_event_edges_are_rejected_by_model(self):
        for changes in ({"id": "bad id"}, {"gain": 1.1}, {"speechDuck": -0.1}, {"trimStartSeconds": -1},
                        {"fadeInFrames": -1}, {"fadeOutFrames": 1.5}, {"loop": "true"}):
            with self.subTest(changes=changes):
                self.configure_bgm(**changes)
                with self.assertRaises(ValidationError):
                    load_sources(self.project)
        for edge in ("at", "end"):
            self.configure_bgm()
            plan = read_json(self.project / "production-plan.json")
            plan["bgm"].pop(edge)
            write_json(self.project / "production-plan.json", plan)
            with self.assertRaises(ValidationError):
                load_sources(self.project)


if __name__ == "__main__":
    unittest.main()
