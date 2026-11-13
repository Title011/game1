/* DEVICES — นิยามอุปกรณ์ทั้งหมด
   polarity: polarized:true = มีขั้ว +/− (pos/neg = ตำแหน่ง port) / ไม่ระบุ = ต่อทางไหนก็ได้
   type: source/control/passive/output/wire/tool · ohm: ความต้านทาน (ใช้คิดกระแส/แรงดันในเครื่องวัด) */
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
  /* breadboard นิยามไว้กันของเก่าพัง แต่ไม่แจกให้หยิบแล้ว (พื้นที่ทำงานทั้งผืนคือเบรดบอร์ด — ดู breadboard.js) */
  breadboard:  { name:'Breadboard',    svgId:'dev-breadboard',  type:'tool', ohm:0,    ports:['left','right','top','bottom'] }
  /* ไม่มี multimeter แล้ว — วัดค่าด้วย "โหมดเครื่องวัด" (ปุ่ม M) จิ้มอ่านได้ทุกจุด ไม่กินขา/ไม่กินที่ */
};

/* PORT ANCHORS — ขาอยู่ตรงไหนของตัวจริง
   หน่วยเป็น "ช่อง" (pitch) นับจากกึ่งกลางกล่อง x ขวา+ y ลง+ (ใช้ช่องไม่ใช่ px เพราะเบรดบอร์ดเสียบได้เฉพาะรู
   ระยะขาต้องเป็นจำนวนเต็มช่อง และขนาดช่องวัดตอนรันไทม์เลยเลื่อนตาม CSS/มือถือเอง)
   ค่าปริยาย ±2 ช่อง = ตำแหน่งขอบกล่อง · face = ทิศที่สายออกจากขา (ดู getPortCenter) */
var PORT_ANCHOR_DEFAULT = {
  left  : {x:-2, y: 0, face:'left'},
  right : {x: 2, y: 0, face:'right'},
  top   : {x: 0, y:-2, face:'top'},
  bottom: {x: 0, y: 2, face:'bottom'}
};

/* ใส่เฉพาะตัวที่รูปวาดมีขั้วอยู่ที่อื่นนอกจากซ้าย-ขวา (ค่าอ่านมาจากรูปจริงใน device-symbols.js) */
var PORT_ANCHORS = {
  /* หัวสแนปสองหัวบนฝาด้านบน */
  battery_9v : { left:{x:-0.5, y:-2, face:'top'},    right:{x:0.5, y:-2, face:'top'} },
  /* ขาออกจากก้นขั้วเกลียวทั้งคู่ */
  bulb       : { left:{x:-0.5, y: 2, face:'bottom'}, right:{x:0.5, y: 2, face:'bottom'} },
  /* ขาสองเส้นออกจากก้นกระป๋อง */
  capacitor  : { left:{x:-0.5, y: 2, face:'bottom'}, right:{x:0.5, y: 2, face:'bottom'} },
  /* ขาออกจากก้น พร้อมหัวต่อ +/− */
  buzzer     : { left:{x:-0.5, y: 2, face:'bottom'}, right:{x:0.5, y: 2, face:'bottom'} }
};

/* ขนาดหนึ่งช่อง (px) — วัดจากอุปกรณ์จริงโดย bbMeasurePitch() (เรียกได้แม้ด่านไม่มีเบรดบอร์ด) */
function portUnit(){
  if(typeof BB !== 'undefined' && BB.pitch > 4) return BB.pitch;
  return 19.75;   /* ค่าเดสก์ท็อป เผื่อวัดยังไม่ทัน */
}

function portAnchor(deviceId, portName){
  var t = PORT_ANCHORS[deviceId];
  if(t && t[portName]) return t[portName];
  return PORT_ANCHOR_DEFAULT[portName] || PORT_ANCHOR_DEFAULT.left;
}

/* หมุนตำแหน่งขาตามมุมอุปกรณ์ (หมุนจากค่าตั้งต้นทุกครั้ง ค่าจึงไม่เพี้ยนสะสม)
   ตามเข็ม 90°: (x,y) → (−y,x) เช่น ขาขวา (2,0) → (0,2) = ไปอยู่ก้น */
function rotatePortAnchor(a, deg){
  var turn = {left:'top', top:'right', right:'bottom', bottom:'left'};
  var x = a.x, y = a.y, f = a.face;
  var n = (((deg||0)/90) % 4 + 4) % 4;
  for(var i=0;i<n;i++){ var nx = -y; y = x; x = nx; f = turn[f]; }
  return {x:x, y:y, face:f};
}

