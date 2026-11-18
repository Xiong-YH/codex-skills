'use strict';

const assert = require('node:assert/strict');

const notes = {
  s01: { audio: '0.75 秒的方波让提醒句先有起势。2 秒键盘接警示短震，4 秒首鼓切入人物处境。' },
  s02: {
    text: '四枚身份牌每半秒落下一枚，最后一枚在键盘与重鼓同时进入时稳住。镜头随后聚焦学长回忆框，字幕在下方。回忆框里只放学长形象和「— 学长」，再接成聊天标题栏。',
    audio: '身份牌在 4.50、5、5.50、6 秒依次落位。第 4 枚接第一轮的键盘长音。',
  },
  s03: { audio: '四条原话分别落在 9、10.50、12、13.25 秒，首三条用实测鼓组，末条接方波与 FM。读过末条后，14.50 秒问号随鼓打开秋招假设。' },
  'autumn-setup': { audio: '教程卡分四次落纸，夹扣只强调盖上「已收藏」的动作，两条字幕分开读。' },
  'autumn-outcome': {
    text: '用没开始的行动条接出简历空栏。计数从慢到快，20 秒锁住 500。随后把焦点交给面试栏，20.50 秒低频重拍揭出 0，两边结果一起保留供比较。',
    audio: '用 18.25–20 秒的真实鼓与切分组织计数。20.50 秒低频鼓、零邀约和落空音效共用一帧。21 秒再给「暂无回复」，22.75 秒切回现实。',
  },
  s04: { audio: '22.75 秒沿同一纸面回到现实。语言签跟着 24.25、24.50、24.75 秒的切分出来，25.50 秒收成问号，底部解释留给观众读到片名过渡。' },
  s05: {
    text: '从前镜的问号展开桌上片名牌。28 秒字样完整，片名和金边稳住之后，约一秒处变成第一章页眉。',
    audio: 'V5 第二轮键盘长音与重鼓在 28 秒同时进入，对齐片名完整读点。',
  },
  'chapter-one': { audio: '29.50 秒片名牌落进页眉，四格随后沿细分拍出现。选中章签越过纸边接聊天。' },
  'ask-directions': { audio: '32.25 秒提问，34 秒学长在重鼓上给方向。34.50 和 35 秒分别落下前端、后端。' },
  'chapter-two': { audio: '35.75、36.25、36.75、37.25 秒依次落四格，取 V5 尾段可听见的方波、FM 和键盘起音。' },
  s06: { audio: '三个方向约隔半秒读到一个，再出岗位和作业卡。41.25 秒指出差距，42.25–42.75 秒合到一条关系带，43.25 秒抬起项目经历纸签。' },
  'chapter-three': {
    text: '接住仍在运动的项目经历纸签，小棕抬眼。四步中的第三格在第二下键盘与重鼓上短促强调，随后贴到右上，下方打开追问对话。',
    audio: '44 秒进入 G 小调，纸签接人物。46 秒的键盘第二声让第三格在原位短促放大并亮沿。',
  },
  s07: { audio: '47.25 秒放出查过的资料与做过的练习。50 秒的键盘与重鼓把注意力送到「继续看课还是开始做项目」。两条问题在窗内同读。' },
  'practice-reply': {
    text: '具体建议落下时先抬眼，再前倾看手机，53 秒顺拍点头，随后抬头放松。',
    audio: '52 秒建议落位，53 秒鼓点带动点头。进入第四章时仍可看到学长的回复。',
  },
  'chapter-four': { audio: '四个导览落在 54.75、55.25、55.75、56.25 秒。放大最后一格后交给右上角。' },
  'confirm-understanding': { audio: '58 秒发出自己的理解，59.50 秒接学长回复。上一条保留用于对照。' },
  s11: { audio: '60.75 秒道谢，61.50 秒人物握拳回应。道谢持续到纸页接走行动。' },
  'schedule-action': {
    text: '接住待办字条，「挑个小练习，先做一遍」落进纸面。任务旗、时间签和确认勾依次到位，读出今天几时开始。',
    audio: '63 秒写入主句，64.50 秒时间签到位，65 秒顺重鼓确认。',
  },
  'record-progress': {
    text: '66 秒回到 F 小调，翻到尝试记录。清单先落稳，下一层用流程标红第二格。',
    audio: '66 秒首拍交给记录，66.50 秒出清单，68 秒鼓点强调实际卡住的一步。',
  },
  'follow-up-results': {
    text: '先稳读「我试了什么」，再看「卡在哪一步」。两条合起来以后继续同框，再进入回顾。',
    audio: '69.50 和 70.75 秒分别到位。72 秒第四轮键盘长音与重鼓合成追问卡，完整结果留约 1.5 秒。',
  },
  'reflect-direction': { audio: '74、74.50 秒为左栏两条，75 秒开右栏，75.50、76 秒为右栏两条。两栏同框读到 77 秒。' },
  s13: { audio: '77.75 秒低音起音点下开始，停住「练习进行中」再翻去总结。' },
  s16: { audio: '79.75、81、82 秒依次给到总结。保留全部三条后再让位给片尾。' },
  'comment-invite': {
    text: '纸面接回原来泛泛的问题，划去旧句后让三行提问框接着出现。最后一行铺在 V5 的最后落点上，给读屏留出尾音。',
    audio: '84 秒划去旧句，84.50、85.50、86.50 秒的键盘依次托住三行，尾音走完。',
  },
};

