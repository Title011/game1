/* ============================================================
   ANALYZE — ระบบวิเคราะห์วงจร

   ระบบตรวจเดิมทำงานแบบ "นับจำนวนสาย" แล้วเทียบกับเฉลย
   ซึ่งมีปัญหาใหญ่ 3 อย่าง:
     • ต่อถูกทางไฟฟ้าแต่เดินสายคนละแบบ = ถูกตัดสินว่าผิด
     • บอกได้แค่ตัวเลข "มี 9 จุด ควรมี 8 จุด" ไม่บอกว่าตรงไหน
     • ไม่รู้จักวงจรจริง เลยจับความผิดพลาดคลาสสิกไม่ได้
       เช่น "ต่อสายคร่อมหลอดไฟ" ซึ่งไฟจะลัดผ่านไปหมด หลอดไม่ติด

   ไฟล์นี้อ่านวงจรเป็น "โครงข่าย (netlist)" จริง โดยใช้ buildNodes()
   ตัวเดียวกับที่ js/solver.js ใช้แก้สมการ — ระบบตรวจกับระบบฟิสิกส์
   จึงมองเห็นวงจรเดียวกันเป๊ะ ไม่มีทางขัดแย้งกันเอง

   สิ่งที่วิเคราะห์ได้:
     1. โครงสร้าง  — ขาลอย, อุปกรณ์หลุดวง, อุปกรณ์ถูกลัดคร่อม, วงไม่ปิด
     2. เส้นทางไฟ — ไล่ทุกทางจากขั้วบวกกลับขั้วลบ บอกได้ว่าอนุกรม/ขนาน/ผสม
     3. ขั้ว       — ไล่ตามทางเดินจริง อุปกรณ์มีขั้วหันถูกทิศไหม
     4. เทียบเฉลย — เทียบ "โครงข่าย" ไม่ใช่ "จำนวนสาย"
                    ต่อแบบไหนก็ได้ที่ได้วงจรเดียวกัน = ถูกหมด
                    และถ้าผิด บอกได้ว่าจุดไหนควรต่อถึงกันแต่ยังไม่ต่อ
     5. คำบรรยาย  — เขียนวงจรที่ผู้เล่นต่อออกมาเป็นภาษาคน
   ============================================================ */

/* ============================================================
   1) อ่านวงจรเป็นโครงข่าย
   ============================================================ */
function circuitNetlist(items, wires){
  var nb = buildNodes(items, wires);

  /* จำนวนสายที่ต่อกับแต่ละจุดขั้ว — ใช้หาขาลอย */
  var deg = new Map();
  wires.forEach(function(w){
    deg.set(w.fromPort, (deg.get(w.fromPort)||0) + 1);
    deg.set(w.toPort,   (deg.get(w.toPort)  ||0) + 1);
  });

  var els = [], byItem = {}, sources = [];
  items.forEach(function(it){
    var sp = ESPEC[it.deviceId];
    if(!sp || !it.el) return;
    var ports = nb.portsOf.get(it.id) || [];
    if(sp.kind === 'bus'){
      byItem[it.id] = { item:it, deviceId:it.deviceId, spec:sp, bus:true,
                        node:nb.nodeOf.get(ports[0]), ports:ports };
      return;
    }
    var tm = deviceTerminals(it, ports);
    if(!tm) return;
    var e = {
      item:it, deviceId:it.deviceId, spec:sp, ports:ports,
      aPort:tm.a, bPort:tm.b,
      a:nb.nodeOf.get(tm.a), b:nb.nodeOf.get(tm.b),
      isSource: sp.kind === 'source',
      isLoad:   sp.kind !== 'source' && !!(sp.pnom || sp.inom),
      shorted:  nb.nodeOf.get(tm.a) === nb.nodeOf.get(tm.b)
    };
    els.push(e);
    byItem[it.id] = e;
    if(e.isSource) sources.push(e);
  });

  return { nb:nb, deg:deg, els:els, byItem:byItem, sources:sources, nodeCount:nb.count };
}