/* วางจุดขั้วของอุปกรณ์ลงตำแหน่งจริง (inline style เพื่อชนะ CSS ทั้งเดสก์ท็อป/มือถือ + ล้าง right/bottom) */
function layoutPorts(item){
  if(!item || !item.el) return;
  var dev = DEVICES[item.deviceId];
  if(!dev) return;
  var U = portUnit();
  var W = item.el.offsetWidth  || 65;
  var H = item.el.offsetHeight || 65;
  var deg = item.rotation || 0;
  var occ = {top:false, bottom:false, left:false, right:false};
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
    /* เกณฑ์ 1.5 ช่อง = ขาที่ออกถึงริมกล่องจริง (ไม่นับขาก้นหลอดที่เยื้องกลางนิดเดียว x=±0.5) */
    if(v.y >  1.5) occ.bottom = true;
    if(v.y < -1.5) occ.top    = true;
    if(v.x >  1.5) occ.right  = true;
    if(v.x < -1.5) occ.left   = true;
  });

  /* ขาใต้กล่องไปทับป้ายชื่อ ขาเหนือกล่องไปทับป้ายสถานะ — บอก CSS ให้เลื่อนป้ายหลบ */
  item.el.classList.toggle('has-port-bottom', occ.bottom);
  item.el.classList.toggle('has-port-top',    occ.top);

  /* ปุ่มคัดลอกไปอยู่กึ่งกลางขอบด้านที่ไม่มีขา (ขอบมีขา = ทางสายวิ่ง ปุ่มไปตั้งก็บัง)
     ไล่ บน→ขวา→ซ้าย→ล่าง (ล่างสุดท้าย เพราะใต้กล่องมีป้ายชื่อ + ป้ายใบ้ R ซ้อนอยู่) */
  var free = 'top';
  ['top','right','left','bottom'].some(function(f){
    if(occ[f]) return false;
    free = f; return true;
  });
  item.el.classList.remove('dup-top','dup-right','dup-left','dup-bottom');
  item.el.classList.add('dup-' + free);
}

/* วางจุดขั้วใหม่ทั้งกระดาน — เรียกเมื่อขนาดกล่อง/ช่องเปลี่ยน (ย่อ-ขยายจอ) */
function relayoutAllPorts(){
  if(typeof G === 'undefined' || !G.wsItems) return;
  G.wsItems.forEach(layoutPorts);
}

/* ESPEC — ค่าทางไฟฟ้า "ของจริง" ใช้โดย solver.js (Nodal Analysis) เป็นแหล่งความจริงเรื่องไฟฟ้า
   kind: source (volt + rint ภายใน · rint คือเหตุผลที่ลัดวงจรแล้วกระแสไม่อนันต์) / res / switch /
         fuse (ขาดถาวรเมื่อเกิน irate) / diode (สมการช็อกลีย์ นำทางเดียว) / cap (ประจุตามเวลา กั้น DC ที่คงตัว) /
         bus (ทุกขาต่อถึงกัน) / meter (ความต้านทานสูงมาก)
   imax กระแสสูงสุด · pmax กำลังสูงสุด (จริงพังเพราะความร้อน ไม่ใช่กระแสอย่างเดียว) · tburn วินาทีที่ทนก่อนพังเมื่อโดน 2 เท่าพิกัด
   vmax/vrev แรงดันสูงสุด/ย้อนขั้ว · inductive ขดลวด (ตัดไฟเกิด Back-EMF) · pnom/inom/vf ค่าตอนทำงานเต็มที่ */
var ESPEC = {
  /* ถ่าน/แบตมีพิกัดจ่ายกระแสเอง ลัดวงจรแล้วตัวมันร้อนจัด (อัลคาไลน์จริงอาจละลาย/รั่ว/ระเบิดได้) */
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

  /* ตัวเก็บประจุอิเล็กโทรไลต์: ทนแรงดันย้อนแค่ ~1V เกินกว่านั้นฟิล์มออกไซด์พัง */
  capacitor  : {kind:'cap', c:0.010, rleak:2e6, imax:0.18, vmax:16, vrev:1.0, tburn:3.5},

  /* pnom ตั้งให้ 9V ดวงเดียว = สว่างเต็มที่ (อนุกรม 2 ดวงหรี่ชัด / ขนาน 2 ดวงเท่าเดิม / AA 1.5V ติดสลัว)
     pmax สูงกว่า pnom ~1.7 เท่า เผื่อก่อนไส้หลอดขาด */
  bulb       : {kind:'res', r:80,  pnom:0.90, imax:0.90, pmax:1.55, tburn:3},
  motor      : {kind:'res', r:120, inom:0.07, imax:0.70, pmax:1.50, tburn:8, inductive:true},
  buzzer     : {kind:'res', r:90,  inom:0.05, imax:0.15, pmax:0.60, tburn:4},

  wire       : {kind:'bus'},
  breadboard : {kind:'bus'}
  /* kind:'meter' ยังรองรับใน solver.js เผื่ออนาคต แต่ตอนนี้ไม่มีอุปกรณ์ไหนใช้ */
};

/* ค่าตัวต้านทานที่เลือกได้ในโหมดอิสระ — อนุกรม E12 มาตรฐาน 10% (ไม่มีค่ามั่วๆ อย่าง 200Ω/500Ω)
   เลือกเฉพาะช่วงที่มีผลกับวงจร (ต่ำกว่า 10Ω เกือบต่อตรง / สูงกว่า 10kΩ กระแสเหลือไมโครแอมป์) */
