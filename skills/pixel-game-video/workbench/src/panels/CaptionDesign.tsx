import React from 'react';
import {useStore} from '../store';
import {applySoftCaptionDesign, visibleCaptions} from '../captionDesign.js';
import type {ProjectData} from '../types';

export const CaptionDesign: React.FC = () => {
  const project=useStore(s=>s.project);
  if (!visibleCaptions(project).length) return null;
  const change=(value:string) => {
    if (!value) return;
    try {
      const next=value==='soft-highlight' ? applySoftCaptionDesign(project) : {...project,captionDesign:{mode:'custom' as const,reason:project.captionDesign?.reason ?? ''}};
      useStore.getState().commit();useStore.setState({project:next as ProjectData});
    } catch(error) {window.alert(error instanceof Error ? error.message : String(error));}
  };
  return <span style={{display:'inline-flex',alignItems:'center',gap:6}}>
    <select className="btn" aria-label="字幕方案" value={project.captionDesign?.mode ?? ''} onChange={e=>change(e.target.value)}>
      <option value="">字幕方案：请选择</option><option value="soft-highlight">字幕：柔边重音</option><option value="custom">字幕：保留本片设计</option>
    </select>
    {project.captionDesign?.mode==='custom' && <input aria-label="字幕选用原因" placeholder="本片选用原因" value={project.captionDesign.reason ?? ''} onFocus={()=>useStore.getState().commit()} onChange={e=>useStore.setState({project:{...project,captionDesign:{mode:'custom',reason:e.target.value}}})} style={{width:160}}/>}
  </span>;
};
