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
  breadboard:  { name:'Breadboard',    svgId:'dev-breadboard',  type:'tool', ohm:0,    ports:['left','right','top','bottom'] },
  multimeter:  { name:'มัลติมิเตอร์',  svgId:'dev-multimeter',  type:'tool',    ports:['left','right'] },
};

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
