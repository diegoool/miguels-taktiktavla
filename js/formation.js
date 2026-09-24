'use strict';
function rows(f){return f.split('-').map(Number)}

function place(r,xMin,xMax){
  var pts=[], k=r.length;
  r.forEach(function(cnt,i){
    var x=k===1?(xMin+xMax)/2:xMin+(xMax-xMin)*i/(k-1);
    var w=Math.min(52,14*cnt+10);
    for(var j=0;j<cnt;j++){
      var y=cnt===1?34:34-w/2+w*j/(cnt-1);
      pts.push([x,y]);
    }
  });
  return pts;
}
function applyOv(arr,hasGK,ov){
  if(!ov) return;
  if(ov.gk && hasGK) arr[0]=ov.gk;
  var start=hasGK?1:0;
  ov.list.forEach(function(p,i){ if(start+i<arr.length) arr[start+i]=p; });
}
function compute(){
  var f=FORMS[state.n];
  var sit=state.setPiece?null:SITS[state.situation];
  var myR=sit?sit.my:[18,47], opR=sit?sit.opp:[18,47];
  var my=[], opp=[];
  if(f.gk){ my.push([5,34]); opp.push([L-5,34]); }
  place(rows(state.myForm),myR[0],myR[1]).forEach(function(p){my.push(p)});
  place(rows(state.oppForm),opR[0],opR[1]).forEach(function(p){opp.push([L-p[0],W-p[1]])});
  var ball=sit?sit.ball:[52.5,34];
  if(state.setPiece&&SETS[state.setPiece]){
    var s=SETS[state.setPiece]();
    ball=s.ball; applyOv(my,f.gk,s.my); applyOv(opp,f.gk,s.opp);
  }
  return {my:my,opp:opp,ball:ball};
}
function rebuild(){
  var pos=compute();
  state.players=[];
  pos.my.forEach(function(q,i){state.players.push({id:'m'+i,team:'m',num:i+1,x:q[0],y:q[1]})});
  pos.opp.forEach(function(q,i){state.players.push({id:'o'+i,team:'o',num:i+1,x:q[0],y:q[1]})});
  state.ball={x:pos.ball[0],y:pos.ball[1]};
  state.ann=[]; state.phases=[]; state.linkStart=null; state.swapStart=null; state.sel=null;
  render(); updateUI();
}
