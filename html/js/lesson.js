/* ============================================================
   LESSON — บทเรียนพื้นฐานก่อนเข้าเกม
   สไลด์ + ฉากทดลองให้แตะ + คำถามเช็กความเข้าใจ

   ลำดับการเข้าเกม:  บทเรียน → แบบทดสอบก่อนเรียน → เกม

   กติกาการดู:
     ครั้งแรก   ต้องผ่านทุกหน้า — กด "ถัดไป" เร็ว ๆ ได้ แต่ข้ามหน้าไม่ได้
                และต้องตอบคำถามให้ถูกก่อนไปต่อ (ตอบผิดลองใหม่ได้ไม่จำกัด)
     ครั้งต่อไป มีปุ่ม "ข้ามบทเรียน" และกดแถบความคืบหน้าข้ามไปหน้าไหนก็ได้
   เปิดดูซ้ำได้จาก: ปุ่มบนหน้าแบบทดสอบก่อนเรียน · ปุ่มในกล่องคู่มือระหว่างเล่น
   (เปิดจากในเกม นาฬิกาด่านหยุดรอเอง — ดู tickTimer ใน js/game.js)

   ทำไมรูปอุปกรณ์ในบทเรียนถึงเป็นรูปเดียวกับในเกม:
   โคลนมาจาก js/device-symbols.js ตรง ๆ ผู้เรียนเห็นหลอดไฟ/สวิตช์หน้าตาไหน
   ในบทเรียน ก็จะเจอหน้าตานั้นในคลังอุปกรณ์ ไม่ต้องจับคู่ภาพการ์ตูนกับของจริงเอง
   ความสว่างของหลอดก็ใช้ --glow ตัวเดียวกับเกม (css/circuit.css)

   เก็บสถานะ "เคยดูจบแล้ว" แยกคีย์จากไฟล์เซฟหลัก (เหตุผลเดียวกับ js/stars.js —
   ไฟล์เซฟหลักมีตัวตรวจค่าของตัวเอง เพิ่มช่องแปลว่าต้องแก้ทั้งตัวเขียน/อ่าน/ตรวจ)
   ============================================================ */

var LESSON = {
  idx:0,
  seen:0,            /* หน้าไกลสุดที่เคยไปถึง — ครั้งแรกห้ามกระโดดเกินนี้ */
  from:'start',      /* เปิดจากไหน: 'start' เปิดเว็บ · 'pretest' หน้าแบบทดสอบ · 'game' คู่มือในเกม */
  done:false,        /* เคยดูจบครบทุกหน้าแล้ว (อ่านจากเครื่อง) */
  playing:true,      /* เล่นอัตโนมัติ */
  elapsed:0, dur:12000, last:0,
  raf:null,
  demoT:null, demoStep:0, demoUser:false,
  sw:false,          /* ฉากวงจรปิด/เปิด: สวิตช์เป็น ON ไหม */
  gone:{},           /* ฉากอนุกรม/ขนาน: หลอดที่ถูกถอดออก */
  ledOk:true,        /* ฉากขั้วบวก/ลบ: LED หันถูกขั้วอยู่ไหม */
  built:false,
  swipe:null
};

var LESSON_KEY  = 'lesson-v1';       /* localStorage — 'done' = เคยดูจบแล้ว */
/* sessionStorage — แท็บนี้ผ่านบทเรียนไปแล้ว
   มือถือมักทิ้งหน้าเว็บที่พักไว้ตอนสลับไปทำแบบทดสอบในแท็บใหม่ พอกลับมาจะโหลดหน้าใหม่
   ถ้าไม่จำไว้ ผู้เรียนจะเจอบทเรียนโผล่มาแทนหน้าแบบทดสอบที่เพิ่งทิ้งไว้ */
var LESSON_PASS = 'lesson-pass-v1';
var LESSON_READ_AFTER_ANSWER = 4500; /* ตอบถูกแล้วให้อ่านคำอธิบายกี่ ms ก่อนเลื่อนหน้าเอง */
var LESSON_DEMO_MS = 2800;           /* จังหวะสาธิตฉากทดลองเองตอนยังไม่มีใครแตะ */

function lessonEl(id){ return document.getElementById(id); }
function lessonSlides(){ return document.querySelectorAll('#screen-lesson .ls-slide'); }
function lessonVisible(){
  var s = lessonEl('screen-lesson');
  return !!(s && s.classList.contains('active'));
}
/* ดูครั้งแรกจริง ๆ = บังคับผ่านทุกหน้า */
function lessonStrict(){ return !LESSON.done && LESSON.from === 'start'; }

