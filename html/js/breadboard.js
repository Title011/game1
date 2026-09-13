/* ============================================================
   BREADBOARD — พื้นที่ทำงานเป็น "แผงต่อวงจรจริง"

   ของจริงเป็นยังไง ไฟล์นี้ก็ทำแบบนั้น:

     • รางจ่ายไฟ (+ แดง / − น้ำเงิน) แถวบนและแถวล่าง
       ทั้งรางเป็นจุดเดียวกันตลอดความยาว
     • พื้นที่กลางแบ่งเป็นแถว A-E (บน) และ F-J (ล่าง)
       แต่ละ "คอลัมน์" ของครึ่งเดียวกัน = 5 รูที่ต่อถึงกันข้างใน
     • ร่องกลาง (channel) แยกครึ่งบนกับครึ่งล่างออกจากกัน
       จึงเสียบไอซีคร่อมร่องได้โดยขาสองฝั่งไม่ลัดถึงกัน

   ผลทางไฟฟ้าเป็นของจริงด้วย ไม่ใช่แค่ภาพ:
   ขาอุปกรณ์ที่เสียบลงรูในรางเดียวกันจะ "ต่อถึงกัน" ทันที
   ระบบจะสร้างเส้นเชื่อมภายใน (virtual wire) ให้เอง
   ซึ่งวงจรทั้งเกม — ทั้งการตรวจ การลงสี เครื่องวัด และความเสียหาย —
   มองเห็นเหมือนสายไฟปกติทุกประการ

   หมายเหตุเรื่องขนาด: ระยะห่างรู (pitch) ไม่ได้ตั้งตายตัว แต่วัดจาก
   ระยะจุดขั้วจริงของอุปกรณ์แล้วหาร 4 ขาอุปกรณ์จึงลงรูพอดีเสมอ
   ไม่ว่า CSS จะปรับขนาดยังไง (เช่นบนมือถือที่จุดขั้วใหญ่ขึ้น)
   ============================================================ */

var BB = {
  on:false,
  pitch:19,          /* ระยะห่างระหว่างรู (px) — วัดจากอุปกรณ์จริง */
  span:76,           /* ระยะระหว่างจุดขั้ว 2 ข้างของอุปกรณ์ = 4 pitch */
  cols:0,
  rows:[],           /* แถวทั้งหมดเรียงจากบนลงล่าง */
  holes:[],
  holeGrid:{},       /* 'col,rowIdx' -> hole  (ค้นหาเร็ว) */
  x0:0, y0:0,
  layer:null,
  linkCounter:0,
  portStrip:new Map(),   /* portEl -> ชื่อราง */
  portHole:new Map()     /* portEl -> รูที่เสียบอยู่ */
};

/* ผังแถวของบอร์ด เลือกแบบที่สูงพอดีกับพื้นที่ทำงาน
   'gap' = แถวว่าง ไม่มีรู (ช่องไฟ / ร่องกลาง)
   ยึดระยะห่างเท่ากันทุกแถว อุปกรณ์ที่หมุนตั้งจึงคร่อมร่องลงรูได้พอดี */
