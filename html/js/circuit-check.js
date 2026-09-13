/* ============================================================
   CIRCUIT CHECK — การตัดสินว่าวงจรของผู้เล่นถูกหรือผิด

   ไฟล์นี้ไม่ได้ "ตรวจ" เองอีกต่อไป แต่ถามระบบวิเคราะห์ใน js/analyze.js
   ซึ่งอ่านวงจรเป็นโครงข่ายจริงด้วยตัวเดียวกับที่ js/solver.js ใช้แก้สมการ
   ระบบตรวจกับระบบฟิสิกส์จึงมองเห็นวงจรเดียวกันเสมอ

   หน้าที่ที่เหลือของไฟล์นี้คือแปลผลการวิเคราะห์เป็นคำตอบที่ด่านต้องการ
   ชื่อฟังก์ชันทั้งหมดคงเดิม js/levels.js ทั้ง 20 ด่านจึงไม่ต้องแก้

     isClosedCircuit        วงจรปิดใช้งานได้จริงไหม (พร้อมบอกจุดที่ยังไม่ครบ)
     checkExactWiring       เทียบกับเฉลยแบบเทียบโครงข่าย ไม่ใช่นับสาย
     checkSeriesTopology    ต้องเป็นวงเดียว ทุกชิ้นอยู่ในวง
     checkParallelTopology  ต้องแตกสาขาครบ และทุกสาขามีของที่กำหนด
     tracePolarity          ขั้วชนกันโดยตรง
     tracePolarityThrough   ขั้วผิดทิศเมื่อไล่ตามทางเดินไฟจริง
   ============================================================ */

/* ============================================================
   วงจรปิดจริงไหม — ไล่บอกทีละสาเหตุ เรียงจากที่ผู้เรียนแก้ได้ง่ายสุด
   ============================================================ */
function isClosedCircuit(items, wires, requiredDeviceIds){
  if(items.length < 2) return { ok:false, msg:'ต้องมีอุปกรณ์อย่างน้อย 2 ชิ้น' };

  var an = analyzeCircuit(items, wires);
  var net = an.net;

  if(!an.sourceCount){
    return { ok:false, msg:'วงจรต้องมีแหล่งจ่ายไฟ (ถ่าน/แบตเตอรี่)' };
  }

  /* 1) ขาที่ยังไม่ได้ต่อสายเลย — บอกชื่ออุปกรณ์และขาที่ลอยอยู่ */
  if(an.floating.length){
    var f = an.floating[0];
    var more = an.floating.length > 1 ? (' (ยังมีอีก ' + (an.floating.length - 1) + ' ขาที่ลอยอยู่)') : '';
    return { ok:false, msg: termName(net, f.el.item, f.port) + ' ยังไม่ได้ต่อสาย' + more };
  }

  /* 2) อุปกรณ์ที่ถูกต่อสายคร่อมตัวเอง — ความผิดพลาดคลาสสิกที่ระบบเดิมจับไม่ได้
        ขาสองข้างกลายเป็นจุดเดียวกัน ไฟจึงลัดผ่านไปหมด ไม่ผ่านตัวอุปกรณ์ */
  if(an.shorted.length){
    var s = an.shorted[0];
    return { ok:false, msg: DEVICES[s.deviceId].name + ' ถูกต่อสายคร่อมขาทั้งสองข้าง ' +
             'ไฟจึงลัดผ่านไปหมดไม่ผ่านตัวมัน — ลบสายที่คร่อมออก หรือเลื่อนไม่ให้ขาสองข้างอยู่รางเดียวกัน' };
  }

  /* 3) อุปกรณ์ที่ลอยเป็นเกาะ ไม่ได้เชื่อมกับแหล่งจ่าย */
  if(an.islands.length){
    return { ok:false, msg: DEVICES[an.islands[0].deviceId].name +
             ' ยังไม่ได้เชื่อมเข้าวงจรหลัก — ต้องต่อให้อยู่ในวงเดียวกัน' };
  }

  /* 4) ไฟเดินจากขั้วบวกกลับขั้วลบไม่ได้ */
  if(!an.branches){
    return { ok:false, msg:'วงจรยังไม่ปิด — ไฟออกจากขั้วบวกแล้วยังหาทางกลับเข้าขั้วลบไม่ได้' };
  }

  /* 5) ขั้ว +/− */
  var pol = tracePolarity(items, wires);
  if(!pol.ok) return pol;

  return { ok:true, msg:'' };
}

/* ============================================================
   เทียบกับเฉลย — "อะไรถึงอะไร" ต้องตรง ส่วนจะเดินสายกี่เส้นไม่เกี่ยว

   ต่างจากระบบเดิมที่บังคับให้จำนวนสายเท่าเฉลยเป๊ะ ๆ
   ตอนนี้ต่อแบบไหนก็ได้ที่ได้วงจรเดียวกันทางไฟฟ้า = ถูกทั้งหมด
   (เดินสายสลับลำดับ ใช้รางบนแผงแทนสาย หรือผสมกันก็ได้)
   ============================================================ */
