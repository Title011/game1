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
  /* อุปกรณ์ที่เลือกไว้ทั้งหมด (ลากกรอบคุมดำบนพื้นที่ว่าง)
     selectedItemId = ตัวล่าสุดในชุดนี้ เก็บไว้ให้คีย์ S / เครื่องวัด / คัดลอก
     ที่ทำงานกับชิ้นเดียวใช้ต่อได้เหมือนเดิม (ดู setSelection ใน js/workspace.js) */
  selectedIds:[],
  tapWireFrom:null,  /* มือถือ: port แรกที่แตะไว้ (แตะทีละจุด) */
  flowDots:[],  /* จุดกระแสไฟที่วิ่งตามสาย */
  probeMode:false,  /* โหมดเครื่องวัดกระแส */
  tapFromForcedPol:null, tapToForcedPol:null,  /* ขั้วที่เลือกตอนต่อสาย */
  pendingPickPort:null, pendingPickRole:null, dragPending:null,  /* popup เลือกขั้ว */
  /* คลิปบอร์ดคัดลอก-วางอุปกรณ์ (Ctrl+C / Ctrl+V และปุ่ม ⧉ บนตัวอุปกรณ์)
     dx,dy = ระยะห่างที่ "เรียนรู้" จากการที่ผู้เล่นลากชิ้นที่วางล่าสุดไปเอง
     วางครั้งถัดไปจะใช้ระยะเดิมซ้ำ = เรียงของเป็นแถวได้ในไม่กี่คลิก
     (ดู duplicateItem / pasteItem ใน js/workspace.js) */
  clip:null,
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
  /* เพลงพื้นหลังเปลี่ยนตามหน้าจอ — ฮุกไว้ที่นี่ที่เดียวเพราะทุกการเปลี่ยนหน้า
     ผ่านฟังก์ชันนี้หมด ไม่ต้องไปเติมทีละจุด (ดู js/bgm.js) */
  if(typeof bgmRefresh === 'function') bgmRefresh();
}

/* ด่านสุดท้ายคือเงื่อนไขปลดล็อกโหมดพิเศษ — กันไว้เผื่อเรียกฟังก์ชันตรง ๆ
   คืน false เมื่อยังไม่ปลดล็อก ผู้เรียกต้อง return ทันที
   (ใช้ร่วมกันโดย enterSandbox() และ enterEndless()) */
function specialModeReady(){
  /* เล่นจบแล้วแต่ยังไม่ส่งแบบทดสอบ = ยังไม่ได้รางวัล และห้ามเข้าทางอ้อมด้วย
     (ปุ่มโหมดพิเศษถูกซ่อนอยู่แล้ว แต่คีย์ลัด/คอนโซลยังเรียกถึงได้) */
  if(posttestPending()){
    gotoPosttest('ต้องส่งแบบทดสอบหลังเรียนก่อน จึงจะเข้าโหมดพิเศษได้');
    return false;
  }
  /* แบบประเมินความพึงพอใจก็ต้องครบ 1 ครั้งเหมือนกัน
     ต่างกันตรงที่อันนี้ไม่ได้ขวางหน้าจอ แค่เปิดกล่องให้ทำตรงนั้นเลย */
  if(surveyPending()){
    openSurvey();
    showToast('ต้องส่งแบบประเมินความพึงพอใจก่อน จึงจะเข้าโหมดพิเศษได้','error');
    return false;
  }
  if(!G.modesUnlocked){
    showToast('ปลดล็อกโหมดนี้ได้หลังเล่นครบทุกด่านและส่งแบบทดสอบหลังเรียนแล้ว','error');
    return false;
  }
  showScreen('screen-game');
  return true;
}

/* ============================================================
   PRE/POST-TEST FORM STATUS
   เช็คว่ากดปุ่มเปิดแบบทดสอบแล้วหรือยัง (เก็บใน memory ของ session)
   ============================================================ */
