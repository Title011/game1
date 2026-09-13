/* ============================================================
   ENDLESS — โหมดวัดความเร็ว (Endless / Arcade)

   เล่นทีละรอบต่อเนื่อง ยิ่งรอบสูงยิ่งยาก ยิ่งต่อเร็วยิ่งได้คะแนนเยอะ
   หมดเวลา = จบรัน แล้วบันทึกคะแนนลงตารางอันดับ

   ── หัวใจ: ตัวสุ่มต้องสร้างวงจร "ที่ต่อได้จริง" ──
   ไม่ได้สุ่มอุปกรณ์มั่วแล้วหวังว่าจะต่อได้ แต่สร้างจากแม่แบบที่รู้แน่ว่า
   ผ่านตัวตรวจทุกตัว (checkSeriesTopology / checkParallelTopology /
   tracePolarity / tracePolarityThrough / isClosedCircuit) คือ:

     อนุกรม : แหล่งจ่าย(+) → d1 → d2 → ... → dn → กลับแหล่งจ่าย(−)
     ขนาน   : ทำสายโซ่ข้างบนซ้ำหลายสาขา แยกจากขั้วแหล่งจ่ายโดยตรง

   ทำไมแม่แบบนี้ผ่านเสมอ:
   • เรียงหัวชนท้ายเป็นวงเดียว → ระบบวิเคราะห์อ่านได้เป็นอนุกรม 1 ทางเดิน
   • อุปกรณ์มีขั้วทุกตัวในเกมนี้ pos='left', neg='right' ส่วนแหล่งจ่าย
     pos='right', neg='left' → เรียงหัวชนท้ายแบบนี้ ขั้วตรงกันเสมอ
   • ไม่มีขาไหนลอย ไม่มีชิ้นไหนถูกต่อคร่อม → ผ่านทุกด่านของการวิเคราะห์
   ============================================================ */

/* ---------- คลังอุปกรณ์ที่ตัวสุ่มหยิบได้ (แบ่งตามระดับความยาก) ---------- */
var GEN_SOURCES = ['battery_aa','battery_9v'];
var GEN_BASIC   = ['switch','fuse','resistor','bulb'];          /* ไม่มีขั้ว ง่าย */
var GEN_MID     = ['diode','led','ldr','buzzer'];               /* เริ่มมีขั้ว */
var GEN_HARD    = ['capacitor','motor','transistor'];
var GEN_OUTPUTS = ['bulb','led','motor','buzzer'];               /* ต้องมีอย่างน้อย 1 */

/* อุปกรณ์ที่มีจุดขั้วเกิน 2 จุด — กันออกจากโจทย์วงจรขนาน
   ระบบวิเคราะห์ใหม่รองรับได้แล้ว แต่กันไว้เพื่อให้โจทย์สุ่มอ่านง่าย
   ไม่ต้องให้ผู้เล่นเดาว่าขาที่เหลือของทรานซิสเตอร์ต้องทำยังไง */
var GEN_NO_PARALLEL = { transistor:true };

function _rnd(a){ return a[Math.floor(Math.random()*a.length)]; }
function _shuffle(a){
  for(var i=a.length-1;i>0;i--){
    var j=Math.floor(Math.random()*(i+1)), t=a[i]; a[i]=a[j]; a[j]=t;
  }
  return a;
}

/* สร้างสายโซ่อุปกรณ์ 1 ชุด (ไม่รวมแหล่งจ่าย) */
function genChain(pool, len){
  var outs = pool.filter(function(d){ return GEN_OUTPUTS.indexOf(d) >= 0; });
  var chain = [ _rnd(outs.length ? outs : ['bulb']) ];   /* ต้องมีตัวที่ทำงานให้เห็นผล */
  while(chain.length < len) chain.push(_rnd(pool));

  /* กฎที่เกมสอนไว้ตั้งแต่ด่าน 8: มี LED ต้องมีตัวต้านทานคู่เสมอ */
  if(chain.indexOf('led') >= 0 && chain.indexOf('resistor') < 0){
    if(chain.length > 1) chain[chain.length-1] = 'resistor';
    else chain.push('resistor');
  }
  return _shuffle(chain);
}

