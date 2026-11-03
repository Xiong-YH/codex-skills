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
    const shadow=e.style.textShadow;
    if(shadow){g.shadowColor=shadow.color;g.shadowBlur=(shadow.blur||0)*e.height;g.shadowOffsetY=(shadow.offsetY||0)*e.height;}
    const rows = lines(g, value, maxWidth || e.width * .8);
    const rowHeight = size * 1.38;
    rows.forEach((row, i) => g.fillText(row, x, y + (i - (rows.length - 1) / 2) * rowHeight));
    g.restore();
    return rows.length;
  }
  // Workbench-only rich line; the independently placed plate owns its lifetime.
  function richLine(e, cue) {
    const spec=JSON.parse(cue.richTextJson),g=e.ctx,w=e.width,h=e.height,size=cue.fontSize;
    const {left,right,y,label,emphasis=[],rotation=0}=spec;
    if(![left,right,y].every(Number.isFinite)||left<0||right>1||left>=right||y<0||y>1||!Array.isArray(emphasis)||!Number.isFinite(rotation))
      throw new Error(`Text ${cue.id}: invalid rich line layout`);
    const terms=emphasis.filter(item=>item.text).sort((a,b)=>b.text.length-a.text.length),runs=[];
    for(let i=0;i<cue.text.length;){
      const term=terms.find(item=>cue.text.startsWith(item.text,i));
      if(term){runs.push({...term});i+=term.text.length;}
      else {const char=String.fromCodePoint(cue.text.codePointAt(i));const last=runs.at(-1);if(last&&last.plain)last.text+=char;else runs.push({text:char,plain:true});i+=char.length;}
    }
    g.save();try{
      if(rotation){g.translate(left*w,y*h);g.rotate(rotation);g.translate(-left*w,-y*h);}
      g.font=`600 ${size}px ${e.style.fontFamily}`;g.textBaseline='middle';g.textAlign='left';
      const pad=size*.12,width=runs.reduce((n,r)=>n+g.measureText(r.text).width+(r.treatment==='chip'?pad*2:0),0);
      if(width>(right-left)*w||y*h-size/2<0||y*h+size/2>h)throw new Error(`Text ${cue.id}: rich line overflows`);
      if(label)draw(e,label.text,label.x*w,label.y*h,label.fontSize,label.color,w*.15);
      let x=left*w;
      for(const run of runs){const rw=g.measureText(run.text).width,col=run.color||cue.color||e.colors.ink;
        if(run.treatment==='chip'){g.fillStyle=col;g.fillRect(x,y*h-size*.75,rw+pad*2,size*1.5);x+=pad;g.fillStyle=run.ink||'#fff2d5';}
        else g.fillStyle=col;
        g.fillText(run.text,x,y*h);
        if(run.treatment==='underline'){g.fillStyle=col;g.fillRect(x,y*h+size*.61,rw,Math.max(2,size*.09));}
        x+=rw+(run.treatment==='chip'?pad:0);
      }
    }finally{g.restore();}
  }
  P.text = {
    draw,
    overlays(e, cues, frame) {
      const {ctx:g, width:w, height:h, colors:c} = e;
      for (const cue of cues) {
        if (frame < cue.startFrame || frame >= cue.endFrame) continue;
        if(cue.richTextJson){richLine(e,cue);continue;}
        const size = cue.fontSize === undefined ? (e.style.textRoles[cue.role] || .03) * h : cue.fontSize;
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
        if (cue.role === 'subtitle' && cue.showBackdrop !== false) {
          const skin=e.style.subtitle||{},left=w*.04,sw=w*.92,sh=h*(skin.height??.16),top=y-sh/2;
          g.save(); g.fillStyle = skin.background||c.background; g.globalAlpha = skin.opacity??.96;
          g.fillRect(left,top,sw,sh);g.globalAlpha=1;
          if(skin.border){g.fillStyle=skin.border;g.fillRect(left,top,sw,e.pixel*.5);}
          if(skin.accent){g.fillStyle=skin.accent;g.fillRect(left,top,e.pixel*5,e.pixel*.5);}
          g.restore();
          draw(e, cue.text, x, y, size, cue.color || c.ink, maxWidth);
        } else draw(e, cue.text, x, y, size, cue.color || (cue.accent ? c.accent : c.ink), maxWidth, 'center', cue.role === 'title' ? '700' : '600');
      }
    }
  };
})(globalThis.PixelVideo = globalThis.PixelVideo || {});
