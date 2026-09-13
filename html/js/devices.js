/* ============================================================
   DEVICES — นิยามอุปกรณ์ทั้งหมดในเกม

   polarity: ขั้วของแต่ละ port
     - polarized:true = มีขั้วบวก/ลบ (ต้องต่อถูกขั้ว)
     - pos = ตำแหน่ง port ที่เป็นขั้วบวก (+)
     - neg = ตำแหน่ง port ที่เป็นขั้วลบ (−)
   อุปกรณ์ที่ไม่ระบุ = ไม่มีขั้ว ต่อทางไหนก็ได้

   type: source=แหล่งจ่าย, control=ตัวควบคุม, passive=ตัวเฉื่อย,
         output=โหลด/เอาต์พุต, wire=สาย, tool=เครื่องมือ
   ohm : ความต้านทาน (ใช้คำนวณกระแส/แรงดันในเครื่องวัด)
   ============================================================ */
var DEVICES = {
  battery_aa:  { name:'ถ่านไฟฉาย AA', svgId:'dev-battery_aa',  type:'source',  ports:['left','right'], polarized:true, pos:'right', neg:'left' },
  battery_9v:  { name:'แบตเตอรี่ 9V', svgId:'dev-battery_9v',  type:'source',  ports:['left','right'], polarized:true, pos:'right', neg:'left' },
  transformer: { name:'หม้อแปลง',      svgId:'dev-transformer', type:'source',  ports:['left','right'] },
  switch:      { name:'สวิตช์',        svgId:'dev-switch',      type:'control', ohm:0, ports:['left','right'] },
  fuse:        { name:'ฟิวส์',         svgId:'dev-fuse',        type:'control', ohm:0, ports:['left','right'] },
  resistor:    { name:'ตัวต้านทาน',    svgId:'dev-resistor',    type:'passive', ohm:220, ports:['left','right'] },
  ldr:         { name:'LDR',           svgId:'dev-ldr',         type:'passive', ohm:150, ports:['left','right'] },
  diode:       { name:'ไดโอด',         svgId:'dev-diode',       type:'passive', ohm:20, ports:['left','right'], polarized:true, pos:'left', neg:'right' },
  led:         { name:'LED',           svgId:'dev-led',         type:'output', ohm:100,  ports:['left','right'], polarized:true, pos:'left', neg:'right' },
  capacitor:   { name:'ตัวเก็บประจุ',  svgId:'dev-capacitor',   type:'passive', ohm:60, ports:['left','right'], polarized:true, pos:'left', neg:'right' },
  transistor:  { name:'ทรานซิสเตอร์',  svgId:'dev-transistor',  type:'passive', ohm:40, ports:['left','right','bottom'] },
  bulb:        { name:'หลอดไฟ',        svgId:'dev-bulb',        type:'output', ohm:80,  ports:['left','right'] },
  motor:       { name:'มอเตอร์',       svgId:'dev-motor',       type:'output', ohm:120,  ports:['left','right'], polarized:true, pos:'left', neg:'right' },
  buzzer:      { name:'บัซเซอร์',      svgId:'dev-buzzer',      type:'output', ohm:90,  ports:['left','right'], polarized:true, pos:'left', neg:'right' },
  wire:        { name:'สายไฟ',         svgId:'dev-wire',        type:'wire', ohm:0,    ports:['left','right'] },
  /* breadboard ยังนิยามไว้เพื่อไม่ให้ของเก่าพัง แต่ไม่ได้แจกให้หยิบใช้แล้ว
     (พื้นที่ทำงานทั้งผืนคือเบรดบอร์ดจริงอยู่แล้ว — ดู js/breadboard.js)
     ถ้าอยากเอากลับมาใช้ ใส่ 'breadboard' กลับเข้าคลังใน js/inventory.js */
  breadboard:  { name:'Breadboard',    svgId:'dev-breadboard',  type:'tool', ohm:0,    ports:['left','right','top','bottom'] },
  multimeter:  { name:'มัลติมิเตอร์',  svgId:'dev-multimeter',  type:'tool', ohm:1e7,  ports:['left','right'] },
};

