import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rename, rmdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { BPM, BARS, LOOP_SECONDS, presets } from './score.mjs';
import { BARS as MINUTE_BARS, DUR as MINUTE_DURATION, sections } from './pulse-minute.mjs';

const minute = 'pulse-minute';

function options(args) {
  let out, preset;
  for (let i=0; i<args.length; i+=2) {
    const [flag, value] = args.slice(i,i+2);
    if (!value) throw new Error('Missing value for ' + flag);
    if (flag === '--out') out = path.resolve(value);
    else if (flag === '--preset' && (value === minute || Object.hasOwn(presets,value))) preset = value;
    else throw new Error('Expected --out DIRECTORY and optional --preset warm|pulse|calm|pulse-minute');
  }
  if (!out) throw new Error('Usage: node build.mjs --out DIRECTORY [--preset warm|pulse|calm|pulse-minute]');
  return { out, names: preset ? [preset] : Object.keys(presets) };
}

async function build(args) {
  const { out,names } = options(args);
  const garden = fileURLToPath(new URL('../vendor/garden-skills/scripts/audio.mjs',import.meta.url));
  const sampleRate = 48000, beatSamples = sampleRate * 60 / BPM;
  await mkdir(out,{recursive:true});
  const stage = await mkdtemp(path.join(out,'.build-'));
  const master = path.join(stage,'master.wav');
  const files = names.flatMap(name => [name+'.wav', name+'.beats.json']);
  try {
    for (const name of names) {
      const long = name === minute;
      const source = long ? 'pulse-minute.mjs' : 'score.mjs';
      const score = fileURLToPath(new URL(source, import.meta.url));
      const bars = long ? MINUTE_BARS : BARS;
      const samples = (long ? MINUTE_DURATION : LOOP_SECONDS) * sampleRate;
      const start = long ? 0 : samples;
      const tail = 0.45;
      const filter = 'atrim=start_sample=' + start + ':end_sample=' + (start + samples) +
        (long ? `,afade=t=out:st=${MINUTE_DURATION-tail}:d=${tail}` : '');
      execFileSync(process.execPath,[garden,'build',score,'--out',master],{
        env:{...process.env,PIXEL_BGM_PRESET:name},stdio:['ignore','inherit','inherit'],
      });
      const filename = name+'.wav', wav = path.join(stage,filename);
      execFileSync(process.env.PIXEL_FFMPEG || 'ffmpeg',[
        '-v','error','-y','-i',master,'-af',filter,
        '-ar',String(sampleRate),'-ac','2','-c:a','pcm_s16le',wav,
      ],{stdio:['ignore','inherit','inherit']});
      const entry = {
        id:name,title:long ? '步进 · 一分钟版' : presets[name].title,
        purpose:long ? '从建立情境到加密、留白、回归与收尾' : presets[name].purpose,
        file:filename,bpm:BPM,beatsPerBar:4,bars,sampleRate,
        beatSamples:Array.from({length:bars*4},(_,i)=>i*beatSamples),
        ...(long ? {durationSamples:samples,loop:false,sections:sections.map(section => ({
          ...section, startSample:section.bar * 4 * beatSamples,
        }))} : {loopStartSample:0,loopEndSample:samples}),
        source,sha256:createHash('sha256').update(await readFile(wav)).digest('hex'),
      };
      const metadata = name+'.beats.json';
      await writeFile(path.join(stage,metadata),JSON.stringify(entry,null,2)+'\n');
    }
    for (const file of files) await rename(path.join(stage,file),path.join(out,file));
    console.log(JSON.stringify({directory:out,files}));
  } finally {
    for (const file of [master, ...files.map(file => path.join(stage,file))]) {
      await unlink(file).catch(error => { if (error.code !== 'ENOENT') throw error; });
    }
    await rmdir(stage);
  }
}

build(process.argv.slice(2)).catch(error => {
  console.error(error.message);
  process.exitCode=1;
});
