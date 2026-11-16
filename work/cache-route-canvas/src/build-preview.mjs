import { readFile, writeFile } from 'node:fs/promises';

const destination = process.argv[2];
if (!destination) throw new Error('用法：node src/build-preview.mjs <输出 HTML 路径>');

const project = new URL('../', import.meta.url);
const read = (path, encoding) => readFile(new URL(path, project), encoding);
const markup = await read('index.html', 'utf8');
const fragment = markup.split('<!-- preview:start -->')[1]?.split('<!-- preview:end -->')[0];
if (!fragment) throw new Error('index.html 缺少预览区间');
const scripts = [...fragment.matchAll(/<script src="([^"]+)"><\/script>/g)];
const [poses, sprite, music, ...sources] = await Promise.all([
  read('media/modern-poses.webp'),
  read('media/azong-sprite.webp'),
  read('media/pulse-preview.mp3'),
  ...scripts.map(([, path]) => read(path, 'utf8'))
]);
const root = '<main id="cache-route-canvas"';
let output = fragment.replace(root, () => `${root} data-poses="data:image/webp;base64,${poses.toString('base64')}"
  data-sprite="data:image/webp;base64,${sprite.toString('base64')}"
  data-music="data:audio/mpeg;base64,${music.toString('base64')}"`);
scripts.forEach(([tag], i) => { output = output.replace(tag, () => `<script>\n${sources[i]}\n</script>`); });
if (Buffer.byteLength(output) >= 1_000_000) throw new Error('对话内预览超过 1 MB');
await writeFile(destination, output.trimStart(), 'utf8');
console.log(`已写入 ${Buffer.byteLength(output)} 字节`);
