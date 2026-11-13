/* DAMAGE — ตัวประสานเกมกับระบบความเสียหาย (hazard.js)
   หน้าที่: 1) ตรวจลัดวงจรจากโครงสร้างการต่อ  2) ทำนายล่วงหน้าว่าจะพังอะไร
   (ให้ผลตอนกด "ตรวจวงจร" แน่นอน ไม่ขึ้นกับความเร็วเครื่อง)  3) ลงมือทำให้พัง + ล้างตอนเริ่มรอบใหม่
   ตัวแบบความร้อนสะสมจริงอยู่ใน hazard.js */

/* กระแสสูงสุดที่แต่ละอุปกรณ์ทนได้อยู่ในตาราง ESPEC (devices.js) ช่อง imax — ไม่ระบุ = ไม่พังจากกระแสเกิน */

/* แรงดันแหล่งจ่ายที่สูงสุดในวงจร (โวลต์) */
function sourceVoltage(items){
  var v = 0;
  items.forEach(function(it){
    var sp = ESPEC[it.deviceId];
    if(!sp || sp.kind !== 'source') return;
    v = Math.max(v, sp.volt);
  });
  return v;
}

/* ไล่จากขั้ว + ของแหล่งจ่าย ว่ากลับถึงขั้ว − "ของก้อนเดียวกัน" ได้ไหม
   (ไล่ทีละก้อน ไม่งั้นถ่านอนุกรม บวกก้อนหนึ่งไปลบอีกก้อน จะถูกนับผิดว่าครบวง)
   ผู้เรียกกำหนด isSource(it) และ canPassThrough(it, src) */
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
    /* แหล่งจ่ายไม่มีขั้ว (หม้อแปลง) ใช้ขาซ้าย-ขวาแทน ไม่งั้นหม้อแปลงที่โดนลัดจะไม่ถูกจับ */
    if(!pos || !neg){ pos = ports[0]; neg = ports[1]; }
    if(!pos || !neg) continue;

    var seen = [pos], q = [pos];
    while(q.length){
      var p = q.shift();
      if(p === neg) return true;    /* กลับถึงขั้วลบของตัวเอง = ครบวง */

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

/* มีเส้นทางจาก + กลับ − โดยไม่ผ่านความต้านทานเลยไหม (ทะลุได้เฉพาะ ohm=0: สวิตช์/ฟิวส์/บอร์ด) */
function findShortPath(items, wires){
  function zeroOhm(it){
    var d = DEVICES[it.deviceId];
    if(d.type === 'source') return false;   /* ไม่ทะลุแหล่งจ่าย */
    if(it.deviceId === 'switch' && it.open)  return false;  /* สับเปิด ไฟไม่ผ่าน */
    if(it.deviceId === 'fuse'   && it.blown) return false;  /* ขาดแล้ว ไฟไม่ผ่าน */
    return !d.ohm;                          /* 0 หรือไม่ระบุ */
  }
  return sourceLoopExists(items, wires,
    function(it){ return DEVICES[it.deviceId].type === 'source'; },
    zeroOhm);
}

/* มีวงจรปิดทางกายภาพไหม — เหมือน findShortPath แต่ทะลุได้ทุกชนิด
   ต่างจาก isClosedCircuit ตรงไม่สนกฎการต่อของเกม (วงจรกลับขั้วอันตรายจริง ต้องรายงานไม่ใช่ปัดตก) */
function hasClosedLoop(items, wires){
  return sourceLoopExists(items, wires,
    function(it){ return !!ESPEC[it.deviceId] && ESPEC[it.deviceId].kind === 'source'; },
    function(it, src){ return it !== src; });
}

/* เหตุการณ์ลัดวงจร — ต้นเหตุที่ทำให้ทุกอย่างหลังจากนี้พัง (เป็น "วิธีต่อ" ไม่ใช่ผลของความร้อน) */
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

/* วิเคราะห์ความเสียหาย → { ok, msg, incidents, warnings, current }
   วิธีคิด: จำลองจ่ายไฟล่วงหน้า 6 วิ ด้วยตัวแบบความร้อนสะสม แล้วดูว่าเกิดอะไรตามลำดับเวลา
   (ทำบนสถานะจำลอง ไม่กระทบของจริง — ดู predictHazards ใน hazard.js) */
function analyzeCircuitFaults(items, wires){
  var res = { ok:true, msg:'', incidents:[], warnings:[], current:0 };
  if(!items.length || !wires.length) return res;
  if(!sourceVoltage(items)) return res;

  /* ไฟไหลได้ต้องครบวงก่อน (ใช้เกณฑ์กายภาพล้วน ไม่เอากฎการตรวจของเกมมาปน) */
  if(!hasClosedLoop(items, wires)) return res;

  var sol = solveCircuit(items, wires, {});
  if(!sol.ok) return res;
  res.current = sol.supplyI * 1000;      /* มิลลิแอมป์ */

  var pred = predictHazards(6);
  res.incidents = pred.incidents;
  res.warnings  = pred.warnings;

  /* ลัดวงจรเป็นต้นเหตุ ใส่บนสุดของรายงานเสมอ */
  if(findShortPath(items, wires) && res.incidents.length){
    res.incidents.unshift(shortCircuitIncident(sol));
  }

  if(res.incidents.length){
    res.ok = false;
    res.msg = incidentSummary(res.incidents);
  }
  return res;
}

/* ล้างความเสียหาย */
function clearDamage(){
  resetHazards();
}

/* ลงมือทำให้พัง — เฉพาะตัวที่ผู้เล่นไม่ได้ช่วยไว้ทัน
   (เดิมพังทุกตัวตามที่ทำนายไว้ แม้ผู้เล่นสับสวิตช์ตัดไฟทัน สวิตช์เลยไร้ความหมาย
    ตรงนี้เชื่อ "ผลจำลองสด" ไม่ใช่คำทำนายที่คิดไว้ก่อนฉากเริ่ม) */
function applyDamage(fault){
  var all   = fault.incidents || [];
  var keep  = [], saved = [];

  all.forEach(function(inc){
    var ids = inc.targets || [];

    /* เหตุการณ์ระดับวงจร (สายไฟไหม้/ลัดวงจร) ไม่มีเป้าหมายเป็นชิ้น ตัดสินจากความร้อนสายที่สะสมจริง */
    if(!ids.length){
      if(inc.wires){
        if(HAZARD.wiresBurned || HAZARD.wireHeat > 0.5) keep.push(inc);
        else saved.push('สายไฟ');
      } else {
        keep.push(inc);      /* เช่นรายงานลัดวงจร ไม่ได้ทำอะไรพัง เก็บไว้อ่าน */
      }
      return;
    }

    /* เก็บเหตุการณ์ไว้ถ้ามีเป้าหมาย "สมควรพังจริง" อย่างน้อยตัวเดียว
       (พังไปแล้ว / ยังโดนโหลดเกินอยู่) ถ้าทุกตัวเย็นลงและไม่เกินแล้ว = ตัดไฟทัน ต้องรอด */
    var doomed = false;
    ids.forEach(function(id){
      var it = null;
      G.wsItems.forEach(function(x){ if(x.id === id) it = x; });
      if(!it) return;
      if(it.failed || (it.stress || 0) > 1) doomed = true;
      else saved.push(DEVICES[it.deviceId].name);
    });
    if(doomed) keep.push(inc);
  });

  commitHazards(keep);

  /* ตัดไฟทิ้งเฉพาะตอนมีอะไรพังจริง — ถ้าไม่พัง (ตัดไฟทัน) ปล่อยให้จ่ายไฟต่อ จะได้สับสวิตช์กลับมาทดลองต่อได้เลย */
  if(keep.length){
    G.wsItems.forEach(function(it){ if(it.el) it.el.classList.remove('powered','lit'); });
    stopCurrentFlow();
  }
  applyHazardVisuals();

  /* บอกว่าการตัดไฟได้ผล ไม่งั้นผู้เล่นไม่รู้ว่าช่วยไว้ได้ */
  if(saved.length && keep.length < all.length){
    var uniq = saved.filter(function(n, i){ return saved.indexOf(n) === i; });
    showToast('ตัดไฟทัน! ' + uniq.join(' · ') + ' รอดมาได้', 'success');
  }
  return { committed: keep.length, saved: saved.length };
}
