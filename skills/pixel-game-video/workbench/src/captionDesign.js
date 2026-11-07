export const SOFT_CAPTION_CARD = 'soft-highlight-caption';
export const isCaptionClip = (track, clip) => (!clip.props?.role || clip.props.role === 'subtitle') &&
  (track.role === 'caption' || clip.cardId === SOFT_CAPTION_CARD || clip.cardId === 'inkpress-caption' || clip.cardId.startsWith('proj:caption:'));
export const visibleCaptions = project => project.tracks.flatMap(t => t.hidden ? [] : t.clips.filter(c => isCaptionClip(t,c)));

/** Export checks actual card IDs, not a prose claim that the design was applied. */
export const validateCaptionDesign = project => {
  const clips = visibleCaptions(project);
  if (!clips.length) return;
  const design = project.captionDesign;
  if (!design) throw new Error('尚未选择字幕方案，请在顶部“字幕方案”中选择柔边重音或说明保留当前字幕的原因。');
  if (design.mode === 'soft-highlight') {
    const wrong = clips.find(c => c.cardId !== SOFT_CAPTION_CARD);
    if (wrong) throw new Error(`字幕方案与实际组件不符：${wrong.label || wrong.id} 未使用柔边重音字幕。`);
  } else if (design.mode === 'custom') {
    if (typeof design.reason !== 'string' || !design.reason.trim()) throw new Error('保留当前字幕时，请简述本片的选用原因。');
  } else throw new Error('未知字幕方案。');
};

export const applySoftCaptionDesign = project => ({
  ...project, captionDesign:{mode:'soft-highlight'},
  tracks:project.tracks.map(t => ({...t,clips:t.clips.map(c => {
    if (!isCaptionClip(t,c)) return c;
    const text = c.props.text ?? c.props.content;
    if (typeof text !== 'string' || !text.trim()) throw new Error(`字幕 ${c.label || c.id} 缺少可迁移文案，请先补齐文字。`);
    return {...c,cardId:SOFT_CAPTION_CARD,props:{text,keywords:'',emphasis:'none',fontSize:34,color:'#f5f3ec',accent:'#f7cf82',x:.5,y:.87,plateOpacity:.65,emphasisAt:0}};
  })})),
});

export const previousCaptionText = (track, clip, cards) => {
  const previous = track.clips.find(c => c.id !== clip.id && c.cardId === SOFT_CAPTION_CARD && c.start+c.duration === clip.start);
  if (!previous) return '';
  if (['x','y','scale'].some(k=>previous[k]!==clip[k])) return '';
  const a={...Object.fromEntries(cards[clip.cardId].schema.map(f=>[f.key,f.default])),...clip.props};
  const b={...Object.fromEntries(cards[previous.cardId].schema.map(f=>[f.key,f.default])),...previous.props};
  return ['fontSize','x','y','plateOpacity'].every(k=>a[k]===b[k]) ? String(b.text ?? '') : '';
};