/* สร้างโจทย์ 1 รอบ — คืน object หน้าตาเหมือนด่านใน LEVELS */
function buildEndlessLevel(round){
  /* ความยากไต่ขึ้นตามรอบ */
  var chainLen = Math.min(6, 2 + Math.floor(round/3));
  var isParallel = (round >= 6) && (Math.random() < 0.35);

  var pool = GEN_BASIC.slice();
  if(round >= 3) pool = pool.concat(GEN_MID);
  if(round >= 8) pool = pool.concat(GEN_HARD);

  var branches = 1;
  if(isParallel){
    pool = pool.filter(function(d){ return !GEN_NO_PARALLEL[d]; });
    branches = (round >= 12 && Math.random() < 0.4) ? 3 : 2;
    chainLen = Math.min(chainLen, 2);       /* ขนานคูณจำนวนสาขา อย่าให้ยาวเกิน */
  }

  var chain = genChain(pool, chainLen);

  /* เลือกแหล่งจ่ายให้วงจร "ทำงานได้จริง" ไม่ใช่แค่ต่อครบ
     LED กับไดโอดมีแรงดันเกณฑ์ของตัวเอง (1.65V / 0.7V) ถ้าใช้ถ่าน AA 1.5V
     แล้วในวงมีตัวใดตัวหนึ่ง กระแสจะแทบไม่ไหลเลย โจทย์จะกลายเป็นต่อยังไงก็ไม่ติด
     สายโซ่ที่ยาวก็กินแรงดันมาก ต้องใช้ 9V เหมือนกัน */
  var needsHighV = chain.indexOf('led') >= 0 || chain.indexOf('diode') >= 0 || chain.length >= 4;
  var src = needsHighV ? 'battery_9v' : _rnd(GEN_SOURCES);

  /* ---- เฉลย: ต่อหัวชนท้ายแล้ววนกลับแหล่งจ่าย ---- */
  function branchPairs(){
    var p = [[ src+'.right', chain[0]+'.left' ]];
    for(var i=0;i<chain.length-1;i++) p.push([ chain[i]+'.right', chain[i+1]+'.left' ]);
    p.push([ chain[chain.length-1]+'.right', src+'.left' ]);
    return p;
  }
  var sol = [];
  for(var b=0;b<branches;b++) sol = sol.concat(branchPairs());

  /* ---- คลังอุปกรณ์: สาขาละ 1 ชุด ---- */
  var inv = {}; inv[src] = 1;
  chain.forEach(function(d){ inv[d] = (inv[d]||0) + branches; });

  var names = chain.map(function(d){ return DEVICES[d].name; }).join(' + ');
  var goal  = isParallel
    ? 'ต่อ ' + names + ' แบบขนาน ' + branches + ' สาขา จากแหล่งจ่ายเดียวกัน'
    : 'ต่อ ' + names + ' เรียงกันแบบอนุกรมให้ครบวงจร';

  /* ผลที่ต้องได้ — บอกจากอุปกรณ์ที่กินไฟในโจทย์ ว่าต่อเสร็จแล้วต้องเห็นอะไร */
  var showTh = { bulb:'หลอดไฟติด', led:'LED ติด', motor:'มอเตอร์หมุน', buzzer:'บัซเซอร์ดัง' };
  var shows = [];
  chain.forEach(function(d){ if(showTh[d] && shows.indexOf(showTh[d]) < 0) shows.push(showTh[d]); });
  var outcome = shows.length
    ? shows.join(' · ') + (isParallel ? ' ครบทุกสาขา' : ' พร้อมกันทั้งวง')
    : 'วงจรปิดครบ ไฟไหลได้ตลอดวง';

  return {
    title:'รอบที่ ' + round,
    goal: goal,
    outcome: outcome,
    inventory: inv,
    solution: sol,
    topology: isParallel
      ? { type:'parallel', branches:branches, mustHave:chain.slice() }
      : { type:'series' },
    /* ข้อกำหนดผลลัพธ์ — โจทย์สุ่มก็ตัดสินจาก "ผลที่ออกมา" เหมือนโหมดด่าน */
    require: autoRequire(inv, isParallel ? 'parallel' : 'series', branches),
    /* เวลา: คิดจาก "จำนวนสายที่ต้องต่อ" เป็นหลัก แล้วบีบลงตามรอบ (สูงสุด 30%)
       ผูกกับขนาดวงจรตรง ๆ แบบนี้ยุติธรรมกว่าให้เวลาก้อนใหญ่ตายตัว
       เพราะโจทย์ 2 ชิ้นกับ 6 ชิ้นใช้เวลาต่างกันมาก

       พื้นขั้นต่ำ 65 วินาที — ทุกรอบต้องเกิน 1 นาทีเสมอ
       ความยากมาจากวงจรที่ใหญ่ขึ้น ไม่ใช่การบีบเวลาจนเล่นไม่ทัน */
    timeLimit: Math.max(65, Math.round((30 + sol.length*10) * (1 - Math.min(0.3, round*0.02)))),
    baseScore: 50 + round*10,
    tutorial:[{ img:'', text:'โหมดวัดความเร็ว — รอบที่ ' + round + '\n\n' + goal +
      '\n\nต่อให้เร็วที่สุดเพื่อคะแนนโบนัส\nมีชีวิตเดียว — ตอบผิดหรือหมดเวลา = จบรันทันที' }],
    check:function(items,wires){
      var c = isClosedCircuit(items,wires);
      if(!c.ok) return c;
      return {ok:true, msg:'วงจรถูกต้อง!'};
    }
  };
}

