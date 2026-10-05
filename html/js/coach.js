/* ============================================================
   COACH — ด่านสอนแบบจับมือทำ (สอนต่างกันระหว่างมือถือกับคอม)

   ทำไมต้องมี: คู่มือเดิมเป็นหน้าอ่านอย่างเดียว บอกว่า "ลากจากขาหนึ่งไป
   อีกขาหนึ่ง" ซึ่งบนมือถือทำแบบนั้นไม่ได้ (ต้องแตะทีละจุด) ผู้เรียนที่เล่น
   บนมือถือจึงติดตั้งแต่สายเส้นแรกโดยไม่รู้ว่าตัวเองทำถูกอยู่แล้ว
   ไฟล์นี้จึงสอน "ท่ากดจริงของเครื่องที่กำลังเล่นอยู่" ทีละขั้น
   และรอจนผู้เรียนทำได้จริงก่อนค่อยไปขั้นถัดไป

   หลักการออกแบบ 3 ข้อ:
     1) ไม่แตะโค้ดเดิม — อ่านสถานะจาก G เอาเอง ไม่ต้องให้ไฟล์อื่นเรียกเข้ามา
        (ถ้าด่านสอนพัง เกมต้องยังเล่นได้ตามปกติ)
     2) ชั้นสอนกดทะลุได้ — ผู้เรียนต้องลากของจริงต่อสายจริงระหว่างที่ป้ายยังอยู่
     3) ไม่มีบทลงโทษ — หยุดนาฬิกาไว้ และคืนชีวิตให้เท่าเดิมเมื่อจบ

   เปิดจาก: ปุ่มในโมดัลคู่มือ · การ์ดชวนเรียนตอนเข้าเกมครั้งแรก
   ============================================================ */

var COACH = {
  on:false,
  idx:0,
  touch:false,          /* true = สอนท่าสำหรับนิ้ว, false = ท่าสำหรับเมาส์ */
  lesson:'basic',       /* basic = ต่อวงจรพื้นฐาน · board = แผงเบรดบอร์ด */
  steps:null,           /* ชุดขั้นของบทเรียนที่กำลังสอนอยู่ */
  poll:null,
  stepDone:false,
  autoT:null,
  scrolledFor:-1,
  prevLevel:0,
  prevLives:3
};

/* จำแยกกันแต่ละบทเรียน — เรียนพื้นฐานไปแล้วไม่ได้แปลว่ารู้เรื่องเบรดบอร์ด */
var COACH_KEYS = { basic:'coach-seen-v1', board:'coach-board-seen-v1' };
var COACH_KEY = COACH_KEYS.basic;   /* ชื่อเดิม เผื่อมีที่อื่นอ้างถึง */

/* ขั้นของบทเรียนที่กำลังเปิดอยู่ (ยังไม่เปิด = ชุดพื้นฐาน) */
function coachSteps(){ return COACH.steps || COACH_STEPS; }

/* ---------- ตรวจว่าเครื่องนี้เล่นด้วยนิ้วหรือเมาส์ ----------
   ใช้ pointer:coarse เป็นหลัก เพราะโน้ตบุ๊กจอสัมผัสจะรายงาน ontouchstart
   ว่ามีทั้งที่ผู้ใช้จริง ๆ ใช้เมาส์ — ถามระบบว่า "ตัวชี้หลักหยาบไหม" ตรงกว่า
   เดาผิดได้เสมอ จึงมีปุ่มสลับให้ผู้เรียนกดเองอยู่บนกล่องสอนตลอดเวลา */
function coachDetectTouch(){
  try{
    if(window.matchMedia){
      if(window.matchMedia('(pointer: coarse)').matches) return true;
      if(window.matchMedia('(pointer: fine)').matches)   return false;
    }
  }catch(e){}
  return ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
}

/* ผู้เล่นเคยกดแก้เองไหมว่าใช้เครื่องแบบไหน — ถ้าเคย เชื่อคนมากกว่าเชื่อการเดา */
var COACH_PLAT_KEY = 'coach-platform-v1';
function coachPlatformTouch(){
  try{
    var v = localStorage.getItem(COACH_PLAT_KEY);
    if(v === 'touch') return true;
    if(v === 'mouse') return false;
  }catch(e){}
  return coachDetectTouch();
}

/* ติดธงไว้ที่ <body> ให้ทั้งเกมใช้ร่วมกัน ไม่ใช่แค่ด่านสอน
   ข้อความแนะนำบนพื้นที่ทำงานจะได้เลือกสำนวนให้ตรงเครื่องด้วย (ดู css/coach.css)
   บอกคีย์ลัดกับคนที่ไม่มีแป้นพิมพ์ = คำแนะนำที่ทำตามไม่ได้ แถมกินที่บนจอแคบ */
function coachApplyPlatform(touch){
  document.body.classList.toggle('is-touch', !!touch);
  document.body.classList.toggle('is-mouse', !touch);
}

/* ---------- ตัวช่วยอ่านสถานะเกม ---------- */
function coachHas(deviceId){
  return (G.wsItems || []).some(function(i){ return i.deviceId === deviceId; });
}
/* นับเฉพาะสายที่ผู้เล่นเดินเอง — สายเสมือนในรางเบรดบอร์ดไม่นับ
   ไม่งั้นขั้น "ต่อสายเส้นแรก" จะผ่านเองตั้งแต่ยังไม่ได้ต่ออะไร */
function coachWires(){
  return (G.wires || []).filter(function(w){ return !w.virtual; }).length;
}
function coachResultOpen(){
  var m = document.getElementById('modal-result');
  return !!(m && m.classList.contains('open'));
}
function coachFirstPort(){
  return document.querySelector('#workspace .ws-item .port');
}
function coachEl(id){ return document.getElementById(id); }

/* ตัวอุปกรณ์ที่วางอยู่บนแผง — ใช้เป็นจุดไฮไลต์ของขั้นเดินสาย
   ชี้ไปที่อุปกรณ์ต้นทางแทนที่จะชี้พื้นที่ทำงานทั้งผืน เพราะถ้าชี้ทั้งผืน
   กล่องข้อความจะไปวางกลางแผงแล้วบังอุปกรณ์ที่กำลังบอกให้ต่อพอดี */
