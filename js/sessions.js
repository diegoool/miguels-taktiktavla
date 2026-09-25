'use strict';
/* ---------- Sessioner ---------- */
var sessions=[], sesArmed=null, sesTimer=null;
/* Aktiv session: det som senast laddades/sparades, och utgångsläget för att upptäcka ändringar */
var activeSesId=null, sesBase=null, sesBaseStr=null, fsBaseSig=null, sesFlags={ses:false,fs:false,hasFs:false};
/* Förstasidans uppgifter (hemma/borta, motstånd, datum, samling, matchstart) för den aktuella förstasidan */
var fsInfoCur=null;
function has(o,k){ return Object.prototype.hasOwnProperty.call(o,k); }
function num(v,a,b,def){ v=+v; return isFinite(v)?clamp(v,a,b):def; }
function sanitizePhases(arr){
  var out=[];
  (Array.isArray(arr)?arr.slice(0,30):[]).forEach(function(ph){
    if(!ph||typeof ph.p!=='object'||!ph.p||!Array.isArray(ph.b)) return;
    var snap={p:{},b:[num(ph.b[0],-4,L+4,52.5),num(ph.b[1],-4,W+4,34)]};
    state.players.forEach(function(p){
      var q=ph.p[p.id];
      snap.p[p.id]=Array.isArray(q)?[num(q[0],-4,L+4,p.x),num(q[1],-4,W+4,p.y)]:[p.x,p.y];
    });
    out.push(snap);
  });
  return out;
}
function sanitizeAnn(arr,ids){
  var out=[];
  (Array.isArray(arr)?arr.slice(0,300):[]).forEach(function(a){
    if(!a||typeof a!=='object') return;
    if(a.t==='run'||a.t==='pass'){
      out.push({t:a.t,x1:num(a.x1,-10,L+10,0),y1:num(a.y1,-10,W+10,0),x2:num(a.x2,-10,L+10,0),y2:num(a.y2,-10,W+10,0)});
    } else if(a.t==='link'){
      if(ids[a.a]&&ids[a.b]) out.push({t:'link',a:a.a,b:a.b});
    } else if(a.t==='text'){
      var t=String(a.s==null?'':a.s).slice(0,200); if(!t) return;
      out.push({t:'text',x:num(a.x,-10,L+10,52.5),y:num(a.y,-10,W+10,34),w:num(a.w,6,140,20),h:num(a.h,3.6,80,6),s:t,bg:!!a.bg});
    }
  });
  return out;
}
var sesMsg=msgFn('#sesMsg');

function serialize(name){
  var ann=state.ann.map(function(a){ var o={}; Object.keys(a).forEach(function(k){ if(k.charAt(0)!=='_') o[k]=a[k]; }); return o; });
  return {
    app:'taktiktavla', v:1, name:name||'',
    n:state.n, myForm:state.myForm, oppForm:state.oppForm, setPiece:state.setPiece, situation:state.situation,
    players:state.players.map(function(p){ return {id:p.id,x:+p.x.toFixed(2),y:+p.y.toFixed(2)}; }),
    ball:{x:+state.ball.x.toFixed(2),y:+state.ball.y.toFixed(2)},
    ann:ann, labels:state.labels, customNum:state.customNum, colors:state.colors,
    pitch:state.pitch, half:state.half, panLo:state.panLo, size:state.size, portrait:state.portrait,
    showOpp:state.showOpp, showBall:state.showBall, chan5:state.chan5, chan4:state.chan4, namesInCircle:state.namesInCircle,
    phases:state.phases,
    images:gallery.map(function(r){ var o={name:r.name,ts:r.ts,data:r.data}; if(r.fs) o.fs=r.fs; return o; }),
    animations:anims.map(function(r){ return {name:r.name,ts:r.ts,phases:r.phases}; }),
    customSets:customSets.map(function(r){ return {name:r.name,ts:r.ts,data:r.data}; }),
    squad:squad.map(function(r){ return {num:r.num,name:r.name,status:r.status||null}; }),
    logo:logoData||null,
    fsInfo:fsInfoCur?cloneData(fsInfoCur):null
  };
}