/* ============================================================
   PORT ANCHORS — ขาอยู่ตรงไหนของตัวจริง

   เดิมจุดต่อทุกตัวเกาะขอบกล่องซ้าย-ขวาเสมอ ซึ่งผิดกับของจริงเกือบหมด
     • หลอดไฟขั้วเกลียว มีขั้วทั้งคู่อยู่ที่ "ก้นหลอด" (ขั้วเกลียว + ปุ่มก้น)
     • LED / ตัวเก็บประจุ / บัซเซอร์ / LDR / ทรานซิสเตอร์ มีขาออกจากก้นตัวถัง
     • แบตเตอรี่ 9V มีขั้วสแนปอยู่ด้านบนทั้งสองขั้ว
   (รูปวาดใน js/device-symbols.js วาดขาที่ก้นไว้ถูกแล้ว แต่ต้องลากเส้น
    พับออกข้างเพิ่มเพื่อไปหาจุดต่อที่ขอบ — ตอนนี้ไม่ต้องพับแล้ว)

   หน่วยเป็น "ช่อง" (pitch) นับจากกึ่งกลางกล่อง  x ขวาเป็นบวก  y ลงเป็นบวก
   ทำไมต้องเป็นหน่วยช่อง ไม่ใช่พิกเซล:
     1. เบรดบอร์ดจริงเสียบได้เฉพาะตำแหน่งรู ระยะระหว่างขาสองขาของอุปกรณ์
        ตัวเดียวกันจึงต้อง "เป็นจำนวนเต็มของช่อง" ไม่งั้นขาข้างหนึ่งลงรู
        อีกข้างจะค้างอยู่บนพลาสติก (ดู bbSnapItem ใน js/breadboard.js)
     2. ขนาดช่องวัดจากอุปกรณ์จริงตอนรันไทม์ ตำแหน่งขาจึงเลื่อนตาม CSS เอง
        เช่นบนมือถือที่กล่องกับจุดขั้วใหญ่ขึ้น

   ค่าปริยาย ±2 ช่อง = ตำแหน่งขอบกล่องเดิมเป๊ะ ๆ
   (ช่องหนึ่ง = ระยะขาซ้าย-ขวา หาร 4 ดู bbMeasurePitch)

   face = ทิศที่สายไฟออกจากขา ใช้กำหนดทิศของเส้นโค้ง (ดู getPortCenter)
   ============================================================ */
var PORT_ANCHOR_DEFAULT = {
  left  : {x:-2, y: 0, face:'left'},
  right : {x: 2, y: 0, face:'right'},
  top   : {x: 0, y:-2, face:'top'},
  bottom: {x: 0, y: 2, face:'bottom'}
};

/* ใส่เฉพาะตัวที่ "รูปวาดของมัน" มีขั้วอยู่ที่อื่นนอกจากซ้าย-ขวา
   ตัวที่ไม่ได้ใส่ = รูปวาดมีขาออกสองข้างจริง ๆ จึงใช้ค่าปริยาย เช่น
     ถ่าน AA          ฝาขั้วอยู่สองปลาย
     ตัวต้านทาน/ไดโอด/ฟิวส์/สายไฟ   ขาแบบแกนกลาง ออกสองปลาย
     สวิตช์/หม้อแปลง/มอเตอร์        ขั้วอยู่สองข้าง
     LED / LDR        รูปเป็นสัญลักษณ์วางนอน ขาออกซ้าย-ขวาของตัวมันเอง
     ทรานซิสเตอร์      รูปวาดขาไว้ 3 ทิศอยู่แล้ว (ซ้าย B · ขวา C · ล่าง E)
   ค่าที่ใส่ไว้ข้างล่างนี้อ่านมาจากรูปวาดจริงในไฟล์ js/device-symbols.js
   ไม่ได้กำหนดลอย ๆ — ย้ายจุดขั้วไปทาบตรงที่รูปวาดขาไว้เท่านั้น */
var PORT_ANCHORS = {
  /* หัวสแนปสองหัวอยู่บนฝาด้านบน */
  battery_9v : { left:{x:-0.5, y:-2, face:'top'},    right:{x:0.5, y:-2, face:'top'} },
  /* base leads โผล่ออกจากก้นขั้วเกลียวทั้งคู่ */
  bulb       : { left:{x:-0.5, y: 2, face:'bottom'}, right:{x:0.5, y: 2, face:'bottom'} },
  /* leads สองเส้นออกจากก้นกระป๋อง */
  capacitor  : { left:{x:-0.5, y: 2, face:'bottom'}, right:{x:0.5, y: 2, face:'bottom'} },
  /* pin legs สองขาออกจากก้น พร้อมหัวต่อ +/− */
  buzzer     : { left:{x:-0.5, y: 2, face:'bottom'}, right:{x:0.5, y: 2, face:'bottom'} },
  /* รูเสียบสายวัด VΩ · COM · mA อยู่ที่ขอบล่างของเครื่อง */
  multimeter : { left:{x:-0.5, y: 2, face:'bottom'}, right:{x:0.5, y: 2, face:'bottom'} }
};

