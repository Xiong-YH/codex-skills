import assert from 'node:assert/strict';
import {appendFileSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import test from 'node:test';
import {arcadeSupplement, seriesLibrary, TACTILE_ASSET_DIR, tactileLibrary} from '../../modules/audio/workbench-bank.mjs';

test('tactile defaults become short, reusable PCM assets for the editor', t => {
  const parent = realpathSync(tmpdir());
  const folder = mkdtempSync(join(parent, 'pixel-audio-bank-'));
  t.after(() => {
    if (dirname(realpathSync(folder)) === parent) rmSync(folder, {recursive: true});
  });

  const items = tactileLibrary(folder);
  assert.equal(items.length, 8);
  assert.equal(new Set(items.map(item => item.cat)).size, 2);
  for (const {file, durationSeconds} of items) {
    const wav = readFileSync(join(folder, file));
    assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
    assert.equal(wav.readUInt16LE(20), 1); // PCM
    assert.equal(wav.readUInt32LE(24), 48000);
    assert.equal(wav.readUInt16LE(22), 2);
    assert.equal(wav.readUInt16LE(34), 16);
    assert.equal(Math.round(durationSeconds * 48000), (wav.length - 44) / 4);
    assert.ok(durationSeconds < .25);
    assert.ok(wav.subarray(44).some(value => value !== 0));
  }
  assert.deepEqual(tactileLibrary(folder), items);
  const classics = arcadeSupplement(folder);
  assert.deepEqual(classics.map(({file}) => file.split('/').pop()),
                   ['arcade-confirm-soft.wav', 'arcade-focus.wav', 'arcade-unfold.wav']);
  for (const {file} of classics) {
    const master = new URL('../../modules/audio/assets/common-motion/' + file.split('/').pop(), import.meta.url);
    assert.deepEqual(readFileSync(join(folder, file)), readFileSync(master));
  }
  const series = seriesLibrary(folder);
  const defaults = series.map(({file, initialVolume}) => {
    const name = file.split('/').pop().replace(/-[a-f0-9]{16}\.wav$/, '.wav');
    return [name, initialVolume];
  });
  assert.deepEqual(defaults, [
    ['synth.paper-slide.v1.wav', .22],
    ['synth.series-paper-land.v1.wav', .5],
    ['arcade-confirm-soft.wav', .7],
    ['seat.wav', .42],
    ['synth.series-empty-result.v1.wav', .47],
    ['synth.series-send.v1.wav', .45],
    ['synth.series-reply.v1.wav', .5],
    ['arcade-unfold.wav', .6],
  ]);
  const seat = series.find(({name}) => name === '数字锁定');
  const coreMaster = new URL('../../modules/audio/assets/arcade-motion/seat.wav', import.meta.url);
  assert.deepEqual(readFileSync(join(folder, seat.file)), readFileSync(coreMaster));
  const storedNames = readdirSync(join(folder, TACTILE_ASSET_DIR));
  for (const id of ['synth.series-paper-pull.v2', 'synth.series-paper-land.v2', 'synth.series-reply.v2']) {
    assert.ok(storedNames.some(file => file.startsWith(`${id}-`)), `Saved edits may reference ${id}`);
  }
  assert.ok(series.every(({file}) => readFileSync(join(folder, file)).length > 44));
  appendFileSync(join(folder, items[0].file), 'changed');
  assert.throws(() => tactileLibrary(folder), /Changed generated sound/);
});