/* Fälten i förstasidans dialog */
function getFsInputs(){
  return {
    side:(document.querySelector('input[name="fsSide"]:checked')||{}).value||'hemma',
    motstand:$('#fsMotstand').value.trim(),
    datum:$('#fsDatum').value.trim(),
    samling:$('#fsSamling').value.trim(),
    matchstart:$('#fsMatchstart').value.trim()
  };
}
function setFsInputs(f){
  f=f||{};
  var r=document.querySelector('input[name="fsSide"][value="'+(f.side==='borta'?'borta':'hemma')+'"]'); if(r) r.checked=true;
  $('#fsMotstand').value=f.motstand||''; $('#fsDatum').value=f.datum||'';
  $('#fsSamling').value=f.samling||''; $('#fsMatchstart').value=f.matchstart||'';
}
function fsHeader(f){
  return f?{side:f.side==='borta'?'borta':'hemma',motstand:f.motstand||'',datum:f.datum||'',samling:f.samling||'',matchstart:f.matchstart||''}:null;
}
function sanitizeFs(f){
  if(!f||typeof f!=='object') return null;
  function s(v,n){ return typeof v==='string'?v.slice(0,n):''; }
  var o={side:f.side==='borta'?'borta':'hemma',motstand:s(f.motstand,60),datum:s(f.datum,30),samling:s(f.samling,30),matchstart:s(f.matchstart,30),sig:s(f.sig,20000)};
  if(isFinite(+f.listY)&&f.listY!==null&&f.listY!=='') o.listY=clamp(+f.listY,0,20000);
  return o;
}

/* ---------- Ändringar i den aktiva sessionen ---------- */
function isForstasida(r){ return !!(r&&(r.fs||r.name==='Förstasida')); }
function firstFsIndex(arr){ for(var i=0;i<arr.length;i++) if(isForstasida(arr[i])) return i; return -1; }
/* Ersätt alla förstasidor i listan med en ny, på den första förstasidans plats */
function replaceFs(arr,rec){
  var at=firstFsIndex(arr);
  var out=arr.filter(function(r){ return !isForstasida(r); });
  out.splice(at<0?0:Math.min(at,out.length),0,rec);
  return out;
}
/* Truppens läge så som det syns på förstasidan: nummer, namn och startelva/ersättare/ej uttagen */
function squadSig(){
  return JSON.stringify(squad.map(function(r){ return [String(r.num),r.name,squadOnPitch(r)?'start':(r.status||'')]; }).sort());
}
function imgSig(im){ return im.name+'|'+im.ts+'|'+im.data.length+'|'+im.data.slice(-48)+'|'+(im.fs?im.fs.sig:''); }
/* Lätt kopia av en session att jämföra med: bilder och logga ersätts av korta avtryck */
function sesLight(d){
  var o={}; Object.keys(d).forEach(function(k){ o[k]=d[k]; });
  o.name=''; o.images=(d.images||[]).map(function(im){ return {s:imgSig(im),name:im.name,fs:!!im.fs}; });
  o.logo=d.logo?d.logo.length+'|'+d.logo.slice(-48):null;
  ['labels','customNum'].forEach(function(k){ var m=d[k]||{}, n={}; Object.keys(m).sort().forEach(function(x){ n[x]=m[x]; }); o[k]=n; });
  return o;
}
function cloneData(d){ return JSON.parse(JSON.stringify(d)); }
function activeSession(){ return activeSesId?sessions.filter(function(r){ return r.id===activeSesId; })[0]||null:null; }
function setActiveSession(id){
  activeSesId=id;
  sesBase=id?cloneData(sesLight(serialize(''))):null;
  sesBaseStr=sesBase?JSON.stringify(sesBase):null;
  var fr=gallery[firstFsIndex(gallery)];
  fsBaseSig=fr?((fr.fs&&fr.fs.sig)||squadSig()):null;
  refreshSesFlags(true);
}
function refreshSesFlags(force){
  if(state.playing&&!force) return;
  var on=!!activeSession();
  var hasFs=firstFsIndex(gallery)>=0;
  var f={ses:on&&JSON.stringify(sesLight(serialize('')))!==sesBaseStr, hasFs:hasFs, fs:hasFs&&fsBaseSig!==null&&squadSig()!==fsBaseSig};
  if(!force&&f.ses===sesFlags.ses&&f.fs===sesFlags.fs&&f.hasFs===sesFlags.hasFs) return;
  sesFlags=f;
  document.querySelectorAll('#sesList [data-supd]').forEach(function(b){ b.disabled=!(b.dataset.supd===activeSesId&&f.ses); });
  $('#fsBtn').textContent=hasFs?'Update Förstasida':'Förstasida';
  $('#fsTrupp').disabled=fsBusy||!f.fs;
}
setInterval(function(){ refreshSesFlags(false); },600);

