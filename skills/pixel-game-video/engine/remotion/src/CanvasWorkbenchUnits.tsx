import React, {useEffect, useMemo, useRef} from 'react';
import {cancelRender, continueRender, delayRender, useCurrentFrame} from 'remotion';
import {PIXEL_CANVAS_RUNTIME} from './canvas-runtime';
import {WORKBENCH_PAYLOAD} from './workbench-payload';

// The Canvas contract is intentionally broader than the native desk contract.
// Each selected runtime module validates/uses its own structured scene fields.
type Data = Record<string, any>;
type CanvasPayload = {resolved: Data; assets: Record<string, string>; style: Data; mouth?: Data[]};
type ClipTransform = {x?: number; y?: number; scale?: number; opacity?: number};
export type CanvasShotProps = {
  shotIndex?: number; sourceUnitId?: string; actor?: string | null;
  paramsJson?: string; objectsJson?: string; componentsJson?: string;
  backgroundJson?: string; replacementJson?: string; performanceJson?: string; cameraJson?: string;
  paramsJSON?: string; objectsJSON?: string; componentsJSON?: string;
  backgroundJSON?: string; replacementJSON?: string; performanceJSON?: string; cameraJSON?: string;
  hideHeading?: boolean;
};
export type CanvasTransitionProps = {
  shotIndex?: number; motionIndex?: number; paramsJson?: string; paramsJSON?: string;
  outgoingShotId?: string; incomingShotId?: string;
  outgoingProps?: CanvasShotProps; incomingProps?: CanvasShotProps;
  outgoingSourceFrame?: number; incomingSourceFrame?: number;
  outgoingTransform?: ClipTransform; incomingTransform?: ClipTransform;
};
type CaptionProps = {cueIndex?: number; text?: string; fontSize?: number; color?: string; x?: number; y?: number; role?: string};
const data = (): CanvasPayload => {
  if (!WORKBENCH_PAYLOAD || !PIXEL_CANVAS_RUNTIME) throw new Error('Canvas units require a generated Canvas workbench build.');
  return WORKBENCH_PAYLOAD as unknown as CanvasPayload;
};
const json = (value: string | undefined, fallback: any, field: string): any => {
  if (value === undefined || value.trim() === '') return fallback;
  try {return JSON.parse(value);} catch {throw new Error(`Invalid editable ${field} JSON.`);}
};
const transitionRecipes = new Set(['motion.panel-slide.v1', 'motion.pixel-iris.v1', 'motion.focus-punch.v1',
  'motion.mosaic-pullback.v1', 'motion.book-sweep.v1', 'motion.shelf-travel.v1', 'motion.scene-to-card.v1',
  'motion.match-dissolve.v1', 'motion.shatter-reveal.v1']);
