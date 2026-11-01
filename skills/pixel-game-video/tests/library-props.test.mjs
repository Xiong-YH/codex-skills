import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);

const file = relative => readFileSync(new URL('../' + relative, import.meta.url), 'utf8');
const catalog = JSON.parse(file('modules/library/catalog.json'));
const style = JSON.parse(file('modules/style/preset.json'));
function fixture() {
  const context = vm.createContext({});
  const load = name => vm.runInContext(file('modules/library/' + name + '.js'), context);
  load('runtime');
  const calls = [];
  const g = new Proxy({}, {get: (target, key) => key in target ? target[key] : () => {calls.push(key);}});
  return {load, calls, library: context.PixelVideo.library,
    environment: {ctx: g, width: 1920, height: 1080, style, colors: style.colors,
      propCache: {}, createCanvas: () => ({getContext: () => g})}};
}

test('an unloaded or unknown prop fails instead of becoming the task block', () => {
  const {library, environment, calls} = fixture();
  for (const id of ['prop.cache-terminal.v1', 'prop.project-laptop.v1', 'prop.unknown.v1']) {
    assert.equal(library.hasProp(id), false);
    assert.throws(() => library.prop(environment, id, 0, 0, 100), /no loaded renderer.*rebuild/);
    assert.equal(calls.length, 0, 'rejection must not leave the drawing context transformed');
  }
  assert.equal(library.hasProp('prop.task-block.v1'), true);
  assert.doesNotThrow(() => library.prop(environment, 'prop.task-block.v1', 0, 0, 100));
});

test('loading either renderer order makes all declared props drawable without losing the base props', () => {
  for (const order of [['computing', 'education'], ['education', 'computing']]) {
    const {load, library, environment} = fixture();
    order.forEach(load);
    for (const item of catalog.items.filter(item => item.kind === 'prop')) {
      assert.equal(library.hasProp(item.id), true, item.id);
      assert.doesNotThrow(() => library.prop(environment, item.id, 0, 0, 100), item.id);
    }
    assert.equal(library.hasProp('prop.unknown.v1'), false);
    assert.throws(() => library.prop(environment, 'prop.unknown.v1', 0, 0, 100), /no loaded renderer/);
  }
});

test('the real workbench edit path rejects an unbundled prop and accepts it after its renderer is loaded', () => {
  const {transformSync} = require('../workbench/node_modules/esbuild');
  const {load, library} = fixture();
  // Compile the production module with inert React imports; exercise its actual edit function.
  const {code} = transformSync(file('engine/remotion/src/CanvasWorkbenchUnits.tsx') + '\nexport {editedShot};',
    {loader: 'tsx', format: 'cjs', target: 'es2020'});
  const context = vm.createContext({module: {exports: {}}, exports: {}, require: name => {
    if (name === './canvas-runtime') return {PIXEL_CANVAS_RUNTIME: {library}};
    if (name === './workbench-payload') return {WORKBENCH_PAYLOAD: null};
    return {};
  }});
  vm.runInContext(code, context);
  const edit = context.module.exports.editedShot;
  const shot = {id: 's1', actor: null, params: {}, objects: [], components: [], performance: [], motions: []};
  const props = {objectsJson: JSON.stringify([{id: 'terminal', asset: 'prop.cache-terminal.v1', x: .5, y: .5}])};
  const payload = {assets: {}, resolved: {media: {}}};
  assert.throws(() => edit(shot, props, payload), /no loaded renderer.*rebuild/);
  load('computing');
  assert.equal(edit(shot, props, payload).objects[0].asset, 'prop.cache-terminal.v1');
  assert.throws(() => edit(shot, {objectsJson: '{}'}, payload), /must be an array/);
});
