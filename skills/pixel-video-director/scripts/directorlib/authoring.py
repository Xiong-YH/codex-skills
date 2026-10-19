"""Transform owned authoring sources into the foundation VideoSpec."""
import copy
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile

from .common import (GENERATED, SOURCES, SKILL_ROOT, encoded, foundation_root,
                     guard_generated, read_json, source_hashes, write_json)
from .models import MODELS


def unique(items, key, context):
    result = {}
    for item in items:
        value = item[key]
        if value in result:
            raise ValueError(f"{context} 存在重复 {key}: {value}")
        result[value] = item
    return result


def load_sources(project):
    data = {name: MODELS[Path(name).stem].model_validate(read_json(Path(project) / name)).model_dump()
            for name in SOURCES}
    brief, script, board, plan = (data[name] for name in SOURCES)
    low, high = brief["durationRangeSeconds"]
    if not 0 < low <= high:
        raise ValueError("brief.durationRangeSeconds 必须为递增的正数区间。")
    duration = sum(s["durationFrames"] for s in board["shots"]) / plan["output"]["fps"]
    if not low <= duration <= high:
        raise ValueError(f"分镜时长 {duration:g}s 超出 brief 的 {low:g}–{high:g}s；请回改 storyboard，不能由编译器静默延长。")
    cues = unique(script["cues"], "id", "script.cues")
    labels = unique(script["labels"], "id", "script.labels")
    if cues.keys() & labels.keys():
        raise ValueError("script 的 cue 与 label ID 不能重复。")
    shots = unique(board["shots"], "id", "storyboard.shots")
    plans = unique(plan["shots"], "id", "production-plan.shots")
    text = unique(plan["text"], "cueId", "production-plan.text")
    if shots.keys() != plans.keys():
        raise ValueError("storyboard 与 production-plan 的 shot ID 必须完全一致。")
    used_cues = []

    def validate_labels(value, field="params"):
        if isinstance(value, dict):
            if set(value) == {"labelId"}:
                if value["labelId"] not in labels:
                    raise ValueError(f"{field} 引用了不存在的 labelId {value['labelId']}")
                return
            for key, child in value.items():
                if key in {"label", "unit", "resultLabel", "detail"}:
                    if not isinstance(child, dict) or set(child) != {"labelId"}:
                        raise ValueError(f"{field}.{key} 的文字必须在 script.labels 维护，以 labelId 引用。")
                if key == "options" and (not isinstance(child, list) or
                        any(not isinstance(item, dict) or set(item) != {"labelId"} for item in child)):
                    raise ValueError(f"{field}.options 必须引用 script.labels。")
                validate_labels(child, field + "." + key)
        elif isinstance(value, list):
            for child in value:
                validate_labels(child, field)

    for shot in shots.values():
        validate_labels(shot["params"], shot["id"] + ".params")
        validate_labels(shot["components"], shot["id"] + ".components")
        for component in shot['components']:
            component_data = component.get('data', {})
            for item in [component_data, *component_data.get('items', [])]:
                fields = ('title', 'eyebrow', 'detail', 'label', 'unit', 'index', 'rootTitle', 'language', 'text')
                if component.get('kind') != 'bars':
                    fields += ('value',)
                for field in fields:
                    if field in item and (not isinstance(item[field], dict) or set(item[field]) != {'labelId'}):
                        raise ValueError(f"{shot['id']}: component {field} must reference script.labels")
        events = unique(shot["events"], "id", f"{shot['id']}.events")
        for event in events.values():
            if event["id"] in ("enter", "exit") or event["frame"] >= shot["durationFrames"]:
                raise ValueError(f"{shot['id']}.{event['id']} 无效：enter/exit 保留，事件必须位于镜头内。")
        objects = unique(shot["objects"], "id", f"{shot['id']}.objects")
        assets = unique(plans[shot["id"]]["objects"], "id", f"{shot['id']}.assets")
        if objects.keys() != assets.keys():
            raise ValueError(f"{shot['id']} 物体位置与素材选择的 ID 不一致。")
        for placement in shot["cues"]:
            used_cues.append(placement["cueId"])
            for edge in ("start", "end"):
                if placement[edge]["event"].split(".")[0] != shot["id"]:
                    raise ValueError(f"{placement['cueId']} 的 {edge} 应引用所属镜头 {shot['id']}。")
    if len(set(used_cues)) != len(used_cues):
        raise ValueError("同一个 cueId 只能放置一次；重复文案请创建新的稳定 cue ID。")
    if set(used_cues) != set(cues) or set(text) != set(cues):
        raise ValueError("script、storyboard cue 引用与 production-plan.text 必须覆盖同一组 cue ID。")
    for cue_id, appearance in text.items():
        if appearance["role"] == "subtitle" and not cues[cue_id]["phrases"]:
            raise ValueError(f"字幕 {cue_id} 缺少 phrases；模拟讲述嘴型需要脚本短句。")
    if plan["audioMode"] == "silent" and plan["audio"]:
        raise ValueError("silent 模式不能同时安排音效，请回改 production-plan.audio。")
    unique(plan["audio"], "id", "production-plan.audio")
    unique(plan['narration'], 'id', 'production-plan.narration')
    if bool(plan['narration']) != (plan['audioMode'] == 'narration+sfx'):
        raise ValueError('narration 需要 audioMode=narration+sfx，且该模式须提供旁白 WAV。')
    return data


