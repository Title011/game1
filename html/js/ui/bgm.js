/* BGM — เพลงพื้นหลัง (ไฟล์เสียงจริง ต่างจาก sfx.js ที่สังเคราะห์เอง)

   วิธีใส่เพลง: วางไฟล์ในโฟลเดอร์ audio/ ตั้งชื่อตามนี้ (ไม่ต้องใส่นามสกุล)
     bgm-game     เพลงตอนเล่นด่าน  << ใส่ไฟล์เดียวนี้ก่อนก็ได้
     bgm-sandbox  โหมดอิสระ
     bgm-endless  โหมดวัดความเร็ว
   นามสกุลได้ทั้ง .mp3 .m4a .ogg .wav (ระบบไล่ลองให้เอง) — ไฟล์ไหนไม่มีก็ถอยไปใช้ bgm-game
   แก้ชื่อ/เพิ่มเพลงได้ที่ BGM.tracks ข้างล่าง

   มีเครื่องเล่น 2 ทาง:
     หลัก  Web Audio : กำหนดจุดวนเองได้ (loopStart/End) เลยวนเพลงไร้รอยต่อ
                       ข้ามความเงียบที่ตัวเข้ารหัส mp3 เติมหัวท้ายไฟล์ไว้
     สำรอง <audio>   : ใช้ตอนเปิดแบบ file:// (fetch โดน Web Audio บล็อก) เสียงดังอยู่ แค่มีช่องว่างตอนวน

   เพลงไม่ดังทันทีที่เปิดหน้า เพราะเบราว์เซอร์ห้ามเล่นเสียงก่อนผู้ใช้กดอะไร (กัน autoplay)
   ไฟล์ .mp3/.m4a ปลอดภัยสุด / .ogg เล่นไม่ได้บน iPhone / .wav ใหญ่กว่ามาก
   ใช้เพลงที่มีสิทธิ์ใช้จริง (งานโรงเรียนก็นับเป็นงานเผยแพร่) */

var BGM = {
  enabled: true,
  volume: 0.35,          /* ต้องเบากว่าเสียงเอฟเฟกต์ ไม่งั้นกลบกัน */
  dir: 'audio/',
  /* ชื่อไฟล์ไม่ใส่นามสกุล / เว้นว่าง = หน้านั้นเงียบ
     menu เว้นว่างตั้งใจ: หน้าแรกคือหน้าแบบทดสอบ ถ้าเล่นเพลงแล้วกดเปิด Google Form
     แท็บใหม่ เพลงจะดังค้างในแท็บเก่าหาที่ปิดไม่เจอ เลยให้เริ่มตอน "เข้าสู่เกม" แทน */
  tracks: {
    menu:    '',
    game:    'bgm-game',
    sandbox: 'bgm-sandbox',
    endless: 'bgm-endless'
  },
  /* นามสกุลที่ไล่ลอง (คนทำเพลงเองมักได้ .wav/.m4a มา บังคับให้แปลงก่อนคือจุดที่พังง่ายสุด) */
  exts: ['.mp3', '.m4a', '.ogg', '.wav'],
  fallback: 'game',      /* ไฟล์ไหนหาย ถอยมาใช้เพลงนี้ */

  key: null,             /* คีย์เพลงที่กำลังเล่น/เตรียมอยู่ */
  missing: {},           /* คีย์ที่ลองครบทุกนามสกุลแล้วไม่เจอ */
  _found: {},            /* คีย์ → นามสกุลที่เจอจริง */
  _exts: null,
  _wantPlay: false,      /* false = โหลดเตรียมไว้เฉยๆ ยังไม่ต้องดัง */

  /* ---- ทางหลัก: Web Audio ---- */
  actx: null,
  gain: null,
  node: null,            /* AudioBufferSourceNode ที่เล่นอยู่ */
  buf: {},               /* คีย์ → { buffer, start, end } */
  loading: {},           /* คีย์ → callback ที่รอผลโหลด */
  _waitT: null,

  /* ---- ทางสำรอง: <audio> ---- */
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


/* นามสกุลที่เบราว์เซอร์ตัวนี้เล่นได้จริง */
function bgmExts(){
  if(BGM._exts) return BGM._exts;
  var mime = { '.mp3':'audio/mpeg', '.m4a':'audio/mp4', '.ogg':'audio/ogg', '.wav':'audio/wav' };
  var probe = document.createElement('audio'), list = [];
  for(var i=0;i<BGM.exts.length;i++){
    var e = BGM.exts[i];
    /* ถามเบราว์เซอร์ก่อน ดีกว่ายิงไฟล์ไปลองแล้วรอ error (เช่น .ogg บน iPhone เสียเน็ตฟรี) */
    if(!probe.canPlayType || !mime[e] || probe.canPlayType(mime[e]) !== '') list.push(e);
  }
  BGM._exts = list.length ? list : ['.mp3'];
  return BGM._exts;
}

function bgmUrl(key, ext){
  return BGM.dir + BGM.tracks[key] + ext;
}


/* ===== ทางหลัก: Web Audio ===== */

/* ใช้เครื่องเสียงตัวเดียวกับ sfx.js (เบราว์เซอร์จำกัดจำนวน AudioContext ต่อหน้า) */
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
    BGM.gain.gain.value = 0;      /* เริ่มเงียบ แล้วค่อยไล่ขึ้น */
    BGM.gain.connect(ctx.destination);
  }
  return BGM.gain;
}

