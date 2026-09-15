/* ============================================================
   WORKSPACE — อุปกรณ์บนพื้นที่ทำงาน
   วาง/ลบ/ล้าง, ลากย้าย (เมาส์+นิ้ว), เลือกอุปกรณ์,
   แถบเครื่องมือลอยบนมือถือ และการหมุนอุปกรณ์
   ============================================================ */
/* ============================================================
   WORKSPACE ITEMS
   ============================================================ */
/* ดึงอุปกรณ์กลับให้อยู่ในพื้นที่ทำงานเสมอ (วัดขนาดจริงจาก DOM)
   #workspace เป็น overflow:hidden ถ้าปล่อยให้เลยขอบ อุปกรณ์จะถูกตัด
   หายไปจนแตะไม่ถูก ต้องล้างพื้นที่ทั้งหมดถึงจะกู้คืนได้ */
function clampWsItem(item){
  var wsEl=document.getElementById('workspace');
  if(!wsEl||!item||!item.el) return;
  var M=4;
  var maxX=Math.max(M, wsEl.clientWidth  - item.el.offsetWidth  - M);
  var maxY=Math.max(M, wsEl.clientHeight - item.el.offsetHeight - M);
  var nx=Math.min(Math.max(M, parseFloat(item.el.style.left)||0), maxX);
  var ny=Math.min(Math.max(M, parseFloat(item.el.style.top) ||0), maxY);
  item.el.style.left=nx+'px'; item.el.style.top=ny+'px';
  item.x=nx; item.y=ny;
}

/* ============================================================
   ผูกการ "แตะ" ให้ป้ายเล็ก ๆ บนตัวอุปกรณ์ (สับสวิตช์ / เลือกค่า R / คัดลอก)

   ของเดิมผูกทั้ง click และ touchstart ไว้ด้วยกัน บนมือถือจึงทำงานสองรอบ:
   touchstart สับสวิตช์ไปหนึ่งที แล้ว click สังเคราะห์ที่เบราว์เซอร์ยิงตามมา
   สับกลับอีกที ผลรวมเป็นศูนย์ = "กดไม่ติดเลย" ทั้งที่โค้ดทำงานครบสองครั้ง

   ตัวนี้จึงแยกทางเดินให้ชัด: นิ้วใช้ touchend (เช็คว่าไม่ได้เลื่อนนิ้ว = เป็นการแตะ
   จริง) แล้ว preventDefault ปิดปาก click สังเคราะห์ · เมาส์ใช้ click ตามปกติ
   ============================================================ */
function bindBadgeTap(el, fn){
  var t0 = null, handled = false;
  /* .pressing = สัญญาณ "โดนปุ่มนี้แล้ว" ทันทีที่นิ้วลง ไม่ต้องรอปล่อยมือ
     ป้ายพวกนี้กว้างแค่ 18-26px และนิ้วบังไว้พอดี ถ้าไม่มีอะไรเปลี่ยนเลย
     ผู้เล่นจะไม่รู้ว่ากดโดนป้ายหรือกดโดนตัวอุปกรณ์ข้างใต้ */
  function press(on){ el.classList.toggle('pressing', !!on); }

  el.addEventListener('mousedown', function(e){ e.stopPropagation(); press(true); });
  el.addEventListener('mouseup',   function(){ press(false); });
  el.addEventListener('mouseleave',function(){ press(false); });
  el.addEventListener('touchstart', function(e){
    e.stopPropagation();
    var t = e.touches[0];
    t0 = {x:t.clientX, y:t.clientY};
    press(true);
  }, {passive:true});
  el.addEventListener('touchcancel', function(){ t0 = null; press(false); });
  el.addEventListener('touchend', function(e){
    e.stopPropagation();
    press(false);
    if(!t0) return;
    var t = e.changedTouches[0];
    var moved = Math.abs(t.clientX - t0.x) + Math.abs(t.clientY - t0.y);
    t0 = null;
    if(moved > 16) return;                 /* เลื่อนนิ้ว = ไม่ใช่การแตะ */
    if(e.cancelable) e.preventDefault();   /* กัน click สังเคราะห์ทำซ้ำ */
    handled = true;                        /* เผื่อเบราว์เซอร์ยิง click มาอยู่ดี */
    setTimeout(function(){ handled = false; }, 400);
    fn();
  }, {passive:false});
  el.addEventListener('click', function(e){
    e.stopPropagation();
    if(handled) return;
    fn();
  });
}

