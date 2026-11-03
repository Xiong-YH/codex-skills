/* Shared drawing primitives for the fixed-view interview object studies. */
(function(root){
  'use strict';
  const C=Object.freeze({
    ink:'#eee3c9',muted:'#98aaa5',edge:'#101c22',dark:'#1c3037',mid:'#3b5054',
    paper:'#e5d6b5',paperLight:'#f3e6c9',paperShade:'#c1ad89',paperInk:'#293a40',
    brass:'#a77c48',gold:'#dfb778',blue:'#7ca8b6',orange:'#d3a079',
    red:'#b4655c',green:'#8cb5a2',wood:'#34423d'
  });
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  const mix=(a,b,p)=>a+(b-a)*p;
  const ease=p=>{p=clamp(p);return p*p*(3-2*p);};
  const range=(t,a,b)=>ease((t-a)/(b-a));
  const q=v=>Math.round(v);
  function rect(c,x,y,w,h,color){c.fillStyle=color;c.fillRect(q(x),q(y),q(w),q(h));}
  function poly(c,points,color){
    c.fillStyle=color;c.beginPath();
    points.forEach((p,i)=>i?c.lineTo(q(p[0]),q(p[1])):c.moveTo(q(p[0]),q(p[1])));
    c.closePath();c.fill();
  }
  function line(c,points,color,width=2){
    c.strokeStyle=color;c.lineWidth=width;c.lineJoin='miter';c.beginPath();
    points.forEach((p,i)=>i?c.lineTo(q(p[0]),q(p[1])):c.moveTo(q(p[0]),q(p[1])));c.stroke();
  }
  function text(c,value,x,y,size=16,color=C.ink,align='left',weight=400){
    c.fillStyle=color;c.font=`${weight} ${size}px "PingFang SC","Microsoft YaHei",sans-serif`;
    c.textAlign=align;c.textBaseline='middle';c.fillText(String(value),q(x),q(y));
  }
  function wrap(c,value,x,y,width,{size=16,lineHeight=25,color=C.ink,align='left'}={}){
    c.font=`400 ${size}px "PingFang SC","Microsoft YaHei",sans-serif`;
    let row='',offset=0;
    for(const letter of String(value)){
      if(letter==='\n'||(row&&c.measureText(row+letter).width>width)){
        text(c,row,x,y+offset,size,color,align);offset+=lineHeight;row='';
      }
      if(letter!=='\n')row+=letter;
    }
    if(row)text(c,row,x,y+offset,size,color,align);
    return offset+lineHeight;
  }
  function panel(c,x,y,w,h,{fill=C.dark,border=C.brass,highlight=C.gold}={}){
    poly(c,[[x+4,y],[x+w-4,y],[x+w,y+4],[x+w,y+h-4],[x+w-4,y+h],[x+4,y+h],[x,y+h-4],[x,y+4]],C.edge);
    rect(c,x+3,y+3,w-6,h-6,border);rect(c,x+6,y+6,w-12,h-12,fill);
    rect(c,x+6,y+3,w-12,2,highlight);rect(c,x+3,y+6,2,h-12,highlight);
  }
  function paper(c,x,y,w,h,{accent=C.brass}={}){
    rect(c,x+5,y+7,w,h,'#101c2255');rect(c,x,y,w,h,C.paperShade);
    rect(c,x,y,w-3,h-4,C.paper);rect(c,x+3,y+3,w-9,3,C.paperLight);
    rect(c,x+12,y+13,4,22,accent);
  }
  function shadow(c,x,y,w,h=14,alpha=.3){
    c.save();c.globalAlpha=alpha;
    rect(c,x+8,y,w-16,h,'#060e12');rect(c,x,y+4,w,Math.max(2,h-8),'#060e12');c.restore();
  }
  function finiteTime(value,duration){
    if(!Number.isFinite(value))throw new TypeError('time must be finite');
    return clamp(value,0,duration);
  }
  function withFrame(c,options,draw){
    const {x=0,y=0,width=960,height=540}=options;
    if(![x,y,width,height].every(Number.isFinite)||width<=0||height<=0)throw new TypeError('Invalid draw rectangle');
    const scale=Math.min(width/960,height/540);
    c.save();
    try{
      c.beginPath();c.rect(x,y,width,height);c.clip();
      c.translate(x+(width-960*scale)/2,y+(height-540*scale)/2);c.scale(scale,scale);
      c.imageSmoothingEnabled=false;draw();
    }finally{c.restore();}
  }
  const api=Object.freeze({C,clamp,mix,ease,range,rect,poly,line,text,wrap,panel,paper,shadow,finiteTime,withFrame});
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.PixelInterviewDrawing=api;
})(typeof globalThis!=='undefined'?globalThis:this);