/* ไล่ระดับเสียง (ใช้ linearRamp ได้ เพราะเป็นการหรี่ยาวเป็นวินาที ไม่ใช่ซองเสียงสั้นเหมือน sfx) */
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

/* หาจุดวน — ตัวอย่างเสียงแรก/สุดท้ายที่ไม่เงียบ เพื่อข้ามความเงียบที่ mp3 เติมหัวท้าย
   เกณฑ์ 0.0015 ≈ -56 dB (ต่ำพอไม่กินเสียงจริง สูงพอไม่ติด noise พื้น)
   break ทันทีที่เจอ เลยอ่านแค่ช่วงเงียบหัวท้าย ไม่ใช่ทั้งเพลง */
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
  if(first >= n || last <= first) return { start:0, end:buffer.duration };  /* เงียบหมด/หาไม่เจอ = วนทั้งไฟล์ */
  var sr = buffer.sampleRate;
  return { start: first / sr, end: (last + 1) / sr };
}

function bgmDecode(ab){
  var ctx = bgmAudioCtx();
  return new Promise(function(resolve, reject){
    /* decodeAudioData มีทั้งแบบคืน Promise (ใหม่) และรับ callback (เก่า) — เรียกครบทั้งคู่ */
    var p;
    try{ p = ctx.decodeAudioData(ab, resolve, reject); }
    catch(e){ reject(e); return; }
    if(p && p.then) p.then(resolve, reject);
  });
}

/* โหลด+ถอดรหัส ไล่ทีละนามสกุลจนสำเร็จ */
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
  /* ไม่ตั้ง BGM.missing ตรงนี้ — fetch โดนบล็อกตอน file:// ทั้งที่ไฟล์มีจริง ให้ <audio> ตัดสินแทน */
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

  bgmStopElement();          /* เคยตกไปเล่นด้วย <audio> ก็หยุดก่อน ไม่งั้นซ้อนกัน */
  bgmStopNode();
  if(ctx.state === 'suspended'){ try{ ctx.resume(); }catch(e){} }

  var s = ctx.createBufferSource();
  s.buffer    = rec.buffer;
  s.loop      = true;
  s.loopStart = rec.start;
  s.loopEnd   = rec.end;
  s.connect(g);
  /* เริ่มที่ต้นเสียงจริง ไม่ใช่ 0 ไม่งั้นรอบแรกจะมีเงียบนำหน้ารอบเดียว ฟังแปลกกว่าไม่มีเลย */
  try{ s.start(0, rec.start); }catch(e){ try{ s.start(0); }catch(e2){ return false; } }

  BGM.node = s;
  bgmGainTo(BGM.volume, 0.9);
  return true;
}