function addWsItem(deviceId,x,y){
  var dev=DEVICES[deviceId];
  /* คั่นประวัติก่อนเปลี่ยนวงจร (ดู js/history.js)
     ตัวมันเองรู้จักข้ามให้เองตอนกู้คืนหรืออยู่ในคำสั่งกลุ่ม */
  if(typeof pushHistory === 'function') pushHistory('วาง ' + dev.name);
  var itemId='ws-'+(++G.wsCounter);

  /* ตำแหน่งคร่าว ๆ ก่อน — ขนาดกล่องจริงวัดได้หลังใส่ลง DOM แล้ว
     จากนั้น clampWsItem() + bbSnapItem() จะจัดตำแหน่งสุดท้ายให้ */
  x=Math.max(0, x||0);
  y=Math.max(0, y||0);

  var el=document.createElement('div');
  el.className='ws-item'; el.id=itemId;
  el.style.left=x+'px'; el.style.top=y+'px';

  var del=document.createElement('span');
  del.className='ws-item-delete'; del.textContent='x';
  del.onclick=function(e){e.stopPropagation();removeWsItem(itemId);};

  var iconWrap=document.createElement('div');
  iconWrap.className='ws-item-svg';
  /* ฝังชิ้นส่วนจริง ไม่ใช่ <use> — ไม่งั้น CSS เลือกชิ้นส่วนข้างในไม่ได้
     แล้วอุปกรณ์จะไม่มีอนิเมชันตามค่าไฟฟ้าเลย (ดู makeSvgIconInline) */
  iconWrap.appendChild(makeSvgIconInline(dev.svgId,52,52));

  var name=document.createElement('span');
  name.className='ws-item-name'; name.textContent=dev.name;

  el.appendChild(del); el.appendChild(iconWrap); el.appendChild(name);

  dev.ports.forEach(function(pos){
    var port=document.createElement('div');
    port.className='port port-'+pos;
    port.dataset.itemId=itemId;
    port.dataset.origPos=pos; /* ชื่อจุดถาวร ไม่เปลี่ยนตอนหมุน — ใช้เช็คเฉลย */

    /* กำหนดขั้ว +/− สำหรับอุปกรณ์ที่มีขั้ว */
    if(dev.polarized){
      if(pos===dev.pos){
        port.dataset.polarity='+';
        port.classList.add('port-pos');
        port.title='ขั้วบวก (+)';
      } else if(pos===dev.neg){
        port.dataset.polarity='-';
        port.classList.add('port-neg');
        port.title='ขั้วลบ (−)';
      }
    } else {
      port.dataset.polarity='none';
    }

    /* ป้ายชื่อขาที่ CSS หยิบไปโชว์ตอนกำลังลาก/แตะค้าง (ดู .port.wire-from::after)
       เก็บเป็น data-label เพราะ title ของเบราว์เซอร์ขึ้นช้าและมือถือไม่ขึ้นเลย */
    port.dataset.label = dev.name + ' ' +
      (port.dataset.polarity === '+' ? '(+)' :
       port.dataset.polarity === '-' ? '(−)' :
       'ขา' + (THAI_POS[pos] || pos));

    /* .pressing ทันทีที่กด — บอกว่าโดนขานี้แล้ว ไม่ต้องรอปล่อยมือแล้วมาลุ้น */
    port.addEventListener('mousedown',onPortMouseDown);
    port.addEventListener('touchstart',onPortMouseDown,{passive:false});
    ['mouseup','mouseleave','touchend','touchcancel'].forEach(function(ev){
      port.addEventListener(ev, function(){ port.classList.remove('pressing'); });
    });
    el.appendChild(port);
  });

  /* ปุ่มคัดลอก — วางชิ้นใหม่ที่เหมือนกันทันที
     บนคอมใช้ Ctrl+C/Ctrl+V ก็ได้ แต่บนมือถือไม่มีแป้นพิมพ์ จึงต้องมีปุ่มจริง
     กดซ้ำ ๆ ได้เรื่อย ๆ ระยะห่างจะเท่ากันทุกชิ้น (ดู pasteItem) */
  var dup=document.createElement('span');
  dup.className='ws-item-dup';
  dup.innerHTML='&#x29C9;';                 /* ⧉ สองสี่เหลี่ยมซ้อน = คัดลอก */
  dup.title='คัดลอกอุปกรณ์ชิ้นนี้ (Ctrl+C แล้ว Ctrl+V)';
  bindBadgeTap(dup,function(){ duplicateItem(itemId); });
  el.appendChild(dup);

  /* สวิตช์ของจริงต้องสับเปิด-ปิดได้ ไม่ใช่ต่อแล้วไฟติดตลอด
     ป้าย ON/OFF เป็นตัวสับ แตะแล้ววงจรเปิด/ปิดจริง (ดู toggleSwitchItem) */
  if(deviceId==='switch'){
    var sw=document.createElement('span');
    sw.className='ws-switch-state';
    sw.textContent='ON';
    sw.title='แตะเพื่อสับสวิตช์ — เปิด/ปิดวงจร';
    bindBadgeTap(sw,function(){ toggleSwitchItem(itemId); });
    el.appendChild(sw);
  }

  /* ตัวต้านทาน: เลือกค่าความต้านทานได้เองในโหมดอิสระ
     โหมดด่านไม่ให้เปลี่ยน เพราะค่า 220Ω เป็นส่วนหนึ่งของโจทย์
     (ด่าน 4/5/7 ใช้เพดานความสว่างพิสูจน์ว่าตัวจำกัดกระแสทำงาน
      ถ้าเปลี่ยนค่าได้ เกณฑ์ผ่านจะเลื่อนตามจนโจทย์หมดความหมาย) */
  if(deviceId==='resistor'){
    var oh=document.createElement('span');
    oh.className='ws-ohm-state';
    /* ป้ายนี้แสดงแค่สัญลักษณ์ Ω ตัวเดียว ไม่ใส่ตัวเลข
       เพราะค่าจริงไปโชว์บนตัวโมเดลแล้ว (แถบสี + ตัวเลขบนตัวถัง)
       และถ้าใส่ตัวเลข ป้ายจะกว้างจนไปติดปุ่มคัดลอกที่อยู่กึ่งกลางขอบบน
       (กล่องอุปกรณ์กว้างแค่ 65px บนคอม / 68px บนมือถือ) */
    oh.textContent='Ω';
    oh.title='ค่าความต้านทาน '+fmtOhm(ESPEC.resistor.r)+' — แตะเพื่อเปลี่ยน';
    bindBadgeTap(oh,function(){ openOhmPicker(itemId); });
    el.appendChild(oh);
  }

  makeDraggable(el);
  document.getElementById('workspace').appendChild(el);
  var item={id:itemId,deviceId:deviceId,x:x,y:y,el:el,rotation:0,
            open:false,blown:false,           /* สถานะสวิตช์/ฟิวส์ */
            /* ความต้านทานของ "ชิ้นนี้" — เปลี่ยนได้เฉพาะตัวต้านทานในโหมดอิสระ
               null = ใช้ค่ากลางของชนิดนั้นตาม ESPEC (ดู itemSpec ใน js/devices.js) */
            ohms:(deviceId==='resistor' ? ESPEC.resistor.r : null),
            heat:0,stress:0,failed:false,failMode:null};   /* สถานะความเสียหาย */
  G.wsItems.push(item);

  /* ย้ายจุดขั้วไปอยู่ตำแหน่งขาจริงของอุปกรณ์ตัวนี้ (ดู PORT_ANCHORS ใน js/devices.js)
     ต้องทำหลังใส่ลง DOM แล้ว เพราะต้องอ่านขนาดกล่องจริง */
  layoutPorts(item);
  applyResistorBands(item);   /* แถบสีให้ตรงกับค่าความต้านทานตั้งต้น */

  /* จัดให้อยู่ในกรอบด้วยขนาดจริง แล้ว "เสียบขา" ลงรูเบรดบอร์ด */
  clampWsItem(item);
  bbSnapItem(item);
  bbRefresh();
  /* วางลงตรงที่ขาไปแตะขาของตัวอื่นพอดี = ต่อถึงกันทันที (ดู syncAutoJoins) */
  settleCircuit();

  /* มีอุปกรณ์บนแผงแล้ว ข้อความแนะนำต้องหลบไป
     (เดิมซ่อนอยู่ที่ตัวจัดการ drop เท่านั้น จึงค้างเวลาวางด้วยวิธีอื่น) */
  var hint = document.getElementById('workspace-hint');
  if(hint) hint.style.display = 'none';

  if(typeof onCircuitChanged === 'function') onCircuitChanged();
}

function removeWsItem(itemId){
  var _hit=null; G.wsItems.forEach(function(i){ if(i.id===itemId) _hit=i; });
  if(_hit && typeof pushHistory === 'function'){
    pushHistory('ลบ ' + DEVICES[_hit.deviceId].name);
  }
  var idx=-1;
  G.wsItems.forEach(function(item,i){if(item.id===itemId)idx=i;});
  if(idx<0) return;
  var item=G.wsItems[idx];

  /* ถ้ากำลังค้างการต่อสายจากจุดขั้วของอุปกรณ์ตัวนี้ ต้องยกเลิกก่อนลบ

     ไม่งั้น G.tapWireFrom จะชี้ไป DOM ที่หลุดออกจากหน้าไปแล้ว
     พอแตะจุดขั้วตัวถัดไป จะสร้างสายที่ปลายด้านหนึ่งอ่านตำแหน่งได้ (0,0)
     = สายพุ่งไปเกาะมุมซ้ายบนของพื้นที่ทำงาน และลบไม่ออกเพราะ
     อุปกรณ์ต้นทางถูกลบไปแล้ว ไม่มีอะไรมาเก็บกวาดสายเส้นนั้น */
  if((G.tapWireFrom && G.tapWireFrom.dataset.itemId===itemId) ||
     (G.drawingFrom && G.drawingFrom.itemId===itemId)){
    cancelTapConnect();
  }

  /* คลิปบอร์ดชี้ไปที่ชิ้นที่กำลังจะหายไป — ถอยไปอ้างต้นฉบับ หรือทิ้งไปเลย
     ถ้าปล่อยไว้ pasteItem() จะหาชิ้นอ้างอิงไม่เจอแล้วขึ้นข้อความว่าลบไปแล้ว
     ทั้งที่จริงยังมีต้นฉบับอยู่และวางต่อได้ */
  if(G.clip){
    if(G.clip.fromId === itemId){
      G.clip.fromId = G.clip.rootId;
      /* ต้นแบบที่ใช้วัดระยะหายไปด้วย ล้างทิ้งไม่ให้ learnPasteOffset
         ไปวัดจากตำแหน่งของของที่ไม่มีอยู่แล้ว (แต่ dx ที่เรียนไว้ยังใช้ได้) */
      G.clip.refX = null; G.clip.refY = null;
    }
    if(G.clip.rootId === itemId && G.clip.fromId === itemId) G.clip = null;
  }

  /* โหมดอิสระไม่จำกัดจำนวน จึงไม่ต้องคืนของเข้าคลัง */
  if(!invUnlimited()){
    G.invCounts[item.deviceId]=(G.invCounts[item.deviceId]||0)+1;
    updateInvCount(item.deviceId);
  }
  /* ข้ามเส้นเชื่อมในรางเบรดบอร์ด — พวกนี้ระบบสร้างเอง removeWire() ไม่ยอมลบ
     (จะขึ้นข้อความเตือนโดยไม่จำเป็น) ปล่อยให้ bbRefresh() ด้านล่างจัดการ */
  G.wires.filter(function(w){return !w.virtual && (w.fromItemId===itemId||w.toItemId===itemId);})
         .forEach(function(w){removeWire(w.id);});
  /* อุปกรณ์ที่กำลังถูกเลือกอยู่หายไป = ต้องเลิกเลือกและเก็บปุ่มลอยด้วย
     ไม่งั้นแถบ หมุน/ลบ บนมือถือยังลอยอยู่ ชี้ไปอุปกรณ์ที่ไม่มีแล้ว
     กดแล้วไม่เกิดอะไรขึ้น หรือไปโดนตัวอื่นที่ id ซ้ำกันภายหลัง */
  if(G.selectedIds && G.selectedIds.indexOf(itemId) >= 0){
    G.selectedIds = G.selectedIds.filter(function(id){ return id !== itemId; });
    if(G.selectedItemId === itemId){
      G.selectedItemId = G.selectedIds.length ? G.selectedIds[G.selectedIds.length-1] : null;
    }
    /* ชุดที่เลือกเหลือน้อยลง แถบคำสั่งรวมต้องอัปเดตจำนวนหรือหายไปเลย */
    if(G.selectedIds.length > 1) showMultiToolbar(G.selectedIds.length);
    else { hideMultiToolbar(); document.body.classList.remove('multi-select'); }
    if(!G.selectedIds.length) hideMobileToolbar();
  } else if(G.selectedItemId === itemId){
    G.selectedItemId = null;
    hideMobileToolbar();
  }

  item.el.remove();
  G.wsItems.splice(idx,1);
  pruneOrphanWires();   /* กันสายที่หลุดอ้างอิงเหลือค้างอยู่ */
  bbRefresh();          /* ถอดขาออกจากราง = เส้นเชื่อมในรางต้องหายตาม */
  /* ขาที่เคยแตะกับอุปกรณ์ตัวนี้ต้องขาดจากกันด้วย — pruneOrphanWires เก็บได้
     เฉพาะเส้นที่อ้างอุปกรณ์ที่หายไป ตัวนี้สร้างชุดใหม่จากของที่เหลืออยู่จริง */
  settleCircuit();
  if(G.wsItems.length===0) document.getElementById('workspace-hint').style.display='';
}

