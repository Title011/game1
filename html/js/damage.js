/* ============================================================
   DAMAGE — ผลที่เกิดขึ้นจริงเมื่อต่อวงจรผิด

   จำลอง 2 เหตุการณ์ที่สอนเรื่องความปลอดภัยได้ตรงที่สุด:

   1) ลัดวงจร (Short circuit)
      ไฟจากขั้ว + วิ่งกลับขั้ว − ได้โดยไม่ผ่านความต้านทานเลย
      → มีฟิวส์  : ฟิวส์ขาด ตัดไฟทัน อุปกรณ์อื่นรอด (นี่คือหน้าที่ของฟิวส์)
      → ไม่มีฟิวส์: สายไฟร้อนจนไหม้

   2) กระแสเกินพิกัดอุปกรณ์ (Over-current)
      I = V / R รวม  ถ้าเกินค่าที่อุปกรณ์ทนได้ → อุปกรณ์ตัวนั้นไหม้
      เคสคลาสสิกคือ LED ต่อตรงเข้าแบต 9V โดยไม่มีตัวต้านทาน

   ค่าพิกัดตั้งไว้ค่อนข้างใจกว้าง ให้ "ต่อถูกแล้วต้องไม่พัง" เสมอ
   ตรวจกับเฉลยครบทั้ง 20 ด่านแล้วว่าไม่มีด่านไหนพังเอง
   ============================================================ */

/* กระแสสูงสุดที่อุปกรณ์แต่ละชนิดทนได้ (มิลลิแอมป์)
   ไม่ระบุ = ไม่พังจากกระแสเกิน (สวิตช์ บอร์ด ฯลฯ) */
var MAX_MA = {
  led:35,        /* 9V ต่อตรงไม่มี R = 90mA -> ไหม้ | มี R 220 = 28mA -> รอด */
  capacitor:180,
  transistor:220,
  ldr:150,
  buzzer:150,
  resistor:350,
  diode:1000,
  motor:700,
  bulb:900
};

/* แรงดันของแหล่งจ่ายแต่ละชนิด (โวลต์) */
function sourceVoltage(items){
  var v = 0;
  items.forEach(function(it){
    if(DEVICES[it.deviceId].type !== 'source') return;
    if(it.deviceId === 'battery_9v')      v = Math.max(v, 9);
    else if(it.deviceId === 'battery_aa') v = Math.max(v, 1.5);
    else                                  v = Math.max(v, 5);   /* หม้อแปลง */
  });
  return v;
}

/* มีเส้นทางจากขั้ว + กลับถึงขั้ว − โดยไม่ผ่านความต้านทานเลยไหม
   ไล่ตามสาย และทะลุได้เฉพาะอุปกรณ์ที่ ohm = 0 (สวิตช์/ฟิวส์/บอร์ด)
   ถ้าเจอโหลด (มี ohm) จะหยุด ไม่นับเป็นลัดวงจร */
function findShortPath(items, wires){
  function itemOf(id){
    for(var i=0;i<items.length;i++) if(items[i].id===id) return items[i];
    return null;
  }
  function wiresAt(p){
    var o=[]; wires.forEach(function(w){ if(w.fromPort===p||w.toPort===p) o.push(w); }); return o;
  }
  function zeroOhm(it){
    var d = DEVICES[it.deviceId];
    if(d.type === 'source') return false;   /* ไม่ทะลุแหล่งจ่าย */
    return !d.ohm;                          /* 0 หรือไม่ได้ระบุ */
  }

  var pos=[], neg=[];
  items.forEach(function(it){
    if(!it.el || DEVICES[it.deviceId].type !== 'source') return;
    var ps = it.el.querySelectorAll('.port');
    for(var i=0;i<ps.length;i++){
      if(ps[i].dataset.polarity === '+')      pos.push(ps[i]);
      else if(ps[i].dataset.polarity === '-') neg.push(ps[i]);
    }
  });
  if(!pos.length || !neg.length) return false;

  var seen = [], q = pos.slice();
  for(var s=0;s<pos.length;s++) seen.push(pos[s]);
  while(q.length){
    var p = q.shift();
    if(neg.indexOf(p) >= 0) return true;    /* ถึงขั้วลบโดยไม่เจอความต้านทาน */

    wiresAt(p).forEach(function(w){
      var nx = (w.fromPort===p) ? w.toPort : w.fromPort;
      if(seen.indexOf(nx) < 0){ seen.push(nx); q.push(nx); }
    });
    var it = itemOf(p.dataset.itemId);
    if(it && zeroOhm(it) && it.el){
      var ps = it.el.querySelectorAll('.port');
      for(var i=0;i<ps.length;i++){
        if(ps[i]!==p && seen.indexOf(ps[i])<0){ seen.push(ps[i]); q.push(ps[i]); }
      }
    }
  }
  return false;
}

