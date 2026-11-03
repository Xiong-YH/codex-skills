/* First-person intact hand/paper pose sequence. Each source rectangle was inspected. */
(function(root){
  'use strict';
  const id='object.transcript-reach-hold.v1',duration=3.6;
  const beats=Object.freeze([0,.45,.8,1.2,1.8,2.4,3.15,3.6]);
  const rows=[80,420,736,1040],ends=[420,736,1040,1330],paperT=[115,440,748,1052];
  const ease=v=>{v=Math.max(0,Math.min(1,v));return v*v*(3-2*v)};
  function stateAt(time){
    if(typeof time!=='number'||!Number.isFinite(time))throw new TypeError('time must be finite');
    const t=Math.max(0,Math.min(duration,time));let frame=0;
    for(let i=1;i<8;i++)if(t>=beats[i])frame=i;
    return {time:t,frame,phase:t>=duration?'stopped':t<1?'lifting':'reaching',paperId:'transcript-a',paperCount:1,lift:ease((t-.2)/.8)};
  }
  function create({spriteSheet}){
    const w=spriteSheet?.naturalWidth||spriteSheet?.width,h=spriteSheet?.naturalHeight||spriteSheet?.height;
    if(w!==1182||h!==1330)throw new TypeError('Use the registered 1182x1330 A pose sheet');
    function draw(ctx,{time=0,x=0,y=0,width=1920,height=1080,title='成绩单',rank='绩点 · 专业前列'}={}){
      const s=stateAt(time);if(![x,y,width,height].every(Number.isFinite)||width<=0||height<=0)throw new TypeError('Invalid host rectangle');
      const row=Math.floor(s.frame/2),col=s.frame%2,left=col?695:122,top=paperT[row],scale=550/295;
      const py=605-35*s.lift;
      ctx.save();try{
        ctx.beginPath();ctx.rect(x,y,width,height);ctx.clip();const hostScale=Math.min(width/1920,height/1080);ctx.translate(x+(width-1920*hostScale)/2,y+(height-1080*hostScale)/2);ctx.scale(hostScale,hostScale);
        ctx.translate(330-left*scale,py-top*scale);ctx.scale(scale,scale);
        // The AI sheet has irregular row gutters. Explicit crops prevent adjacent-pose leakage.
        // Only the paper and two connected forearm regions are part of this foreground sprite.
        ctx.beginPath();ctx.rect(left-2,top-2,300,207);
        ctx.moveTo(left-88,top+292);ctx.lineTo(left-88,top+222);ctx.lineTo(left-50,top+130);ctx.lineTo(left+45,top+110);ctx.lineTo(left+45,top+220);ctx.lineTo(left+5,top+292);ctx.closePath();
        ctx.moveTo(left+295,top+75);ctx.lineTo(left+400,top+75);ctx.lineTo(left+470,top+292);ctx.lineTo(left+350,top+292);ctx.lineTo(left+295,top+215);ctx.closePath();ctx.clip();
        ctx.imageSmoothingEnabled=false;
        ctx.drawImage(spriteSheet,col*591,rows[row],591,ends[row]-rows[row],col*591,rows[row],591,ends[row]-rows[row]);
        ctx.fillStyle='#29453f';ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.font='600 25px Chinese, "PingFang SC", sans-serif';ctx.fillText(title,left+147,top+25);
        ctx.font='600 15px Chinese, "PingFang SC", sans-serif';ctx.fillText(rank,left+147,top+55);
      }finally{ctx.restore();}return s;
    }
    return Object.freeze({id,duration,beats,stateAt,draw});
  }
  const api=Object.freeze({id,duration,beats,stateAt,create});if(typeof module==='object'&&module.exports)module.exports=api;else root.PixelTranscriptReach=api;
})(typeof globalThis!=='undefined'?globalThis:this);