/* ขนาดหนึ่งช่อง (px) — วัดจากอุปกรณ์จริงโดย bbMeasurePitch()
   เรียกได้เสมอแม้ด่านนั้นไม่มีแผงเบรดบอร์ด (ดู applyBreadboard ใน js/game.js) */
function portUnit(){
  if(typeof BB !== 'undefined' && BB.pitch > 4) return BB.pitch;
  return 19.75;   /* ค่าของเลย์เอาต์เดสก์ท็อป เผื่อกรณีวัดยังไม่ทัน */
}

function portAnchor(deviceId, portName){
  var t = PORT_ANCHORS[deviceId];
  if(t && t[portName]) return t[portName];
  return PORT_ANCHOR_DEFAULT[portName] || PORT_ANCHOR_DEFAULT.left;
}

/* หมุนตำแหน่งขาไปตามมุมของอุปกรณ์ (ตามเข็ม 90° ต่อครั้ง)
   หมุนจาก "ค่าตั้งต้น" ทุกครั้ง ไม่ใช่หมุนต่อจากค่าปัจจุบัน ค่าจึงไม่เพี้ยนสะสม
   ตามเข็ม 90°: (x,y) → (−y,x)   เช่น ขาขวา (2,0) → (0,2) = ไปอยู่ก้น */
function rotatePortAnchor(a, deg){
  var turn = {left:'top', top:'right', right:'bottom', bottom:'left'};
  var x = a.x, y = a.y, f = a.face;
  var n = (((deg||0)/90) % 4 + 4) % 4;
  for(var i=0;i<n;i++){ var nx = -y; y = x; x = nx; f = turn[f]; }
  return {x:x, y:y, face:f};
}

/* วางจุดขั้วของอุปกรณ์หนึ่งตัวลงตำแหน่งจริง
   เขียนเป็น inline style เพราะต้องชนะ CSS ทั้งของเดสก์ท็อปและมือถือ
   และต้องล้าง right/bottom ทิ้ง ไม่งั้นค่าจากคลาสทิศเดิมจะตีกับค่าใหม่ */
function layoutPorts(item){
  if(!item || !item.el) return;
  var dev = DEVICES[item.deviceId];
  if(!dev) return;
  var U = portUnit();
  var W = item.el.offsetWidth  || 65;
  var H = item.el.offsetHeight || 65;
  var deg = item.rotation || 0;
  var hasTop = false, hasBottom = false;
  item.el.querySelectorAll('.port').forEach(function(p, idx){
    var name = p.dataset.origPos || dev.ports[idx];
    var v = rotatePortAnchor(portAnchor(item.deviceId, name), deg);
    p.classList.remove('port-left','port-right','port-top','port-bottom');
    p.classList.add('port-' + v.face);
    p.classList.add('port-anchored');
    p.style.left   = (W/2 + v.x*U) + 'px';
    p.style.top    = (H/2 + v.y*U) + 'px';
    p.style.right  = 'auto';
    p.style.bottom = 'auto';
    p.dataset.pos  = v.face;     /* ทิศที่หันออก ใช้ตอนวาดสายไฟ */
    if(v.y >  1.5) hasBottom = true;
    if(v.y < -1.5) hasTop    = true;
  });

  /* ขาที่ลงมาอยู่ใต้กล่อง ไปทับที่ของป้ายชื่ออุปกรณ์พอดี
     ขาที่อยู่เหนือกล่อง ไปทับที่ของป้ายสถานะ ("เสียหาย" / "ฟิวส์ขาด")
     บอก CSS ไว้ให้เลื่อนป้ายหลบ (ดู css/components.css) */
  item.el.classList.toggle('has-port-bottom', hasBottom);
  item.el.classList.toggle('has-port-top',    hasTop);
}

/* วางจุดขั้วใหม่ทั้งกระดาน — เรียกเมื่อขนาดกล่อง/ขนาดช่องเปลี่ยน (ย่อ-ขยายจอ) */
function relayoutAllPorts(){
  if(typeof G === 'undefined' || !G.wsItems) return;
  G.wsItems.forEach(layoutPorts);
}

