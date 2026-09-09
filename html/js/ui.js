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
