/* SOLVER — เครื่องจำลองวงจรจริง (Nodal Analysis) แบบเดียวกับที่ SPICE ใช้
   (ของเดิมบวก ohm ทุกชิ้น ถูกเฉพาะอนุกรม พอขนาน (ด่าน 11-13) ค่าผิด)
   ขั้นตอน: 1) รวมจุดที่ต่อถึงกันเป็น "โหนด"  2) แปลงอุปกรณ์เป็นความนำ G + แหล่งจ่ายกระแส (นอร์ตัน)
   3) ตั้งสมการ G·V = I (เคอร์ชฮอฟฟ์) แก้ด้วยการกำจัดแบบเกาส์  4) ไดโอด/LED ไม่เชิงเส้น วนแก้นิวตัน-ราฟสัน
   ผล: แรงดันทุกโหนด + กระแส/แรงดันตก/กำลังของทุกตัว เอาไปใช้คิดความสว่าง มอเตอร์ เครื่องวัด การพัง */

var SIM = {
  VT: 0.02585,     /* แรงดันความร้อน kT/q ที่อุณหภูมิห้อง */
  GMIN: 1e-12,     /* ความนำน้อยๆ คร่อมทุกโหนดลงกราวด์ กันเมทริกซ์เอกฐานเมื่อมีวงจรลอย */
  MAXIT: 80        /* รอบสูงสุดของนิวตัน-ราฟสัน */
};

/* 1) รวมจุดขั้วเป็นโหนด (Union-Find) */
function buildNodes(items, wires){
  var parent = new Map();

  function find(p){
    var r = p;
    while(parent.get(r) !== r) r = parent.get(r);
    while(parent.get(p) !== r){ var nx = parent.get(p); parent.set(p, r); p = nx; }  /* ย่นเส้นทาง */
    return r;
  }
  function union(a,b){
    var ra = find(a), rb = find(b);
    if(ra !== rb) parent.set(ra, rb);
  }

  var portsOf = new Map();
  items.forEach(function(it){
    if(!it.el) return;
    var ps = Array.prototype.slice.call(it.el.querySelectorAll('.port'));
    portsOf.set(it.id, ps);
    ps.forEach(function(p){ parent.set(p, p); });
  });

  /* จุดยึดสายที่เสียบรูเบรดบอร์ดก็เป็นจุดต่อ แต่ไม่สังกัดอุปกรณ์ เลยไม่ถูกเก็บด้านบน
     ไม่ใส่เข้ามา union() จะข้ามสายที่ปลายเสียบรู (ดู bbAnchorAt — จุดยึดเป็นแค่โหนด ไม่เพิ่มความต้านทาน) */
  document.querySelectorAll('#workspace .bb-anchor').forEach(function(p){
    if(!parent.has(p)) parent.set(p, p);
  });

  /* สายไฟ (รวมรางเบรดบอร์ดที่ระบบสร้างให้) = ต่อถึงกัน */
  wires.forEach(function(w){
    if(parent.has(w.fromPort) && parent.has(w.toPort)) union(w.fromPort, w.toPort);
  });

  /* อุปกรณ์ชนิด bus (สายไฟ/แผง) ทุกขาถึงกันหมดในตัว */
  items.forEach(function(it){
    var sp = ESPEC[it.deviceId];
    if(!sp || sp.kind !== 'bus') return;
    var ps = portsOf.get(it.id) || [];
    for(var i=1;i<ps.length;i++) union(ps[0], ps[i]);
  });

  var idx = new Map(), nodeOf = new Map(), n = 0;
  parent.forEach(function(_, p){
    var r = find(p);
    if(!idx.has(r)) idx.set(r, n++);
    nodeOf.set(p, idx.get(r));
  });

  return { nodeOf:nodeOf, portsOf:portsOf, count:n };
}

/* ขั้ว 2 ข้าง — a คือขั้วบวก (ยึดตาม dev.pos/neg ไม่เปลี่ยนตอนหมุน)
   ทรานซิสเตอร์ใช้ขาซ้าย-ขวาเป็นทางหลัก (ขาล่าง = ขาควบคุม) */
