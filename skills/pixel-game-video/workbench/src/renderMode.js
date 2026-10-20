// A Jianying plate keeps the exact visual timing/transforms, with editable caption/audio layers removed.
export const excludesFromPlate = (clip, card) => clip.cardId.startsWith('proj:caption:') || card.kind === 'audio' || clip.cardId === 'audio-clip';
export const renderPropsForKind = (project, kind) => ({project, renderExact: true, ...(kind === 'jianying' ? {plate: true} : {})});
