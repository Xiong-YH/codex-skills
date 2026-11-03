/* Whole-character sprite action: no detached head, arm rig or free-floating hand. */
(function(root){
  'use strict';
  const id='object.character-offer-receive.v1';
  const duration=3.2;
  const beats=Object.freeze([0,.48,.68,.82,.96,1.13,1.33,1.56]);
  // Registration keeps the head stable across the eight complete poses.
  const offsets=Object.freeze([[0,0],[-1,-1],[-1,0],[-2,0],[0,-3],[-1,-3],[-.5,-2],[-2.5,-2]]);
  const paperY=[402,402,402,374,350,332,314,312];
  function stateAt(time){
    if(typeof time!=='number'||!Number.isFinite(time))throw new TypeError('time must be finite');
    const t=Math.max(0,Math.min(duration,time));
    let frame=0;for(let i=1;i<beats.length;i++)if(t>=beats[i])frame=i;
    const phase=frame===0?'ready':frame<2?'reach':frame<4?'grip':frame<7?'retract':'hold';
    return {time:t,frame,phase,objectId:'offer-1',objectCount:1,owner:frame<2?'table':'candidate',
      label:({ready:'准备接取',reach:'伸手靠近',grip:'握住信封',retract:'收回胸前',hold:'持稳，保留结果'})[phase]};
  }
  function create({spriteSheet}){
    const sw=spriteSheet?.naturalWidth||spriteSheet?.width,sh=spriteSheet?.naturalHeight||spriteSheet?.height;
    if(!sw||!sh)throw new TypeError('Pass a decoded spriteSheet image');
    function draw(ctx,{time=0,x=0,y=0,width=512,height=512,label='OFFER'}={}){
      const state=stateAt(time);
      if(![x,y,width,height].every(Number.isFinite)||width<=0||height<=0)throw new TypeError('Invalid host rectangle');
      if(typeof label!=='string'||label.length>10)throw new TypeError('label must have at most ten characters');
      const i=state.frame,col=i%4,row=Math.floor(i/4);
      const sx=Math.round(col*sw/4),sy=Math.round(row*sh/2);
      const cw=Math.round((col+1)*sw/4)-sx,ch=Math.round((row+1)*sh/2)-sy;
      const scale=Math.min(width/cw,height/ch),dx=x+(width-cw*scale)/2,dy=y+(height-ch*scale)/2;
      ctx.save();try{
        ctx.beginPath();ctx.rect(x,y,width,height);ctx.clip();ctx.imageSmoothingEnabled=false;
        ctx.translate(dx,dy);ctx.scale(scale,scale);ctx.translate(...offsets[i]);
        ctx.drawImage(spriteSheet,sx,sy,cw,ch,0,0,cw,ch);
        if(label){ctx.fillStyle='#263b3c';ctx.font='600 13px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,233,paperY[i]);}
      }finally{ctx.restore();}
      return state;
    }
    return Object.freeze({id,duration,beats,stateAt,draw});
  }
  const api=Object.freeze({id,duration,beats,stateAt,create});
  if(typeof module==='object'&&module.exports)module.exports=api;else root.PixelOfferReceive=api;
})(typeof globalThis!=='undefined'?globalThis:this);
