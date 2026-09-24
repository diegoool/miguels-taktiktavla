'use strict';
/* ---------- Plan ---------- */
function drawPitch(){
  var g=state.pitch==='green';
  var base=g?'#2b7549':'#ffffff', stripe=g?'#2f7d4f':'#f6f7f8', ln=g?'#f2f7f3':'#8b95a1', sw=g?.35:.4;
  var s='';
  s+='<rect x="0" y="0" width="'+L+'" height="'+W+'" fill="'+base+'"/>';
  for(var i=0;i<10;i+=2){ s+='<rect x="'+(i*10.5)+'" y="0" width="10.5" height="'+W+'" fill="'+stripe+'"/>'; }
  s+='<g fill="none" stroke="'+ln+'" stroke-width="'+sw+'" stroke-linecap="round">';
  s+='<rect x="0" y="0" width="'+L+'" height="'+W+'"/>';
  s+='<line x1="52.5" y1="0" x2="52.5" y2="'+W+'"/>';
  s+='<circle cx="52.5" cy="34" r="9.15"/>';
  s+='<rect x="0" y="13.84" width="16.5" height="40.32"/><rect x="88.5" y="13.84" width="16.5" height="40.32"/>';
  s+='<rect x="0" y="24.84" width="5.5" height="18.32"/><rect x="99.5" y="24.84" width="5.5" height="18.32"/>';
  s+='<path d="M16.5,26.69 A9.15 9.15 0 0 1 16.5,41.31"/><path d="M88.5,41.31 A9.15 9.15 0 0 1 88.5,26.69"/>';
  s+='<path d="M1,0 A1 1 0 0 1 0,1"/><path d="M104,0 A1 1 0 0 0 105,1"/><path d="M1,68 A1 1 0 0 0 0,67"/><path d="M104,68 A1 1 0 0 1 105,67"/>';
  s+='<rect x="-2" y="30.34" width="2" height="7.32"/><rect x="105" y="30.34" width="2" height="7.32"/>';
  s+='</g>';
  s+='<g fill="'+ln+'"><circle cx="52.5" cy="34" r=".5"/><circle cx="11" cy="34" r=".4"/><circle cx="94" cy="34" r=".4"/></g>';
  $('#pitch').innerHTML=s;
}

var drag=null, draw=null, textAt=null, pan=null, resize=null;

