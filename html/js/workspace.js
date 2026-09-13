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
  iconWrap.appendChild(makeSvgIcon(dev.svgId,52,52));

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

  /* สวิตช์ของจริงต้องสับเปิด-ปิดได้ ไม่ใช่ต่อแล้วไฟติดตลอด
     ป้าย ON/OFF เป็นตัวสับ แตะแล้ววงจรเปิด/ปิดจริง (ดู toggleSwitchItem) */
  if(deviceId==='switch'){
    var sw=document.createElement('span');
    sw.className='ws-switch-state';
    sw.textContent='ON';
    sw.title='แตะเพื่อสับสวิตช์ — เปิด/ปิดวงจร';
    sw.addEventListener('click',function(e){e.stopPropagation();toggleSwitchItem(itemId);});
    sw.addEventListener('mousedown',function(e){e.stopPropagation();});
    sw.addEventListener('touchstart',function(e){e.stopPropagation();toggleSwitchItem(itemId);},{passive:true});
    el.appendChild(sw);
  }

  makeDraggable(el);
  document.getElementById('workspace').appendChild(el);
  var item={id:itemId,deviceId:deviceId,x:x,y:y,el:el,rotation:0,
            open:false,blown:false,           /* สถานะสวิตช์/ฟิวส์ */
            heat:0,stress:0,failed:false,failMode:null};   /* สถานะความเสียหาย */
  G.wsItems.push(item);

  /* ย้ายจุดขั้วไปอยู่ตำแหน่งขาจริงของอุปกรณ์ตัวนี้ (ดู PORT_ANCHORS ใน js/devices.js)
     ต้องทำหลังใส่ลง DOM แล้ว เพราะต้องอ่านขนาดกล่องจริง */
  layoutPorts(item);

  /* จัดให้อยู่ในกรอบด้วยขนาดจริง แล้ว "เสียบขา" ลงรูเบรดบอร์ด */
  clampWsItem(item);
  bbSnapItem(item);
  bbRefresh();

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
  recolorWires();
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
    /* แตะจุดขั้ว/ปุ่มลบ/ตัวสับสวิตช์ = ไม่ใช่การลากย้าย */
    if(e.target.classList.contains('port')||
       e.target.classList.contains('ws-item-delete')||
       e.target.classList.contains('ws-switch-state')) return;
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
        }
        refreshWires(el.id);   /* ตำแหน่งเพิ่งถูกดึงกลับ สายต้องตามไปด้วย */
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
function rotateItem(itemId){
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
    refreshWires(itemId);
  }, 180);

  var name = item.el.querySelector('.ws-item-name');
  showToast((name?name.textContent:'อุปกรณ์')+' หมุน '+deg+'°','success');
}
