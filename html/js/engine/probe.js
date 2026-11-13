/* PROBE & POWER — การทำงานของวงจรตามเวลาจริง + เครื่องวัด
   ทุกตัวเลขมาจาก solveCircuit() (ไม่ใช่ประมาณ) เลยได้พฤติกรรมจริง เช่น หลอดอนุกรมหรี่ลง / ขนานสว่างเท่าเดิม /
   LED กับ AA 1.5V ติดสลัว / วงจร RC ไฟแรงแล้วค่อยๆ ลดลง (หน่วงเวลา)
   PowerSim เดินสมการซ้ำทุก ~50ms พร้อมส่งแรงดันคร่อม cap จากรอบก่อนเข้าไป เลยจำลองการประจุตามเวลาได้ */

var PowerSim = {
  on:false, timer:null, last:0, t:0,
  capV:{},          /* แรงดันคร่อม cap แต่ละตัว (โวลต์) */
  sol:null,         /* ผลแก้วงจรรอบล่าสุด */
  dotDur:{},        /* ระยะเวลาต่อรอบของจุดไฟในแต่ละสาย */
  target:null       /* สิ่งที่เครื่องวัดจิ้มค้างไว้ {type,ref} */
};

/* เริ่ม/หยุดการจ่ายไฟ */
function startCurrentFlow(){
  stopCurrentFlow();
  PowerSim.on = true;
  PowerSim.capV = {};      /* cap เริ่มจากยังไม่มีประจุ */
  PowerSim.t = 0;
  PowerSim.last = Date.now();
  PowerSim.dotDur = {};

  /* รอบแรกทันที ไม่รอ timer — แต่ต้องเป็นก้าวเวลาจริง ห้าม 0
     (dt=0 = แก้แบบคงตัว cap จะถูกมองว่าประจุเต็มทันทีตั้งแต่เฟรมแรก วงจร RC เลยค้าง ไม่มีช่วงหน่วงให้ดู) */
  powerStep(0.001);
  buildFlowDots();
  PowerSim.timer = setInterval(function(){
    var now = Date.now();
    var dt = Math.min(0.2, Math.max(0.005, (now - PowerSim.last)/1000));  /* จำกัดก้าว เผื่อสลับแท็บแล้วกลับมา */
    PowerSim.last = now;
    PowerSim.t += dt;
    powerStep(dt);
  }, 50);
}

function stopCurrentFlow(){
  PowerSim.on = false;
  if(PowerSim.timer){ clearInterval(PowerSim.timer); PowerSim.timer = null; }
  PowerSim.sol = null;
  PowerSim.capV = {};
  if(G.flowDots){
    G.flowDots.forEach(function(d){ d.remove(); });
    G.flowDots = [];
  }
  G.wsItems.forEach(function(it){
    if(!it.el) return;
    it.el.style.removeProperty('--glow');
    it.el.style.removeProperty('--spin');
    it.el.style.removeProperty('--buzz');
    it.el.classList.remove('lit');
    /* ล้างค่าที่จำไว้ด้วย ไม่งั้นรอบถัดไปที่ได้ค่าเท่าเดิมจะถูกมองว่า "ไม่เปลี่ยน" แล้วไม่เขียน = ไม่ติด */
    it._lastGlow = null;
    it._lastSpin = null;
  });
}