def transform(sources):
    """Every emitted scalar has a portable, stable source owner."""
    _, script, board, plan = (sources[name] for name in SOURCES)
    outputs = {name: {} for name in GENERATED}
    mappings = []
    labels = {label["id"]: label["text"] for label in script["labels"]}

    def map_value(file, pointer, value, source, stable_id, field):
        if isinstance(value, dict) and value:
            for key, child in value.items():
                escaped = str(key).replace("~", "~0").replace("/", "~1")
                map_value(file, pointer + "/" + escaped, child, source, stable_id, field + "/" + escaped)
        elif isinstance(value, list) and value:
            for i, child in enumerate(value):
                map_value(file, pointer + "/" + str(i), child, source, stable_id, field + "/" + str(i))
        else:
            mappings.append({"generatedFile": file, "jsonPointer": pointer,
                             "sourceFile": "../" + source, "stableId": stable_id, "field": field})
        return copy.deepcopy(value)

    def scene_params(value, pointer, sid, field):
        if isinstance(value, dict) and set(value) == {"labelId"}:
            label_id = value["labelId"]
            if label_id not in labels:
                raise ValueError(f"{sid} 引用了不存在的 script.labels ID：{label_id}")
            return map_value("timeline.json", pointer, labels[label_id], "script.json", label_id, "/text")
        if isinstance(value, dict):
            return {key: scene_params(child, pointer + "/" + key, sid, field + "/" + key)
                    for key, child in value.items()}
        if isinstance(value, list):
            return [scene_params(child, pointer + "/" + str(i), sid, field + "/" + str(i))
                    for i, child in enumerate(value)]
        return map_value("timeline.json", pointer, value, "storyboard.json", sid, field)

    project = outputs["project.json"]
    for field in ("schemaVersion", "title", "style", "seed", "audioMode"):
        project[field] = map_value("project.json", "/" + field, plan[field], "production-plan.json", plan["id"], "/" + field)
    project["authoringMode"] = map_value("project.json", "/authoringMode", "director", "production-plan.json", plan["id"], "/$generated/authoringMode")
    for field, value in plan["output"].items():
        project[field] = map_value("project.json", "/" + field, value, "production-plan.json", plan["id"], "/output/" + field)
    cue_lookup = {c["id"]: c for c in script["cues"]}
    plan_lookup = {s["id"]: s for s in plan["shots"]}
    appearance = {t["cueId"]: t for t in plan["text"]}
    outputs["timeline.json"]["shots"] = []
    if board.get('progress'):
        outputs['timeline.json']['progress'] = scene_params(board['progress'], '/progress', 'progress', '/progress')
    outputs["text.json"]["cues"] = []
    for i, shot in enumerate(board["shots"]):
        sid, shot_plan = shot["id"], plan_lookup[shot["id"]]
        timeline_shot = {}
        for field in ("id", "durationFrames", "scene", "events"):
            timeline_shot[field] = map_value("timeline.json", f"/shots/{i}/{field}", shot[field], "storyboard.json", sid, "/" + field)
        timeline_shot["params"] = scene_params(shot["params"], f"/shots/{i}/params", sid, "/params")
        if shot['components']:
            timeline_shot['components'] = scene_params(shot['components'], f'/shots/{i}/components', sid, '/components')
        if shot.get('performance'):
            timeline_shot['performance'] = map_value('timeline.json',f'/shots/{i}/performance',shot['performance'],'storyboard.json',sid,'/performance')
        for field in ('background', 'replacement'):
            if shot_plan[field] is not None:
                timeline_shot[field] = map_value('timeline.json', f'/shots/{i}/{field}', shot_plan[field], 'production-plan.json', sid, '/' + field)
        for field in ("actor", "motions"):
            timeline_shot[field] = map_value("timeline.json", f"/shots/{i}/{field}", shot_plan[field], "production-plan.json", sid, "/" + field)
        assets = {a["id"]: a for a in shot_plan["objects"]}
        timeline_shot["objects"] = []
        for j, obj in enumerate(shot["objects"]):
            target = {field: map_value("timeline.json", f"/shots/{i}/objects/{j}/{field}", value, "storyboard.json", sid, f"/objects/{j}/" + field)
                      for field, value in obj.items()}
            asset_index = next(k for k, asset in enumerate(shot_plan["objects"]) if asset["id"] == obj["id"])
            target["asset"] = map_value("timeline.json", f"/shots/{i}/objects/{j}/asset", assets[obj["id"]]["asset"], "production-plan.json", sid, f"/objects/{asset_index}/asset")
            timeline_shot["objects"].append(target)
        outputs["timeline.json"]["shots"].append(timeline_shot)
        for placement in shot["cues"]:
            cid = placement["cueId"]
            cue, look = cue_lookup[cid], appearance[cid]
            j = len(outputs["text.json"]["cues"])
            target = {field: map_value("text.json", f"/cues/{j}/{field}", cue[field], "script.json", cid, "/" + field)
                      for field in ("id", "text", "phrases")}
            for field in ("start", "end"):
                target[field] = map_value("text.json", f"/cues/{j}/{field}", placement[field], "storyboard.json", cid, "/" + field)
            for field in ("role", "accent", "x", "y"):
                if look[field] is not None:
                    target[field] = map_value("text.json", f"/cues/{j}/{field}", look[field], "production-plan.json", cid, "/" + field)
            outputs["text.json"]["cues"].append(target)
    outputs["audio.json"]["cues"] = [map_value("audio.json", f"/cues/{i}", cue, "production-plan.json", cue["id"], "")
                                            for i, cue in enumerate(plan["audio"])]
    outputs['audio.json']['speechDuck'] = map_value('audio.json', '/speechDuck', plan['speechDuck'], 'production-plan.json', plan['id'], '/speechDuck')
    if plan['narration']:
        outputs['audio.json']['narration'] = [map_value('audio.json', f'/narration/{i}', cue, 'production-plan.json', cue['id'], '') for i,cue in enumerate(plan['narration'])]
    return outputs, mappings