function coachItemEl(deviceId){
  var it = (G.wsItems || []).filter(function(i){ return i.deviceId === deviceId; })[0];
  return (it && it.el && document.body.contains(it.el)) ? it.el : coachEl('workspace');
}

/* ============================================================
   บทเรียน — ข้อความแยกสองสำนวนตามเครื่องที่เล่น

     title  หัวข้อสั้น
     text   {mouse, touch} หรือสตริงเดียวถ้าเหมือนกันทั้งสองแบบ
     target ฟังก์ชันคืน element ที่จะไฮไลต์ (คืน null = หรี่จอเฉย ๆ)
     done   ฟังก์ชันคืน true เมื่อผู้เรียนทำขั้นนี้สำเร็จ (ไม่มี = ขั้นอ่านอย่างเดียว)
     auto   true = พอทำสำเร็จแล้วเลื่อนไปขั้นถัดไปให้เอง
     hint   ข้อความเล็ก ๆ ตอนทำสำเร็จ
   ============================================================ */
var COACH_STEPS = [
  {
    title:'สวัสดี! มาต่อวงจรแรกด้วยกัน',
    text:{
      mouse:'ขั้นตอนทั้งหมดใช้เวลาประมาณ 2 นาที จบแล้วคุณจะต่อวงจรเป็นและรู้คีย์ลัดที่ใช้บ่อย<br><br>ระหว่างนี้ <b>นาฬิกาหยุดเดิน</b> และ <b>ไม่เสียชีวิต</b> ลองผิดได้เต็มที่',
      touch:'ขั้นตอนทั้งหมดใช้เวลาประมาณ 2 นาที จบแล้วคุณจะต่อวงจรเป็นและรู้ท่าแตะที่ใช้บ่อย<br><br>ระหว่างนี้ <b>นาฬิกาหยุดเดิน</b> และ <b>ไม่เสียชีวิต</b> ลองผิดได้เต็มที่'
    },
    target:function(){ return null; }
  },
  {
    title:'โจทย์อยู่ตรงนี้เสมอ',
    text:'แถบนี้บอกว่าด่านนี้ต้องทำอะไร และ<b>ผลที่ควรเกิด</b>เมื่อต่อถูก<br><br>อ่านตรงนี้ก่อนเริ่มทุกครั้ง จะได้รู้ว่ากำลังต่ออะไรอยู่',
    target:function(){ return coachEl('level-goal'); }
  },
  {
    title:'คลังอุปกรณ์',
    text:{
      mouse:'ของที่ด่านนี้ให้มาอยู่ในคลังด้านซ้าย ตัวเลขข้างชื่อคือ<b>จำนวนที่เหลือ</b><br><br>ด่านนี้ให้มา 2 อย่าง: ถ่านไฟฉาย กับ หลอดไฟ',
      touch:'ของที่ด่านนี้ให้มาอยู่ในคลัง ตัวเลขข้างชื่อคือ<b>จำนวนที่เหลือ</b><br><br>ด่านนี้ให้มา 2 อย่าง: ถ่านไฟฉาย กับ หลอดไฟ'
    },
    target:function(){ return coachEl('inventory'); }
  },
  {
    title:'ลองวางถ่านไฟฉายดู',
    text:{
      mouse:'<b>กดเมาส์ค้าง</b>ที่ <b>ถ่านไฟฉาย AA</b> ในคลัง แล้ว<b>ลาก</b>มาปล่อยบนพื้นที่ทำงานสีเข้มตรงกลาง',
      touch:'<b>แตะค้าง</b>ที่ <b>ถ่านไฟฉาย AA</b> แล้ว<b>ลากนิ้ว</b>มาปล่อยบนพื้นที่ทำงานตรงกลาง<br><br>(ยกนิ้วขึ้นตรงไหน อุปกรณ์จะไปอยู่ตรงนั้น)'
    },
    target:function(){ return coachEl('inv-battery_aa'); },
    done:function(){ return coachHas('battery_aa'); },
    hint:'วางถ่านได้แล้ว!',
    auto:true
  },
  {
    title:'วางหลอดไฟต่อเลย',
    text:{
      mouse:'ทำแบบเดิมกับ <b>หลอดไฟ</b> — ลากมาวางห่างจากถ่านสักหน่อย จะได้เดินสายง่าย',
      touch:'ทำแบบเดิมกับ <b>หลอดไฟ</b> — ลากมาวางห่างจากถ่านสักหน่อย จะได้แตะต่อสายง่าย'
    },
    target:function(){ return coachEl('inv-bulb'); },
    done:function(){ return coachHas('bulb'); },
    hint:'ครบ 2 ชิ้นแล้ว!',
    auto:true
  },
  {
    title:'จุดสีเหลือง = ขั้วอุปกรณ์',
    text:'จุดเล็ก ๆ สีเหลืองที่ติดอยู่กับอุปกรณ์คือ <b>ขั้ว</b> — เป็นที่เดียวที่ต่อสายได้<br><br>อุปกรณ์ทุกชิ้นในเกมนี้มี 2 ขั้ว ไฟต้อง<b>เข้าขั้วหนึ่ง ออกอีกขั้วหนึ่ง</b>',
    target:function(){ return coachFirstPort(); }
  },
  {
    title:'เดินสายเส้นแรก',
    text:{
      mouse:'<b>กดเมาส์ค้าง</b>ที่จุดสีเหลืองของ<b>ถ่าน</b> แล้ว<b>ลากไปปล่อย</b>ที่จุดสีเหลืองของ<b>หลอดไฟ</b><br><br>จะเห็นเส้นสายวิ่งตามเมาส์ระหว่างลาก',
      touch:'<b>แตะ</b>ที่จุดสีเหลืองของ<b>ถ่าน</b> 1 ครั้ง (จุดจะเรืองแสงค้างไว้)<br>แล้ว<b>แตะ</b>ที่จุดสีเหลืองของ<b>หลอดไฟ</b> อีก 1 ครั้ง<br><br>แตะจุดเดิมซ้ำ = ยกเลิก'
    },
    target:function(){ return coachItemEl('battery_aa'); },
    done:function(){ return coachWires() >= 1; },
    hint:'ต่อสายเส้นแรกได้แล้ว!',
    auto:true
  },
  {
    title:'อีกเส้นให้ครบวง',
    text:{
      mouse:'ตอนนี้ไฟยังไหลไม่ครบรอบ ต้องมีทางกลับด้วย<br><br>ต่ออีกเส้นจาก<b>ขั้วที่เหลือ</b>ของหลอดไฟ กลับไปที่<b>ขั้วที่เหลือ</b>ของถ่าน',
      touch:'ตอนนี้ไฟยังไหลไม่ครบรอบ ต้องมีทางกลับด้วย<br><br>แตะ<b>ขั้วที่เหลือ</b>ของหลอดไฟ แล้วแตะ<b>ขั้วที่เหลือ</b>ของถ่าน'
    },
    target:function(){ return coachItemEl('bulb'); },
    done:function(){ return coachWires() >= 2; },
    hint:'ครบวงแล้ว — นี่คือ "วงจรปิด"',
    auto:true
  },
  {
    title:'ต่อผิดก็แก้ได้',
    text:{
      mouse:'<b>คลิกที่เส้นสาย</b> = ลบเส้นนั้น (คลิกขวาก็ได้)<br>กด <span class="k">Ctrl</span>+<span class="k">Z</span> = ย้อนกลับก้าวล่าสุด<br><br>ไม่ต้องกลัวพลาด ทุกอย่างย้อนได้',
      touch:'<b>แตะที่เส้นสาย</b> = ลบเส้นนั้น<br>ปุ่ม <b>↶ ย้อน</b> มุมซ้ายบนของพื้นที่ทำงาน = ย้อนกลับก้าวล่าสุด<br><br>ไม่ต้องกลัวพลาด ทุกอย่างย้อนได้'
    },
    target:function(){ return coachEl('history-bar'); }
  },
  {
    title:'กดตรวจวงจร',
    text:{
      mouse:'พร้อมแล้วกดปุ่ม <b>ตรวจวงจร</b> (หรือกดคีย์ <span class="k">C</span>)<br><br>เกมจะจ่ายไฟจริงแล้วบอกว่าเกิดอะไรขึ้น',
      touch:'พร้อมแล้วแตะปุ่ม <b>ตรวจวงจร</b> ที่แถบล่าง<br><br>เกมจะจ่ายไฟจริงแล้วบอกว่าเกิดอะไรขึ้น'
    },
    target:function(){ return document.querySelector('#action-bar .btn-check'); },
    done:function(){ return coachResultOpen(); },
    hint:'ผลตรวจออกมาแล้ว!',
    auto:true
  },
  {
    title:'จบแล้ว — เล่นเองได้เลย',
    text:{
      mouse:'ท่าที่ใช้บ่อยบนคอม:<br>' +
            '<span class="k">C</span> ตรวจวงจร &nbsp; <span class="k">R</span> หมุน &nbsp; <span class="k">S</span> สับสวิตช์<br>' +
            '<span class="k">M</span> เครื่องวัด &nbsp; <span class="k">H</span> คู่มือ &nbsp; <span class="k">Del</span> ลบ<br>' +
            '<span class="k">Ctrl</span>+<span class="k">Z</span> ย้อน &nbsp; <span class="k">Ctrl</span>+<span class="k">A</span> เลือกทั้งหมด<br><br>' +
            'ลากกรอบบนพื้นที่ว่าง = เลือกหลายชิ้นพร้อมกัน',
      touch:'ท่าที่ใช้บ่อยบนมือถือ:<br>' +
            '• <b>แตะอุปกรณ์ 1 ครั้ง</b> → มีแถบปุ่ม หมุน/ลบ โผล่มาให้<br>' +
            '• <b>แตะป้าย ON/OFF</b> บนสวิตช์ = สับสวิตช์<br>' +
            '• <b>แตะเส้นสาย</b> = ลบสายเส้นนั้น<br>' +
            '• ปุ่ม <b>↶ ย้อน</b> มุมซ้ายบน = แก้ที่กดพลาด<br><br>' +
            'หมุนเครื่องเป็นแนวนอนจะได้พื้นที่ต่อวงจรกว้างขึ้นมาก'
    },
    target:function(){ return null; }
  }
];

