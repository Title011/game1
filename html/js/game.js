/* ============================================================
   GAME — วงจรการเล่นหลัก
   เริ่มเกม, แถบด่าน, โหลดด่าน, จับเวลา, ตรวจวงจร, สรุปผล,
   คู่มือ (tutorial) และคีย์ลัด
   *** ไฟล์นี้ต้องโหลดเป็นไฟล์สุดท้าย ***
   ============================================================ */
/* ============================================================
   INIT
   ============================================================ */
/* เริ่มเกมใหม่ตั้งแต่ต้น (กดเข้าสู่เกม / ชีวิตหมด) — ล้างความคืบหน้าเดิม */
function initGame(){
  injectUIIcons();
  G.level=0; G.score=0; G.lives=3; G.doneLevels={}; G.unlockedMax=0;
  G.finished=false;
  buildLevelBar();
  loadLevel(0);   /* loadLevel เรียก saveGame() ให้เองตอนท้าย */
}

/* เล่นต่อจากข้อมูลที่บันทึกไว้ (เรียกจากปุ่ม "เล่นต่อ" ใน save.js)
   s = object ที่ผ่านการตรวจค่าจาก loadSave() มาแล้ว */
function resumeGame(s){
  if(!s){ initGame(); return; }
  injectUIIcons();
  G.score       = s.score;
  G.lives       = s.lives;
  G.doneLevels  = s.doneLevels;
  G.unlockedMax = s.unlockedMax;
  G.finished    = false;
  G.modesUnlocked = !!s.modesUnlocked;   /* ปลดล็อกแล้วต้องยังปลดล็อกอยู่ */
  updateModeButtons();
  buildLevelBar();
  loadLevel(Math.min(s.level, LEVELS.length-1));
  showToast('เล่นต่อจากด่าน '+(G.level+1)+' · คะแนน '+G.score,'success');
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
  /* โหมดอิสระ/วัดความเร็วไม่มีเลขด่านและไม่เสียชีวิต แสดงเป็นสัญลักษณ์แทน */
  document.getElementById('hud-level').textContent =
    G.sandbox ? 'อิสระ'
    : G.endless ? ('รอบ '+G.endlessRound)
    : (G.level+1)+'/'+LEVELS.length;
  document.getElementById('hud-score').textContent = G.endless ? G.endlessScore : G.score;
  /* อิสระ = ไม่มีชีวิต (∞) · วัดความเร็ว = ชีวิตเดียว · ปกติ = 3 ดวง */
  document.getElementById('hud-lives').innerHTML =
    G.sandbox ? '<span class="hud-inf">∞</span>'
    : G.endless ? renderHearts(G.endlessLives, 1)
    : renderHearts(G.lives, 3);
}

function loadLevel(idx){
  if(idx>=LEVELS.length){endGame();return;}
  /* ออกจากโหมดพิเศษอัตโนมัติ ครอบคลุมทั้งปุ่มกลับสู่ด่าน
     และการกดจุดด่านบนแถบด้านบนขณะอยู่ในโหมดอิสระ/วัดความเร็ว */
  if(G.sandbox){
    G.sandbox=false;
    document.body.classList.remove('sandbox-mode');
    updateSandboxButton();
  }
  if(G.endless){
    G.endless=false; G.genLevel=null;
    document.body.classList.remove('endless-mode');
    updateEndlessButton();
  }
  G.level=idx;
  if(idx>G.unlockedMax) G.unlockedMax=idx;  /* จำด่านไกลสุดที่ปลดล็อก */
  clearInterval(G.timerInt);
  clearWorkspace(true);
  cancelTapConnect();
  var lv=LEVELS[idx];
  G.invCounts=Object.assign({},lv.inventory);
  renderInventory();
  document.getElementById('goal-title').textContent=lv.title;
  document.getElementById('goal-desc').textContent=lv.goal;
  setGoalOutcome(lv.outcome);
  G.timerSec=lv.timeLimit;
  G.levelStartTime=Date.now();
  updateTimerDisplay();
  document.getElementById('timer-display').classList.remove('warning');
  G.timerInt=setInterval(tickTimer,1000);
  updateLevelBar();
  ensureBreadboard();
  saveGame();   /* บันทึกทุกครั้งที่เปลี่ยนด่าน */
}

/* ============================================================
   สร้าง/สร้างใหม่แผงต่อวงจรให้พอดีกับพื้นที่ทำงานตอนนั้น

   เรียก 2 จังหวะโดยตั้งใจ:
     ครั้งแรกทันที — ถ้าหน้าจัดเสร็จอยู่แล้ว (เช่นเปลี่ยนด่านระหว่างเล่น)
                     แผงจะขึ้นทันทีโดยไม่กะพริบ
     ครั้งที่สองใน rAF — เผื่อเพิ่งสลับมาหน้าเกม ซึ่งตอนเรียกครั้งแรก
                     พื้นที่ทำงานยังวัดขนาดไม่ได้ (clientWidth = 0)
   applyBreadboard() เรียกซ้ำได้ปลอดภัย และข้ามไปเองถ้ายังวัดขนาดไม่ได้
   ============================================================ */
/* แถบ "ผลที่ต้องได้" บนโจทย์ — บอกว่าวงจรที่ต่อเสร็จต้องออกมาเป็นยังไง
   ผู้เรียนจะได้รู้ว่ากำลังเล็งไปที่ผลลัพธ์อะไร ไม่ใช่แค่ทำตามคำสั่ง */
function setGoalOutcome(text){
  var el = document.getElementById('goal-outcome');
  if(!el) return;
  if(!text){ el.style.display = 'none'; el.textContent = ''; return; }
  el.style.display = '';
  el.textContent = 'ผลที่ต้องได้: ' + text;
}

