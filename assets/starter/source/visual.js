(() => {
  const {make,ctx,ramp}=PX,images={},font='"PingFang SC", "Microsoft YaHei", sans-serif';
  const sources={...CastAssets.cast,...Object.fromEntries(Object.entries(CastAssets.lead).map(([k,v])=>['face-'+k,v]))};
  const ready=Promise.all(Object.entries(sources).map(([key,src])=>new Promise((resolve,reject)=>{
    const im=new Image();im.onload=()=>{
      const cache=make(32*16,36*16);ctx(cache).drawImage(im,0,0,cache.width,cache.height);images[key]=cache;resolve();
    };im.onerror=reject;im.src=src;
  })));
  const lerp=(a,b,p)=>a+(b-a)*p;
  function text(g,value,x,y,size=40,color='#465b82',align='center',weight=600){
    g.font=`${weight} ${size}px ${font}`;g.textAlign=align;g.fillStyle=color;g.fillText(value,x*6,y*6);
  }
  function pill(g,value,x,y,size=28,color='#5367c9',fill='#f4f8ff',alpha=1){
    g.save();g.globalAlpha*=alpha;g.font=`600 ${size}px ${font}`;
    const width=g.measureText(value).width;g.fillStyle=fill;
    g.beginPath();g.roundRect(x*6-width/2-17,y*6-size*.88,width+34,size*1.35,8);g.fill();
    text(g,value,x,y,size,color);g.restore();
  }
  function actor(g,id,x,foot,scale,t,speaking=false,alpha=1){
    let key=id;
    if(id===Runtime.lead){
      const blink=[1.7,9.1,16.9,22.1,29.8].some(at=>t>at&&t<at+.12)?1:0;
      const mouth=Mouth.state(t);
      key=`face-${blink}-${mouth}`;
    }
    g.save();g.globalAlpha*=alpha;
    g.fillStyle='#829fc32b';g.beginPath();g.ellipse(x*6,(foot+2)*6,scale*12*6,scale*2*6,0,0,Math.PI*2);g.fill();
    g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
    g.drawImage(images[key],(x-16*scale)*6,(foot-34*scale)*6,32*scale*6,36*scale*6);g.restore();
  }
  function card(g,o,t,alpha=1,frame=true){
    const {x,y,scale=1,type='code',label='代码草稿'}=o;
    if(frame)Art.draw(g,'document',x,y,scale,alpha*(o.frameAlpha??1));
    Art.draw(g,type,x,y+2*scale,scale*(o.iconScale??1),alpha*(1-(o.iconMix??0)));
    if(o.type2)Art.draw(g,o.type2,x,y+2*scale,scale,alpha*o.iconMix);
    g.save();g.globalAlpha*=alpha*(o.frameAlpha??1);text(g,label,x,y-21*scale,27*scale,'#64809f');g.restore();
  }
  function link(g,points,progress=1,color='#81cdb7',width=3){
    g.save();g.strokeStyle=color;g.lineWidth=width*6;g.lineJoin='miter';g.lineCap='butt';
    g.beginPath();g.moveTo(points[0][0]*6,points[0][1]*6);
    const n=(points.length-1)*Math.max(0,Math.min(1,progress)),whole=Math.floor(n);
    for(let i=1;i<=whole;i++)g.lineTo(points[i][0]*6,points[i][1]*6);
    if(whole<points.length-1){const p=n-whole,a=points[whole],b=points[whole+1];g.lineTo(lerp(a[0],b[0],p)*6,lerp(a[1],b[1],p)*6);}
    g.stroke();g.restore();
  }
  function dot(g,x,y,s=1,color='#c5f8e8',alpha=1){g.save();g.globalAlpha*=alpha;g.fillStyle=color;g.fillRect(x*6,y*6,s*6,s*6);g.restore();}
  function camera(g,z=1,dx=0,dy=0){g.translate(960,540);g.scale(z,z);g.translate(-960+dx*6,-540+dy*6);}
  function pose(o,cam){return {...o,x:(o.x-160+cam.dx)*cam.z+160,y:(o.y-90+cam.dy)*cam.z+90,scale:o.scale*cam.z};}
  function withCamera(g,cam,paint){g.save();camera(g,cam.z,cam.dx,cam.dy);paint();g.restore();}
  function title(g,value,x=30,y=29,dark=false,size=59,align='left',alpha=1){
    g.save();g.globalAlpha*=alpha;text(g,value,x,y,size,dark?'#eaf2ff':'#465dbc',align);g.restore();
  }
  function hud(g,index,dark){
    text(g,'AI 时代 · 程序员的下一步',305,12,22,dark?'#98acc9':'#91a1bb','right',500);
    text(g,`${String(index+1).padStart(2,'0')} / 08`,17,168,20,dark?'#7795b5':'#93a6c0','left',500);
  }
  function captions(g,t,dark=true){
    const segment=Narration.segments.find(s=>t>=s.start&&t<s.end)??Narration.segments.at(-1);
    g.font=`600 50px ${font}`;const width=g.measureText(segment.text).width,x=(1920-width)/2;
    g.fillStyle=dark?'#15283fee':'#fafcfff5';g.beginPath();g.roundRect(x-30,956,width+60,82,13);g.fill();
    text(g,segment.text,x/6,1015/6,50,dark?'#eaf3ff':'#394563','left');
    const at=segment.text.indexOf(segment.accent),offset=g.measureText(segment.text.slice(0,at)).width;
    text(g,segment.accent,(x+offset)/6,1015/6,50,dark?'#b5efda':'#5367c9','left');
  }
  window.V={ready,text,pill,actor,card,link,dot,camera,pose,withCamera,title,hud,captions,lerp,ramp};
})();