/* ============================================================
   บทเรียนที่ 2 — แผงเบรดบอร์ด

   ด่านสุดท้ายเปลี่ยนพื้นที่ทำงานเป็นแผงจริง กติกาการต่อเปลี่ยนไปทั้งหมด
   (ขาที่อยู่รางเดียวกันต่อถึงกันเองโดยไม่ต้องเดินสาย) ผู้เล่นที่เพิ่งผ่าน
   19 ด่านมาด้วยวิธีเดินสายทุกเส้น จะงงทันทีถ้าไม่มีใครบอก
   เนื้อหาอ้างอิงจากหัวไฟล์ js/breadboard.js
   ============================================================ */
function coachBoardLevel(){
  for(var i=0;i<LEVELS.length;i++) if(LEVELS[i] && LEVELS[i].board) return i;
  return -1;
}

var COACH_BOARD_STEPS = [
  {
    title:'ด่านนี้พื้นที่ทำงานคือแผงจริง',
    text:'19 ด่านที่ผ่านมา วางตรงไหนก็ได้แล้วเดินสายเองทุกเส้น<br><br>' +
         'ด่านนี้ต่างออกไป — พื้นที่ทั้งผืนคือ <b>เบรดบอร์ด</b><br>' +
         'ข้างในมันมีทางเชื่อมซ่อนอยู่แล้ว ทำให้ต้องเดินสายน้อยลงมาก',
    target:function(){ return coachEl('workspace'); }
  },
  {
    title:'รูในคอลัมน์เดียวกัน = จุดเดียวกัน',
    text:'ตรงกลางแผงมีแถว <b>A-E</b> (ครึ่งบน) และ <b>F-J</b> (ครึ่งล่าง)<br><br>' +
         'ใน<b>คอลัมน์เดียวกันของครึ่งเดียวกัน</b> ทั้ง 5 รูต่อถึงกันข้างใน<br>' +
         'เสียบขาอุปกรณ์ 2 ชิ้นลงคอลัมน์เดียวกัน = <b>ต่อถึงกันแล้ว ไม่ต้องเดินสาย</b>',
    target:function(){ return coachEl('workspace'); }
  },
  {
    title:'ร่องกลางคั่นสองครึ่งออกจากกัน',
    text:'ร่องตรงกลางแผงแยก A-E ออกจาก F-J<br><br>' +
         'คอลัมน์เดียวกันแต่<b>คนละครึ่ง</b> = ไม่ต่อถึงกัน<br>' +
         'ของจริงมีร่องนี้ไว้เสียบไอซีคร่อม ขาสองฝั่งจะได้ไม่ลัดถึงกัน',
    target:function(){ return coachEl('workspace'); }
  },
  {
    title:'รางแดง/น้ำเงินยาวตลอดแนว',
    text:'แถวบนสุดและล่างสุดคือ <b>รางจ่ายไฟ</b><br>' +
         'ทั้งรางเป็นจุดเดียวกัน<b>ตลอดความยาว</b> ไม่ได้แบ่งเป็นคอลัมน์<br><br>' +
         '<b style="color:#ff6b6b">แดง</b> = ขั้วบวก &nbsp;·&nbsp; ' +
         '<b style="color:#4da3ff">น้ำเงิน</b> = ขั้วลบ',
    target:function(){ return coachEl('workspace'); }
  },
  {
    title:'ลองเสียบแบตเตอรี่ลงแผง',
    text:{
      mouse:'<b>ลาก แบตเตอรี่ 9V</b> จากคลังมาวางบนแผง<br><br>' +
            'ไม่ต้องเล็งให้ตรงรู — ขาจะ<b>ลงรูที่ใกล้ที่สุดให้เอง</b>',
      touch:'<b>แตะค้างแล้วลาก แบตเตอรี่ 9V</b> มาวางบนแผง<br><br>' +
            'ไม่ต้องเล็งให้ตรงรู — ขาจะ<b>ลงรูที่ใกล้ที่สุดให้เอง</b>'
    },
    target:function(){ return coachEl('inv-battery_9v'); },
    done:function(){ return coachHas('battery_9v'); },
    hint:'ขาลงรูเรียบร้อย!',
    auto:true
  },
  {
    title:'รางที่เชื่อมแล้วจะเรืองแสง',
    text:{
      mouse:'ดูรางที่ขาของแบตเตอรี่เสียบอยู่ — มัน<b>เรืองแสง</b>ขึ้นมา<br>' +
            'นั่นคือสัญญาณว่า "ตรงนี้ต่อถึงกันแล้ว"<br><br>' +
            'เอาเมาส์<b>ชี้ค้าง</b>ที่ขา จะบอกด้วยว่าเสียบอยู่แถวไหน ช่องที่เท่าไร',
      touch:'ดูรางที่ขาของแบตเตอรี่เสียบอยู่ — มัน<b>เรืองแสง</b>ขึ้นมา<br>' +
            'นั่นคือสัญญาณว่า "ตรงนี้ต่อถึงกันแล้ว"<br><br>' +
            'ขาที่ลงรูแล้วจะมีจุดสว่างติดอยู่ ถ้ายังไม่สว่าง แปลว่ายังไม่เข้ารู'
    },
    target:function(){ return coachItemEl('battery_9v'); }
  },
  {
    title:'ยังเดินสายเพิ่มได้ตามปกติ',
    text:{
      mouse:'รางช่วยได้เยอะ แต่บางจุดยังต้องเชื่อมเอง<br>' +
            'ท่าเดิมทุกอย่าง: <b>กดเมาส์ค้างที่ขาหนึ่ง แล้วลากไปปล่อยอีกขาหนึ่ง</b><br><br>' +
            'ถ้าสองขาอยู่รางเดียวกันอยู่แล้ว เกมจะบอกว่าไม่ต้องเดินสายซ้ำ',
      touch:'รางช่วยได้เยอะ แต่บางจุดยังต้องเชื่อมเอง<br>' +
            'ท่าเดิมทุกอย่าง: <b>แตะขาแรก แล้วแตะขาที่สอง</b><br><br>' +
            'ถ้าสองขาอยู่รางเดียวกันอยู่แล้ว เกมจะบอกว่าไม่ต้องเดินสายซ้ำ'
    },
    target:function(){ return coachEl('workspace'); }
  },
  {
    title:'พร้อมลุยด่านสุดท้ายแล้ว',
    text:'สรุปกติกาแผง:<br>' +
         '• คอลัมน์เดียวกัน ครึ่งเดียวกัน = ต่อถึงกัน<br>' +
         '• คนละครึ่ง (คร่อมร่องกลาง) = ไม่ถึงกัน<br>' +
         '• รางแดง/น้ำเงิน = ถึงกันตลอดแนว<br><br>' +
         'ด่านนี้ต้องต่อ LED · มอเตอร์ · บัซเซอร์ เรียงอนุกรมในวงเดียว ' +
         'ใช้รางช่วยจะเดินสายน้อยลงเยอะ',
    target:function(){ return null; }
  }
];

