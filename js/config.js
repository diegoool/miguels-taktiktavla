'use strict';
var M=4, L=105, W=68;
/* ---------- Formationer ---------- */
var FORMS={
  4:{gk:false,list:['2-2','1-2-1','3-1','1-1-2'],my:'2-2'},
  5:{gk:true,list:['2-2','1-2-1','2-1-1','1-1-2'],my:'2-2'},
  6:{gk:true,list:['2-2-1','2-1-2','3-1-1','1-2-2'],my:'2-2-1'},
  7:{gk:true,list:['2-3-1','3-2-1','2-2-2','3-1-2'],my:'2-3-1'},
  9:{gk:true,list:['3-3-2','3-2-3','2-3-3','4-3-1','3-4-1'],my:'3-3-2'},
  11:{gk:true,list:['4-4-2','4-3-3','4-2-3-1','3-5-2','3-4-3','4-1-4-1','4-5-1','5-3-2','5-4-1','4-1-2-1-2','4-2-2-2','4-4-1-1','3-4-1-2','3-4-2-1'],my:'4-3-3'}
};

/* Spelsituationer: djupled för eget lag (x) och motståndare (avstånd från eget mål) */
var SITS={
  build:  {my:[14,50],opp:[36,66],ball:[8,34]},
  attack: {my:[42,80],opp:[14,38],ball:[66,34]},
  press:  {my:[40,82],opp:[12,42],ball:[97,34]},
  mid:    {my:[26,52],opp:[38,66],ball:[50,20]},
  low:    {my:[10,26],opp:[42,74],ball:[30,30]},
  counter:{my:[22,80],opp:[44,64],ball:[40,34]}
};

/* Fasta situationer. my = ditt lag, opp = motståndare. Första listposten är första utespelaren. */
var CORNER={
  ball:[103.6,1.6],
  my:{gk:[52,34],list:[[104,2.4],[89,20],[89,28],[89,40],[89,48],[82,34],[84,17],[84,51],[74,34],[66,34]]},
  opp:{gk:[103.5,34],list:[[94,20],[94,28],[94,40],[94,48],[99,31],[99,37],[86,34],[78,26],[78,42],[72,26]]}
};
function mir(o){return {gk:o.gk?[L-o.gk[0],o.gk[1]]:null,list:o.list.map(function(p){return [L-p[0],p[1]]})}}
var SETS={
  corner_att:function(){return CORNER},
  corner_def:function(){return {ball:[L-CORNER.ball[0],CORNER.ball[1]],my:mir(CORNER.opp),opp:mir(CORNER.my)}},
  fk_att:function(){return {
    ball:[80,30],
    my:{gk:[50,34],list:[[78,32.5],[93,22],[93,46],[97,30],[97,38],[84,20],[84,48],[76,22],[76,46],[70,34]]},
    opp:{gk:[102,34],list:[[88.6,27.5],[88.8,31.5],[89,35.5],[89.2,39.5],[100,26],[100,42],[95,17],[95,51],[80,38],[72,26]]}
  }},
  goalkick:function(){return {
    ball:[5,34],
    my:{gk:[2.5,34],list:[[18,10],[18,26],[18,42],[18,58],[32,20],[32,48],[44,12],[44,34],[44,56],[56,34]]},
    opp:{gk:[100,34],list:[[60,14],[60,34],[60,54],[70,24],[70,44],[76,34],[68,8],[68,60],[84,20],[84,48]]}
  }},
  throw:function(){return {
    ball:[55,1.8],
    my:{list:[[55,0.8],[50,14],[60,10],[47,26],[64,22],[57,34],[70,32],[43,40],[40,20],[75,22]]},
    opp:{list:[[54,8],[66,12],[50,21],[67,28],[57,26],[72,38],[44,34],[40,27],[80,28],[54,44]]}
  }},
  pen:function(){return {
    ball:[94,34],
    my:{gk:[50,34],list:[[90.5,34],[86,12],[86,56],[82,20],[82,48],[78,30],[78,38],[72,34],[70,22],[70,46]]},
    opp:{gk:[104,34],list:[[88,17],[88,51],[85,25],[85,43],[81,34],[76,24],[76,44],[66,34],[66,26],[66,42]]}
  }}
};

var HINTS={
  move:'Dra spelare och boll. Tryck på en spelare för att skriva ett namn.',
  run:'Dra över planen för att rita en löpning (streckad pil).',
  pass:'Dra över planen för att rita en passning (heldragen pil).',
  link:'Tryck på två spelare för att koppla ihop dem med en linje.',
  text:'Tryck på planen och skriv en text. Byt till Flytta för att flytta den, dra i hörnet för att ändra storlek.',
  erase:'Tryck på en pil, länk eller text för att ta bort den.'
};
