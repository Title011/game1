/* ============================================================
   SAVE — บันทึกความคืบหน้าลง localStorage ของเบราว์เซอร์

   เก็บเฉพาะ "ความคืบหน้า" (ด่าน/คะแนน/ชีวิต/ด่านที่ผ่าน/สถานะแบบทดสอบ)
   ไม่เก็บวงจรที่วางค้างไว้ เพราะทุกครั้งที่โหลดด่าน loadLevel() จะเรียก
   clearWorkspace() ล้างพื้นที่ใหม่อยู่แล้ว

   ข้อมูลเก็บในเครื่องผู้เล่นเท่านั้น ไม่ส่งออกไปไหน
   และเป็นของแยกกันต่อเบราว์เซอร์/ต่อเครื่อง
   ============================================================ */
var SAVE_KEY = 'save-op-v1';

/* localStorage ใช้ไม่ได้ในบางกรณี (โหมดส่วนตัว, ปิดการเก็บข้อมูลเว็บ,
   หรือเปิดไฟล์แบบ file:// ในบางเบราว์เซอร์) → ต้องเช็คก่อนเสมอ
   ถ้าใช้ไม่ได้ เกมยังเล่นได้ปกติ แค่ไม่บันทึก */
var SAVE_OK = (function(){
  try{
    var k='__save_test__';
    localStorage.setItem(k,'1');
    localStorage.removeItem(k);
    return true;
  }catch(e){
    return false;
  }
})();

/* ---------- เขียน ---------- */
function saveGame(){
  if(!SAVE_OK) return;
  /* โหมดอิสระ/วัดความเร็ว เปลี่ยนคลังอุปกรณ์และคะแนนชั่วคราว
     ห้ามเขียนทับความคืบหน้าจริงของผู้เล่น */
  if(G.sandbox || G.endless) return;
  try{
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      v:1,
      level:       G.level,
      score:       G.score,
      lives:       G.lives,
      doneLevels:  G.doneLevels,
      unlockedMax: G.unlockedMax,
      finished:    !!G.finished,
      modesUnlocked: !!G.modesUnlocked,
      pretest:     !!FormStatus.pretest,
      posttest:     !!FormStatus.posttest,      /* กดเปิดลิงก์แล้ว */
      posttestDone: !!FormStatus.posttestDone,  /* กดยืนยันส่งแล้ว = ผ่านประตู */
      posttestAt:   FormStatus.posttestAt || 0, /* เวลาที่เปิดฟอร์ม ใช้นับเวลาขั้นต่ำ */
      survey:       !!FormStatus.survey,        /* แบบประเมินความพึงพอใจ — กดเปิดแล้ว */
      surveyDone:   !!FormStatus.surveyDone,    /* กดยืนยันส่งแล้ว */
      surveyAt:     FormStatus.surveyAt || 0,
      savedAt:     Date.now()
    }));
  }catch(e){
    /* พื้นที่เต็มหรือถูกบล็อก — ไม่ให้เกมสะดุด */
  }
}

/* ---------- อ่าน ---------- */
/* คืน object ที่ตรวจแล้วว่าใช้ได้ หรือ null ถ้าไม่มี/พัง/คนละเวอร์ชัน */
function loadSave(){
  if(!SAVE_OK) return null;
  try{
    var raw = localStorage.getItem(SAVE_KEY);
    if(!raw) return null;
    var s = JSON.parse(raw);
    if(!s || s.v !== 1) return null;
    /* กันไฟล์เซฟเก่าที่ด่านเกินจำนวนที่มีอยู่ (เช่นตอนแก้ LEVELS) */
    if(typeof s.level !== 'number' || s.level < 0 || s.level >= LEVELS.length) return null;
    /* ปรับค่าที่เพี้ยนให้อยู่ในช่วงที่ถูกต้อง */
    s.score       = (typeof s.score === 'number' && s.score >= 0) ? s.score : 0;
    s.lives       = (typeof s.lives === 'number' && s.lives > 0 && s.lives <= 3) ? s.lives : 3;
    s.doneLevels  = (s.doneLevels && typeof s.doneLevels === 'object') ? s.doneLevels : {};
    s.unlockedMax = (typeof s.unlockedMax === 'number' && s.unlockedMax >= 0)
                    ? Math.min(s.unlockedMax, LEVELS.length-1) : 0;
    /* ไฟล์เซฟเก่า (บันทึกไว้ก่อนมีระบบบังคับ) ไม่มีช่อง posttestDone — ถือว่า
       "ยังไม่ได้ส่ง" เสมอ

       เคยเขียนให้ยกเว้นย้อนหลัง (ใครเคยกดเปิดลิงก์ = นับว่าทำแล้ว) แต่เอาออก
       เพราะมันทำให้ทุกเครื่องที่เคยลองเล่นไว้ก่อนหน้านี้ข้ามแบบทดสอบได้ทันที
       ซึ่งขัดกับข้อกำหนดว่าแบบทดสอบหลังเรียนเป็นส่วนบังคับ
       คนที่เคยกดเปิดลิงก์ไว้แล้วก็แค่กดยืนยันอีกครั้ง ไม่ได้เสียอะไร */
    if(typeof s.posttestDone !== 'boolean') s.posttestDone = false;
    s.posttestAt = (typeof s.posttestAt === 'number' && s.posttestAt > 0) ? s.posttestAt : 0;
    /* "เคยกดเปิดลิงก์แล้ว" แต่ไม่มีเวลาที่กด = เซฟเก่าที่บันทึกไว้ก่อนมีการจับเวลา
       ถือว่ายังไม่ได้เปิด เพราะไม่มีหลักฐานว่าเปิดไปเมื่อไร

       ถ้าปล่อยผ่าน postSecLeft() จะคิดจากเวลา 0 (ปี 1970) ได้ผลเป็นติดลบ
       แล้วถูกตัดเหลือ 0 — ปุ่มยืนยันจะปลดล็อกทันทีโดยไม่ต้องรอเลย */
    if(s.posttest && !s.posttestAt) s.posttest = false;
    /* แบบประเมิน ใช้กฎเดียวกันทุกข้อ */
    if(typeof s.surveyDone !== 'boolean') s.surveyDone = false;
    s.surveyAt = (typeof s.surveyAt === 'number' && s.surveyAt > 0) ? s.surveyAt : 0;
    if(s.survey && !s.surveyAt) s.survey = false;
    return s;
  }catch(e){
    return null;
  }
}