function applySession(d){
  if(!d||typeof d!=='object'||d.app!=='taktiktavla') return false;
  var n=+d.n; if(!has(FORMS,n)) return false;
  var list=FORMS[n].list;
  state.n=n;
  state.myForm=list.indexOf(d.myForm)>=0?d.myForm:FORMS[n].my;
  state.oppForm=list.indexOf(d.oppForm)>=0?d.oppForm:list[0];
  state.setPiece=(typeof d.setPiece==='string'&&has(SETS,d.setPiece))?d.setPiece:'';
  state.situation=(!state.setPiece&&typeof d.situation==='string'&&has(SITS,d.situation))?d.situation:'';
  var hex=/^#[0-9a-f]{6}$/i, cl=d.colors||{};
  state.colors={m:hex.test(cl.m)?cl.m.toLowerCase():'#d62839',o:hex.test(cl.o)?cl.o.toLowerCase():'#fecc00'};
  state.pitch=d.pitch==='white'?'white':'green';
  state.half=d.half==='half'?'half':'full';
  state.panLo=num(d.panLo,-M,L/2,-M);
  state.size=d.size==='s'?'s':'n';
  state.portrait=!!d.portrait;
  state.showOpp=d.showOpp!==false; state.showBall=d.showBall!==false;
  state.chan5=d.chan5!==undefined?!!d.chan5:!!d.channels; state.chan4=!!d.chan4;
  if(state.chan5&&state.chan4) state.chan4=false;
  state.namesInCircle=!!d.namesInCircle;
  state.tool='move'; state.linkStart=null; state.swapStart=null;

  rebuild();

  var pos={};
  (Array.isArray(d.players)?d.players:[]).forEach(function(q){ if(q&&typeof q.id==='string') pos[q.id]=q; });
  var ids={};
  state.players.forEach(function(p){
    ids[p.id]=1;
    var q=pos[p.id]; if(q){ p.x=num(q.x,-4,L+4,p.x); p.y=num(q.y,-4,W+4,p.y); }
  });
  if(d.ball&&typeof d.ball==='object'){ state.ball.x=num(d.ball.x,-4,L+4,state.ball.x); state.ball.y=num(d.ball.y,-4,W+4,state.ball.y); }

  state.labels={};
  if(d.labels&&typeof d.labels==='object'){
    Object.keys(d.labels).forEach(function(k){ if(ids[k]&&typeof d.labels[k]==='string') state.labels[k]=d.labels[k].slice(0,60); });
  }
  state.customNum={};
  if(d.customNum&&typeof d.customNum==='object'){
    Object.keys(d.customNum).forEach(function(k){
      if(!ids[k]) return;
      var v=d.customNum[k]; if(v===''||v==null) return;
      var n=+v; if(isFinite(n)) state.customNum[k]=clamp(Math.round(n),1,99);
    });
  }
  state.ann=sanitizeAnn(d.ann,ids);
  state.phases=sanitizePhases(d.phases);

  gallery=[];
  (Array.isArray(d.images)?d.images.slice(0,50):[]).forEach(function(im){
    if(!im||typeof im.data!=='string'||im.data.length>8000000) return;
    if(!/^data:image\/png;base64,[A-Za-z0-9+\/=]+$/.test(im.data)) return;
    var gr={id:'i'+Date.now().toString(36)+Math.random().toString(36).slice(2,7),name:String(im.name==null?'Bild':im.name).slice(0,60),ts:num(im.ts,0,8.64e15,Date.now()),data:im.data};
    var fs=sanitizeFs(im.fs); if(fs) gr.fs=fs;
    gallery.push(gr);
  });
  renderGallery();
  /* Äldre sessioner saknar fälten; ta dem då från förstasidan om den vet dem */
  var fsImg=gallery[firstFsIndex(gallery)];
  fsInfoCur=fsHeader(sanitizeFs(d.fsInfo)||(fsImg&&fsImg.fs)||null);

  anims=[];
  (Array.isArray(d.animations)?d.animations.slice(0,50):[]).forEach(function(a){
    if(!a||typeof a!=='object') return;
    var ph=sanitizePhases(a.phases);
    if(ph.length<2) return;
    anims.push({id:'a'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),name:String(a.name==null?'Animation':a.name).slice(0,60),ts:num(a.ts,0,8.64e15,Date.now()),phases:ph});
  });
  renderAnims();

  customSets=[];
  (Array.isArray(d.customSets)?d.customSets.slice(0,50):[]).forEach(function(c){
    if(!c||typeof c!=='object'||!c.data||typeof c.data!=='object') return;
    var dd=c.data, cn=+dd.n; if(!has(FORMS,cn)) return;
    var clist=FORMS[cn].list;
    customSets.push({
      id:'c'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),
      name:String(c.name==null?'Situation':c.name).slice(0,60),
      ts:num(c.ts,0,8.64e15,Date.now()),
      data:{
        n:cn,
        myForm:clist.indexOf(dd.myForm)>=0?dd.myForm:FORMS[cn].my,
        oppForm:clist.indexOf(dd.oppForm)>=0?dd.oppForm:clist[0],
        p:(dd.p&&typeof dd.p==='object')?dd.p:{},
        b:Array.isArray(dd.b)?dd.b:[52.5,34],
        ann:Array.isArray(dd.ann)?dd.ann.slice(0,300):[]
      }
    });
  });
  renderCustomSets();
  syncSetPieceOptions();

  squad=[];
  (Array.isArray(d.squad)?d.squad.slice(0,60):[]).forEach(function(r){
    if(!r||typeof r!=='object'||typeof r.name!=='string'||!r.name.trim()) return;
    var n=''; if(r.num!==''&&r.num!=null){ var nn=+r.num; if(isFinite(nn)) n=clamp(Math.round(nn),1,99); }
    var st=(r.status==='ers'||r.status==='ej')?r.status:null;
    squad.push({id:'t'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),num:n,name:r.name.slice(0,40),status:st});
  });
  renderSquad();

  logoData=(typeof d.logo==='string'&&d.logo.length<3000000&&d.logo.indexOf('data:image/png')===0)?d.logo:null;
  updateLogoDisplay();

  /* Synka kontrollerna */
  $('#size').value=String(state.n); fillForms();
  $('#setPiece').value=state.setPiece; $('#situation').value=state.situation;
  $('#pitchSel').value=state.pitch; $('#sizeSel').value=state.size;
  $('#chkOpp').checked=state.showOpp; $('#chkBall').checked=state.showBall; $('#chkChan5').checked=state.chan5; $('#chkChan4').checked=state.chan4;
  $('#btnNumMode').setAttribute('aria-pressed',state.namesInCircle?'false':'true'); $('#btnNameMode').setAttribute('aria-pressed',state.namesInCircle?'true':'false');
  $('#colMy').value=state.colors.m; $('#colOpp').value=state.colors.o;
  applyTheme(); hidePop(); render(); updateUI();
  return true;
}

