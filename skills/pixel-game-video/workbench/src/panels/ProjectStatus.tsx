import React, {useEffect, useMemo, useState} from 'react';
import {useStore, flushSave} from '../store';
import {MANIFEST} from '../cards/projectCards';
import {manifestKey} from '../cards/manifest';
import {buildProjectFromManifest} from '../projectImport';
import {planSourceUpdate, inspectEdit} from '../sourceSync.js';

export const ProjectStatus: React.FC = () => {
  const project = useStore(s=>s.project);
  const [source,setSource]=useState<any>(null);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const [preview,setPreview]=useState<ReturnType<typeof planSourceUpdate>|null>(null);
  const [basis,setBasis]=useState('');
  const issues=useMemo(()=>inspectEdit(project),[project]);
  const refresh=async()=>{try{const r=await fetch('/api/project-state');const data=await r.json();if(!r.ok)throw new Error(data.error);setSource(data);setError('');}catch(e){setSource(null);setError(e instanceof Error?e.message:String(e));}};
  useEffect(()=>{void refresh();},[]);
  const outdated=!!MANIFEST&&project.source!==manifestKey(MANIFEST);
  return <details style={{padding:'6px 14px',borderBottom:'1px solid #39404a',fontSize:13}}>
    <summary>版本与检查 · {error?'源版本未确认':source?.preview==='rebuild_required'?'源文件已变，需重建':outdated?'新版源数据待合并':'当前剪辑可预览'} · 视听待审 {issues.length?`· ${issues.length} 项时间疑点`:''}</summary>
    <p>预览可播放、自动检查、视听审片和 MP4 导出分别记录；本面板不自动批准成片。</p>
    <button className="btn" onClick={()=>void refresh()}>检查源文件变化</button>
    {error&&<span role="status"> {error}</span>}
    {source&&<><p>对比上次成功构建：{source.changed?.length??0} 镜变化，{source.unchanged?.length??0} 镜未变；需复查 {source.reviewShots?.join('、')||'无新增影响'}。</p>
      <ul>{source.changed?.map((c:any)=><li key={c.shotId}>{c.shotId}：{c.reasons.map((r:string)=>({new:'新增镜头',visual:'画面/动作',text:'文字',audio:'声音',dependencies:'执行代码或依赖',project:'全片设置',media:'素材',startFrame:'起点',endFrame:'结束点'} as Record<string,string>)[r]??r).join('、')}</li>)}</ul>
      <p>组件使用范围：</p><ul>{Object.entries(source.components??{}).map(([id,v]:[string,any])=><li key={id}>{id} → {v.shots.join('、')} · 版本 {v.implementationHash.slice(0,8)}</li>)}</ul>
      <ul>{source.preflight?.issues?.map((i:any,n:number)=><li key={n}>{i.shotId}：{i.message}</li>)}</ul></>}
    <ul>{issues.map((i:any,n:number)=><li key={n}><button className="btn" onClick={()=>useStore.getState().select(i.clipId)}>定位</button> {i.message}</li>)}</ul>
    {outdated&&<button className="btn" onClick={()=>{const result=planSourceUpdate(project,buildProjectFromManifest(MANIFEST!));setPreview(result);setBasis(JSON.stringify(project));setMessage('');}}>预览局部更新</button>}
    {preview&&<div><p>可更新 {preview.applied.length} 项；冲突 {preview.conflicts.length} 项。冲突保留手工编辑，应用可撤销。请先保存工程 JSON；组件代码变化后，旧 JSON 不包含旧执行器。</p>
      <ul>{preview.applied.map((s:string)=><li key={s}>更新 {s}</li>)}{preview.conflicts.map((s:string)=><li key={s}>保留 {s}</li>)}</ul>
      <button className="btn" disabled={!preview.applied.length} onClick={()=>{if(JSON.stringify(useStore.getState().project)!==basis){setMessage('剪辑已变化，请重新预览更新');setPreview(null);return;}useStore.getState().setProject(preview.project);flushSave();setPreview(null);setMessage('局部更新已应用；请复查相关镜头。');}}>应用无冲突更新</button></div>}
    {message&&<p role="status">{message}</p>}
  </details>;
};
