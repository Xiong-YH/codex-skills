(function(root){
  'use strict';
  const R=root.PixelCustomRuntime||(typeof require==='function'&&require('./runtime.js'));
  const names=['launch','contact','signal','armed','submit','unfold','settled'];
  const mix=(a,b,t)=>a+(b-a)*t;
  function morph(from,to,p){
    if(p===0)return {...from};
    if(p===1)return {...to};
    return {x:mix(from.x,to.x,p),y:mix(from.y,to.y,p),
      width:mix(from.width,to.width,p),height:mix(from.height,to.height,p)};
  }

  function stateAt({frame,events,id,source,slot,result,lift=0}){
    if(!Number.isInteger(frame))throw new Error('Slot transfer frame must be an integer');
    if(typeof id!=='string'||!id)throw new Error('Slot transfer requires a stable item ID');
    const at=names.map(name=>R.event(events??{},name));
    if(at.some((value,index)=>index>0&&value<=at[index-1])||events.contact-events.launch<2)
      throw new Error('Slot transfer events must be ordered with at least two flight frames');
    if(!Number.isFinite(lift)||lift<0)throw new Error('Slot transfer lift must be nonnegative');
    for(const b of [source,slot,result]){
      if(!b||![b.x,b.y,b.width,b.height].every(Number.isFinite)||b.width<=0||b.height<=0)
        throw new Error('Slot transfer rectangles must have finite positions and positive dimensions');
    }

    const right=slot.x+slot.width;
    const sign=Math.sign(slot.x+slot.width/2-source.x-source.width/2)||1;
    const travelDistance=sign<0?source.x-slot.x:right-source.x-source.width;
    const approach={...slot,x:slot.x-sign*Math.min(slot.width*.45,Math.abs(travelDistance))};
    const insertionFrames=Math.max(1,Math.round((events.contact-events.launch)*.26));
    const insertion=events.contact-insertionFrames;
    const progress=(start,end)=>R.clamp((frame-start)/(end-start));
    const glide=progress(events.launch,insertion),insert=progress(insertion,events.contact);
    const moving=morph(morph(source,approach,.18*glide+.82*glide**1.25),slot,insert);
    if(glide>0&&glide<1)moving.y-=lift*Math.sin(Math.PI*glide);
    const settleFrames=Math.max(1,Math.round((events.armed-events.contact)*.46));
    const seat=progress(events.contact,events.contact+settleFrames);
    const stopShift=Math.sin(seat*Math.PI)*(1-seat)*slot.height*.4;
    if(frame>=events.contact){
      const compression=Math.min(slot.width*.06,stopShift*.45);
      moving.x+=sign<0?-stopShift*.64:stopShift*.64+compression;
      moving.width-=compression;
    }
    const fold=R.progress(frame,events,'unfold','settled');
    const selected=frame>=events.contact,ready=frame>=events.armed,sent=frame>=events.submit,confirmed=frame>=events.settled;
    const owner=frame<events.launch?'source':!selected?'in-flight':fold>0?'result':'slot';
    return {id,owner,selected,ready,sent,confirmed,fold,travel:R.progress(frame,events,'launch','contact'),
      signal:R.progress(frame,events,'signal','armed'),direction:sign<0?180:0,stopShift:stopShift*.64,
      contact:{x:sign<0?slot.x:right,y:Math.round(slot.y+slot.height/2)},bounds:morph(moving,result,fold)};
  }

  const api=Object.freeze({stateAt});
  root.PixelSlotTransfer=api;
  if(typeof module==='object'&&module.exports)module.exports=api;
})(globalThis);
