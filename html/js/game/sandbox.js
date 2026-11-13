/* SANDBOX — โหมดอิสระ ต่อวงจรได้เต็มที่
   ต่างจากโหมดด่าน: อุปกรณ์ครบจำนวนเยอะ · ไม่จับเวลา ไม่เสียชีวิต ไม่มีเฉลย · กดตรวจ = บอกแค่วงจรปิดครบไหมแล้วเปิดไฟ · ไม่บันทึกทับความคืบหน้าจริง
   เข้าได้จากปุ่มบน header หน้าเกมเท่านั้น (ไม่ใส่ทางลัดหน้าแบบทดสอบ กันข้ามข้อสอบก่อนเรียน) */

/* คลังโหมดอิสระ — เยอะพอทดลองวงจรผสม (ไม่ใส่ wire เพราะใช้ลากเอา) */
var SANDBOX_INVENTORY = {
  battery_aa:4, battery_9v:4, transformer:2,
  switch:4, fuse:4,
  resistor:4, ldr:2, diode:4, led:4, capacitor:4, transistor:2,
  bulb:4, motor:3, buzzer:3
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
  /* ปิดโหมดวัดความเร็วด้วย ไม่งั้นสองโหมดทำงานพร้อมกัน รอบที่ค้างจะถูกทิ้งพร้อมคะแนน */
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
    'ทั้งค่าที่จะได้และอันตรายที่จะตามมา กด "ตรวจวงจร" เมื่อพร้อมจ่ายไฟจริง · ' +
    'แตะป้ายค่าโอห์มมุมซ้ายบนของตัวต้านทานเพื่อเปลี่ยนค่า · ' +
    'ปุ่ม ⧉ บนตัวอุปกรณ์ (หรือ Ctrl+C/Ctrl+V) คัดลอกของซ้ำ ๆ ได้';
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

/* ออกจากโหมดอิสระ กลับไปด่านเดิม (ธง/คลาสถูกล้างใน loadLevel อยู่แล้ว · buildLevelBar เรียกซ้ำปลอดภัย เผื่อเข้ามาจากหน้าที่ยังไม่เคยสร้างแถบด่าน) */
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
  /* เปลี่ยนโหมด = เปลี่ยนเพลง แต่หน้าจอไม่เปลี่ยน ฮุกใน showScreen เลยไม่ทำงาน ฝากไว้ที่นี่เพราะทุกทางเข้า-ออกโหมดผ่านแน่นอน */
  if(typeof bgmRefresh === 'function') bgmRefresh();
}

