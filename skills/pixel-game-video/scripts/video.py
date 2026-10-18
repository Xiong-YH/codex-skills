#!/usr/bin/env python3
"""Stable CLI for the modular pixel video skill."""
import argparse
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys

SKILL_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SKILL_ROOT))


def emit(value):
    print(json.dumps(value, ensure_ascii=False, indent=2))


def build(root):
    from engine.compiler import compile_project
    from engine.builder import build as build_media
    resolved = compile_project(root, write=True)
    build_media(root, resolved, SKILL_ROOT, silent=resolved["project"]["audioMode"] == "silent")
    return resolved


def doctor():
    result = {"python": sys.version.split()[0], "packages": {}}
    for name in ("pydantic", "numpy", "PIL"):
        result["packages"][name] = importlib.util.find_spec(name) is not None
    result["executables"] = {}
    for name in ("node", "ffmpeg", "ffprobe"):
        chosen = os.environ.get(f"PIXEL_{name.upper()}") or shutil.which(name)
        result["executables"][name] = bool(chosen and (Path(chosen).is_file() or shutil.which(chosen)))
    result["browserConfigured"] = bool(os.environ.get("PIXEL_BROWSER_EXECUTABLE"))
    node = os.environ.get("PIXEL_NODE") or shutil.which("node")
    if node:
        env = os.environ.copy()
        if env.get("PIXEL_NODE_MODULES"):
            env["NODE_PATH"] = env["PIXEL_NODE_MODULES"]
        check = subprocess.run([node, "-e", "require('playwright');console.log('ok')"], env=env, capture_output=True, text=True)
        result["playwright"] = check.returncode == 0
    else:
        result["playwright"] = False
    result["ready"] = all(result["packages"].values()) and all(result["executables"].values()) and result["playwright"]
    result["note"] = "Read references/runtime.md. A configured runtime still needs a real render to verify browser, fonts, encoder and audio."
    return result


def init_project(destination, title):
    if destination.exists():
        raise ValueError(f"destination already exists: {destination}")
    shutil.copytree(SKILL_ROOT / "assets/project-template", destination)
    from engine.compiler import read_json, write_json
    project = read_json(destination / "project.json")
    project["title"] = title
    write_json(destination / "project.json", project)
    return {"project": str(destination), "mode": "direct", "note": "Replace example content; duration and theme are editable."}


def export_project(root, destination):
    from engine.compiler import compile_project, INPUT_MODELS, read_json, write_json
    from engine.delivery import copy_skill
    resolved = compile_project(root)
    if destination.exists():
        raise ValueError(f"destination already exists: {destination}")
    if destination.is_relative_to(root) or destination.is_relative_to(SKILL_ROOT):
        raise ValueError("export destination must be outside the source project and skill")
    destination.mkdir(parents=True)
    runtime = destination / "pixel-game-video"
    copy_skill(SKILL_ROOT, runtime, include_tests=False)
    target = destination / "project"
    target.mkdir()
    for name in INPUT_MODELS:
        shutil.copy2(root / name, target / name)
    for cue in resolved.get('narration', []):
        media = target / cue['file']
        media.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(root / cue['file'], media)
    # Export a standalone direct snapshot; authoring sources are included separately.
    if resolved["project"]["authoringMode"] == "director":
        source_dir = destination / "authoring-sources"
        source_dir.mkdir()
        mapping = read_json(root / "source-map.json")
        for name in mapping["sourceHashes"]:
            source = (root / name).resolve()
            authoring_target = source_dir / source.relative_to(root.parent)
            authoring_target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, authoring_target)
        shutil.copy2(root / "source-map.json", source_dir / "source-map.json")
        project = read_json(target / "project.json")
        project["authoringMode"] = "direct"
        write_json(target / "project.json", project)
    write_json(destination / "export-manifest.json", {"sourceInputHash": resolved["inputHash"], "mode": "standalone-direct-snapshot", "runtime": "pixel-game-video", "project": "project"})
    (destination / "RUN.md").write_text("# Standalone video snapshot\n\nInstall dependencies in pixel-game-video/requirements.txt and package.json; configure browser and FFmpeg as described in pixel-game-video/references/runtime.md.\n\nRun `python pixel-game-video/scripts/video.py render project`. The export bundles source/assets, not runtime binaries or fonts. Director sources, when present, are preserved under authoring-sources; this project is an editable direct snapshot.\n", encoding="utf-8")
    return {"exported": str(destination), "sourceInputHash": resolved["inputHash"]}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    subs = parser.add_subparsers(dest="command", required=True)
    subs.add_parser("doctor")
    cat = subs.add_parser("catalog")
    cat.add_argument("module", nargs="?", choices=["style", "library", "text", "motion", "audio", "scenes"])
    init = subs.add_parser("init")
    init.add_argument("project", type=Path)
    init.add_argument("--title", default="像素视频示例")
    schema = subs.add_parser("schemas")
    schema.add_argument("--output", type=Path, default=SKILL_ROOT / "schemas")
    for name in ("validate", "build", "preview", "render", "inspect", "export-project"):
        command = subs.add_parser(name)
        command.add_argument("project", type=Path)
        if name in ("preview", "render"):
            command.add_argument("--name", default="preview" if name == "preview" else "film")
            command.add_argument("--start-frame", type=int, default=0)
            command.add_argument("--end-frame", type=int)
            command.add_argument("--overwrite", action="store_true")
        if name == "export-project":
            command.add_argument("destination", type=Path)
        if name == "inspect":
            command.add_argument("--name", default="film")
    args = parser.parse_args(argv)
    if args.command == "doctor":
        result = doctor()
        emit(result)
        return 0 if result["ready"] else 1
    from engine.compiler import catalog, compile_project, read_json, write_json
    if args.command == "catalog":
        data = catalog()
        emit(data[args.module] if args.module else data)
    elif args.command == "schemas":
        from engine.models import INPUT_MODELS
        for name, model in INPUT_MODELS.items():
            write_json(args.output / name.replace(".json", ".schema.json"), model.model_json_schema())
        emit({"schemas": str(args.output)})
    elif args.command == "init":
        emit(init_project(args.project.resolve(), args.title))
    elif args.command == "export-project":
        emit(export_project(args.project.resolve(), args.destination.resolve()))
    elif args.command == "inspect":
        from engine.render import inspect
        report = inspect(args.project.resolve(), name=args.name)
        emit(report)
        return 0 if report["technicalStatus"] == "passed" else 2
    elif args.command == "validate":
        data = compile_project(args.project)
        emit({"valid": True, "inputHash": data["inputHash"], "durationFrames": data["durationFrames"], "durationSeconds": data["durationSeconds"], "shots": len(data["shots"])})
    else:
        root = args.project.resolve()
        data = build(root)
        if args.command == "build":
            emit({"built": str(root / "build/film.html"), "inputHash": data["inputHash"]})
        else:
            from engine.render import render
            end = args.end_frame
            if args.command == "preview" and end is None:
                end = min(data["durationFrames"], args.start_frame + data["project"]["fps"] * 3)
            output = render(root, name=args.name, start_frame=args.start_frame, end_frame=end,
                            silent=data["project"]["audioMode"] == "silent", overwrite=args.overwrite)
            emit({"video": str(output), "inputHash": data["inputHash"]})
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (ValueError, OSError, RuntimeError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        raise SystemExit(2)