/* ปุ่ม "ล้างพื้นที่" ที่ผู้เล่นกดเอง — ต่างจาก clearWorkspace() ที่ระบบเรียก
   ตอนเปลี่ยนด่าน/เข้าออกโหมด ซึ่งไม่ควรย้อนกลับได้ (วงจรของด่านก่อนไม่เกี่ยวกัน)
   แยกออกมาเพื่อให้ "ล้างทั้งแผง" กู้คืนได้ด้วย Ctrl+Z ครั้งเดียว */
function clearWorkspaceByUser(){
  if(!G.wsItems.length){ showToast('พื้นที่ทำงานว่างอยู่แล้ว','error'); return; }
  var n = G.wsItems.length;
  historyStep('ล้างพื้นที่ (' + n + ' ชิ้น)', function(){ clearWorkspace(); });
  showToast('ล้างพื้นที่แล้ว — ' + undoHint(),'success');
}

function clearWorkspace(silent){
  stopCurrentFlow();
  if(!invUnlimited()){
    G.wsItems.forEach(function(item){G.invCounts[item.deviceId]=(G.invCounts[item.deviceId]||0)+1;});
  }
  cancelTapConnect();   /* ล้างการต่อสายที่ค้าง ไม่ให้ชี้ไป DOM ที่กำลังจะถูกลบ */
  /* สถานะความเสียหายต้องล้างด้วย ไม่งั้นแถบเตือน ("สายไฟไหม้" ฯลฯ) ค้างอยู่
     เหนือพื้นที่ว่างเปล่า และธงความร้อนเก่ายังนับต่อในด่านใหม่ */
  if(typeof resetHazards === 'function') resetHazards();
  if(typeof setHazardBar === 'function') setHazardBar('');
  hideMobileToolbar();   /* ปุ่มลอยของอุปกรณ์ที่กำลังจะหายไป ต้องหายตาม */
  if(typeof clearCircuitProblems === 'function') clearCircuitProblems();
  /* สายหายไปหมดแล้ว จุดยึดบนรูเบรดบอร์ดก็ไม่มีสายเสียบอยู่อีก */
  if(typeof bbClearAnchors === 'function') bbClearAnchors();
  G.wsItems=[]; G.wires=[]; G.wsCounter=0; G.wireCounter=0;
  G.selectedItemId=null; G.selectedIds=[];
  document.body.classList.remove('multi-select');
  if(typeof hideMultiToolbar === 'function') hideMultiToolbar();
  G.clip=null;   /* คลิปบอร์ดอ้างอิงชิ้นที่เพิ่งถูกล้างไป ต้องทิ้งไปพร้อมกัน */
  var ws=document.getElementById('workspace');

  /* ล้าง "เฉพาะอุปกรณ์ที่ผู้เล่นวาง" — คือทุกอย่างที่มีคลาส .ws-item เท่านั้น

     *** ของเดิมเป็นบัญชีขาว (KEEP) ของ id ที่ต้องเก็บไว้ ซึ่งพังเงียบ ***
     ทุกครั้งที่มีใครเพิ่มชิ้นส่วนถาวรลงใน #workspace แล้วลืมใส่ชื่อใน KEEP
     ชิ้นนั้นจะถูกลบทิ้งตอน clearWorkspace() ครั้งแรก (ซึ่งวิ่งตอนโหลดด่าน
     และตอนเข้าโหมดอิสระ) แล้วหายไปตลอดทั้งเซสชันโดยไม่มี error ฟ้องเลย
     เกิดกับ 3 อย่างรวดเดียว: ปุ่มย้อนกลับ/ทำซ้ำ (#history-bar)
     กรอบคุมดำ (#marquee) และแถบคำสั่งกลุ่ม (#multi-toolbar)

     กลับด้านเป็นบัญชีดำแทน: ลบสิ่งที่ฟังก์ชันนี้รับผิดชอบจริงอย่างเดียว
     ส่วนที่เหลือใน #workspace เป็นชิ้นส่วนถาวรจาก HTML หรือของที่ระบบอื่น
     ดูแลเอง (#bb-layer ของเบรดบอร์ด · #wire-svg ที่เก็บสายกับจุดไฟวิ่ง)
     เพิ่มชิ้นส่วนใหม่ทีหลังจึงไม่ทำให้พังอีก */
  Array.from(ws.children).forEach(function(ch){
    if(ch.classList && ch.classList.contains('ws-item')) ch.remove();
  });
  var svg=document.getElementById('wire-svg');
  Array.from(svg.children).forEach(function(ch){
    if(ch.id!=='wire-preview'&&ch.tagName!=='defs') ch.remove();
  });
  document.getElementById('workspace-hint').style.display='';
  bbRefresh();   /* ล้างไฮไลต์รางที่ค้างอยู่บนแผงด้วย */
  if(!silent) renderInventory();
}

/* เก็บกวาดของค้างทั้งหมดก่อนเริ่มโจทย์ใหม่ (ใช้ร่วมกันในโหมดวัดความเร็ว/โหมดอิสระ)

   ถ้าไม่ล้างให้ครบ ผู้เล่นจะเจอ: ฉากความเสียหายของรอบก่อนมาหักชีวิตในรอบใหม่,
   กล่องผลลัพธ์ของรอบก่อนบังจออยู่, และโหมดเครื่องวัดค้างจนต่อสายไม่ได้ */
function resetPlayfield(){
  if(typeof cancelHazardSequence === 'function') cancelHazardSequence();
  closeModal('modal-result');
  cancelTapConnect();
  if(G.probeMode) toggleProbeMode();
  stopCurrentFlow();
  deselectAll();
  clearWorkspace(true);
}

/* drag-to-move ws items */
/* ---- helpers: unified pointer coords ---- */
function getXY(e){ return e.touches ? {x:e.touches[0].clientX,y:e.touches[0].clientY} : {x:e.clientX,y:e.clientY}; }
function getUpXY(e){ return e.changedTouches ? {x:e.changedTouches[0].clientX,y:e.changedTouches[0].clientY} : {x:e.clientX,y:e.clientY}; }