/* ============================================================
   ESPEC — ค่าทางไฟฟ้า "ของจริง" ของอุปกรณ์แต่ละชนิด
   ใช้โดย js/solver.js ซึ่งแก้สมการวงจรด้วยวิธี Nodal Analysis
   (ตารางนี้คือแหล่งความจริงเรื่องไฟฟ้า ส่วน DEVICES.ohm เก็บไว้
    ให้โค้ดเดิมที่ใช้แค่ "มี/ไม่มีความต้านทาน" ยังทำงานได้)

   kind — แบบจำลองของอุปกรณ์
     source  แหล่งจ่าย: แรงดัน volt + ความต้านทานภายใน rint
             (rint คือเหตุผลที่ลัดวงจรแล้วกระแสไม่เป็นอนันต์)
     res     ความต้านทานคงที่ r
     switch  ความต้านทานต่ำ ron เมื่อสับปิด / เปิดวงจรเมื่อสับเปิด
     fuse    เหมือนสวิตช์ แต่ "ขาดถาวร" เมื่อกระแสเกิน irate
     diode   ไดโอด/LED ใช้สมการช็อกลีย์จริง  I = Is·(e^(V/nVt) − 1)
             จึงนำไฟทางเดียว มีแรงดันเกณฑ์ และสว่างตามกระแสจริง
     cap     ตัวเก็บประจุ คิดการประจุตามเวลาจริง (Backward Euler)
             ที่สภาวะคงตัวจะกั้นไฟตรง = พฤติกรรมจริงของ C
     bus     ทุกขาต่อถึงกันหมด (สายไฟ / แผงต่อวงจร)
     meter   ความต้านทานสูงมาก (โวลต์มิเตอร์ในอุดมคติ)

   imax  กระแสสูงสุดที่ทนได้ (แอมป์) เกินแล้วเริ่มสะสมความร้อน
   pmax  กำลังไฟสูงสุดที่ระบายทิ้งได้ (วัตต์) — เกินแล้วร้อนสะสมเหมือนกัน
         *อุปกรณ์จริงพังเพราะ "ความร้อน" ไม่ใช่เพราะกระแสเพียงอย่างเดียว
          ตัวต้านทาน 1/4 วัตต์ที่กระแสยังไม่ถึงพิกัด ก็ไหม้ได้ถ้ากำลังไฟเกิน
   tburn วินาทีที่ทนได้ก่อนพัง เมื่อโดนหนักเป็น 2 เท่าของพิกัด
         ยิ่งน้อย = พังไว (สารกึ่งตัวนำไวมาก · ขดลวด/ตัวต้านทานทนได้นานกว่า)
   vmax  แรงดันสูงสุดที่ทนได้ (โวลต์) — ตัวเก็บประจุ
   vrev  แรงดันย้อนขั้วที่เริ่มพัง (โวลต์)
   inductive เป็นขดลวด — ตัดไฟกะทันหันแล้วเกิดแรงดันย้อนกลับ (Back-EMF)
   pnom  กำลังไฟที่ถือว่า "สว่างเต็มที่" (วัตต์) — ใช้คิดความสว่าง
   inom  กระแสพิกัด (แอมป์) — ใช้คิดความเร็วมอเตอร์ / ความดังบัซเซอร์
   vf    แรงดันตกคร่อมตอนนำกระแสที่ inom (โวลต์)

   หมายเหตุการปรับค่า: LED เป็นชนิดแรงดันเกณฑ์ต่ำ (~1.65V)
   ถ่าน AA 1.5V จึงจุด LED ได้ "สลัว ๆ" ตามความเป็นจริง
   ส่วน 9V + ตัวต้านทาน 220Ω ให้ ~31mA = สว่างเต็มที่และไม่ไหม้
   ต่อ LED ตรงเข้า 9V โดยไม่มีตัวต้านทาน ~430mA = ไหม้ทันที
   ============================================================ */
