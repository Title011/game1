/* ============================================================
   BGM — เพลงพื้นหลัง (ไฟล์เสียงจริง)

   ต่างจาก js/sfx.js ตรงที่ตัวนั้นสังเคราะห์เสียงสั้น ๆ เองในโค้ด
   ส่วนเพลงพื้นหลังสังเคราะห์ไม่ไหว ต้องเป็นไฟล์จริง

   ---------- วิธีใส่เพลง ----------
   1. โฟลเดอร์ชื่อ  audio  อยู่ข้าง ๆ index.html   (สร้างไว้ให้แล้ว)
   2. เอาไฟล์เพลงไปวางในโฟลเดอร์นั้น ตั้งชื่อตามตารางนี้

        audio/bgm-game      เพลงตอนเล่นด่านปกติ   << ใส่ไฟล์นี้ไฟล์เดียวก่อนก็ได้
        audio/bgm-sandbox   เพลงโหมดอิสระ
        audio/bgm-endless   เพลงโหมดวัดความเร็ว
        (หน้าแบบทดสอบตั้งให้เงียบไว้ — เหตุผลอยู่ที่ BGM.tracks ด้านล่าง)

      เพลงเริ่มดังตอนกด "เข้าสู่เกมเรียนรู้" และไฟล์ถูกโหลดรอไว้ตั้งแต่
      เปิดหน้าเว็บแล้ว เพลงจึงมาทันทีไม่มีช่วงเงียบรอโหลด

      นามสกุลใช้ได้ทั้ง .mp3 .m4a .ogg .wav — ไม่ต้องแปลงไฟล์เอง
      ระบบจะไล่ลองให้ทีละนามสกุลจนกว่าจะเจอ (ดู BGM.exts ด้านล่าง)
      และข้ามนามสกุลที่เบราว์เซอร์ตัวนั้นเล่นไม่ได้ไปเลย

   3. รีเฟรชหน้าเว็บ แล้วกดปุ่มโน้ตดนตรีบนแถบหัวเกม

   ไฟล์ไหนไม่มีก็ไม่พัง — ระบบจะถอยไปใช้ bgm-game แทนโดยอัตโนมัติ
   ถ้าไม่มีสักไฟล์เดียวก็แค่เงียบ เกมเล่นได้ตามปกติ
   (อยากเปลี่ยนชื่อไฟล์หรือเพิ่มเพลง แก้ที่ BGM.tracks ด้านล่างได้เลย)

   ---------- ข้อควรรู้เรื่องไฟล์ ----------
   • .mp3 ปลอดภัยที่สุด เล่นได้ทุกเบราว์เซอร์
     .m4a ก็ได้ทุกที่เหมือนกัน · .ogg ใช้ไม่ได้บน iPhone/Safari
     .wav เล่นได้ แต่ไฟล์ใหญ่กว่า mp3 ราวสิบเท่า (เพลง 3 นาที ~30 MB)
     ถ้าทำเพลงเองแล้วได้ .wav ออกมา ควรแปลงเป็น .mp3 ก่อนใช้จริง
   • ไฟล์ควรเป็นเพลงที่ "วนแล้วต่อเนียน" (seamless loop) เพราะระบบตั้ง loop
     ไว้ตลอด เพลงที่มีท่อนจบชัด ๆ จะสะดุดทุกครั้งที่วนกลับ
   • ขนาดไฟล์มีผลกับเวลาโหลด แนะนำบิตเรต 96–128 kbps สำหรับเพลงพื้นหลัง
     (เพลงพื้นหลังดังเบาอยู่แล้ว 320 kbps แทบไม่ต่างแต่ไฟล์ใหญ่กว่าสามเท่า)
   • ใช้เพลงที่มีสิทธิ์ใช้จริง — งานโรงเรียนก็ยังเป็นงานเผยแพร่

   ---------- ทำไมถึงไม่ดังทันทีที่เปิดหน้าเว็บ ----------
   เบราว์เซอร์ทุกตัวสมัยนี้ห้ามเล่นเสียงก่อนที่ผู้ใช้จะกดอะไรสักอย่าง
   (นโยบายกัน autoplay) ระบบจึงจำไว้ว่า "จะเล่นเพลงไหน" แล้วรอจังหวะที่
   ผู้เล่นแตะจอครั้งแรกค่อยเริ่ม — ไม่ใช่บั๊ก และแก้ด้วยโค้ดไม่ได้
   ============================================================ */