/* ============================================================
   เปิด / ปิด
   ============================================================ */
function startCoach(lesson){
  if(COACH.on) return;
  lesson = (lesson === 'board') ? 'board' : 'basic';

  /* แต่ละบทเรียนผูกกับด่านที่มีอุปกรณ์/พื้นที่ตรงกับเนื้อหา
       basic → ด่าน 1 (ถ่าน + หลอด, พื้นที่ว่าง)
       board → ด่านที่พื้นที่ทำงานเป็นแผงเบรดบอร์ด
     จำด่านเดิมไว้ พอเรียนจบจะพากลับไปที่เดิมให้ */
  var wantLevel = (lesson === 'board') ? coachBoardLevel() : 0;
  if(wantLevel < 0) return;                 /* ไม่มีด่านแผง = ไม่ต้องสอนเรื่องแผง */

  COACH.lesson = lesson;
  COACH.steps  = (lesson === 'board') ? COACH_BOARD_STEPS : COACH_STEPS;
  COACH.prevLevel = G.level || 0;
  if(G.sandbox && typeof exitSandbox === 'function') exitSandbox();
  if(G.endless && typeof endEndlessRun === 'function') endEndlessRun('เข้าด่านสอน');
  if(typeof closeModal === 'function') closeModal('modal-tutorial');
  if(typeof showScreen === 'function') showScreen('screen-game');
  /* บทแผง: ถ้าอยู่ด่านนั้นอยู่แล้วไม่ต้องโหลดซ้ำ ผู้เล่นอาจวางของไว้บ้างแล้ว */
  if(typeof loadLevel === 'function' && (lesson !== 'board' || G.level !== wantLevel)){
    loadLevel(wantLevel);
  }

  /* หยุดนาฬิกา — ผู้เรียนต้องได้อ่านโดยไม่มีเวลาไล่หลัง */
  clearInterval(G.timerInt);
  G.timerInt = null;
  var t = coachEl('timer-display');
  if(t){ t.textContent = 'สอน'; t.classList.remove('warning'); }

  COACH.prevLives = G.lives;
  COACH.on = true;
  COACH.idx = 0;
  COACH.touch = coachPlatformTouch();
  coachApplyPlatform(COACH.touch);   /* ธงที่ body กับสำนวนในกล่องต้องตรงกันเสมอ */
  COACH.scrolledFor = -1;
  coachBuildDom();
  coachHideInvite();
  coachRender();
  COACH.poll = setInterval(coachTick, 250);
  window.addEventListener('resize', coachReposition);
}

