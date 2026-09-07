/* ============================================================
   CIRCUIT CHECK — ตรรกะตรวจวงจร (ไม่ยุ่งกับ DOM/หน้าจอ)

   ใช้ร่วมกับเฉลยของแต่ละด่าน:
     checkExactWiring       เทียบจำนวนอุปกรณ์/สาย + โครงสร้าง + ขั้ว
     checkSeriesTopology    ตรวจวงจรอนุกรม
     checkParallelTopology  ตรวจวงจรขนาน
     tracePolarity          ตรวจขั้วจากสายที่เชื่อม 2 ขั้วโดยตรง
     tracePolarityThrough   ตรวจขั้วแบบทั่วถึง (ผ่านตัวกลางไม่มีขั้ว)
     isClosedCircuit        ตรวจว่าเป็นวงจรปิดจริง
   ============================================================ */
/* ============================================================
   EXACT WIRING CHECK (ยืดหยุ่น) — เทียบเฉลยแบบ "อุปกรณ์ไหนต่ออุปกรณ์ไหน"
   ไม่สนสลับซ้าย-ขวา หรือกลับทิศวน (ยอมรับทุกแบบที่ถูกต้อง)
   แต่เช็คว่า: การเชื่อมครบตามเฉลย + ไม่มีเกิน + ขั้ว +/− ถูก
   ============================================================ */





function checkExactWiring(items, wires, solution){
  var devOf = {};
  items.forEach(function(it){ devOf[it.id]=it.deviceId; });

  /* นับอุปกรณ์ที่ต้องมี จากเฉลย */
  var needDevices = {};
  solution.forEach(function(pair){
    [pair[0].split('.')[0], pair[1].split('.')[0]].forEach(function(d){
      needDevices[d] = true;
    });
  });

  /* จำนวนสายที่เฉลยใช้ = จำนวนสายที่ต้องมี */
  var expectWireCount = solution.length;

  /* 1) ต้องมีอุปกรณ์ครบตามเฉลย */
  var haveDevices = {};
  items.forEach(function(it){ haveDevices[it.deviceId]=(haveDevices[it.deviceId]||0)+1; });
  for(var d in needDevices){
    if(!haveDevices[d]){
      return {ok:false, msg:'ยังขาด '+DEVICES[d].name+' ในวงจร'};
    }
  }

  /* 2) จำนวนสายต้องเท่ากับเฉลย (ไม่เกิน ไม่ขาด) */
  if(wires.length > expectWireCount){
    return {ok:false, msg:'มีสายมากเกินไป ('+wires.length+' เส้น ควรมี '+expectWireCount+' เส้น) — คลิกขวาที่สายที่ไม่จำเป็นเพื่อลบ'};
  }
  if(wires.length < expectWireCount){
    return {ok:false, msg:'สายยังไม่ครบ ('+wires.length+' เส้น ต้องมี '+expectWireCount+' เส้น)'};
  }

  /* 3) โครงสร้างต้องถูก (อนุกรม/ขนาน) — ใช้ topology จาก level */
  var lv = LEVELS[G.level];
  if(lv.topology){
    var topo;
    if(lv.topology.type==='parallel'){
      topo = checkParallelTopology(items, wires, lv.topology.branches, lv.topology.mustHave);
    } else {
      topo = checkSeriesTopology(items, wires);
    }
    if(!topo.ok) return topo;
  }

  /* 4) เช็คขั้ว +/− ของอุปกรณ์มีขั้ว (LED/ไดโอด/มอเตอร์) ต้องถูกทิศ */
  var polResult = tracePolarity(items, wires);
  if(!polResult.ok) return polResult;

  /* 5) เช็คขั้วแบบทั่วถึง — จับอุปกรณ์มีขั้วที่ต่อผ่านตัวกลาง (เช่น capacitor หลัง resistor) */
  var polThrough = tracePolarityThrough(items, wires);
  if(!polThrough.ok) return polThrough;

  return {ok:true, msg:''};
}