def foundation_validate(foundation, project):
    process = subprocess.run([sys.executable, str(foundation / "scripts" / "video.py"),
                              "validate", str(project)], capture_output=True, text=True, encoding="utf-8",
                             env={**os.environ, "PYTHONUTF8": "1", "PYTHONIOENCODING": "utf-8"})
    if process.returncode:
        raise ValueError("基础 VideoSpec 校验失败：\n" + (process.stderr or process.stdout).strip())
    try:
        return json.loads(process.stdout)
    except json.JSONDecodeError as exc:
        raise ValueError("基础 validate 未返回 JSON；请检查 pixel-game-video 版本。") from exc


def handoff(project, foundation=None):
    project = Path(project).resolve()
    root = foundation_root(foundation)
    guard_generated(project)
    sources = load_sources(project)
    outputs, mappings = transform(sources)
    source_map = {"schemaVersion": 1,
                  "generatedHashes": {name: hashlib.sha256(encoded(data)).hexdigest() for name, data in outputs.items()},
                  "sourceHashes": {"../" + name: value for name, value in source_hashes(project).items()},
                  "mappings": mappings}
    media = {}
    media_refs = list(sources['production-plan.json']['narration'])
    visual_files = []
    for shot in sources['production-plan.json']['shots']:
        visual_files.extend(shot[field] for field in ('background', 'replacement') if shot[field])
    for shot in sources['storyboard.json']['shots']:
        for component in shot['components']:
            data = component.get('data', {})
            visual_files.extend({'file': item['image']} for item in [data, *data.get('items', [])] if item.get('image'))
    from pathlib import PurePosixPath, PureWindowsPath
    for item in visual_files:
        relative = item['file']
        if not isinstance(relative, str) or '\\' in relative or PureWindowsPath(relative).is_absolute() or PurePosixPath(relative).parts[:1] != ('media',) or '..' in PurePosixPath(relative).parts:
            raise ValueError('Visual media must use a portable path inside media/')
    media_refs.extend(visual_files)
    for cue in media_refs:
        relative = Path(cue['file'])
        source = (project / relative).resolve()
        if relative.is_absolute() or not source.is_relative_to(project):
            raise ValueError('Media file must stay inside the authoring project')
        portable = source.relative_to(project).as_posix()
        media[portable] = source
        source_map['sourceHashes']['../' + portable] = hashlib.sha256(source.read_bytes()).hexdigest()
        source_map['generatedHashes'][portable] = source_map['sourceHashes']['../' + portable]
    # A sibling staging directory keeps ../source.json valid during validation.
    with tempfile.TemporaryDirectory(prefix=".handoff-", dir=project) as staging_name:
        staging = Path(staging_name)
        for name, data in outputs.items():
            write_json(staging / name, data)
        for name, source in media.items():
            (staging / name).parent.mkdir(parents=True, exist_ok=True)
            (staging / name).write_bytes(source.read_bytes())
        write_json(staging / "source-map.json", source_map)
        validation = foundation_validate(root, staging)
        video = project / "video"
        video.mkdir(exist_ok=True)
        for name in (*GENERATED, "source-map.json"):
            os.replace(staging / name, video / name)
        for name in media:
            (video / name).parent.mkdir(parents=True, exist_ok=True)
            os.replace(staging / name, video / name)
    write_json(project / ".director-state.json", {"schemaVersion": 1, "sources": sources,
                                                  "inputHash": validation["inputHash"]})
    return {"valid": True, "video": "video", "inputHash": validation["inputHash"],
            "durationFrames": sum(s["durationFrames"] for s in sources["storyboard.json"]["shots"]),
            "mappedFields": len(mappings)}


