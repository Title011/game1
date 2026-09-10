/* ============================================================
   WIRES — ระบบสายไฟทั้งหมด
   โหมดต่อสาย, เส้นโค้ง Bezier, ต่อ/ลบสาย,
   popup เลือกขั้วเมื่อจุดเดียวมีหลายสี, และการลงสีสายตามขั้ว
   ============================================================ */
/* ============================================================
   WIRE SYSTEM — Bezier curves
   ============================================================ */
/* เก็บกวาดสาย "กำพร้า" — สายที่ปลายด้านใดด้านหนึ่งหลุดออกจากหน้าไปแล้ว
   หรืออ้างอิงอุปกรณ์ที่ไม่มีอยู่ใน G.wsItems

   สายพวกนี้อ่านตำแหน่งได้ (0,0) จึงพุ่งไปเกาะมุมพื้นที่ทำงาน และลบไม่ออก
   เพราะ removeWsItem() ของอุปกรณ์ต้นทางทำงานไปแล้ว ไม่มีใครมาเก็บ
   ฟังก์ชันนี้เรียกซ้ำได้ปลอดภัย ใช้กู้สถานะที่พังอยู่แล้วได้ด้วย */
function portUnusable(p){
  if(!p || !document.body.contains(p)) return true;
  /* จุดที่หลุด DOM หรือถูกซ่อน จะวัดขนาดได้ 0 → getPortCenter() คืนพิกัดติดลบ
     เช็คขนาดจริงจึงครอบคลุมกว่าเช็คแค่ contains() */
  var r = p.getBoundingClientRect();
  return (r.width === 0 && r.height === 0);
}

function pruneOrphanWires(){
  var alive = {};
  G.wsItems.forEach(function(it){ alive[it.id] = true; });
  var dead = G.wires.filter(function(w){
    return !alive[w.fromItemId] || !alive[w.toItemId]
        || portUnusable(w.fromPort) || portUnusable(w.toPort);
  });
  if(!dead.length) return 0;
  dead.forEach(function(w){
    if(w.pathEl) w.pathEl.remove();
  });
  var deadIds = dead.map(function(w){ return w.id; });
  G.wires = G.wires.filter(function(w){ return deadIds.indexOf(w.id) < 0; });
  return dead.length;
}

/* ยกเลิกการต่อสายที่ค้างอยู่ (มือถือแตะจุดแรกไว้แล้วเปลี่ยนใจ) */
function cancelTapConnect(){
  if(G.tapWireFrom){ G.tapWireFrom.classList.remove('tap-selected'); G.tapWireFrom=null; }
  G.tapFromForcedPol = null;
  G.tapToForcedPol   = null;
  G.drawingFrom = null;
  /* สองตัวนี้ก็เก็บ reference ของ port ไว้เหมือนกัน (popup เลือกขั้ว)
     ถ้าไม่ล้างด้วย จะเหลือ port ที่หลุด DOM ค้างอยู่แล้วรั่วออกไปสร้างสายเสีย */
  G.pendingPickPort = null;
  G.pendingPickRole = null;
  G.dragPending     = null;
  var pp = document.getElementById('polarity-picker');
  if(pp) pp.style.display = 'none';
  hideWirePreview();
}

function getPortCenter(portEl){
  var wsEl=document.getElementById('workspace');
  var ws=wsEl.getBoundingClientRect();
  var r=portEl.getBoundingClientRect();
  /* ลบความหนา border ของ workspace ออก (clientLeft/Top = border width)
     เพราะ SVG วางที่ content-box แต่ getBoundingClientRect รวม border */
  var bx = wsEl.clientLeft;
  var by = wsEl.clientTop;
  /* หาทิศที่ port หันออก */
  var dir='right';
  if(portEl.classList.contains('port-left'))       dir='left';
  else if(portEl.classList.contains('port-right')) dir='right';
  else if(portEl.classList.contains('port-top'))   dir='top';
  else if(portEl.classList.contains('port-bottom'))dir='bottom';
  return {x:r.left+r.width/2-ws.left-bx, y:r.top+r.height/2-ws.top-by, dir:dir};
}

/* cubic bezier path — handles horizontal naturally */
/* ============================================================
   WIRE ROUTING — หลบกล่องอุปกรณ์

   ปัญหา: สายที่ต้อง "วนกลับ" (เช่น จุดขวาของตัวขวาสุด → จุดซ้ายของตัวซ้ายสุด)
   จะมี control point ดึงออกคนละทาง เส้นโค้งจึงกวาดย้อนกลับผ่านกึ่งกลาง
   ทะลุกล่องอุปกรณ์ที่ขวางอยู่พอดี

   วิธีแก้: สุ่มตรวจจุดบนเส้น ถ้าทับกล่องไหน ให้ยกเส้นอ้อมขึ้นบนหรือลงล่าง
   ============================================================ */