/* Textrutor: mått och radbrytning */
var mctx=document.createElement('canvas').getContext('2d');
function measure(t,fs){ mctx.font='700 '+fs+'px Arial, Helvetica, sans-serif'; return mctx.measureText(t).width; }
var OVAL_MINFS=1.7, OVAL_MAXFS=3.0;
var OVAL_RX_BASE=(function(){ return (measure('Alexanders',OVAL_MINFS)/0.86)/2+0.3; })();
function fitOvalText(text,maxW){
  var t=text.length>10?text.slice(0,10):text;
  for(var fs=OVAL_MAXFS; fs>=OVAL_MINFS; fs-=0.1){ if(measure(t,fs)<=maxW) return {fs:fs,text:t}; }
  while(t.length>1&&measure(t,OVAL_MINFS)>maxW){ t=t.slice(0,-1); }
  return {fs:OVAL_MINFS,text:t};
}
function wrapText(text,fs,maxW,allowBreak){
  var words=text.split(/\s+/).filter(Boolean), lines=[], cur='';
  for(var i=0;i<words.length;i++){
    var w=words[i];
    if(measure(w,fs)>maxW){
      if(!allowBreak) return null;
      while(w.length>1&&measure(w,fs)>maxW){
        var k=w.length-1;
        while(k>1&&measure(w.slice(0,k),fs)>maxW) k--;
        if(cur){ lines.push(cur); cur=''; }
        lines.push(w.slice(0,k)); w=w.slice(k);
      }
    }
    var t=cur?cur+' '+w:w;
    if(cur&&measure(t,fs)>maxW){ lines.push(cur); cur=w; } else cur=t;
  }
  if(cur) lines.push(cur);
  return lines;
}
function fitText(a){
  var key=a.s+'|'+a.w.toFixed(2)+'|'+a.h.toFixed(2);
  if(a._k===key) return a._f;
  var pad=1, maxW=a.w-2*pad, maxH=a.h-2*pad, res=null;
  for(var fs=Math.min(16,maxH); fs>=1.6; fs-=0.2){
    var ln=wrapText(a.s,fs,maxW,false);
    if(ln&&ln.length*fs*1.2<=maxH+0.001){ res={fs:fs,lines:ln}; break; }
  }
  if(!res) res={fs:1.6,lines:wrapText(a.s,1.6,maxW,true)};
  a._k=key; a._f=res;
  return res;
}
function defaultBox(text){
  var fs=3.6, pad=1, w=Math.min(measure(text,fs),40)+2*pad+0.6;
  var n=wrapText(text,fs,w-2*pad,true).length;
  return {w:w,h:n*fs*1.2+2*pad};
}
function toScr(x,y){ return state.portrait?{x:y,y:-x}:{x:x,y:y}; }
function fromScr(x,y){ return state.portrait?{x:-y,y:x}:{x:x,y:y}; }
function textBody(a,i,rot){
  var f=fitText(a), lh=f.fs*1.2, top=-(f.lines.length*lh)/2;
  var g='<g data-aid="'+i+'" transform="translate('+a.x+' '+a.y+')"><g transform="rotate('+rot+')">'+
    '<rect x="'+(-a.w/2)+'" y="'+(-a.h/2)+'" width="'+a.w+'" height="'+a.h+'" rx=".8" '+(a.bg?'fill="#fff" stroke="#9aa5b1" stroke-width=".25"':'fill="transparent"')+'/>';
  f.lines.forEach(function(ln,k){
    g+='<text class="atext'+(a.bg?' bg':'')+'" y="'+(top+lh*k+lh/2).toFixed(2)+'" dy=".34em" style="font-size:'+f.fs.toFixed(2)+'px'+(a.bg?'':';stroke-width:'+(f.fs*0.14).toFixed(2))+'">'+esc(ln)+'</text>';
  });
  return g+'</g></g>';
}
function textHandle(a,i,rot){
  return '<g transform="translate('+a.x+' '+a.y+')"><g transform="rotate('+rot+')">'+
    '<rect x="'+(-a.w/2)+'" y="'+(-a.h/2)+'" width="'+a.w+'" height="'+a.h+'" rx=".8" fill="none" stroke="#f59e0b" stroke-width=".4" stroke-dasharray="1.2 .8" pointer-events="none"/>'+
    '<g data-handle="'+i+'" style="cursor:nwse-resize"><rect x="'+(a.w/2-4)+'" y="'+(a.h/2-4)+'" width="8" height="8" fill="transparent"/>'+
    '<rect x="'+(a.w/2-2.2)+'" y="'+(a.h/2-2.2)+'" width="4.4" height="4.4" rx=".8" fill="#f59e0b" stroke="#fff" stroke-width=".3"/></g></g></g>';
}

function visRange(){
  if(state.half==='full') return [-M,L+M];
  return [state.panLo,state.panLo+L/2+M];
}
function syncHalfSel(){
  var v='full';
  if(state.half!=='full') v=state.panLo>=L/2-.5?'opp':(state.panLo<=-M+.5?'own':'mid');
  $('#halfSel').value=v;
}
function layout(){
  var por=state.portrait, r=visRange(), lo=r[0], hi=r[1];
  var vx,vy,vw,vh;
  if(por){ vx=0; vy=L+M-hi; vw=W+2*M; vh=hi-lo; }
  else { vx=M+lo; vy=0; vw=hi-lo; vh=W+2*M; }
  svg.setAttribute('viewBox',vx+' '+vy+' '+vw+' '+vh);
  board.style.maxWidth='100%';
}