def initialize(project, example, idea=None):
    target = Path(project)
    if target.exists() and any(target.iterdir()):
        raise ValueError("init 目标必须为空目录；已有产物直接继续 check/handoff，不重新初始化。")
    template = SKILL_ROOT / ("examples/bounded-choice" if example else "assets/templates")
    target.mkdir(parents=True, exist_ok=True)
    for name in SOURCES:
        data = read_json(template / name)
        if name == "brief.json" and idea:
            data["idea"] = idea
            if not example:
                data["takeaway"] = idea
        write_json(target / name, data)
    return {"project": str(target), "example": example,
            "next": "编辑 brief/script/storyboard/production-plan 后执行 check 和 handoff。模板不代替创意写作。"}


def impact(project, source=None, stable_id=None, field=None):
    project = Path(project)
    sources = load_sources(project)
    previous_path = project / ".director-state.json"
    previous = read_json(previous_path)["sources"] if previous_path.exists() else {}
    changes = []
    if source:
        if source not in SOURCES:
            raise ValueError("--source 应为四个创作源文件之一。")
        changes = [{"sourceFile": source, "stableId": stable_id, "field": field}]
    else:
        for name in SOURCES:
            if previous.get(name) != sources[name]:
                changes.append({"sourceFile": name, "stableId": None, "field": None})
    board = sources["storyboard.json"]["shots"]
    affected = set()
    categories = set()
    components = set()

    def references_label(value, label_id):
        if isinstance(value, dict):
            return value.get("labelId") == label_id or any(references_label(v, label_id) for v in value.values())
        if isinstance(value, list):
            return any(references_label(v, label_id) for v in value)
        return False

    for change in changes:
        name, sid = change["sourceFile"], change["stableId"]
        if name == "script.json":
            affected.update(s["id"] for s in board if not sid or any(c["cueId"] == sid for c in s["cues"])
                            or references_label(s["params"], sid) or references_label(s['components'], sid))
            categories.update(("content", "text", "visual"))
            components.update(("text", "mouth", "reading-duration"))
        elif name == "storyboard.json":
            start = next((i for i, s in enumerate(board) if s["id"] == sid), 0)
            affected.update(s["id"] for s in board[max(0, start - 1):])
            categories.update(("content", "visual", "motion", "text", "audio", "technical"))
            components.update(("timeline", "frames", "audio"))
        elif name == "production-plan.json":
            audio_change = (change["field"] or "").startswith("/audio")
            if audio_change:
                cues = sources[name]["audio"]
                affected.update(c["at"]["event"].split(".")[0] for c in cues if not sid or c["id"] == sid)
                categories.update(("audio", "technical"))
                components.update(("audio", "mux"))
            else:
                affected.update(s["id"] for s in board)
                categories.update(("visual", "motion", "text", "audio", "technical"))
                components.update(("frames", "audio"))
        else:
            affected.update(s["id"] for s in board)
            categories.add("content")
            components.add("creative-intent")
    def snapshot_refs(value):
        if isinstance(value, dict):
            result = {value['sourceShot']} if isinstance(value.get('sourceShot'), str) else set()
            result.update(value.get('sourceShots', []))
            for child in value.values():
                result.update(snapshot_refs(child))
            return result
        if isinstance(value, list):
            return set().union(*(snapshot_refs(child) for child in value))
        return set()

    # Card snapshots inherit the source shot's visual changes, transitively.
    while True:
        dependent = {s['id'] for s in board if snapshot_refs(s) & affected}
        if dependent <= affected:
            break
        affected.update(dependent)
    if stable_id and not affected:
        raise ValueError(f"没有找到受 {source}:{stable_id} 影响的镜头。")
    frame, ranges = 0, []
    for shot in board:
        if shot["id"] in affected:
            ranges.append({"shotId": shot["id"], "startFrame": frame,
                           "endFrame": frame + shot["durationFrames"]})
        frame += shot["durationFrames"]
    return {"changes": changes, "affectedShots": ranges, "components": sorted(components),
            "reviewCategories": sorted(categories), "renderRequired": bool(changes),
            "note": "这是影响诊断；当前交付仍须重新生成和完整合成，未实现片段缓存复用。"}