function deviceTerminals(it, ports){
  var dev = DEVICES[it.deviceId];
  if(!ports || ports.length < 2) return null;
  if(dev.polarized){
    var a=null, b=null;
    ports.forEach(function(p){
      if(p.dataset.origPos === dev.pos) a = p;
      else if(p.dataset.origPos === dev.neg) b = p;
    });
    if(a && b) return {a:a, b:b};
  }
  return {a:ports[0], b:ports[1]};
}

/* 2) แก้ระบบสมการ A·x = b (กำจัดแบบเกาส์ + เลือกตัวหลัก) */
function solveLinear(A, b, n){
  for(var i=0;i<n;i++){
    var best = Math.abs(A[i][i]), piv = i;
    for(var k=i+1;k<n;k++){
      var v = Math.abs(A[k][i]);
      if(v > best){ best = v; piv = k; }
    }
    if(best < 1e-20) return null;          /* เอกฐาน — ไม่มีคำตอบเดียว */
    if(piv !== i){
      var t = A[i]; A[i] = A[piv]; A[piv] = t;
      var tb = b[i]; b[i] = b[piv]; b[piv] = tb;
    }
    var d = A[i][i];
    for(var r=i+1;r<n;r++){
      var f = A[r][i] / d;
      if(!f) continue;
      for(var c=i;c<n;c++) A[r][c] -= f * A[i][c];
      b[r] -= f * b[i];
    }
  }
  var x = new Array(n);
  for(var i2=n-1;i2>=0;i2--){
    var s = b[i2];
    for(var j=i2+1;j<n;j++) s -= A[i2][j] * x[j];
    x[i2] = s / A[i2][i2];
  }
  return x;
}

/* จำกัดการกระโดดของแรงดันไดโอดต่อรอบ ไม่งั้น e^(V/nVt) ระเบิดเป็น Infinity ตั้งแต่รอบแรก (วิธี pnjlim ของ SPICE) */
function limitDiodeV(vnew, vold, vth, vcrit){
  if(vnew > vcrit && Math.abs(vnew - vold) > 2*vth){
    if(vold > 0){
      var arg = 1 + (vnew - vold)/vth;
      vnew = (arg > 0) ? vold + vth*Math.log(arg) : vcrit;
    } else {
      vnew = (vnew > 0) ? vth*Math.log(vnew/vth) : vcrit;
    }
  }
  return Math.min(vnew, 3.0);
}

/* 3) แก้วงจร
      opts.dt   = ก้าวเวลา (วิ) ใส่เมื่อจำลองการประจุ cap ตามเวลา / ไม่ใส่ = สภาวะคงตัว
      opts.capV = แรงดันคร่อม cap จากก้าวก่อนหน้า {itemId: โวลต์} */