function renderSessions(){
  var g=$('#sesList');
  if(!sessions.length){
    g.innerHTML='<p class="hint">Inga sparade sessioner än. Ge sessionen ett namn och tryck på Spara session.</p>';
    return;
  }
  var h='';
  sessions.forEach(function(r){
    var d=r.data||{}, sub=(d.n?d.n+' mot '+d.n+', ':'')+(d.myForm||'')+' mot '+(d.oppForm||'');
    var act=r.id===activeSesId;
    h+='<article class="card'+(act?' ses-active':'')+'"'+(act?' aria-current="true"':'')+'><div class="cn">'+esc(r.name)+'</div><div class="cd">'+esc(sub)+'</div><div class="cd">'+((d.animations&&d.animations.length)||0)+' animationer, '+((d.images&&d.images.length)||0)+' bilder</div><div class="cd">'+fmtDate(r.ts)+'</div>'+
       '<div class="row"><button type="button" class="btn primary" data-sload="'+r.id+'">Ladda</button>'+
       (dlCap?'<button type="button" class="btn" data-sexp="'+r.id+'">Exportera</button>':'')+
       '<button type="button" class="btn" data-sdel="'+r.id+'">'+(sesArmed===r.id?'Bekräfta':'Ta bort')+'</button></div>'+
       '<div class="row"><button type="button" class="btn" data-supd="'+r.id+'"'+(act&&sesFlags.ses?'':' disabled')+' title="Spara ändringarna i den laddade sessionen">Update</button></div></article>';
  });
  g.innerHTML=h;
}
function saveSessionRecord(name,data){
  var rec={id:Date.now().toString(36)+Math.random().toString(36).slice(2,6),name:name,ts:Date.now(),data:cloneData(data)};
  sessions.unshift(rec);
  setActiveSession(rec.id); renderSessions();
  return tx('readwrite',function(st){return st.put(rec)},'ses');
}


