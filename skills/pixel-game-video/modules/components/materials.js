(function(P){
  'use strict';

  function rect(g,x,y,w,h,color){
    if(w<=0||h<=0)return;
    g.fillStyle=color;
    g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));
  }

  function polygon(g,points,color){
    g.beginPath();
    for(const [index,[x,y]] of points.entries()){
      if(index)g.lineTo(Math.round(x),Math.round(y));
      else g.moveTo(Math.round(x),Math.round(y));
    }
    g.closePath();
    g.fillStyle=color;
    g.fill();
  }

  function plate(g,{x,y,width:w,height:h},color,corner=6,topRight=corner){
    const c=Math.min(corner,w/3,h/3),r=Math.min(topRight,w/3,h/3);
    polygon(g,[[x+c,y],[x+w-r,y],[x+w-r,y+r],[x+w,y+r],[x+w,y+h-c],[x+w-c,y+h-c],
      [x+w-c,y+h],[x+c,y+h],[x+c,y+h-c],[x,y+h-c],[x,y+c],[x+c,y+c]],color);
  }

  function paper(g,{x,y,width:w,height:h},{face,edge,light,fold=0,foldColor=edge,stack=false,unit=1}){
    function sheet(dx,dy,color){
      polygon(g,[[x+dx,y+dy],[x+w+dx-fold,y+dy],[x+w+dx,y+dy+fold],
        [x+w+dx,y+h+dy],[x+dx,y+h+dy]],color);
    }
    if(stack){
      sheet(4*unit,6*unit,edge);
      sheet(2*unit,3*unit,light);
    }
    sheet(0,0,face);
    rect(g,x+2*unit,y+unit,w-fold-3*unit,unit,light);
    rect(g,x+unit,y+h-2*unit,w-2*unit,unit,edge);
    if(fold)polygon(g,[[x+w-fold,y],[x+w-fold,y+fold],[x+w,y+fold]],foldColor);
  }

  function iron(g,x,y,w,h,{face='#293b40',edge='#81643e',light='#d7ba82',shade='#1b2b30'}={}){
    rect(g,x-2,y-2,w+4,h+4,'#0e1a20');
    rect(g,x,y,w,h,edge);
    rect(g,x+2,y+2,w-4,h-4,face);
    rect(g,x,y,w,2,light);
    rect(g,x+3,y+3,w-6,1,'#67726a');
    rect(g,x+3,y+h-4,w-6,2,shade);
    if(w>=17&&h>=15){
      for(const a of [x+5,x+w-7])for(const b of [y+5,y+h-7])rect(g,a,b,2,2,'#b49359');
    }
  }

  function base(g,x,y,w,{stack,edge,active=true}){
    rect(g,x,y,w,2,edge);
    rect(g,x+2,y+2,w-4,4,active?'#586867':'#475653');
    if(stack){
      rect(g,x+4,y+6,w-8,4,'#34454a');
      rect(g,x+4,y+6,w-8,1,'#78837a');
      rect(g,x+9,y+10,w-18,3,'#1e3035');
    }
    const floor=y+(stack?13:6);
    rect(g,x+3,floor,w-2,2,'#0b171b90');
  }

  P.componentMaterials={rect,plate,paper,iron,base};
})(globalThis.PixelVideo=globalThis.PixelVideo||{});