/* ---------- จำสถานะ (localStorage/sessionStorage ใช้ไม่ได้ก็ยังดูบทเรียนได้ปกติ) ---------- */
function lessonIsDone(){
  try{ return localStorage.getItem(LESSON_KEY) === 'done'; }catch(e){ return false; }
}
function lessonMarkDone(){
  LESSON.done = true;
  try{ localStorage.setItem(LESSON_KEY, 'done'); }catch(e){}
}
function lessonPassedThisTab(){
  try{ return sessionStorage.getItem(LESSON_PASS) === '1'; }catch(e){ return false; }
}
function lessonMarkPassed(){
  try{ sessionStorage.setItem(LESSON_PASS, '1'); }catch(e){}
}
/* ลืมว่าเคยดูแล้ว — เครื่องนี้จะกลับไปบังคับดูครบเหมือนครั้งแรก */
function lessonForget(){
  LESSON.done = false;
  try{ localStorage.removeItem(LESSON_KEY); }catch(e){}
  try{ sessionStorage.removeItem(LESSON_PASS); }catch(e){}
}

/* ============================================================
   เตรียมหน้า (ครั้งเดียว)
   ============================================================ */
function lessonBuild(){
  if(LESSON.built) return;
  LESSON.built = true;

  var phs = document.querySelectorAll('#screen-lesson [data-dev]');
  for(var i=0;i<phs.length;i++) lessonPlaceDevice(phs[i]);

  var ics = document.querySelectorAll('#screen-lesson [data-icon]');
  for(var j=0;j<ics.length;j++){
    ics[j].innerHTML = ICON(ics[j].getAttribute('data-icon'), +ics[j].getAttribute('data-size') || 18);
  }
  var bolt = lessonEl('ls-bolt');
  if(bolt) bolt.innerHTML = ICON('bolt', 18);
  var hearts = lessonEl('ls-hearts');
  if(hearts) hearts.innerHTML = renderHearts(3, 3);

  /* แถบความคืบหน้า — หนึ่งช่องต่อหนึ่งสไลด์ */
  var slides = lessonSlides(), segs = lessonEl('ls-segs'), n = slides.length;
  for(var k=0;k<n;k++){
    slides[k].setAttribute('aria-label', 'หน้า ' + (k+1) + ' จาก ' + n);
    /* เนื้อหาเกินจอ (มือถือจอเล็ก) — เลื่อนถึงล่างสุดแล้วป้าย "เลื่อนลงดูต่อ" ต้องหายไป */
    slides[k].addEventListener('scroll', lessonCheckMore, { passive:true });
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'ls-seg';
    b.setAttribute('aria-label', 'ไปหน้า ' + (k+1));
    b.appendChild(document.createElement('i'));
    b.onclick = (function(to){ return function(){ lessonJump(to); }; })(k);
    segs.appendChild(b);
  }

  var root = lessonEl('screen-lesson');
  root.addEventListener('click', lessonOnClick);
  /* ปัดเริ่มในพื้นที่สไลด์ แต่ปล่อยนิ้วที่ไหนก็ได้ (ปัดเลยไปถึงแถบปุ่มล่างก็ยังนับ) */
  lessonEl('ls-view').addEventListener('pointerdown', lessonSwipeStart);
  window.addEventListener('pointerup', lessonSwipeEnd);
  window.addEventListener('pointercancel', function(){ LESSON.swipe = null; });
  window.addEventListener('resize', lessonCheckMore);

  lessonApplyPointer();
}

/* วางรูปอุปกรณ์ลงตำแหน่งที่จองไว้ด้วย data-dev
     ใน SVG  — data-box="x y w h" (หน่วยของภาพนั้น) วางเป็น <svg> ซ้อนข้างใน
     ใน HTML — data-w / data-h เป็นพิกเซล
   แทรกไว้เป็นลูกตัวแรก ของที่เขียนไว้ในกลุ่มเดียวกัน (เช่นเครื่องหมาย ✕ ตอนถอดหลอด)
   จึงวาดทับอยู่ด้านบนรูปอุปกรณ์ */
function lessonPlaceDevice(ph){
  var id = 'dev-' + ph.getAttribute('data-dev');
  if(!document.getElementById(id)) return;
  var box = (ph.getAttribute('data-box') || '').split(/\s+/);
  var w = +box[2] || +ph.getAttribute('data-w') || 52;
  var h = +box[3] || +ph.getAttribute('data-h') || 52;
  var svg = makeSvgIconInline(id, w, h);
  if(ph.namespaceURI === 'http://www.w3.org/2000/svg'){
    svg.setAttribute('x', +box[0] || 0);
    svg.setAttribute('y', +box[1] || 0);
  }else{
    svg.style.display = 'block';
  }
  ph.insertBefore(svg, ph.firstChild);
}

