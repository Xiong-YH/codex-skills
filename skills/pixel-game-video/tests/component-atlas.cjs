// Build guide and style-atlas first. Check the interactive atlas and standalone demos.
const path = require('node:path');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.PIXEL_NODE_MODULES
  ? path.join(process.env.PIXEL_NODE_MODULES, 'playwright') : 'playwright');

async function main() {
  const file = path.resolve(process.argv[2] || path.join(__dirname, '../modules/components/examples/style-atlas/build/index.html'));
  const browser = await chromium.launch({ headless:true, executablePath:process.env.PIXEL_BROWSER_EXECUTABLE });
  try {
    const page = await browser.newPage({ viewport:{width:1500,height:1000} });
    const errors = [];
    page.on('pageerror', error=>errors.push(error.message));
    const ready = () => page.waitForFunction(()=>window.atlasGalleryReady, null, {timeout:90000});
    const config = () => page.locator('#json').innerText().then(JSON.parse);
    await page.goto(pathToFileURL(file).href, { waitUntil:'domcontentloaded', timeout:90000 });
    await ready();
    assert.equal(await page.locator('#six .card').count(), 7);
    await page.selectOption('#filter', 'all');
    await page.waitForFunction(()=>document.querySelectorAll('#all .card').length===93);
    await page.selectOption('#filter', 'current');
    await page.selectOption('#style', 'plain');
    await ready();
    assert(await page.locator('#variant').isDisabled());
    assert(await page.locator('#stack').isDisabled());
    assert.equal((await config()).visualStyle, 'plain');
    assert.deepEqual((await config()).features, []);

    await page.selectOption('#style', 'paper');
    await ready();
    assert.deepEqual(await page.locator('#kind option').evaluateAll(options=>options.map(option=>option.value).sort()),
      ['checklist','identity','takeaway']);
    assert.equal(await page.locator('#all .card').count(), 9);
    const paper = await config();
    assert.equal(paper.visualStyle, 'paper');
    assert.equal(paper.kind, 'identity');
    assert(!('image' in paper.data) && !('sourceShot' in paper.data));
    await page.selectOption('#variant', 'relay');
    await ready();
    await page.locator('#stack').check();
    await ready();
    assert.deepEqual((await config()).features, ['stack']);
    await page.selectOption('#kind', 'checklist');
    await ready();
    assert.equal((await config()).styleVariant, 'relay');
    assert.equal((await config()).kind, 'checklist');
    await page.selectOption('#style', 'energy');
    await ready();
    await page.locator('#background').uncheck();
    await ready();
    await page.evaluate(async()=>{ await componentAtlas.seek(24); await componentAtlas.seek(215); });
    await page.selectOption('#kind', 'flow');
    await ready();
    await page.locator('#markers').getByRole('button', {name:'第二步', exact:true}).click();
    assert.equal(await page.evaluate(()=>componentAtlas.state().frame), 108);
    await page.selectOption('#kind', 'chapter');
    await ready();
    assert(await page.locator('#markers').isHidden());

    const custom = page.locator('#customFrame');
    const actions = page.locator('#actions [data-custom]');
    assert.deepEqual(await actions.evaluateAll(buttons=>buttons.map(button=>button.dataset.custom)),
      ['transfer','queue','meter','tray','assembly']);
    await page.locator('[data-custom="queue"]').click();
    await page.waitForFunction(()=>!!document.querySelector('#customFrame').contentWindow.QueueStudy);
    const queue = await custom.evaluate(frame=>{
      const demo=frame.contentWindow.QueueStudy;
      demo.setTime(5,1);
      const state=demo.model(1,5);
      return [state.arrived.length, state.waiting.length, Number(Boolean(state.active)), state.complete.length];
    });
    assert(queue[1]>0);
    assert.equal(queue[0], queue.slice(1).reduce((total,value)=>total+value,0));
    await page.keyboard.press('Escape');
    await page.waitForFunction(()=>!document.querySelector('#customFrame').hasAttribute('srcdoc'));

    await page.locator('[data-custom="meter"]').click();
    await page.waitForFunction(()=>!!document.querySelector('#customFrame').contentWindow.PixelStateMeter);
    const meter = page.frameLocator('#customFrame');
    await meter.locator('#seek').fill('360');
    assert.equal(await meter.locator('#status').innerText(), '天数保留，状态归零，碎块停在地面');
    await page.locator('#close').click();

    await page.locator('[data-custom="tray"]').click();
    await page.waitForFunction(()=>document.querySelector('#customFrame').contentWindow.minimalDemo?.state().ready);
    const tray = await custom.evaluate(frame=>frame.contentWindow.minimalDemo.verify());
    await page.locator('#close').click();
    await page.locator('[data-custom="assembly"]').click();
    await page.waitForFunction(()=>!!document.querySelector('#customFrame').contentWindow.PixelEnergyAssembly);
    await page.locator('#close').click();
    await page.locator('[data-custom="transfer"]').click();
    await page.waitForFunction(()=>!!document.querySelector('#customFrame').contentWindow.slotTransferDemo);
    const transfer = await custom.evaluate(frame=>{
      const { seek } = frame.contentWindow.slotTransferDemo;
      return [seek(0), seek(56), seek(80), seek(140)].map(state=>
        [state.id, state.owner, state.ready, state.confirmed]);
    });
    assert.deepEqual(transfer, [
      ['proof-a','source',false,false], ['proof-a','slot',false,false],
      ['proof-a','slot',true,false], ['proof-a','result',true,true]
    ]);
    await page.locator('#close').click();
    await page.setViewportSize({ width:600, height:900 });
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth), false);
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ basicExamples:93, paperExamples:9, plainControls:true,
      customTray:tray.resourceIdentity, historicalDemo:true, slotTransfer:transfer, queue,
      stateMarkers:true, stateMeter:true, narrowLayout:true, browserErrors:errors }));
  } finally {
    await browser.close();
  }
}

main().catch(error=>{ console.error(error); process.exitCode=1; });