function makeDraggable(el){
  function startDrag(e){
    /* แตะจุดขั้ว/ปุ่มลบ/ป้ายบนตัวอุปกรณ์ = ไม่ใช่การลากย้าย
       (ป้ายพวกนี้ stopPropagation ของตัวเองอยู่แล้ว นี่คือกันชนชั้นที่สอง
        เผื่อมีการเพิ่มป้ายใหม่แล้วลืมผูก bindBadgeTap) */
    if(e.target.classList.contains('port')||
       e.target.classList.contains('ws-item-delete')||
       e.target.classList.contains('ws-switch-state')||
       e.target.classList.contains('ws-ohm-state')||
       e.target.classList.contains('ws-item-dup')) return;
    if(e.cancelable) e.preventDefault();
    e.stopPropagation();

    /* ลากชิ้นที่อยู่ในชุดคุมดำอยู่แล้ว = ไม่ล้างชุด (ผู้เล่นยังตั้งใจสั่งทั้งกลุ่มอยู่)
       ลากชิ้นที่ไม่ได้เลือก = เปลี่ยนไปเลือกชิ้นนั้นชิ้นเดียวตามปกติ */
    if((G.selectedIds || []).indexOf(el.id) < 0) selectItem(el.id);

    var p0=getXY(e);
    var startL=parseInt(el.style.left)||0, startT=parseInt(el.style.top)||0;
    var inv=document.getElementById('inventory');
    var overInv=false;

    /* ถ่ายภาพวงจร "ก่อนลาก" ไว้ แต่ยังไม่บันทึกลงประวัติ
       เพราะตอนนี้ยังไม่รู้ว่าผู้เล่นจะย้ายจริงหรือแค่กดเลือก
       ถ้าบันทึกทุกครั้งที่กด การคลิกเลือกเฉย ๆ จะสร้างประวัติขยะเต็มไปหมด
       แล้ว Ctrl+Z จะกลายเป็นกดสิบครั้งก็ไม่มีอะไรเปลี่ยน */
    var histBefore = (typeof snapshotCircuit === 'function') ? snapshotCircuit() : null;

    /* จำว่านิ้วไหนเป็นคนเริ่มลาก
       ไม่งั้นถ้ามีนิ้วที่สองแตะแล้วปล่อย (เช่นเผลอเอามือแตะขอบจอ)
       touchend ของนิ้วนั้นจะวิ่งเข้า dragOnUp แล้วใช้พิกัดของนิ้วที่สอง
       ซึ่งมักอยู่นอกพื้นที่ทำงาน = อุปกรณ์ที่กำลังลากอยู่ถูกลบทิ้งทันที */
    var touchId = (e.touches && e.touches.length) ? e.touches[0].identifier : null;
    function ownTouch(list){
      if(touchId === null) return true;          /* เมาส์ ไม่ต้องเช็ค */
      if(!list) return false;
      for(var i=0;i<list.length;i++){ if(list[i].identifier === touchId) return true; }
      return false;
    }

    function dragOnMove(ev){
      if(ev.touches && !ownTouch(ev.touches)) return;
      if(ev.cancelable) ev.preventDefault();
      var p=getXY(ev);
      el.style.left=(startL+p.x-p0.x)+'px';
      el.style.top =(startT+p.y-p0.y)+'px';
      refreshWires(el.id);
      var r=inv.getBoundingClientRect();
      var now=(p.x>=r.left&&p.x<=r.right&&p.y>=r.top&&p.y<=r.bottom);
      if(now!==overInv){ overInv=now; inv.classList.toggle('return-hover',now); }
    }
    function dragOnUp(ev){
      if(ev.changedTouches && !ownTouch(ev.changedTouches)) return;
      inv.classList.remove('return-hover');
      var p=getUpXY(ev);
      var r=inv.getBoundingClientRect();
      var wsEl=document.getElementById('workspace');
      var wr=wsEl.getBoundingClientRect();

      /* คืนของเข้าคลังเมื่อ "ปล่อยบนคลัง" หรือ "ปล่อยนอกพื้นที่ทำงาน"
         สองเงื่อนไขนี้ชัดเจนไม่กำกวม จึงไม่ต้องเผื่อขอบรอบคลังอีก

         เดิมเผื่อขอบไว้ 28px ซึ่งใช้ไม่ได้บนมือถือ — เพราะคลังอยู่เป็นแถบ
         ใต้พื้นที่ทำงานติดกันพอดี ขอบที่เผื่อจะกินขึ้นมาในพื้นที่ทำงาน
         ทำให้วางอุปกรณ์ใกล้ขอบล่างแล้วถูกลบทิ้งโดยไม่ได้ตั้งใจ */
      var onInv    = (p.x>=r.left && p.x<=r.right && p.y>=r.top && p.y<=r.bottom);
      var outsideWs= (p.x<wr.left || p.x>wr.right || p.y<wr.top || p.y>wr.bottom);
      if(onInv || outsideWs){
        var itemId=el.id; deselectAll(); removeWsItem(itemId);
        showToast('คืนอุปกรณ์กลับคลัง — ' + undoHint(),'success');
      } else {
        var item=null;
        G.wsItems.forEach(function(i){if(i.id===el.id)item=i;});
        if(item){
          /* ย้ายจริงหรือแค่กดเลือก — ตัดสินตรงนี้ ตอนนี้รู้ตำแหน่งสุดท้ายแล้ว
             ขยับไม่ถึง 4px ถือว่าไม่ได้ย้าย ไม่ต้องเปลืองช่องประวัติ */
          var mx = Math.abs((parseInt(el.style.left)||0) - startL);
          var my = Math.abs((parseInt(el.style.top) ||0) - startT);
          if((mx + my) > 4 && typeof commitHistory === 'function'){
            commitHistory(histBefore, 'ย้าย ' + DEVICES[item.deviceId].name);
          }
          clampWsItem(item);
          /* ปล่อยนิ้ว/เมาส์ = "เสียบขาลงรู" ขาจะดีดเข้าหารูที่ใกล้ที่สุด
             เหมือนเสียบอุปกรณ์ลงแผงจริงที่ลงได้เฉพาะตำแหน่งรูเท่านั้น */
          bbSnapItem(item);
          bbRefresh();
          /* ลากชิ้นที่เพิ่งวางไปเอง = สอนระยะห่างให้การวางครั้งถัดไป
             ต้องอยู่หลัง bbSnapItem เพื่อให้ระยะที่จำเป็นระยะบนรูจริง */
          learnPasteOffset(item);
        }
        /* ตำแหน่งนิ่งแล้ว — เชื่อม/ตัดขาที่แตะกันตามตำแหน่งจริงรอบนี้
           แล้ววาดสายใหม่ทั้งหมด (settleCircuit อยู่ใน js/wires.js) */
        var joined = settleCircuit();
        if(joined) showToast('ขาแตะกัน ' + joined + ' จุด — ต่อถึงกันแล้วโดยไม่ต้องเดินสาย','success');
      }
      document.removeEventListener('mousemove',dragOnMove);
      document.removeEventListener('mouseup',dragOnUp);
      document.removeEventListener('touchmove',dragOnMove);
      document.removeEventListener('touchend',dragOnUp);
    }
    document.addEventListener('mousemove',dragOnMove,{passive:false});
    document.addEventListener('mouseup',dragOnUp);
    document.addEventListener('touchmove',dragOnMove,{passive:false});
    document.addEventListener('touchend',dragOnUp);
  }
  el.addEventListener('mousedown',startDrag);
  el.addEventListener('touchstart',startDrag,{passive:false});
}

/* ============================================================
   SWITCH — สับเปิด/ปิดวงจรได้จริง (เหมือนสวิตช์ไฟในบ้าน)
   สับเปิด = ตัดทางเดินไฟ ตัวแก้สมการจะได้กระแส 0 ทั้งวง
   ============================================================ */
function toggleSwitchItem(itemId){
  var item=null;
  G.wsItems.forEach(function(i){ if(i.id===itemId) item=i; });
  if(!item || item.deviceId!=='switch') return;

  /* ตัดไฟขดลวดกะทันหัน = จังหวะที่เกิดแรงดันย้อนกลับ (Back-EMF)
     ต้องตรวจ "ก่อน" สับออก เพราะต้องรู้ว่ากระแสกำลังไหลอยู่เท่าไร */
  if(typeof pushHistory === 'function'){
    pushHistory('สับสวิตช์เป็น ' + (item.open ? 'ON' : 'OFF'));
  }

  var emf = null;
  if(!item.open && typeof checkBackEMF === 'function') emf = checkBackEMF(item);

  item.open = !item.open;
  var badge = item.el.querySelector('.ws-switch-state');
  if(badge) badge.textContent = item.open ? 'OFF' : 'ON';
  item.el.classList.toggle('switch-open', !!item.open);

  if(emf){
    applyHazardVisuals();
    if(item.el) item.el.classList.add('arcing');
    setTimeout(function(){ if(item.el) item.el.classList.remove('arcing'); }, 700);
    showToast(emf.titleTh, 'error');
    if(typeof showIncidentModal === 'function') showIncidentModal([emf]);
  } else {
    showToast(item.open ? 'สับสวิตช์ OFF — วงจรขาด ไฟไม่ไหล'
                        : 'สับสวิตช์ ON — วงจรครบ ไฟไหลได้',
              item.open ? '' : 'success');
  }

  /* กำลังจ่ายไฟอยู่ → คิดวงจรใหม่ทันทีให้เห็นผลเดี๋ยวนั้น */
  if(PowerSim.on) powerStep(0.02);

  /* ตัดไฟแล้วตัวเก็บประจุยังมีไฟค้าง — เตือนเรื่องความปลอดภัย */
  if(item.open && typeof storedChargeWarning === 'function'){
    var sc = storedChargeWarning();
    if(sc) showToast(sc.titleTh + ' ' + sc.measuredTh, 'error');
  }

  if(typeof onCircuitChanged === 'function') onCircuitChanged();
}