/* กล่องอุปกรณ์ทั้งหมด (พิกัดเทียบพื้นที่ทำงาน)
   getBoundingClientRect() บังคับให้เบราว์เซอร์คำนวณ layout ใหม่ ซึ่งช้า
   ระหว่างลากอุปกรณ์จะเรียกทุกเฟรม จึงแคชไว้แล้วล้างทีเดียวต่อรอบวาด */
var _wsRectCache = null;
function clearWsRectCache(){ _wsRectCache = null; }
function wsItemRects(){
  if(_wsRectCache) return _wsRectCache;
  var wsEl = document.getElementById('workspace');
  if(!wsEl){ return (_wsRectCache = []); }
  var ws = wsEl.getBoundingClientRect();
  var bx = wsEl.clientLeft, by = wsEl.clientTop;
  var out = [];
  G.wsItems.forEach(function(it){
    if(!it.el) return;
    var r = it.el.getBoundingClientRect();
    out.push({
      id:it.id,   /* ใช้แยกว่ากล่องนี้เป็นต้นทาง/ปลายทางของสายเส้นที่กำลังวาดไหม */
      x1:r.left  - ws.left - bx, y1:r.top    - ws.top - by,
      x2:r.right - ws.left - bx, y2:r.bottom - ws.top - by
    });
  });
  return (_wsRectCache = out);
}

/* จุดบนเส้นโค้ง cubic ที่ตำแหน่ง t */
function cubicAt(t,a,b,c,d){
  var m = 1-t;
  return m*m*m*a + 3*m*m*t*b + 3*m*t*t*c + t*t*t*d;
}

/* เส้นนี้ทับกล่องอุปกรณ์ตัวไหนไหม

   แยกเกณฑ์ 2 แบบ:
   • กล่องต้นทาง/ปลายทางของสายเส้นนี้เอง — สายออกจากจุดขั้วที่เกาะขอบกล่องอยู่แล้ว
     จึงตรวจเฉพาะช่วงกลางจริง ๆ (t 0.24-0.76) และเผื่อระยะแค่ 2px
   • กล่องอื่น — ตรวจเกือบทั้งเส้น (t 0.08-0.92) และเผื่อระยะ 12px ให้เห็นช่องว่างชัด

   เดิมใช้เกณฑ์เดียวกันหมด (t 0.12-0.88) เลยมีจุดบอด: อุปกรณ์ตัวอื่นที่วางใกล้
   ปลายสายจะอยู่นอกช่วงตรวจ สายจึงพาดทับได้โดยระบบไม่รู้ตัว */
function wireHitsItems(x1,y1,c1x,c1y,c2x,c2y,x2,y2,rects,ownIds){
  for(var j=0;j<rects.length;j++){
    var r = rects[j];
    var own = ownIds && ownIds.indexOf(r.id) >= 0;
    var pad = own ? 2 : 12;
    var i0  = own ? 6 : 2;      /* t เริ่มที่ 0.24 : 0.08 */
    var i1  = own ? 19 : 23;    /* t จบที่   0.76 : 0.92 */
    for(var i=i0;i<=i1;i++){
      var t = i/25;
      var x = cubicAt(t,x1,c1x,c2x,x2), y = cubicAt(t,y1,c1y,c2y,y2);
      if(x > r.x1-pad && x < r.x2+pad && y > r.y1-pad && y < r.y2+pad) return true;
    }
  }
  return false;
}

