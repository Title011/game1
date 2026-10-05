/* ============================================================
   STARS — ดาวประจำด่าน (1-3 ดวง)

   ทำไม: เดิมด่านที่ผ่านแล้วกลับมาเล่นซ้ำไม่ได้คะแนนเพิ่ม (กันไล่เก็บคะแนน)
   ซึ่งถูกแล้วสำหรับคะแนน แต่แปลว่า "เล่นซ้ำให้ดีขึ้น" ไม่มีอะไรมารองรับเลย
   ดาวจึงเป็นเป้าหมายอีกชั้นที่ไม่ไปยุ่งกับคะแนน: ผ่านแล้วยังกลับมาทำให้
   สวยขึ้นได้ และผู้เรียนได้ทบทวนวงจรเดิมอีกรอบโดยมีเหตุผลที่อยากทำเอง

   เกณฑ์ (คิดจาก "ความเข้าใจ" ไม่ใช่ความเร็วอย่างเดียว):
     ★★★ ผ่านโดยไม่เสียชีวิตในด่านนี้เลย และใช้เวลาไม่เกินครึ่งที่ให้มา
     ★★  ผ่านโดยไม่เสียชีวิตในด่านนี้เลย
     ★   ผ่านได้ (เคยตอบผิดหรือหมดเวลาระหว่างทาง)

   เก็บใน localStorage คนละก้อนกับไฟล์เซฟหลักโดยตั้งใจ
   ไฟล์เซฟหลักมีตัวตรวจค่าของมันเองอยู่ (js/save.js) การไปเพิ่มช่องใหม่
   แปลว่าต้องแก้ทั้งตัวเขียน ตัวอ่าน และตัวตรวจ — ความเสี่ยงไม่คุ้มกับดาว
   ============================================================ */

var STARS_KEY = 'stars-v1';
var STARS = { level:-1, startLives:3, cache:null, boardSig:null };

/* อ่านครั้งเดียวแล้วเก็บไว้ในหน่วยความจำ — ตัวจับเวลาเรียกทุก 600ms ตลอดเกม
   ถ้า parse JSON ใหม่ทุกครั้งก็เป็นงานที่เสียเปล่าไปเรื่อย ๆ โดยไม่ได้อะไร
   (เทสบางตัวเขียน localStorage ตรง ๆ จึงมี starsForget() ไว้ล้างแคช) */
function starsLoad(){
  if(STARS.cache) return STARS.cache;
  var o;
  try{ o = JSON.parse(localStorage.getItem(STARS_KEY)); }catch(e){ o = null; }
  STARS.cache = (o && typeof o === 'object' && !(o instanceof Array)) ? o : {};
  return STARS.cache;
}
function starsForget(){ STARS.cache = null; }
/* ล้างดาวทั้งหมด — เรียกจาก clearSave() ตอนผู้เล่นกด "เริ่มใหม่ทั้งหมด" */
function starsReset(){
  STARS.cache = null;
  STARS.boardSig = null;
  try{ localStorage.removeItem(STARS_KEY); }catch(e){}
  starsHideResult();
  starsDecorateDots();
}
function starsStore(o){
  STARS.cache = o;
  try{ localStorage.setItem(STARS_KEY, JSON.stringify(o)); }catch(e){}
}
function starsBest(i){
  var v = starsLoad()[i];
  return (typeof v === 'number' && v >= 1 && v <= 3) ? Math.floor(v) : 0;
}
function starsTotal(){
  var o = starsLoad(), t = 0;
  for(var k in o){
    var v = o[k];
    if(typeof v === 'number' && v >= 1 && v <= 3) t += Math.floor(v);
  }
  return t;
}
function starsMax(){ return (typeof LEVELS !== 'undefined' ? LEVELS.length : 20) * 3; }

