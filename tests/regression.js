'use strict';
/*
 * Regressionstest för taktiktavlan.
 *
 * Kör samma användarflöden mot arbetskopian och mot en git-referens
 * (standard HEAD) och jämför vid varje kontrollpunkt:
 *   - DOM:en (body utan <script>),
 *   - beräknade stilar för alla element,
 *   - en skärmbild av hela sidan (pixel för pixel).
 *
 * Användning:
 *   npm test                         jämför arbetskopian med HEAD
 *   node tests/regression.js main    jämför arbetskopian med main
 *
 * Skärmbilder sparas i tests/output/<base|current>/ så att skillnader kan
 * granskas. Skriptet avslutas med kod 1 om något skiljer sig eller om
 * sidan ger JavaScript-fel.
 */
const {chromium}=require('playwright');
const fs=require('fs');
const os=require('os');
const path=require('path');
const {execSync}=require('child_process');

const ROOT=path.resolve(__dirname,'..');
const OUT=path.join(__dirname,'output');
const REF=process.argv[2]||'HEAD';

/* Packa upp git-referensen i en temporär mapp */
function checkoutRef(ref){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'taktiktavla-base-'));
  execSync('git archive '+JSON.stringify(ref)+' | tar -x -C '+JSON.stringify(dir),{cwd:ROOT,stdio:['ignore','ignore','inherit'],shell:'/bin/sh'});
  return dir;
}

async function run(browser,url,outDir){
  fs.rmSync(outDir,{recursive:true,force:true});
  fs.mkdirSync(outDir,{recursive:true});
  const ctx=await browser.newContext({viewport:{width:1200,height:1000}});
  /* Deterministisk tid och slump så att id:n och datum blir lika i båda körningarna */
  await ctx.addInitScript(()=>{
    let t=1790000000000; const now=()=>(t+=1000); const D=Date;
    window.Date=class extends D{ constructor(...a){ super(...(a.length?a:[now()])); } static now(){ return now(); } };
    let s=42; Math.random=()=>{ s=(s*16807)%2147483647; return s/2147483647; };
  });
  const p=await ctx.newPage();
  const errs=[];
  p.on('pageerror',e=>errs.push(e.message));
  p.on('console',m=>{ if(m.type()==='error'&&!/Failed to load resource/.test(m.text())) errs.push('console: '+m.text()); });
  await p.goto(url);
  await p.evaluate(()=>document.fonts.ready);
  await p.waitForTimeout(300);

  const snaps=[];
  async function snap(name){
    await p.waitForTimeout(250);
    const d=await p.evaluate(()=>{
      const props=cs=>{ const a=[]; for(let i=0;i<cs.length;i++) a.push(cs[i]+':'+cs.getPropertyValue(cs[i])); return a.sort().join(';'); };
      const c=document.body.cloneNode(true);
      c.querySelectorAll('script').forEach(s=>s.remove());
      const html=c.innerHTML.split('\n').filter(l=>l.trim()).join('\n');
      const styles=[];
      document.querySelectorAll('body *').forEach(el=>{ if(el.tagName!=='SCRIPT') styles.push(el.tagName+'#'+el.id+' '+props(getComputedStyle(el))); });
      return {html,styles,root:props(getComputedStyle(document.documentElement))};
    });
    const file=(snaps.length+1)+'_'+name+'.png';
    const png=await p.screenshot({fullPage:true});
    fs.writeFileSync(path.join(outDir,file),png);
    snaps.push({name,file,png,...d});
  }

  const sel=(id,v)=>p.selectOption(id,v);
  const optVal=(id,i)=>p.evaluate(([id,i])=>document.querySelector(id).options[i].value,[id,i]);
  async function center(s){ const bb=await p.locator(s).first().boundingBox(); return [bb.x+bb.width/2,bb.y+bb.height/2]; }
  async function dragTo(a,b){
    await p.mouse.move(...a); await p.mouse.down();
    for(let i=1;i<=8;i++) await p.mouse.move(a[0]+(b[0]-a[0])*i/8,a[1]+(b[1]-a[1])*i/8);
    await p.mouse.up();
  }

  await snap('start');

  /* Formation, fasta situationer och spelsituationer */
  await sel('#size','7'); await sel('#myForm',await optVal('#myForm',1)); await snap('7-mot-7');
  await sel('#size','11'); await sel('#setPiece',await optVal('#setPiece',1)); await snap('fast-situation');
  await sel('#setPiece',''); await sel('#situation',await optVal('#situation',2)); await snap('situation');

  /* Truppen: lägg till, statusar och dra till planen */
  for(const [nr,nm] of [['7','Anna'],['9','Bea'],['','Cilla']]){ await p.fill('#tpNum',nr); await p.fill('#tpName',nm); await p.click('#tpAdd'); }
  await p.click('.tp-item >> nth=1'); await p.click('.tp-item >> nth=2'); await p.click('.tp-item >> nth=2');
  await dragTo(await center('.tp-item >> nth=0'),await center('#dyn .pl-m[data-id="m3"]'));
  await snap('truppen');
  await p.click('#btnNameMode'); await snap('namnlage'); await p.click('#btnNumMode');

  /* Rita: löpning, passning, länk, text och ångra */
  const bb=await p.locator('#svg').boundingBox();
  const P=(fx,fy)=>[bb.x+bb.width*fx,bb.y+bb.height*fy];
  await p.click('[data-tool="run"]'); await dragTo(P(.3,.3),P(.5,.4));
  await p.click('[data-tool="pass"]'); await dragTo(P(.3,.7),P(.6,.6));
  await p.click('[data-tool="link"]');
  await p.mouse.click(...await center('#dyn .pl-m[data-id="m1"]'));
  await p.mouse.click(...await center('#dyn .pl-m[data-id="m2"]'));
  await p.click('[data-tool="text"]'); await p.mouse.click(...P(.5,.15)); await p.fill('#popInput','Hej text'); await p.click('#popOk');
  await snap('ritat');
  await p.click('#btnUndo'); await snap('angra');
  await p.click('[data-tool="move"]');
  await p.mouse.click(...await center('#dyn .pl-m[data-id="m5"]')); await p.fill('#popInput','Namn5'); await p.click('#popOk');
  await snap('spelarnamn');

  /* Animation och sparade listor */
  await p.click('#btnCapture'); await dragTo(await center('#dyn .pl-m[data-id="m4"]'),P(.7,.5)); await p.click('#btnCapture');
  await p.click('#btnPlay'); await p.waitForTimeout(4000); await snap('uppspelad');
  await p.fill('#animName','Anim1'); await p.click('#animSave');
  await p.fill('#csName','CS1'); await p.click('#csSave'); await snap('sparat');

  /* Utseende */
  await p.evaluate(()=>{ const e=document.querySelector('#colMy'); e.value='#0000ff'; e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new Event('change',{bubbles:true})); });
  await sel('#pitchSel',await optVal('#pitchSel',1)); await sel('#halfSel',await optVal('#halfSel',1));
  await p.click('#chkChan5'); await p.click('#btnOrient'); await snap('utseende');
  await p.click('#btnOrient'); await sel('#halfSel',await optVal('#halfSel',0));

  /* Skärmbilder och sessioner */
  await p.click('.js-shot >> nth=0'); await p.waitForTimeout(1000); await p.fill('#shotName','Bild1'); await snap('skarmbild');
  await p.click('#shotSave'); await p.waitForTimeout(500);
  await p.click('#tpStartImg'); await p.waitForTimeout(1000); await snap('bild-startelva');
  if(await p.locator('#shotSave').isVisible()) await p.click('#shotSave'); else await p.click('#shotCancel');
  await p.waitForTimeout(500);
  await p.fill('#sesName','Ses1'); await p.click('#sesSave'); await p.waitForTimeout(500); await snap('session');

  /* Bekräftelsedialoger */
  await p.click('#tpClearStart'); await snap('rensa-dialog'); await p.keyboard.press('Escape');
  await p.click('#tpClearStart'); await p.click('#clearStartConfirm'); await snap('rensad');
  await p.click('#btnReset'); await p.click('#resetCancel');
  await p.click('#btnReset'); await p.click('#resetConfirm'); await snap('aterstalld');

  await p.click('#truppenToggle'); await p.waitForTimeout(400); await snap('truppen-dold'); await p.click('#truppenToggle');
  await p.click('#sesList button >> nth=0').catch(()=>{}); await p.waitForTimeout(500); await snap('session-laddad');

  /* Mörkt läge, mobil och utskrift */
  await p.emulateMedia({colorScheme:'dark'}); await snap('morkt'); await p.emulateMedia({colorScheme:'light'});
  await p.setViewportSize({width:390,height:900}); await p.waitForTimeout(400); await snap('mobil');
  await p.emulateMedia({media:'print'}); await snap('utskrift');

  await ctx.close();
  return {snaps,errs};
}