var BB_PRESETS = [
  { name:'full', rows:[
    {t:'rail',pol:'+',id:'railT+'}, {t:'rail',pol:'-',id:'railT-'}, {t:'gap'},
    {t:'main',half:'U',label:'A'}, {t:'main',half:'U',label:'B'}, {t:'main',half:'U',label:'C'},
    {t:'main',half:'U',label:'D'}, {t:'main',half:'U',label:'E'},
    {t:'gap',channel:true}, {t:'gap',channel:true},
    {t:'main',half:'L',label:'F'}, {t:'main',half:'L',label:'G'}, {t:'main',half:'L',label:'H'},
    {t:'main',half:'L',label:'I'}, {t:'main',half:'L',label:'J'},
    {t:'gap'}, {t:'rail',pol:'-',id:'railB-'}, {t:'rail',pol:'+',id:'railB+'}
  ]},
  { name:'noBottomRail', rows:[
    {t:'rail',pol:'+',id:'railT+'}, {t:'rail',pol:'-',id:'railT-'}, {t:'gap'},
    {t:'main',half:'U',label:'A'}, {t:'main',half:'U',label:'B'}, {t:'main',half:'U',label:'C'},
    {t:'main',half:'U',label:'D'}, {t:'main',half:'U',label:'E'},
    {t:'gap',channel:true}, {t:'gap',channel:true},
    {t:'main',half:'L',label:'F'}, {t:'main',half:'L',label:'G'}, {t:'main',half:'L',label:'H'},
    {t:'main',half:'L',label:'I'}, {t:'main',half:'L',label:'J'}
  ]},
  { name:'compact', rows:[
    {t:'rail',pol:'+',id:'railT+'}, {t:'rail',pol:'-',id:'railT-'}, {t:'gap'},
    {t:'main',half:'U',label:'A'}, {t:'main',half:'U',label:'B'}, {t:'main',half:'U',label:'C'},
    {t:'gap',channel:true}, {t:'gap',channel:true},
    {t:'main',half:'L',label:'F'}, {t:'main',half:'L',label:'G'}, {t:'main',half:'L',label:'H'}
  ]},
  /* เตี้ยมาก (จอมือถือแนวนอน) — ตัดรางจ่ายไฟทิ้ง เหลือเฉพาะแถวหลัก
     ร่องกลางยังกว้าง 2 แถวเท่าเดิม อุปกรณ์ที่หมุนตั้งจึงยังคร่อมร่องได้ */
  { name:'tiny', rows:[
    {t:'main',half:'U',label:'A'}, {t:'main',half:'U',label:'B'}, {t:'main',half:'U',label:'C'},
    {t:'gap',channel:true}, {t:'gap',channel:true},
    {t:'main',half:'L',label:'F'}, {t:'main',half:'L',label:'G'}, {t:'main',half:'L',label:'H'}
  ]}
];

/* ============================================================
   วัดระยะจุดขั้วจริงของอุปกรณ์ → ได้ pitch ที่ขาลงรูพอดี
   ============================================================ */
function bbMeasurePitch(){
  var ws = document.getElementById('workspace');
  if(!ws) return;
  var probe = document.createElement('div');
  probe.className = 'ws-item bb-probe';
  probe.style.cssText = 'left:-9999px;top:-9999px;visibility:hidden;';
  var icon = document.createElement('div');
  icon.className = 'ws-item-svg';
  probe.appendChild(icon);
  ['left','right'].forEach(function(pos){
    var p = document.createElement('div');
    p.className = 'port port-' + pos;
    probe.appendChild(p);
  });
  ws.appendChild(probe);

  var ports = probe.querySelectorAll('.port');
  var a = ports[0].getBoundingClientRect(), b = ports[1].getBoundingClientRect();
  var span = (b.left + b.width/2) - (a.left + a.width/2);
  var box  = probe.getBoundingClientRect();
  probe.remove();

  if(span > 20){
    BB.span  = span;
    BB.pitch = span / 4;
  }
  if(box.width > 10){
    BB.itemW = box.width;
    BB.itemH = box.height;
  }
}

/* ============================================================
   คำนวณผัง + วาดบอร์ด
   ============================================================ */
