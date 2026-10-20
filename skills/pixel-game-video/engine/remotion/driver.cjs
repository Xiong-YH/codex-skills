/* Native Remotion bundle, Studio and frame capture. No implicit installs. */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {spawn, spawnSync} = require('node:child_process');
const VERSION = '4.0.534';
const PACKAGES = ['remotion', '@remotion/bundler', '@remotion/renderer', '@remotion/cli', 'react', 'react-dom'];

function dependencyRoot(project) {
  const candidates = [project && path.join(project, 'node_modules'), process.env.PIXEL_NODE_MODULES,
    path.join(__dirname, 'node_modules')].filter(Boolean);
  for (const candidate of candidates) {
    const root = path.resolve(candidate);
    if (PACKAGES.every((name) => fs.existsSync(path.join(root, name, 'package.json')))) {
      for (const name of PACKAGES.filter((item) => item === 'remotion' || item.startsWith('@remotion/'))) {
        const pkg = JSON.parse(fs.readFileSync(path.join(root, name, 'package.json'), 'utf8'));
        if (pkg.version !== VERSION) throw new Error(`${name} must be ${VERSION}; found ${pkg.version} in ${root}`);
      }
      return root;
    }
  }
  throw new Error('Missing Remotion dependencies. Run npm ci in engine/remotion or in the generated build/remotion project, or set PIXEL_NODE_MODULES to their node_modules directory.');
}

function browserExecutable() {
  if (process.env.PIXEL_BROWSER_EXECUTABLE) {
    const configured = path.resolve(process.env.PIXEL_BROWSER_EXECUTABLE);
    if (!fs.existsSync(configured)) throw new Error('PIXEL_BROWSER_EXECUTABLE does not exist.');
    return configured;
  }
  const candidates = process.platform === 'darwin' ? [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ] : process.platform === 'win32' ? [
    path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Google/Chrome/Application/chrome.exe'),
    path.join(process.env.LOCALAPPDATA || os.homedir(), 'Google/Chrome/Application/chrome.exe'),
  ] : ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'];
  const cache = process.platform === 'darwin' ? path.join(os.homedir(), 'Library/Caches/ms-playwright') :
    process.platform === 'win32' ? path.join(process.env.LOCALAPPDATA || os.homedir(), 'ms-playwright') :
      path.join(os.homedir(), '.cache/ms-playwright');
  if (fs.existsSync(cache)) {
    for (const entry of fs.readdirSync(cache).filter((item) => /^chromium(?:_headless_shell)?-\d+$/.test(item)).sort().reverse()) {
      const directory = path.join(cache, entry);
      for (const relative of ['chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
        'chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
        'chrome-mac/Chromium.app/Contents/MacOS/Chromium', 'chrome-linux/chrome', 'chrome-linux64/chrome',
        'chrome-win/chrome.exe', 'chrome-win64/chrome.exe', 'chrome-headless-shell-mac-arm64/chrome-headless-shell',
        'chrome-headless-shell-mac-x64/chrome-headless-shell', 'chrome-headless-shell-linux64/chrome-headless-shell']) {
        candidates.push(path.join(directory, relative));
      }
    }
  }
  const found = candidates.find((item) => fs.existsSync(item));
  if (!found) throw new Error('No existing Chrome/Chromium found; configure PIXEL_BROWSER_EXECUTABLE. Browser downloads are disabled.');
  return found;
}

function packageVersion(root, name) {
  return JSON.parse(fs.readFileSync(path.join(root, name, 'package.json'), 'utf8')).version;
}

function localDependencies(project, dependencies) {
  const target = path.join(project, 'node_modules');
  if (!fs.existsSync(target) && fs.lstatSync(target, {throwIfNoEntry: false})?.isSymbolicLink()) {
    fs.unlinkSync(target);
  }
  if (!fs.existsSync(target)) {
    // This ignored build-local link makes Studio resolve dependencies. A copied
    // project can instead run npm ci against its included lockfile.
    fs.symlinkSync(dependencies, target, process.platform === 'win32' ? 'junction' : 'dir');
  }
}

