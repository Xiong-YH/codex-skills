// Generate the guide stills from its compiled Canvas runtime.
const fs = require('node:fs/promises');
const path = require('node:path');
const { open, read, sha } = require('./reference-renderer.cjs');

async function main() {
  const project = path.resolve(process.argv[2] || path.join(__dirname, 'examples/guide'));
  const output = path.resolve(process.argv[3] || path.join(__dirname, 'assets/reference'));
  const [gallery, catalog, render] = await Promise.all([
    read(path.join(project, 'gallery.json')), read(path.join(__dirname, 'catalog.json')), open(project)
  ]);
  const kinds = catalog.items.filter(item => item.status === 'implemented').map(item => item.kind).sort();
  const listed = gallery.entries.filter(item => item.group === 'component').map(item => item.id).sort();
  if (JSON.stringify(kinds) !== JSON.stringify(listed)) throw Error('Guide must cover each component once.');
  const framesExercised = render.exercise();
  const images = new Map(), overview = [];
  for (const entry of gallery.entries) {
    const image = render.capture(entry.shotId, entry.localFrame);
    images.set(entry.id + '.jpg', image);
    if (entry.group === 'component') overview.push({ image, label: entry.title + ' / ' + entry.id });
    if (entry.states.length) {
      const states = entry.states.map(state => ({
        label: state.label, image: render.capture(entry.shotId, state.frame)
      }));
      images.set(entry.id + '-states.jpg', await render.sheet(states));
    }
  }
  images.set('overview.jpg', await render.sheet(overview, { title: '12 类像素信息组件' }));
  await fs.mkdir(output, { recursive: true });
  const screenshots = [];
  for (const [file, bytes] of images) {
    await fs.writeFile(path.join(output, file), bytes);
    screenshots.push({ file: 'assets/reference/' + file, sha256: sha(bytes) });
  }
  const sourceHashes = {};
  for (const name of ['project.json','timeline.json','text.json','audio.json','gallery.json','media/azong.png']) {
    sourceHashes['examples/guide/' + name] = sha(await fs.readFile(path.join(project, name)));
  }
  const manifest = {
    schemaVersion: 1, source: 'Compiled pixel-game-video Canvas runtime', ...render.provenance,
    style: render.resolved.project.style, sourceHashes,
    framesExercised, captures: gallery.entries, screenshots,
    scope: 'Sampled visuals and frame execution. Continuous playback and aesthetic approval are separate.'
  };
  await fs.writeFile(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(JSON.stringify({ images: screenshots.length, framesExercised: manifest.framesExercised, ...render.provenance }));
}

main().catch(error => { console.error(error); process.exitCode = 1; });
