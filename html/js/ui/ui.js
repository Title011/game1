/* UI — ตัวช่วยหน้าตา: สร้างไอคอน SVG, วางลงปุ่ม, เปิด/ปิด modal, toast */

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
  /* viewBox ตรงกับ symbol จริง ไม่งั้นภาพเบี้ยว */
  svg.setAttribute('viewBox', getSymbolViewBox(svgId));
  svg.setAttribute('width',w||34);
  svg.setAttribute('height',h||34);
  svg.setAttribute('preserveAspectRatio','xMidYMid meet');
  var use=document.createElementNS(ns,'use');
  use.setAttribute('href','#'+svgId);
  svg.appendChild(use);
  return svg;
}

/* ไอคอนแบบฝังของจริง — โคลนรูปทรงใน symbol มาเป็นโหนดจริง
   เพราะ <use> อยู่ใน shadow tree ที่ CSS จากไฟล์ .css เลือกทีละชิ้นไม่ได้
   อุปกรณ์ในพื้นที่ทำงานต้องขยับ/เรืองแสงทีละชิ้นเลยต้องฝังจริง
   ส่วนไอคอนในกล่องอุปกรณ์/รูปคำใบ้ไม่ต้องขยับ ใช้ makeSvgIcon (เบากว่า) ได้
   symbol ใน device-symbols.js เป็นรูปทรงล้วน ไม่มี id ข้างใน โคลนแล้วไม่ทำ id ซ้ำ */
function makeSvgIconInline(svgId,w,h){
  var sym=document.getElementById(svgId);
  if(!sym) return makeSvgIcon(svgId,w,h);
  var ns='http://www.w3.org/2000/svg';
  var svg=document.createElementNS(ns,'svg');
  svg.setAttribute('viewBox', sym.getAttribute('viewBox') || '0 0 52 52');
  svg.setAttribute('width',w||34);
  svg.setAttribute('height',h||34);
  svg.setAttribute('preserveAspectRatio','xMidYMid meet');
  svg.style.overflow='visible';            /* ให้แสงเรืองล้นขอบได้ */
  var kids=sym.childNodes;
  for(var i=0;i<kids.length;i++) svg.appendChild(kids[i].cloneNode(true));
  return svg;
}

/* วาง SVG icon ลงปุ่ม/หัวข้อ (แทน emoji) */
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
  /* ปุ่มโหมดพิเศษเปลี่ยนไอคอน+ข้อความตามสถานะ มีฟังก์ชันของตัวเอง */
  if(typeof updateSandboxButton === 'function') updateSandboxButton();
  if(typeof updateEndlessButton === 'function') updateEndlessButton();
}


/* ===== เทียบปุ่มคีย์บอร์ดแบบไม่ขึ้นกับภาษา =====
   e.key เปลี่ยนตามภาษา (โหมดไทยกด R ได้ 'พ') เลยเช็ก e.code (ตำแหน่งปุ่ม) ก่อน
   แล้วค่อย keyCode (เบราว์เซอร์เก่า) และ e.key (ทางสุดท้าย) */

/* เทียบปุ่ม A-Z เช่น isKey(e,'r') */
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
  if(name === 'Space' && e.key === ' ') return true;   /* key เป็น ' ' แต่ code เป็น 'Space' */
  return false;
}

function openModal(id){document.getElementById(id).classList.add('open');}
function closeModal(id){document.getElementById(id).classList.remove('open');}

/* ===== กล่องยืนยันกลาง (แทน confirm() ของเบราว์เซอร์ที่ปรับหน้าตาไม่ได้) =====
   confirm() หยุดโค้ดรอคำตอบได้ แต่ modal ทำไม่ได้ เลยส่งงานต่อผ่าน onConfirm
   showConfirm({ title, message, detail(รับ HTML), okText, cancelText, icon, danger, onConfirm }) */
var _confirmCallback = null;

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

/* ปิดกล่อง — ok=true คือกดยืนยัน, false คือยกเลิก/ปิด/คลิกนอกกล่อง */
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