function buildBreadboard(){
  var ws = document.getElementById('workspace');
  if(!ws) return;

  var W = ws.clientWidth, H = ws.clientHeight;
  /* พื้นที่ทำงานยังวัดขนาดไม่ได้ (ยังไม่ถูกแสดงผล) — อย่าไปรื้อแผงเดิมทิ้ง
     ไม่งั้นสลับแท็บ/ย่อหน้าต่างแล้วแผงจะหายไปดื้อ ๆ */
  if(!W || !H) return;

  bbMeasurePitch();
  var P = BB.pitch;

  /* เผื่อขอบซ้าย-ขวาไว้พิมพ์ตัวอักษรแถว และขอบบน-ล่างไว้หายใจ */
  var padX = 26, padY = 12;

  /* เลือกผังที่ใหญ่ที่สุดเท่าที่ "ใส่ลงพื้นที่ได้ทั้งแผง"
     ไม่มีอันไหนลงเลย = พื้นที่เตี้ย/แคบเกินจะเป็นแผงได้จริง
     กรณีนั้นปิดแผงไปเลย ดีกว่าวาดแผงที่ถูกตัดครึ่งจนเสียบไม่ได้
     (ปิดแล้วเกมยังเล่นได้ตามปกติ แค่วางอุปกรณ์อิสระแล้วเดินสายเอา) */
  var preset = null;
  for(var i=0;i<BB_PRESETS.length;i++){
    var need = (BB_PRESETS[i].rows.length - 1) * P + padY*2 + 16;
    if(need <= H){ preset = BB_PRESETS[i]; break; }
  }
  /* 63 ช่อง = แผงขนาดเต็มมาตรฐานที่ขายทั่วไป ใช้เป็นเพดาน
     จอกว้างกว่านั้นจะเหลือขอบไว้เฉย ๆ ไม่ยืดแผงจนผิดสัดส่วนของจริง */
  var cols = Math.floor((W - padX*2) / P);
  if(!preset || cols < 6){ bbDestroy(); BB.on = false; return; }
  cols = Math.min(cols, 63);

  var boardW = (cols - 1) * P + padX*2;
  var boardH = (preset.rows.length - 1) * P + padY*2;

  BB.cols = cols;
  BB.x0 = Math.max(0, Math.round((W - boardW)/2)) + padX;
  BB.y0 = Math.max(0, Math.round((H - boardH)/2)) + padY;
  BB.boardX = BB.x0 - padX;
  BB.boardY = BB.y0 - padY;
  BB.boardW = boardW;
  BB.boardH = boardH;

  /* ---- สร้างรายการรูทั้งหมด ---- */
  BB.rows = [];
  BB.holes = [];
  BB.holeGrid = {};
  preset.rows.forEach(function(def, ri){
    var row = { def:def, y: BB.y0 + ri*P, idx:ri };
    BB.rows.push(row);
    if(def.t === 'gap') return;
    for(var c=0;c<cols;c++){
      var strip = (def.t === 'rail') ? def.id : (def.half + ':' + c);
      var hole = { x: BB.x0 + c*P, y: row.y, col:c, row:ri, strip:strip, def:def };
      BB.holes.push(hole);
      BB.holeGrid[c + ',' + ri] = hole;
    }
  });

  BB.on = true;
  bbRender(preset);
}

function bbDestroy(){
  if(BB.layer){ BB.layer.remove(); BB.layer = null; }
}

/* ปิดแผงทิ้ง — ใช้กับด่านที่ไม่ได้เล่นบนเบรดบอร์ด (ดู boardWanted ใน js/game.js)
   ต้องเก็บกวาดให้หมด ไม่ใช่แค่ลบภาพแผงออก:
     • เส้นเชื่อมในราง (virtual wire) ต้องหายไปด้วย ไม่งั้นวงจรจะยัง
       "ต่อถึงกันผ่านราง" ทั้งที่ไม่มีรางให้เห็นแล้ว = ผู้เล่นงงหนักกว่าเดิม
     • ธง .plugged กับคำบรรยายบนขาต้องถูกล้าง
   bbRefresh() ช่วยไม่ได้เพราะมันคืนค่าทันทีเมื่อ BB.on เป็นเท็จ */
function bbTurnOff(){
  bbClearLinks();
  bbDestroy();
  BB.on = false;
  BB.liveG = null;
  BB.portStrip = new Map();
  BB.portHole  = new Map();
  document.querySelectorAll('#workspace .port').forEach(function(p){
    p.classList.remove('plugged');
    p.title = bbPortBaseTitle(p);
  });
  if(typeof refreshWires === 'function') refreshWires();
  if(typeof recolorWires === 'function') recolorWires();
}