/*
  ตรวจขั้วอุปกรณ์มีขั้วแบบทั่วถึง (รวมตัวที่ต่อผ่านตัวกลาง เช่น capacitor หลัง resistor)
  หลักการ: วัดระยะจากขั้ว+ ของถ่าน ถึงแต่ละจุด (ไฟไหลผ่านสาย+ทะลุอุปกรณ์ที่ไม่มีขั้ว)
  อุปกรณ์มีขั้ว: ขั้ว+ ต้องอยู่ "ต้นน้ำ" (ใกล้ขั้ว+ ถ่าน) กว่าขั้ว− ของมันเอง
*/
function tracePolarityThrough(items, wires){
  function wiresAt(p){var o=[];wires.forEach(function(w){if(w.fromPort===p||w.toPort===p)o.push(w);});return o;}
  function itemOf(id){for(var i=0;i<items.length;i++)if(items[i].id===id)return items[i];return null;}
  /* อุปกรณ์ที่ไฟทะลุผ่านได้โดยไม่มีขั้ว (R/สวิตช์/ฟิวส์/บอร์ด/สาย) */
  function isNeutralPass(id){
    var it=itemOf(id); if(!it)return false;
    var d=DEVICES[it.deviceId];
    return !d.polarized && (d.type==='control'||d.type==='passive'||d.type==='tool');
  }
  function throughPorts(port){
    var it=itemOf(port.dataset.itemId);
    if(!it || !isNeutralPass(it.id) || !it.el) return [];
    var out=[], ps=it.el.querySelectorAll('.port');
    for(var i=0;i<ps.length;i++) if(ps[i]!==port) out.push(ps[i]);
    return out;
  }
  /* BFS ระยะจากขั้ว+ ของถ่าน (ทะลุอุปกรณ์ไม่มีขั้ว, หยุดที่อุปกรณ์มีขั้ว/แหล่งจ่าย) */
  function distFromPlus(){
    var pd=new Map(), q=[];
    items.forEach(function(it){
      if(!it.el || DEVICES[it.deviceId].type!=='source') return;
      var ps=it.el.querySelectorAll('.port');
      for(var i=0;i<ps.length;i++) if(ps[i].dataset.polarity==='+'){ pd.set(ps[i],0); q.push(ps[i]); }
    });
    while(q.length){
      var p=q.shift(), d=pd.get(p);
      wiresAt(p).forEach(function(w){
        var nx=(w.fromPort===p)?w.toPort:w.fromPort;
        if(!pd.has(nx)||pd.get(nx)>d+1){ pd.set(nx,d+1); q.push(nx); }
      });
      throughPorts(p).forEach(function(op){
        if(!pd.has(op)||pd.get(op)>d){ pd.set(op,d); q.push(op); }
      });
    }
    return pd;
  }
  var pd=distFromPlus();
  for(var i=0;i<items.length;i++){
    var it=items[i];
    var d=DEVICES[it.deviceId];
    if(!d.polarized || d.type==='source' || !it.el) continue;
    var ps=it.el.querySelectorAll('.port'), posP=null, negP=null;
    for(var j=0;j<ps.length;j++){
      if(ps[j].dataset.origPos===d.pos) posP=ps[j];
      else if(ps[j].dataset.origPos===d.neg) negP=ps[j];
    }
    if(!posP||!negP) continue;
    var dp=pd.has(posP)?pd.get(posP):Infinity;
    var dn=pd.has(negP)?pd.get(negP):Infinity;
    /* ไฟบวกไหลจากขั้ว+ ถ่าน ควรถึงขั้ว+ ของอุปกรณ์ "ก่อน" ขั้ว−
       - ทั้งคู่ถึง: ขั้ว+ ต้องใกล้กว่า (dp<dn) ถ้า dp>dn = กลับขั้ว
       - ถึงเฉพาะขั้ว− (dp=Inf, dn มีค่า): ไฟบวกวิ่งเข้าขั้ว− ก่อน = กลับขั้ว */
    var reversed = false;
    if(dp!==Infinity && dn!==Infinity){
      if(dp>dn) reversed=true;
    } else if(dp===Infinity && dn!==Infinity){
      reversed=true;  /* ขั้วบวกเข้าไม่ถึง แต่ขั้วลบไฟบวกไปถึง = หันกลับ */
    }
    if(reversed){
      return {ok:false, msg:'ต่อกลับขั้ว! '+d.name+' หันขั้วผิด — ขั้ว + ต้องหันไปทางขั้ว + ของถ่าน หมุน (R) ให้ถูกทิศ'};
    }
  }
  return {ok:true, msg:''};
}

