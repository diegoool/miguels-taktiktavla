'use strict';
/* ---------- Pekare ---------- */
function toWorld(e){
  var pt=svg.createSVGPoint(); pt.x=e.clientX; pt.y=e.clientY;
  return pt.matrixTransform(world.getScreenCTM().inverse());
}
function findPlayer(id){ for(var i=0;i<state.players.length;i++) if(state.players[i].id===id) return state.players[i]; return null; }

function handleLink(id){
  if(!state.linkStart){ state.linkStart=id; }
  else if(state.linkStart===id){ state.linkStart=null; }
  else {
    var a=state.linkStart, b=id;
    var dup=state.ann.some(function(x){return x.t==='link'&&((x.a===a&&x.b===b)||(x.a===b&&x.b===a))});
    if(!dup) state.ann.push({t:'link',a:a,b:b});
    state.linkStart=null;
  }
  render();
}

svg.addEventListener('pointerdown',function(e){
  if(state.playing||(e.pointerType==='mouse'&&e.button!==0)) return;
  e.preventDefault();
  hidePop();
  var p=toWorld(e);
  var t=e.target.closest('[data-id],[data-ball],[data-aid],[data-handle]');
  var tool=state.tool;
  if(tool==='erase'){
    if(t&&t.dataset.aid!==undefined){ state.ann.splice(+t.dataset.aid,1); state.sel=null; render(); }
    return;
  }
  if(tool==='move'){
    var ta=(t&&t.dataset.aid!==undefined)?state.ann[+t.dataset.aid]:null;
    if(t&&t.dataset.handle!==undefined){
      var ha=state.ann[+t.dataset.handle], sc=toScr(ha.x,ha.y);
      resize={ann:ha,tlx:sc.x-ha.w/2,tly:sc.y-ha.h/2};
      svg.setPointerCapture(e.pointerId);
    } else if(t&&(t.dataset.id||t.dataset.ball)){
      var isBall=!!t.dataset.ball;
      var obj=isBall?state.ball:findPlayer(t.dataset.id);
      if(!obj) return;
      if(state.sel!==null){ state.sel=null; render(); }
      drag={obj:obj,isPlayer:!isBall,ox:p.x-obj.x,oy:p.y-obj.y,sx:e.clientX,sy:e.clientY,moved:false};
      svg.setPointerCapture(e.pointerId);
    } else if(ta&&ta.t==='text'){
      state.sel=+t.dataset.aid; render();
      drag={obj:ta,isText:true,ox:p.x-ta.x,oy:p.y-ta.y,sx:e.clientX,sy:e.clientY,moved:false};
      svg.setPointerCapture(e.pointerId);
    } else {
      if(state.sel!==null){ state.sel=null; render(); }
      if(state.half!=='full'){
        pan={sx:e.clientX,sy:e.clientY,lo0:state.panLo};
        svg.setPointerCapture(e.pointerId);
        svg.style.cursor='grabbing';
      }
    }
    return;
  }
  if(tool==='link'){ if(t&&t.dataset.id) handleLink(t.dataset.id); return; }
  if(tool==='text'){ textAt={x:p.x,y:p.y}; svg.setPointerCapture(e.pointerId); return; }
  if(tool==='run'||tool==='pass'){
    draw={t:tool,x1:p.x,y1:p.y,x2:p.x,y2:p.y};
    svg.setPointerCapture(e.pointerId);
  }
});

svg.addEventListener('pointermove',function(e){
  if(resize){
    var q0=toWorld(e), sp=toScr(q0.x,q0.y);
    var nw=clamp(sp.x-resize.tlx,6,140), nh=clamp(sp.y-resize.tly,3.6,80);
    var c=fromScr(resize.tlx+nw/2,resize.tly+nh/2);
    resize.ann.w=nw; resize.ann.h=nh; resize.ann.x=c.x; resize.ann.y=c.y;
    render();
    return;
  }
  if(pan){
    var rc=svg.getBoundingClientRect();
    var upp=(L/2+M)/(state.portrait?rc.height:rc.width);
    var d=state.portrait?(e.clientY-pan.sy):-(e.clientX-pan.sx);
    state.panLo=clamp(pan.lo0+d*upp,-M,L/2);
    render(); syncHalfSel();
    return;
  }
  if(drag){
    if(Math.hypot(e.clientX-drag.sx,e.clientY-drag.sy)>4) drag.moved=true;
    if(drag.moved){
      var p=toWorld(e);
      var vr=visRange();
      var xmin=Math.max(-1.5,vr[0]+2), xmax=Math.min(L+1.5,vr[1]-2);
      drag.obj.x=clamp(p.x-drag.ox,xmin,xmax);
      drag.obj.y=clamp(p.y-drag.oy,-1.5,W+1.5);
      render();
    }
  } else if(draw){
    var q=toWorld(e); draw.x2=q.x; draw.y2=q.y; render();
  }
});

svg.addEventListener('pointerup',function(e){
  if(pan){ pan=null; updateUI(); }
  if(resize){ resize=null; }
  if(drag){
    var d=drag; drag=null;
    if(!d.moved&&d.isText){ editText(d.obj,e.clientX,e.clientY); }
    if(!d.moved&&d.isPlayer){
      var epid=d.obj.id, eteam=epid.charAt(0)==='m'?'m':'o';
      openPop(e.clientX,e.clientY,state.labels[epid]||'','Namn på spelaren',function(v,bg,numRaw){
        if(v) state.labels[epid]=v; else delete state.labels[epid];
        if(numRaw!==''){
          var nn=parseInt(numRaw,10);
          if(isFinite(nn)) assignPlayerNum(epid,clamp(Math.round(nn),1,99),eteam);
        } else {
          delete state.customNum[epid];
        }
        render(); renderSquad();
      },{num:getDisplayNum(epid)});
    }
  }
  if(draw){
    var a=draw; draw=null;
    if(Math.hypot(a.x2-a.x1,a.y2-a.y1)>3) state.ann.push({t:a.t,x1:a.x1,y1:a.y1,x2:a.x2,y2:a.y2});
    render();
  }
  if(textAt){
    var tp=textAt; textAt=null;
    openPop(e.clientX,e.clientY,'','Skriv text',function(v,bg){
      if(!v) return;
      state.textBg=bg;
      var box=defaultBox(v);
      state.ann.push({t:'text',x:tp.x,y:tp.y,w:box.w,h:box.h,s:v,bg:bg});
      state.sel=state.ann.length-1;
      state.tool='move';
      render(); updateUI();
    },{bg:state.textBg});
  }
});
svg.addEventListener('pointercancel',function(){drag=null;draw=null;textAt=null;pan=null;resize=null;render();updateUI();});

function editText(a,cx,cy){
  openPop(cx,cy,a.s,'Skriv text',function(v,bg){
    if(!v){ var i=state.ann.indexOf(a); if(i>=0) state.ann.splice(i,1); state.sel=null; }
    else { a.s=v; a.bg=bg; state.textBg=bg; }
    render();
  },{bg:!!a.bg});
}
