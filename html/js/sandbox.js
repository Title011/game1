/* ============================================================
   SANDBOX — โหมดอิสระ ทดลองต่อวงจรได้เต็มที่

   ต่างจากโหมดด่าน:
     • อุปกรณ์ครบทุกชนิด จำนวนเยอะ
     • ไม่จับเวลา ไม่เสียชีวิต ไม่มีเฉลยให้ตรวจเทียบ
     • กด "ตรวจวงจร" = บอกแค่ว่าวงจรปิดครบหรือยัง แล้วเปิดไฟให้ดู
     • ไม่บันทึกทับความคืบหน้าจริง (ดู saveGame() ใน save.js)

   เข้าโหมดนี้ได้จากปุ่มบน header ของหน้าเกมเท่านั้น
   ไม่ใส่ทางลัดไว้หน้าแบบทดสอบ เพื่อไม่ให้ข้ามข้อสอบก่อนเรียนได้
   ============================================================ */

/* คลังอุปกรณ์ของโหมดอิสระ — ให้เยอะพอทดลองวงจรผสมได้
   ไม่ใส่ 'wire' เพราะสายไฟในเกมนี้ใช้วิธีลากเอา ไม่ต้องวางเป็นชิ้น */
var SANDBOX_INVENTORY = {
  battery_aa:4, battery_9v:4, transformer:2,
  switch:4, fuse:4,
  resistor:4, ldr:2, diode:4, led:4, capacitor:4, transistor:2,
  bulb:4, motor:3, buzzer:3,
  multimeter:1
};

/* สลับเข้า/ออกโหมดอิสระ (ปุ่มบน header) */
function toggleSandbox(){
  if(G.sandbox) exitSandbox();
  else          enterSandbox();
}

function enterSandbox(){
  if(!specialModeReady()) return;
  G.sandbox = true;

  /* ปิดโหมดค้างต่าง ๆ + หยุดเวลาของด่านเดิม */
  clearInterval(G.timerInt);
  /* ต้องปิดโหมดวัดความเร็วด้วย ไม่งั้นสองโหมดทำงานพร้อมกัน
     รอบที่เล่นค้างอยู่จะถูกทิ้งไปเงียบ ๆ พร้อมคะแนนทั้งหมด */
  if(G.endless){
    G.endless = false; G.genLevel = null;
    document.body.classList.remove('endless-mode');
    if(typeof updateEndlessButton === 'function') updateEndlessButton();
  }
  resetPlayfield();

  G.invCounts = Object.assign({}, SANDBOX_INVENTORY);
  renderInventory();

  document.getElementById('goal-title').textContent = 'โหมดอิสระ (Sandbox)';
  document.getElementById('goal-desc').textContent =
    'ไม่มีโจทย์ ไม่มีถูก-ผิด — แถบด้านบนจะบอกตลอดว่าถ้าจ่ายไฟตอนนี้จะเกิดอะไร ' +
    'ทั้งค่าที่จะได้และอันตรายที่จะตามมา กด "ตรวจวงจร" เมื่อพร้อมจ่ายไฟจริง';
  setGoalOutcome('');   /* โหมดอิสระไม่มีเป้าหมายตายตัว */

  var t = document.getElementById('timer-display');
  t.textContent = '∞';           /* ∞ */
  t.classList.remove('warning');

  document.body.classList.add('sandbox-mode');
  updateLevelBar();                    /* อัปเดต HUD ให้เป็นโหมดอิสระ */
  updateSandboxButton();
  ensureBreadboard();
  scheduleLabPreview();
  showToast('เข้าสู่โหมดอิสระ — อุปกรณ์ทุกชนิดพร้อมใช้','success');
}

/* ออกจากโหมดอิสระ กลับไปเล่นด่านเดิม
   ธงและคลาสถูกล้างใน loadLevel() อยู่แล้ว จึงเรียกต่อได้เลย

   buildLevelBar() เรียกซ้ำได้ปลอดภัย (ลบจุดเดิมก่อนสร้างใหม่)
   ใส่ไว้กันกรณีเข้าโหมดนี้จากหน้าที่ยังไม่เคยสร้างแถบด่าน */