var ESPEC = {
  /* ถ่าน/แบตเตอรี่มีพิกัดจ่ายกระแสของตัวเองด้วย ลัดวงจรแล้วตัวมันเองก็ร้อนจัด
     ของจริงถ่านอัลคาไลน์ที่โดนลัดวงจรจะร้อนจนพลาสติกละลาย รั่ว หรือระเบิดได้ */
  battery_aa : {kind:'source', volt:1.5, rint:0.35, imax:1.2, tburn:22},
  battery_9v : {kind:'source', volt:9.0, rint:1.80, imax:0.8, tburn:22},
  transformer: {kind:'source', volt:5.0, rint:0.80, imax:1.5, tburn:26},

  switch     : {kind:'switch', ron:0.02},
  fuse       : {kind:'fuse',   ron:0.05, irate:0.5, tburn:0.10},

  resistor   : {kind:'res', r:220, imax:0.35, pmax:0.25, tburn:10},
  ldr        : {kind:'res', r:150, imax:0.15, pmax:0.15, tburn:4},
  transistor : {kind:'res', r:40,  imax:0.22, pmax:0.35, tburn:2.5},

  diode      : {kind:'diode', vf:0.70, inom:0.10, n:1, rs:0.6,  imax:1.0,  tburn:3,   vrev:75},
  led        : {kind:'diode', vf:1.65, inom:0.02, n:2, rs:15,   imax:0.04, tburn:2.5, vrev:5,
                pnom:0.035, pmax:0.09},

  /* ตัวเก็บประจุอิเล็กโทรไลต์: ทนแรงดันย้อนได้แค่ ~1 โวลต์ เกินกว่านั้นฟิล์มออกไซด์พัง */
  capacitor  : {kind:'cap', c:0.010, rleak:2e6, imax:0.18, vmax:16, vrev:1.0, tburn:3.5},

  /* pnom ของหลอดตั้งให้ "9V ดวงเดียว = สว่างเต็มที่" พอดี
     อนุกรม 2 ดวงจึงหรี่ลงเห็นชัด ส่วนขนาน 2 ดวงสว่างเท่าเดิม
     และถ่าน AA 1.5V ก็ติดแบบสลัว ๆ ตามแรงดันที่ได้จริง
     pmax สูงกว่า pnom อยู่ราว 1.7 เท่า = เผื่อไว้ก่อนไส้หลอดขาด */
  bulb       : {kind:'res', r:80,  pnom:0.90, imax:0.90, pmax:1.55, tburn:3},
  motor      : {kind:'res', r:120, inom:0.07, imax:0.70, pmax:1.50, tburn:8, inductive:true},
  buzzer     : {kind:'res', r:90,  inom:0.05, imax:0.15, pmax:0.60, tburn:4},

  wire       : {kind:'bus'},
  breadboard : {kind:'bus'},
  multimeter : {kind:'meter', r:1e7}
};

/* สายไฟ/รางบนแผง — พิกัดกระแสและเวลาที่ทนได้ก่อนฉนวนละลาย */
var WIRE_IMAX  = 2.0;
var WIRE_TBURN = 3.0;

/* ชื่อตำแหน่งจุดเป็นภาษาไทย */
var THAI_POS = {left:'ซ้าย', right:'ขวา', top:'บน', bottom:'ล่าง'};

/* ============================================================
   ตัวช่วยตั้งชื่อจุด (ใช้ในข้อความแจ้งเตือน/คำใบ้)
   ============================================================ */

/* จากคีย์เฉลย: "battery_aa.right" → "ถ่านไฟฉาย AA (จุดขวา +)" */
function portLabel(key){
  var parts = key.split('.');
  var dev = DEVICES[parts[0]];
  var name = dev ? dev.name : parts[0];
  var posTh = THAI_POS[parts[1]] || parts[1];
  var polMark = '';
  if(dev && dev.polarized){
    if(parts[1]===dev.pos) polMark=' +';
    else if(parts[1]===dev.neg) polMark=' −';
  }
  return name+' (จุด'+posTh+polMark+')';
}

/* จาก item + element ของ port จริงบนพื้นที่ทำงาน */
function ptName(item, portEl){
  var dev = DEVICES[item.deviceId];
  var posTh = THAI_POS[portEl.dataset.origPos] || portEl.dataset.origPos;
  var mark = '';
  if(dev.polarized){
    if(portEl.dataset.origPos===dev.pos) mark=' +';
    else if(portEl.dataset.origPos===dev.neg) mark=' −';
  }
  return dev.name+' (จุด'+posTh+mark+')';
}

/* หา deviceId จาก itemId (ใช้ในข้อความ) */
function itemDeviceId(itemId){
  /* fallback ผ่าน G.wsItems ถ้ามี */
  if(typeof G!=='undefined' && G.wsItems){
    for(var i=0;i<G.wsItems.length;i++){
      if(G.wsItems[i].id===itemId) return G.wsItems[i].deviceId;
    }
  }
  return 'battery_aa';
}
