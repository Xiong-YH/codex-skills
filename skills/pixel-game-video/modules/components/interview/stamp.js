/* Fixed-view judgment stamp: approach, suspend, withdraw, set aside. */
(function(root){
  'use strict';
  const D=typeof module==='object'&&module.exports?require('./drawing.js'):root.PixelInterviewDrawing;
  if(!D)throw new Error('Load interview/drawing.js before stamp.js');
  const {C,rect,poly,line,text,mix,range}=D;
  const DURATION=5.6;
  const EVENTS=Object.freeze({ready:0,approach:.5,hover:.9,withdraw:2.7,contact:3.12,release:3.55,rest:3.9});
  const PAPER=Object.freeze({x:155,y:162,width:409,height:318,contactX:431,contactY:331});
  const SOURCE=Object.freeze({x:431,y:164});
  const HOVER=Object.freeze({x:431,y:251});
  const REST=Object.freeze({x:754,y:423});

  function stateAt(value){
    const time=D.finiteTime(value,DURATION);
    const approach=range(time,EVENTS.approach,EVENTS.hover);
    const withdraw=range(time,EVENTS.withdraw,EVENTS.contact);
    const release=range(time,EVENTS.release,EVENTS.rest);
    let x=SOURCE.x,y=mix(SOURCE.y,HOVER.y,approach);
    if(time>=EVENTS.withdraw){
      x=mix(HOVER.x,REST.x,withdraw);
      y=mix(HOVER.y,REST.y,withdraw)-Math.sin(Math.PI*withdraw)*35;
    }
    let phase='ready',label='印章准备接近';
    if(time>=EVENTS.rest){phase='rest';label='印章放在桌边，简历保持原样';}
    else if(time>=EVENTS.release){phase='releasing';label='松开印章，收回手';}
    else if(time>=EVENTS.contact){phase='placed';label='只接触桌边，没有盖到简历';}
    else if(time>=EVENTS.withdraw){phase='withdrawing';label='移离简历，放到桌边';}
    else if(time>=EVENTS.hover){phase='suspended';label='留隙悬停，尚未落印';}
    else if(time>=EVENTS.approach){phase='approaching';label='靠近简历，在接触前停止';}
    return {
      time,phase,label,stampCount:1,resumeMarked:false,paperContact:false,
      tableContact:time>=EVENTS.contact,
      hoverGap:time<EVENTS.withdraw?PAPER.contactY-y:null,
      paper:{...PAPER},
      stamp:{id:'judgment',x,y,bottomY:y,width:160,height:149,rotation:0},
      hand:{release,gripX:x+17+release*255,gripY:y-116+release*31},
      approach,withdraw,release
    };
  }

  function resume(c){
    const {x,y,width:w,height:h}=PAPER;
    D.paper(c,x,y,w,h,{accent:C.blue});
    // A folded corner and uneven paper edge keep the document an object.
    poly(c,[[x+w-28,y],[x+w-3,y+25],[x+w-28,y+25]],C.paperShade);
    poly(c,[[x+w-28,y],[x+w-28,y+22],[x+w-6,y+22]],C.paperLight);
    text(c,'个人简历',x+32,y+43,27,C.paperInk,'left',600);
    text(c,'候选人 A',x+33,y+82,18,C.paperInk);
    rect(c,x+34,y+109,w-72,2,'#b3a387');
    text(c,'校园经历',x+34,y+142,17,C.paperInk,'left',500);
    text(c,'成绩 · 算法竞赛',x+34,y+168,15,'#69756c');
    rect(c,x+34,y+196,251,2,'#c5b99e');
    text(c,'项目经历',x+34,y+224,17,C.paperInk,'left',500);
    text(c,'课程后台管理项目',x+34,y+250,15,'#69756c');
    rect(c,x+34,y+278,290,2,'#c5b99e');
    // The small corner marks are document layout, never a verdict on the paper.
    rect(c,x+34,y+295,58,3,'#acb5a1');rect(c,x+100,y+295,30,3,'#c0b497');
  }

  function stampObject(c,state){
    const {x,y}=state.stamp;
    c.save();c.translate(x,y);
    // Solid wood grip, with stepped contour instead of a smooth vector knob.
    poly(c,[[-24,-149],[21,-149],[31,-139],[35,-123],[30,-108],[18,-99],[15,-73],[-16,-73],[-19,-99],[-31,-111],[-35,-127],[-31,-140]],C.edge);
    poly(c,[[-22,-146],[19,-146],[28,-136],[31,-123],[26,-111],[15,-102],[11,-70],[-12,-70],[-15,-102],[-27,-113],[-31,-127],[-27,-137]],'#7b4b32');
    rect(c,-19,-141,32,7,'#b47c4d');rect(c,-26,-131,7,14,'#a66f43');
    rect(c,-8,-106,7,36,'#b27a48');rect(c,11,-98,5,25,'#563724');
    line(c,[[-18,-137],[5,-137],[15,-130]],'#d2a36a',2);
    line(c,[[20,-120],[18,-111],[7,-107]],'#583826',3);
    // Collar joins handle to the very same stamp block throughout the move.
    rect(c,-26,-78,52,15,C.edge);rect(c,-23,-76,46,10,C.brass);
    rect(c,-20,-75,40,3,C.gold);rect(c,-18,-66,36,6,'#685434');
    poly(c,[[-83,-58],[-70,-70],[71,-70],[83,-58],[83,-17],[73,-5],[-72,-5],[-83,-16]],C.edge);
    poly(c,[[-79,-56],[-67,-66],[67,-66],[79,-56],[67,-47],[-66,-47]],'#aa774a');
    rect(c,-79,-53,158,39,'#67432f');rect(c,-75,-51,150,4,'#bd8c57');
    rect(c,-79,-47,5,29,'#8b5d3b');rect(c,73,-50,6,33,'#432e25');
    rect(c,-54,-43,108,24,'#d2b78c');rect(c,-51,-40,102,18,'#e4cda8');
    text(c,'不合格',0,-31,18,'#7c4038','center',600);
    // The red rubber is part of the physical stamp, not a mark on the CV.
    rect(c,-72,-14,144,7,'#4d302d');rect(c,-69,-7,138,7,C.red);
    rect(c,-65,-6,130,2,'#d48a7c');rect(c,-72,-2,144,2,'#7e4440');
    c.restore();
  }

  function armAndPalm(c,state){
    const {gripX:x,gripY:y}=state.hand;
    // One connected forearm enters from the right, follows the held object,
    // then moves out as a whole after the stamp touches its resting place.
    poly(c,[[x+27,y+4],[988,y+92],[988,y+160],[x+27,y+48]],C.edge);
    poly(c,[[x+36,y+8],[988,y+100],[988,y+153],[x+34,y+42]],'#3b5662');
    poly(c,[[x+46,y+17],[988,y+109],[988,y+120],[x+43,y+26]],'#58727b');
    poly(c,[[x+26,y+3],[x+51,y+10],[x+46,y+51],[x+20,y+43]],'#b9b4a0');
    poly(c,[[x+31,y+7],[x+45,y+12],[x+41,y+43],[x+26,y+39]],'#e1d9be');
    poly(c,[[x+4,y-16],[x+24,y-17],[x+36,y-8],[x+37,y+24],[x+23,y+38],[x+4,y+29],[x-8,y+11],[x-8,y-5]],'#815b44');
    poly(c,[[x+3,y-13],[x+21,y-14],[x+31,y-7],[x+32,y+21],[x+22,y+31],[x+5,y+24],[x-3,y+9],[x-3,y-4]],'#c59b74');
    rect(c,x+5,y-10,14,5,'#e2ba8c');
  }

  function fingers(c,state){
    const {gripX:x,gripY:y}=state.hand;
    // Fingers cover the front edge of the wooden grip, while the palm remains
    // behind it. No detached hand or independently moving stamp copy is drawn.
    poly(c,[[x-14,y-8],[x+5,y-11],[x+14,y-6],[x+13,y+1],[x-8,y+4],[x-17,y]],'#8e6349');
    poly(c,[[x-13,y-7],[x+4,y-9],[x+11,y-5],[x+10,y-1],[x-8,y+2],[x-15,y-1]],'#d4aa7e');
    poly(c,[[x-9,y+5],[x+13,y+2],[x+20,y+7],[x+17,y+14],[x-3,y+16],[x-12,y+12]],'#b88762');
    line(c,[[x-6,y+8],[x+11,y+6]],'#e5bc8e',2);
    line(c,[[x+5,y+16],[x+21,y+12]],'#8b6148',2);
  }

  function draw(ctx,options={}){
    const state=stateAt(options.time===undefined?0:options.time);
    D.withFrame(ctx,options,()=>{
      resume(ctx);
      // A resting pad is an object belonging to this study, not a background.
      D.shadow(ctx,667,433,175,14,.21);
      poly(ctx,[[662,418],[826,418],[846,438],[682,438]],'#24353a');
      line(ctx,[[664,419],[825,419],[844,438]],'#8d7853',2);
      const transfer=state.withdraw;
      const shadowX=mix(PAPER.contactX,REST.x,transfer);
      const shadowY=mix(PAPER.contactY,REST.y+2,transfer);
      D.shadow(ctx,shadowX-77,shadowY,154,15,mix(.14,.36,state.approach));
      armAndPalm(ctx,state);
      stampObject(ctx,state);
      fingers(ctx,state);
    });
  }

  const api=Object.freeze({id:'object.judgment-stamp.v1',duration:DURATION,events:EVENTS,draw,stateAt});
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.PixelJudgmentStamp=api;
})(typeof globalThis!=='undefined'?globalThis:this);
