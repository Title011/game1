/* ============================================================
   SOLVER — เครื่องจำลองวงจรไฟฟ้าจริง (Nodal Analysis)

   ของเดิมคิดกระแสแบบ "เอา ohm ของทุกชิ้นมาบวกกัน" ซึ่งถูกเฉพาะ
   วงจรอนุกรมเท่านั้น พอเป็นวงจรขนาน (ด่าน 11-13) ค่าที่ได้จะผิด
   และไม่มีทางแสดงให้เห็นว่า "ขนานแล้วแต่ละหลอดสว่างเท่าเดิม"

   ไฟล์นี้แก้สมการวงจรจริงแบบเดียวกับที่โปรแกรม SPICE ใช้:

     1. รวมจุดขั้วที่ต่อถึงกันด้วยสายไฟ (และรางในเบรดบอร์ด)
        ให้เป็น "โหนด" เดียวกัน — จุดที่ต่อถึงกันมีศักย์เท่ากัน
     2. แปลงอุปกรณ์ทุกตัวเป็นความนำไฟฟ้า (G) + แหล่งจ่ายกระแส (I)
        แหล่งจ่ายแรงดันแปลงเป็นแหล่งจ่ายกระแสด้วยทฤษฎีของนอร์ตัน
        (ทำได้เพราะแหล่งจ่ายจริงมีความต้านทานภายในเสมอ)
     3. ตั้งสมการ  G·V = I  ตามกฎกระแสของเคอร์ชฮอฟฟ์ แล้วแก้ด้วย
        การกำจัดแบบเกาส์
     4. ไดโอด/LED ไม่เป็นเชิงเส้น จึงวนแก้ซ้ำแบบนิวตัน-ราฟสัน
        จนค่าลงตัว (ทำให้ได้แรงดันเกณฑ์ + นำไฟทางเดียวจริง ๆ)

   ผลที่ได้: แรงดันทุกโหนด และกระแส/แรงดันตก/กำลังไฟของทุกอุปกรณ์
   ซึ่งเอาไปใช้ต่อได้ทั้งความสว่าง ความเร็วมอเตอร์ เครื่องวัด
   และการพังของอุปกรณ์
   ============================================================ */

var SIM = {
  VT: 0.02585,     /* แรงดันความร้อน kT/q ที่อุณหภูมิห้อง */
  GMIN: 1e-12,     /* ความนำน้อย ๆ คร่อมทุกโหนดลงกราวด์
                      กันเมทริกซ์เอกฐานเมื่อมีวงจรที่ลอยอยู่ */
  MAXIT: 80        /* จำนวนรอบสูงสุดของนิวตัน-ราฟสัน */
};

/* ============================================================
   1) รวมจุดขั้วเป็นโหนด (Union-Find)
   ============================================================ */
