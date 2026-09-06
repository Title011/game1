/* ============================================================
   GAME — วงจรการเล่นหลัก
   เริ่มเกม, แถบด่าน, โหลดด่าน, จับเวลา, ตรวจวงจร, สรุปผล,
   คู่มือ (tutorial) และคีย์ลัด
   *** ไฟล์นี้ต้องโหลดเป็นไฟล์สุดท้าย ***
   ============================================================ */
/* ============================================================
   INIT
   ============================================================ */
function initGame(){
  injectUIIcons();
  G.level=0; G.score=0; G.lives=3; G.doneLevels={}; G.unlockedMax=0;
  buildLevelBar();
  loadLevel(0);
}

function buildLevelBar(){
  var bar=document.getElementById('level-bar');
  bar.querySelectorAll('.level-dot').forEach(function(d){d.remove();});
  LEVELS.forEach(function(_,i){
    var dot=document.createElement('div');
    dot.className='level-dot locked';
    dot.textContent=i+1;
    dot.dataset.lvl=i;
    dot.title=LEVELS[i].title;
    dot.onclick=function(){ if(i<=G.unlockedMax) loadLevel(i); };
    bar.appendChild(dot);
  });
  updateLevelBar();
}

function updateLevelBar(){
  document.querySelectorAll('.level-dot').forEach(function(dot){
    var i=parseInt(dot.dataset.lvl);
    var cls='level-dot';
    if(i===G.level){
      /* ด่านที่กำลังเล่น = เด่นสุด (ถ้าผ่านแล้วด้วย ใส่โทนเขียว) */
      cls += G.doneLevels[i] ? ' active active-done' : ' active';
    } else if(G.doneLevels[i]){
      cls += ' done';                            /* ผ่านแล้ว (เขียว คลิกได้) */
    } else if(i<=G.unlockedMax){
      cls += ' unlocked';                        /* ปลดล็อกแล้ว คลิกได้ */
    } else {
      cls += ' locked';                          /* ยังล็อก */
    }
    dot.className=cls;
  });
  document.getElementById('hud-level').textContent=(G.level+1)+'/10';
  document.getElementById('hud-score').textContent=G.score;
  document.getElementById('hud-lives').innerHTML = renderHearts(G.lives, 3);
}

function loadLevel(idx){
  if(idx>=LEVELS.length){endGame();return;}
  G.level=idx;
  if(idx>G.unlockedMax) G.unlockedMax=idx;  /* จำด่านไกลสุดที่ปลดล็อก */
  clearInterval(G.timerInt);
  clearWorkspace(true);
  if(G.wireMode) toggleWireMode();
  var lv=LEVELS[idx];
  G.invCounts=Object.assign({},lv.inventory);
  renderInventory();
  document.getElementById('goal-title').textContent=lv.title;
  document.getElementById('goal-desc').textContent=lv.goal;
  G.timerSec=lv.timeLimit;
  G.levelStartTime=Date.now();
  updateTimerDisplay();
  document.getElementById('timer-display').classList.remove('warning');
  G.timerInt=setInterval(tickTimer,1000);
  updateLevelBar();
}

function tickTimer(){
  G.timerSec--;
  updateTimerDisplay();
  if(G.timerSec<=30) document.getElementById('timer-display').classList.add('warning');
  if(G.timerSec<=0){clearInterval(G.timerInt);onTimeUp();}
}
function updateTimerDisplay(){
  var s=Math.abs(G.timerSec);
  var mm=Math.floor(s/60).toString().padStart(2,'0');
  var ss=(s%60).toString().padStart(2,'0');
  document.getElementById('timer-display').textContent=mm+':'+ss;
}
function onTimeUp(){
  G.lives--;
  updateLevelBar();
  if(G.lives<=0){showToast('หมดชีวิต! เริ่มใหม่...','error');setTimeout(initGame,2000);}
  else{showToast('หมดเวลา! เหลือ '+G.lives+' ชีวิต','error');setTimeout(function(){loadLevel(G.level);},2000);}
}

/* ============================================================
   CHECK + POWER ANIMATIONS
   ============================================================ */