/* ============================================================
   แบบทดสอบหลังเรียนเป็น "ส่วนบังคับ" ไม่ใช่ของแถมท้ายเกม

   เงื่อนไขสองชั้น:
     1. ต้องเล่นครบทุกด่านก่อน จึงจะมาถึงหน้านี้ได้  (endGame ใน js/game.js)
     2. ต้องกดส่งแบบทดสอบ จึงจะออกจากหน้านี้ไปเล่นอย่างอื่นได้
        และรางวัล (โหมดพิเศษ) เพิ่งปลดล็อกตอนนั้น ไม่ใช่ตอนเล่นจบด่าน

   *** ข้อจำกัดที่ต้องรู้ไว้ ***
   หน้าเว็บตรวจไม่ได้ว่าผู้เรียน "กดส่ง" ใน Google Form จริงหรือเปล่า
   Google ไม่ส่งสัญญาณอะไรกลับมาที่หน้าเว็บเลย สิ่งที่โค้ดนี้บังคับได้คือ
   "เส้นทาง" — ปิดทุกทางออกจนกว่าจะเดินผ่านขั้นตอนแบบทดสอบ
   คนที่ตั้งใจจะข้ามจริง ๆ ยังข้ามได้ (เปิดฟอร์มทิ้งไว้แล้วรอครบเวลา)
   แต่จะไม่มีใครข้ามไปโดยไม่ตั้งใจหรือเพราะไม่เห็นว่ามีแบบทดสอบอยู่

   การยืนยันว่าทำจริงต้องทำฝั่งครู: เปิด "เก็บอีเมล" ใน Google Form
   แล้วเทียบรายชื่อใน Google Sheets ซึ่งอยู่นอกเหนือสิ่งที่เกมทำได้
   ============================================================ */
var FormStatus = {
  pretest:false,
  posttest:false,  posttestDone:false, posttestAt:0,
  survey:false,    surveyDone:false,   surveyAt:0
};

/* ด่านที่ถือเป็น "แก่นหลัก" ของเกม — ผ่านด่านนี้แล้วปุ่มแบบประเมินจึงโผล่

   เลขนี้นับจาก 0 ตามดัชนีใน LEVELS → 11 คือด่านที่ 12
   "ไฟห้องนอนกับไฟห้องน้ำ" คือด่านที่สอนวงจรขนานแบบควบคุมแยกกันได้
   ซึ่งเป็นเหตุผลที่บ้านจริงเดินไฟแบบขนาน — แก่นของทั้งเกมอยู่ตรงนี้
   และผ่านมาถึงจุดนี้ก็เล่นมาเกินครึ่งทางแล้ว มีประสบการณ์พอจะให้ความเห็นได้
   (อยากให้โผล่เร็ว/ช้ากว่านี้ แก้เลขเดียวตรงนี้) */
var SURVEY_LEVEL = 11;

/* เวลาขั้นต่ำหลังกดเปิดฟอร์ม ก่อนที่ปุ่มยืนยันจะกดได้ (วินาที)

   กันการ "กดเปิดแล้วกดยืนยันรวดเดียว" ซึ่งใช้เวลาไม่ถึงวินาที
   60 วินาทีสั้นกว่าเวลาทำข้อสอบจริงมาก จึงไม่ขวางคนที่ตั้งใจทำ
   แต่พอจะทำให้การข้ามกลายเป็น "ตั้งใจข้าม" ไม่ใช่กดผ่านไปเฉย ๆ */
var POSTTEST_MIN_SEC = 60;
var _postGateInt = null;
var _surveyGateInt = null;

/* อัปเดตหน้าตาสถานะ "ทำแบบทดสอบแล้ว" + ปลดล็อกปุ่มถัดไป
   แยกออกมาเพื่อให้ระบบเซฟเรียกใช้คืนสถานะตอนกด "เล่นต่อ" ได้ */
function applyFormStatusUI(which){
  var statusBox  = document.getElementById(which+'-status');
  var statusText = document.getElementById(which+'-status-text');
  if(statusBox && statusText){
    statusBox.classList.add('done');
    var pendingConfirm = (which === 'posttest' && !FormStatus.posttestDone) ||
                         (which === 'survey'   && !FormStatus.surveyDone);
    statusText.textContent = pendingConfirm
      ? '✓ เปิดแบบทดสอบแล้ว — ทำให้เสร็จแล้วกลับมากดยืนยัน'
      : '✓ กดเข้าทำแบบทดสอบแล้ว — พร้อมไปต่อ';
  }

  if(which === 'pretest'){
    var b = document.getElementById('pretest-continue-btn');
    if(b) b.classList.remove('locked');
    return;
  }
  /* สองอันนี้ไม่ปลดล็อกทันทีที่กดเปิดลิงก์ ต้องรอครบเวลาขั้นต่ำก่อน */
  if(which === 'survey') updateSurveyGate();
  else                   updatePosttestGate();
}

