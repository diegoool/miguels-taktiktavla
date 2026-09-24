'use strict';
/* ---------- Popover ---------- */
var popCb=null;
function openPop(cx,cy,value,placeholder,cb,opts){
  var r=board.getBoundingClientRect();
  var pop=$('#pop');
  popCb=cb;
  pop.hidden=false;
  var hasBg=!!(opts&&opts.bg!==undefined);
  $('#popBgWrap').hidden=!hasBg;
  if(hasBg) $('#popBg').checked=!!opts.bg;
  var hasNum=!!(opts&&opts.num!==undefined);
  $('#popNumWrap').hidden=!hasNum;
  if(hasNum) $('#popNum').value=(opts.num===''||opts.num==null)?'':opts.num;
  var left=clamp(cx-r.left,125,Math.max(125,r.width-125));
  var top=clamp(cy-r.top,0,Math.max(0,r.height-60));
  pop.style.left=left+'px'; pop.style.top=top+'px';
  var inp=$('#popInput');
  inp.value=value||''; inp.placeholder=placeholder||'';
  setTimeout(function(){inp.focus();inp.select()},30);
}
function hidePop(){ $('#pop').hidden=true; popCb=null; }
function commitPop(){
  var v=$('#popInput').value.trim(), bg=$('#popBg').checked, numRaw=$('#popNum').value.trim(), cb=popCb;
  hidePop();
  if(cb) cb(v,bg,numRaw);
}
$('#popOk').addEventListener('click',commitPop);
$('#popInput').addEventListener('keydown',function(e){
  if(e.key==='Enter'){e.preventDefault();commitPop();}
  if(e.key==='Escape'){e.preventDefault();hidePop();}
});
