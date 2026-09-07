/* ============================================================
   PROBE & FLOW — แอนิเมชันกระแสไหลตามสาย + โหมดเครื่องวัด (multimeter)
   คำนวณ I = V / R รวม แล้วไล่แรงดันตกคร่อมอุปกรณ์ทีละตัวจากขั้ว +
   ============================================================ */
/* สร้างสัญลักษณ์ +/− วิ่งตามสายไฟทุกเส้น (ทิศตามการไหลของกระแส) */
function startCurrentFlow(){
  stopCurrentFlow();
  var ns='http://www.w3.org/2000/svg';
  var svg=document.getElementById('wire-svg');
  G.flowDots = [];

  /* คำนวณกระแสรวมของวงจร (I = V/R) เพื่อกำหนดความเร็วจุดไหล
     กระแสมาก = จุดวิ่งเร็ว, กระแสน้อย (ผ่านตัวต้านทาน) = ช้า */
  var voltage = 0;
  G.wsItems.forEach(function(it){
    var dev = DEVICES[it.deviceId];
    if(dev.type==='source'){
      if(it.deviceId==='battery_9v') voltage=Math.max(voltage,9);
      else if(it.deviceId==='battery_aa') voltage=Math.max(voltage,1.5);
      else voltage=Math.max(voltage,5);
    }
  });
  var totalR = 0;
  G.wsItems.forEach(function(it){ var o=DEVICES[it.deviceId].ohm; if(typeof o==='number') totalR+=o; });
  totalR = Math.max(10, totalR);
  var currentMA = voltage / totalR * 1000;
  /* แปลงกระแสเป็นระยะเวลาต่อรอบ: กระแสมาก→เร็ว(เวลาน้อย), น้อย→ช้า(เวลามาก)
     ช่วง ~0.8s (แรง) ถึง ~3.5s (อ่อน) */
  var duration = Math.max(0.8, Math.min(3.5, 120 / currentMA));

  G.wires.forEach(function(w){
    var d = w.pathEl.getAttribute('d');
    if(!d) return;

    /* ทิศไหล: กระแสไหลจากขั้ว+ ไปขั้ว− (จากใกล้+ ไปไกล+)
       path วาดจาก fromPort→toPort
       ถ้า fromPort ใกล้ขั้ว+ กว่า toPort → ไหลตาม path (forward)
       ถ้า toPort ใกล้กว่า → ไหลย้อน path (reverse) */
    var dFrom = portDistFromPlus(w.fromPort);
    var dTo   = portDistFromPlus(w.toPort);
    var reverse = (dFrom > dTo); /* from ไกลกว่า = ไหลย้อน */

    /* สีจุด = สีสาย */
    var dotColor = w.color || '#ffd700';

    /* 3 จุดต่อสาย วิ่งต่อเนื่อง */
    for(var k=0;k<3;k++){
      var g = document.createElementNS(ns,'circle');
      g.setAttribute('r','5');
      g.setAttribute('fill', dotColor);
      g.setAttribute('class','flow-dot');
      g.style.filter = 'drop-shadow(0 0 6px '+dotColor+')';
      g.style.offsetPath = 'path("'+d+'")';
      g.style.offsetRotate = '0deg';
      var animName = reverse ? 'flow-move-rev' : 'flow-move';
      g.style.animation = animName+' '+duration+'s linear infinite';
      g.style.animationDelay = (k*duration/3)+'s';
      g._wireId = w.id;
      svg.appendChild(g);
      G.flowDots.push(g);
    }
  });
}

/* หาระยะของ port จากขั้ว+ (ใช้กำหนดทิศไหล) — BFS ทะลุอุปกรณ์ */
function portDistFromPlus(port){
  function wiresAt(p){var o=[];G.wires.forEach(function(x){if(x.fromPort===p||x.toPort===p)o.push(x);});return o;}
  function itemOf(id){var r=null;G.wsItems.forEach(function(x){if(x.id===id)r=x;});return r;}
  var start=[];
  G.wsItems.forEach(function(it){
    if(!it.el||DEVICES[it.deviceId].type!=='source')return;
    var ps=it.el.querySelectorAll('.port');
    for(var i=0;i<ps.length;i++) if(ps[i].dataset.polarity==='+') start.push(ps[i]);
  });
  var pd=new Map(), q=[];
  start.forEach(function(p){pd.set(p,0);q.push(p);});
  while(q.length){
    var p=q.shift(), d=pd.get(p);
    if(p===port) return d;
    wiresAt(p).forEach(function(x){
      var nx=(x.fromPort===p)?x.toPort:x.fromPort;
      if(!pd.has(nx)){pd.set(nx,d+1);q.push(nx);}
    });
    var it=itemOf(p.dataset.itemId);
    if(it&&DEVICES[it.deviceId].type!=='source'&&it.el){
      var ps=it.el.querySelectorAll('.port');
      for(var i=0;i<ps.length;i++) if(ps[i]!==p && !pd.has(ps[i])){pd.set(ps[i],d);q.push(ps[i]);}
    }
  }
  return pd.has(port)?pd.get(port):9999;
}