function bbRender(preset){
  var ws = document.getElementById('workspace');
  bbDestroy();

  var P = BB.pitch, cols = BB.cols;
  var ns = 'http://www.w3.org/2000/svg';
  var svg = document.createElementNS(ns, 'svg');
  svg.id = 'bb-layer';
  svg.setAttribute('xmlns', ns);

  var s = '';
  var bx = BB.boardX, by = BB.boardY, bw = BB.boardW, bh = BB.boardH;

  /* ตัวแผง + ขอบมน + แสงตกกระทบด้านบน */
  s += '<defs>'
     + '<linearGradient id="bb-face" x1="0" y1="0" x2="0" y2="1">'
     +   '<stop offset="0%" stop-color="#e6e2d6"/>'
     +   '<stop offset="55%" stop-color="#d9d4c6"/>'
     +   '<stop offset="100%" stop-color="#cbc5b5"/>'
     + '</linearGradient>'
     + '<linearGradient id="bb-channel" x1="0" y1="0" x2="0" y2="1">'
     +   '<stop offset="0%" stop-color="#b3ad9c"/>'
     +   '<stop offset="45%" stop-color="#cdc7b8"/>'
     +   '<stop offset="100%" stop-color="#dcd7ca"/>'
     + '</linearGradient>'
     + '<radialGradient id="bb-hole" cx="35%" cy="32%" r="72%">'
     +   '<stop offset="0%" stop-color="#4a4740"/>'
     +   '<stop offset="70%" stop-color="#1d1c19"/>'
     +   '<stop offset="100%" stop-color="#0d0c0b"/>'
     + '</radialGradient>'
     + '</defs>';

  s += '<rect class="bb-body" x="'+bx+'" y="'+by+'" width="'+bw+'" height="'+bh+'" rx="7" fill="url(#bb-face)"/>';

  /* รางจ่ายไฟ: เส้นสี + เครื่องหมาย +/− หัวท้าย (เหมือนที่พิมพ์บนแผงจริง) */
  BB.rows.forEach(function(row){
    var d = row.def;
    if(d.t !== 'rail') return;
    var col = (d.pol === '+') ? '#c0392b' : '#2563a8';
    var ly  = row.y + (d.pol === '+' ? -P*0.42 : P*0.42);
    s += '<line class="bb-rail-line" x1="'+(bx+9)+'" y1="'+ly+'" x2="'+(bx+bw-9)+'" y2="'+ly+'" stroke="'+col+'" stroke-width="1.6" opacity=".85"/>'
       + '<text class="bb-silk" x="'+(bx+5)+'" y="'+(row.y+3.4)+'" fill="'+col+'" font-size="10" font-weight="700" text-anchor="middle">'+(d.pol==='+'?'+':'−')+'</text>'
       + '<text class="bb-silk" x="'+(bx+bw-5)+'" y="'+(row.y+3.4)+'" fill="'+col+'" font-size="10" font-weight="700" text-anchor="middle">'+(d.pol==='+'?'+':'−')+'</text>';
  });

  /* ร่องกลาง — ส่วนที่แยกครึ่งบนออกจากครึ่งล่าง */
  var chTop = null, chBot = null;
  BB.rows.forEach(function(row){
    if(!row.def.channel) return;
    if(chTop === null) chTop = row.y;
    chBot = row.y;
  });
  if(chTop !== null){
    var cy0 = chTop - P*0.5, chH = (chBot - chTop) + P;
    s += '<rect class="bb-ch" x="'+(bx+4)+'" y="'+cy0+'" width="'+(bw-8)+'" height="'+chH+'" rx="3" fill="url(#bb-channel)"/>'
       + '<line x1="'+(bx+4)+'" y1="'+cy0+'" x2="'+(bx+bw-4)+'" y2="'+cy0+'" stroke="#a8a294" stroke-width="1"/>'
       + '<line x1="'+(bx+4)+'" y1="'+(cy0+chH)+'" x2="'+(bx+bw-4)+'" y2="'+(cy0+chH)+'" stroke="#efebe0" stroke-width="1"/>';

    /* เลขคอลัมน์พิมพ์ในร่องกลาง ทุก 5 ช่อง เหมือนแผงจริง */
    for(var c=0;c<cols;c++){
      if(c % 5 !== 0 && c !== cols-1) continue;
      s += '<text class="bb-silk" x="'+(BB.x0+c*P)+'" y="'+(cy0+chH/2+3.2)+'" font-size="8.5" text-anchor="middle" fill="#6c6658">'+(c+1)+'</text>';
    }
  }

  /* ตัวอักษรกำกับแถว A-J ที่ขอบซ้าย-ขวา */
  BB.rows.forEach(function(row){
    if(row.def.t !== 'main' || !row.def.label) return;
    s += '<text class="bb-silk" x="'+(bx+8)+'" y="'+(row.y+3)+'" font-size="8" text-anchor="middle" fill="#6c6658">'+row.def.label+'</text>'
       + '<text class="bb-silk" x="'+(bx+bw-8)+'" y="'+(row.y+3)+'" font-size="8" text-anchor="middle" fill="#6c6658">'+row.def.label+'</text>';
  });

  /* กลุ่มไฮไลต์รางที่กำลังนำไฟ — วาดใต้รู จะได้ไม่บังรู */
  s += '<g id="bb-live"></g>';

  /* รูเสียบ — สี่เหลี่ยมมนพร้อมเงา ให้ดูเป็นรูโลหะจริง */
  var r = Math.max(2.4, P*0.155);
  BB.holes.forEach(function(h){
    s += '<rect class="bb-hole" x="'+(h.x-r)+'" y="'+(h.y-r)+'" width="'+(r*2)+'" height="'+(r*2)+'" rx="'+(r*0.42)+'" fill="url(#bb-hole)"/>';
  });

  /* ขอบนูนของแผง */
  s += '<rect x="'+(bx+0.75)+'" y="'+(by+0.75)+'" width="'+(bw-1.5)+'" height="'+(bh-1.5)+'" rx="6.5" fill="none" stroke="#f2eee3" stroke-width="1.2" opacity=".55"/>'
     + '<rect x="'+bx+'" y="'+by+'" width="'+bw+'" height="'+bh+'" rx="7" fill="none" stroke="#9b9484" stroke-width="1.1"/>';

  svg.innerHTML = s;
  ws.insertBefore(svg, ws.firstChild);
  BB.layer = svg;
  BB.liveG = svg.querySelector('#bb-live');
}