function exitSandbox(){
  stopCurrentFlow();
  if(G.probeMode) toggleProbeMode();
  buildLevelBar();
  loadLevel(G.level);
  showToast('กลับสู่โหมดด่าน','');
}

function updateSandboxButton(){
  var b = document.getElementById('btn-sandbox');
  if(!b) return;
  b.innerHTML = G.sandbox
    ? ICON('target',15) + ' กลับสู่ด่าน'
    : ICON('wrench',15) + ' โหมดอิสระ';
  b.classList.toggle('active', !!G.sandbox);
}

/* ============================================================
   แผงพยากรณ์ของโหมดอิสระ — "ต่อแบบนี้แล้วจะเกิดอะไร"

   โหมดนี้ไม่มีโจทย์ ไม่มีเงื่อนไขให้ผ่าน จึงไม่ควรมีอะไรมาตัดสินถูก-ผิด
   สิ่งที่ควรมีแทนคือ "โต๊ะทดลองที่พูดได้" — บอกตลอดเวลาว่าวงจรที่ต่ออยู่
   ตอนนี้จะให้ผลยังไงถ้าจ่ายไฟ รวมถึงอันตรายที่จะเกิด เช่น
   ลัดวงจร สายไฟจะไหม้ อุปกรณ์ตัวไหนจะพังและภายในกี่วินาที

   ทำได้เพราะระบบความเสียหาย (js/hazard.js) ทำนายล่วงหน้าได้อยู่แล้ว
   โดยไม่กระทบสถานะจริง — predictHazards() จำลองบนสำเนาแล้วคืนค่าเดิม
   ============================================================ */
var _labT = null;
function scheduleLabPreview(){
  if(!G.sandbox) return;
  clearTimeout(_labT);
  _labT = setTimeout(labPreview, 140);
}

/* เรียกทุกครั้งที่วงจรเปลี่ยน (ดู recolorWires ใน js/wires.js) */
function onCircuitChanged(){
  if(G.sandbox) scheduleLabPreview();
}

