(function (P) {
  'use strict';
  P.clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  P.ease = p => 1 - Math.pow(1 - P.clamp(p), 3);
  P.progress = (frame, start, end) => P.clamp((frame - start) / Math.max(1, end - start - 1));
  P.style = {
    background(e) {
      const {ctx:g, width:w, height:h, colors:c, pixel:px} = e;
      // Design on the native grid: quiet scenery stays behind the reading area.
      const nx=w/px,ny=h/px;
      const rect=(x,y,rw,rh,color)=>{g.fillStyle=color;g.fillRect(x*px,y*px,rw*px,rh*px);};
      const silhouette=(points,bottom,color)=>{
        g.fillStyle=color;g.beginPath();g.moveTo(0,bottom*px);
        for(const [x,y] of points)g.lineTo(x*px,y*px);
        g.lineTo(nx*px,bottom*px);g.closePath();g.fill();
      };
      const cloud=(x,y,scale=1)=>{
        const r=(a,b,cw,ch)=>rect(x+a*scale,y+b*scale,cw*scale,ch*scale,c.cloud||c.panel);
        r(0,4,31,4);r(5,1,17,7);r(10,0,8,8);r(22,3,12,5);
      };
      rect(0,0,nx,ny,c.sky||c.background);
      rect(0,37,nx,ny-37,c.skyHaze||c.background);
      rect(0,74,nx,ny-74,c.background);
      // Broad horizontal forms provide depth without competing with labels.
      cloud(15,24,.8);cloud(265,34,.7);
      rect(275,12,9,2,c.cloud||c.panel);rect(273,14,13,9,c.cloud||c.panel);rect(275,23,9,2,c.cloud||c.panel);
      silhouette([[0,89],[12,89],[12,85],[25,85],[25,80],[41,80],[41,76],[60,76],
        [60,81],[77,81],[77,88],[101,88],[101,92],[124,92],[124,89],[143,89],
        [143,84],[166,84],[166,86],[186,86],[186,82],[207,82],[207,76],
        [230,76],[230,72],[249,72],[249,78],[264,78],[264,85],[286,85],
        [286,91],[305,91],[305,87],[320,87]],135,c.farHill||c.edge);
      silhouette([[0,112],[16,112],[16,108],[31,108],[31,105],[47,105],
        [47,111],[65,111],[65,117],[92,117],[92,121],[120,121],[120,123],
        [155,123],[155,120],[181,120],[181,116],[205,116],[205,112],
        [233,112],[233,107],[254,107],[254,104],[273,104],[273,111],
        [293,111],[293,116],[320,116]],135,c.nearHill||c.edge);
      // Sparse little terrace marks describe the hills; the middle remains calm.
      rect(0,124,28,2,c.hillHighlight||c.panel);rect(4,127,13,1,c.hillHighlight||c.panel);
      rect(296,122,24,2,c.hillHighlight||c.panel);rect(307,125,13,1,c.hillHighlight||c.panel);
      // A continuous warm ground anchors the actor and leaves a clean subtitle bay.
      rect(0,135,nx,ny-135,c.ground||c.background);
      rect(16,135,288,3,c.platformGrass||c.accent);
      rect(16,138,288,1,c.platformLip||c.edge);
      rect(17,139,286,5,c.platformSand||c.gold);
      rect(17,144,286,2,c.platformShade||c.edge);
      for(const x of [22,52,88,125,163,201,240,281]){
        rect(x,140,7,1,c.platformShade||c.edge);
        rect(x+3,142,3,1,c.platformShade||c.edge);
      }
      rect(20,146,280,1,c.platformShade||c.edge);
      // Ground texture is outside the subtitle safe area, never a full-screen grid.
      for(const [x,y] of [[4,150],[307,153],[10,168],[299,174]]){
        rect(x,y,5,1,c.platformShade||c.edge);rect(x+2,y+2,2,1,c.platformSand||c.gold);
      }
    },
    panel(e, x, y, w, h, color) {
      const {ctx:g, pixel:px, colors:c} = e;
      g.fillStyle=c.platformShade||c.edge;g.fillRect(x+px,y+px,w,h);
      g.fillStyle = color || c.edge; g.fillRect(x, y, w, h);
      g.fillStyle = c.panel; g.fillRect(x + px, y + px, w - px * 2, h - px * 2);
      g.fillStyle=c.cloud||c.background;g.fillRect(x+px,y+px,w-px*2,px);
    }
  };
})(globalThis.PixelVideo = globalThis.PixelVideo || {});