function drawWrappedCenter(ctx,text,cx,y,maxW,lineH){
  var words=String(text).split(/\s+/).filter(Boolean), line='', lines=[];
  for(var i=0;i<words.length;i++){
    var t=line?line+' '+words[i]:words[i];
    if(ctx.measureText(t).width>maxW&&line){ lines.push(line); line=words[i]; } else line=t;
  }
  if(line) lines.push(line);
  lines.forEach(function(ln){ ctx.fillText(ln,cx,y); y+=lineH; });
  return y;
}

/* Spelarlistan på förstasidan: startelva och ersättare, sorterade på nummer, i tre kolumner */
var FS_W=1100, FS_LINE=40;
function fsListArr(){
  return squad.filter(function(r){ return squadOnPitch(r)||r.status==='ers'; })
    .sort(function(a,b){ return (+a.num||99)-(+b.num||99); });
}
function drawFsList(ctx,listY,listArr){
  var rows=Math.ceil(listArr.length/3);
  var cols=[listArr.slice(0,rows),listArr.slice(rows,2*rows),listArr.slice(2*rows)];
  var blockW=Math.min(780,FS_W-160), startX=(FS_W-blockW)/2, colW=blockW/3;
  ctx.textAlign='left'; ctx.font='500 26px Arial, Helvetica, sans-serif'; ctx.fillStyle='#1b232c';
  cols.forEach(function(col,ci){
    col.forEach(function(r,i){
      ctx.fillText((r.num!==''?r.num+'. ':'')+r.name,startX+ci*colW,listY+i*FS_LINE);
    });
  });
}
function fsGradient(ctx,H){
  var g=ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#ffffff'); g.addColorStop(1,'#eef1f5');
  return g;
}
/* Var spelarlistan börjar (baslinjen för första raden) i en förstasida som skapats innan
   den positionen sparades: sök textrader nedifrån med 40 px mellanrum som börjar i en kolumn. */
function findFsListY(img){
  var cv=document.createElement('canvas'); cv.width=img.width; cv.height=img.height;
  var c=cv.getContext('2d'); c.drawImage(img,0,0);
  var d=c.getImageData(0,0,cv.width,cv.height).data, bands=[], cur=null;
  for(var y=20;y<cv.height;y++){
    var minX=-1;
    for(var x=0;x<cv.width;x++){
      var i=(y*cv.width+x)*4;
      if(d[i]+d[i+1]+d[i+2]<450){ minX=x; break; }
    }
    if(minX>=0){ if(cur){ cur.bottom=y; cur.minX=Math.min(cur.minX,minX); } else cur={top:y,bottom:y,minX:minX}; }
    else if(cur){ bands.push(cur); cur=null; }
  }
  if(cur) bands.push(cur);
  if(!bands.length) return 120;
  /* Varje listrad har text i första kolumnen (eller bara i tredje i äldre bilder med ersättarna för sig);
     centrerad rubriktext kan inte börja där med listans teckenhöjd */
  function inCol(b){ return b.bottom-b.top<=32&&[160,680].some(function(cx){ return b.minX>=cx-10&&b.minX<=cx+15; }); }
  var top=null;
  for(var k=bands.length-1;k>=0;k--){
    var b=bands[k];
    if(!inCol(b)) break;
    if(top!==null&&Math.abs(top-b.top-FS_LINE)>1) break;
    top=b.top;
  }
  if(top!==null) return top+19;
  /* Ingen lista: lägg den där den skulle ha hamnat under sista raden (motståndet är större text) */
  var last=bands[bands.length-1];
  return last.bottom+(last.bottom-last.top>32?132:78);
}
/* Rita om bara spelarlistan: allt ovanför (logga, hemma/borta, motstånd, datum …) behålls från den gamla bilden */
function redrawFsList(old){
  return new Promise(function(resolve,reject){
    var img=new Image();
    img.onload=function(){
      try{
        if(img.width!==FS_W) throw new Error('size');
        var listY=(old.fs&&old.fs.listY!=null)?old.fs.listY:findFsListY(img);
        var cut=Math.max(0,Math.min(img.height,listY-30));
        var listArr=fsListArr();
        var H=Math.max(500,Math.round(listY+Math.ceil(listArr.length/3)*FS_LINE+50));
        var cv=document.createElement('canvas'); cv.width=FS_W; cv.height=H;
        var ctx=cv.getContext('2d');
        ctx.fillStyle=fsGradient(ctx,img.height); ctx.fillRect(0,0,FS_W,H);
        ctx.drawImage(img,0,0,FS_W,cut,0,0,FS_W,cut);
        drawFsList(ctx,listY,listArr);
        resolve({data:cv.toDataURL('image/png'),listY:listY});
      }catch(e){ reject(e); }
    };
    img.onerror=reject;
    img.src=old.data;
  });
}