/* หนึ่งก้าวเวลาของการจำลอง (ระบบความเสียหายเดินไปพร้อมกันในก้าวนี้ ผู้เล่นเลยเห็นร้อน→ควัน→พัง ตามเวลาจริง) */
function powerStep(dt){
  var sol = solveCircuit(G.wsItems, G.wires, {dt:dt, capV:PowerSim.capV});
  PowerSim.sol = sol;

  /* วงจรเปิด (สับสวิตช์ OFF / ฟิวส์ขาด / ลบสาย) โหนดหลุด เมทริกซ์เอกฐาน solver คืน ok=false
     ตัดไฟแล้วต้อง "ไม่มีกระแสที่ไหนเลย" จริงๆ ทั้งการเย็นลงและภาพ (ของเดิม return ทิ้งตรงนี้ เลยค้างค่าก่อนตัดไฟ) */
  if(!sol.ok){
    if(dt > 0 && typeof hazardCool === 'function') hazardCool(dt);
    clearSimVisuals();
    if(G.probeMode) refreshProbeReading();
    return;
  }

  PowerSim.capV = sol.capV;

  if(dt > 0 && typeof hazardStep === 'function'){
    var events = hazardStep(sol, dt);
    applyHazardVisuals();
    if(events.length) onLiveIncident(events);
  }

  applySimVisuals(sol);

  /* ไฟกลับมาหลังวงจรเคยเปิด (สับ ON อีกครั้ง) จุดไฟถูกลบตอนตัดไฟ ต้องสร้างชุดใหม่
     (updateFlowSpeed อัปเดตได้เฉพาะจุดที่มีอยู่ ถ้าไม่สร้างใหม่ ไฟจะไหลแต่ไม่มีจุดวิ่งให้เห็น) */
  if(PowerSim.on && (!G.flowDots || !G.flowDots.length)) buildFlowDots();
  else updateFlowSpeed(sol);

  if(G.probeMode) refreshProbeReading();
}

/* มีอะไรพังขึ้นระหว่างเล่น — ค่าเริ่มต้นเตือน+เปิดรายงาน (ตอนเล่นลำดับเหตุการณ์จะถูกปิดเสียงชั่วคราว ให้ตัวลำดับจัดการเองตอนจบ) */
function onLiveIncident(events){
  if(typeof PowerSim.onIncident === 'function'){ PowerSim.onIncident(events); return; }
  showToast(incidentSummary(events), 'error');
  if(typeof showIncidentModal === 'function') showIncidentModal(HAZARD.incidents);
}

/* แปลงผลคำนวณเป็นภาพ — ความสว่าง/ความเร็ว/ความดัง ส่งผ่านตัวแปร CSS --glow/--spin/--buzz ที่ .ws-item (ดู css/circuit.css) */

/* ดับภาพทั้งหมดให้เหมือนไม่มีกระแส — ใช้ตอนวงจรเปิด (ไม่หยุด timer เพราะยังต้องเย็นลง + สับ ON แล้วกลับมาทำงานเองทันที)
   ล้าง _lastGlow/_lastSpin ด้วย ไม่งั้นไฟกลับมาได้ค่าเดิมพอดีจะไม่เขียน = ไม่ติด */
function clearSimVisuals(){
  G.wsItems.forEach(function(it){
    if(!it.el) return;
    it.el.style.setProperty('--glow', '0');
    it.el.classList.remove('lit');
    it._lastGlow = null;
    it._lastSpin = null;
  });
  if(G.flowDots && G.flowDots.length){     /* จุดไฟวิ่งต้องหายด้วย */
    G.flowDots.forEach(function(d){ d.remove(); });
    G.flowDots = [];
  }
  if(typeof PowerSim !== 'undefined') PowerSim.dotDur = {};
}