/* คำอธิบายวิธีเล่นมีสองชุด — นิ้ว (แตะทีละจุด) กับเมาส์ (ลาก)
   เลือกจากอุปกรณ์ชี้หลักของเครื่อง แบบเดียวกับด่านสอนใน js/coach.js */
function lessonApplyPointer(){
  var touch = false;
  try{ touch = !!(window.matchMedia && matchMedia('(hover: none) and (pointer: coarse)').matches); }catch(e){}
  lessonEl('screen-lesson').classList.toggle('ls-touch', touch);
}

/* ============================================================
   เปิด / ปิด
   ============================================================ */
function lessonOpen(from){
  lessonBuild();
  LESSON.from = from || 'start';
  LESSON.done = lessonIsDone();
  LESSON.seen = lessonStrict() ? 0 : lessonSlides().length - 1;
  LESSON.playing = true;
  lessonResetInteractive();
  showScreen('screen-lesson');
  lessonGo(0);
  lessonLoopStart();
  window.scrollTo(0, 0);
}

/* ออกจากบทเรียนกลับไปที่ที่เปิดมา */
function lessonLeave(){
  lessonLoopStop();
  lessonStopDemo();
  lessonMarkPassed();
  if(LESSON.from === 'game'){
    showScreen('screen-game');
    /* ระหว่างดูบทเรียนจออาจถูกหมุน/ย่อ แต่พื้นที่ทำงานซ่อนอยู่จึงวัดขนาดไม่ได้
       ต้องจัดอุปกรณ์และสายใหม่ตอนกลับมาให้เข้ากรอบปัจจุบัน */
    if(typeof ensureBreadboard === 'function') ensureBreadboard();
    return;
  }
  showScreen('screen-pretest');
}

/* ปุ่มใหญ่ในหน้าสุดท้าย */
function lessonFinish(){
  lessonMarkDone();
  lessonLeave();
}

/* ปุ่มมุมขวาบน — ข้าม/ปิด (ครั้งแรกถูกซ่อนไว้ แต่กันเผื่อเรียกตรง ๆ ด้วย) */
function lessonSkip(){
  if(lessonStrict()) return;
  lessonLeave();
}

/* ปุ่มในกล่องคู่มือระหว่างเล่น */
function lessonFromGame(){
  if(typeof G !== 'undefined' && G.hazardPlaying){
    showToast('รอให้ฉากวงจรพังเล่นจบก่อน แล้วค่อยเปิดบทเรียน','');
    return;
  }
  closeModal('modal-tutorial');
  lessonOpen('game');
}

/* ============================================================
   เปลี่ยนหน้า
   ============================================================ */
function lessonGo(i){
  var slides = lessonSlides(), n = slides.length;
  if(!n) return;
  i = Math.max(0, Math.min(n - 1, i));
  LESSON.idx = i;
  if(i > LESSON.seen) LESSON.seen = i;
  for(var k=0;k<n;k++){
    var on = (k === i);
    slides[k].classList.toggle('active', on);
    slides[k].setAttribute('aria-hidden', on ? 'false' : 'true');
  }
  var s = slides[i];
  s.scrollTop = 0;
  lessonEl('ls-cap').textContent = lessonCaption(s);
  LESSON.elapsed = 0;
  LESSON.dur = lessonDuration(s);
  /* มาถึงหน้าสุดท้ายแล้ว = ผ่านครบทุกหน้า ถึงจะยังไม่กดปุ่มไปต่อก็นับว่าดูจบ */
  if(i === n - 1) lessonMarkDone();
  lessonStartDemo(s);
  lessonUpdateChrome();
  lessonCheckMore();
}

/* เนื้อหาหน้านี้ยาวเกินจอไหม — มีป้าย "เลื่อนลงดูต่อ" ให้เห็นว่ายังมีของอยู่ข้างล่าง
   (แถบเลื่อนบนมือถือซ่อนตัวจนไม่รู้ว่าเลื่อนได้ กล่อง "ในเกม" ท้ายหน้าจะหายไปเงียบ ๆ) */
function lessonCheckMore(){
  var s = lessonSlides()[LESSON.idx], view = lessonEl('ls-view');
  if(!s || !view) return;
  view.classList.toggle('ls-more', s.scrollHeight - s.clientHeight - s.scrollTop > 8);
}
function lessonScrollMore(){
  var s = lessonSlides()[LESSON.idx];
  if(s) s.scrollBy({ top: Math.round(s.clientHeight * .7), behavior:'smooth' });
}