/* ด่านไหนเล่นบนแผงเบรดบอร์ด ด่านไหนเล่นบนพื้นที่ว่าง

   เบรดบอร์ดเป็น "บทเรียนหนึ่งบท" ไม่ใช่พื้นหลังของทั้งเกม
   ด่าน 1-19 จึงเป็นพื้นที่ว่างเปล่า วางอุปกรณ์ตรงไหนก็ได้แล้วเดินสายเอง
   ผู้เรียนจะได้เห็นวงจรเป็นเส้น ๆ ชัด ๆ ว่าอะไรต่อกับอะไร
   พอถึงด่าน 20 (ดู board:true ใน js/levels.js) พื้นที่ทำงานถึงกลายเป็น
   แผงจริง แล้วค่อยเรียนว่ารางในแผงต่อถึงกันเองยังไง

   โหมดอิสระกับโหมดวัดความเร็วไม่ใช่ "ด่าน" จึงไม่มีแผงเช่นกัน
   (อยากให้โหมดอิสระมีแผงด้วย แก้บรรทัด G.sandbox ข้างล่างเป็น true) */
function boardWanted(){
  if(G.sandbox) return false;
  if(G.endless) return false;
  var lv = LEVELS[G.level];
  return !!(lv && lv.board);
}

function applyBreadboard(){
  var ws = document.getElementById('workspace');
  if(!ws || !ws.clientWidth || !ws.clientHeight) return;

  /* วัดขนาด "หนึ่งช่อง" ทุกครั้ง แม้ด่านนี้จะไม่มีแผงก็ตาม
     เพราะตำแหน่งขาของอุปกรณ์อ้างอิงหน่วยนี้ (ดู PORT_ANCHORS ใน js/devices.js)
     ไม่ใช่แค่เบรดบอร์ดที่ใช้ — ย่อ/ขยายจอแล้วขาต้องขยับตามกล่องด้วย */
  bbMeasurePitch();
  relayoutAllPorts();

  if(!boardWanted()){
    bbTurnOff();
    document.body.classList.remove('has-breadboard');
    return;
  }

  buildBreadboard();
  document.body.classList.toggle('has-breadboard', BB.on);
  G.wsItems.forEach(function(it){ bbSnapItem(it); });
  bbRefresh();
}

function ensureBreadboard(){
  applyBreadboard();
  requestAnimationFrame(applyBreadboard);
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
  /* โหมดวัดความเร็ว: หมดเวลา = จบรัน ไปหน้าตารางอันดับ */
  if(G.endless){ endEndlessRun('หมดเวลา'); return; }
  G.lives--;
  updateLevelBar();
  saveGame();   /* บันทึกจำนวนชีวิตที่เหลือ */
  if(G.lives<=0){showToast('หมดชีวิต! เริ่มใหม่...','error');setTimeout(initGame,2000);}
  else{showToast('หมดเวลา! เหลือ '+G.lives+' ชีวิต','error');setTimeout(function(){loadLevel(G.level);},2000);}
}

/* ============================================================
   CHECK + POWER ANIMATIONS
   ============================================================ */
function checkCircuit(){
  /* กำลังเล่นฉากวงจรพังอยู่ ห้ามสั่งตรวจซ้อน — บอกให้รู้ด้วยว่าทำไมยังกดไม่ได้ */
  if(G.hazardPlaying){
    showToast('กำลังแสดงผลที่เกิดขึ้นกับวงจร รอสักครู่...','');
    return;
  }

  /* สวิตช์สับเปิดค้างอยู่ = วงจรขาดโดยตั้งใจ ยังไม่ใช่การต่อผิด
     เตือนให้สับปิดก่อน จะได้ไม่เสียชีวิตฟรี ๆ */
  if(hasOpenSwitch()){
    showToast('สวิตช์ยังสับ OFF อยู่ — สับให้เป็น ON ก่อนตรวจวงจร','error');
    return;
  }

  /* โหมดอิสระ: ไม่มีเฉลยให้เทียบ ไม่มีคะแนน ไม่เสียชีวิต */
  if(G.sandbox){ sandboxCheck(); return; }

  clearDamage();   /* ล้างรอยไหม้ของรอบก่อน แล้วประเมินใหม่ทั้งหมด */

  var lv=currentLevel();
  var result=lv.check(G.wsItems,G.wires);

  /* ตัดสินจาก "ผลที่ออกมา" ไม่ใช่ "ต่อเหมือนเฉลยไหม"
     จ่ายไฟจำลองจริงแล้ววัดทีละข้อตามที่โจทย์กำหนด — ดู js/outcome.js
     ต่อแบบไหนก็ได้ที่ให้ผลตามต้องการ ถือว่าผ่านหมด
     (เฉลย lv.solution ยังใช้อยู่ แต่ใช้แค่วาดแผนภาพคำใบ้ตอนยังไม่ผ่าน) */
  var outcome = lv.require ? checkOutcome(G.wsItems, G.wires, lv.require, lv.inventory) : null;
  if(result.ok && outcome && !outcome.ok) result = { ok:false, msg:outcome.msg };

  /* เทียบกับแบบที่ด่านสอนไว้ — เป็นข้อมูลเสริม ไม่ได้ใช้ตัดสิน
     ต่อคนละแบบแต่ได้ผลตามต้องการก็ผ่าน แต่ถ้าตรงตามแบบด้วยก็บอกให้รู้
     ลำดับที่ด่านสอน (เช่นฟิวส์อยู่ใกล้แหล่งจ่าย) ยังมีคุณค่าทางวิชาช่าง */
  if(outcome && lv.solution){
    try{
      outcome.sameAsGuide = matchSolution(G.wsItems, G.wires, lv.solution, lv.inventory).ok;
    }catch(e){ outcome.sameAsGuide = undefined; }
  }

  /* อันตรายทางไฟฟ้ามาก่อนเสมอ — ต่อให้ตรงเฉลย ถ้าลัดวงจรก็ยังไหม้
     (ตรวจแล้วว่าเฉลยของทั้ง 20 ด่านไม่มีด่านไหนเข้าเงื่อนไขนี้) */
  var fault = analyzeCircuitFaults(G.wsItems, G.wires);
  var elapsed=Math.floor((Date.now()-G.levelStartTime)/1000);

  if(!fault.ok){
    /* จ่ายไฟจริงให้ดูก่อน แล้วปล่อยให้มันค่อย ๆ ร้อนจนพังต่อหน้า
       ค่อยสรุปเป็นรายงานเหตุการณ์ — ผู้เรียนจะได้เห็น "กระบวนการ"
       ไม่ใช่แค่ผลลัพธ์ว่าผิด */
    playHazardSequence(fault, function(){
      var bad = { ok:false, msg:fault.msg };
      if(G.endless){ endlessResult(bad, elapsed); return; }
      G.lives--;
      updateLevelBar();
      saveGame();
      showResult(false, fault.msg, 0, elapsed, false, fault);
      if(G.lives<=0){
        setTimeout(function(){
          showToast('หมดชีวิตแล้ว! เริ่มเกมใหม่','error');
          setTimeout(initGame, 1500);
        }, 1500);
      }
    });
    return;
  }

  /* โหมดวัดความเร็วมีระบบคะแนน/เวลาของตัวเอง ไม่ยุ่งกับคะแนนและชีวิตของโหมดด่าน */
  if(G.endless){ endlessResult(result, elapsed); return; }

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
    saveGame();   /* บันทึกคะแนน + ด่านที่ผ่าน */
    showResult(true,result.msg,earned,elapsed,replay,fault,outcome);
  } else {
    /* ตรวจไม่ผ่าน = เสียชีวิต 1 ดวง */
    G.lives--;
    updateLevelBar();
    saveGame();   /* บันทึกจำนวนชีวิตที่เหลือ */
    if(G.lives<=0){
      showResult(false, result.msg, 0, elapsed, false, fault, outcome);
      setTimeout(function(){
        showToast('หมดชีวิตแล้ว! เริ่มเกมใหม่','error');
        setTimeout(initGame, 1500);
      }, 1500);
    } else {
      showResult(false, result.msg, 0, elapsed, false, fault, outcome);
    }
  }
}

