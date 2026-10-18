#!/usr/bin/env python3
"""Executable authoring workflow; creative writing remains an explicit agent task."""
import argparse
import json
from pathlib import Path
import sys

try:
    from directorlib.authoring import handoff, impact, initialize, load_sources
    from directorlib.common import SKILL_ROOT, foundation_root, write_json
    from directorlib.models import MODELS
    from directorlib.review import check_review, initialize_review
    from directorlib.media import replace_media
except ImportError as exc:
    raise SystemExit("缺少 Python 依赖，请运行 python -m pip install -r requirements.txt：" + str(exc))


def parser():
    result = argparse.ArgumentParser(description=__doc__)
    sub = result.add_subparsers(dest="command", required=True)
    doctor = sub.add_parser("doctor", help="定位基础 skill 并检查执行入口")
    doctor.add_argument("--foundation")
    init = sub.add_parser("init", help="创建待编写模板或可运行示例")
    init.add_argument("project", type=Path)
    init.add_argument("--example", action="store_true", help="使用12秒《先给选择设边界》示例")
    init.add_argument("--idea", help="记录用户创意；不会伪装为自动写完脚本")
    for name in ("check", "handoff", "impact"):
        command = sub.add_parser(name)
        command.add_argument("project", type=Path)
        if name == "handoff":
            command.add_argument("--foundation")
        if name == "impact":
            command.add_argument("--source")
            command.add_argument("--id", dest="stable_id")
            command.add_argument("--field")
    init_review = sub.add_parser("review-init")
    init_review.add_argument("project", type=Path)
    init_review.add_argument("--manifest", required=True, type=Path)
    init_review.add_argument("--output", default="review.json")
    init_review.add_argument("--foundation")
    review = sub.add_parser("review-check")
    review.add_argument("project", type=Path)
    review.add_argument("--review", default="review.json")
    review.add_argument("--foundation")
    schema = sub.add_parser("schema", help="从运行合同生成JSON Schema")
    schema.add_argument("--output", type=Path, default=SKILL_ROOT / "schemas")
    media = sub.add_parser('replace-media', help='按镜头替换背景或画面，保留时序；自动交接并校验')
    media.add_argument('project', type=Path)
    media.add_argument('shot_id')
    media.add_argument('--layer', choices=['background', 'replacement'], default='background')
    choice = media.add_mutually_exclusive_group(required=True)
    choice.add_argument('--file', type=Path)
    choice.add_argument('--clear', action='store_true')
    media.add_argument('--fit', choices=['cover', 'contain'], default='cover')
    media.add_argument('--trim-start', type=float, default=0)
    media.add_argument('--hold-last-frame', action='store_true')
    media.add_argument('--foundation')
    return result


def main():
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8")
    args = parser().parse_args()
    try:
        if args.command == "doctor":
            result = {"foundation": str(foundation_root(args.foundation)), "contractVersion": 1}
        elif args.command == "init":
            result = initialize(args.project, args.example, args.idea)
        elif args.command == "check":
            sources = load_sources(args.project)
            result = {"valid": True, "shots": len(sources["storyboard.json"]["shots"]),
                      "cues": len(sources["script.json"]["cues"]),
                      "visualIntentMissing": [s['id'] for s in sources['storyboard.json']['shots'] if not s['visual']]}
        elif args.command == 'replace-media':
            result = replace_media(args.project, args.shot_id, args.file, layer=args.layer, clear=args.clear,
                                   fit=args.fit, trim_start=args.trim_start, hold=args.hold_last_frame, foundation=args.foundation)
        elif args.command == "handoff":
            result = handoff(args.project, args.foundation)
        elif args.command == "impact":
            result = impact(args.project, args.source, args.stable_id, args.field)
        elif args.command == "review-init":
            result = initialize_review(args.project, args.manifest, args.output, args.foundation)
        elif args.command == "review-check":
            result = check_review(args.project, args.review, args.foundation)
        else:
            for name, model in MODELS.items():
                write_json(args.output / (name + ".schema.json"), model.model_json_schema())
            result = {"schemas": len(MODELS), "output": str(args.output)}
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 2 if args.command == "review-check" and result["status"] != "passed" else 0
    except (ValueError, OSError, KeyError) as exc:
        print(json.dumps({"error": str(exc)}, ensure_ascii=False), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
