'use strict';
/* ---------- Skärmbilder ---------- */
var gallery=[], pendingShot=null, viewing=null, dlCap=null, armedId=null, armedTimer=null;
var EXPORT_PROPS=['fill','fill-opacity','stroke','stroke-width','stroke-opacity','stroke-dasharray','stroke-linecap','stroke-linejoin','paint-order','opacity','font-size','font-weight','text-anchor'];

function makeShot(){
  return new Promise(function(resolve,reject){
    try{
      var vb=svg.viewBox.baseVal, PW=1400, PH=Math.round(PW*vb.height/vb.width);
      var clone=svg.cloneNode(true);
      var o=svg.querySelectorAll('*'), c=clone.querySelectorAll('*');
      for(var i=0;i<o.length;i++){
        var cs=getComputedStyle(o[i]), st=c[i].getAttribute('style')||'';
        for(var j=0;j<EXPORT_PROPS.length;j++){
          var v=cs.getPropertyValue(EXPORT_PROPS[j]);
          if(v) st+=';'+EXPORT_PROPS[j]+':'+v;
        }
        if(c[i].tagName.toLowerCase()==='text') st+=';font-family:Arial,Helvetica,sans-serif';
        c[i].setAttribute('style',st);
      }
      clone.removeAttribute('style');
      clone.setAttribute('width',PW); clone.setAttribute('height',PH);
      var xml=new XMLSerializer().serializeToString(clone);
      var img=new Image();
      img.onload=function(){
        try{
          var cv=document.createElement('canvas'); cv.width=PW; cv.height=PH;
          cv.getContext('2d').drawImage(img,0,0,PW,PH);
          resolve(cv.toDataURL('image/png'));
        }catch(err){ reject(err); }
      };
      img.onerror=reject;
      img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(xml);
    }catch(e){ reject(e); }
  });
}

function fmtDate(ts){
  try{ return new Date(ts).toLocaleString('sv-SE',{dateStyle:'short',timeStyle:'short'}); }
  catch(e){ return new Date(ts).toISOString().slice(0,16).replace('T',' '); }
}
function renderGallery(){
  var g=$('#gal');
  $('#printGal').disabled=!gallery.length;
  if(!gallery.length){
    g.innerHTML='<p class="hint">Inga bilder än. Tryck på Ta skärmbild för att lägga till den första.</p>';
    return;
  }
  var h='';
  gallery.forEach(function(r,idx){
    h+='<article class="card" data-idx="'+idx+'"><span class="ordnum">'+(idx+1)+'</span>'+
       '<button type="button" class="thumb" data-view="'+r.id+'" aria-label="Visa '+esc(r.name)+'"><img src="'+r.data+'" alt=""></button>'+
       '<div class="card-head"><span class="draghandle" title="Dra för att ändra ordning" aria-hidden="true">⠿⠿</span><span class="cn">'+esc(r.name)+'</span></div>'+
       '<div class="cd">'+fmtDate(r.ts)+'</div>'+
       '<div class="row">'+(dlCap?'<button type="button" class="btn" data-dl="'+r.id+'">Ladda ner</button>':'')+
       '<button type="button" class="btn" data-del="'+r.id+'">'+(armedId===r.id?'Bekräfta':'Ta bort')+'</button></div></article>';
  });
  g.innerHTML=h;
}

