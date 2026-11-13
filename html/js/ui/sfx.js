/* เสียงตอนต่อสายไฟ — สังเคราะห์เองด้วย Web Audio ไม่ใช้ไฟล์ mp3
   (เกมเปิดจาก Live Server ตรงๆ ไม่อยากแบกไฟล์เสียงเพิ่ม)
   คุมให้ไม่รำคาญ: เบา, คลื่น sine + lowpass, สั้นไม่เกิน 0.2 วิ, กันเสียงซ้อน, มีปุ่มปิด
   มีเสียงแค่เรื่องสายไฟ (ต่อ/ขาแตะกัน/ถอด) อยากใส่ไฟล์เสียงเองดู SFX_FILES ข้างล่าง
   เพลงพื้นหลังอยู่ที่ js/bgm.js */

var SFX = {
  enabled: true,
  ctx: null,
  master: null,
  _last: 0,
  MIN_GAP: 55        /* มิลลิวินาที กันเสียงรัวจนรก */
};

/* ---------- อยากใช้ไฟล์เสียงจริงแทน ----------
   ใส่ชื่อไฟล์ลงช่องข้างล่าง แล้ววางไฟล์ในโฟลเดอร์ audio เช่น connect: 'audio/sfx-connect.mp3'
   เว้นว่าง = ใช้เสียงสังเคราะห์ / หาไฟล์ไม่เจอก็ถอยไปใช้เสียงสังเคราะห์ให้เอง ไม่พัง
   ไฟล์ต้องสั้นมาก (< ครึ่งวิ) และตัดหัวท้ายให้สนิท ไม่งั้นเสียงจะมาช้ากว่าภาพ */
var SFX_FILES = { connect:'', snap:'', disconnect:'' };
var SFX_FILE_VOLUME = 0.45;
var _sfxCache = {};

var SFX_KEY = 'sfx-op-v1';

/* อ่านค่าที่เคยตั้งไว้ (บางเบราว์เซอร์โหมดส่วนตัวอ่านไม่ได้ ก็ถือว่าเปิดเสียง) */
(function(){
  try{
    if(localStorage.getItem(SFX_KEY) === 'off') SFX.enabled = false;
  }catch(e){}
})();


/* สร้างเครื่องเสียงครั้งเดียวตอนใช้จริง
   (สร้างตั้งแต่โหลดหน้าไม่ได้ เบราว์เซอร์จะ suspend ไว้เพราะกฎกัน autoplay
    เกมนี้เสียงเกิดหลังผู้เล่นกด/ลากอยู่แล้ว) */
