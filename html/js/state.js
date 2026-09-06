/* ============================================================
   GAME STATE — ตัวแปรสถานะกลางของเกม (G) + การสลับหน้าจอ
                + สถานะการทำแบบทดสอบก่อน/หลังเรียน
   ============================================================ */
/* ============================================================
   GAME STATE
   ============================================================ */
var G = {
  level:0, score:0, lives:3,
  unlockedMax:0,  /* ด่านสูงสุดที่ปลดล็อกแล้ว (กลับไปเล่นด่านที่ผ่านมาได้) */
  timerSec:0, timerInt:null, levelStartTime:0,
  doneLevels:{},
  wsItems:[], wsCounter:0,
  wires:[], wireCounter:0,
  invCounts:{},
  wireMode:false, drawingFrom:null,
  selectedItemId:null,
  tapWireFrom:null,  /* มือถือ: port แรกที่แตะไว้ (แตะทีละจุด) */
  flowDots:[],  /* จุดกระแสไฟที่วิ่งตามสาย */
  probeMode:false,  /* โหมดเครื่องวัดกระแส */
  tapFromForcedPol:null, tapToForcedPol:null,  /* ขั้วที่เลือกตอนต่อสาย */
  pendingPickPort:null, pendingPickRole:null, dragPending:null,  /* popup เลือกขั้ว */
  tutPages:[], tutIdx:0,
};

/* ============================================================
   HELPERS
   ============================================================ */
function showScreen(id){
  document.querySelectorAll('.screen').forEach(function(s){s.classList.remove('active');});
  document.getElementById(id).classList.add('active');
}

/* ============================================================
   PRE/POST-TEST FORM STATUS
   เช็คว่ากดปุ่มเปิดแบบทดสอบแล้วหรือยัง (เก็บใน memory ของ session)
   ============================================================ */
var FormStatus = { pretest:false, posttest:false };

/* เมื่อคลิกปุ่มเปิดลิงก์แบบทดสอบ -> ปลดล็อกปุ่มถัดไป */
function onFormLinkClick(which){
  FormStatus[which] = true;

  var statusBox  = document.getElementById(which+'-status');
  var statusText = document.getElementById(which+'-status-text');
  statusBox.classList.add('done');
  statusText.textContent = '✓ กดเข้าทำแบบทดสอบแล้ว — พร้อมไปต่อ';

  var nextBtnId = which==='pretest' ? 'pretest-continue-btn' : 'posttest-confirm-btn';
  var nextBtn = document.getElementById(nextBtnId);
  nextBtn.classList.remove('locked');

  showToast(which==='pretest' ? 'เปิดแบบทดสอบก่อนเรียนแล้ว ทำเสร็จแล้วกดปุ่มเข้าสู่เกมได้เลย' : 'เปิดแบบทดสอบหลังเรียนแล้ว ทำเสร็จแล้วกดยืนยันได้เลย','success');
  /* ไม่ block การเปิดลิงก์ - ให้ target=_blank ทำงานตามปกติ */
}

/* กดยืนยันเข้าสู่เกม (หลังทำ pretest) */
function confirmPretest(){
  if(!FormStatus.pretest){
    showToast('กรุณากดปุ่ม "เปิดแบบทดสอบก่อนเรียน" ก่อน','error');
    return;
  }
  showScreen('screen-game');
  initGame();
}

/* กดยืนยันส่งแบบทดสอบหลังเรียน */
function confirmPosttest(){
  if(!FormStatus.posttest){
    showToast('กรุณากดปุ่ม "เปิดแบบทดสอบหลังเรียน" ก่อน','error');
    return;
  }
  showToast('ขอบคุณที่ร่วมกิจกรรม! 🎉','success');
}
