'use strict';
/* ---------- Egna fasta situationer (Anpassad fast situation) ---------- */
var customSets=[], editingCsId=null, csArmed=null, csTimer=null;
function csMsg(t){ $('#csMsg').textContent=t; }
function cloneAnn(arr){
  return arr.map(function(a){ var o={}; Object.keys(a).forEach(function(k){ if(k.charAt(0)!=='_') o[k]=a[k]; }); return o; });
}
function csSnapshot(){
  var p={}; state.players.forEach(function(q){ p[q.id]=[q.x,q.y]; });
  return {n:state.n,myForm:state.myForm,oppForm:state.oppForm,p:p,b:[state.ball.x,state.ball.y],ann:cloneAnn(state.ann)};
}
function syncSetPieceOptions(){
  var sel=$('#setPiece'), cur=sel.value;
  var base='<option value="">Välj…</option>'+
    '<option value="corner_att">Hörna (anfall)</option>'+
    '<option value="corner_def">Hörna (försvar)</option>'+
    '<option value="fk_att">Frispark (anfall)</option>'+
    '<option value="goalkick">Målspark</option>'+
    '<option value="throw">Inkast</option>'+
    '<option value="pen">Straff</option>';
  var extra='';
  if(customSets.length){
    extra='<optgroup label="Egna">'+customSets.map(function(r){ return '<option value="custom:'+r.id+'">'+esc(r.name)+'</option>'; }).join('')+'</optgroup>';
  }
  sel.innerHTML=base+extra;
  if(Array.prototype.some.call(sel.options,function(o){return o.value===cur;})) sel.value=cur;
  else if(cur.indexOf('custom:')===0){ sel.value=''; state.setPiece=''; }
}
function applyCustomSet(rec){
  if(state.playing) return;
  var d=rec.data;
  state.n=d.n; state.myForm=d.myForm; state.oppForm=d.oppForm;
  state.setPiece='custom:'+rec.id; state.situation='';
  $('#size').value=String(state.n); fillForms();
  $('#situation').value='';
  rebuild();
  $('#setPiece').value=state.setPiece;
  var ids={}; state.players.forEach(function(p){ ids[p.id]=1; });
  var ph=sanitizePhases([{p:d.p,b:d.b}]);
  if(ph.length){
    state.players.forEach(function(p){ var v=ph[0].p[p.id]; if(v){ p.x=v[0]; p.y=v[1]; } });
    state.ball.x=ph[0].b[0]; state.ball.y=ph[0].b[1];
  }
  state.ann=sanitizeAnn(d.ann,ids);
  render(); updateUI(); renderSquad();
}
function renderCustomSets(){
  var g=$('#csList');
  if(!customSets.length){
    g.innerHTML='<p class="hint">Inga sparade situationer än. Ställ upp spelarna, lägg till ritningar och tryck på Spara fast situation.</p>';
    return;
  }
  var h='';
  customSets.forEach(function(r){
    var d=r.data, sub=d.n+' mot '+d.n+', '+d.myForm+' — '+d.ann.length+' ritning(ar)';
    h+='<article class="card'+(editingCsId===r.id?' sel':'')+'"><div class="cn">'+esc(r.name)+'</div><div class="cd">'+esc(sub)+'</div><div class="cd">'+fmtDate(r.ts)+'</div>'+
       '<div class="row"><button type="button" class="btn primary" data-csedit="'+r.id+'">Redigera</button>'+
       '<button type="button" class="btn" data-csdel="'+r.id+'">'+(csArmed===r.id?'Bekräfta':'Ta bort')+'</button></div></article>';
  });
  g.innerHTML=h;
}
function csExitEdit(){
  editingCsId=null;
  $('#csSave').textContent='Spara fast situation';
  $('#csCancelEdit').hidden=true;
  renderCustomSets();
}
$('#csSave').addEventListener('click',function(){
  if(state.playing) return;
  var name=$('#csName').value.trim();
  if(!name){ csMsg('Ge situationen ett namn.'); return; }
  name=name.slice(0,60);
  if(editingCsId){
    var rec=customSets.filter(function(r){return r.id===editingCsId;})[0];
    if(rec){
      rec.name=name; rec.ts=Date.now(); rec.data=csSnapshot();
      csMsg('Uppdaterade "'+name+'".');
    }
    csExitEdit();
  } else {
    var nrec={id:'c'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),name:name,ts:Date.now(),data:csSnapshot()};
    customSets.unshift(nrec);
    renderCustomSets();
    csMsg('Sparade "'+name+'". Den finns nu under Fast situation.');
  }
  syncSetPieceOptions();
  $('#csName').value='';
});
$('#csCancelEdit').addEventListener('click',function(){ csExitEdit(); csMsg('Redigeringen avbröts.'); });
$('#csList').addEventListener('click',function(e){
  var b=e.target.closest('button'); if(!b) return;
  var id=b.dataset.csedit||b.dataset.csdel;
  var rec=customSets.filter(function(r){return r.id===id;})[0];
  if(!rec) return;
  if(b.dataset.csedit){
    applyCustomSet(rec);
    editingCsId=rec.id;
    $('#csName').value=rec.name;
    $('#csSave').textContent='Uppdatera fast situation';
    $('#csCancelEdit').hidden=false;
    renderCustomSets();
    csMsg('Redigerar "'+rec.name+'". Gör dina ändringar och tryck på Uppdatera fast situation.');
  } else if(b.dataset.csdel){
    if(csArmed===id){
      clearTimeout(csTimer); csArmed=null;
      customSets=customSets.filter(function(r){return r.id!==id;});
      if(editingCsId===id) csExitEdit();
      if(state.setPiece==='custom:'+id){ state.setPiece=''; $('#setPiece').value=''; }
      renderCustomSets(); syncSetPieceOptions();
      csMsg('Situationen togs bort.');
    } else {
      csArmed=id; renderCustomSets();
      clearTimeout(csTimer);
      csTimer=setTimeout(function(){ csArmed=null; renderCustomSets(); },3000);
    }
  }
});
$('#chips').addEventListener('click',function(e){
  var b=e.target.closest('[data-phase]'); if(!b||state.playing) return;
  applySnap(state.phases[+b.dataset.phase]); render();
});
$('#btnPlay').addEventListener('click',function(){
  if(state.phases.length<2||state.playing) return;
  hidePop();
  state.playing=true; updateUI();
  var ph=state.phases.slice(), steps=ph.length-1, dur=1500, total=steps*dur, t0=null;
  applySnap(ph[0]); render();
  function frame(now){
    if(t0===null) t0=now;
    var el=clamp(now-t0,0,total);
    if(el>=total){
      applySnap(ph[ph.length-1]); state.playing=false; render(); updateUI(); return;
    }
    var i=clamp(Math.floor(el/dur),0,steps-1), t=clamp((el-i*dur)/dur,0,1);
    applySnap(lerpSnap(ph[i],ph[i+1],ease(t))); render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
});
