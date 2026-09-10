/* ============================================================
   WORKSPACE — อุปกรณ์บนพื้นที่ทำงาน
   วาง/ลบ/ล้าง, ลากย้าย (เมาส์+นิ้ว), เลือกอุปกรณ์,
   แถบเครื่องมือลอยบนมือถือ และการหมุนอุปกรณ์
   ============================================================ */
/* ============================================================
   WORKSPACE ITEMS
   ============================================================ */
function addWsItem(deviceId,x,y){
  var dev=DEVICES[deviceId];
  var itemId='ws-'+(++G.wsCounter);

  /* บังคับตำแหน่งให้อยู่ในพื้นที่ทำงาน — ที่เรียกเข้ามาคุมแต่ขอบล่าง (Math.max(0,..))
     ถ้าวางชิดขอบขวา/ล่าง อุปกรณ์จะโดน overflow:hidden ตัดจนแตะไม่ถูก
     (ประมาณขนาดกล่องไว้ 78x74 เพราะยังไม่ได้ใส่ลง DOM จึงวัดจริงไม่ได้) */
  var wsEl=document.getElementById('workspace');
  if(wsEl){
    var M=6, BW=78, BH=74;
    x=Math.min(Math.max(M,x||0), Math.max(M, wsEl.clientWidth  - BW - M));
    y=Math.min(Math.max(M,y||0), Math.max(M, wsEl.clientHeight - BH - M));
  }

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
    port.dataset.itemId=itemId; port.dataset.pos=pos;
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

  makeDraggable(el);
  document.getElementById('workspace').appendChild(el);
  G.wsItems.push({id:itemId,deviceId:deviceId,x:x,y:y,el:el,rotation:0});
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
  G.wires.filter(function(w){return w.fromItemId===itemId||w.toItemId===itemId;})
         .forEach(function(w){removeWire(w.id);});
  item.el.remove();
  G.wsItems.splice(idx,1);
  pruneOrphanWires();   /* กันสายที่หลุดอ้างอิงเหลือค้างอยู่ */
  recolorWires();
  if(G.wsItems.length===0) document.getElementById('workspace-hint').style.display='';
}

function clearWorkspace(silent){
  stopCurrentFlow();
  if(!invUnlimited()){
    G.wsItems.forEach(function(item){G.invCounts[item.deviceId]=(G.invCounts[item.deviceId]||0)+1;});
  }
  cancelTapConnect();   /* ล้างการต่อสายที่ค้าง ไม่ให้ชี้ไป DOM ที่กำลังจะถูกลบ */
  G.wsItems=[]; G.wires=[]; G.wsCounter=0; G.wireCounter=0;
  G.selectedItemId=null;
  var ws=document.getElementById('workspace');
  Array.from(ws.children).forEach(function(ch){
    if(ch.id!=='wire-svg'&&ch.id!=='workspace-hint') ch.remove();
  });
  var svg=document.getElementById('wire-svg');
  Array.from(svg.children).forEach(function(ch){
    if(ch.id!=='wire-preview'&&ch.tagName!=='defs') ch.remove();
  });
  document.getElementById('workspace-hint').style.display='';
  if(!silent) renderInventory();
}

/* drag-to-move ws items */
/* ---- helpers: unified pointer coords ---- */
function getXY(e){ return e.touches ? {x:e.touches[0].clientX,y:e.touches[0].clientY} : {x:e.clientX,y:e.clientY}; }
function getUpXY(e){ return e.changedTouches ? {x:e.changedTouches[0].clientX,y:e.changedTouches[0].clientY} : {x:e.clientX,y:e.clientY}; }

