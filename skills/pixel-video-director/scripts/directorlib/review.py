"""A review is evidence for one exact input and one exact rendered video."""
from pathlib import Path

from .authoring import foundation_validate, load_sources, unique
from .common import (confined, digest, foundation_root, guard_generated, read_json,
                     source_hashes, write_json)
from .models import Review


CATEGORIES = {"content", "visual", "motion", "text", "audio", "technical"}
EVIDENCE_KINDS = {"content": {"playback"}, "visual": {"playback"},
                  "motion": {"playback"}, "text": {"frame", "playback"},
                  "audio": {"audio", "playback"}, "technical": {"metadata"}}


def current_binding(project, manifest_path, foundation=None):
    project = Path(project).resolve()
    guard_generated(project, require_current_sources=True)
    manifest_path = Path(manifest_path).resolve()
    if not manifest_path.is_relative_to(project / "video"):
        raise ValueError("render-manifest.json 必须位于此工程的 video/ 目录中。")
    manifest = read_json(manifest_path)
    validation = foundation_validate(foundation_root(foundation), project / "video")
    if manifest["inputHash"] != validation["inputHash"]:
        raise ValueError("成片对应旧输入；请重新 render 后 review。")
    media = confined(project / "video", manifest["video"])
    if not media.is_file():
        raise ValueError("成片不存在：" + str(media))
    actual_hash = digest(media)
    if actual_hash != manifest["videoSha256"]:
        raise ValueError("实际 MP4 SHA256 与 render-manifest 不一致。")
    duration = sum(s["durationFrames"] for s in load_sources(project)["storyboard.json"]["shots"])
    source_range = manifest.get("sourceRange", {})
    if source_range.get("startFrame") != 0 or source_range.get("endFrame") != duration:
        raise ValueError("Review 必须绑定完整成片；局部预览不能作为最终交付证据。")
    return {"inputHash": manifest["inputHash"], "videoSha256": actual_hash,
            "video": media.relative_to(project).as_posix(),
            "renderManifest": manifest_path.relative_to(project).as_posix(),
            "sourceHashes": source_hashes(project)}


def initialize_review(project, manifest_path, output="review.json", foundation=None):
    project = Path(project).resolve()
    target = confined(project, output)
    if target.exists():
        raise ValueError("review 已存在；保留已有证据，使用 --output review-v2.json 开始新一轮。")
    binding = current_binding(project, manifest_path, foundation)
    checks = [{"category": name, "status": "not_reviewed", "evidence": [], "notes": ""}
              for name in ("content", "visual", "motion", "text", "audio", "technical")]
    metadata_path = Path(manifest_path).resolve().parent / "metadata.json"
    if metadata_path.exists():
        metadata = read_json(metadata_path)
        if (metadata.get("inputHash") == binding["inputHash"] and
                metadata.get("videoSha256") == binding["videoSha256"] and
                metadata.get("technicalStatus") in ("passed", "failed")):
            checks[-1].update({"status": metadata["technicalStatus"], "evidence": [{
                "kind": "metadata", "path": metadata_path.relative_to(project).as_posix(),
                "description": "读取本次成片的媒体核验报告，并比对输入与 MP4 哈希。", "checked": True}]})
    review = Review.model_validate({"schemaVersion": 1, "binding": binding, "checks": checks, "issues": []})
    write_json(target, review.model_dump())
    return {"review": target.relative_to(project).as_posix(), "status": "not_reviewed",
            "pending": [c["category"] for c in checks if c["status"] == "not_reviewed"]}


def check_evidence(project, evidence, category, status, errors, label, silent=False, issue=False):
    checked = []
    for item in evidence:
        path = confined(project, item["path"])
        if not path.is_file():
            errors.append(f"{label} 证据不存在：{item['path']}")
        if item["checked"] and path.is_file():
            checked.append(item)
    allowed = EVIDENCE_KINDS[category] | ({"metadata"} if silent and category == "audio" else set())
    # A localized static defect can be rechecked in a decoded frame without
    # claiming that its entire review category has been watched end to end.
    if issue and category in {"content", "visual"}:
        allowed = allowed | {"frame"}
    if status == "passed" and not any(e["kind"] in allowed for e in checked):
        errors.append(f"{label} 缺少已检查的 {sorted(allowed)} 证据，不能 passed。")


def find_stable(value, stable_id):
    found = []
    if isinstance(value, dict):
        if value.get("id") == stable_id or value.get("cueId") == stable_id:
            found.append(value)
        for child in value.values():
            found.extend(find_stable(child, stable_id))
    elif isinstance(value, list):
        for child in value:
            found.extend(find_stable(child, stable_id))
    return found


def resolve_field(value, pointer):
    if pointer in ("", "/"):
        return value
    if not pointer.startswith("/"):
        raise ValueError("sourceRef.field 必须是相对稳定对象的 JSON Pointer。")
    for part in pointer[1:].split("/"):
        part = part.replace("~1", "/").replace("~0", "~")
        value = value[int(part)] if isinstance(value, list) else value[part]
    return value


def check_review(project, review_path="review.json", foundation=None):
    project = Path(project).resolve()
    report = Review.model_validate(read_json(confined(project, review_path))).model_dump()
    binding = current_binding(project, confined(project, report["binding"]["renderManifest"]), foundation)
    if report["binding"] != binding:
        raise ValueError("Review 绑定已过期：输入、源文件或成片变化。保留旧记录，重新 review-init。")
    checks = unique(report["checks"], "category", "review.checks")
    if checks.keys() != CATEGORIES:
        raise ValueError("Review 必须分别记录 content/visual/motion/text/audio/technical 六类检查。")
    sources = load_sources(project)
    silent = sources["production-plan.json"]["audioMode"] == "silent"
    errors = []
    for category, check in checks.items():
        check_evidence(project, check["evidence"], category, check["status"], errors, category, silent)
    unique(report["issues"], "issueId", "review.issues")
    offset, shot_ranges = 0, {}
    for shot in sources["storyboard.json"]["shots"]:
        shot_ranges[shot["id"]] = (offset, offset + shot["durationFrames"])
        offset += shot["durationFrames"]
    for issue in report["issues"]:
        label = issue["issueId"]
        check_evidence(project, issue["evidence"], issue["category"], issue["status"], errors, label, silent, issue=True)
        bounds = shot_ranges.get(issue["shotId"])
        interval = issue["timeRange"]
        if not bounds or not bounds[0] <= interval["startFrame"] < interval["endFrame"] <= bounds[1]:
            errors.append(f"{label} timeRange 必须在 {issue['shotId']} 的全局帧区间内。")
        ref = issue["sourceRef"]
        targets = find_stable(sources[ref["file"]], ref["stableId"])
        if len(targets) != 1:
            errors.append(f"{label} sourceRef.stableId 必须唯一定位源对象；当前匹配 {len(targets)} 项。")
        else:
            try:
                resolve_field(targets[0], ref["field"])
            except (KeyError, IndexError, TypeError, ValueError):
                errors.append(f"{label} sourceRef.field 无法定位：{ref['field']}")
    pending = [c for c, item in checks.items() if item["status"] == "not_reviewed"]
    failed = [c for c, item in checks.items() if item["status"] == "failed"]
    unresolved = [i["issueId"] for i in report["issues"] if i["status"] != "passed"]
    status = "failed" if errors or failed or unresolved else "not_reviewed" if pending else "passed"
    return {"status": status, "errors": errors, "failed": failed,
            "pending": pending, "unresolvedIssues": unresolved, "binding": binding}
