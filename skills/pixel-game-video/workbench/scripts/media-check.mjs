import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec = promisify(execFile);
export const analyzeGray = (buffer,width,height,fps=2) => {
  const size=width*height, rows=Math.floor(height*.85), frames=Math.floor(buffer.length/size);
  const issues=[];let stillStart=null,blankStart=null;
  const close=(kind,start,end)=>{if(start!==null&&(end-start)/fps>=1)issues.push({kind,startSeconds:start/fps,endSeconds:end/fps,level:'review'});};
  for(let i=0;i<=frames;i++){
    let blank=false,still=false;
    if(i<frames){let edge=0,diff=0,n=0;const off=i*size;
      for(let y=1;y<rows-1;y++)for(let x=1;x<width-1;x++){
        const k=y*width+x;edge+=Math.abs(buffer[off+k+1]-buffer[off+k-1])+Math.abs(buffer[off+k+width]-buffer[off+k-width]);
        if(i)diff+=Math.abs(buffer[off+k]-buffer[off-size+k]);n++;
      }
      blank=edge/n<.2;still=i>0&&diff/n<.3;
    }
    if(blank&&blankStart===null)blankStart=i;
    if(!blank&&blankStart!==null){close('flat-picture',blankStart,i);blankStart=null;}
    if(still&&stillStart===null)stillStart=i-1;
    if(!still&&stillStart!==null){if((i-stillStart)/fps>=3)close('long-still',stillStart,i);stillStart=null;}
  }
  return {sampledFrames:frames,issues,coverage:`${fps}fps grayscale, subtitle band excluded; static/flat pictures are review hints only`};
};
export const verifyEncoded = async (file,project) => {
  const {RenderInternals}=await import('@remotion/renderer');
  const executable=type=>process.env[`PIXEL_${type.toUpperCase()}`]||RenderInternals.getExecutablePath({type,indent:false,logLevel:'error',binariesDirectory:null});
  const {stdout}=await exec(executable('ffprobe'),['-v','error','-count_frames','-show_entries','stream=codec_type,width,height,nb_read_frames,r_frame_rate,duration','-of','json',file],{maxBuffer:2*1024*1024,timeout:300000});
  const streams=JSON.parse(stdout).streams, video=streams.find(s=>s.codec_type==='video');
  const total=Math.max(2,project.exportDurationInFrames??0,...project.tracks.filter(t=>!t.hidden).flatMap(t=>t.clips.map(c=>c.start+c.duration)));
  if(!video||Number(video.nb_read_frames)!==total||video.width!==project.width||video.height!==project.height)throw new Error('导出帧数或画幅与本次剪辑不符');
  const [numerator,denominator]=video.r_frame_rate.split('/').map(Number);
  const audio=streams.find(s=>s.codec_type==='audio');
  if(!denominator||Math.abs(numerator/denominator-project.fps)>0.00001)throw new Error('导出帧率与本次剪辑不符');
  if(!audio||!Number.isFinite(Number(audio.duration))||Math.abs(Number(audio.duration)-total/project.fps)>Math.max(.1,2/project.fps))throw new Error('导出音轨长度与本次剪辑不符');
  const h=Math.max(2,Math.round(160*project.height/project.width/2)*2);
  let scan;
  try{
    const decoded=await exec(executable('ffmpeg'),['-v','error','-i',file,'-an','-vf',`fps=2,scale=160:${h},format=gray`,'-f','rawvideo','pipe:1'],{encoding:'buffer',maxBuffer:128*1024*1024,timeout:300000});
    scan={pixelScan:'sampled',...analyzeGray(decoded.stdout,160,h)};
  }catch(e){scan={pixelScan:'unavailable',issues:[],coverage:'Pixel scan did not run. Configure PIXEL_FFMPEG with rawvideo support.',error:String(e.message).slice(-500)};}
  return {technical:'passed',frames:total,...scan,visualReview:'not_reviewed',audioReview:'not_reviewed'};
};
