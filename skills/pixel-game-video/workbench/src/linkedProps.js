// Pixel Game Video: transitions reference the current edited shots; text remains a separate lane.
export const isLinkedTextKey = key => key === 'heading' || /^title\w*$/.test(key) || /^label\w*$/.test(key);
const findSource = (project, clip, key) => {
  const sourceId = clip.props?.[key];
  if (typeof sourceId !== 'string') return null;
  // Hidden references supply scene state to single-track transition exports without rendering.
  const matches = project.tracks.flatMap(track => track.clips)
    .filter(candidate => candidate.props?.sourceUnitId === sourceId && candidate.id !== clip.id)
    .sort((a, b) => a.start - b.start);
  return [...matches].reverse().find(candidate => candidate.start <= clip.start) ?? matches[0] ?? null;
};
/** If a shot is duplicated, choose the latest instance before this transition, or the first future one. */
export const findLinkedSourceClip = (project, clip) => findSource(project, clip, 'outgoingShotId');
export const isTitleClip = clip => clip.cardId.startsWith('proj:title:') || clip.props?.role === 'title';
export const titleActiveAt = (project, frame) => project.tracks.some(track => !track.hidden &&
  track.clips.some(clip => isTitleClip(clip) && clip.start <= frame && frame < clip.start + clip.duration));
const sourceFrameAt = (source, frame, cards) => {
  const raw = source.inOffset + (frame - source.start) * source.speed;
  const length = source.sourceDurationInFrames ?? cards?.[source.cardId]?.durationInFrames;
  return Math.max(0, Number.isFinite(length) ? Math.min(length - 1, raw) : raw);
};
const transformOf = clip => ({x: clip.x, y: clip.y, scale: clip.scale, opacity: clip.opacity});
/** Resolve both edited scene ends and source time. The Inspector omits frame; renders pass the
 * absolute frame so moving/trimming a shot and moving/hiding a title affect exports immediately. */
export const resolveLinkedProps = (project, clip, options = {}) => {
  const props = clip.props ?? {};
  const source = findLinkedSourceClip(project, clip);
  const incoming = findSource(project, clip, 'incomingShotId');
  const frame = options.frame;
  const hasFrame = typeof frame === 'number';
  const hideHeading = hasFrame ? titleActiveAt(project, frame) : undefined;
  const currentText = source ? Object.fromEntries(Object.entries(source.props).filter(([key, value]) =>
    isLinkedTextKey(key) && ['string', 'number', 'boolean'].includes(typeof value),
  )) : {};
  const resolved = {...props, ...currentText};
  if (hasFrame) resolved.hideHeading = hideHeading;
  for (const [side, linked] of [['outgoing', source], ['incoming', incoming]]) {
    if (!linked) continue;
    resolved[`${side}Props`] = {...linked.props, ...(hasFrame ? {hideHeading} : {})};
    resolved[`${side}Transform`] = transformOf(linked);
    if (hasFrame) resolved[`${side}SourceFrame`] = sourceFrameAt(linked, frame, options.cards);
  }
  return resolved;
};