/* นับสายที่ต่อกับจุดหนึ่ง */
function wiresAtPortCount(port, wires){
  var n=0;
  wires.forEach(function(w){ if(w.fromPort===port||w.toPort===port) n++; });
  return n;
}

/* ตรวจวงจรอนุกรม: ทุกจุดมีสายเข้า-ออกอย่างละ 1, ทุกชิ้นในวงเดียว */
function checkSeriesTopology(items, wires){
  for(var i=0;i<items.length;i++){
    var it=items[i];
    if(!it.el) continue;
    var dev=DEVICES[it.deviceId];
    var ports=it.el.querySelectorAll('.port');
    var total=0;
    for(var j=0;j<ports.length;j++){
      var p=ports[j], n=wiresAtPortCount(p,wires);
      if(n>1) return {ok:false, msg: ptName(it,p)+' มีสาย '+n+' เส้น — วงจรอนุกรมทุกจุดต้องมีสายเส้นเดียว'};
      total+=n;
    }
    if(total===0) return {ok:false, msg: dev.name+' ยังไม่ได้ต่อสาย'};
    if(total!==2) return {ok:false, msg: dev.name+' ต้องมีสายเข้า 1 ออก 1 — ตอนนี้มี '+total+' เส้น'};
  }
  /* ทุกชิ้นอยู่ในวงเดียว */
  var g=buildGraph(items,wires);
  var vis={},q=[items[0].id],cnt=1; vis[items[0].id]=true;
  while(q.length){var c=q.shift();g[c].forEach(function(nb){if(!vis[nb]){vis[nb]=true;cnt++;q.push(nb);}});}
  if(cnt<items.length) return {ok:false, msg:'อุปกรณ์บางชิ้นแยกวง — ต้องต่อทุกชิ้นในวงเดียวกัน'};
  return {ok:true, msg:''};
}