/* ============================================================
   ลำดับเหตุการณ์ตอนวงจรพัง — จ่ายไฟจริงแล้วปล่อยให้ค่อย ๆ พังต่อหน้า

   ระบบความเสียหายใน js/hazard.js เดินอยู่ในลูปจำลอง 20 ครั้งต่อวินาที
   อยู่แล้ว ฟังก์ชันนี้แค่ "เปิดไฟทิ้งไว้" นานพอให้เห็นอุปกรณ์ร้อนขึ้น
   มีควัน แล้วพัง จากนั้นจึงตรึงผลตามที่ทำนายไว้ล่วงหน้าให้ตรงกับรายงาน

   ความยาวของฉากคิดจากเวลาที่เหตุการณ์สุดท้ายเกิดขึ้นจริงในการทำนาย
   บวกอีกเล็กน้อยให้ดูจบ — พังไวก็สั้น ค่อย ๆ คุกรุ่นก็ยาวกว่า
   ============================================================ */
function playHazardSequence(fault, done){
  var last = 0;
  (fault.incidents || []).forEach(function(i){ last = Math.max(last, i.t || 0); });
  var dur = Math.max(1.0, Math.min(4.5, last + 0.9));

  G.hazardPlaying = true;
  resetHazards();
  G.wsItems.forEach(function(it){ if(it.el) it.el.classList.add('powered'); });
  document.body.classList.add('hazard-live');
  /* ปิดเสียงรายงานอัตโนมัติระหว่างฉาก — สรุปทีเดียวตอนจบ */
  PowerSim.onIncident = function(){};
  startCurrentFlow();

  setTimeout(function(){
    PowerSim.onIncident = null;
    G.hazardPlaying = false;
    document.body.classList.remove('hazard-live');
    applyDamage(fault);
    if(typeof done === 'function') done();
  }, Math.round(dur * 1000));
}

/* ============================================================
   แผงผลวิเคราะห์ — "ระบบอ่านวงจรของคุณได้แบบนี้"

   ให้ผู้เรียนเห็นว่าเกมเข้าใจวงจรที่ตัวเองต่อยังไง ไม่ใช่แค่บอกผ่าน/ไม่ผ่าน
   ถ้าสิ่งที่เห็นไม่ตรงกับที่ตั้งใจ แปลว่าต่อพลาดตรงไหนสักแห่ง
   ============================================================ */
var TOPO_TH = {
  series:'อนุกรม (ทางเดียว)',
  parallel:'ขนาน',
  mixed:'ผสม (มีทั้งอนุกรมและขนาน)',
  open:'ยังไม่ครบวง',
  none:'ยังอ่านไม่ได้'
};

/* ============================================================
   รายการตรวจผลลัพธ์ — "ผลออกมาได้ตามต้องการหรือยัง"

   หัวใจของการตัดสินแบบใหม่: ไม่ได้บอกแค่ผ่าน/ไม่ผ่าน แต่แจกแจงทีละข้อ
   ว่าผลที่โจทย์ต้องการนั้น ได้แล้วข้อไหน ยังไม่ได้ข้อไหน และเพราะอะไร
   ============================================================ */
function buildOutcomeChecklist(outcome){
  if(!outcome || !outcome.checks || !outcome.checks.length) return '';
  var pass = outcome.checks.filter(function(c){ return c.ok; }).length;
  var rows = outcome.checks.map(function(c){
    return '<li class="' + (c.ok ? 'oc-ok' : 'oc-no') + '">'
         + '<span class="oc-mark">' + (c.ok ? '&#x2713;' : '&#x2715;') + '</span>'
         + '<span class="oc-text">' + c.label
         + (c.detail ? '<em>' + c.detail + '</em>' : '')
         + '</span></li>';
  }).join('');

  /* ข้อเสริมที่ไม่ได้ใช้ตัดสิน — บอกว่าต่อตรงตามแบบที่ด่านสอนด้วยหรือเปล่า */
  var extra = '';
  if(outcome.sameAsGuide !== undefined){
    extra = '<li class="oc-opt"><span class="oc-mark">' + (outcome.sameAsGuide ? '&#x2713;' : '&#x25CB;') + '</span>'
          + '<span class="oc-text">ต่อตรงตามแบบที่ด่านนี้สอน'
          + '<em>' + (outcome.sameAsGuide
              ? 'ตรงตามลำดับที่แนะนำ'
              : 'ต่อคนละแบบกับที่สอน แต่ได้ผลตามต้องการแล้ว — ข้อนี้ไม่บังคับ')
          + '</em></span></li>';
  }

  return '<div class="report-box outcome-box' + (outcome.ok ? ' all-ok' : '') + '">'
       + '<div class="report-title">ผลที่ได้จริง ' + pass + '/' + outcome.checks.length + ' ข้อ</div>'
       + '<ul class="oc-list">' + rows + extra + '</ul>'
       + '</div>';
}

