'use strict';
/* ---------- Knappar ---------- */
document.querySelectorAll('[data-tool]').forEach(function(b){
  b.addEventListener('click',function(){
    state.tool=b.dataset.tool; state.linkStart=null; state.swapStart=null; state.sel=null; hidePop(); render(); updateUI();
  });
});
$('#btnUndo').addEventListener('click',function(){ state.ann.pop(); state.sel=null; render(); });
$('#btnClearDraw').addEventListener('click',function(){ state.ann=[]; state.linkStart=null; state.sel=null; render(); });
$('#chkOpp').addEventListener('change',function(e){ state.showOpp=e.target.checked; render(); });
$('#chkBall').addEventListener('change',function(e){ state.showBall=e.target.checked; render(); });
$('#chkChan5').addEventListener('change',function(e){ state.chan5=e.target.checked; if(state.chan5){ state.chan4=false; $('#chkChan4').checked=false; } render(); });
$('#chkChan4').addEventListener('change',function(e){ state.chan4=e.target.checked; if(state.chan4){ state.chan5=false; $('#chkChan5').checked=false; } render(); });
function setNameMode(on){
  state.namesInCircle=on;
  $('#btnNumMode').setAttribute('aria-pressed',on?'false':'true');
  $('#btnNameMode').setAttribute('aria-pressed',on?'true':'false');
  render();
}
$('#btnNumMode').addEventListener('click',function(){ setNameMode(false); });
$('#btnNameMode').addEventListener('click',function(){ setNameMode(true); });
$('#btnOrient').addEventListener('click',function(){ state.portrait=!state.portrait; hidePop(); render(); updateUI(); });
confirmModal('#btnReset','#resetModal','#resetCancel','#resetConfirm',function(){
  state.labels={}; state.customNum={}; rebuild(); renderSquad();
});

$('#size').addEventListener('change',function(e){
  state.n=+e.target.value;
  state.myForm=FORMS[state.n].my; state.oppForm=FORMS[state.n].list[0];
  fillForms(); rebuild();
});
$('#myForm').addEventListener('change',function(e){ state.myForm=e.target.value; rebuild(); });
$('#oppForm').addEventListener('change',function(e){ state.oppForm=e.target.value; rebuild(); });
$('#setPiece').addEventListener('change',function(e){
  var v=e.target.value;
  if(v.indexOf('custom:')===0){
    var rec=customSets.filter(function(r){return r.id===v.slice(7);})[0];
    if(rec) applyCustomSet(rec);
    else { e.target.value=''; }
    return;
  }
  state.setPiece=v;
  if(state.setPiece){ state.situation=''; $('#situation').value=''; }
  rebuild();
});
$('#situation').addEventListener('change',function(e){
  state.situation=e.target.value;
  if(state.situation){ state.setPiece=''; $('#setPiece').value=''; }
  rebuild();
});