function applySimVisuals(sol){
  G.wsItems.forEach(function(it){
    var el = it.el;
    if(!el) return;

    /* อุปกรณ์ที่พังแล้วต้องดับสนิท ไม่ค้างค่าสุดท้าย (ของเดิม return ทิ้ง หลอดไส้ขาดเลยยังเรืองแสง) */
    if(el.classList.contains('burned') || el.classList.contains('failed')){
      if(it._lastGlow !== '0.000'){
        it._lastGlow = '0.000';
        el.style.setProperty('--glow', '0');
        el.classList.remove('lit');
      }
      return;
    }

    var r = sol.byItem[it.id];
    var g = r ? deviceIntensity(r) : 0;
    var gs = g.toFixed(3);

    /* เขียนเฉพาะตอนค่าเปลี่ยนจริง — ลูปนี้เดิน 20 ครั้ง/วิ ถ้าเขียนทับทุกรอบ เบราว์เซอร์คำนวณสไตล์ใหม่ฟรีๆ
       และอนิเมชันที่คาบขึ้นกับ --glow จะสะดุดเพราะถูกตั้งคาบใหม่ตลอด */
    if(it._lastGlow !== gs){
      it._lastGlow = gs;
      el.style.setProperty('--glow', gs);
      el.classList.toggle('lit', g > 0.04);
    }

    /* มอเตอร์หมุนเร็วตามกระแส (น้อยก็หมุนอืด) · บัซเซอร์ใช้ค่าเดียวกันคนละทาง (กระแสมาก=คาบสั้น=สั่นถี่ดังขึ้น) */
    if(r && r.spec && r.spec.inom){
      var ratio = Math.abs(r.I) / r.spec.inom;
      var spin = (ratio > 0.03 ? (0.55/Math.min(2.5, ratio)) : 6).toFixed(3) + 's';
      var buzz = (ratio > 0.03 ? (0.22/Math.min(3, ratio)) : 0.4).toFixed(3) + 's';
      if(it._lastSpin !== spin){
        it._lastSpin = spin;
        el.style.setProperty('--spin', spin);
        el.style.setProperty('--buzz', buzz);
      }
    }
  });
}

/* จุดไฟวิ่งตามสาย — ทิศ: จากขั้ว + ไป − · ความเร็ว: ตามกระแสจริงในสายเส้นนั้น */

/* กระแสในสายเส้นหนึ่ง — ประมาณจากอุปกรณ์ที่ปลายสองข้าง (สายเป็นตัวนำสมบูรณ์ ปลายเป็นโหนดเดียว ไม่มีแรงดันตก) */
function wireCurrent(sol, w){
  if(!sol || !sol.ok) return 0;
  var a = sol.byItem[w.fromItemId], b = sol.byItem[w.toItemId];
  var ia = a ? Math.abs(a.I) : null;
  var ib = b ? Math.abs(b.I) : null;
  if(ia === null && ib === null) return 0;
  if(ia === null) return ib;
  if(ib === null) return ia;
  return Math.min(ia, ib);
}

/* กระแสมาก = จุดวิ่งเร็ว (เวลาต่อรอบน้อย) · คืน 0 = ไม่มีกระแส */
function flowDuration(amp){
  var mA = Math.abs(amp) * 1000;
  if(mA < 0.05) return 0;
  return Math.max(0.5, Math.min(3.5, 45/mA));
}

function buildFlowDots(){
  var ns = 'http://www.w3.org/2000/svg';
  var svg = document.getElementById('wire-svg');

  /* ลบจุดชุดเก่าออกจากหน้าก่อน ไม่ใช่แค่ทิ้งรายการอ้างอิง ไม่งั้นเรียกซ้ำ (ต่อ/ลบสายระหว่างจ่ายไฟ) จะเหลือจุดเก่าลอยค้าง */
  if(G.flowDots) G.flowDots.forEach(function(d){ d.remove(); });
  G.flowDots = [];

  G.wires.forEach(function(w){
    if(w.virtual) return;    /* รางในแผงสั้นเกินกว่าจะเห็นจุดวิ่ง ใช้ไฮไลต์รางบอกแทน */
    var d = w.pathEl.getAttribute('d');
    if(!d) return;

    var dur = flowDuration(wireCurrent(PowerSim.sol, w));
    PowerSim.dotDur[w.id] = dur;

    /* ทิศไหล: จาก + ไป − · path วาด from→to ถ้าปลาย from ไกลขั้ว + กว่า = ไฟไหลย้อน path */
    var reverse = (portDistFromPlus(w.fromPort) > portDistFromPlus(w.toPort));
    var color = w.color || '#ffd700';

    for(var k=0;k<3;k++){
      var dot = document.createElementNS(ns,'circle');
      dot.setAttribute('r','5');
      dot.setAttribute('fill', color);
      dot.setAttribute('class','flow-dot');
      dot.style.filter = 'drop-shadow(0 0 6px '+color+')';
      dot.style.offsetPath = 'path("'+d+'")';
      dot.style.offsetRotate = '0deg';
      dot._wireId = w.id;
      dot._slot = k;
      applyDotAnim(dot, dur, reverse, k);
      svg.appendChild(dot);
      G.flowDots.push(dot);
    }
  });
}