function buildAnalysisPanel(){
  if(!G.wsItems.length) return '';
  var an;
  try{ an = analyzeCircuit(G.wsItems, G.wires); }catch(e){ return ''; }
  if(!an || !an.net) return '';

  var rows = '';
  function row(k, v){ rows += '<dt>' + k + '</dt><dd>' + v + '</dd>'; }

  var chain = describeCircuit(an);
  if(chain) row('เส้นทางไฟ', chain);
  row('รูปแบบวงจร', (TOPO_TH[an.topology] || an.topology) +
      (an.branches > 1 ? ' · ' + an.branches + ' สาขา' : ''));
  row('จุดเชื่อมไฟฟ้า', an.net.nodeCount + ' จุด · อุปกรณ์ ' + an.net.els.length + ' ชิ้น');

  if(an.floating.length){
    row('ขาที่ยังลอยอยู่', an.floating.map(function(f){
      return termName(an.net, f.el.item, f.port);
    }).slice(0,4).join(', '));
  }
  if(an.shorted.length){
    row('ถูกต่อคร่อม', an.shorted.map(function(e){ return DEVICES[e.deviceId].name; }).join(', '));
  }
  if(an.islands.length){
    row('หลุดออกจากวง', an.islands.map(function(e){ return DEVICES[e.deviceId].name; }).join(', '));
  }

  return '<div class="report-box analysis-box">'
       + '<div class="report-title">ระบบอ่านวงจรของคุณได้แบบนี้</div>'
       + '<dl class="inc-rows">' + rows + '</dl>'
       + '</div>';
}

/* ============================================================
   กล่องรายงานเหตุการณ์ — ใช้ตอนเล่นอิสระและตอนเกิดเหตุระหว่างเล่น
   ============================================================ */
function showIncidentModal(list){
  if(!list || !list.length) return;
  var box = document.getElementById('incident-body');
  if(!box) return;
  box.innerHTML = incidentReportHTML(list);
  document.getElementById('incident-title').textContent = incidentSummary(list);
  openModal('modal-incident');
}

/* ============================================================
   SOLUTION HINT — คำใบ้ตอนตรวจไม่ผ่าน วาดเป็น "แผนภาพ" ไม่ใช่รายการข้อความ

   ใช้รูปอุปกรณ์จริงจาก js/device-symbols.js ผ่าน <use href="#dev-xxx">
   (อ้างข้าม <svg> ได้ เพราะ id ใช้ร่วมกันทั้งหน้า)
   ============================================================ */

/* ค่าคงที่ของผัง — แก้ที่เดียวปรับได้ทั้งแผนภาพ
   STEP ต้องห่างพอให้ช่องว่างระหว่างกล่อง (STEP-BOX) ใส่ลูกศรได้ไม่อึดอัด
   PAD เผื่อที่ด้านบนไว้วางป้าย "สาย +" เหนือแถวอุปกรณ์ */
var HINT = { ICON:42, BOX:52, STEP:82, PAD:20, PER_ROW:5, ROW_H:92 };

/* แปลงเฉลยเป็นลำดับอุปกรณ์ เช่น ['battery_aa','switch','bulb']
   เส้นสุดท้ายที่วนกลับไปหาตัวแรก ไม่นับเป็นอุปกรณ์ใหม่ */
function solutionChain(pairs){
  var seq = [ pairs[0][0].split('.')[0] ];
  for(var i=0;i<pairs.length;i++){
    var d = pairs[i][1].split('.')[0];
    if(i === pairs.length-1 && d === seq[0]) break;
    seq.push(d);
  }
  return seq;
}

/* สีสายในผัง — ให้ตรงกับสีสายจริงในเกม */
var HINT_POS = '#ff4444';   /* ฝั่งขั้วบวก */
var HINT_NEG = '#3b82f6';   /* ฝั่งขั้วลบ */
var HINT_MID = '#ffd700';   /* สายกลางวง */

/* กล่องอุปกรณ์ 1 ชิ้น + ชื่อ + ป้ายขั้ว +/− (ถ้ามีขั้ว)
   ป้ายขั้ววางให้อยู่ "ในกล่อง" ทั้งวง (ศูนย์กลางห่างขอบ 10 รัศมี 6.5)
   ถ้าวางชิดขอบเกินไป วงจะล้นออกนอกกล่องแล้วดูเหมือนลอยอยู่ */
function hintDeviceBox(deviceId, cx, cy){
  var dev = DEVICES[deviceId];
  var B = HINT.BOX, I = HINT.ICON;
  var s = '<rect x="'+(cx-B/2)+'" y="'+(cy-B/2)+'" width="'+B+'" height="'+B+'" rx="9" '
        + 'fill="#1a2f50" stroke="#2d4a70" stroke-width="1.3"/>'
        + '<use href="#'+dev.svgId+'" x="'+(cx-I/2)+'" y="'+(cy-I/2)+'" width="'+I+'" height="'+I+'"/>'
        + '<text x="'+cx+'" y="'+(cy+B/2+12)+'" text-anchor="middle" fill="#8fa5c0" font-size="8">'
        + dev.name + '</text>';

  if(dev.polarized){
    var yb   = cy - B/2 + 10;
    var xPos = (dev.pos === 'left') ? cx - B/2 + 10 : cx + B/2 - 10;
    var xNeg = (dev.neg === 'left') ? cx - B/2 + 10 : cx + B/2 - 10;
    s += '<circle cx="'+xPos+'" cy="'+yb+'" r="6.5" fill="'+HINT_POS+'" stroke="#fff" stroke-width="1.1"/>'
       + '<text x="'+xPos+'" y="'+(yb+3)+'" text-anchor="middle" fill="#fff" font-size="9" font-weight="bold">+</text>'
       + '<circle cx="'+xNeg+'" cy="'+yb+'" r="6.5" fill="'+HINT_NEG+'" stroke="#fff" stroke-width="1.1"/>'
       + '<text x="'+xNeg+'" y="'+(yb+3.3)+'" text-anchor="middle" fill="#fff" font-size="10" font-weight="bold">−</text>';
  }
  return s;
}