function lessonNext(){
  var n = lessonSlides().length;
  if(LESSON.idx >= n - 1) return;
  if(lessonBlocked()){ lessonNudge(); return; }
  lessonGo(LESSON.idx + 1);
  /* ปุ่ม "ถัดไป" ใช้ไม่ได้ในหน้าสุดท้าย — ย้ายโฟกัสไปที่ปุ่มไปต่อ ไม่ให้หลุดหายไปเฉย ๆ */
  if(LESSON.idx === n - 1){
    var cta = lessonEl('ls-cta');
    if(cta && document.activeElement === lessonEl('ls-next')) cta.focus();
  }
}
function lessonPrev(){
  if(LESSON.idx > 0) lessonGo(LESSON.idx - 1);
}
/* กดช่องบนแถบความคืบหน้า */
function lessonJump(k){
  if(k === LESSON.idx) return;
  if(lessonStrict() && k > LESSON.seen){
    showToast('ดูครั้งแรกต้องไปตามลำดับก่อนนะ — กด "ถัดไป" ได้เลย','');
    return;
  }
  if(k > LESSON.idx && lessonBlocked()){ lessonNudge(); return; }
  lessonGo(k);
}

/* ยังตอบคำถามในหน้านี้ไม่ถูก (บังคับเฉพาะตอนดูครั้งแรก) */
function lessonBlocked(){
  if(!lessonStrict()) return false;
  var s = lessonSlides()[LESSON.idx];
  return !!(s && s.hasAttribute('data-gate') && !s.classList.contains('ls-solved'));
}
function lessonNudge(){
  var s = lessonSlides()[LESSON.idx];
  var box = s && s.querySelector('.ls-opts');
  if(box){
    box.classList.remove('ls-nudge');
    void box.offsetWidth;            /* ให้แอนิเมชันเขย่าเล่นซ้ำได้ทุกครั้งที่กด */
    box.classList.add('ls-nudge');
  }
  showToast('เลือกคำตอบที่ถูกก่อน แล้วค่อยไปหน้าถัดไปนะ','error');
}

/* คำบรรยายของหน้า — หน้าสุดท้ายบอก "ขั้นต่อไป" ตามที่มาของผู้เรียน */
function lessonCaption(s){
  return (s.getAttribute('data-cap') || '').replace('{next}', lessonNextStep());
}
function lessonNextStep(){
  if(LESSON.from === 'game') return 'กลับไปต่อวงจรด่านเดิมได้เลย นาฬิกาหยุดรอไว้ให้แล้ว';
  if(typeof FormStatus !== 'undefined' && FormStatus.pretest) return 'กดเข้าสู่เกม แล้วลงมือต่อวงจรจริงกันเลย';
  return 'ทำแบบทดสอบก่อนเรียน แล้วเข้าไปลงมือต่อวงจรจริงในเกมกันเลย';
}
function lessonCtaText(){
  if(LESSON.from === 'game') return 'กลับไปเล่นต่อ →';
  if(typeof FormStatus !== 'undefined' && FormStatus.pretest) return 'ไปหน้าเข้าสู่เกม →';
  return 'ไปทำแบบทดสอบก่อนเรียน →';
}

/* เวลาค้างต่อหน้าตอนเล่นอัตโนมัติ — คิดจากความยาวคำบรรยาย (อ่านทันไม่ว่าสั้นหรือยาว)
   ใส่ data-dur ที่สไลด์เพื่อกำหนดเองได้ */
function lessonDuration(s){
  var d = +s.getAttribute('data-dur');
  if(d > 0) return d;
  var len = lessonCaption(s).length;
  return Math.max(8000, Math.min(22000, 3000 + len * 65));
}

