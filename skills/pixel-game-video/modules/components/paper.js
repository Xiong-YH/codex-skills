(function(P) {
  'use strict';
  function draw(e, c, b, t, state, text) {
    const g = e.ctx, u = e.height/1080;
    const { x, y, width:w, height:h } = b;
    const { title, detail, eyebrow, items } = c.data;
    const pad = Math.min(35*u,h*.18);
    const fold = Math.min(31*u,h*.22,w*.075);
    const paper = e.whitebox ? '#dde3dd' : c.tone === 'accent' ? '#dce7c6' : '#f4ddb0';
    const rule = e.whitebox ? '#9caba6' : '#b8855b';
    const ink = e.whitebox ? '#23323a' : '#362e27';
    const muted = e.whitebox ? '#435760' : '#715844';
    const mint = e.whitebox ? '#a3c8c1' : '#a6d5b4';
    const shade = e.whitebox ? '#54666d' : '#523929';
    const accent = c.tone === 'accent' ? mint : e.whitebox ? '#d5c28e' : '#edb873';
    const rect = (left,top,rw,rh,color) => {
      g.fillStyle=color;
      g.fillRect(Math.round(left),Math.round(top),Math.max(0,rw),Math.max(0,rh));
    };
    function sheet(dx,dy,color) {
      g.beginPath();
      g.moveTo(x+dx,y+dy);
      g.lineTo(x+w+dx-fold,y+dy);
      g.lineTo(x+w+dx,y+dy+fold);
      g.lineTo(x+w+dx,y+h+dy);
      g.lineTo(x+dx,y+h+dy);
      g.closePath();
      g.fillStyle=color;
      g.fill();
    }
    sheet(6*u,9*u,shade);
    if(t.stack)sheet(3*u,4*u,rule);
    sheet(0,0,paper);
    g.beginPath();
    g.moveTo(x+w-fold,y);
    g.lineTo(x+w-fold,y+fold);
    g.lineTo(x+w,y+fold);
    g.closePath();
    g.fillStyle=accent;
    g.fill();
    const rail = x+pad*.53, left = x+pad*1.44, right = x+w-pad;
    if (t.styleVariant !== 'open') rect(rail,y+pad,2*u,h-2*pad,rule);
    if (t.styleVariant === 'relay') {
      const end = P.ease(t.action)*(right-left);
      rect(left,y+h-10*u,right-left,3*u,rule);
      rect(left,y+h-10*u,end,3*u,muted);
      rect(left+end-4*u,y+h-13*u,8*u,8*u,accent);
    }
    if (state.focused) rect(x,y+pad*.62,7*u,h-pad*1.24,mint);
    const write = (value, l, top, ww, hh, size, color, lines=1) => {
      if (value) text(e,value,{x:l,y:top,width:ww,height:hh},size,color,'left',lines);
    };
    const main = Math.min(54,h/u*(detail ? .29 : .24)), note = Math.min(29,h/u*.19);
    if (c.kind === 'checklist') {
      write(title,left,y+pad*.42,right-left,h*.21,Math.min(36,h/u*.18),ink);
      const row = h*.64/items.length;
      items.forEach((item,i) => {
        const top = y+h*.29+row*i, done = state.items[i];
        rect(left,top+row*.24,18*u,18*u,done?mint:rule);
        rect(left+4*u,top+row*.24+4*u,10*u,10*u,done?muted:paper);
        const cell = left+31*u;
        write(item.label,cell,top,right-cell,row*(item.detail?.52:.85),Math.min(30,row/u*.36),done?ink:muted);
        if(item.detail)write(item.detail,cell,top+row*.49,right-cell,row*.4,Math.min(21,row/u*.27),muted);
        rect(cell,top+row*.91,right-cell,1*u,rule);
      });
      return;
    }
    if (eyebrow) write(eyebrow,left,y+h*.08,right-left-fold,h*.2,Math.min(25,note),muted);
    const titleY = eyebrow ? .28 : detail ? .16 : .2;
    write(title,left,y+h*titleY,right-left,h*(detail?.36:.58),main,ink,detail?1:2);
    if (detail) write(detail,left,y+h*.61,right-left,h*.22,note,muted);
  }
  P.componentPaper = { draw };
})(globalThis.PixelVideo = globalThis.PixelVideo || {});