/* ---------- ลบ ---------- */
function clearSave(){
  if(!SAVE_OK) return;
  try{ localStorage.removeItem(SAVE_KEY); }catch(e){}
}

/* ============================================================
   คืนสถานะ "ทำแบบทดสอบแล้ว" ตั้งแต่ตอนเปิดหน้า

   ทำข้อสอบก่อนเรียนครั้งเดียวพอ — เปิดเกมใหม่กี่ครั้งก็ไม่ต้องทำซ้ำ
   (ถ้าให้ทำซ้ำ ครูจะได้ข้อมูลซ้ำใน Google Sheets)
   ============================================================ */
function restoreFormStatus(){
  var s = loadSave();
  if(!s) return;
  if(s.pretest){
    FormStatus.pretest = true;
    applyFormStatusUI('pretest');
  }
  /* ต้องคืน posttestDone/posttestAt ก่อนเรียก applyFormStatusUI เสมอ
     เพราะหน้าตาปุ่มยืนยันขึ้นกับสองค่านี้ (ดู updatePosttestGate ใน js/state.js) */
  FormStatus.posttestDone = !!s.posttestDone;
  FormStatus.posttestAt   = s.posttestAt || 0;
  if(s.posttest){
    FormStatus.posttest = true;
    applyFormStatusUI('posttest');
  }else if(typeof updatePosttestGate === 'function'){
    updatePosttestGate();
  }

  FormStatus.surveyDone = !!s.surveyDone;
  FormStatus.surveyAt   = s.surveyAt || 0;
  if(s.survey){
    FormStatus.survey = true;
    applyFormStatusUI('survey');
  }else if(typeof updateSurveyGate === 'function'){
    updateSurveyGate();
  }
}

/* ประตูบังคับแบบทดสอบหลังเรียน — เรียกตอนเปิดหน้าเว็บ

   ปิดทางหนีที่ง่ายที่สุด: เล่นจบแล้วปิดแท็บหนีแบบทดสอบ แล้วเปิดใหม่
   มาโผล่หน้าแบบทดสอบก่อนเรียนเหมือนไม่เคยมีอะไรเกิดขึ้น
   คืน true ถ้าถูกพากลับไปหน้าแบบทดสอบ (ผู้เรียกจะได้ไม่ทำอย่างอื่นต่อ) */
function enforcePosttestGate(){
  if(typeof posttestPending !== 'function' || !posttestPending()) return false;
  gotoPosttest('ยังเหลือแบบทดสอบหลังเรียน — ต้องส่งก่อนจึงจะเล่นต่อได้');
  return true;
}

/* คืนความคืบหน้าที่บันทึกไว้ลงใน G — ส่วนที่ทั้ง resumeGame() และ
   ทางกลับหน้าแบบทดสอบหลังเรียนใช้เหมือนกัน เพิ่มช่องใหม่ที่นี่ที่เดียว
   (G.level / G.finished ต่างกันในแต่ละทาง ผู้เรียกตั้งเอง) */