function applyDotAnim(dot, dur, reverse, slot){
  if(!dur){
    dot.style.animation = 'none';
    dot.style.opacity = '0';
    return;
  }
  dot.style.opacity = '';
  dot.style.animation = (reverse ? 'flow-move-rev' : 'flow-move') + ' ' + dur + 's linear infinite';
  dot.style.animationDelay = (slot * dur / 3) + 's';
  dot._rev = reverse;
}

/* ปรับความเร็วจุดไฟตามกระแสที่เปลี่ยน (เช่นระหว่างประจุ cap)
   เปลี่ยนเฉพาะตอนต่างจากเดิมพอสมควร เพราะตั้ง animation ใหม่จะรีสตาร์ตรอบวิ่ง ปรับทุกเฟรมจุดจะกระตุกอยู่กับที่ */
function updateFlowSpeed(sol){
  if(!G.flowDots || !G.flowDots.length) return;
  var newDur = {};
  G.wires.forEach(function(w){
    if(w.virtual) return;
    newDur[w.id] = flowDuration(wireCurrent(sol, w));
  });

  var changed = {};
  for(var id in newDur){
    var oldD = PowerSim.dotDur[id];
    var nd = newDur[id];
    if(oldD === undefined){ changed[id] = nd; continue; }
    if((oldD === 0) !== (nd === 0)){ changed[id] = nd; continue; }
    if(oldD && Math.abs(nd - oldD)/oldD > 0.3) changed[id] = nd;
  }
  if(!Object.keys(changed).length) return;

  G.flowDots.forEach(function(dot){
    if(!(dot._wireId in changed)) return;
    applyDotAnim(dot, changed[dot._wireId], !!dot._rev, dot._slot || 0);
  });
  for(var id2 in changed) PowerSim.dotDur[id2] = changed[id2];
}

/* หาระยะของ port จากขั้ว + (ใช้กำหนดทิศไหล) — BFS ทะลุอุปกรณ์ */
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

/* เครื่องวัด (Multimeter Probe)
   จิ้มสาย = แรงดันที่จุดนั้นเทียบขั้วลบ + กระแสในสาย · จิ้มอุปกรณ์ = แรงดันตกคร่อม + กระแสผ่าน + กำลัง */
function toggleProbeMode(){
  G.probeMode = !G.probeMode;
  var btn  = document.getElementById('btn-probe');
  var disp = document.getElementById('probe-display');
  var svg  = document.getElementById('wire-svg');
  var ws   = document.getElementById('workspace');

  if(G.probeMode) cancelTapConnect();   /* กันชนกับโหมดต่อสาย */

  btn.classList.toggle('active', G.probeMode);
  disp.style.display = G.probeMode ? 'block' : 'none';
  svg.classList.toggle('probing', G.probeMode);
  document.body.classList.toggle('probe-mode', G.probeMode);

  if(G.probeMode){
    if(ws) ws.addEventListener('click', onProbeItemClick, true);
    showToast('โหมดเครื่องวัด: จิ้มที่สายไฟหรือตัวอุปกรณ์เพื่ออ่านค่า','success');
  } else {
    if(ws) ws.removeEventListener('click', onProbeItemClick, true);
    clearProbeReading();
    showToast('ปิดเครื่องวัด','');
  }
}

function onProbeItemClick(e){
  if(!G.probeMode) return;
  var el = e.target;
  while(el && el !== document.body && !el.classList.contains('ws-item')) el = el.parentElement;
  if(!el || !el.classList || !el.classList.contains('ws-item')) return;
  e.stopPropagation();
  e.preventDefault();
  probeItem(el.id);
}

