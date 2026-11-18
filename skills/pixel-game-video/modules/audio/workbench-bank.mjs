// Materialize the catalog defaults for drag-and-drop editing; share the source renderer.
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {SR} from './vendor/garden-skills/scripts/lib/synth.mjs';

const audioRoot = dirname(fileURLToPath(import.meta.url));
export const TACTILE_ASSET_DIR = 'foundation-tactile';
const readCatalog = () => JSON.parse(readFileSync(join(audioRoot, 'catalog.json'), 'utf8'));

function writeCachedWave(publicDir, id, bytes) {
  const target = join(publicDir, TACTILE_ASSET_DIR);
  mkdirSync(target, {recursive: true});
  if (!lstatSync(target).isDirectory()) throw new Error(`${TACTILE_ASSET_DIR} must be a real directory`);
  const path = join(target, id);
  if (existsSync(path)) {
    if (!lstatSync(path).isFile() || !readFileSync(path).equals(bytes)) {
      throw new Error(`Changed generated sound: ${id}`);
    }
  } else {
    writeFileSync(path, bytes, {flag: 'wx'});
  }
  return `${TACTILE_ASSET_DIR}/${id}`;
}

function arcadeBank(folder) {
  const directory = join(audioRoot, 'assets', folder);
  const {atoms} = JSON.parse(readFileSync(join(directory, 'manifest.json'), 'utf8'));
  return atoms.map(atom => ({id: atom.id, directory, master: atom.files.master}));
}

function cacheArcadeMaster(publicDir, {directory, master}) {
  const bytes = readFileSync(join(directory, master.file));
  const digest = createHash('sha256').update(bytes).digest('hex');
  if (digest !== master.sha256) throw new Error(`Changed approved audio: ${master.file}`);
  return writeCachedWave(publicDir, master.file, bytes);
}

export function arcadeSupplement(publicDir) {
  const {items} = readCatalog();
  return arcadeBank('common-motion').map(atom => {
    const sound = items.find(item => item.id === atom.id);
    return {file: cacheArcadeMaster(publicDir, atom), cat: '街机补充', name: sound.name,
            durationSeconds: sound.durationSeconds, hint: sound.use[0]};
  });
}

function wave(pcm) {
  const body = pcm.length / 2; // stereo f32le -> stereo PCM16
  const bytes = Buffer.alloc(44 + body);
  bytes.write('RIFF', 0);
  bytes.writeUInt32LE(36 + body, 4);
  bytes.write('WAVEfmt ', 8);
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(2, 22);
  bytes.writeUInt32LE(SR, 24);
  bytes.writeUInt32LE(SR * 4, 28);
  bytes.writeUInt16LE(4, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write('data', 36);
  bytes.writeUInt32LE(body, 40);
  for (let n = 0; n < pcm.length; n += 4) {
    const sample = Math.max(-1, Math.min(1, pcm.readFloatLE(n)));
    bytes.writeInt16LE(Math.round(sample * 32767), 44 + n / 2);
  }
  return bytes;
}

function renderDefaults(publicDir, selected) {
  const recipes = selected.map(({synthesis}) => ({
    voice: synthesis.voice,
    params: Object.fromEntries(Object.entries(synthesis.params).map(([key, rule]) => [key, rule.default])),
  }));
  const rendered = [];
  for (let offset = 0; offset < recipes.length; offset += 8) {
    const batch = recipes.slice(offset, offset + 8);
    const output = execFileSync(process.execPath, [join(audioRoot, 'render-sfx.mjs')], {
      input: JSON.stringify(batch),
      encoding: 'utf8',
      maxBuffer: 4 * 1024 * 1024,
    });
    rendered.push(...JSON.parse(output));
  }
  return selected.map((item, index) => {
    const bytes = wave(Buffer.from(rendered[index], 'base64'));
    const digest = createHash('sha256').update(bytes).digest('hex').slice(0, 16);
    const name = `${item.id}-${digest}.wav`; // Saved edits keep their original sound when the library is regenerated.
    return {file: writeCachedWave(publicDir, name, bytes), cat: item.group, name: item.name,
            durationSeconds: (bytes.length - 44) / (SR * 4), hint: item.use[0]};
  });
}

export function tactileLibrary(publicDir) {
  return renderDefaults(publicDir, readCatalog().items.filter(item => item.bank === 'tactile'));
}

export function seriesLibrary(publicDir) {
  const {items, series} = readCatalog();
  const byId = new Map(items.map(sound => [sound.id, sound]));
  // A saved edit may still point at a WAV from a previous version of this shelf.
  const retainedIds = new Set(series.flatMap(({id, previousIds = []}) => [id, ...previousIds]));
  const selected = items.filter(sound => retainedIds.has(sound.id) && sound.synthesis);
  const rendered = renderDefaults(publicDir, selected);
  const assets = new Map(selected.map(({id}, index) => [id, rendered[index]]));
  const approved = new Map(['arcade-motion', 'common-motion']
    .flatMap(arcadeBank).map(atom => [atom.id, atom]));
  for (const id of retainedIds) {
    if (assets.has(id)) continue;
    assets.set(id, {file: cacheArcadeMaster(publicDir, approved.get(id)),
                    durationSeconds: byId.get(id).durationSeconds});
  }
  return series.map(({id, name, hint, level}) => ({
    ...assets.get(id), cat: '系列常用', name, hint, initialVolume: level,
  }));
}