var RESISTOR_OHMS = [10, 22, 47, 68, 100, 150, 220, 330, 470, 680,
                     1000, 1500, 2200, 3300, 4700, 10000];

/* รหัสสีตัวต้านทาน IEC 60062 (ตำแหน่งใน array = ตัวเลขที่แถบนั้นแทน) */
var OHM_BAND_COLORS = [
  '#1a1a1a',  /* 0 ดำ     */
  '#8b4513',  /* 1 น้ำตาล */
  '#c0392b',  /* 2 แดง    */
  '#e67e22',  /* 3 ส้ม     */
  '#f1c40f',  /* 4 เหลือง */
  '#27ae60',  /* 5 เขียว   */
  '#2980b9',  /* 6 น้ำเงิน */
  '#8e44ad',  /* 7 ม่วง    */
  '#95a5a6',  /* 8 เทา    */
  '#ecf0f1'   /* 9 ขาว    */
];

/* ค่าความต้านทาน → สี 3 แถบ [หลักแรก, หลักสอง, ตัวคูณ]
   ทุกค่าเป็น 2 หลักคูณกำลังสิบ เลยหารสิบจนเหลือสองหลัก จำนวนครั้งที่หาร = แถบตัวคูณ
   เช่น 4700 → 470 → 47 (หาร 2) = เหลือง ม่วง แดง */
function ohmBands(v){
  var m = v, exp = 0;
  while(m >= 100){ m /= 10; exp++; }
  var d1 = Math.floor(m / 10);
  var d2 = Math.round(m - d1 * 10);
  return [OHM_BAND_COLORS[d1] || OHM_BAND_COLORS[0],
          OHM_BAND_COLORS[d2] || OHM_BAND_COLORS[0],
          OHM_BAND_COLORS[Math.min(9, exp)]];
}

/* ค่าความจุเป็นไมโครฟารัด — 0.010 F → "10000µF" */
function fmtFarad(c){
  var uf = (c || 0) * 1e6;
  return (uf >= 1000 ? Math.round(uf) : +uf.toFixed(1)) + 'µF';
}

/* "ค่าจริงของชิ้นนี้" แบบสั้น ต่อท้ายชื่ออุปกรณ์ในเครื่องวัด/รายงาน
   (ชื่อบนแผงต้องสั้นเพราะ nowrap / ค่าจริงไว้ตอนรายงาน) */
function deviceSpecLabel(it){
  if(!it) return '';
  if(it.ohms != null) return ' ' + fmtOhm(it.ohms);
  var sp = ESPEC[it.deviceId];
  if(sp && sp.kind === 'cap') return ' ' + fmtFarad(sp.c) + ' ' + sp.vmax + 'V';
  return '';
}

/* 220 → "220Ω" · 4700 → "4.7kΩ" (ตัดศูนย์ท้ายทิ้ง) */
function fmtOhm(v){
  if(v >= 1000){
    var k = v / 1000;
    return (k === Math.round(k) ? k : k.toFixed(1)) + 'kΩ';
  }
  return v + 'Ω';
}

/* ค่าทางไฟฟ้าของ "ชิ้นนี้" ไม่ใช่ของชนิดนี้
   ตัวต้านทานในโหมดอิสระเลือก it.ohms เองได้ ต้องไปแทน r ใน ESPEC เฉพาะชิ้น ไม่แตะค่ากลาง
   (pmax/imax/tburn ไม่เปลี่ยน · เก็บผลโคลนบนตัวชิ้น เพราะ solveCircuit ถูกเรียก ~20 ครั้ง/วิ) */
function itemSpec(it){
  var sp = ESPEC[it && it.deviceId];
  if(!sp || !it) return sp;
  if(it.ohms == null || sp.r == null || it.ohms === sp.r) return sp;
  if(it._specOhms !== it.ohms){
    it._specOhms = it.ohms;
    it._spec = Object.assign({}, sp, {r: it.ohms});
  }
  return it._spec;
}

/* สายไฟ/ราง — พิกัดกระแสและเวลาที่ทนก่อนฉนวนละลาย */
var WIRE_IMAX  = 2.0;
var WIRE_TBURN = 3.0;

/* ชื่อตำแหน่งจุดเป็นภาษาไทย */
var THAI_POS = {left:'ซ้าย', right:'ขวา', top:'บน', bottom:'ล่าง'};

/* ตัวช่วยตั้งชื่อจุด (ใช้ในข้อความแจ้งเตือน/คำใบ้) */

/* หา deviceId จาก itemId (ใช้ในข้อความ) */
function itemDeviceId(itemId){
  if(typeof G!=='undefined' && G.wsItems){
    for(var i=0;i<G.wsItems.length;i++){
      if(G.wsItems[i].id===itemId) return G.wsItems[i].deviceId;
    }
  }
  return 'battery_aa';
}