/* ใช้สถานะล่าสุดของการจำลอง ถ้าไม่ได้จ่ายไฟก็แก้สมการสดแบบคงตัว (cap ประจุเต็ม กั้น DC) */
function currentSolution(){
  if(PowerSim.on && PowerSim.sol && PowerSim.sol.ok) return PowerSim.sol;
  return solveCircuit(G.wsItems, G.wires, {});
}

function probeWire(w){
  PowerSim.target = {type:'wire', ref:w};
  refreshProbeReading();
}
function probeItem(itemId){
  var item = null;
  G.wsItems.forEach(function(it){ if(it.id === itemId) item = it; });
  if(!item) return;
  PowerSim.target = {type:'item', ref:item};
  refreshProbeReading();
}

function refreshProbeReading(){
  var t = PowerSim.target;
  if(!t) return;
  var sol = currentSolution();
  var closed = isClosedCircuit(G.wsItems, G.wires).ok;

  G.wires.forEach(function(x){ x.pathEl.classList.remove('probe-target'); });
  G.wsItems.forEach(function(x){ if(x.el) x.el.classList.remove('probe-target'); });

  var V = 0, I = 0, P = 0, label = '—', note = '', noteOk = true;

  if(t.type === 'wire'){
    var w = t.ref;
    if(!w.pathEl || !document.body.contains(w.pathEl)){ PowerSim.target = null; return; }
    w.pathEl.classList.add('probe-target');
    var v = nodeVoltageAt(sol, w.fromPort);
    V = (v === null) ? 0 : v;
    I = wireCurrent(sol, w);
    P = 0;
    label = 'สายไฟ · ' + (w.color === '#ff4444' ? 'ฝั่งขั้วบวก'
                        : w.color === '#00aaff' ? 'ฝั่งขั้วลบ' : 'กลางวงจร');
    note = closed ? 'แรงดันที่จุดนี้ เทียบกับขั้วลบของแหล่งจ่าย'
                  : 'วงจรยังไม่ปิด — ไม่มีกระแสไหล';
    noteOk = closed;
  } else {
    var it = t.ref;
    if(!it.el || !document.body.contains(it.el)){ PowerSim.target = null; return; }
    it.el.classList.add('probe-target');
    var r = sol.byItem[it.id];
    var dev = DEVICES[it.deviceId];
    label = dev.name;
    /* บอกค่าจริงของชิ้นที่วัดด้วย (ตัวต้านทานตั้งค่าเองได้ / cap มีค่าความจุ) ไม่งั้นวางหลายชิ้นอ่านไม่รู้ว่าชิ้นไหน */
    label += deviceSpecLabel(it);
    if(r){
      V = r.V; I = r.I; P = r.P;
      var sp = r.spec;
      if(sp.kind === 'source'){
        note = 'แรงดันที่ขั้ว (ต่ำกว่า EMF ' + sp.volt + 'V เพราะความต้านทานภายใน)';
      } else if(sp.kind === 'diode' && Math.abs(I) < 1e-5){
        note = 'ยังไม่นำกระแส — แรงดันคร่อมยังไม่ถึงเกณฑ์ประมาณ ' + sp.vf + 'V';
        noteOk = false;
      } else if(sp.imax && Math.abs(I) > sp.imax*0.85){
        note = 'กระแสใกล้พิกัดสูงสุด (' + fmtCurrent(sp.imax) + ') — เสี่ยงไหม้';
        noteOk = false;
      } else if(sp.kind === 'cap'){
        note = 'ประจุอยู่ ' + fmtVolt(V) + ' — ยิ่งประจุเต็ม กระแสยิ่งลดลง';
      } else {
        note = 'แรงดันตกคร่อมตัวมัน และกระแสที่ไหลผ่าน';
      }
    } else {
      note = 'อุปกรณ์นี้เป็นตัวนำล้วน (ไม่มีแรงดันตกคร่อม)';
    }
  }

  document.getElementById('probe-target').textContent  = label;
  document.getElementById('probe-voltage').textContent = fmtVolt(V);
  document.getElementById('probe-current').textContent = fmtCurrent(I);
  document.getElementById('probe-power').textContent   = fmtPower(P);

  var hint = document.getElementById('probe-hint');
  hint.textContent = (noteOk ? '✓ ' : '⚠ ') + note;
  hint.style.color = noteOk ? '#0a6' : '#f80';
}

