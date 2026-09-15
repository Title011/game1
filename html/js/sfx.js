/* ============================================================
   SFX — เสียงตอบรับตอนต่อสายไฟ

   ทำไมค่าตั้งต้นเป็นเสียงสังเคราะห์ ไม่ใช่ไฟล์ .mp3:
     เกมนี้ไม่มีขั้นตอน build และเปิดจาก Live Server ตรง ๆ
     ใส่ไฟล์เสียงคือแบกไฟล์เพิ่มและต้องรอโหลดก่อนถึงจะได้ยินครั้งแรก
     Web Audio สังเคราะห์เสียงสั้น ๆ ได้เองในโค้ดไม่กี่บรรทัด
     ขนาดศูนย์ไบต์ ดังทันทีไม่ต้องรอ และปรับโทนได้ละเอียดกว่าไฟล์สำเร็จรูป
     (อยากใช้ไฟล์ .mp3 ของตัวเองแทนก็ได้ — ดู SFX_FILES ด้านล่าง
      ส่วนเพลงพื้นหลังเป็นไฟล์ .mp3 อยู่แล้ว ดู js/bgm.js)

   ทำไมต้องออกแบบให้ "ไม่รำคาญ" เป็นพิเศษ:
     เสียงในเกมสอนจะดังซ้ำเป็นร้อยครั้งต่อรอบการเล่น ต่างจากเสียงในหนัง
     ที่ได้ยินครั้งเดียว ห้าอย่างที่ทำให้เสียงซ้ำ ๆ กลายเป็นเสียงน่ารำคาญ
     และวิธีกันไว้ในไฟล์นี้:
       1. ดังเกินไป      → MASTER ต่ำ (0.5) คูณกับเกนต่อเสียงที่ต่ำอยู่แล้ว
       2. แหลม/จี๊ด      → ใช้คลื่น sine ล้วน (ไม่มีฮาร์มอนิกคม) แล้วยังกรอง
                            ความถี่สูงทิ้งด้วย lowpass อีกชั้น
       3. ยาวเกินไป      → ทุกเสียงจบภายใน 0.2 วินาที และไถจบแบบ exponential
                            ซึ่งหูคนรับว่าเป็นการ "จางหาย" ไม่ใช่ "ถูกตัด"
       4. รัวติดกัน      → MIN_GAP กันเสียงซ้อน และการเชื่อมขาหลายจุดพร้อมกัน
                            นับเป็นเสียงเดียว ไม่ใช่เสียงละจุด
       5. ดังตอนไม่ได้ตั้งใจ → ปิดเสียงระหว่างย้อน/ทำซ้ำประวัติ (HIST.busy)
                            เพราะการกู้คืนวงจรสร้างสายทีเดียวเป็นสิบเส้น
     และมีปุ่มปิดเสียงถาวรให้เสมอ — จำค่าไว้ในเครื่อง ไม่ต้องกดใหม่ทุกครั้ง

   เสียงที่มีตอนนี้มีแค่เรื่องสายไฟเท่านั้น (ต่อ / ขาแตะกันเอง / ถอด)
   ตั้งใจไม่ใส่เสียงให้ทุกการกระทำ เพราะเกมที่มีเสียงทุกปุ่มคือเกมที่ผู้เล่น
   ปิดเสียงทิ้งตั้งแต่นาทีแรก แล้วก็จะไม่ได้ยินเสียงที่สำคัญจริง ๆ ไปด้วย
   ============================================================ */

var SFX = {
  enabled: true,
  ctx: null,
  master: null,
  _last: 0,
  MIN_GAP: 55        /* มิลลิวินาที — สั้นกว่านี้หูแยกไม่ออกอยู่ดี กลายเป็นเสียงรก */
};

/* ---------- อยากใช้ไฟล์เสียงจริงแทนเสียงสังเคราะห์ ----------
   ใส่ชื่อไฟล์ลงช่องข้างล่างนี้ แล้วเอาไฟล์ไปวางในโฟลเดอร์ audio
   เช่น  connect: 'audio/sfx-connect.mp3'
   ช่องไหนเว้นว่างไว้ = ใช้เสียงสังเคราะห์ตามเดิม
   ไฟล์ไหนหาไม่เจอก็ไม่พัง จะถอยกลับไปใช้เสียงสังเคราะห์ให้เอง

   เสียงเอฟเฟกต์ต้องเป็นไฟล์ "สั้นมาก" (ไม่เกินครึ่งวินาที) และตัดหัวท้าย
   ให้สนิท ไฟล์ที่มีความเงียบนำหน้าแม้แค่เสี้ยววินาที จะทำให้เสียงมาช้ากว่าภาพ
   จนรู้สึกว่าเกมหน่วง ทั้งที่จริง ๆ เป็นที่ไฟล์ */
