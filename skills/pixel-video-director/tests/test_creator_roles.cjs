'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const skill = path.resolve(__dirname, '..');
const state = require('../assets/segment-review/creator-state.js');
const builder = require('../scripts/build-workspace.cjs');

class Element {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase(); this.children = []; this.textContent = '';
    this.dataset = {}; this.attrs = {}; this.value = ''; this.classes = new Set();
    this.classList = {toggle: (key, on) => on ? this.classes.add(key) : this.classes.delete(key)};
  }
  get innerText() { return this.textContent; }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  setAttribute(key, value) { this.attrs[key] = value; }
  addEventListener() {}
}
function document() {
  const nodes = new Map();
  return {body: new Element('body'), createElement: tag => new Element(tag), getElementById(id) {
    if (!nodes.has(id)) nodes.set(id, new Element());
    return nodes.get(id);
  }};
}
function descendants(element, tag) {
  return element.children.flatMap(child => [ ...(child.tagName === tag ? [child] : []), ...descendants(child, tag) ]);
}
const welcome = builder.readJSON(path.join(skill, 'assets/templates/creator-welcome.json'));
const legacy = {...welcome, projectId: 'existing-project', revision: 6, activeStage: 3,
  stages: {...welcome.stages, brief: {topic: '既有主题', audience: '既有受众', takeaway: '原来的记忆点'},
    copy: [{id: 'c1', stage: '开头', intent: '代入', text: '保留已有文案。'}]}};
const doc = document(); state.hydrate(doc, legacy);
const briefPanel = doc.getElementById('panel-1');
const cells = descendants(briefPanel, 'DD');
assert.deepEqual(cells.map(cell => cell.dataset.briefKey), ['topic', 'audience', 'problem', 'value', 'takeaway']);
assert.equal(cells[2].textContent, '待讨论');
assert.equal(cells[3].textContent, '待讨论');
assert.equal(cells[4].textContent, '原来的记忆点');
assert.match(briefPanel.children.at(-1).textContent, /待讨论或核对确认依据/);
assert.equal(descendants(doc.getElementById('panel-3'), 'TD').at(-1).textContent, '保留已有文案。');

const complete = {...legacy, activeStage: 4, stages: {...legacy.stages, brief: {...legacy.stages.brief,
  problem: '一个具体问题', value: '一个具体收获', confirmed: true,
  confirmationEvidence: '使用者明确确认当前三项摘要。', confirmedRevision: 3}}};
const confirmedDoc = document(); state.hydrate(confirmedDoc, complete);
assert.match(confirmedDoc.getElementById('panel-1').children.at(-1).textContent, /版本 3/);
const unproven = {...complete, stages: {...complete.stages, brief: {...complete.stages.brief, confirmationEvidence: ''}}};
const unprovenDoc = document(); state.hydrate(unprovenDoc, unproven);
assert.match(unprovenDoc.getElementById('panel-1').children.at(-1).textContent, /待讨论或核对确认依据/);
assert.throws(() => state.validate({...complete, stages: {...complete.stages, brief: {...complete.stages.brief, problem: []}}}));
assert.throws(() => state.validate({...complete, stages: {...complete.stages, brief: {...complete.stages.brief, confirmedRevision: 7}}}));

// Draft field meanings remain explicit after the UI refactor; do not remap old memory points.
const M = require('../assets/director-workspace/model.js');
assert.equal(M.legacyKeyPath(legacy, 'stage-0-field-2'), '/stages/brief/takeaway');
assert.equal(M.legacyKeyPath(legacy, 'stage-0-brief-problem'), '/stages/brief/problem');
assert.equal(M.legacyKeyPath(legacy, 'stage-0-brief-value'), '/stages/brief/value');
const before = JSON.stringify(legacy), html = builder.build(legacy);
assert.equal(JSON.stringify(legacy), before);
assert.equal(M.view(legacy).segments.length, 0);
assert.equal(legacy.activeStage, 3);
assert.ok(html.includes('let CREATOR_PROJECT='));
console.log('PASS: old topic fields, unchanged writer-only project, honest confirmation and portable role routing.');
