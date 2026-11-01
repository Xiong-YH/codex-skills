type Data = Record<string, any>;

/** Decode only videos a shot or its referenced snapshots can actually draw. */
export const videoKeysForShots = (resolved: Data, indices: number[]): string[] => {
  const visited = new Set<number>(), keys = new Set<string>();
  const reference = (id: string) => {
    const index = resolved.shots.findIndex((shot: Data) => shot.id === id);
    if (index >= 0) visit(index);
  };
  const references = (value: any): void => {
    if (!value || typeof value !== 'object') return;
    for (const [key, item] of Object.entries(value)) {
      if (key === 'sourceShot' && typeof item === 'string') reference(item);
      else if (key === 'sourceShots' && Array.isArray(item)) {
        for (const entry of item) if (typeof entry === 'string') reference(entry); else references(entry);
      } else references(item);
    }
  };
  const visit = (index: number): void => {
    if (visited.has(index)) return;
    const shot = resolved.shots[index];if (!shot) return;
    visited.add(index);
    for (const field of ['background', 'replacement']) {
      const source = shot[field];
      if (source?.assetKey && resolved.media?.[source.assetKey]?.kind === 'video') keys.add(source.assetKey);
    }
    references(shot.components);references(shot.params);
  };
  for (const index of indices) visit(index);
  return [...keys].sort();
};
