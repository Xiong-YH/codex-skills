/* Event-keyed whole-pose player for independent layered clips; not a VideoSpec recipe. */
(function(root){
  'use strict';
  const fail=message=>{throw new Error('Character performance: '+message);};
  const finite=(value,name)=>{if(!Number.isFinite(value))fail(name+' must be finite');return value;};
  function compile(plan){
    if(!Number.isInteger(plan.fps)||plan.fps<1||plan.fps>120)fail('fps must be 1..120');
    const duration=Math.round(finite(plan.duration,'duration')*plan.fps);if(duration<1)fail('duration must be positive');
    const events={};for(const event of plan.events){if(typeof event.id!=='string'||!event.id||Object.hasOwn(events,event.id))fail('event IDs must be unique');const frame=Math.round(finite(event.time,event.id)*plan.fps);if(frame<0||frame>duration)fail('event outside duration: '+event.id);events[event.id]=frame;}
    const at=id=>Object.hasOwn(events,id)?events[id]:fail('unknown event '+id);
    for(const dependency of plan.dependencies||[]){const gap=at(dependency.after)-at(dependency.before);if(gap<(dependency.minFrames??1))fail('causality '+dependency.before+' -> '+dependency.after);}
    function ordered(keys,field){if(!Array.isArray(keys)||!keys.length)fail(field+' is empty');let previous=-1;return keys.map(key=>{const frame=at(key.at);if(frame<=previous)fail(field+' must be strictly ordered');previous=frame;return {...key,frame};});}
    const poses=ordered(plan.poses,'poses');if(poses[0].frame!==0)fail('pose track must start at zero');for(const key of poses)if(!Object.hasOwn(plan.assets,key.pose))fail('missing pose '+key.pose);
    const values={};for(const [name,keys] of Object.entries(plan.values||{})){values[name]=ordered(keys,'value '+name);if(values[name][0].frame!==0)fail('value must start at zero: '+name);for(const key of values[name]){finite(key.value,name);if(key.ease&&key.ease!=='hold'&&!root.PixelVideo?.motionSpec?.curves[key.ease])fail('unknown curve '+key.ease);}}
    return {fps:plan.fps,duration,events,poses,values,assets:plan.assets};
  }
  function sample(plan,inputFrame){
    const frame=Math.max(0,Math.min(plan.duration,finite(inputFrame,'frame')));
    const active=keys=>{let i=0;while(i+1<keys.length&&frame>=keys[i+1].frame)i++;return i;};
    const pose=plan.poses[active(plan.poses)].pose,values={};
    for(const [name,keys] of Object.entries(plan.values)){const i=active(keys),a=keys[i],b=keys[i+1];if(!b||b.ease==='hold'){values[name]=a.value;continue;}const u=(frame-a.frame)/(b.frame-a.frame),curve=root.PixelVideo.motionSpec.curves[b.ease||'linear'];values[name]=a.value+(b.value-a.value)*curve(u);}
    return {frame,pose,asset:plan.assets[pose],values,events:Object.keys(plan.events).filter(id=>frame>=plan.events[id])};
  }
  function advance(time,previousStamp,stamp,rate,duration){
    for(const [name,value] of Object.entries({time,previousStamp,stamp,rate,duration}))finite(value,name);
    if(rate<0||duration<0)fail('negative rate or duration');
    return Math.max(0,Math.min(duration,time+Math.max(0,stamp-previousStamp)/1000*rate));
  }
  const api=Object.freeze({compile,sample,advance});
  (root.PixelVideo=root.PixelVideo||{}).characterPerformance=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
