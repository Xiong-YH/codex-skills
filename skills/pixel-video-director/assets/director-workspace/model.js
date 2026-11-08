/* Shared design data for plain-language sketches and timed animatics. No production timeline. */
(function(root){
'use strict';
const PHASES=['拆大模块','大白话与草图','设计与白模','制作与审片'];
const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
function hash(value){let h=2166136261;for(const c of JSON.stringify(value)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return (h>>>0).toString(16);}
function text(value,max=30000){return typeof value==='string'&&value.length<=max;}
function assert(ok,message){if(!ok)throw Error(message);}
function number(value,min,max){return Number.isFinite(value)&&value>=min&&value<=max;}
function imageURL(value){return !value||typeof value==='string'&&value.length<=3000000&&/^data:image\/(?:png|jpeg|webp);base64,[a-z\d+/=\s]+$/i.test(value);}
function elements(items,animated=false,duration=0){
 assert(Array.isArray(items)&&items.length<=24,'画面最多包含 24 个占位元素。');const ids=new Set();
 for(const e of items){assert(e&&text(e.id,100)&&e.id&&!ids.has(e.id),'元素 ID 需要唯一。');ids.add(e.id);assert(text(e.label,120)&&['box','person'].includes(e.kind||'box'),'占位元素需要文字和合法类型。');
  for(const key of ['x','y'])assert(number(e[key],-150,200),'元素坐标不正确。');for(const key of ['w','h'])assert(number(e[key],1,200),'元素大小不正确。');
  if(e.layer!==undefined)assert(animated&&['stage','screen'].includes(e.layer),'白模元素层应为 stage 或 screen。');
  if(e.shape!==undefined)assert(['bubble','text'].includes(e.shape)&&(e.kind||'box')==='box','气泡与纯文字形态只用于方框占位。');
  if(e.image!==undefined)assert(animated&&(e.kind||'box')==='box'&&e.shape===undefined&&typeof e.image==='string'&&e.image&&imageURL(e.image),'白模图片元素只接受内嵌 PNG/JPEG/WebP，使用 box 且不设 shape。');
  if(e.textStyle!==undefined){const t=e.textStyle;assert(t&&typeof t==='object'&&!Array.isArray(t),'文字样式格式不正确。');if(t.size!==undefined)assert(number(t.size,10,120),'文字字号超出白模范围。');if(t.weight!==undefined)assert([400,500,600,700,800].includes(t.weight),'文字字重不正确。');if(t.color!==undefined)assert(/^#[a-f\d]{6}$/i.test(t.color),'文字颜色需要六位十六进制色值。');}
  if(e.pivot!==undefined)assert(animated&&number(e.pivot.x,-150,200)&&number(e.pivot.y,-150,200),'旋转中心需要合法百分比坐标。');
  if(e.keyframes!==undefined){assert(animated&&Array.isArray(e.keyframes)&&e.keyframes.length<=30,'只有动态设计接受关键帧。');let at=-1;for(const k of e.keyframes){assert(k&&number(k.at,0,duration)&&k.at>at,'动作关键帧应按时间递增并处于片段内。');at=k.at;for(const key of ['x','y'])if(k[key]!==undefined)assert(number(k[key],-150,200),'动作位置不正确。');if(k.opacity!==undefined)assert(number(k.opacity,0,1),'动作透明度不正确。');if(k.scale!==undefined)assert(number(k.scale,.01,8),'缩放应在 0.01–8 之间。');if(k.rotation!==undefined)assert(number(k.rotation,-3600,3600),'旋转角度超出白模范围。');}}
 }
}
function validateSketch(sketch){assert(sketch&&typeof sketch==='object'&&!Array.isArray(sketch),'草图格式不正确。');elements(sketch.elements||[]);assert(text(sketch.basis||'',100),'草图依据格式不正确。');assert(Array.isArray(sketch.arrows||[])&&(sketch.arrows||[]).length<=24,'草图箭头过多。');for(const a of sketch.arrows||[]){assert(['x1','y1','x2','y2'].every(k=>number(a[k],0,100))&&text(a.label||'',100),'草图箭头坐标不正确。');}}
function validatePlan(plan,cueIds){
 assert(plan&&number(plan.duration,0.2,180),'样板片段时长应为 0.2–180 秒。');assert(text(plan.basis||'',100),'白模依据格式不正确。');
 const b=plan.background||{};assert(!b.color||/^#[a-f\d]{6}$/i.test(b.color),'背景颜色需要六位十六进制色值。');assert(imageURL(b.image),'背景只接受内嵌 PNG/JPEG/WebP，便于离线保存和导出。');assert(text(b.description||''),'背景描述过长。');elements(plan.elements||[],true,plan.duration);
 if(plan.overlay!==undefined)assert(typeof plan.overlay==='string'&&plan.overlay&&imageURL(plan.overlay),'固定叠层只接受内嵌 PNG/JPEG/WebP。');
 if(plan.camera!==undefined){
  const keys=plan.camera?.keyframes;
  assert(Array.isArray(keys)&&keys.length>=1&&keys.length<=30,'相机需要 1–30 个关键帧。');
  let previousTime=-1;
  for(const key of keys){
   assert(key&&number(key.at,0,plan.duration)&&key.at>previousTime,'相机关键帧应按时间递增并处于片段内。');
   for(const axis of ['x','y'])if(key[axis]!==undefined)assert(number(key[axis],-50,50),'相机平移百分比超出范围。');
   if(key.scale!==undefined)assert(number(key.scale,1,2),'相机倍率应为 1–2。');
   previousTime=key.at;
  }
 }
 assert(Array.isArray(plan.subtitles||[])&&(plan.subtitles||[]).length<=100,'字幕安排格式不正确。');for(const s of plan.subtitles||[])assert(s&&cueIds.has(s.cueId)&&number(s.from,0,plan.duration)&&number(s.to,s.from,plan.duration)&&s.to>s.from,'字幕需引用已有文案 ID，并安排在片段时长内。');
 assert(['cut','continue','fade'].includes(plan.transition||'cut'),'白模仅支持直切、同场继续与淡入。');
 for(const key of ['layout','action','stateIn','stateOut','audio','continuity'])if(plan[key]!==undefined)assert(text(plan[key]),'设计说明过长。');
}
function validate(project){
 assert(project&&project.schemaVersion===1&&text(project.projectId,120)&&project.projectId&&Number.isInteger(project.revision)&&project.revision>=0&&project.stages&&typeof project.stages==='object'&&!Array.isArray(project.stages)&&text(project.title,300),'项目需要有效的标识、版本与 stages。');
 for(const key of ['brief','narrative'])if(project.stages[key]!==undefined)assert(project.stages[key]&&typeof project.stages[key]==='object'&&!Array.isArray(project.stages[key]),key+' 应为对象。');
 assert(Number.isInteger(project.activeStage)&&project.activeStage>=0&&project.activeStage<=5,'项目阶段不正确。');
 const copy=project.stages.copy||[];assert(Array.isArray(copy)&&copy.length<=200,'文案格式不正确。');const cues=new Set();for(const c of copy){assert(c&&text(c.id,100)&&c.id&&!cues.has(c.id)&&text(c.text),'文案需要唯一 ID 和文字。');cues.add(c.id);}
 if(project.stages.visuals!==undefined){assert(Array.isArray(project.stages.visuals)&&project.stages.visuals.length<=200,'旧分镜格式不正确。');const oldIds=new Set();for(const s of project.stages.visuals){assert(s&&text(s.id,100)&&s.id&&!oldIds.has(s.id),'旧分镜 ID 需要唯一。');oldIds.add(s.id);for(const key of ['duration','copy','visual','action','audio','notes'])if(s[key]!==undefined)assert(text(s[key]),'旧分镜字段应为文字。');}}
 const d=project.stages.director;if(!d)return project;assert(d&&Number.isInteger(d.phase)&&d.phase>=1&&d.phase<=4,'导演阶段应为 1–4。');assert(text(d.agreements||''),'全片共识格式不正确。');
 assert(Array.isArray(d.modules)&&d.modules.length<=100&&Array.isArray(d.segments)&&d.segments.length<=200,'导演需要 modules 和 segments 数组。');
 const modules=new Set();for(const m of d.modules){assert(m&&text(m.id,100)&&m.id&&!modules.has(m.id)&&text(m.title,300)&&text(m.purpose||''),'大模块标识或说明不正确。');modules.add(m.id);}
 const ids=new Set();for(const s of d.segments){assert(s&&text(s.id,100)&&s.id&&!ids.has(s.id)&&modules.has(s.moduleId)&&text(s.title||'',300)&&text(s.description||''),'片段 ID、模块归属或描述不正确。');ids.add(s.id);assert(Array.isArray(s.cueIds)&&s.cueIds.length<=200&&s.cueIds.every(id=>cues.has(id)),'片段须引用已有文案 ID。');assert(Array.isArray(s.dependsOn||[])&&(s.dependsOn||[]).length<=200,'关联片段格式不正确。');if(s.requirements!==undefined)assert(text(s.requirements),'明确要求格式不正确。');if(s.sketch)validateSketch(s.sketch);if(s.plan)validatePlan(s.plan,cues);}
 for(const s of d.segments)assert((s.dependsOn||[]).every(id=>ids.has(id)&&id!==s.id),'关联片段不存在或引用自身。');
 return project;
}
function legacyKeyPath(project,key){
 const brief={'stage-0-field-0':'topic','stage-0-field-1':'audience','stage-0-field-2':'takeaway','stage-0-brief-problem':'problem','stage-0-brief-value':'value'};
 if(brief[key])return '/stages/brief/'+brief[key];
 const match=key.match(/^stage-3-field-(\d+)$/);if(match){const n=Number(match[1]),i=Math.floor(n/6),field=['identity','copy','visual','action','audio','notes'][n%6];if(field!=='identity'&&project.stages.visuals?.[i])return '/stages/visuals/'+i+'/'+field;}
 const copy=key.match(/^stage-2-field-(\d+)$/);if(copy){const n=Number(copy[1]),i=Math.floor(n/4),field=['stage','id','intent','text'][n%4];if(field!=='id'&&project.stages.copy?.[i])return '/stages/copy/'+i+'/'+field;}
 return null;
}
function view(project){
 validate(project);if(project.stages.director)return {...project.stages.director,legacy:false};
 const old=project.stages.visuals||[],segments=old.map((s,i)=>({id:s.id,moduleId:'legacy',title:'片段 '+(i+1),description:s.visual||'',legacyCopy:s.copy||'',cueIds:[],legacyIndex:i,legacyAction:s.action||'',legacyAudio:s.audio||'',legacyNotes:s.notes||'',legacyDuration:s.duration||'',sketch:s.diagram?{basis:'legacy',elements:(s.diagram.elements||[]).map((e,j)=>({id:'old-'+j,label:e.label,kind:'box',x:e.x,y:e.y,w:e.w,h:e.h})),arrows:[]}:undefined}));
 return {phase:project.activeStage===5?3:1,modules:old.length?[{id:'legacy',title:'既有分镜',purpose:'原稿已保留；模块归属与构思参考待导演整理。'}]:[],segments,legacy:old.length>0};
}
function segmentBasis(project,segment){const d=view(project),i=d.segments.findIndex(s=>s.id===segment.id),m=d.modules.find(m=>m.id===segment.moduleId),near=[d.segments[i-1],d.segments[i+1]].filter(Boolean).map(s=>({id:s.id,description:s.description,requirements:s.requirements||''}));return hash({description:segment.description,requirements:segment.requirements||'',copy:segment.cueIds.map(id=>project.stages.copy.find(c=>c.id===id)),module:m,near,agreements:project.stages.director?.agreements||''});}
function cueText(project,segment){return segment.cueIds.length?segment.cueIds.map(id=>project.stages.copy.find(c=>c.id===id)?.text||'').join('\n'):segment.legacyCopy||'';}
function readiness(project,segment){const basis=segmentBasis(project,segment);return {sketch:!segment.sketch?'missing':segment.sketch.basis===basis?'current':'stale',plan:!segment.plan?'missing':segment.plan.basis===basis?'current':'stale'};}
function segmentPath(project,id,field){const d=view(project),i=d.segments.findIndex(s=>s.id===id);assert(i>=0,'片段不存在。');const s=d.segments[i];if(s.legacyIndex!==undefined){const map={description:'visual'};assert(map[field],'旧稿的此项需要导演升级结构后再编辑。');return '/stages/visuals/'+s.legacyIndex+'/'+map[field];}return '/stages/director/segments/'+i+'/'+field;}
function pointerParts(pointer){assert(typeof pointer==='string'&&pointer.startsWith('/'),'字段位置不正确。');const parts=pointer.slice(1).split('/').map(x=>x.replace(/~1/g,'/').replace(/~0/g,'~'));assert(parts.every(x=>!['__proto__','prototype','constructor'].includes(x)),'字段位置不正确。');return parts;}
function get(project,pointer){return pointerParts(pointer).reduce((p,key)=>p?.[key],project);}
function set(project,pointer,value){const parts=pointerParts(pointer),key=parts.pop();let obj=project;for(const part of parts){assert(obj&&typeof obj==='object','字段位置已经变化，请核对来源。');if(!Object.hasOwn(obj,part)){assert(obj===project.stages&&['brief','narrative'].includes(part),'字段位置已经变化，请核对来源。');obj[part]={};}obj=obj[part];}assert(obj&&typeof obj==='object','字段位置不正确。');if(value===undefined)delete obj[key];else obj[key]=clone(value);}
function changes(base,working,paths){return [...new Set(paths)].map(path=>({path,before:get(base,path)??null,after:get(working,path)??null})).filter(x=>JSON.stringify(x.before)!==JSON.stringify(x.after));}
function applyDraft(project,record){assert(record?.projectId===project.projectId&&record.revision===project.revision&&record.baseHash===hash(project),'草稿来源与当前稿不同，已保留但未覆盖当前内容。');assert(Array.isArray(record.changes)&&record.changes.length<=1000,'草稿格式不正确。');const p=clone(project);for(const c of record.changes){assert(JSON.stringify(get(p,c.path)??null)===JSON.stringify(c.before),'草稿原文与当前稿不同。');set(p,c.path,c.after);}return validate(p);}
function affected(project,id){const list=view(project).segments,i=list.findIndex(s=>s.id===id);return list.filter((s,j)=>Math.abs(j-i)<=1||(s.dependsOn||[]).includes(id)||(list[i]?.dependsOn||[]).includes(s.id)).map(s=>s.id);}
function timeline(project,ids){let time=0;return view(project).segments.filter(s=>!ids||ids.includes(s.id)).map(s=>{assert(s.plan&&readiness(project,s).plan==='current','请先补齐或复核当前片段的动态设计。');assert(!s.plan.rendererSource,'此片段使用独立白模执行器，请进入独立预览播放或导出。');const item={segment:s,start:time,end:time+s.plan.duration};time=item.end;return item;});}
function position(element,at){const base={x:element.x,y:element.y,opacity:1,scale:1,rotation:0};let frames=[{at:0,...base}];for(const k of element.keyframes||[]){const last=frames[frames.length-1],item={...last,...k};if(k.at===0)frames[0]=item;else frames.push(item);}let a=frames[0],b=a;for(const f of frames){if(f.at<=at)a=f;else{b=f;break;}b=a;}const t=b.at===a.at?0:Math.max(0,Math.min(1,(at-a.at)/(b.at-a.at)));return Object.fromEntries(['x','y','opacity','scale','rotation'].map(key=>[key,a[key]+(b[key]-a[key])*t]));}
const api={PHASES,clone,hash,validate,validateSketch,validatePlan,imageURL,view,segmentBasis,cueText,readiness,segmentPath,legacyKeyPath,get,set,changes,applyDraft,affected,timeline,position};root.DirectorModel=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