/*
  วาดสายโค้ง โดย "ดึงเส้นออกจาก port ตามทิศที่ port หันหน้า" ก่อน
  ทำให้สายพุ่งออกจากขอบ icon ไม่ตัดผ่านตัว icon
  fromDir/toDir: 'left'/'right'/'top'/'bottom' (ทิศที่ port ยื่นออก)
  avoid: false = ไม่ต้องหลบกล่อง (ใช้กับเส้น preview ตอนลาก จะได้ไม่กระตุก)
*/
function bezierPath(x1,y1,x2,y2,fromDir,toDir,avoid,ownIds){
  fromDir = fromDir || 'right';
  toDir   = toDir   || 'left';

  /* ระยะยื่น control point ออกจากจุดขั้ว = ความยาว "ขาสาย" ที่พุ่งตรงออกมา
     ก่อนจะเริ่มโค้ง

     ต้องมีเพดาน! เดิมเป็น hypot*0.4 ไม่จำกัด ปลายสายห่างกัน 370px
     จะได้ขายาว 148px ทั้งสองฝั่ง เส้นเลยเหวี่ยงเลยจุดปลายไปคนละทาง
     กลายเป็นตัว S ยักษ์ ดูไม่เป็นสายไฟ

     34-78px คือช่วงที่ดูเหมือนสายจริง: มีขาสั้น ๆ ออกจากขั้วแล้วโค้งไปเลย */
  var span = Math.hypot(x2-x1, y2-y1);
  var dist = Math.max(34, Math.min(78, span * 0.32));

  /* offset ของ control point ตามทิศ port (d = ความยาวขาสาย) */
  function ctrl(x, y, dir, d){
    switch(dir){
      case 'left':   return {x:x-d, y:y};
      case 'right':  return {x:x+d, y:y};
      case 'top':    return {x:x, y:y-d};
      case 'bottom': return {x:x, y:y+d};
      default:       return {x:x+d, y:y};
    }
  }

  /* สร้างเส้นจาก 2 ตัวแปร:
       o = เลื่อน control point ขึ้น/ลง (อ้อมบน-ล่าง)
       m = ตัวคูณความยาวขาสาย (ยืดขาให้เส้นโก่งอ้อมออกด้านข้าง) */
  function ctrls(m){
    return [ ctrl(x1,y1,fromDir,dist*m), ctrl(x2,y2,toDir,dist*m) ];
  }
  function build(o,m){
    var c = ctrls(m||1);
    return 'M'+x1+','+y1+' C'+c[0].x+','+(c[0].y+o)+' '+c[1].x+','+(c[1].y+o)+' '+x2+','+y2;
  }
  function clear(o,m,rects){
    var c = ctrls(m);
    return !wireHitsItems(x1,y1,c[0].x,c[0].y+o,c[1].x,c[1].y+o,x2,y2,rects,ownIds);
  }

  if(avoid === false) return build(0,1);

  var rects = wsItemRects();
  if(!rects.length) return build(0,1);
  if(clear(0,1,rects)) return build(0,1);

  /* ค่อย ๆ ขยับทีละขั้นแล้วหยุดที่ขั้นแรกที่พ้น = ทางอ้อมสั้นที่สุดเท่าที่จำเป็น

     ลอง 2 มิติ เพราะการเลื่อนขึ้น-ลงอย่างเดียวแก้ไม่ได้ทุกกรณี:
     ถ้ากล่องขวางอยู่ "ด้านข้าง" ต้องยืดขาสายให้เส้นโก่งอ้อมออกไปแทน
     (เดิมมีแต่มิติขึ้น-ลง พอไม่พ้นก็ยอมแพ้แล้วคืนเส้นที่ทับกล่องอยู่) */
  var STEP = 22, MAX_TRY = 9, MULTS = [1, 1.7, 2.5];
  for(var k=1;k<=MAX_TRY;k++){
    for(var mi=0;mi<MULTS.length;mi++){
      var m = MULTS[mi];
      /* ลองขึ้นก่อนลงสลับกันในแต่ละขั้น จะได้เลือกฝั่งที่ใกล้กว่าเสมอ */
      if(clear(-k*STEP, m, rects)) return build(-k*STEP, m);
      if(clear( k*STEP, m, rects)) return build( k*STEP, m);
    }
  }
  /* อ้อมยังไงก็ยังทับ (อุปกรณ์วางชิดกันมากจนไม่มีช่องให้ลอด)
     ใช้ขาสายยาวสุดไว้ อย่างน้อยเส้นจะอ้อมออกนอกกลุ่มมากที่สุด */
  return build(0, MULTS[MULTS.length-1]);
}

function showWirePreview(x1,y1,x2,y2){
  var p=document.getElementById('wire-preview');
  /* เส้น preview ไม่ต้องหลบ ไม่งั้นจะกระตุกตามเมาส์ */
  p.setAttribute('d',bezierPath(x1,y1,x2,y2,null,null,false));
  p.style.display='';
}
function hideWirePreview(){
  document.getElementById('wire-preview').style.display='none';
}

/* จุดขั้วรับการต่อสายได้ตลอดเวลา ไม่ต้องเปิดโหมดอะไรก่อน
   ไม่ชนกับการลากย้ายอุปกรณ์ เพราะ startDrag() ข้ามไปเมื่อ target เป็น .port
   และ stopPropagation() ด้านล่างกันไม่ให้ event ลอยขึ้นไปถึงตัวอุปกรณ์ */
