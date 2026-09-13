/* ============================================================
   CIRCUIT CHECK — การตัดสินว่าวงจรของผู้เล่นถูกหรือผิด

   ไฟล์นี้ไม่ได้ "ตรวจ" เองอีกต่อไป แต่ถามระบบวิเคราะห์ใน js/analyze.js
   ซึ่งอ่านวงจรเป็นโครงข่ายจริงด้วยตัวเดียวกับที่ js/solver.js ใช้แก้สมการ
   ระบบตรวจกับระบบฟิสิกส์จึงมองเห็นวงจรเดียวกันเสมอ

   หน้าที่ที่เหลือของไฟล์นี้คือแปลผลการวิเคราะห์เป็นคำตอบที่ด่านต้องการ
   ชื่อฟังก์ชันทั้งหมดคงเดิม js/levels.js ทั้ง 20 ด่านจึงไม่ต้องแก้

     isClosedCircuit        วงจรปิดใช้งานได้จริงไหม (พร้อมบอกจุดที่ยังไม่ครบ)
     tracePolarity          ขั้วชนกันโดยตรง

   หมายเหตุ: เคยมีชุดตรวจ "เทียบกับเฉลย" อยู่ในไฟล์นี้ด้วย
   (checkExactWiring / checkSeriesTopology / checkParallelTopology /
    tracePolarityThrough) ลบออกแล้วเพราะไม่มีด่านไหนเรียกใช้อีก —
   การตัดสินย้ายไปดู "ผลที่วงจรทำได้จริง" ผ่าน checkOutcome ใน js/outcome.js
   ตั้งแต่ตอนเปลี่ยนระบบตรวจ (ดูคำอธิบายใน checkCircuit ที่ js/game.js)
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


/* หมายเหตุ: ตัวช่วยนับสายแบบเดิม (buildGraph / wireCountOf / wiresAtPort)
   ถูกลบทิ้งแล้ว เพราะการตัดสินไม่ได้อิง "จำนวนสาย" อีกต่อไป
   ทุกอย่างอ่านจากโครงข่ายจริงใน js/analyze.js แทน */