/* เหลืออีกกี่วินาทีจึงจะกดยืนยันแบบทดสอบหลังเรียนได้ */
function postSecLeft(){
  if(!FormStatus.posttest) return POSTTEST_MIN_SEC;
  var passed = (Date.now() - (FormStatus.posttestAt || 0)) / 1000;
  return Math.max(0, Math.ceil(POSTTEST_MIN_SEC - passed));
}

/* หน้าตาปุ่มยืนยันแบบทดสอบหลังเรียน ตามสถานะปัจจุบัน
   ปุ่มที่ล็อกอยู่เฉย ๆ โดยไม่บอกว่าทำไม คือปุ่มที่ผู้ใช้คิดว่าพัง
   จึงต้องเดินนาฬิกาให้เห็นว่าเหลืออีกกี่วินาที */
function updatePosttestGate(){
  var b = document.getElementById('posttest-confirm-btn');
  if(!b) return;

  function stopTick(){ if(_postGateInt){ clearInterval(_postGateInt); _postGateInt = null; } }

  if(FormStatus.posttestDone){
    b.classList.remove('locked');
    b.textContent = '✅ ส่งแบบทดสอบแล้ว';
    stopTick();
    return;
  }
  if(!FormStatus.posttest){
    b.classList.add('locked');
    b.textContent = '✅ ส่งแบบทดสอบเรียบร้อยแล้ว';
    stopTick();
    return;
  }
  var left = postSecLeft();
  if(left > 0){
    b.classList.add('locked');
    b.textContent = 'กำลังทำแบบทดสอบ… (' + left + ' วินาที)';
    if(!_postGateInt) _postGateInt = setInterval(updatePosttestGate, 1000);
  }else{
    b.classList.remove('locked');
    b.textContent = '✅ ส่งแบบทดสอบเรียบร้อยแล้ว';
    stopTick();
  }
}

/* ============================================================
   แบบประเมินความพึงพอใจ

   ต่างจากแบบทดสอบหลังเรียนตรงที่ "ทำตอนไหนก็ได้" ไม่ได้ขวางทางเดินเกม
   แต่ต้องทำครบ 1 ครั้ง ถึงจะเข้าโหมดพิเศษได้ เหมือนกัน

   ปุ่มโผล่หลังผ่านด่านแก่นหลัก (SURVEY_LEVEL) เพราะแบบประเมินที่ตอบ
   ตั้งแต่ยังไม่ได้เล่นอะไรเลย ไม่มีประโยชน์กับใครทั้งนั้น
   ============================================================ */

/* ปุ่มแบบประเมินควรโผล่หรือยัง */
function surveyUnlocked(){
  if(FormStatus.survey || FormStatus.surveyDone) return true;  /* เริ่มไปแล้วก็ต้องเห็นต่อ */
  if(typeof G === 'undefined') return false;
  if(G.finished) return true;
  return !!(G.doneLevels && G.doneLevels[SURVEY_LEVEL]);
}

/* โผล่แล้วแต่ยังไม่ได้ส่ง = ยังติดค้างอยู่ */
function surveyPending(){
  return !FormStatus.surveyDone && surveyUnlocked();
}

function surveySecLeft(){
  if(!FormStatus.survey) return POSTTEST_MIN_SEC;
  var passed = (Date.now() - (FormStatus.surveyAt || 0)) / 1000;
  return Math.max(0, Math.ceil(POSTTEST_MIN_SEC - passed));
}

function updateSurveyGate(){
  var b = document.getElementById('survey-confirm-btn');
  function stopTick(){ if(_surveyGateInt){ clearInterval(_surveyGateInt); _surveyGateInt = null; } }
  if(!b){ stopTick(); return; }

  if(FormStatus.surveyDone){
    b.classList.remove('locked');
    b.textContent = '✅ ส่งแบบประเมินแล้ว';
    stopTick();
  }else if(!FormStatus.survey){
    b.classList.add('locked');
    b.textContent = '✅ ส่งแบบประเมินเรียบร้อยแล้ว';
    stopTick();
  }else{
    var left = surveySecLeft();
    if(left > 0){
      b.classList.add('locked');
      b.textContent = 'กำลังทำแบบประเมิน… (' + left + ' วินาที)';
      if(!_surveyGateInt) _surveyGateInt = setInterval(updateSurveyGate, 1000);
    }else{
      b.classList.remove('locked');
      b.textContent = '✅ ส่งแบบประเมินเรียบร้อยแล้ว';
      stopTick();
    }
  }
  updateSurveyButton();
}

/* ปุ่มมุมบนขวาของแถบหัวเกม — ซ่อนจนกว่าจะผ่านด่านแก่นหลัก
   ทำเสร็จแล้วก็ซ่อนอีกครั้ง ไม่ต้องรกแถบหัวทิ้งไว้ */