var BGM = {
  enabled: true,
  volume: 0.35,          /* เพลงพื้นหลังต้องเบากว่าเสียงเอฟเฟกต์เสมอ ไม่งั้นกลบกัน */
  dir: 'audio/',
  /* ชื่อไฟล์ "ไม่ใส่นามสกุล" — นามสกุลจัดการที่ BGM.exts ข้างล่าง
     ช่องไหนเว้นว่าง '' = หน้านั้นไม่มีเพลง (เงียบ)

     menu เว้นว่างไว้โดยตั้งใจ: หน้าแรกคือหน้าแบบทดสอบ ซึ่งมีปุ่มที่เปิด
     Google Form ในแท็บใหม่ ถ้าเล่นเพลงตั้งแต่หน้านั้น เพลงจะดังอยู่ในแท็บ
     ที่ถูกทิ้งไว้ข้างหลังตลอดเวลาที่กำลังทำข้อสอบ ซึ่งน่ารำคาญและหาที่ปิดไม่เจอ
     เพลงจึงเริ่มตอน "เข้าสู่เกม" แทน — อยากให้มีเพลงหน้าแบบทดสอบด้วย
     ใส่ 'bgm-menu' กลับเข้าไปแล้ววางไฟล์ audio/bgm-menu.mp3 */
  tracks: {
    menu:    '',
    game:    'bgm-game',
    sandbox: 'bgm-sandbox',
    endless: 'bgm-endless'
  },
  /* นามสกุลที่จะไล่ลอง เรียงจากที่ควรใช้ที่สุดไปหาน้อยที่สุด

     ที่ต้องไล่ลองแทนที่จะบังคับ .mp3 อย่างเดียว เพราะคนทำเพลงเองมักได้
     .wav ออกมาจากโปรแกรมตัดต่อ หรือ .m4a จากมือถือ การบังคับให้แปลงไฟล์
     ก่อนถึงจะใส่ได้ คือขั้นตอนที่พังได้ง่ายที่สุดในทั้งกระบวนการ */
  exts: ['.mp3', '.m4a', '.ogg', '.wav'],
  fallback: 'game',      /* ไฟล์ไหนหาย ให้ถอยมาใช้เพลงนี้ */
  el: null,
  key: null,             /* คีย์เพลงที่กำลังเล่นอยู่ */
  missing: {},           /* คีย์ที่ลองครบทุกนามสกุลแล้วไม่เจอ จะไม่ลองซ้ำอีก */
  _found: {},            /* คีย์ → นามสกุลที่เจอจริง จะได้ไม่ต้องไล่ลองซ้ำ */
  _exts: null,
  _ext: 0,
  _curExt: '',
  _curSrc: '',           /* ที่อยู่ไฟล์ที่ใส่ให้ <audio> ไปแล้ว — กันการสั่งโหลดซ้ำ */
  _wantPlay: false,      /* false = กำลังโหลดเตรียมไว้เฉย ๆ ยังไม่ต้องดัง */
  _fadeInt: null,
  _pending: null,
  _armed: false
};

var BGM_KEY = 'bgm-op-v1';

/* อ่านค่าที่เคยตั้งไว้ (เปิด/ปิด + ระดับเสียง) */
(function(){
  try{
    var o = JSON.parse(localStorage.getItem(BGM_KEY) || 'null');
    if(o){
      if(typeof o.on  === 'boolean') BGM.enabled = o.on;
      if(typeof o.vol === 'number' && o.vol >= 0 && o.vol <= 1) BGM.volume = o.vol;
    }
  }catch(e){}
})();

function bgmSave(){
  try{ localStorage.setItem(BGM_KEY, JSON.stringify({ on:BGM.enabled, vol:BGM.volume })); }catch(e){}
}


