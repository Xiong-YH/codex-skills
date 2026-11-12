import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rename, rmdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { BPM, BARS, LOOP_SECONDS, presets } from './score.mjs';

function options(args) {
  let out, preset;
  for (let i=0; i<args.length; i+=2) {
    const [flag, value] = args.slice(i,i+2);
    if (!value) throw new Error('Missing value for ' + flag);
    if (flag === '--out') out = path.resolve(value);
    else if (flag === '--preset' && Object.hasOwn(presets,value)) preset = value;
    else throw new Error('Expected --out DIRECTORY and optional --preset warm|pulse|calm');
  }
  if (!out) throw new Error('Usage: node build.mjs --out DIRECTORY [--preset warm|pulse|calm]');
  return { out, names: preset ? [preset] : Object.keys(presets) };
}

async function build(args) {
  const { out,names } = options(args);
  const score = fileURLToPath(new URL('score.mjs',import.meta.url));
  const garden = fileURLToPath(new URL('../vendor/garden-skills/scripts/audio.mjs',import.meta.url));
  const sampleRate = 48000, samples = LOOP_SECONDS*sampleRate;
  await mkdir(out,{recursive:true});
  const stage = await mkdtemp(path.join(out,'.build-'));
  const master = path.join(stage,'master.wav');
  const files = names.flatMap(name => [name+'.wav', name+'.beats.json']);
  try {
    for (const name of names) {
      execFileSync(process.execPath,[garden,'build',score,'--out',master],{
        env:{...process.env,PIXEL_BGM_PRESET:name},stdio:['ignore','inherit','inherit'],
      });
      const filename = name+'.wav', wav = path.join(stage,filename);
      execFileSync(process.env.PIXEL_FFMPEG || 'ffmpeg',[
        '-v','error','-y','-i',master,'-af','atrim=start_sample='+samples+':end_sample='+samples*2,
        '-ar',String(sampleRate),'-ac','2','-c:a','pcm_s16le',wav,
      ],{stdio:['ignore','inherit','inherit']});
      const beatSamples = sampleRate*60/BPM;
      const entry = {
        id:name,title:presets[name].title,purpose:presets[name].purpose,file:filename,
        bpm:BPM,beatsPerBar:4,bars:BARS,sampleRate,loopStartSample:0,loopEndSample:samples,
        beatSamples:Array.from({length:BARS*4},(_,i)=>i*beatSamples),
        source:'score.mjs',sha256:createHash('sha256').update(await readFile(wav)).digest('hex'),
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