/* ตรวจวงจรขนาน */
function checkParallelTopology(items, wires, branches, mustHave){
  var bat=null;
  items.forEach(function(it){ if(DEVICES[it.deviceId].type==='source') bat=it; });
  if(!bat) return {ok:false, msg:'วงจรต้องมีแหล่งจ่าย'};
  for(var i=0;i<items.length;i++){
    var it=items[i];
    if(!it.el) continue;
    var ports=it.el.querySelectorAll('.port');
    for(var j=0;j<ports.length;j++){
      var p=ports[j], n=wiresAtPortCount(p,wires);
      var need=(it===bat)?branches:1;
      if(n!==need){
        if(it===bat) return {ok:false, msg: ptName(it,p)+' ต้องมี '+need+' สาย (แยก '+branches+' สาขา) — มี '+n};
        return {ok:false, msg: ptName(it,p)+' ต้องมีสายเดียว — มี '+n};
      }
    }
  }
  var posP=null,negP=null;
  var bp=bat.el.querySelectorAll('.port');
  for(var k=0;k<bp.length;k++){ if(bp[k].dataset.polarity==='+')posP=bp[k];else if(bp[k].dataset.polarity==='-')negP=bp[k]; }
  if(!posP||!negP) return {ok:false, msg:'ไม่พบขั้ว +/−'};
  function itemById(id){var r=null;items.forEach(function(x){if(x.id===id)r=x;});return r;}
  function otherPort(item,pe){var ps=item.el.querySelectorAll('.port');for(var a=0;a<ps.length;a++)if(ps[a]!==pe)return ps[a];return null;}
  function wireAt(port,ex){var f=null;wires.forEach(function(w){if(w===ex)return;if(w.fromPort===port||w.toPort===port)f=w;});return f;}
  var starts=[];
  wires.forEach(function(w){if(w.fromPort===posP||w.toPort===posP)starts.push(w);});
  for(var s=0;s<starts.length;s++){
    var w=starts[s];
    var land=(w.fromPort===posP)?w.toPort:w.fromPort;
    var chain=[],guard=0;
    while(guard++<30){
      if(land===negP)break;
      if(land===posP)return {ok:false,msg:'สาขาวนกลับขั้ว + — ต้องไปจบขั้ว −'};
      var ci=itemById(land.dataset.itemId);
      if(!ci)return {ok:false,msg:'ต่อไม่สมบูรณ์'};
      chain.push(ci.deviceId);
      var op=otherPort(ci,land);
      if(!op)return {ok:false,msg:DEVICES[ci.deviceId].name+' ไม่มีจุดออก'};
      var nw=wireAt(op,null);
      if(!nw)return {ok:false,msg:ptName(ci,op)+' ยังไม่ได้ต่อสาย'};
      land=(nw.fromPort===op)?nw.toPort:nw.fromPort;
    }
    for(var m=0;m<mustHave.length;m++){
      if(chain.indexOf(mustHave[m])<0) return {ok:false,msg:'แต่ละสาขาต้องมี '+DEVICES[mustHave[m]].name+' — สาขาหนึ่งขาด'};
    }
  }
  return {ok:true, msg:''};
}



/* นับสายที่ต่อกับจุดหนึ่ง */
function wiresAtPort(port, wires){
  var n=0;
  wires.forEach(function(w){ if(w.fromPort===port||w.toPort===port) n++; });
  return n;
}



/*
  ตรวจ "วงจรอนุกรม" — ไฟวิ่งผ่านทุกชิ้นเรียงกันเป็นวงเดียว
  กฎ: ทุกจุดต้องมีสายพอดี 1 เส้น (เข้า 1 ออก 1)
      ถ้าจุดไหนมี 2 เส้น = มีอุปกรณ์ต่อขนาน/ลัดวงจร
  รองรับการต่อได้ทุกแบบที่ถูกต้อง (สลับซ้ายขวา / กลับทิศวน)
*/




/* ============================================================
   CIRCUIT VALIDATION HELPERS
   ตรวจว่าอุปกรณ์ต่อกันเป็น "วงจรปิด" จริงหรือไม่
   ============================================================ */

/* สร้าง adjacency map: itemId -> [itemId ที่เชื่อมด้วยสาย] */
function buildGraph(items, wires){
  var g = {};
  items.forEach(function(it){ g[it.id] = []; });
  wires.forEach(function(w){
    if(g[w.fromItemId] && g[w.toItemId]){
      g[w.fromItemId].push(w.toItemId);
      g[w.toItemId].push(w.fromItemId);
    }
  });
  return g;
}

/* นับจำนวนสายที่ต่อกับแต่ละ item */
function wireCountOf(itemId, wires){
  var n = 0;
  wires.forEach(function(w){
    if(w.fromItemId===itemId || w.toItemId===itemId) n++;
  });
  return n;
}

