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
  /* ปลดล็อกโหมดพิเศษ (อิสระ/วัดความเร็ว) — ติดถาวรเมื่อเล่นครบทุกด่านครั้งแรก
     ต่างจาก finished ตรงที่ initGame() จะไม่รีเซ็ตค่านี้ */
  modesUnlocked:false,
  sandbox:false,  /* อยู่ในโหมดอิสระ — ไม่จับเวลา ไม่เสียชีวิต ไม่บันทึกทับ */
  /* โหมดวัดความเร็ว — มีชีวิตเดียว ตอบผิดครั้งเดียวจบรัน */
  endless:false, endlessRound:1, endlessScore:0, endlessLives:1, genLevel:null,
  timerSec:0, timerInt:null, levelStartTime:0,
  doneLevels:{},
  wsItems:[], wsCounter:0,
  wires:[], wireCounter:0,
  invCounts:{},
  drawingFrom:null,   /* จุดขั้วต้นทางระหว่างลากสายบนคอม */
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
/* ด่านที่กำลังเล่นอยู่
   โหมดปกติ = ด่านจาก LEVELS, โหมดวัดความเร็ว = ด่านที่สุ่มสร้างขึ้นมา
   ทุกที่ที่เคยอ่าน LEVELS[G.level] ตรง ๆ ต้องเรียกผ่านฟังก์ชันนี้แทน */
function currentLevel(){
  return (G.endless && G.genLevel) ? G.genLevel : LEVELS[G.level];
}

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

/* บันทึกว่าเข้าทำแบบทดสอบแล้ว + ปลดล็อกปุ่มถัดไป
   เรียกซ้ำได้ปลอดภัย (กันไว้ตรงบรรทัดแรก) เพราะมีหลายทางที่เรียกเข้ามา:
   pointerdown, click และปุ่มสำรองที่ผู้เรียนกดเอง */
function markFormDone(which, silent){
  if(FormStatus[which]) return;
  FormStatus[which] = true;
  applyFormStatusUI(which);
  saveGame();
  if(!silent) showToast('ปลดล็อกปุ่มถัดไปแล้ว','success');
}

/* ปุ่มสำรอง — เผื่อการตรวจจับอัตโนมัติพลาด ผู้เรียนจะได้ไม่ติดค้าง */
function manualFormDone(which){
  markFormDone(which, true);
  showToast('ปลดล็อกปุ่มถัดไปแล้ว','success');
}

/* เมื่อคลิกปุ่มเปิดลิงก์แบบทดสอบ -> ปลดล็อกปุ่มถัดไป */
function onFormLinkClick(which){
  markFormDone(which, true);
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
    showConfirm({
      title:'เริ่มเกมใหม่',
      message:'เริ่มใหม่ตั้งแต่ด่าน 1?',
      detail:'ความคืบหน้าเดิมจะถูกลบ — ด่าน <b>' + (s.level+1) +
             '</b> · คะแนน <b>' + s.score + '</b><br><br>' +
             'ถ้าต้องการเล่นต่อจากเดิม ให้กดปุ่ม "เล่นต่อ"<br>ในกล่องสีเขียวด้านล่างแทน',
      icon:'rotate',
      okText:'เริ่มใหม่',
      cancelText:'ยกเลิก',
      danger:true,
      onConfirm:function(){ showScreen('screen-game'); initGame(); }
    });
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
