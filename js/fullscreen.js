'use strict';
/* ---------- Helskärm för planen ---------- */
(function(){
  var btn=$('#boardFsBtn'), icon=$('#boardFsIcon');
  var ICON_EXPAND='<path d="M4 9V5a1 1 0 0 1 1-1h4M15 4h4a1 1 0 0 1 1 1v4M20 15v4a1 1 0 0 1-1 1h-4M9 20H5a1 1 0 0 1-1-1v-4"/>';
  var ICON_CLOSE='<path d="M6 6l12 12M18 6L6 18"/>';
  function fsEl(){ return document.fullscreenElement||document.webkitFullscreenElement||null; }
  if(!btn) return;
  if(!(board.requestFullscreen||board.webkitRequestFullscreen)){ btn.hidden=true; return; }
  function update(){
    var on=fsEl()===board;
    icon.innerHTML=on?ICON_CLOSE:ICON_EXPAND;
    var t=on?'Stäng helskärm för planen':'Helskärm för planen';
    btn.title=t; btn.setAttribute('aria-label',t);
  }
  btn.addEventListener('click',function(){
    if(fsEl()===board){
      var ex=document.exitFullscreen||document.webkitExitFullscreen;
      if(ex) ex.call(document);
    } else {
      var req=board.requestFullscreen||board.webkitRequestFullscreen;
      if(req) req.call(board).catch(function(){});
    }
  });
  document.addEventListener('fullscreenchange',update);
  document.addEventListener('webkitfullscreenchange',update);
  update();
})();
