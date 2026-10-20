import React, {useLayoutEffect, useRef, useState} from 'react';
import {cancelRender, continueRender, delayRender, useVideoConfig} from 'remotion';
import type {Cue, Payload, Shot} from './types';

type CueTextProps = {payload: Payload; cue: Cue; color?: string; fontSize?: number};
export const CueText: React.FC<CueTextProps> = ({payload, cue, color, fontSize}) => {
  const {height} = useVideoConfig();
  const {style} = payload;
  const node = useRef<HTMLDivElement>(null);
  const text = useRef<HTMLSpanElement>(null);
  const [handle] = useState(() => delayRender(`Checking text layout: ${cue.id}`));
  const subtitle = cue.role === 'subtitle';
  const x = cue.x ?? 0.5;
  const defaults: Record<string, number> = {title: 0.105, subtitle: 0.87, annotation: 0.22, label: 0.68};
  const y = cue.y ?? defaults[cue.role] ?? 0.5;
  const safeX = style.safeArea?.x ?? 0.05;
  const width = Math.min(0.86, 2 * Math.min(x - safeX, 1 - safeX - x));
  const size = fontSize ?? height * (style.textRoles?.[cue.role] ?? 0.03);
  useLayoutEffect(() => {
    let live = true;
    document.fonts.ready.then(() => {
      if (!live || !node.current || !text.current) return;
      const box = node.current;
      const content = text.current;
      const lineHeight = Number.parseFloat(getComputedStyle(content).lineHeight);
      const lines = Math.ceil((content.scrollHeight - 0.5) / lineHeight);
      const textHeight = size + Math.max(0, lines - 1) * lineHeight;
      const top = y * height - textHeight / 2;
      const bottom = y * height + textHeight / 2;
      const safeTop = height * (style.safeArea?.top ?? 0.06);
      const safeBottom = height * (1 - (style.safeArea?.bottom ?? 0.07));
      if (box.clientWidth < size || content.scrollWidth > content.clientWidth + 1 || top < safeTop || bottom > safeBottom) {
        cancelRender(new Error(`Text ${cue.id} exceeds the safe area: shorten it, split the cue, or adjust x/y.`));
        return;
      }
      if (subtitle && lines > 2) {
        cancelRender(new Error(`Subtitle ${cue.id} wraps to ${lines} lines; shorten it or split it into cues (maximum 2 lines).`));
        return;
      }
      continueRender(handle);
    }).catch((error: Error) => {if (live) cancelRender(error);});
    return () => {live = false; continueRender(handle);};
  }, [cue.id, cue.text, handle, height, size, style.safeArea, subtitle, x, y]);
  if (width <= 0) throw new Error(`Text ${cue.id} exceeds the safe area: shorten it, split the cue, or adjust x/y.`);
  return <div ref={node} data-cue={cue.id} style={{position: 'absolute', left: `${x * 100}%`, top: `${y * 100}%`, width: `${width * 100}%`, transform: 'translate(-50%, -50%)', color: color ?? (cue.accent ? style.colors.accent ?? '#7ed5c8' : style.colors.ink ?? '#f5ebd4'), fontWeight: cue.role === 'title' ? 700 : 600, fontSize: size, lineHeight: 1.38, textAlign: 'center', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', textShadow: '0 3px 0 #08121b', padding: subtitle ? `${height * 0.018}px ${height * 0.026}px` : 0, minHeight: subtitle ? height * (style.subtitle?.height ?? 0.115) : undefined, display: 'flex', alignItems: 'center', boxSizing: 'border-box'}}>
    {subtitle ? <div style={{position: 'absolute', inset: 0, background: style.subtitle?.background ?? '#101720', opacity: style.subtitle?.opacity ?? 0.86, boxShadow: '0 5px 0 #07121c'}}/> : null}
    <span ref={text} style={{display: 'block', position: 'relative', width: '100%'}}>{cue.text}</span>
  </div>;
};

/** The heading belongs to the room, so a physical transition must cover it. */
export const SceneHeading: React.FC<{payload: Payload; frame: number; shot: Shot}> = ({payload, frame, shot}) => {
  if (payload.resolved.cues.some((cue) => cue.role === 'title' && frame >= cue.startFrame && frame < cue.endFrame)) return null;
  return <div style={{position: 'absolute', inset: 0, fontFamily: payload.style.fontFamily ?? 'sans-serif'}}>
    <CueText key={`${shot.id}.heading`} payload={payload} color={payload.style.colors.gold ?? '#eac47c'} cue={{id: `${shot.id}.heading`, role: 'title', text: shot.params.heading, startFrame: shot.startFrame, endFrame: shot.endFrame}}/>
  </div>;
};

/** Copy and every visibility interval remain owned by the compiled text cues. */
export const TextOverlay: React.FC<{payload: Payload; frame: number}> = ({payload, frame}) => {
  const {style} = payload;
  const active = payload.resolved.cues.filter((cue) => frame >= cue.startFrame && frame < cue.endFrame);
  return <div style={{position: 'absolute', inset: 0, fontFamily: style.fontFamily ?? 'sans-serif', pointerEvents: 'none'}}>
    {active.map((cue) => <CueText key={cue.id} payload={payload} cue={cue}/>)}
  </div>;
};
