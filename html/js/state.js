/* ============================================================
   GAME STATE — ตัวแปรสถานะกลางของเกม (G) + การสลับหน้าจอ
                + สถานะการทำแบบทดสอบก่อน/หลังเรียน

   ค่าที่ถูกบันทึกลงเครื่อง (ดู js/save.js):
     level, score, lives, doneLevels, unlockedMax, finished
   ที่เหลือเป็นค่าชั่วคราวระหว่างเล่น ไม่ต้องบันทึก
   ============================================================ */
var G = {
  level:0, score:0, lives:3,
  unlockedMax:0,  /* ด่านสูงสุดที่ปลดล็อกแล้ว (กลับไปเล่นด่านที่ผ่านมาได้) */
  finished:false, /* เล่นครบทุกด่านแล้ว (ไปหน้าแบบทดสอบหลังเรียน) */
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

/* อัปเดตหน้าตาสถานะ "ทำแบบทดสอบแล้ว" + ปลดล็อกปุ่มถัดไป
   แยกออกมาเพื่อให้ระบบเซฟเรียกใช้คืนสถานะตอนกด "เล่นต่อ" ได้ */
function applyFormStatusUI(which){
  var statusBox  = document.getElementById(which+'-status');
  var statusText = document.getElementById(which+'-status-text');
  if(!statusBox || !statusText) return;
  statusBox.classList.add('done');
  statusText.textContent = '✓ กดเข้าทำแบบทดสอบแล้ว — พร้อมไปต่อ';

  var nextBtnId = which==='pretest' ? 'pretest-continue-btn' : 'posttest-confirm-btn';
  var nextBtn = document.getElementById(nextBtnId);
  if(nextBtn) nextBtn.classList.remove('locked');
}

/* เมื่อคลิกปุ่มเปิดลิงก์แบบทดสอบ -> ปลดล็อกปุ่มถัดไป */
function onFormLinkClick(which){
  FormStatus[which] = true;
  applyFormStatusUI(which);
  saveGame();

  showToast(which==='pretest' ? 'เปิดแบบทดสอบก่อนเรียนแล้ว ทำเสร็จแล้วกดปุ่มเข้าสู่เกมได้เลย' : 'เปิดแบบทดสอบหลังเรียนแล้ว ทำเสร็จแล้วกดยืนยันได้เลย','success');
  /* ไม่ block การเปิดลิงก์ - ให้ target=_blank ทำงานตามปกติ */
}

/* กดยืนยันเข้าสู่เกม (หลังทำ pretest) — เริ่มเกมใหม่ตั้งแต่ด่าน 1 */
function confirmPretest(){
  if(!FormStatus.pretest){
    showToast('กรุณากดปุ่ม "เปิดแบบทดสอบก่อนเรียน" ก่อน','error');
    return;
  }

  /* ผู้ที่เคยทำข้อสอบแล้วจะเห็นปุ่มนี้ปลดล็อกทุกครั้งที่เปิดเกม
     ถ้ากดผิดปุ่ม (แทนที่จะกด "เล่นต่อ") initGame() จะล้างคะแนนทิ้งทันที
     จึงต้องเตือนก่อนเมื่อมีความคืบหน้าค้างอยู่ */
  var s = loadSave();
  if(s && (s.score > 0 || s.unlockedMax > 0)){
    var ok = confirm(
      'เริ่มเกมใหม่ตั้งแต่ด่าน 1?\n\n' +
      'ความคืบหน้าเดิมจะถูกลบ (ด่าน ' + (s.level+1) + ' · คะแนน ' + s.score + ')\n\n' +
      'ถ้าต้องการเล่นต่อจากเดิม ให้กดปุ่ม "เล่นต่อ" ในกล่องสีเขียวด้านล่างแทน'
    );
    if(!ok) return;
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