function checkCircuit(){
  var lv=LEVELS[G.level];
  var result=lv.check(G.wsItems,G.wires);
  /* เช็คเทียบเฉลย (ยืดหยุ่น: สลับซ้ายขวา/กลับทิศได้ แต่การเชื่อมต้องครบ ไม่เกิน ขั้วถูก) */
  if(result.ok && lv.solution){
    var exact = checkExactWiring(G.wsItems, G.wires, lv.solution);
    if(!exact.ok) result = exact;
  }
  var elapsed=Math.floor((Date.now()-G.levelStartTime)/1000);
  if(result.ok){
    clearInterval(G.timerInt);
    /* เปิด animation ทุก ws-item */
    G.wsItems.forEach(function(item){item.el.classList.add('powered');});
    /* เปิดแอนิเมชันไฟไหลตามสาย */
    startCurrentFlow();

    /* คะแนนให้ครั้งเดียวต่อด่าน — กลับมาเล่นด่านที่ผ่านแล้วซ้ำ ไม่ได้คะแนนเพิ่ม
       (ต้องเช็คก่อนตั้ง doneLevels ไม่งั้นจะได้ค่า true ที่เพิ่งตั้งเอง) */
    var replay = !!G.doneLevels[G.level];
    var earned = 0;
    if(!replay){
      var bonus=Math.max(0,Math.floor((lv.timeLimit-elapsed)/lv.timeLimit*50));
      earned=lv.baseScore+bonus;
      G.score+=earned;
    }
    G.doneLevels[G.level]=true;
    updateLevelBar();
    showResult(true,result.msg,earned,elapsed,replay);
  } else {
    /* ตรวจไม่ผ่าน = เสียชีวิต 1 ดวง */
    G.lives--;
    updateLevelBar();
    if(G.lives<=0){
      showResult(false, result.msg, 0, elapsed);
      setTimeout(function(){
        showToast('หมดชีวิตแล้ว! เริ่มเกมใหม่','error');
        setTimeout(initGame, 1500);
      }, 1500);
    } else {
      showResult(false, result.msg, 0, elapsed);
    }
  }
}

/* สร้างคำใบ้: ตัวอย่างการต่อสายของด่านนี้ */
function buildSolutionHint(){
  var lv = LEVELS[G.level];
  if(!lv.solution) return '💡 เปิด "คู่มือ" เพื่อดูคำแนะนำ';
  var seen = {};
  var lines = [];
  lv.solution.forEach(function(pair){
    var k = pair[0]+'|'+pair[1];
    if(seen[k]) return;
    seen[k] = true;
    lines.push('• ' + portLabel(pair[0]) + '  →  ' + portLabel(pair[1]));
  });
  var note = (lv.topology && lv.topology.type==='parallel')
    ? 'แยกเป็น ' + lv.topology.branches + ' สาขาจากขั้วแบต (แต่ละสาขาต่อชุดนี้)'
    : 'ต่อเรียงกันเป็นวงเดียว (ทุกจุดมีสายเส้นเดียว)';
  return '<div style="text-align:left;font-size:.78rem;line-height:1.7;">'
       + '<b style="color:var(--accent2)">💡 ตัวอย่างการต่อ</b> <span style="opacity:.7">('+note+')</span><br>'
       + lines.join('<br>')
       + '<br><span style="opacity:.6">* สลับซ้าย-ขวา หรือกลับทิศวนก็ถูกเช่นกัน</span></div>';
}

function showResult(ok,msg,earned,elapsed,replay){
  document.getElementById('result-icon').innerHTML = ok
    ? '<span style="color:#00d97e">'+ICON('checkCircle',56)+'</span>'
    : '<span style="color:#ff4d5e">'+ICON('target',56)+'</span>';
  document.getElementById('result-header-title').innerHTML=ok?(ICON('check',18)+' ผ่านด่าน!'):'ยังไม่ถูกต้อง';
  document.getElementById('result-title').textContent=ok?'ถูกต้อง!':'ลองอีกครั้ง!';
  document.getElementById('result-msg').textContent=msg;
  /* เล่นซ้ำด่านที่ผ่านแล้ว = ไม่ได้คะแนนเพิ่ม (กันไล่เก็บคะแนนซ้ำ) */
  document.getElementById('stat-score').textContent =
    !ok ? '—' : (replay ? 'ซ้ำ' : '+'+earned);
  document.getElementById('stat-time').textContent=elapsed+'s';
  document.getElementById('stat-wires').textContent=G.wires.length;
  document.getElementById('result-hint').innerHTML =
    ok ? (replay ? '<span style="color:var(--text-dim)">ด่านนี้เก็บคะแนนไปแล้ว — เล่นซ้ำเพื่อทบทวนได้ แต่ไม่ได้คะแนนเพิ่ม</span>' : '')
       : buildSolutionHint();
  var isLast=G.level===LEVELS.length-1;
  var btn=document.getElementById('btn-next-level');
  btn.innerHTML=ok?(isLast?(ICON('trophy',16)+' ดูผลสรุป'):'ด่านถัดไป →'):'ยังไม่ผ่าน';
  btn.disabled=!ok;
  openModal('modal-result');
}

