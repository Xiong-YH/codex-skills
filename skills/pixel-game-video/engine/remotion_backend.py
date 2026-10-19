"""Prepare a native Remotion project without invoking the Canvas runtime.

The compiled integer-frame timeline remains the only timing authority. Runtime
dependencies are explicit and never downloaded by these entry points.
"""
from __future__ import annotations

import base64
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys

ENGINE = Path(__file__).resolve().parent
SOURCE = ENGINE / "remotion"
IGNORED_BUILD_PARTS = {"node_modules", ".cache", ".remotion", "__pycache__"}


def _hash(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _write(path: Path, value: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def _module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _node() -> str:
    requested = os.environ.get("PIXEL_NODE") or "node"
    executable = shutil.which(requested)
    if not executable:
        raise RuntimeError("Missing Node.js; put node on PATH or set PIXEL_NODE.")
    return executable


def _driver(*arguments: str, capture: bool = True):
    command = [_node(), str(SOURCE / "driver.cjs"), *map(str, arguments)]
    result = subprocess.run(command, capture_output=capture, text=True,
                            creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0)
    if result.returncode:
        message = (result.stderr or "").strip()
        raise RuntimeError(f"Remotion {arguments[0]} failed ({result.returncode}): {message[-5000:]}")
    return json.loads(result.stdout) if capture else result


def build(project_root: Path | str, resolved: dict, skill_root: Path | str,
          silent: bool = False) -> Path:
    root, skill = Path(project_root).resolve(), Path(skill_root).resolve()
    if resolved["project"].get("renderBackend") != "remotion":
        raise ValueError("Remotion build requires project.renderBackend=remotion.")
    source = skill / "engine/remotion"
    if not (source / "src/index.tsx").is_file():
        raise ValueError("Missing native Remotion entry point: engine/remotion/src/index.tsx")
    output, generated = root / "build", root / "build/remotion"
    generated.mkdir(parents=True, exist_ok=True)
    # Regeneration replaces generated source only. Local installed packages stay.
    if (generated / "src").exists():
        shutil.rmtree(generated / "src")
    if (generated / "public").exists():
        shutil.rmtree(generated / "public")
    shutil.copytree(source / "src", generated / "src")
    public = generated / "public"
    public.mkdir()
    for name in ("package.json", "package-lock.json"):
        shutil.copy2(source / name, generated / name)
    _write(generated / "tsconfig.json", {
        "compilerOptions": {"target": "ES2020", "lib": ["ES2020", "DOM"],
                            "jsx": "react-jsx", "module": "ESNext", "moduleResolution": "Bundler",
                            "strict": True, "esModuleInterop": True, "skipLibCheck": True,
                            "resolveJsonModule": True, "noEmit": True},
        "include": ["src"]})
    modules = skill / "modules"
    prepare = _module("pixel_remotion_prepare", modules / "library/prepare.py")
    from .dependencies import actor_ids, selected_style
    selected, style = selected_style(skill, resolved)
    if style["id"] != selected["id"]:
        raise ValueError("Style catalog and preset identity differ.")
    assets = prepare.prepare(modules / "library", actor_ids=actor_ids(resolved))
    mime_types = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp"}
    style_root = (modules / "style").resolve()
    for ident, relative in style.get("assets", {}).items():
        image = (style_root / relative).resolve()
        if not image.is_relative_to(style_root):
            raise ValueError("Style asset escapes its module.")
        mime = mime_types.get(image.suffix.lower())
        if not mime or ident in assets:
            raise ValueError("Invalid or duplicate style image: " + ident)
        assets[ident] = "data:" + mime + ";base64," + base64.b64encode(image.read_bytes()).decode("ascii")
    audio = None
    if not silent and resolved["project"]["audioMode"] != "silent":
        audio_dir = modules / "audio"
        sys.path.insert(0, str(audio_dir))
        try:
            mixer = _module("pixel_remotion_mixer", audio_dir / "mixer.py")
            wav = mixer.render(resolved, output, root)
        finally:
            sys.path.remove(str(audio_dir))
        shutil.copy2(wav, public / "animation.wav")
        audio = "animation.wav"
    else:
        for name in ("animation-sfx.wav", "sfx-events.json"):
            stale = output / name
            if stale.is_file():
                stale.unlink()
    _write(public / "payload.json", {"resolved": resolved, "style": style, "assets": assets, "audio": audio})
    files = {p.relative_to(root).as_posix(): _hash(p)
             for p in sorted(generated.rglob("*"))
             if p.is_file() and not set(p.relative_to(generated).parts) & IGNORED_BUILD_PARTS}
    for name in ("animation-sfx.wav", "sfx-events.json"):
        path = output / name
        if path.is_file():
            files[path.relative_to(root).as_posix()] = _hash(path)
    manifest = output / "remotion-build.json"
    _write(manifest, {"contractVersion": 1, "backend": "remotion", "inputHash": resolved["inputHash"],
                      "project": "build/remotion", "entryPoint": "src/index.tsx", "compositionId": "PixelFilm",
                      "builtFiles": files})
    return manifest


def verify_build(project_root: Path | str, resolved: dict | None = None) -> dict:
    """Reject stale or hand-edited generated TSX, static assets, and payload."""
    root = Path(project_root).resolve()
    path = root / "build/remotion-build.json"
    if not path.is_file():
        raise ValueError("Missing build/remotion-build.json; run build before using Remotion.")
    manifest = json.loads(path.read_text(encoding="utf-8"))
    if (not isinstance(manifest, dict) or manifest.get("contractVersion") != 1 or
            manifest.get("backend") != "remotion" or
            not isinstance(manifest.get("builtFiles"), dict) or not manifest["builtFiles"] or
            manifest.get("project") != "build/remotion" or manifest.get("entryPoint") != "src/index.tsx" or
            manifest.get("compositionId") != "PixelFilm"):
        raise ValueError("Invalid Remotion build manifest; rebuild the project.")
    if resolved is None:
        resolved = json.loads((root / "build/resolved-timeline.json").read_text(encoding="utf-8"))
    if manifest.get("inputHash") != resolved.get("inputHash") or resolved["project"].get("renderBackend") != "remotion":
        raise ValueError("Remotion build belongs to a different timeline; rebuild the project.")
    required = {"build/remotion/src/index.tsx", "build/remotion/public/payload.json",
                "build/remotion/package.json", "build/remotion/package-lock.json", "build/remotion/tsconfig.json"}
    # New unlisted files can alter source imports or public resources just as
    # editing an existing file can, so include the complete derived source tree.
    for directory in (root / "build/remotion/src", root / "build/remotion/public"):
        required.update(p.relative_to(root).as_posix() for p in directory.rglob("*") if p.is_file())
    if not required.issubset(manifest["builtFiles"]):
        raise ValueError("Remotion build manifest is incomplete; rebuild the project.")
    for relative, expected in manifest["builtFiles"].items():
        if not isinstance(relative, str) or not isinstance(expected, str) or len(expected) != 64:
            raise ValueError("Invalid generated-file hash in Remotion build manifest; rebuild the project.")
        target = (root / relative).resolve()
        if not target.is_relative_to(root / "build") or not target.is_file() or _hash(target) != expected:
            raise ValueError(f"Generated Remotion file changed: {relative}; edit source inputs/runtime and rebuild.")
    payload = json.loads((root / "build/remotion/public/payload.json").read_text(encoding="utf-8"))
    if not isinstance(payload, dict) or payload.get("resolved") != resolved:
        raise ValueError("Remotion payload differs from the compiled timeline; rebuild the project.")
    if payload.get("audio") is not None and not {
            "build/remotion/public/animation.wav", "build/animation-sfx.wav"}.issubset(manifest["builtFiles"]):
        raise ValueError("Remotion build manifest is missing mixed audio; rebuild the project.")
    return manifest


def render_frames(project_root: Path | str, frames: Path | str, first: int, last: int) -> dict:
    root, frames = Path(project_root).resolve(), Path(frames).resolve()
    verify_build(root)
    result = _driver("render", root / "build/remotion", frames, first, last)
    if result.get("frameCount") != last - first:
        raise RuntimeError("Remotion frame count differs from the requested source range.")
    return result


def studio(project_root: Path | str) -> subprocess.Popen:
    """Start Studio without opening a system browser; it prints its exact URL."""
    root = Path(project_root).resolve()
    verify_build(root)
    return subprocess.Popen([_node(), str(SOURCE / "driver.cjs"), "studio", str(root / "build/remotion")],
                            creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0)


def doctor() -> dict:
    try:
        return _driver("doctor")
    except (OSError, ValueError, RuntimeError) as exc:
        return {"ready": False, "backend": "remotion", "error": str(exc),
                "note": "Install engine/remotion/package.json dependencies and configure PIXEL_BROWSER_EXECUTABLE."}
