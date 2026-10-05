/* ============================================================
   UI — ตัวช่วยหน้าตาทั่วไป: สร้างไอคอน SVG จาก symbol,
        วางไอคอนลงปุ่ม, เปิด/ปิด modal, และ toast แจ้งเตือน
   ============================================================ */
/* เก็บ viewBox ของแต่ละ symbol (อ่านจาก DOM ครั้งเดียว) */
var _svgViewBoxCache = null;
function getSymbolViewBox(svgId){
  if(!_svgViewBoxCache){
    _svgViewBoxCache = {};
    var syms = document.querySelectorAll('symbol[id^="dev-"]');
    for(var i=0;i<syms.length;i++){
      _svgViewBoxCache[syms[i].id] = syms[i].getAttribute('viewBox') || '0 0 52 52';
    }
  }
  return _svgViewBoxCache[svgId] || '0 0 52 52';
}

function makeSvgIcon(svgId,w,h){
  var ns='http://www.w3.org/2000/svg';
  var svg=document.createElementNS(ns,'svg');
  /* ใช้ viewBox ตรงกับ symbol จริง (ไม่งั้นภาพเบี้ยว) */
  svg.setAttribute('viewBox', getSymbolViewBox(svgId));
  svg.setAttribute('width',w||34);
  svg.setAttribute('height',h||34);
  /* รักษาสัดส่วน ไม่ยืด/บีบ */
  svg.setAttribute('preserveAspectRatio','xMidYMid meet');
  var use=document.createElementNS(ns,'use');
  use.setAttribute('href','#'+svgId);
  svg.appendChild(use);
  return svg;
}

/* ไอคอนแบบ "ฝังชิ้นส่วนจริง" — ก๊อปปี้รูปทรงข้างใน symbol มาวางเป็นโหนดจริง

   ทำไมต้องมีอีกแบบ: <use> วางเนื้อหาไว้ใน shadow tree ที่ตัวเลือก CSS
   จากไฟล์ .css เข้าไปไม่ถึง เลือกได้แค่ตัว <svg>/<use> ทั้งก้อนเท่านั้น
   กฎอย่าง ".ws-item.lit .motor-rotor" จึงไม่เคยจับอะไรเลย
   (สืบทอดค่าเข้าไปได้อยู่ เช่น --glow — แต่เลือกทีละชิ้นไม่ได้)

   อุปกรณ์ในพื้นที่ทำงานต้องขยับ/เรืองแสงทีละชิ้นตามค่าไฟฟ้าจริง
   จึงต้องฝังของจริง ส่วนไอคอนในกล่องอุปกรณ์และรูปคำใบ้ไม่ต้องขยับ
   ใช้ <use> ต่อไปได้ เบากว่าและไม่ต้องโคลน DOM

   symbol ทั้ง 17 อันในไฟล์ js/device-symbols.js เป็นรูปทรงล้วน
   ไม่มี id / gradient / clipPath อยู่ข้างใน การโคลนจึงไม่ทำ id ซ้ำในหน้า */
function makeSvgIconInline(svgId,w,h){
  var sym=document.getElementById(svgId);
  if(!sym) return makeSvgIcon(svgId,w,h);
  var ns='http://www.w3.org/2000/svg';
  var svg=document.createElementNS(ns,'svg');
  svg.setAttribute('viewBox', sym.getAttribute('viewBox') || '0 0 52 52');
  svg.setAttribute('width',w||34);
  svg.setAttribute('height',h||34);
  svg.setAttribute('preserveAspectRatio','xMidYMid meet');
  /* แสงเรืองล้นขอบ viewBox ได้ ไม่ต้องให้ตัดทิ้ง */
  svg.style.overflow='visible';
  var kids=sym.childNodes;
  for(var i=0;i<kids.length;i++) svg.appendChild(kids[i].cloneNode(true));
  return svg;
}