function stopCoach(finished){
  if(!COACH.on) return;
  COACH.on = false;
  clearInterval(COACH.poll); COACH.poll = null;
  clearTimeout(COACH.autoT); COACH.autoT = null;
  window.removeEventListener('resize', coachReposition);
  var box = coachEl('coach');
  if(box) box.hidden = true;

  var key = COACH_KEYS[COACH.lesson] || COACH_KEYS.basic;
  try{ localStorage.setItem(key, finished ? 'done' : 'skipped'); }catch(e){}

  /* ด่านสอนต้องไม่มีบทลงโทษ — คืนชีวิตเท่าที่มีก่อนเข้ามา
     (คะแนนกับด่านที่ผ่านไม่คืน เพราะถ้าต่อผ่านจริงก็ควรได้ไปตามจริง) */
  if(G.lives < COACH.prevLives) G.lives = COACH.prevLives;

  if(typeof closeModal === 'function') closeModal('modal-result');
  if(typeof loadLevel === 'function') loadLevel(COACH.prevLevel || 0);
  if(typeof showToast === 'function'){
    showToast(finished ? 'จบด่านสอนแล้ว — ลองเล่นเองได้เลย' : 'ออกจากด่านสอนแล้ว',
              finished ? 'success' : '');
  }
}

function coachSkip(){ stopCoach(false); }

/* ปุ่มในโมดัลคู่มือ — เลือกบทให้ตรงกับด่านที่กำลังเล่นอยู่
   อยู่ด่านแผงก็สอนเรื่องแผง ที่เหลือสอนพื้นฐานการต่อวงจร */
function coachFromMenu(){
  var b = coachBoardLevel();
  startCoach((b >= 0 && G.level === b) ? 'board' : 'basic');
}

function coachNext(){
  if(COACH.idx >= coachSteps().length - 1){ stopCoach(true); return; }
  COACH.idx++;
  coachRender();
}
function coachPrev(){
  if(COACH.idx <= 0) return;
  COACH.idx--;
  coachRender();
}

/* สลับสำนวนการสอนเอง เผื่อระบบเดาเครื่องผิด
   จำไว้ด้วย และให้มีผลกับข้อความแนะนำทั้งเกม ไม่ใช่แค่กล่องสอนกล่องเดียว */
function coachTogglePlatform(){
  COACH.touch = !COACH.touch;
  try{ localStorage.setItem(COACH_PLAT_KEY, COACH.touch ? 'touch' : 'mouse'); }catch(e){}
  coachApplyPlatform(COACH.touch);
  coachRender();
}

/* ============================================================
   สร้างชั้นสอน (สร้างครั้งเดียว แล้วใช้ซ้ำ)
   ============================================================ */
function coachBuildDom(){
  var box = coachEl('coach');
  if(box){ box.hidden = false; return; }
  box = document.createElement('div');
  box.id = 'coach';
  box.innerHTML =
      '<div id="coach-ring"></div>'
    + '<div id="coach-arrow" class="hide"></div>'
    + '<div id="coach-bubble">'
    +   '<div class="coach-head">'
    +     '<span class="coach-step" id="coach-step">1 / 1</span>'
    +     '<button class="coach-plat" id="coach-plat" onclick="coachTogglePlatform()"></button>'
    +   '</div>'
    +   '<div id="coach-title"></div>'
    +   '<div id="coach-text"></div>'
    +   '<div id="coach-done"><span>&#x2713;</span><span id="coach-done-text"></span></div>'
    +   '<div class="coach-foot">'
    +     '<button class="coach-skip" onclick="coachSkip()">ออกจากด่านสอน</button>'
    +     '<span class="coach-spacer"></span>'
    +     '<button class="coach-btn" id="coach-prev" onclick="coachPrev()">&#x25C4; ย้อน</button>'
    +     '<button class="coach-btn primary" id="coach-next" onclick="coachNext()">ถัดไป &#x25BA;</button>'
    +   '</div>'
    + '</div>';
  document.body.appendChild(box);
}

/* ============================================================
   วาดขั้นปัจจุบัน
   ============================================================ */