/* ============================================================
   วงจรการเล่นของโหมดวัดความเร็ว
   ============================================================ */
function toggleEndless(){
  if(G.endless){
    showConfirm({
      title:'ออกจากโหมดวัดความเร็ว',
      message:'จบรันนี้เลยไหม?',
      detail:'คะแนนปัจจุบัน <b>' + G.endlessScore + '</b> จะถูกนำไปบันทึกลงตารางอันดับ',
      icon:'trophy', okText:'จบรัน', cancelText:'เล่นต่อ', danger:true,
      onConfirm:function(){ endEndlessRun('ออกจากโหมดเอง'); }
    });
  } else {
    enterEndless();
  }
}

function enterEndless(){
  /* ด่านสุดท้ายคือเงื่อนไขปลดล็อก — กันไว้เผื่อเรียกฟังก์ชันตรง ๆ */
  if(!G.modesUnlocked){
    showToast('ปลดล็อกโหมดนี้ได้หลังเล่นครบทุกด่าน','error');
    return;
  }
  showScreen('screen-game');
  if(G.sandbox){ G.sandbox=false; document.body.classList.remove('sandbox-mode'); updateSandboxButton(); }
  G.endless = true;
  G.endlessRound = 1;
  G.endlessScore = 0;
  G.endlessLives = 1;
  document.body.classList.add('endless-mode');
  updateEndlessButton();
  loadEndlessRound();
  showToast('โหมดวัดความเร็ว! ต่อให้เร็วที่สุด ยิ่งเร็วยิ่งได้คะแนน','success');
}

function loadEndlessRound(){
  G.genLevel = buildEndlessLevel(G.endlessRound);
  var lv = G.genLevel;

  clearInterval(G.timerInt);
  cancelTapConnect();
  if(G.probeMode) toggleProbeMode();
  stopCurrentFlow();
  deselectAll();
  clearWorkspace(true);

  G.invCounts = Object.assign({}, lv.inventory);
  renderInventory();
  document.getElementById('goal-title').textContent = lv.title;
  document.getElementById('goal-desc').textContent  = lv.goal;
  setGoalOutcome(lv.outcome);

  G.timerSec = lv.timeLimit;
  G.levelStartTime = Date.now();
  updateTimerDisplay();
  document.getElementById('timer-display').classList.remove('warning');
  G.timerInt = setInterval(tickTimer,1000);
  updateLevelBar();
  ensureBreadboard();
}

/* ผลการตรวจในโหมดวัดความเร็ว — เรียกจาก checkCircuit() */
function endlessResult(result, elapsed){
  if(result.ok){
    clearInterval(G.timerInt);
    G.wsItems.forEach(function(i){ i.el.classList.add('powered'); });
    startCurrentFlow();

    /* ยิ่งเหลือเวลามาก = ต่อเร็ว = โบนัสเยอะ */
    var speedBonus = Math.max(0, G.timerSec) * 6;
    var earned = G.genLevel.baseScore + speedBonus;
    G.endlessScore += earned;
    G.endlessRound++;
    updateLevelBar();
    showEndlessWin(earned, speedBonus, elapsed);
  } else {
    /* มีชีวิตเดียว — ตอบผิดครั้งเดียวจบรันทันที */
    G.endlessLives--;
    updateLevelBar();
    showToast(result.msg,'error');
    if(G.endlessLives <= 0){
      clearInterval(G.timerInt);
      setTimeout(function(){ endEndlessRun('ต่อวงจรผิด'); }, 1200);
    }
  }
}

function showEndlessWin(earned, bonus, elapsed){
  document.getElementById('result-icon').innerHTML =
    '<span style="color:#00d97e">' + ICON('checkCircle',56) + '</span>';
  document.getElementById('result-header-title').innerHTML = ICON('check',18) + ' ผ่านรอบ!';
  document.getElementById('result-title').textContent = '+' + earned + ' คะแนน';
  document.getElementById('result-msg').textContent =
    'โบนัสความเร็ว +' + bonus + ' (เหลือเวลา ' + Math.max(0,G.timerSec) + ' วินาที)';
  document.getElementById('stat-score').textContent = G.endlessScore;
  document.getElementById('stat-time').textContent  = elapsed + 's';
  document.getElementById('stat-wires').textContent = G.wires.length;
  document.getElementById('result-hint').innerHTML  = '';
  var btn = document.getElementById('btn-next-level');
  btn.innerHTML = 'รอบที่ ' + G.endlessRound + ' →';
  btn.disabled = false;
  openModal('modal-result');
}