function solveCircuit(items, wires, opts){
  opts = opts || {};
  var dt   = opts.dt || 0;
  var capV = opts.capV || {};

  var res = {
    ok:false, byItem:{}, nodeV:[], nodeOf:null,
    supplyI:0, supplyP:0, maxI:0, hasSource:false, transient:!!dt
  };
  /* อุปกรณ์ตัวเดียวก็เป็นวงจรได้ถ้ามีสายลัดขั้วมันเอง = ลัดวงจรอันตรายที่เกมต้องสอน
     (ของเดิมตัดทิ้งที่ < 2 ระบบเตือนอันตรายเลยมองไม่เห็น) */
  if(!items || items.length < 1) return res;

  var nb = buildNodes(items, wires);
  if(!nb.count) return res;

  /* --- สร้างรายการ "กิ่ง" จากอุปกรณ์แต่ละตัว --- */
  var nNodes = nb.count;
  var branches = [];
  items.forEach(function(it){
    /* itemSpec() ไม่ใช่ ESPEC ตรงๆ — ตัวต้านทานที่ตั้งค่าเองในโหมดอิสระใช้ค่าของชิ้นนั้น */
    var sp = itemSpec(it);
    if(!sp || sp.kind === 'bus') return;
    var ports = nb.portsOf.get(it.id);
    var tm = deviceTerminals(it, ports);
    if(!tm) return;
    var a = nb.nodeOf.get(tm.a), b = nb.nodeOf.get(tm.b);
    if(a === undefined || b === undefined) return;

    /* อุปกรณ์ที่ไหม้ไปแล้ว = ขาดใน (วงจรเปิด) นี่คือต้นเหตุการลามจริง: หลอดอนุกรมขาดดวงเดียว ดับทั้งวง */
    var br = { it:it, spec:sp, a:a, b:b, aPort:tm.a, bPort:tm.b, dead:!!it.failed };
    if(sp.kind === 'diode'){
      /* ไดโอดมี rs ในตัว ต้องมีโหนดภายในคั่น: a ── rs ── mid ── (รอยต่อ pn) ── b */
      br.mid  = nNodes++;
      br.vth  = (sp.n || 1) * SIM.VT;
      br.is   = (sp.inom || 0.02) * Math.exp(-(sp.vf || 0.7) / br.vth);
      br.vcrit= br.vth * Math.log(br.vth / (Math.SQRT2 * br.is));
      br.vd   = 0.5 * (sp.vf || 0.7);   /* ค่าเริ่มต้นของการวนแก้ */
    }
    if(sp.kind === 'source') res.hasSource = true;
    branches.push(br);
  });
  if(!branches.length) return res;

  /* กราวด์ = ขั้วลบของแหล่งจ่ายตัวแรก (ให้ตัวเลขแรงดันตรงกับที่วัดด้วยมิเตอร์จริง) */
  var ground = 0;
  for(var g=0; g<branches.length; g++){
    if(branches[g].spec.kind === 'source'){ ground = branches[g].b; break; }
  }

  /* ความนำของอุปกรณ์ที่ไม่ใช่ไดโอด ณ สถานะปัจจุบัน */
  function conductance(br){
    var sp = br.spec, it = br.it;
    if(br.dead) return 0;          /* พังแล้ว = ขาดใน */
    switch(sp.kind){
      case 'source': return 1 / sp.rint;
      case 'switch': return it.open  ? 0 : 1 / sp.ron;
      case 'fuse':   return it.blown ? 0 : 1 / sp.ron;
      case 'cap':
        /* คงตัว: cap กั้น DC เหลือแต่กระแสรั่ว / จำลองตามเวลา: แทนด้วยความนำ C/dt */
        return (dt > 0 ? sp.c/dt : 0) + 1/sp.rleak;
      case 'meter':  return 1 / sp.r;
      default:       return 1 / Math.max(1e-4, sp.r);
    }
  }

  var x = null, iter = 0;
  for(iter=0; iter<SIM.MAXIT; iter++){
    var A = [], b = new Array(nNodes);
    for(var i=0;i<nNodes;i++){
      A.push(new Float64Array(nNodes));
      b[i] = 0;
    }
    for(var d0=0; d0<nNodes; d0++) A[d0][d0] += SIM.GMIN;

    branches.forEach(function(br){
      var sp = br.spec;

      if(sp.kind === 'diode'){
        if(br.dead){                             /* ไดโอด/LED ที่ไหม้ = ขาดใน */
          A[br.a][br.a] += SIM.GMIN; A[br.b][br.b] += SIM.GMIN;
          return;
        }
        var gs = 1 / sp.rs;                      /* ความต้านทานอนุกรม */
        A[br.a][br.a] += gs; A[br.mid][br.mid] += gs;
        A[br.a][br.mid] -= gs; A[br.mid][br.a] -= gs;

        /* เชิงเส้นรอบจุดทำงาน (นิวตัน): I = Is·(e^(vd/vth)−1), gd = dI/dV, Ieq = I − gd·vd */
        var ex = Math.exp(Math.min(br.vd / br.vth, 80));
        var id = br.is * (ex - 1);
        var gd = br.is / br.vth * ex + SIM.GMIN;
        var ieq = id - gd * br.vd;

        A[br.mid][br.mid] += gd; A[br.b][br.b] += gd;
        A[br.mid][br.b] -= gd;   A[br.b][br.mid] -= gd;
        b[br.mid] -= ieq;  b[br.b] += ieq;
        return;
      }

      var gg = conductance(br);
      A[br.a][br.a] += gg; A[br.b][br.b] += gg;
      A[br.a][br.b] -= gg; A[br.b][br.a] -= gg;

      if(sp.kind === 'source'){
        /* นอร์ตัน: แหล่งจ่าย V + rint = แหล่งจ่ายกระแส V/rint ขนาน rint (พังแล้วจ่ายไม่ได้) */
        var isrc = br.dead ? 0 : (sp.volt / sp.rint);
        b[br.a] += isrc; b[br.b] -= isrc;
      } else if(sp.kind === 'cap' && dt > 0 && !br.dead){
        /* กระแสสมมูลจากประจุที่ค้างใน cap (ตัวที่ระเบิดแล้วต้องไม่จ่าย ไม่งั้นกลายเป็นแหล่งจ่ายผี) */
        var vprev = capV[br.it.id] || 0;
        var ic = (sp.c/dt) * vprev;
        b[br.a] += ic; b[br.b] -= ic;
      }
    });

    /* ตรึงกราวด์ = 0 V */
    for(var c2=0;c2<nNodes;c2++) A[ground][c2] = 0;
    A[ground][ground] = 1; b[ground] = 0;

    x = solveLinear(A, b, nNodes);
    if(!x) return res;

    /* ปรับแรงดันไดโอดสำหรับรอบถัดไป */
    var done = true;
    for(var k=0;k<branches.length;k++){
      var br2 = branches[k];
      if(br2.spec.kind !== 'diode') continue;
      var vnew = limitDiodeV(x[br2.mid] - x[br2.b], br2.vd, br2.vth, br2.vcrit);
      if(Math.abs(vnew - br2.vd) > 1e-7) done = false;
      br2.vd = vnew;
    }
    if(done) break;
  }
  if(!x) return res;

  /* --- อ่านผลลัพธ์เป็นค่าต่ออุปกรณ์ --- */
  res.ok = true;
  res.iter = iter;
  res.nodeV = x;
  res.nodeOf = nb.nodeOf;
  res.capV = {};

  branches.forEach(function(br){
    var sp = br.spec, I, V;
    if(br.dead){
      V = x[br.a] - x[br.b];     /* พังแล้วไม่มีกระแส แต่ยังมีแรงดันคร่อมให้วัดได้ (เหมือนจริง) */
      I = 0;
      if(sp.kind === 'cap') res.capV[br.it.id] = V;
    } else if(sp.kind === 'diode'){
      I = br.is * (Math.exp(Math.min(br.vd/br.vth, 80)) - 1);
      V = x[br.a] - x[br.b];
    } else {
      V = x[br.a] - x[br.b];
      if(sp.kind === 'source'){
        I = (sp.volt - V) / sp.rint;          /* กระแสที่จ่ายออก = (EMF − แรงดันขั้ว)/rint */
        res.supplyP += Math.abs(I * V);       /* กำลังบวกกันได้ แต่กระแสบวกไม่ได้ (ดู supplyI ท้ายฟังก์ชัน) */
      } else if(sp.kind === 'cap'){
        I = (dt > 0) ? (sp.c/dt) * (V - (capV[br.it.id]||0)) : V/sp.rleak;
        res.capV[br.it.id] = V;
      } else {
        I = V * conductance(br);
      }
    }
    if(!isFinite(I)) I = 0;
    if(!isFinite(V)) V = 0;

    res.byItem[br.it.id] = {
      deviceId: br.it.deviceId,
      I: I, V: V, P: Math.abs(I*V),
      spec: sp,
      vPlus:  x[br.a], vMinus: x[br.b],
      aPort:  br.aPort, bPort: br.bPort
    };
    if(sp.kind !== 'source') res.maxI = Math.max(res.maxI, Math.abs(I));

    /* กระแสสูงสุดที่ไหลผ่านจุดใดจุดหนึ่ง รวมแหล่งจ่าย — ห้ามบวกกระแสแหล่งจ่ายทุกตัว
       (ถ่านอนุกรม 2 ก้อน กระแสก้อนเดียวไหลผ่านทั้งคู่ บวกกันจะได้ 2 เท่า สายไฟเลยถูกตัดสินผิด)
       ใช้ค่าสูงสุดแทน ถูกทั้งอนุกรม (เท่ากันทุกตัว) และขนาน (แหล่งจ่ายรับรวมทุกสาขา) */
    res.supplyI = Math.max(res.supplyI, Math.abs(I));
  });

  return res;
}

