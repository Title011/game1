/* SAVE — บันทึกความคืบหน้าลง localStorage
   เก็บเฉพาะความคืบหน้า (ด่าน/คะแนน/ชีวิต/ด่านที่ผ่าน/สถานะแบบทดสอบ) ไม่เก็บวงจรที่วางค้าง (loadLevel ล้างใหม่ทุกครั้ง)
   ข้อมูลอยู่ในเครื่องผู้เล่นเท่านั้น แยกกันต่อเบราว์เซอร์/เครื่อง */
var SAVE_KEY = 'save-op-v3';

/* localStorage ใช้ไม่ได้บางกรณี (โหมดส่วนตัว / ปิดเก็บข้อมูล / file://) เช็คก่อนเสมอ ถ้าใช้ไม่ได้เกมยังเล่นได้แค่ไม่บันทึก */
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
  /* โหมดอิสระ/วัดความเร็วเปลี่ยนคลัง+คะแนนชั่วคราว ห้ามเขียนทับความคืบหน้าจริง */
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
    /* เซฟเก่าไม่มีช่อง posttestDone → ถือว่ายังไม่ได้ส่งเสมอ (ไม่ยกเว้นย้อนหลัง ไม่งั้นเครื่องที่เคยลองเล่นจะข้ามแบบทดสอบได้ ขัดกับข้อกำหนดบังคับ) */
    if(typeof s.posttestDone !== 'boolean') s.posttestDone = false;
    s.posttestAt = (typeof s.posttestAt === 'number' && s.posttestAt > 0) ? s.posttestAt : 0;
    /* เคยเปิดลิงก์แต่ไม่มีเวลาที่กด = เซฟเก่าก่อนมีการจับเวลา ถือว่ายังไม่เปิด (ไม่งั้น postSecLeft คิดจากปี 1970 ได้ติดลบ ปุ่มปลดล็อกทันที) */
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

/* คืนสถานะ "ทำแบบทดสอบแล้ว" ตั้งแต่เปิดหน้า — ทำข้อสอบก่อนเรียนครั้งเดียวพอ (ให้ทำซ้ำครูจะได้ข้อมูลซ้ำใน Google Sheets) */
function restoreFormStatus(){
  var s = loadSave();
  if(!s) return;
  if(s.pretest){
    FormStatus.pretest = true;
    applyFormStatusUI('pretest');
  }
  /* คืน posttestDone/posttestAt ก่อนเรียก applyFormStatusUI เสมอ (หน้าตาปุ่มยืนยันขึ้นกับสองค่านี้ — ดู updatePosttestGate) */
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

/* ประตูบังคับแบบทดสอบหลังเรียน — เรียกตอนเปิดหน้า (ปิดทางหนี: เล่นจบแล้วปิดแท็บหนี แล้วเปิดใหม่)
   คืน true ถ้าถูกพากลับไปหน้าแบบทดสอบ */
function enforcePosttestGate(){
  if(typeof posttestPending !== 'function' || !posttestPending()) return false;
  gotoPosttest('ยังเหลือแบบทดสอบหลังเรียน — ต้องส่งก่อนจึงจะเล่นต่อได้');
  return true;
}

/* คืนความคืบหน้าลง G — ส่วนที่ทั้ง resumeGame() กับทางกลับหน้าแบบทดสอบใช้ร่วมกัน เพิ่มช่องใหม่ที่นี่ที่เดียว (G.level/G.finished ผู้เรียกตั้งเอง) */
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

  /* เล่นจบครบทุกด่าน → กลับหน้าแบบทดสอบหลังเรียน (ต้องคืนค่า+สร้างแถบด่านด้วย เพราะจากนี้กดเข้าโหมดพิเศษได้ ออกมาแล้วถ้าไม่มีแถบด่านจะไม่มีจุดให้กด) */
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
      'รวมถึงสถานะบทเรียนและการทำแบบทดสอบ จะหายทั้งหมด'
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
      /* โหลดหน้าใหม่ทั้งหน้าแทนล้างทีละค่า เพราะ FormStatus ในหน่วยความจำ+ปุ่มที่ปลดล็อกไว้ไม่ได้ถูกล้างพร้อมไฟล์เซฟ (ไม่งั้นปุ่มเข้าเกมค้างปลดล็อกทั้งที่ยังไม่ทำแบบทดสอบ) */
      location.reload();
    }
  });
}
