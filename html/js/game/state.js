/* GAME STATE — ตัวแปรสถานะกลาง (G) + สลับหน้าจอ + สถานะแบบทดสอบก่อน/หลังเรียน
   ค่าที่บันทึกลงเครื่อง (ดู save.js): level, score, lives, doneLevels, unlockedMax, finished — ที่เหลือชั่วคราว */
var G = {
  level:0, score:0, lives:3,
  unlockedMax:0,  /* ด่านสูงสุดที่ปลดล็อกแล้ว (กลับไปเล่นด่านที่ผ่านมาได้) */
  finished:false, /* เล่นครบทุกด่านแล้ว (ไปหน้าแบบทดสอบหลังเรียน) */
  /* ปลดล็อกโหมดพิเศษ — ติดถาวร (ต่างจาก finished ตรงที่ initGame ไม่รีเซ็ตค่านี้) */
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
  /* อุปกรณ์ที่เลือกทั้งหมด (คุมดำ) · selectedItemId = ตัวล่าสุด ให้คีย์ S/เครื่องวัด/คัดลอกที่ทำงานกับชิ้นเดียวใช้ต่อ */
  selectedIds:[],
  tapWireFrom:null,  /* มือถือ: port แรกที่แตะไว้ (แตะทีละจุด) */
  flowDots:[],  /* จุดกระแสไฟที่วิ่งตามสาย */
  probeMode:false,  /* โหมดเครื่องวัดกระแส */
  tapFromForcedPol:null, tapToForcedPol:null,  /* ขั้วที่เลือกตอนต่อสาย */
  pendingPickPort:null, pendingPickRole:null, dragPending:null,  /* popup เลือกขั้ว */
  /* คลิปบอร์ดคัดลอก-วาง (Ctrl+C/V และปุ่ม ⧉) · dx,dy = ระยะที่เรียนรู้จากการลากชิ้นล่าสุดไปเอง วางครั้งถัดไปใช้ซ้ำ เรียงเป็นแถวได้ไม่กี่คลิก */
  clip:null,
  tutPages:[], tutIdx:0,
};

/* ด่านที่กำลังเล่น — ปกติ = LEVELS[G.level], โหมดวัดความเร็ว = ด่านที่สุ่มสร้าง (ทุกที่ต้องเรียกผ่านฟังก์ชันนี้แทนอ่าน LEVELS ตรงๆ) */
function currentLevel(){
  return (G.endless && G.genLevel) ? G.genLevel : LEVELS[G.level];
}

function showScreen(id){
  document.querySelectorAll('.screen').forEach(function(s){s.classList.remove('active');});
  document.getElementById(id).classList.add('active');
  /* เพลงพื้นหลังเปลี่ยนตามหน้าจอ ฮุกที่นี่ที่เดียวเพราะทุกการเปลี่ยนหน้าผ่านฟังก์ชันนี้ */
  if(typeof bgmRefresh === 'function') bgmRefresh();
}

