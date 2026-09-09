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
  breadboard:2, multimeter:1
};

/* สลับเข้า/ออกโหมดอิสระ (ปุ่มบน header) */
function toggleSandbox(){
  if(G.sandbox) exitSandbox();
  else          enterSandbox();
}

function enterSandbox(){
  /* ด่านสุดท้ายคือเงื่อนไขปลดล็อก — กันไว้เผื่อเรียกฟังก์ชันตรง ๆ */
  if(!G.modesUnlocked){
    showToast('ปลดล็อกโหมดนี้ได้หลังเล่นครบทุกด่าน','error');
    return;
  }
  showScreen('screen-game');
  G.sandbox = true;

  /* ปิดโหมดค้างต่าง ๆ + หยุดเวลาของด่านเดิม */
  clearInterval(G.timerInt);
  cancelTapConnect();
  if(G.probeMode) toggleProbeMode();
  stopCurrentFlow();
  deselectAll();
  clearWorkspace(true);

  G.invCounts = Object.assign({}, SANDBOX_INVENTORY);
  renderInventory();

  document.getElementById('goal-title').textContent = 'โหมดอิสระ (Sandbox)';
  document.getElementById('goal-desc').textContent =
    'ทดลองต่อวงจรได้ตามใจ ไม่จำกัดเวลา ไม่เสียชีวิต — กด "ตรวจวงจร" เพื่อดูว่าวงจรปิดครบหรือยัง';

  var t = document.getElementById('timer-display');
  t.textContent = '∞';           /* ∞ */
  t.classList.remove('warning');

  document.body.classList.add('sandbox-mode');
  updateLevelBar();                    /* อัปเดต HUD ให้เป็นโหมดอิสระ */
  updateSandboxButton();
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

/* ตรวจวงจรแบบโหมดอิสระ — ไม่มีคะแนน ไม่เสียชีวิต ไม่เทียบเฉลย
   ใช้ toast แทนกล่องผลลัพธ์ จะได้ทดลองต่อได้ลื่น ๆ ไม่ต้องปิดหน้าต่าง */
function sandboxCheck(){
  if(!G.wsItems.length){
    showToast('ยังไม่มีอุปกรณ์ในพื้นที่ทำงาน','error');
    return;
  }
  clearDamage();
  var c = isClosedCircuit(G.wsItems, G.wires);

  /* โหมดอิสระก็มีผลจากการต่อผิดเหมือนกัน — ทดลองแล้วต้องเห็นผลจริง */
  var fault = analyzeCircuitFaults(G.wsItems, G.wires);
  if(!fault.ok){
    applyDamage(fault);
    showToast(fault.msg,'error');
    return;
  }

  if(c.ok){
    G.wsItems.forEach(function(it){ it.el.classList.add('powered'); });
    startCurrentFlow();
    showToast('วงจรปิดสมบูรณ์! อุปกรณ์ทำงานแล้ว','success');
  } else {
    G.wsItems.forEach(function(it){ it.el.classList.remove('powered'); });
    stopCurrentFlow();
    showToast(c.msg,'error');
  }
}
