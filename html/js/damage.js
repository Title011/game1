/* ============================================================
   DAMAGE — ตัวประสานระหว่างเกมกับระบบความเสียหาย (js/hazard.js)

   หน้าที่ของไฟล์นี้เหลือ 3 อย่าง:
     1) ตรวจ "ลัดวงจร" จากโครงสร้างการต่อ (เป็นต้นเหตุ ไม่ใช่ผลลัพธ์)
     2) ทำนายล่วงหน้าว่าถ้าจ่ายไฟต่อไปจะพังอะไรบ้าง เพื่อให้ผลตอนกด
        "ตรวจวงจร" แน่นอน ไม่ขึ้นกับความเร็วเครื่องของผู้เล่น
     3) ลงมือทำให้พังจริง + ล้างความเสียหายเมื่อเริ่มรอบใหม่

   ตัวแบบจริง ๆ ทั้งหมดอยู่ใน js/hazard.js ซึ่งจำลองความร้อนสะสม
   ตามเวลา แล้วบันทึกเหตุการณ์ไว้ครบว่า ต่อแบบนี้ → พังตรงไหน →
   อันตรายยังไง → ป้องกันยังไง
   ============================================================ */

/* กระแสสูงสุดที่อุปกรณ์แต่ละชนิดทนได้ อยู่ในตาราง ESPEC (js/devices.js)
   ช่อง imax — ไม่ระบุ = ไม่พังจากกระแสเกิน (สวิตช์ บอร์ด ฯลฯ) */

/* แรงดันของแหล่งจ่ายที่สูงที่สุดในวงจร (โวลต์) */
function sourceVoltage(items){
  var v = 0;
  items.forEach(function(it){
    var sp = ESPEC[it.deviceId];
    if(!sp || sp.kind !== 'source') return;
    v = Math.max(v, sp.volt);
  });
  return v;
}

/* ไล่จากขั้วบวกของแหล่งจ่าย ว่ากลับถึงขั้วลบ "ของก้อนเดียวกัน" ได้ไหม

   ไล่ทีละแหล่งจ่ายโดยตั้งใจ ถ้าไล่รวมทุกก้อน การต่อถ่านอนุกรม
   (บวกก้อนหนึ่งไปลบอีกก้อน) จะถูกนับผิดว่าครบวงทั้งที่เป็นการต่อปกติ

   ผู้เรียกกำหนดสองอย่าง:
     isSource(it)            — นับอุปกรณ์ตัวนี้เป็นแหล่งจ่ายไหม
     canPassThrough(it, src) — ไฟทะลุอุปกรณ์ตัวนี้ไปออกขาอื่นได้ไหม */
function sourceLoopExists(items, wires, isSource, canPassThrough){
  function itemOf(id){
    for(var i=0;i<items.length;i++) if(items[i].id===id) return items[i];
    return null;
  }
  function wiresAt(p){
    var o=[]; wires.forEach(function(w){ if(w.fromPort===p||w.toPort===p) o.push(w); }); return o;
  }

  for(var s=0;s<items.length;s++){
    var src = items[s];
    if(!src.el || !isSource(src)) continue;
    var ports = src.el.querySelectorAll('.port');
    var pos = null, neg = null;
    for(var i=0;i<ports.length;i++){
      if(ports[i].dataset.polarity === '+')      pos = ports[i];
      else if(ports[i].dataset.polarity === '-') neg = ports[i];
    }
    /* แหล่งจ่ายไม่มีขั้ว (หม้อแปลง) ใช้ขาซ้าย-ขวาแทน
       เหมือนที่ shortCircuitIncident() ทำอยู่แล้ว ถ้าข้ามไป
       หม้อแปลงที่ถูกลัดวงจรจะไม่เคยถูกจับได้ */
    if(!pos || !neg){ pos = ports[0]; neg = ports[1]; }
    if(!pos || !neg) continue;

    var seen = [pos], q = [pos];
    while(q.length){
      var p = q.shift();
      if(p === neg) return true;    /* กลับถึงขั้วลบของตัวเองแล้ว = ครบวง */

      wiresAt(p).forEach(function(w){
        var nx = (w.fromPort===p) ? w.toPort : w.fromPort;
        if(seen.indexOf(nx) < 0){ seen.push(nx); q.push(nx); }
      });
      var it = itemOf(p.dataset.itemId);
      if(it && it.el && canPassThrough(it, src)){
        var ps = it.el.querySelectorAll('.port');
        for(var k=0;k<ps.length;k++){
          if(ps[k]!==p && seen.indexOf(ps[k])<0){ seen.push(ps[k]); q.push(ps[k]); }
        }
      }
    }
  }
  return false;
}

/* มีเส้นทางจากขั้ว + กลับถึงขั้ว − โดยไม่ผ่านความต้านทานเลยไหม
   ทะลุได้เฉพาะอุปกรณ์ที่ ohm = 0 (สวิตช์/ฟิวส์/บอร์ด)
   ถ้าเจอโหลด (มี ohm) จะหยุด ไม่นับเป็นลัดวงจร */
function findShortPath(items, wires){
  function zeroOhm(it){
    var d = DEVICES[it.deviceId];
    if(d.type === 'source') return false;   /* ไม่ทะลุแหล่งจ่าย */
    if(it.deviceId === 'switch' && it.open)  return false;  /* สับเปิดอยู่ ไฟไม่ผ่าน */
    if(it.deviceId === 'fuse'   && it.blown) return false;  /* ขาดแล้ว ไฟไม่ผ่าน */
    return !d.ohm;                          /* 0 หรือไม่ได้ระบุ */
  }
  return sourceLoopExists(items, wires,
    function(it){ return DEVICES[it.deviceId].type === 'source'; },
    zeroOhm);
}