function onPortMouseDown(e){
  if(G.probeMode) return;      /* โหมดเครื่องวัดใช้จิ้มสาย ไม่ใช่ต่อสาย */
  e.stopPropagation();
  if(e.cancelable) e.preventDefault();
  var port=e.currentTarget;

  var isTouch = (e.type === 'touchstart');

  /* ===== โหมดมือถือ: แตะทีละจุด ===== */
  if(isTouch){
    handleTapConnect(port);
    return;
  }

  /* ===== โหมด desktop: ลากต่อสาย ===== */
  var c=getPortCenter(port);
  G.drawingFrom={itemId:port.dataset.itemId,portEl:port,cx:c.x,cy:c.y};
  showWirePreview(c.x,c.y,c.x,c.y);
  document.getElementById('wire-svg').classList.add('dragging');

  var ws=document.getElementById('workspace');
  var wsRect=ws.getBoundingClientRect();
  var wsBx=ws.clientLeft, wsBy=ws.clientTop;

  function wireOnMove(ev){
    if(!G.drawingFrom) return;
    if(ev.cancelable) ev.preventDefault();
    var p=getXY(ev);
    showWirePreview(G.drawingFrom.cx,G.drawingFrom.cy,p.x-wsRect.left-wsBx,p.y-wsRect.top-wsBy);
  }
  function wireOnUp(ev){
    hideWirePreview();
    document.getElementById('wire-svg').classList.remove('dragging');
    document.removeEventListener('mousemove',wireOnMove);
    document.removeEventListener('mouseup',wireOnUp);
    if(!G.drawingFrom) return;
    var from=G.drawingFrom;
    G.drawingFrom=null;
    var p=getUpXY(ev);
    var target=document.elementFromPoint(p.x,p.y);
    if(target&&target.classList.contains('port')&&target!==port){
      var toId=target.dataset.itemId;
      if(toId!==from.itemId){
        /* ถ้าจุดต้นทางหรือปลายทางมี 2 สี → ให้เลือกขั้วก่อน */
        var needFrom = portHasMultipleColors(port);
        var needTo   = portHasMultipleColors(target);
        if(needFrom || needTo){
          G.dragPending = {fromItemId:from.itemId, fromPort:port, toItemId:toId, toPort:target,
                           needFrom:needFrom, needTo:needTo, gotFrom:null, gotTo:null};
          G.pendingPickRole = needFrom ? 'drag-from' : 'drag-to';
          showPolarityPicker();
          return;
        }
        var tc=getPortCenter(target);
        addWire(from.itemId,port,from.cx,from.cy,toId,target,tc.x,tc.y);
      }
    }
  }
  document.addEventListener('mousemove',wireOnMove,{passive:false});
  document.addEventListener('mouseup',wireOnUp);
}

/* ===== มือถือ: แตะ port ทีละจุดเพื่อต่อสาย ===== */
function handleTapConnect(port){
  /* จุดขั้วที่ค้างไว้อาจถูกลบไปแล้ว (ลบอุปกรณ์ทิ้งระหว่างค้างการต่อสาย)
     ถ้าไม่เช็ค จะสร้างสายจาก element ที่หลุด DOM ไปแล้ว
     ซึ่ง getBoundingClientRect() คืน 0 ทั้งหมด = สายพุ่งไปเกาะมุมจอ
     แล้วลบไม่ออกด้วย เพราะอุปกรณ์ต้นทางไม่มีอยู่แล้ว */
  if(G.tapWireFrom && !document.body.contains(G.tapWireFrom)){
    cancelTapConnect();
  }

  /* ยังไม่มี port แรก → เลือก port นี้เป็นจุดเริ่ม */
  if(!G.tapWireFrom){
    /* ถ้าจุดนี้มี 2 สีต่ออยู่ → ให้เลือกขั้วก่อน */
    if(portHasMultipleColors(port)){
      G.pendingPickPort = port;
      G.pendingPickRole = 'from';
      showPolarityPicker();
      return;
    }
    startTapFrom(port);
    return;
  }

  /* แตะจุดเดิมซ้ำ → ยกเลิก */
  if(G.tapWireFrom === port){
    port.classList.remove('tap-selected');
    G.tapWireFrom = null;
    G.tapFromForcedPol = null;
    hideWirePreview();
    showToast('ยกเลิกการต่อสาย','');
    return;
  }

  /* มี port แรกแล้ว + แตะ port ที่ 2 */
  var from = G.tapWireFrom;
  var fromId = from.dataset.itemId;
  var toId = port.dataset.itemId;

  if(fromId === toId){
    showToast('ต่อสายภายในอุปกรณ์เดียวกันไม่ได้','error');
    return;
  }

  /* ถ้าจุดที่ 2 มี 2 สี → เลือกขั้วก่อนต่อ */
  if(portHasMultipleColors(port)){
    G.pendingPickPort = port;
    G.pendingPickRole = 'to';
    showPolarityPicker();
    return;
  }

  finalizeTapConnect(port);
}

/* เริ่มเลือกจุดแรก */
function startTapFrom(port){
  G.tapWireFrom = port;
  port.classList.add('tap-selected');
  var c = getPortCenter(port);
  showWirePreview(c.x, c.y, c.x, c.y);
  showToast('แตะจุดที่ 2 เพื่อต่อสาย (แตะจุดเดิมซ้ำเพื่อยกเลิก)','success');
}