function checkExactWiring(items, wires, solution){
  var lv = currentLevel();
  var counts = (lv && lv.inventory) ? lv.inventory : {};

  var m = matchSolution(items, wires, solution, counts);
  if(!m.ok && m.kind !== 'wiring') return { ok:false, msg:m.msg };

  /* โครงสร้างที่ด่านกำหนด (อนุกรม/ขนาน) ตรวจก่อน เพราะอธิบายง่ายกว่า */
  if(lv && lv.topology){
    var topo = (lv.topology.type === 'parallel')
      ? checkParallelTopology(items, wires, lv.topology.branches, lv.topology.mustHave)
      : checkSeriesTopology(items, wires);
    if(!topo.ok) return topo;
  }

  /* ขั้วของอุปกรณ์มีขั้ว ต้องหันถูกทิศตามทางเดินไฟจริง */
  var polThrough = tracePolarityThrough(items, wires);
  if(!polThrough.ok) return polThrough;

  if(!m.ok){
    /* กรณีที่พบบ่อยที่สุด: ต่อครบทุกชิ้นเป็นวงเดียวเรียบร้อย แต่สลับลำดับ
       ทางไฟฟ้าวงจรอนุกรมสลับลำดับได้ก็จริง แต่ด่านสอนลำดับด้วย
       (เช่นฟิวส์ต้องอยู่ใกล้แหล่งจ่ายที่สุด) จึงยังไม่ผ่าน
       แต่ต้องบอกให้ชัดว่าติดตรงลำดับ ไม่ใช่ต่อไม่ครบ */
    var an2 = analyzeCircuit(items, wires);
    if(isCompleteSingleLoop(an2)){
      return { ok:false, msg:'ต่อครบทุกชิ้นเป็นวงเดียวแล้ว แต่ "ลำดับ" ยังไม่ตรงกับที่ด่านนี้กำหนด — ' +
               'ลำดับที่ต้องการคือ ' + solutionOrderText(solution) };
    }
    return { ok:false, msg:m.msg };
  }
  return { ok:true, msg:'' };
}

/* ============================================================
   วงจรอนุกรม — ไฟมีทางเดินเดียว และทุกชิ้นต้องอยู่บนทางนั้น
   ============================================================ */
function checkSeriesTopology(items, wires){
  var an = analyzeCircuit(items, wires);
  if(!an.sourceCount) return { ok:false, msg:'วงจรต้องมีแหล่งจ่าย' };
  if(!an.branches)    return { ok:false, msg:'วงจรยังไม่ปิด — ไฟกลับเข้าขั้วลบไม่ได้' };

  if(an.branches > 1){
    return { ok:false, msg:'ด่านนี้ต้องเป็นวงจรอนุกรม (ทางเดินเดียว) ' +
             'แต่ตอนนี้ไฟแยกได้ ' + an.branches + ' ทาง — วงจรอนุกรมทุกชิ้นต้องเรียงต่อกันเป็นวงเดียว' };
  }

  /* ทุกชิ้น (ยกเว้นแหล่งจ่าย) ต้องอยู่บนทางเดินนั้น */
  var onPath = {};
  an.paths[0].forEach(function(s){ onPath[s.el.item.id] = true; });
  var missing = null;
  an.net.els.forEach(function(e){
    if(e.isSource || missing) return;
    if(!onPath[e.item.id]) missing = e;
  });
  if(missing){
    return { ok:false, msg: DEVICES[missing.deviceId].name +
             ' ไม่ได้อยู่บนทางเดินของไฟ — วงจรอนุกรมต้องให้ไฟวิ่งผ่านทุกชิ้นเรียงกัน' };
  }
  return { ok:true, msg:'' };
}

/* ============================================================
   วงจรขนาน — ต้องแตกสาขาครบจำนวน และทุกสาขามีอุปกรณ์ที่กำหนด
   ============================================================ */