/*
  ตรวจวงจรปิด:
  - อุปกรณ์ทุกตัวต้องมีสายเชื่อมอย่างน้อย 2 เส้น (เข้า 1 ออก 1)
  - อุปกรณ์ทุกตัวต้องเชื่อมถึงกันหมด (connected component เดียว)
  - ต้องมี cycle (เดินวนกลับจุดเริ่มได้) = วงจรปิด
  รับ requiredIds = list ของ deviceId ที่ต้องอยู่ในวง (optional)
*/
/*
  tracePolarity: ตรวจขั้ว +/− แบบไล่เส้นทางจริง
  รองรับกรณีต่อผ่าน "ตัวกลาง" ที่ไม่มีขั้ว (สวิตช์, ตัวต้านทาน, หลอดไฟ, ฟิวส์)

  หลักการ:
  - แต่ละ "ขั้วที่มีเครื่องหมาย" (+/−) คือ node สำคัญ
  - ไฟไหลจากขั้ว+ ผ่านสาย/ตัวกลาง ไปได้เรื่อยๆ
  - ถ้า 2 ขั้วที่เชื่อมถึงกันโดยตรง (ผ่านเฉพาะตัวกลางไม่มีขั้ว) มีเครื่องหมายเดียวกัน
    = ต่อผิดขั้ว (+ ชน + หรือ − ชน −)

  วิธี: สำหรับแต่ละ polarized port, BFS ไปตามสายผ่าน "ตัวกลางไม่มีขั้ว"
  ถ้าเจอ polarized port อีกอันที่เครื่องหมายเดียวกัน = error
*/
function tracePolarity(items, wires){
  /*
    ตรวจขั้ว +/− แบบเช็คทีละสาย (เฉพาะสายที่เชื่อม 2 ขั้วโดยตรง)

    ทำไมไม่ BFS ทะลุตัวกลาง:
    ในวงจรปิด ขั้ว+ และ ขั้ว− ของถ่าน "ย่อมเชื่อมถึงกัน" ผ่านโหลดเสมอ
    (นั่นคือนิยามของวงจรปิด) การ BFS ทะลุจะจับผิดทุกวงจร

    กฎ (สายเดียวเชื่อม 2 polarized port โดยตรง):
    - source(+) ─ load(+)   = OK  (บวกจ่ายเข้าบวกโหลด)
    - source(−) ─ load(−)   = OK  (ลบรับกลับลบโหลด)
    - load(+)   ─ load(−)   = OK  (ต่ออนุกรมโหลด)
    - source(+) ─ load(−)   = ผิด (โหลดกลับด้าน)
    - source(−) ─ load(+)   = ผิด (โหลดกลับด้าน)
    - source(+) ─ source(−) = ผิด (ลัดวงจร)
    - source(+) ─ source(+) = ผิด (แหล่งจ่ายชนกัน)

    หมายเหตุ: สายที่เชื่อมผ่านตัวกลางไม่มีขั้ว ไม่ตรวจ (ปล่อยผ่าน)
  */

  /* helper: หา polarity ของ port element */
  function polOf(portEl){
    var p = portEl.dataset.polarity;
    return (p==='+'||p==='-') ? p : 'none';
  }
  /* helper: type ของ item (source/load) */
  function typeOf(itemId){
    for(var i=0;i<items.length;i++){
      if(items[i].id===itemId) return DEVICES[items[i].deviceId].type;
    }
    return 'unknown';
  }

  for(var w=0;w<wires.length;w++){
    var wire = wires[w];
    var fp = polOf(wire.fromPort);
    var tp = polOf(wire.toPort);

    /* สนใจเฉพาะสายที่ปลายทั้งสองเป็นขั้วมีเครื่องหมาย */
    if(fp==='none' || tp==='none') continue;

    var fromType = typeOf(wire.fromItemId);
    var toType   = typeOf(wire.toItemId);
    var fromIsSource = (fromType==='source');
    var toIsSource   = (toType==='source');

    /* กรณี source ↔ source : ลัดวงจร/แหล่งจ่ายชนกัน = ผิดเสมอ */
    if(fromIsSource && toIsSource){
      return {ok:false, msg:'ต่อแหล่งจ่ายชนกันโดยตรง (ขั้ว '+fp+' กับ '+tp+') — ห้ามต่อถ่าน 2 ก้อนขั้วชนกันตรงๆ'};
    }

    /* กรณี source ↔ load : ขั้วต้องเดียวกัน (+จ่ายเข้า+, −กลับเข้า−) */
    if(fromIsSource || toIsSource){
      if(fp !== tp){
        var loadName = fromIsSource
          ? DEVICES[itemDeviceId(wire.toItemId)].name
          : DEVICES[itemDeviceId(wire.fromItemId)].name;
        return {ok:false, msg:'ต่อกลับขั้ว! '+loadName+' ต่อกลับด้าน — ขั้ว '+fp+' ของแหล่งจ่ายไปเจอขั้ว '+tp+' ของโหลด ต้องหมุน (R) ให้ขั้วตรงกัน (+ถึง+, −ถึง−)'};
      }
    }

    /* กรณี load ↔ load : ต่ออนุกรม ต้องขั้วตรงข้าม (+ออกตัวนี้ เข้า −ตัวหน้า)
       แต่บางเคส + ต่อ + ก็ได้ถ้าเป็นขนาน — ยืดหยุ่นไว้ ไม่บล็อก */
    /* (ปล่อยผ่าน — ไม่เข้มงวดกับ load-load เพราะมีทั้งอนุกรม/ขนาน) */
  }

  return {ok:true, msg:''};
}