function updateSurveyButton(){
  var show = surveyUnlocked() && !FormStatus.surveyDone;
  var b = document.getElementById('btn-survey');
  if(b) b.style.display = show ? 'inline-flex' : 'none';
  /* ตัวเตือนบนหน้าแบบทดสอบหลังเรียน — โผล่เฉพาะตอนยังไม่ได้ทำ
     คนที่ทำไประหว่างเล่นแล้วจะไม่เจอซ้ำให้รำคาญ */
  var r = document.getElementById('survey-reminder');
  if(r) r.style.display = show ? 'block' : 'none';
}

/* เปิดกล่องแบบประเมิน — เรียกได้จากปุ่มแถบหัว และจากหน้าแบบทดสอบหลังเรียน */
function openSurvey(){
  updateSurveyGate();
  openModal('modal-survey');
}

function confirmSurvey(){
  if(FormStatus.surveyDone){ showToast('ส่งแบบประเมินไปแล้ว',''); return; }
  if(!FormStatus.survey){
    showToast('กรุณากดปุ่ม "เปิดแบบประเมินความพึงพอใจ" ก่อน','error');
    return;
  }
  var left = surveySecLeft();
  if(left > 0){
    showToast('เพิ่งเปิดแบบประเมินไปเมื่อครู่ — รออีก ' + left + ' วินาที','error');
    return;
  }
  FormStatus.surveyDone = true;
  updateSurveyGate();
  applyFormStatusUI('survey');
  if(typeof updateModeButtons === 'function') updateModeButtons();
  saveGame();
  closeModal('modal-survey');
  showToast('ขอบคุณสำหรับความคิดเห็น! 🙏','success');
}


/* ยังติดค้างแบบทดสอบหลังเรียนอยู่ไหม

   อ่านจากไฟล์เซฟด้วย ไม่ใช่จาก G อย่างเดียว เพราะตอนเพิ่งเปิดหน้าเว็บ
   G ยังว่างอยู่ ทั้งที่ไฟล์เซฟรู้แล้วว่าเล่นจบไปแล้วและยังไม่ได้ส่ง */
function posttestPending(){
  if(FormStatus.posttestDone) return false;
  if(typeof G !== 'undefined' && G.finished) return true;
  var s = (typeof loadSave === 'function') ? loadSave() : null;
  return !!(s && s.finished && !s.posttestDone);
}

/* พากลับไปหน้าแบบทดสอบหลังเรียน พร้อมคืนความคืบหน้าให้ครบ

   ต้องคืน G ให้ครบถึงจะกดเข้าโหมดพิเศษต่อได้หลังส่งแบบทดสอบเสร็จ
   และแถบด่านต้องถูกสร้าง ไม่งั้นพอออกจากโหมดพิเศษกลับมาจะไม่มีจุดด่านให้กด */
function gotoPosttest(msg){
  var s = (typeof loadSave === 'function') ? loadSave() : null;
  if(s){
    restoreProgress(s);
    G.level    = Math.min(s.level, LEVELS.length - 1);
    G.finished = true;
    if(typeof buildLevelBar === 'function') buildLevelBar();
  }
  if(typeof updateModeButtons === 'function') updateModeButtons();
  showScreen('screen-posttest');
  updatePosttestGate();
  updateSurveyButton();
  if(msg) showToast(msg, 'error');
}

/* บันทึกว่าเข้าทำแบบทดสอบแล้ว + ปลดล็อกปุ่มถัดไป
   เรียกซ้ำได้ปลอดภัย (กันไว้ตรงบรรทัดแรก) เพราะมีหลายทางที่เรียกเข้ามา:
   pointerdown, click และปุ่มสำรองที่ผู้เรียนกดเอง */
function markFormDone(which, silent){
  if(FormStatus[which]) return;
  FormStatus[which] = true;
  /* จับเวลาตั้งแต่วินาทีที่เปิดฟอร์ม — ใช้คิดเวลาขั้นต่ำก่อนกดยืนยันได้
     เก็บลงไฟล์เซฟด้วย เวลาจึงเดินต่อแม้ปิดแท็บไปทำข้อสอบแล้วกลับมา */
  if(which === 'posttest' && !FormStatus.posttestAt) FormStatus.posttestAt = Date.now();
  if(which === 'survey'   && !FormStatus.surveyAt)   FormStatus.surveyAt   = Date.now();
  applyFormStatusUI(which);
  saveGame();
  if(!silent) showToast('ปลดล็อกปุ่มถัดไปแล้ว','success');
}