/* วิเคราะห์ความเสียหาย — คืน {ok, msg, burned:[item], blownFuse:item, burnWires:bool} */
function analyzeCircuitFaults(items, wires){
  var res = { ok:true, msg:'', burned:[], blownFuse:null, burnWires:false, current:0 };
  if(!items.length || !wires.length) return res;

  var V = sourceVoltage(items);
  if(!V) return res;

  /* ไฟจะไหลได้ต้องเป็นวงจรปิดก่อน — วงจรที่ยังต่อไม่ครบไม่มีอันตราย */
  if(!isClosedCircuit(items, wires).ok) return res;

  /* ---------- 1) ลัดวงจร ---------- */
  if(findShortPath(items, wires)){
    var fuse = null;
    items.forEach(function(it){ if(it.deviceId==='fuse' && !fuse) fuse = it; });
    res.ok = false;
    if(fuse){
      res.blownFuse = fuse;
      res.msg = 'ลัดวงจร! ไฟจากขั้ว + วิ่งกลับขั้ว − โดยไม่ผ่านอุปกรณ์ใช้ไฟเลย '
              + 'โชคดีที่ฟิวส์ขาดตัดไฟทัน อุปกรณ์อื่นจึงปลอดภัย';
    } else {
      res.burnWires = true;
      res.msg = 'ลัดวงจร! ไฟจากขั้ว + วิ่งกลับขั้ว − โดยไม่ผ่านอุปกรณ์ใช้ไฟเลย '
              + 'กระแสพุ่งสูงจนสายไฟร้อนไหม้ — ถ้าต่อฟิวส์คั่นไว้จะตัดไฟป้องกันได้';
    }
    return res;
  }

  /* ---------- 2) กระแสเกินพิกัดอุปกรณ์ ---------- */
  var totalR = 0;
  items.forEach(function(it){
    var o = DEVICES[it.deviceId].ohm;
    if(typeof o === 'number') totalR += o;
  });
  totalR = Math.max(1, totalR);
  var I = V / totalR * 1000;      /* มิลลิแอมป์ */
  res.current = I;

  items.forEach(function(it){
    var lim = MAX_MA[it.deviceId];
    if(lim && I > lim) res.burned.push(it);
  });

  if(res.burned.length){
    res.ok = false;
    var names = res.burned.map(function(it){ return DEVICES[it.deviceId].name; }).join(', ');
    res.msg = 'กระแสเกินพิกัด! วงจรมีกระแส ' + I.toFixed(0) + ' mA '
            + 'ทำให้ ' + names + ' ไหม้เสียหาย '
            + '— เพิ่มตัวต้านทานเพื่อจำกัดกระแสก่อนเข้าอุปกรณ์';
  }
  return res;
}

/* ============================================================
   แสดงผลความเสียหายบนหน้าจอ
   ============================================================ */
function clearDamage(){
  G.wsItems.forEach(function(it){
    if(it.el) it.el.classList.remove('burned','fuse-blown');
  });
  G.wires.forEach(function(w){
    if(w.pathEl) w.pathEl.classList.remove('wire-burned');
  });
}

function applyDamage(fault){
  fault.burned.forEach(function(it){
    if(it.el) it.el.classList.add('burned');
  });
  if(fault.blownFuse && fault.blownFuse.el){
    fault.blownFuse.el.classList.add('fuse-blown');
  }
  if(fault.burnWires){
    G.wires.forEach(function(w){
      if(w.pathEl) w.pathEl.classList.add('wire-burned');
    });
  }
  /* ดับไฟทุกอย่าง วงจรพังแล้วไม่มีอะไรทำงาน */
  G.wsItems.forEach(function(it){ if(it.el) it.el.classList.remove('powered'); });
  stopCurrentFlow();
}
