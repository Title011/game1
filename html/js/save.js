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
  try{
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      v:1,
      level:       G.level,
      score:       G.score,
      lives:       G.lives,
      doneLevels:  G.doneLevels,
      unlockedMax: G.unlockedMax,
      finished:    !!G.finished,
      pretest:     !!FormStatus.pretest,
      posttest:    !!FormStatus.posttest,
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
  if(s.posttest){
    FormStatus.posttest = true;
    applyFormStatusUI('posttest');
  }
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
  FormStatus.pretest  = !!s.pretest;
  FormStatus.posttest = !!s.posttest;
  if(FormStatus.pretest)  applyFormStatusUI('pretest');
  if(FormStatus.posttest) applyFormStatusUI('posttest');

  /* เล่นจบครบทุกด่านแล้ว → กลับไปหน้าแบบทดสอบหลังเรียน */
  if(s.finished){
    G.score       = s.score;
    G.doneLevels  = s.doneLevels;
    G.unlockedMax = s.unlockedMax;
    G.finished    = true;
    showScreen('screen-posttest');
    showToast('กลับมาที่หน้าแบบทดสอบหลังเรียน','success');
    return;
  }

  showScreen('screen-game');
  resumeGame(s);
}

/* กดปุ่ม "เริ่มใหม่ทั้งหมด" — ล้างข้อมูลบันทึก */
function askResetSave(){
  var ok = confirm('ลบความคืบหน้าทั้งหมดและเริ่มใหม่?\n\nคะแนน ด่านที่ผ่านแล้ว และสถานะแบบทดสอบจะหายทั้งหมด');
  if(!ok) return;
  clearSave();
  renderResumeBox();
  showToast('ลบข้อมูลที่บันทึกไว้แล้ว','');
}