/* ต่อสายจริง (หลังผ่านการเลือกขั้วถ้าจำเป็น) */
function finalizeTapConnect(port){
  var from = G.tapWireFrom;
  /* จุดต้นทางอาจหายไปแล้ว (ลบอุปกรณ์ทิ้งระหว่างค้างการต่อสาย)
     เดิมโค้ดอ่าน from.dataset ทันที ซึ่งจะ throw ถ้า from เป็น null
     ทำให้ handler ตายกลางทางและสถานะค้างเพี้ยนต่อไปเรื่อย ๆ */
  if(!from || portUnusable(from) || portUnusable(port)){
    cancelTapConnect();
    showToast('จุดต้นทางหายไปแล้ว — เริ่มต่อสายใหม่','error');
    return;
  }
  var fromId = from.dataset.itemId;
  var toId = port.dataset.itemId;

  from.classList.remove('tap-selected');
  hideWirePreview();
  G.tapWireFrom = null;

  var fc = getPortCenter(from);
  var tc = getPortCenter(port);
  /* ส่งขั้วที่ผู้เล่นเลือก (ถ้ามี) ไปกำหนดสีสาย */
  addWire(fromId, from, fc.x, fc.y, toId, port, tc.x, tc.y,
          G.tapFromForcedPol, G.tapToForcedPol);
  G.tapFromForcedPol = null;
  G.tapToForcedPol = null;
}

/* เช็คว่าจุดนี้มีสายหลายสีต่ออยู่ไหม */
function portHasMultipleColors(port){
  var colors = {};
  G.wires.forEach(function(w){
    if(w.fromPort===port || w.toPort===port){ colors[w.color]=true; }
  });
  return Object.keys(colors).length >= 2;
}

/* แสดง popup เลือกขั้ว */
function showPolarityPicker(){
  document.getElementById('polarity-picker').style.display='block';
}

/* ผู้เล่นเลือกขั้ว */
function pickPolarity(pol){
  document.getElementById('polarity-picker').style.display='none';
  var role = G.pendingPickRole;

  /* ===== desktop drag flow ===== */
  if(role === 'drag-from' || role === 'drag-to'){
    var d = G.dragPending;
    if(!d) return;
    if(role === 'drag-from'){
      d.gotFrom = pol;
      /* ถ้าปลายทางก็มี 2 สี ต้องเลือกอีกรอบ */
      if(d.needTo){
        G.pendingPickRole = 'drag-to';
        showPolarityPicker();
        return;
      }
    } else {
      d.gotTo = pol;
    }
    /* เลือกครบแล้ว → ต่อสาย */
    var tc = getPortCenter(d.toPort);
    var fc = getPortCenter(d.fromPort);
    addWire(d.fromItemId, d.fromPort, fc.x, fc.y, d.toItemId, d.toPort, tc.x, tc.y,
            d.gotFrom, d.gotTo);
    G.dragPending = null;
    G.pendingPickRole = null;
    return;
  }

  /* ===== mobile tap flow ===== */
  var port = G.pendingPickPort;
  G.pendingPickPort = null;
  G.pendingPickRole = null;

  if(role === 'from'){
    G.tapFromForcedPol = pol;
    startTapFrom(port);
  } else {
    G.tapToForcedPol = pol;
    finalizeTapConnect(port);
  }
}

/* ยกเลิกการเลือกขั้ว */
function cancelPolarityPick(){
  document.getElementById('polarity-picker').style.display='none';
  var role = G.pendingPickRole;
  G.pendingPickPort = null;
  G.pendingPickRole = null;
  G.dragPending = null;
  /* ถ้ากำลังต่อสายจากจุดแรกอยู่ ให้รีเซ็ต */
  if(role === 'to' && G.tapWireFrom){
    G.tapWireFrom.classList.remove('tap-selected');
    G.tapWireFrom = null;
    G.tapFromForcedPol = null;
    hideWirePreview();
  }
  showToast('ยกเลิก','');
}