/* ข้อความดาว ★★☆ — ใช้ทั้งในกล่องผลและใน tooltip ของจุดด่าน */
function starsText(n){
  n = Math.max(0, Math.min(3, n|0));
  return '★'.repeat(n) + '☆'.repeat(3-n);
}

/* จำนวนชีวิตตอนเข้าด่าน — ใช้ตัดสินว่า "ผ่านรวดเดียว" หรือเปล่า
   เทียบตอนชนะแทนการนับตอนเสีย เพราะไม่มีทางพลาดจังหวะและไม่มี race */
function starsTick(){
  if(G.sandbox || G.endless) return;
  if(STARS.level !== G.level){
    STARS.level = G.level;
    STARS.startLives = G.lives;
  }
  starsDecorateDots();
}

/* ใส่ดาวไว้ใน tooltip ของจุดด่าน — เห็นได้โดยไม่ต้องเพิ่มอะไรลงในแถบ
   ซึ่งบนมือถือแน่นจนใส่อะไรเพิ่มไม่ได้แล้ว */
function starsDecorateDots(){
  var dots = document.querySelectorAll('#level-bar .level-dot');
  for(var i=0;i<dots.length;i++){
    var d = dots[i];
    var idx = parseInt(d.dataset.lvl, 10);
    if(isNaN(idx) || !LEVELS[idx]) continue;
    var s = starsBest(idx);
    var want = LEVELS[idx].title + (s ? '  ' + starsText(s) : '');
    if(d.title !== want) d.title = want;
  }
}

/* คิดดาวของรอบนี้ */
function starsRate(elapsed){
  var lv = LEVELS[G.level];
  if(!lv) return 1;
  var flawless = (G.lives >= STARS.startLives);            /* ไม่เสียชีวิตในด่านนี้ */
  var quick    = lv.timeLimit ? (elapsed <= lv.timeLimit / 2) : false;
  if(flawless && quick) return 3;
  if(flawless) return 2;
  return 1;
}

/* เรียกจากจังหวะผ่านด่านใน js/game.js (ห่อด้วย typeof ไว้แล้ว)
   ต้องเรียกก่อน showResult() เพราะมันไปเติมแถวดาวในกล่องผลลัพธ์ */
function starsOnWin(elapsed){
  if(G.sandbox || G.endless) return;
  var got  = starsRate(elapsed);
  var prev = starsBest(G.level);
  if(got > prev){
    var o = starsLoad();
    o[G.level] = got;
    starsStore(o);
  }
  starsRenderResult(got, prev);
  starsDecorateDots();
}

/* แถวดาวในกล่องผลลัพธ์ */
function starsRenderResult(got, prev){
  var row = document.getElementById('star-row');
  if(!row) return;
  var best    = Math.max(got, prev);
  var improved = got > prev;
  var lv = LEVELS[G.level];
  var half = lv && lv.timeLimit ? Math.floor(lv.timeLimit/2) : 0;

  var pips = '';
  for(var i=1;i<=3;i++){
    pips += '<span class="star-pip' + (i <= got ? ' on' : '') + '"' +
            (i <= got ? ' style="animation-delay:' + (i*0.12) + 's"' : '') +
            '>' + (i <= got ? '★' : '☆') + '</span>';
  }

  var note;
  if(got >= 3){
    note = 'เต็มดวง! ผ่านรวดเดียวและเร็วกว่าครึ่งเวลาที่ให้มา';
  } else if(got === 2){
    note = 'ผ่านรวดเดียว &mdash; ทำให้เสร็จใน ' + half + ' วินาที จะได้ครบ 3 ดวง';
  } else {
    note = 'ผ่านด่านแล้ว &mdash; ผ่านรวดเดียวโดยไม่เสียชีวิตจะได้เพิ่มเป็น 2 ดวง';
  }
  if(!improved && prev > 0){
    note += '<br><span class="star-best">สถิติเดิมของด่านนี้ ' + starsText(prev) + ' ยังไม่ถูกทำลาย</span>';
  } else if(improved && prev > 0){
    note = '<span class="star-new">ทำลายสถิติเดิม ' + starsText(prev) + ' แล้ว!</span><br>' + note;
  }

  row.innerHTML =
      '<div class="star-pips">' + pips + '</div>'
    + '<div class="star-note">' + note + '</div>'
    + '<div class="star-total">ดาวสะสม ' + starsTotal() + ' / ' + starsMax() + ' ดวง</div>';
  row.hidden = false;
  row.classList.remove('pop');
  void row.offsetWidth;          /* บังคับให้แอนิเมชันเล่นใหม่ทุกครั้ง */
  row.classList.add('pop');
}