var SFX_FILES = { connect:'', snap:'', disconnect:'' };
var SFX_FILE_VOLUME = 0.45;
var _sfxCache = {};

var SFX_KEY = 'sfx-op-v1';

/* อ่านค่าที่ผู้เล่นเคยตั้งไว้ — localStorage ใช้ไม่ได้ในโหมดส่วนตัวบางเบราว์เซอร์
   ถ้าอ่านไม่ได้ก็ถือว่าเปิดเสียง (ค่าเริ่มต้น) เกมยังเล่นได้ปกติ */
(function(){
  try{
    if(localStorage.getItem(SFX_KEY) === 'off') SFX.enabled = false;
  }catch(e){}
})();


/* ============================================================
   เครื่องเสียง — สร้างครั้งเดียวตอนต้องใช้จริง

   ไม่สร้างตั้งแต่โหลดหน้า เพราะเบราว์เซอร์สมัยใหม่จะสร้าง AudioContext
   มาในสถานะ suspended ถ้ายังไม่มีการกดอะไรเลย (กฎกัน autoplay)
   เกมนี้เสียงทุกตัวเกิดหลังผู้เล่นกด/ลากอยู่แล้ว จึงสร้างตอนนั้นได้เลย
   ============================================================ */
function sfxCtx(){
  if(SFX.ctx) return SFX.ctx;
  var AC = window.AudioContext || window.webkitAudioContext;
  if(!AC) return null;                       /* เบราว์เซอร์เก่ามาก — เล่นเกมต่อได้ แค่ไม่มีเสียง */
  try{
    SFX.ctx = new AC();
    SFX.master = SFX.ctx.createGain();
    SFX.master.gain.value = 0.5;
    SFX.master.connect(SFX.ctx.destination);
  }catch(e){
    SFX.ctx = null;
  }
  return SFX.ctx;
}

/* ปลุกเครื่องเสียงตอนผู้เล่นแตะจอครั้งแรก
   ทำไว้ล่วงหน้าเพื่อให้เสียง "ต่อสายเส้นแรก" ดังทันที ไม่หน่วงเสี้ยววินาที
   รอสร้างตอนต่อสายจริงก็ได้ แต่จะได้ยินช้ากว่าภาพที่เส้นสายโผล่ */
function sfxUnlock(){
  var ctx = sfxCtx();
  if(ctx && ctx.state === 'suspended'){
    try{ ctx.resume(); }catch(e){}
  }
}

['pointerdown','touchstart','keydown'].forEach(function(ev){
  document.addEventListener(ev, sfxUnlock, { once:true, passive:true, capture:true });
});


/* ============================================================
   เสียงหนึ่งตัว = คลื่น sine หนึ่งเส้น ผ่านซองเสียง แล้วผ่านตัวกรอง

     f0 → f1  ความถี่ต้นทาง → ปลายทาง การไถความถี่นิด ๆ ทำให้ฟังเป็น
              "เข้าที่แล้ว" แทนที่จะเป็น "ปี๊บ" แบบเครื่องใช้ไฟฟ้า
     gain     ความดังยอด (ก่อนคูณ MASTER)
     dur      ความยาวทั้งเสียง เป็นวินาที
     cut      ความถี่ตัดของ lowpass — ยิ่งต่ำยิ่งฟังนุ่ม/ทึบ
     delay    เลื่อนเวลาเริ่ม ใช้ซ้อนสองเสียงให้เป็นคอร์ดเล็ก ๆ
   ============================================================ */