/* ลูกศรแนวนอนระหว่างกล่อง 2 ใบ — ระบุสีสายได้
   หัวลูกศรสั้น (6) และเส้นหยุดก่อนหัว 1 หน่วย ไม่ให้ทับกันจนดูเบียด */
function hintArrow(x1, x2, y, color){
  var c = color || HINT_MID, H = 6;
  return '<line x1="'+x1+'" y1="'+y+'" x2="'+(x2-H+1)+'" y2="'+y+'" stroke="'+c+'" stroke-width="2.2" stroke-linecap="butt"/>'
       + '<polygon points="'+x2+','+y+' '+(x2-H)+','+(y-4.2)+' '+(x2-H)+','+(y+4.2)+'" fill="'+c+'"/>';
}

/* เส้นหักมุมแบบ "มุมโค้ง" — รับจุดหักเป็นอาเรย์ [[x,y],...]
   ใช้ Q (quadratic bezier) ที่มุมแทนการหักฉาก เส้นประจึงวิ่งโค้งต่อเนื่อง
   ดูเป็นสายไฟจริงมากกว่ามุม 90 องศาแข็ง ๆ

   รัศมีถูกหดอัตโนมัติไม่ให้เกินครึ่งของด้านที่สั้นที่สุดที่มาบรรจบมุมนั้น
   ไม่งั้นโค้งของสองมุมที่อยู่ใกล้กันจะกินกันจนเส้นเพี้ยน */
function hintRoundPath(pts, r){
  var d = 'M' + pts[0][0] + ',' + pts[0][1];
  for(var i=1;i<pts.length-1;i++){
    var p0=pts[i-1], p1=pts[i], p2=pts[i+1];
    var l1=Math.hypot(p1[0]-p0[0], p1[1]-p0[1]);
    var l2=Math.hypot(p2[0]-p1[0], p2[1]-p1[1]);
    if(!l1 || !l2) continue;
    var rr=Math.min(r, l1/2, l2/2);
    var ax=p1[0]+(p0[0]-p1[0])*rr/l1, ay=p1[1]+(p0[1]-p1[1])*rr/l1;
    var bx=p1[0]+(p2[0]-p1[0])*rr/l2, by=p1[1]+(p2[1]-p1[1])*rr/l2;
    d += ' L'+ax.toFixed(1)+','+ay.toFixed(1)
       + ' Q'+p1[0]+','+p1[1]+' '+bx.toFixed(1)+','+by.toFixed(1);
  }
  var e=pts[pts.length-1];
  return d + ' L'+e[0]+','+e[1];
}

/* หัวลูกศรเดี่ยว ชี้ไปทางขวา ที่ปลาย (x,y) */
function hintHead(x, y, color){
  return '<polygon points="'+x+','+y+' '+(x-6)+','+(y-4.2)+' '+(x-6)+','+(y+4.2)+'" fill="'+color+'"/>';
}

/* ป้ายกำกับสาย เช่น "สายขั้วบวก (+)" ลอยเหนือ/ใต้เส้น */
function hintWireTag(x, y, text, color){
  return '<text x="'+x+'" y="'+y+'" text-anchor="middle" fill="'+color+'" '
       + 'font-size="8" font-weight="bold">'+text+'</text>';
}