/* ============================================================
   ค่าความต้านทานของตัวต้านทานแต่ละชิ้น (โหมดอิสระ)

   เลือกได้เฉพาะค่าในอนุกรม E12 ที่มีขายจริง (ดู RESISTOR_OHMS ใน js/devices.js)
   ไม่ให้พิมพ์เลขเอง เพราะจะได้ค่าที่ไม่มีในโลกจริงอย่าง 137Ω
   ============================================================ */
var _ohmTargetId = null;

function findWsItem(itemId){
  var found = null;
  G.wsItems.forEach(function(i){ if(i.id === itemId) found = i; });
  return found;
}

function openOhmPicker(itemId){
  var item = findWsItem(itemId);
  if(!item || item.deviceId !== 'resistor') return;
  if(!G.sandbox){
    showToast('เปลี่ยนค่าตัวต้านทานได้ในโหมดอิสระเท่านั้น','error');
    return;
  }
  _ohmTargetId = itemId;

  var cur = item.ohms || ESPEC.resistor.r;
  var grid = document.getElementById('ohm-grid');
  grid.innerHTML = '';
  RESISTOR_OHMS.forEach(function(v){
    var b = document.createElement('button');
    b.className = 'ohm-opt' + (v === cur ? ' active' : '');
    /* โชว์แถบรหัสสีคู่กับตัวเลขทุกปุ่ม — ผู้เรียนจะได้เห็นว่าค่าไหนให้สีอะไร
       ก่อนกดเลือก แล้วค่อยไปเทียบกับแถบบนตัวถังที่เปลี่ยนตามจริง */
    b.innerHTML = '<span class="ohm-val">' + fmtOhm(v) + '</span>' +
                  '<span class="ohm-bands">' +
                  ohmBands(v).map(function(c){
                    return '<i style="background:' + c + '"></i>';
                  }).join('') + '</span>';
    b.onclick = function(){ setItemOhms(_ohmTargetId, v); closeModal('modal-ohm'); };
    grid.appendChild(b);
  });

  /* บอกผลที่จะเกิดจริงกับวงจรที่ต่ออยู่ ไม่ใช่แค่โชว์ตัวเลขเฉย ๆ */
  var note = document.getElementById('ohm-note');
  note.innerHTML = 'ค่าปัจจุบัน <b>' + fmtOhm(cur) + '</b> · พิกัดกำลัง ' +
                   ESPEC.resistor.pmax + 'W<br>' +
                   'ค่ามาก = กระแสน้อย อุปกรณ์หรี่ลงแต่ปลอดภัยขึ้น · ' +
                   'ค่าน้อย = กระแสมาก สว่างขึ้นแต่เสี่ยงไหม้';
  openModal('modal-ohm');
}

/* วาดแถบรหัสสีและตัวเลขบนตัวถังให้ตรงกับค่าความต้านทานของชิ้นนั้น

   ทำได้เพราะรูปอุปกรณ์ถูกฝังเป็นโหนดจริงในหน้า (ดู makeSvgIconInline ใน js/ui.js)
   ถ้ายังใช้ <use> อยู่ จะแก้สีแถบทีละชิ้นไม่ได้เลย เพราะรูปทุกชิ้น
   อ้างไปที่ symbol ก้อนเดียวกัน แก้ที่หนึ่งจะเปลี่ยนหมดทุกตัวบนแผง */
function applyResistorBands(item){
  if(!item || item.deviceId !== 'resistor' || !item.el) return;
  var v = item.ohms || ESPEC.resistor.r;
  var band = ohmBands(v);
  for(var i = 0; i < 3; i++){
    var b = item.el.querySelector('.res-band' + (i + 1));
    if(b) b.setAttribute('fill', band[i]);
  }
  var lbl = item.el.querySelector('.res-label');
  if(lbl) lbl.textContent = fmtOhm(v);
  var badge = item.el.querySelector('.ws-ohm-state');
  if(badge) badge.title = 'ค่าความต้านทาน ' + fmtOhm(v) + ' — แตะเพื่อเปลี่ยน';
}

function setItemOhms(itemId, v){
  var item = findWsItem(itemId);
  if(!item) return;
  if(typeof pushHistory === 'function') pushHistory('เปลี่ยนค่าตัวต้านทานเป็น ' + fmtOhm(v));
  item.ohms = v;
  applyResistorBands(item);
  showToast('ตั้งค่าตัวต้านทานเป็น ' + fmtOhm(v) + ' — แถบสีบนตัวถังเปลี่ยนตามแล้ว', 'success');

  /* กำลังจ่ายไฟอยู่ → เห็นผลเดี๋ยวนั้น เหมือนเปลี่ยนตัวต้านทานคาไฟ */
  if(PowerSim.on) powerStep(0.02);
  if(typeof onCircuitChanged === 'function') onCircuitChanged();
}

/* ============================================================
   COPY / PASTE อุปกรณ์

   ระยะห่างของชิ้นที่วางเป็น "ระยะที่เรียนรู้มา": วางชิ้นแรกแล้วลากไปวางที่
   ต้องการเอง ระบบจำระยะนั้นไว้ แล้วชิ้นถัด ๆ ไปจะวางห่างเท่ากันทุกชิ้น
   เรียงถ่าน 4 ก้อนเป็นแถวจึงทำได้ด้วยการลากมือหนึ่งครั้ง แล้วกดวางซ้ำ

   *** ระยะที่จำ วัดจาก "ตัวต้นแบบ" ไปถึงจุดที่ปล่อยมือ ***
   ไม่ใช่วัดจากจุดที่ระบบวางชิ้นใหม่ให้ตอนแรก

   ต่างกันจริง: ต้นแบบอยู่ (100,100) ระบบวางชิ้นใหม่ให้ที่ (179,100)
   ผู้เล่นลากไปปล่อยที่ (100,220)
     วัดจากจุดเกิด  → (−79, +120)  = ระยะที่ "แก้ตำแหน่ง" ไม่ใช่ระยะห่างจริง
     วัดจากต้นแบบ   → (  0, +120)  = ระยะห่างจริงที่ผู้เล่นต้องการ ✓
   ชิ้นถัดไปจึงต้องเรียงลงล่างห่าง 120 ไม่ใช่เยื้องซ้าย 79 ลง 120

   refX/refY = ตำแหน่งของตัวต้นแบบที่ใช้อ้างอิงในการวางรอบนั้น
   ============================================================ */
function copyItem(itemId, silent){
  var item = findWsItem(itemId || G.selectedItemId);
  if(!item){ showToast('เลือกอุปกรณ์ที่จะคัดลอกก่อน','error'); return false; }
  G.clip = {
    deviceId: item.deviceId,
    rotation: item.rotation || 0,
    ohms: item.ohms,
    open: !!item.open,
    rootId: item.id,            /* ต้นฉบับ — กดปุ่ม ⧉ ที่ตัวนี้ซ้ำ = ต่อแถวเดิม */
    fromId: item.id,            /* ชิ้นอ้างอิงของการวางครั้งถัดไป */
    refX: null, refY: null,     /* ตำแหน่ง "ตัวต้นแบบ" ของการวางรอบล่าสุด */
    dx: null, dy: null          /* ระยะห่างที่เรียนรู้มาแล้ว (วัดจากต้นแบบ) */
  };
  if(!silent){
    showToast('คัดลอก ' + DEVICES[item.deviceId].name + ' แล้ว — กด Ctrl+V เพื่อวาง', 'success');
  }
  return true;
}

