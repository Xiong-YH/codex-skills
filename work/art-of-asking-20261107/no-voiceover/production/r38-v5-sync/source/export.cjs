'use strict';

const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const defaultManifest = path.resolve(__dirname, '../asking-r38-v5-sync.project.json');
const manifestPath = path.resolve(process.argv[2] || defaultManifest);
const directory = path.dirname(manifestPath);
const project = path.resolve(directory, '../..');
const repo = path.resolve(project, '../../..');
const stem = path.basename(manifestPath, '.project.json');
const temp = path.join(project, '.tmp', stem);
const cut = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const entry = path.join(directory, cut.preview.file);
const wave = path.join(directory, cut.audio.file);
const name = stem + '.mp4';
const raw = path.join(temp, 'picture.h264');
const encoded = path.join(temp, 'picture-with-v5.mp4');
const sha = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const {width, height} = cut.dimensions;
const {fps, frames, duration} = cut;

function binary(name) {
  if (process.env['PIXEL_' + name.toUpperCase()]) return process.env['PIXEL_' + name.toUpperCase()];
  const installed = path.join(repo, '.tmp/contest-runtime/ffmpeg-9.0.2-essentials_build/bin', name + '.exe');
  return fs.existsSync(installed) ? installed : name;
}

async function encode() {
  let playwright;
  try { playwright = require('playwright'); }
  catch { playwright = require(path.resolve(path.dirname(process.execPath), '../node_modules/playwright')); }
  const edge = process.env['ProgramFiles(x86)'];
  const executablePath = process.env.PIXEL_BROWSER_EXECUTABLE || (edge && path.join(edge, 'Microsoft/Edge/Application/msedge.exe'));
  const browser = await playwright.chromium.launch({ headless: true, executablePath,
    args: ['--mute-audio','--allow-file-access-from-files'] });
  const errors = [];
  let completed = 0;
  try {
    const page = await browser.newPage();
    page.on('pageerror', err => errors.push(err.message));
    await page.goto(pathToFileURL(entry).href);
    await page.evaluate(async ({width,height,fps}) => {
      await window.AskingRecut.ready;
      const chunks = [];
      const state = { chunks, error: null };
      state.encoder = new VideoEncoder({
        output(chunk) {
          const bytes = new Uint8Array(chunk.byteLength);
          chunk.copyTo(bytes);
          chunks.push({ bytes, timestamp: chunk.timestamp });
        },
        error(err) { state.error = err.message; },
      });
      state.encoder.configure({ codec:'avc1.420028', width, height, framerate:fps, bitrate:6500000,
        latencyMode:'realtime', hardwareAcceleration:'prefer-software', avc:{format:'annexb'} });
      window.exportState = state;
    }, {width,height,fps});
    const fd = fs.openSync(raw, 'w');
    try {
      for (let from = 0; from < frames; from += 80) {
        const chunks = await page.evaluate(async ({from,to,fps}) => {
          const state = window.exportState;
          const canvas = document.getElementById('film');
          for (let i = from; i < to; i++) {
            if (window.AskingRecut.render(i) !== i) throw Error('Missing render frame ' + i);
            const timestamp = Math.round(i * 1e6 / fps);
            const duration = Math.round((i + 1) * 1e6 / fps) - timestamp;
            const frame = new VideoFrame(canvas, { timestamp, duration });
            state.encoder.encode(frame, { keyFrame: i % 120 === 0 });
            frame.close();
            if (state.encoder.encodeQueueSize >= 12) {
              await new Promise(resolve => state.encoder.addEventListener('dequeue', resolve, { once: true }));
            }
          }
          await state.encoder.flush();
          if (state.error) throw Error(state.error);
          return state.chunks.splice(0).map(({bytes,timestamp}) => {
            let binary = '';
            for (let i = 0; i < bytes.length; i += 16384) binary += String.fromCharCode(...bytes.subarray(i, i + 16384));
            return [timestamp, btoa(binary)];
          });
        }, { from, to:Math.min(from + 80, frames), fps });
        for (const [timestamp,data] of chunks) {
          assert.equal(timestamp, Math.round(completed * 1e6 / fps));
          fs.writeSync(fd, Buffer.from(data, 'base64'));
          completed++;
        }
        if (completed % 1200 === 0 || completed === frames) console.log(`${stem} rendered ${completed}/${frames} frames`);
      }
    } finally { fs.closeSync(fd); }
    await page.evaluate(() => window.exportState.encoder.close());
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
  assert.equal(completed, frames);
}

function mux() {
  const ffmpeg = binary('ffmpeg'), ffprobe = binary('ffprobe');
  const run = (app,args) => execFileSync(app,args,{ windowsHide:true,maxBuffer:64 * 1024 * 1024 });
  run(ffmpeg,['-hide_banner','-v','error','-xerror','-y','-r',String(fps),'-i',raw,'-i',wave,
    '-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','256k','-movflags','+faststart',
    '-metadata','title=提问的艺术 · '+cut.version.replace(/^R\d+ · /,''),encoded]);
  const probe = JSON.parse(run(ffprobe,['-v','error','-count_frames','-show_streams','-of','json',encoded]).toString('utf8'));
  const picture = probe.streams.find(s => s.codec_type === 'video');
  const audio = probe.streams.find(s => s.codec_type === 'audio');
  assert.deepEqual([picture.width,picture.height,Number(picture.nb_read_frames),picture.avg_frame_rate],[width,height,frames,fps+'/1']);
  assert.deepEqual([Number(picture.start_time),Number(audio.start_time),Number(picture.duration),Number(audio.duration)],[0,0,duration,duration]);
  assert.deepEqual([picture.codec_name,audio.codec_name,audio.sample_rate,audio.channels],['h264','aac','48000',2]);
  const decode = file => run(ffmpeg, ['-v','error','-xerror','-i',file,'-map','0:a:0','-c:a','pcm_f32le','-f','f32le','pipe:1']);
  const reference = decode(wave), actual = decode(encoded);
  assert(actual.length >= reference.length);
  let signal = 0, error = 0;
  for (let offset = 0; offset < reference.length; offset += 4) {
    const value = reference.readFloatLE(offset);
    signal += value ** 2;
    error += (value - actual.readFloatLE(offset)) ** 2;
  }
  const audioSnrDb = +((10 * Math.log10(signal / error)).toFixed(2));
  assert(audioSnrDb > 22, 'Muxed audio SNR: ' + audioSnrDb);
  const file = path.join(directory, name);
  fs.copyFileSync(encoded,file);
  const proof = { file:name, sha256:sha(file), sourcePreviewSha256:cut.preview.sha256, sourceMixSha256:cut.audio.sha256,
    width,height,fps,frames,duration,codecs:{video:picture.codec_name,audio:audio.codec_name},audioSnrDb };
  cut.export = proof;
  fs.writeFileSync(manifestPath, JSON.stringify(cut,null,2) + '\n');
  console.log(JSON.stringify(proof));
}

(async () => {
  assert.equal(sha(entry), cut.preview.sha256);
  assert.equal(sha(wave), cut.audio.sha256);
  fs.mkdirSync(temp, { recursive: true });
  await encode();
  assert.equal(sha(entry), cut.preview.sha256);
  assert.equal(sha(wave), cut.audio.sha256);
  mux();
})().catch(error => { console.error(error); process.exitCode = 1; });