/* ชื่อจุดขั้วแบบอ่านง่าย เติมเลขลำดับให้เมื่อมีอุปกรณ์ชนิดเดียวกันหลายตัว */
function termName(net, item, port){
  if(!item || !port) return '';
  var dev = DEVICES[item.deviceId];
  var same = [];
  net.els.forEach(function(e){ if(e.deviceId === item.deviceId) same.push(e.item.id); });
  var n = same.length > 1 ? (' ตัวที่ ' + (same.indexOf(item.id) + 1)) : '';
  var pos = THAI_POS[port.dataset.origPos] || port.dataset.origPos;
  var mark = '';
  if(dev.polarized){
    if(port.dataset.origPos === dev.pos) mark = ' +';
    else if(port.dataset.origPos === dev.neg) mark = ' −';
  }
  return dev.name + n + ' (ขา' + pos + mark + ')';
}

/* ============================================================
   2) ไล่เส้นทางไฟจากขั้วบวกกลับขั้วลบ
   ============================================================ */
function circuitPaths(net, src, limit){
  limit = limit || 40;
  var adj = {};
  net.els.forEach(function(e){
    if(e === src || e.shorted) return;      /* ตัวที่ถูกลัดคร่อม ไฟไม่ผ่าน ไม่นับเป็นทางเดิน */
    (adj[e.a] = adj[e.a] || []).push(e);
    (adj[e.b] = adj[e.b] || []).push(e);
  });

  var out = [], used = [], chain = [];
  function dfs(node, depth){
    if(out.length >= limit || depth > 24) return;
    if(node === src.b){ out.push(chain.slice()); return; }
    var list = adj[node] || [];
    for(var i=0;i<list.length;i++){
      var e = list[i];
      if(used.indexOf(e) >= 0) continue;
      used.push(e); chain.push({el:e, fwd:(e.a === node)});
      dfs((e.a === node) ? e.b : e.a, depth + 1);
      used.pop(); chain.pop();
    }
  }
  dfs(src.a, 0);
  return out;
}

/* ============================================================
   3) วิเคราะห์โครงสร้างทั้งหมด
   ============================================================ */
function analyzeCircuit(items, wires){
  var net = circuitNetlist(items, wires);
  var res = {
    net:net, ok:false, reason:'', topology:'none',
    floating:[], islands:[], shorted:[], paths:[], branches:0,
    reversed:[], sourceCount:net.sources.length
  };
  if(!items.length){ res.reason = 'empty'; return res; }

  /* --- ขาที่ยังไม่ได้ต่อสายเลย --- */
  net.els.forEach(function(e){
    [[e.aPort,'a'],[e.bPort,'b']].forEach(function(p){
      if(!(net.deg.get(p[0]) || 0)) res.floating.push({ el:e, port:p[0] });
    });
  });

  /* --- อุปกรณ์ที่ถูกต่อสายคร่อมตัวมันเอง (ขาสองข้างเป็นจุดเดียวกัน) --- */
  net.els.forEach(function(e){
    if(e.shorted && !e.isSource) res.shorted.push(e);
  });

  if(!net.sources.length){ res.reason = 'no-source'; return res; }

  /* --- อุปกรณ์ที่แยกเป็นเกาะ ไม่เชื่อมกับแหล่งจ่าย --- */
  var seen = {}, q = [net.sources[0].a, net.sources[0].b];
  seen[net.sources[0].a] = seen[net.sources[0].b] = true;
  while(q.length){
    var n = q.shift();
    net.els.forEach(function(e){
      if(e.a === n && !seen[e.b]){ seen[e.b] = true; q.push(e.b); }
      if(e.b === n && !seen[e.a]){ seen[e.a] = true; q.push(e.a); }
    });
  }
  net.els.forEach(function(e){
    if(!seen[e.a] && !seen[e.b]) res.islands.push(e);
  });

  /* --- เส้นทางไฟ --- */
  res.paths = circuitPaths(net, net.sources[0]);
  res.branches = res.paths.length;

  if(!res.branches){ res.reason = 'open'; return res; }

  if(res.branches === 1) res.topology = 'series';
  else {
    /* ขนานแท้ = แต่ละสาขาไม่ใช้อุปกรณ์ร่วมกันเลย */
    var shared = false;
    for(var i=0;i<res.paths.length && !shared;i++){
      for(var j=i+1;j<res.paths.length && !shared;j++){
        res.paths[i].forEach(function(s){
          if(res.paths[j].some(function(t){ return t.el === s.el; })) shared = true;
        });
      }
    }
    res.topology = shared ? 'mixed' : 'parallel';
  }

  /* --- ขั้วของอุปกรณ์มีขั้ว: ต้องถูกเดินผ่านจากขา + ไปขา − ทุกเส้นทาง --- */
  var badPol = {};
  res.paths.forEach(function(path){
    path.forEach(function(step){
      var dev = DEVICES[step.el.deviceId];
      if(!dev.polarized || step.el.isSource) return;
      /* fwd = เข้าทางขา a ซึ่ง deviceTerminals() กำหนดให้เป็นขั้วบวกเสมอ */
      if(!step.fwd) badPol[step.el.item.id] = step.el;
    });
  });
  for(var k in badPol) res.reversed.push(badPol[k]);

  res.ok = true;
  return res;
}