/* อัปเดตปุ่ม แถบความคืบหน้า และข้อความที่ขึ้นกับหน้าปัจจุบัน */
function lessonUpdateChrome(){
  var slides = lessonSlides(), n = slides.length, i = LESSON.idx, strict = lessonStrict();

  lessonEl('ls-counter').textContent = (i + 1) + ' / ' + n;
  lessonEl('ls-prev').disabled = (i === 0);
  var nx = lessonEl('ls-next');
  nx.disabled = (i === n - 1);
  nx.classList.toggle('wait', lessonBlocked());

  var segs = lessonEl('ls-segs').children;
  for(var k=0;k<segs.length;k++){
    segs[k].classList.toggle('cur', k === i);
    segs[k].classList.toggle('locked', strict && k > LESSON.seen);
    segs[k].style.setProperty('--p', (k < i || (k === i && i === n - 1)) ? '100%' : '0%');
    if(k === i) segs[k].setAttribute('aria-current', 'step');
    else        segs[k].removeAttribute('aria-current');
  }

  /* ปุ่มข้าม: ดูครั้งแรกไม่มีให้ · หน้าสุดท้ายของลำดับปกติก็ไม่ต้องมี (ปุ่มใหญ่ในหน้าทำหน้าที่เดียวกัน)
     เปิดดูซ้ำจากหน้าอื่นมีปุ่มปิดให้ตลอด */
  var sk = lessonEl('ls-skip');
  sk.hidden = strict || (LESSON.from === 'start' && i === n - 1);
  sk.textContent = LESSON.from === 'game'    ? '✕ กลับไปเล่นต่อ'
                 : LESSON.from === 'pretest' ? '✕ ปิดบทเรียน'
                 : 'ข้ามบทเรียน ›';

  var pb = lessonEl('ls-play');
  pb.innerHTML = LESSON.playing ? '⏸ <span class="ls-play-txt">หยุด</span>'
                                : '▶ <span class="ls-play-txt">เล่นอัตโนมัติ</span>';
  pb.setAttribute('aria-pressed', LESSON.playing ? 'true' : 'false');
  pb.setAttribute('aria-label', LESSON.playing ? 'หยุดเล่นอัตโนมัติ' : 'เล่นอัตโนมัติ');

  var cta = lessonEl('ls-cta');
  if(cta) cta.textContent = lessonCtaText();
  var hint = lessonEl('ls-cta-hint');
  if(hint) hint.textContent = 'ขั้นต่อไป: ' + lessonNextStep();
}

function lessonTogglePlay(){
  LESSON.playing = !LESSON.playing;
  lessonUpdateChrome();
}

/* ============================================================
   เล่นอัตโนมัติ — นับเวลาด้วยเฟรม ไม่ใช่นาฬิกาจริง
   แต่ละเฟรมนับได้ไม่เกิน 100ms ช่วงที่สลับแท็บหนีไป (เฟรมหยุด) จึงไม่ถูกนับ
   กลับมาแล้วหน้าไม่กระโดดข้ามไปหลายหน้ารวด
   ============================================================ */
function lessonLoopStart(){
  if(LESSON.raf) return;
  LESSON.last = 0;
  LESSON.raf = requestAnimationFrame(lessonTick);
}
function lessonLoopStop(){
  if(LESSON.raf) cancelAnimationFrame(LESSON.raf);
  LESSON.raf = null;
}
function lessonTick(now){
  LESSON.raf = null;
  /* หน้าบทเรียนถูกสลับออกไปแล้ว (เช่นระบบพาไปหน้าแบบทดสอบหลังเรียน) — หยุดตัวเอง
     lessonOpen() จะเริ่มลูปใหม่เมื่อเปิดกลับมา */
  if(!lessonVisible()){ lessonStopDemo(); return; }
  var dt = LESSON.last ? Math.min(now - LESSON.last, 100) : 0;
  LESSON.last = now;
  if(LESSON.playing) lessonAdvance(dt);
  lessonPaintProgress();
  LESSON.raf = requestAnimationFrame(lessonTick);
}
function lessonAdvance(dt){
  var slides = lessonSlides(), s = slides[LESSON.idx];
  if(LESSON.idx >= slides.length - 1) return;   /* หน้าสุดท้ายรอให้กดปุ่มเอง */
  /* หน้าคำถามรอจนตอบถูกเสมอ ไม่ว่าจะดูครั้งที่เท่าไร — เล่นอัตโนมัติไม่เฉลยแทน */
  if(s.hasAttribute('data-gate') && !s.classList.contains('ls-solved')) return;
  LESSON.elapsed += dt;
  if(LESSON.elapsed >= LESSON.dur) lessonGo(LESSON.idx + 1);
}
function lessonPaintProgress(){
  var n = lessonSlides().length;
  if(LESSON.idx >= n - 1) return;
  var seg = lessonEl('ls-segs').children[LESSON.idx];
  if(!seg) return;
  var p = LESSON.dur ? Math.min(1, LESSON.elapsed / LESSON.dur) : 0;
  seg.style.setProperty('--p', (p * 100).toFixed(1) + '%');
}

/* ============================================================
   ปุ่มลัด / ปัดจอ
   ============================================================ */
