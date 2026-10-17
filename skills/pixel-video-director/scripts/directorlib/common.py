"""Portable dependency discovery and byte-level provenance utilities."""
import hashlib
import json
import os
from pathlib import Path


SOURCES = ("brief.json", "script.json", "storyboard.json", "production-plan.json")
GENERATED = ("project.json", "timeline.json", "text.json", "audio.json")
SKILL_ROOT = Path(__file__).resolve().parents[2]


def read_json(path):
    return json.loads(Path(path).read_text(encoding="utf-8-sig"))


def encoded(data):
    return (json.dumps(data, ensure_ascii=False, indent=2, allow_nan=False) + "\n").encode("utf-8")


def write_json(path, data):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(encoded(data))


def digest(path):
    h = hashlib.sha256()
    with Path(path).open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def source_hashes(project):
    return {name: digest(Path(project) / name) for name in SOURCES}


def foundation_root(explicit=None):
    """An explicit override is authoritative: do not hide a broken override."""
    override = explicit or os.environ.get("PIXEL_VIDEO_SKILL")
    if override:
        candidates = [Path(override).expanduser()]
    else:
        codex_home = Path(os.environ.get("CODEX_HOME", Path.home() / ".codex"))
        candidates = [SKILL_ROOT.parent / "pixel-game-video",
                      codex_home / "skills" / "pixel-game-video"]
    for path in candidates:
        if (path / "SKILL.md").is_file() and (path / "scripts" / "video.py").is_file():
            return path.resolve()
    raise ValueError("找不到 pixel-game-video 依赖。把两个 skill 安装为同级目录，或使用 "
                     "--foundation <基础skill目录> / PIXEL_VIDEO_SKILL。检查位置：" +
                     ", ".join(str(p) for p in candidates))


def confined(project, relative):
    """Evidence is project-local so a review stays portable."""
    root = Path(project).resolve()
    path = (root / relative).resolve()
    if not path.is_relative_to(root):
        raise ValueError(f"路径超出工程目录：{relative}")
    return path


def guard_generated(project, require_current_sources=False):
    video = Path(project) / "video"
    existing = [name for name in GENERATED if (video / name).exists()]
    if not existing:
        return
    source_map_path = video / "source-map.json"
    if not source_map_path.exists():
        raise ValueError("video/ 已有生成文件但缺少 source-map.json；请移出或恢复映射后交接，不能覆盖未知来源文件。")
    source_map = read_json(source_map_path)
    for name in GENERATED:
        path = video / name
        expected = source_map.get("generatedHashes", {}).get(name)
        if not path.exists() or not expected or digest(path) != expected:
            mappings = [m for m in source_map.get("mappings", []) if m["generatedFile"] == name]
            owners = sorted({m["sourceFile"] for m in mappings})
            raise ValueError(f"生成文件 video/{name} 被手改或缺失；请先把改动回写源文件 "
                             f"{', '.join(owners) or 'source-map.json 中对应 sourceFile'}，"
                             "然后恢复该生成文件再 handoff。详细定位见 video/source-map.json。")
    if require_current_sources and source_map.get("sourceHashes") != {"../" + name: value for name, value in source_hashes(project).items()}:
        raise ValueError("创作源文件已变化但尚未 handoff；请重新 handoff、render，再初始化 review。")