function restoreProgress(s){
  G.score       = s.score;
  G.lives       = s.lives;
  G.doneLevels  = s.doneLevels;
  G.unlockedMax = s.unlockedMax;
  G.modesUnlocked = !!s.modesUnlocked;   /* ปลดล็อกแล้วต้องยังปลดล็อกอยู่ */
}

/* คืนสถานะปลดล็อกโหมดพิเศษตั้งแต่เปิดหน้า
   ปลดล็อกครั้งเดียวติดตลอด แม้จะเริ่มเกมใหม่ก็ไม่หาย */
function restoreUnlocks(){
  var s = loadSave();
  if(s && s.modesUnlocked) G.modesUnlocked = true;
  updateModeButtons();
}

/* ============================================================
   กล่อง "เล่นต่อ" บนหน้าแบบทดสอบก่อนเรียน
   แสดงเฉพาะเมื่อมีข้อมูลบันทึกไว้
   ============================================================ */
function renderResumeBox(){
  var box = document.getElementById('resume-box');
  if(!box) return;
  var s = loadSave();
  if(!s){ box.style.display='none'; return; }

  var done = 0;
  for(var k in s.doneLevels){ if(s.doneLevels[k]) done++; }

  var detail = s.finished
    ? 'เล่นครบ ' + LEVELS.length + ' ด่านแล้ว · คะแนนรวม ' + s.score
    : 'ด่าน ' + (s.level+1) + '/' + LEVELS.length +
      ' · คะแนน ' + s.score +
      ' · ผ่านแล้ว ' + done + ' ด่าน';

  document.getElementById('resume-detail').textContent = detail;
  box.style.display = 'flex';
}

/* กดปุ่ม "เล่นต่อ" */
function continueGame(){
  var s = loadSave();
  if(!s){ showToast('ไม่พบข้อมูลที่บันทึกไว้','error'); renderResumeBox(); return; }

  /* คืนสถานะแบบทดสอบ — จะได้ไม่ต้องกดลิงก์ซ้ำ */
  FormStatus.pretest      = !!s.pretest;
  FormStatus.posttest     = !!s.posttest;
  FormStatus.posttestDone = !!s.posttestDone;
  FormStatus.posttestAt   = s.posttestAt || 0;
  FormStatus.survey       = !!s.survey;
  FormStatus.surveyDone   = !!s.surveyDone;
  FormStatus.surveyAt     = s.surveyAt || 0;
  if(FormStatus.pretest)  applyFormStatusUI('pretest');
  if(FormStatus.posttest) applyFormStatusUI('posttest');
  if(typeof updateSurveyGate === 'function') updateSurveyGate();

  /* เล่นจบครบทุกด่านแล้ว → กลับไปหน้าแบบทดสอบหลังเรียน

     ต้องคืนค่าให้ครบและสร้างแถบด่านด้วย ถึงจะไม่ได้เข้าหน้าเกมทันที
     เพราะจากหน้านี้ผู้เล่นกดเข้าโหมดพิเศษได้ พอออกจากโหมดกลับมาหน้าเกม
     ถ้าแถบด่านไม่เคยถูกสร้าง จะไม่มีจุดด่านให้กดเลือกเลย */
  if(s.finished){
    restoreProgress(s);
    G.level    = Math.min(s.level, LEVELS.length-1);
    G.finished = true;
    updateModeButtons();
    buildLevelBar();
    showScreen('screen-posttest');
    if(typeof updatePosttestGate === 'function') updatePosttestGate();
    showToast(FormStatus.posttestDone
      ? 'กลับมาที่หน้าแบบทดสอบหลังเรียน'
      : 'ยังเหลือแบบทดสอบหลังเรียน — ส่งให้เรียบร้อยก่อนนะ','success');
    return;
  }

  showScreen('screen-game');
  resumeGame(s);
}

/* กดปุ่ม "เริ่มใหม่ทั้งหมด" — ล้างข้อมูลบันทึก */
function askResetSave(){
  var s = loadSave();
  var detail = s
    ? 'คะแนน <b>' + s.score + '</b> · ผ่านแล้ว <b>' +
      Object.keys(s.doneLevels).length + ' ด่าน</b><br>' +
      'รวมถึงสถานะการทำแบบทดสอบ จะหายทั้งหมด'
    : 'ข้อมูลที่บันทึกไว้จะถูกลบทั้งหมด';

  showConfirm({
    title:'เริ่มใหม่ทั้งหมด',
    message:'ลบความคืบหน้าทั้งหมดแล้วเริ่มใหม่?',
    detail:detail,
    icon:'trash',
    okText:'ลบและเริ่มใหม่',
    cancelText:'ไม่ลบ',
    danger:true,
    onConfirm:function(){
      clearSave();
      renderResumeBox();
      showToast('ลบข้อมูลที่บันทึกไว้แล้ว','');
    }
  });
}
