/* ============================================================
   SVG ICONS — ไอคอนเวกเตอร์แทน emoji ให้กลมกลืนกับเกม
   ใช้ผ่าน ICON('name', size?) → คืน SVG string
   ============================================================ */
var ICON_PATHS = {
  /* สายฟ้า (พลังงาน) */
  bolt: '<path d="M13 2L4.5 13.5H11L9 22l9-12h-6.5L13 2z"/>',
  /* ถังขยะ */
  trash: '<path d="M6 7h12l-1 13a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 7zm3-3h6l1 2h4v2H4V6h4l1-2z"/>',
  /* เอกสาร/แบบทดสอบ */
  clipboard: '<path d="M9 3h6a1 1 0 0 1 1 1h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2a1 1 0 0 1 1-1zm0 3H6v14h12V6h-3v1H9V6zm-1 6h8v1.5H8V12zm0 3h8v1.5H8V15z"/>',
  /* เครื่องหมายถูก (ตรวจเช็ค) */
  check: '<path d="M9 16.2l-4.2-4.2-1.4 1.4L9 19 20.5 7.5l-1.4-1.4z"/>',
  checkCircle: '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-1.2 14.2l-4-4 1.4-1.4 2.6 2.6 5.6-5.6 1.4 1.4-7 7z"/>',
  /* เกียร์วัด/multimeter */
  gauge: '<path d="M12 3a9 9 0 0 0-9 9 9 9 0 0 0 2 5.7l1.5-1.3A7 7 0 0 1 12 5a7 7 0 0 1 5.5 11.4l1.5 1.3A9 9 0 0 0 21 12a9 9 0 0 0-9-9zm0 5l-2 5a2 2 0 1 0 3 1l-1-6z"/>',
  /* หมุน */
  rotate: '<path d="M12 5V2L8 6l4 4V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z"/>',
  /* ถ้วยรางวัล */
  trophy: '<path d="M18 4V2H6v2H2v3a4 4 0 0 0 4 4c.5 1.5 1.7 2.6 3 2.9V17H8v2h8v-2h-4v-3.1c1.3-.3 2.5-1.4 3-2.9a4 4 0 0 0 4-4V4h-4zM4 7V6h2v3a2 2 0 0 1-2-2zm16 0a2 2 0 0 1-2 2V6h2v1z"/>',
  /* เป้า/goal */
  target: '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 3a7 7 0 1 1 0 14 7 7 0 0 1 0-14zm0 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0 2.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z"/>',
  /* หนังสือ/คู่มือ */
  book: '<path d="M4 4h7v16H6a2 2 0 0 1-2-2V4zm9 0h7v14a2 2 0 0 1-2 2h-5V4z"/>',
  /* หลอดไฟไอเดีย */
  bulbIdea: '<path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2zM9 19h6v1a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-1z"/>',
  /* กล่อง/คลัง */
  box: '<path d="M12 2l9 5v10l-9 5-9-5V7l9-5zm0 2.3L5.5 8 12 11.7 18.5 8 12 4.3zM5 9.5v6l6 3.3v-6L5 9.5zm14 0l-6 3.3v6l6-3.3v-6z"/>',
  /* ชิป/อิเล็กทรอนิกส์ */
  chip: '<path d="M8 3v2H6a2 2 0 0 0-2 2v2H2v2h2v2H2v2h2v2a2 2 0 0 0 2 2h2v2h2v-2h2v2h2v-2h2a2 2 0 0 0 2-2v-2h2v-2h-2v-2h2V9h-2V7a2 2 0 0 0-2-2h-2V3h-2v2h-2V3H8zm-2 4h12v10H6V7z"/>',
  /* ประแจ/เครื่องมือ */
  wrench: '<path d="M21 7a5 5 0 0 1-6.5 4.8L6.4 20 4 17.6l8.2-8.1A5 5 0 0 1 17 3l-2.5 2.5L16 8l2.5-2.5A5 5 0 0 1 21 7z"/>'
};

function ICON(name, size){
  var s = size || 18;
  var p = ICON_PATHS[name] || '';
  return '<svg viewBox="0 0 24 24" width="'+s+'" height="'+s+'" fill="currentColor" '
       + 'preserveAspectRatio="xMidYMid meet" '
       + 'style="width:'+s+'px;height:'+s+'px;display:inline-block;vertical-align:-0.15em;flex:0 0 auto;">'
       + p + '</svg>';
}

/* วาดหัวใจแสดงชีวิต — SVG สะอาด คุมเอง 100%
   full = จำนวนหัวใจเต็ม, total = หัวใจทั้งหมด
   หัวใจเต็ม = แดงทึบ, หัวใจหมด = เทาโปร่งเส้นขอบ */
function renderHearts(full, total){
  var HEART_D = 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z';
  var html = '<span class="hearts-row">';
  for(var i=0;i<total;i++){
    var on = (i<full);
    html += '<svg class="heart-svg" viewBox="0 0 24 24" width="18" height="18" '
          + 'xmlns="http://www.w3.org/2000/svg" '
          + (on
              ? 'fill="#ff4d5e" stroke="none"'
              : 'fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="2"')
          + '><path d="'+HEART_D+'"/></svg>';
  }
  html += '</span>';
  return html;
}
