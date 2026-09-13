/* ============================================================
   OUTCOME — ตรวจ "ผลที่ออกมา" ไม่ใช่ "วิธีที่ต่อ"

   เดิมเกมตัดสินโดยเทียบกับเฉลยว่าต่อเหมือนกันไหม ซึ่งกลับหัวกลับหางกับ
   งานช่างจริง — ช่างไม่สนว่าเดินสายทางไหน สนว่า "มันทำงานได้ตามที่ต้องการ
   หรือเปล่า" ไฟล์นี้เปลี่ยนการตัดสินให้เป็นแบบนั้น

   วิธีตรวจ: จ่ายไฟจำลองด้วยตัวแก้สมการจริง (js/solver.js) แล้ววัดผลออกมา
   ทีละข้อตามที่ด่านกำหนดไว้ในช่อง require เช่น

       หลอดไฟติดจริงไหม          → วัดกำลังไฟที่หลอดได้รับ
       หรี่ลงจากเดิมจริงไหม       → ความสว่างต้องต่ำกว่าเพดาน
       สับสวิตช์ OFF แล้วดับไหม   → สับสวิตช์จำลองแล้ววัดซ้ำ
       ปิดสาขาหนึ่งอีกสาขายังติดไหม → ทดสอบความเป็นอิสระของแต่ละสาขา
       ฟิวส์คุมทั้งวงจรจริงไหม    → ถอดฟิวส์จำลองแล้วดูว่าไฟดับหมดไหม
       หน่วงเวลาได้จริงไหม        → จำลองตามเวลา ดูว่ากระแสลดลงจนหยุด

   ผลที่ได้เป็น "รายการตรวจ" ทีละข้อ ผู้เรียนจึงเห็นชัดว่าข้อไหนผ่านแล้ว
   และข้อไหนยังไม่ได้ แทนที่จะได้แค่คำว่าถูกหรือผิด

   ── ผลข้างเคียงที่ตั้งใจ ──
   ต่อแบบไหนก็ได้ที่ให้ผลตามต้องการ = ผ่านหมด ลำดับการต่อไม่ถูกบังคับอีก
   ตราบใดที่ยังใช้อุปกรณ์ครบและปลอดภัย
   ============================================================ */

/* เกณฑ์ว่า "ทำงานอยู่จริง" — ต่ำกว่านี้ถือว่ายังไม่ติด/ไม่หมุน/ไม่ดัง */
var WORK_MIN = 0.12;

/* คำกริยาประจำอุปกรณ์ ใช้ประกอบข้อความให้อ่านเป็นภาษาคน */
var WORK_VERB = {
  bulb:'ติดสว่าง', led:'ติด', motor:'หมุน', buzzer:'ดัง', diode:'นำกระแส'
};
function workVerb(id){ return WORK_VERB[id] || 'ทำงาน'; }

/* ============================================================
   จำลองวงจร ณ เวลาที่กำหนด (วินาที)
   วงจรที่ไม่มีตัวเก็บประจุ ผลจะเท่ากับสภาวะคงตัวอยู่แล้ว
   ส่วนวงจร RC ต้องดูตอนเพิ่งจ่ายไฟ ไม่ใช่ตอนประจุเต็มแล้ว
   ============================================================ */
function simAt(items, wires, t){
  var dt = 0.05, capV = {}, sol = null;
  var n = Math.max(1, Math.round((t || 0.15) / dt));
  for(var i=0;i<n;i++){
    sol = solveCircuit(items, wires, {dt:dt, capV:capV});
    if(!sol || !sol.ok) return sol;
    capV = sol.capV;
  }
  return sol;
}

/* ความ "ทำงาน" ของอุปกรณ์หนึ่งตัว 0..1 */
function workOf(item, sol){
  if(!sol || !sol.ok) return 0;
  var r = sol.byItem[item.id];
  return r ? deviceIntensity(r) : 0;
}

/* สลับสถานะชั่วคราวแล้วคืนค่าเดิมเสมอ (ใช้ทดสอบสวิตช์/ฟิวส์) */
function withTemp(item, field, value, fn){
  var old = item[field];
  item[field] = value;
  var out;
  try { out = fn(); } finally { item[field] = old; }
  return out;
}

function itemsOfType(items, deviceId){
  return items.filter(function(it){ return it.deviceId === deviceId; });
}

/* ============================================================
   ตรวจผลลัพธ์ทั้งหมดตามที่ด่านกำหนด
   คืน { ok, msg, checks:[{label, ok, detail}] }
   ============================================================ */
