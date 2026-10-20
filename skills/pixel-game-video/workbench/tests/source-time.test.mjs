import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../../engine/remotion/src/workbench-time.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.ESNext}}).outputText;
const {shotSourceFrame, transitionProgress} = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('splitting a shot does not accelerate the first half or rewind the second half', () => {
  assert.equal(shotSourceFrame(149, 300), 149);
  assert.equal(shotSourceFrame(150 + 0, 300), 150);
  assert.equal(shotSourceFrame(150 + 1, 300), 151);
});

test('speed applies once and extending a clip holds its source tail', () => {
  assert.equal(shotSourceFrame(75 * 2, 300), 150);
  assert.equal(shotSourceFrame(450, 300), 299);
  assert.equal(shotSourceFrame(450, 300, 600), 899);
});

test('transition split and speed preserve the source-clock cut point', () => {
  assert.equal(transitionProgress(27, 54), .5);
  assert.equal(transitionProgress(27 + 1, 54), transitionProgress(28, 54));
  assert.equal(transitionProgress(14 * 2, 54), transitionProgress(28, 54));
  assert.equal(transitionProgress(108, 54), 1);
});