/* ซ่อนแถวดาวเมื่อผลออกมาว่าไม่ผ่าน — ไม่งั้นดาวของรอบก่อนค้างอยู่ */
function starsHideResult(){
  var row = document.getElementById('star-row');
  if(row) row.hidden = true;
}

/* ============================================================
   กระดานดาวบนหน้าจบเกม

   หน้าจบเดิมมีแต่ปุ่มทำแบบทดสอบหลังเรียน ซึ่งจบแล้วก็จบเลย
   กระดานนี้ทำให้เห็นภาพรวมทั้ง 20 ด่านว่าด่านไหนยังไม่เต็ม
   และกดกลับไปเล่นซ้ำได้ทันที โดยไม่ต้องเดาว่าต้องกดตรงไหน
   ============================================================ */
function starsEsc(s){
  return String(s).replace(/[&<>"']/g, function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  });
}

function starsGoLevel(i){
  if(typeof showScreen === 'function') showScreen('screen-game');
  if(typeof loadLevel === 'function') loadLevel(i);
}

function starsBoardSig(){
  var o = starsLoad(), s = '';
  for(var i=0;i<LEVELS.length;i++) s += starsBest(i);
  return s;
}

function starsRenderBoard(){
  var box = document.getElementById('star-board');
  if(!box) return;
  var total = starsTotal(), max = starsMax();
  var html =
      '<div class="sb-head">ดาวสะสม <b>' + total + ' / ' + max + '</b> ดวง</div>'
    + '<div class="sb-sub">ผ่านรวดเดียวได้ 2 ดวง &middot; เร็วกว่าครึ่งเวลาที่ให้ได้ครบ 3 ดวง'
    + ' &mdash; แตะที่ด่านเพื่อกลับไปเล่นซ้ำ</div>'
    + '<div class="sb-grid">';
  for(var i=0;i<LEVELS.length;i++){
    var s = starsBest(i);
    var t = LEVELS[i] ? LEVELS[i].title : ('ด่าน ' + (i+1));
    html += '<button class="sb-cell' + (s === 3 ? ' full' : (s ? '' : ' none')) + '"'
          + ' onclick="starsGoLevel(' + i + ')"'
          + ' title="' + starsEsc(t) + '">'
          + '<span class="sb-num">' + (i+1) + '</span>'
          + '<span class="sb-stars">' + starsText(s) + '</span>'
          + '</button>';
  }
  html += '</div>';
  box.innerHTML = html;
  box.hidden = false;
}

document.addEventListener('DOMContentLoaded', function(){
  starsTick();
  setInterval(function(){
    starsTick();
    /* วาดกระดานเฉพาะตอนอยู่หน้าจบ และเฉพาะเมื่อดาวเปลี่ยนจริง
       (วาดทุกรอบจะทำให้ปุ่มที่กำลังชี้อยู่ถูกสร้างใหม่ตลอดเวลา) */
    var post = document.getElementById('screen-posttest');
    if(post && post.classList.contains('active')){
      var sig = starsBoardSig();
      if(sig !== STARS.boardSig){ STARS.boardSig = sig; starsRenderBoard(); }
    } else {
      STARS.boardSig = null;
    }
  }, 600);
});
