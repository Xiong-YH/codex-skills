'use strict';
const B=window.ScriptReviewBridge,$=id=>document.getElementById(id),DIMS=B.COLUMNS,FRIENDLY=B.READABLE;
let source=null,suggestions={};const rows=new Map();
if(window.__reviewInline||location.protocol==='file:'){$('media-link').removeAttribute('href');$('media-link').setAttribute('aria-disabled','true');$('media-link').textContent='连接视频项目后可用';}else $('media-link').href='/segment-review/index.html';
const storageKey=()=>source?'script-review-draft-'+source.id+'-'+source.revision:'';
function status(text){$('status').textContent=text;}
function load(data){B.validate(data);if(data.kind!=='handoff')throw Error('请导入脚本文件。修改记录请带回原来的脚本页面。');const memory=source&&source.id===data.id&&source.revision===data.revision?suggestions:{};source=data;suggestions=memory;try{const stored=JSON.parse(localStorage.getItem(storageKey())||'{}');if(stored&&typeof stored==='object'&&!Array.isArray(stored))for(const[key,value]of Object.entries(stored))if(typeof value==='string'&&value.length<=30000)suggestions[key]=value;}catch{status('无法恢复草稿，请在关闭前下载修改记录。');}$('global-section').hidden=false;$('global-comment').value=suggestions['@global']||'';renderGlobalDescription();$('project-name').textContent=data.topic;$('empty').hidden=true;$('design-area').hidden=false;$('save-json').disabled=false;$('overview-count').textContent=data.shots.length+' 段';$('table-count').textContent='全部 '+data.shots.length+' 段';$('source-info').textContent='记录版本：'+data.revision+'。原稿和修改意见分别保留。';render();status('已带入 '+data.shots.length+' 段。点“查看详情”阅读完整原稿并填写修改意见。');}
function listSuggestions(){if(!source)return [];const list=[];source.shots.forEach(shot=>DIMS.forEach(([id,label,index])=>{const proposal=suggestions[shot.id+'|'+id];if(typeof proposal==='string'&&proposal.trim())list.push({shotId:shot.id,dimension:label,sourceKey:shot.cells[index].key,sourceValue:shot.cells[index].value,proposal:proposal.trim()});}));return list;}
function globalComment(){return (suggestions['@global']||'').trim();}
function report(){return B.validate({schema:B.VERSION,kind:'return',id:source.id+'-'+B.fingerprint({suggestions:listSuggestions(),globalComment:globalComment()}),revision:source.revision,suggestions:listSuggestions(),globalComment:globalComment(),globalDescription:source.globalDescription||[],reviewScope:'design-only',sourceApplied:false,mediaReviewed:false});}
function persist(){try{localStorage.setItem(storageKey(),JSON.stringify(suggestions));$('draft-status').textContent='已记下，还没有改动原稿';}catch{$('draft-status').textContent='暂时无法保存，请在“更多”里下载修改记录';}summary();}
function summary(){updateTargetTotal();const items=listSuggestions(),global=globalComment(),total=items.length+(global?1:0);$('summary').textContent=total?'已记下 '+total+' 处意见'+(global?' · 含全片意见':'')+(items.length?' · 涉及 '+new Set(items.map(x=>x.shotId)).size+' 段':''):'还没有修改意见';$('return-script').disabled=!total;$('return-script').textContent=total?'带回 '+total+' 处意见 →':'带着修改，回到脚本 →';$('global-comment-status').textContent=global?'全片意见已记下，将与逐段意见一起带回。':'不针对某一段的意见，可以写在这里。';$('clear-global-comment').disabled=!global;$('summary-list').replaceChildren();if(global){const item=document.createElement('li');item.textContent='全片意见：'+global;$('summary-list').append(item);}items.forEach(item=>{const li=document.createElement('li'),i=source.shots.findIndex(s=>s.id===item.shotId),dim=DIMS.findIndex(d=>d[1]===item.dimension);li.textContent='第'+(i+1)+'段 · '+FRIENDLY[dim]+'：'+item.proposal;$('summary-list').append(li);});source.shots.forEach(shot=>{const count=items.filter(x=>x.shotId===shot.id).length;rows.get(shot.id).badge.textContent=count?count+' 处修改':'未提修改';});}
const drawer = $('shot-drawer');
const previousShot = $('previous-shot');
const nextShot = $('next-shot');
const detailIcons = ['🎬', '⏱️', '📝', '🎞️', '🎨', '📐', '🧩', '🏞️', '🔊', '🔗'];
let currentShot = 0;
previousShot.onclick = () => showDetails(currentShot - 1);
nextShot.onclick = () => showDetails(currentShot + 1);
$('close-drawer').onclick = () => drawer.close();
drawer.addEventListener('close', () => {
    if (!drawer.open) $('drawer-content').replaceChildren();
});