/* เงื่อนไขปลดล็อกโหมดพิเศษ — คืน false เมื่อยังไม่ปลดล็อก (ผู้เรียก return ทันที) ใช้ร่วมกันโดย enterSandbox/enterEndless */
function specialModeReady(){
  /* เล่นจบแต่ยังไม่ส่งแบบทดสอบ = ห้ามเข้าทางอ้อม (ปุ่มซ่อนอยู่แล้ว แต่คีย์ลัด/คอนโซลยังเรียกถึง) */
  if(posttestPending()){
    gotoPosttest('ต้องส่งแบบทดสอบหลังเรียนก่อน จึงจะเข้าโหมดพิเศษได้');
    return false;
  }
  /* แบบประเมินก็ต้องครบ 1 ครั้งเหมือนกัน (แต่ไม่ขวางหน้าจอ แค่เปิดกล่องให้ทำตรงนั้น) */
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

/* PRE/POST-TEST FORM STATUS — เช็คว่ากดเปิดแบบทดสอบแล้วหรือยัง (เก็บใน memory ของ session)
   แบบทดสอบหลังเรียนเป็นส่วนบังคับ 2 ชั้น: 1) ต้องเล่นครบทุกด่านก่อนถึงหน้านี้ 2) ต้องกดส่งถึงจะออกไปเล่นอย่างอื่น (รางวัลปลดล็อกตอนนั้น)
   ข้อจำกัด: หน้าเว็บตรวจไม่ได้ว่ากดส่งใน Google Form จริงไหม (Google ไม่ส่งสัญญาณกลับ) ที่บังคับได้คือ "เส้นทาง" — ปิดทางออกจนกว่าจะเดินผ่าน
   การยืนยันว่าทำจริงต้องทำฝั่งครู (เปิดเก็บอีเมลในฟอร์มแล้วเทียบใน Sheets) */
var FormStatus = {
  pretest:false,
  posttest:false,  posttestDone:false, posttestAt:0,
  survey:false,    surveyDone:false,   surveyAt:0
};

/* ด่านแก่นหลัก — ผ่านแล้วปุ่มแบบประเมินจึงโผล่ (นับจาก 0 → 11 = ด่านที่ 12 "ไฟห้องนอน/ห้องน้ำ" สอนวงจรขนานควบคุมแยกกัน เล่นมาเกินครึ่งพอให้ความเห็นได้ · แก้เลขเดียวตรงนี้) */
var SURVEY_LEVEL = 11;

/* เวลาขั้นต่ำหลังเปิดฟอร์ม ก่อนกดยืนยันได้ (วิ) — กันกดเปิดแล้วยืนยันรวดเดียว (60 วิ สั้นกว่าทำจริงมาก ไม่ขวางคนตั้งใจ แต่ทำให้การข้ามเป็น "ตั้งใจข้าม") */
var POSTTEST_MIN_SEC = 60;
var _postGateInt = null;
var _surveyGateInt = null;

/* อัปเดตหน้าตาสถานะ "ทำแบบทดสอบแล้ว" + ปลดล็อกปุ่มถัดไป (แยกออกมาให้ระบบเซฟเรียกคืนสถานะตอนกด "เล่นต่อ" ได้) */
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

/* หน้าตาปุ่มยืนยันแบบทดสอบหลังเรียนตามสถานะ (ปุ่มล็อกโดยไม่บอกเหตุผล = ผู้ใช้คิดว่าพัง เลยเดินนาฬิกาให้เห็นว่าเหลือกี่วิ) */
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

/* แบบประเมินความพึงพอใจ — ต่างจากแบบทดสอบหลังเรียนตรงทำตอนไหนก็ได้ (ไม่ขวางทางเดิน) แต่ต้องครบ 1 ครั้งถึงเข้าโหมดพิเศษได้
   ปุ่มโผล่หลังผ่านด่านแก่นหลัก (ตอบตั้งแต่ยังไม่เล่นอะไรไม่มีประโยชน์) */

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

/* ปุ่มมุมบนขวาของแถบหัว — ซ่อนจนผ่านด่านแก่นหลัก ทำเสร็จก็ซ่อนอีก ไม่ให้รกแถบหัว */
function updateSurveyButton(){
  var show = surveyUnlocked() && !FormStatus.surveyDone;
  var b = document.getElementById('btn-survey');
  if(b) b.style.display = show ? 'inline-flex' : 'none';
  /* ตัวเตือนบนหน้าแบบทดสอบหลังเรียน — โผล่เฉพาะตอนยังไม่ได้ทำ (ทำไปแล้วไม่เจอซ้ำให้รำคาญ) */
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


/* ยังติดค้างแบบทดสอบหลังเรียนไหม — อ่านจากไฟล์เซฟด้วย ไม่ใช่แค่ G (ตอนเพิ่งเปิดหน้า G ยังว่าง แต่เซฟรู้แล้วว่าเล่นจบและยังไม่ส่ง) */
function posttestPending(){
  if(FormStatus.posttestDone) return false;
  if(typeof G !== 'undefined' && G.finished) return true;
  var s = (typeof loadSave === 'function') ? loadSave() : null;
  return !!(s && s.finished && !s.posttestDone);
}

/* พากลับหน้าแบบทดสอบหลังเรียน + คืนความคืบหน้าให้ครบ (ต้องคืน G ครบถึงกดเข้าโหมดพิเศษต่อได้ + สร้างแถบด่าน ไม่งั้นออกจากโหมดพิเศษกลับมาไม่มีจุดด่านให้กด) */
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

/* บันทึกว่าเข้าทำแบบทดสอบแล้ว + ปลดล็อกปุ่มถัดไป (เรียกซ้ำปลอดภัย เพราะมีหลายทางเรียกเข้ามา: pointerdown, click, ปุ่มสำรอง) */
function markFormDone(which, silent){
  if(FormStatus[which]) return;
  FormStatus[which] = true;
  /* จับเวลาตั้งแต่เปิดฟอร์ม ใช้คิดเวลาขั้นต่ำก่อนกดยืนยัน + เก็บลงเซฟ เวลาจึงเดินต่อแม้ปิดแท็บไปทำแล้วกลับมา */
  if(which === 'posttest' && !FormStatus.posttestAt) FormStatus.posttestAt = Date.now();
  if(which === 'survey'   && !FormStatus.surveyAt)   FormStatus.surveyAt   = Date.now();
  applyFormStatusUI(which);
  saveGame();
  if(!silent) showToast('ปลดล็อกปุ่มถัดไปแล้ว','success');
}

/* ปุ่มสำรอง — เผื่อการตรวจจับอัตโนมัติพลาด (ทำจากเครื่องอื่น/มือถือตัดจังหวะจนไม่ได้บันทึก) ผู้เรียนจะได้ไม่ติดค้าง */
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

  /* เล่นจบแต่ยังไม่ส่งแบบทดสอบหลังเรียน ห้ามใช้ปุ่มนี้เริ่มใหม่หนีแบบทดสอบ พากลับไปหน้านั้น (ทางหนีที่ชัดสุด เพราะปุ่มนี้ปลดล็อกค้างทุกครั้งที่เปิดเกม) */
  if(posttestPending()){
    gotoPosttest('ยังเหลือแบบทดสอบหลังเรียน — ต้องส่งก่อนจึงจะเริ่มเกมใหม่ได้');
    return;
  }

  /* คนที่เคยทำข้อสอบแล้วเห็นปุ่มนี้ปลดล็อกทุกครั้ง กดผิด (แทน "เล่นต่อ") initGame จะล้างคะแนนทันที เลยต้องเตือนเมื่อมีความคืบหน้าค้าง */
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
      onConfirm:function(){ introOpen('game-fresh'); }
    });
    return;
  }

  introOpen('game-fresh');
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

  /* รางวัลปลดล็อกตรงนี้ ไม่ใช่ตอนจบด่านสุดท้าย (ของเดิม endGame ปลดล็อกทันทีที่ผ่านด่าน 20 ผู้เรียนได้รางวัลก่อนแตะแบบทดสอบ แรงจูงใจเลยหาย) */
  G.modesUnlocked = true;
  if(typeof updateModeButtons === 'function') updateModeButtons();
  updatePosttestGate();
  saveGame();
  showToast('ขอบคุณที่ร่วมกิจกรรม! 🎉 ปลดล็อกโหมดพิเศษแล้ว','success');
}
