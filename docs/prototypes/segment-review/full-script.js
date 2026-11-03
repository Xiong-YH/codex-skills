'use strict';
// Script drafts are a reading surface, never a second execution timeline.
function mountFullScript(){
 if(!sourceProject?.scriptReview||document.getElementById('fullScriptBtn'))return;
 const draft=sourceProject.scriptReview,shots=draft.shots;
 const button=document.createElement('button');button.id='fullScriptBtn';button.className='full-script-button';button.textContent=`完整脚本 · ${shots.length} 镜`;
 document.querySelector('.side-summary').after(button);
 const dialog=document.createElement('dialog');dialog.id='fullScriptDialog';dialog.setAttribute('aria-label','完整分镜脚本');
 dialog.innerHTML=`<div class="dialog-head"><div><h2>${esc(draft.title||sourceProject.project.title)}</h2><p>${shots.length} 镜脚本 · ${shots.filter(s=>s.status==='rendered').length} 镜已有小样 · 其余待制作，尚未安排实际视频时间</p></div><button id="closeFullScript" aria-label="关闭完整脚本">✕</button></div><div class="full-script-layout"><nav aria-label="完整脚本镜头导航">${shots.map((s,i)=>`<button data-script-id="${esc(s.id)}">${String(i+1).padStart(2,'0')} ${esc(s.title)}<small>${s.status==='rendered'?'已有小样':'待制作'}</small></button>`).join('')}</nav><div class="full-script-content">${shots.map((s,i)=>`<article id="full-script-${esc(s.id)}"><div class="eyebrow">镜头 ${String(i+1).padStart(2,'0')} · ${s.status==='rendered'?'已有小样':'待制作 / 暂无视频'}</div><h3>${esc(s.title)}</h3><p class="muted">${esc(s.category)}</p><h4>旁白 / 配套字幕</h4><p class="script-narration">${esc(s.narration)}</p><h4>画面与动作</h4><p>${esc(s.visual)}</p><h4>接镜与落稳</h4><p>${esc(s.transition)}</p>${s.status==='rendered'?`<button data-script-preview="${esc(s.id)}">查看现有视频片段 ↗</button>`:''}${s.proposalImage?`<details><summary>优化图片提案 · 尚未应用到视频</summary><img src="${esc(s.proposalImage)}" alt="${esc(s.title)}的静帧视觉提案" loading="lazy"></details>`:''}</article>`).join('')}</div></div>`;
 document.body.append(dialog);button.onclick=()=>dialog.showModal();document.getElementById('closeFullScript').onclick=()=>dialog.close();
 dialog.addEventListener('click',e=>{const b=e.target.closest('button');if(b?.dataset.scriptId)document.getElementById('full-script-'+b.dataset.scriptId)?.scrollIntoView({block:'start'});if(b?.dataset.scriptPreview){const segment=SEGMENTS.find(s=>s.shotId===b.dataset.scriptPreview);if(segment){dialog.close();selectSegment(segment.id)}}});
 document.querySelector('.breadcrumb').firstChild.textContent='项目 / '+sourceProject.project.title+' / ';
 document.querySelector('.side-summary').innerHTML=`<span class="badge">${SEGMENTS.length} 个视频片段</span><span class="badge">${shots.length} 镜完整脚本</span>`;
 document.querySelector('.sidebar footer').textContent='前两镜可播放；完整脚本包含后续待制作镜头。优化静帧仅为提案。';
 document.querySelectorAll('.ruler span').forEach((s,i)=>s.textContent=format(sourceProject.project.durationSeconds*i/3));
 document.title='片场 · '+draft.title;
}
document.addEventListener('review-source-ready',mountFullScript);
if(sourceProject)mountFullScript();