/* ---------- Dra för att ändra bildordning ---------- */
(function(){
  var galEl=$('#gal'), dragIdx=null, overIdx=null, overSide=null, ghost=null;
  function clearMarks(){ document.querySelectorAll('#gal .card').forEach(function(c){ c.classList.remove('dragging','drop-before','drop-after'); }); }
  function moveGhost(x,y){ if(ghost){ ghost.style.left=(x-ghost.offsetWidth/2)+'px'; ghost.style.top=(y-18)+'px'; } }
  galEl.addEventListener('pointerdown',function(e){
    var handle=e.target.closest('.draghandle'); if(!handle) return;
    var card=handle.closest('.card'); if(!card) return;
    e.preventDefault();
    dragIdx=+card.dataset.idx; overIdx=null; overSide=null;
    card.classList.add('dragging');
    var r=card.getBoundingClientRect();
    ghost=card.cloneNode(true);
    ghost.classList.add('drag-ghost'); ghost.classList.remove('dragging');
    ghost.style.width=r.width+'px';
    document.body.appendChild(ghost);
    moveGhost(e.clientX,e.clientY);
    galEl.setPointerCapture(e.pointerId);
  });
  galEl.addEventListener('pointermove',function(e){
    if(dragIdx===null) return;
    moveGhost(e.clientX,e.clientY);
    document.querySelectorAll('#gal .card').forEach(function(c){ c.classList.remove('drop-before','drop-after'); });
    var el=document.elementFromPoint(e.clientX,e.clientY);
    var card=el&&el.closest?el.closest('#gal .card'):null;
    if(card&&+card.dataset.idx!==dragIdx){
      overIdx=+card.dataset.idx;
      var r=card.getBoundingClientRect();
      overSide=(e.clientX-r.left)<r.width/2?'before':'after';
      card.classList.add(overSide==='before'?'drop-before':'drop-after');
    } else { overIdx=null; overSide=null; }
  });
  function finishDrag(cancelled){
    if(dragIdx===null) return;
    clearMarks();
    if(ghost){ ghost.remove(); ghost=null; }
    if(!cancelled&&overIdx!==null&&overIdx!==dragIdx){
      var item=gallery.splice(dragIdx,1)[0];
      var target=overIdx+(overSide==='after'?1:0);
      if(target>dragIdx) target-=1;
      target=Math.max(0,Math.min(gallery.length,target));
      gallery.splice(target,0,item);
      renderGallery();
      galMsg('Ordningen uppdaterades.');
    }
    dragIdx=null; overIdx=null; overSide=null;
  }
  galEl.addEventListener('pointerup',function(){ finishDrag(false); });
  galEl.addEventListener('pointercancel',function(){ finishDrag(true); });
})();

$('#printGal').addEventListener('click',function(){
  if(!gallery.length) return;
  var h='';
  gallery.forEach(function(r){ h+='<div class="print-page"><h2>'+esc(r.name)+'</h2><img src="'+r.data+'" alt=""></div>'; });
  $('#printArea').innerHTML=h;
  window.print();
});
window.addEventListener('afterprint',function(){ $('#printArea').innerHTML=''; });
function galMsg(t){ $('#galMsg').textContent=t; }
function shotMsg(t){ $('#shotMsg').textContent=t; }
function defaultName(){ return state.myForm+' mot '+state.oppForm; }
function fileName(n,ext){ return ((n||'').replace(/[\\\/:*?"<>|]+/g,'-').trim()||'taktiktavla')+'.'+(ext||'png'); }
function dataToBytes(d){
  var b=atob(d.split(',')[1]), u=new Uint8Array(b.length);
  for(var i=0;i<b.length;i++) u[i]=b.charCodeAt(i);
  return u;
}
function download(name,data){
  if(!dlCap) return;
  dlCap.save({filename:fileName(name),data:dataToBytes(data).buffer}).then(function(){
    shotMsg('Bilden sparades på din enhet.'); galMsg('Bilden sparades på din enhet.');
  }).catch(function(err){
    var m=(err&&err.code==='declined')?'Nedladdningen avbröts.':'Det gick inte att ladda ner bilden här.';
    shotMsg(m); galMsg(m);
  });
}

function openShot(isNew,rec,nameOverride){
  viewing=isNew?null:rec;
  $('#shotTitle').textContent=isNew?'Ny skärmbild':rec.name;
  $('#shotNameWrap').hidden=!isNew;
  $('#shotSave').hidden=!isNew;
  $('#shotDl').hidden=!dlCap;
  $('#shotCancel').textContent=isNew?'Avbryt':'Stäng';
  $('#shotPreview').src=isNew?pendingShot:rec.data;
  shotMsg('');
  $('#shot').hidden=false;
  setTimeout(function(){
    if(isNew){ var n=$('#shotName'); n.value=nameOverride||defaultName(); n.focus(); n.select(); }
    else $('#shotCancel').focus();
  },30);
}
function closeShot(){ $('#shot').hidden=true; pendingShot=null; viewing=null; $('#shotPreview').removeAttribute('src'); }

function startShot(){
  if(state.playing) return;
  hidePop();
  state.sel=null; render();
  makeShot().then(function(d){ pendingShot=d; openShot(true); })
    .catch(function(){ galMsg('Det gick inte att skapa skärmbilden i den här webbläsaren.'); });
}
document.querySelectorAll('.js-shot').forEach(function(b){ b.addEventListener('click',startShot); });

function makeStartelvaShot(){
  return makeShot().then(function(pitchUrl){
    return new Promise(function(resolve,reject){
      var img=new Image();
      img.onload=function(){
        try{
          var ers=squad.filter(function(r){return r.status==='ers';});
          var listW=280, pad=22, lineH=32, headerH=40;
          var neededH=headerH+pad*2+Math.max(1,ers.length)*lineH;
          var cv=document.createElement('canvas');
          cv.width=img.width+listW;
          cv.height=Math.max(img.height,neededH);
          var ctx=cv.getContext('2d');
          ctx.fillStyle='#ffffff'; ctx.fillRect(0,0,cv.width,cv.height);
          ctx.drawImage(img,0,0);
          var x=img.width+pad, y=pad+28;
          ctx.textBaseline='alphabetic';
          ctx.fillStyle='#111111';
          ctx.font='700 26px Arial, Helvetica, sans-serif';
          ctx.fillText('Ersättare',x,y);
          y+=lineH;
          ctx.font='600 20px Arial, Helvetica, sans-serif';
          if(!ers.length){
            ctx.fillStyle='#777777';
            ctx.fillText('Inga ersättare valda.',x,y);
          } else {
            ers.forEach(function(r){
              ctx.fillStyle='#111111';
              var label='- '+(r.num!==''?r.num+'. ':'')+r.name;
              ctx.fillText(label,x,y);
              y+=lineH;
            });
          }
          resolve(cv.toDataURL('image/png'));
        }catch(err){ reject(err); }
      };
      img.onerror=reject;
      img.src=pitchUrl;
    });
  });
}
$('#tpStartImg').addEventListener('click',function(){
  if(state.playing) return;
  hidePop();
  state.sel=null; render();
  makeStartelvaShot().then(function(d){ pendingShot=d; openShot(true,null,'Startelva'); })
    .catch(function(){ tpMsg('Det gick inte att skapa bilden i den här webbläsaren.'); });
});

$('#shotSave').addEventListener('click',function(){
  if(!pendingShot) return;
  var name=$('#shotName').value.trim()||defaultName();
  var rec={id:Date.now().toString(36)+Math.random().toString(36).slice(2,6),name:name,ts:Date.now(),data:pendingShot};
  gallery.unshift(rec);
  closeShot(); renderGallery();
  galMsg('La till "'+name+'" bland bilderna. Tryck på Spara session för att spara den med sessionen.');
});
$('#shotDl').addEventListener('click',function(){
  if(viewing) download(viewing.name,viewing.data);
  else if(pendingShot) download($('#shotName').value.trim()||defaultName(),pendingShot);
});
$('#shotCancel').addEventListener('click',closeShot);
$('#shotName').addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); $('#shotSave').click(); } });
$('#shot').addEventListener('click',function(e){ if(e.target===$('#shot')) closeShot(); });
document.addEventListener('keydown',function(e){ if(e.key==='Escape'&&!$('#shot').hidden) closeShot(); });