/* ตัวช่วยอ่านผล — ใช้ร่วมกันทั้งเครื่องวัด ความเสียหาย และภาพ */

/* ความสว่าง/ความแรง 0..1 (ยกกำลัง 0.4 เพราะตาคนรับรู้ความสว่างแบบลอการิทึม หลอดได้กำลังครึ่งยังดูสว่าง ~76%) */
function deviceIntensity(r){
  if(!r) return 0;
  var sp = r.spec;
  if(!sp) return 0;
  var x = 0;
  /* ไล่ตามค่าที่สื่อความหมายที่สุดของอุปกรณ์ชนิดนั้น (เดิมมีแค่ 2 ทางแรก อีก 10 ชนิดเลยคืน 0 ทั้งที่มีไฟจริง)
     cap คิดจากประจุที่เก็บ ไม่ใช่กระแส (กระแสแรงตอนเริ่มชาร์จแล้วเป็น 0 ตอนเต็ม = กลับหัวความจริง) */
  if(sp.kind === 'cap')  x = Math.abs(r.V) / (sp.vmax || 16);
  else if(sp.pnom)       x = r.P / sp.pnom;               /* โหลดที่มีพิกัดเต็มที่ (หลอด/LED) */
  else if(sp.inom)       x = Math.abs(r.I) / sp.inom;     /* กระแสพิกัด (มอเตอร์/บัซเซอร์/ไดโอด) */
  else if(sp.irate)      x = Math.abs(r.I) / sp.irate;    /* ฟิวส์ เทียบพิกัดตัด */
  else if(sp.pmax)       x = r.P / sp.pmax;               /* ตัวต้านทาน/LDR/ทรานซิสเตอร์ ร้อนตามกำลัง */
  else if(sp.imax)       x = Math.abs(r.I) / sp.imax;     /* แหล่งจ่าย เทียบพิกัดตัวเอง */
  else if(sp.ron != null) x = Math.abs(r.I) / 0.5;        /* สวิตช์ ไม่มีพิกัด อ้างกระแสหยาบๆ */
  else return 0;
  if(x <= 0) return 0;
  return Math.max(0, Math.min(1, Math.pow(x, 0.4)));
}

/* จัดรูปกระแสให้อ่านง่าย (µA / mA / A) */
function fmtCurrent(amp){
  var a = Math.abs(amp);
  if(a < 1e-6)  return '0 mA';
  if(a < 1e-3)  return (a*1e6).toFixed(0) + ' µA';
  if(a < 1)     return (a*1e3).toFixed(a*1e3 < 10 ? 2 : 1) + ' mA';
  return a.toFixed(2) + ' A';
}
function fmtVolt(v){
  var a = Math.abs(v);
  return (a < 1 ? a.toFixed(3) : a.toFixed(2)) + ' V';
}
function fmtPower(p){
  var a = Math.abs(p);
  if(a < 1e-3) return (a*1e6).toFixed(0) + ' µW';
  if(a < 1)    return (a*1e3).toFixed(1) + ' mW';
  return a.toFixed(2) + ' W';
}

/* แรงดัน ณ จุดขั้วหนึ่ง (เทียบขั้วลบของแหล่งจ่าย) */
function nodeVoltageAt(sol, portEl){
  if(!sol || !sol.ok || !sol.nodeOf) return null;
  var n = sol.nodeOf.get(portEl);
  if(n === undefined) return null;
  return sol.nodeV[n];
}