function addDetail(parent, title, value, icon) {
    const section = document.createElement('section');
    section.className = 'drawer-field';
    const heading = document.createElement('h3');
    const symbol = document.createElement('span');
    symbol.setAttribute('aria-hidden', 'true');
    symbol.textContent = icon + ' ';
    heading.append(symbol, title);
    const original = document.createElement('p');
    original.className = 'cell-original';
    original.textContent = value;
    section.append(heading, original);
    parent.append(section);
    return section;
}

function showDetails(index) {
    const shot = source?.shots[index];
    if (!shot) return;
    currentShot = index;
    previousShot.disabled = index === 0;
    nextShot.disabled = index === source.shots.length - 1;
    const content = $('drawer-content');
    content.replaceChildren();
    $('drawer-title').textContent = `第 ${index + 1} / ${source.shots.length} 段`;
    const [identity, ...duration] = shot.cells[0].value.split('\n');
    addDetail(content, FRIENDLY[0], identity, detailIcons[0]);
    for (const dim of [5, 1, 2, 3, 4, 6, 7, 8, 9]) {
        const [id] = DIMS[dim];
        const key = `${shot.id}|${id}`;
        const value = dim === 1 && duration.length ? duration.join('\n') : B.readableCell(shot, dim, index);
        const field = addDetail(content, FRIENDLY[dim], value, detailIcons[dim]);
        if (dim === 5) field.insertBefore(B.makeDiagram(document, shot.diagram), field.children[1]);
        const input = document.createElement('textarea');
        input.setAttribute('aria-label', `${FRIENDLY[dim]}的修改意见`);
        input.placeholder = '填写这一项的修改意见';
        input.value = suggestions[key] || '';
        input.maxLength = 30000;
        const undo = document.createElement('button');
        undo.type = 'button';
        undo.className = 'cell-undo';
        undo.textContent = '撤销这一项';
        const update = () => {
            field.dataset.changed = String(Boolean(input.value.trim()));
            undo.disabled = !input.value;
        };
        update();
        input.addEventListener('input', () => {
            suggestions[key] = input.value;
            update();
            persist();
        });
        undo.onclick = () => {
            delete suggestions[key];
            input.value = '';
            update();
            persist();
        };
        field.append(input, undo);
    }
    addDetail(content, '准备与待确认', shot.cells[5].value, '📋');
    if (!drawer.open) drawer.showModal();
    else if (document.activeElement?.disabled) (previousShot.disabled ? nextShot : previousShot).focus();
    content.scrollTop = 0;
}

function originalSeconds(shot) {
    const match = B.readableCell(shot, 1, 0).match(/约\s+(\d+(?:\.\d+)?)\s+秒/);
    return match ? Number(match[1]) : null;
}

const targetLine = /^目标时长：([1-9]\d*) 秒$/m;

function targetSeconds(shot) {
    const match = (suggestions[shot.id + '|duration'] || '').match(targetLine);
    return match ? Number(match[1]) : originalSeconds(shot);
}

function updateTargetTotal() {
    let seconds = 0;
    let missing = 0;
    for (const shot of source.shots) {
        const target = targetSeconds(shot);
        if (target === null) missing++;
        else seconds += target;
        const row = rows.get(shot.id);
        if (row) row.duration.value = target ?? '';
    }
    $('target-total').textContent = '预期总时长 ' + seconds + ' s（' +
        (seconds / 60).toFixed(2) + ' min）' + (missing ? ' · ' + missing + ' 段待定' : '');
}