/* มีวงจรปิดทางกายภาพไหม — เหมือน findShortPath() แต่ทะลุอุปกรณ์ได้ทุกชนิด

   ต่างจาก isClosedCircuit() ตรงที่ "ไม่สนกฎการต่อของเกม" เลย
   สำคัญมาก เพราะการต่อกลับขั้วเป็นการต่อที่อันตรายจริง ต้องรายงานอันตราย
   ไม่ใช่แค่ตอบว่าผิดแล้วจบ — ถ้าใช้ isClosedCircuit() มากรอง วงจรกลับขั้ว
   จะถูกปัดตกก่อนที่ระบบอันตรายจะได้ทำงาน */
function hasClosedLoop(items, wires){
  return sourceLoopExists(items, wires,
    function(it){ return !!ESPEC[it.deviceId] && ESPEC[it.deviceId].kind === 'source'; },
    function(it, src){ return it !== src; });
}

/* เหตุการณ์ "ลัดวงจร" — ต้นเหตุที่ทำให้ทุกอย่างหลังจากนี้พัง
   แยกออกมาเพราะมันคือ "วิธีต่อ" ไม่ใช่ผลของความร้อน */
function shortCircuitIncident(sol){
  var hasFuse = false;
  G.wsItems.forEach(function(x){ if(x.deviceId === 'fuse') hasFuse = true; });
  return {
    id:'circuit:short', sev:'critical',
    titleTh:'ลัดวงจร — ไฟวิ่งกลับขั้วโดยไม่ผ่านอุปกรณ์ใช้ไฟ',
    device:'ทั้งวงจร', targets:[],
    causeTh:'มีเส้นทางจากขั้วบวกกลับถึงขั้วลบโดยไม่มีโหลดหรือตัวต้านทานคั่นอยู่เลย',
    mechTh:'กระแสไหลไปทางที่ต้านทานน้อยที่สุดเสมอ เมื่อไม่มีโหลดมาจำกัด เหลือแค่ความต้านทานภายในของแหล่งจ่ายกับสายไฟซึ่งต่ำมาก กระแสจึงพุ่งขึ้นเป็นหลายแอมป์ตามกฎของโอห์ม I = V ÷ R',
    dangerTh:'พลังงานทั้งหมดกลายเป็นความร้อนที่ตัวถ่านและสายไฟภายในไม่กี่วินาที ของจริงจะเห็นสายร้อนจนจับไม่ได้ มีควัน และเกิดประกายไฟตรงจุดที่สัมผัส เป็นสาเหตุไฟไหม้ที่พบบ่อยที่สุดในงานไฟฟ้า',
    preventTh:'ทุกเส้นทางจากขั้วบวกกลับขั้วลบต้องผ่านอุปกรณ์ใช้ไฟหรือตัวต้านทานเสมอ' +
              (hasFuse ? ' วงจรนี้มีฟิวส์อยู่แล้ว ซึ่งช่วยตัดไฟได้ทัน' : ' และควรใส่ฟิวส์ไว้ใกล้แหล่งจ่ายที่สุด'),
    measuredTh:'กระแสรวม ' + fmtCurrent(sol.supplyI) + ' (วงจรปกติควรอยู่ระดับมิลลิแอมป์)',
    brokeTh:'ยังไม่มีอะไรพังในทันที แต่ความร้อนกำลังสะสมทุกจุดที่กระแสไหลผ่าน',
    cascadeTh:'', t:0
  };
}

/* ============================================================
   วิเคราะห์ความเสียหาย — คืน
     { ok, msg, incidents:[เหตุการณ์], warnings:[คำเตือน], current }

   วิธีคิด: จำลองการจ่ายไฟล่วงหน้า 6 วินาที ด้วยตัวแบบความร้อนสะสม
   แล้วดูว่าเกิดอะไรขึ้นบ้าง ตามลำดับเวลาจริง
   (ทำบนสถานะจำลอง ไม่กระทบของจริง — ดู predictHazards ใน js/hazard.js)
   ============================================================ */
function analyzeCircuitFaults(items, wires){
  var res = { ok:true, msg:'', incidents:[], warnings:[], current:0 };
  if(!items.length || !wires.length) return res;
  if(!sourceVoltage(items)) return res;

  /* ไฟจะไหลได้ต้องครบวงก่อน — วงจรที่ยังต่อไม่ครบไม่มีอันตราย
     ใช้เกณฑ์ทางกายภาพล้วน ๆ ไม่เอากฎการตรวจของเกมมาปน */
  if(!hasClosedLoop(items, wires)) return res;

  var sol = solveCircuit(items, wires, {});
  if(!sol.ok) return res;
  res.current = sol.supplyI * 1000;      /* มิลลิแอมป์ */

  var pred = predictHazards(6);
  res.incidents = pred.incidents;
  res.warnings  = pred.warnings;

  /* ลัดวงจรเป็นต้นเหตุ ใส่ไว้บนสุดของรายงานเสมอ */
  if(findShortPath(items, wires) && res.incidents.length){
    res.incidents.unshift(shortCircuitIncident(sol));
  }

  if(res.incidents.length){
    res.ok = false;
    res.msg = incidentSummary(res.incidents);
  }
  return res;
}

/* ============================================================
   ล้าง / ลงมือทำให้พัง
   ============================================================ */
function clearDamage(){
  resetHazards();
}

function applyDamage(fault){
  commitHazards(fault.incidents || []);
  /* วงจรพังแล้วไม่มีอะไรทำงานต่อ */
  G.wsItems.forEach(function(it){ if(it.el) it.el.classList.remove('powered','lit'); });
  stopCurrentFlow();
  applyHazardVisuals();
}