/* ============================================================
   ตำแหน่ง / การหารู
   ============================================================ */

/* ตำแหน่งจุดขั้วแต่ละจุด เทียบมุมซ้ายบนของกล่องอุปกรณ์ */
function bbPortOffsets(item){
  var box = item.el.getBoundingClientRect();
  var out = [];
  item.el.querySelectorAll('.port').forEach(function(p){
    var r = p.getBoundingClientRect();
    out.push({ port:p, dx:(r.left + r.width/2) - box.left, dy:(r.top + r.height/2) - box.top });
  });
  return out;
}

function bbItemPos(item){
  return { x: parseFloat(item.el.style.left) || 0, y: parseFloat(item.el.style.top) || 0 };
}

/* รูที่ใกล้จุด (x,y) ที่สุด ภายในระยะ tol */
function bbHoleNear(x, y, tol){
  if(!BB.on) return null;
  var c = Math.round((x - BB.x0) / BB.pitch);
  var r = Math.round((y - BB.y0) / BB.pitch);
  var best = null, bd = Infinity;
  for(var dc=-1; dc<=1; dc++){
    for(var dr=-1; dr<=1; dr++){
      var h = BB.holeGrid[(c+dc) + ',' + (r+dr)];
      if(!h) continue;
      var d = Math.hypot(h.x - x, h.y - y);
      if(d < bd){ bd = d; best = h; }
    }
  }
  if(best && bd <= (tol === undefined ? BB.pitch*0.45 : tol)) return best;
  return null;
}

/* ============================================================
   เสียบอุปกรณ์ลงรู (snap)

   เลือกตำแหน่งที่ "ขาลงรูครบทุกขา" และไม่ทำให้ขาสองข้างของ
   อุปกรณ์ตัวเดียวกันตกลงรางเดียวกัน (นั่นคือการลัดวงจรตัวเอง)
   จึงหมุนอุปกรณ์ตั้งฉากแล้วระบบจะวางให้คร่อมร่องกลางให้อัตโนมัติ
   เหมือนที่ช่างทำกับไอซีบนแผงจริง
   ============================================================ */
