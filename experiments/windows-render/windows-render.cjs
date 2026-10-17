// Experimental encoder for exactly 8s / 1920x1080 / 60fps / 480 frames.
// Not a general production renderer. No browser code; --encode-only is required.
// Usage: node windows-render.cjs PROJECT OUTPUT.mp4 --encode-only
// Optional env: PIXEL_NODE_MODULES, PIXEL_FFMPEG, PIXEL_FFPROBE.
const fs = require('node:fs/promises');
const path = require('node:path');
const cp = require('node:child_process');
const {once} = require('node:events');
const loadDependency=name=>require(process.env.PIXEL_NODE_MODULES?path.join(path.resolve(process.env.PIXEL_NODE_MODULES),name):name);

function run(program, args, options={}) {
  const result=cp.spawnSync(program,args,{encoding:'utf8',windowsHide:true,maxBuffer:20*1024*1024,...options});
  if(result.status!==0) throw Error(`${path.basename(program)} failed (${result.status}): ${result.stderr||result.error}`);
  return result.stdout;
}
async function main(){
  const [projectArg,outputArg,...flags]=process.argv.slice(2);
  if(!projectArg||!outputArg||flags.length!==1||flags[0]!=='--encode-only')throw Error('Usage: node windows-render.cjs PROJECT OUTPUT.mp4 --encode-only');
  const project=path.resolve(projectArg),output=path.resolve(outputArg),work=path.join(project,'work','windows-render'),frames=path.join(work,'frames');
  const config=JSON.parse(await fs.readFile(path.join(project,'project.json'),'utf8'));
  const {duration,fps,width,height}=config,frameCount=Math.round(duration*fps);
  if(width!==1920||height!==1080||fps!==60||duration!==8||frameCount!==480)throw Error('Experimental contract requires 8s, 1920x1080, 60fps and 480 frames');
  await fs.mkdir(frames,{recursive:true});
  await fs.mkdir(path.dirname(output),{recursive:true});
  const ffmpeg=process.env.PIXEL_FFMPEG||'ffmpeg',ffprobe=process.env.PIXEL_FFPROBE||'ffprobe';
  console.log('Encoding H.264 + AAC');
  const encoders=run(ffmpeg,['-hide_banner','-encoders']);
  const codec=/\blibx264\b/.test(encoders)?'libx264':'libo264rt';
  const videoOptions=codec==='libx264'?['-crf','16','-preset','medium']:['-b:v','12000000','-g','120'];
  // Sharp decodes PNGs and streams RGB, including support for FFmpeg builds without PNG decoding.
  const args=['-hide_banner','-y','-f','rawvideo','-pixel_format','rgb24','-video_size',`${width}x${height}`,'-framerate',String(fps),'-i','pipe:0','-i',path.join(project,'animation-sfx.wav'),'-map','0:v:0','-map','1:a:0','-c:v',codec,...videoOptions,'-pix_fmt','yuv420p','-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709','-r',String(fps),'-frames:v',String(frameCount),'-c:a','aac','-b:a','192k','-ar','48000','-ac','2','-t',String(duration),'-movflags','+faststart',output];
  const encoder=cp.spawn(ffmpeg,args,{windowsHide:true,stdio:['pipe','inherit','inherit']});
  const exited=once(encoder,'exit'),sharp=loadDependency('sharp');
  for(let i=0;i<frameCount;i++){
    const rgb=await sharp(path.join(frames,`frame_${String(i).padStart(4,'0')}.png`)).removeAlpha().raw().toBuffer();
    if(rgb.length!==width*height*3)throw Error('Unexpected raw RGB frame size');
    if(!encoder.stdin.write(rgb))await once(encoder.stdin,'drain');
  }
  encoder.stdin.end();
  const [code]=await exited;if(code!==0)throw Error('FFmpeg encoding failed: '+code);
  const metadata=JSON.parse(run(ffprobe,['-v','error','-count_frames','-show_streams','-show_format','-of','json',output]));
  const video=metadata.streams.find(s=>s.codec_type==='video'),audio=metadata.streams.find(s=>s.codec_type==='audio');
  const timestamps=JSON.parse(run(ffprobe,['-v','error','-select_streams','v:0','-show_frames','-show_entries','frame=best_effort_timestamp_time','-of','json',output])).frames.map(f=>Number(f.best_effort_timestamp_time));
  const intervals=timestamps.slice(1).map((t,i)=>t-timestamps[i]);
  const verified=video.codec_name==='h264'&&video.width===width&&video.height===height&&Number(video.nb_read_frames)===frameCount&&video.avg_frame_rate==='60/1'&&audio?.codec_name==='aac'&&audio.sample_rate==='48000'&&audio.channels===2&&Math.abs(Number(metadata.format.duration)-duration)<.001&&timestamps.length===frameCount&&intervals.every(t=>Math.abs(t-1/fps)<.000002);
  const report={verified,output,videoCodec:video.codec_name,audioCodec:audio?.codec_name,width:video.width,height:video.height,frameCount:Number(video.nb_read_frames),fps:video.avg_frame_rate,durationSeconds:Number(metadata.format.duration),audioChannels:audio?.channels,audioSampleRate:Number(audio?.sample_rate),distinctTimestamps:new Set(timestamps).size,minFrameInterval:Math.min(...intervals),maxFrameInterval:Math.max(...intervals),metadata};
  await fs.writeFile(path.join(work,'verification.json'),JSON.stringify(report,null,2));
  if(!verified)throw Error('Output verification failed; inspect report');
  console.log(JSON.stringify({...report,metadata:undefined},null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
