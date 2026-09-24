'use strict';
/* ---------- Animation ---------- */
function snapshot(){
  var p={}; state.players.forEach(function(q){p[q.id]=[q.x,q.y]});
  return {p:p,b:[state.ball.x,state.ball.y]};
}
function applySnap(s){
  state.players.forEach(function(q){var v=s.p[q.id]; if(v){q.x=v[0];q.y=v[1];}});
  state.ball.x=s.b[0]; state.ball.y=s.b[1];
}
function lerpSnap(a,b,t){
  var p={};
  Object.keys(a.p).forEach(function(k){ p[k]=[a.p[k][0]+(b.p[k][0]-a.p[k][0])*t, a.p[k][1]+(b.p[k][1]-a.p[k][1])*t]; });
  return {p:p,b:[a.b[0]+(b.b[0]-a.b[0])*t,a.b[1]+(b.b[1]-a.b[1])*t]};
}
function ease(t){return t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2}

$('#btnCapture').addEventListener('click',function(){
  state.phases.push(snapshot()); updateUI();
});
$('#btnClearPhases').addEventListener('click',function(){ state.phases=[]; updateUI(); });

/* ---------- Sparade animationer ---------- */
var anims=[], animArmed=null, animTimer=null;
var animMsg=msgFn('#animMsg');
function animDefaultName(){ return defaultName()+' – animation'; }
function renderAnims(){
  var g=$('#animList');
  if(!anims.length){
    g.innerHTML='<p class="hint">Inga sparade animationer än.</p>';
    return;
  }
  var h='';
  anims.forEach(function(r){
    h+='<article class="card"><div class="cn">'+esc(r.name)+'</div><div class="cd">'+r.phases.length+' faser</div><div class="cd">'+fmtDate(r.ts)+'</div>'+
       '<div class="row"><button type="button" class="btn primary" data-aload="'+r.id+'">Ladda</button>'+
       '<button type="button" class="btn" data-adel="'+r.id+'">'+(animArmed===r.id?'Bekräfta':'Ta bort')+'</button></div></article>';
  });
  g.innerHTML=h;
}
$('#animSave').addEventListener('click',function(){
  if(state.phases.length<2||state.playing) return;
  var name=$('#animName').value.trim()||animDefaultName();
  var rec={id:'a'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),name:name.slice(0,60),ts:Date.now(),phases:state.phases.map(function(s){ return {p:Object.assign({},s.p),b:s.b.slice()}; })};
  anims.unshift(rec); renderAnims();
  $('#animName').value='';
  animMsg('La till animationen "'+rec.name+'". Tryck på Spara session för att spara den med sessionen.');
});
$('#animName').addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); $('#animSave').click(); } });
$('#animList').addEventListener('click',function(e){
  var b=e.target.closest('button'); if(!b) return;
  var id=b.dataset.aload||b.dataset.adel;
  var rec=anims.filter(function(r){return r.id===id})[0];
  if(!rec) return;
  if(b.dataset.aload){
    if(state.playing) return;
    state.phases=sanitizePhases(rec.phases);
    if(state.phases.length){ applySnap(state.phases[0]); }
    hidePop(); render(); updateUI();
    animMsg('Laddade "'+rec.name+'" i Animera.');
  } else if(b.dataset.adel){
    if(animArmed===id){
      clearTimeout(animTimer); animArmed=null;
      anims=anims.filter(function(r){return r.id!==id});
      renderAnims();
      animMsg('Animationen togs bort.');
    } else {
      animArmed=id; renderAnims();
      clearTimeout(animTimer);
      animTimer=setTimeout(function(){ animArmed=null; renderAnims(); },3000);
    }
  }
});
