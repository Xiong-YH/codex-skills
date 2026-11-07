// Three-way update: source defaults are a baseline, never a replacement for saved edits.
const clone = value => JSON.parse(JSON.stringify(value));
export const canonical = value => JSON.stringify(normalize(value));
const normalize = v => Array.isArray(v) ? v.map(normalize) : v && typeof v === 'object'
  ? Object.fromEntries(Object.keys(v).sort().filter(k => v[k] !== undefined).map(k => [k, normalize(v[k])])) : v;
const editable = clip => Object.fromEntries(Object.entries(clip).filter(([k]) => !['id','sourceKey'].includes(k)));
const globals = p => Object.fromEntries(['name','fps','width','height','background','themeId','themeColors'].map(k => [k,p[k]]));
const index = p => {
  const rows = new Map();
  for (const track of p.tracks) for (const clip of track.clips) if (clip.sourceKey) {
    const a = rows.get(clip.sourceKey) ?? [];
    a.push({track,clip}); rows.set(clip.sourceKey,a);
  }
  return rows;
};
const baselineUnit = row => ({role: row.track.role, hidden: !!row.track.hidden, clip: clone(editable(row.clip))});
export const attachSourceBaseline = p => {
  const units = {};
  for (const [key, rows] of index(p)) {
    if (rows.length !== 1) throw new Error('原片单元标识重复：' + key);
    units[key] = baselineUnit(rows[0]);
  }
  return {...p, sourceBase: {revision:p.source, globals:clone(globals(p)), units}};
};
export const planSourceUpdate = (project, incoming) => {
  const p = clone(project), base = project.sourceBase;
  if (!base?.units) return {project:p, applied:[], conflicts:['旧工程没有更新基线，请保留当前 JSON；可另行导入新版对照。']};
  if (['fps','width','height'].some(k => p[k] !== incoming[k]))
    return {project:p, applied:[], conflicts:['画幅或帧率不同，无法局部合并。请另存工程。']};
  const current = index(p), next = index(incoming), applied = [], conflicts = [];
  const baseline = clone(base);
  for (const key of new Set([...Object.keys(base.units), ...next.keys()])) {
    const old = base.units[key], rows = current.get(key) ?? [], latest = next.get(key) ?? [];
    const desired = latest.length === 1 ? baselineUnit(latest[0]) : undefined;
    if (canonical(old) === canonical(desired)) continue;
    if (rows.length > 1 || latest.length > 1 || (old && (rows.length !== 1 || canonical(baselineUnit(rows[0])) !== canonical(old)))) {
      conflicts.push(key + '：已手改、拆分、隐藏或删除，保留当前编辑'); continue;
    }
    if (!old && rows.length) {conflicts.push(key + '：单元标识冲突'); continue;}
    if (old && rows.length) {
      const row = rows[0], at = row.track.clips.indexOf(row.clip);
      if (desired) row.track.clips[at] = {...clone(latest[0].clip), id:row.clip.id};
      else row.track.clips.splice(at,1);
    } else if (desired) {
      if(p.tracks.some(t=>t.clips.some(c=>c.id===latest[0].clip.id))){conflicts.push(key+'：新片段 ID 与当前剪辑冲突');continue;}
      let track = p.tracks.find(t => t.role === latest[0].track.role && !t.hidden);
      if (!track) {
        track = {...clone(latest[0].track), clips:[]};
        const rank=incoming.tracks.indexOf(latest[0].track);
        const following=new Set(incoming.tracks.slice(rank+1).map(t=>t.role));
        const at=p.tracks.findIndex(t=>following.has(t.role));
        p.tracks.splice(at<0?p.tracks.length:at,0,track);
      }
      track.clips.push(clone(latest[0].clip));
    }
    if (desired) baseline.units[key] = desired; else delete baseline.units[key];
    applied.push(key);
  }
  for (const [key,value] of Object.entries(globals(incoming))) {
    if (canonical(base.globals?.[key]) === canonical(value)) continue;
    if (canonical(p[key]) !== canonical(base.globals?.[key])) {conflicts.push(key + '：全局设置已手改');continue;}
    if (value === undefined) delete p[key]; else p[key] = value;
    baseline.globals[key] = value;
    applied.push(key);
  }
  p.sourceBase = baseline;
  if (!conflicts.length) {
    if(p.source!==incoming.source)applied.push('source-version');
    p.source = incoming.source;p.sourceBase.revision = incoming.source;
  }
  return {project:p, applied, conflicts};
};

/** Timing-only inspection of the actual edit branch; no visual or audio approval. */
export const inspectEdit = p => {
  const issues = [];
  const tracks = p.tracks.filter(t => !t.hidden);
  const shots = tracks.filter(t => t.role === 'shot').flatMap(t => t.clips).sort((a,b) => a.start-b.start);
  for (let i=0;i<shots.length;i++) {
    const s=shots[i], end=s.start+s.duration;
    if (i && s.start > shots[i-1].start+shots[i-1].duration)
      issues.push({kind:'gap',clipId:s.id,message:`镜头之间空档 ${((s.start-shots[i-1].start-shots[i-1].duration)/p.fps).toFixed(2)} 秒`});
    const evidence=tracks.filter(t=>['caption','title','narration'].includes(t.role)).flatMap(t=>t.clips)
      .filter(c=>c.start<end&&c.start+c.duration>s.start);
    if (evidence.length) {
      const last=Math.max(...evidence.map(c=>c.start+c.duration));
      if(end-last>p.fps)issues.push({kind:'tail',clipId:s.id,message:`讲述/文字区间后仍停留 ${((end-last)/p.fps).toFixed(2)} 秒，请核对动作、阅读或接镜用途`});
    }
  }
  return issues;
};
