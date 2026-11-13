/* CIRCUIT CHECK — ตัดสินว่าวงจรของผู้เล่นถูก/ผิด
   ไม่ตรวจเองแล้ว แต่ถาม analyze.js (อ่านวงจรเป็นโครงข่ายจริงตัวเดียวกับที่ solver.js ใช้)
   ไฟล์นี้แค่แปลผลวิเคราะห์เป็นคำตอบที่ด่านต้องการ ชื่อฟังก์ชันคงเดิม levels.js เลยไม่ต้องแก้
     isClosedCircuit  วงจรปิดใช้ได้จริงไหม (บอกจุดที่ยังไม่ครบ)
     tracePolarity    ขั้วชนกันโดยตรง
   (ชุดตรวจ "เทียบกับเฉลย" เดิมลบออกแล้ว ย้ายไปดูผลจริงผ่าน checkOutcome ใน outcome.js) */

/* วงจรปิดจริงไหม — ไล่บอกทีละสาเหตุ เรียงจากที่แก้ง่ายสุด */
function isClosedCircuit(items, wires, requiredDeviceIds){
  if(items.length < 2) return { ok:false, msg:'ต้องมีอุปกรณ์อย่างน้อย 2 ชิ้น' };

  var an = analyzeCircuit(items, wires);
  var net = an.net;

  if(!an.sourceCount){
    return { ok:false, msg:'วงจรต้องมีแหล่งจ่ายไฟ (ถ่าน/แบตเตอรี่)' };
  }

  /* 1) ขาที่ยังไม่ได้ต่อสาย — วงจรใหญ่มีเป็นร้อยขา เลยบอกจำนวนรวม + ให้มองหาขากะพริบส้ม */
  if(an.floating.length){
    var f = an.floating[0];
    var n = an.floating.length;
    /* บนเบรดบอร์ดต้องอธิบายลึกกว่า "ยังไม่ต่อสาย" เพราะขาลงรูแล้วแต่อยู่รางคนเดียว (ดู bbPinDiagnosis) */
    var why = (typeof bbPinDiagnosis === 'function') ? bbPinDiagnosis(f.port) : '';
    var name = termName(net, f.el.item, f.port);
    return { ok:false, msg: (n > 1
      ? ('ยังมีขาที่ไม่ถึงใคร ' + n + ' ขา (กะพริบสีส้มบนแผง) — เช่น ' + name + why)
      : (name + (why || ' ยังไม่ได้ต่อสาย') + ' — ขานั้นกะพริบสีส้มอยู่')) };
  }

  /* 2) อุปกรณ์ถูกต่อสายคร่อมตัวเอง — ขาสองข้างกลายเป็นจุดเดียว ไฟลัดผ่านไม่ผ่านตัวมัน */
  if(an.shorted.length){
    var s = an.shorted[0];
    return { ok:false, msg: DEVICES[s.deviceId].name + ' ถูกต่อสายคร่อมขาทั้งสองข้าง ' +
             'ไฟจึงลัดผ่านไปหมดไม่ผ่านตัวมัน — ลบสายที่คร่อมออก หรือเลื่อนไม่ให้ขาสองข้างอยู่รางเดียวกัน' };
  }

  /* 3) อุปกรณ์ลอยเป็นเกาะ ไม่เชื่อมกับแหล่งจ่าย */
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



/* ขั้วชนกันโดยตรง — สายเส้นเดียวเชื่อมสองขั้วที่มีเครื่องหมาย
   src(+)─โหลด(+) OK, src(−)─โหลด(−) OK, โหลด(+)─โหลด(−) OK (อนุกรม),
   src(+)─src(−) OK (ถ่านอนุกรม แรงดันบวกกัน),
   src(+)─โหลด(−) ผิด (โหลดกลับด้าน), src(+)─src(+) / src(−)─src(−) ผิด (ขั้วเหมือนกันชนกัน) */
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

    /* src เจอ src — ผิดเฉพาะขั้วเดียวกันชนกัน (+กับ+ / −กับ−) เพราะแรงดันดันสวนกัน
       ส่วนขั้วต่างกัน (+ไป−) คือการต่อถ่านอนุกรมปกติ ห้ามไม่ได้ */
    if(fromSrc && toSrc && fp === tp){
      var sign = (fp === '+') ? 'บวกกับบวก' : 'ลบกับลบ';
      return { ok:false, msg:'ต่อแหล่งจ่ายขั้วเหมือนกันชนกัน (' + sign + ') — ' +
               'แรงดันดันสวนกัน ต่ออนุกรมต้องเอาขั้ว + ของก้อนหนึ่ง ' +
               'ไปต่อขั้ว − ของก้อนถัดไป (หมุนด้วยปุ่ม R)' };
    }
    /* src เจอ src ขั้วต่างกัน = อนุกรมถูกต้อง ผ่านไป (ดักไว้ไม่ให้ตกไปเข้าเงื่อน "ต่อกลับขั้ว" ด้านล่าง) */
    if(fromSrc && toSrc) continue;
    if((fromSrc || toSrc) && fp !== tp){
      var loadName = fromSrc ? DEVICES[itemDeviceId(wire.toItemId)].name
                             : DEVICES[itemDeviceId(wire.fromItemId)].name;
      return { ok:false, msg:'ต่อกลับขั้ว! ' + loadName + ' ต่อกลับด้าน — ขั้ว ' + fp +
               ' ของแหล่งจ่ายไปเจอขั้ว ' + tp + ' ของโหลด ต้องหมุน (R) ให้ขั้วตรงกัน (+ถึง+, −ถึง−)' };
    }
  }
  return { ok:true, msg:'' };
}


/* (ตัวช่วยนับสายแบบเดิม buildGraph/wireCountOf/wiresAtPort ลบแล้ว — ไม่อิงจำนวนสายอีก อ่านจากโครงข่ายใน analyze.js แทน) */
