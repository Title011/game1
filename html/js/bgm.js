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

      นามสกุลใช้ได้ทั้ง .mp3 .m4a .ogg .wav — ไม่ต้องแปลงไฟล์เอง
      ระบบจะไล่ลองให้ทีละนามสกุลจนกว่าจะเจอ (ดู BGM.exts ด้านล่าง)
      และข้ามนามสกุลที่เบราว์เซอร์ตัวนั้นเล่นไม่ได้ไปเลย

      เพลงเริ่มดังตอนกด "เข้าสู่เกมเรียนรู้" และไฟล์ถูกโหลดรอไว้ตั้งแต่
      เปิดหน้าเว็บแล้ว เพลงจึงมาทันทีไม่มีช่วงเงียบรอโหลด

   3. รีเฟรชหน้าเว็บ แล้วกดปุ่มโน้ตดนตรีบนแถบหัวเกม

   ไฟล์ไหนไม่มีก็ไม่พัง — ระบบจะถอยไปใช้ bgm-game แทนโดยอัตโนมัติ
   ถ้าไม่มีสักไฟล์เดียวก็แค่เงียบ เกมเล่นได้ตามปกติ
   (อยากเปลี่ยนชื่อไฟล์หรือเพิ่มเพลง แก้ที่ BGM.tracks ด้านล่างได้เลย)


   ---------- ทำไมต้องมีเครื่องเล่นสองทาง ----------
   ทางหลัก  Web Audio : โหลดไฟล์ทั้งก้อนมาถอดรหัสเป็นคลื่นเสียงในหน่วยความจำ
                        แล้ววนซ้ำที่ระดับ "ตัวอย่างเสียง" ตรง ๆ
   ทางสำรอง <audio>   : ปล่อยให้แท็ก audio เล่นและวนเองด้วย loop=true

   ที่ต้องมีทางหลักเป็น Web Audio เพราะปัญหานี้:

     ไฟล์ .mp3 **วนซ้ำแบบไร้รอยต่อไม่ได้** โดยธรรมชาติของรูปแบบไฟล์เอง
     ตัวเข้ารหัส MP3 ทำงานเป็นบล็อกละ 1152 ตัวอย่าง เพลงที่ยาวไม่ลงตัวพอดี
     กับบล็อกจะถูก "เติมความเงียบ" ต่อท้ายให้เต็มบล็อกสุดท้ายเสมอ
     และยังเติมความเงียบนำหน้าอีกราว 1100 ตัวอย่างเป็นช่วงอุ่นเครื่องตัวถอดรหัส
     รวมแล้วราว 50-100 มิลลิวินาที ซึ่งได้ยินชัดเจนว่าเป็น "ช่องว่าง" ทุกรอบที่วน
     ยิ่งเพลงสั้น (ของเกมนี้ราว 9 วินาที) ยิ่งเจอบ่อย ยิ่งรู้สึกว่าเพลงสะดุด

     loop=true ของแท็ก <audio> วนกลับไปที่ "จุดเริ่มไฟล์" ซึ่งรวมความเงียบ
     ที่ถูกเติมเข้ามาด้วย จึงแก้ด้วยการตั้งค่าไม่ได้เลย

   ทาง Web Audio แก้ได้จริง เพราะกำหนดจุดวนซ้ำเองได้ (loopStart/loopEnd)
   โค้ดจึงไล่หาว่าเสียงจริงเริ่มและจบที่ตัวอย่างที่เท่าไร แล้ววนเฉพาะช่วงนั้น
   ความเงียบที่ตัวเข้ารหัสเติมมาจึงถูกข้ามไปทั้งหมด (ดู bgmLoopPoints)

   ทางสำรองยังต้องมีไว้ เพราะ Web Audio ต้องอ่านไฟล์ด้วย fetch ซึ่งถูกบล็อก
   ถ้าเปิด index.html ตรง ๆ แบบ file:// (ไม่ได้ผ่าน Live Server)
   ในกรณีนั้นเสียงยังดังอยู่ แค่มีช่องว่างตอนวนซ้ำเท่านั้น


   ---------- ทำไมถึงไม่ดังทันทีที่เปิดหน้าเว็บ ----------
   เบราว์เซอร์ทุกตัวสมัยนี้ห้ามเล่นเสียงก่อนที่ผู้ใช้จะกดอะไรสักอย่าง
   (นโยบายกัน autoplay) ระบบจึงจำไว้ว่า "จะเล่นเพลงไหน" แล้วรอจังหวะที่
   ผู้เล่นแตะจอครั้งแรกค่อยเริ่ม — ไม่ใช่บั๊ก และแก้ด้วยโค้ดไม่ได้


   ---------- ข้อควรรู้เรื่องไฟล์ ----------
   • .mp3 ปลอดภัยที่สุด เล่นได้ทุกเบราว์เซอร์
     .m4a ก็ได้ทุกที่เหมือนกัน · .ogg ใช้ไม่ได้บน iPhone/Safari
     .wav เล่นได้ แต่ไฟล์ใหญ่กว่า mp3 ราวสิบเท่า (เพลง 3 นาที ~30 MB)
   • ระบบตัดความเงียบหัวท้ายให้เองแล้ว แต่ถ้าอยากให้วนเนียนที่สุด
     ตัวเพลงเองก็ควรจบแล้วต่อกับต้นเพลงได้พอดีด้วย (จังหวะ/คีย์ต่อเนื่องกัน)
   • บิตเรต 96-128 kbps พอสำหรับเพลงพื้นหลัง ไฟล์เล็กกว่า โหลดเร็วกว่า
   • ใช้เพลงที่มีสิทธิ์ใช้จริง — งานโรงเรียนก็ยังเป็นงานเผยแพร่
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

  key: null,             /* คีย์เพลงที่กำลังเล่น/กำลังเตรียมอยู่ */
  missing: {},           /* คีย์ที่ลองครบทุกนามสกุลแล้วไม่เจอ จะไม่ลองซ้ำอีก */
  _found: {},            /* คีย์ → นามสกุลที่เจอจริง จะได้ไม่ต้องไล่ลองซ้ำ */
  _exts: null,
  _wantPlay: false,      /* false = กำลังโหลดเตรียมไว้เฉย ๆ ยังไม่ต้องดัง */

  /* ---- ทางหลัก: Web Audio (วนซ้ำไร้รอยต่อ) ---- */
  actx: null,
  gain: null,
  node: null,            /* AudioBufferSourceNode ที่กำลังเล่นอยู่ */
  buf: {},               /* คีย์ → { buffer, start, end } */
  loading: {},           /* คีย์ → รายการ callback ที่รอผลโหลดอยู่ */
  _waitT: null,

  /* ---- ทางสำรอง: แท็ก <audio> ---- */
  el: null,
  _ext: 0,
  _curExt: '',
  _curSrc: '',
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
   นามสกุลไฟล์ที่เบราว์เซอร์ตัวนี้เล่นได้จริง
   ============================================================ */