/* ============================================================
   4) อธิบายวงจรที่ผู้เล่นต่อ ออกมาเป็นภาษาคน
   ============================================================ */
function describeCircuit(an){
  if(!an || !an.paths.length) return '';
  var src = an.net.sources[0];
  var head = DEVICES[src.deviceId].name + ' (+)';
  var tail = 'กลับเข้าขั้วลบ';

  function nameOf(step){
    var n = DEVICES[step.el.deviceId].name;
    if(step.el.item.open)  n += ' [OFF]';
    if(step.el.item.blown) n += ' [ขาด]';
    if(step.el.item.failed && !step.el.item.blown) n += ' [เสีย]';
    return n;
  }

  if(an.paths.length === 1){
    return head + ' → ' + an.paths[0].map(nameOf).join(' → ') + ' → ' + tail;
  }

  /* หลายสาขา: ดึงส่วนหัวและส่วนท้ายที่ทุกสาขาใช้ร่วมกันออกมาแสดงครั้งเดียว */
  var ps = an.paths;
  var pre = 0;
  while(pre < ps[0].length && ps.every(function(p){
    return p[pre] && p[pre].el === ps[0][pre].el;
  })) pre++;
  var suf = 0;
  while(suf < ps[0].length - pre && ps.every(function(p){
    return p[p.length-1-suf] && p[p.length-1-suf].el === ps[0][ps[0].length-1-suf].el;
  })) suf++;

  var out = head;
  if(pre) out += ' → ' + ps[0].slice(0, pre).map(nameOf).join(' → ');
  out += ' → แยก ' + ps.length + ' สาขา: ';
  out += ps.map(function(p){
    var mid = p.slice(pre, p.length - suf).map(nameOf);
    return '[' + (mid.length ? mid.join(' → ') : 'ไม่มีอุปกรณ์') + ']';
  }).join(' + ');
  if(suf) out += ' → ' + ps[0].slice(ps[0].length - suf).map(nameOf).join(' → ');
  return out + ' → ' + tail;
}

/* ============================================================
   5) เทียบกับเฉลย — เทียบ "โครงข่าย" ไม่ใช่ "จำนวนสาย"

   แนวคิด: เฉลยบอกว่าจุดไหนต้องถึงกันบ้าง เอามารวมเป็นกลุ่ม (โหนด)
   แล้วดูว่าวงจรที่ผู้เล่นต่อ จับกลุ่มได้ตรงกันไหม
   ต่อด้วยสายกี่เส้น เดินทางไหน เสียบรางไหน ไม่เกี่ยว
   ขอแค่ "อะไรถึงอะไร" ตรงกันก็ถือว่าถูก
   ============================================================ */

/* สร้างโครงข่ายเป้าหมายจากเฉลย
   เฉลยเขียนเป็น "ชนิดอุปกรณ์.ขา" ไม่ได้ระบุว่าตัวที่เท่าไร
   จึงไล่ตามลำดับคู่สายแล้วจ่ายให้ตัวที่ขานั้นยังว่าง (ตรงกับที่เฉลยถูกเขียนมา) */
