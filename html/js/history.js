/* ============================================================
   HISTORY — ย้อนกลับ / ทำซ้ำ (Ctrl+Z / Ctrl+Y)

   ทำไมต้องมี: ระบบคุมดำทำให้กด Del ครั้งเดียวลบได้หลายสิบชิ้นพร้อมสาย
   ทั้งหมดในทีเดียว ก่อนหน้านี้พลาดหนักสุดคือเสียอุปกรณ์ชิ้นเดียว
   ตอนนี้ความเสียหายจากการกดพลาดโตขึ้นหลายเท่า จึงต้องมีตะแกรงรับ

   ── วิธีเก็บ: ถ่ายภาพทั้งวงจร ไม่ใช่เก็บ "คำสั่งย้อนกลับ" ──────────
   แบบเก็บคำสั่งย้อนกลับ (undo ของ "ลบ" = "วางคืน") ต้องเขียนตัวย้อนให้ครบ
   ทุกการกระทำ และต้องถูกต้องทุกตัว พลาดตัวเดียวสถานะจะเพี้ยนสะสม
   ส่วนการถ่ายภาพทั้งวงจรมีทางเดินเดียว ถูกก็ถูกหมด ผิดก็เห็นทันที
   วงจรในเกมนี้ใหญ่สุดไม่กี่สิบชิ้น ค่าใช้จ่ายของการถ่ายภาพจึงไม่มีนัยสำคัญ

   ── สิ่งที่เก็บ ────────────────────────────────────────────────
   อุปกรณ์  ชนิด ตำแหน่ง มุมหมุน ค่าโอห์ม สถานะสวิตช์/ฟิวส์
   สายไฟ    อ้างอิงด้วย "ลำดับของอุปกรณ์ในอาเรย์" + ชื่อขาตั้งต้น
            ไม่ใช้ id เพราะตอนสร้างใหม่ id จะเปลี่ยน (ws-1, ws-2, ...)
   คลัง     จำนวนที่เหลือของแต่ละชนิด

   ไม่เก็บ: สายเชื่อมในรางเบรดบอร์ดกับเส้น "ขาแตะกัน" (ธง virtual)
   สองอย่างนั้นระบบสร้างใหม่เองจากตำแหน่งจริงทุกครั้ง (ดู settleCircuit)
   ถ้าเก็บด้วยจะกลายเป็นสายซ้ำซ้อนตอนกู้คืน

   ไม่เก็บ: ความร้อน/ความเสียหาย เพราะ resetHazards() ล้างให้ทุกครั้ง
   ที่กดตรวจวงจร การย้อนกลับจึงคืนแค่ "รูปวงจร" ไม่ใช่คืนชีวิตหรือคะแนน
   ============================================================ */

var HIST = {
  past: [],        /* สถานะก่อนหน้า ตัวท้ายคือล่าสุด */
  future: [],      /* สถานะที่ย้อนออกมาแล้ว รอทำซ้ำ */
  MAX: 40,         /* จำกัดไว้กัน localStorage/หน่วยความจำบวม */
  busy: false,     /* กำลังกู้คืนอยู่ ห้ามบันทึกประวัติซ้อน */
  lock: false      /* อยู่ในคำสั่งกลุ่ม — นับเป็นก้าวเดียว (ดู historyStep) */
};

/* ============================================================
   ถ่ายภาพวงจรปัจจุบัน
   ============================================================ */
function snapshotCircuit(){
  var idx = {};
  G.wsItems.forEach(function(it, i){ idx[it.id] = i; });

  var items = G.wsItems.map(function(it){
    return {
      d: it.deviceId,
      x: it.x || 0,
      y: it.y || 0,
      r: it.rotation || 0,
      o: (it.ohms == null ? null : it.ohms),
      sw: !!it.open,
      bl: !!it.blown
    };
  });

  var wires = [];
  G.wires.forEach(function(w){
    if(w.virtual) return;                      /* รางเบรดบอร์ด / ขาแตะกัน = สร้างใหม่เอง */
    var fi = idx[w.fromItemId], ti = idx[w.toItemId];
    if(fi === undefined || ti === undefined) return;
    if(!w.fromPort || !w.toPort) return;
    wires.push({
      fi: fi, fp: w.fromPort.dataset.origPos,
      ti: ti, tp: w.toPort.dataset.origPos,
      fpol: w.forcedColor === '#ff4444' ? '+' : (w.forcedColor === '#00aaff' ? '-' : null)
    });
  });

  return { items: items, wires: wires, inv: Object.assign({}, G.invCounts) };
}

/* ============================================================
   กู้คืนวงจรจากภาพที่ถ่ายไว้
   ============================================================ */
