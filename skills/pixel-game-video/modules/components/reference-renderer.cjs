const fs = require('node:fs/promises');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');

const skill = path.resolve(__dirname, '../..');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = async file => JSON.parse(await fs.readFile(file, 'utf8'));
const load = process.env.PIXEL_NODE_MODULES
  ? name => require(path.join(path.resolve(process.env.PIXEL_NODE_MODULES), name))
  : createRequire(path.join(skill, 'package.json'));

async function loadImages(project, payload, loadImage) {
  const [gear, library] = await Promise.all([
    read(path.join(__dirname, 'assets/gears/manifest.json')),
    read(path.join(skill, 'modules/library/backgrounds/catalog.json'))
  ]);
  const files = new Map(gear.items.map(item => [item.assetKey, path.join(__dirname, item.file)]));
  for (const id of payload.style.libraryAssets || []) {
    files.set(id, path.join(skill, 'modules/library', library.assets[id].file));
  }
  for (const [id, file] of Object.entries(payload.style.assets || {})) {
    files.set(id, path.join(skill, 'modules/style', file));
  }
  for (const [id, item] of Object.entries(payload.resolved.media || {})) {
    files.set(id, path.join(project, item.file));
  }
  return Object.fromEntries(await Promise.all(Object.keys(payload.assets)
    .map(async id => {
      const file = files.get(id);
      if (!file) throw Error('Reference asset lacks a local image source: ' + id);
      return [id, await loadImage(file)];
    })));
}

function canvasRuntime() {
  const canvas = load('@napi-rs/canvas');
  const fonts = (process.env.PIXEL_REFERENCE_FONT_FILES || '').split(path.delimiter).filter(Boolean);
  for (const font of fonts) {
    if (!canvas.GlobalFonts.registerFromPath(font)) throw Error('Unable to register reference font: ' + font);
  }
  return { ...canvas, fontFiles:fonts.map(file=>path.basename(file)) };
}

async function open(project, background) {
  const build = path.join(project, 'build');
  const [lock, payload, runtime] = await Promise.all([
    read(path.join(build, 'project-lock.json')),
    read(path.join(build, 'payload.json')),
    fs.readFile(path.join(build, 'runtime.js'), 'utf8')
  ]);
  const { resolved } = payload;
  if (resolved.inputHash !== lock.inputHash) throw Error('Stale guide payload; rebuild the guide.');
  for (const [base, files] of [[project, lock.inputFiles], [skill, lock.runtimeFiles]]) {
    for (const [relative, expected] of Object.entries(files)) {
      if (sha(await fs.readFile(path.join(base, relative))) !== expected) {
        throw Error('Source or runtime changed; rebuild the guide before capturing: ' + relative);
      }
    }
  }

  const { createCanvas, loadImage, fontFiles } = canvasRuntime();
  const scope = vm.createContext({});
  vm.runInContext(runtime, scope, { filename: 'build/runtime.js' });
  const assets = await loadImages(project, payload, loadImage);
  if (background) assets['@reference.background'] = await loadImage(background);
  const { width, height, fps } = resolved.project;
  const canvas = createCanvas(width, height);
  const make = shots => scope.PixelVideo.createRenderer({
    ...payload, resolved: { ...resolved, shots }, canvas, createCanvas, assets
  });
  let renderer = make(resolved.shots);
  function configure(config) {
    const shots = structuredClone(resolved.shots);
    for (const shot of shots) {
      if (config.visualStyle !== 'paper' || shot.id.startsWith('paper-')) {
        for (const component of shot.components) Object.assign(component, config);
      }
      if (background) shot.background = {
        assetKey: '@reference.background', kind: 'image', fit: 'cover', anchorX: .5, anchorY: .5, dim: .40
      };
    }
    renderer = make(shots);
  }
  function capture(shotId, localFrame, quality=93) {
    const shot = resolved.shots.find(shot => shot.id === shotId);
    if (!shot || !Number.isInteger(localFrame) || localFrame < 0 || localFrame >= shot.durationFrames) {
      throw Error('Invalid guide frame: ' + shotId + ' / ' + localFrame);
    }
    renderer.draw((shot.startFrame + localFrame) / fps);
    return canvas.toBuffer('image/jpeg', quality);
  }
  async function sheet(items, { columns=3, title, tileWidth=640, tileHeight=360 }={}) {
    const band=42, top=title ? 90 : 0;
    const panel=createCanvas(columns*tileWidth,top+Math.ceil(items.length/columns)*(tileHeight+band));
    const g=panel.getContext('2d');
    g.fillStyle='#102029';
    g.fillRect(0,0,panel.width,panel.height);
    if(title){
      g.fillStyle='#f5ebd4';g.font='700 46px "Microsoft YaHei", sans-serif';
      g.fillText(title,30,60);
    }
    g.font='600 22px "Microsoft YaHei", sans-serif';g.fillStyle='#e7d5b2';
    for(const [i,item] of items.entries()){
      const x=i%columns*tileWidth,y=top+Math.floor(i/columns)*(tileHeight+band);
      g.drawImage(await loadImage(item.image),x,y,tileWidth,tileHeight);
      g.fillText(item.label,x+17,y+tileHeight+29,tileWidth-34);
    }
    return panel.toBuffer('image/jpeg',92);
  }
  return {
    resolved,configure,capture,sheet,
    provenance:{inputHash:resolved.inputHash,runtimeSha256:sha(runtime),backend:'node-canvas',
      sourceDimensions:[width,height],fontFiles},
    exercise(){
      const frames=new Set();
      for(const shot of resolved.shots){
        frames.add(shot.startFrame);
        frames.add(shot.endFrame-1);
        for(let frame=shot.startFrame;frame<shot.endFrame;frame+=15)frames.add(frame);
        for(const event of shot.events)for(const delta of [-1,0,1]){
          const frame=event.frame+delta;
          if(frame>=shot.startFrame&&frame<shot.endFrame)frames.add(frame);
        }
      }
      for(const frame of [...frames].sort((a,b)=>a-b))renderer.draw(frame/fps);
      return frames.size;
    }
  };
}

module.exports = { open, read, sha, skill, canvasRuntime, loadImages };