function solutionNetlist(solution, counts){
  var inst = {}, parent = {};
  function key(o, pin){ return o.dev + '#' + o.idx + '.' + pin; }
  function find(x){ while(parent[x] !== x) x = parent[x] = parent[parent[x]]; return x; }
  function union(a, b){
    if(parent[a] === undefined) parent[a] = a;
    if(parent[b] === undefined) parent[b] = b;
    var ra = find(a), rb = find(b);
    if(ra !== rb) parent[ra] = rb;
  }
  function take(dev, pin){
    var list = inst[dev] = inst[dev] || [];
    for(var i=0;i<list.length;i++) if(!list[i].deg[pin]) return list[i];
    if(list.length < (counts[dev] || 99)){
      var o = { dev:dev, idx:list.length, deg:{} };
      list.push(o);
      return o;
    }
    var best = list[0], bn = list[0].deg[pin] || 0;
    for(var j=1;j<list.length;j++){
      var n = list[j].deg[pin] || 0;
      if(n < bn){ bn = n; best = list[j]; }
    }
    return best;
  }

  var terms = [];
  solution.forEach(function(pair){
    var ks = pair.map(function(end){
      var s = end.split('.'), o = take(s[0], s[1]);
      o.deg[s[1]] = (o.deg[s[1]] || 0) + 1;
      var k = key(o, s[1]);
      if(parent[k] === undefined){ parent[k] = k; terms.push({ key:k, dev:o.dev, idx:o.idx, pin:s[1] }); }
      return k;
    });
    union(ks[0], ks[1]);
  });

  /* อุปกรณ์ชนิด bus (แผงต่อวงจร/สายไฟ) ทุกขาถึงกันเองข้างใน
     เฉลยเขียนแยกเป็น .left / .right ก็จริง แต่ทางไฟฟ้ามันคือจุดเดียวกัน
     ต้องรวมให้เหมือนที่ buildNodes() มองเห็นในวงจรจริง
     ไม่งั้นวงจรที่ต่อถูกจะถูกตัดสินว่า "มีจุดที่ไม่ควรต่อถึงกัน" */
  for(var dv in inst){
    if(!ESPEC[dv] || ESPEC[dv].kind !== 'bus') continue;
    inst[dv].forEach(function(o){
      var pins = Object.keys(o.deg);
      for(var i=1;i<pins.length;i++) union(key(o, pins[0]), key(o, pins[i]));
    });
  }

  var group = {}, gid = {}, g = 0;
  terms.forEach(function(t){
    var r = find(t.key);
    if(gid[r] === undefined) gid[r] = g++;
    group[t.key] = gid[r];
  });
  return { terms:terms, group:group, nodeCount:g, inst:inst };
}

/* เรียงสับเปลี่ยนทุกแบบ (จำนวนอุปกรณ์ชนิดเดียวกันมีไม่เกิน 3-4 ตัว) */
function permuteList(arr){
  if(arr.length <= 1) return [arr.slice()];
  var out = [];
  for(var i=0;i<arr.length;i++){
    var rest = arr.slice(0, i).concat(arr.slice(i+1));
    permuteList(rest).forEach(function(p){ out.push([arr[i]].concat(p)); });
  }
  return out;
}

/* อุปกรณ์ตัวนี้สลับซ้าย-ขวาได้ไหม (ไม่มีขั้ว และมี 2 ขา) */
function canFlip(deviceId){
  var d = DEVICES[deviceId];
  return !d.polarized && d.ports.length === 2;
}

