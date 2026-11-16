import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {mediaExecutable} from '../scripts/media-check.mjs';
import {prepareVideoSources} from '../scripts/video-sources.mjs';
import {sourceFrameAt} from '../src/videoFrames.js';

test('bundled extraction keeps the selected source timestamps for WebM and legacy MOV', async t => {
  const root = mkdtempSync(path.join(tmpdir(), 'workbench-video-'));
  t.after(() => rmSync(root, {recursive: true, force: true}));
  const ffmpeg = await mediaExecutable('ffmpeg');
  const ffprobe = await mediaExecutable('ffprobe');
  const run = (tool, args) => execFileSync(tool, ['-v', 'error', ...args], {
    encoding: 'utf8', timeout: 15000, windowsHide: true,
  });
  const png = path.join(root, 'frame.png');
  const wav = path.join(root, 'silence.wav');
  // A 16×16 test frame and 100 ms of mono PCM exercise codecs without asset files.
  writeFileSync(png, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAGklEQVR42mPUWBDDQApgYiARjGoY1TB0NAAAsAEBRP/XcpIAAAAASUVORK5CYII=', 'base64'));
  const wavHeader = Buffer.from('52494646a425000057415645666d7420100000000100010080bb000000770100020010006461746180250000', 'hex');
  writeFileSync(wav, Buffer.concat([wavHeader, Buffer.alloc(9600)]));
  const webm = path.join(root, 'with-opus.webm');
  const mov = path.join(root, 'legacy.mov');
  const input = ['-loop', '1', '-framerate', '30', '-i', png];
  run(ffmpeg, [...input, '-i', wav, '-frames:v', '6', '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuv420p', '-c:a', 'libopus', webm]);
  run(ffmpeg, [...input, '-frames:v', '6', '-c:v', 'prores_ks', '-pix_fmt', 'yuv422p10le', mov]);
  const clip = (file, inOffset, duration) => ({cardId: 'video-clip', props: {file}, inOffset, duration, speed: 2});
  const project = {fps: 30, tracks: [{clips: [clip('with-opus.webm', 2, 2), clip('legacy.mov', 4, 3)]}]};
  const originalWebm = readFileSync(webm);
  const first = await prepareVideoSources(root, project);
  const second = await prepareVideoSources(root, project);
  assert.deepEqual(first['with-opus.webm'].ticks, [67, 133]);
  assert.equal(sourceFrameAt(first['with-opus.webm'].ticks, .001, 2 / 30), 67);
  const held = first['legacy.mov'];
  assert.equal(held.ticks.length, 2);
  assert.equal(held.ticks.at(-1) * held.timeBase, 5 / 30);
  for (const name of Object.keys(first)) {
    const left = first[name], right = second[name];
    assert.deepEqual(left.ticks, right.ticks);
    for (const tick of left.ticks) {
      const frame = path.join(root, left.directory, tick + '.jpg');
      const video = JSON.parse(run(ffprobe, ['-show_entries', 'stream=codec_name,width,height', '-of', 'json', frame])).streams[0];
      assert.deepEqual(video, {codec_name: 'mjpeg', width: 16, height: 16});
      assert.deepEqual(readFileSync(frame), readFileSync(path.join(root, right.directory, tick + '.jpg')));
    }
  }
  assert.deepEqual(readFileSync(webm), originalWebm);
});
