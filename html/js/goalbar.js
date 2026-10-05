/* ============================================================
   GOAL BAR — แถบโจทย์ที่พับเก็บได้บนจอแคบ

   ทำไม: css/game-layout.css เขียนไว้เองว่า "แถบโจทย์ต้องเตี้ยที่สุด
   เท่าที่อ่านออก เพราะทุกพิกเซลที่มันกินคือพื้นที่แผงต่อวงจรที่หายไป"
   บนจอมือถือคำอธิบายโจทย์ยาว 3-4 บรรทัดเป็นเรื่องปกติ ซึ่งกินความสูง
   ไปมากพอที่จะทำให้อุปกรณ์เบียดกันจนวางไม่ลงตัว

   วิธีแก้ที่ไม่ทำให้ผู้เล่นพลาดโจทย์:
     • โหลดด่านใหม่ = กางไว้เสมอ ต้องได้อ่านก่อน
     • พอเริ่มลงมือ (วางอุปกรณ์ชิ้นแรก) = พับเก็บให้เอง คืนพื้นที่ให้แผง
     • แตะที่แถบเมื่อไรก็กาง/พับได้ตลอด ไม่มีสถานะที่ย้อนไม่ได้

   ทั้งหมดมีผลเฉพาะจอแคบ (ดู @media ใน css/game-layout.css)
   บนจอคอมแถบโจทย์กางอยู่เหมือนเดิมทุกประการ
   ============================================================ */

var GOALBAR = { lastLevelKey:'', lastItems:0, armed:false };

function goalBarEl(){ return document.getElementById('level-goal'); }

function goalBarCollapse(on){
  var g = goalBarEl();
  if(!g) return;
  var was = g.classList.contains('goal-collapsed');
  g.classList.toggle('goal-collapsed', !!on);
  g.setAttribute('aria-expanded', on ? 'false' : 'true');
  if(was !== !!on) goalBarAfterResize();
}

/* ย่อ/ขยายแถบโจทย์ = ความสูงของพื้นที่ทำงานเปลี่ยนไปด้วย

   ตอน "ขยาย" พื้นที่ทำงานเตี้ยลง อุปกรณ์ที่อยู่ใกล้ขอบล่างจะหลุดออกนอกกรอบ
   ซึ่ง #workspace เป็น overflow:hidden = หายไปเลย กดไม่ได้ ลบไม่ได้
   ต้องดึงกลับเข้ากรอบทุกครั้ง แล้ววาดสายใหม่ให้ตรงขาที่ขยับไป

   รอให้คำสั่งปัจจุบันจบก่อน เพราะตอนนี้เบราว์เซอร์ยังไม่ได้คำนวณ layout ใหม่
   ถ้าวัดเลยจะได้ความสูงเก่า แล้วดึงผิดตำแหน่ง
   (ใช้ setTimeout ไม่ใช่ rAF ด้วยเหตุผลเดียวกับ historyBarKeepClear ใน history.js) */
function goalBarAfterResize(){
  setTimeout(function(){
    if(typeof clampWsItem === 'function' && typeof G !== 'undefined'){
      (G.wsItems || []).forEach(clampWsItem);
    }
    if(typeof bbRefresh === 'function') bbRefresh();
    if(typeof refreshWires === 'function') refreshWires();
    if(typeof updateHistoryButtons === 'function') updateHistoryButtons();
  }, 0);
}

function goalBarToggle(){
  var g = goalBarEl();
  if(!g) return;
  goalBarCollapse(!g.classList.contains('goal-collapsed'));
  GOALBAR.armed = false;   /* ผู้เล่นสั่งเอง = เลิกพับให้อัตโนมัติในด่านนี้ */
}

/* โจทย์ที่แสดงอยู่ตอนนี้คือของด่านไหน — ใช้ข้อความหัวข้อเป็นตัวบอก
   เพราะโหมดวัดความเร็วสุ่มโจทย์ใหม่ทุกรอบโดยที่ G.level ไม่เปลี่ยน */
function goalBarKey(){
  var t = document.getElementById('goal-title');
  return (G.level + '|' + (G.endless ? G.endlessRound : '') + '|' + (t ? t.textContent : ''));
}

/* จอกว้างไม่มีการพับ (ดู @media ใน css/game-layout.css) จึงไม่ควรมี
   คำบอกใบ้ว่า "แตะเพื่อย่อ/ขยาย" ให้กดแล้วไม่เกิดอะไรขึ้น */
function goalBarSyncAffordance(){
  var g = goalBarEl();
  if(!g) return;
  var narrow = window.innerWidth <= 760;
  if(narrow){
    if(g.title !== 'แตะเพื่อย่อ/ขยายโจทย์') g.title = 'แตะเพื่อย่อ/ขยายโจทย์';
    if(g.getAttribute('role') !== 'button'){
      g.setAttribute('role','button');
      g.setAttribute('tabindex','0');
    }
  } else {
    if(g.title) g.removeAttribute('title');
    if(g.getAttribute('role')){
      g.removeAttribute('role');
      g.removeAttribute('tabindex');
    }
  }
}

function goalBarTick(){
  var g = goalBarEl();
  if(!g) return;
  goalBarSyncAffordance();

  var key = goalBarKey();
  if(key !== GOALBAR.lastLevelKey){
    GOALBAR.lastLevelKey = key;
    GOALBAR.lastItems = (G.wsItems || []).length;
    GOALBAR.armed = true;          /* รอจังหวะพับให้เองครั้งเดียวต่อโจทย์ */
    goalBarCollapse(false);        /* โจทย์ใหม่ต้องได้อ่านก่อนเสมอ */
    return;
  }

  var n = (G.wsItems || []).length;
  /* วางอุปกรณ์ชิ้นแรกแล้ว = อ่านโจทย์จบและเริ่มลงมือ คืนพื้นที่ให้แผง */
  if(GOALBAR.armed && GOALBAR.lastItems === 0 && n > 0){
    GOALBAR.armed = false;
    goalBarCollapse(true);
  }
  GOALBAR.lastItems = n;
}

document.addEventListener('DOMContentLoaded', function(){
  var g = goalBarEl();
  if(!g) return;
  g.setAttribute('aria-expanded', 'true');
  goalBarSyncAffordance();
  g.addEventListener('click', goalBarToggle);
  g.addEventListener('keydown', function(e){
    if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); goalBarToggle(); }
  });
  setInterval(goalBarTick, 400);
});
