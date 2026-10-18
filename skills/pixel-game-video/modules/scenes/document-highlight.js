(function(P){
  'use strict';
  // Document coordinates below are illustrative, never an implementation of WPS APIs.
  P.documentHighlight={draw(e,shot,frame){
    const g=e.ctx,w=e.width,h=e.height,c=e.colors,a=shot.params,L=a.labels;
    const stage=a.stageEvents.filter(id=>frame>=P.scenes.eventFrame(shot,id)).length;
    const active=Math.max(0,stage-1),local=frame-shot.startFrame;
    const last=a.stageEvents[Math.max(0,stage-1)];
    const p=P.ease((frame-P.scenes.eventFrame(shot,last))/(e.fps*.45));
    const actor=Boolean(shot.actor),left=actor?.355:.075,right=.935,W=right-left,cx=(left+right)/2;
    const R=(x,y,rw,rh,color)=>{g.fillStyle=color;g.fillRect(x*w,y*h,rw*w,rh*h);};
    const T=(s,x,y,size=.029,color=c.ink,mw=.8,align='center')=>P.text.draw(e,s,x*w,y*h,size*h,color,mw*w,align);
    const panel=(x,y,pw,ph,edge=c.edge)=>{
      R(x+.004,y+.007,pw,ph,'#050c16');R(x,y,pw,ph,edge);R(x+.002,y+.004,pw-.004,ph-.008,'#102334');
      R(x+.002,y+.004,pw-.004,.004,'#476075');
    };
    const arrow=(x1,y1,x2,y2,color=c.accent)=>{
      g.save();g.strokeStyle=color;g.fillStyle=color;g.lineWidth=4;
      g.beginPath();g.moveTo(x1*w,y1*h);g.lineTo(x2*w,y2*h);g.stroke();
      const angle=Math.atan2((y2-y1)*h,(x2-x1)*w),x=x2*w,y=y2*h;
      g.beginPath();g.moveTo(x,y);g.lineTo(x-14*Math.cos(angle-.5),y-14*Math.sin(angle-.5));g.lineTo(x-14*Math.cos(angle+.5),y-14*Math.sin(angle+.5));g.fill();g.restore();
    };
    const badge=(text,x,y,bw,color=c.accent)=>{R(x-bw/2,y-.023,bw,.046,'#071622');T(text,x,y,.023,color,bw-.012);};
    const check=(x,y,ok)=>{
      const col=ok?c.accent:c.danger;
      R(x-.016,y-.025,.032,.05,col);T(ok?'✓':'×',x,y,.032,'#0a1624',.04);
    };
    const page=(x,y,pw,ph,highlight=false,masked=true)=>{
      R(x+.007,y+.012,pw,ph,'#050c16');R(x,y,pw,ph,'#eee6cf');R(x+.006,y+.01,.006,ph-.02,'#d6c6a4');
      T(L.contract,x+pw/2,y+.043,.028,'#253842',pw-.025);
      R(x+.022,y+.078,pw-.044,.003,'#baa987');
      for(let i=0;i<4&&.135+i*.051<ph-.025;i++){R(x+.025,y+.112+i*.051,pw-.05-(i%2)*.035,.005,'#b0ac9c');R(x+.025,y+.124+i*.051,(pw-.05)*.72,.003,'#d0c4aa');}
      const fy=y+.17;
      R(x+.023,fy-.024,pw-.046,.05,highlight?'#f6c55f':'#eee6cf');
      T(masked?L.target:L.rawPhone,x+pw/2,fy,Math.min(.032,(pw-.047)*.23),'#263641',pw-.047);
      if(ph>.31){T(masked?L.identity:L.rawIdentity,x+pw/2,y+.286,.022,'#34454e',pw-.045);}
      R(x+pw-.028,y+ph-.031,.012,.012,'#b8aa8c');
    };
    // Text and the presenter occupy separate columns; the world remains full-frame.
    R(left-.02,.057,W+.04,.143,'#0b1725');R(left-.02,.057,.006,.143,c.gold);
    T(a.heading,cx,.106,actor?.039:.046,c.ink,W-.03);
    T(a.kicker,cx,.166,.024,c.muted,W-.01);

    function indexRail(y,doc,selected,ok=false){
      const chars=doc?['↵','¶',...L.target]:[...L.target];
      const x=left+.06,railW=W-.12,cell=railW/13;
      T(doc?L.document:L.plain,left+.02,y-.055,.026,c.muted,W,'left');
      chars.forEach((char,i)=>{
        const px=x+i*cell,hidden=doc&&i<2;
        R(px,y,cell-.003,.074,hidden?'#35405c':'#172f42');
        T(char,px+cell/2,y+.036,.032,hidden?c.secondary:c.ink,cell-.004);
        T(String(100+i),px+cell/2,y+.099,.018,c.muted,cell-.002);
      });
      if(selected!==null){
        const sx=x+selected*cell,sw=cell*11-.003,col=ok?c.accent:c.danger;
        g.save();g.strokeStyle=col;g.lineWidth=4;g.strokeRect(sx*w,y*h,sw*w,.074*h);g.restore();
        R(sx,y+.077,sw,.004,col);
      }
      return {x,cell};
    }
    function pipeline(){
      const names=[L.search,L.locate,L.range,L.highlight],gap=.017,bw=(W-gap*3)/4,y=.37;
      names.forEach((name,i)=>{
        const x=left+i*(bw+gap),done=active>=i;
        panel(x,y,bw,.23,done?c.accent:c.edge);
        T(String(i+1).padStart(2,'0'),x+bw/2,y+.049,.024,done?c.accent:c.muted,bw-.01);
        T(name,x+bw/2,y+.112,.03,done?c.ink:c.muted,bw-.016);
        if(done)check(x+bw/2,y+.184,true);
        if(i<3)arrow(x+bw+.002,y+.11,x+bw+gap-.002,y+.11,done?c.accent:c.edge);
      });
      if(active>=1)badge(L.target,cx,.68,W*.46,c.gold);
      if(active>=3)T(L.success,cx,.755,.029,c.accent,W);
    }
    function verification(failed){
      panel(left,.25,W,.43);
      T(L.theory+' 100',left+W*.25,.315,.029,c.gold,W*.42);
      T(L.check,left+W*.72,.315,.029,c.ink,W*.45);
      arrow(left+W*.43,.315,left+W*.49,.315,c.gold);
      badge(L.target,left+W*.27,.432,W*.40,c.gold);
      badge(failed?'↵¶138****12':L.target,left+W*.73,.432,W*.40,failed?c.danger:c.accent);
      T(failed?'≠':'=',cx,.432,.047,failed?c.danger:c.accent,.06);
      if(active>=1){check(cx,.547,!failed);T(failed?L.no:L.yes,cx,.611,.028,failed?c.danger:c.accent,W*.7);}
      if(active>=2){arrow(cx,.68,cx,.725,failed?c.gold:c.accent);badge(failed?L.fallback:L.highlight,cx,.765,W*.58,failed?c.gold:c.accent);}
    }

    if(a.phase==='intro'){
      panel(left,.265,W,.47);
      const sx=left+W*.27,sy=.49;
      R(sx-.073,sy-.115,.146,.146,'#557384');R(sx-.064,sy-.102,.128,.119,'#0b1b2b');
      R(sx-.012,sy+.032,.024,.035,'#85969b');R(sx-.047,sy+.065,.094,.009,'#758992');
      // Small, seated silhouette belongs to the screen, distinct from the presenter.
      R(sx-.021,sy-.079,.042,.047,'#a66e53');R(sx-.029,sy-.086,.058,.018,'#584633');
      R(sx-.038,sy-.028,.076,.04,'#72968b');
      T(L.candidate,sx,.65,.028,c.muted,W*.4);
      T(L.interview,left+W*.72,.37,.031,c.gold,W*.43);
      page(left+W*.58,.432,W*.27,.22,false,true);
      if(active>=1){badge(L.question,left+W*.71,.706,W*.43,c.accent);}
    }else if(a.phase==='task'){
      const pw=W*.47;
      page(left,.27,pw,.46,active>=2,true);
      panel(left+W*.55,.29,W*.45,.39);
      T(L.frontend,left+W*.775,.35,.03,c.accent,W*.38);
      T(L.preview,left+W*.775,.43,.029,c.ink,W*.37);
      T(L.highlight,left+W*.775,.51,.033,c.gold,W*.38);
      arrow(left+pw+.007,.48,left+W*.55-.01,.48,active>=1?c.accent:c.edge);
      if(active>=2){check(left+W*.775,.61,true);T(L.success,cx,.77,.027,c.accent,W);}
    }else if(a.phase==='mask'){
      const x1=left+W*.23,x2=left+W*.77;
      panel(left,.285,W*.46,.365);panel(left+W*.54,.285,W*.46,.365,c.accent);
      T(L.backend,x1,.342,.028,c.muted,W*.4);T(L.frontend,x2,.342,.028,c.accent,W*.4);
      T(L.rawPhone,x1,.432,.035,c.ink,W*.4);
      T(active>=1?L.target:L.rawPhone,x2,.432,.035,active>=1?c.gold:c.muted,W*.4);
      T(L.rawIdentity,x1,.523,.021,c.muted,W*.42);
      T(active>=2?L.identity:L.rawIdentity,x2,.523,.021,active>=2?c.gold:c.muted,W*.42);
      arrow(left+W*.47,.435,left+W*.53,.435,c.accent);
      if(active>=2)badge(L.preview,cx,.735,W*.7,c.accent);
    }else if(a.phase==='pipeline'){
      pipeline();
    }else if(a.phase==='exception'){
      panel(left,.265,W,.46);
      T(L.plain,left+W*.25,.325,.029,c.accent,W*.43);T(L.document,left+W*.75,.325,.029,c.gold,W*.43);
      T('100',left+W*.25,.47,.08,c.accent,W*.4);
      T(active>=1?'102':'100',left+W*.75,.47,.08,active>=1?c.danger:c.gold,W*.4);
      T(active>=1?'≠':'=',cx,.47,.06,active>=1?c.danger:c.muted,.08);
      if(active>=1)badge(L.mismatch,cx,.638,W*.67,c.danger);
      T(L.theory,left+W*.25,.585,.025,c.muted,W*.4);T(L.actual,left+W*.75,.585,.025,c.muted,W*.4);
    }else if(a.phase==='structure'){
      page(left,.265,W*.43,.48,false,true);
      const labels=[L.break,L.page,L.table,L.hidden],x=left+W*.54,bw=W*.46;
      labels.forEach((name,i)=>{
        const y=.294+i*.112,seen=active>=i;
        panel(x,y,bw,.08,seen?c.gold:c.edge);
        T(['↵','¶','▦','·'][i],x+.027,y+.04,.035,seen?c.gold:c.muted,.05);
        T(name,x+bw*.59,y+.04,.028,seen?c.ink:c.muted,bw*.7);
        if(seen)arrow(left+W*.43+.006,y+.04,x-.007,y+.04,c.gold);
      });
      badge(L.document,cx,.789,W*.66,c.gold);
    }else if(a.phase==='drift'){
      panel(left,.255,W,.515);
      indexRail(.345,false,0,true);
      const rail=indexRail(.56,true,0,false);
      if(active>=1){
        g.save();g.strokeStyle=c.gold;g.lineWidth=3;g.setLineDash([9,6]);
        g.strokeRect((rail.x+rail.cell*2)*w,.553*h,(rail.cell*11-.003)*w,.088*h);g.restore();
      }
      badge(active>=2?L.mismatch:L.theory+' 100 ≠ '+L.actual+' 102',cx,.742,W*.83,c.danger);
    }else if(a.phase==='verify'){
      verification(true);
    }else if(a.phase==='match'){
      verification(false);
    }else if(a.phase==='search'){
      panel(left,.25,W,.53);
      T(L.check+'  '+L.target,cx,.303,.029,c.gold,W-.03);
      const found=active>=3;
      indexRail(.405,true,active-1,found);
      const steps=[-1,0,1,2],x0=left+W*.14,dx=W*.24;
      steps.forEach((offset,i)=>{
        const x=x0+dx*i,y=.625,is=active===i,done=active>i;
        if(i<3)arrow(x+.022,y,x+dx-.022,y,done?c.accent:c.edge);
        R(x-.021,y-.028,.042,.056,is?(found?c.accent:c.gold):'#284052');
        T((offset>0?'+':'')+offset,x,y,.025,is?'#0a1624':c.muted,.06);
        T(String(100+offset),x,.686,.022,i===3&&found?c.accent:c.muted,.08);
      });
      badge(found?L.found+' · 102':active===0?L.previous:active===1?L.check:L.next,cx,.755,W*.63,found?c.accent:c.gold);
      T(L.limit,cx,.818,.021,c.muted,W);
    }else if(a.phase==='success'){
      const pw=W*.53;page(left+W*.22,.25,pw,.48,active>=1,true);
      if(active>=1){check(left+W*.83,.44,true);T(L.found,cx,.784,.029,c.accent,W);}
      if(active>=2)badge(L.success,cx,.744,W*.65,c.accent);
    }else if(a.phase==='reflection'){
      const gap=.035,bw=(W-gap)/2;
      panel(left,.29,bw,.36);panel(left+bw+gap,.29,bw,.36,active>=1?c.gold:c.edge);
      T(L.normal,left+bw/2,.36,.032,c.muted,bw-.02);
      T(L.search+' → '+L.highlight,left+bw/2,.47,.026,c.ink,bw-.03);
      T(L.experience,left+bw+gap+bw/2,.36,.032,active>=1?c.gold:c.muted,bw-.02);
      if(active>=1){T(L.why,left+bw+gap+bw/2,.47,.029,c.gold,bw-.03);T(L.fallback,left+bw+gap+bw/2,.565,.028,c.accent,bw-.03);}
      if(active>=2)badge(L.check,cx,.75,W*.6,c.accent);
    }else if(a.phase==='summary'){
      const labels=[L.normal,L.check,L.fallback],bw=W*.28,gap=W*.08;
      labels.forEach((name,i)=>{
        const x=left+i*(bw+gap),y=.345,done=active>=i;
        panel(x,y,bw,.24,done?(i===0?c.muted:i===1?c.gold:c.accent):c.edge);
        T(String(i+1).padStart(2,'0'),x+bw/2,.397,.029,c.muted,bw-.015);
        T(name,x+bw/2,.482,.035,done?c.ink:c.muted,bw-.015);
        if(i<2)arrow(x+bw+.006,.47,x+bw+gap-.006,.47,done?c.accent:c.edge);
      });
      if(active>=2){T(L.experience,cx,.69,.037,c.gold,W);T(L.why+'  →  '+L.fallback,cx,.76,.028,c.accent,W);}
    }
    // A quiet phase indicator belongs to the page, separate from subtitles.
    const stripY=.84;
    R(left,stripY,W,.003,'#2c4356');R(left,stripY,W*P.clamp(local/shot.durationFrames),.003,c.gold);
    // Short contact rebound only when an event changes visible state.
    if(stage>0&&p<1){g.save();g.globalAlpha=(1-p)*.35;R(right-.012,.211,.012,.012,c.gold);g.restore();}
  }};
})(globalThis.PixelVideo=globalThis.PixelVideo||{});