function makeForstasida(info){
  return new Promise(function(resolve){
    var W=FS_W, cx=W/2;
    var mctx=document.createElement('canvas').getContext('2d');
    mctx.font='800 58px Arial, Helvetica, sans-serif';
    function wrapCount(text,maxW){
      var words=String(text).split(/\s+/).filter(Boolean), line='', n=0;
      words.forEach(function(w){
        var t=line?line+' '+w:w;
        if(mctx.measureText(t).width>maxW&&line){ n++; line=w; } else line=t;
      });
      if(line) n++;
      return Math.max(1,n);
    }
    var listArr=fsListArr();
    var listRows=Math.ceil(listArr.length/3);
    var motstandLines=wrapCount((info.motstand||'Motstånd').toUpperCase(),W-140);
    var infoLines=[info.datum,info.samling,info.matchstart].filter(Boolean).length;
    var y0=logoData?190:70;
    y0+=54+motstandLines*62+34+infoLines*42+36;
    y0+=listRows*40;
    var H=Math.max(500,Math.round(y0+50));
    var cv=document.createElement('canvas'); cv.width=W; cv.height=H;
    var ctx=cv.getContext('2d');
    var accent=(state.colors&&state.colors.m)||'#0a6fb0';
    ctx.fillStyle=fsGradient(ctx,H); ctx.fillRect(0,0,W,H);
    ctx.fillStyle=accent; ctx.fillRect(0,0,W,16);
    ctx.textAlign='center';

    function drawRest(y){
      ctx.fillStyle='#8a93a0'; ctx.font='700 30px Arial, Helvetica, sans-serif';
      ctx.fillText(info.side==='borta'?'BORTA':'HEMMA',cx,y); y+=54;
      ctx.fillStyle='#12181f'; ctx.font='800 58px Arial, Helvetica, sans-serif';
      y=drawWrappedCenter(ctx,(info.motstand||'Motstånd').toUpperCase(),cx,y,W-140,62); y+=34;

      ctx.font='600 27px Arial, Helvetica, sans-serif'; ctx.fillStyle='#3a4048';
      [['Datum',info.datum],['Samling',info.samling],['Matchstart',info.matchstart]].forEach(function(pair){
        if(pair[1]){ ctx.fillText(pair[0]+': '+pair[1],cx,y); y+=42; }
      });
      y+=36;

      info.listY=y;
      drawFsList(ctx,y,listArr);
      resolve(cv.toDataURL('image/png'));
    }

    if(logoData){
      var lg=new Image();
      lg.onload=function(){
        try{
          var boxTop=36, maxW=260, maxH=130;
          var sc=Math.min(maxW/lg.width,maxH/lg.height,1);
          var lw=lg.width*sc, lh=lg.height*sc;
          ctx.drawImage(lg,cx-lw/2,boxTop+(maxH-lh)/2,lw,lh);
        }catch(e){}
        drawRest(190);
      };
      lg.onerror=function(){ drawRest(70); };
      lg.src=logoData;
    } else {
      drawRest(70);
    }
  });
}

/* ---------- Förstasidan: skapa, uppdatera och uppdatera truppen ---------- */
var fsBusy=false, fsMsg=msgFn('#fsMsg');
/* Lägg in en ny förstasida i stället för den gamla, bland bilderna och i den laddade sessionen.
   Truppen (uttagningen) som förstasidan visar sparas samtidigt i sessionen. Utgångsläget för
   ändringar får samma bild, trupp och uppgifter, så de räknas inte som osparade ändringar. */
