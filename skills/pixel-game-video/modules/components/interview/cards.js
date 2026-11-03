/* Three persistent, two-sided interview cards. The host owns background and time. */
(function(root){
  'use strict';
  const D=typeof module==='object'&&module.exports?require('./drawing.js'):root.PixelInterviewDrawing;
  if(!D)throw new Error('Load interview/drawing.js before cards.js');
  const {C,rect,poly,line,text,range,mix}=D;
  const WIDTH=230,HEIGHT=300,DURATION=8.4;
  const definitions=Object.freeze([
    {id:'campus',title:'校园经历',number:'01',x:115,start:.50,end:.86,
      a:['绩点前列','算法竞赛奖'],b:['成绩偏中下','获奖较少'],footer:'同一类别 · 两人对照'},
    {id:'project',title:'项目经历',number:'02',x:365,start:2.10,end:2.46,
      a:['课程项目','后台管理','本地运行'],b:['社团工具','学生在用','已经上线'],footer:'项目是否进入真实使用'},
    {id:'problem',title:'解决问题',number:'03',x:615,start:3.70,end:4.06,
      a:['介绍功能','说明技术','真实反馈少'],b:['定位问题','修复复测','持续维护'],footer:'面对同一个实际问题'}
  ]);
  const events=Object.freeze({
    campusFlip:.50,campusOpen:.86,projectFlip:2.10,projectOpen:2.46,
    problemFlip:3.70,problemOpen:4.06,handReach:5.25,pickup:5.50,
    held:5.86,returnStart:7.20,returned:7.60,handAway:8.10
  });
  function stateAt(time){
    const t=D.finiteTime(time,DURATION);
    const pick=range(t,events.pickup,events.held)*(1-range(t,events.returnStart,events.returned));
    const reach=range(t,events.handReach,events.pickup)*(1-range(t,events.returned+.2,events.handAway));
    const cards=definitions.map((def,index)=>{
      const flipProgress=range(t,def.start,def.end);
      const turning=t>=def.start&&t<def.end;
      const lift=turning?Math.sin(Math.PI*flipProgress)*7:0;
      return {
        id:def.id,face:flipProgress<.5?'back':'front',flipProgress,
        edgeOn:Math.abs(Math.cos(Math.PI*flipProgress))<.055,
        x:def.x-(index===0?10*pick:0),y:120-lift-(index===0?55*pick:0),
        scale:1+(index===0?.08*pick:0),rotation:index===0?-.055*pick:0,
        held:index===0&&pick>0,pickProgress:index===0?pick:0
      };
    });
    let phase='initial',label='三张扣牌，准备比较同类经历';
    const flipping=cards.find(card=>card.flipProgress>0&&card.flipProgress<1);
    if(flipping){phase='flip-'+flipping.id;label=definitions.find(def=>def.id===flipping.id).title+' · 翻开';}
    else if(t>=events.returned){phase='settled';label='原牌归位，三类经历全部保留';}
    else if(t>=events.returnStart){phase='return';label='同一张校园牌放回原位';}
    else if(t>=events.held){phase='held';label='A 拿起自己的校园经历，再看这份优势';}
    else if(t>=events.pickup){phase='pickup';label='从原位拿起第一张牌，不生成副本';}
    else if(t>=events.problemOpen){phase='comparison';label='三张牌均已翻开，A / B 在同一条件下对照';}
    else if(t>=events.projectOpen){phase='project';label='课程项目与实际上线的工具';}
    else if(t>=events.campusOpen){phase='campus';label='A 的校园优势保留在原牌上';}
    return {time:t,phase,label,cards,cardCount:cards.length,frontCount:cards.filter(c=>c.face==='front').length,
      heldCard:cards.find(c=>c.held)?.id||null,handReach:reach};
  }
  function outline(c,x,y,w,h,color){
    poly(c,[[x+6,y],[x+w-6,y],[x+w,y+6],[x+w,y+h-6],[x+w-6,y+h],[x+6,y+h],[x,y+h-6],[x,y+6]],color);
  }
  function corners(c,w,h,color){
    for(const [x,y,sx,sy] of [[9,9,1,1],[w-9,9,-1,1],[9,h-9,1,-1],[w-9,h-9,-1,-1]]){
      rect(c,x-(sx<0?17:0),y-(sy<0?3:0),17,3,color);
      rect(c,x-(sx<0?3:0),y-(sy<0?17:0),3,17,color);
    }
  }
  function trophy(c,x,y){
    rect(c,x-15,y-20,30,7,C.gold);rect(c,x-12,y-13,24,19,C.brass);
    rect(c,x-9,y-12,18,11,C.gold);rect(c,x-24,y-15,9,5,C.brass);
    rect(c,x-24,y-10,5,13,C.brass);rect(c,x-19,y-1,8,5,C.brass);
    rect(c,x+15,y-15,9,5,C.brass);rect(c,x+19,y-10,5,13,C.brass);
    rect(c,x+11,y-1,8,5,C.brass);rect(c,x-4,y+6,8,12,C.brass);
    rect(c,x-17,y+18,34,7,C.brass);rect(c,x-13,y+18,26,3,C.gold);
  }
  function notebook(c,x,y){
    rect(c,x-24,y-21,48,49,'#8c9b91');rect(c,x-21,y-24,42,47,C.paperLight);
    rect(c,x-21,y-24,6,47,C.blue);rect(c,x-10,y-12,24,3,C.paperShade);
    rect(c,x-10,y-2,24,3,C.paperShade);rect(c,x-10,y+8,18,3,C.paperShade);
  }
  function screen(c,x,y,live){
    rect(c,x-32,y-24,64,42,C.edge);rect(c,x-28,y-20,56,34,'#e7e2cf');
    rect(c,x-28,y-20,56,7,live?C.orange:C.blue);
    rect(c,x-23,y-7,26,3,'#a5b4ac');rect(c,x-23,y+1,36,3,'#a5b4ac');
    rect(c,x-23,y+9,17,4,live?C.green:'#b3b9ad');
    rect(c,x-5,y+18,10,8,C.mid);rect(c,x-21,y+26,42,4,C.mid);
    if(live){rect(c,x+18,y+4,7,7,C.green);rect(c,x+20,y+6,3,3,'#e7f0da');}
  }
  function tools(c,x,y){
    poly(c,[[x+10,y-23],[x+21,y-19],[x+17,y-6],[x+7,y-2],[x-13,y+22],[x-21,y+14],[x+1,y-7],[x+1,y-18]],C.blue);
    rect(c,x-21,y+13,5,5,'#527780');
    poly(c,[[x-21,y-23],[x-15,y-26],[x+19,y+15],[x+13,y+21]],C.brass);
    poly(c,[[x-21,y-23],[x-15,y-26],[x-10,y-20],[x-16,y-17]],C.gold);
  }
  function front(c,def,held){
    outline(c,0,0,WIDTH,HEIGHT,C.paperShade);outline(c,3,2,WIDTH-7,HEIGHT-7,C.paper);
    line(c,[[12,49],[WIDTH-12,49]],'#bdab87',1);
    rect(c,17,17,4,20,C.brass);text(c,def.title,30,27,20,C.paperInk,'left',600);
    text(c,def.number,WIDTH-17,27,12,'#88785c','right');
    const centers=[61,169],tagColors=[C.blue,C.orange];
    for(let side=0;side<2;side++){
      const x=centers[side],isA=side===0;
      rect(c,x-42,65,84,26,tagColors[side]);text(c,isA?'A':'B',x,78,17,C.edge,'center',600);
      if(def.id==='campus')isA?trophy(c,x,133):notebook(c,x,133);
      else if(def.id==='project')screen(c,x,133,!isA);
      else isA?notebook(c,x,133):tools(c,x,133);
      const lines=isA?def.a:def.b;
      lines.forEach((value,i)=>text(c,value,x,191+i*23,14,C.paperInk,'center'));
    }
    line(c,[[115,107],[115,242]],'#c8b996',1);
    line(c,[[18,263],[WIDTH-18,263]],'#c3b28d',1);
    text(c,def.footer,WIDTH/2,280,12,'#6f6a58','center');
    corners(c,WIDTH,HEIGHT,C.brass);
    if(held){
      line(c,[[19,96],[19,244],[103,244]],'#648c9a',2);
      text(c,'A',29,252,11,'#5e8390');
    }
  }
  function back(c,def){
    outline(c,0,0,WIDTH,HEIGHT,'#875f35');outline(c,3,2,WIDTH-7,HEIGHT-7,'#243b41');
    outline(c,12,11,WIDTH-25,HEIGHT-25,'#51605c');outline(c,14,13,WIDTH-29,HEIGHT-29,'#263c42');
    corners(c,WIDTH,HEIGHT,C.brass);text(c,def.number,23,27,13,C.gold);
    const x=WIDTH/2,y=143;
    poly(c,[[x,y-46],[x+35,y],[x,y+46],[x-35,y]],C.brass);
    poly(c,[[x,y-38],[x+28,y],[x,y+38],[x-28,y]],'#263c42');
    rect(c,x-12,y-18,24,34,C.paperShade);rect(c,x-8,y-13,16,2,C.paperLight);
    rect(c,x-8,y-5,16,2,C.paperLight);rect(c,x-8,y+3,11,2,C.paperLight);
    text(c,'经历档案',x,220,17,C.ink,'center');
    text(c,'同类筹码 · 对照查看',x,247,12,'#a0afa0','center');
  }
  function card(c,item,def){
    // Each identity is drawn once. A positive face projection avoids mirrored text.
    const projection=Math.abs(Math.cos(Math.PI*item.flipProgress));
    const w=WIDTH*item.scale,h=HEIGHT*item.scale;
    D.shadow(c,item.x+4,item.y+h+7,w-4,15,.28);
    c.save();c.translate(item.x+w/2,item.y+h/2);c.rotate(item.rotation);c.scale(item.scale,item.scale);
    if(projection<.055){
      rect(c,-3,-HEIGHT/2,6,HEIGHT,'#ab9271');rect(c,-1,-HEIGHT/2,2,HEIGHT,C.paperLight);
    }else{
      c.scale(projection,1);c.translate(-WIDTH/2,-HEIGHT/2);
      outline(c,4,5,WIDTH,HEIGHT,'#735c3e');
      if(item.face==='front')front(c,def,item.held);else back(c,def);
    }
    c.restore();
  }
  function handPosition(state){
    const item=state.cards[0],angle=item.rotation;
    const local={x:-WIDTH/2+49,y:HEIGHT/2-3};
    const anchor={x:item.x+WIDTH*item.scale/2+(local.x*Math.cos(angle)-local.y*Math.sin(angle))*item.scale,
      y:item.y+HEIGHT*item.scale/2+(local.x*Math.sin(angle)+local.y*Math.cos(angle))*item.scale};
    return {x:anchor.x,y:mix(575,anchor.y,state.handReach)};
  }
  function handBehind(c,state){
    if(state.handReach<=0)return;
    const p=handPosition(state);
    // The forearm remains connected beyond the host's frame; fingers sit behind the card.
    poly(c,[[p.x-18,p.y+35],[p.x+34,p.y+29],[p.x+62,552],[p.x-9,552]],'#526c79');
    poly(c,[[p.x-18,p.y+35],[p.x+34,p.y+29],[p.x+34,p.y+47],[p.x-15,p.y+55]],'#7d9da7');
    outline(c,p.x-13,p.y-13,44,55,'#ae8064');
    rect(c,p.x-9,p.y-13,36,43,'#d4aa86');rect(c,p.x-6,p.y-9,30,5,'#e6c59f');
  }
  function handFront(c,state){
    if(state.handReach<=0)return;
    const p=handPosition(state);
    outline(c,p.x-16,p.y-15,16,31,'#ad7d60');
    rect(c,p.x-13,p.y-12,10,24,'#ddb48e');rect(c,p.x-10,p.y-10,5,6,'#e7c8a7');
  }
  function draw(ctx,options={}){
    const state=stateAt(options.time===undefined?0:options.time);
    D.withFrame(ctx,options,()=>{
      // Bare corner marks identify the original slots without adding duplicate cards.
      for(const def of definitions){
        line(ctx,[[def.x-4,116],[def.x-4,109],[def.x+13,109]],'#a48d5b55',2);
        line(ctx,[[def.x+WIDTH-13,109],[def.x+WIDTH+4,109],[def.x+WIDTH+4,116]],'#a48d5b55',2);
      }
      handBehind(ctx,state);
      for(let i=1;i<state.cards.length;i++)card(ctx,state.cards[i],definitions[i]);
      card(ctx,state.cards[0],definitions[0]);
      handFront(ctx,state);
    });
    return state;
  }
  const api=Object.freeze({id:'object.interview-cards.v1',duration:DURATION,events,draw,stateAt});
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.PixelInterviewCards=api;
})(typeof globalThis!=='undefined'?globalThis:this);
