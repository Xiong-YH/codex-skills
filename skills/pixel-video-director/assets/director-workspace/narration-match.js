(function(root){
'use strict';

function units(text){
 return text.normalize('NFKC').toLowerCase().match(/[\p{Letter}\p{Number}]/gu)||[];
}

// Edit-distance traceback gives each exact script character its place in the
// recording, while allowing misrecognitions, omissions and extra spoken words.
function matchCharacters(script,spoken){
 const width=spoken.length+1,trace=new Uint8Array((script.length+1)*width);
 let previous=new Uint16Array(width),current=new Uint16Array(width);
 for(let j=1;j<width;j++)previous[j]=j;
 for(let i=1;i<=script.length;i++){
  current[0]=i;
  const row=i*width;
  for(let j=1;j<width;j++){
   const diagonal=previous[j-1]+(script[i-1]===spoken[j-1].char?0:1);
   const deletion=previous[j]+1,insertion=current[j-1]+1;
   if(diagonal<=deletion&&diagonal<=insertion){current[j]=diagonal;trace[row+j]=0;}
   else if(deletion<=insertion){current[j]=deletion;trace[row+j]=1;}
   else{current[j]=insertion;trace[row+j]=2;}
  }
  [previous,current]=[current,previous];
 }
 const mapping=new Int32Array(script.length).fill(-1);
 let i=script.length,j=spoken.length;
 while(i&&j){
  const direction=trace[i*width+j];
  if(direction===0){
   if(script[i-1]===spoken[j-1].char)mapping[i-1]=j-1;
   i--;j--;
  }else if(direction===1)i--;
  else j--;
 }
 return mapping;
}

function align(cues,transcript,durationMs){
 if(!cues.length||cues.some(cue=>!units(cue.text).length))throw Error('请先为每个镜头关联旁白文案。');
 const script=[],ranges=[];
 for(const cue of cues){
  const start=script.length;
  script.push(...units(cue.text));
  ranges.push({id:cue.id,start,end:script.length});
 }
 const spoken=[];
 for(const chunk of transcript){
  const characters=units(chunk.text);
  const start=Math.max(0,chunk.startMs),end=Math.min(durationMs,chunk.endMs);
  if(end<=start)continue;
  characters.forEach((char,index)=>{
   const step=(end-start)/characters.length;
   spoken.push({char,start:start+index*step,end:start+(index+1)*step});
  });
 }
 if(!spoken.length)throw Error('录音里没有识别到可用的旁白。');
 if(script.length>8000||spoken.length>8000)throw Error('文案或录音过长，请分段进行自动切分。');
 const mapping=matchCharacters(script,spoken);
 const anchors=ranges.map(range=>{
  const hits=[];
  for(let i=range.start;i<range.end;i++)if(mapping[i]>=0)hits.push(i);
  return {first:hits[0],last:hits.at(-1),coverage:hits.length/(range.end-range.start)};
 });
 const coverage=anchors.reduce((n,anchor,i)=>n+anchor.coverage*(ranges[i].end-ranges[i].start),0)/script.length;
 if(coverage<.62||anchors.some(anchor=>anchor.coverage<.30)){
  throw Error('识别内容和分镜文案差异较大，无法可靠地自动切分。请检查录音是否读完所有镜头。');
 }
 const boundaries=[0];
 const review=new Set(anchors.flatMap((anchor,i)=>anchor.coverage<.72?[i]:[]));
 for(let i=1;i<anchors.length;i++){
  const left=anchors[i-1].last,right=anchors[i].first;
  const end=spoken[mapping[left]].end,start=spoken[mapping[right]].start;
  const missedLeft=ranges[i].start-left-1,missedRight=right-ranges[i].start;
  const fraction=(missedLeft+.5)/(missedLeft+missedRight+1);
  const cut=Math.round(end+fraction*(start-end));
  if(cut<=boundaries.at(-1)||cut>=durationMs)throw Error('识别时间不足以分开相邻镜头，请手动设置切点。');
  if(missedLeft+missedRight>4||start-end>1800||end-start>300){review.add(i-1);review.add(i);}
  boundaries.push(cut);
 }
 boundaries.push(durationMs);
 return ranges.map(({id},i)=>({
  startMs:boundaries[i],endMs:boundaries[i+1],segmentId:id,offsetMs:0,
  ...(review.has(i)?{needsReview:true}:{})
 }));
}

const api={align};
if(typeof module!=='undefined')module.exports=api;
else root.DirectorNarrationMatch=api;
})(typeof window!=='undefined'?window:globalThis);