function pasteItem(){
  var c = G.clip;
  if(!c){ showToast('ยังไม่ได้คัดลอกอะไร (เลือกอุปกรณ์แล้วกด Ctrl+C)','error'); return; }
  if(invSoldOut(c.deviceId)) return;

  /* อ้างจากชิ้นที่วางล่าสุด ถ้าถูกลบไปแล้วก็ถอยไปใช้ต้นฉบับ */
  var ref = findWsItem(c.fromId) || findWsItem(c.rootId);
  if(!ref){
    showToast('อุปกรณ์ต้นแบบถูกลบไปแล้ว — เลือกชิ้นใหม่แล้วกด Ctrl+C','error');
    G.clip = null;
    return;
  }

  var nx, ny;
  if(c.dx !== null && c.dx !== undefined){
    /* เคยสอนระยะไว้แล้ว = ก้าวต่อด้วยระยะเดิมทุกครั้ง เรียงเป็นแถวสม่ำเสมอ */
    nx = (ref.x || 0) + c.dx;
    ny = (ref.y || 0) + c.dy;
  } else {
    /* ยังไม่เคยสอนระยะ = วาง "ข้าง ๆ" ตัวเดิม ไม่ใช่เฉียงทับกัน

       ของเดิมเยื้องเฉียงลงขวา 1.5 ช่อง (~30px) ซึ่งน้อยกว่าครึ่งของกล่อง 65px
       ชิ้นใหม่จึงไปนอนทับตัวเดิมเกือบทั้งใบ มองไม่ออกว่ามีสองชิ้น

       ก้าวเป็นจำนวนช่องเต็มของเบรดบอร์ด ขาจะลงรูพอดีไม่ต้องขยับแก้
       และเว้นช่องว่างให้เห็นชัดว่าเป็นของสองชิ้น */
    var bw  = (ref.el && ref.el.offsetWidth)  || 65;
    var bh  = (ref.el && ref.el.offsetHeight) || 65;
    var U   = portUnit();
    var stepX = Math.ceil((bw + 6) / U) * U;

    nx = (ref.x || 0) + stepX;
    ny = (ref.y || 0);

    /* ชนขอบขวาแล้วขึ้นแถวใหม่ ไม่ใช่ไปกองเบียดอยู่ริมขอบ
       (clampWsItem จะดึงกลับให้อยู่ในกรอบ แต่มันดึงมากองทับกันที่ขอบเดียว) */
    var wsEl = document.getElementById('workspace');
    var maxX = (wsEl ? wsEl.clientWidth : 640) - bw - 6;
    if(nx > maxX){
      nx = 6;
      ny = (ref.y || 0) + Math.ceil((bh + 6) / U) * U;
    }
  }

  addWsItem(c.deviceId, nx, ny);
  consumeInvItem(c.deviceId);

  var made = G.wsItems[G.wsItems.length - 1];
  if(!made) return;

  /* คืนสภาพของต้นฉบับให้ครบ: มุมหมุน ค่าความต้านทาน และสถานะสวิตช์ */
  if(c.ohms != null) setItemOhmsQuiet(made, c.ohms);
  if(c.rotation){
    made.rotation = 0;
    for(var k = 0; k < (c.rotation / 90); k++) rotateItem(made.id, true);
  }
  /* ตั้งสถานะสวิตช์ตรง ๆ ไม่เรียก toggleSwitchItem
     ตัวนั้นจะไปตรวจแรงดันย้อนกลับและขึ้นข้อความ ทั้งที่นี่แค่ก๊อปปี้ของ */
  if(c.open && made.deviceId === 'switch'){
    made.open = true;
    var swb = made.el.querySelector('.ws-switch-state');
    if(swb) swb.textContent = 'OFF';
    made.el.classList.add('switch-open');
  }

  /* ชิ้นที่วางใหม่กลายเป็นตัวอ้างอิงของครั้งถัดไป
     และจำ "ตำแหน่งของต้นแบบที่ใช้อ้างอิงรอบนี้" ไว้ (ref ไม่ใช่ made)
     ถ้าผู้เล่นลากชิ้นใหม่ไปไหน ระยะที่เรียนรู้ = ต้นแบบ → จุดที่ปล่อยมือ
     ซึ่งคือระยะห่างจริงที่ผู้เล่นต้องการ ไม่ใช่ระยะที่ลากออกจากจุดเกิด */
  c.fromId = made.id;
  c.refX = (ref.x || 0); c.refY = (ref.y || 0);
  selectItem(made.id);

  showToast('วาง ' + DEVICES[c.deviceId].name +
            (c.dx === null ? ' — ลากไปวางที่ต้องการ แล้วกดวางอีกครั้งจะห่างเท่ากัน' : ''),
            'success');
}

/* ตั้งค่าความต้านทานแบบไม่ขึ้น toast (ใช้ตอนคัดลอก ไม่ใช่ผู้เล่นสั่งเอง) */
function setItemOhmsQuiet(item, v){
  item.ohms = v;
  applyResistorBands(item);
}

/* ผู้เล่นลากชิ้นที่เพิ่งวางไปเอง = กำลังบอกว่า "อยากให้ห่างจากตัวก่อนหน้าเท่านี้"
   เรียกจาก dragOnUp ใน makeDraggable หลังขาลงรูเบรดบอร์ดแล้ว

   วัดจาก refX/refY = ตำแหน่งของ "ตัวต้นแบบ" ที่ใช้อ้างอิงตอนวางชิ้นนี้
   ไม่ใช่จากจุดที่ระบบวางชิ้นนี้ให้ — ระยะที่ได้จึงเป็นระยะห่างระหว่าง
   อุปกรณ์สองชิ้นจริง ๆ ซึ่งเอาไปวางชิ้นถัดไปต่อแถวได้ตรงตามที่ตั้งใจ

   ไม่อัปเดต refX/refY ที่นี่ — ค่าถัดไปจะถูกตั้งใหม่ใน pasteItem()
   จากตำแหน่งของตัวอ้างอิงรอบนั้น */
function learnPasteOffset(item){
  var c = G.clip;
  if(!c || !item || c.fromId !== item.id) return;
  if(c.refX === null || c.refX === undefined) return;
  var dx = item.x - c.refX, dy = item.y - c.refY;
  if(Math.abs(dx) + Math.abs(dy) < 6) return;   /* ขยับจิ๊ดเดียว ไม่นับ */
  c.dx = dx; c.dy = dy;
}

/* ปุ่ม ⧉ บนตัวอุปกรณ์ = คัดลอกแล้ววางในจังหวะเดียว

   กดที่ต้นฉบับรัว ๆ ได้ ของจะเรียงต่อแถวเดิมไปเรื่อย ๆ เพราะการวางครั้งที่ 2
   ขึ้นไปอ้างจากชิ้นที่เพิ่งวาง ไม่ใช่ต้นฉบับ (ไม่งั้นทุกชิ้นจะไปกองทับกันที่เดิม) */
function duplicateItem(itemId){
  var c = G.clip;
  var sameChain = c && (c.rootId === itemId || c.fromId === itemId) &&
                  (findWsItem(c.fromId) || findWsItem(c.rootId));
  if(sameChain){
    /* อ่านค่าจากชิ้นที่กดตอนนี้อีกครั้ง — ผู้เล่นอาจหมุนหรือเปลี่ยนค่าโอห์ม
       หลังจากคัดลอกไปแล้ว ชิ้นถัดไปต้องเหมือนของจริง ไม่ใช่เหมือนตอนกดครั้งแรก */
    var src = findWsItem(itemId);
    if(src){ c.rotation = src.rotation || 0; c.ohms = src.ohms; c.open = !!src.open; }
    pasteItem();
    return;
  }
  if(copyItem(itemId, true)) pasteItem();
}

/* มีสวิตช์ตัวไหนสับเปิดค้างอยู่ไหม (ใช้เตือนก่อนตรวจวงจร) */
function hasOpenSwitch(){
  var found=false;
  G.wsItems.forEach(function(it){ if(it.deviceId==='switch' && it.open) found=true; });
  return found;
}

/* ============================================================
   SELECT / DESELECT ITEM
   ============================================================ */
/* ตั้งชุดที่เลือกใหม่ทั้งชุด — ทางเดินเดียวของการเลือกทุกแบบ

   G.selectedIds  = ทุกชิ้นที่เลือกอยู่ (คุมดำได้หลายชิ้น)
   G.selectedItemId = ตัวล่าสุดในชุด เก็บไว้ให้ของเดิมที่ทำงานกับชิ้นเดียว
                      ใช้ต่อได้ไม่ต้องแก้ (คีย์ S สับสวิตช์ · คัดลอก · เครื่องวัด)  */
function setSelection(ids){
  /* ถอดไฮไลต์ของชุดเดิมก่อน แล้วค่อยใส่ชุดใหม่ — เรียกซ้ำได้ปลอดภัย */
  document.querySelectorAll('.ws-item.selected').forEach(function(el){
    el.classList.remove('selected');
  });

  var alive = [];
  (ids || []).forEach(function(id){
    var el = document.getElementById(id);
    if(el && findWsItem(id)){ el.classList.add('selected'); alive.push(id); }
  });

  G.selectedIds    = alive;
  G.selectedItemId = alive.length ? alive[alive.length - 1] : null;

  /* เลือกหลายชิ้น = ซ่อนป้ายใบ้ "R หมุน" ที่ลอยใต้ทุกกล่อง ไม่งั้นรกจนอ่านไม่ออก
     แล้วใช้แถบคำสั่งรวมแทน (บอกจำนวนที่เลือกไว้ด้วย) */
  document.body.classList.toggle('multi-select', alive.length > 1);

  if(alive.length > 1){
    hideMobileToolbar();
    showMultiToolbar(alive.length);
  } else {
    hideMultiToolbar();
    if(alive.length === 1 && 'ontouchstart' in window){
      showMobileToolbar(document.getElementById(alive[0]));
    } else if(!alive.length){
      hideMobileToolbar();
    }
  }
}