function stopCurrentFlow(){
  if(G.flowDots){
    G.flowDots.forEach(function(d){ d.remove(); });
    G.flowDots=[];
  }
}

/* ===== เครื่องวัด (Multimeter Probe) ===== */
function toggleProbeMode(){
  G.probeMode = !G.probeMode;
  var btn = document.getElementById('btn-probe');
  var disp = document.getElementById('probe-display');
  var svg = document.getElementById('wire-svg');

  /* ปิดโหมดต่อสายถ้าเปิดอยู่ (กันชนกัน) */
  if(G.probeMode && G.wireMode) toggleWireMode();

  btn.classList.toggle('active', G.probeMode);
  disp.style.display = G.probeMode ? 'block' : 'none';
  svg.classList.toggle('probing', G.probeMode);

  if(G.probeMode){
    /* ผูก event จิ้มสายไฟทุกเส้น */
    attachProbeHandlers();
    showToast('โหมดเครื่องวัด: จิ้มที่สายไฟเพื่อดูค่ากระแส','success');
  } else {
    /* เคลียร์ค่าและ highlight */
    clearProbeReading();
    showToast('ปิดเครื่องวัด','');
  }
}

function attachProbeHandlers(){
  G.wires.forEach(function(w){
    /* ตั้ง pointer-events ให้จิ้มได้ + ผูก handler */
    w.pathEl.style.pointerEvents = 'stroke';
    w.pathEl.onclick = function(e){
      e.stopPropagation();
      if(G.probeMode) probeWire(w);
    };
  });
}

/* จิ้มสายไฟ → คำนวณ + แสดงค่า */
function probeWire(w){
  /* ลบ highlight เก่า */
  G.wires.forEach(function(x){ x.pathEl.classList.remove('probe-target'); });
  w.pathEl.classList.add('probe-target');

  /* หาแรงดันจากแหล่งจ่ายในวงจร */
  var voltage = 0;
  G.wsItems.forEach(function(it){
    var dev = DEVICES[it.deviceId];
    if(dev.type === 'source'){
      if(it.deviceId === 'battery_9v') voltage = Math.max(voltage, 9);
      else if(it.deviceId === 'battery_aa') voltage = Math.max(voltage, 1.5);
      else voltage = Math.max(voltage, 5); /* หม้อแปลง */
    }
  });

  /* ตรวจว่าวงจรปิดครบไหม (ถ้าไม่ปิด กระแส = 0) */
  var circuit = isClosedCircuit(G.wsItems, G.wires);
  var closed = circuit.ok;

  /* R รวมทั้งวงจร = ผลรวม ohm ของอุปกรณ์ทุกตัว (ตัวต้านทานทำให้ R สูง กระแสต่ำ) */
  var totalR = 0;
  G.wsItems.forEach(function(it){
    var o = DEVICES[it.deviceId].ohm;
    if(typeof o === 'number') totalR += o;
  });
  totalR = Math.max(10, totalR); /* กันหารศูนย์ */

  /* กระแสในวงจรอนุกรม = เท่ากันทุกจุด (I = V/R_รวม)
     → วงจรมีตัวต้านทาน กระแสจะน้อยกว่าวงจรไม่มี (เห็นความต่างชัด) */
  var current = closed ? (voltage / totalR * 1000) : 0; /* mA */

  /* แรงดัน ณ จุดที่จิ้ม = V − (แรงดันตกคร่อมของอุปกรณ์ที่ไฟผ่านมาก่อนถึงจุดนี้)
     ไฟไหลจากขั้ว+ → ผ่านอุปกรณ์ทีละตัว แรงดันลดลงเรื่อยๆ ตาม R แต่ละตัว */
  var vHere = closed ? voltageAtWire(w, voltage, current) : 0;

  /* หาขั้วของสายนี้ */
  var polText = '—';
  if(w.color === '#ff4444') polText = 'บวก (+)';
  else if(w.color === '#00aaff') polText = 'ลบ (−)';
  else polText = 'กลาง';

  /* แสดงผล */
  document.getElementById('probe-voltage').textContent = vHere.toFixed(2) + ' V';
  document.getElementById('probe-current').textContent = current.toFixed(1) + ' mA';
  document.getElementById('probe-polarity').textContent = polText;

  var hint = document.getElementById('probe-hint');
  if(!closed){
    hint.textContent = '⚠ วงจรยังไม่ปิด — ไม่มีกระแส';
    hint.style.color = '#f80';
  } else {
    hint.textContent = '✓ V ที่จุดนี้ (แรงดันลดหลังตัวต้านทาน)';
    hint.style.color = '#0a6';
  }
}

