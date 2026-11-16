const assert = require('node:assert/strict');
const test = require('node:test');
const { stateAt } = require('../modules/components/custom/slot-transfer.js');

const events = { launch:10, contact:30, signal:34, armed:47, submit:54, unfold:61, settled:86 };
const source = { x:25, y:41, width:84, height:22 };
const slot = { x:176, y:54, width:86, height:22 };
const result = { x:82, y:22, width:182, height:66 };
const sample = (frame, overrides) => stateAt({ frame, events, id:'friday', source, slot, result, lift:19, ...overrides });

test('one card crosses the stop, enables submission on arrival, and becomes the result', () => {
  const before = sample(9), flight = sample(29), contact = sample(30), settle = sample(34);
  assert.equal(before.owner, 'source');
  assert.deepEqual(before.bounds, source);
  assert.equal(flight.owner, 'in-flight');
  assert.ok(flight.bounds.x + flight.bounds.width < contact.contact.x);
  assert.equal(contact.owner, 'slot');
  assert.deepEqual(contact.bounds, slot);
  assert.equal(contact.bounds.x + contact.bounds.width, contact.contact.x);
  assert.ok(settle.stopShift > 0);
  assert.equal(settle.bounds.x + settle.bounds.width, contact.contact.x + settle.stopShift);
  assert.equal(sample(events.armed - 1).ready, false);
  assert.equal(sample(events.armed).signal, 1);
  assert.equal(sample(events.armed).ready, true);
  assert.equal(sample(events.submit - 1).sent, false);
  assert.equal(sample(events.submit).sent, true);
  assert.equal(sample(events.unfold + 1).owner, 'result');
  assert.deepEqual(sample(events.settled).bounds, result);
  assert.equal(sample(events.settled).confirmed, true);
  assert.deepEqual(sample(events.settled + 10), sample(events.settled));
  assert.deepEqual(sample(29), flight);
  for (const frame of [0,20,30,52,65,86,110]) assert.equal(sample(frame).id, 'friday');
});

test('a transfer from the right lands at the left stop using the same frame contract', () => {
  const left = { ...slot, x:12 };
  const right = { ...source, x:223 };
  const options = { source:right, slot:left };
  const flight = sample(29, options), contact = sample(30, options);
  assert.ok(flight.bounds.x > left.x);
  assert.equal(contact.direction, 180);
  assert.equal(contact.contact.x, left.x);
  assert.equal(contact.bounds.x, left.x);
  const recoil = sample(34, options);
  assert.equal(recoil.bounds.x, contact.contact.x - recoil.stopShift);
});

test('rejects invalid event, rectangle and identity inputs', () => {
  assert.throws(() => sample(1, {events:{...events,signal:30}}), /ordered/);
  assert.throws(() => sample(1, {events:{...events,launch:29}}), /flight frames/);
  assert.throws(() => sample(1, {source:{...source,width:0}}), /positive/);
  assert.throws(() => sample(1, {id:''}), /stable/);
});
