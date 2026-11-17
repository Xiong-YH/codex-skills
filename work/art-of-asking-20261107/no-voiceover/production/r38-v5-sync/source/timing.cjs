'use strict';

const assert = require('node:assert/strict');

const starts = {
  s01: 0, s02: 4, s03: 8.5, 'autumn-setup': 14.5, 'autumn-outcome': 18, s04: 22.75, s05: 27.25,
  'chapter-one': 29.25, 'ask-directions': 31.5, 'chapter-two': 35.25, s06: 38.25, 'chapter-three': 44,
  s07: 46.5, 'practice-reply': 51.75, 'chapter-four': 54.5, 'confirm-understanding': 57.25,
  s11: 60.5, 'schedule-action': 62.5, 'record-progress': 66, 'follow-up-results': 69,
  'reflect-direction': 73.5, s13: 77, s16: 79.25, 'comment-invite': 83.5,
};

function align(previous, measured, approved) {
  const fps = previous.fps;
  const duration = approved.durationSeconds;
  assert.deepEqual([fps, duration, approved.bpm], [60, 88, 120]);
  const toFrame = time => Math.round(time * fps);
  const frames = toFrame(duration);
  const timeline = previous.timeline.map((shot, index) => {
    const first = starts[shot.id];
    const end = previous.timeline[index + 1] ? starts[previous.timeline[index + 1].id] : duration;
    assert(end > first, shot.id);
    return { ...shot, start: toFrame(first), frames: toFrame(end) - toFrame(first) };
  });
  const byShot = new Map(timeline.map(shot => [shot.id, shot]));
  const bank = new Map(measured.sections.flatMap(section => section.attacks).map(hit => [hit.at, hit]));
  const byId = new Map();
  const localAt = (shotId, time) => toFrame(time) - byShot.get(shotId).start;
  function hit(id, shotId, target) {
    const [nominal, lane = 'drum'] = Array.isArray(target) ? target : [target];
    const onset = bank.get(nominal)?.[lane];
    assert(onset && onset.delayMs !== null && onset.rise >= .008, `${id} has no ${lane} attack at ${nominal}`);
    const at = nominal + onset.delayMs / 1000;
    const frame = toFrame(at);
    const shot = byShot.get(shotId);
    const local = frame - shot.start;
    assert(local >= 0 && local < shot.frames, id);
    assert(!byId.has(id), id);
    byId.set(id, { id, shotId, nominal, at, frame, local, lane, rise: onset.rise,
      driftMs: +((frame / fps - at) * 1000).toFixed(2) });
    return local;
  }
  const group = (name, shot, targets) => targets.map((target, index) => hit(name + index, shot, target));
  const marks = {
    attention: hit('opening-attention', 's01', [.75, 'arcade']), hook: hit('hook-hit', 's01', [2, 'keyboard']),
    identity: group('identity-', 's02', [4.5, 5, 5.5, 6]),
    remember: hit('mentor-memory', 's02', 7), contextPhone: localAt('s02', 8.25),
    lessonLands: group('lesson-land-', 'autumn-setup', [[15,'arcade'],15.75,16.5,17.25]),
    lessonSaves: group('saved-', 'autumn-setup', [[15.25,'keyboard'],[16,'bass'],16.75,[17.5,'arcade']]),
    applications: {
      ticks: group('counter-', 'autumn-outcome', [18.25,[18.5,'arcade'],18.75,18.875,[19,'bass'],19.25,19.5,19.625,19.75,[19.875,'arcade']]),
      full: hit('counter-500', 'autumn-outcome', 20), move: localAt('autumn-outcome', 20.0625),
      wide: localAt('autumn-outcome', 20.4375), zero: hit('invitations-zero', 'autumn-outcome', [20.5,'low']),
      rejects: hit('no-reply', 'autumn-outcome', 21), maximum: 500,
    },
    returnNow: {
      reply: hit('now-last-reply', 's04', 23.5), message: hit('now-question', 's04', 24),
      languages: group('language-', 's04', [[24.25,'arcade'],24.5,24.75]),
      question: hit('language-question-mark', 's04', 25.5), narration: hit('now-narration', 's04', 25.25),
      gather: localAt('s04',25.75), travel: localAt('s04',26.25),
    },
    title: hit('title-land', 's05', 28), chapterLand: hit('title-touches-paper', 'chapter-one', 29.5),
    rails: [
      group('rail-one-', 'chapter-one', [[29.75,'arcade'],30,30.375,[30.75,'arcade']]),
      group('rail-two-', 'chapter-two', [[35.75,'arcade'],[36.25,'arcade'],[36.75,'arcade'],[37.25,'keyboard']]),
      group('rail-three-', 'chapter-three', [44.5,44.75,[45,'arcade'],45.25]),
      group('rail-four-', 'chapter-four', [[54.75,'arcade'],55.25,[55.75,'arcade'],56.25]),
    ],
    badgeDock: [hit('scope-enters-chat','ask-directions',32), hit('research-badge','s06',[38.75,'arcade']),
      hit('question-badge','s07',46.75), hit('next-step-badge','confirm-understanding',[57.75,'arcade'])],
    researchBadgeLead: previous.marks.researchBadgeLead,
    directionCards: [hit('directions-left', 'ask-directions', 34.5), hit('directions-right', 'ask-directions', 35)],
    study: {
      tabs: group('direction-tab-', 's06', [[38.5,'keyboard'],[39,'keyboard'],[39.5,'arcade']]),
      cards: group('comparison-card-', 's06', [[40,'keyboard'],40.5]),
      gap: hit('found-gap', 's06', [41.25,'keyboard']), gather: hit('gather-difference', 's06', 42.25),
      settle: hit('difference-strip', 's06', [42.75,'arcade']), peel: hit('lift-project-note', 's06', [43.25,'keyboard']),
    },
    chapterThreeTitle: hit('chapter-three-title', 'chapter-three', 44.5),
    chapterThreeReprise: hit('chapter-three-reprise', 'chapter-three', 46),
    cheer: hit('self-cheer', 's11', [61.5,'keyboard']), responseNod: hit('nod-at-advice', 'practice-reply', 53),
    plan: {
      words: hit('plan-main-line', 'schedule-action', [63,'keyboard']), flag: hit('plan-flag', 'schedule-action', [64,'arcade']),
      time: hit('set-time', 'schedule-action', [64.5,'keyboard']), done: hit('confirm-time', 'schedule-action', 65),
    },
    record: [hit('logged', 'record-progress', 66.5), hit('record-blocked', 'record-progress', 68)],
    more: [hit('more-work', 'follow-up-results', 69.5), hit('more-gap', 'follow-up-results', 70.75),
      hit('following', 'follow-up-results', 72)],
    reflectPanels: group('reflect-panel-', 'reflect-direction', [73.75,75]),
    reflection: group('reflect-', 'reflect-direction', [74,74.5,75.5,76]),
    beginAction: hit('begin-practice', 's13', [77.75,'bass']),
    summary: group('summary-', 's16', [[79.75,'arcade'],[81,'keyboard'],[82,'bass']]),
    inviteStrike: hit('template-strike', 'comment-invite', [84,'keyboard']),
    invite: group('template-', 'comment-invite', [[84.5,'keyboard'],[85.5,'keyboard'],[86.5,'keyboard']]),
    questionOffsets: previous.marks.questionOffsets,
  };
  marks.applications.start = marks.applications.ticks[0];
  marks.applications.ticks.push(marks.applications.full);

  for (const [id, shot, time] of [
    ['first-drum','s02',4], ['chat-opens','s03',8.5], ['question-turn','autumn-setup',14.5],
    ['opening-resume','autumn-outcome',[18,'bass']], ['back-to-now','s04',22.75],
    ['chapter-one-change','chapter-one',29.25], ['heading-second','chapter-two',35.25],
    ['chapter-three-key','chapter-three',44], ['action-record-key','record-progress',66],
  ]) hit(id,shot,time);
  assert.equal(byId.get('first-drum').frame, toFrame(measured.firstDrum));

  const chat = {
    c01:9, 'first-answer':10.5, 'first-reply':12, c02:[13.25,'arcade'],
    c04:32.25, 'direction-answer':34, c06:47.25, 'practice-question':50, 'practice-answer':52,
    'confirm-answer':58, 'confirm-reply':59.5, thanks:60.75,
  };
  const cueShot = new Map(timeline.flatMap(shot => shot.cues.map(id => [id, shot])));
  const conversations = Object.fromEntries(Object.entries(previous.conversations).map(([groupName, turns]) => [groupName,
    turns.map(turn => {
      const shot = cueShot.get(turn.cue);
      const local = hit('chat-' + turn.cue, shot.id, chat[turn.cue]);
      return { ...turn, frame: shot.start + local };
    }),
  ]));
  const subtitleCues = {
    ...previous.subtitleCues,
    s02: [['context',0],['context-senior',marks.remember - 9]],
    'autumn-setup': [['preview-title',0],['preview-wait',localAt('autumn-setup',16)]],
    s04: [['why-vague',marks.returnNow.narration]],
    'chapter-one': [['question-scope',localAt('chapter-one',29.75)]],
    s06: [['research-jobs',0],['research-gap',marks.study.gap]],
  };
  const sfxAliases = { 'start-template': 'template-0', 'languages-land': 'language-2' };
  const sfx = previous.sfx.map(item => {
    const anchor = byId.get(sfxAliases[item.id] ?? item.id);
    assert(anchor, item.id);
    const level = item.level * (anchor.rise > .35 ? .69 : .9);
    return { ...item, frame: anchor.frame, level };
  }).sort((a, b) => a.frame - b.frame);
  const alignments = [...byId.values()].sort((a, b) => a.frame - b.frame);
  return { duration, fps, frames, timeline, marks, subtitleCues, conversations, chapters: previous.chapters, sfx, alignments };
}

module.exports = { align };
