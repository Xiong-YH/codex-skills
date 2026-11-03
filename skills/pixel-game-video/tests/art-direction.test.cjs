'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../modules/style');
const pack=JSON.parse(fs.readFileSync(path.join(root,'art-profiles.json'),'utf8'));
const {resolve}=require(path.join(root,'resolve-art-direction.cjs'));

test('gallery embeds the same resolver and produces the same complete branch output as CLI',()=>{
  const html=fs.readFileSync(path.join(root,'references/index.html'),'utf8');
  const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
  const browser=vm.createContext({});
  vm.runInContext(scripts[0],browser);
  // Read the gallery's actual bundled catalog and hash, without its DOM setup.
  vm.runInContext(scripts[1].slice(0,scripts[1].indexOf('const profiles=')),browser);
  for(const main of pack.profiles){
    for(const fragment of [null,...pack.profiles.map(p=>p.id)]){
      browser.mainId=main.id;browser.fragmentId=fragment;
      const actual=JSON.parse(vm.runInContext('JSON.stringify(PixelArtDirection.resolve(pack,catalogSha256,mainId,fragmentId))',browser));
      assert.deepEqual(actual,resolve(main.id,fragment));
      assert.equal(actual.effectiveStyle,fragment||main.id);
      assert.deepEqual([...new Set(Object.values(actual.branches).map(b=>b.style))],[fragment||main.id]);
    }
  }
  assert.equal(resolve('chunky','cute').effectiveStyle,'cute');
  assert.equal(resolve('chunky').effectiveStyle,'chunky');
  assert.throws(()=>resolve('missing','cute'),/Unknown art profile/);
  assert.throws(()=>resolve('cute','missing'),/Unknown art profile/);
});

test('every profile has seven usable dimensions and background prompts exclude anatomical instructions',()=>{
  for(const p of pack.profiles){
    const r=resolve(p.id);
    assert.equal(Object.keys(r.dimensions).length,7);
    for(const value of Object.values(r.dimensions)){
      assert.equal(typeof value,'string');assert(value.length>0);
      assert(r.branches.background.prompt.includes(value));
    }
    assert.doesNotMatch(r.branches.background.prompt,/大头短肢|颈肩|成人写实肢体|头身比|手掌和肢体/);
    assert(r.excluded.includes('components'));
    for(const ref of Object.values(r.reference))assert(fs.existsSync(path.resolve(root,ref)),ref);
  }
  assert.match(resolve('cute').branches.character.prompt,/大头短肢/);
  assert.match(resolve('cute').branches.species.prompt,/大头短肢/);
  assert.match(resolve('ultra-coarse').branches.character.prompt,/不以头身比/);
});

test('clean background references bind real files, provenance and pending approval separately from historical crops',()=>{
  const sources=JSON.parse(fs.readFileSync(path.join(root,'references/background-comparison/sources.json'),'utf8'));
  for(const id of ['chunky','cute']){
    const p=pack.profiles.find(p=>p.id===id);
    const source=sources.assets.find(a=>a.file===p.reference.background);
    assert(source);assert.equal(source.approval,'pending_user_approval');
    const bytes=fs.readFileSync(path.join(root,source.file));
    assert.equal(require('node:crypto').createHash('sha256').update(bytes).digest('hex'),source.sha256);
    assert(source.width>source.height);
    assert(Math.abs(source.width/source.height-16/9)<0.01);
    assert(source.prompt.length>100);
    assert(fs.existsSync(path.join(root,p.reference.historicalBackground)));
    assert.notEqual(p.reference.background,p.reference.historicalBackground);
    assert.equal(p.backgroundReferenceStatus,'generated_clean_background_pending_user_approval');
  }
});