document.addEventListener('keydown', function(e){
  if(!lessonVisible()) return;
  if(document.querySelector('.modal-overlay.open')) return;
  var tag = e.target && e.target.tagName;
  if(tag === 'INPUT' || tag === 'TEXTAREA') return;
  if(isNamedKey(e, 'ArrowRight')){ e.preventDefault(); lessonNext(); return; }
  if(isNamedKey(e, 'ArrowLeft')){  e.preventDefault(); lessonPrev(); return; }
  if(isNamedKey(e, 'Escape')){ if(!lessonStrict()) lessonLeave(); return; }
  /* Space บนปุ่มให้ปุ่มทำงานตามปกติ — ไม่งั้นกดปุ่มเดียวได้สองคำสั่ง */
  if(isNamedKey(e, 'Space') && tag !== 'BUTTON' && !e.repeat){
    e.preventDefault();
    lessonTogglePlay();
  }
});

/* ปัดซ้าย-ขวาด้วยนิ้ว — เมาส์ไม่นับ (ลากเมาส์บนจอคอมแล้วหน้าเปลี่ยนเองชวนงง) */
function lessonSwipeStart(e){
  if(e.pointerType === 'mouse') return;
  LESSON.swipe = { x:e.clientX, y:e.clientY, t:Date.now() };
}
function lessonSwipeEnd(e){
  var s = LESSON.swipe;
  LESSON.swipe = null;
  if(!s) return;
  var dx = e.clientX - s.x, dy = e.clientY - s.y;
  if(Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5 || Date.now() - s.t > 800) return;
  if(dx < 0) lessonNext();
  else       lessonPrev();
}

/* ทุกปุ่มในสไลด์ส่งเข้ามาทางนี้ทางเดียว (ระบุคำสั่งด้วย data-act) */
function lessonOnClick(e){
  var t = e.target && e.target.closest ? e.target.closest('[data-act]') : null;
  if(!t) return;
  var act = t.getAttribute('data-act');
  if(act === 'switch')           lessonFlipSwitch(true);
  else if(act === 'bulb')        lessonToggleBulb(t.getAttribute('data-b'), true);
  else if(act === 'bulbs-reset') lessonResetBulbs(true);
  else if(act === 'led')         lessonFlipLed(true);
  else if(act === 'answer')      lessonAnswer(t);
  else if(act === 'finish')      lessonFinish();
}

/* ============================================================
   ฉากทดลอง

   ตอนยังไม่มีใครแตะ ฉากจะสาธิตตัวเองเป็นจังหวะ (สับสวิตช์ / ถอดหลอด / กลับขั้ว)
   คนที่นั่งดูแบบเล่นอัตโนมัติจะได้เห็นทั้งสองสถานะ ไม่ใช่เห็นแค่ภาพนิ่งภาพเดียว
   พอผู้เรียนแตะเองครั้งแรก การสาธิตหยุดทันที และนับเวลาหน้านี้ใหม่ให้ได้ลองเต็มที่
   ============================================================ */
function lessonStartDemo(s){
  lessonStopDemo();
  LESSON.demoUser = false;
  LESSON.demoStep = 0;
  var kind = s && s.getAttribute('data-demo');
  if(!kind) return;
  LESSON.demoT = setInterval(function(){ lessonDemoStep(kind); }, LESSON_DEMO_MS);
}
function lessonStopDemo(){
  if(LESSON.demoT){ clearInterval(LESSON.demoT); LESSON.demoT = null; }
}
function lessonDemoStep(kind){
  if(!lessonVisible() || LESSON.demoUser){ lessonStopDemo(); return; }
  LESSON.demoStep++;
  if(kind === 'switch')   lessonFlipSwitch(false);
  else if(kind === 'led') lessonFlipLed(false);
  else if(kind === 'bulbs'){
    /* ถอดดวงแรก → ใส่คืน → ถอดดวงที่สอง → ใส่คืน วนไปเรื่อย ๆ */
    var step = LESSON.demoStep % 4;
    LESSON.gone = {};
    if(step === 1){ LESSON.gone.sa = true; LESSON.gone.pa = true; }
    if(step === 3){ LESSON.gone.sb = true; LESSON.gone.pb = true; }
    lessonRenderBulbs();
  }
}
function lessonUserTouched(){
  LESSON.demoUser = true;
  lessonStopDemo();
  LESSON.elapsed = 0;
}

function lessonSetGlow(el, v){ if(el) el.style.setProperty('--glow', v); }
function lessonFlowsIn(root, sel, on){
  var f = root.querySelectorAll(sel);
  for(var i=0;i<f.length;i++) f[i].classList.toggle('off', !on);
}
function lessonStatus(id, text, cls){
  var el = lessonEl(id);
  if(!el) return;
  el.textContent = text;
  el.className = 'ls-status ' + cls;
}