/* วาง SVG icon ลงในปุ่ม/หัวข้อ (แทน emoji) */
function injectUIIcons(){
  var map = {
    'hdr-bolt':'bolt', 'btn-book-ic':'book', 'inv-box-ic':'box',
    'goal-target-ic':'target', 'ic-clear':'trash',
    'ic-rotate':'rotate', 'ic-probe':'gauge', 'ic-check':'bolt',
    'pretest-bolt':'bolt', 'pre-ic':'clipboard', 'post-ic':'clipboard',
    'enter-ic':'checkCircle', 'win-ic':'trophy'
  };
  var sizes = {'win-ic':40, 'pretest-bolt':22};
  for(var id in map){
    var el = document.getElementById(id);
    if(el) el.innerHTML = ICON(map[id], sizes[id]||18);
  }
  /* ปุ่มโหมดพิเศษเปลี่ยนทั้งไอคอนและข้อความตามสถานะ จึงมีฟังก์ชันของตัวเอง */
  if(typeof updateSandboxButton === 'function') updateSandboxButton();
  if(typeof updateEndlessButton === 'function') updateEndlessButton();
}

/* ============================================================
   MODALS / TOAST
   ============================================================ */
/* ============================================================
   KEY MATCHING — เทียบปุ่มบนแป้นพิมพ์แบบไม่ขึ้นกับภาษา

   ปัญหา: e.key คืน "ตัวอักษรที่พิมพ์ออกมา" ซึ่งเปลี่ยนตามภาษาที่ตั้งไว้
          อยู่โหมดไทย กดปุ่ม R จะได้ 'พ' ไม่ใช่ 'r' คีย์ลัดจึงเงียบสนิท

   ตรวจ 3 ทาง เพราะแต่ละทางมีจุดอ่อนต่างกัน:
     1. e.code    'KeyR' = ตำแหน่งปุ่มจริงบนแป้น ไม่ขึ้นกับภาษาเลย (แม่นสุด)
     2. e.keyCode 82     = รหัสปุ่มแบบเก่า อิงตำแหน่งปุ่มเหมือนกัน
                           ใช้สำรองเบราว์เซอร์เก่าที่ไม่มี e.code
     3. e.key     'r'    = ตัวอักษรจริง ใช้เป็นทางสุดท้าย
                           เผื่อแป้นแปลก ๆ ที่ e.code ไม่ตรงตำแหน่งมาตรฐาน
   ============================================================ */

/* เทียบปุ่มตัวอักษร A-Z เช่น isKey(e,'r') */
function isKey(e, letter){
  var U = letter.toUpperCase();
  if(e.code === 'Key' + U) return true;
  if(e.keyCode === U.charCodeAt(0)) return true;
  if((e.key || '').toUpperCase() === U) return true;
  return false;
}

/* เทียบปุ่มพิเศษ เช่น isNamedKey(e,'Escape') */
var NAMED_KEYCODES = {
  Escape:27, Delete:46, Backspace:8, Enter:13, Tab:9, Space:32,
  ArrowLeft:37, ArrowUp:38, ArrowRight:39, ArrowDown:40
};
function isNamedKey(e, name){
  if(e.code === name) return true;
  if(e.key  === name) return true;
  if(NAMED_KEYCODES[name] && e.keyCode === NAMED_KEYCODES[name]) return true;
  /* Space มีชื่อไม่ตรงกันระหว่าง key (' ') กับ code ('Space') */
  if(name === 'Space' && e.key === ' ') return true;
  return false;
}

function openModal(id){document.getElementById(id).classList.add('open');}
function closeModal(id){document.getElementById(id).classList.remove('open');}

/* ============================================================
   CONFIRM — กล่องยืนยันกลาง ใช้แทน confirm() ของเบราว์เซอร์

   confirm() เป็น dialog ของระบบ ปรับหน้าตาไม่ได้เลย และหลุดธีมเกม
   ตัวนี้ใช้ modal เดียวกับที่เกมใช้อยู่ จึงคุมสไตล์ได้ทั้งหมด

   ต่างกันตรงที่ confirm() หยุดโค้ดรอคำตอบได้ แต่ modal ทำไม่ได้
   จึงต้องส่งงานที่จะทำต่อมาทาง onConfirm (callback) แทน

   showConfirm({
     title:'...', message:'...', detail:'...(รับ HTML)',
     okText:'...', cancelText:'...', icon:'trash', danger:true,
     onConfirm:function(){ ...ทำต่อเมื่อผู้ใช้กดยืนยัน... }
   })
   ============================================================ */