/* ============================================================
   ตัวเล่นเพลง — ใช้ <audio> ตัวเดียวแล้วสลับ src เอา

   ทำไมไม่สร้างตัวละเพลง: เพลงพื้นหลังเล่นทีละเพลงเสมอ การมีหลายตัว
   แปลว่าทุกตัวโหลดไฟล์ค้างไว้ในหน่วยความจำพร้อมกันโดยไม่ได้ใช้
   ============================================================ */
function bgmEl(){
  if(BGM.el) return BGM.el;
  var a = document.createElement('audio');
  a.id = 'bgm-audio';
  a.loop = true;
  a.preload = 'none';    /* ยังไม่ต้องโหลดจนกว่าจะสั่งเล่นจริง */
  a.volume = 0;          /* เริ่มเงียบเสมอ แล้วค่อยไล่ระดับขึ้น ไม่ให้เพลงตูมเข้ามา */
  a.style.display = 'none';
  a.addEventListener('error', bgmOnError);
  /* โหลดไฟล์ติดแล้ว — จำนามสกุลที่ใช้ได้ไว้ ครั้งหน้าจะยิงตรงไฟล์นั้นเลย
     ไม่ต้องไล่ลองตั้งแต่ .mp3 ใหม่ทุกครั้งที่สลับเพลงไปแล้วสลับกลับมา */
  a.addEventListener('loadeddata', function(){
    if(BGM.key) BGM._found[BGM.key] = BGM._curExt;
  });
  document.body.appendChild(a);
  BGM.el = a;
  return a;
}

/* นามสกุลที่เบราว์เซอร์ตัวนี้เล่นได้จริง กรองครั้งเดียวแล้วจำไว้

   ถามเบราว์เซอร์ก่อนด้วย canPlayType ดีกว่ายิงไฟล์ไปลองแล้วรอ error
   เพราะบน iPhone การขอไฟล์ .ogg ที่เล่นไม่ได้อยู่แล้วคือการเสียเวลา
   และเสียเน็ตฟรี ๆ หนึ่งรอบ */
function bgmExts(){
  if(BGM._exts) return BGM._exts;
  var mime = { '.mp3':'audio/mpeg', '.m4a':'audio/mp4', '.ogg':'audio/ogg', '.wav':'audio/wav' };
  var a = bgmEl(), list = [];
  for(var i=0;i<BGM.exts.length;i++){
    var e = BGM.exts[i];
    if(!a.canPlayType || !mime[e] || a.canPlayType(mime[e]) !== '') list.push(e);
  }
  BGM._exts = list.length ? list : ['.mp3'];
  return BGM._exts;
}

/* ที่อยู่ไฟล์ของเพลงนี้ ณ ตอนนี้ — นามสกุลที่เคยเจอแล้วชนะเสมอ
   ถ้ายังไม่เคยเจอ ใช้ตัวที่การไล่ลองเดินมาถึง (BGM._ext) */
function bgmSrc(key){
  var ext = BGM._found[key];
  if(!ext){
    var list = bgmExts();
    ext = list[Math.min(BGM._ext, list.length - 1)];
  }
  BGM._curExt = ext;
  return BGM.dir + BGM.tracks[key] + ext;
}

/* ไล่ระดับเสียงขึ้น/ลง — เพลงที่เริ่มและจบทันทีฟังเหมือนของเสีย
   ใช้ setInterval แทน Web Audio เพราะ <audio>.volume คุมตรง ๆ ได้อยู่แล้ว
   และไม่ต้องลาก element เข้าไปอยู่ในกราฟเสียงให้ซับซ้อนขึ้นโดยไม่จำเป็น */
function bgmFadeTo(a, to, ms, done){
  clearInterval(BGM._fadeInt);
  var from = a.volume, t0 = Date.now();
  BGM._fadeInt = setInterval(function(){
    var k = Math.min(1, (Date.now() - t0) / ms);
    a.volume = Math.max(0, Math.min(1, from + (to - from) * k));
    if(k >= 1){
      clearInterval(BGM._fadeInt);
      BGM._fadeInt = null;
      if(done) done();
    }
  }, 40);
}