function restoreCircuit(snap){
  if(!snap) return;
  HIST.busy = true;

  /* ล้างของเดิมให้เกลี้ยง แต่ไม่คืนของเข้าคลัง (จำนวนคลังมาจากภาพที่ถ่ายไว้)
     clearWorkspace(true) = ไม่ต้อง renderInventory ตอนนี้ เดี๋ยวทำทีเดียวท้ายสุด */
  var keepInv = Object.assign({}, G.invCounts);
  clearWorkspace(true);
  G.invCounts = keepInv;

  /* --- วางอุปกรณ์ตามลำดับเดิม เพื่อให้ index ของสายตรงกัน --- */
  var made = [];
  snap.items.forEach(function(s){
    addWsItem(s.d, s.x, s.y);
    var it = G.wsItems[G.wsItems.length - 1];
    made.push(it);
    if(!it) return;

    if(s.o != null) setItemOhmsQuiet(it, s.o);
    if(s.r) applyItemRotation(it, s.r);

    it.blown = !!s.bl;
    if(s.sw && it.deviceId === 'switch'){
      it.open = true;
      var b = it.el.querySelector('.ws-switch-state');
      if(b) b.textContent = 'OFF';
      it.el.classList.add('switch-open');
    }
    if(it.blown) it.el.classList.add('fuse-blown');
  });

  /* --- ต่อสายคืน --- */
  snap.wires.forEach(function(s){
    var a = made[s.fi], b = made[s.ti];
    if(!a || !b || !a.el || !b.el) return;
    var pa = a.el.querySelector('.port[data-orig-pos="' + s.fp + '"]');
    var pb = b.el.querySelector('.port[data-orig-pos="' + s.tp + '"]');
    if(!pa || !pb) return;
    /* addWire อ่านพิกัดจากตัว port เองอยู่แล้ว ค่า 0 ที่ส่งไปจึงไม่มีผล */
    addWire(a.id, pa, 0, 0, b.id, pb, 0, 0, s.fpol, null);
  });

  G.invCounts = Object.assign({}, snap.inv);
  renderInventory();

  HIST.busy = false;

  /* สร้างรางเบรดบอร์ด + เส้นขาแตะกันใหม่จากตำแหน่งจริงทีเดียวตอนท้าย
     (ระหว่างวางทีละชิ้นข้ามไว้ ไม่งั้นคำนวณซ้ำ n รอบโดยไม่จำเป็น) */
  bbRefresh();
  settleCircuit();
  if(typeof onCircuitChanged === 'function') onCircuitChanged();

  var hint = document.getElementById('workspace-hint');
  if(hint) hint.style.display = G.wsItems.length ? 'none' : '';
}

/* หมุนอุปกรณ์ไปที่มุมที่ต้องการทันที ไม่ผ่าน rotateItem()
   เพราะตัวนั้นหมุนทีละ 90° พร้อมตั้ง setTimeout จัดตำแหน่งใหม่ทุกครั้ง
   การกู้คืน 20 ชิ้นจะได้ตัวจับเวลา 60 ตัวโดยไม่จำเป็น */
function applyItemRotation(item, deg){
  item.rotation = ((deg || 0) % 360 + 360) % 360;
  var wrap = item.el && item.el.querySelector('.ws-item-svg');
  if(wrap) wrap.style.transform = 'rotate(' + item.rotation + 'deg)';
  layoutPorts(item);
}

/* ============================================================
   บันทึกประวัติ — เรียก "ก่อน" ลงมือเปลี่ยนวงจรทุกครั้ง

   label ใช้บอกผู้เล่นว่ากำลังย้อนอะไร ("ย้อนกลับ: ลบ 8 ชิ้น")
   ผู้เล่นจะได้รู้ว่ากดย้อนแล้วได้อะไรคืน ไม่ใช่กดแล้วจอเปลี่ยนเฉย ๆ
   ============================================================ */
function pushHistory(label){
  if(HIST.busy || HIST.lock) return;
  if(typeof G === 'undefined' || !G.wsItems) return;
  commitHistory(snapshotCircuit(), label);
}

/* บันทึกภาพที่ถ่ายไว้ล่วงหน้า — ใช้กับการกระทำที่รู้ผลตอนจบ เช่นการลากย้าย
   ต้องถ่ายภาพ "ก่อนลาก" แต่จะรู้ว่าย้ายจริงหรือเปล่าก็ตอนปล่อยมือ
   ถ้า pushHistory ตอนเริ่มลากทุกครั้ง การกดเลือกเฉย ๆ จะเกิดประวัติขยะ */