/* ปุ่มสำรอง — เผื่อการตรวจจับอัตโนมัติพลาด ผู้เรียนจะได้ไม่ติดค้าง
   (เช่นทำแบบทดสอบจากเครื่องอื่น หรือมือถือตัดจังหวะจนไม่ได้บันทึก) */
function manualFormDone(which){
  var first = !FormStatus[which];
  markFormDone(which, true);
  if(which === 'posttest' || which === 'survey'){
    if(which === 'survey') updateSurveyGate(); else updatePosttestGate();
    showToast(first
      ? 'เริ่มจับเวลาแล้ว — กดยืนยันได้ในอีก ' + POSTTEST_MIN_SEC + ' วินาที'
      : 'รอให้ครบเวลาก่อน จึงจะกดยืนยันได้', '');
    return;
  }
  showToast('ปลดล็อกปุ่มถัดไปแล้ว','success');
}

/* เมื่อคลิกปุ่มเปิดลิงก์แบบทดสอบ -> บันทึกว่าเปิดแล้ว */
function onFormLinkClick(which){
  markFormDone(which, true);
  var msg = 'เปิดแบบทดสอบหลังเรียนแล้ว — ทำให้เสร็จแล้วกลับมาที่หน้านี้เพื่อกดยืนยัน';
  if(which === 'pretest') msg = 'เปิดแบบทดสอบก่อนเรียนแล้ว ทำเสร็จแล้วกดปุ่มเข้าสู่เกมได้เลย';
  if(which === 'survey')  msg = 'เปิดแบบประเมินแล้ว — ทำให้เสร็จแล้วกลับมากดยืนยันในกล่องนี้';
  showToast(msg,'success');
  /* ไม่ block การเปิดลิงก์ - ให้ target=_blank ทำงานตามปกติ */
}

/* กดยืนยันเข้าสู่เกม (หลังทำ pretest) — เริ่มเกมใหม่ตั้งแต่ด่าน 1 */
function confirmPretest(){
  if(!FormStatus.pretest){
    showToast('กรุณากดปุ่ม "เปิดแบบทดสอบก่อนเรียน" ก่อน','error');
    return;
  }

  /* เล่นจบครบทุกด่านแล้วแต่ยังไม่ได้ส่งแบบทดสอบหลังเรียน
     ห้ามใช้ปุ่มนี้เริ่มเกมใหม่เพื่อหนีแบบทดสอบ — พากลับไปที่หน้านั้น
     (นี่คือทางหนีที่ชัดที่สุด เพราะปุ่มนี้ปลดล็อกค้างอยู่แล้วทุกครั้งที่เปิดเกม) */
  if(posttestPending()){
    gotoPosttest('ยังเหลือแบบทดสอบหลังเรียน — ต้องส่งก่อนจึงจะเริ่มเกมใหม่ได้');
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

/* กดยืนยันส่งแบบทดสอบหลังเรียน — นี่คือจุดที่ "ประตู" เปิดออก */
function confirmPosttest(){
  if(FormStatus.posttestDone){
    showToast('ส่งแบบทดสอบไปแล้ว','');
    return;
  }
  if(!FormStatus.posttest){
    showToast('กรุณากดปุ่ม "เปิดแบบทดสอบหลังเรียน" ก่อน','error');
    return;
  }
  var left = postSecLeft();
  if(left > 0){
    showToast('เพิ่งเปิดแบบทดสอบไปเมื่อครู่ — รออีก ' + left + ' วินาที','error');
    return;
  }

  FormStatus.posttestDone = true;

  /* รางวัลเพิ่งปลดล็อกตรงนี้ ไม่ใช่ตอนเล่นจบด่านสุดท้าย

     ของเดิม endGame() ปลดล็อกโหมดพิเศษให้ทันทีที่ผ่านด่าน 20
     ผู้เรียนจึงได้รางวัลไปก่อนแล้วตั้งแต่ยังไม่แตะแบบทดสอบ
     แรงจูงใจที่จะทำก็หายไปหมด — ย้ายมาไว้หลังส่งแบบทดสอบแทน */
  G.modesUnlocked = true;
  if(typeof updateModeButtons === 'function') updateModeButtons();
  updatePosttestGate();
  saveGame();
  showToast('ขอบคุณที่ร่วมกิจกรรม! 🎉 ปลดล็อกโหมดพิเศษแล้ว','success');
}