/* โหลดไฟล์ไม่ได้ (ยังไม่ได้วางไฟล์ / พิมพ์ชื่อผิด / นามสกุลที่เบราว์เซอร์ไม่รองรับ) */
function bgmOnError(){
  var k = BGM.key;
  if(!k || BGM.missing[k]) return;

  /* นามสกุลที่เคยเจอกลับใช้ไม่ได้แล้ว (ลบไฟล์ทิ้ง/เปลี่ยนชื่อ) — ลืมมันแล้วไล่ใหม่ */
  if(BGM._found[k]){ delete BGM._found[k]; BGM._ext = 0; }

  /* ยังเหลือนามสกุลให้ลอง — ลองตัวถัดไปกับเพลงเดิมก่อน
     นี่คือทางที่เกิดบ่อยที่สุดตอนคนใส่ไฟล์ .wav หรือ .m4a แทน .mp3 */
  var list = bgmExts();
  if(BGM._ext < list.length - 1){
    BGM._ext++;
    var el = bgmEl();
    bgmSetSrc(el, k);
    /* ตอนโหลดรอไว้เฉย ๆ ห้ามสั่งเล่น ไม่งั้นเพลงจะดังขึ้นมาตั้งแต่หน้าแบบทดสอบ */
    if(!BGM._wantPlay){ try{ el.load(); }catch(e){} return; }
    var pr = el.play();
    if(pr && pr['catch']) pr['catch'](function(){ BGM._pending = k; bgmArmGesture(); });
    return;
  }

  /* ลองครบทุกนามสกุลแล้วยังไม่เจอ = ไฟล์เพลงนี้ไม่มีจริง */
  BGM.missing[k] = true;
  BGM.key = null;
  BGM._ext = 0;
  if(window.console && console.info){
    console.info('[BGM] ไม่พบไฟล์เพลง ' + BGM.dir + BGM.tracks[k] +
                 ' (ลองแล้วทุกนามสกุล: ' + list.join(' ') + ') — ' +
                 'ยังไม่ได้วางไฟล์ หรือชื่อไม่ตรง ' +
                 'ดูวิธีใส่เพลงที่หัวไฟล์ js/bgm.js');
  }
  /* ถอยไปเพลงสำรอง — คนที่ใส่ไฟล์เดียวชื่อ bgm-game.mp3 จะได้ยินครบทุกหน้าจอ
     ถ้าเพลงสำรองก็หายไปด้วย จะไม่วนซ้ำ เพราะตรงนี้เช็ค missing ไว้แล้ว */
  if(k === BGM.fallback || BGM.missing[BGM.fallback]) return;
  if(BGM._wantPlay) bgmPlay(BGM.fallback);
  else              bgmPreload(BGM.fallback);
}

/* ค้างไว้รอการกดครั้งแรก — เบราว์เซอร์ห้ามเล่นเสียงก่อนผู้ใช้กดอะไร */
function bgmArmGesture(){
  if(BGM._armed) return;
  BGM._armed = true;
  function go(){
    BGM._armed = false;
    document.removeEventListener('pointerdown', go, true);
    document.removeEventListener('keydown', go, true);
    var k = BGM._pending;
    BGM._pending = null;
    if(k) bgmPlay(k);
  }
  document.addEventListener('pointerdown', go, true);
  document.addEventListener('keydown', go, true);
}

/* ใส่ไฟล์ให้ <audio> โดยไม่สั่งโหลดซ้ำถ้าเป็นไฟล์เดิม

   สำคัญกว่าที่คิด: การกำหนด a.src ทับด้วยค่าเดิมเป๊ะ ๆ ก็ยังนับเป็น
   "เริ่มกระบวนการโหลดสื่อใหม่" ตามสเปก สิ่งที่โหลดเตรียมไว้แล้วจะถูกทิ้ง
   เพลงที่อุตส่าห์โหลดรอไว้ตอนหน้าแบบทดสอบก็จะต้องโหลดใหม่ตอนเข้าเกมพอดี */
