import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

test('replacement footage skips unused style backgrounds in both full and layered rendering', () => {
  const calls = [];
  const context = vm.createContext({PixelVideo: {
    style: {background: () => {throw Error('Unavailable style environment must not be reached');}},
    media: {draw: (e, source) => calls.push(source.file)}
  }});
  vm.runInContext(readFileSync(new URL('../modules/scenes/runtime.js', import.meta.url), 'utf8'), context);
  const scenes = context.PixelVideo.scenes;
  const shot = {scene: 'scenes.canvas.v1', params: {}, components: [], replacement: {file: 'media/clip.mp4'}};
  scenes.drawLayer({}, shot, 0, 'background');
  scenes.drawLayer({}, shot, 0, 'content');
  assert.deepEqual(calls, ['media/clip.mp4']);
  calls.length = 0;
  scenes.draw({}, shot, 0);
  assert.deepEqual(calls, ['media/clip.mp4']);
  scenes.drawLayer({}, {background: {file: 'media/room.png'}}, 0, 'background');
  assert.equal(calls.at(-1), 'media/room.png');
});