function bgmExts(){
  if(BGM._exts) return BGM._exts;
  var mime = { '.mp3':'audio/mpeg', '.m4a':'audio/mp4', '.ogg':'audio/ogg', '.wav':'audio/wav' };
  var probe = document.createElement('audio'), list = [];
  for(var i=0;i<BGM.exts.length;i++){
    var e = BGM.exts[i];
    /* ถามเบราว์เซอร์ก่อนดีกว่ายิงไฟล์ไปลองแล้วรอ error — บน iPhone การขอไฟล์
       .ogg ที่ยังไงก็เล่นไม่ได้ คือการเสียเวลาและเสียเน็ตฟรี ๆ หนึ่งรอบ */
    if(!probe.canPlayType || !mime[e] || probe.canPlayType(mime[e]) !== '') list.push(e);
  }
  BGM._exts = list.length ? list : ['.mp3'];
  return BGM._exts;
}

function bgmUrl(key, ext){
  return BGM.dir + BGM.tracks[key] + ext;
}


/* ============================================================
   ทางหลัก — Web Audio
   ============================================================ */

/* ใช้เครื่องเสียงตัวเดียวกับ js/sfx.js
   เบราว์เซอร์จำกัดจำนวน AudioContext ต่อหน้าไว้ไม่กี่ตัว และการมีสองตัว
   แปลว่าต้องคอยปลุกจากสถานะ suspended กันคนละที ซึ่งพลาดง่าย */
