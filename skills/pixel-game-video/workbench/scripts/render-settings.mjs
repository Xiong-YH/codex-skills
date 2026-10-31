export const resolveRenderConcurrency = (value = process.env.PIXEL_RENDER_CONCURRENCY) => {
  if (value === undefined) return 4;
  if (!/^[1-9]\d*$/.test(String(value)) || Number(value) > 32) throw new Error('PIXEL_RENDER_CONCURRENCY 需要是 1–32 的整数');
  return Number(value);
};

export const updateRenderProgress = (job, line, elapsedMs) => {
  if (/^Bundl/i.test(line)) job.phase = 'bundling';
  const match = line.match(/^(Rendered|Rendering|Encoded|Encoding)\s+(\d+)\s*\/\s*(\d+)/i);
  if (!match || Number(match[3]) < 1) return;
  const frames = Number(match[2]), total = Number(match[3]);
  if (/^Render/i.test(match[1])) {
    job.phase = 'rendering';
    if (!job.renderSample) job.renderSample = {frames, elapsedMs};
    const seconds = (elapsedMs - job.renderSample.elapsedMs) / 1000;
    job.renderedFrames = Math.max(job.renderedFrames ?? 0, frames);
    job.totalFrames = total;
    if (seconds > 0 && frames > job.renderSample.frames) {
      job.renderFps = (frames - job.renderSample.frames) / seconds;
      job.renderEtaSeconds = Math.max(0, total - frames) / job.renderFps;
    }
  } else {
    job.totalFrames = total;
    job.encodedFrames = Math.max(job.encodedFrames ?? 0, frames);
    if (frames >= total) job.renderedFrames = total;
    job.phase = (job.renderedFrames ?? 0) >= total ? 'encoding' : 'renderingAndEncoding';
    job.renderEtaSeconds = undefined;
  }
};