async function render(project, frames, first, last) {
  const payload = JSON.parse(fs.readFileSync(path.join(project, 'public/payload.json'), 'utf8'));
  const resolved = payload.resolved;
  if (!Number.isInteger(first) || !Number.isInteger(last) || first < 0 || first >= last || last > resolved.durationFrames) {
    throw new Error('Render range must be integer frames [first,last) inside the compiled timeline.');
  }
  if (fs.existsSync(frames) && fs.readdirSync(frames).length) throw new Error('Frame output directory must be empty.');
  fs.mkdirSync(frames, {recursive: true});
  const dependencies = dependencyRoot(project);
  localDependencies(project, dependencies);
  const {bundle} = require(path.join(dependencies, '@remotion/bundler'));
  const {openBrowser, selectComposition, renderFrames} = require(path.join(dependencies, '@remotion/renderer'));
  const executable = browserExecutable();
  const started = Date.now();
  const serveUrl = await bundle({entryPoint: path.join(project, 'src/index.tsx'),
    publicDir: path.join(project, 'public'), rootDir: project,
    outDir: path.join(path.dirname(frames), 'remotion-bundle'), enableCaching: false,
    onProgress: () => {},
    webpackOverride: (config) => ({...config, resolve: {...config.resolve,
      modules: [...(config.resolve?.modules || []), dependencies]}}),
  });
  const browser = await openBrowser('chrome', {browserExecutable: executable, logLevel: 'error'});
  const seen = new Set();
  try {
    const composition = await selectComposition({serveUrl, id: 'PixelFilm', inputProps: {},
      puppeteerInstance: browser, logLevel: 'error'});
    const config = resolved.project;
    if (composition.durationInFrames !== resolved.durationFrames || composition.fps !== config.fps ||
        composition.width !== config.width || composition.height !== config.height) {
      throw new Error('Composition metadata differs from the compiled frame timeline.');
    }
    await renderFrames({serveUrl, composition, inputProps: {}, imageFormat: 'png', outputDir: null,
      frameRange: [first, last - 1], puppeteerInstance: browser, muted: true,
      concurrency: 2, logLevel: 'error', onStart: () => {}, onFrameUpdate: () => {},
      onFrameBuffer: async (buffer, sourceFrame) => {
        if (sourceFrame < first || sourceFrame >= last || seen.has(sourceFrame)) throw new Error('Unexpected or duplicate source frame.');
        const name = `frame_${String(sourceFrame - first).padStart(6, '0')}.png`;
        await fs.promises.writeFile(path.join(frames, name), buffer);
        seen.add(sourceFrame);
      },
    });
  } finally {
    await browser.close({silent: true});
  }
  if (seen.size !== last - first) throw new Error('Remotion did not capture every requested source frame.');
  const version = spawnSync(executable, ['--version'], {encoding: 'utf8', timeout: 10000});
  const metrics = {backend: 'remotion', nodeVersion: process.version, remotionVersion: VERSION,
    browserVersion: (version.stdout || '').trim() || 'unknown', frameCount: seen.size,
    startFrame: first, endFrame: last, elapsedSeconds: (Date.now() - started) / 1000};
  fs.writeFileSync(path.join(frames, 'render-metrics.json'), JSON.stringify(metrics, null, 2) + '\n');
  return metrics;
}

async function main() {
  const [command, location, destination, start, end] = process.argv.slice(2);
  if (command === 'doctor') {
    const dependencies = dependencyRoot();
    const executable = browserExecutable();
    return {ready: true, backend: 'remotion', nodeVersion: process.version,
      remotionVersion: VERSION, packages: Object.fromEntries(PACKAGES.map((name) => [name, packageVersion(dependencies, name)])),
      browserExecutable: executable, note: 'Package and executable checks only; actual rendering must still be verified.'};
  }
  if (!location) throw new Error('Missing generated Remotion project directory.');
  const project = path.resolve(location);
  if (command === 'render') return render(project, path.resolve(destination), Number(start), Number(end));
  if (command === 'studio') {
    const dependencies = dependencyRoot(project);
    localDependencies(project, dependencies);
    const cli = path.join(dependencies, '@remotion/cli/remotion-cli.js');
    const child = spawn(process.execPath, [cli, 'studio', 'src/index.tsx', '--no-open',
      '--browser-executable', browserExecutable()], {
      cwd: project, stdio: 'inherit', env: {...process.env,
        NODE_PATH: [dependencies, process.env.NODE_PATH].filter(Boolean).join(path.delimiter)},
    });
    for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
    child.on('error', (error) => {console.error(error.message); process.exitCode = 1;});
    await new Promise((resolve) => child.on('exit', (code) => {process.exitCode = code || 0; resolve();}));
    return null;
  }
  throw new Error('Expected doctor, render, or studio.');
}

main().then((result) => {if (result) process.stdout.write(JSON.stringify(result) + '\n');})
  .catch((error) => {process.stderr.write(`${error.stack || error.message}\n`); process.exitCode = 1;});