function isClosedCircuit(items, wires, requiredDeviceIds){
  if(items.length < 2) return {ok:false, msg:'ต้องมีอุปกรณ์อย่างน้อย 2 ชิ้น'};

  /* ต้องมีแหล่งจ่ายไฟ (ถ่าน/แบตเตอรี่) อย่างน้อย 1 ตัว */
  var hasSource=false;
  items.forEach(function(it){ if(DEVICES[it.deviceId].type==='source') hasSource=true; });
  if(!hasSource) return {ok:false, msg:'วงจรต้องมีแหล่งจ่ายไฟ (ถ่าน/แบตเตอรี่)'};

  /* ทุก item ต้องมีสาย >= 2 เส้น (ไม่งั้นเป็นปลายเปิด) */
  for(var i=0;i<items.length;i++){
    var cnt = wireCountOf(items[i].id, wires);
    var devName = DEVICES[items[i].deviceId].name;
    if(cnt === 0) return {ok:false, msg:devName+' ยังไม่ได้ต่อสายไฟ'};
    if(cnt < 2)   return {ok:false, msg:devName+' ต่อสายไม่ครบ — ต้องต่อทั้ง 2 ขั้วให้เป็นวงจรปิด'};
  }

  /* ตรวจขั้วบวก/ลบ ให้ถูกหลักไฟฟ้า — แบบ trace เส้นทางจริง
     ปัญหาเดิม: ถ้าต่อผ่านตัวกลางไม่มีขั้ว (สวิตช์/ตัวต้านทาน)
     การเช็คแค่ปลายสายเส้นเดียวจะจับไม่ได้
     วิธีใหม่: ไล่จากขั้ว+ ของแหล่งจ่าย ตามสายไป
     - ถ้าไปถึงขั้ว+ ของอุปกรณ์มีขั้วตัวอื่น = ผิด (+ ชน +)
     - ผ่านตัวกลางไม่มีขั้วได้ (ไฟไหลทะลุ) */
  var polErr = tracePolarity(items, wires);
  if(!polErr.ok) return polErr;

  /* ตรวจว่าทุก item เชื่อมกันหมด (BFS จาก item แรก) */
  var g = buildGraph(items, wires);
  var visited = {};
  var queue = [items[0].id];
  visited[items[0].id] = true;
  var count = 1;
  while(queue.length){
    var cur = queue.shift();
    g[cur].forEach(function(nb){
      if(!visited[nb]){ visited[nb]=true; count++; queue.push(nb); }
    });
  }
  if(count < items.length){
    return {ok:false, msg:'อุปกรณ์บางชิ้นยังไม่ได้เชื่อมเข้าวงจร — ต้องต่อให้เป็นวงเดียวกัน'};
  }

  /* ตรวจ cycle: วงจรปิดต้องมีสาย >= จำนวน node (มี loop) */
  if(wires.length < items.length){
    return {ok:false, msg:'วงจรยังไม่ปิด — สายไฟต้องวนกลับมาครบวง'};
  }

  return {ok:true, msg:''};
}