function labPreview(){
  if(!G.sandbox) return;
  /* กำลังจ่ายไฟจริงอยู่ ปล่อยให้แถบสถานะของระบบความเสียหายทำงานแทน */
  if(PowerSim.on) return;

  var chips = [];
  function chip(cls, txt){ chips.push('<span class="hz-chip ' + cls + '">' + txt + '</span>'); }

  if(!G.wsItems.length){ setHazardBar(''); return; }

  var an = analyzeCircuit(G.wsItems, G.wires);

  if(!an.sourceCount){
    chip('hz-info', 'ยังไม่มีแหล่งจ่ายไฟ — วางถ่านหรือแบตเตอรี่ก่อน');
    setHazardBar(chips.join('')); return;
  }

  /* วงจรยังไม่ครบวง — บอกว่าติดตรงไหน ไม่ใช่บอกว่าผิด */
  if(!hasClosedLoop(G.wsItems, G.wires)){
    if(an.floating.length){
      chip('hz-info', 'ยังไม่ได้ต่อ ' + termName(an.net, an.floating[0].el.item, an.floating[0].port) +
           (an.floating.length > 1 ? ' (และอีก ' + (an.floating.length-1) + ' ขา)' : ''));
    } else {
      chip('hz-info', 'วงจรยังไม่ครบวง — ไฟยังกลับเข้าขั้วลบไม่ได้');
    }
    setHazardBar(chips.join('')); return;
  }

  /* ครบวงแล้ว — ทำนายว่าจ่ายไฟไปจะเกิดอะไร */
  var sol  = solveCircuit(G.wsItems, G.wires, {});
  var pred = predictHazards(6);

  if(sol.ok) chip('hz-info', 'ถ้าจ่ายไฟ: กระแสรวม ' + fmtCurrent(sol.supplyI));

  if(findShortPath(G.wsItems, G.wires)){
    chip('hz-fail', 'ลัดวงจร — ไฟกลับขั้วลบโดยไม่ผ่านโหลด');
  }

  pred.incidents.forEach(function(inc){
    if(inc.id === 'circuit:short') return;           /* บอกไปแล้วข้างบน */
    var when = (inc.t > 0.05) ? (' ใน ~' + inc.t.toFixed(1) + ' วิ') : ' ทันที';
    chip('hz-fail', inc.titleTh + when);
  });
  pred.warnings.forEach(function(w){ chip('hz-hot', w.titleTh); });

  /* สรุปผลที่จะได้ — อุปกรณ์ตัวไหนทำงาน และแรงแค่ไหน */
  var lit = [];
  G.wsItems.forEach(function(it){
    var sp = ESPEC[it.deviceId];
    if(!sp || (!sp.pnom && !sp.inom) || sp.kind === 'source') return;
    var r = sol.byItem[it.id];
    if(!r) return;
    var g = deviceIntensity(r);
    if(g >= 0.05) lit.push(DEVICES[it.deviceId].name + ' ' + Math.round(g*100) + '%');
  });

  if(lit.length){
    /* มีคำเตือนอยู่ = ทำงานได้ก็จริง แต่ยังไม่เรียกว่าปลอดภัย
       ไม่งั้นจะขึ้นพร้อมกันว่า "ร้อนเกินพิกัด" กับ "ปลอดภัย" ซึ่งขัดกันเอง */
    var safe = !pred.incidents.length && !pred.warnings.length;
    chip(safe ? 'hz-safe' : 'hz-info', (safe ? 'ปลอดภัย — ' : 'จะได้ผล: ') + lit.join(' · '));
  } else if(!pred.incidents.length){
    if(hasOpenSwitch()) chip('hz-info', 'สวิตช์สับ OFF อยู่ — วงจรขาด ไฟจึงไม่ไหล');
    else                chip('hz-info', 'ไฟไหลได้ แต่ยังไม่มีอุปกรณ์ตัวไหนทำงาน');
  }

  setHazardBar(chips.slice(0, 6).join(''));
}

/* ตรวจวงจรแบบโหมดอิสระ — ไม่มีคะแนน ไม่เสียชีวิต ไม่เทียบเฉลย
   ใช้ toast แทนกล่องผลลัพธ์ จะได้ทดลองต่อได้ลื่น ๆ ไม่ต้องปิดหน้าต่าง */
function sandboxCheck(){
  if(!G.wsItems.length){
    showToast('ยังไม่มีอุปกรณ์ในพื้นที่ทำงาน','error');
    return;
  }
  clearDamage();
  var c = isClosedCircuit(G.wsItems, G.wires);

  /* โหมดอิสระไม่ตัดสินถูก-ผิด แค่ "จ่ายไฟจริงแล้วดูว่าเกิดอะไรขึ้น"
     ต่อแบบที่อันตรายก็จะได้เห็นมันพังต่อหน้าพร้อมคำอธิบาย
     ไม่มีการหักชีวิตหรือคะแนน เพราะที่นี่คือโต๊ะทดลอง */
  var fault = analyzeCircuitFaults(G.wsItems, G.wires);
  if(!fault.ok){
    playHazardSequence(fault, function(){
      showToast(fault.msg,'error');
      showIncidentModal(fault.incidents.concat(fault.warnings));
      scheduleLabPreview();
    });
    return;
  }

  if(c.ok){
    G.wsItems.forEach(function(it){ it.el.classList.add('powered'); });
    startCurrentFlow();
    if(fault.warnings.length){
      showToast(fault.warnings[0].titleTh,'error');
      showIncidentModal(fault.warnings);
    } else {
      showToast('จ่ายไฟแล้ว — ดูผลที่เกิดขึ้นได้เลย','success');
    }
  } else {
    G.wsItems.forEach(function(it){ it.el.classList.remove('powered'); });
    stopCurrentFlow();
    showToast(c.msg,'error');
  }
}