function bgmAudioCtx(){
  if(BGM.actx) return BGM.actx;
  if(typeof sfxCtx === 'function') BGM.actx = sfxCtx();
  if(!BGM.actx){
    var AC = window.AudioContext || window.webkitAudioContext;
    if(AC){ try{ BGM.actx = new AC(); }catch(e){ BGM.actx = null; } }
  }
  return BGM.actx;
}

function bgmGain(){
  var ctx = bgmAudioCtx();
  if(!ctx) return null;
  if(!BGM.gain){
    BGM.gain = ctx.createGain();
    BGM.gain.gain.value = 0;      /* เริ่มเงียบเสมอ แล้วค่อยไล่ระดับขึ้น */
    BGM.gain.connect(ctx.destination);
  }
  return BGM.gain;
}

/* ไล่ระดับเสียงของทาง Web Audio
   ใช้ linearRamp ได้ (ไม่เหมือน sfxTone ที่ต้องใช้ exponential) เพราะนี่คือ
   การหรี่เสียงยาวเป็นวินาที ไม่ใช่ซองเสียงสั้น ๆ ที่หูจับความโค้งได้ */
function bgmGainTo(v, sec){
  var ctx = bgmAudioCtx(), g = bgmGain();
  if(!ctx || !g) return;
  var t = ctx.currentTime, p = g.gain;
  try{
    p.cancelScheduledValues(t);
    p.setValueAtTime(p.value, t);
    p.linearRampToValueAtTime(v, t + (sec || 0.5));
  }catch(e){ p.value = v; }
}

/* หาจุดวนซ้ำ — ตัวอย่างเสียงแรกและสุดท้ายที่ "ไม่เงียบ"

   นี่คือหัวใจของการวนแบบไร้รอยต่อ: ความเงียบที่ตัวเข้ารหัส MP3 เติมไว้
   หัวท้ายไฟล์จะถูกข้ามทั้งหมด จุดวนจึงตกที่เสียงจริงพอดี

   เกณฑ์ 0.0015 ≈ -56 dB ต่ำพอที่จะไม่กินเสียงจริงแม้เป็นท่อนเบา ๆ
   แต่สูงพอที่จะไม่ติดสัญญาณรบกวนพื้นหลังจาง ๆ ของไฟล์ที่บีบอัดมา

   วนหาแบบ break ทันทีที่เจอ จึงอ่านแค่ช่วงความเงียบหัวท้าย ไม่ใช่ทั้งเพลง */
function bgmLoopPoints(buffer){
  var TH = 0.0015;
  var n = buffer.length, ch = buffer.numberOfChannels;
  var first = n, last = -1, c, i, d;
  for(c=0;c<ch;c++){
    d = buffer.getChannelData(c);
    for(i=0;i<n;i++){
      if(d[i] > TH || d[i] < -TH){ if(i < first) first = i; break; }
    }
    for(i=n-1;i>=0;i--){
      if(d[i] > TH || d[i] < -TH){ if(i > last) last = i; break; }
    }
  }
  /* ทั้งไฟล์เงียบหมด หรือหาไม่เจอ = อย่าไปยุ่งกับมัน วนทั้งไฟล์ตามเดิม */
  if(first >= n || last <= first) return { start:0, end:buffer.duration };
  var sr = buffer.sampleRate;
  return { start: first / sr, end: (last + 1) / sr };
}

function bgmDecode(ab){
  var ctx = bgmAudioCtx();
  return new Promise(function(resolve, reject){
    /* decodeAudioData มีสองแบบตามยุค — แบบคืน Promise (ใหม่) และแบบรับ
       callback (เก่า) เรียกแบบมี callback ครบแล้วรับ Promise ด้วย
       จึงใช้ได้ทั้งสองแบบโดยไม่ต้องดักรุ่นเบราว์เซอร์ */
    var p;
    try{ p = ctx.decodeAudioData(ab, resolve, reject); }
    catch(e){ reject(e); return; }
    if(p && p.then) p.then(resolve, reject);
  });
}

