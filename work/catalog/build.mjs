import { readFile, readdir, realpath, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const catalogDir = path.dirname(fileURLToPath(import.meta.url));
const workDir = path.dirname(catalogDir);
const linkKinds = new Set(['video', 'preview', 'source', 'review', 'published', 'file']);
const watchKinds = new Set(['published', 'video', 'preview']);
const videoExtensions = new Set(['.mp4', '.mov', '.m4v', '.webm', '.mkv', '.avi', '.wmv', '.mpeg', '.mpg', '.ogv', '.flv', '.ts', '.mts']);
const posterExtensions = new Set(['.avif', '.jpeg', '.jpg', '.png', '.webp']);
const sourceChecks = new Map([
  ['script-creator.json', (source) => nonempty(source.projectId) && source.stages && typeof source.stages === 'object' && !Array.isArray(source.stages)],
  ['brief.json', (source) => nonempty(source.idea) && nonempty(source.takeaway) && source.durationRangeSeconds != null],
  ['script.json', (source) => Array.isArray(source.beats) || Array.isArray(source.cues)],
  ['storyboard.json', (source) => Array.isArray(source.shots)],
  ['timeline.json', (source) => Array.isArray(source.shots)],
  ['project.json', (source) => nonempty(source.title) && Number.isFinite(source.fps) && source.fps > 0 && source.style != null],
]);

function requireValue(condition, message) {
  if (!condition) throw new Error(message);
}

function nonempty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

async function readCatalog(filename, optional = false) {
  let json;
  try {
    json = await readFile(path.join(catalogDir, filename), 'utf8');
  } catch (error) {
    if (optional && error.code === 'ENOENT') return [];
    throw error;
  }
  const rows = JSON.parse(json.replace(/^\uFEFF/, ''));
  requireValue(Array.isArray(rows), `${filename} 需要包含记录数组`);
  const seen = new Set();
  for (const [index, row] of rows.entries()) {
    requireValue(row && typeof row.id === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.id), `${filename} 第 ${index + 1} 条缺少有效 id`);
    requireValue(!seen.has(row.id), `${filename} 的 id 重复 ${row.id}`);
    requireValue(Array.isArray(row.links ?? []) && Array.isArray(row.related ?? []), `${row.id} 的 links 和 related 应使用数组`);
    seen.add(row.id);
  }
  return rows;
}

function mergeCatalogs(shared, local) {
  const entries = new Map(shared.map((entry) => [entry.id, entry]));
  for (const entry of local) {
    const previous = entries.get(entry.id);
    entries.set(entry.id, previous
      ? {
          ...previous,
          updatedOn: entry.updatedOn === undefined ? previous.updatedOn : entry.updatedOn,
          featuredTarget: entry.featuredTarget === undefined ? previous.featuredTarget : entry.featuredTarget,
          links: [...(previous.links ?? []), ...(entry.links ?? [])],
          related: [...(previous.related ?? []), ...(entry.related ?? [])],
        }
      : entry);
  }
  return [...entries.values()];
}

function pathInside(root, resolved) {
  const relative = path.relative(root, resolved);
  return relative && relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative);
}

async function verifyPath(base, target, owner, directory = false) {
  const parts = typeof target === 'string' ? target.split('/') : [];
  requireValue(
    parts.length && parts.every((part) => part && part !== '.' && part !== '..' && !/[\\:\u0000-\u001f]/.test(part)),
    `${owner} 的路径应相对于 work/，收到 ${JSON.stringify(target)}`,
  );
  let resolved;
  try {
    resolved = await realpath(path.join(base, ...parts));
  } catch (error) {
    if (error.code === 'ENOENT') throw new Error(`${owner} 的目标不存在 work/${target}`);
    throw error;
  }
  requireValue(pathInside(base, resolved), `${owner} 的目标应位于 work/ 内 ${target}`);
  if (directory) requireValue((await stat(resolved)).isDirectory(), `${owner} 的主工程应是目录 ${target}`);
  return resolved;
}

function verifyPublished(target, owner) {
  const url = URL.canParse(target) ? new URL(target) : null;
  requireValue(url && ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password,
    `${owner} 的发布链接应使用完整的 HTTP 或 HTTPS 地址`);
}

function verifyDate(value, owner) {
  if (value === undefined) return;
  const date = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(value) : null;
  requireValue(date && Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value,
    `${owner} 应填写有效日期，格式为 YYYY-MM-DD`);
}