function bgmSetSrc(a, key){
  var want = bgmSrc(key);
  if(BGM._curSrc === want) return;
  BGM._curSrc = want;
  a.src = want;
}

/* โหลดเพลงรอไว้เงียบ ๆ ตั้งแต่เปิดหน้าเว็บ ยังไม่เล่น

   มีไว้เพื่อให้ "กดเข้าสู่เกมแล้วเพลงมาทันที" เป็นจริง
   ถ้าเริ่มโหลดตอนกดปุ่มเข้าเกม จะมีช่องว่างเงียบ ๆ ระหว่างรอไฟล์
   ซึ่งบนมือถือหรือเน็ตช้าอาจกินเวลาหลายวินาที
   ตอนนี้พอถึงจังหวะนั้นไฟล์พร้อมอยู่แล้ว เหลือแค่สั่งเล่น */
function bgmPreload(key){
  if(!BGM.tracks[key] || BGM.missing[key]) return;
  var a = bgmEl();
  BGM.key = key;
  BGM._ext = 0;
  BGM._wantPlay = false;
  a.preload = 'auto';
  a.volume = 0;
  bgmSetSrc(a, key);
  try{ a.load(); }catch(e){}
}

function bgmPlay(key){
  if(!BGM.enabled) return;
  if(!BGM.tracks[key]) key = BGM.fallback;
  if(!BGM.tracks[key]) return;              /* ไม่ได้ตั้งชื่อไฟล์ไว้เลย = หน้านี้เงียบ */
  if(BGM.missing[key]){
    if(key === BGM.fallback || BGM.missing[BGM.fallback]) return;
    key = BGM.fallback;
  }
  var a = bgmEl();
  /* เพลงเดิมเล่นอยู่แล้ว ห้ามสั่งเริ่มใหม่ — ไม่งั้นทุกครั้งที่สลับหน้าจอ
     เพลงจะย้อนกลับไปเริ่มต้นท่อนแรก ฟังเหมือนเพลงกระตุก */
  if(BGM.key === key && !a.paused) return;

  function start(){
    BGM.key = key;
    BGM._wantPlay = true;
    /* ไฟล์ที่โหลดรอไว้แล้วจะผ่านตรงนี้โดยไม่ถูกสั่งโหลดใหม่ (ดู bgmSetSrc) */
    if(BGM._curSrc !== bgmSrc(key)) BGM._ext = 0;
    bgmSetSrc(a, key);
    a.volume = 0;
    var p = a.play();
    if(p && p.catch){
      p['catch'](function(){
        /* ยังกดอะไรไม่ครบตามที่เบราว์เซอร์ต้องการ — จำไว้แล้วลองใหม่ตอนแตะจอ */
        BGM._pending = key;
        bgmArmGesture();
      });
    }
    bgmFadeTo(a, BGM.volume, 900);
  }

  if(!a.paused) bgmFadeTo(a, 0, 400, function(){ a.pause(); start(); });
  else start();
}

function bgmStop(){
  BGM.key = null;
  BGM._pending = null;
  BGM._wantPlay = false;
  if(BGM.el && !BGM.el.paused) bgmFadeTo(BGM.el, 0, 350, function(){ BGM.el.pause(); });
}

/* เพลงที่ "ควรจะ" เล่นอยู่ตอนนี้ ตัดสินจากหน้าจอและโหมดที่เปิดอยู่จริง
   อ่านสถานะสด ๆ ทุกครั้งแทนที่จะให้แต่ละโหมดสั่งเปลี่ยนเพลงเอง
   จะได้ไม่ต้องไปแก้ทุกจุดที่เปลี่ยนโหมดในอนาคต */
function bgmWantedKey(){
  var g = document.getElementById('screen-game');
  if(!g || !g.classList.contains('active')) return 'menu';
  if(typeof G !== 'undefined'){
    if(G.sandbox) return 'sandbox';
    if(G.endless) return 'endless';
  }
  return 'game';
}

