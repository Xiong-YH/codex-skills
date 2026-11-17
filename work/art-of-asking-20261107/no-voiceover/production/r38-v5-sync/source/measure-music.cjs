'use strict';

const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const project = path.resolve(__dirname, '../../..');
const approvalFile = path.join(project, 'review/history/pulse-v5.json');
const cache = path.join(project, '.tmp/r38-pulse-v5');
const repo = path.resolve(project, '../../..');
const localFFmpeg = path.join(repo, '.tmp/contest-runtime/ffmpeg-9.0.2-essentials_build/bin/ffmpeg.exe');
const ffmpeg = process.env.PIXEL_FFMPEG || (fs.existsSync(localFFmpeg) ? localFFmpeg : 'ffmpeg');
const auditFile = path.join(cache, 'attacks.json');
const pcmFile = path.join(cache, 'master.f32');
const rate = 48000;
const voices = ['square', 'fm', 'bass', 'drums', 'bed'];
const sha = data => createHash('sha256').update(data).digest('hex');
const relativeToApproval = file => path.resolve(path.dirname(approvalFile), file);
const floats = buffer => new Float32Array(buffer.buffer, buffer.byteOffset, buffer.length / 4);

function readScore() {
  const approved = JSON.parse(fs.readFileSync(approvalFile, 'utf8'));
  assert.equal(approved.status, 'approved');
  const masterPath = relativeToApproval(approved.master);
  const master = fs.readFileSync(masterPath);
  assert.equal(sha(master), approved.masterSha256.toLowerCase());
  return { approved, master, masterPath };
}

function decode(data) {
  return execFileSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-xerror', '-i', 'pipe:0', '-map', '0:a:0',
    '-c:a', 'pcm_f32le', '-f', 'f32le', 'pipe:1'],
  { input: data, windowsHide: true, maxBuffer: 50 * 1024 * 1024 });
}

function readBoundScript(entry, context) {
  const contents = fs.readFileSync(relativeToApproval(entry.path), 'utf8');
  assert.equal(sha(contents), entry.sha256.toLowerCase(), entry.path);
  vm.runInNewContext(contents, context);
}

function measureAttacks(stems, length) {
  const samples = length * rate;
  const drum = stems.drums;
  const low = new Float32Array(samples);
  const speed = 1 - Math.exp(-2 * Math.PI * 112 / rate);
  let a = 0, b = 0;
  for (let i = 0; i < samples; i++) {
    a += speed * (drum[i * 2] - a);
    b += speed * (a - b);
    low[i] = b;
  }
  const width = Math.round(.004 * rate);
  function envelope(read, center) {
    const bins = [];
    for (let bin = -6; bin <= 9; bin++) {
      let energy = 0;
      for (let s = center + bin * width; s < center + (bin + 1) * width; s++) {
        if (s >= 0 && s < samples) energy += read(s) ** 2;
      }
      bins.push(Math.sqrt(energy / width));
    }
    const before = bins.slice(0, 5).reduce((total, value) => total + value, 0) / 5;
    const peak = Math.max(...bins.slice(6));
    const rise = Math.max(0, peak - before);
    const threshold = before + Math.max(.00035, .14 * rise);
    const first = bins.findIndex((value, index) => index >= 5 && value >= threshold && value > bins[index - 1]);
    return { delayMs: first < 0 ? null : (first - 6) * 4, rise: +rise.toFixed(5), peak: +peak.toFixed(5) };
  }
  const lanes = {
    drum: s => drum[s * 2],
    low: s => low[s],
    keyboard: s => stems.bed[s * 2],
    arcade: s => stems.square[s * 2] + stems.fm[s * 2],
    bass: s => stems.bass[s * 2],
  };
  return Array.from({ length: length * 8 }, (_, step) => {
    const sample = step * rate / 8;
    return { second: step / 8, ...Object.fromEntries(Object.entries(lanes).map(([id, read]) =>
      [id, envelope(read, sample)])) };
  });
}

function measure() {
  const { approved, master } = readScore();
  const scores = { window: {} };
  readBoundScript(approved.clipData, scores);
  const audio = scores.window.reviewAudio;
  assert.equal(audio.sampleRate, rate);
  assert.equal(audio.mixStats.duration, approved.durationSeconds);
  const pcm = decode(master);
  const actual = floats(pcm);
  assert.equal(actual.length, approved.durationSeconds * rate * 2);
  let peak = 0, firstDrum = -1;
  for (const value of actual) peak = Math.max(peak, Math.abs(value));
  const sections = audio.clips.map((clip, index) => {
    const stems = {};
    readBoundScript(approved.stemBanks[index], { window: { readReviewStems(id, tracks) {
      assert.equal(id, clip.id);
      assert.deepEqual(Object.keys(tracks).sort(), [...voices].sort());
      for (const voice of voices) stems[voice] = floats(decode(Buffer.from(tracks[voice], 'base64')));
    } } });
    const length = audio.clipSeconds;
    const offset = clip.start * rate * 2;
    const levels = audio.stemLevelChange;
    const change = Math.max(0, Math.min(length, levels.at - clip.start)) * rate * 2;
    for (const voice of Object.keys(levels.before)) {
      const before = levels.before[voice] / 100;
      const after = levels.after[voice] / 100;
      const stem = stems[voice];
      for (let i = 0; i < stem.length; i++) stem[i] *= i < change ? before : after;
    }
    const [square, fm, bass, drums, bed] = voices.map(voice => stems[voice]);
    assert(voices.every(voice => stems[voice].length === length * rate * 2));
    let difference = 0;
    for (let i = 0; i < length * rate * 2; i++) {
      if (firstDrum < 0 && Math.abs(drums[i]) > .00001) firstDrum = (offset + i) / (rate * 2);
      const sum = square[i] + fm[i] + bass[i] + drums[i] + bed[i];
      difference = Math.max(difference, Math.abs(sum - actual[offset + i]));
    }
    assert(difference < .000002, `V5 stem reconstruction ${clip.id}: ${difference}`);
    const attacks = measureAttacks(stems, length).map(({second, ...hit}) => ({ at: clip.start + second, ...hit }));
    return { id: clip.id, start: clip.start, marks: clip.marks, tailStart: clip.tailStart,
      reconstructionError: difference, attacks };
  });
  assert(firstDrum >= 4 && firstDrum < 4.004);
  const result = { masterSha256: sha(master), pcmSha256: sha(pcm), rate, firstDrum,
    sourcePeakDbfs: 20 * Math.log10(peak), sections };
  fs.mkdirSync(cache, { recursive: true });
  fs.writeFileSync(pcmFile, pcm);
  fs.writeFileSync(auditFile, JSON.stringify(result));
  console.log(JSON.stringify({ firstDrum, duration: approved.durationSeconds, bpm: approved.bpm,
    gridEvents: sections.flatMap(s => s.attacks).length, sourcePeakDbfs: result.sourcePeakDbfs }));
}

function getMeasurements() {
  const score = readScore();
  const measurement = JSON.parse(fs.readFileSync(auditFile, 'utf8'));
  const pcm = fs.readFileSync(pcmFile);
  assert.equal(measurement.masterSha256, sha(score.master));
  assert.equal(measurement.pcmSha256, sha(pcm));
  assert.equal(pcm.length, score.approved.durationSeconds * rate * 8);
  return { ...score, measurement, pcm };
}

if (require.main === module) measure();
module.exports = { measure, getMeasurements, decode, measureAttacks };
