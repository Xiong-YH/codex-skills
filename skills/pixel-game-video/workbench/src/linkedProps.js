// Pixel Game Video, 2026-10-21: outgoing transitions reflect the currently edited source text.
export const isLinkedTextKey = key => key === 'heading' || /^title\w*$/.test(key) || /^label\w*$/.test(key);
/** If a shot is duplicated, use the latest matching instance at/before this transition. */
export const findLinkedSourceClip = (project, clip) => {
  if (typeof clip.props?.outgoingShotId !== 'string') return null;
  const matches = project.tracks.flatMap(track => track.clips)
    .filter(candidate => candidate.props?.sourceUnitId === clip.props.outgoingShotId && candidate.id !== clip.id)
    .sort((a, b) => a.start - b.start);
  return [...matches].reverse().find(candidate => candidate.start <= clip.start) ?? matches[0] ?? null;
};
/** Resolve linked outgoing shot text without mutation or persistently duplicating state.
 * If the source shot was deleted, keep the transition's original snapshot as an explicit fallback.
 */
export const resolveLinkedProps = (project, clip) => {
  const props = clip.props ?? {};
  const source = findLinkedSourceClip(project, clip);
  if (!source) return props;
  const currentText = Object.fromEntries(Object.entries(source.props).filter(([key, value]) =>
    isLinkedTextKey(key) && ['string', 'number', 'boolean'].includes(typeof value),
  ));
  return {...props, ...currentText};
};