function render() {
    if (drawer.open) drawer.close();
    rows.clear();
    $('shot-list').replaceChildren();
    $('check-body').replaceChildren();
    source.shots.forEach((shot, index) => {
        const number = `第 ${index + 1} 段`;
        const row = document.createElement('tr');
        const identity = document.createElement('th');
        identity.scope = 'row';
        const title = document.createElement('strong');
        title.textContent = number;
        const badge = document.createElement('span');
        badge.className = 'row-count';
        identity.append(title, badge);
        const timing = document.createElement('td');
        timing.className = 'target-duration';
        const duration = document.createElement('input');
        duration.type = 'number';
        duration.min = '1';
        duration.step = '1';
        duration.setAttribute('aria-label', number + '目标时长（秒）');
        duration.addEventListener('change', () => {
            const seconds = duration.valueAsNumber;
            if (!Number.isSafeInteger(seconds) || seconds < 1) {
                duration.value = targetSeconds(shot) ?? '';
                return;
            }
            const key = shot.id + '|duration';
            const other = (suggestions[key] || '').replace(targetLine, '').trim();
            const target = seconds === originalSeconds(shot) ? '' : '目标时长：' + seconds + ' 秒';
            const proposal = [target, other].filter(Boolean).join('\n');
            if (proposal) suggestions[key] = proposal;
            else delete suggestions[key];
            persist();
        });
        timing.append(duration, ' s');
        const excerpt = document.createElement('td');
        excerpt.className = 'shot-excerpt';
        excerpt.textContent = shot.cells[1].value
            .replace(/^\s*c\d+\s*(?:｜(?:上屏主句|旁白（逐字）)[：:]|[：:])\s*/i, '')
            .split(/\n\s*(?:屏幕辅助标签|字幕T01|字幕|呈现)[：:]/, 1)[0].trim();
        const actions = document.createElement('td');
        const details = document.createElement('button');
        details.type = 'button';
        details.textContent = '查看详情';
        details.setAttribute('aria-label', `查看${number}详情`);
        details.onclick = () => showDetails(index);
        actions.append(details);
        row.append(identity, timing, excerpt, actions);
        $('check-body').append(row);
        rows.set(shot.id, {badge, duration});
        const jump = document.createElement('button');
        jump.type = 'button';
        jump.textContent = `${number} · ${B.excerpt(shot)}`;
        jump.onclick = () => showDetails(index);
        $('shot-list').append(jump);
    });
    summary();
}

function renderGlobalDescription(){const host=$('global-description-list');host.replaceChildren();const entries=source.globalDescription?.length?source.globalDescription:[{label:'这支视频讲什么',value:source.topic}];entries.forEach(item=>{const row=document.createElement('div'),term=document.createElement('dt'),description=document.createElement('dd');term.textContent=item.label;if(item.value.length>220){const preview=document.createElement('span'),detail=document.createElement('details'),title=document.createElement('summary'),full=document.createElement('p');preview.textContent=item.value.slice(0,220)+'…';title.textContent='展开完整说明';full.textContent=item.value;detail.append(title,full);description.append(preview,detail);}else description.textContent=item.value||'尚未说明';row.append(term,description);host.append(row);});}
$('global-comment').addEventListener('input',()=>{if(!source)return;suggestions['@global']=$('global-comment').value;persist();});
$('clear-global-comment').onclick=()=>{delete suggestions['@global'];$('global-comment').value='';persist();};

function download(data,name){const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('save-json').disabled=true;$('save-json').onclick=()=>{if(source)download(report(),'segment-review-return.json');};
$('return-script').onclick=()=>{try{if(window.__reviewInline&&window.parent!==window){window.parent.postMessage({type:'script-review-return',payload:report()},'*');return;}const target=B.safeReturn(source.returnUrl,location.href);target.hash='review-return='+B.encode(report());location.assign(target.href);}catch(error){status(error.message+' 可以在“更多”里下载修改记录，再回到脚本导入。');}};
$('import-script').onchange=async event=>{const file=event.target.files[0];if(!file)return;try{if(file.size>512000)throw Error('脚本文件较大，请分开导入。');load(JSON.parse(await file.text()));}catch(error){status(error.message);}event.target.value='';};
function fromHash(){try{if(location.hash.startsWith('#review-handoff='))load(B.decode(location.hash.slice('#review-handoff='.length)));}catch(error){status('未能载入：'+error.message);}}
window.addEventListener('message',event=>{if(!window.__reviewInline||event.source!==window.parent||event.data?.type!=='script-review-open')return;try{load(event.data.payload);}catch(error){status(error.message);}});
window.addEventListener('hashchange',fromHash);if(!window.__reviewInline)fromHash();