function matchSolution(items, wires, solution, counts){
  var net = circuitNetlist(items, wires);
  var sol = solutionNetlist(solution, counts || {});

  /* --- นับอุปกรณ์ก่อน --- */
  var need = {}, have = {};
  sol.terms.forEach(function(t){ need[t.dev] = Math.max(need[t.dev] || 0, t.idx + 1); });
  items.forEach(function(it){ have[it.deviceId] = (have[it.deviceId] || 0) + 1; });

  for(var d in need){
    if((have[d] || 0) < need[d]){
      return { ok:false, kind:'missing-device',
        msg:'ยังขาด ' + DEVICES[d].name + ' ในวงจร' +
            (need[d] > 1 ? ' (ด่านนี้ต้องใช้ ' + need[d] + ' ตัว มี ' + (have[d]||0) + ' ตัว)' : '') };
    }
  }
  for(var d2 in have){
    if((need[d2] || 0) < have[d2]){
      return { ok:false, kind:'extra-device',
        msg:'มี ' + DEVICES[d2].name + ' เกินมา ' + (have[d2] - (need[d2]||0)) + ' ตัว — เอาออกก่อน' };
    }
  }

  /* --- เตรียมตัวเลือกการจับคู่ ของจริง ↔ ของเฉลย --- */
  var byDev = {};
  items.forEach(function(it){ (byDev[it.deviceId] = byDev[it.deviceId] || []).push(it); });

  /* ตัวเลือกของอุปกรณ์แต่ละชนิด = (จับคู่ตัวไหนเป็นตัวไหน) × (สลับซ้าย-ขวาทีละตัว)
     ต้องสลับได้ "ทีละตัว" เพราะหลอด 2 ดวงอนุกรม อาจกลับด้านแค่ดวงเดียว
     ซึ่งถูกต้องทางไฟฟ้าทั้งคู่เพราะหลอดไม่มีขั้ว */
  var devList = Object.keys(need);
  var optionSets = devList.map(function(dev){
    var n = need[dev];
    var perms = permuteList(byDev[dev].slice(0, n));
    var flipSets = [];
    if(canFlip(dev)){
      for(var m=0; m < (1 << n); m++){
        var f = [];
        for(var i=0;i<n;i++) f.push(!!(m & (1 << i)));
        flipSets.push(f);
      }
    } else {
      var zero = [];
      for(var z=0;z<n;z++) zero.push(false);
      flipSets.push(zero);
    }
    var opts = [];
    perms.forEach(function(p){ flipSets.forEach(function(f){ opts.push({ perm:p, flips:f }); }); });
    return opts;
  });

  var total = optionSets.reduce(function(a, o){ return a * o.length; }, 1);
  if(total > 40000) total = 40000;   /* กันกรณีหลุดโลก */

  /* --- ลองทุกการจับคู่ เก็บอันที่ตรงที่สุดไว้อธิบายความผิดพลาด --- */
  var best = null;
  for(var c=0;c<total;c++){
    var rem = c, choice = {};
    for(var i=0;i<devList.length;i++){
      var opts = optionSets[i];
      choice[devList[i]] = opts[rem % opts.length];
      rem = Math.floor(rem / opts.length);
    }
    var r = scoreMapping(net, sol, choice);
    if(!best || r.score > best.score){ best = r; best.choice = choice; }
    if(r.perfect) break;
  }

  if(!best) return { ok:false, kind:'unknown', msg:'ยังตรวจวงจรนี้ไม่ได้' };
  if(best.perfect) return { ok:true, msg:'', net:net };

  return { ok:false, kind:'wiring', msg:best.msg, detail:best.detail, net:net };
}