function commitHistory(snap, label){
  if(HIST.busy || HIST.lock || !snap) return;
  HIST.past.push({ snap: snap, label: label || 'การเปลี่ยนแปลง' });
  if(HIST.past.length > HIST.MAX) HIST.past.shift();
  HIST.future.length = 0;      /* ทำอะไรใหม่แล้ว ของที่ย้อนไว้ใช้ทำซ้ำไม่ได้อีก */
  updateHistoryButtons();
}

/* รวมหลายการกระทำให้เป็น "หนึ่งก้าว" ของประวัติ

   จำเป็นเพราะคำสั่งกลุ่ม (ลบ 8 ชิ้น / หมุน 8 ชิ้น) ข้างในวิ่ง removeWsItem
   หรือ rotateItem ทีละชิ้น ถ้าปล่อยให้แต่ละตัวบันทึกเอง ผู้เล่นจะต้องกด
   Ctrl+Z แปดครั้งเพื่อแก้การกดพลาดครั้งเดียว ซึ่งไม่ใช่สิ่งที่คาดหวัง

   ล็อกไว้ระหว่างทำ แล้วปลดล็อกใน finally เสมอ — ถ้าข้างในโยน error
   แล้วล็อกค้าง ประวัติจะหยุดบันทึกไปทั้งเกมโดยไม่มีอะไรฟ้อง */
function historyStep(label, fn){
  pushHistory(label);
  HIST.lock = true;
  try { fn(); } finally { HIST.lock = false; }
  updateHistoryButtons();
}

/* ล้างประวัติ — เปลี่ยนด่าน/เข้าออกโหมด วงจรเดิมไม่เกี่ยวกันแล้ว */
function clearHistory(){
  HIST.past.length = 0;
  HIST.future.length = 0;
  updateHistoryButtons();
}

function undoAction(){
  if(HIST.busy) return;
  if(!HIST.past.length){ showToast('ไม่มีอะไรให้ย้อนกลับแล้ว','error'); return; }
  var prev = HIST.past.pop();
  /* เก็บสถานะ "ตอนนี้" ไว้ให้ทำซ้ำ พร้อมป้ายของก้าวที่กำลังย้อน */
  HIST.future.push({ snap: snapshotCircuit(), label: prev.label });
  restoreCircuit(prev.snap);
  updateHistoryButtons();
  showToast('ย้อนกลับ: ' + prev.label, 'success');
}

function redoAction(){
  if(HIST.busy) return;
  if(!HIST.future.length){ showToast('ไม่มีอะไรให้ทำซ้ำแล้ว','error'); return; }
  var next = HIST.future.pop();
  HIST.past.push({ snap: snapshotCircuit(), label: next.label });
  restoreCircuit(next.snap);
  updateHistoryButtons();
  showToast('ทำซ้ำ: ' + next.label, 'success');
}

/* ============================================================
   ปุ่มย้อนกลับ/ทำซ้ำ ลอยมุมขวาบนของพื้นที่ทำงาน

   ต้องมีปุ่มจริง ไม่ใช่มีแต่คีย์ลัด เพราะบนมือถือไม่มีแป้นพิมพ์
   และผู้เล่นบนมือถือคือกลุ่มที่กดพลาดบ่อยที่สุด
   ปิดปุ่มไว้ (disabled) เมื่อไม่มีอะไรให้ย้อน เพื่อบอกสถานะไปในตัว
   ============================================================ */
/* ข้อความบอกวิธีย้อนกลับ ให้ตรงกับเครื่องที่กำลังเล่นอยู่
   บนมือถือไม่มี Ctrl การบอกว่า "กด Ctrl+Z" จึงเป็นคำแนะนำที่ทำตามไม่ได้ */
function undoHint(){
  return ('ontouchstart' in window) ? 'กดปุ่ม ↶ ย้อน มุมซ้ายบนเพื่อเอาคืน'
                                    : 'กด Ctrl+Z ย้อนคืนได้';
}

function updateHistoryButtons(){
  var u = document.getElementById('btn-undo');
  var r = document.getElementById('btn-redo');
  if(u){
    u.disabled = !HIST.past.length;
    u.title = HIST.past.length
      ? ('ย้อนกลับ: ' + HIST.past[HIST.past.length-1].label + ' (Ctrl+Z)')
      : 'ไม่มีอะไรให้ย้อนกลับ (Ctrl+Z)';
  }
  if(r){
    r.disabled = !HIST.future.length;
    r.title = HIST.future.length
      ? ('ทำซ้ำ: ' + HIST.future[HIST.future.length-1].label + ' (Ctrl+Y)')
      : 'ไม่มีอะไรให้ทำซ้ำ (Ctrl+Y)';
  }
}
