// Capture every style-atlas entry from the compiled guide, including paper.
const fs = require('node:fs/promises');
const path = require('node:path');
const { open, read, sha, skill } = require('./reference-renderer.cjs');

const styles = { mechanical:'机械', energy:'能量', plain:'朴素', paper:'纸质' };
const variants = { open:'开放', inset:'一体', relay:'传递' };
const sheetName = ({visualStyle,styleVariant}) => {
  if (visualStyle === 'plain' || visualStyle === 'paper') return visualStyle + '.jpg';
  return visualStyle + '-' + styleVariant + '.jpg';
};

async function main() {
  const project = path.resolve(process.argv[2] || path.join(__dirname, 'examples/guide'));
  const output = path.resolve(process.argv[3] || path.join(__dirname, 'assets/reference/style-atlas'));
  const atlas = path.join(__dirname, 'examples/style-atlas');
  const background = path.join(skill, 'modules/library/backgrounds/engineering-workshop-v1.png');
  const [index, gallery, render] = await Promise.all([
    read(path.join(atlas, 'variants.json')), read(path.join(project, 'gallery.json')), open(project, background)
  ]);
  const titles = new Map(gallery.entries.map(entry => [entry.id, entry.title]));
  const groups = new Map(), records = [], chapters = [], states = [];
  let current = '';
  for (const entry of index.entries) {
    const config = { styleVariant:'inset', ...entry.overrides };
    const key = JSON.stringify(config);
    if (key !== current) {
      render.configure(config);
      current = key;
    }
    const name = sheetName(config);
    if (!groups.has(name)) groups.set(name, []);
    const kind = entry.id.split('.')[0];
    const label = titles.get(kind) + ' · ' + styles[config.visualStyle] + ' / ' + variants[config.styleVariant];
    const image = render.capture(entry.sourceShot, 215, 88);
    groups.get(name).push({ image, label });
    records.push({ kind, shotId:entry.sourceShot, ...config, frame:215, sheet:name });
    if (kind === 'chapter') {
      chapters.push({ image, label });
      for (const frame of [12,24,239]) states.push({
        image:render.capture(entry.sourceShot,frame,88), label:label + ' · ' + frame + ' 帧'
      });
    }
  }
  if (records.length !== index.totalExamples) throw Error('Atlas count does not match its index.');
  groups.set('overview.jpg',chapters);
  groups.set('chapter-states.jpg',states);
  await fs.mkdir(output,{recursive:true});
  const files = {};
  for (const [name,items] of groups) {
    const bytes = await render.sheet(items);
    await fs.writeFile(path.join(output,name),bytes);
    files[name] = { sha256:sha(bytes), bytes:bytes.length };
  }
  const sources = {};
  for (const rel of ['modules/components/plain.js','modules/components/style-layers.js',
    'modules/components/apparatus.js','modules/components/paper.js','modules/components/materials.js',
    'modules/components/runtime.js','modules/components/catalog.json','modules/motion/runtime.js',
    'modules/components/examples/style-atlas/template.html','modules/components/examples/style-atlas/variants.json',
    'modules/library/backgrounds/engineering-workshop-v1.png']) {
    sources[rel] = sha(await fs.readFile(path.join(skill,rel)));
  }
  sources['modules/components/examples/guide/timeline.json'] = sha(await fs.readFile(path.join(project,'timeline.json')));
  const manifest = {
    schemaVersion:1, source:'Compiled guide Canvas runtime with style-atlas settings', ...render.provenance,
    sources, background:true, records, files,
    scope:'Final no-stack views and selected chapter frames. The interactive atlas also exposes stack and background settings.'
  };
  await fs.writeFile(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  console.log(JSON.stringify({ examples:records.length, sheets:Object.keys(files).length, ...render.provenance }));
}

main().catch(error => { console.error(error); process.exitCode = 1; });
