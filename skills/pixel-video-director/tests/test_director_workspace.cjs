'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const M=require('../assets/director-workspace/model.js'),builder=require('../scripts/build-workspace.cjs');
const example=builder.readJSON(path.resolve(__dirname,'../examples/director-workflow/project.json'));
M.validate(example);const snapshot=JSON.stringify(example),segments=M.view(example).segments;
assert.equal(segments.length,3);assert.equal(M.timeline(example).at(-1).end,9);
for(const segment of segments)assert.deepEqual(M.readiness(example,segment),{sketch:'current',plan:'current'});
assert.equal(JSON.stringify(example),snapshot,'reading and deriving a view never mutates the source');

const plainOnly=M.clone(example);delete plainOnly.stages.director.segments[1].plan;
assert.equal(M.readiness(plainOnly,plainOnly.stages.director.segments[1]).plan,'missing');
assert.throws(()=>M.timeline(plainOnly));
const independent=M.clone(example);independent.stages.director.segments[1].plan.rendererSource='project/renderer.js';assert.throws(()=>M.timeline(independent),'external animatics must not silently export through the generic renderer');
assert.ok(plainOnly.stages.director.segments[1].sketch,'a sketch does not fabricate an adopted motion plan');

const changed=M.clone(example);changed.stages.director.segments[1].description+=' 改变人物出场方式。';
for(const segment of M.view(changed).segments)assert.equal(M.readiness(changed,segment).plan,'stale','a changed seam invalidates neighboring dependent previews');
assert.throws(()=>M.timeline(changed,['s2']));
const changedCopy=M.clone(example);changedCopy.stages.copy[1].text='改写后的口播。';
assert.equal(M.readiness(changedCopy,changedCopy.stages.director.segments[1]).plan,'stale');
const movedSketch=M.clone(example);movedSketch.stages.director.segments[1].sketch.elements[0].x=12;
assert.deepEqual(movedSketch.stages.director.segments[1].plan,example.stages.director.segments[1].plan,'a reference-layout edit never changes the motion plan');

const paper=segments[1].plan.elements.find(e=>e.id==='grade');
assert.equal(M.position(paper,0).y,32);assert.ok(M.position(paper,.55).y>32);assert.equal(M.position(paper,2).y,110);
const spin={id:'spin',label:'在吗\n那个请问一下',kind:'box',shape:'bubble',pivot:{x:40,y:40},x:20,y:20,w:40,h:20,keyframes:[{at:0,scale:1,rotation:0},{at:.6,scale:.1,rotation:360}]};
M.validatePlan({duration:1,elements:[spin]},new Set());
assert.equal(M.position(spin,.3).rotation,180);assert.ok(Math.abs(M.position(spin,.3).scale-.55)<1e-9);
assert.equal(M.position(spin,.8).rotation,360);assert.equal(M.position(paper,0).scale,1);
assert.throws(()=>M.validatePlan({duration:1,elements:[{...spin,keyframes:[{at:0,scale:-1}]}]},new Set()));
assert.throws(()=>M.validatePlan({duration:1,elements:[{...spin,pivot:{x:NaN,y:4}}]},new Set()));
M.validatePlan({duration:1,elements:[{...spin,shape:'text',textStyle:{size:48,weight:700,color:'#76582e'}}]},new Set());
assert.throws(()=>M.validatePlan({duration:1,elements:[{...spin,textStyle:{size:Infinity}}]},new Set()));
assert.throws(()=>M.validatePlan({duration:1,elements:[{...spin,textStyle:{color:'url(external)'}}]},new Set()));
assert.deepEqual(M.affected(example,'s2'),['s1','s2','s3']);
assert.throws(()=>M.validate({...example,stages:[]}));
const bad=M.clone(example);bad.stages.director.segments[1].plan.subtitles[0].cueId='absent';assert.throws(()=>M.validate(bad));
const badFrames=M.clone(example);badFrames.stages.director.segments[1].plan.elements.at(-1).keyframes[1].at=10;assert.throws(()=>M.validate(badFrames));
const badImage=M.clone(example);badImage.stages.director.segments[0].plan.background.image='https://untrusted.example/background.png';assert.throws(()=>M.validate(badImage));

const p='/stages/director/segments/1/description',edited=M.clone(example);M.set(edited,p,'新的大白话。');
const record={projectId:example.projectId,revision:example.revision,baseHash:M.hash(example),changes:M.changes(example,edited,[p,p])};
assert.equal(record.changes.length,1);assert.equal(M.get(M.applyDraft(example,record),p),'新的大白话。');
const other=M.clone(example);other.title+='新来源';assert.throws(()=>M.applyDraft(other,record));
assert.throws(()=>M.applyDraft({...example,revision:2},record));
assert.throws(()=>M.set(edited,'/stages/__proto__/polluted',true));assert.equal({}.polluted,undefined);

const legacy={schemaVersion:1,projectId:'old',revision:3,title:'原稿',activeStage:5,stages:{copy:[{id:'c1',text:'原文。'}],visuals:[{id:'shot-one',copy:'原逐字台词',visual:'原画面',action:'原动作',audio:'原声音',notes:'原备注'}]}};
const legacyBytes=JSON.stringify(legacy),view=M.view(legacy);
assert.equal(view.segments[0].id,'shot-one');assert.equal(view.segments[0].description,'原画面');assert.equal(view.segments[0].legacyNotes,'原备注');assert.equal(view.segments[0].plan,undefined);
assert.equal(M.segmentPath(legacy,'shot-one','description'),'/stages/visuals/0/visual');
assert.equal(M.legacyKeyPath(legacy,'stage-0-field-2'),'/stages/brief/takeaway');
assert.equal(M.legacyKeyPath(legacy,'stage-3-field-2'),'/stages/visuals/0/visual');
assert.equal(JSON.stringify(legacy),legacyBytes);

const template=path.resolve(__dirname,'../assets/templates/workflow-overview.html'),before=fs.readFileSync(template);
const html=builder.build(example);assert.ok(fs.readFileSync(template).equals(before),'building must not rewrite templates');
assert.equal((html.match(/<script>/g)||[]).length,1);
const malicious={...example,title:'</script><img src=x onerror=alert(1)>'};const safe=builder.build(malicious);
assert.ok(safe.includes('\\u003c/script>'));assert.ok(!safe.includes('let CREATOR_PROJECT={"schemaVersion":1,"projectId":"director-workflow-example","revision":1,"title":"</script>'));
console.log('PASS: sketch/plan independence, real motion, seam invalidation, cue references, draft conflicts, legacy data, safe portable build.');
