'use strict';
/* ---------- Gränssnitt ---------- */
function updateUI(){
  document.querySelectorAll('[data-tool]').forEach(function(b){
    b.setAttribute('aria-pressed',b.dataset.tool===state.tool?'true':'false');
  });
  $('#btnCapture').textContent=state.phases.length?'Fånga fas '+(state.phases.length+1):'Fånga start';
  $('#btnCapture').disabled=state.playing;
  $('#btnPlay').disabled=state.phases.length<2||state.playing;
  $('#animSave').disabled=state.phases.length<2||state.playing;
  $('#btnClearPhases').disabled=!state.phases.length||state.playing;
  var c='';
  state.phases.forEach(function(_,i){c+='<button type="button" class="chip" data-phase="'+i+'" aria-label="Visa fas '+(i+1)+'">'+(i+1)+'</button>'});
  $('#chips').innerHTML=c;
  $('#hint').textContent=HINTS[state.tool]+(state.tool==='move'&&state.half!=='full'?' Dra på planen för att flytta vyn.':'');
  $('#btnOrient').textContent=state.portrait?'Liggande plan':'Stående plan';
  var ho=$('#halfSel').options;
  ho[1].textContent=state.portrait?'Övre halvan (motståndarens)':'Högra halvan (motståndarens)';
  ho[2].textContent=state.portrait?'Nedre halvan (egen)':'Vänstra halvan (egen)';
  syncHalfSel();
  svg.style.cursor=(state.tool==='run'||state.tool==='pass'||state.tool==='text')?'crosshair':(state.tool==='erase'||state.tool==='swap'?'pointer':(state.tool==='move'&&state.half!=='full'?'grab':'default'));
}

function fillForms(){
  var f=FORMS[state.n], a='', b='';
  f.list.forEach(function(x){
    a+='<option value="'+x+'"'+(x===state.myForm?' selected':'')+'>'+x+'</option>';
    b+='<option value="'+x+'"'+(x===state.oppForm?' selected':'')+'>'+x+'</option>';
  });
  $('#myForm').innerHTML=a; $('#oppForm').innerHTML=b;
}