/* ── แผนภาพวงจรอนุกรม ── ตัดขึ้นบรรทัดใหม่ทุก PER_ROW ชิ้น */
function buildSeriesDiagram(lv){
  var seq  = solutionChain(lv.solution);
  var B=HINT.BOX, S=HINT.STEP, P=HINT.PAD, RH=HINT.ROW_H;
  var perRow = Math.min(seq.length, HINT.PER_ROW);
  var rows   = Math.ceil(seq.length / HINT.PER_ROW);
  /* OFF = ระยะขอบซ้าย-ขวาเผื่อไว้ให้ "รางสายวนกลับ" มีที่โค้งมุมได้สวย
     ถ้าไม่เผื่อ ช่วงจากกล่องตัวท้ายถึงรางขวาจะสั้นเกินจนโค้งไม่ขึ้น */
  var OFF = 18, RAIL = 9, R = 11;
  var W = OFF*2 + P*2 + B + (perRow-1)*S;
  var H = P + rows*RH + 26;
  var botY = P + rows*RH + 8;
  var railL = RAIL, railR = W - RAIL;

  function px(i){ return OFF + P + B/2 + (i % HINT.PER_ROW) * S; }
  function py(i){ return P + Math.floor(i / HINT.PER_ROW) * RH + B/2; }

  /* จำกัดความกว้างสูงสุด ~1.25 เท่าของ viewBox
     ไม่งั้นผังที่มีอุปกรณ์น้อย (viewBox แคบ) จะถูก width:100% ยืดจนบวมเกินไป */
  var s = '<svg class="hint-svg" style="max-width:'+Math.round(W*1.25)+'px" '
        + 'viewBox="0 0 '+W+' '+H+'" xmlns="http://www.w3.org/2000/svg">';

  /* เส้นเชื่อมระหว่างอุปกรณ์ — เส้นแรกที่ออกจากขั้ว + ใช้สีแดงให้เห็นชัด */
  for(var i=0;i<seq.length-1;i++){
    var sameRow = Math.floor(i/HINT.PER_ROW) === Math.floor((i+1)/HINT.PER_ROW);
    if(sameRow){
      s += hintArrow(px(i)+B/2+4, px(i+1)-B/2-4, py(i), i===0 ? HINT_POS : HINT_MID);
      /* ป้ายวางเหนือแถวกล่อง ไม่ยัดลงช่องว่างแคบ ๆ ระหว่างกล่อง */
      if(i===0) s += hintWireTag((px(0)+px(1))/2, py(0)-B/2-6, 'สาย +', HINT_POS);
    } else {
      /* ตัดบรรทัด: อ้อมขวา → ลงช่องว่างระหว่างแถว → กลับซ้าย → เข้าตัวแรกของแถวถัดไป */
      var gapY = py(i) + B/2 + 26;
      var tipW = px(i+1) - B/2 - 2;
      s += '<path d="' + hintRoundPath([
             [px(i)+B/2+4, py(i)],
             [railR, py(i)],
             [railR, gapY],
             [railL, gapY],
             [railL, py(i+1)],
             [tipW-6, py(i+1)]
           ], R) + '" fill="none" stroke="'+HINT_MID+'" stroke-width="2.2" '
         + 'stroke-linecap="round" stroke-linejoin="round"/>'
         + hintHead(tipW, py(i+1), HINT_MID);
    }
  }

  /* สายวนกลับครบวง (ตัวสุดท้าย → ตัวแรก) เส้นประฟ้า = ฝั่งขั้วลบ
     มุมโค้งทั้ง 4 มุม และเส้นประวิ่งไปจบพอดีที่โคนหัวลูกศร */
  var last = seq.length-1;
  var tip  = px(0) - B/2 - 2;
  s += '<path d="' + hintRoundPath([
         [px(last)+B/2+4, py(last)],
         [railR, py(last)],
         [railR, botY],
         [railL, botY],
         [railL, py(0)],
         [tip-6, py(0)]
       ], R) + '" fill="none" stroke="'+HINT_NEG+'" stroke-width="2.2" '
     + 'stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="7 5"/>'
     + hintHead(tip, py(0), HINT_NEG)
     + hintWireTag(W/2, botY-6, 'สาย −  (กลับเข้าขั้วลบ ครบวงจร)', HINT_NEG);

  for(var k=0;k<seq.length;k++) s += hintDeviceBox(seq[k], px(k), py(k));
  return s + '</svg>';
}

/* ── แผนภาพวงจรขนาน ── แบตซ้าย แตกเป็นสาขาเรียงลงมา */
function buildParallelDiagram(lv){
  var pairs = lv.solution, br = lv.topology.branches;
  var per = pairs.length / br;
  var src = pairs[0][0].split('.')[0];

  /* อุปกรณ์ในสาขา (ทุกสาขาต่อชุดเดียวกัน) */
  var chain = [];
  for(var i=0;i<per-1;i++) chain.push(pairs[i][1].split('.')[0]);

  var B=HINT.BOX, S=HINT.STEP;
  var TOP=30, RH=84, BAT_CX=52, BUS_L=112, X0=150;
  var W = X0 + B + (chain.length-1)*S + 56;
  var H = TOP + (br-1)*RH + B/2 + 48;
  var BUS_R = W - 26, botY = H - 22;
  var batCY = TOP + (br-1)*RH/2;

  function cx(j){ return X0 + B/2 + j*S; }
  function cy(k){ return TOP + k*RH; }

  var s = '<svg class="hint-svg" style="max-width:'+Math.round(W*1.25)+'px" '
        + 'viewBox="0 0 '+W+' '+H+'" xmlns="http://www.w3.org/2000/svg">';

  /* บัสจ่ายไฟฝั่ง + (แดง) และฝั่ง − (ฟ้า) */
  s += '<line x1="'+BUS_L+'" y1="'+cy(0)+'" x2="'+BUS_L+'" y2="'+cy(br-1)+'" stroke="'+HINT_POS+'" stroke-width="2.2" stroke-linecap="round"/>'
     + '<line x1="'+(BAT_CX+B/2)+'" y1="'+batCY+'" x2="'+BUS_L+'" y2="'+batCY+'" stroke="'+HINT_POS+'" stroke-width="2.2"/>'
     + '<line x1="'+BUS_R+'" y1="'+cy(0)+'" x2="'+BUS_R+'" y2="'+cy(br-1)+'" stroke="'+HINT_NEG+'" stroke-width="2.2" stroke-linecap="round"/>'
     + hintWireTag(BUS_L, cy(0)-B/2-16, 'สาย +', HINT_POS)
     + hintWireTag(BUS_R, cy(0)-B/2-16, 'สาย −', HINT_NEG);

  /* สายกลับจากบัส − อ้อมใต้ทุกสาขา แล้วขึ้นเข้าขั้วลบของแบตทางซ้าย
     (เดินที่ x=10 ซึ่งอยู่นอกกล่องแบตที่เริ่มต้นที่ x=26 จึงไม่ลากทับ)
     มุมโค้งเหมือนผังอนุกรม และเส้นประจบพอดีที่โคนหัวลูกศร */
  var tipP = BAT_CX - B/2 - 2;
  s += '<path d="' + hintRoundPath([
         [BUS_R, cy(br-1)],
         [BUS_R, botY],
         [10, botY],
         [10, batCY],
         [tipP-6, batCY]
       ], 11) + '" fill="none" stroke="'+HINT_NEG+'" stroke-width="2.2" '
     + 'stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="7 5"/>'
     + hintHead(tipP, batCY, HINT_NEG);

  /* แต่ละสาขา */
  for(var k=0;k<br;k++){
    s += '<circle cx="'+BUS_L+'" cy="'+cy(k)+'" r="3.5" fill="'+HINT_POS+'"/>'
       + '<circle cx="'+BUS_R+'" cy="'+cy(k)+'" r="3.5" fill="'+HINT_NEG+'"/>';
    s += hintArrow(BUS_L, cx(0)-B/2-4, cy(k), HINT_POS);
    for(var j=0;j<chain.length-1;j++) s += hintArrow(cx(j)+B/2+4, cx(j+1)-B/2-4, cy(k));
    s += '<line x1="'+(cx(chain.length-1)+B/2+3)+'" y1="'+cy(k)+'" x2="'+BUS_R+'" y2="'+cy(k)+'" stroke="'+HINT_NEG+'" stroke-width="2.2" stroke-linecap="round"/>';
    for(var m=0;m<chain.length;m++) s += hintDeviceBox(chain[m], cx(m), cy(k));
    s += '<text x="'+(BUS_L+14)+'" y="'+(cy(k)-B/2-5)+'" fill="#6e88a8" font-size="8.5">สาขาที่ '+(k+1)+'</text>';
  }

  s += hintDeviceBox(src, BAT_CX, batCY);
  return s + '</svg>';
}