function nextLevel(){
  closeModal('modal-result');
  G.wsItems.forEach(function(i){i.el.classList.remove('powered');});
  stopCurrentFlow();
  if(G.probeMode) toggleProbeMode();
  var next=G.level+1;
  if(next>=LEVELS.length) endGame();
  else loadLevel(next);
}

function endGame(){clearInterval(G.timerInt);showScreen('screen-posttest');}

/* ============================================================
   TUTORIAL
   ============================================================ */
function openTutorial(){
  G.tutPages=LEVELS[G.level].tutorial;
  G.tutIdx=0;
  renderTutPage();
  openModal('modal-tutorial');
}
function renderTutPage(){
  var p=G.tutPages[G.tutIdx];
  var img=document.getElementById('tutorial-img');
  var ph=document.getElementById('tutorial-img-ph');
  img.src=p.img; img.style.display=''; ph.style.display='none';
  document.getElementById('tutorial-text-box').innerHTML=p.text.replace(/\n/g,'<br>');
  document.getElementById('tut-page-indicator').textContent=(G.tutIdx+1)+' / '+G.tutPages.length;
  document.getElementById('btn-tut-prev').disabled=G.tutIdx===0;
  document.getElementById('btn-tut-next').textContent=G.tutIdx===G.tutPages.length-1?'ปิด ✕':'ถัดไป ▶';
}
function changeTutPage(dir){
  var n=G.tutIdx+dir;
  if(n<0) return;
  if(n>=G.tutPages.length){closeModal('modal-tutorial');return;}
  G.tutIdx=n; renderTutPage();
}

/* คลิก workspace พื้นที่ว่าง → deselect */
document.addEventListener('DOMContentLoaded', function(){
  injectUIIcons();
  var ws = document.getElementById('workspace');
  if(ws){
    ws.addEventListener('click', function(e){
      if(e.target.id==='workspace'||e.target.id==='workspace-hint'||e.target.tagName==='svg'){
        deselectAll();
      }
    });
    /* ปิดเมนูคลิกขวาของเบราว์เซอร์ในพื้นที่ทำงาน (ใช้คลิกขวาลบสายแทน) */
    ws.addEventListener('contextmenu', function(e){ e.preventDefault(); });
  }

  document.querySelectorAll('.modal-overlay').forEach(function(ov){
    ov.addEventListener('click',function(e){if(e.target===ov)closeModal(ov.id);});
  });
});

document.addEventListener('keydown',function(e){
  if(!document.getElementById('screen-game').classList.contains('active')) return;
  /* ไม่ทำงานถ้า focus อยู่ที่ input */
  if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA') return;
  /* กันกดค้างแล้วสั่งซ้ำ (เช่น E สลับโหมดกลับไปกลับมา) */
  if(e.repeat) return;

  /* ตรวจทั้ง e.key (ตามภาษา) และ e.code (ปุ่มจริง)
     สำคัญ: ถ้าคีย์บอร์ดอยู่โหมดภาษาไทย e.key จะเป็น 'ต'/'พ'/'ไ' ไม่ตรง 'e'/'r'/'w'
     ต้องเทียบ e.code ('KeyE' ฯลฯ) ซึ่งไม่ขึ้นกับภาษาที่พิมพ์ */
  var k = (e.key || '').toLowerCase();
  var code = e.code || '';

  /* E หรือ W = สลับโหมดต่อสายไฟ */
  if(k==='e' || k==='w' || code==='KeyE' || code==='KeyW'){ toggleWireMode(); return; }

  /* R = หมุน item ที่เลือกอยู่ 90° */
  if(k==='r' || code==='KeyR'){
    if(G.selectedItemId){
      rotateItem(G.selectedItemId);
    } else {
      showToast('คลิกเลือกอุปกรณ์ก่อน แล้วกด R เพื่อหมุน','error');
    }
    return;
  }

  if(k==='escape' || code==='Escape'){
    if(G.wireMode){toggleWireMode();return;}
    deselectAll();
    document.querySelectorAll('.modal-overlay.open').forEach(function(m){m.classList.remove('open');});
    return;
  }

  /* Delete / Backspace = ลบ item ที่เลือก */
  if((k==='delete' || k==='backspace' || code==='Delete' || code==='Backspace') && G.selectedItemId){
    var id=G.selectedItemId;
    deselectAll();
    removeWsItem(id);
  }
});