/* ===== ทางสำรอง: <audio> ===== */
function bgmEl(){
  if(BGM.el) return BGM.el;
  var a = document.createElement('audio');
  a.id = 'bgm-audio';
  a.loop = true;
  a.preload = 'none';
  a.volume = 0;
  a.style.display = 'none';
  a.addEventListener('error', bgmOnElError);
  /* กันเหนียว: ไฟล์ VBR ที่ไม่มีหัวบอกความยาว loop=true อาจเล่นจบแล้วหยุด — จับ ended แล้วเริ่มใหม่ */
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

/* ใส่ไฟล์ให้ <audio> โดยไม่โหลดซ้ำถ้าไฟล์เดิม (ตั้ง src ทับค่าเดิมก็นับเป็นโหลดใหม่ตามสเปก) */
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

/* ค้างรอการกดครั้งแรก (เบราว์เซอร์ห้ามเล่นเสียงก่อนผู้ใช้กด) */
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
    a.loop = true;            /* ย้ำทุกครั้ง เผื่อมีอะไรไปเผลอปิด */
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


/* ===== คำสั่งที่ส่วนอื่นเรียกใช้ ===== */

/* โหลดเพลงรอไว้เงียบๆ ตั้งแต่เปิดหน้า เพื่อให้กดเข้าเกมแล้วเพลงมาทันที (ไม่ต้องรอโหลด/ถอดรหัส) */
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
  /* เพลงเดิมเล่นอยู่แล้วห้ามเริ่มใหม่ ไม่งั้นสลับหน้าจอทีเพลงจะย้อนไปต้นท่อน ฟังเหมือนกระตุก */
  if(BGM.key === key && BGM.node) return;
  if(BGM.key === key && BGM.el && !BGM.el.paused) return;

  BGM.key = key;
  BGM._wantPlay = true;
  clearTimeout(BGM._waitT);

  if(BGM.buf[key]){ bgmStartNode(key); return; }   /* ถอดรหัสไว้แล้ว เริ่มได้เลยแบบวนไร้รอยต่อ */

  bgmLoadBuffer(key, function(ok){
    if(!BGM._wantPlay || BGM.key !== key) return;   /* เปลี่ยนใจไปแล้วระหว่างรอ */
    clearTimeout(BGM._waitT);
    if(ok && bgmStartNode(key)) return;
    bgmPlayElement(key);                            /* Web Audio ไม่ได้ → ทางสำรอง */
  });

  /* กันเหนียว: ถ้าโหลด/ถอดรหัสนานผิดปกติ ให้ <audio> เล่นไปก่อน (มีช่องว่างตอนวน แต่ดีกว่าเงียบ) */
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

/* เพลงที่ควรเล่นตอนนี้ ตัดสินจากหน้าจอ/โหมดที่เปิดอยู่จริง (อ่านสดทุกครั้ง ไม่ต้องให้แต่ละโหมดสั่งเอง) */
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
  if(!BGM.tracks[key]){ bgmStop(); return; }   /* หน้านี้ไม่มีเพลง (เช่นหน้าแบบทดสอบ) = ต้องเงียบ */
  bgmPlay(key);
}


/* ===== ปุ่ม + แถบเลื่อนบนแถบหัวเกม ===== */
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
    /* ยังไม่ได้วางไฟล์เพลง ต้องบอกตรงๆ ว่าวางที่ไหน ไม่งั้นเปิดแล้วเงียบคนจะคิดว่าพัง */
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
  /* ลากแถบเลื่อนระหว่างเพลงกำลังไล่ระดับ ต้องหยุดการไล่ก่อน ไม่งั้นเสียงเด้งกลับไปค่าที่กำลังวิ่งไปหา */
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
  /* bgmRefresh ก่อน เพราะบนหน้าแบบทดสอบมันเรียก bgmStop ที่ล้าง BGM.key ทิ้ง
     ถ้า preload ก่อน ตัวที่ล้างจะลบร่องรอยว่ากำลังโหลดเพลงไหนอยู่ */
  bgmRefresh();
  if(BGM.enabled) bgmPreload(BGM.fallback);
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', bgmInit);
}else{
  bgmInit();
}