function commitFs(dataUrl,info,header){
  var ts=Date.now();
  gallery=replaceFs(gallery,{id:'i'+ts.toString(36)+Math.random().toString(36).slice(2,6),name:'Förstasida',ts:ts,data:dataUrl,fs:info});
  renderGallery();
  if(header) fsInfoCur=fsHeader(header);
  fsBaseSig=info.sig;
  var rec=activeSession();
  if(!rec){ refreshSesFlags(true); return Promise.resolve(false); }
  var im={name:'Förstasida',ts:ts,data:dataUrl,fs:cloneData(info)};
  rec.data.images=replaceFs(rec.data.images||[],im);
  sesBase.images=replaceFs(sesBase.images,{s:imgSig(im),name:'Förstasida',fs:true});
  if(header){ rec.data.fsInfo=cloneData(fsInfoCur); sesBase.fsInfo=cloneData(fsInfoCur); }
  var cur=serialize(''), light=sesLight(cur);
  ['squad','labels','customNum'].forEach(function(k){ rec.data[k]=cloneData(cur[k]); sesBase[k]=cloneData(light[k]); });
  sesBaseStr=JSON.stringify(sesBase);
  refreshSesFlags(true);
  return tx('readwrite',function(st){return st.put(rec)},'ses');
}
function fsDone(what){
  return function(ok){
    fsBusy=false; refreshSesFlags(true);
    galMsg(what+(activeSession()?(ok?' och sparades i sessionen.':', men sessionen kunde inte sparas i webbläsaren.'):'. Tryck på Spara session för att spara den med sessionen.'));
  };
}
function fsFail(){ fsBusy=false; refreshSesFlags(true); galMsg('Det gick inte att skapa förstasidan i den här webbläsaren.'); }

/* Dialogen: tomma fält för en ny förstasida, annars den befintliga förstasidans uppgifter */
function openFsModal(){
  if(state.playing) return;
  hidePop();
  var has=firstFsIndex(gallery)>=0;
  setFsInputs(has?fsInfoCur:null);
  $('#fsTitle').textContent=has?'Uppdatera förstasida':'Förstasida';
  $('#fsSave').textContent=has?'Uppdatera förstasida':'Skapa förstasida';
  fsMsg('');
  $('#fsModal').hidden=false;
  setTimeout(function(){ $('#fsMotstand').focus(); },30);
}
function closeFsModal(){ $('#fsModal').hidden=true; }
$('#fsBtn').addEventListener('click',openFsModal);
$('#fsCancel').addEventListener('click',closeFsModal);
$('#fsModal').addEventListener('click',function(e){ if(e.target===$('#fsModal')) closeFsModal(); });
document.addEventListener('keydown',function(e){ if(e.key==='Escape'&&!$('#fsModal').hidden) closeFsModal(); });
['#fsMotstand','#fsDatum','#fsSamling','#fsMatchstart'].forEach(function(id){
  $(id).addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); $('#fsSave').click(); } });
});
$('#fsSave').addEventListener('click',function(){
  if(fsBusy) return;
  var info=getFsInputs(), header=cloneData(info), had=firstFsIndex(gallery)>=0;
  info.sig=squadSig();
  fsBusy=true; closeFsModal();
  makeForstasida(info).then(function(dataUrl){ return commitFs(dataUrl,info,header); })
    .then(fsDone(had?'Förstasidan uppdaterades':'Förstasidan skapades')).catch(fsFail);
});

/* Update truppen (i dialogen): spara truppen och rita om spelarlistan, resten av förstasidan behålls */
$('#fsTrupp').addEventListener('click',function(){
  var old=gallery[firstFsIndex(gallery)]; if(!old||fsBusy||state.playing) return;
  var info=cloneData(old.fs||{}), sig=squadSig();
  fsBusy=true; this.disabled=true;
  redrawFsList(old).then(function(res){
    info.sig=sig; info.listY=res.listY;
    return commitFs(res.data,info,null);
  }).then(function(ok){
    fsDone('Truppen och spelarlistan på förstasidan uppdaterades')(ok);
    fsMsg(activeSession()?(ok?'Truppen sparades och förstasidan uppdaterades.':'Förstasidan uppdaterades men sessionen kunde inte sparas i webbläsaren.'):'Förstasidan uppdaterades. Tryck på Spara session för att spara den.');
  }).catch(function(){ fsFail(); fsMsg('Det gick inte att uppdatera förstasidan.'); });
});