/* แผงพยากรณ์ของโหมดอิสระ — "ต่อแบบนี้แล้วจะเกิดอะไร"
   โหมดนี้ไม่มีโจทย์ เลยเป็น "โต๊ะทดลองที่พูดได้" บอกตลอดว่าถ้าจ่ายไฟตอนนี้จะได้ผลยังไง + อันตรายที่จะเกิด (ลัด/สายไหม้/ตัวไหนพังในกี่วิ)
   ทำได้เพราะ hazard.js ทำนายล่วงหน้าได้โดยไม่กระทบสถานะจริง (predictHazards จำลองบนสำเนาแล้วคืนค่าเดิม) */
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

  /* วงจรยังไม่ครบวง — บอกว่าติดตรงไหน ไม่ใช่บอกว่าผิด + ทำเครื่องหมายบนขา/อุปกรณ์ที่เป็นปัญหาเลย (วงจรใหญ่เป็นร้อยขา ข้อความอย่างเดียวหาไม่เจอ) */
  if(!hasClosedLoop(G.wsItems, G.wires)){
    var m = markCircuitProblems(an);
    if(m.floating){
      var f0 = an.floating[0];
      chip('hz-info', 'ยังมีขาที่ไม่ถึงใคร ' + m.floating + ' ขา (กะพริบสีส้ม) — เช่น ' +
           termName(an.net, f0.el.item, f0.port) +
           (typeof bbPinDiagnosis === 'function' ? bbPinDiagnosis(f0.port) : ''));
    } else if(m.islands){
      chip('hz-info', 'มีอุปกรณ์ที่ยังไม่เชื่อมเข้าวงจร ' + m.islands +
           ' ชิ้น (ขอบกะพริบสีส้ม) — เช่น ' + DEVICES[an.islands[0].deviceId].name);
    } else {
      chip('hz-info', 'วงจรยังไม่ครบวง — ไฟยังกลับเข้าขั้วลบไม่ได้');
    }
    setHazardBar(chips.join('')); return;
  }

  /* ครบวงแล้ว เครื่องหมายเตือนเก่าต้องหาย ยกเว้นตัวที่ถูกต่อคร่อมขา (คนละเรื่องกับวงจรไม่ครบ ยังผิดอยู่) */
  clearCircuitProblems();
  if(an.shorted.length){
    markCircuitProblems({floating:[], islands:[], shorted:an.shorted});
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
    /* มีคำเตือน = ทำงานได้แต่ยังไม่เรียกว่าปลอดภัย (ไม่งั้นขึ้นพร้อมกันว่า "ร้อนเกินพิกัด" กับ "ปลอดภัย" ขัดกันเอง) */
    var safe = !pred.incidents.length && !pred.warnings.length;
    chip(safe ? 'hz-safe' : 'hz-info', (safe ? 'ปลอดภัย — ' : 'จะได้ผล: ') + lit.join(' · '));
  } else if(!pred.incidents.length){
    if(hasOpenSwitch()) chip('hz-info', 'สวิตช์สับ OFF อยู่ — วงจรขาด ไฟจึงไม่ไหล');
    else                chip('hz-info', 'ไฟไหลได้ แต่ยังไม่มีอุปกรณ์ตัวไหนทำงาน');
  }

  setHazardBar(chips.slice(0, 6).join(''));
}

/* ตรวจวงจรโหมดอิสระ — ไม่มีคะแนน/ชีวิต/เทียบเฉลย ใช้ toast แทนกล่องผลลัพธ์ จะได้ทดลองต่อลื่นๆ */
function sandboxCheck(){
  if(!G.wsItems.length){
    showToast('ยังไม่มีอุปกรณ์ในพื้นที่ทำงาน','error');
    return;
  }
  clearDamage();
  var c = isClosedCircuit(G.wsItems, G.wires);

  /* โหมดอิสระไม่ตัดสินถูก-ผิด แค่จ่ายไฟจริงแล้วดูว่าเกิดอะไร (ต่อแบบอันตรายก็เห็นมันพังพร้อมคำอธิบาย ไม่หักชีวิต/คะแนน) */
  var fault = analyzeCircuitFaults(G.wsItems, G.wires);
  if(!fault.ok){
    playHazardSequence(fault, function(){
      /* รายงานสิ่งที่เกิดจริง ไม่ใช่คำทำนาย (ผู้เล่นอาจสับสวิตช์ตัดไฟทันระหว่างฉาก อุปกรณ์รอด)
         HAZARD.incidents คือรายการที่ applyDamage กรองแล้ว · ใช้ fault.incidents ตรงๆ กล่องจะบอกว่าหลอดไหม้ทั้งที่ยังดีอยู่ */
      var real = (HAZARD.incidents || []).concat(fault.warnings || []);
      if(real.length){
        showToast((HAZARD.incidents[0] || fault.warnings[0]).titleTh, 'error');
        showIncidentModal(real);
      } else {
        showToast('ตัดไฟทันก่อนอะไรจะพัง — ลองปรับวงจรแล้วจ่ายไฟใหม่ได้เลย','success');
      }
      scheduleLabPreview();
    });
    return;
  }

  if(c.ok){
    clearCircuitProblems();   /* ครบวงแล้ว เครื่องหมายเตือนต้องหาย */
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
    /* ชี้จุดที่ติดบนจอด้วย ไม่ใช่บอกแต่ข้อความ (วงจรใหญ่อ่านชื่อขาแล้วหาไม่เจอว่าขาไหนในเกือบร้อยขา) */
    markCircuitProblems(analyzeCircuit(G.wsItems, G.wires));
    showToast(c.msg,'error');
  }
}