/* ---------- วงจรปิด / วงจรเปิด ---------- */
function lessonFlipSwitch(byUser){
  if(byUser) lessonUserTouched();
  LESSON.sw = !LESSON.sw;
  lessonRenderSwitch();
}
function lessonRenderSwitch(){
  var root = lessonEl('ls-d-switch');
  if(!root) return;
  var on = LESSON.sw;
  root.classList.toggle('ls-off', !on);
  var sw = root.querySelector('.ls-sw');
  if(sw) sw.classList.toggle('off', !on);
  lessonSetGlow(root.querySelector('.ls-bulb'), on ? 1 : 0);
  lessonFlowsIn(root, '.ls-f', on);
  var t = root.querySelector('.ls-badge-t');
  if(t) t.textContent = on ? 'ON' : 'OFF';
  lessonStatus('ls-sw-status',
    on ? 'สวิตช์ ON → วงจรปิด ✓ ไฟไหลครบวง หลอดสว่าง'
       : 'สวิตช์ OFF → วงจรเปิด ✗ ทางเดินไฟขาด หลอดดับ',
    on ? 'ok' : 'no');
}

/* ---------- อนุกรม / ขนาน ---------- */
function lessonToggleBulb(b, byUser){
  if(!b) return;
  if(byUser) lessonUserTouched();
  LESSON.gone[b] = !LESSON.gone[b];
  lessonRenderBulbs();
}
function lessonResetBulbs(byUser){
  if(byUser) lessonUserTouched();
  LESSON.gone = {};
  lessonRenderBulbs();
}
function lessonBulbView(b, glow){
  var el = document.querySelector('#screen-lesson [data-b="' + b + '"]');
  if(!el) return;
  el.classList.toggle('ls-gone', !!LESSON.gone[b]);
  lessonSetGlow(el, LESSON.gone[b] ? 0 : glow);
}
function lessonRenderBulbs(){
  var g = LESSON.gone;
  var ser = lessonEl('ls-d-series'), par = lessonEl('ls-d-parallel');
  if(!ser || !par) return;

  /* อนุกรม: ทางเดินไฟมีเส้นเดียว ถอดดวงไหนก็ขาดทั้งวง
     ตอนครบสองดวงก็หรี่ เพราะต้องแบ่งแรงดันกันคนละครึ่ง (ตรงกับตัวจำลองในเกม) */
  var sOn = !g.sa && !g.sb;
  lessonBulbView('sa', sOn ? .42 : 0);
  lessonBulbView('sb', sOn ? .42 : 0);
  lessonFlowsIn(ser, '.ls-f', sOn);
  if(sOn)             lessonStatus('ls-ser-status', 'หรี่ลงทั้งคู่ — ต้องแบ่งแรงดันกัน', 'dim');
  else if(g.sa && g.sb) lessonStatus('ls-ser-status', 'ถอดออกหมดแล้ว — ไม่มีทางให้ไฟไหล', 'no');
  else                lessonStatus('ls-ser-status', 'ขาดดวงเดียว ดับหมดทั้งวง!', 'no');

  /* ขนาน: แต่ละดวงมีทางเดินของตัวเอง ถอดดวงไหนก็ดับแค่ดวงนั้น */
  var aOn = !g.pa, bOn = !g.pb;
  lessonBulbView('pa', aOn ? 1 : 0);
  lessonBulbView('pb', bOn ? 1 : 0);
  lessonFlowsIn(par, '[data-br="a"]',  aOn);
  lessonFlowsIn(par, '[data-br="b"]',  bOn);
  lessonFlowsIn(par, '[data-br="ab"]', aOn || bOn);
  if(aOn && bOn)        lessonStatus('ls-par-status', 'สว่างเต็มที่ทั้ง 2 ดวง', 'ok');
  else if(aOn || bOn)   lessonStatus('ls-par-status', 'ดวงที่เหลือยังสว่างเต็มที่!', 'ok');
  else                  lessonStatus('ls-par-status', 'ถอดออกหมดแล้ว — ไม่มีทางให้ไฟไหล', 'no');
}

/* ---------- ขั้วบวก/ลบ ของ LED ----------
   ในภาพ ไฟจากขั้วบวกวิ่งเข้ามาทางขวา ขาบวกของ LED จึงต้องหันไปทางขวา
   รูปต้นฉบับหันขาบวกไปทางซ้าย — "ถูกขั้ว" จึงเป็นท่าที่กลับด้านรูป (scale -1)
   264 = สองเท่าของจุดกึ่งกลาง LED (x 100–164) พลิกแล้วจึงยังอยู่ที่เดิม */