function checkParallelTopology(items, wires, branches, mustHave){
  var an = analyzeCircuit(items, wires);
  if(!an.sourceCount) return { ok:false, msg:'วงจรต้องมีแหล่งจ่าย' };
  if(!an.branches)    return { ok:false, msg:'วงจรยังไม่ปิด — ไฟกลับเข้าขั้วลบไม่ได้' };

  if(an.branches !== branches){
    return { ok:false, msg:'ด่านนี้ต้องแยก ' + branches + ' สาขา ' +
             'แต่ตอนนี้ไฟเดินได้ ' + an.branches + ' ทาง — ' +
             (an.branches < branches
               ? 'ต่อสาขาที่เหลือแยกออกจากขั้วแบตเตอรี่โดยตรง'
               : 'มีทางเดินเกินมา ลองลบสายที่ทำให้ไฟลัดข้ามสาขา') };
  }

  var need = mustHave || [];
  for(var i=0;i<an.paths.length;i++){
    var have = an.paths[i].map(function(s){ return s.el.deviceId; });
    for(var k=0;k<need.length;k++){
      if(have.indexOf(need[k]) < 0){
        return { ok:false, msg:'สาขาที่ ' + (i+1) + ' ยังขาด ' + DEVICES[need[k]].name +
                 ' — ทุกสาขาต้องมีอุปกรณ์ชุดเดียวกัน' };
      }
    }
  }
  return { ok:true, msg:'' };
}

/* ============================================================
   ขั้วชนกันโดยตรง — สายเส้นเดียวเชื่อมสองขั้วที่มีเครื่องหมาย

   กฎ (สายเดียวเชื่อม 2 ขั้วโดยตรง):
     แหล่งจ่าย(+) ─ โหลด(+)      OK   บวกจ่ายเข้าบวกโหลด
     แหล่งจ่าย(−) ─ โหลด(−)      OK   ลบรับกลับลบโหลด
     โหลด(+)      ─ โหลด(−)      OK   ต่ออนุกรม
     แหล่งจ่าย(+) ─ โหลด(−)      ผิด  โหลดกลับด้าน
     แหล่งจ่าย    ─ แหล่งจ่าย    ผิด  ห้ามต่อแหล่งจ่ายชนกันตรง ๆ
   ============================================================ */
function tracePolarity(items, wires){
  function polOf(p){ var v = p.dataset.polarity; return (v === '+' || v === '-') ? v : 'none'; }
  function typeOf(id){
    for(var i=0;i<items.length;i++) if(items[i].id === id) return DEVICES[items[i].deviceId].type;
    return 'unknown';
  }

  for(var w=0;w<wires.length;w++){
    var wire = wires[w];
    var fp = polOf(wire.fromPort), tp = polOf(wire.toPort);
    if(fp === 'none' || tp === 'none') continue;

    var fromSrc = (typeOf(wire.fromItemId) === 'source');
    var toSrc   = (typeOf(wire.toItemId)   === 'source');

    if(fromSrc && toSrc){
      return { ok:false, msg:'ต่อแหล่งจ่ายชนกันโดยตรง (ขั้ว ' + fp + ' กับ ' + tp + ') — ' +
               'ห้ามต่อถ่าน 2 ก้อนขั้วชนกันตรง ๆ' };
    }
    if((fromSrc || toSrc) && fp !== tp){
      var loadName = fromSrc ? DEVICES[itemDeviceId(wire.toItemId)].name
                             : DEVICES[itemDeviceId(wire.fromItemId)].name;
      return { ok:false, msg:'ต่อกลับขั้ว! ' + loadName + ' ต่อกลับด้าน — ขั้ว ' + fp +
               ' ของแหล่งจ่ายไปเจอขั้ว ' + tp + ' ของโหลด ต้องหมุน (R) ให้ขั้วตรงกัน (+ถึง+, −ถึง−)' };
    }
  }
  return { ok:true, msg:'' };
}

/* ============================================================
   ขั้วผิดทิศ — ไล่ตามทางเดินไฟจริง

   ระบบเดิมวัด "ระยะจากขั้วบวก" ซึ่งเพี้ยนได้ในวงจรขนาน
   ตอนนี้ดูตรง ๆ ว่าตอนไฟเดินผ่านอุปกรณ์ตัวนั้น มันเข้าทางขั้วบวกหรือขั้วลบ
   ถ้าเข้าทางขั้วลบ = หันกลับด้าน
   ============================================================ */
function tracePolarityThrough(items, wires){
  var an = analyzeCircuit(items, wires);
  if(!an.reversed.length) return { ok:true, msg:'' };
  var e = an.reversed[0];
  return { ok:false, msg:'ต่อกลับขั้ว! ' + DEVICES[e.deviceId].name +
           ' หันขั้วผิด — ไฟเดินเข้าทางขั้วลบของมันก่อน ' +
           'ขั้ว + ต้องหันไปทางขั้ว + ของแหล่งจ่าย กด R หมุนให้ถูกทิศ' };
}

/* หมายเหตุ: ตัวช่วยนับสายแบบเดิม (buildGraph / wireCountOf / wiresAtPort)
   ถูกลบทิ้งแล้ว เพราะการตัดสินไม่ได้อิง "จำนวนสาย" อีกต่อไป
   ทุกอย่างอ่านจากโครงข่ายจริงใน js/analyze.js แทน */
