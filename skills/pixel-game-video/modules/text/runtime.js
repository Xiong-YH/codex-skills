(function (P) {
  'use strict';
  function lines(ctx, value, maxWidth) {
    const result = [];
    for (const paragraph of String(value).split('\n')) {
      let line = '';
      for (const char of Array.from(paragraph)) {
        if (line && ctx.measureText(line + char).width > maxWidth) { result.push(line); line = char; }
        else line += char;
      }
      result.push(line);
    }
    return result;
  }
  function draw(e, value, x, y, size, color, maxWidth, align = 'center', weight = '600') {
    const g = e.ctx;
    g.save(); g.font = `${weight} ${size}px ${e.style.fontFamily}`;
    g.fillStyle = color || e.colors.ink; g.textAlign = align; g.textBaseline = 'middle';
    const rows = lines(g, value, maxWidth || e.width * .8);
    const rowHeight = size * 1.38;
    rows.forEach((row, i) => g.fillText(row, x, y + (i - (rows.length - 1) / 2) * rowHeight));
    g.restore();
    return rows.length;
  }
  P.text = {
    draw,
    overlays(e, cues, frame) {
      const {ctx:g, width:w, height:h, colors:c} = e;
      for (const cue of cues) {
        if (frame < cue.startFrame || frame >= cue.endFrame) continue;
        const size = (e.style.textRoles[cue.role] || .03) * h;
        const x = (cue.x === undefined ? .5 : cue.x) * w;
        const defaultY = {title:.105, subtitle:.87, annotation:.22, label:.68};
        const y = (cue.y === undefined ? (defaultY[cue.role] || .5) : cue.y) * h;
        const safeX=(e.style.safeArea.x || .05)*w;
        const maxWidth=Math.min(w*.86,Math.max(0,2*Math.min(x-safeX,w-safeX-x)));
        g.save();g.font=`600 ${size}px ${e.style.fontFamily}`;
        const wrapped=lines(g,cue.text,maxWidth);g.restore();
        const textHeight=size+(wrapped.length-1)*size*1.38;
        if(maxWidth<size||y-textHeight/2<h*e.style.safeArea.top||y+textHeight/2>h*(1-e.style.safeArea.bottom))
          throw new Error(`Text ${cue.id} exceeds the safe area: shorten it, split the cue, or adjust x/y.`);
        if(cue.role==='subtitle'&&wrapped.length>2)
          throw new Error(`Subtitle ${cue.id} wraps to ${wrapped.length} lines; shorten it or split it into cues (maximum 2 lines).`);
        if (cue.role === 'subtitle') {
          g.save(); g.fillStyle = c.background; g.globalAlpha = .96;
          g.fillRect(w * .04, y-h*.08, w * .92, h * .16); g.restore();
          draw(e, cue.text, x, y, size, c.ink, maxWidth);
        } else draw(e, cue.text, x, y, size, cue.accent ? c.accent : c.ink, maxWidth, 'center', cue.role === 'title' ? '700' : '600');
      }
    }
  };
})(globalThis.PixelVideo = globalThis.PixelVideo || {});