/* สร้างคำใบ้: ตัวอย่างการต่อสายของด่านนี้ (เป็นแผนภาพ) */
function buildSolutionHint(){
  var lv = currentLevel();
  if(!lv.solution) return '<div class="hint-box"><div class="hint-note">เปิด "คู่มือ" เพื่อดูคำแนะนำ</div></div>';

  var isParallel = lv.topology && lv.topology.type === 'parallel';
  var diagram, note;
  try{
    diagram = isParallel ? buildParallelDiagram(lv) : buildSeriesDiagram(lv);
    note = isParallel
      ? 'แยก ' + lv.topology.branches + ' สาขาจากขั้วแบตเตอรี่ แต่ละสาขาต่อชุดเดียวกัน'
      : 'ต่อเรียงกันเป็นวงเดียว ทุกจุดขั้วมีสายเส้นเดียว';
  }catch(e){
    /* เฉลยรูปแบบแปลก ๆ ที่วาดไม่ได้ — ยังต้องมีคำใบ้ให้ผู้เล่น */
    return '<div class="hint-box"><div class="hint-note">ลองเปิด "คู่มือ" ดูลำดับการต่อของด่านนี้</div></div>';
  }

  return '<div class="hint-box">'
       + '<div class="hint-title">' + ICON('bulbIdea',15) + ' ตัวอย่างการต่อ</div>'
       + diagram
       + '<div class="hint-note">' + note + '</div>'
       + '<div class="hint-sub">สลับซ้าย-ขวา หรือกลับทิศวน ก็นับว่าถูกเช่นกัน</div>'
       + '</div>';
}

function showResult(ok,msg,earned,elapsed,replay,fault,outcome){
  /* ต่อผิดธรรมดา กับ "วงจรพังจริง" ต้องรู้สึกต่างกัน */
  var broke = !ok && fault && fault.incidents && fault.incidents.length;
  document.getElementById('result-icon').innerHTML = ok
    ? '<span style="color:#00d97e">'+ICON('checkCircle',56)+'</span>'
    : (broke ? '<span style="color:#ff8a30;font-size:3.4rem;line-height:1">&#x26A0;</span>'
             : '<span style="color:#ff4d5e">'+ICON('target',56)+'</span>');
  document.getElementById('result-header-title').innerHTML =
    ok ? (ICON('check',18)+' ผ่านด่าน!') : (broke ? '&#x26A0; วงจรเสียหาย' : 'ยังไม่ถูกต้อง');
  document.getElementById('result-title').textContent =
    ok ? 'ถูกต้อง!' : (broke ? 'วงจรพังแล้ว!' : 'ลองอีกครั้ง!');
  document.getElementById('result-msg').textContent=msg;
  /* เล่นซ้ำด่านที่ผ่านแล้ว = ไม่ได้คะแนนเพิ่ม (กันไล่เก็บคะแนนซ้ำ) */
  document.getElementById('stat-score').textContent =
    !ok ? '—' : (replay ? 'ซ้ำ' : '+'+earned);
  document.getElementById('stat-time').textContent=elapsed+'s';
  document.getElementById('stat-wires').textContent=G.wires.length;
  /* ผ่านด่าน = ให้เห็น "ค่าที่วัดได้จริง" ของวงจรที่ตัวเองต่อ
     ไม่ผ่านเพราะวงจรพัง = ให้เห็นรายงานเหตุการณ์ก่อน แล้วค่อยตามด้วยคำใบ้
     (รายงานตอบว่า ต่อแบบนี้ → พังตรงไหน → อันตรายยังไง → ป้องกันยังไง) */
  var incidents = (fault && fault.incidents) ? fault.incidents : [];
  var warnings  = (fault && fault.warnings)  ? fault.warnings  : [];
  var list = buildOutcomeChecklist(outcome);
  document.getElementById('result-hint').innerHTML =
    ok ? (list + buildAnalysisPanel() + incidentReportHTML(warnings) + buildCircuitReport() +
          (replay ? '<span style="color:var(--text-dim)">ด่านนี้เก็บคะแนนไปแล้ว — เล่นซ้ำเพื่อทบทวนได้ แต่ไม่ได้คะแนนเพิ่ม</span>' : ''))
       : (list + buildAnalysisPanel() + incidentReportHTML(incidents) + incidentReportHTML(warnings) + buildSolutionHint());
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
  /* โหมดวัดความเร็ว: ปุ่มนี้คือ "รอบถัดไป" สุ่มโจทย์ใหม่ ไม่ใช่เลื่อนด่าน */
  if(G.endless){ loadEndlessRound(); return; }
  var next=G.level+1;
  if(next>=LEVELS.length) endGame();
  else loadLevel(next);
}

function endGame(){
  clearInterval(G.timerInt);
  G.finished=true;
  var firstTime = !G.modesUnlocked;
  G.modesUnlocked=true;          /* รางวัล: ปลดล็อกโหมดอิสระ + โหมดวัดความเร็ว */
  updateModeButtons();
  saveGame();   /* บันทึกว่าเล่นจบครบทุกด่านแล้ว */
  showScreen('screen-posttest');
  if(firstTime) showToast('ปลดล็อกโหมดพิเศษแล้ว! โหมดอิสระ และ โหมดวัดความเร็ว','success');
}

