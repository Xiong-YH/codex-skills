'use strict';

const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const revise = require('./director-state.cjs');

const output = path.resolve(__dirname, '..');
const project = path.resolve(output, '../..');
const model = require(path.resolve(project,'../../../skills/pixel-video-director/assets/director-workspace/model.js'));
const read = file => fs.readFileSync(file,'utf8');
const json = file => JSON.parse(read(file));
const hash = value => createHash('sha256').update(value).digest('hex');
const relative = file => path.relative(project,file).split(path.sep).join('/');
const inline = value => JSON.stringify(value).replace(/[<\u2028\u2029]/g, char =>
  '\\u' + char.charCodeAt(0).toString(16).padStart(4,'0'));
const scripts = html => [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(hit => hit[1]);
const stateFile = path.join(project,'script-creator.json');
const entry = path.join(project,'script-creator.html');
const archivedState = path.join(project,'review/history/script-creator-r34-before-r38.json');
const archivedEntry = path.join(project,'review/history/script-creator-r37-before-r38.html');

const before = read(stateFile), oldHtml = read(entry);
const source = fs.existsSync(archivedState) ? json(archivedState) : JSON.parse(before);
const layout = fs.existsSync(archivedEntry) ? read(archivedEntry) : oldHtml;
const prior = json(path.resolve(output,'../r37-reading-pass/asking-r37-reading-pass.project.json'));
const manifest = path.join(output,'asking-r38-v5-sync.project.json');
const feedback = path.join(output,'feedback.json');
const cut = json(manifest), request = json(feedback);
const preview = path.join(output,cut.preview.file), wave = path.join(output,cut.audio.file);
const video = path.join(output,cut.export.file);
const movie = read(preview);
assert.equal(hash(movie),cut.preview.sha256);
assert.equal(hash(fs.readFileSync(wave)),cut.audio.sha256);
assert.equal(hash(fs.readFileSync(video)),cut.export.sha256);
assert.equal(hash(fs.readFileSync(path.resolve(output,cut.bgm.file))),request.audio.sha256);
assert.equal(cut.export.sourcePreviewSha256,cut.preview.sha256);
assert.equal(cut.export.sourceMixSha256,cut.audio.sha256);
assert.equal(source.revision,request.sourceRevision);
assert.equal(cut.adoptedScriptRevision,source.revision+1);
const priorTake = JSON.parse(layout.match(/window\.DIRECTOR_REVIEW_TAKE=([^\n]+);\n/)[1]);
assert.equal(priorTake.sha256,request.pictureSha256);
assert.equal(priorTake.revision,source.revision);
const next = revise(model,source,prior,cut,request,{
  preview:relative(preview),manifest:relative(manifest),video:relative(video),feedback:relative(feedback),
});
let total = 0;
const shots = cut.timeline.map(({id,label,start,frames,cues},index) => {
  const segment = next.stages.director.segments[index];
  assert.equal(id,segment.id);
  assert.equal(start,total);
  assert.equal(segment.plan.duration,frames/cut.fps);
  assert.deepEqual(model.readiness(next,segment),{sketch:'current',plan:'current'});
  total += frames;
  return { id, number:index+1, label, start, frames, copy:cues.map(cue=>cut.screenCopy[cue]) };
});
assert.equal(total,cut.frames);
const take = {
  projectId:next.projectId,revision:next.revision,edition:'R38',label:cut.version,
  fps:cut.fps,frames:total,audio:relative(wave),preview:relative(preview),manifest:relative(manifest),
  video:relative(video),review:relative(feedback),sha256:cut.preview.sha256,
  notePrefix:'canvas-review:R38:'+cut.preview.sha256.slice(0,12)+':',shots,
};

const canvas = `<div hidden><canvas id="film" width="${cut.dimensions.width}" height="${cut.dimensions.height}"></canvas></div>\n`;
const headEnd = layout.indexOf(canvas);
const appStart = layout.indexOf('<script>\nlet CREATOR_PROJECT=',headEnd);
assert(headEnd >= 0 && appStart > headEnd);
const picture = scripts(movie);
assert.match(picture.at(-2),/window\.AskingRecut = Object\.freeze/);
assert.match(picture.at(-1),/^\(function \(D, cut\)/);
const adapter = read(path.resolve(output,'../r32-motion-pass/source/workbench-review.js'))
  .replace('配乐读取失败。请确认 R32 工程旁的 R31 配乐文件可读取。','音轨读取失败。请确认本版试听音轨可读取。')
  .replace('R32 画面素材加载失败','R38 画面素材加载失败')
  .replace("createTextNode(' 配乐')","createTextNode(' 步进 V5 与音效')")
  .replace('artifacts: { preview: take.preview, project: take.manifest }',
    'artifacts: { preview: take.preview, project: take.manifest, video: take.video, review: take.review }');
const app = layout.slice(appStart)
  .replace('整理 R37 审片意见','整理 R38 审片意见')
  .replace('R37 逐段审片意见','R38 逐段审片意见')
  .replace('asking-r37-shot-feedback.json','asking-r38-shot-feedback.json')
  .replace("const links=preview?[['review','本次画面记录']]", "const links=preview?[['video','下载本版 MP4'],['project','同版工程 JSON'],['review','本次调整依据']]")
  .replace(/^let CREATOR_PROJECT=\{[^\r\n]*\};$/m, () => 'let CREATOR_PROJECT='+inline(next)+';');
assert.match(app,/下载本版 MP4/);
assert.match(app,/asking-r38-shot-feedback\.json/);
const published = layout.slice(0,headEnd) + canvas + picture.slice(0,-1).map(js=>'<script>'+js+'</script>').join('\n')
  + '\n<script>window.DIRECTOR_REVIEW_TAKE=' + inline(take) + ';\n' + adapter + '</script>\n' + app;
for (const source of scripts(published)) new vm.Script(source);
assert.deepEqual(JSON.parse(published.match(/^let CREATOR_PROJECT=(\{[^\r\n]+\});$/m)[1]),next);

const nextJson = JSON.stringify(next,null,2)+'\n';
if (before !== nextJson || oldHtml !== published) {
  assert.equal(model.hash(JSON.parse(before)),request.sourceHash,'Director source has changed');
  assert.equal(oldHtml,layout,'Workbench entry has changed');
  for (const [file,archive] of [[stateFile,archivedState],[entry,archivedEntry]]) {
    if (!fs.existsSync(archive)) fs.copyFileSync(file,archive,fs.constants.COPYFILE_EXCL);
  }
  const staged = [stateFile+'.r38-next',entry+'.r38-next'];
  fs.writeFileSync(staged[0],nextJson);
  fs.writeFileSync(staged[1],published);
  assert.equal(read(stateFile),before);
  assert.equal(read(entry),oldHtml);
  fs.renameSync(staged[0],stateFile);
  try { fs.renameSync(staged[1],entry); }
  catch (error) {
    fs.writeFileSync(staged[0],before);
    fs.renameSync(staged[0],stateFile);
    throw error;
  }
}
console.log(JSON.stringify({edition:take.edition,revision:next.revision,sourceHash:model.hash(next),seconds:total/cut.fps,shots:shots.length}));