/* โหลด+ถอดรหัสไฟล์เพลง ไล่ทีละนามสกุลจนกว่าจะสำเร็จ */
function bgmFetchTry(key, i){
  var list = bgmExts();
  if(i >= list.length){ bgmBufferDone(key, false); return; }
  var ext = list[i];
  fetch(bgmUrl(key, ext)).then(function(r){
    if(!r.ok) throw new Error('http ' + r.status);
    return r.arrayBuffer();
  }).then(function(ab){
    return bgmDecode(ab);
  }).then(function(buffer){
    var lp = bgmLoopPoints(buffer);
    BGM._found[key] = ext;
    BGM.buf[key] = { buffer:buffer, start:lp.start, end:lp.end };
    bgmBufferDone(key, true);
  })['catch'](function(){
    bgmFetchTry(key, i + 1);
  });
}

function bgmBufferDone(key, ok){
  var cbs = BGM.loading[key] || [];
  delete BGM.loading[key];
  /* ตั้งใจไม่ตั้ง BGM.missing ตรงนี้ — fetch ถูกบล็อกตอนเปิดแบบ file://
     ทั้งที่ไฟล์มีอยู่จริง ให้ทาง <audio> เป็นคนตัดสินว่าไฟล์หายจริงไหม */
  for(var i=0;i<cbs.length;i++) if(cbs[i]) cbs[i](ok);
}

function bgmLoadBuffer(key, cb){
  if(BGM.buf[key]){ if(cb) cb(true); return; }
  if(BGM.loading[key]){ if(cb) BGM.loading[key].push(cb); return; }
  if(!bgmAudioCtx() || !window.fetch || !window.Promise){ if(cb) cb(false); return; }
  BGM.loading[key] = cb ? [cb] : [];
  bgmFetchTry(key, 0);
}

function bgmStopNode(fadeSec){
  if(!BGM.node) return;
  var n = BGM.node;
  BGM.node = null;
  if(fadeSec){
    bgmGainTo(0, fadeSec);
    setTimeout(function(){ try{ n.stop(); n.disconnect(); }catch(e){} }, fadeSec * 1000 + 60);
  }else{
    try{ n.stop(); n.disconnect(); }catch(e){}
  }
}

function bgmStartNode(key){
  var ctx = bgmAudioCtx(), rec = BGM.buf[key], g = bgmGain();
  if(!ctx || !rec || !g) return false;

  bgmStopElement();          /* เคยตกไปเล่นด้วย <audio> ก็ต้องหยุดก่อน ไม่งั้นซ้อนกัน */
  bgmStopNode();
  if(ctx.state === 'suspended'){ try{ ctx.resume(); }catch(e){} }

  var s = ctx.createBufferSource();
  s.buffer    = rec.buffer;
  s.loop      = true;
  s.loopStart = rec.start;
  s.loopEnd   = rec.end;
  s.connect(g);
  /* เริ่มที่ต้นเสียงจริง ไม่ใช่ศูนย์ — ไม่งั้นรอบแรกจะมีความเงียบนำหน้า
     อยู่รอบเดียว แล้วรอบต่อ ๆ ไปไม่มี ซึ่งฟังแปลกกว่าไม่มีเลยทั้งหมด */
  try{ s.start(0, rec.start); }catch(e){ try{ s.start(0); }catch(e2){ return false; } }

  BGM.node = s;
  bgmGainTo(BGM.volume, 0.9);
  return true;
}


/* ============================================================
   ทางสำรอง — แท็ก <audio>
   ============================================================ */
