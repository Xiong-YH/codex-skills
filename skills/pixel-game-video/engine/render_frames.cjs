// Deterministic browser rendering: source time is frame / fps, never wall-clock time.
const fs = require('node:fs/promises');
const path = require('node:path');
const {createRequire} = require('node:module');
const {pathToFileURL} = require('node:url');

function dependency(name, project) {
  const loaders = [createRequire(path.join(project, 'package.json')), require];
  if (process.env.PIXEL_NODE_MODULES) {
    loaders.push(name => require(path.join(path.resolve(process.env.PIXEL_NODE_MODULES), name)));
  }
  for (const load of loaders) {
    try { return load(name); } catch (error) {
      if (error.code !== 'MODULE_NOT_FOUND') throw error;
    }
  }
  throw Error(`Missing Node dependency ${name}; install it locally or set PIXEL_NODE_MODULES to a node_modules directory.`);
}

async function main() {
  const [projectArg, framesArg, firstArg, lastArg] = process.argv.slice(2);
  if (!projectArg || !framesArg || firstArg === undefined || lastArg === undefined) {
    throw Error('Usage: node render_frames.cjs PROJECT FRAMES START_FRAME END_FRAME');
  }
  const project = path.resolve(projectArg), frames = path.resolve(framesArg);
  const resolved = JSON.parse(await fs.readFile(path.join(project, 'build', 'resolved-timeline.json'), 'utf8'));
  const {fps, width, height} = resolved.project;
  const first = Number(firstArg), last = Number(lastArg);
  if (!Number.isInteger(first) || !Number.isInteger(last) || first < 0 || last > resolved.durationFrames || first >= last) {
    throw Error('Source frame range must be integers within the compiled timeline; END_FRAME is exclusive.');
  }
  const {chromium} = dependency('playwright', project);
  const options = {headless: true};
  if (process.env.PIXEL_BROWSER_EXECUTABLE) options.executablePath = process.env.PIXEL_BROWSER_EXECUTABLE;
  const browser = await chromium.launch(options);
  try {
    const page = await browser.newPage({viewport: {width, height}, deviceScaleFactor: 1});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(pathToFileURL(path.join(project, 'build', 'film.html')).href + '?render', {waitUntil: 'load'});
    await page.waitForFunction(() => Boolean(window.sceneReady));
    await page.evaluate(async () => { await window.sceneReady; await document.fonts.ready; });
    const meta = await page.evaluate(() => {
      const canvas = document.querySelector('canvas#film');
      if (!canvas || typeof window.renderFrame !== 'function') throw Error('Missing canvas#film or renderFrame(seconds) export');
      return {duration: window.sceneDuration, fps: window.sceneFrameRate, width: canvas.width, height: canvas.height, inputHash: window.sceneInputHash};
    });
    if (meta.fps !== fps || meta.width !== width || meta.height !== height || Math.abs(meta.duration * fps - resolved.durationFrames) > 1e-5) {
      throw Error('HTML dimensions, frame rate, or duration differ from resolved-timeline.json; rebuild the project.');
    }
    if (meta.inputHash !== resolved.inputHash) throw Error('HTML input hash differs from compiled timeline; rebuild the project.');
    await fs.mkdir(frames, {recursive: true});
    for (let index = first; index < last; index++) {
      const png = await page.evaluate(async seconds => {
        await window.renderFrame(seconds);
        return document.querySelector('canvas#film').toDataURL('image/png').split(',')[1];
      }, index / fps);
      if (errors.length) throw Error('Browser errors: ' + errors.join('; '));
      await fs.writeFile(path.join(frames, `frame_${String(index - first).padStart(6, '0')}.png`), Buffer.from(png, 'base64'));
      if ((index - first) % 120 === 0) process.stdout.write(`Rendered ${index - first}/${last - first}\n`);
    }
    const metrics = {
      ...meta, backend: 'browser', nodeVersion: process.version, browserVersion: browser.version(),
      playwrightVersion: dependency('playwright/package.json', project).version,
      startFrame: first, endFrame: last, frameCount: last - first,
      sourceStartSeconds: first / fps, sourceEndSeconds: last / fps,
      durationSeconds: (last - first) / fps, pageErrors: errors,
    };
    await fs.writeFile(path.join(frames, 'render-metrics.json'), JSON.stringify(metrics, null, 2) + '\n');
    process.stdout.write(`Rendered ${last - first}/${last - first}\n`);
  } finally {
    await browser.close();
  }
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
