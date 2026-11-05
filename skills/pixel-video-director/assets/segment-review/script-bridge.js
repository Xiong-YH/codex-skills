/* Portable, source-bound handoff between the script workspace and design review. */
(function(root){
'use strict';
const LIMIT=240000,VERSION='script-review/1';

const COLUMNS=[['identity','片段 / 镜头',0],['duration','预估时长',0],['copy','文案与屏幕文字',1],['action','动作状态',3],['style','画面风格',2],['layout','画面布局',2],['objects','主体与组件设计',2],['background','背景',2],['audio','声音与音效',4],['continuity','转场与接镜',3]];
const READABLE=['片段','大概多长','台词和字幕','动作怎么做','画面风格','画面怎么摆','人物和物件','周围的场景','声音怎么配','前后怎么接'];
function excerpt(shot){const text=shot.cells[1].value.replace(/^\s*c\d+\s*(?:｜旁白（逐字）：|[：:])\s*/i,'');return text.split(/[。！？\n]/)[0].replace(/[“”‘’]/g,'').slice(0,26)||'查看这一段内容';}
function readableCell(shot,dim,i){if(dim===0)return '第'+(i+1)+'段 · '+excerpt(shot);if(dim===1){const m=shot.cells[0].value.match(/(?:建议|预计|大约|约)[^\d]{0,4}([\d.]+)\s*秒/);return m?'约 '+m[1]+' 秒（待配音后确认）':'时间待确定';}const source=shot.cells[COLUMNS[dim][2]].value;const label=COLUMNS[dim][1]+'：';const line=source.split('\n').find(part=>part.startsWith(label));return line?line.slice(label.length).trim():source.replace(/^\s*c\d+\s*[：:]\s*/i,'');}
function validateDiagram(d){if(!d||!Array.isArray(d.elements)||d.elements.length>16||!validString(d.basis)||typeof d.stale!=='boolean')throw Error('布局示意格式不正确。');for(const e of d.elements)if(!validString(e.label,80)||!['paper','screen','focus'].includes(e.tone)||!['x','y','w','h'].every(k=>Number.isFinite(e[k])&&e[k]>=0&&e[k]<=100)||e.w<5||e.h<5||e.x+e.w>100||e.y+e.h>100)throw Error('布局示意的位置不正确。');}
function makeDiagram(doc,diagram){const figure=doc.createElement('figure');figure.setAttribute('style','margin:0 0 12px;font:12px/1.7 "Microsoft YaHei",sans-serif;');if(!diagram){const p=doc.createElement('p');p.textContent='还没有布局示意，以文字为准。';p.setAttribute('style','color:#7d7891;font-size:11px;');figure.append(p);return figure;}validateDiagram(diagram);const frame=doc.createElement('div');frame.setAttribute('style','position:relative;aspect-ratio:16/9;min-width:180px;overflow:hidden;border:1px solid #cfc8ed;border-radius:7px;background:linear-gradient(0deg,#efe8dc 0 24%,#f5f2ff 24% 100%);');frame.setAttribute('role','img');frame.setAttribute('aria-label','布局示意：'+diagram.elements.map(e=>e.label).join('，'));const tones={paper:['#fff8e6','#997232','#e3c878'],screen:['#ece9ff','#5144aa','#bcb1ee'],focus:['#5046e5','#ffffff','#5046e5']};diagram.elements.forEach(e=>{const box=doc.createElement('span'),t=tones[e.tone];box.textContent=e.label;box.setAttribute('style','position:absolute;display:flex;align-items:center;justify-content:center;text-align:center;padding:3px;font-size:10px;line-height:1.5;overflow:hidden;border-radius:4px;left:'+e.x+'%;top:'+e.y+'%;width:'+e.w+'%;height:'+e.h+'%;background:'+t[0]+';color:'+t[1]+';border:1px solid '+t[2]+';');frame.append(box);});const caption=doc.createElement('figcaption');caption.textContent=diagram.stale?'文字已调整，示意位置需要重新核对。':'布局示意 · 方框代表位置，不是实际画面';caption.setAttribute('style','font-size:10px;color:'+(diagram.stale?'#b24b20':'#70658e')+';margin-top:7px;');figure.append(frame,caption);return figure;}

function fingerprint(value){let h=2166136261;for(const char of JSON.stringify(value)){h^=char.charCodeAt(0);h=Math.imul(h,16777619);}return 'snapshot-'+(h>>>0).toString(16);}
function validString(s,max=30000){return typeof s==='string'&&s.length<=max;}
function validate(data){
 if(!data||data.schema!==VERSION||!['handoff','return'].includes(data.kind)||!validString(data.id,100)||!data.id||!validString(data.revision,100)||!data.revision)throw Error('不是受支持的脚本审阅记录。');
 if(data.globalComment!==undefined&&!validString(data.globalComment))throw Error('全片评论过长或格式不正确。');
 if(data.globalDescription!==undefined&&(!Array.isArray(data.globalDescription)||data.globalDescription.length>12||data.globalDescription.some(item=>!item||!validString(item.label,100)||!validString(item.value))))throw Error('全片说明格式不正确。');
 if(data.kind==='handoff'){
  if(!validString(data.topic,10000)||!validString(data.returnUrl,2000)||!Array.isArray(data.shots)||!data.shots.length||data.shots.length>200)throw Error('缺少脚本或镜头信息。');
  const ids=new Set();for(const shot of data.shots){if(!validString(shot.id,100)||ids.has(shot.id)||!Array.isArray(shot.cells)||shot.cells.length!==6)throw Error('镜头标识或六列设计不完整。');ids.add(shot.id);if(shot.diagram)validateDiagram(shot.diagram);for(const cell of shot.cells)if(!validString(cell.key,100)||!validString(cell.label,100)||!validString(cell.value))throw Error('镜头字段格式不正确。');}
 }else if(!Array.isArray(data.suggestions)||data.suggestions.length>2000||data.suggestions.some(s=>!validString(s.shotId,100)||!validString(s.dimension,100)||!validString(s.sourceKey,100)||!validString(s.sourceValue)||!validString(s.proposal)))throw Error('修订建议格式不正确。');
 return data;
}
function encode(data){validate(data);const result=encodeURIComponent(JSON.stringify(data));if(result.length>LIMIT)throw Error('记录较大，请下载 JSON 后在目标工作台导入。');return result;}
function decode(fragment){if(fragment.length>LIMIT)throw Error('记录超过传输容量。');return validate(JSON.parse(decodeURIComponent(fragment)));}
function safeReturn(value,current){const url=new URL(value,current),here=new URL(current);if(url.protocol===here.protocol&&(url.protocol==='file:'||url.origin===here.origin)&&(/\/(?:workflow-overview|script-creator|script-workspace-v\d+)\.html$/.test(url.pathname)||url.pathname==='/script')){url.hash='';return url;}throw Error('无法返回此来源，请下载修订 JSON 后在脚本工具导入。');}
const api={VERSION,COLUMNS,READABLE,excerpt,readableCell,makeDiagram,fingerprint,validate,encode,decode,safeReturn};root.ScriptReviewBridge=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