function frameMap(previous, cut, before, after) {
  const nextHits = new Map(cut.alignments.map(item => [item.id, item]));
  const options = previous.alignments.flatMap(item => {
    const corresponding = nextHits.get(item.id);
    return item.shotId === before.id && corresponding?.shotId === after.id ? [[item.local, corresponding.local]] : [];
  });
  const latest = new Map(cut.subtitleCues[after.id] ?? []);
  for (const [cue, local] of previous.subtitleCues[before.id] ?? []) {
    if (latest.has(cue)) options.unshift([local, latest.get(cue)]);
  }
  if (before.id === 'autumn-outcome') {
    for (const name of ['move','wide']) options.unshift([previous.marks.applications[name], cut.marks.applications[name]]);
  }
  options.sort((a,b) => a[0] - b[0]);
  const anchors = [[0, 0]];
  for (const pair of options) {
    const [from, to] = pair;
    const [oldLast, newLast] = anchors.at(-1);
    if (from > oldLast && to > newLast && from < before.frames && to < after.frames) anchors.push(pair);
  }
  anchors.push([before.frames, after.frames]);
  return seconds => {
    const frame = Math.min(before.frames, Math.max(0, seconds * previous.fps));
    const end = anchors.findIndex(([source]) => source >= frame);
    if (end <= 0) return 0;
    const [[a,x],[b,y]] = anchors.slice(end - 1, end + 1);
    return (x + (y - x) * (frame - a) / (b - a)) / cut.fps;
  };
}

module.exports = function revise(model, original, previous, cut, feedback, paths) {
  assert.equal(model.hash(original), feedback.sourceHash);
  assert.equal(original.projectId, feedback.projectId);
  const updated = model.clone(original);
  const director = updated.stages.director;
  updated.revision = cut.adoptedScriptRevision;
  updated.activeStage = director.phase = 4;
  updated.stages.brief.constraints = updated.stages.brief.constraints.map(value => value.startsWith('本次用《步进》')
    ? '本次用确认的《步进》V5 街机版，120 BPM、88 秒。4 秒首鼓，20.50 秒零邀约，28 秒片名，44、46 秒第三章，72 秒追问卡，86.50 秒三行模板落稳。' : value);
  director.agreements = director.agreements.replace('26 秒零邀约前', '20.50 秒零邀约前')
    .replace('以《步进》动感版的实测反拍和和声调整读点。资料画面分步进入，片名缓出后收短停留，下次请教拉到五秒。',
      '用《步进》V5 的四轮乐句重排。让小拍带着标签、消息和计数前进。章节格、资料对照、道谢、双栏回顾和行动结果按观看顺序保留。');
  director.production = {
    ...director.production, summary: 'R38 步进 V5 卡点版已绑定同版 Canvas 与混音。',
    artifacts: { preview: paths.preview, project: paths.manifest, video: paths.video, review: paths.feedback },
  };
  updated.stages.check = { ...updated.stages.check, summary: 'R38 按 V5 的实测鼓、方波及键盘起音复核成片接镜和阅读。全片 88 秒、24 段。' };

  director.segments.forEach((segment, index) => {
    const before = previous.timeline[index], shot = cut.timeline[index];
    assert.equal(shot.id, before.id);
    assert.equal(segment.id, shot.id);
    assert.deepEqual(segment.cueIds, shot.cues);
    const retime = frameMap(previous, cut, before, shot);
    const plan = segment.plan;
    const description = notes[segment.id];
    if (description.text) segment.description = plan.action = description.text;
    plan.audio = description.audio;
    plan.duration = shot.frames / cut.fps;
    const move = point => ({ ...point, at: retime(point.at) });
    for (const item of plan.elements) {
      if (item.keyframes) item.keyframes = item.keyframes.map(move);
    }
    if (plan.camera) plan.camera.keyframes = plan.camera.keyframes.map(move);
    plan.subtitles = plan.subtitles.map(cue => ({ ...cue, from: retime(cue.from), to: retime(cue.to) }));
    if (segment.id === 'comment-invite') plan.transition = 'continue';
  });
  for (const segment of director.segments) {
    segment.plan.basis = segment.sketch.basis = model.segmentBasis(updated, segment);
  }
  return model.validate(updated);
};

module.exports.frameMap = frameMap;
