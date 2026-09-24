'use strict';
/* ---------- Truppen ---------- */
var squad=[], tpCollapsed=false;
var TP_ICON_LEFT='<path d="M15 5l-7 7 7 7"/>', TP_ICON_RIGHT='<path d="M9 5l7 7-7 7"/>';
var TP_ICON_UP='<path d="M5 15l7-7 7 7"/>', TP_ICON_DOWN='<path d="M5 9l7 7 7-7"/>';
var tpMobileMq=window.matchMedia('(max-width:760px)');
function updateTruppenIcon(){
  var mobile=tpMobileMq.matches, icon;
  if(mobile) icon=tpCollapsed?TP_ICON_DOWN:TP_ICON_UP;
  else icon=tpCollapsed?TP_ICON_LEFT:TP_ICON_RIGHT;
  $('#truppenIcon').innerHTML=icon;
}
var tpMsg=msgFn('#tpMsg');
function squadOnPitch(rec){
  if(rec.num==='') return false;
  return state.players.some(function(p){
    return p.team==='m'&&state.labels[p.id]===rec.name&&String(getDisplayNum(p.id))===String(rec.num);
  });
}
function renderSquad(){
  var ul=$('#tpList');
  if(!squad.length){ ul.innerHTML='<li class="hint" style="padding:2px 0">Inga spelare i truppen än.</li>'; return; }
  var h='';
  squad.forEach(function(r){
    var onPitch=squadOnPitch(r);
    var cls='tp-item'+(onPitch?' on-pitch':(r.status==='ers'?' status-ers':(r.status==='ej'?' status-ej':'')));
    var statusTxt=onPitch?'':(r.status==='ers'?'Ersättare':(r.status==='ej'?'Ej uttagen':''));
    h+='<li class="'+cls+'" data-tpid="'+r.id+'">'+
       '<span class="tp-num">'+esc(r.num===''?'–':String(r.num))+'</span>'+
       '<span class="tp-name">'+esc(r.name)+(statusTxt?' <span class="tp-status">— '+esc(statusTxt)+'</span>':'')+'</span>'+
       '<button type="button" class="tp-del" data-tpdel="'+r.id+'" aria-label="Ta bort '+esc(r.name)+' ur truppen" title="Ta bort ur truppen">✕</button></li>';
  });
  ul.innerHTML=h;
}
function tpAdd(){
  var numRaw=$('#tpNum').value.trim(), name=$('#tpName').value.trim();
  if(!name){ tpMsg('Skriv ett namn.'); $('#tpName').focus(); return; }
  var num=''; if(numRaw!==''){ var nn=parseInt(numRaw,10); if(isFinite(nn)) num=clamp(nn,1,99); }
  squad.push({id:'t'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),num:num,name:name.slice(0,40)});
  renderSquad();
  $('#tpNum').value=''; $('#tpName').value=''; $('#tpName').focus();
  tpMsg('Dra en spelare härifrån till en bricka på planen för att sätta namn och nummer.');
}
$('#tpAdd').addEventListener('click',tpAdd);
$('#tpName').addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); tpAdd(); } });
$('#tpNum').addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); tpAdd(); } });
$('#tpList').addEventListener('click',function(e){
  var b=e.target.closest('[data-tpdel]'); if(!b) return;
  squad=squad.filter(function(r){return r.id!==b.dataset.tpdel;});
  renderSquad();
});
confirmModal('#tpClearStart','#clearStartModal','#clearStartCancel','#clearStartConfirm',function(){
  state.players.forEach(function(p){
    if(p.team!=='m') return;
    delete state.labels[p.id]; delete state.customNum[p.id];
  });
  squad.forEach(function(r){ r.status=null; });
  render(); renderSquad();
  tpMsg('Startelvan är rensad.');
});
$('#truppenToggle').addEventListener('click',function(){
  tpCollapsed=!tpCollapsed;
  $('#truppen').classList.toggle('collapsed',tpCollapsed);
  this.setAttribute('aria-expanded',tpCollapsed?'false':'true');
  var t=tpCollapsed?'Visa truppen':'Dölj truppen';
  this.title=t; this.setAttribute('aria-label',t);
  updateTruppenIcon();
  setTimeout(layout,190);
});
tpMobileMq.addEventListener?tpMobileMq.addEventListener('change',updateTruppenIcon):tpMobileMq.addListener(updateTruppenIcon);
updateTruppenIcon();
$('#chkTruppen').addEventListener('change',function(e){
  $('#truppen').hidden=!e.target.checked;
  setTimeout(layout,190);
});

