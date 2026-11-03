/* A fixed-view form task: reproduce a defect, add one rule, retry the same task. */
(function(root){
  'use strict';
  const D=typeof module==='object'&&module.exports?require('./drawing.js'):root.PixelInterviewDrawing;
  const {C,rect,poly,line,text,paper,shadow,mix,range,clamp}=D;
  const duration=7.4;
  const events=Object.freeze({
    ready:0,firstSubmit:.55,issue:.90,patchStart:2.15,patchContact:2.53,patchSettled:2.63,
    retryStart:3.45,invalidRejected:3.80,fillStart:4.80,nameFilled:5.15,
    validSubmit:5.75,success:6.10,end:duration
  });
  const source=Object.freeze({x:765,y:346});
  const destination=Object.freeze({x:513,y:414});
  const moduleSize=Object.freeze({width:144,height:60});
  const taskId='club-signup-required-name';

  function submit({validationInstalled=false,name='',records=[]}={}){
    if(typeof validationInstalled!=='boolean'||typeof name!=='string'||!Array.isArray(records)){
      throw new TypeError('submit expects a boolean rule, a string name and a records array');
    }
    const normalized=name.trim();
    if(validationInstalled&&!normalized){
      return {accepted:false,error:'请填写姓名',invalid:true,records:records.slice()};
    }
    const entry={id:'entry-'+(records.length+1),name:normalized,invalid:!normalized};
    return {accepted:true,error:null,invalid:entry.invalid,records:[...records,entry]};
  }

  function modulePosition(progress){
    const p=clamp(progress);
    return {
      x:mix(source.x,destination.x,p),
      y:mix(source.y,destination.y,p)-Math.sin(p*Math.PI)*42,
      width:moduleSize.width,height:moduleSize.height
    };
  }

  function animationState(time){
    const t=D.finiteTime(time,duration);
    const patchProgress=range(t,events.patchStart,events.patchContact);
    const moduleOwnership=t<events.patchStart?'source':t<events.patchContact?'in-flight':'installed';
    const validationInstalled=moduleOwnership==='installed';
    const invalidInputRejected=t>=events.invalidRejected;
    const validSubmissionAccepted=t>=events.success;
    let phase='ready',label='试做：空表提交';
    if(t>=events.issue){phase='issue';label='发现缺口：空姓名也被收下';}
    if(t>=events.patchStart){phase='patching';label='补足缺口：装入必填校验';}
    if(t>=events.patchSettled){phase='retry';label='回到同一张报名表';}
    if(t>=events.invalidRejected){phase='rejected';label='复试：空提交被挡住';}
    if(t>=events.fillStart){phase='filling';label='填写姓名，再试一次';}
    if(t>=events.validSubmit){phase='submitting';label='提交完整报名信息';}
    if(validSubmissionAccepted){phase='complete';label='完成：有效报名已保存';}
    const name=t<events.fillStart?'':t<events.fillStart+.175?'同':'同学';
    const firstResult=t>=events.issue&&t<events.patchStart?submit({name:''}):null;
    const result=validSubmissionAccepted?submit({validationInstalled:true,name}):
      invalidInputRejected?submit({validationInstalled:true,name:''}):firstResult;
    // The obsolete empty entry is discarded when the rule is installed. Only the
    // final successful retry enters the retained record set used by this study.
    const records=validSubmissionAccepted?result.records:[];
    return {
      time:t,phase,label,taskId,validationInstalled,invalidInputRejected,validSubmissionAccepted,
      legacySubmissionAccepted:!!firstResult,records,name,result,moduleCount:1,moduleOwnership,
      patchProgress,module:modulePosition(patchProgress),
      buttonPressed:[events.firstSubmit,events.retryStart,events.validSubmit]
        .some(start=>t>=start&&t<start+.35),
      showPointer:t>=events.firstSubmit-.15&&t<events.success+.2,
      manual:false
    };
  }

  function stateAt(time,trial){
    const state=animationState(time);
    if(trial==null)return state;
    if(typeof trial!=='object'||typeof trial.name!=='string'||typeof trial.validationInstalled!=='boolean'){
      throw new TypeError('trial expects name and validationInstalled');
    }
    const records=trial.records||[];
    if(!Array.isArray(records))throw new TypeError('trial.records must be an array');
    const result=trial.result||null;
    const progress=trial.patchProgress==null?(trial.validationInstalled?1:0):trial.patchProgress;
    if(!Number.isFinite(progress)||progress<0||progress>1)throw new TypeError('patchProgress must be between 0 and 1');
    const moduleOwnership=progress===0?'source':progress<1?'in-flight':'installed';
    const rejected=!!result&&!result.accepted;
    const accepted=!!result&&result.accepted&&!result.invalid&&!!trial.name.trim();
    return {...state,manual:true,phase:accepted?'complete':rejected?'rejected':'trial',
      label:accepted?'完成：有效报名已保存':rejected?'复试：空提交被挡住':'亲手试做同一个报名任务',
      name:trial.name,validationInstalled:trial.validationInstalled,result,records:records.slice(),
      invalidInputRejected:rejected,validSubmissionAccepted:accepted,
      legacySubmissionAccepted:!!result&&result.accepted&&!!result.invalid,
      patchProgress:progress,module:modulePosition(progress),moduleOwnership,
      showPointer:false,buttonPressed:false};
  }

  function ruleCard(c,item,installed){
    const x=item.x-item.width/2,y=item.y-item.height/2;
    shadow(c,x+4,y+item.height-1,item.width-8,8,.18);
    poly(c,[[x+5,y],[x+item.width-5,y],[x+item.width,y+5],[x+item.width,y+item.height-5],
      [x+item.width-5,y+item.height],[x+5,y+item.height],[x,y+item.height-5],[x,y+5]],C.edge);
    rect(c,x+3,y+3,item.width-6,item.height-6,C.paperShade);
    rect(c,x+6,y+6,item.width-12,item.height-15,C.paper);
    rect(c,x+6,y+6,item.width-12,3,C.paperLight);
    rect(c,x+12,y+15,5,18,installed?C.green:C.brass);
    text(c,'必填校验',item.x+4,y+25,19,C.paperInk,'center',500);
    text(c,installed?'已装入':'补足这一处',item.x,y+44,12,installed?'#426c5c':'#776348','center');
    for(let i=0;i<4;i++)rect(c,x+27+i*25,y+item.height-8,14,7,C.brass);
  }

  function monitor(c,s){
    shadow(c,98,456,517,18,.35);
    poly(c,[[98,102],[113,91],[596,91],[612,107],[612,398],[596,415],[98,415],[88,403],[88,114]],C.edge);
    poly(c,[[104,105],[117,98],[590,98],[602,111],[602,397],[590,406],[102,406],[97,398],[97,116]],'#48605e');
    rect(c,109,108,480,290,'#263d43');
    rect(c,111,108,478,3,'#8c9b87');
    rect(c,117,117,468,272,C.edge);
    rect(c,124,124,454,258,'#d5d8c4');
    rect(c,127,127,448,3,'#eff0d9');
    text(c,'社团报名',149,151,22,C.paperInk,'left',500);
    text(c,'同一个任务 · 同一张表单',551,151,12,'#65766f','right');
    rect(c,149,174,402,2,'#a1b0a0');
    text(c,'姓名',149,196,16,C.paperInk);
    rect(c,149,214,402,43,'#7d9188');
    rect(c,152,217,396,37,'#f3f0d9');
    if(s.name){
      c.save();c.beginPath();c.rect(161,219,374,33);c.clip();
      text(c,s.name,165,237,20,C.paperInk);c.restore();
    }
    else text(c,'请填写姓名',165,237,17,'#9ba596');
    if(!s.manual&&s.phase==='filling')rect(c,165+(s.name.length*20),226,2,22,C.paperInk);
    const press=s.buttonPressed?2:0;
    rect(c,149,275,150,37,'#233d3b');
    rect(c,149,270+press,150,36,'#809f8e');
    rect(c,152,273+press,144,2,'#c9d9b6');
    text(c,'提交报名',224,288+press,17,'#142f31','center',500);
    rect(c,324,271,227,36,'#bfcab5');
    const count=s.records.filter(record=>!record.invalid&&String(record.name||'').trim()).length;
    text(c,'有效记录  '+count+' 条',437,289,16,'#455e55','center');
    let message='先试一次空表提交',color='#6c7e72';
    if(s.manual)message=s.validationInstalled?'校验已就位，试试空提交':'校验尚未安装，试试空提交';
    if(s.legacySubmissionAccepted){message='问题：空姓名也被收下了';color=C.red;}
    else if(s.validSubmissionAccepted){message='报名成功，已保存有效记录';color='#3f735c';}
    else if(s.invalidInputRejected&&!s.name.trim()){message='请填写姓名';color='#a4584f';}
    else if(s.name.trim()&&s.validationInstalled){message=s.phase==='submitting'?'正在提交完整报名信息':'姓名已填写，再提交一次';color='#526f60';}
    else if(s.validationInstalled){message='校验已补足，回原任务复试';color='#526f60';}
    text(c,message,149,340,16,color);
    text(c,'报名信息完整后再提交',149,365,12,'#718173');
    rect(c,302,415,84,32,'#283d42');rect(c,307,416,5,29,'#738477');
    poly(c,[[268,444],[423,444],[445,454],[445,464],[247,464],[247,454]],'#192d33');
    rect(c,263,448,167,4,'#667b73');
    // The slot belongs to this terminal. Its near lip is drawn after the same
    // travelling module, so it occludes the lower edge only after insertion.
    rect(c,432,382,160,70,C.edge);rect(c,437,387,150,61,'#5f7166');
    rect(c,444,391,136,52,'#14282c');rect(c,447,391,130,3,'#a3b19a');
    for(const x of [450,566])rect(c,x,398,3,34,'#596f65');
    rect(c,598,147,5,22,C.brass);rect(c,598,180,5,9,C.paperShade);
    if(s.showPointer)pointer(c,267,293,s.buttonPressed);
  }

  function pointer(c,x,y,pressed){
    const o=pressed?2:0;
    poly(c,[[x,y+o],[x,y+25+o],[x+7,y+18+o],[x+13,y+28+o],[x+19,y+24+o],[x+13,y+15+o],[x+24,y+15+o]],C.edge);
    poly(c,[[x+3,y+5+o],[x+3,y+19+o],[x+8,y+14+o],[x+15,y+24+o],[x+15,y+22+o],[x+9,y+12+o],[x+17,y+12+o]],C.paperLight);
  }

  function ticket(c,s){
    paper(c,650,114,237,291,{accent:C.brass});
    rect(c,717,101,102,22,C.edge);rect(c,721,104,94,15,C.brass);
    rect(c,736,108,64,3,C.gold);
    text(c,'试做工单',674,153,21,C.paperInk,'left',500);
    line(c,[[673,174],[860,174]],'#b2a17e',2);
    text(c,'目标',674,196,13,'#8c7657');text(c,'空表不该提交',674,220,19,C.paperInk);
    text(c,'发现的缺口',674,254,13,'#8c7657');
    text(c,'缺少必填校验',674,280,18,s.validationInstalled?'#63795f':'#a75d52');
    if(s.validationInstalled){
      line(c,[[674,303],[860,303]],'#b9ab8b',1);
      text(c,'补足后回原任务重试',674,329,16,'#486c57');
      const verification=s.validSubmissionAccepted?'已验证：有效报名已保存':
        s.invalidInputRejected?'已验证：空值被挡住':'复试目标：空值被挡住';
      text(c,verification,674,359,14,'#61735f');
    }else{
      text(c,'只补足眼前这一处',674,308,13,'#8a7b61');
    }
    rect(c,673,384,188,3,'#c4b58f');
  }

  function draw(ctx,options={}){
    const s=stateAt(options.time==null?0:options.time,options.trial);
    D.withFrame(ctx,options,()=>{
      ticket(ctx,s);monitor(ctx,s);
      ruleCard(ctx,s.module,s.moduleOwnership==='installed');
      // Only the portion of the rule physically inside the socket meets its lip.
      rect(ctx,438,441,148,8,'#253c40');rect(ctx,442,441,140,3,'#9aa68c');
      rect(ctx,438,449,148,3,C.edge);
      text(ctx,s.validationInstalled?'必填校验已就位':'待补：必填校验',513,480,15,s.validationInstalled?C.green:C.muted,'center');
    });
    return s;
  }

  const api=Object.freeze({id:'object.task-workbench.v1',duration,events,draw,stateAt,submit});
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.PixelTaskWorkbench=api;
})(typeof globalThis!=='undefined'?globalThis:this);
