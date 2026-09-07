/* ============================================================
   INVENTORY — คลังอุปกรณ์ด้านข้าง + การลากอุปกรณ์ลงพื้นที่ทำงาน
   (รองรับทั้งเมาส์ผ่าน HTML5 drag & drop และนิ้วผ่าน touch)
   ============================================================ */
/* ============================================================
   INVENTORY
   ============================================================ */
/* ============================================================
   INVENTORY TOUCH DRAG FACTORY
   สร้าง handler ใหม่ต่อ deviceId หนึ่งรอบเท่านั้น
   ============================================================ */
function makeInvTouchHandler(deviceId){
  return function(e){
    if((G.invCounts[deviceId]||0)<=0) return;
    if(e.cancelable) e.preventDefault();
    var t0=e.touches[0];
    var ghost=document.createElement('div');
    ghost.style.cssText='position:fixed;z-index:9999;pointer-events:none;opacity:.8;';
    ghost.appendChild(makeSvgIcon(DEVICES[deviceId].svgId,52,52));
    document.body.appendChild(ghost);
    ghost.style.left=(t0.clientX-26)+'px';
    ghost.style.top =(t0.clientY-26)+'px';

    function tmove(ev){
      if(ev.cancelable) ev.preventDefault();
      var t=ev.touches[0];
      ghost.style.left=(t.clientX-26)+'px';
      ghost.style.top =(t.clientY-26)+'px';
      var ws=document.getElementById('workspace').getBoundingClientRect();
      var over=(t.clientX>=ws.left&&t.clientX<=ws.right&&t.clientY>=ws.top&&t.clientY<=ws.bottom);
      document.getElementById('workspace').classList.toggle('drag-over',over);
    }
    function tend(ev){
      ghost.remove();
      document.getElementById('workspace').classList.remove('drag-over');
      document.removeEventListener('touchmove',tmove);
      document.removeEventListener('touchend',tend);
      var t=ev.changedTouches[0];
      var r=document.getElementById('workspace').getBoundingClientRect();
      if(t.clientX>=r.left&&t.clientX<=r.right&&t.clientY>=r.top&&t.clientY<=r.bottom){
        if((G.invCounts[deviceId]||0)<=0){showToast('อุปกรณ์หมด!','error');return;}
        addWsItem(deviceId, Math.max(0,t.clientX-r.left-36), Math.max(0,t.clientY-r.top-36));
        G.invCounts[deviceId]=(G.invCounts[deviceId]||0)-1;
        updateInvCount(deviceId);
        document.getElementById('workspace-hint').style.display='none';
      }
    }
    document.addEventListener('touchmove',tmove,{passive:false});
    document.addEventListener('touchend',tend);
  };
}

function renderInventory(){
  var inv=document.getElementById('inventory');
  inv.innerHTML='<h3>'+ICON('box',18)+' คลังอุปกรณ์</h3>';
  var lv=LEVELS[G.level];
  var cats=[
    {label:ICON('bolt',15)+' พลังงาน/ควบคุม', ids:['battery_aa','battery_9v','transformer','switch','fuse']},
    {label:ICON('chip',15)+' อิเล็กทรอนิกส์', ids:['resistor','ldr','diode','led','capacitor','transistor']},
    {label:ICON('bulbIdea',15)+' เปลี่ยนพลังงาน',  ids:['bulb','motor','buzzer']},
    {label:ICON('wrench',15)+' เครื่องมือ',   ids:['wire','breadboard','multimeter']},
  ];
  cats.forEach(function(cat){
    var avail=cat.ids.filter(function(id){return id in lv.inventory;});
    if(!avail.length) return;
    var lbl=document.createElement('div');
    lbl.className='inv-category'; lbl.innerHTML=cat.label;
    inv.appendChild(lbl);
    avail.forEach(function(deviceId){
      var dev=DEVICES[deviceId];
      /* อ่าน count จาก G.invCounts โดยตรง ถ้าไม่มี key ให้เอาจาก lv.inventory */
      var count = (G.invCounts[deviceId] !== undefined) ? G.invCounts[deviceId] : (lv.inventory[deviceId]||0);
      var el=document.createElement('div');
      el.className='inv-item'+(count===0?' empty':'');
      el.draggable=count>0;
      el.dataset.deviceId=deviceId;
      el.id='inv-'+deviceId;
      var iconWrap=document.createElement('div');
      iconWrap.className='inv-item-icon';
      iconWrap.appendChild(makeSvgIcon(dev.svgId,34,34));
      var name=document.createElement('span');
      name.className='inv-item-name'; name.textContent=dev.name;
      var cnt=document.createElement('span');
      cnt.className='inv-count'+(count===0?' zero':'');
      cnt.id='inv-cnt-'+deviceId; cnt.textContent=count;
      el.appendChild(iconWrap); el.appendChild(name); el.appendChild(cnt);
      el.addEventListener('dragstart',function(e){
        if((G.invCounts[deviceId]||0)<=0){e.preventDefault();return;}
        e.dataTransfer.setData('text/plain',deviceId);
        e.dataTransfer.effectAllowed='copy';
      });

      /* Touch drag จาก inventory → workspace */
      el.addEventListener('touchstart', makeInvTouchHandler(deviceId), {passive:false});

      inv.appendChild(el);
    });
  });
}

function updateInvCount(deviceId){
  var c = (G.invCounts[deviceId] !== undefined) ? G.invCounts[deviceId] : 0;
  var el=document.getElementById('inv-cnt-'+deviceId);
  if(el){el.textContent=c;el.className='inv-count'+(c===0?' zero':'');}
  var item=document.getElementById('inv-'+deviceId);
  if(item){item.classList.toggle('empty',c===0);item.draggable=c>0;}
}

/* ============================================================
   DRAG & DROP
   ============================================================ */
function onWsDragOver(e){e.preventDefault();e.dataTransfer.dropEffect='copy';document.getElementById('workspace').classList.add('drag-over');}
function onWsDragLeave(){document.getElementById('workspace').classList.remove('drag-over');}
function onWsDrop(e){
  e.preventDefault();
  document.getElementById('workspace').classList.remove('drag-over');
  var deviceId=e.dataTransfer.getData('text/plain');
  if(!deviceId||(G.invCounts[deviceId]||0)<=0){showToast('อุปกรณ์หมด!','error');return;}
  var ws=document.getElementById('workspace');
  var r=ws.getBoundingClientRect();
  addWsItem(deviceId,Math.max(0,e.clientX-r.left-36),Math.max(0,e.clientY-r.top-36));
  G.invCounts[deviceId]=(G.invCounts[deviceId]||0)-1;
  updateInvCount(deviceId);
  document.getElementById('workspace-hint').style.display='none';
}
