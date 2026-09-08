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
  /* โหมดอิสระ/ไม่รู้จบไม่มีเลขด่านและไม่เสียชีวิต แสดงเป็นสัญลักษณ์แทน */
  document.getElementById('hud-level').textContent =
    G.sandbox ? 'อิสระ'
    : G.endless ? ('รอบ '+G.endlessRound)
    : (G.level+1)+'/'+LEVELS.length;
  document.getElementById('hud-score').textContent = G.endless ? G.endlessScore : G.score;
  document.getElementById('hud-lives').innerHTML =
    (G.sandbox||G.endless) ? '<span class="hud-inf">∞</span>' : renderHearts(G.lives, 3);
}

function loadLevel(idx){
  if(idx>=LEVELS.length){endGame();return;}
  /* ออกจากโหมดพิเศษอัตโนมัติ ครอบคลุมทั้งปุ่มกลับสู่ด่าน
     และการกดจุดด่านบนแถบด้านบนขณะอยู่ในโหมดอิสระ/ไม่รู้จบ */
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
  saveGame();   /* บันทึกทุกครั้งที่เปลี่ยนด่าน */
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
  /* โหมดไม่รู้จบ: หมดเวลา = จบรัน ไปหน้าตารางอันดับ */
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
  /* โหมดอิสระ: ไม่มีเฉลยให้เทียบ ไม่มีคะแนน ไม่เสียชีวิต */
  if(G.sandbox){ sandboxCheck(); return; }

  var lv=currentLevel();
  var result=lv.check(G.wsItems,G.wires);
  /* เช็คเทียบเฉลย (ยืดหยุ่น: สลับซ้ายขวา/กลับทิศได้ แต่การเชื่อมต้องครบ ไม่เกิน ขั้วถูก) */
  if(result.ok && lv.solution){
    var exact = checkExactWiring(G.wsItems, G.wires, lv.solution);
    if(!exact.ok) result = exact;
  }
  var elapsed=Math.floor((Date.now()-G.levelStartTime)/1000);

  /* โหมดไม่รู้จบมีระบบคะแนน/เวลาของตัวเอง ไม่ยุ่งกับคะแนนและชีวิตของโหมดด่าน */
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
    showResult(true,result.msg,earned,elapsed,replay);
  } else {
    /* ตรวจไม่ผ่าน = เสียชีวิต 1 ดวง */
    G.lives--;
    updateLevelBar();
    saveGame();   /* บันทึกจำนวนชีวิตที่เหลือ */
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

/* ============================================================
   SOLUTION HINT — คำใบ้ตอนตรวจไม่ผ่าน วาดเป็น "แผนภาพ" ไม่ใช่รายการข้อความ

   ใช้รูปอุปกรณ์จริงจาก js/device-symbols.js ผ่าน <use href="#dev-xxx">
   (อ้างข้าม <svg> ได้ เพราะ id ใช้ร่วมกันทั้งหน้า)
   ============================================================ */

/* ค่าคงที่ของผัง — แก้ที่เดียวปรับได้ทั้งแผนภาพ */
var HINT = { ICON:42, BOX:52, STEP:76, PAD:14, PER_ROW:5, ROW_H:92 };

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

/* กล่องอุปกรณ์ 1 ชิ้น + ชื่อ + ป้ายขั้ว +/− (ถ้ามีขั้ว) */
function hintDeviceBox(deviceId, cx, cy){
  var dev = DEVICES[deviceId];
  var B = HINT.BOX, I = HINT.ICON;
  var s = '<rect x="'+(cx-B/2)+'" y="'+(cy-B/2)+'" width="'+B+'" height="'+B+'" rx="9" '
        + 'fill="#1a2f50" stroke="#2d4a70" stroke-width="1.3"/>'
        + '<use href="#'+dev.svgId+'" x="'+(cx-I/2)+'" y="'+(cy-I/2)+'" width="'+I+'" height="'+I+'"/>'
        + '<text x="'+cx+'" y="'+(cy+B/2+13)+'" text-anchor="middle" fill="#8fa5c0" font-size="8.5">'
        + dev.name + '</text>';

  /* ป้ายขั้วมุมบนของกล่อง — บอกว่าด้านไหนต้องเป็น + / − */
  if(dev.polarized){
    var yb = cy - B/2 + 3;
    var xPos = (dev.pos === 'left') ? cx - B/2 + 3 : cx + B/2 - 3;
    var xNeg = (dev.neg === 'left') ? cx - B/2 + 3 : cx + B/2 - 3;
    s += '<circle cx="'+xPos+'" cy="'+yb+'" r="7" fill="#ff4444" stroke="#fff" stroke-width="1.2"/>'
       + '<text x="'+xPos+'" y="'+(yb+3.2)+'" text-anchor="middle" fill="#fff" font-size="9" font-weight="bold">+</text>'
       + '<circle cx="'+xNeg+'" cy="'+yb+'" r="7" fill="#3b82f6" stroke="#fff" stroke-width="1.2"/>'
       + '<text x="'+xNeg+'" y="'+(yb+3.5)+'" text-anchor="middle" fill="#fff" font-size="10" font-weight="bold">−</text>';
  }
  return s;
}

/* ลูกศรแนวนอนระหว่างกล่อง 2 ใบ */
function hintArrow(x1, x2, y){
  return '<line x1="'+x1+'" y1="'+y+'" x2="'+(x2-5)+'" y2="'+y+'" stroke="#ffd700" stroke-width="2.2" stroke-linecap="round"/>'
       + '<polygon points="'+x2+','+y+' '+(x2-7)+','+(y-4)+' '+(x2-7)+','+(y+4)+'" fill="#ffd700"/>';
}

/* ── แผนภาพวงจรอนุกรม ── ตัดขึ้นบรรทัดใหม่ทุก PER_ROW ชิ้น */
function buildSeriesDiagram(lv){
  var seq  = solutionChain(lv.solution);
  var B=HINT.BOX, S=HINT.STEP, P=HINT.PAD, RH=HINT.ROW_H;
  var perRow = Math.min(seq.length, HINT.PER_ROW);
  var rows   = Math.ceil(seq.length / HINT.PER_ROW);
  var W = P*2 + B + (perRow-1)*S;
  var H = P + rows*RH + 26;
  var botY = P + rows*RH + 8;

  function px(i){ return P + B/2 + (i % HINT.PER_ROW) * S; }
  function py(i){ return P + Math.floor(i / HINT.PER_ROW) * RH + B/2; }

  var s = '<svg class="hint-svg" viewBox="0 0 '+W+' '+H+'" xmlns="http://www.w3.org/2000/svg">';

  /* เส้นเชื่อมระหว่างอุปกรณ์ */
  for(var i=0;i<seq.length-1;i++){
    var sameRow = Math.floor(i/HINT.PER_ROW) === Math.floor((i+1)/HINT.PER_ROW);
    if(sameRow){
      s += hintArrow(px(i)+B/2+3, px(i+1)-B/2-3, py(i));
    } else {
      /* ตัดบรรทัด: อ้อมขวา → ลงมาในช่องว่างระหว่างแถว → กลับซ้าย → เข้าตัวแรกของแถวถัดไป */
      var gapY = py(i) + B/2 + 26;
      s += '<path d="M'+(px(i)+B/2+3)+','+py(i)+' L'+(W-8)+','+py(i)
         + ' L'+(W-8)+','+gapY+' L8,'+gapY+' L8,'+py(i+1)+' L'+(px(i+1)-B/2-8)+','+py(i+1)+'" '
         + 'fill="none" stroke="#ffd700" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>'
         + '<polygon points="'+(px(i+1)-B/2-1)+','+py(i+1)+' '+(px(i+1)-B/2-8)+','+(py(i+1)-4)+' '+(px(i+1)-B/2-8)+','+(py(i+1)+4)+'" fill="#ffd700"/>';
    }
  }

  /* สายวนกลับครบวง (ตัวสุดท้าย → ตัวแรก) วาดเป็นสีฟ้า = ฝั่งขั้วลบ */
  var last = seq.length-1;
  s += '<path d="M'+(px(last)+B/2+3)+','+py(last)+' L'+(W-8)+','+py(last)
     + ' L'+(W-8)+','+botY+' L8,'+botY+' L8,'+py(0)+' L'+(px(0)-B/2-8)+','+py(0)+'" '
     + 'fill="none" stroke="#3b82f6" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="7 4"/>'
     + '<polygon points="'+(px(0)-B/2-1)+','+py(0)+' '+(px(0)-B/2-8)+','+(py(0)-4)+' '+(px(0)-B/2-8)+','+(py(0)+4)+'" fill="#3b82f6"/>'
     + '<text x="'+(W/2)+'" y="'+(botY-5)+'" text-anchor="middle" fill="#3b82f6" font-size="8.5">สายกลับเข้าขั้วลบ ครบวงจร</text>';

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

  var s = '<svg class="hint-svg" viewBox="0 0 '+W+' '+H+'" xmlns="http://www.w3.org/2000/svg">';

  /* บัสจ่ายไฟฝั่ง + (เหลือง) และฝั่ง − (ฟ้า) */
  s += '<line x1="'+BUS_L+'" y1="'+cy(0)+'" x2="'+BUS_L+'" y2="'+cy(br-1)+'" stroke="#ffd700" stroke-width="2.2" stroke-linecap="round"/>'
     + '<line x1="'+(BAT_CX+B/2)+'" y1="'+batCY+'" x2="'+BUS_L+'" y2="'+batCY+'" stroke="#ffd700" stroke-width="2.2"/>'
     + '<line x1="'+BUS_R+'" y1="'+cy(0)+'" x2="'+BUS_R+'" y2="'+cy(br-1)+'" stroke="#3b82f6" stroke-width="2.2" stroke-linecap="round"/>';

  /* สายกลับจากบัส − อ้อมใต้ทุกสาขา แล้วขึ้นเข้าขั้วลบของแบตทางซ้าย
     (เดินที่ x=10 ซึ่งอยู่นอกกล่องแบตที่เริ่มต้นที่ x=26 จึงไม่ลากทับ) */
  s += '<path d="M'+BUS_R+','+cy(br-1)+' L'+BUS_R+','+botY+' L10,'+botY+' L10,'+batCY+' L'+(BAT_CX-B/2-8)+','+batCY+'" '
     + 'fill="none" stroke="#3b82f6" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="7 4"/>'
     + '<polygon points="'+(BAT_CX-B/2-1)+','+batCY+' '+(BAT_CX-B/2-8)+','+(batCY-4)+' '+(BAT_CX-B/2-8)+','+(batCY+4)+'" fill="#3b82f6"/>';

  /* แต่ละสาขา */
  for(var k=0;k<br;k++){
    s += '<circle cx="'+BUS_L+'" cy="'+cy(k)+'" r="3.5" fill="#ffd700"/>'
       + '<circle cx="'+BUS_R+'" cy="'+cy(k)+'" r="3.5" fill="#3b82f6"/>';
    s += hintArrow(BUS_L, cx(0)-B/2-3, cy(k));
    for(var j=0;j<chain.length-1;j++) s += hintArrow(cx(j)+B/2+3, cx(j+1)-B/2-3, cy(k));
    s += '<line x1="'+(cx(chain.length-1)+B/2+3)+'" y1="'+cy(k)+'" x2="'+BUS_R+'" y2="'+cy(k)+'" stroke="#3b82f6" stroke-width="2.2" stroke-linecap="round"/>';
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
  /* โหมดไม่รู้จบ: ปุ่มนี้คือ "รอบถัดไป" สุ่มโจทย์ใหม่ ไม่ใช่เลื่อนด่าน */
  if(G.endless){ loadEndlessRound(); return; }
  var next=G.level+1;
  if(next>=LEVELS.length) endGame();
  else loadLevel(next);
}

function endGame(){
  clearInterval(G.timerInt);
  G.finished=true;
  var firstTime = !G.modesUnlocked;
  G.modesUnlocked=true;          /* รางวัล: ปลดล็อกโหมดอิสระ + โหมดไม่รู้จบ */
  updateModeButtons();
  saveGame();   /* บันทึกว่าเล่นจบครบทุกด่านแล้ว */
  showScreen('screen-posttest');
  if(firstTime) showToast('ปลดล็อกโหมดพิเศษแล้ว! โหมดอิสระ และ โหมดไม่รู้จบ','success');
}

/* โหมดพิเศษ (อิสระ/ไม่รู้จบ) โผล่หลังเล่นครบทุกด่านแล้วเท่านั้น
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
