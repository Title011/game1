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
  el.addEventListener('mousedown', function(e){ e.stopPropagation(); });
  el.addEventListener('touchstart', function(e){
    e.stopPropagation();
    var t = e.touches[0];
    t0 = {x:t.clientX, y:t.clientY};
  }, {passive:true});
  el.addEventListener('touchend', function(e){
    e.stopPropagation();
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

    port.addEventListener('mousedown',onPortMouseDown);
    port.addEventListener('touchstart',onPortMouseDown,{passive:false});
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
      G.clip.baseX = null; G.clip.baseY = null;
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
  if(G.selectedItemId === itemId){
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
  G.wsItems=[]; G.wires=[]; G.wsCounter=0; G.wireCounter=0;
  G.selectedItemId=null;
  G.clip=null;   /* คลิปบอร์ดอ้างอิงชิ้นที่เพิ่งถูกล้างไป ต้องทิ้งไปพร้อมกัน */
  var ws=document.getElementById('workspace');
  /* เก็บชิ้นส่วนถาวรของพื้นที่ทำงานไว้ ล้างเฉพาะอุปกรณ์ที่ผู้เล่นวาง
     (bb-layer คือตัวแผงเบรดบอร์ด, mobile-toolbar คือปุ่มลอยบนมือถือ) */
  var KEEP={'wire-svg':1,'workspace-hint':1,'bb-layer':1,'mobile-toolbar':1,'hazard-bar':1};
  Array.from(ws.children).forEach(function(ch){
    if(!KEEP[ch.id]) ch.remove();
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

    selectItem(el.id);

    var p0=getXY(e);
    var startL=parseInt(el.style.left)||0, startT=parseInt(el.style.top)||0;
    var inv=document.getElementById('inventory');
    var overInv=false;

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
        showToast('คืนอุปกรณ์กลับคลัง','success');
      } else {
        var item=null;
        G.wsItems.forEach(function(i){if(i.id===el.id)item=i;});
        if(item){
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
   ต้องการเอง ระบบจำระยะที่ลากไว้ แล้วชิ้นถัด ๆ ไปจะวางห่างเท่ากันทุกชิ้น
   เรียงถ่าน 4 ก้อนเป็นแถวจึงทำได้ด้วยการลากมือหนึ่งครั้ง แล้วกดวางซ้ำ

   ถ้าไม่เคยลากเลย ใช้ระยะปริยาย = หนึ่งช่องเบรดบอร์ดเฉียงลง
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
    baseX: null, baseY: null,   /* ตำแหน่งที่ระบบวางให้ ใช้วัดว่าผู้เล่นลากไปไกลแค่ไหน */
    dx: null, dy: null          /* ระยะห่างที่เรียนรู้มาแล้ว */
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
     baseX/Y คือตำแหน่งที่ "ระบบวางให้" ถ้าผู้เล่นลากออกจากจุดนี้ = สอนระยะใหม่
     (อ่านค่าหลัง addWsItem แล้ว เพราะ clampWsItem/bbSnapItem ขยับตำแหน่งไปอีก) */
  c.fromId = made.id;
  c.baseX = made.x; c.baseY = made.y;
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

/* ผู้เล่นลากชิ้นที่เพิ่งวางไปเอง = กำลังบอกว่า "อยากให้ห่างเท่านี้"
   จำไว้ใช้กับการวางครั้งถัดไปทุกครั้ง เรียกจาก dragOnUp ใน makeDraggable */
function learnPasteOffset(item){
  var c = G.clip;
  if(!c || !item || c.fromId !== item.id) return;
  if(c.baseX === null || c.baseY === null) return;
  var dx = item.x - c.baseX, dy = item.y - c.baseY;
  if(Math.abs(dx) + Math.abs(dy) < 6) return;   /* ขยับจิ๊ดเดียว ไม่นับ */
  c.dx = dx; c.dy = dy;
  c.baseX = item.x; c.baseY = item.y;
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
function selectItem(itemId){
  if(G.selectedItemId && G.selectedItemId !== itemId){
    var prev = document.getElementById(G.selectedItemId);
    if(prev) prev.classList.remove('selected');
  }
  G.selectedItemId = itemId;
  var el = document.getElementById(itemId);
  if(el){
    el.classList.add('selected');
    /* บนมือถือ: แสดง floating toolbar ใกล้ item */
    if('ontouchstart' in window) showMobileToolbar(el);
  }
}

function deselectAll(){
  if(G.selectedItemId){
    var el = document.getElementById(G.selectedItemId);
    if(el) el.classList.remove('selected');
  }
  G.selectedItemId = null;
  hideMobileToolbar();
}

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
