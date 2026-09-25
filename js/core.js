'use strict';
var $=function(s){return document.querySelector(s)};
var svg=$('#svg'), world=$('#world'), dyn=$('#dyn'), board=$('#board');
var state={
  n:11, myForm:'4-3-3', oppForm:'4-4-2', setPiece:'', situation:'',
  players:[], ball:{x:52.5,y:34}, ann:[], labels:{}, tool:'move',
  portrait:window.innerWidth<600, showOpp:true, showBall:true, chan5:false, chan4:false,
  colors:{m:'#d62839',o:'#fecc00'}, pitch:'green', half:'full', panLo:-4, size:'n',
  phases:[], playing:false, linkStart:null, swapStart:null, sel:null, textBg:false, namesInCircle:false, customNum:{}
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
/* Ikonknappar på korten: texten visas som tooltip (data-tip) och läses upp via aria-label */
var ICONS={
  load:'<path d="M12 15V4"/><path d="M7 9l5-5 5 5"/><path d="M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/>',
  download:'<path d="M12 4v11"/><path d="M7 10l5 5 5-5"/><path d="M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/>',
  export:'<path d="M13 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6l5 5v3"/><path d="M13 3v5h5"/><path d="M13 17h8"/><path d="M18 14l3 3-3 3"/>',
  del:'<path d="M4 7h16"/><path d="M10 3h4v4h-4z"/><path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/><path d="M10 11v6"/><path d="M14 11v6"/>',
  save:'<path d="M5 3h11l4 4v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M8 3v5h7V3"/><path d="M8 21v-6h8v6"/>',
  edit:'<path d="M11 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-6"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z"/>'
};
function iconBtn(icon,label,attrs,cls,aria){
  return '<button type="button" class="btn icon-btn'+(cls?' '+cls:'')+'" '+attrs+' data-tip="'+esc(label)+'" aria-label="'+esc(aria||label)+'">'+
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+ICONS[icon]+'</svg></button>';
}
/* Ta bort-knappen: första trycket ber om bekräftelse (röd, med synlig tooltip) */
function delBtn(armed,attrs){ return armed?iconBtn('del','Bekräfta',attrs,'armed','Bekräfta: tryck igen för att ta bort'):iconBtn('del','Ta bort',attrs); }
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
