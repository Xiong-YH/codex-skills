"""Review the exported edit branch without borrowing upstream review status."""
import json
import os
from pathlib import Path
import subprocess

from .common import confined, digest, foundation_root, read_json, write_json
from .models import WorkbenchReview
from .review import CATEGORIES, check_evidence
from .authoring import unique


def workbench_binding(root, project_json, video):
    root = Path(root).resolve()
    project_path, media = confined(root, project_json), confined(root, video)
    # Reuse the workbench's actual input validator, rather than a looser copy.
    validator = foundation_root() / 'workbench/src/projectValidation.js'
    caption_validator = validator.with_name('captionDesign.js')
    script = ("import {readFileSync} from 'node:fs';import {pathToFileURL} from 'node:url';"
              "const {validateProject}=await import(pathToFileURL(process.argv[1]));"
              "const {validateCaptionDesign}=await import(pathToFileURL(process.argv[3]));"
              "const project=JSON.parse(readFileSync(process.argv[2],'utf8'));"
              "validateProject(project);validateCaptionDesign(project);")
    checked = subprocess.run([os.environ.get('PIXEL_NODE', 'node'), '--input-type=module', '-e',
                              script, str(validator), str(project_path), str(caption_validator)],
                             capture_output=True, text=True, encoding='utf-8')
    if checked.returncode:
        raise ValueError('工作台项目校验失败：' + checked.stderr)
    project = read_json(project_path)
    probe = subprocess.run([os.environ.get('PIXEL_FFPROBE', 'ffprobe'), '-v', 'error',
                            '-count_frames', '-show_streams', '-of', 'json', str(media)],
                           capture_output=True, text=True, encoding='utf-8')
    if probe.returncode:
        raise ValueError('无法核验实际 MP4：' + probe.stderr)
    streams = json.loads(probe.stdout)['streams']
    videos = [s for s in streams if s['codec_type'] == 'video']
    if len(videos) != 1:
        raise ValueError('成片必须包含一个视频流')
    v = videos[0]
    numerator, denominator = map(int, v['avg_frame_rate'].split('/'))
    total = max(2, project.get('exportDurationInFrames', 0), *[
        c['start'] + c['duration'] for t in project['tracks'] if not t.get('hidden') for c in t['clips']])
    if ((v['width'], v['height']) != (project['width'], project['height'])
            or denominator <= 0 or abs(numerator / denominator - project['fps']) > .001
            or int(v['nb_read_frames']) != total):
        raise ValueError('MP4 尺寸、帧率或帧数与导出项目不符')
    metadata = {'width': v['width'], 'height': v['height'], 'fps': project['fps'],
                'durationFrames': total, 'hasAudio': any(s['codec_type'] == 'audio' for s in streams)}
    return {'branch': 'workbench', 'projectJson': project_path.relative_to(root).as_posix(),
            'projectSha256': digest(project_path), 'video': media.relative_to(root).as_posix(),
            'videoSha256': digest(media), 'metadata': metadata}


def initialize_workbench_review(root, project_json, video, output='workbench-review.json'):
    target = confined(root, output)
    if target.exists():
        raise ValueError('Review 已存在；使用 --output 保留旧证据')
    binding = workbench_binding(root, project_json, video)
    report = WorkbenchReview(binding=binding, checks=[{'category': c} for c in sorted(CATEGORIES)])
    write_json(target, report.model_dump())
    return {'review': output, 'status': 'not_reviewed',
            'note': '已核对文件绑定及媒体规格；实际播放、核字和听音仍须记录。'}


def check_workbench_review(root, review_path='workbench-review.json'):
    report = WorkbenchReview.model_validate(read_json(confined(root, review_path))).model_dump()
    old = report['binding']
    current = workbench_binding(root, old['projectJson'], old['video'])
    if old != current:
        raise ValueError('工作台 Review 已过期：项目或成片已改变')
    checks = unique(report['checks'], 'category', 'checks')
    if checks.keys() != CATEGORIES:
        raise ValueError('必须分别记录六类检查')
    errors = []
    for category, check in checks.items():
        check_evidence(root, check['evidence'], category, check['status'], errors, category,
                       silent=not current['metadata']['hasAudio'])
    project = read_json(confined(root, current['projectJson']))
    clips = {c['id']: c for t in project['tracks'] for c in t['clips']}
    unique(report['issues'], 'issueId', 'issues')
    for issue in report['issues']:
        clip, span = clips.get(issue['clipId']), issue['timeRange']
        if (not clip or not clip['start'] <= span['startFrame'] < span['endFrame']
                <= min(clip['start'] + clip['duration'], current['metadata']['durationFrames'])):
            errors.append(issue['issueId'] + ': 区间必须位于实际导出片段内')
        check_evidence(root, issue['evidence'], issue['category'], issue['status'], errors,
                       issue['issueId'], silent=not current['metadata']['hasAudio'], issue=True)
    failed = [c for c, v in checks.items() if v['status'] == 'failed']
    pending = [c for c, v in checks.items() if v['status'] == 'not_reviewed']
    unresolved = [i['issueId'] for i in report['issues'] if i['status'] != 'passed']
    return {'status': 'failed' if errors or failed or unresolved else 'not_reviewed' if pending else 'passed',
            'errors': errors, 'failed': failed, 'pending': pending, 'unresolvedIssues': unresolved,
            'binding': current}