function selectItem(itemId){ setSelection([itemId]); }

function deselectAll(){ setSelection([]); }

/* ============================================================
   แถบคำสั่งของกลุ่มที่เลือก — ลอยกลางขอบล่างของพื้นที่ทำงาน

   ไม่เกาะตัวอุปกรณ์เหมือนแถบของชิ้นเดียว เพราะกลุ่มที่เลือกกระจายอยู่หลายที่
   ไม่มี "ตัวเดียว" ให้เกาะ และถ้าไปเกาะตัวใดตัวหนึ่งจะดูเหมือนสั่งแค่ตัวนั้น
   ============================================================ */
function showMultiToolbar(n){
  var tb = document.getElementById('multi-toolbar');
  if(!tb) return;
  var c = document.getElementById('multi-count');
  if(c) c.textContent = 'เลือกไว้ ' + n + ' ชิ้น';
  tb.style.display = 'flex';
}
function hideMultiToolbar(){
  var tb = document.getElementById('multi-toolbar');
  if(tb) tb.style.display = 'none';
}

/* ============================================================
   หมุน / ลบ "ทั้งกลุ่ม"

   ทำทีเดียวทั้งชุดแล้วสรุปข้อความครั้งเดียว ไม่ใช่ยิง toast ต่อชิ้น
   (ลบ 8 ชิ้นแล้วได้ข้อความ 8 อันทับกันคือสิ่งที่ไม่มีใครอยากเห็น)
   ============================================================ */
function rotateSelection(){
  var ids = (G.selectedIds || []).slice();
  if(!ids.length){ showToast('ลากกรอบคุมดำเลือกอุปกรณ์ก่อน หรือคลิกเลือกทีละชิ้น','error'); return; }
  if(ids.length === 1){ rotateItem(ids[0]); return; }
  /* นับเป็นก้าวเดียวในประวัติ — กด Ctrl+Z ครั้งเดียวคืนทั้งกลุ่ม
     ไม่ใช่ต้องกดเท่าจำนวนชิ้นที่หมุน (ดู historyStep ใน js/history.js) */
  historyStep('หมุน ' + ids.length + ' ชิ้น', function(){
    ids.forEach(function(id){ rotateItem(id, true); });   /* quiet = ไม่ขึ้นข้อความต่อชิ้น */
  });
  showToast('หมุน ' + ids.length + ' ชิ้น 90°','success');
}

function deleteSelection(){
  var ids = (G.selectedIds || []).slice();
  if(!ids.length){ showToast('ลากกรอบคุมดำเลือกอุปกรณ์ก่อน หรือคลิกเลือกทีละชิ้น','error'); return; }
  /* ต้องล้างชุดที่เลือกก่อนลบ ไม่ใช่ลบแล้วค่อยล้าง
     เพราะ removeWsItem() จะไปล้าง selection ให้เองตอนเจอชิ้นที่กำลังถูกเลือก
     ทำให้ ids ที่เหลือถูกทิ้งกลางทาง ลบไม่ครบ */
  var n = ids.length;
  setSelection([]);
  /* ก้าวเดียวในประวัติ — นี่คือเหตุผลหลักที่ต้องมี Undo ตั้งแต่แรก
     กด Del ครั้งเดียวลบได้หลายสิบชิ้นพร้อมสายทั้งหมด ต้องกู้คืนได้ด้วยครั้งเดียว */
  historyStep(n > 1 ? ('ลบ ' + n + ' ชิ้น') : 'ลบอุปกรณ์', function(){
    ids.forEach(function(id){ removeWsItem(id); });
  });
  showToast((n > 1 ? ('ลบ ' + n + ' ชิ้นแล้ว') : 'ลบอุปกรณ์แล้ว') + ' — ' + undoHint(),'success');
}

/* เลือกทุกชิ้นบนแผง (Ctrl+A) */
function selectAllItems(){
  var ids = G.wsItems.map(function(it){ return it.id; });
  if(!ids.length){ showToast('ยังไม่มีอุปกรณ์ในพื้นที่ทำงาน','error'); return; }
  setSelection(ids);
  showToast('เลือกทั้งหมด ' + ids.length + ' ชิ้น','success');
}

/* ============================================================
   MARQUEE — ลากกรอบ "คุมดำ" บนพื้นที่ว่างเพื่อเลือกหลายชิ้น

   เริ่มได้เฉพาะตอนกดลงบน "พื้นว่าง" จริง ๆ
   ถ้ากดบนอุปกรณ์ = ลากย้าย · บนขา = ต่อสาย · บนสาย = ลบสาย
   จึงต้องเช็ค e.target ก่อน ไม่ใช่เช็คแค่ว่า currentTarget เป็น #workspace
   (สายไฟกับแผงเบรดบอร์ดเป็นลูกของ #workspace อีเวนต์ลอยขึ้นมาถึงเสมอ)

   ลากน้อยกว่า 6px ถือว่าเป็นการ "คลิกที่พื้นว่าง" = เลิกเลือกทั้งหมด
   ============================================================ */
var MARQUEE_SKIP = '.ws-item,.port,.wire-path,#mobile-toolbar,#multi-toolbar,' +
                   '#history-bar,#hazard-bar,#probe-display,#polarity-picker,#workspace-hint';

function marqueeXY(e, wsRect){
  var p = e.touches ? e.touches[0] : (e.changedTouches ? e.changedTouches[0] : e);
  return { x: p.clientX - wsRect.left, y: p.clientY - wsRect.top };
}

function startMarquee(e){
  if(G.probeMode) return;                 /* โหมดเครื่องวัดใช้จิ้มอ่านค่า ไม่ใช่เลือกของ */
  if(G.tapWireFrom || G.drawingFrom) return;   /* กำลังค้างต่อสายอยู่ */
  if(e.target && e.target.closest && e.target.closest(MARQUEE_SKIP)) return;

  /* กดลงตรง "รูเบรดบอร์ด" พอดี = เริ่มเสียบสายจากรูนั้น ไม่ใช่ลากกรอบคุมดำ

     แผงเบรดบอร์ด (#bb-layer) เป็น pointer-events:none อีเวนต์จึงมาถึง
     #workspace ตรงนี้เสมอ ต้องแปลงพิกัดเป็นรูที่ใกล้ที่สุดเอง
     กดห่างจากรู = ลากกรอบตามปกติ กฎจึงเรียนรู้ได้ง่าย: ตรงรู=สาย, นอกรู=คุมดำ */
  if(typeof bbAnchorAtClient === 'function'){
    var pt = e.touches ? e.touches[0] : e;
    var anchor = bbAnchorAtClient(pt.clientX, pt.clientY);
    if(anchor){
      if(e.cancelable) e.preventDefault();
      anchor.classList.add('pressing');
      beginWireFrom(anchor, e.type === 'touchstart');
      return;
    }
  }

  var wsEl = document.getElementById('workspace');
  var box  = document.getElementById('marquee');
  if(!wsEl || !box) return;

  var wsRect = wsEl.getBoundingClientRect();
  var p0 = marqueeXY(e, wsRect);
  var moved = false;
  /* กดค้างพร้อมปุ่ม Shift/Ctrl = เพิ่มเข้าชุดเดิม ไม่ใช่เริ่มเลือกใหม่ */
  var addTo = (e.shiftKey || e.ctrlKey || e.metaKey) ? (G.selectedIds || []).slice() : [];

  function draw(ev){
    var p = marqueeXY(ev, wsRect);
    var w = Math.abs(p.x - p0.x), h = Math.abs(p.y - p0.y);
    if(!moved && (w + h) < 6) return;     /* ยังนิ่งอยู่ ยังไม่ต้องวาดกรอบ */
    if(!moved){ moved = true; box.style.display = 'block'; }
    if(ev.cancelable) ev.preventDefault();
    box.style.left   = Math.min(p.x, p0.x) + 'px';
    box.style.top    = Math.min(p.y, p0.y) + 'px';
    box.style.width  = w + 'px';
    box.style.height = h + 'px';
  }

  function finish(ev){
    document.removeEventListener('mousemove', draw);
    document.removeEventListener('mouseup', finish);
    document.removeEventListener('touchmove', draw);
    document.removeEventListener('touchend', finish);
    box.style.display = 'none';

    if(!moved){ setSelection(addTo); return; }   /* คลิกพื้นว่าง = เลิกเลือก */

    /* บอกตัวจัดการ click ของ #workspace ว่า "อีเวนต์ถัดไปมาจากการลากกรอบ"
       ไม่ใช่การคลิกพื้นว่าง — ไม่งั้นมันจะ deselectAll() ล้างสิ่งที่เพิ่งเลือก
       ทิ้งทันที (ดูคำอธิบายเต็มที่ตัวจัดการนั้นใน js/game.js)
       ธงถูกล้างโดยตัวจัดการ click เอง และมี setTimeout กันค้างเผื่อ
       เบราว์เซอร์ไม่ยิง click ตามมา (เช่นลากออกไปปล่อยนอกพื้นที่ทำงาน) */
    G._marqueeDidSelect = true;
    setTimeout(function(){ G._marqueeDidSelect = false; }, 0);

    var p = marqueeXY(ev, wsRect);
    var x1 = Math.min(p.x, p0.x), x2 = Math.max(p.x, p0.x);
    var y1 = Math.min(p.y, p0.y), y2 = Math.max(p.y, p0.y);

    /* "แตะกรอบ" ก็นับ ไม่ต้องคลุมทั้งกล่อง — เลือกของที่วางชิดกันจะง่ายกว่ามาก */
    var hit = addTo.slice();
    G.wsItems.forEach(function(it){
      if(!it.el) return;
      var r = it.el.getBoundingClientRect();
      var ix1 = r.left - wsRect.left, iy1 = r.top    - wsRect.top;
      var ix2 = r.right - wsRect.left, iy2 = r.bottom - wsRect.top;
      if(ix2 < x1 || ix1 > x2 || iy2 < y1 || iy1 > y2) return;
      if(hit.indexOf(it.id) < 0) hit.push(it.id);
    });

    setSelection(hit);
    if(hit.length) showToast('เลือกไว้ ' + hit.length + ' ชิ้น — R หมุนทั้งหมด · Del ลบทั้งหมด','success');
  }

  document.addEventListener('mousemove', draw, {passive:false});
  document.addEventListener('mouseup', finish);
  document.addEventListener('touchmove', draw, {passive:false});
  document.addEventListener('touchend', finish);
}