function bbSnapItem(item){
  if(!BB.on || !item || !item.el) return false;

  var offs = bbPortOffsets(item);
  if(!offs.length) return false;
  var pos = bbItemPos(item);
  var P = BB.pitch;

  /* รางที่ขาของอุปกรณ์ "ตัวอื่น" ครองอยู่ — ใช้ถ่วงน้ำหนักเบา ๆ
     ให้การวางทับรางคนอื่นเกิดเฉพาะตอนผู้เล่นตั้งใจจริง */
  /* รางที่ขาของอุปกรณ์ "ตัวอื่น" ครองอยู่ พร้อมตำแหน่งรูที่เขาเสียบไว้
     ต้องรู้ตำแหน่งด้วย ไม่ใช่แค่รู้ว่ารางนี้มีคนอยู่ เพราะแถวหลักหนึ่งราง
     ยาว 5 รู การเสียบ "ติดกัน" กับเสียบ "คนละหัวคนละท้าย" คนละเจตนากัน */
  var taken = {}, takenHoles = {};
  BB.portStrip.forEach(function(strip, port){
    if(port.dataset.itemId === item.id) return;
    taken[strip] = true;
    var h = BB.portHole.get(port);
    if(h) (takenHoles[strip] = takenHoles[strip] || []).push(h);
  });

  /* เสียบลงรางที่มีคนอยู่แล้ว = ตั้งใจเชื่อมถึงกันหรือเปล่า
       รางจ่ายไฟ  → ตั้งใจเสมอ มันมีไว้ให้แชร์กันทั้งแนวอยู่แล้ว
       แถวหลัก    → ตั้งใจก็ต่อเมื่อเสียบชิดกับขาที่มีอยู่จริง ๆ
                    ถ้าอยู่คนละหัวคนละท้ายของราง มักเป็นการวางซ้อนแนวตั้ง
                    ซึ่งผู้เล่นไม่ได้ตั้งใจให้ถึงกัน */
  function sharingIntended(strip, px, py){
    if(strip.indexOf('rail') === 0) return true;
    var hs = takenHoles[strip] || [];
    for(var i=0;i<hs.length;i++){
      if(Math.hypot(hs[i].x - px, hs[i].y - py) <= P * 1.3) return true;
    }
    return false;
  }

  var ws = document.getElementById('workspace');
  var maxX = Math.max(0, ws.clientWidth  - item.el.offsetWidth);
  var maxY = Math.max(0, ws.clientHeight - item.el.offsetHeight);

  var anchor = offs[0];
  var ax = pos.x + anchor.dx, ay = pos.y + anchor.dy;
  var c0 = Math.round((ax - BB.x0) / P), r0 = Math.round((ay - BB.y0) / P);

  /* ค้นหาตำแหน่งที่ดีที่สุดในรัศมีที่กำหนด
     คืน dup มาด้วย เพื่อให้รู้ว่าตำแหน่งที่ได้ยังทำให้ขาสองข้าง
     ของอุปกรณ์ตัวเดียวกันตกรางเดียวกันอยู่หรือไม่ (= ลัดวงจรตัวเอง) */
  function search(rc, rr){
    var best = null, bestCost = Infinity, bestDup = true, bestTaken = true;
    for(var dc=-rc; dc<=rc; dc++){
      for(var dr=-rr; dr<=rr; dr++){
        var h = BB.holeGrid[(c0+dc) + ',' + (r0+dr)];
        if(!h) continue;
        var nx = h.x - anchor.dx, ny = h.y - anchor.dy;
        if(nx < 0 || ny < 0 || nx > maxX || ny > maxY) continue;

        var cost = Math.hypot(nx - pos.x, ny - pos.y);
        var strips = {}, dup = false, missing = 0, hitTaken = false;
        for(var i=0;i<offs.length;i++){
          var px = nx + offs[i].dx, py = ny + offs[i].dy;
          var ph = bbHoleNear(px, py, P*0.3);
          if(!ph){ missing++; continue; }
          if(strips[ph.strip]) dup = true;
          strips[ph.strip] = true;
          if(taken[ph.strip]){
            /* ค่าปรับต้องสูงกว่าระยะที่ยอมขยับไปหาที่ว่าง (สูงสุดราว 10 แถว)
               ไม่งั้นตอนแผงเริ่มแน่น ระบบจะเลือก "เบียดราง" เพราะมันใกล้กว่า */
            if(sharingIntended(ph.strip, px, py)) cost += P * 0.4;
            else { cost += P * 14; hitTaken = true; }
          }
        }
        cost += missing * P * 12;
        if(dup) cost += P * 400;

        if(cost < bestCost){
          bestCost = cost; best = {x:nx, y:ny}; bestDup = dup; bestTaken = hitTaken;
        }
      }
    }
    return best ? { pos:best, dup:bestDup, taken:bestTaken, cost:bestCost } : null;
  }

  /* หาในรัศมีใกล้ก่อน ถ้ายังได้ตำแหน่งที่ไม่ดี (ขาตัวเองลัดกันเอง หรือไป
     เบียดรางของอุปกรณ์ตัวอื่นโดยไม่ได้ตั้งใจ) ค่อยขยายรัศมีหาที่ว่างจริง ๆ
     เคสที่เจอบ่อย: วางใกล้ขอบแผงซึ่งมีแต่รางจ่ายไฟ (ทั้งรางเป็นจุดเดียวกัน
     ขาสองข้างจึงลัดถึงกันทันที) และด่านที่มีอุปกรณ์เยอะจนแผงเริ่มแน่น */
  var found = search(2, 3);
  if(!found || found.dup || found.taken){
    /* ±10 แถว = ข้ามไปอีกฝั่งของร่องกลางได้ ซึ่งมักยังว่างอยู่ */
    var wide = search(6, 10);
    if(wide && (!found || wide.cost < found.cost)) found = wide;
  }
  if(!found) return false;
  var best = found.pos;

  item.el.style.left = Math.round(best.x) + 'px';
  item.el.style.top  = Math.round(best.y) + 'px';
  item.x = Math.round(best.x);
  item.y = Math.round(best.y);
  return true;
}