function clearProbeReading(){
  PowerSim.target = null;
  G.wires.forEach(function(w){
    if(w.pathEl) w.pathEl.classList.remove('probe-target');
  });
  G.wsItems.forEach(function(it){ if(it.el) it.el.classList.remove('probe-target'); });
  document.getElementById('probe-target').textContent  = 'ยังไม่ได้เลือก';
  document.getElementById('probe-voltage').textContent = '-- V';
  document.getElementById('probe-current').textContent = '-- mA';
  document.getElementById('probe-power').textContent   = '-- mW';
  var hint = document.getElementById('probe-hint');
  hint.textContent = 'จิ้มที่สายไฟหรือตัวอุปกรณ์เพื่อวัด';
  hint.style.color = '';
}

/* รายงานค่าไฟฟ้าของทั้งวงจร — แสดงตอนผ่านด่าน ให้ผู้เรียนเห็นตัวเลขจริงของวงจรที่ตัวเองต่อ */
function buildCircuitReport(){
  /* ใช้ผลล่าสุดของการจำลองที่เดินอยู่ ตัวเลขจะตรงกับที่เห็นบนจอตอนนั้นเป๊ะ (สำคัญกับวงจร RC ที่ค่าเปลี่ยนตามเวลา) */
  var sol = currentSolution();
  if(!sol.ok) return '';

  var rows = '';
  G.wsItems.forEach(function(it){
    var r = sol.byItem[it.id];
    if(!r) return;
    var dev = DEVICES[it.deviceId];
    var extra = '';
    if(r.spec.pnom || r.spec.inom){
      var pct = Math.round(deviceIntensity(r) * 100);
      extra = '<span class="rep-bar"><i style="width:' + pct + '%"></i></span>';
    }
    rows += '<tr><td>' + dev.name + deviceSpecLabel(it) + '</td>'
          + '<td>' + fmtVolt(r.V) + '</td>'
          + '<td>' + fmtCurrent(r.I) + '</td>'
          + '<td>' + fmtPower(r.P) + '</td>'
          + '<td>' + extra + '</td></tr>';
  });
  if(!rows) return '';

  /* วงจรมี cap ค่าจะเปลี่ยนเรื่อยๆ ระหว่างประจุ ต้องบอก ไม่งั้นผู้เรียนงงว่าทำไมเลขไม่ตรงกับที่เห็นทีหลัง */
  var hasCap = false;
  G.wsItems.forEach(function(it){ if(it.deviceId === 'capacitor') hasCap = true; });
  var capNote = hasCap
    ? '<div class="report-sum">วงจรนี้มีตัวเก็บประจุ — กระแสจะค่อย ๆ ลดลงจนหยุดเมื่อประจุเต็ม '
      + 'นี่คือ "การหน่วงเวลา" ของวงจร RC</div>'
    : '';

  return '<div class="report-box">'
       + '<div class="report-title">ค่าที่วัดได้จริงจากวงจรนี้</div>'
       + '<table class="report-tbl">'
       + '<tr><th>อุปกรณ์</th><th>แรงดัน</th><th>กระแส</th><th>กำลังไฟ</th><th>กำลัง/พิกัด</th></tr>'
       + rows + '</table>'
       + '<div class="report-sum">แหล่งจ่ายจ่ายกระแสรวม <b>' + fmtCurrent(sol.supplyI)
       + '</b> · กำลังไฟรวม <b>' + fmtPower(sol.supplyP) + '</b></div>'
       + capNote
       + '</div>';
}
