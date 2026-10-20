// Illustrations carry the scene; sparse event annotations explain their state.
// Labels and frame anchors are read from the four authoring sources.
const canvas=document.querySelector('canvas'),g=canvas.getContext('2d');
const C={bg:'#0a1221',panel:'#122536',inset:'#0b1726',line:'#547184',ink:'#edf5f8',muted:'#b9cad3',mint:'#79edcf',gold:'#ffc87a',blue:'#94b5ff',red:'#ee927e'};
let data,art;
const clamp=x=>Math.max(0,Math.min(1,x));
const ease=x=>{x=clamp(x);return x*x*(3-2*x)};
const mix=(a,b,p)=>a+(b-a)*p;
function rect(x,y,w,h,c){g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))}
function line(x,y,X,Y,c=C.line,w=2){g.strokeStyle=c;g.lineWidth=w;g.beginPath();g.moveTo(x,y);g.lineTo(X,Y);g.stroke()}
function txt(v,x,y,size=20,c=C.ink,align='left',weight=500){g.save();g.shadowColor='#030a12';g.shadowBlur=4;g.shadowOffsetY=2;g.fillStyle=c;g.font=`${weight} ${size}px "Microsoft YaHei",sans-serif`;g.textAlign=align;g.textBaseline='middle';g.fillText(v,x,y);g.restore()}
function T(key,x,y,size=20,c=C.ink,align='left',weight=500){txt(data.labels[key],x,y,size,c,align,weight)}
function box(x,y,w,h,accent=C.line,fill='#0b1726e8'){rect(x+4,y+4,w,h,'#030a1277');rect(x,y,w,h,accent);rect(x+2,y+2,w-4,h-4,fill)}
function pill(key,x,y,w,color=C.mint){rect(x,y,w,28,color);T(key,x+w/2,y+14,15,C.bg,'center',700)}
function file(x,y,s=1,color=C.mint){g.save();g.translate(Math.round(x),Math.round(y));g.scale(s,s);rect(-22,-29,44,58,C.inset);rect(-22,-29,33,3,color);rect(-22,-29,3,58,color);rect(-22,26,44,3,color);rect(19,-17,3,46,color);rect(11,-29,3,12,color);rect(11,-17,11,3,color);for(let i=0;i<4;i++)rect(-12,-10+i*8,24-(i%2)*8,2,color);g.restore()}
function check(x,y,c=C.mint){g.strokeStyle=c;g.lineWidth=3;g.beginPath();g.moveTo(x-7,y);g.lineTo(x-2,y+5);g.lineTo(x+9,y-7);g.stroke()}
function arrow(x,y,X,Y,c=C.mint){line(x,y,X,Y,c,2);const a=Math.atan2(Y-y,X-x);line(X,Y,X-8*Math.cos(a-.6),Y-8*Math.sin(a-.6),c);line(X,Y,X-8*Math.cos(a+.6),Y-8*Math.sin(a+.6),c)}
function head(index,dim=.12){
 g.imageSmoothingEnabled=false;g.drawImage(art[index],0,0,960,540);rect(0,0,960,540,`rgba(3,10,20,${dim})`);
 const gradient=g.createLinearGradient(0,0,470,0);gradient.addColorStop(0,'#07121baa');gradient.addColorStop(1,'#07121b00');g.fillStyle=gradient;g.fillRect(0,65,470,392);
 // The engine owns the fixed narrative bar. No page counter or series masthead.
}
function title(a,b){T(a,48,105,30,C.ink,'left',700);if(b)T(b,48,148,30,C.gold,'left',700)}
function name(key){T(key,182,441,15,C.gold,'center',600)}
function s1(f,e){head(0);title('topic','topic2');name('amo');if(f>=e.question){const p=ease((f-e.question)/12);g.globalAlpha=p;box(278,214-7*(1-p),48,48,C.gold);txt('?',302,238-7*(1-p),34,C.gold,'center',700);g.globalAlpha=1}if(f>=e.generate)T('generated',691,410,18,C.mint,'center',600)}
function s2(f,e){head(0);title('compress');name('azong');
 const names=['template','format','boilerplate'];names.forEach((key,k)=>{const at=e['task'+(k+1)],p=ease((f-at)/34);if(p<1){g.globalAlpha=1-p;const x=mix(439,663,p),y=mix(240+k*42,290,p);box(x-61,y-15,122,30,C.gold);T(key,x,y,15,C.ink,'center');g.globalAlpha=1}if(f>=at+28){const q=ease((f-at-28)/20);file(mix(702,820+k*23,q),mix(320,370+k*12,q),.48,C.mint)}});
 if(f>=e.settle)pill('generatedDone',726,417,172,C.mint);
}
function s3(f,e){head(1);title('productQuestion');T('demo',912,86,12,C.muted,'right');
 const click=f>=e.click;box(62,178,192,42,click?C.line:C.mint);T('submit',158,199,18,click?C.muted:C.mint,'center',600);
 if(click){T('singleSubmit',158,248,20,C.gold,'center',600);arrow(267,210,609,196,C.gold)}
 if(f>=e.duplicate){const p=ease((f-e.duplicate)/14);g.globalAlpha=p;[[649,264],[797,264]].forEach(([x,y])=>{g.strokeStyle=C.red;g.lineWidth=3;g.strokeRect(x,y,93,87);box(x-10,y+93,113,28,C.red);T('order',x+47,y+107,14,C.ink,'center')});T('duplicate',691,429,23,C.red,'center',700);g.globalAlpha=1}
}
function s4(f,e){head(1,.49);T('responsibility',480,112,30,C.ink,'center',700);T('demo',912,86,12,C.muted,'right');
 const items=[['need','requirements','requirementsDetail',235,C.gold],['data','data','dataDetail',480,C.blue],['debug','debug','debugDetail',725,C.red]];
 items.forEach(([ev,key,detail,x,c],k)=>{if(f<e[ev])return;const p=ease((f-e[ev])/18);g.globalAlpha=p;line(x,270,480,340,c);box(x-96,182-6*(1-p),192,88,c);T(key,x,207,23,C.ink,'center',700);T(detail,x,244,16,C.muted,'center');g.globalAlpha=1});
 box(350,340,260,70,C.mint);T('app',480,362,22,C.ink,'center',600);T('productQuestion',480,391,15,C.red,'center');
}
function s5(f,e){head(2);title('repair');name('azong');
 if(f>=e.test){const p=clamp((f-e.test)/(e.check2-e.test));g.save();g.globalAlpha=.14;rect(560,180,100+120*p,3,C.mint);g.restore()}
 [['case1','check1',414],['case2','check2',445]].forEach(([key,ev,y])=>{const done=f>=e[ev];rect(371,y-10,20,20,done?C.mint:C.line);if(done)check(381,y,C.bg);T(key,408,y,18,done?C.ink:C.muted)});
 if(f>=e.check2)pill('pass',760,83,150,C.mint);
}
function s6(f,e){head(2,.05);title('ending');T('delivery',48,151,22,C.ink,'left',600);name('azong');
 const xs=[535,690,845],keys=['compile','verify','deliver'],ev=['generate','verify','deliver'];
 xs.forEach((x,k)=>{const active=f>=e[ev[k]];T(keys[k],x,111,20,active?C.mint:C.muted,'center',600);if(k<2)arrow(x+37,111,x+116,111,active?C.mint:C.line)});
 if(f>=e.result){const p=ease((f-e.result)/18);g.globalAlpha=p;box(390,411+6*(1-p),506,38,C.mint);check(414,430);T('correct',445,430+6*(1-p),19,C.ink);g.globalAlpha=1}
}
window.setup=async input=>{data=input;art=await Promise.all(input.illustrations.map(async src=>{const im=new Image();im.src=src;await im.decode();return im}));await document.fonts.ready};
window.drawShot=(index,frame)=>{g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,960,540);const s=data.shots[index-1],e=Object.fromEntries(s.events.map(x=>[x.id,x.frame]));[s1,s2,s3,s4,s5,s6][index-1](frame,e);return canvas.toDataURL('image/png').split(',')[1]};