/* ชื่อรางแบบที่ช่างเรียกกัน — "แถว C ช่อง 12" หรือ "รางบวกแถวบน" */
function bbStripName(hole){
  var d = hole.def;
  if(d.t === 'rail'){
    return 'ราง' + (d.pol === '+' ? 'บวก (+)' : 'ลบ (−)') +
           (hole.strip.indexOf('T') >= 0 ? ' แถวบน' : ' แถวล่าง');
  }
  return 'แถว ' + d.label + ' ช่อง ' + (hole.col + 1);
}

/* ============================================================
   อ่านว่าขาไหนเสียบอยู่รูไหน
   ============================================================ */
function bbPortBaseTitle(p){
  var pol = p.dataset.polarity;
  return (pol === '+') ? 'ขั้วบวก (+)' : (pol === '-') ? 'ขั้วลบ (−)' : '';
}

function bbUpdatePlugs(){
  BB.portStrip = new Map();
  BB.portHole  = new Map();
  document.querySelectorAll('#workspace .port').forEach(function(p){
    p.classList.remove('plugged');
    p.title = bbPortBaseTitle(p);
  });
  if(!BB.on) return;

  G.wsItems.forEach(function(it){
    if(!it.el) return;
    var pos = bbItemPos(it);
    bbPortOffsets(it).forEach(function(o){
      var h = bbHoleNear(pos.x + o.dx, pos.y + o.dy, BB.pitch*0.42);
      if(!h) return;
      o.port.classList.add('plugged');
      var base = bbPortBaseTitle(o.port);
      o.port.title = (base ? base + ' · ' : '') + 'เสียบที่ ' + bbStripName(h);
      BB.portStrip.set(o.port, h.strip);
      BB.portHole.set(o.port, h);
    });
  });
}

/* ============================================================
   เส้นเชื่อมภายในราง — "สายไฟที่มองไม่เห็น" ของเบรดบอร์ดจริง
   สร้างเป็น wire object เหมือนสายปกติ ระบบอื่นจึงเห็นเป็นสายจริง
   แต่ติดธง virtual ไว้ เพื่อไม่ให้คลิกลบและวาดคนละแบบ
   ============================================================ */
