// Pixel Game Video: transitions reference the current edited shots; text remains a separate lane.
export const isLinkedTextKey = key => key === 'heading' || /^title\w*$/.test(key) || /^label\w*$/.test(key);
const findSource = (project, clip, key, context) => {
  const sourceId = clip.props?.[key];
  if (typeof sourceId !== 'string') return null;
  // Hidden references supply scene state to single-track transition exports without rendering.
  const candidates = context ? context.sources.get(sourceId) ?? [] : project.tracks.flatMap(track => track.clips)
    .filter(candidate => candidate.props?.sourceUnitId === sourceId)
    .sort((a, b) => a.start - b.start);
  const matches = candidates.filter(candidate => candidate.id !== clip.id);
  return [...matches].reverse().find(candidate => candidate.start <= clip.start) ?? matches[0] ?? null;
};
/** If a shot is duplicated, choose the latest instance before this transition, or the first future one. */
export const findLinkedSourceClip = (project, clip) => findSource(project, clip, 'outgoingShotId');
export const isTitleClip = clip => clip.cardId.startsWith('proj:title:') || clip.props?.role === 'title';
export const titleActiveAt = (project, frame) => project.tracks.some(track => !track.hidden &&
  track.clips.some(clip => isTitleClip(clip) && clip.start <= frame && frame < clip.start + clip.duration));
export const createLinkedPropsResolver = project => {
  const sources = new Map(), links = new Map(), titles = [];
  for (const track of project.tracks) for (const clip of track.clips) {
    const sourceId = clip.props?.sourceUnitId;
    if (typeof sourceId === 'string') {
      if (!sources.has(sourceId)) sources.set(sourceId, []);
      sources.get(sourceId).push(clip);
    }
    if (!track.hidden && isTitleClip(clip)) titles.push(clip);
  }
  for (const candidates of sources.values()) candidates.sort((first, second) => first.start - second.start);
  const context = {sources, links, titleFrame: undefined, hideHeading: false, titles};
  for (const track of project.tracks) for (const clip of track.clips) links.set(clip, {
    source: findSource(project, clip, 'outgoingShotId', context),
    incoming: findSource(project, clip, 'incomingShotId', context),
  });
  return (clip, options = {}) => resolveLinkedProps(project, clip, {...options, context});
};
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
  const context = options.context;
  const linked = context?.links.get(clip);
  const source = linked ? linked.source : findLinkedSourceClip(project, clip);
  const incoming = linked ? linked.incoming : findSource(project, clip, 'incomingShotId');
  const frame = options.frame;
  const hasFrame = typeof frame === 'number';
  if (context && hasFrame && context.titleFrame !== frame) {
    context.titleFrame = frame;
    context.hideHeading = context.titles.some(title => title.start <= frame && frame < title.start + title.duration);
  }
  const hideHeading = hasFrame ? (context ? context.hideHeading : titleActiveAt(project, frame)) : undefined;
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
