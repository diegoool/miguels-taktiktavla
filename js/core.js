'use strict';
var $=function(s){return document.querySelector(s)};
var svg=$('#svg'), world=$('#world'), dyn=$('#dyn'), board=$('#board');
var state={
  n:11, myForm:'4-3-3', oppForm:'4-4-2', setPiece:'', situation:'',
  players:[], ball:{x:52.5,y:34}, ann:[], labels:{}, tool:'move',
  portrait:window.innerWidth<600, showOpp:true, showBall:true, chan5:false, chan4:false,
  colors:{m:'#d62839',o:'#fecc00'}, pitch:'green', half:'full', panLo:-4, size:'n',
  phases:[], playing:false, linkStart:null, sel:null, textBg:false, namesInCircle:false, customNum:{}
};

/* ---------- Hjälpfunktioner ---------- */
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function getDisplayNum(pid){
  var v=state.customNum[pid];
  if(v!=null&&v!=='') return v;
  var p=state.players.filter(function(x){return x.id===pid;})[0];
  return p?p.num:null;
}
function assignPlayerNum(pid,newNum,team){
  var old=getDisplayNum(pid), conflict=null;
  state.players.forEach(function(p){
    if(p.id!==pid&&p.team===team&&String(getDisplayNum(p.id))===String(newNum)) conflict=p.id;
  });
  if(conflict) state.customNum[conflict]=old;
  state.customNum[pid]=newNum;
}

/* ---------- Delade hjälpare ---------- */
/* Returnerar en funktion som skriver ett statusmeddelande i elementet sel */
function msgFn(sel){ return function(t){ $(sel).textContent=t; }; }
function defaultName(){ return state.myForm+' mot '+state.oppForm; }
/* Bekräftelsedialog: öppnas av openSel, stängs med Avbryt, klick på bakgrunden eller Escape */
function confirmModal(openSel,modalSel,cancelSel,confirmSel,onConfirm){
  var modal=$(modalSel);
  function close(){ modal.hidden=true; }
  $(openSel).addEventListener('click',function(){
    if(state.playing) return;
    hidePop();
    modal.hidden=false;
    setTimeout(function(){ $(cancelSel).focus(); },30);
  });
  $(cancelSel).addEventListener('click',close);
  modal.addEventListener('click',function(e){ if(e.target===modal) close(); });
  $(confirmSel).addEventListener('click',function(){ close(); onConfirm(); });
  document.addEventListener('keydown',function(e){ if(e.key==='Escape'&&!modal.hidden) close(); });
}