function bbMakeLink(pa, pb){
  var id = 'bblink-' + (++BB.linkCounter);
  var ns = 'http://www.w3.org/2000/svg';
  var path = document.createElementNS(ns, 'path');
  path.id = id;
  path.setAttribute('class', 'wire-path wire-strip');
  document.getElementById('wire-svg').appendChild(path);

  G.wires.push({
    id:id, virtual:true,
    fromItemId:pa.dataset.itemId, fromPort:pa,
    toItemId:pb.dataset.itemId,   toPort:pb,
    pathEl:path,
    fromPol:pa.dataset.polarity || 'none',
    toPol:  pb.dataset.polarity || 'none',
    color:'#ffd700', flowDir:'forward', forcedColor:null
  });
}

function bbClearLinks(){
  var keep = [];
  G.wires.forEach(function(w){
    if(w.virtual){ if(w.pathEl) w.pathEl.remove(); }
    else keep.push(w);
  });
  G.wires = keep;
}

function bbSyncLinks(){
  bbClearLinks();
  if(!BB.on) return;

  var groups = {};
  BB.portStrip.forEach(function(strip, port){
    (groups[strip] = groups[strip] || []).push(port);
  });

  for(var strip in groups){
    var ps = groups[strip];
    if(ps.length < 2) continue;
    /* เรียงตามตำแหน่งรู เส้นเชื่อมจะได้ไล่ไปตามรางอย่างเป็นระเบียบ */
    ps.sort(function(a, b){
      var ha = BB.portHole.get(a), hb = BB.portHole.get(b);
      return (ha.col - hb.col) || (ha.row - hb.row);
    });
    for(var i=1;i<ps.length;i++) bbMakeLink(ps[i-1], ps[i]);
  }
}

/* ระบายไฮไลต์ให้รางที่มีขาเสียบตั้งแต่ 2 ขาขึ้นไป
   = รางที่กำลัง "ต่อถึงกัน" จริง ผู้เล่นจะได้เห็นว่าอะไรเชื่อมกับอะไร */
function bbPaintStrips(){
  if(!BB.on || !BB.liveG) return;
  var P = BB.pitch, r = P*0.42;

  var count = {};
  BB.portHole.forEach(function(hole, port){
    (count[hole.strip] = count[hole.strip] || []).push(hole);
  });

  var s = '';
  for(var strip in count){
    var hs = count[strip];
    if(hs.length < 2) continue;
    var x1=Infinity,y1=Infinity,x2=-Infinity,y2=-Infinity;
    hs.forEach(function(h){
      x1=Math.min(x1,h.x); x2=Math.max(x2,h.x);
      y1=Math.min(y1,h.y); y2=Math.max(y2,h.y);
    });
    s += '<rect class="bb-strip-live" x="'+(x1-r)+'" y="'+(y1-r)+'" '
       + 'width="'+(x2-x1+r*2)+'" height="'+(y2-y1+r*2)+'" rx="'+r+'"/>';
  }
  BB.liveG.innerHTML = s;
}

/* ============================================================
   เรียกรวบยอดหลังทุกการเปลี่ยนแปลงของอุปกรณ์บนบอร์ด
   ============================================================ */
var _bbBusy = false;
function bbRefresh(){
  if(!BB.on || _bbBusy) return;
  _bbBusy = true;
  bbUpdatePlugs();
  bbSyncLinks();
  bbPaintStrips();
  refreshWires();
  recolorWires();
  _bbBusy = false;
}

/* สร้างบอร์ดใหม่เมื่อขนาดพื้นที่ทำงานเปลี่ยน (ย่อ/ขยายหน้าต่าง, หมุนจอ)
   อุปกรณ์ที่วางไว้แล้วจะถูกเสียบลงรูใหม่ให้อัตโนมัติ */
var _bbResizeT = null;
function bbOnResize(){
  clearTimeout(_bbResizeT);
  _bbResizeT = setTimeout(function(){
    var screen = document.getElementById('screen-game');
    if(!screen || !screen.classList.contains('active')) return;
    applyBreadboard();   /* ดู js/game.js — สร้างแผงใหม่ + เสียบอุปกรณ์ลงรูใหม่ */
  }, 180);
}

window.addEventListener('resize', bbOnResize);