function render(){
  var por=state.portrait;
  layout();
  world.setAttribute('transform',por?'translate('+M+' '+(L+M)+') rotate(-90)':'translate('+M+' '+M+')');
  var rot=por?90:0;
  var h='';

  var chanN=state.chan5?5:(state.chan4?4:0);
  if(chanN){
    var cw=W/chanN;
    for(var i=0;i<chanN;i++){
      if(i%2===0) h+='<rect x="0" y="'+(i*cw)+'" width="'+L+'" height="'+cw+'" style="fill:var(--chan)" opacity=".12" pointer-events="none"/>';
      if(i>0) h+='<line x1="0" y1="'+(i*cw)+'" x2="'+L+'" y2="'+(i*cw)+'" style="stroke:var(--ann)" stroke-width=".25" stroke-dasharray="1.2 1.2" opacity=".55" pointer-events="none"/>';
    }
  }

  var byId={}; state.players.forEach(function(p){byId[p.id]=p});
  function visible(p){return p && (p.team==='m' || state.showOpp)}

  state.ann.forEach(function(a,i){
    if(a.t==='link'){
      var A=byId[a.a], B=byId[a.b];
      if(!visible(A)||!visible(B)) return;
      h+='<g data-aid="'+i+'"><line x1="'+A.x+'" y1="'+A.y+'" x2="'+B.x+'" y2="'+B.y+'" style="stroke:var(--ann)" stroke-width=".45" opacity=".85"/>'+
         '<line x1="'+A.x+'" y1="'+A.y+'" x2="'+B.x+'" y2="'+B.y+'" stroke="transparent" stroke-width="3"/></g>';
    }
  });
  function arrow(a,i){
    var dash=a.t==='run'?' stroke-dasharray="1.6 1.2"':'';
    var l='<line x1="'+a.x1+'" y1="'+a.y1+'" x2="'+a.x2+'" y2="'+a.y2+'" style="stroke:var(--ann)" stroke-width=".55"'+dash+' marker-end="url(#ah)" stroke-linecap="round"/>';
    if(i===undefined) return '<g pointer-events="none">'+l+'</g>';
    return '<g data-aid="'+i+'">'+l+'<line x1="'+a.x1+'" y1="'+a.y1+'" x2="'+a.x2+'" y2="'+a.y2+'" stroke="transparent" stroke-width="3.2"/></g>';
  }
  state.ann.forEach(function(a,i){ if(a.t==='run'||a.t==='pass') h+=arrow(a,i); });
  if(draw) h+=arrow(draw);

  state.ann.forEach(function(a,i){ if(a.t==='text') h+=textBody(a,i,rot); });

  var k=state.size==='s'?0.7:1, pr=2.7*k;
  var oval=state.namesInCircle, rx=oval?OVAL_RX_BASE*k:pr, ry=pr, maxW=rx*2*0.86;
  state.players.slice().sort(function(a,b){ return (a.team==='m'?1:0)-(b.team==='m'?1:0); }).forEach(function(p){
    if(!visible(p)) return;
    var lab=state.labels[p.id], dispNum=(state.customNum[p.id]!=null&&state.customNum[p.id]!=='')?state.customNum[p.id]:p.num, center, below='', ringShape;
    if(oval){
      if(lab){
        var fit=fitOvalText(lab,maxW);
        center='<text class="num" dy=".34em" style="font-size:'+fit.fs.toFixed(2)+'px">'+esc(fit.text)+'</text>';
      } else {
        center='<text class="num" dy=".34em" style="font-size:'+(3*k).toFixed(2)+'px">'+esc(String(dispNum))+'</text>';
      }
      var erx=por?ry:rx, ery=por?rx:ry;
      ringShape='<ellipse rx="'+(erx+0.1).toFixed(2)+'" ry="'+(ery+0.1).toFixed(2)+'" fill="transparent"/><ellipse class="ring" rx="'+erx.toFixed(2)+'" ry="'+ery.toFixed(2)+'"/>';
    } else {
      center='<text class="num" dy=".34em" style="font-size:'+(3.3*k).toFixed(2)+'px">'+esc(String(dispNum))+'</text>';
      if(lab) below='<text class="lab" y="'+(pr+3).toFixed(2)+'" style="font-size:'+Math.max(2.2,2.7*k).toFixed(2)+'px">'+esc(lab)+'</text>';
      ringShape='<circle r="2.8" fill="transparent"/><circle class="ring" r="'+pr.toFixed(2)+'"/>';
    }
    h+='<g class="pl pl-'+p.team+(state.linkStart===p.id||state.swapStart===p.id?' sel':'')+'" data-id="'+p.id+'" transform="translate('+p.x+' '+p.y+')">'+
       ringShape+
       '<g transform="rotate('+rot+')">'+center+below+'</g></g>';
  });

  if(state.sel!==null&&state.tool==='move'&&state.ann[state.sel]&&state.ann[state.sel].t==='text') h+=textHandle(state.ann[state.sel],state.sel,rot);

  if(state.showBall){
    h+='<g class="ball" data-ball="1" transform="translate('+state.ball.x+' '+state.ball.y+')">'+
       '<circle r="2.4" fill="transparent"/><circle r="1.25" fill="#fff" stroke="#111" stroke-width=".35"/><circle r=".45" fill="#111"/></g>';
  }

  dyn.innerHTML=h;
}