function compare(a,b){
  const diffs=[];
  a.snaps.forEach((x,i)=>{
    const y=b.snaps[i];
    if(!y){ diffs.push(x.name+': saknas'); return; }
    const what=[];
    if(x.html!==y.html) what.push('DOM');
    if(x.styles.join('\n')!==y.styles.join('\n')) what.push('stilar');
    if(x.root!==y.root) what.push('rot-stilar');
    if(!x.png.equals(y.png)) what.push('skärmbild');
    if(what.length) diffs.push(x.file+': '+what.join(', '));
  });
  return diffs;
}

(async()=>{
  const base=checkoutRef(REF);
  const browser=await chromium.launch(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{});
  let failed=false;
  try{
    console.log('Kör mot '+REF+' ...');
    const A=await run(browser,'file://'+path.join(base,'index.html'),path.join(OUT,'base'));
    console.log('Kör mot arbetskopian ...');
    const B=await run(browser,'file://'+path.join(ROOT,'index.html'),path.join(OUT,'current'));
    if(A.errs.length) console.log('JS-fel i '+REF+':\n  '+A.errs.join('\n  '));
    if(B.errs.length){ failed=true; console.log('JS-fel i arbetskopian:\n  '+B.errs.join('\n  ')); }
    const diffs=compare(A,B);
    if(diffs.length){ failed=true; console.log('Skillnader ('+diffs.length+'):\n  '+diffs.join('\n  ')+'\nSe tests/output/base och tests/output/current.'); }
    else console.log('OK: '+B.snaps.length+' kontrollpunkter identiska med '+REF+'.');
  } finally {
    await browser.close();
    fs.rmSync(base,{recursive:true,force:true});
  }
  process.exit(failed?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
