'use strict';

const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { getMeasurements, measure } = require('./measure-music.cjs');
const { align } = require('./timing.cjs');
const { makeAudio } = require('../../r36-drive-review/source/sound.cjs');

const output = path.resolve(__dirname, '..');
const previousDir = path.resolve(output, '../r37-reading-pass');
const version = 'R38 · 步进 V5 卡点版';
const read = file => fs.readFileSync(file, 'utf8');
const json = file => JSON.parse(read(file));
const sha = data => createHash('sha256').update(data).digest('hex');
const relative = file => path.relative(output, file).split(path.sep).join('/');

function replace(source, from, to) {
  assert(source.includes(from), `R37 render marker missing: ${from}`);
  return source.replace(from, to);
}

function retimePicture(source) {
  source = replace(source, 'const grow = .27 * ease(-(active === 1 ? M.researchBadgeLead : 40),-16,f);',
    `const reprise = frame - when('chapter-three') - M.chapterThreeReprise;
    const chordHit = active === 2 ? FX.wave(reprise, 12) : 0;
    const grow = .27 * ease(-(active === 1 ? M.researchBadgeLead : 40),-16,f) + .066 * chordHit;`);
  source = replace(source, 'P.badge(next,active,true);',
    `P.badge(next,active,true);
    if (active === 2) FX.gleam(g, next, reprise, '#ffe6a5', 16);`);
  source = replace(source, 'const strike = out(first - 67, first - 60, f);',
    'const strike = out(M.inviteStrike - 10, M.inviteStrike, f);');
  source = replace(source, "case 's16': turnAcrossDesk(D.timeline[index - 1], P.summary, f); break;",
    `case 's16': turnAcrossDesk(D.timeline[index - 1], P.summary, f); break;
        case 'comment-invite': turnAcrossDesk(D.timeline[index - 1], P.invite, f); break;`);
  return source;
}

function build() {
  const feedback = json(path.join(output, 'feedback.json'));
  const previous = json(path.join(previousDir, 'asking-r37-reading-pass.project.json'));
  const original = read(path.join(previousDir, previous.preview.file));
  assert.equal(feedback.sourceRevision, previous.adoptedScriptRevision);
  assert.equal(sha(original), feedback.pictureSha256);
  assert.equal(sha(original), previous.preview.sha256);

  let source;
  try { source = getMeasurements(); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    measure();
    source = getMeasurements();
  }
  const { measurement, approved, pcm, masterPath } = source;
  assert.equal(measurement.masterSha256, feedback.audio.sha256);
  const cut = align(previous, measurement, approved);
  const scripts = [...original.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length, 5);
  const priorData = JSON.parse(scripts[2][1].match(/window\.ASKING_RECUT=(\{[^\r\n]+\});/)[1]);
  const name = 'asking-r38-v5-sync.wav';
  const { alignments, sfx, ...picture } = cut;
  const data = { ...picture, copy: previous.screenCopy, assets: priorData.assets, poses: priorData.poses, bgm: name };
  const player = original.slice(scripts[4].index);
  const head = original.slice(0, scripts[0].index)
    .replace('R37 · 阅读节奏修订', version)
    .replace('<title>提问的艺术 · R37</title>', '<title>提问的艺术 · R38</title>')
    .replace('提问的艺术 R37"', '提问的艺术 R38"')
    .replace('../r36-drive-review/index.html">对照 R36', '../r37-reading-pass/index.html">对照 R37');
  const engine = original.slice(scripts[0].index, scripts[2].index);
  const inline = '<script>window.ASKING_RECUT=' + JSON.stringify(data).replace(/</g, '\\u003c') + ';</script>';
  const html = head + engine + inline + '\n<script>' + retimePicture(scripts[3][1]) + '</script>\n' + player;
  for (const [, code] of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) new vm.Script(code);

  const audio = path.join(output, name);
  const audioInfo = makeAudio(audio, pcm, cut);
  fs.writeFileSync(path.join(output, 'index.html'), html, 'utf8');
  const manifest = {
    format: previous.format, version, adoptedScriptRevision: feedback.sourceRevision + 1,
    dimensions: previous.dimensions, ...picture, screenCopy: previous.screenCopy, alignments, sfx,
    pictureSource: { file: '../r37-reading-pass/index.html', sha256: previous.preview.sha256 },
    reviewedFeedback: 'feedback.json',
    bgm: {
      file: relative(masterPath), sha256: measurement.masterSha256, title: approved.title, version: approved.id,
      sampleRate: measurement.rate, bpm: approved.bpm, beatsPerBar: approved.beatsPerBar, startSeconds: 0,
      duration: approved.durationSeconds, sections: approved.rounds, sourceMix: approved.mix,
      firstDrumSeconds: measurement.firstDrum, approvedScore: feedback.audio.approval,
    },
    audio: { file: name, sha256: sha(fs.readFileSync(audio)), ...audioInfo },
    preview: { file: 'index.html', sha256: sha(html) },
  };
  const manifestFile = path.join(output, 'asking-r38-v5-sync.project.json');
  const priorExport = fs.existsSync(manifestFile) ? json(manifestFile).export : null;
  if (priorExport?.sourcePreviewSha256 === manifest.preview.sha256 && priorExport.sourceMixSha256 === manifest.audio.sha256) {
    const file = path.join(output, priorExport.file);
    if (fs.existsSync(file) && sha(fs.readFileSync(file)) === priorExport.sha256) manifest.export = priorExport;
  }
  fs.writeFileSync(manifestFile, JSON.stringify(manifest,null,2) + '\n');
  console.log(JSON.stringify({ seconds: cut.duration, frames: cut.frames, shots: cut.timeline.length,
    measuredHits: alignments.length, peakDbfs: audioInfo.samplePeakDbfs, sequenceSha256: manifest.preview.sha256 }));
}

try { build(); } catch (error) { console.error(error); process.exitCode = 1; }
