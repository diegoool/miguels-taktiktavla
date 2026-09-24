'use strict';
/* ---------- Färger och vy ---------- */
function ink(hex){
  var n=parseInt(hex.slice(1),16), r=(n>>16)&255, g=(n>>8)&255, b=n&255;
  return (0.299*r+0.587*g+0.114*b)/255>0.6?'#111111':'#ffffff';
}
function applyTheme(){
  var g=state.pitch==='green', st=svg.style;
  st.setProperty('--ring',g?'#ffffff':'#374151');
  st.setProperty('--ann',g?'#ffffff':'#1f2937');
  st.setProperty('--lab',g?'#ffffff':'#111827');
  st.setProperty('--lab-stroke',g?'#0b2a1a':'#ffffff');
  st.setProperty('--chan',g?'#ffffff':'#111827');
  $('#bgrect').setAttribute('fill',g?'#22593b':'#eceff2');
  drawPitch();
  var root=document.documentElement.style;
  root.setProperty('--my',state.colors.m); root.setProperty('--opp',state.colors.o);
  root.setProperty('--my-ink',ink(state.colors.m)); root.setProperty('--opp-ink',ink(state.colors.o));
}
function setColor(t,c){
  state.colors[t]=c.toLowerCase();
  $(t==='m'?'#colMy':'#colOpp').value=c;
  applyTheme(); render();
}
$('#colMy').addEventListener('input',function(e){ setColor('m',e.target.value); });
$('#colOpp').addEventListener('input',function(e){ setColor('o',e.target.value); });
$('#pitchSel').addEventListener('change',function(e){ state.pitch=e.target.value; applyTheme(); render(); });
$('#halfSel').addEventListener('change',function(e){
  var v=e.target.value; hidePop();
  if(v==='full') state.half='full';
  else { state.half='half'; state.panLo=v==='opp'?L/2:(v==='own'?-M:(L/2-M)/2); }
  render(); updateUI();
});
$('#sizeSel').addEventListener('change',function(e){ state.size=e.target.value; render(); });
window.addEventListener('resize',layout);