const editedShot = (shot: Data, props: CanvasShotProps, payload: CanvasPayload): Data => {
  const value: Data = {...shot};
  for (const field of ['params', 'objects', 'components', 'background', 'replacement', 'performance']) {
    const source = props as Data;
    value[field] = json(source[`${field}Json`] ?? source[`${field}JSON`], shot[field], field);
  }
  if (props.actor !== undefined) value.actor = props.actor || null;
  if (value.actor && !payload.assets[`${value.actor}:reference`]) throw new Error(`Character '${value.actor}' is outside this compiled project's assets; edit the source project and rebuild.`);
  for (const action of value.performance ?? []) if (value.actor && !payload.assets[`${value.actor}:pose:${action.pose}`])
    throw new Error(`Character pose '${value.actor}/${action.pose}' is outside this compiled project's assets; rebuild with that pose.`);
  for (const field of ['background', 'replacement']) {
    const source = value[field];if (!source) continue;
    const mediaEntries = Object.entries(payload.resolved.media ?? {});
    const entry = mediaEntries.find(([key, raw]) => key === source.assetKey && (raw as Data).file === source.file) ??
      mediaEntries.find(([, raw]) => (raw as Data).file === source.file && ((raw as Data).kind !== 'video' || (raw as Data).shotStartFrame === shot.startFrame));
    if (!entry) throw new Error(`Media '${source.file}' is outside this compiled project's assets; add it to the source project and rebuild.`);
    const [key, raw] = entry, record = raw as Data;
    if (record.kind === 'video' && record.shotStartFrame !== shot.startFrame)
      throw new Error('Moving a compiled video source between shots requires rebuilding that shot in the source project.');
    if (record.kind === 'video') {
      const trim = source.trimStartSeconds ?? 0;
      if (!Number.isFinite(trim) || trim < 0 || trim >= record.durationSeconds) throw new Error('Editable video trim starts outside the compiled source.');
      if (source.shortage !== 'hold' && trim + shot.durationFrames / payload.resolved.project.fps > record.durationSeconds + 1 / payload.resolved.project.fps)
        throw new Error('Edited video trim is shorter than this shot; use shortage="hold" or rebuild with a longer source.');
    }
    value[field] = {...source, assetKey: key, kind: record.kind};
  }
  const imageData = (item: Data): Data => {
    if (!item.image) return item;
    const entry = Object.entries(payload.resolved.media ?? {}).find(([, raw]) => (raw as Data).file === item.image && (raw as Data).kind === 'image');
    if (!entry) throw new Error(`Component image '${item.image}' is outside this compiled project's assets; rebuild with that image.`);
    return {...item, imageKey: entry[0]};
  };
  value.components = (value.components ?? []).map((component: Data) => ({...component, data: {...imageData(component.data),
    ...(component.data.items ? {items: component.data.items.map(imageData)} : {})}}));
  const camera = props.cameraJson ?? props.cameraJSON;
  if (camera !== undefined && camera.trim() !== '') {
    const motions = json(camera, [], 'camera');
    if (!Array.isArray(motions)) throw new Error('Editable camera JSON must be an array of camera motions.');
    value.motions = [...shot.motions.filter((motion: Data) => transitionRecipes.has(motion.recipe)), ...motions];
  }
  return value;
};
const editableResolved = (payload: CanvasPayload, shots: Data[]): Data => {
  const media = {...payload.resolved.media};
  for (const shot of shots) for (const field of ['background', 'replacement']) {
    const source = shot[field];if (!source || !media[source.assetKey]) continue;
    media[source.assetKey] = {...media[source.assetKey], ...source};
  }
  return {...payload.resolved, shots, media};
};
const sourceFrame = (shot: Data, local: number): number => shot.startFrame + Math.max(0, Math.min(shot.durationFrames - 1, Math.floor(local + 1e-6)));
const indexFor = (resolved: Data, id: string | undefined, fallback: number): number => {
  const index = id ? resolved.shots.findIndex((shot: Data) => shot.id === id) : fallback;
  if (!resolved.shots[index]) throw new Error(`Missing Canvas workbench shot ${id ?? fallback}.`);
  return index;
};

