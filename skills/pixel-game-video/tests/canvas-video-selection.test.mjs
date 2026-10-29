import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const {transformSync} = require('../workbench/node_modules/esbuild');
const source = readFileSync(new URL('../engine/remotion/src/canvas-video-selection.ts', import.meta.url), 'utf8');
const {code} = transformSync(source, {loader:'ts',format:'esm',target:'es2020'});
const {videoKeysForShots} = await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const media = {'@a': {kind:'video'}, '@b': {kind:'video'}, '@c': {kind:'video'}, '@still': {kind:'image'}};
const video = (id, key) => ({id, replacement:{assetKey:key}, components:[], params:{}});
test('a mounted shot does not decode unrelated footage', () => {
  assert.deepEqual(videoKeysForShots({media,shots:[video('a','@a'),video('b','@b'),video('c','@c')]},[1]),['@b']);
});
test('transitions include both sides and recursively referenced snapshots', () => {
  const shots=[video('a','@a'),video('b','@b'),video('c','@c')];
  shots[2].components=[{data:{items:[{sourceShot:'a'}]}}];
  assert.deepEqual(videoKeysForShots({media,shots},[1,2]),['@a','@b','@c']);
});
test('snapshot cycles terminate and still images need no video decoder', () => {
  const shots=[video('a','@a'),video('b','@still')];
  shots[0].params={sourceShots:['b']};shots[1].components=[{data:{sourceShot:'a'}}];
  assert.deepEqual(videoKeysForShots({media,shots},[0]),['@a']);
});
