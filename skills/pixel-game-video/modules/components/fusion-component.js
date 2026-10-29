/* Approved fixed-view energy / actuator / assembly component. No background or UI ownership. */
(function(root){'use strict';
const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>1-Math.pow(1-x,3),q=x=>Math.round(x);
const C={edge:'#081319',dark:'#182e35',mid:'#344d52',light:'#688080',brass:'#b98142',gold:'#e7b666',shine:'#ffe0a0',mint:'#9ed8c1',cyan:'#61b9c2'};
function rect(c,x,y,w,h,color){c.fillStyle=color;c.fillRect(q(x),q(y),q(w),q(h))}function poly(c,pts,color){c.fillStyle=color;c.beginPath();pts.forEach((p,i)=>i?c.lineTo(q(p[0]),q(p[1])):c.moveTo(q(p[0]),q(p[1])));c.closePath();c.fill()}
function text(c,s,x,y,size=12,color=C.shine,align='center'){c.fillStyle=color;c.font=`${size}px "Microsoft YaHei",sans-serif`;c.textAlign=align;c.fillText(s,q(x),q(y))}
function metal(c,x,y,w,h){rect(c,x-3,y-3,w+6,h+6,C.edge);rect(c,x,y,w,h,C.brass);rect(c,x+3,y+3,w-6,h-6,C.dark);rect(c,x,y,w,2,C.shine);rect(c,x,y,2,h,C.gold);rect(c,x+3,y+h-5,w-3,5,'#573c2a');for(const [a,b]of[[x+7,y+7],[x+w-9,y+7],[x+7,y+h-9],[x+w-9,y+h-9]]){rect(c,a-2,b-2,5,5,C.edge);rect(c,a,b,2,2,C.gold)}}
function glow(c,x,y,r,col,alpha=.3){c.save();c.globalAlpha=alpha;const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,col);g.addColorStop(1,'transparent');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);c.restore()}
const TOTAL=4.5,cycle=.98,begin=.25;
function stateAt(t){const items=[];for(let i=0;i<3;i++){const l=t-begin-i*cycle;items.push({id:i,local:l,phase:l<0?'source':l<.30?'incoming':l<.50?'processing':l<.80?'outgoing':'installed'})}return items}
function arc(a,b,p,h){const s=ease(clamp(p));return{x:a.x+(b.x-a.x)*s,y:a.y+(b.y-a.y)*s-Math.sin(Math.PI*s)*h}}
function itemPos(item){const start={x:109,y:148+item.id*23},middle={x:242,y:164},end={x:359,y:194-item.id*24};if(item.phase==='source')return start;if(item.phase==='incoming')return arc(start,middle,item.local/.30,45);if(item.phase==='processing')return middle;if(item.phase==='outgoing')return arc(middle,end,(item.local-.50)/.30,39);const settle=clamp((item.local-.80)/.10);return{x:end.x,y:end.y-Math.sin(settle*Math.PI)*2}}
function unit(c,x,y,id,done){const w=58;poly(c,[[x-29,y],[x-19,y-7],[x+39,y-7],[x+29,y]],'#87978a');poly(c,[[x+29,y],[x+39,y-7],[x+39,y+10],[x+29,y+17]],'#29434d');rect(c,x-29,y,58,17,'#4c6870');rect(c,x-27,y+2,54,2,'#b0bca5');rect(c,x-24,y+6,48,7,'#1a3540');for(let k=0;k<4;k++)rect(c,x-20+k*9,y+8,5,2,'#6a918c');rect(c,x+20,y+7,3,4,done?C.mint:C.brass);rect(c,x-27,y+15,54,2,done?C.gold:'#6f7f71');text(c,String(id+1),x+13,y+11,6,'#d5d3b6')}
function line(c,pts,color,width=2){c.strokeStyle=color;c.lineWidth=width;c.lineJoin='miter';c.beginPath();pts.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.stroke()}
function fusion(c,t){const items=stateAt(t),active=items.find(a=>a.local>=0&&a.local<.9),l=active?active.local:-1;
 // Shared base anchors the input, press and output to the same world.
 poly(c,[[58,216],[78,204],[412,204],[393,224]],'#577070');poly(c,[[58,216],[393,224],[393,232],[58,224]],'#273e49');poly(c,[[393,224],[412,204],[412,213],[393,232]],'#1c303b');
 rect(c,72,224,18,7,C.dark);rect(c,369,229,18,7,C.dark);
 // Input bed and the three actual modules; each is drawn only once below.
 rect(c,70,209,88,5,C.edge);rect(c,75,207,78,2,C.brass);text(c,'待装配',107,246,9,'#b1c4b9');
 // Output guide and docking rails.
 rect(c,323,207,81,5,C.edge);rect(c,327,205,73,2,C.brass);rect(c,397,121,4,84,'#496469');rect(c,399,121,2,84,'#7c928b');
 for(let i=0;i<3;i++){rect(c,391,198-i*24,9,2,'#6c8985');text(c,String(i+1),411,203-i*24,7,'#a4bcb3')}
 // Energy source: liquid pulses and a travelling charge feed the actuator.
 const charge=l<0?0:l<.30?ease(l/.30):l<.50?1-(l-.30)/.20:0;
 rect(c,136,89,25,76,C.edge);rect(c,140,94,17,64,'#16323c');rect(c,142,151-40*charge,13,6+40*charge,'#489bab');rect(c,143,151-40*charge,11,2,C.mint);rect(c,141,96,2,55,'#c5e4cb60');metal(c,133,84,31,9);metal(c,133,158,31,9);
 line(c,[[161,110],[178,110],[178,90],[239,90]],'#0a1a22',6);line(c,[[161,110],[178,110],[178,90],[239,90]],'#4d777a',2);
 if(l>=0&&l<.50){line(c,[[161,110],[178,110],[178,90],[239,90]],C.cyan,2);glow(c,150,133,33,C.cyan,charge*.23)}
 // Linear actuator: no gears. The ram makes actual contact with the same travelling part.
 rect(c,190,90,9,115,'#344e5c');rect(c,194,92,2,110,'#83958b');rect(c,283,90,9,115,'#344e5c');rect(c,284,92,2,110,'#83958b');metal(c,184,75,114,24);
 let press=0;if(l>=.30&&l<.40)press=ease((l-.30)/.10);else if(l>=.40&&l<.50)press=1-ease((l-.40)/.10);
 rect(c,232,99,18,22+press*40,'#253e49');rect(c,235,99,3,20+press*40,'#b0beb2');const headY=107+press*40;rect(c,208,headY,68,17,'#425c63');rect(c,208,headY,68,2,'#a4b3a2');rect(c,211,headY+13,62,4,C.brass);rect(c,221,headY+3,42,3,'#213a44');
 rect(c,185,195,113,11,'#1b3540');rect(c,192,194,99,2,C.brass);rect(c,207+press*3,178,8,14,'#6b7d75');rect(c,269-press*3,178,8,14,'#6b7d75');
 // Source, moving and installed identities are mutually exclusive.
 for(const a of items){const p=itemPos(a);unit(c,p.x,p.y,a.id,a.phase==='outgoing'||a.phase==='installed')}
 if(l>=.40&&l<.50){const flash=1-(l-.40)/.10;glow(c,242,170,46,C.gold,flash*.5);rect(c,215,180,54,2,C.shine)}
 if(l>=.80&&l<.90){const p=itemPos(active),fade=1-(l-.80)/.10;glow(c,p.x,p.y+16,34,C.gold,fade*.4);rect(c,p.x-27,p.y+16,54,1,C.shine)}
 const installed=items.filter(a=>a.phase==='installed').length;
 text(c,'线性加工 / 活塞接触',241,66,9,'#bdd0c2');text(c,'供能',149,77,8,'#93bab5');text(c,'装配结果',360,246,9,'#b1c4b9');
 text(c,installed+' / 3 层',360,91,16,C.shine);
 const stage=!active?(installed===3?'装配完成':'等待触发'):active.phase==='incoming'?'供能 · 模块送入':active.phase==='processing'?'活塞加工 · 接触反馈':active.phase==='outgoing'?'移交 · 进入装配槽':'落位 · 接缝锁定';
 text(c,stage,240,42,11,'#d3dbbd');
}

function timeValue(time){if(!Number.isFinite(time))throw new TypeError('time must be finite');return Math.max(0,Math.min(TOTAL,time))}
function draw(ctx,options={}){const {time=0,x=0,y=0,width=960,height=540}=options;if(![x,y,width,height].every(Number.isFinite)||width<=0||height<=0)throw new TypeError('Invalid draw rectangle');const t=timeValue(time);ctx.save();try{ctx.translate(x,y);ctx.scale(width/480,height/270);ctx.imageSmoothingEnabled=false;fusion(ctx,t)}finally{ctx.restore()}}
const api=Object.freeze({id:'object.energy-actuator-assembly.v1',duration:TOTAL,draw,stateAt:time=>stateAt(timeValue(time)),itemPos});
if(typeof module==='object'&&module.exports)module.exports=api;else root.PixelEnergyAssembly=api;
})(typeof globalThis!=='undefined'?globalThis:this);