function addWire(fromItemId,fromPort,fx,fy,toItemId,toPort,tx,ty,forcedFromPol,forcedToPol){
  /* อนุญาตให้ 1 port ต่อได้หลายเส้น (เหมือน node ในวงจรจริง)
     กันเฉพาะการต่อสายซ้ำเป๊ะ ๆ ระหว่าง port คู่เดิม */
  var dupExact=false;
  G.wires.forEach(function(w){
    if((w.fromPort===fromPort&&w.toPort===toPort)||
       (w.fromPort===toPort&&w.toPort===fromPort)) dupExact=true;
  });
  if(dupExact){showToast('สายนี้ต่ออยู่แล้ว','error');return;}

  /* ปลายสายต้องยังอยู่ในหน้าจริง ๆ
     กันกรณีค้างการต่อสายไว้แล้วอุปกรณ์ต้นทางถูกลบไปก่อน
     ถ้าปล่อยผ่าน getPortCenter() จะอ่าน element ที่หลุด DOM ได้ (0,0)
     กลายเป็นสายเกาะมุมจอที่ลบไม่ออก */
  if(!document.body.contains(fromPort) || !document.body.contains(toPort)){
    cancelTapConnect();
    showToast('อุปกรณ์ต้นทางถูกลบไปแล้ว — เริ่มต่อสายใหม่','error');
    return;
  }

  /* คำนวณตำแหน่งจาก port element จริงเสมอ (แก้ปัญหาสายไม่ตรงจุด)
     ไม่ใช้ค่า fx,fy,tx,ty ที่ส่งมาเพราะอาจคลาดเคลื่อน */
  clearWsRectCache();
  var fc=getPortCenter(fromPort);
  var tc=getPortCenter(toPort);

  var wireId='wire-'+(++G.wireCounter);
  var ns='http://www.w3.org/2000/svg';
  var path=document.createElementNS(ns,'path');
  path.id=wireId;
  path.className.baseVal='wire-path';
  path.setAttribute('d',bezierPath(fc.x,fc.y,tc.x,tc.y,fc.dir,tc.dir,true,[fromItemId,toItemId]));
  /* คลิก/แตะที่เส้น = ลบสาย (ทั้งคอมและมือถือ) ยกเว้นตอนใช้เครื่องวัด */
  path.addEventListener('click',function(){if(!G.probeMode)removeWire(wireId);});
  /* คลิกขวา = ลบสาย (ใช้ได้ทุกโหมด) */
  path.addEventListener('contextmenu',function(e){
    e.preventDefault(); e.stopPropagation();
    removeWire(wireId);
    showToast('ลบสายไฟแล้ว','');
  });
  document.getElementById('wire-svg').appendChild(path);

  fromPort.classList.add('connected');
  toPort.classList.add('connected');

  /* ขั้วของสายนี้ — ใช้ขั้วที่ผู้เล่นเลือก (ถ้ามี) มิฉะนั้นอ่านจาก port */
  var fromPol=forcedFromPol || fromPort.dataset.polarity||'none';
  var toPol  =forcedToPol   || toPort.dataset.polarity||'none';

  /* เก็บทิศการไหล (+ อยู่ปลายไหน) สำหรับ animation จุดกระแส */
  var flowDir='forward';
  if(fromPol==='+') flowDir='forward';
  else if(toPol==='+') flowDir='reverse';
  else if(toPol==='-') flowDir='forward';
  else if(fromPol==='-') flowDir='reverse';

  /* สีสายจากขั้วที่เลือก/ตรวจได้ */
  var forcedColor = null;
  if(forcedFromPol==='+' || forcedToPol==='+') forcedColor='#ff4444';
  else if(forcedFromPol==='-' || forcedToPol==='-') forcedColor='#00aaff';

  G.wires.push({id:wireId,fromItemId:fromItemId,fromPort:fromPort,toItemId:toItemId,toPort:toPort,pathEl:path,fromPol:fromPol,toPol:toPol,color:'#ffd700',flowDir:flowDir,forcedColor:forcedColor});

  /* ลงสีสายทั้งวงจรใหม่ (ไล่จากขั้วแบต) */
  recolorWires();

  showToast('ต่อสายสำเร็จ!','success');
}

function removeWire(wireId){
  var found=null;
  G.wires.forEach(function(w){if(w.id===wireId)found=w;});
  if(!found) return;
  found.pathEl.remove();
  [found.fromPort,found.toPort].forEach(function(p){
    var used=false;
    G.wires.forEach(function(w){if(w.id!==wireId&&(w.fromPort===p||w.toPort===p))used=true;});
    if(!used) p.classList.remove('connected');
  });
  G.wires=G.wires.filter(function(w){return w.id!==wireId;});
  recolorWires();
}

