export const SOFT_HIGHLIGHT_PRESET = 'text.soft-highlight.v1';
const font = '"Microsoft YaHei", "PingFang SC", sans-serif';
const ease = v => 1 - Math.pow(1 - Math.max(0, Math.min(1, v)), 3);

export const measureSoftCaption = (ctx, {text, keywords='', fontSize=34, x=.5, y=.87, previousText=''}, w=1280) => {
  ctx.font=`700 ${fontSize}px ${font}`;
  const lines=text.split('\n');
  if (lines.length>2 || !lines.some(line=>line.trim())) throw new Error('柔边字幕需为一至两行完整语义，请拆句或语义换行。');
  const terms=keywords.split('|').map(v=>v.trim()).filter(Boolean).sort((a,b)=>b.length-a.length);
  const rows=lines.map(line=>{
    const runs=[];
    for(let i=0;i<line.length;){
      const term=terms.find(t=>line.startsWith(t,i)),value=term??String.fromCodePoint(line.codePointAt(i)),last=runs.at(-1);
      if(!term&&last&&!last.emphasis)last.text+=value;
      else runs.push({text:value,width:0,emphasis:Boolean(term)});
      i+=value.length;
    }
    for(const run of runs)run.width=ctx.measureText(run.text).width;
    return runs;
  });
  const widths=rows.map(r=>r.reduce((n,run)=>n+run.width,0));
  const maxWidth=Math.min(w*.86,2*Math.min(x*w-w*.05,w*.95-x*w));
  const blockHeight=fontSize+(rows.length-1)*fontSize*1.38;
  const bottom=y*720+(rows.length-1)*fontSize*1.38/2+Math.max(fontSize/2,28);
  if(widths.some(v=>v>maxWidth)||y*720-blockHeight/2<.06*720||bottom>.96*720)
    throw new Error('柔边字幕超出阅读安全区，请语义换行、拆句或调整位置。');
  const previousWidth=previousText?Math.max(...previousText.split('\n').map(line=>ctx.measureText(line).width)):Math.max(...widths);
  return {rows,widths,previousWidth,previousRows:previousText?previousText.split('\n').length:rows.length};
};

/** Host supplies its own React/Remotion instance; no nested runtime dependency. */
export const createSoftHighlight = (React, Remotion) => {
  const {useLayoutEffect,useState,useId,createElement:H}=React;
  const {cancelRender,continueRender,delayRender,useCurrentFrame,useVideoConfig}=Remotion;
  return function SoftHighlight({text='先保存一个版本，再继续修改。',keywords='保存一个版本',emphasis='underline',fontSize=34,color='#f5f3ec',accent='#f7cf82',x=.5,y=.87,plateOpacity=.65,emphasisAt=0,previousText=''}) {
    const {width,height,fps}=useVideoConfig(),frame=useCurrentFrame(),w=width*720/height;
    const [layout,setLayout]=useState(null),id=useId().replace(/:/g,'');
    useLayoutEffect(()=>{
      let live=true;const handle=delayRender('Measuring soft-highlight caption');
      document.fonts.ready.then(()=>{
        if(!live)return;
        const ctx=document.createElement('canvas').getContext('2d');
        setLayout(measureSoftCaption(ctx,{text,keywords,fontSize,x,y,previousText},w));
        continueRender(handle);
      }).catch(err=>{if(live)cancelRender(err);});
      return()=>{live=false;continueRender(handle);};
    },[text,keywords,fontSize,x,y,w,previousText]);
    if(!layout)return null;
    const max=Math.max(...layout.widths),blend=ease(frame/(fps*.16));
    const plateWidth=layout.previousWidth+(max-layout.previousWidth)*blend+208;
    const rowCount=layout.previousRows+(layout.rows.length-layout.previousRows)*blend;
    const plateHeight=84+(rowCount-1)*fontSize*1.38,half=Math.min(.49,104/plateWidth);
    const highlight=frame>=emphasisAt*fps,underline=ease((frame/fps-emphasisAt)/.18);
    return H('svg',{viewBox:`0 0 ${w} 720`,width:'100%',height:'100%','data-caption-preset':SOFT_HIGHLIGHT_PRESET,style:{position:'absolute',inset:0,pointerEvents:'none'}},
      H('defs',null,H('linearGradient',{id:`plate-${id}`},
        ...[[0,0],[half,plateOpacity],[1-half,plateOpacity],[1,0]].map(([offset,opacity],i)=>H('stop',{key:i,offset,stopColor:'#080f18',stopOpacity:opacity})))),
      H('rect',{'data-caption-plate':true,x:x*w-plateWidth/2,y:y*720-plateHeight/2,width:plateWidth,height:plateHeight,fill:`url(#plate-${id})`}),
      ...layout.rows.map((runs,row)=>{
        let at=x*w-layout.widths[row]/2;const yy=y*720+(row-(layout.rows.length-1)/2)*fontSize*1.38;
        return H('g',{key:row},...runs.map((run,i)=>{
          const xx=at;at+=run.width;const active=run.emphasis&&emphasis!=='none'&&highlight;
          return H('g',{key:i},H('text',{x:xx,y:yy,dominantBaseline:'central',fontFamily:font,fontWeight:700,fontSize,fill:active?accent:color,style:{filter:'drop-shadow(0px 2px 3px rgba(0,0,0,.7))'}},run.text),
            active&&emphasis==='underline'?H('rect',{x:xx,y:yy+25,width:run.width*underline,height:3,fill:accent}):null);
        }));
      }));
  };
};