function bgmEl(){
  if(BGM.el) return BGM.el;
  var a = document.createElement('audio');
  a.id = 'bgm-audio';
  a.loop = true;
  a.preload = 'none';
  a.volume = 0;
  a.style.display = 'none';
  a.addEventListener('error', bgmOnElError);
  /* กันเหนียวเรื่องการวนซ้ำ — loop=true ควรพอ แต่ถ้าเบราว์เซอร์อ่านความยาว
     เพลงจากไฟล์ไม่ได้ (ไฟล์ VBR ที่ไม่มีหัวบอกความยาว) มันจะเล่นจบแล้วหยุด
     ตัวนี้จับเหตุการณ์ "จบเพลง" แล้วสั่งเริ่มใหม่เอง เพลงจึงไม่มีทางหยุดค้าง */
  a.addEventListener('ended', function(){
    if(!BGM._wantPlay || !BGM.enabled) return;
    try{ a.currentTime = 0; a.play(); }catch(e){}
  });
  a.addEventListener('loadeddata', function(){
    if(BGM.key) BGM._found[BGM.key] = BGM._curExt;
  });
  document.body.appendChild(a);
  BGM.el = a;
  return a;
}

/* ใส่ไฟล์ให้ <audio> โดยไม่สั่งโหลดซ้ำถ้าเป็นไฟล์เดิม
   การกำหนด a.src ทับด้วยค่าเดิมเป๊ะ ๆ ก็ยังนับเป็น "เริ่มโหลดสื่อใหม่"
   ตามสเปก สิ่งที่โหลดเตรียมไว้แล้วจะถูกทิ้ง */
function bgmElSetSrc(a, key){
  var ext = BGM._found[key];
  if(!ext){
    var list = bgmExts();
    ext = list[Math.min(BGM._ext, list.length - 1)];
  }
  BGM._curExt = ext;
  var want = bgmUrl(key, ext);
  if(BGM._curSrc === want) return;
  BGM._curSrc = want;
  a.src = want;
}