/* Dra en spelare från truppen till en bricka på planen */
(function(){
  var list=$('#tpList'), dragRec=null, ghost=null, moved=false, sx=0, sy=0;
  function moveGhost(x,y){ if(ghost){ ghost.style.left=(x-ghost.offsetWidth/2)+'px'; ghost.style.top=(y-16)+'px'; } }
  function clearHighlight(){ document.querySelectorAll('#dyn .pl.drop-target').forEach(function(g){ g.classList.remove('drop-target'); }); }
  list.addEventListener('pointerdown',function(e){
    if(e.target.closest('.tp-del')) return;
    var item=e.target.closest('.tp-item'); if(!item) return;
    var rec=squad.filter(function(r){return r.id===item.dataset.tpid;})[0]; if(!rec) return;
    e.preventDefault();
    dragRec=rec; moved=false; sx=e.clientX; sy=e.clientY;
    list.setPointerCapture(e.pointerId);
  });
  list.addEventListener('pointermove',function(e){
    if(!dragRec) return;
    if(!moved&&Math.hypot(e.clientX-sx,e.clientY-sy)>4){
      moved=true;
      var item=list.querySelector('[data-tpid="'+dragRec.id+'"]');
      if(item){
        item.classList.add('dragging');
        var r=item.getBoundingClientRect();
        ghost=item.cloneNode(true); ghost.classList.add('drag-ghost'); ghost.classList.remove('dragging');
        ghost.style.width=r.width+'px';
        document.body.appendChild(ghost);
      }
    }
    if(!moved) return;
    moveGhost(e.clientX,e.clientY);
    clearHighlight();
    var el=document.elementFromPoint(e.clientX,e.clientY);
    var pl=el&&el.closest?el.closest('#dyn .pl-m'):null;
    if(pl) pl.classList.add('drop-target');
  });
  function finish(){
    document.querySelectorAll('.tp-item.dragging').forEach(function(c){c.classList.remove('dragging');});
    clearHighlight();
    if(ghost){ ghost.remove(); ghost=null; }
    dragRec=null;
  }
  list.addEventListener('pointerup',function(e){
    if(!dragRec) return;
    var rec=dragRec, wasMoved=moved;
    var el=document.elementFromPoint(e.clientX,e.clientY);
    var pl=wasMoved&&el&&el.closest?el.closest('#dyn .pl-m'):null;
    var oppHit=wasMoved&&!pl&&el&&el.closest&&el.closest('#dyn .pl-o');
    finish();
    if(!wasMoved){
      if(!squadOnPitch(rec)){
        rec.status=rec.status==null?'ers':(rec.status==='ers'?'ej':null);
        renderSquad();
      }
      return;
    }
    if(pl&&pl.dataset.id){
      state.labels[pl.dataset.id]=rec.name;
      if(rec.num==='') delete state.customNum[pl.dataset.id];
      else assignPlayerNum(pl.dataset.id,rec.num,'m');
      rec.status=null;
      render(); renderSquad();
      tpMsg('Satte "'+rec.name+'" på planen.');
    } else if(oppHit){
      tpMsg('Du kan bara sätta spelare från truppen på ditt eget lag (mitt lag).');
    }
  });
  list.addEventListener('pointercancel',finish);
})();