// Images can share decoded pixels. Videos belong to each mounted renderer so a
// seek in one independently trimmed clip never changes another clip's source.
const imageCache = new Map<string, Promise<HTMLImageElement>>();
const imageAsset = (src: string, key: string): Promise<HTMLImageElement> => {
  const existing = imageCache.get(src);if (existing) return existing;
  const pending = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Canvas image could not load: ${key}`));image.src = src;
  });
  imageCache.set(src, pending);pending.catch(() => imageCache.delete(src));return pending;
};
const videoAsset = (src: string, key: string): Promise<HTMLVideoElement> => new Promise((resolve, reject) => {
  const video = document.createElement('video');video.preload = 'auto';video.muted = true;video.playsInline = true;
  const timeout = window.setTimeout(() => {clean();reject(new Error(`Canvas video load timeout: ${key}`));}, 30000);
  const clean = () => {clearTimeout(timeout);video.onloadeddata = null;video.onerror = null;};
  video.onloadeddata = () => {clean();resolve(video);};
  video.onerror = () => {clean();reject(new Error(`Canvas video could not load: ${key}`));};
  video.src = src;video.load();
});
const loadAssets = async (payload: CanvasPayload): Promise<Record<string, CanvasImageSource>> => {
  const values = await Promise.all(Object.entries(payload.assets).map(async ([key, src]) => [key,
    await (payload.resolved.media?.[key]?.kind === 'video' ? videoAsset(src, key) : imageAsset(src, key))] as const));
  await document.fonts.ready;return Object.fromEntries(values);
};
const seekVideo = async (video: HTMLVideoElement, target: number, key: string): Promise<void> => {
  if (video.readyState >= 2 && Math.abs(video.currentTime - target) < 0.00001) return;
  await new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {clean();reject(new Error(`Canvas video seek timeout: ${key}`));}, 15000);
    const clean = () => {clearTimeout(timeout);video.removeEventListener('seeked', done);video.removeEventListener('error', fail);};
    const done = () => {clean();resolve();};
    const fail = () => {clean();reject(new Error(`Canvas video seek failed: ${key}`));};
    video.addEventListener('seeked', done);video.addEventListener('error', fail);video.currentTime = Math.max(0, target);
  });
};
const prepareVideos = async (resolved: Data, assets: Record<string, CanvasImageSource>, frame: number, frames: Record<string, number>, cache: Map<string, HTMLCanvasElement>): Promise<void> => {
  const {fps} = resolved.project;
  await Promise.all(Object.entries(resolved.media ?? {}).map(async ([key, raw]) => {
    const item = raw as Data;if (item.kind !== 'video') return;
    const selectedFrame = Math.max(item.shotStartFrame, Math.min(item.shotEndFrame - 1, frames[String(item.shotStartFrame)] ?? frame));
    const fixed = [item.shotEndFrame - 1, item.shotStartFrame + Math.floor((item.shotEndFrame - item.shotStartFrame) * .72)];
    const desired = [...new Set([...fixed, selectedFrame])];
    for (const existing of cache.keys()) if (existing.startsWith(`${key}:`) && !desired.some((at) => existing === `${key}:${at}`)) cache.delete(existing);
    for (const at of desired) {
      if (cache.has(`${key}:${at}`)) continue;
      const local = (at - item.shotStartFrame) / fps;
      const target = Math.min(item.durationSeconds - 1 / item.sourceFps, (item.trimStartSeconds || 0) + local);
      const video = assets[key] as HTMLVideoElement;await seekVideo(video, target, key);
      const frozen = document.createElement('canvas');frozen.width = video.videoWidth;frozen.height = video.videoHeight;
      const context = frozen.getContext('2d');if (!context) throw new Error('Cannot capture a deterministic video source frame.');
      context.drawImage(video, 0, 0);cache.set(`${key}:${at}`, frozen);
    }
  }));
};

type Draw = {resolved: Data; frame: number; videoFrames?: Record<string, number>; skipMedia?: boolean; draw: (renderer: any) => void};
const CanvasLayer: React.FC<{payload: CanvasPayload; request: Draw; identity: string}> = ({payload, request, identity}) => {
  const canvas = useRef<HTMLCanvasElement>(null);
  const assetState = useRef<{payload: CanvasPayload; pending: Promise<Record<string, CanvasImageSource>>} | null>(null);
  const rendererState = useRef<{resolved: Data; canvas: HTMLCanvasElement; value: any} | null>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const videoCache = useRef(new Map<string, HTMLCanvasElement>());
  const mediaSignature = useRef('');
  // Every changed frame/prop holds Remotion's screenshot until both the exact
  // video source frame and the synchronous Canvas drawing have completed.
  const handle = useMemo(() => delayRender(`Canvas workbench ${identity}`), [identity]);
  useEffect(() => {
    let cancelled = false, released = false;
    const release = () => {if (!released) {released = true;continueRender(handle);}};
    if (!assetState.current || assetState.current.payload !== payload) assetState.current = {payload,
      pending: request.skipMedia ? document.fonts.ready.then(() => ({})) : loadAssets(payload)};
    const pending = assetState.current.pending;
    queue.current = queue.current.catch(() => {}).then(async () => {
      const assets = await pending;if (cancelled || !canvas.current) return;
      const signature = JSON.stringify(request.resolved.media);
      if (mediaSignature.current !== signature) {videoCache.current.clear();mediaSignature.current = signature;}
      if (!request.skipMedia) await prepareVideos(request.resolved, assets, request.frame, request.videoFrames ?? {}, videoCache.current);
      if (cancelled || !canvas.current) return;
      if (!rendererState.current || rendererState.current.resolved !== request.resolved || rendererState.current.canvas !== canvas.current) {
        const createCanvas = (width: number, height: number) => {const target = document.createElement('canvas');target.width = width;target.height = height;return target;};
        rendererState.current = {resolved: request.resolved, canvas: canvas.current, value: PIXEL_CANVAS_RUNTIME.createRenderer({
          canvas: canvas.current, createCanvas, assets, resolved: request.resolved, mouth: payload.mouth ?? [], style: payload.style,
          frameAssets: (key: string, at: number) => {
            const item = request.resolved.media?.[key];if (item?.kind !== 'video') return undefined;
            const bounded = Math.max(item.shotStartFrame, Math.min(item.shotEndFrame - 1, at));
            const value = videoCache.current.get(`${key}:${bounded}`);
            if (!value) throw new Error(`Missing deterministic video frame ${key}:${bounded}.`);
            return value;
          },
        })};
      }
      request.draw(rendererState.current.value);
    }).then(release).catch((error: unknown) => {release();if (!cancelled) cancelRender(error instanceof Error ? error : new Error(String(error)));});
    return () => {cancelled = true;release();};
  }, [handle, payload, request]);
  const {width, height} = payload.resolved.project;
  // The standalone player declares zh-CN. Make that language explicit on each
  // output canvas too; otherwise Chromium chooses different CJK fallback glyphs
  // inside the English workbench/Remotion document. Scratch canvases stay as in
  // the original runtime and are intentionally not assigned a new language.
  return <canvas ref={canvas} lang="zh-CN" width={width} height={height} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none'}}/>;
};

/** Pure scene pixels retain local effects, camera, components and performances;
 * text overlays and transition recipes are owned by their own editable clips. */
export const CanvasShotUnit: React.FC<CanvasShotProps> = (props) => {
  const payload = data(), local = useCurrentFrame(), signature = JSON.stringify(props);
  const resolved = useMemo(() => {
    const index = indexFor(payload.resolved, props.sourceUnitId, props.shotIndex ?? 0);
    return editableResolved(payload, payload.resolved.shots.map((shot: Data, at: number) => at === index ? editedShot(shot, props, payload) : shot));
  }, [payload, signature]);
  const index = indexFor(resolved, props.sourceUnitId, props.shotIndex ?? 0), frame = sourceFrame(resolved.shots[index], local);
  const request = useMemo(() => ({resolved, frame, draw: (renderer: any) => renderer.drawShot(frame, index)}), [resolved, frame, index]);
  return <CanvasLayer payload={payload} request={request} identity={`shot:${signature}:${frame}`}/>;
};

/** The transition owns its original recipe and reads the current editable
 * props/source clocks of both adjacent shot clips, including trims and speed. */
export const CanvasTransitionUnit: React.FC<CanvasTransitionProps> = (props) => {
  const payload = data(), local = useCurrentFrame(), signature = JSON.stringify(props);
  const resolved = useMemo(() => {
    const incomingIndex = indexFor(payload.resolved, props.incomingShotId, props.shotIndex ?? 1);
    const outgoingIndex = indexFor(payload.resolved, props.outgoingShotId, incomingIndex - 1);
    // Runtime transition sources are adjacent; moving clips does not require
    // rewriting the source timeline. Reorder only this private rendering view.
    const shots = payload.resolved.shots.map((shot: Data, at: number) => at === incomingIndex ? editedShot(shot, props.incomingProps ?? {}, payload) :
      at === outgoingIndex ? editedShot(shot, props.outgoingProps ?? {}, payload) : shot);
    if (outgoingIndex !== incomingIndex - 1) shots.splice(incomingIndex - 1, 1, shots[outgoingIndex]);
    return editableResolved(payload, shots);
  }, [payload, signature]);
  const index = indexFor(resolved, props.incomingShotId, props.shotIndex ?? 1), shot = resolved.shots[index], previous = resolved.shots[index - 1];
  const originalIndex = indexFor(payload.resolved, props.incomingShotId, props.shotIndex ?? 1);
  const source = payload.resolved.shots[originalIndex].motions[props.motionIndex ?? 0];if (!source) throw new Error('Missing Canvas transition motion.');
  const motion = {...source, params: json(props.paramsJson ?? props.paramsJSON, source.params, 'transition params')};
  const frame = source.startFrame + Math.max(0, Math.floor(local + 1e-6));
  const incomingFrame = props.incomingSourceFrame === undefined ? Math.max(shot.startFrame, Math.min(shot.endFrame - 1, frame)) : sourceFrame(shot, props.incomingSourceFrame);
  const outgoingFrame = props.outgoingSourceFrame === undefined ? undefined : sourceFrame(previous, props.outgoingSourceFrame);
  const request = useMemo(() => ({resolved, frame, videoFrames: {[shot.startFrame]: incomingFrame, [previous.startFrame]: outgoingFrame ?? previous.endFrame - 1},
    draw: (renderer: any) => renderer.drawTransition(frame, index, motion, {incomingFrame, outgoingFrame,
      outgoingTransform: props.outgoingTransform, incomingTransform: props.incomingTransform})}), [resolved, frame, signature]);
  return <CanvasLayer payload={payload} request={request} identity={`transition:${signature}:${frame}`}/>;
};

export const CanvasCaptionUnit: React.FC<CaptionProps> = (props) => {
  const payload = data(), signature = JSON.stringify(props), cue = payload.resolved.cues[props.cueIndex ?? 0];
  if (!cue) throw new Error('Missing Canvas caption cue.');
  const request = useMemo(() => ({resolved: payload.resolved, frame: cue.startFrame, skipMedia: true, draw: (renderer: any) => {
    const overrides = Object.fromEntries(Object.entries(props).filter(([key, value]) => key !== 'cueIndex' && value !== undefined));
    renderer.drawCaption(cue, overrides);
  }}), [payload, signature]);
  return <CanvasLayer payload={payload} request={request} identity={`caption:${signature}`}/>;
};

export const CanvasProgressUnit: React.FC<{progressJson?: string; progressJSON?: string}> = (props) => {
  const payload = data(), local = useCurrentFrame(), signature = JSON.stringify(props);
  const request = useMemo(() => ({resolved: payload.resolved, frame: local, skipMedia: true,
    draw: (renderer: any) => renderer.drawProgress(local, json(props.progressJson ?? props.progressJSON, payload.resolved.progress, 'progress'))}), [payload, local, signature]);
  return <CanvasLayer payload={payload} request={request} identity={`progress:${signature}:${local}`}/>;
};

/** The intact original uses the identical selected runtime, asset decoding and
 * deterministic video seeking as the separated units for parity comparisons. */
export const CanvasOriginal: React.FC<{payload?: CanvasPayload | null}> = ({payload: provided}) => {
  const payload = provided ?? data(), frame = useCurrentFrame();
  const request = useMemo(() => ({resolved: payload.resolved, frame,
    draw: (renderer: any) => renderer.draw(frame / payload.resolved.project.fps)}), [payload, frame]);
  return <CanvasLayer payload={payload} request={request} identity={`original:${frame}`}/>;
};