function coachRender(){
  var steps = coachSteps();
  var s = steps[COACH.idx];
  if(!s) return;
  clearTimeout(COACH.autoT); COACH.autoT = null;
  COACH.stepDone = false;
  COACH.scrolledFor = -1;

  coachEl('coach-step').textContent = (COACH.idx + 1) + ' / ' + steps.length;
  coachEl('coach-plat').textContent = COACH.touch ? 'มือถือ · เปลี่ยน' : 'คอม · เปลี่ยน';
  coachEl('coach-plat').title = COACH.touch
    ? 'กำลังสอนท่าสำหรับหน้าจอสัมผัส — แตะเพื่อเปลี่ยนเป็นท่าสำหรับเมาส์'
    : 'กำลังสอนท่าสำหรับเมาส์ — คลิกเพื่อเปลี่ยนเป็นท่าสำหรับหน้าจอสัมผัส';
  coachEl('coach-title').textContent = s.title;

  var txt = (typeof s.text === 'string') ? s.text : (COACH.touch ? s.text.touch : s.text.mouse);
  coachEl('coach-text').innerHTML = txt;

  var done = coachEl('coach-done');
  done.className = '';
  coachEl('coach-done-text').textContent = s.hint || 'ทำได้แล้ว!';

  coachEl('coach-prev').disabled = (COACH.idx === 0);
  var next = coachEl('coach-next');
  var last = (COACH.idx === steps.length - 1);
  if(s.done){
    /* ขั้นที่ต้องลงมือทำ — ปุ่มถัดไปยังกดไม่ได้จนกว่าจะทำสำเร็จ
       แต่ยังมีปุ่ม "ออกจากด่านสอน" ให้เสมอ ผู้เรียนจึงไม่มีทางติดค้าง */
    next.disabled = true;
    next.textContent = 'รออยู่...';
    next.className = 'coach-btn';
  } else {
    next.disabled = false;
    next.textContent = last ? 'เริ่มเล่นจริง' : 'ถัดไป ►';
    next.className = last ? 'coach-btn go' : 'coach-btn primary';
  }

  coachReposition();
}

/* ============================================================
   จัดตำแหน่งวงไฮไลต์ + กล่องข้อความ
   ============================================================ */
function coachReposition(){
  if(!COACH.on) return;
  var s = coachSteps()[COACH.idx];
  if(!s) return;
  var ring = coachEl('coach-ring');
  var bubble = coachEl('coach-bubble');
  var arrow = coachEl('coach-arrow');
  if(!ring || !bubble) return;

  var el = null;
  try{ el = s.target ? s.target() : null; }catch(e){ el = null; }

  var vw = window.innerWidth, vh = window.innerHeight;
  var narrow = vw <= 760;

  if(!el || !el.getBoundingClientRect){
    ring.className = 'no-target';
    ring.style.top = (vh/2) + 'px'; ring.style.left = (vw/2) + 'px';
    ring.style.width = '0px'; ring.style.height = '0px';
    arrow.className = 'hide';
    bubble.classList.remove('dock-top');
    if(!narrow){
      bubble.style.left = Math.round((vw - bubble.offsetWidth)/2) + 'px';
      bubble.style.top  = Math.round(vh*0.5 - bubble.offsetHeight/2) + 'px';
    }
    return;
  }

  /* เลื่อนจุดที่สอนให้เข้ามาในจอก่อน (ครั้งเดียวต่อขั้น ไม่งั้นจอจะกระตุก) */
  if(COACH.scrolledFor !== COACH.idx){
    COACH.scrolledFor = COACH.idx;
    var pre = el.getBoundingClientRect();
    if(pre.top < 8 || pre.bottom > vh - 8){
      try{ el.scrollIntoView({block:'center', behavior:'smooth'}); }catch(e2){ el.scrollIntoView(); }
    }
  }

  var r = el.getBoundingClientRect();
  var pad = 6;
  var top = Math.max(2, r.top - pad);
  var left = Math.max(2, r.left - pad);
  var w = Math.min(vw - left - 2, r.width + pad*2);
  var h = Math.min(vh - top - 2, r.height + pad*2);

  ring.className = 'pulse';
  ring.style.top = top + 'px';
  ring.style.left = left + 'px';
  ring.style.width = Math.max(0, w) + 'px';
  ring.style.height = Math.max(0, h) + 'px';

  /* จอแคบ: CSS ตรึงกล่องไว้ขอบล่างอยู่แล้ว ไม่ต้องคำนวณตำแหน่ง
     (กล่องที่ลอยตามจุดจะไปบังจุดที่กำลังสอนเองบนจอเล็ก)

     แต่ต้องเช็คอย่างเดียว: จุดที่สอนอยู่ในเขตที่กล่องล่างจะทับไหม
     ขั้น "กดปุ่มตรวจวงจร" ปุ่มอยู่แถบล่างพอดี ถ้าไม่ย้ายกล่องขึ้นข้างบน
     ก็จะกลายเป็นบอกให้กดปุ่มที่ตัวเองบังอยู่ */
  if(narrow){
    arrow.className = 'hide';
    bubble.classList.toggle('dock-top', r.bottom > vh - bubble.offsetHeight - 26);
    return;
  }
  bubble.classList.remove('dock-top');

  var bw = bubble.offsetWidth, bh = bubble.offsetHeight;
  var gap = 16;
  var bt, bl, dir;

  if(r.bottom + gap + bh < vh - 8){            /* ใต้จุด */
    bt = r.bottom + gap; bl = r.left + r.width/2 - bw/2; dir = 'up';
  } else if(r.top - gap - bh > 8){             /* เหนือจุด */
    bt = r.top - gap - bh; bl = r.left + r.width/2 - bw/2; dir = 'down';
  } else if(r.right + gap + bw < vw - 8){      /* ขวาจุด */
    bl = r.right + gap; bt = r.top + r.height/2 - bh/2; dir = 'left';
  } else if(r.left - gap - bw > 8){            /* ซ้ายจุด */
    bl = r.left - gap - bw; bt = r.top + r.height/2 - bh/2; dir = 'right';
  } else {                                      /* ไม่มีที่ว่าง — มุมล่างขวา */
    bl = vw - bw - 16; bt = vh - bh - 16; dir = null;
  }

  bl = Math.max(8, Math.min(bl, vw - bw - 8));
  bt = Math.max(8, Math.min(bt, vh - bh - 8));
  bubble.style.left = Math.round(bl) + 'px';
  bubble.style.top  = Math.round(bt) + 'px';

  if(!dir){ arrow.className = 'hide'; return; }
  arrow.className = dir;
  var ax, ay;
  if(dir === 'up'){    ax = bl + bw/2 - 9; ay = bt - 18; }
  else if(dir === 'down'){ ax = bl + bw/2 - 9; ay = bt + bh; }
  else if(dir === 'left'){ ax = bl - 18; ay = bt + bh/2 - 9; }
  else {                   ax = bl + bw; ay = bt + bh/2 - 9; }
  arrow.style.left = Math.round(ax) + 'px';
  arrow.style.top  = Math.round(ay) + 'px';
}