/* โหมดพิเศษ (อิสระ/วัดความเร็ว) โผล่หลังเล่นครบทุกด่านแล้วเท่านั้น
   ซ่อน/แสดงด้วยคลาสเดียวบน body — ดู css/game-layout.css */
function updateModeButtons(){
  document.body.classList.toggle('modes-unlocked', !!G.modesUnlocked);
  var box = document.getElementById('unlock-box');
  if(box) box.style.display = G.modesUnlocked ? '' : 'none';
}

/* ============================================================
   TUTORIAL
   ============================================================ */
function openTutorial(){
  /* โหมดอิสระไม่มีคู่มือประจำด่าน */
  if(G.sandbox){
    showToast('โหมดอิสระไม่มีคู่มือประจำด่าน — กด "กลับสู่ด่าน" เพื่อดูคู่มือ','');
    return;
  }
  G.tutPages=currentLevel().tutorial;
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
  restoreFormStatus(); /* เคยทำข้อสอบก่อนเรียนแล้ว → ปลดล็อกให้เลย ไม่ต้องทำซ้ำ */
  restoreUnlocks();    /* เคยเล่นจบครบทุกด่านไหม → โชว์ปุ่มโหมดพิเศษ */
  renderResumeBox();   /* มีข้อมูลบันทึกไว้ไหม → โชว์กล่อง "เล่นต่อ" */

  /* บันทึกสถานะตั้งแต่ pointerdown ไม่ต้องรอ click
     บนมือถือ พอแตะลิงก์ที่ target=_blank เบราว์เซอร์เปิดแท็บใหม่แล้ว
     พักหน้าเดิมทันที onclick อาจถูกตัดจังหวะจนทำงานไม่จบ
     pointerdown เกิดก่อนเสมอ จึงบันทึกลง localStorage ได้ทัน */
  ['pretest','posttest'].forEach(function(which){
    var a = document.getElementById(which+'-link');
    if(!a) return;
    a.addEventListener('pointerdown', function(){ markFormDone(which,true); });
    a.addEventListener('touchstart',  function(){ markFormDone(which,true); }, {passive:true});
  });

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

  /* คลิกพื้นที่มืดนอกกล่อง = ปิด modal
     กล่องยืนยันต้องผ่าน closeConfirm(false) เพื่อเคลียร์ callback ที่ค้างไว้ */
  document.querySelectorAll('.modal-overlay').forEach(function(ov){
    ov.addEventListener('click',function(e){
      if(e.target!==ov) return;
      if(ov.id==='modal-confirm'){ closeConfirm(false); return; }
      closeModal(ov.id);
    });
  });
});

/* กลับมาที่หน้าเกมหลังไปทำแบบทดสอบในแท็บอื่น

   มือถือมักทิ้งหน้าที่พักไว้เพื่อประหยัดหน่วยความจำ พอกลับมาจะได้หน้าใหม่
   ที่ FormStatus ว่างเปล่า ปุ่มจึงกลับไปล็อกอีก
   pageshow ทำงานทั้งตอนโหลดใหม่และตอนคืนจาก bfcache จึงคืนสถานะได้ทุกกรณี */
window.addEventListener('pageshow', function(){
  restoreFormStatus();
  restoreUnlocks();
  renderResumeBox();
});

/* กลับมาโฟกัสหน้านี้อีกครั้ง (สลับแท็บกลับมา) — คืนสถานะให้ด้วย */
document.addEventListener('visibilitychange', function(){
  if(!document.hidden) restoreFormStatus();
});

document.addEventListener('keydown',function(e){
  if(!document.getElementById('screen-game').classList.contains('active')) return;
  /* ไม่ทำงานถ้า focus อยู่ที่ input */
  if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA') return;
  /* กันกดค้างแล้วสั่งซ้ำ (เช่น E สลับโหมดกลับไปกลับมา) */
  if(e.repeat) return;

  /* ทุกคีย์ลัดเทียบผ่าน isKey/isNamedKey (js/ui.js)
     ซึ่งดู e.code + e.keyCode ก่อน e.key จึงใช้ได้ทุกภาษาแป้นพิมพ์ */

  /* R = หมุนอุปกรณ์ที่เลือกอยู่ 90° */
  if(isKey(e,'r')){
    if(G.selectedItemId){
      rotateItem(G.selectedItemId);
    } else {
      showToast('คลิกเลือกอุปกรณ์ก่อน แล้วกด R เพื่อหมุน','error');
    }
    return;
  }

  /* S = สับสวิตช์ที่เลือกอยู่ (เปิด/ปิดวงจร) */
  if(isKey(e,'s')){
    var sel=null;
    G.wsItems.forEach(function(i){ if(i.id===G.selectedItemId) sel=i; });
    if(sel && sel.deviceId==='switch') toggleSwitchItem(sel.id);
    else showToast('คลิกเลือกสวิตช์ก่อน แล้วกด S เพื่อสับเปิด/ปิด','error');
    return;
  }

  /* C = ตรวจวงจร */
  if(isKey(e,'c')){ checkCircuit(); return; }

  /* M = เปิด/ปิดเครื่องวัด */
  if(isKey(e,'m')){ toggleProbeMode(); return; }

  /* H = เปิดคู่มือ */
  if(isKey(e,'h')){ openTutorial(); return; }

  if(isNamedKey(e,'Escape')){
    /* กำลังแตะจุดขั้วแรกค้างไว้ → Esc ยกเลิกการต่อสายก่อน */
    if(G.tapWireFrom || G.drawingFrom){ cancelTapConnect(); return; }
    deselectAll();
    document.querySelectorAll('.modal-overlay.open').forEach(function(m){m.classList.remove('open');});
    return;
  }

  /* Delete / Backspace = ลบอุปกรณ์ที่เลือก */
  if((isNamedKey(e,'Delete') || isNamedKey(e,'Backspace')) && G.selectedItemId){
    var id=G.selectedItemId;
    deselectAll();
    removeWsItem(id);
  }
});