$('#sesSave').addEventListener('click',function(){
  if(state.playing) return;
  var name=$('#sesName').value.trim()||defaultName();
  saveSessionRecord(name,serialize(name)).then(function(ok){
    sesMsg(ok?'Sparade sessionen "'+name+'".':'Sessionen finns i listan men kunde inte sparas i webbläsaren. Exportera den som fil för att behålla den.');
  });
  $('#sesName').value='';
});
$('#sesName').addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); $('#sesSave').click(); } });

function importText(txt,hint){
  var d;
  try{ d=JSON.parse(String(txt).trim()); }
  catch(err){ sesMsg('Texten kunde inte läsas. Kontrollera att det är en session från Taktiktavla.'); return; }
  if(!applySession(d)){ sesMsg('Det där är ingen giltig session från Taktiktavla.'); return; }
  var name=(typeof d.name==='string'&&d.name.trim())||hint||'Importerad session';
  saveSessionRecord(name.slice(0,60),serialize(name)).then(function(){ sesMsg('Laddade "'+name+'" och la till den i listan.'); });
}
$('#sesImport').addEventListener('click',function(){ $('#sesFile').click(); });
$('#sesFile').addEventListener('change',function(e){
  var f=e.target.files&&e.target.files[0]; if(!f) return;
  if(f.size>80000000){ sesMsg('Filen är för stor för att vara en session.'); e.target.value=''; return; }
  var fr=new FileReader();
  fr.onload=function(){ importText(fr.result,f.name.replace(/\.json$/i,'')); };
  fr.onerror=function(){ sesMsg('Filen kunde inte läsas.'); };
  fr.readAsText(f);
  e.target.value='';
});

$('#sesList').addEventListener('click',function(e){
  var b=e.target.closest('button'); if(!b) return;
  var id=b.dataset.sload||b.dataset.sexp||b.dataset.sdel||b.dataset.supd;
  var rec=sessions.filter(function(r){return r.id===id})[0];
  if(!rec) return;
  if(b.dataset.sload){
    if(state.playing) return;
    if(applySession(rec.data)){ setActiveSession(rec.id); renderSessions(); sesMsg('Laddade "'+rec.name+'".'); }
    else sesMsg('Sessionen kunde inte laddas.');
  } else if(b.dataset.supd){
    if(state.playing||id!==activeSesId) return;
    rec.data=cloneData(serialize(rec.name)); rec.ts=Date.now();
    setActiveSession(rec.id); renderSessions();
    tx('readwrite',function(st){return st.put(rec)},'ses').then(function(ok){
      sesMsg(ok?'Uppdaterade sessionen "'+rec.name+'".':'Sessionen uppdaterades i listan men kunde inte sparas i webbläsaren.');
    });
  } else if(b.dataset.sexp){
    if(!dlCap) return;
    dlCap.save({filename:fileName(rec.name,'json'),data:JSON.stringify(Object.assign({},rec.data,{name:rec.name}))}).then(function(){
      sesMsg('Sessionen exporterades som fil.');
    }).catch(function(err){
      sesMsg((err&&err.code==='declined')?'Exporten avbröts.':'Det gick inte att exportera filen här.');
    });
  } else if(b.dataset.sdel){
    if(sesArmed===id){
      clearTimeout(sesTimer); sesArmed=null;
      sessions=sessions.filter(function(r){return r.id!==id});
      if(activeSesId===id) setActiveSession(null);
      renderSessions();
      tx('readwrite',function(st){return st.delete(id)},'ses');
      sesMsg('Sessionen togs bort.');
    } else {
      sesArmed=id; renderSessions();
      clearTimeout(sesTimer);
      sesTimer=setTimeout(function(){ sesArmed=null; renderSessions(); },3000);
    }
  }
});

function initSessions(){
  renderSessions();
  tx('readonly',function(st){return st.getAll()},'ses').then(function(list){
    if(Array.isArray(list)){
      var known={}; sessions.forEach(function(r){known[r.id]=1});
      list.forEach(function(r){ if(!known[r.id]) sessions.push(r); });
      sessions.sort(function(a,b){return b.ts-a.ts});
      renderSessions();
    }
  });
}