/* ผูกไว้ที่ #workspace ครั้งเดียวตอนโหลด — ตัวพื้นที่ทำงานไม่ถูกสร้างใหม่
   เช็ค readyState ด้วย เพราะสคริปต์อยู่ท้าย body: ถ้าไฟล์ถูกโหลดช้ากว่าปกติ
   DOMContentLoaded อาจยิงไปแล้ว แล้วตัวจัดการนี้จะไม่ถูกผูกเลย */
function bindMarquee(){
  var ws = document.getElementById('workspace');
  if(!ws || ws.dataset.marqueeBound) return;
  ws.dataset.marqueeBound = '1';
  ws.addEventListener('mousedown', startMarquee);
  ws.addEventListener('touchstart', startMarquee, {passive:false});
}
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindMarquee);
else bindMarquee();

function showMobileToolbar(itemEl){
  var tb=document.getElementById('mobile-toolbar');
  if(!tb) return;
  var ws=document.getElementById('workspace');
  var wsRect=ws.getBoundingClientRect();
  var elRect=itemEl.getBoundingClientRect();
  /* +30 เผื่อชื่ออุปกรณ์ + จุด port-bottom ที่ลอยใต้กล่อง (absolute) */
  var top=(elRect.bottom - wsRect.top + 30);
  var left=Math.max(0, elRect.left - wsRect.left);

  /* ต้องดึงกลับให้อยู่ในกรอบ #workspace ซึ่งเป็น overflow:hidden
     อุปกรณ์ที่อยู่ริมขวาหรือริมล่างจะทำให้แถบปุ่มถูกตัดหายไปทั้งแถบ
     ผู้เล่นบนมือถือจึงหมุน/ลบอุปกรณ์ตัวนั้นไม่ได้เลย */
  tb.style.display='flex';
  tb.style.left='0px'; tb.style.top='0px';
  var tw=tb.offsetWidth || 120, th=tb.offsetHeight || 34;
  left = Math.min(left, Math.max(0, ws.clientWidth  - tw - 4));
  top  = Math.min(top,  Math.max(0, ws.clientHeight - th - 4));

  tb.style.top=top+'px';
  tb.style.left=left+'px';
}
function hideMobileToolbar(){
  var tb=document.getElementById('mobile-toolbar');
  if(tb) tb.style.display='none';
}

/* ============================================================
   ROTATE ITEM — หมุน 90° CW ต่อครั้ง (0→90→180→270→0)
   - หมุน SVG icon ด้วย CSS transform
   - ย้าย class port-* ให้ตรงทิศใหม่
   - refresh สายไฟที่เชื่อมกับ item
   ============================================================ */
/* quiet = ไม่ขึ้นข้อความแจ้ง ใช้ตอนระบบหมุนให้เอง (คัดลอกอุปกรณ์ที่หมุนไว้แล้ว)
   ไม่ใช่ตอนผู้เล่นสั่งหมุนเอง ซึ่งควรได้ข้อความยืนยันว่ากดติด */
function rotateItem(itemId, quiet){
  var item = null;
  G.wsItems.forEach(function(i){ if(i.id===itemId) item=i; });
  if(!item) return;
  /* ข้ามเองเมื่ออยู่ในคำสั่งกลุ่ม/กำลังกู้คืน (ดู pushHistory) */
  if(typeof pushHistory === 'function') pushHistory('หมุน ' + DEVICES[item.deviceId].name);

  item.rotation = ((item.rotation||0) + 90) % 360;
  var deg = item.rotation;

  /* หมุนภาพ SVG */
  var iconWrap = item.el.querySelector('.ws-item-svg');
  if(iconWrap) iconWrap.style.transform = 'rotate('+deg+'deg)';

  /* หมุนจุดขั้วตามภาพ
     layoutPorts() คำนวณจาก "ตำแหน่งขาตั้งต้น" ของอุปกรณ์ + มุมปัจจุบันเสมอ
     ไม่ได้หมุนต่อจากตำแหน่งเดิม ค่าจึงไม่เพี้ยนสะสมแม้หมุนหลายรอบ
     (ดู rotatePortAnchor ใน js/devices.js — ตามเข็ม 90° คือ (x,y) → (−y,x))

     ขาที่อยู่ก้นตัวถังจึงหมุนไปอยู่ข้างอย่างถูกต้อง เช่นหมุนหลอดไฟ 90°
     ขั้วที่ก้นจะไปอยู่ด้านซ้ายของกล่อง ไม่ใช่เด้งกลับไปขอบซ้าย-ขวาเหมือนเดิม

     polarity ไม่แตะต้อง — ขั้วบวกผูกกับตัวขา ไม่ได้ผูกกับทิศที่มันไปอยู่ */
  layoutPorts(item);
  item.el.querySelectorAll('.port').forEach(function(portEl){
    portEl.style.transform = '';   /* ล้าง inline transform ที่อาจค้างจาก :hover */
  });

  /* อัปเดตสายไฟที่ต่อกับ item นี้ (ตำแหน่ง port เปลี่ยน)
     เรียกซ้ำหลัง transition 0.15s ของ port จบ ไม่งั้นสายจะวาดตามตำแหน่ง
     ที่ port กำลังเลื่อนอยู่ แล้วค้างเพี้ยนจนกว่าจะลากอุปกรณ์

     การเสียบลงรูใหม่ต้องรอจังหวะเดียวกัน เพราะต้องวัดตำแหน่งขาจริง
     หลังหมุนเสร็จ ระบบจะเลื่อนอุปกรณ์ให้ขาลงรูพอดีอีกครั้ง
     ถ้าหมุนจนตั้งฉาก ขาจะไปลงคนละฝั่งของร่องกลางให้เอง
     (ถ้าลงฝั่งเดียวกันคือขาสองข้างอยู่รางเดียวกัน = ลัดวงจรตัวเอง) */
  refreshWires(itemId);
  setTimeout(function(){
    clampWsItem(item);
    bbSnapItem(item);
    bbRefresh();
    /* หมุนแล้วขาย้ายไปอยู่คนละทิศ อาจไปแตะขาตัวอื่นหรือหลุดจากที่แตะอยู่
       ต้องคิดใหม่หลัง transition ของขาจบแล้ว ไม่ใช่ตอนขากำลังเลื่อน */
    settleCircuit();
  }, 180);

  if(quiet) return;
  var name = item.el.querySelector('.ws-item-name');
  showToast((name?name.textContent:'อุปกรณ์')+' หมุน '+deg+'°','success');
}
