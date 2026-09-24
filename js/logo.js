'use strict';
/* ---------- Logotyp ---------- */
var logoData=null;
var logoMsg=msgFn('#logoMsg');
function updateLogoDisplay(){
  var img=$('#pageLogo');
  if(logoData){ img.src=logoData; img.hidden=false; }
  else { img.hidden=true; img.removeAttribute('src'); }
  $('#logoRemove').hidden=!logoData;
}
$('#logoBtn').addEventListener('click',function(){ $('#logoFile').click(); });
$('#logoFile').addEventListener('change',function(e){
  var f=e.target.files&&e.target.files[0]; e.target.value='';
  if(!f) return;
  if(f.type!=='image/png'){ logoMsg('Bara PNG-bilder stöds.'); return; }
  if(f.size>2000000){ logoMsg('Bilden är för stor (max 2 MB).'); return; }
  var fr=new FileReader();
  fr.onload=function(){
    logoData=fr.result; updateLogoDisplay();
    logoMsg('Logotypen visas uppe till höger på sidan.');
  };
  fr.onerror=function(){ logoMsg('Kunde inte läsa bilden.'); };
  fr.readAsDataURL(f);
});
$('#logoRemove').addEventListener('click',function(){
  logoData=null; updateLogoDisplay();
  logoMsg('Logotypen togs bort.');
});