function sfxCtx(){
  if(SFX.ctx) return SFX.ctx;
  var AC = window.AudioContext || window.webkitAudioContext;
  if(!AC) return null;                       /* เบราว์เซอร์เก่ามาก — เล่นได้แค่ไม่มีเสียง */
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

/* ปลุกเครื่องเสียงตอนแตะจอครั้งแรก เพื่อให้เสียงสายเส้นแรกดังทันไม่หน่วง */
function sfxUnlock(){
  var ctx = sfxCtx();
  if(ctx && ctx.state === 'suspended'){
    try{ ctx.resume(); }catch(e){}
  }
}

['pointerdown','touchstart','keydown'].forEach(function(ev){
  document.addEventListener(ev, sfxUnlock, { once:true, passive:true, capture:true });
});


/* เสียง 1 ตัว = คลื่น sine ผ่านซองเสียงแล้วผ่าน lowpass
   f0→f1 ไถความถี่, gain ความดัง, dur ความยาว(วิ), cut ความถี่ตัด lowpass, delay เลื่อนเริ่ม */
function sfxTone(o){
  var ctx = sfxCtx();
  if(!ctx) return;
  var t0  = ctx.currentTime + (o.delay || 0);
  var dur = o.dur || 0.16;

  var osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(o.f0, t0);
  if(o.f1 && o.f1 !== o.f0){
    /* ไถแบบ exponential (หูได้ยินระดับเสียงเป็นอัตราส่วน) */
    osc.frequency.exponentialRampToValueAtTime(o.f1, t0 + dur * 0.5);
  }

  var lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = o.cut || 2400;
  lp.Q.value = 0.7;                          /* < 1 = ไม่มีหนามที่ความถี่ตัด */

  /* ซองเสียง: ขึ้น 8ms แล้วจางลง (ขึ้นทันทีจาก 0 จะได้ยินเสียง "ป๊อก")
     ปลายทางใช้ 0.0001 ไม่ใช่ 0 เพราะ exponentialRamp ใช้ค่า 0 ไม่ได้ */
  var g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(o.gain, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  osc.connect(lp); lp.connect(g); g.connect(SFX.master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
  /* ปลดโหนดทิ้งเมื่อเสียงจบ ไม่งั้นค้างสะสม */
  osc.onended = function(){
    try{ osc.disconnect(); lp.disconnect(); g.disconnect(); }catch(e){}
  };
}

/* เล่นไฟล์เสียงแทน — คืน true ถ้าเล่นไฟล์แล้ว, false ถ้าไม่ได้ตั้งไฟล์/ไฟล์เสีย (ผู้เรียกไปใช้เสียงสังเคราะห์ต่อ) */
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
  /* เล่นจากสำเนาใหม่ทุกครั้ง ไม่งั้นต่อสายรัวๆ จะกระตุกแทนที่จะเป็นสองเสียง */
  var a = base.cloneNode();
  a.volume = SFX_FILE_VOLUME;
  var p = a.play();
  if(p && p['catch']) p['catch'](function(){});
  return true;
}

/* เช็กก่อนปล่อยเสียง: ตอนนี้ควรเงียบไหม */
function sfxAllowed(){
  if(!SFX.enabled) return false;
  /* ตอนย้อน/ทำซ้ำ ระบบสร้างสายเองหลายเส้น ไม่ใช่ผู้เล่นต่อ — ไม่ดักจะได้ยินเสียงรัว */
  if(typeof HIST !== 'undefined' && HIST.busy) return false;
  if(document.hidden) return false;          /* สลับแท็บไปแล้ว ไม่ต้องดังตาม */

  var now = (window.performance && performance.now) ? performance.now() : Date.now();
  if(now - SFX._last < SFX.MIN_GAP) return false;
  SFX._last = now;
  return true;
}


/* เสียง 3 ตัว แยกกันด้วยหูได้โดยไม่ต้องมองจอ:
   ต่อสาย = ขึ้น/สูง/ดังสุด, ขาแตะกัน = ลง/กลาง, ถอดสาย = ลง/ต่ำ/เบาสุด */

/* ต่อสายสำเร็จ — G5 ไถขึ้น A5 + คู่ห้า (E6) ซ้อนเบาๆ ให้ฟังไม่กัดหูเวลาดังซ้ำ */
function sfxConnect(){
  if(!sfxAllowed()) return;
  if(sfxPlayFile('connect')) return;
  sfxTone({ f0:784,  f1:880,  gain:0.15, dur:0.17, cut:2600 });
  sfxTone({ f0:1320, f1:1320, gain:0.05, dur:0.12, cut:3000, delay:0.012 });
}

/* ขาสองขาแตะกันเอง — เสียง "แปะ" ต่ำและสั้นกว่าต่อสาย ให้รู้ว่าระบบเชื่อมให้เอง */
function sfxSnap(){
  if(!sfxAllowed()) return;
  if(sfxPlayFile('snap')) return;
  sfxTone({ f0:660, f1:587, gain:0.12, dur:0.13, cut:1900 });
}

/* ถอดสาย — เบาและต่ำกว่าทุกเสียง ตั้งใจให้การลบไม่เด่นกว่าการสร้าง */
function sfxDisconnect(){
  if(!sfxAllowed()) return;
  if(sfxPlayFile('disconnect')) return;
  sfxTone({ f0:440, f1:330, gain:0.10, dur:0.15, cut:1500 });
}


/* ปุ่มเปิด/ปิดเสียง (บนแถบหัวเกม) */
function toggleSfx(){
  SFX.enabled = !SFX.enabled;
  try{ localStorage.setItem(SFX_KEY, SFX.enabled ? 'on' : 'off'); }catch(e){}
  updateSfxButton();
  if(SFX.enabled){
    /* เล่นตัวอย่างให้ได้ยินทันทีที่เปิด (ล้าง _last ก่อน ไม่งั้นตัวกันเสียงรัวจะกลืน) */
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