var _confirmCallback = null;

/* ============================================================
   ย้ายปุ่มลอยให้พ้นอุปกรณ์ที่ผู้เล่นวางไว้

   ปุ่มที่ลอยอยู่เหนือพื้นที่ทำงาน (แถบย้อน/ทำซ้ำ) มีโอกาสไปนั่งทับอุปกรณ์
   ซึ่งแย่กว่าบังภาพเฉย ๆ เพราะอุปกรณ์ที่อยู่ "ใต้" ปุ่มจะกดไม่ได้ ลากไม่ได้
   และปุ่มลบ (x) ของตัวมันเองก็ถูกบังไปด้วย ทางออกเดียวคือล้างทั้งแผง

   เลือกย้าย "ปุ่ม" ไม่ใช่ย้าย "ของผู้เล่น" — ผู้เล่นตั้งใจวางตรงนั้น
   ส่วนปุ่มอยู่มุมไหนก็ทำงานเหมือนกัน ขอแค่ยังหาเจอ

     el       อิลิเมนต์ที่จะย้าย (ต้อง position:absolute)
     corners  ลำดับมุมที่ยอมให้ไปอยู่ ('tl','tr','bl','br') เรียงตามความชอบ
     pad      ระยะห่างจากขอบ (ค่าเริ่มต้น 8)
     boundsEl กรอบที่ใช้เลือกมุม — ไม่ระบุ = ใช้ offsetParent ของ el เอง
              มีไว้สำหรับของที่ลอยอยู่คนละกล่องกับพื้นที่ทำงาน เช่น
              จอเครื่องวัดที่อยู่ใน #screen-game แต่ต้องหลบของใน #workspace

   อยู่มุมแรกที่ว่างสนิท ถ้าไม่มีมุมไหนว่างเลยก็เลือกมุมที่ทับน้อยที่สุด
   คืนชื่อมุมที่เลือก (null ถ้าทำไม่ได้)
   ============================================================ */
function keepClearOfItems(el, corners, pad, boundsEl){
  if(!el || !corners || !corners.length) return null;
  var host = el.offsetParent;
  if(!host) return null;
  var bounds = boundsEl || host;
  var W = bounds.clientWidth, H = bounds.clientHeight;
  var w = el.offsetWidth, h = el.offsetHeight;
  if(!W || !H || !w || !h) return null;
  pad = (pad == null) ? 8 : pad;

  /* กล่องของอุปกรณ์ทุกชิ้น วัดเทียบมุมบนซ้ายของกรอบที่ใช้เลือกมุม */
  var br = bounds.getBoundingClientRect(), boxes = [];
  (typeof G !== 'undefined' ? (G.wsItems || []) : []).forEach(function(it){
    if(!it.el) return;
    var r = it.el.getBoundingClientRect();
    if(!r.width) return;
    boxes.push({ l:r.left-br.left, t:r.top-br.top, r:r.right-br.left, b:r.bottom-br.top });
  });

  function cornerPos(c){
    return { x: (c.charAt(1) === 'l') ? pad : Math.max(pad, W - w - pad),
             y: (c.charAt(0) === 't') ? pad : Math.max(pad, H - h - pad) };
  }
  function overlapAt(x, y){
    var sum = 0;
    for(var i=0;i<boxes.length;i++){
      var ow = Math.min(x+w, boxes[i].r) - Math.max(x, boxes[i].l);
      var oh = Math.min(y+h, boxes[i].b) - Math.max(y, boxes[i].t);
      if(ow > 0 && oh > 0) sum += ow * oh;
    }
    return sum;
  }

  var best = corners[0], bestArea = Infinity;
  for(var i=0;i<corners.length;i++){
    var a = overlapAt(cornerPos(corners[i]).x, cornerPos(corners[i]).y);
    if(a === 0){ best = corners[i]; bestArea = 0; break; }
    if(a < bestArea){ bestArea = a; best = corners[i]; }
  }
  /* ตำแหน่งที่เลือกอยู่ในพิกัดของ bounds — แปลงกลับเป็นพิกัดของ offsetParent
     (ถ้า bounds กับ host เป็นตัวเดียวกัน ผลต่างเป็นศูนย์ ไม่มีอะไรเปลี่ยน) */
  var hr = host.getBoundingClientRect();
  var p = cornerPos(best);
  el.style.left   = Math.round(p.x + br.left - hr.left) + 'px';
  el.style.top    = Math.round(p.y + br.top  - hr.top)  + 'px';
  el.style.right  = 'auto';
  el.style.bottom = 'auto';
  return best;
}

