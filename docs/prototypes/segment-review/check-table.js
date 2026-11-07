'use strict';
const checkLabels={seconds:'时长（秒）',start:'起点',end:'终点',cues:'文案',projectLabels:'全片标签',placements:'显露区间',text:'文字',action:'动作',result:'结果',events:'事件',motions:'运镜 / 图层动作',appearance:'外观',projectStyle:'工程画风',components:'组件外观',object:'对象',bounds:'边界',configuration:'源配置',subject:'主体',objects:'对象',nativeObjects:'工程对象',scene:'场景',background:'背景',replacement:'整镜媒体',audioMode:'声音模式',bgm:'配乐',narration:'旁白',continuity:'承接',transition:'转场',intent:'设计说明',id:'ID',design:'设计',labelId:'标签 ID',cueId:'文案 ID'};
function checkValue(value){
 if(value===null||value===undefined||value==='')return '<span class="check-missing">待补 / 未声明</span>';
 if(Array.isArray(value))return value.length?value.map(v=>'<div class="check-entry">'+checkValue(v)+'</div>').join(''):'<span class="check-missing">未列出；需核对是否无此项</span>';
 if(typeof value==='object'&&!Object.keys(value).length)return '<span class="check-missing">待补 / 未声明</span>';
 if(typeof value==='object')return Object.entries(value).map(([k,v])=>'<div><b>'+esc(checkLabels[k]||k)+'：</b>'+checkValue(v)+'</div>').join('');
 return esc(String(value));
}
function renderCheckTable(){
 let host=$('segmentCheck');if(!host){host=document.createElement('section');host.id='segmentCheck';$('designView').prepend(host)}
 const cols=sourceProject.checkColumns||[];
 host.innerHTML='<div class="check-heading"><h2>逐片段 Check · 当前设计</h2><p>横向滚动查看完整十列。状态描述画面怎样变化；源字段未声明的内容待补。建议尚未应用，工程与视听检查另行核验。</p></div><div class="check-scroll" tabindex="0" aria-label="逐片段十列设计表，可横向滚动"><table class="check-table"><thead><tr><th>片段 / 镜头</th>'+cols.map(c=>'<th>'+esc(c.label)+'</th>').join('')+'</tr></thead><tbody>'+SEGMENTS.map(s=>'<tr class="'+(s.id===state.selected?'current':'')+'"><th><button data-check-segment="'+esc(s.id)+'">'+esc(s.id)+'<br>'+esc(s.shotId)+'</button><p>'+esc(s.purpose||s.note)+'</p></th>'+cols.map(c=>{const d=s.checkDimensions?.[c.key];return '<td>'+(d?'<div class="check-value">'+checkValue(d.value)+'</div><p class="check-note">'+esc(d.note)+'</p><details><summary>源字段</summary>'+d.sourceRefs.map(r=>'<div class="source">'+esc(r.file+' :: '+r.stableId+' '+r.field)+'</div>').join('')+'</details><button data-check-feedback="'+esc(c.key)+'" data-check-target="'+esc(s.id)+'">对此项提意见</button>':'待补设计')+'</td>'}).join('')+'</tr>').join('')+'</tbody></table></div>';
}
document.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b||!sourceProject)return;
 const target=b.dataset.checkSegment||b.dataset.checkTarget;if(!target)return;
 state.selected=target;render();seek(current().preview);persist();
 if(b.dataset.checkFeedback){beginComment();$('commentForm').dataset.overall='true';$('commentForm').dataset.checkDimension=b.dataset.checkFeedback;$('commentModule').value='overall';$('commentText').value=(sourceProject.checkColumns.find(c=>c.key===b.dataset.checkFeedback)?.label||'设计')+'：';$('commentText').focus()}
});