/* คำนวณแรงดัน ณ สายที่จิ้ม — วัดจากขั้ว+ ไล่ผ่านอุปกรณ์
   แรงดันตกคร่อมอุปกรณ์แต่ละตัว = I × R_ตัวนั้น
   สายก่อนอุปกรณ์ตัวแรก = V เต็ม, ยิ่งผ่านอุปกรณ์ (โดยเฉพาะตัวต้านทาน) ยิ่งลด */
function voltageAtWire(targetWire, Vsource, currentMA){
  var I = currentMA / 1000; /* A */
  /* BFS จากขั้ว+ วัดแรงดันตกสะสมถึงแต่ละสาย
     ผ่านอุปกรณ์ → แรงดันลด I×R, ผ่านสาย → แรงดันเท่าเดิม */
  function wiresAt(p){var o=[];G.wires.forEach(function(x){if(x.fromPort===p||x.toPort===p)o.push(x);});return o;}
  function itemOf(id){var r=null;G.wsItems.forEach(function(x){if(x.id===id)r=x;});return r;}

  /* หาขั้ว+ ของแหล่งจ่าย */
  var startPorts=[];
  G.wsItems.forEach(function(it){
    if(!it.el || DEVICES[it.deviceId].type!=='source') return;
    var ps=it.el.querySelectorAll('.port');
    for(var i=0;i<ps.length;i++) if(ps[i].dataset.polarity==='+') startPorts.push(ps[i]);
  });
  if(!startPorts.length) return Vsource;

  /* Dijkstra-ish: แรงดันตกสะสม (drop) จากขั้ว+ ถึงแต่ละ port
     ต่ำสุด = ใกล้ขั้ว+ สุด */
  var portDrop=new Map(), q=[];
  startPorts.forEach(function(p){ portDrop.set(p,0); q.push(p); });
  var wireDrop={}; /* wireId → แรงดันตกที่ต้นสาย */

  while(q.length){
    var p=q.shift(), drop=portDrop.get(p);
    /* ผ่านสาย: แรงดันไม่ตก (สายไม่มี R) — สายรับค่า drop ของ port ต้นทาง */
    wiresAt(p).forEach(function(x){
      if(wireDrop[x.id]===undefined || drop<wireDrop[x.id]) wireDrop[x.id]=drop;
      var nx=(x.fromPort===p)?x.toPort:x.fromPort;
      if(!portDrop.has(nx)||portDrop.get(nx)>drop){ portDrop.set(nx,drop); q.push(nx); }
    });
    /* ทะลุอุปกรณ์: แรงดันตก I×R ของอุปกรณ์นั้น */
    var it=itemOf(p.dataset.itemId);
    if(it && DEVICES[it.deviceId].type!=='source' && it.el){
      var o=DEVICES[it.deviceId].ohm||0;
      var vDropDev=I*o; /* แรงดันตกคร่อมอุปกรณ์นี้ */
      var ps=it.el.querySelectorAll('.port');
      for(var i=0;i<ps.length;i++){
        if(ps[i]!==p){
          var nd=drop+vDropDev;
          if(!portDrop.has(ps[i])||portDrop.get(ps[i])>nd){ portDrop.set(ps[i],nd); q.push(ps[i]); }
        }
      }
    }
  }
  var d = wireDrop[targetWire.id];
  if(d===undefined) d=0;
  return Math.max(0, Vsource - d);
}

function clearProbeReading(){
  G.wires.forEach(function(w){
    w.pathEl.classList.remove('probe-target');
    /* คืน pointer-events ให้ระบบลบสาย (คลิกลบ) ทำงานปกติ */
    w.pathEl.style.pointerEvents = '';
    w.pathEl.onclick = function(){ if(!G.wireMode && !G.probeMode) removeWire(w.id); };
  });
  document.getElementById('probe-voltage').textContent = '-- V';
  document.getElementById('probe-current').textContent = '-- mA';
  document.getElementById('probe-polarity').textContent = '--';
  var hint = document.getElementById('probe-hint');
  hint.textContent = 'จิ้มที่สายไฟเพื่อวัด';
  hint.style.color = '';
}