async function isVideoSource(file) {
  const check = sourceChecks.get(path.basename(file).toLowerCase());
  if (!check || !(await stat(file)).isFile()) return false;
  const text = await readFile(file, 'utf8');
  try {
    const source = JSON.parse(text.replace(/^\uFEFF/, ''));
    return Boolean(source && check(source));
  } catch (error) {
    if (error instanceof SyntaxError) return false;
    throw error;
  }
}

async function catalogData() {
  const [shared, local, names, base] = await Promise.all([
    readCatalog('shared.json'),
    readCatalog('local.json', true),
    readdir(workDir),
    realpath(workDir),
  ]);
  const entries = mergeCatalogs(shared, local);
  for (const entry of entries) {
    const { id, title, topic, kind, project, updatedOn, featuredTarget, links = [], related = [] } = entry;
    requireValue(nonempty(title) && nonempty(topic), `${id} 缺少标题或主题`);
    requireValue(kind === 'film', `${id} 的 kind 应为 film（工作项目）`);
    verifyDate(updatedOn, `${id} 的最近制作日期`);
    await verifyPath(base, project, id, true);
    let hasVideo = false;
    const sourceFiles = [];
    for (const record of links) {
      requireValue(record && linkKinds.has(record.kind) && nonempty(record.label) && nonempty(record.target), `${id} 的链接需要类型、名称和目标`);
      verifyDate(record.date, `${id} 的「${record.label}」版本日期`);
      requireValue(record.durationSeconds === undefined || (Number.isFinite(record.durationSeconds) && record.durationSeconds > 0),
        `${id} 的「${record.label}」片长应为正数秒`);
      if (record.poster !== undefined) {
        const owner = `${id} 的「${record.label}」封面`;
        requireValue(watchKinds.has(record.kind), `${owner} 应附在视频、发布或预览链接上`);
        const poster = await verifyPath(base, record.poster, owner);
        const info = await stat(poster);
        requireValue(posterExtensions.has(path.extname(poster).toLowerCase()) && info.isFile() && info.size > 0,
          `${owner} 应为非空的 JPG、PNG、WebP 或 AVIF 图片`);
      }
      if (record.kind === 'published') {
        verifyPublished(record.target, id);
        hasVideo = true;
        continue;
      }
      const file = await verifyPath(base, record.target, id);
      if (record.kind === 'source') sourceFiles.push(file);
      if (record.kind === 'video' || record.kind === 'preview') {
        const extension = path.extname(file).toLowerCase();
        const video = videoExtensions.has(extension);
        const htmlPreview = record.kind === 'preview' && ['.html', '.htm'].includes(extension);
        const info = await stat(file);
        requireValue((video || htmlPreview) && info.isFile() && info.size > 0,
          `${id} 的「${record.label}」应链接到视频文件或 HTML 视频预览`);
        hasVideo ||= video;
      }
    }
    requireValue(featuredTarget === undefined || links.some((record) => record.target === featuredTarget && watchKinds.has(record.kind)),
      `${id} 的 featuredTarget 应指向已登记的视频、预览或发布链接`);
    requireValue(hasVideo || (await Promise.all(sourceFiles.map(isVideoSource))).some(Boolean),
      `${id} 缺少视频文件、发布地址或视频制作源。独立的非视频任务请放到 scratch/<任务>/`);
    for (const target of related) await verifyPath(base, target, id);
  }
  return { entries, hasMigrationIndex: names.includes('迁移索引.md') };
}

async function main() {
  const args = process.argv.slice(2);
  requireValue(args.length === 0 || (args.length === 1 && args[0] === '--check'), '用法 node work/catalog/build.mjs [--check]');
  const data = await catalogData();
  const summary = `${data.entries.length} 个工作项目`;
  if (args.length) {
    console.log(`目录验证通过 · ${summary}`);
    return;
  }

  const template = await readFile(path.join(catalogDir, 'page.html'), 'utf8');
  const marker = '<!-- catalog-data -->';
  requireValue(template.includes(marker), '页面模板缺少数据入口');
  const json = JSON.stringify(data).replaceAll('<', '\\u003c');
  const html = template.replace(marker, () => json);
  const output = path.join(workDir, 'index.html');
  const temp = `${output}.${process.pid}.tmp`;
  try {
    await writeFile(temp, html, 'utf8');
    await rename(temp, output);
  } finally {
    await rm(temp, { force: true });
  }
  console.log(`已生成 work/index.html · ${summary}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