/* ให้คะแนนการจับคู่หนึ่งแบบ และสร้างคำอธิบายว่าต่างจากเฉลยตรงไหน */
function scoreMapping(net, sol, choice){
  /* จุดขั้วจริงของ terminal ในเฉลย */
  function portOf(t){
    var opt = choice[t.dev];
    var it = opt.perm[t.idx];
    if(!it || !it.el) return null;
    var pin = t.pin;
    if(opt.flips[t.idx]) pin = (pin === 'left') ? 'right' : (pin === 'right' ? 'left' : pin);
    return it.el.querySelector('.port[data-orig-pos="' + pin + '"]');
  }

  /* กลุ่มของเฉลย -> โหนดจริงที่มันไปตกอยู่ */
  var groups = {};
  var mappedPorts = [];
  var broken = false;
  sol.terms.forEach(function(t){
    var p = portOf(t);
    if(!p){ broken = true; return; }
    mappedPorts.push(p);
    var n = net.nb.nodeOf.get(p);
    (groups[sol.group[t.key]] = groups[sol.group[t.key]] || []).push({ t:t, port:p, node:n });
  });
  if(broken) return { score:-1, perfect:false, msg:'ตรวจวงจรไม่สำเร็จ', detail:[] };

  var score = 0, detail = [];
  var nodeOwner = {};          /* โหนดจริง -> กลุ่มของเฉลยที่ยึดอยู่ */
  var splitGroups = [], mergedPairs = [];

  for(var gk in groups){
    var list = groups[gk];
    var nodes = {};
    list.forEach(function(x){ nodes[x.node] = true; });
    var nodeIds = Object.keys(nodes);

    if(nodeIds.length === 1){
      score += 2;
      var nid = nodeIds[0];
      if(nodeOwner[nid] !== undefined && nodeOwner[nid] !== gk){
        mergedPairs.push([nodeOwner[nid], gk, list]);
        score -= 3;
      } else nodeOwner[nid] = gk;
    } else {
      splitGroups.push({ gk:gk, list:list, nodeIds:nodeIds });
    }
  }

  /* มีการต่อที่เฉลยไม่ได้ใช้เลยไหม (เช่นต่อขาเบสทรานซิสเตอร์ที่ควรลอยไว้)
     ไล่จาก byItem เพื่อให้ครอบคลุมอุปกรณ์ชนิด bus ที่ไม่ได้อยู่ใน els ด้วย */
  var stray = [];
  for(var iid in net.byItem){
    var entry = net.byItem[iid];
    /* อุปกรณ์ชนิด bus ทุกขาเป็นจุดเดียวกัน เสียบขาไหนก็ให้ผลเหมือนกัน
       จึงไม่นับว่าต่อเกิน (ถ้าพาดไปผิดที่จริง จะถูกจับตอนเช็คกลุ่มโหนดอยู่แล้ว) */
    if(entry.bus) continue;
    (entry.ports || []).forEach(function(p){
      if(!(net.deg.get(p) || 0)) return;
      if(mappedPorts.indexOf(p) >= 0) return;
      stray.push({ el:entry, port:p });
    });
  }
  score -= stray.length * 2;

  var perfect = !splitGroups.length && !mergedPairs.length && !stray.length;

  /* --- สร้างข้อความบอกจุดที่ต่างจากเฉลย --- */
  var msg = '';
  if(splitGroups.length){
    var g0 = splitGroups[0];
    var names = g0.list.map(function(x){
      return termName(net, itemById(net, x.port.dataset.itemId), x.port);
    }).filter(Boolean);
    msg = 'จุดเหล่านี้ต้องต่อถึงกัน แต่ตอนนี้ยังแยกกันอยู่ — ' + names.join(' กับ ');
    detail.push(msg);
  } else if(mergedPairs.length){
    var m0 = mergedPairs[0];
    var nm = m0[2].map(function(x){ return termName(net, itemById(net, x.port.dataset.itemId), x.port); });
    msg = 'มีจุดที่ไม่ควรต่อถึงกัน กลับต่อถึงกันอยู่ — ตรวจแถวราง/สายที่พาดข้ามใกล้ ' + nm.join(' และ ');
    detail.push(msg);
  } else if(stray.length){
    var s0 = stray[0];
    msg = 'มีการต่อเกินที่ ' + termName(net, s0.el.item, s0.port) + ' — ด่านนี้ไม่ได้ใช้จุดนั้น';
    detail.push(msg);
  }
  return { score:score, perfect:perfect, msg:msg, detail:detail };
}

/* ลำดับการต่อที่เฉลยกำหนด เขียนเป็นข้อความ เช่น
   "ถ่านไฟฉาย AA → สวิตช์ → หลอดไฟ → กลับ ถ่านไฟฉาย AA" */
function solutionOrderText(solution){
  if(!solution || !solution.length) return '';
  var seq = [ solution[0][0].split('.')[0] ];
  for(var i=0;i<solution.length;i++){
    var d = solution[i][1].split('.')[0];
    if(i === solution.length - 1 && d === seq[0]) break;
    seq.push(d);
  }
  var names = seq.map(function(d){ return DEVICES[d] ? DEVICES[d].name : d; });
  return names.join(' → ') + ' → กลับ ' + names[0];
}

/* วงจรนี้ครบวงเดียวและมีทุกชิ้นอยู่บนทางเดินไฟไหม
   ใช้แยกกรณี "ต่อครบแล้วแต่สลับลำดับ" ออกจาก "ต่อไม่ครบ" */
function isCompleteSingleLoop(an){
  if(!an.branches || an.branches !== 1) return false;
  if(an.floating.length || an.shorted.length || an.islands.length) return false;
  var onPath = {};
  an.paths[0].forEach(function(s){ onPath[s.el.item.id] = true; });
  var all = true;
  an.net.els.forEach(function(e){ if(!e.isSource && !onPath[e.item.id]) all = false; });
  return all;
}

function itemById(net, id){
  var found = null;
  net.els.forEach(function(e){ if(e.item.id === id) found = e.item; });
  return found;
}
