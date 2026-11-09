import {execFile} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync} from 'node:fs';
import {mkdir, readdir, realpath, stat, unlink} from 'node:fs/promises';
import path from 'node:path';
import {promisify} from 'node:util';
import {sourceFrameAt} from '../src/videoFrames.js';
import {mediaExecutable} from './media-check.mjs';

const exec = promisify(execFile);
const stillIn = (parent, child) => {
  const relative = path.relative(parent, child);
  return relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative);
};

async function videoInfo(file, ffprobe) {
  const {stdout} = await exec(ffprobe, [
    '-v', 'error', '-select_streams', 'V:0', '-show_entries',
    'stream=time_base,start_time:stream_side_data=rotation', '-of', 'json', file,
  ], {timeout: 30000, windowsHide: true});
  const video = JSON.parse(stdout).streams?.[0];
  const [numerator, denominator] = (video?.time_base ?? '').split('/').map(Number);
  const timeBase = numerator / denominator;
  if (!Number.isFinite(timeBase) || timeBase <= 0) throw Error('文件中没有可导出的视频流');
  return {
    timeBase, startTime: Number(video.start_time) || 0,
    rotation: -(video.side_data_list?.find(item => Number.isFinite(item.rotation))?.rotation ?? 0),
  };
}

async function extractFrames({input, directory, ffmpeg, clips, fps, timeBase, startTime}) {
  const secondsAt = (clip, frame) => (Math.round(clip.inOffset) + frame * clip.speed) / fps;
  const lastTime = Math.max(startTime, ...clips.map(clip => secondsAt(clip, clip.duration - 1)));
  await mkdir(directory, {recursive: true});
  await exec(ffmpeg, [
    '-v', 'error', '-nostdin', '-n', '-copyts', '-threads', '2', '-noautorotate', '-i', input,
    '-map', '0:V:0', '-an', '-to', String(lastTime + Math.max(1 / fps, timeBase * 2)),
    '-vf', "scale=w='max(1,round(iw*sar))':h=ih:out_color_matrix=bt601:out_range=full",
    '-fps_mode', 'passthrough', '-c:v', 'mjpeg', '-pix_fmt', 'yuvj420p', '-q:v', '2',
    '-threads', '2', '-enc_time_base', 'demux', '-frame_pts', '1', path.join(directory, '%d.jpg'),
  ], {windowsHide: true});
  const ticks = (await readdir(directory)).map(name => Number(name.slice(0, -4))).sort((a,b) => a-b);
  if (!ticks.length) throw Error('文件没有可用画面');

  // Keep only frames that can be requested by the fixed edit. Native-rate
  // output preserves variable timestamps and clips at different speeds.
  const used = new Set();
  for (const clip of clips) {
    for (let frame = 0; frame < clip.duration; frame++) {
      used.add(sourceFrameAt(ticks, timeBase, secondsAt(clip, frame)));
    }
  }
  for (const tick of ticks) if (!used.has(tick)) await unlink(path.join(directory, `${tick}.jpg`));
  return ticks.filter(tick => used.has(tick));
}

// Materialize frames in the isolated export snapshot. The edit and its audio
// continue to reference the original files.
export async function prepareVideoSources(publicDir, project) {
  const sources = new Map();
  for (const track of project.tracks.filter(track => !track.hidden)) {
    for (const clip of track.clips) {
      if (clip.cardId !== 'video-clip' || !clip.props.file) continue;
      const {file} = clip.props;
      if (!sources.has(file)) sources.set(file, []);
      sources.get(file).push(clip);
    }
  }
  if (!sources.size) return {};
  const root = await realpath(publicDir);
  const [ffprobe, ffmpeg] = await Promise.all([mediaExecutable('ffprobe'), mediaExecutable('ffmpeg')]);
  let folder = 'workbench-video-frames';
  while (existsSync(path.join(root, folder))) folder += '-export';
  const prepared = Object.create(null);
  for (const [file, clips] of sources) {
    try {
      const candidate = path.resolve(root, file.replace(/\\/g, '/'));
      if (!stillIn(root, candidate)) throw Error('媒体路径必须在 public/ 内');
      const input = await realpath(candidate);
      if (!stillIn(root, input) || !(await stat(input)).isFile()) throw Error('媒体路径必须指向 public/ 内的文件');
      const {timeBase, startTime, rotation} = await videoInfo(input, ffprobe);
      const directory = folder + '/' + createHash('sha256').update(file).digest('hex');
      const ticks = await extractFrames({
        input, directory: path.join(root, directory), ffmpeg, clips, fps: project.fps, timeBase, startTime,
      });
      prepared[file] = {directory, ticks, timeBase, rotation};
    } catch (error) {
      const detail = error.code === 'ENOENT' ? '素材或取帧工具不存在' : String(error.stderr || error.message).trim();
      throw new Error(`视频素材「${file}」准备失败：${detail}`);
    }
  }
  return prepared;
}