/*
  ลงสีสาย + ส่งต่อสีผ่าน "จุดเชื่อมเดียวกัน":
  1) สายที่แตะขั้ว + = แดง, แตะขั้ว − = ฟ้า (จุดตั้งต้น)
  2) สายที่ต่อ "จุดเดียวกัน" กับสายที่มีสีแล้ว → รับสีเดียวกัน
     (จุดเดียวกัน = โหนดไฟฟ้าเดียวกัน ศักย์เท่ากัน สีต้องเหมือนกัน)
  3) ถ้าสายไหนโดนทั้งแดงและฟ้า (ชนกัน) = เหลือง
  หมายเหตุ: สีส่งผ่านแค่จุด ไม่ทะลุผ่านตัวอุปกรณ์
  → วงจรปิดสีไม่เพี้ยน เพราะไฟไม่รั่วข้ามอุปกรณ์
*/
/*
  ลงสีสาย — ส่งต่อสีผ่าน "จุดเชื่อม" โดยยึด "ขั้วที่ใกล้ที่สุดชนะ"
  - เริ่มจากขั้วแบต: ขั้ว+ = แดง, ขั้ว− = ฟ้า
  - วัดระยะ (จำนวนสาย) จากแต่ละขั้วถึงสายแต่ละเส้น → ขั้วที่ใกล้กว่าเป็นเจ้าของสี
  - ไม่ทะลุผ่านตัวอุปกรณ์ (สวิตช์ซ้าย/ขวา เป็นคนละจุด)
  - ระยะเท่ากันทั้ง 2 ขั้ว = ลัดวงจร → เหลือง
  - ไม่ถึงขั้วใดเลย = เหลือง (สายกลางวง)
  - สายที่ผู้เล่นเลือกขั้วเอง (forcedColor) เป็นจุดตั้งต้นเพิ่ม
*/
function recolorWires(){
  /* เก็บกวาดสายกำพร้าที่นี่ = ครอบทุกทางที่สายเปลี่ยนแปลง
     เพราะ recolorWires() ถูกเรียกหลัง addWire / removeWire / removeWsItem เสมอ
     ไม่ว่ารูรั่วจะอยู่ทางไหน สายเสียจะถูกกวาดทิ้งภายในจังหวะเดียวกัน */
  pruneOrphanWires();

  var RED='#ff4444', BLUE='#00aaff', YEL='#ffd700';

  /* หาสายทั้งหมดที่ต่อกับจุดหนึ่ง */
  function wiresAt(p){
    var out = [];
    G.wires.forEach(function(w){ if(w.fromPort===p || w.toPort===p) out.push(w); });
    return out;
  }
  /* อุปกรณ์ที่ไฟทะลุโดยไม่เปลี่ยนศักย์ (สวิตช์/ฟิวส์/บอร์ด/สาย/R) = ระยะไม่เพิ่ม
     โหลด (หลอด/LED/มอเตอร์/บัซเซอร์) = ไฟตกคร่อม ระยะ +1 (ขยับห่างจากขั้ว+) */
  function crossCost(itemId){
    var it=null; G.wsItems.forEach(function(x){if(x.id===itemId)it=x;});
    if(!it) return null;
    var t=DEVICES[it.deviceId].type;
    if(t==='source') return null;          /* ไม่ทะลุแหล่งจ่าย */
    return (t==='output') ? 1 : 0;         /* โหลด=+1, อื่นๆ=0 */
  }
  /* หา port อีกด้านของอุปกรณ์เดียวกัน + ต้นทุนการข้าม */
  function throughPorts(port){
    var itemId = port.dataset.itemId;
    var cost = crossCost(itemId);
    if(cost===null) return [];
    var it=null; G.wsItems.forEach(function(x){if(x.id===itemId)it=x;});
    if(!it || !it.el) return [];
    var out=[];
    var ports=it.el.querySelectorAll('.port');
    for(var i=0;i<ports.length;i++){ if(ports[i]!==port) out.push({port:ports[i], cost:cost}); }
    return out;
  }

  /* BFS วัดระยะจากขั้ว — ไฟไหลผ่านสาย + ทะลุผ่านอุปกรณ์ passthrough
     แต่หยุดที่โหลด (ไม่ทะลุ) → สายก่อนโหลดได้สีจากขั้วต้นทาง */
  function spread(seedPorts, seedWires){
    var wireDist = {};
    var portDist = new Map();
    var queue = [];
    function visitPort(p, d){
      if(portDist.has(p) && portDist.get(p)<=d) return;
      portDist.set(p, d);
      queue.push(p);
    }
    seedPorts.forEach(function(p){ visitPort(p,0); });
    seedWires.forEach(function(w){
      wireDist[w.id] = 0;
      visitPort(w.fromPort,0); visitPort(w.toPort,0);
    });
    while(queue.length){
      var p = queue.shift();
      var d = portDist.get(p);
      /* 1) ไหลผ่านสายที่ต่อ port นี้ */
      wiresAt(p).forEach(function(w){
        var wd = d + 1;
        if(wireDist[w.id]===undefined || wd < wireDist[w.id]) wireDist[w.id] = wd;
        var q = (w.fromPort===p) ? w.toPort : w.fromPort;
        visitPort(q, wd);
      });
      /* 2) ทะลุผ่านตัวอุปกรณ์ไปอีกด้าน — โหลดเพิ่มระยะ +1, อื่นๆ +0 */
      throughPorts(p).forEach(function(tp){
        visitPort(tp.port, d + tp.cost);
      });
    }
    return wireDist;
  }

  /* จุดตั้งต้น = ขั้วของแหล่งจ่าย */
  var redPorts=[], bluePorts=[];
  G.wsItems.forEach(function(it){
    if(!it.el) return;
    if(DEVICES[it.deviceId].type !== 'source') return;
    var ports = it.el.querySelectorAll('.port');
    for(var i=0;i<ports.length;i++){
      var p = ports[i];
      if(p.dataset.polarity==='+')      redPorts.push(p);
      else if(p.dataset.polarity==='-') bluePorts.push(p);
    }
  });

  /* สายที่ผู้เล่นบังคับสีไว้ = จุดตั้งต้นเพิ่มเติม */
  var redForced=[], blueForced=[];
  G.wires.forEach(function(w){
    if(w.forcedColor===RED)       redForced.push(w);
    else if(w.forcedColor===BLUE) blueForced.push(w);
  });

  var dRed  = spread(redPorts,  redForced);
  var dBlue = spread(bluePorts, blueForced);

  /* ลงสี: ขั้วที่ใกล้กว่าชนะ (ไฟบวกทะลุสวิตช์มาถึงก่อน = แดง) */
  G.wires.forEach(function(w){
    var dr = dRed[w.id], db = dBlue[w.id], color;
    if(w.forcedColor)                         color = w.forcedColor;
    else if(dr===undefined && db===undefined) color = YEL;   /* ไม่ถึงขั้วใดเลย */
    else if(db===undefined)                   color = RED;
    else if(dr===undefined)                   color = BLUE;
    else if(dr <= db)                          color = RED;   /* บวกถึงก่อนหรือเท่ากัน = แดง */
    else                                      color = BLUE;

    /* เก็บระยะจากขั้ว+ ไว้ กำหนดทิศไหล (กระแสไหล +→−)
       ปลายสายที่ใกล้ขั้ว+ = ต้นทาง, ไกลกว่า = ปลายทาง */
    w._distPlus = (dr===undefined) ? 9999 : dr;

    w.color = color;
    w.pathEl.classList.remove('wire-pos','wire-neg');
    if(color===RED)       w.pathEl.classList.add('wire-pos');
    else if(color===BLUE) w.pathEl.classList.add('wire-neg');
    w.pathEl.style.stroke = color;
    w.pathEl.dataset.flowColor = color;
  });

  /* ระบายสีจุด — จุดที่มีสายหลายสี แบ่งครึ่งซ้าย-ขวา */
  colorPortDots();
}