function buildNodes(items, wires){
  var parent = new Map();

  function find(p){
    var r = p;
    while(parent.get(r) !== r) r = parent.get(r);
    /* ย่นเส้นทางไว้ ครั้งต่อไปจะเร็วขึ้น */
    while(parent.get(p) !== r){ var nx = parent.get(p); parent.set(p, r); p = nx; }
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

  /* สายไฟ (รวมรางในเบรดบอร์ดที่ระบบสร้างให้เอง) = ต่อถึงกัน */
  wires.forEach(function(w){
    if(parent.has(w.fromPort) && parent.has(w.toPort)) union(w.fromPort, w.toPort);
  });

  /* อุปกรณ์ชนิด bus (สายไฟ/แผงต่อวงจร) ทุกขาถึงกันหมดในตัวเอง */
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

/* ขั้ว 2 ข้างของอุปกรณ์ — a คือด้านที่ถือเป็น "ขาเข้า/ขั้วบวก"
   อุปกรณ์มีขั้วยึดตาม dev.pos/dev.neg ที่ไม่เปลี่ยนตอนหมุน
   ทรานซิสเตอร์ใช้ขาซ้าย-ขวาเป็นทางเดินหลัก (ขาล่างคือขาควบคุม) */
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

/* ============================================================
   2) แก้ระบบสมการเชิงเส้น A·x = b (กำจัดแบบเกาส์ + เลือกตัวหลัก)
   ============================================================ */
function solveLinear(A, b, n){
  for(var i=0;i<n;i++){
    var best = Math.abs(A[i][i]), piv = i;
    for(var k=i+1;k<n;k++){
      var v = Math.abs(A[k][i]);
      if(v > best){ best = v; piv = k; }
    }
    if(best < 1e-20) return null;          /* เอกฐาน — วงจรไม่มีคำตอบเดียว */
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

/* จำกัดการกระโดดของแรงดันไดโอดในแต่ละรอบนิวตัน
   ถ้าไม่จำกัด e^(V/nVt) จะระเบิดเป็น Infinity ตั้งแต่รอบแรก
   (วิธีเดียวกับฟังก์ชัน pnjlim ของ SPICE) */
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

/* ============================================================
   3) แก้วงจร
      opts.dt   = ก้าวเวลา (วินาที) — ใส่ค่าเมื่อต้องการจำลองการประจุ
                  ของตัวเก็บประจุตามเวลาจริง, ไม่ใส่ = สภาวะคงตัว
      opts.capV = แรงดันคร่อมตัวเก็บประจุจากก้าวเวลาก่อนหน้า
                  {itemId: โวลต์}
   ============================================================ */
function solveCircuit(items, wires, opts){
  opts = opts || {};
  var dt   = opts.dt || 0;
  var capV = opts.capV || {};

  var res = {
    ok:false, byItem:{}, nodeV:[], nodeOf:null,
    supplyI:0, supplyP:0, maxI:0, hasSource:false, transient:!!dt
  };
  /* อุปกรณ์ตัวเดียวก็เป็นวงจรได้ ถ้ามีสายลัดขั้วมันเข้าหากันเอง
     ซึ่งเป็นการลัดวงจรที่อันตรายที่สุดแบบหนึ่ง และเป็นสิ่งที่เกมนี้ต้องสอน
     ของเดิมตัดทิ้งตั้งแต่ items.length < 2 ระบบเตือนอันตรายจึงมองไม่เห็นเลย */
  if(!items || items.length < 1) return res;

  var nb = buildNodes(items, wires);
  if(!nb.count) return res;

  /* --- สร้างรายการ "กิ่ง" ของวงจรจากอุปกรณ์แต่ละตัว --- */
  var nNodes = nb.count;
  var branches = [];
  items.forEach(function(it){
    var sp = ESPEC[it.deviceId];
    if(!sp || sp.kind === 'bus') return;
    var ports = nb.portsOf.get(it.id);
    var tm = deviceTerminals(it, ports);
    if(!tm) return;
    var a = nb.nodeOf.get(tm.a), b = nb.nodeOf.get(tm.b);
    if(a === undefined || b === undefined) return;

    /* อุปกรณ์ที่ไหม้/ระเบิดไปแล้ว = ขาดใน กลายเป็นวงจรเปิด
       นี่คือต้นเหตุของ "การลามต่อ" ที่เหมือนจริง: หลอดอนุกรมขาดดวงเดียว
       ทั้งวงดับหมด เหมือนไฟประดับรุ่นเก่า */
    var br = { it:it, spec:sp, a:a, b:b, aPort:tm.a, bPort:tm.b, dead:!!it.failed };
    if(sp.kind === 'diode'){
      /* ไดโอดมีความต้านทานอนุกรมในตัว ต้องมีโหนดภายในคั่น
         a ── rs ── mid ── (รอยต่อ pn) ── b */
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

  /* เลือกจุดอ้างอิง (กราวด์) = ขั้วลบของแหล่งจ่ายตัวแรก
     ตัวเลขแรงดันที่อ่านได้จะได้ตรงกับที่วัดด้วยมิเตอร์จริง */
  var ground = 0;
  for(var g=0; g<branches.length; g++){
    if(branches[g].spec.kind === 'source'){ ground = branches[g].b; break; }
  }

  /* ความนำของอุปกรณ์ที่ไม่ใช่ไดโอด ณ สถานะปัจจุบัน */
  function conductance(br){
    var sp = br.spec, it = br.it;
    if(br.dead) return 0;          /* พังแล้ว = ขาดใน ไฟไม่ผ่าน */
    switch(sp.kind){
      case 'source': return 1 / sp.rint;
      case 'switch': return it.open  ? 0 : 1 / sp.ron;
      case 'fuse':   return it.blown ? 0 : 1 / sp.ron;
      case 'cap':
        /* สภาวะคงตัว: ตัวเก็บประจุกั้นไฟตรง เหลือแต่กระแสรั่วนิดเดียว
           จำลองตามเวลา: แทนด้วยความนำ C/dt (แบบจำลองประจุ) */
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
        if(br.dead){                             /* LED/ไดโอดที่ไหม้ไปแล้ว = ขาดใน */
          A[br.a][br.a] += SIM.GMIN; A[br.b][br.b] += SIM.GMIN;
          return;
        }
        var gs = 1 / sp.rs;                      /* ความต้านทานอนุกรม */
        A[br.a][br.a] += gs; A[br.mid][br.mid] += gs;
        A[br.a][br.mid] -= gs; A[br.mid][br.a] -= gs;

        /* เชิงเส้นรอบจุดทำงานปัจจุบัน (นิวตัน-ราฟสัน)
           I  = Is·(e^(vd/vth) − 1)
           gd = dI/dV = Is/vth · e^(vd/vth)
           Ieq = I − gd·vd  (แหล่งจ่ายกระแสสมมูล) */
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
        /* นอร์ตัน: แหล่งจ่ายแรงดัน V ที่มีความต้านทานใน rint
           = แหล่งจ่ายกระแส V/rint ขนานกับ rint
           แหล่งจ่ายที่พังแล้ว (ร้อนจัดจนเสีย) จ่ายไฟไม่ได้อีก */
        var isrc = br.dead ? 0 : (sp.volt / sp.rint);
        b[br.a] += isrc; b[br.b] -= isrc;
      } else if(sp.kind === 'cap' && dt > 0 && !br.dead){
        /* กระแสสมมูลจากประจุที่ค้างอยู่ในตัวเก็บประจุ
           ตัวที่ระเบิดไปแล้วต้องไม่จ่ายอะไรออกมาอีก ไม่งั้นมันจะกลาย
           เป็นแหล่งจ่ายผีที่ดันไฟต่อจนอุปกรณ์อื่นพังตามแบบไม่มีเหตุผล */
        var vprev = capV[br.it.id] || 0;
        var ic = (sp.c/dt) * vprev;
        b[br.a] += ic; b[br.b] -= ic;
      }
    });

    /* ตรึงจุดอ้างอิงให้เป็น 0 โวลต์ */
    for(var c2=0;c2<nNodes;c2++) A[ground][c2] = 0;
    A[ground][ground] = 1; b[ground] = 0;

    x = solveLinear(A, b, nNodes);
    if(!x) return res;

    /* ปรับค่าแรงดันไดโอดสำหรับรอบถัดไป */
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

  /* --- อ่านผลลัพธ์ออกมาเป็นค่าต่ออุปกรณ์ --- */
  res.ok = true;
  res.iter = iter;
  res.nodeV = x;
  res.nodeOf = nb.nodeOf;
  res.capV = {};

  branches.forEach(function(br){
    var sp = br.spec, I, V;
    if(br.dead){
      /* พังแล้วไม่มีกระแสผ่าน แต่ยังมีแรงดันคร่อมให้วัดได้ (เหมือนของจริง) */
      V = x[br.a] - x[br.b];
      I = 0;
      if(sp.kind === 'cap') res.capV[br.it.id] = V;
    } else if(sp.kind === 'diode'){
      I = br.is * (Math.exp(Math.min(br.vd/br.vth, 80)) - 1);
      V = x[br.a] - x[br.b];
    } else {
      V = x[br.a] - x[br.b];
      if(sp.kind === 'source'){
        /* กระแสที่ "จ่ายออก" จากแหล่งจ่าย = (EMF − แรงดันที่ขั้ว)/rint */
        I = (sp.volt - V) / sp.rint;
        /* กำลังไฟบวกกันได้ แหล่งจ่ายหลายตัวก็ช่วยกันจ่ายกำลังจริง ๆ
           แต่ "กระแส" บวกกันไม่ได้ ดูที่ res.supplyI ท้ายฟังก์ชัน */
        res.supplyP += Math.abs(I * V);
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

    /* กระแสสูงสุดที่ไหลผ่าน "จุดใดจุดหนึ่ง" ของวงจร รวมตัวแหล่งจ่ายด้วย
       ห้ามบวกกระแสของแหล่งจ่ายทุกตัวเข้าด้วยกันเด็ดขาด:
       ถ่านต่ออนุกรม 2 ก้อน มีกระแสก้อนเดียวไหลผ่านทั้งสองก้อน ถ้าบวกกันจะได้ 2 เท่า
       (เคยเป็นแบบนั้น ทำให้ค่าที่โชว์ผิด และสายไฟถูกตัดสินว่าไหม้ที่กระแสครึ่งเดียว)

       ใช้ค่าสูงสุดแทนการบวก ได้คำตอบถูกทั้งสองแบบ:
         อนุกรม  ทุกตัวกระแสเท่ากัน → ได้กระแสของวงนั้น
         ขนาน    ตัวแหล่งจ่ายรับกระแสรวมของทุกสาขาอยู่แล้ว → ได้กระแสรวม */
    res.supplyI = Math.max(res.supplyI, Math.abs(I));
  });

  return res;
}

/* ============================================================
   ตัวช่วยอ่านผล — ใช้ร่วมกันทั้งเครื่องวัด ความเสียหาย และภาพ
   ============================================================ */

/* ความสว่าง/ความแรงของอุปกรณ์ 0..1
   ใช้เลขชี้กำลัง 0.4 เพราะตาคนรับรู้ความสว่างแบบลอการิทึม
   ไม่ใช่เชิงเส้น — หลอดที่ได้กำลังไฟครึ่งเดียวยังดูสว่างราว 76% */
function deviceIntensity(r){
  if(!r) return 0;
  var sp = r.spec;
  var x = 0;
  if(sp.pnom)      x = r.P / sp.pnom;
  else if(sp.inom) x = Math.abs(r.I) / sp.inom;
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

/* แรงดัน ณ จุดขั้วหนึ่ง (เทียบกับขั้วลบของแหล่งจ่าย) */
function nodeVoltageAt(sol, portEl){
  if(!sol || !sol.ok || !sol.nodeOf) return null;
  var n = sol.nodeOf.get(portEl);
  if(n === undefined) return null;
  return sol.nodeV[n];
}