/* ============================================================
   ลูปตรวจความคืบหน้า

   อ่านสถานะจาก G เอาเองทุก 250ms แทนที่จะให้โค้ดเกมเรียกเข้ามา
   — ด่านสอนจึงไม่ต้องฝังตะขอไว้ในไฟล์อื่นเลยสักจุด
   ============================================================ */
function coachTick(){
  if(!COACH.on) return;

  /* ผู้เรียนออกจากหน้าเกมหรือสลับไปโหมดพิเศษ = เลิกสอน ไม่ตามไปกวน */
  var gameOn = document.getElementById('screen-game');
  if(!gameOn || !gameOn.classList.contains('active') || G.sandbox || G.endless){
    stopCoach(false);
    return;
  }

  coachReposition();

  var s = coachSteps()[COACH.idx];
  if(!s || !s.done || COACH.stepDone) return;

  var ok = false;
  try{ ok = !!s.done(); }catch(e){ ok = false; }
  if(!ok) return;

  /* ไม่เล่นเสียงตรงนี้ — ขั้นที่สำคัญที่สุด (ต่อสาย) เกมมีเสียงของมันอยู่แล้ว
     ใส่เพิ่มจะกลายเป็นเสียงซ้อนกันสองที แถบเขียวก็บอกได้ชัดพอแล้ว */
  COACH.stepDone = true;
  var done = coachEl('coach-done');
  if(done) done.className = 'show';

  var next = coachEl('coach-next');
  var last = (COACH.idx === coachSteps().length - 1);
  if(next){
    next.disabled = false;
    next.textContent = last ? 'เริ่มเล่นจริง' : 'ถัดไป ►';
    next.className = last ? 'coach-btn go' : 'coach-btn primary';
  }
  if(s.auto){
    COACH.autoT = setTimeout(function(){
      if(COACH.on && COACH.stepDone) coachNext();
    }, 1100);
  }
}

/* ============================================================
   การ์ดชวนเรียน — โผล่ครั้งเดียวตอนเข้าเกมครั้งแรก

   ไม่บังคับเปิดด่านสอนเอง เพราะการถูกจับใส่บทเรียนโดยไม่ได้ขอ
   น่ารำคาญกว่าการไม่รู้วิธีเล่น — ถามก่อนแล้วจำคำตอบไว้
   ============================================================ */
function coachSeen(lesson){
  try{ return !!localStorage.getItem(COACH_KEYS[lesson || 'basic']); }catch(e){ return true; }
}
function coachHideInvite(){
  var c = coachEl('coach-invite');
  if(c) c.hidden = true;
}
function coachDismissInvite(lesson){
  try{ localStorage.setItem(COACH_KEYS[lesson || 'basic'], 'declined'); }catch(e){}
  coachHideInvite();
}

/* ลืมว่าเคยเรียน/เคยปฏิเสธไปแล้ว — เรียกจาก clearSave() ตอน "เริ่มใหม่ทั้งหมด"
   เพื่อให้ผู้เล่นคนถัดไปบนเครื่องเดียวกันได้รับการชวนเข้าด่านสอนเหมือนคนแรก
   (ไม่ล้าง coach-platform-v1 เพราะชนิดเครื่องเป็นเรื่องของเครื่อง ไม่ใช่ของคน) */
function coachResetProgress(){
  Object.keys(COACH_KEYS).forEach(function(k){
    try{ localStorage.removeItem(COACH_KEYS[k]); }catch(e){}
  });
  STUCK.shown = false;
  STUCK.level = -1;
  coachHideInvite();
}

var COACH_INVITES = {
  basic:{
    title:'&#x1F393; เพิ่งเล่นครั้งแรกใช่ไหม?',
    text:'มีด่านสอนแบบจับมือทำ สอนตั้งแต่วางอุปกรณ์จนต่อสายครบวง ใช้เวลาประมาณ 2 นาที'
  },
  board:{
    title:'&#x1F50C; ด่านนี้ใช้แผงเบรดบอร์ด',
    text:'พื้นที่ทำงานเปลี่ยนเป็นแผงจริง กติกาการต่อไม่เหมือน 19 ด่านที่ผ่านมา — ขอสอนสั้น ๆ 1 นาทีไหม?'
  }
};

/* การ์ดใบเดียวใช้ซ้ำทุกกรณี — ชวนเรียน, ถามตอนติด ฯลฯ
   actions = [{label, onclick, primary}] */
function coachCard(title, text, actions){
  var c = coachEl('coach-invite');
  if(!c){
    c = document.createElement('div');
    c.id = 'coach-invite';
    document.body.appendChild(c);
  }
  c.innerHTML =
      '<div class="ci-title">' + title + '</div>'
    + '<div class="ci-text">' + text + '</div>'
    + '<div class="ci-row">'
    +   actions.map(function(a){
          return '<button class="coach-btn' + (a.primary ? ' go' : '') + '" onclick="' +
                 a.onclick + '">' + a.label + '</button>';
        }).join('')
    + '</div>';
  c.hidden = false;
}

function coachShowInvite(lesson){
  lesson = (lesson === 'board') ? 'board' : 'basic';
  if(COACH.on || coachSeen(lesson)) return;
  var info = COACH_INVITES[lesson];
  coachCard(info.title, info.text, [
    {label:'สอนเลย', primary:true, onclick:"startCoach('" + lesson + "')"},
    {label:'ไว้ก่อน',               onclick:"coachDismissInvite('" + lesson + "')"}
  ]);
}

/* ============================================================
   ตัวจับว่า "ติด" แล้วยื่นมือให้ก่อน

   ผู้เรียนที่ต่อไม่ได้มักไม่กดปุ่มคู่มือเอง เพราะไม่รู้ว่ามีอะไรให้ดู
   หรือรู้สึกว่าการเปิดคู่มือ = ยอมแพ้ เลยนั่งงงจนเลิกเล่นไปเฉย ๆ

   เงื่อนไข: อยู่ด่านเดิม โดยจำนวนอุปกรณ์/สายไม่ขยับเลยตามเวลาที่กำหนด
   แปลว่าลองแล้วไปต่อไม่ถูก ไม่ใช่กำลังต่ออยู่

   ยื่นให้ครั้งเดียวต่อการเข้าด่านหนึ่งครั้ง ปัดทิ้งได้ และไม่แตะคะแนน
   ============================================================ */