/* รวบรวมสีสายที่ต่อกับแต่ละ port แล้วระบายสีจุด */
function colorPortDots(){
  var portColors = new Map();
  function add(portEl, color){
    if(!portColors.has(portEl)) portColors.set(portEl, {});
    portColors.get(portEl)[color] = true;
  }
  G.wires.forEach(function(w){
    add(w.fromPort, w.color);
    add(w.toPort, w.color);
  });

  document.querySelectorAll('.port').forEach(function(p){
    p.style.background = '';
    p.classList.remove('port-multicolor');
  });

  portColors.forEach(function(colorSet, portEl){
    var colors = Object.keys(colorSet);
    if(colors.length === 1){
      portEl.style.background = colors[0];
    } else {
      /* หลายสี → แบ่งครึ่งซ้าย-ขวา (แดงซ้าย / ฟ้าขวา / เหลืองท้าย) */
      var order = {'#ff4444':0, '#00aaff':1, '#ffd700':2};
      var sorted = colors.slice().sort(function(a,b){
        return (order[a]!==undefined?order[a]:9) - (order[b]!==undefined?order[b]:9);
      });
      var c1=sorted[0], c2=sorted[1];
      portEl.style.background='linear-gradient(to right, '+c1+' 0%, '+c1+' 50%, '+c2+' 50%, '+c2+' 100%)';
      portEl.classList.add('port-multicolor');
    }
  });
}


/* วาดสายใหม่ทุกเส้น
   ไม่ได้กรองเฉพาะสายที่ต่อกับ itemId แล้ว เพราะการลากอุปกรณ์ไปขวางกลาง
   ทำให้ "สายเส้นอื่นที่ไม่ได้ต่อกับมัน" ต้องเปลี่ยนทางอ้อมด้วย
   (พารามิเตอร์ itemId เก็บไว้เพื่อความเข้ากันได้กับที่เรียกอยู่เดิม) */
function refreshWires(itemId){
  pruneOrphanWires();   /* เก็บสายที่ปลายหลุด DOM ทิ้งก่อน ไม่ให้วาดเป็นเส้นเกาะมุมจอ */
  clearWsRectCache();   /* ตำแหน่งกล่องเปลี่ยนแล้ว ต้องวัดใหม่รอบนี้ */
  G.wires.forEach(function(w){
    var fc=getPortCenter(w.fromPort);
    var tc=getPortCenter(w.toPort);
    var d=bezierPath(fc.x,fc.y,tc.x,tc.y,fc.dir,tc.dir,true,[w.fromItemId,w.toItemId]);
    w.pathEl.setAttribute('d',d);
    /* อัปเดตเส้นทางของจุดกระแสไฟ (ถ้ากำลังแสดงอยู่) */
    if(G.flowDots && G.flowDots.length){
      G.flowDots.forEach(function(dot){
        if(dot.style.offsetPath && dot._wireId===w.id){
          dot.style.offsetPath='path("'+d+'")';
        }
      });
    }
  });
  clearWsRectCache();   /* กันค่าค้างข้ามเฟรม */
}