function checkOutcome(items, wires, req, inventory){
  req = req || {};
  var checks = [];
  function add(label, ok, detail){ checks.push({ label:label, ok:!!ok, detail:detail || '' }); }
  function result(){
    var bad = null;
    for(var i=0;i<checks.length;i++) if(!checks[i].ok){ bad = checks[i]; break; }
    return {
      ok: !bad,
      msg: bad ? (bad.label + (bad.detail ? ' — ' + bad.detail : '')) : '',
      checks: checks
    };
  }

  /* ---------- 1) ใช้อุปกรณ์ครบตามที่ให้มา ---------- */
  if(inventory){
    var missing = [], extra = [];
    for(var d in inventory){
      var have = itemsOfType(items, d).length;
      if(have < inventory[d]) missing.push(DEVICES[d].name + ' (ขาด ' + (inventory[d]-have) + ')');
    }
    items.forEach(function(it){
      if(!inventory[it.deviceId]) extra.push(DEVICES[it.deviceId].name);
    });
    add('ใช้อุปกรณ์ที่ให้มาครบทุกชิ้น', !missing.length && !extra.length,
        missing.length ? ('ยังไม่ได้วาง ' + missing.join(', '))
                       : (extra.length ? ('มีของที่ด่านนี้ไม่ได้ให้มา: ' + extra.join(', ')) : ''));
    if(missing.length || extra.length) return result();
  }

  /* ---------- 2) โครงสร้างต้องใช้งานได้ ---------- */
  var an = analyzeCircuit(items, wires);
  var structOk = an.sourceCount && an.branches && !an.floating.length &&
                 !an.shorted.length && !an.islands.length;
  var structWhy = '';
  if(!an.sourceCount)            structWhy = 'ยังไม่มีแหล่งจ่ายไฟในวงจร';
  else if(an.floating.length)    structWhy = termName(an.net, an.floating[0].el.item, an.floating[0].port) + ' ยังลอยอยู่';
  else if(an.shorted.length)     structWhy = DEVICES[an.shorted[0].deviceId].name + ' ถูกต่อสายคร่อมขาทั้งสองข้าง ไฟจึงลัดผ่านไปหมด';
  else if(an.islands.length)     structWhy = DEVICES[an.islands[0].deviceId].name + ' ยังไม่ได้เชื่อมเข้าวงจร';
  else if(!an.branches)          structWhy = 'ไฟออกจากขั้วบวกแล้วยังกลับเข้าขั้วลบไม่ได้';
  add('วงจรครบวง ไฟเดินได้', structOk, structWhy);
  if(!structOk) return result();

  /* ---------- 3) รูปแบบวงจรตามที่โจทย์กำหนด ---------- */
  if(req.topology === 'series'){
    add('ไฟเดินทางเดียว (วงจรอนุกรม)', an.branches === 1,
        an.branches > 1 ? ('ตอนนี้ไฟแยกได้ ' + an.branches + ' ทาง') : '');
  } else if(req.topology === 'parallel'){
    var wantB = req.branches || 2;
    add('แยก ' + wantB + ' สาขาขนาน', an.branches === wantB,
        an.branches !== wantB ? ('ตอนนี้ไฟเดินได้ ' + an.branches + ' ทาง') : '');
  }
  if(!result().ok) return result();

  /* ---------- 4) จ่ายไฟจริงแล้ววัดผล ---------- */
  var sol = simAt(items, wires, 0.15);
  if(!sol || !sol.ok){ add('จ่ายไฟแล้ววงจรทำงาน', false, 'คำนวณวงจรนี้ไม่ได้'); return result(); }

  /* อุปกรณ์เป้าหมายต้องทำงานจริงทุกตัว */
  var minW = (req.minWork !== undefined) ? req.minWork : WORK_MIN;
  (req.work || []).forEach(function(devId){
    var list = itemsOfType(items, devId);
    var worst = 1, worstPct = 100;
    list.forEach(function(it){
      var w = workOf(it, sol);
      if(w < worst){ worst = w; worstPct = Math.round(w*100); }
    });
    if(!list.length) worst = 0;
    add(DEVICES[devId].name + workVerb(devId) + (list.length > 1 ? ' ครบทุกตัว' : ''),
        worst >= minW,
        worst < minW ? ('ตอนนี้ได้แค่ ' + worstPct + '% ของพิกัด — ยังไม่มีกระแสพอ') : '');
  });

  /* เพดานความสว่าง — ใช้พิสูจน์ว่าตัวจำกัดกระแสทำงานจริง */
  if(req.maxWork !== undefined){
    (req.work || []).forEach(function(devId){
      var top = 0;
      itemsOfType(items, devId).forEach(function(it){ top = Math.max(top, workOf(it, sol)); });
      add(DEVICES[devId].name + 'หรี่ลงจากเต็มพิกัด', top <= req.maxWork,
          top > req.maxWork ? ('ยังสว่าง ' + Math.round(top*100) + '% — ตัวจำกัดกระแสยังไม่ได้ทำหน้าที่') : '');
    });
  }

  /* กระแสต้องไม่เกินพิกัดที่กำหนด */
  if(req.currentBelow){
    for(var cd in req.currentBelow){
      var lim = req.currentBelow[cd], worstI = 0;
      itemsOfType(items, cd).forEach(function(it){
        var r = sol.byItem[it.id];
        if(r) worstI = Math.max(worstI, Math.abs(r.I));
      });
      add('กระแสผ่าน ' + DEVICES[cd].name + ' ไม่เกินพิกัด', worstI <= lim,
          worstI > lim ? ('วัดได้ ' + fmtCurrent(worstI) + ' · พิกัด ' + fmtCurrent(lim)) : '');
    }
  }

  /* อุปกรณ์ที่ต้อง "มีกระแสไหลผ่านจริง" (ไม่ใช่วางไว้เฉย ๆ) */
  (req.conducting || []).forEach(function(cd){
    var best = 0;
    itemsOfType(items, cd).forEach(function(it){
      var r = sol.byItem[it.id];
      if(r) best = Math.max(best, Math.abs(r.I));
    });
    add(DEVICES[cd].name + 'อยู่ในทางเดินของไฟจริง', best > 1e-5,
        best <= 1e-5 ? 'ไม่มีกระแสไหลผ่านตัวมันเลย' : '');
  });

  /* ทุกชิ้นที่วางต้องถูกใช้งานจริง */
  if(req.useAll !== false){
    var idle = null;
    items.forEach(function(it){
      if(idle) return;
      var sp = ESPEC[it.deviceId];
      if(!sp || sp.kind === 'source') return;
      if(sp.kind === 'bus'){
        var conn = 0;
        (an.net.byItem[it.id] ? an.net.byItem[it.id].ports : []).forEach(function(p){
          if(an.net.deg.get(p)) conn++;
        });
        if(conn < 2) idle = it;
        return;
      }
      var r = sol.byItem[it.id];
      if(!r || Math.abs(r.I) <= 1e-6) idle = it;
    });
    add('อุปกรณ์ทุกชิ้นมีไฟไหลผ่านจริง', !idle,
        idle ? (DEVICES[idle.deviceId].name + ' วางไว้เฉย ๆ ไม่มีกระแสไหลผ่าน') : '');
  }
  if(!result().ok) return result();

  /* ---------- 5) ทดสอบพฤติกรรมโดยสับสวิตช์จำลอง ---------- */
  var switches = itemsOfType(items, 'switch');

  if(req.switchControls && switches.length){
    var offSol = withTemp(switches[0], 'open', true, function(){
      return simAt(items, wires, 0.15);
    });
    var stillOn = false, who = '';
    (req.work || []).forEach(function(devId){
      itemsOfType(items, devId).forEach(function(it){
        if(workOf(it, offSol) >= WORK_MIN){ stillOn = true; who = DEVICES[devId].name; }
      });
    });
    add('สับสวิตช์ OFF แล้วหยุดทำงานจริง', !stillOn,
        stillOn ? (who + ' ยังทำงานอยู่ทั้งที่สับสวิตช์ออกแล้ว — สวิตช์ไม่ได้อยู่ในทางเดินของไฟ') : '');
  }

  /* ต้องลองสับ "ทุกตัว" ไม่ใช่แค่ตัวแรก
     ถ้าลองแค่ตัวแรก ผู้เล่นเอาสวิตช์สองตัวไปวางซ้อนกันในสาขาเดียวก็ผ่านได้
     (ปิดตัวแรก → สาขานั้นดับ อีกสาขายังติด → ดูเหมือนถูก ทั้งที่สวิตช์ตัวที่สอง
      ไม่ได้คุมอะไรเลย) จึงต้องเช็คด้วยว่าแต่ละตัวดับ "คนละชุด" กันจริง */
  if(req.independent && switches.length >= 2){
    var trials = switches.map(function(sw){
      var off = withTemp(sw, 'open', true, function(){
        return simAt(items, wires, 0.15);
      });
      var stopped = [], running = [];
      (req.work || []).forEach(function(devId){
        itemsOfType(items, devId).forEach(function(it){
          if(workOf(it, off) >= WORK_MIN) running.push(it.id); else stopped.push(it.id);
        });
      });
      return { stopped: stopped.sort().join(','), nStop: stopped.length, nRun: running.length };
    });

    var eachSplits = true, worst = null;
    trials.forEach(function(t){
      if(!(t.nStop >= 1 && t.nRun >= 1)){ eachSplits = false; if(!worst) worst = t; }
    });

    /* สองตัวที่ดับของชุดเดียวกัน = อยู่สาขาเดียวกัน */
    var distinct = true;
    for(var ti=0; ti<trials.length && distinct; ti++){
      for(var tj=ti+1; tj<trials.length; tj++){
        if(trials[ti].stopped === trials[tj].stopped){ distinct = false; break; }
      }
    }

    var indMsg = '';
    if(!eachSplits){
      indMsg = (worst && worst.nRun === 0)
        ? 'ปิดสวิตช์ตัวเดียวแล้วดับหมดทั้งวง — แปลว่ายังต่ออนุกรมอยู่'
        : 'มีสวิตช์ที่ปิดแล้วไม่มีอะไรดับเลย — สวิตช์ตัวนั้นยังไม่ได้คุมสาขาของตัวเอง';
    } else if(!distinct){
      indMsg = 'สวิตช์สองตัวดับของชุดเดียวกัน — แปลว่าอยู่สาขาเดียวกัน ต้องแยกไปคุมคนละสาขา';
    }
    add('สวิตช์แต่ละตัวคุมสาขาของตัวเองแยกกัน', eachSplits && distinct, indMsg);
  }

  /* ---------- 6) ฟิวส์ต้องคุมกระแสทั้งวงจรจริง ---------- */
  if(req.fuseProtects){
    var fuses = itemsOfType(items, 'fuse');
    if(!fuses.length){
      add('ฟิวส์คุ้มครองทั้งวงจร', false, 'ยังไม่มีฟิวส์ในวงจร');
    } else {
      var noFuse = withTemp(fuses[0], 'blown', true, function(){
        return simAt(items, wires, 0.15);
      });
      var leak = (noFuse && noFuse.ok) ? noFuse.supplyI : 0;
      var ok = leak < sol.supplyI * 0.02;
      add('ฟิวส์คุ้มครองทั้งวงจร', ok,
          ok ? '' : 'ถอดฟิวส์ออกแล้วไฟยังไหลได้ ' + fmtCurrent(leak) +
                    ' — มีทางให้ไฟเลี่ยงฟิวส์ ต้องให้กระแสทั้งหมดผ่านฟิวส์');
    }
  }

  /* ---------- 7) วงจรหน่วงเวลา: ต้องสว่างแล้วค่อย ๆ หรี่จนดับ ---------- */
  if(req.fades){
    var late = simAt(items, wires, 8);
    var devId0 = (req.work && req.work[0]) || 'led';
    var w0 = 0, w1 = 0;
    itemsOfType(items, devId0).forEach(function(it){
      w0 = Math.max(w0, workOf(it, sol));
      w1 = Math.max(w1, workOf(it, late));
    });
    add('สว่างขึ้นก่อน แล้วค่อย ๆ หรี่จนดับ (หน่วงเวลา)', w1 < w0 * 0.35,
        w1 >= w0 * 0.35 ? 'ความสว่างแทบไม่ลดลงเลย — ตัวเก็บประจุยังไม่ได้อยู่ในทางเดินของไฟ' : '');
  }

  return result();
}

/* ============================================================
   สร้างข้อกำหนดผลลัพธ์ให้โจทย์สุ่มของโหมดวัดความเร็ว
   ============================================================ */
function autoRequire(inventory, topology, branches){
  var work = [];
  ['bulb','led','motor','buzzer'].forEach(function(d){ if(inventory[d]) work.push(d); });
  /* โหมดนี้วัด "ความเร็วในการต่อ" ไม่ใช่การออกแบบวงจร โจทย์สุ่มจึงอาจได้
     สายโซ่ยาวจนโหลดทำงานแผ่ว ๆ เกณฑ์ความสว่างต้องหลวมกว่าโหมดด่าน
     ขอแค่ "มีกระแสไหลผ่านจริง" ก็ถือว่าต่อสำเร็จ */
  var req = { work:work, minWork:0.015, topology:topology };
  if(topology === 'parallel') req.branches = branches;
  if(inventory.led)  req.currentBelow = { led: ESPEC.led.imax };
  return req;
}