$('#gal').addEventListener('click',function(e){
  var b=e.target.closest('button'); if(!b) return;
  var id=b.dataset.view||b.dataset.dl||b.dataset.del;
  var rec=gallery.filter(function(r){return r.id===id})[0];
  if(!rec) return;
  if(b.dataset.view){ openShot(false,rec); }
  else if(b.dataset.dl){ download(rec.name,rec.data); }
  else if(b.dataset.del){
    if(armedId===id){
      clearTimeout(armedTimer); armedId=null;
      gallery=gallery.filter(function(r){return r.id!==id});
      renderGallery();
      galMsg('Bilden togs bort.');
    } else {
      armedId=id; renderGallery();
      clearTimeout(armedTimer);
      armedTimer=setTimeout(function(){ armedId=null; renderGallery(); },3000);
    }
  }
});

function initGallery(){
  renderGallery();
  if(window.claude&&window.claude.use){
    window.claude.use('downloads').then(function(d){ dlCap=d; renderGallery(); renderSessions(); }).catch(function(){});
  } else {
    /* Egen värd (t.ex. GitHub Pages): vanlig nedladdning i webbläsaren */
    dlCap={save:function(o){
      return new Promise(function(res,rej){
        try{
          var mime=/\.json$/i.test(o.filename)?'application/json':'image/png';
          var blob=new Blob([o.data],{type:mime});
          var url=URL.createObjectURL(blob), a=document.createElement('a');
          a.href=url; a.download=o.filename; document.body.appendChild(a); a.click(); a.remove();
          setTimeout(function(){ URL.revokeObjectURL(url); },3000);
          res({status:'saved'});
        }catch(e){ rej({code:'unavailable'}); }
      });
    }};
    renderGallery(); renderSessions();
  }
}