/* จบรัน — หมดเวลา หรือกดออกเอง */
function endEndlessRun(reason){
  clearInterval(G.timerInt);
  stopCurrentFlow();
  closeModal('modal-result');

  var score = G.endlessScore;
  var round = G.endlessRound;
  G.endless = false;
  G.genLevel = null;
  document.body.classList.remove('endless-mode');
  updateEndlessButton();

  document.getElementById('eo-reason').textContent = reason;
  document.getElementById('eo-score').textContent  = score;
  document.getElementById('eo-sub').textContent    = 'ไปถึงรอบที่ ' + round;

  /* เก็บไว้ให้ปุ่มบันทึกคะแนนใช้ */
  G._lastRun = { score:score, round:round };
  document.getElementById('eo-name').value = '';
  document.getElementById('eo-save-row').style.display = score > 0 ? '' : 'none';
  renderLeaderboard();
  openModal('modal-endless-over');
}

function restartEndless(){
  closeModal('modal-endless-over');
  enterEndless();
}

/* ออกจากโหมดกลับไปเล่นด่านปกติ */
function quitEndlessToLevels(){
  closeModal('modal-endless-over');
  buildLevelBar();
  loadLevel(G.level);
}

function updateEndlessButton(){
  var b = document.getElementById('btn-endless');
  if(!b) return;
  b.innerHTML = G.endless ? ICON('trophy',15) + ' จบรัน' : ICON('trophy',15) + ' วัดความเร็ว';
  b.classList.toggle('active', !!G.endless);
}

/* ============================================================
   LEADERBOARD — ตารางอันดับ เก็บใน localStorage ของเครื่อง
   ============================================================ */
var LB_KEY = 'endless-board-v1';
var LB_MAX = 10;

function loadBoard(){
  if(!SAVE_OK) return [];
  try{
    var raw = localStorage.getItem(LB_KEY);
    if(!raw) return [];
    var a = JSON.parse(raw);
    return Object.prototype.toString.call(a) === '[object Array]' ? a : [];
  }catch(e){ return []; }
}

function storeBoard(list){
  if(!SAVE_OK) return;
  try{ localStorage.setItem(LB_KEY, JSON.stringify(list)); }catch(e){}
}

/* บันทึกคะแนนของรันล่าสุด (ปุ่มในหน้าจบเกม) */
function submitEndlessScore(){
  var run = G._lastRun;
  if(!run){ return; }
  var input = document.getElementById('eo-name');
  var name  = (input.value || '').trim().slice(0,12);
  if(!name){ showToast('กรุณาใส่ชื่อก่อนบันทึก','error'); input.focus(); return; }

  var list = loadBoard();
  list.push({ name:name, score:run.score, round:run.round, at:Date.now() });
  list.sort(function(a,b){ return b.score - a.score; });
  if(list.length > LB_MAX) list = list.slice(0, LB_MAX);
  storeBoard(list);

  G._lastRun = null;
  document.getElementById('eo-save-row').style.display = 'none';
  renderLeaderboard(name, run.score);
  showToast('บันทึกคะแนนลงตารางอันดับแล้ว','success');
}

function renderLeaderboard(hlName, hlScore){
  var box = document.getElementById('eo-board');
  if(!box) return;
  var list = loadBoard();
  if(!list.length){
    box.innerHTML = '<div class="lb-empty">ยังไม่มีคะแนนในตารางอันดับ</div>';
    return;
  }
  var html = '<div class="lb-head"><span>อันดับ</span><span>ชื่อ</span><span>รอบ</span><span>คะแนน</span></div>';
  list.forEach(function(r,i){
    var hot = (hlName && r.name === hlName && r.score === hlScore) ? ' hot' : '';
    html += '<div class="lb-row'+hot+'">'
          + '<span class="lb-rank r'+(i+1)+'">'+(i+1)+'</span>'
          + '<span class="lb-name">'+escapeHtml(r.name)+'</span>'
          + '<span class="lb-round">'+(r.round||'-')+'</span>'
          + '<span class="lb-score">'+r.score+'</span>'
          + '</div>';
  });
  box.innerHTML = html;
}

/* ชื่อผู้เล่นเป็นข้อความที่ผู้ใช้พิมพ์เอง ต้อง escape ก่อนใส่ innerHTML */
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  });
}
