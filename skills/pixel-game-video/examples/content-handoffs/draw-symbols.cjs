// Reproducible native pixel symbols, not generated photographic assets.
const fs=require('node:fs'),path=require('node:path');
const {createCanvas}=require(path.join(process.env.PIXEL_NODE_MODULES,'@napi-rs/canvas'));
for(const [name,color,portion]of [['stamp','#c08667',1],['ring','#88c7b4',.68]]){
  const c=createCanvas(240,240),g=c.getContext('2d');
  for(let y=-104;y<=104;y+=3)for(let x=-104;x<=104;x+=3){
    const r=Math.hypot(x,y),a=(Math.atan2(y,x)+Math.PI/2+2*Math.PI)%(Math.PI*2);
    if(r>100||r<76)continue;g.fillStyle=a<Math.PI*2*portion?color:'#314b56';g.fillRect(x+120,y+120,3,3);
  }
  if(name==='stamp'){g.strokeStyle=color;g.lineWidth=4;g.beginPath();g.moveTo(84,120);g.lineTo(109,144);g.lineTo(156,94);g.stroke();}
  else{g.font='bold 38px sans-serif';g.fillStyle=color;g.textAlign='center';g.fillText('68%',120,134);}
  fs.writeFileSync(path.join(__dirname,'media',name+'.png'),c.toBuffer('image/png'));
}
