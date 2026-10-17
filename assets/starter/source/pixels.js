(() => {
  const W=320,H=180;
  const C={ink:'#30354b',wall:'#e9edf9',panel:'#dde3f5',floor:'#cbd6ec',floorLine:'#b9c8e1',white:'#fafbff',ice:'#dce9f3',lilac:'#b7aff0',violet:'#a38cf1',purple:'#7c68b7',blue:'#668bfa',blueDark:'#5367c9',blueLight:'#98bbff',navy:'#4a5d83',navyDark:'#394563',mint:'#7ad3bd',mintDark:'#54a49f',mintLight:'#b5efda',coral:'#f07d8b',coralLight:'#ffb4aa',apricot:'#ffbc7b',wood:'#d7b8a9',woodLight:'#f0d6bf',woodShade:'#b3949f',slate:'#8692b2',shadow:'#a5b5d4',screen:'#f0f5ff',skin:'#f3bd9c',skinLight:'#ffd6b4'};
  const make=(w=W,h=H)=>Object.assign(document.createElement('canvas'),{width:w,height:h});
  const ctx=c=>{const g=c.getContext('2d');g.imageSmoothingEnabled=false;return g;};
  const R=(g,x,y,w,h,c)=>{g.fillStyle=C[c]??c;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
  function L(g,x0,y0,x1,y1,c,width=1){
    x0=Math.round(x0);y0=Math.round(y0);x1=Math.round(x1);y1=Math.round(y1);
    const dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1;let error=dx+dy;
    for(;;){R(g,x0,y0,width,width,c);if(x0===x1&&y0===y1)break;const e=2*error;if(e>=dy){error+=dy;x0+=sx;}if(e<=dx){error+=dx;y0+=sy;}}
  }
  function P(g,points,c){
    const top=Math.ceil(Math.min(...points.map(p=>p[1]))),bottom=Math.floor(Math.max(...points.map(p=>p[1])));
    for(let y=top;y<=bottom;y++){
      const cross=[];
      for(let i=0,j=points.length-1;i<points.length;j=i++){
        const [x1,y1]=points[j],[x2,y2]=points[i];
        if((y1<=y&&y2>y)||(y2<=y&&y1>y))cross.push(x1+(y-y1)*(x2-x1)/(y2-y1));
      }
      cross.sort((a,b)=>a-b);for(let i=0;i+1<cross.length;i+=2)R(g,Math.ceil(cross[i]),y,Math.floor(cross[i+1])-Math.ceil(cross[i])+1,1,c);
    }
  }
  function E(g,x,y,rx,ry,c){
    rx=Math.max(1,Math.round(rx));ry=Math.max(1,Math.round(ry));
    for(let yy=-ry;yy<=ry;yy++){const w=Math.floor(rx*Math.sqrt(1-yy*yy/(ry*ry)));R(g,x-w,y+yy,w*2+1,1,c);}
  }
  const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x);};
  const ramp=(t,a,b)=>ease((t-a)/(b-a));
  const spark=(g,x,y,color='white',size=2)=>{R(g,x,y-size,1,size*2+1,color);R(g,x-size,y,size*2+1,1,color);};
  const check=(g,x,y,color='mintDark',s=1)=>{L(g,x,y+3*s,x+3*s,y+6*s,color,s+1);L(g,x+3*s,y+6*s,x+9*s,y,color,s+1);};
  function panel(g,x,y,w,h,fill,outline='ink'){
    R(g,x+1,y,w-2,h,outline);R(g,x,y+1,w,h-2,outline);R(g,x+1,y+1,w-2,h-2,fill);
  }
  window.PX={W,H,C,make,ctx,R,L,P,E,clamp,ease,ramp,spark,check,panel};
})();