function sfxTone(o){
  var ctx = sfxCtx();
  if(!ctx) return;
  var t0  = ctx.currentTime + (o.delay || 0);
  var dur = o.dur || 0.16;

  var osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(o.f0, t0);
  if(o.f1 && o.f1 !== o.f0){
    /* ไถแบบ exponential ไม่ใช่ linear — หูคนได้ยินระดับเสียงเป็นอัตราส่วน
       (ขึ้นหนึ่งอ็อกเทฟ = คูณสอง) การไถเชิงเส้นจึงฟังเหมือนเร่งแล้วค้าง */
    osc.frequency.exponentialRampToValueAtTime(o.f1, t0 + dur * 0.5);
  }

  var lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = o.cut || 2400;
  lp.Q.value = 0.7;                          /* ต่ำกว่า 1 = ไม่มีหนามที่ความถี่ตัด */

  /* ซองเสียง: ค่อย ๆ ขึ้น 8 มิลลิวินาที แล้วจางลงจนเงียบ
     ที่ต้องมีช่วงขึ้น (ไม่ดังเต็มทันที) เพราะการกระโดดจาก 0 เป็นค่าเต็ม
     ในเฟรมเดียวจะได้ยินเป็นเสียง "ป๊อก" ของขอบคลื่น ไม่ใช่เสียงที่ตั้งใจ

     ค่าปลายทางใช้ 0.0001 ไม่ใช่ 0 เพราะ exponentialRamp ใช้ค่าศูนย์ไม่ได้
     (สูตรเป็นอัตราส่วน ศูนย์จะทำให้ค่าทั้งเส้นเป็นศูนย์) */
  var g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(o.gain, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  osc.connect(lp); lp.connect(g); g.connect(SFX.master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
  /* ปลดสายทิ้งเมื่อเสียงจบ — ไม่งั้นโหนดค้างสะสมทุกครั้งที่ต่อสาย */
  osc.onended = function(){
    try{ osc.disconnect(); lp.disconnect(); g.disconnect(); }catch(e){}
  };
}

/* เล่นไฟล์เสียงแทนเสียงสังเคราะห์ — คืน true ถ้าเล่นไฟล์ไปแล้ว
   คืน false เมื่อ "ไม่ได้ตั้งไฟล์ไว้" หรือ "ไฟล์นั้นเล่นไม่ได้" ผู้เรียกจะได้
   ไปใช้เสียงสังเคราะห์ต่อ เกมจึงไม่มีทางเงียบเพราะพิมพ์ชื่อไฟล์ผิด */
function sfxPlayFile(key){
  var path = SFX_FILES[key];
  if(!path) return false;
  if(_sfxCache[key] === 'missing') return false;

  var base = _sfxCache[key];
  if(!base){
    base = new Audio(path);
    base.preload = 'auto';
    base.addEventListener('error', function(){
      _sfxCache[key] = 'missing';
      if(window.console && console.info){
        console.info('[SFX] เล่นไฟล์ ' + path + ' ไม่ได้ — กลับไปใช้เสียงสังเคราะห์ ' +
                     '(ตั้งชื่อไฟล์ที่ SFX_FILES ใน js/sfx.js)');
      }
    });
    _sfxCache[key] = base;
  }
  /* เล่นจากสำเนาใหม่ทุกครั้ง ไม่ใช่ตัวต้นแบบ — ตัวเดียวเล่นซ้อนตัวเองไม่ได้
     ต่อสายรัว ๆ สองครั้งติดจะกลายเป็นเสียงกระตุกแทนที่จะเป็นสองเสียง */
  var a = base.cloneNode();
  a.volume = SFX_FILE_VOLUME;
  var p = a.play();
  if(p && p['catch']) p['catch'](function(){});
  return true;
}

/* ด่านตรวจก่อนปล่อยเสียง — รวมเงื่อนไข "ตอนนี้ควรเงียบไหม" ไว้ที่เดียว */
function sfxAllowed(){
  if(!SFX.enabled) return false;
  /* กำลังย้อน/ทำซ้ำประวัติ = ระบบสร้างสายเองทีละหลายเส้น ไม่ใช่ผู้เล่นต่อ
     ถ้าไม่ดักตรงนี้ กด "ย้อน" ครั้งเดียวจะได้ยินเสียงรัวเป็นชุด */
  if(typeof HIST !== 'undefined' && HIST.busy) return false;
  if(document.hidden) return false;          /* สลับแท็บไปแล้ว ไม่ต้องดังตามหลัง */

  var now = (window.performance && performance.now) ? performance.now() : Date.now();
  if(now - SFX._last < SFX.MIN_GAP) return false;
  SFX._last = now;
  return true;
}


/* ============================================================
   เสียงจริงสามตัว

   ทั้งสามตัวต้องแยกออกจากกันได้ด้วยหูโดยไม่ต้องมองจอ:
     ต่อสาย   — ขึ้น  สูงสุด ดังสุด
     ขาแตะกัน — ลง    กลาง  (ระบบเชื่อมให้เอง ไม่ใช่สายที่ลากเอง)
     ถอดสาย   — ลง    ต่ำสุด เบาสุด
   ============================================================ */

/* ต่อสายสำเร็จ — G5 ไถขึ้นหา A5 พร้อมเสียงคู่ห้า (E6) ซ้อนเบา ๆ
   เลือกคู่ห้าเพราะเป็นช่วงเสียงที่อัตราส่วนความถี่ลงตัวที่สุดรองจากอ็อกเทฟ
   (3:2) คลื่นสองเส้นจึงไม่ตีกัน ฟังซ้ำเป็นร้อยครั้งก็ไม่กัดหู
   ตัวซ้อนดังแค่ 1 ใน 3 ของตัวหลัก ทำหน้าที่เติมประกายไม่ใช่เติมความดัง */
function sfxConnect(){
  if(!sfxAllowed()) return;
  if(sfxPlayFile('connect')) return;
  sfxTone({ f0:784,  f1:880,  gain:0.15, dur:0.17, cut:2600 });
  sfxTone({ f0:1320, f1:1320, gain:0.05, dur:0.12, cut:3000, delay:0.012 });
}

/* ขาสองขาแตะกันเอง — เสียง "แปะ" ต่ำกว่าและสั้นกว่าเสียงต่อสาย
   ต้องต่างกันพอให้รู้ทันทีว่าระบบเชื่อมให้เอง ไม่ใช่สายที่เพิ่งลากเอง
   ไถลงเพื่อให้ฟังเหมือนของสองชิ้นดูดเข้าหากันแล้วหยุด */
function sfxSnap(){
  if(!sfxAllowed()) return;
  if(sfxPlayFile('snap')) return;
  sfxTone({ f0:660, f1:587, gain:0.12, dur:0.13, cut:1900 });
}

/* ถอดสาย — ไถลงและเบากว่าทุกเสียง
   ตั้งใจให้การลบไม่เด่นกว่าการสร้าง เสียงลบที่ดังเท่าเสียงต่อจะทำให้
   การรื้อวงจร (ซึ่งผู้เล่นทำบ่อยมากตอนลองผิดลองถูก) กลายเป็นเสียงรบกวน */
function sfxDisconnect(){
  if(!sfxAllowed()) return;
  if(sfxPlayFile('disconnect')) return;
  sfxTone({ f0:440, f1:330, gain:0.10, dur:0.15, cut:1500 });
}


/* ============================================================
   ปุ่มเปิด/ปิดเสียง (อยู่บนแถบหัวเกม)
   ============================================================ */
function toggleSfx(){
  SFX.enabled = !SFX.enabled;
  try{ localStorage.setItem(SFX_KEY, SFX.enabled ? 'on' : 'off'); }catch(e){}
  updateSfxButton();
  if(SFX.enabled){
    /* ให้ได้ยินตัวอย่างทันทีที่เปิด จะได้รู้ว่าเสียงดังแค่ไหนก่อนกลับไปเล่น
       ล้าง _last ก่อน ไม่งั้นตัวกันเสียงรัวอาจกลืนเสียงตัวอย่างนี้ไป */
    SFX._last = 0;
    sfxConnect();
  }
  if(typeof showToast === 'function'){
    showToast(SFX.enabled ? 'เปิดเสียงแล้ว' : 'ปิดเสียงแล้ว', '');
  }
}

function updateSfxButton(){
  var b = document.getElementById('btn-sound');
  if(!b) return;
  if(SFX.enabled) b.classList.remove('muted');
  else            b.classList.add('muted');
  b.setAttribute('aria-pressed', SFX.enabled ? 'true' : 'false');
  b.title = SFX.enabled ? 'ปิดเสียง' : 'เปิดเสียง';
  var ic = b.querySelector('.sound-ico');
  if(ic) ic.innerHTML = SFX.enabled ? '&#x1F50A;' : '&#x1F507;';
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', updateSfxButton);
}else{
  updateSfxButton();
}