function bgmRefresh(){
  if(!BGM.enabled){ bgmStop(); return; }
  var key = bgmWantedKey();
  /* หน้านี้ไม่ได้ตั้งเพลงไว้ (เช่นหน้าแบบทดสอบ) = ต้องเงียบ
     ไม่ใช่ปล่อยเพลงของหน้าก่อนหน้าเล่นค้างต่อไป */
  if(!BGM.tracks[key]){ bgmStop(); return; }
  bgmPlay(key);
}


/* ============================================================
   ปุ่มและแถบเลื่อนบนแถบหัวเกม
   ============================================================ */
function toggleBgm(){
  BGM.enabled = !BGM.enabled;
  bgmSave();
  updateBgmButton();
  if(!BGM.enabled){
    bgmStop();
    if(typeof showToast === 'function') showToast('ปิดเพลงพื้นหลัง','');
    return;
  }
  bgmRefresh();
  if(typeof showToast === 'function'){
    /* เปิดแล้วเงียบโดยไม่มีคำอธิบายคือสิ่งที่ทำให้คนคิดว่าเกมพัง
       ถ้ายังไม่ได้วางไฟล์เพลง ต้องบอกตรง ๆ ว่าต้องเอาไฟล์ไปไว้ที่ไหน */
    if(BGM.missing[BGM.fallback]){
      showToast('ยังไม่มีไฟล์เพลง — วางไฟล์ชื่อ ' + BGM.tracks[BGM.fallback] +
                '.mp3 ไว้ในโฟลเดอร์ ' + BGM.dir, 'error');
    }else{
      showToast('เปิดเพลงพื้นหลัง','');
    }
  }
}

function bgmSetVolume(v){
  v = Math.max(0, Math.min(1, +v || 0));
  BGM.volume = v;
  bgmSave();
  /* ลากแถบเลื่อนระหว่างเพลงกำลังไล่ระดับอยู่ ต้องหยุดการไล่ก่อน
     ไม่งั้นเสียงจะเด้งกลับไปค่าที่การไล่ระดับกำลังวิ่งไปหา */
  if(BGM.el && !BGM.el.paused){
    clearInterval(BGM._fadeInt);
    BGM._fadeInt = null;
    BGM.el.volume = v;
  }
  var s = document.getElementById('bgm-vol');
  if(s && +s.value !== Math.round(v * 100)) s.value = Math.round(v * 100);
}

function updateBgmButton(){
  var b = document.getElementById('btn-music');
  if(b){
    if(BGM.enabled) b.classList.remove('muted');
    else            b.classList.add('muted');
    b.setAttribute('aria-pressed', BGM.enabled ? 'true' : 'false');
    b.title = BGM.enabled ? 'ปิดเพลงพื้นหลัง' : 'เปิดเพลงพื้นหลัง';
  }
  var s = document.getElementById('bgm-vol');
  if(s) s.value = Math.round(BGM.volume * 100);
}

function bgmInit(){
  updateBgmButton();
  /* โหลดเพลงของหน้าเกมรอไว้ตั้งแต่ตอนนี้ (เงียบ ๆ ยังไม่เล่น)
     พอกด "เข้าสู่เกมเรียนรู้" เพลงจะมาทันทีโดยไม่ต้องรอโหลด
     และการกดปุ่มนั้นเองคือการกดที่เบราว์เซอร์รออยู่ เพลงจึงเล่นได้เลย */
  /* bgmRefresh ต้องมาก่อน เพราะบนหน้าแบบทดสอบมันจะเรียก bgmStop ซึ่งล้าง
     BGM.key ทิ้ง — ถ้าโหลดรอไว้ก่อน ตัวที่ล้างจะลบร่องรอยว่ากำลังโหลดเพลงไหนอยู่
     แล้วการไล่หานามสกุลไฟล์ (สำหรับคนที่ใช้ .wav/.m4a) จะไม่ทำงาน */
  bgmRefresh();
  if(BGM.enabled) bgmPreload(BGM.fallback);
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', bgmInit);
}else{
  bgmInit();
}
