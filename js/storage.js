'use strict';
/* IndexedDB (med reserv i minnet om det inte går) */
var idbP=null;
function openDB(){
  if(idbP) return idbP;
  idbP=new Promise(function(res){
    try{
      var r=indexedDB.open('taktiktavla-bilder',2);
      r.onupgradeneeded=function(){
        var db=r.result;
        if(!db.objectStoreNames.contains('img')) db.createObjectStore('img',{keyPath:'id'});
        if(!db.objectStoreNames.contains('ses')) db.createObjectStore('ses',{keyPath:'id'});
      };
      r.onsuccess=function(){ res(r.result); };
      r.onerror=function(){ res(null); };
      r.onblocked=function(){ res(null); };
    }catch(e){ res(null); }
  });
  return idbP;
}
function tx(mode,fn,store){
  store=store||'img';
  return openDB().then(function(db){
    if(!db) return null;
    return new Promise(function(res){
      try{
        var t=db.transaction(store,mode), rq=fn(t.objectStore(store));
        t.oncomplete=function(){ res(rq&&rq.result!==undefined?rq.result:true); };
        t.onerror=function(){ res(null); };
        t.onabort=function(){ res(null); };
      }catch(e){ res(null); }
    });
  });
}