function lessonFlipLed(byUser){
  if(byUser) lessonUserTouched();
  LESSON.ledOk = !LESSON.ledOk;
  lessonRenderLed();
}
function lessonRenderLed(){
  var root = lessonEl('ls-d-led');
  if(!root) return;
  var ok = LESSON.ledOk;
  var led = root.querySelector('.ls-led');
  if(led){
    led.classList.toggle('on', ok);
    if(ok) led.setAttribute('transform', 'translate(264 0) scale(-1 1)');
    else   led.removeAttribute('transform');
  }
  lessonFlowsIn(root, '.ls-f', ok);
  lessonStatus('ls-led-status',
    ok ? 'ขาบวกของ LED หันหาขั้วบวก ✓ ไฟผ่านได้ LED ติด'
       : 'LED กลับขั้ว ✗ ไฟผ่านไม่ได้ LED ไม่ติด',
    ok ? 'ok' : 'no');
}

/* ============================================================
   คำถาม — ตอบผิดได้ไม่จำกัด ตัวเลือกที่ผิดถูกตัดออกพร้อมคำอธิบายว่าทำไมผิด
   ตอบถูกแล้วค่อยไปต่อได้ (ตอนดูครั้งแรก)
   ============================================================ */
function lessonAnswer(btn){
  var s = btn.closest('.ls-slide');
  if(!s || s.classList.contains('ls-solved') || btn.disabled) return;
  var ok = btn.getAttribute('data-ok') === '1';
  var fb = s.querySelector('.ls-fb');
  if(fb){
    fb.textContent = btn.getAttribute('data-fb') || '';
    fb.className = 'ls-fb ' + (ok ? 'ok' : 'no');
  }
  if(!ok){
    btn.classList.add('wrong');
    btn.disabled = true;
    return;
  }
  btn.classList.add('right');
  s.classList.add('ls-solved');
  var all = s.querySelectorAll('.ls-opt');
  for(var i=0;i<all.length;i++) all[i].disabled = true;
  /* ให้เวลาอ่านคำอธิบายสักครู่ แล้วค่อยเลื่อนหน้าเอง (ถ้าเปิดเล่นอัตโนมัติไว้) */
  LESSON.elapsed = Math.max(0, LESSON.dur - LESSON_READ_AFTER_ANSWER);
  lessonUpdateChrome();
}

/* เปิดบทเรียนใหม่ทุกครั้ง = ฉากทดลองและคำถามเริ่มจากศูนย์ */
function lessonResetInteractive(){
  LESSON.sw = false;
  LESSON.gone = {};
  LESSON.ledOk = true;
  lessonRenderSwitch();
  lessonRenderBulbs();
  lessonRenderLed();
  var qs = document.querySelectorAll('#screen-lesson .ls-slide[data-gate]');
  for(var i=0;i<qs.length;i++){
    qs[i].classList.remove('ls-solved');
    var opts = qs[i].querySelectorAll('.ls-opt');
    for(var j=0;j<opts.length;j++){
      opts[j].disabled = false;
      opts[j].classList.remove('right', 'wrong');
    }
    var fb = qs[i].querySelector('.ls-fb');
    if(fb){ fb.textContent = ''; fb.className = 'ls-fb'; }
  }
}

/* ============================================================
   เริ่มตอนเปิดหน้าเว็บ

   เคยดูจบแล้ว และแท็บนี้ผ่านบทเรียนไปแล้ว (รีเฟรช/มือถือโหลดหน้าใหม่)
     → ไปหน้าแบบทดสอบเลย ไม่ต้องเจอบทเรียนซ้ำทุกครั้งที่หน้าโหลดใหม่
   นอกนั้นเปิดบทเรียนเป็นหน้าแรก (ครั้งแรกบังคับดูครบ ครั้งต่อไปมีปุ่มข้าม)

   ประตูแบบทดสอบหลังเรียน (enforcePosttestGate ใน js/game.js) ทำงานทีหลังตอน
   DOMContentLoaded และสำคัญกว่าเสมอ — ถ้ามันพาไปหน้าแบบทดสอบหลังเรียน
   ลูปของบทเรียนจะเห็นว่าหน้าตัวเองไม่อยู่บนจอแล้วหยุดเอง
   ============================================================ */
function lessonInit(){
  if(!lessonEl('screen-lesson')) return;
  LESSON.done = lessonIsDone();
  if(LESSON.done && lessonPassedThisTab()){
    showScreen('screen-pretest');
    return;
  }
  lessonOpen('start');
}

lessonInit();