function bgmOnElError(){
  var k = BGM.key;
  if(!k || BGM.missing[k]) return;

  if(BGM._found[k]){ delete BGM._found[k]; BGM._ext = 0; }

  var list = bgmExts();
  if(BGM._ext < list.length - 1){
    BGM._ext++;
    var el = bgmEl();
    bgmElSetSrc(el, k);
    if(!BGM._wantPlay){ try{ el.load(); }catch(e){} return; }
    var pr = el.play();
    if(pr && pr['catch']) pr['catch'](function(){ BGM._pending = k; bgmArmGesture(); });
    return;
  }

  BGM.missing[k] = true;
  BGM.key = null;
  BGM._ext = 0;
  if(window.console && console.info){
    console.info('[BGM] ไม่พบไฟล์เพลง ' + BGM.dir + BGM.tracks[k] +
                 ' (ลองแล้วทุกนามสกุล: ' + list.join(' ') + ') — ' +
                 'ยังไม่ได้วางไฟล์ หรือชื่อไม่ตรง ดูวิธีใส่เพลงที่หัวไฟล์ js/bgm.js');
  }
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

function bgmElFadeTo(a, to, ms, done){
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

function bgmPlayElement(key){
  var a = bgmEl();
  if(BGM.key === key && !a.paused) return;
  function start(){
    BGM.key = key;
    BGM._wantPlay = true;
    a.loop = true;            /* ย้ำทุกครั้ง เผื่อมีอะไรไปเผลอปิดไว้ */
    bgmElSetSrc(a, key);
    a.volume = 0;
    var p = a.play();
    if(p && p['catch']){
      p['catch'](function(){ BGM._pending = key; bgmArmGesture(); });
    }
    bgmElFadeTo(a, BGM.volume, 900);
  }
  if(!a.paused) bgmElFadeTo(a, 0, 400, function(){ a.pause(); start(); });
  else start();
}

function bgmStopElement(fade){
  if(!BGM.el || BGM.el.paused) return;
  if(fade) bgmElFadeTo(BGM.el, 0, 350, function(){ BGM.el.pause(); });
  else { clearInterval(BGM._fadeInt); BGM._fadeInt = null; BGM.el.pause(); }
}

function bgmPreloadElement(key){
  var a = bgmEl();
  BGM.key = key;
  BGM._ext = 0;
  BGM._wantPlay = false;
  a.preload = 'auto';
  a.volume = 0;
  bgmElSetSrc(a, key);
  try{ a.load(); }catch(e){}
}


/* ============================================================
   คำสั่งที่ส่วนอื่นของเกมเรียกใช้
   ============================================================ */

/* โหลดเพลงรอไว้เงียบ ๆ ตั้งแต่เปิดหน้าเว็บ ยังไม่เล่น

   มีไว้เพื่อให้ "กดเข้าสู่เกมแล้วเพลงมาทันที" เป็นจริง
   ถ้าเริ่มโหลดตอนกดปุ่มเข้าเกม จะมีช่องว่างเงียบ ๆ ระหว่างรอไฟล์และรอถอดรหัส
   ซึ่งบนมือถือหรือเน็ตช้าอาจกินเวลาหลายวินาที */
function bgmPreload(key){
  if(!BGM.tracks[key] || BGM.missing[key]) return;
  if(bgmAudioCtx() && window.fetch && window.Promise){ bgmLoadBuffer(key); return; }
  bgmPreloadElement(key);
}

function bgmPlay(key){
  if(!BGM.enabled) return;
  if(!BGM.tracks[key]) key = BGM.fallback;
  if(!BGM.tracks[key]) return;              /* หน้านี้ตั้งใจให้เงียบ */
  if(BGM.missing[key]){
    if(key === BGM.fallback || BGM.missing[BGM.fallback]) return;
    key = BGM.fallback;
  }
  /* เพลงเดิมเล่นอยู่แล้ว ห้ามสั่งเริ่มใหม่ — ไม่งั้นทุกครั้งที่สลับหน้าจอ
     เพลงจะย้อนกลับไปเริ่มต้นท่อนแรก ฟังเหมือนเพลงกระตุก */
  if(BGM.key === key && BGM.node) return;
  if(BGM.key === key && BGM.el && !BGM.el.paused) return;

  BGM.key = key;
  BGM._wantPlay = true;
  clearTimeout(BGM._waitT);

  /* ถอดรหัสไว้แล้ว = เริ่มได้ทันทีแบบวนไร้รอยต่อ */
  if(BGM.buf[key]){ bgmStartNode(key); return; }

  bgmLoadBuffer(key, function(ok){
    if(!BGM._wantPlay || BGM.key !== key) return;   /* เปลี่ยนใจไปแล้วระหว่างรอ */
    clearTimeout(BGM._waitT);
    if(ok && bgmStartNode(key)) return;
    bgmPlayElement(key);                            /* Web Audio ใช้ไม่ได้ → ทางสำรอง */
  });

  /* กันเหนียว: ถ้าโหลด/ถอดรหัสนานผิดปกติ อย่าปล่อยให้เงียบรอไปเรื่อย ๆ
     ให้ <audio> เล่นไปก่อน (มีช่องว่างตอนวนซ้ำ แต่ดีกว่าไม่มีเพลง) */
  BGM._waitT = setTimeout(function(){
    if(BGM._wantPlay && BGM.key === key && !BGM.node) bgmPlayElement(key);
  }, 1500);
}

function bgmStop(){
  BGM.key = null;
  BGM._pending = null;
  BGM._wantPlay = false;
  clearTimeout(BGM._waitT);
  bgmStopNode(0.35);
  bgmStopElement(true);
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
  if(BGM.node && BGM.gain){
    var ctx = bgmAudioCtx(), p = BGM.gain.gain;
    try{
      p.cancelScheduledValues(ctx.currentTime);
      p.setValueAtTime(v, ctx.currentTime);
    }catch(e){ p.value = v; }
  }
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
  /* bgmRefresh ต้องมาก่อน เพราะบนหน้าแบบทดสอบมันจะเรียก bgmStop ซึ่งล้าง
     BGM.key ทิ้ง — ถ้าโหลดรอไว้ก่อน ตัวที่ล้างจะลบร่องรอยว่ากำลังโหลดเพลงไหนอยู่ */
  bgmRefresh();
  if(BGM.enabled) bgmPreload(BGM.fallback);
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', bgmInit);
}else{
  bgmInit();
}