var STUCK = { sig:'', since:0, shown:false, level:-1 };
var STUCK_MS = 75000;

function coachStuckSig(){
  return G.level + '|' + (G.wsItems || []).length + '|' + coachWires();
}

function coachAnyModalOpen(){
  return !!document.querySelector('.modal-overlay.open');
}

function coachStuckDismiss(){
  STUCK.shown = true;
  coachHideInvite();
}
/* เปิดคู่มือประจำด่าน แล้วเก็บการ์ดไป */
function coachStuckOpenGuide(){
  coachStuckDismiss();
  if(typeof openTutorial === 'function') openTutorial();
}
function coachStuckStartLesson(){
  coachStuckDismiss();
  coachFromMenu();
}

function coachWatchTick(){
  /* เงื่อนไขที่ไม่ควรไปกวน */
  if(COACH.on || G.sandbox || G.endless) { STUCK.since = 0; return; }
  var scr = document.getElementById('screen-game');
  if(!scr || !scr.classList.contains('active')) { STUCK.since = 0; return; }
  if(coachAnyModalOpen()) { STUCK.since = 0; return; }   /* มีกล่องเปิดอยู่ = กำลังอ่านอยู่แล้ว */

  if(STUCK.level !== G.level){        /* เปลี่ยนด่าน = เริ่มนับใหม่ทั้งหมด */
    STUCK.level = G.level;
    STUCK.shown = false;
    STUCK.sig = '';
    coachHideInvite();
  }

  /* มาถึงด่านแผงครั้งแรก — ชวนเรียนทันที ไม่ต้องรอให้ติดก่อน
     เพราะกติกาการต่อเปลี่ยนไปทั้งหมด รู้ก่อนลงมือดีกว่ารู้ตอนงง */
  var bl = coachBoardLevel();
  if(bl >= 0 && G.level === bl && !coachSeen('board')){
    var card = coachEl('coach-invite');
    if(!card || card.hidden) coachShowInvite('board');
    return;
  }

  if(G.doneLevels && G.doneLevels[G.level]) return;   /* ผ่านด่านนี้แล้ว ไม่ต้องช่วย */
  if(STUCK.shown) return;

  var sig = coachStuckSig();
  var now = Date.now();
  if(sig !== STUCK.sig){              /* มีความคืบหน้า = ยังไปต่อได้เอง */
    STUCK.sig = sig;
    STUCK.since = now;
    return;
  }
  if(!STUCK.since){ STUCK.since = now; return; }
  if(now - STUCK.since < STUCK_MS) return;

  /* ยังไม่เคยเรียนบทที่ตรงกับด่านนี้ → ชวนเรียนจับมือทำ
     เรียนไปแล้ว → เปิดคู่มือประจำด่านซึ่งอธิบายวิธีคิดของด่านนั้น */
  var b = coachBoardLevel();
  var lesson = (b >= 0 && G.level === b) ? 'board' : 'basic';
  STUCK.shown = true;

  if(!coachSeen(lesson)){
    coachCard('&#x1F9ED; ติดตรงไหนหรือเปล่า?',
      'มีด่านสอนแบบจับมือทำ พาทำตั้งแต่ต้นจนจบ ไม่เสียชีวิตและไม่เสียคะแนน',
      [{label:'สอนเลย', primary:true, onclick:'coachStuckStartLesson()'},
       {label:'ไม่เป็นไร',            onclick:'coachStuckDismiss()'}]);
    return;
  }
  var lv = (typeof currentLevel === 'function') ? currentLevel() : null;
  if(!lv || !lv.tutorial || !lv.tutorial.length) return;   /* ด่านนี้ไม่มีคู่มือ ก็ไม่ต้องชวน */
  coachCard('&#x1F9ED; ติดตรงไหนหรือเปล่า?',
    'ด่านนี้มีคู่มืออธิบายวิธีคิดอยู่ เปิดดูได้ ไม่เสียคะแนนและไม่เสียเวลาเดิน',
    [{label:'เปิดคู่มือด่านนี้', primary:true, onclick:'coachStuckOpenGuide()'},
     {label:'ไม่เป็นไร',                       onclick:'coachStuckDismiss()'}]);
}

/* ============================================================
   ตัวเฝ้าดู — ชวนเรียนให้ถูกจังหวะโดยไม่ต้องแก้ไฟล์อื่นให้มาเรียก

     บทพื้นฐาน  ชวนตอนเข้าหน้าเกมครั้งแรก
     บทแผง      ชวนตอนโหลดด่านที่พื้นที่ทำงานเป็นแผงครั้งแรก
   ============================================================ */
document.addEventListener('DOMContentLoaded', function(){
  /* ติดธงชนิดเครื่องให้ทั้งเกมก่อนอย่างอื่น — ข้อความแนะนำพึ่งธงนี้ */
  coachApplyPlatform(coachPlatformTouch());

  var screen = document.getElementById('screen-game');
  if(!screen) return;

  /* --- บทพื้นฐาน --- */
  if(!coachSeen('basic')){
    var mo = new MutationObserver(function(){
      if(screen.classList.contains('active') && !COACH.on && !coachSeen('basic')){
        setTimeout(function(){ coachShowInvite('basic'); }, 900);
        mo.disconnect();
      }
    });
    mo.observe(screen, {attributes:true, attributeFilter:['class']});
  }

  /* --- ตัวเฝ้าดูตัวเดียว --- ทำทั้งชวนเรียนบทแผงและจับว่าติด
     รวมไว้ตัวเดียวเพราะเงื่อนไข "ตอนไหนไม่ควรไปกวน" เหมือนกันเป๊ะ
     และไม่ต้องมีตัวจับเวลาที่วนทิ้งไว้ตลอดกาลเผื่อผู้เล่นไปถึงด่านแผง */
  setInterval(coachWatchTick, 2000);
});