/* ============================================================
   จัดของลอยทั้งหมดให้พ้นอุปกรณ์ในคราวเดียว

   เลื่อนไปทำหลังคำสั่งปัจจุบันจบด้วย setTimeout เพราะตัวเรียกหลัก
   (updateHistoryButtons) ทำงาน "ก่อน" อุปกรณ์ถูกเพิ่มเข้า DOM จริง
   — pushHistory() ถ่ายภาพก่อนการเปลี่ยนแปลงตามการออกแบบของ js/history.js

   ไม่ใช้ requestAnimationFrame เพราะมันผูกกับรอบวาดภาพ ซึ่งบางสภาพแวดล้อม
   ไม่เดินเลย ของลอยจะค้างทับอุปกรณ์อยู่อย่างนั้นถาวร
   ============================================================ */
var _keepClearPending = false;
function keepFloatingUiClear(){
  if(_keepClearPending) return;
  _keepClearPending = true;
  setTimeout(function(){
    _keepClearPending = false;
    var ws = document.getElementById('workspace');
    try{
      /* แถบย้อน/ทำซ้ำ — ชอบมุมซ้ายบน แต่ยอมย้ายได้ 3 มุม
         (ไม่เอาขวาล่าง เพราะจอเครื่องวัดจองไว้) */
      keepClearOfItems(document.getElementById('history-bar'), ['tl','bl','tr']);
      /* จอเครื่องวัด — อยู่คนละกล่องกับพื้นที่ทำงาน จึงต้องบอกกรอบให้ */
      var probe = document.getElementById('probe-display');
      if(probe && ws && getComputedStyle(probe).display !== 'none'){
        keepClearOfItems(probe, ['br','tr','bl','tl'], 12, ws);
      }
    }catch(e){}
  }, 0);
}

function showConfirm(opts){
  opts = opts || {};

  document.getElementById('confirm-title').textContent = opts.title || 'ยืนยัน';
  document.getElementById('confirm-msg').textContent   = opts.message || '';

  var det = document.getElementById('confirm-detail');
  det.innerHTML = opts.detail || '';
  det.style.display = opts.detail ? '' : 'none';

  var icon = document.getElementById('confirm-icon');
  icon.innerHTML = ICON(opts.icon || 'trash', 40);
  icon.className = 'confirm-icon' + (opts.danger ? ' danger' : '');

  var ok = document.getElementById('confirm-ok-btn');
  ok.textContent = opts.okText || 'ยืนยัน';
  ok.className   = 'btn-confirm-ok' + (opts.danger ? ' danger' : '');

  document.getElementById('confirm-cancel-btn').textContent = opts.cancelText || 'ยกเลิก';

  _confirmCallback = opts.onConfirm || null;
  openModal('modal-confirm');
}

/* ปิดกล่อง — ok=true คือกดปุ่มยืนยัน, false คือยกเลิก/กดปิด/คลิกนอกกล่อง */
function closeConfirm(ok){
  closeModal('modal-confirm');
  var cb = _confirmCallback;
  _confirmCallback = null;          /* เคลียร์ก่อนเรียก กันเรียกซ้ำ */
  if(ok && typeof cb === 'function') cb();
}

var toastT=null;
function showToast(msg,type){
  var t=document.getElementById('toast');
  t.textContent=msg; t.className='show '+(type||'');
  clearTimeout(toastT);
  toastT=setTimeout(function(){t.className='';},2400);
}
