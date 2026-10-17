"""Compile event references to a single integer-frame timeline, without editing inputs."""
import hashlib
import importlib.util
import json
import math
from pathlib import Path

from .models import INPUT_MODELS

SKILL_ROOT = Path(__file__).resolve().parents[1]
MODULES = ("style", "library", "text", "motion", "audio", "scenes")


def read_json(path):
    return json.loads(Path(path).read_text(encoding="utf-8-sig"))


def write_json(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def file_hash(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def catalog(skill_root=SKILL_ROOT):
    return {name: read_json(Path(skill_root) / "modules" / name / "catalog.json") for name in MODULES}


def unique(values, label):
    seen = set()
    for value in values:
        if value in seen:
            raise ValueError(f"{label}: duplicate ID {value}")
        seen.add(value)


def _source_integrity(root):
    mapping = read_json(root / "source-map.json")
    hashes = mapping.get("generatedHashes", {})
    for name in INPUT_MODELS:
        if hashes.get(name) != file_hash(root / name):
            owners = sorted({m["sourceFile"] for m in mapping.get("mappings", []) if m.get("generatedFile") == name})
            raise ValueError(f"director generated file changed: {name}; edit sources {owners} and run handoff")
    source_hashes = mapping.get("sourceHashes", {})
    if not source_hashes:
        raise ValueError("director source-map.json is missing sourceHashes; rerun handoff")
    for name, expected in source_hashes.items():
        source = (root / name).resolve()
        if not source.is_relative_to(root.parent):
            raise ValueError(f"source reference escapes project: {name}")
        if not source.is_file() or file_hash(source) != expected:
            raise ValueError(f"director source changed: {name}; rerun handoff before building")


def _finite(value, label):
    if isinstance(value, float) and not math.isfinite(value):
        raise ValueError(f"{label}: non-finite number")
    if isinstance(value, dict):
        for key, item in value.items():
            _finite(item, f"{label}.{key}")
    elif isinstance(value, list):
        for item in value:
            _finite(item, label)


def _motion_params(recipe, params):
    rules = {
        "motion.camera-push.v1": {"scale": (1, 1.25), "x": (0, 1), "y": (0, 1)},
        "motion.camera-track.v1": {"scaleFrom": (1, 1.75), "scaleTo": (1, 1.75),
                                    "xFrom": (0, 1), "xTo": (0, 1), "yFrom": (0, 1), "yTo": (0, 1)},
        "motion.object-reveal.v1": {"scaleFrom": (0.05, 1), "turns": (0, 4)},
        "motion.gold-burst.v1": {"x": (0, 1), "y": (0, 1)},
        "motion.shatter-reveal.v1": {"x": (0, 1), "y": (0, 1), "seed": (0, 2147483647)},
        "motion.panel-slide.v1": {"distance": (0.1, 0.35)},
        "motion.pixel-iris.v1": {"x": (0, 1), "y": (0, 1)},
        "motion.focus-punch.v1": {"x": (0, 1), "y": (0, 1), "zoom": (3, 8)},
        "motion.mosaic-pullback.v1": {"columns": (3, 9)},
    }
    if recipe not in rules:
        raise ValueError(f"motion executor unavailable: {recipe}")
    for key, value in params.items():
        if recipe == "motion.panel-slide.v1" and key == "direction":
            if value not in ("left", "right"):
                raise ValueError("panel-slide.direction must be left or right")
            continue
        if key not in rules[recipe]:
            raise ValueError(f"{recipe}: unsupported parameter {key}")
        lo, hi = rules[recipe][key]
        if type(value) not in (int, float) or not lo <= value <= hi:
            raise ValueError(f"{recipe}.{key}: expected number in [{lo}, {hi}]")
        if key == "seed" and type(value) is not int:
            raise ValueError("shatter seed must be an integer")
        if key == "columns" and (type(value) is not int or value % 2 != 1):
            raise ValueError("mosaic columns must be an odd integer from 3 to 9")


def compile_project(project_root, skill_root=None, *, write=False):
    root = Path(project_root).resolve()
    skill = Path(skill_root or SKILL_ROOT).resolve()
    inputs = {name: model.model_validate(read_json(root / name)).model_dump(exclude_none=True)
              for name, model in INPUT_MODELS.items()}
    project = inputs["project.json"]
    if project["authoringMode"] == "director":
        _source_integrity(root)
    catalogs = catalog(skill)
    content_stage = catalogs["scenes"]["contentStage"]
    lookup = {name: {item["id"]: item for item in data["items"]} for name, data in catalogs.items()}

    def require(module, ident):
        item = lookup[module].get(ident)
        if item is None or item.get("status") in ("planned", "draft", "unavailable"):
            raise ValueError(f"{module}: unavailable capability {ident}; run catalog")
        return item

    require("style", project["style"])
    shots = inputs["timeline.json"]["shots"]
    unique((s["id"] for s in shots), "shots")
    events, cursor = {}, 0
    for shot in shots:
        shot["startFrame"] = cursor
        shot["endFrame"] = cursor + shot["durationFrames"]
        unique((e["id"] for e in shot["events"]), f"{shot['id']}.events")
        local = {"enter": 0, "exit": shot["durationFrames"]}
        for event in shot["events"]:
            if event["id"] in local or event["frame"] >= shot["durationFrames"]:
                raise ValueError(f"{shot['id']}.{event['id']}: reserved event or frame outside shot")
            local[event["id"]] = event["frame"]
        shot["events"] = [{"id": ident, "frame": cursor + frame, "localFrame": frame} for ident, frame in local.items()]
        for ident, frame in local.items():
            key = f"{shot['id']}.{ident}"
            if key in events:
                raise ValueError(f"ambiguous qualified event: {key}")
            events[key] = cursor + frame
        cursor = shot["endFrame"]

    def resolve(ref):
        if ref["event"] not in events:
            raise ValueError(f"unknown event reference: {ref['event']}")
        return events[ref["event"]] + ref.get("offsetFrames", 0)

    validator_file = skill / "modules/scenes/contract.py"
    spec = importlib.util.spec_from_file_location("pixel_scene_contract", validator_file)
    validator = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(validator)
    for index, shot in enumerate(shots):
        require("scenes", shot["scene"])
        shot["actor"] = shot.get("actor")
        if shot["actor"] is not None:
            require("library", shot["actor"])
            if not shot["actor"].startswith("actor."):
                raise ValueError("shot.actor must reference an actor or be null")
        unique((o["id"] for o in shot["objects"]), f"{shot['id']}.objects")
        for obj in shot["objects"]:
            require("library", obj["asset"])
            if obj["id"] in ("scene", "actor") or not obj["asset"].startswith("prop."):
                raise ValueError("object IDs cannot be scene/actor; object assets must be props")
        _finite(shot["params"], shot["id"])
        validator.validate(shot["scene"], shot["params"], shot["events"], shot["objects"])
        if shot['scene']=='scenes.cache-adventure.v1' and shot['actor'] is None:
            raise ValueError('cache-adventure requires an actor for the physical actions')
        unique((m["id"] for m in shot["motions"]), f"{shot['id']}.motions")
        targets = {"scene", "actor"} | {o["id"] for o in shot["objects"]}
        intervals = {}
        for motion in shot["motions"]:
            capability = require("motion", motion["recipe"])
            _motion_params(motion["recipe"], motion["params"])
            start = resolve(motion.pop("start"))
            end = start + motion.pop("durationFrames")
            if start < shot["startFrame"] or end > shot["endFrame"]:
                raise ValueError(f"{shot['id']}.{motion['id']}: motion outside shot")
            if motion["target"] not in targets:
                raise ValueError(f"unknown motion target: {motion['target']}")
            recipe = motion["recipe"]
            if recipe == "motion.object-reveal.v1" and motion["target"] in ("scene", "actor"):
                raise ValueError("object-reveal requires an object target")
            if recipe != "motion.object-reveal.v1" and motion["target"] != "scene":
                raise ValueError(f"{recipe} requires target=scene")
            transition = capability.get("kind") == "transition"
            if transition and (index == 0 or start != shot["startFrame"]):
                raise ValueError(f"{recipe}: transition requires a previous shot and must start at shot.enter")
            if capability.get("layer") == "content":
                if end - start < 8:
                    raise ValueError("content transition needs at least 8 frames for exit and entry")
                if recipe == "motion.pixel-iris.v1":
                    for axis, extent in (("x", "width"), ("y", "height")):
                        value = motion["params"].get(axis, content_stage[axis] + content_stage[extent] / 2)
                        if not content_stage[axis] <= value <= content_stage[axis] + content_stage[extent]:
                            raise ValueError("pixel-iris focus must be inside the content stage")
                half_width = .27 * project["height"] / project["width"] / 2
                for owner in (shots[index - 1], shot):
                    for obj in owner["objects"]:
                        if not (content_stage["x"] <= obj["x"] - half_width and
                                obj["x"] + half_width <= content_stage["x"] + content_stage["width"] and
                                content_stage["y"] <= obj["y"] - .135 and
                                obj["y"] + .135 <= content_stage["y"] + content_stage["height"]):
                            raise ValueError(f"{owner['id']}.{obj['id']}: object outside content stage; reposition it or use another transition")
            key = ("transition" if transition else ("camera" if capability.get('kind')=='camera' else recipe), motion["target"])
            if any(start < b and a < end for a, b in intervals.get(key, [])):
                raise ValueError(f"overlapping motion on {motion['target']}: {recipe}")
            intervals.setdefault(key, []).append((start, end))
            motion.update(startFrame=start, endFrame=end)

    cues = inputs["text.json"]["cues"]
    unique((c["id"] for c in cues), "text cues")
    subtitles = []
    for cue in cues:
        start, end = resolve(cue.pop("start")), resolve(cue.pop("end"))
        if not 0 <= start < end <= cursor:
            raise ValueError(f"{cue['id']}: invalid text interval")
        if cue["role"] == "subtitle":
            if not cue["phrases"] or any(not p.strip() for p in cue["phrases"]):
                raise ValueError(f"{cue['id']}: subtitles require nonempty pinyin phrases for simulated mouth")
            if end - start < len(cue["phrases"]) * 3:
                raise ValueError(f"{cue['id']}: insufficient frames for phrases")
            if any(start < b and a < end for a, b in subtitles):
                raise ValueError(f"{cue['id']}: overlapping subtitles for a single speaker")
            subtitles.append((start, end))
        cue.update(startFrame=start, endFrame=end)
    audio = inputs["audio.json"]["cues"]
    unique((c["id"] for c in audio), "audio cues")
    for cue in audio:
        sound = require("audio", cue["sound"])
        frame = resolve(cue.pop("at"))
        if not 0 <= frame < cursor:
            raise ValueError(f"{cue['id']}: audio event outside video")
        if cue["variant"] > sound.get("maxVariant", 0):
            raise ValueError(f"{cue['id']}: unavailable sound variant {cue['variant']}")
        cue["frame"] = frame

    source_hashes = {name: file_hash(root / name) for name in INPUT_MODELS}
    narration = inputs['audio.json']['narration']
    if bool(narration) != (project['audioMode'] == 'narration+sfx'):
        raise ValueError('Narration clips require audioMode=narration+sfx and vice versa')
    unique((c['id'] for c in narration), 'narration')
    spec = importlib.util.spec_from_file_location('pixel_narration', skill / 'modules/audio/narration.py')
    narration_module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(narration_module)
    intervals = []
    for cue in narration:
        frame = resolve(cue.pop('at'))
        path, info = narration_module.inspect_clip(root, cue['file'])
        sample = round(frame / project['fps'] * 48000)
        end = sample + info['samples']
        if frame < 0 or end > round(cursor / project['fps'] * 48000):
            raise ValueError('Narration extends outside video')
        if any(sample < b and a < end for a,b in intervals):
            raise ValueError('Narration clips overlap for a single speaker')
        intervals.append((sample,end))
        relative = path.relative_to(root).as_posix()
        cue.update(file=relative, frame=frame, **info)
        source_hashes[relative] = info['sha256']
    runtime_hashes = {}
    for folder in ("engine", "modules", "scripts"):
        for path in sorted((skill / folder).rglob("*")):
            if path.is_file() and "__pycache__" not in path.parts and path.suffix not in (".pyc", ".md"):
                runtime_hashes[path.relative_to(skill).as_posix()] = file_hash(path)
    for name in ("requirements.txt", "package.json"):
        if (skill / name).exists():
            runtime_hashes[name] = file_hash(skill / name)
    digest = hashlib.sha256(json.dumps({"inputs": source_hashes, "runtime": runtime_hashes}, sort_keys=True).encode()).hexdigest()
    resolved = {"contractVersion": 1, "inputHash": digest, "project": project,
                "contentStage": content_stage,
                "durationFrames": cursor, "durationSeconds": cursor / project["fps"],
                "shots": shots, "events": events, "cues": cues, "audio": audio, "narration": narration}
    if write:
        write_json(root / "build/resolved-timeline.json", resolved)
        write_json(root / "build/project-lock.json", {"contractVersion": 1, "inputHash": digest,
                   "inputFiles": source_hashes, "runtimeFiles": runtime_hashes})
    return resolved