function makeDraggable(el){
  function startDrag(e){
    /* แตะจุดขั้ว/ปุ่มลบ = ไม่ใช่การลากย้าย (เช็คที่ target ด้านล่าง) */
    if(e.target.classList.contains('port')||e.target.classList.contains('ws-item-delete')) return;
    if(e.cancelable) e.preventDefault();
    e.stopPropagation();

    selectItem(el.id);

    var p0=getXY(e);
    var startL=parseInt(el.style.left)||0, startT=parseInt(el.style.top)||0;
    var inv=document.getElementById('inventory');
    var overInv=false;

    function dragOnMove(ev){
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
        /* บังคับให้อยู่ในพื้นที่ทำงานเสมอ
           #workspace เป็น overflow:hidden ถ้าปล่อยให้ตำแหน่งติดลบหรือเลยขอบ
           อุปกรณ์จะถูกตัดหายไปจนแตะไม่ถูก ต้องล้างพื้นที่ทั้งหมดถึงจะกู้คืนได้ */
        var M=6;
        var maxX=Math.max(M, wsEl.clientWidth  - el.offsetWidth  - M);
        var maxY=Math.max(M, wsEl.clientHeight - el.offsetHeight - M);
        var nx=Math.min(Math.max(M, parseInt(el.style.left)||0), maxX);
        var ny=Math.min(Math.max(M, parseInt(el.style.top)||0),  maxY);
        el.style.left=nx+'px'; el.style.top=ny+'px';

        var item=null;
        G.wsItems.forEach(function(i){if(i.id===el.id)item=i;});
        if(item){item.x=nx;item.y=ny;}
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
  var wsRect=document.getElementById('workspace').getBoundingClientRect();
  var elRect=itemEl.getBoundingClientRect();
  /* +30 เผื่อชื่ออุปกรณ์ + จุด port-bottom ที่ลอยใต้กล่อง (absolute) */
  var top=(elRect.bottom - wsRect.top + 30);
  var left=Math.max(0, elRect.left - wsRect.left);
  tb.style.top=top+'px';
  tb.style.left=left+'px';
  tb.style.display='flex';
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

  /*
    หมุน port dot ตามภาพด้วย (CW 90° ต่อครั้ง)
    ตำแหน่งภาพหมุน: left→top→right→bottom→left
    ทิศทางการย้าย class เมื่อหมุน CW:
      left→top, top→right, right→bottom, bottom→left
    เราคำนวณจาก "ตำแหน่งดั้งเดิม" (dev.ports) + มุมปัจจุบัน
    เพื่อไม่ให้ค่าเพี้ยนสะสม
  */
  var rotMap = {
    0:   {left:'left',  right:'right', top:'top',    bottom:'bottom'},
    90:  {left:'top',   right:'bottom',top:'right',  bottom:'left'},
    180: {left:'right', right:'left',  top:'bottom', bottom:'top'},
    270: {left:'bottom',right:'top',   top:'left',   bottom:'right'}
  };
  var map = rotMap[deg];
  var dev = DEVICES[item.deviceId];

  var portEls = item.el.querySelectorAll('.port');
  portEls.forEach(function(portEl, idx){
    var originalPos = dev.ports[idx];       /* ตำแหน่งดั้งเดิมของ port นี้ */
    var newPos = map[originalPos] || originalPos;

    /* ย้าย class ตำแหน่งภาพ (ให้ dot ไปอยู่ที่ใหม่ตามภาพหมุน) */
    portEl.classList.remove('port-left','port-right','port-top','port-bottom');
    portEl.classList.add('port-'+newPos);

    /* อัปเดต dataset.pos = ตำแหน่งใหม่ (สำหรับ getPortCenter/refreshWires)
       แต่ polarity ยังติดกับ port เดิม (+ ก็ยังเป็น +) ไม่แตะต้อง */
    portEl.dataset.pos = newPos;

    /* ล้าง inline transform ที่อาจค้างจาก :hover */
    portEl.style.transform = '';
  });

  /* อัปเดตสายไฟที่ต่อกับ item นี้ (ตำแหน่ง port เปลี่ยน)
     เรียกซ้ำหลัง transition 0.15s ของ port จบ ไม่งั้นสายจะวาดตามตำแหน่ง
     ที่ port กำลังเลื่อนอยู่ แล้วค้างเพี้ยนจนกว่าจะลากอุปกรณ์ */
  refreshWires(itemId);
  setTimeout(function(){ refreshWires(itemId); }, 180);

  var name = item.el.querySelector('.ws-item-name');
  showToast((name?name.textContent:'อุปกรณ์')+' หมุน '+deg+'°','success');
}
