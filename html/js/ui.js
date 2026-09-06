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
    'goal-target-ic':'target', 'ic-clear':'trash', 'ic-wire':'plug',
    'ic-rotate':'rotate', 'ic-probe':'gauge', 'ic-check':'bolt',
    'pretest-bolt':'bolt', 'pre-ic':'clipboard', 'post-ic':'clipboard',
    'enter-ic':'checkCircle', 'win-ic':'trophy'
  };
  var sizes = {'win-ic':40, 'pretest-bolt':22};
  for(var id in map){
    var el = document.getElementById(id);
    if(el) el.innerHTML = ICON(map[id], sizes[id]||18);
  }
}

/* ============================================================
   MODALS / TOAST
   ============================================================ */
function openModal(id){document.getElementById(id).classList.add('open');}
function closeModal(id){document.getElementById(id).classList.remove('open');}

var toastT=null;
function showToast(msg,type){
  var t=document.getElementById('toast');
  t.textContent=msg; t.className='show '+(type||'');
  clearTimeout(toastT);
  toastT=setTimeout(function(){t.className='';},2400);
}
