/* ============================================================
   LEVELS — ข้อมูลด่านทั้ง 20 ด่าน

   แต่ละด่านประกอบด้วย:
     title     ชื่อด่าน
     goal      คำอธิบายเป้าหมาย
     inventory อุปกรณ์ที่ให้ใช้ + จำนวน
     solution  เฉลยการต่อสาย (คู่จุด) — ใช้ตรวจและสร้างคำใบ้
               *** จำนวนสายที่ผู้เล่นต่อ ต้องเท่ากับความยาว solution เป๊ะ ***
     topology  โครงสร้างวงจร series / parallel
     timeLimit เวลาจำกัด (วินาที), baseScore คะแนนพื้นฐาน
     tutorial  หน้าคู่มือของด่าน (รูป + ข้อความ)
     check     ฟังก์ชันตรวจเงื่อนไขเฉพาะของด่าน

   ── เส้นโค้งความยาก (แบ่ง 7 บท เพิ่มทีละอย่าง ไม่กระโดด) ──
   บทที่ 1 (1-4)   วงจรปิดพื้นฐาน       2 → 4 ชิ้น
   บทที่ 2 (5-7)   วงจรอนุกรม           4 → 5 ชิ้น
   บทที่ 3 (8-10)  ขั้วบวก/ลบ           3 → 4 ชิ้น
   บทที่ 4 (11-13) วงจรขนาน             3 → 4 ชิ้น (4 → 6 สาย)
   บทที่ 5 (14-16) อุปกรณ์เปลี่ยนพลังงาน 3 → 4 ชิ้น
   บทที่ 6 (17-19) อิเล็กทรอนิกส์ขั้นสูง 4 → 5 ชิ้น
   บทที่ 7 (20)    วงจรผสมรวมทุกอย่าง    8 ชิ้น
   ============================================================ */
var LEVELS = [

  /* ══════════ บทที่ 1 — วงจรปิดพื้นฐาน ══════════ */
  {
    title:'ด่านที่ 1 — หลอดไฟดวงแรก',
    goal:'ต่อถ่านไฟฉายเข้ากับหลอดไฟให้ครบวงจร ไฟจึงจะติด',
    inventory:{battery_aa:1,bulb:1},
    solution:[["battery_aa.right", "bulb.left"], ["bulb.right", "battery_aa.left"]],
    topology:{type:'series'},
    timeLimit:150, baseScore:60,
    tutorial:[
      {img:'Insert_image_here',text:'วงจรไฟฟ้าที่ง่ายที่สุดมีแค่ 2 อย่าง:\n1. แหล่งพลังงาน (ถ่านไฟฉาย)\n2. อุปกรณ์ใช้ไฟ (หลอดไฟ)\n\nหัวใจสำคัญคือต้องต่อเป็น "วงจรปิด"\nคือไฟวิ่งออกจากถ่านด้านหนึ่ง ผ่านหลอดไฟ\nแล้ววิ่งกลับเข้าถ่านอีกด้านหนึ่งได้ครบรอบ\n\nถ้าขาดตอนตรงไหน ไฟจะไม่ไหล หลอดไม่ติด'},
      {img:'Insert_image_here',text:'วิธีเล่น:\n1. ลากถ่านไฟฉายกับหลอดไฟจากคลังด้านซ้าย มาวางในพื้นที่ทำงาน\n2. กดปุ่ม "ต่อสายไฟ" (หรือกดคีย์ E)\n3. ลากจากจุดขั้วหนึ่ง ไปปล่อยที่จุดขั้วอีกอัน\n4. ต่อครบ 2 เส้นแล้วกด "ตรวจวงจร"\n\nมือถือ: แตะจุดที่ 1 แล้วแตะจุดที่ 2\nลบสาย: ออกจากโหมดต่อสายก่อน แล้วแตะที่เส้น\n(คอมพิวเตอร์คลิกขวาที่เส้นได้เลย)'},
    ],
    check:function(items,wires){
      var ids=items.map(function(i){return i.deviceId;});
      if(ids.indexOf('battery_aa')<0) return {ok:false,msg:'ยังขาด ถ่านไฟฉาย AA'};
      if(ids.indexOf('bulb')<0)       return {ok:false,msg:'ยังขาด หลอดไฟ'};
      var c=isClosedCircuit(items,wires); if(!c.ok) return c;
      return {ok:true,msg:'หลอดไฟติดแล้ว! นี่คือวงจรปิดที่สมบูรณ์'};
    }
  },
  {
    title:'ด่านที่ 2 — เพิ่มสวิตช์',
    goal:'เพิ่มสวิตช์เข้าไปในวงจร เพื่อควบคุมการเปิด-ปิดไฟ',
    inventory:{battery_aa:1,switch:1,bulb:1},
    solution:[["battery_aa.right", "switch.left"], ["switch.right", "bulb.left"], ["bulb.right", "battery_aa.left"]],
    topology:{type:'series'},
    timeLimit:160, baseScore:70,
    tutorial:[
      {img:'Insert_image_here',text:'สวิตช์ = ตัวควบคุมวงจร\n\nทำหน้าที่ "ตัด" หรือ "ต่อ" ทางเดินของไฟ\n• สวิตช์ปิด (ON) → วงจรครบ ไฟไหลได้\n• สวิตช์เปิด (OFF) → วงจรขาด ไฟไม่ไหล\n\nต่อสวิตช์แบบอนุกรม คือแทรกอยู่ในเส้นทาง\nที่ไฟต้องวิ่งผ่าน ไม่ใช่ต่อคร่อมอยู่ข้าง ๆ\n\nลำดับที่ต้องต่อ:\nถ่าน → สวิตช์ → หลอดไฟ → กลับถ่าน'},
    ],
    check:function(items,wires){
      var ids=items.map(function(i){return i.deviceId;});
      if(ids.indexOf('switch')<0) return {ok:false,msg:'ยังขาด สวิตช์'};
      if(ids.indexOf('bulb')<0)   return {ok:false,msg:'ยังขาด หลอดไฟ'};
      var c=isClosedCircuit(items,wires); if(!c.ok) return c;
      return {ok:true,msg:'ควบคุมไฟด้วยสวิตช์ได้แล้ว!'};
    }
  },
  {
    title:'ด่านที่ 3 — แบตเตอรี่ 9V',
    goal:'เปลี่ยนมาใช้แบตเตอรี่ 9V เป็นแหล่งจ่ายไฟแทนถ่าน AA',
    inventory:{battery_9v:1,switch:1,bulb:1},
    solution:[["battery_9v.right", "switch.left"], ["switch.right", "bulb.left"], ["bulb.right", "battery_9v.left"]],
    topology:{type:'series'},
    timeLimit:160, baseScore:80,
    tutorial:[
      {img:'Insert_image_here',text:'แหล่งจ่ายไฟมีหลายขนาด\n\n• ถ่านไฟฉาย AA = 1.5 โวลต์\n• แบตเตอรี่ 9V   = 9 โวลต์ (แรงกว่า 6 เท่า)\n\nแรงดัน (โวลต์) เปรียบเหมือน "แรงดันน้ำ"\nยิ่งแรงดันสูง ยิ่งดันกระแสผ่านวงจรได้มาก\nหลอดไฟก็สว่างขึ้น\n\nลองใช้ปุ่ม "เครื่องวัด" แล้วจิ้มที่เส้นสาย\nเพื่อดูค่าแรงดันและกระแสจริงในวงจรได้'},
    ],
    check:function(items,wires){
      var ids=items.map(function(i){return i.deviceId;});
      if(ids.indexOf('battery_9v')<0) return {ok:false,msg:'ด่านนี้ต้องใช้แบตเตอรี่ 9V'};
      var c=isClosedCircuit(items,wires); if(!c.ok) return c;
      return {ok:true,msg:'ใช้แบตเตอรี่ 9V ได้แล้ว หลอดสว่างกว่าเดิม!'};
    }
  },
  {
    title:'ด่านที่ 4 — ตัวต้านทาน',
    goal:'เพิ่มตัวต้านทานเข้าไปในวงจร เพื่อจำกัดกระแสไฟ',
    inventory:{battery_9v:1,switch:1,resistor:1,bulb:1},
    solution:[["battery_9v.right", "switch.left"], ["switch.right", "resistor.left"], ["resistor.right", "bulb.left"], ["bulb.right", "battery_9v.left"]],
    topology:{type:'series'},
    timeLimit:170, baseScore:90,
    tutorial:[
      {img:'Insert_image_here',text:'ตัวต้านทาน (Resistor) = ตัวจำกัดกระแส\n\nเปรียบเหมือนท่อน้ำที่แคบลง\nน้ำ (กระแส) ไหลผ่านได้น้อยลง\n\nกฎของโอห์ม:  I = V ÷ R\n  I = กระแส (แอมป์)\n  V = แรงดัน (โวลต์)\n  R = ความต้านทาน (โอห์ม)\n\nยิ่ง R มาก กระแสยิ่งน้อย\nใช้ป้องกันอุปกรณ์ไม่ให้พังเพราะกระแสเกิน'},
      {img:'Insert_image_here',text:'อ่านค่าตัวต้านทานจากแถบสี\n\nตัวต้านทานมีแถบสีคาดอยู่บนตัว\nแต่ละสีแทนตัวเลข อ่านเรียงจากซ้ายไปขวา\n\nตัวในเกมนี้: น้ำตาล-ดำ-แดง-ทอง\n= 1, 0, ×100, ความคลาดเคลื่อน ±5%\n= 1000 โอห์ม (1 กิโลโอห์ม)\n\nลองกด "เครื่องวัด" เทียบกระแสก่อนและหลัง\nใส่ตัวต้านทาน จะเห็นว่ากระแสลดลงจริง'},
    ],
    check:function(items,wires){
      var ids=items.map(function(i){return i.deviceId;});
      if(ids.indexOf('resistor')<0) return {ok:false,msg:'ยังขาด ตัวต้านทาน'};
      var c=isClosedCircuit(items,wires); if(!c.ok) return c;
      return {ok:true,msg:'ตัวต้านทานจำกัดกระแสได้แล้ว!'};
    }
  },

  /* ══════════ บทที่ 2 — วงจรอนุกรม ══════════ */
  {
    title:'ด่านที่ 5 — อนุกรม 2 หลอด',
    goal:'ต่อหลอดไฟ 2 ดวงเรียงกันแบบอนุกรมในวงเดียว',
    inventory:{battery_9v:1,switch:1,bulb:2},
    solution:[["battery_9v.right", "switch.left"], ["switch.right", "bulb.left"], ["bulb.right", "bulb.left"], ["bulb.right", "battery_9v.left"]],
    topology:{type:'series'},
    timeLimit:180, baseScore:100,
    tutorial:[
      {img:'Insert_image_here',text:'วงจรอนุกรม = ต่อเรียงกันเป็นทอดเดียว\n\nไฟมีทางเดินเดียว วิ่งผ่านทุกอุปกรณ์เรียงกัน\nแล้ววนกลับมาที่แหล่งจ่าย\n\nคุณสมบัติสำคัญ:\n• กระแสเท่ากันทุกจุดในวง\n• แรงดันถูกแบ่งกันระหว่างอุปกรณ์\n• หลอด 2 ดวงอนุกรม → แต่ละดวงได้แรงดันครึ่งเดียว\n  จึงสว่างน้อยกว่าตอนมีดวงเดียว'},
      {img:'Insert_image_here',text:'ข้อเสียของวงจรอนุกรม\n\nถ้าอุปกรณ์ตัวใดตัวหนึ่งขาด\nวงจรจะขาดทั้งหมด ทุกอย่างดับหมด\n\nเหมือนไฟประดับต้นคริสต์มาสรุ่นเก่า\nหลอดเดียวขาด ดับทั้งเส้น\n\nกฎการต่อ: ทุกจุดขั้วต้องมีสายเส้นเดียวเท่านั้น\nถ้าจุดไหนมี 2 เส้น แปลว่าไม่ใช่อนุกรมแล้ว'},
    ],
    check:function(items,wires){
      var bulbs=items.filter(function(i){return i.deviceId==='bulb';});
      if(bulbs.length<2) return {ok:false,msg:'ต้องมีหลอดไฟ 2 ดวง (ตอนนี้มี '+bulbs.length+')'};
      var c=isClosedCircuit(items,wires); if(!c.ok) return c;
      return {ok:true,msg:'วงจรอนุกรม 2 หลอดสมบูรณ์!'};
    }
  },
  {
    title:'ด่านที่ 6 — ฟิวส์ป้องกัน',
    goal:'เพิ่มฟิวส์ป้องกันกระแสเกิน โดยวางไว้ใกล้แหล่งจ่ายที่สุด',
    inventory:{battery_9v:1,fuse:1,switch:1,bulb:1},
    solution:[["battery_9v.right", "fuse.left"], ["fuse.right", "switch.left"], ["switch.right", "bulb.left"], ["bulb.right", "battery_9v.left"]],
    topology:{type:'series'},
    timeLimit:180, baseScore:110,
    tutorial:[
      {img:'Insert_image_here',text:'ฟิวส์ (Fuse) = อุปกรณ์นิรภัย\n\nข้างในเป็นลวดโลหะจุดหลอมเหลวต่ำ\nเมื่อกระแสเกินค่าพิกัด (ตัวนี้ 5 แอมป์)\nลวดจะร้อนจนหลอมขาด ตัดวงจรทันที\n\nป้องกันไม่ให้สายไฟไหม้\nและอุปกรณ์ราคาแพงเสียหาย\n\nฟิวส์ขาดแล้วใช้ซ้ำไม่ได้ ต้องเปลี่ยนใหม่'},
      {img:'Insert_image_here',text:'ฟิวส์ต้องต่อตรงไหน?\n\nกฎ: ต่อ "อนุกรม" และวางใกล้แหล่งจ่ายที่สุด\nคือก่อนสวิตช์และก่อนโหลดทุกตัว\n\nเพราะถ้าเกิดไฟเกินหรือลัดวงจรที่จุดใดก็ตาม\nฟิวส์จะตัดไฟทั้งวงจรได้ทันที\n\nลำดับที่ถูกต้อง:\nแบตเตอรี่ → ฟิวส์ → สวิตช์ → หลอดไฟ → กลับแบตเตอรี่'},
    ],
    check:function(items,wires){
      var ids=items.map(function(i){return i.deviceId;});
      if(ids.indexOf('fuse')<0) return {ok:false,msg:'ยังขาด ฟิวส์'};
      var c=isClosedCircuit(items,wires); if(!c.ok) return c;
      return {ok:true,msg:'วงจรปลอดภัยด้วยฟิวส์แล้ว!'};
    }
  },
  {
    title:'ด่านที่ 7 — อนุกรมเต็มรูปแบบ',
    goal:'รวมทุกอย่างที่เรียนมา: ฟิวส์ + สวิตช์ + หลอดไฟ 2 ดวงอนุกรม',
    inventory:{battery_9v:1,fuse:1,switch:1,bulb:2},
    solution:[["battery_9v.right", "fuse.left"], ["fuse.right", "switch.left"], ["switch.right", "bulb.left"], ["bulb.right", "bulb.left"], ["bulb.right", "battery_9v.left"]],
    topology:{type:'series'},
    timeLimit:200, baseScore:120,
    tutorial:[
      {img:'Insert_image_here',text:'ทบทวนบทที่ 2 — วงจรอนุกรม\n\nด่านนี้รวมทุกอย่างที่ผ่านมาไว้ในวงเดียว\nแบตเตอรี่ + ฟิวส์ + สวิตช์ + หลอดไฟ 2 ดวง\n\nลำดับที่แนะนำ (ป้องกันก่อน ควบคุมทีหลัง):\n1. แบตเตอรี่ → ฟิวส์   (ป้องกันไว้ก่อน)\n2. ฟิวส์ → สวิตช์      (ควบคุม)\n3. สวิตช์ → หลอดที่ 1\n4. หลอดที่ 1 → หลอดที่ 2\n5. หลอดที่ 2 → กลับแบตเตอรี่\n\nรวม 5 เส้น ทุกจุดมีสายเส้นเดียว'},
    ],
    check:function(items,wires){
      var ids=items.map(function(i){return i.deviceId;});
      var bulbs=items.filter(function(i){return i.deviceId==='bulb';});
      if(ids.indexOf('fuse')<0) return {ok:false,msg:'ยังขาด ฟิวส์'};
      if(bulbs.length<2) return {ok:false,msg:'ต้องมีหลอดไฟ 2 ดวง (ตอนนี้มี '+bulbs.length+')'};
      var c=isClosedCircuit(items,wires); if(!c.ok) return c;
      return {ok:true,msg:'วงจรอนุกรมเต็มรูปแบบสมบูรณ์!'};
    }
  },

  /* ══════════ บทที่ 3 — ขั้วบวก/ลบ ══════════ */
  {
    title:'ด่านที่ 8 — LED มีขั้ว!',
    goal:'ต่อ LED ให้ถูกขั้ว โดยมีตัวต้านทานป้องกันเสมอ',
    inventory:{battery_aa:1,resistor:1,led:1},
    solution:[["battery_aa.right", "resistor.left"], ["resistor.right", "led.left"], ["led.right", "battery_aa.left"]],
    topology:{type:'series'},
    timeLimit:180, baseScore:130,
    tutorial:[
      {img:'Insert_image_here',text:'อุปกรณ์ "มีขั้ว" ต่อกลับด้านไม่ได้!\n\nหลอดไฟธรรมดาต่อทางไหนก็ติด\nแต่ LED ต้องต่อถูกขั้วเท่านั้น\n\nสังเกตสีของจุดขั้วในเกม:\n🔴 จุดแดงมีเครื่องหมาย +  = ขั้วบวก\n🔵 จุดน้ำเงินมีเครื่องหมาย − = ขั้วลบ\n🟡 จุดเหลือง = ไม่มีขั้ว ต่อทางไหนก็ได้\n\nกฎ: ขั้ว + ของถ่าน ต้องไปหาขั้ว + ของ LED\n     ขั้ว − ของถ่าน ต้องไปหาขั้ว − ของ LED\n\nถ้าต่อกลับด้าน กด R เพื่อหมุนอุปกรณ์แก้ได้'},
      {img:'Insert_image_here',text:'ทำไม LED ต้องมีตัวต้านทานเสมอ?\n\nLED ยอมให้กระแสไหลผ่านได้ง่ายมาก\nถ้าต่อตรงเข้าถ่านโดยไม่มีอะไรกั้น\nกระแสจะพุ่งสูงจน LED ไหม้ทันที\n\nสูตรคำนวณ:  R = (Vs − Vf) ÷ If\n  Vs = แรงดันแหล่งจ่าย\n  Vf = แรงดันตกคร่อม LED (ประมาณ 2V)\n  If = กระแสที่ LED ทนได้ (ประมาณ 20mA)\n\nจำง่าย ๆ: เห็น LED เมื่อไหร่ ต้องมีตัวต้านทานคู่กันเสมอ'},
    ],
    check:function(items,wires){
      var ids=items.map(function(i){return i.deviceId;});
      if(ids.indexOf('led')<0)      return {ok:false,msg:'ยังขาด LED'};
      if(ids.indexOf('resistor')<0) return {ok:false,msg:'ต้องใส่ตัวต้านทานป้องกัน LED เสมอ!'};
      var c=isClosedCircuit(items,wires); if(!c.ok) return c;
      return {ok:true,msg:'LED ติดสว่างอย่างปลอดภัย ขั้วถูกต้อง!'};
    }
  },
  {
    title:'ด่านที่ 9 — LED + สวิตช์',
    goal:'เพิ่มสวิตช์ควบคุม LED โดยยังคงต่อขั้วให้ถูกต้อง',
    inventory:{battery_aa:1,switch:1,resistor:1,led:1},
    solution:[["battery_aa.right", "switch.left"], ["switch.right", "resistor.left"], ["resistor.right", "led.left"], ["led.right", "battery_aa.left"]],
    topology:{type:'series'},
    timeLimit:190, baseScore:140,
    tutorial:[
      {img:'Insert_image_here',text:'ขั้วยังถูกอยู่ไหม เมื่อมีตัวกลางคั่น?\n\nด่านนี้มีสวิตช์กับตัวต้านทานคั่นอยู่\nระหว่างถ่านกับ LED\n\nสวิตช์และตัวต้านทาน "ไม่มีขั้ว"\nไฟวิ่งทะลุผ่านได้ทั้งสองทาง\nจึงไม่ทำให้ขั้วของ LED เปลี่ยนไป\n\nสิ่งที่ต้องดูคือ: ไล่จากขั้ว + ของถ่าน\nวิ่งตามสายไปเรื่อย ๆ ต้องไปถึงขั้ว + ของ LED ก่อน\nแล้วออกทางขั้ว − กลับเข้าขั้ว − ของถ่าน\n\nสังเกตสีสายในเกม: สายแดง = ฝั่งบวก, สายฟ้า = ฝั่งลบ'},
    ],
    check:function(items,wires){
      var ids=items.map(function(i){return i.deviceId;});
      if(ids.indexOf('led')<0)      return {ok:false,msg:'ยังขาด LED'};
      if(ids.indexOf('resistor')<0) return {ok:false,msg:'ต้องใส่ตัวต้านทานป้องกัน LED!'};
      if(ids.indexOf('switch')<0)   return {ok:false,msg:'ยังขาด สวิตช์'};
      var c=isClosedCircuit(items,wires); if(!c.ok) return c;
      return {ok:true,msg:'ควบคุม LED ด้วยสวิตช์ได้แล้ว!'};
    }
  },
  {
    title:'ด่านที่ 10 — ไดโอดกันไฟย้อน',
    goal:'ต่อไดโอดให้ถูกทิศ เพื่อให้ไฟไหลผ่านได้ทางเดียว',
    inventory:{battery_9v:1,switch:1,diode:1,bulb:1},
    solution:[["battery_9v.right", "diode.left"], ["diode.right", "switch.left"], ["switch.right", "bulb.left"], ["bulb.right", "battery_9v.left"]],
    topology:{type:'series'},
    timeLimit:190, baseScore:150,
    tutorial:[
      {img:'Insert_image_here',text:'ไดโอด (Diode) = ประตูทางเดียว\n\nยอมให้กระแสไหลผ่านได้ทิศเดียวเท่านั้น\nถ้าไฟพยายามไหลย้อนกลับ ไดโอดจะกั้นไว้\n\nเปรียบเหมือนประตูที่ผลักเข้าได้อย่างเดียว\n\nขา A (Anode)   = ขั้วบวก  ไฟเข้าทางนี้\nขา K (Cathode) = ขั้วลบ   ไฟออกทางนี้\nสังเกตแถบสีเงินบนตัวไดโอด = ฝั่งขา K'},
      {img:'Insert_image_here',text:'ไดโอดใช้ทำอะไร?\n\n1. ป้องกันการต่อถ่านกลับขั้ว\n   ถ้าผู้ใช้ใส่ถ่านผิดด้าน ไดโอดจะกั้นไฟไว้\n   อุปกรณ์ข้างในไม่พัง\n\n2. แปลงไฟสลับ (AC) เป็นไฟตรง (DC)\n   ตัดครึ่งลูกคลื่นที่เป็นลบทิ้งไป\n\n3. ป้องกันไฟย้อนจากมอเตอร์ (จะเจอในด่านที่ 15)\n\nถ้าต่อไดโอดกลับด้าน วงจรจะไม่ทำงานเลย\nกด R เพื่อหมุนแก้ทิศได้'},
    ],
    check:function(items,wires){
      var ids=items.map(function(i){return i.deviceId;});
      if(ids.indexOf('diode')<0) return {ok:false,msg:'ยังขาด ไดโอด'};
      var c=isClosedCircuit(items,wires); if(!c.ok) return c;
      return {ok:true,msg:'ไดโอดต่อถูกทิศ ไฟไหลผ่านได้แล้ว!'};
    }
  },

  /* ══════════ บทที่ 4 — วงจรขนาน ══════════ */
  {
    title:'ด่านที่ 11 — ขนานครั้งแรก',
    goal:'ต่อหลอดไฟ 2 ดวงแบบขนาน โดยแยกออกจากขั้วแบตเตอรี่โดยตรง',
    inventory:{battery_9v:1,bulb:2},
    solution:[["battery_9v.right", "bulb.left"], ["bulb.right", "battery_9v.left"], ["battery_9v.right", "bulb.left"], ["bulb.right", "battery_9v.left"]],
    topology:{type:'parallel',branches:2,mustHave:['bulb']},
    timeLimit:200, baseScore:160,
    tutorial:[
      {img:'Insert_image_here',text:'วงจรขนาน = แยกเป็นหลายเส้นทาง\n\nต่างจากอนุกรมที่มีทางเดียว\nวงจรขนานแยกไฟออกเป็นหลาย "สาขา"\nแต่ละสาขาต่อคร่อมขั้วแบตเตอรี่โดยตรง\n\nคุณสมบัติสำคัญ:\n• ทุกสาขาได้แรงดันเต็มเท่ากัน\n  (หลอดจึงสว่างเต็มที่ ไม่หรี่เหมือนอนุกรม)\n• กระแสรวมถูกแบ่งไปตามแต่ละสาขา\n• สาขาหนึ่งขาด สาขาอื่นยังทำงานต่อได้'},
      {img:'Insert_image_here',text:'วิธีต่อขนานในเกมนี้\n\nสังเกตว่าจุดขั้วของแบตเตอรี่\nจะมีสายออกมา 2 เส้น (เท่ากับจำนวนสาขา)\nส่วนจุดขั้วของหลอดไฟ มีสายเส้นเดียวเหมือนเดิม\n\nต่อแบบนี้:\n  แบต(+) → หลอดที่ 1 → แบต(−)   ← สาขาที่ 1\n  แบต(+) → หลอดที่ 2 → แบต(−)   ← สาขาที่ 2\n\nรวม 4 เส้น\n\nนี่คือระบบไฟในบ้านจริง ๆ\nปลั๊กทุกจุดต่อขนานกัน จึงได้ 220V เท่ากันหมด'},
    ],
    check:function(items,wires){
      var bulbs=items.filter(function(i){return i.deviceId==='bulb';});
      if(bulbs.length<2) return {ok:false,msg:'ต้องมีหลอดไฟ 2 ดวง (ตอนนี้มี '+bulbs.length+')'};
      var c=isClosedCircuit(items,wires); if(!c.ok) return c;
      return {ok:true,msg:'วงจรขนานสมบูรณ์! ทั้ง 2 หลอดสว่างเต็มที่'};
    }
  },
  {
    title:'ด่านที่ 12 — ขนาน + สวิตช์แยกสาขา',
    goal:'ต่อหลอดไฟ 2 ดวงแบบขนาน ให้แต่ละดวงมีสวิตช์ควบคุมของตัวเอง',
    inventory:{battery_9v:1,switch:2,bulb:2},
    solution:[["battery_9v.right", "switch.left"], ["switch.right", "bulb.left"], ["bulb.right", "battery_9v.left"], ["battery_9v.right", "switch.left"], ["switch.right", "bulb.left"], ["bulb.right", "battery_9v.left"]],
    topology:{type:'parallel',branches:2,mustHave:['switch','bulb']},
    timeLimit:220, baseScore:170,
    tutorial:[
      {img:'Insert_image_here',text:'ข้อดีที่แท้จริงของวงจรขนาน\n\nใส่สวิตช์ไว้ในแต่ละสาขา\nจะเปิด-ปิดแยกกันได้อิสระ\nโดยไม่กระทบสาขาอื่นเลย\n\nนี่คือเหตุผลที่บ้านเราต่อไฟแบบขนาน\nปิดไฟห้องนอน แต่ไฟห้องนั่งเล่นยังติดอยู่\n\nถ้าต่ออนุกรม ปิดสวิตช์เดียว ดับทั้งบ้าน'},
      {img:'Insert_image_here',text:'แต่ละสาขาต้องมีครบทั้งชุด\n\nสาขาที่ 1: แบต(+) → สวิตช์ → หลอด → แบต(−)\nสาขาที่ 2: แบต(+) → สวิตช์ → หลอด → แบต(−)\n\nรวม 6 เส้น\n\nจุดขั้วแบตเตอรี่แต่ละข้าง จะมีสาย 2 เส้น\nจุดขั้วของสวิตช์และหลอด มีสายเส้นเดียว\n\nถ้าสาขาไหนขาดสวิตช์หรือขาดหลอด ระบบจะแจ้งเตือน'},
    ],
    check:function(items,wires){
      var bulbs=items.filter(function(i){return i.deviceId==='bulb';});
      var sws=items.filter(function(i){return i.deviceId==='switch';});
      if(bulbs.length<2) return {ok:false,msg:'ต้องมีหลอดไฟ 2 ดวง'};
      if(sws.length<2)   return {ok:false,msg:'ต้องมีสวิตช์ 2 ตัว (สาขาละ 1)'};
      var c=isClosedCircuit(items,wires); if(!c.ok) return c;
      return {ok:true,msg:'แต่ละสาขาควบคุมแยกกันได้แล้ว!'};
    }
  },
  {
    title:'ด่านที่ 13 — ขนาน 3 สาขา',
    goal:'ขยายวงจรขนานเป็น 3 สาขา ด้วยหลอดไฟ 3 ดวง',
    inventory:{battery_9v:1,bulb:3},
    solution:[["battery_9v.right", "bulb.left"], ["bulb.right", "battery_9v.left"], ["battery_9v.right", "bulb.left"], ["bulb.right", "battery_9v.left"], ["battery_9v.right", "bulb.left"], ["bulb.right", "battery_9v.left"]],
    topology:{type:'parallel',branches:3,mustHave:['bulb']},
    timeLimit:230, baseScore:180,
    tutorial:[
      {img:'Insert_image_here',text:'ยิ่งเพิ่มสาขา ยิ่งกินกระแสมาก\n\nแรงดันที่แต่ละสาขาได้ยังเท่าเดิม (9V)\nแต่กระแสรวมที่แบตเตอรี่ต้องจ่ายเพิ่มขึ้น\nตามจำนวนสาขา\n\n1 หลอด → กระแส I\n2 หลอด → กระแส 2I\n3 หลอด → กระแส 3I\n\nความต้านทานรวมของวงจรขนานจะ "ลดลง"\nเมื่อเพิ่มสาขา ซึ่งตรงข้ามกับวงจรอนุกรม'},
      {img:'Insert_image_here',text:'ทำไมบ้านถึงต้องมีเบรกเกอร์?\n\nถ้าเสียบเครื่องใช้ไฟฟ้าหลายตัวพร้อมกัน\nเท่ากับเพิ่มสาขาขนานเรื่อย ๆ\nกระแสรวมจะสูงขึ้นจนสายไฟร้อนและไหม้ได้\n\nเบรกเกอร์ (หรือฟิวส์) จึงตัดไฟเมื่อกระแสเกิน\n\nด่านนี้จุดขั้วแบตเตอรี่แต่ละข้างจะมีสาย 3 เส้น\nรวมทั้งวงจร 6 เส้น'},
    ],
    check:function(items,wires){
      var bulbs=items.filter(function(i){return i.deviceId==='bulb';});
      if(bulbs.length<3) return {ok:false,msg:'ต้องมีหลอดไฟ 3 ดวง (ตอนนี้มี '+bulbs.length+')'};
      var c=isClosedCircuit(items,wires); if(!c.ok) return c;
      return {ok:true,msg:'วงจรขนาน 3 สาขาสมบูรณ์!'};
    }
  },

  /* ══════════ บทที่ 5 — อุปกรณ์เปลี่ยนพลังงาน ══════════ */
  {
    title:'ด่านที่ 14 — มอเตอร์ไฟฟ้า',
    goal:'ต่อมอเตอร์ให้ถูกขั้ว เพื่อเปลี่ยนพลังงานไฟฟ้าเป็นการหมุน',
    inventory:{battery_9v:1,switch:1,motor:1},
    solution:[["battery_9v.right", "switch.left"], ["switch.right", "motor.left"], ["motor.right", "battery_9v.left"]],
    topology:{type:'series'},
    timeLimit:180, baseScore:190,
    tutorial:[
      {img:'Insert_image_here',text:'มอเตอร์ = เปลี่ยนไฟฟ้าเป็นพลังงานกล\n\nหลักการ: เมื่อกระแสไหลผ่านขดลวด\nที่อยู่ในสนามแม่เหล็ก จะเกิดแรงผลักให้หมุน\n\nส่วนประกอบหลัก:\n• สเตเตอร์ (อยู่กับที่) — แม่เหล็กขั้ว N และ S\n• โรเตอร์ (หมุนได้)   — ขดลวดตรงกลาง\n• แปรงถ่าน + คอมมิวเตเตอร์ — สลับทิศกระแส\n\nมอเตอร์มีขั้ว + และ − ต่อถูกขั้วถึงจะหมุน\nต่อเสร็จแล้วกดตรวจวงจร จะเห็นโรเตอร์หมุนจริง'},
      {img:'Insert_image_here',text:'ต่อกลับขั้วแล้วเป็นยังไง?\n\nมอเตอร์ไฟตรง (DC) ต่อกลับขั้ว = หมุนกลับทิศ\nไม่พัง แต่ทิศทางจะตรงข้าม\n\nในเกมนี้กำหนดให้ต้องต่อถูกขั้วเท่านั้น\nเพื่อฝึกให้คุ้นกับการดูขั้ว +/−\n\nถ้าเห็นข้อความ "ต่อกลับขั้ว"\nให้คลิกเลือกมอเตอร์ แล้วกด R หมุนแก้'},
    ],
    check:function(items,wires){
      var ids=items.map(function(i){return i.deviceId;});
      if(ids.indexOf('motor')<0) return {ok:false,msg:'ยังขาด มอเตอร์'};
      var c=isClosedCircuit(items,wires); if(!c.ok) return c;
      return {ok:true,msg:'มอเตอร์หมุนแล้ว!'};
    }
  },
  {
    title:'ด่านที่ 15 — มอเตอร์ + ไดโอดกัน Back-EMF',
    goal:'เพิ่มไดโอดป้องกันไฟย้อนจากมอเตอร์',
    inventory:{battery_9v:1,switch:1,diode:1,motor:1},
    solution:[["battery_9v.right", "diode.left"], ["diode.right", "switch.left"], ["switch.right", "motor.left"], ["motor.right", "battery_9v.left"]],
    topology:{type:'series'},
    timeLimit:200, baseScore:200,
    tutorial:[
      {img:'Insert_image_here',text:'Back-EMF คืออะไร?\n\nมอเตอร์ข้างในเป็นขดลวด\nเมื่อตัดไฟกะทันหัน สนามแม่เหล็กที่ยุบตัว\nจะเหนี่ยวนำให้เกิดแรงดันไฟฟ้าย้อนกลับ\nสูงได้ถึงหลายร้อยโวลต์ในชั่วพริบตา\n\nแรงดันย้อนนี้เรียกว่า Back-EMF\nทำให้ทรานซิสเตอร์หรือวงจรควบคุมพังได้'},
      {img:'Insert_image_here',text:'ไดโอดช่วยยังไง?\n\nไดโอดยอมให้ไฟไหลทางเดียว\nจึงเป็น "ทางระบาย" ให้ไฟย้อนวิ่งวนกลับ\nเข้าไปในตัวมอเตอร์เอง แล้วค่อย ๆ หมดไป\nแทนที่จะย้อนไปทำลายวงจรอื่น\n\nเรียกการต่อแบบนี้ว่า Flyback Diode\nหรือ Freewheeling Diode\n\nอุปกรณ์ที่เป็นขดลวดทุกชนิด\n(มอเตอร์ รีเลย์ โซลินอยด์) ควรมีไดโอดคู่กันเสมอ'},
    ],
    check:function(items,wires){
      var ids=items.map(function(i){return i.deviceId;});
      if(ids.indexOf('motor')<0) return {ok:false,msg:'ยังขาด มอเตอร์'};
      if(ids.indexOf('diode')<0) return {ok:false,msg:'ต้องใส่ไดโอดป้องกัน Back-EMF!'};
      var c=isClosedCircuit(items,wires); if(!c.ok) return c;
      return {ok:true,msg:'มอเตอร์หมุนอย่างปลอดภัย มีไดโอดป้องกันแล้ว!'};
    }
  },
  {
    title:'ด่านที่ 16 — บัซเซอร์แจ้งเตือน',
    goal:'ต่อบัซเซอร์ผ่านตัวต้านทาน เพื่อเปลี่ยนไฟฟ้าเป็นเสียง',
    inventory:{battery_aa:1,switch:1,resistor:1,buzzer:1},
    solution:[["battery_aa.right", "switch.left"], ["switch.right", "resistor.left"], ["resistor.right", "buzzer.left"], ["buzzer.right", "battery_aa.left"]],
    topology:{type:'series'},
    timeLimit:200, baseScore:210,
    tutorial:[
      {img:'Insert_image_here',text:'บัซเซอร์ = เปลี่ยนไฟฟ้าเป็นเสียง\n\nข้างในเป็นแผ่นเซรามิกเพียโซ (Piezo)\nเมื่อจ่ายไฟ แผ่นจะบิดตัวสั่นอย่างรวดเร็ว\nดันอากาศให้เกิดคลื่นเสียง\n\nใช้เป็นสัญญาณเตือนในเครื่องใช้ไฟฟ้าทั่วไป\nเช่น ไมโครเวฟ นาฬิกาปลุก เครื่องตรวจควันไฟ\n\nบัซเซอร์มีขั้ว + และ − ต้องต่อให้ถูก'},
      {img:'Insert_image_here',text:'ตัวต้านทานช่วยอะไร?\n\nจำกัดกระแสไม่ให้เข้าบัซเซอร์มากเกินไป\nช่วยยืดอายุการใช้งาน\nและปรับความดังให้เบาลงได้\n\nยิ่ง R มาก → กระแสน้อย → เสียงเบาลง\n\nสรุปบทที่ 5:\nอุปกรณ์เปลี่ยนพลังงานทั้ง 3 ตัวที่เรียนมา\n• หลอดไฟ  → เปลี่ยนเป็นแสง\n• มอเตอร์  → เปลี่ยนเป็นการเคลื่อนที่\n• บัซเซอร์ → เปลี่ยนเป็นเสียง'},
    ],
    check:function(items,wires){
      var ids=items.map(function(i){return i.deviceId;});
      if(ids.indexOf('buzzer')<0)   return {ok:false,msg:'ยังขาด บัซเซอร์'};
      if(ids.indexOf('resistor')<0) return {ok:false,msg:'ต้องใส่ตัวต้านทานจำกัดกระแส!'};
      var c=isClosedCircuit(items,wires); if(!c.ok) return c;
      return {ok:true,msg:'บัซเซอร์ดังแล้ว!'};
    }
  },

  /* ══════════ บทที่ 6 — อิเล็กทรอนิกส์ขั้นสูง ══════════ */
  {
    title:'ด่านที่ 17 — หม้อแปลง + ฟิวส์',
    goal:'ใช้หม้อแปลงเป็นแหล่งจ่าย แล้วต่อฟิวส์ป้องกันก่อนเข้าสวิตช์และหลอดไฟ',
    inventory:{transformer:1,fuse:1,switch:1,bulb:1},
    solution:[["transformer.right", "fuse.left"], ["fuse.right", "switch.left"], ["switch.right", "bulb.left"], ["bulb.right", "transformer.left"]],
    topology:{type:'series'},
    timeLimit:210, baseScore:220,
    tutorial:[
      {img:'Insert_image_here',text:'หม้อแปลง (Transformer) แปลงระดับแรงดัน\n\nขดลวดปฐมภูมิ (PRIMARY, สีทอง) รับไฟเข้า\nขดลวดทุติยภูมิ (SECONDARY, สีฟ้า) จ่ายไฟออก\n\nอัตราส่วนรอบขดลวด = อัตราส่วนแรงดัน\nตัวอย่าง 1:2 → แรงดันขาออกเป็น 2 เท่าของขาเข้า\n\nหม้อแปลงทำงานกับ "ไฟสลับ (AC)" เท่านั้น\nจึงไม่มีขั้ว + และ − ตายตัวเหมือนถ่านไฟฉาย\nต่อด้านไหนก่อนก็ได้ จุดขั้วจะเป็นสีเหลืองทั้งหมด'},
      {img:'Insert_image_here',text:'หม้อแปลงใช้ที่ไหนบ้าง?\n\n• อะแดปเตอร์ชาร์จโทรศัพท์\n  ลด 220V เหลือ 5V\n• หม้อแปลงบนเสาไฟฟ้า\n  ลดไฟแรงสูงเป็น 220V เข้าบ้าน\n• เตาแม่เหล็กไฟฟ้า เครื่องเชื่อม\n\nด่านนี้ใช้หลักการเดิมจากด่านที่ 6\nฟิวส์ต้องอยู่ใกล้แหล่งจ่ายที่สุด:\nหม้อแปลง → ฟิวส์ → สวิตช์ → หลอดไฟ → กลับหม้อแปลง'},
    ],
    check:function(items,wires){
      var ids=items.map(function(i){return i.deviceId;});
      if(ids.indexOf('transformer')<0) return {ok:false,msg:'ด่านนี้ใช้หม้อแปลงเป็นแหล่งจ่าย — ยังไม่ได้วางหม้อแปลง'};
      if(ids.indexOf('fuse')<0)        return {ok:false,msg:'ต้องใส่ฟิวส์ป้องกันกระแสเกิน!'};
      var c=isClosedCircuit(items,wires); if(!c.ok) return c;
      return {ok:true,msg:'หม้อแปลงจ่ายไฟ ฟิวส์ป้องกันเรียบร้อย หลอดไฟติดแล้ว!'};
    }
  },
  {
    title:'ด่านที่ 18 — ตัวเก็บประจุ (วงจร RC)',
    goal:'ต่อตัวเก็บประจุกับตัวต้านทาน สร้างวงจรหน่วงเวลาให้ LED',
    inventory:{battery_9v:1,switch:1,resistor:1,capacitor:1,led:1},
    solution:[["battery_9v.right", "switch.left"], ["switch.right", "resistor.left"], ["resistor.right", "capacitor.left"], ["capacitor.right", "led.left"], ["led.right", "battery_9v.left"]],
    topology:{type:'series'},
    timeLimit:230, baseScore:240,
    tutorial:[
      {img:'Insert_image_here',text:'ตัวเก็บประจุ (Capacitor) = ถังเก็บไฟจิ๋ว\n\nเก็บประจุไฟฟ้าไว้ แล้วค่อยปล่อยออกมา\nเปรียบเหมือนถังน้ำเล็ก ๆ ในระบบท่อ\n\nต่างจากแบตเตอรี่ตรงที่\n• เก็บได้น้อยกว่ามาก\n• แต่ชาร์จและปล่อยได้เร็วกว่ามาก\n• ใช้ซ้ำได้เป็นล้านครั้ง\n\nตัวนี้เป็นชนิดอิเล็กโทรไลต์ มีขั้ว + และ −\nสังเกตแถบสีเข้มมีเครื่องหมายลบ = ฝั่งขั้วลบ\nต่อกลับขั้วอาจทำให้ระเบิดได้'},
      {img:'Insert_image_here',text:'วงจร RC = ตัวต้านทาน + ตัวเก็บประจุ\n\nใช้สร้างการหน่วงเวลา (Time Delay)\n\nค่าคงตัวเวลา:  t = R × C\n  R = ความต้านทาน (โอห์ม)\n  C = ความจุ (ฟารัด)\n  t = เวลา (วินาที)\n\nตัวอย่าง: 10 กิโลโอห์ม × 100 ไมโครฟารัด = 1 วินาที\n\nยิ่ง R หรือ C มาก ยิ่งหน่วงนาน\nใช้ทำไฟกะพริบ ไฟหน่วงดับ วงจรจับเวลา\nและกรองสัญญาณรบกวนในแหล่งจ่ายไฟ'},
    ],
    check:function(items,wires){
      var ids=items.map(function(i){return i.deviceId;});
      if(ids.indexOf('capacitor')<0) return {ok:false,msg:'ยังขาด ตัวเก็บประจุ'};
      if(ids.indexOf('resistor')<0)  return {ok:false,msg:'วงจร RC ต้องมีตัวต้านทานคู่กับตัวเก็บประจุ!'};
      if(ids.indexOf('led')<0)       return {ok:false,msg:'ยังขาด LED'};
      var c=isClosedCircuit(items,wires); if(!c.ok) return c;
      return {ok:true,msg:'วงจร RC หน่วงเวลาสมบูรณ์!'};
    }
  },
  {
    title:'ด่านที่ 19 — LDR + ทรานซิสเตอร์',
    goal:'สร้างวงจรตรวจจับแสง ให้ LED ทำงานตามความสว่าง',
    inventory:{battery_9v:1,ldr:1,transistor:1,resistor:1,led:1},
    solution:[["battery_9v.right", "ldr.left"], ["ldr.right", "transistor.left"], ["transistor.right", "led.left"], ["led.right", "resistor.left"], ["resistor.right", "battery_9v.left"]],
    topology:{type:'series'},
    timeLimit:250, baseScore:260,
    tutorial:[
      {img:'Insert_image_here',text:'LDR = ตัวต้านทานที่ไวต่อแสง\n\nชื่อเต็ม Light Dependent Resistor\nความต้านทานเปลี่ยนตามความสว่าง\n\n• ที่มืด  → ความต้านทานสูงมาก (หลายเมกะโอห์ม)\n• ที่สว่าง → ความต้านทานต่ำ (ไม่กี่ร้อยโอห์ม)\n\nใช้เป็น "เซ็นเซอร์" ตรวจจับแสง\nเช่น ไฟถนนที่ติดเองตอนค่ำ\nหรือหน้าจอมือถือที่ปรับความสว่างอัตโนมัติ'},
      {img:'Insert_image_here',text:'ทรานซิสเตอร์ = สวิตช์อิเล็กทรอนิกส์\n\nมี 3 ขา:\n  B (Base)      — ขาควบคุม รับสัญญาณสั่งงาน\n  C (Collector) — ไฟเข้า\n  E (Emitter)   — ไฟออก\n\nจ่ายกระแสเล็ก ๆ เข้าขา B\nจะทำให้กระแสก้อนใหญ่ไหลจาก C ไป E ได้\n\nเรียกว่าการ "ขยายสัญญาณ" หรือใช้เป็นสวิตช์\nที่เปิด-ปิดด้วยไฟฟ้าแทนการใช้มือกด\n\nนี่คือหัวใจของอุปกรณ์อิเล็กทรอนิกส์ทุกชนิด\nซีพียูหนึ่งตัวมีทรานซิสเตอร์นับพันล้านตัว'},
    ],
    check:function(items,wires){
      var ids=items.map(function(i){return i.deviceId;});
      if(ids.indexOf('ldr')<0)        return {ok:false,msg:'ยังขาด LDR (เซ็นเซอร์แสง)'};
      if(ids.indexOf('transistor')<0) return {ok:false,msg:'ยังขาด ทรานซิสเตอร์'};
      if(ids.indexOf('led')<0)        return {ok:false,msg:'ยังขาด LED'};
      if(ids.indexOf('resistor')<0)   return {ok:false,msg:'ต้องมีตัวต้านทานป้องกัน LED!'};
      var c=isClosedCircuit(items,wires); if(!c.ok) return c;
      return {ok:true,msg:'วงจรตรวจจับแสงสมบูรณ์!'};
    }
  },

  /* ══════════ บทที่ 7 — วงจรผสม (ด่านสุดท้าย) ══════════ */
  {
    title:'ด่านที่ 20 — วงจรผสม (Final)',
    goal:'รวมทุกอย่างที่เรียนมา: ป้องกัน → ควบคุม → กระจาย → โหลด 3 ชนิด',
    inventory:{battery_9v:1,fuse:1,switch:1,breadboard:1,resistor:1,led:1,motor:1,buzzer:1},
    solution:[["battery_9v.right", "fuse.left"], ["fuse.right", "switch.left"], ["switch.right", "breadboard.left"], ["breadboard.right", "resistor.left"], ["resistor.right", "led.left"], ["led.right", "motor.left"], ["motor.right", "buzzer.left"], ["buzzer.right", "battery_9v.left"]],
    topology:{type:'series'},
    timeLimit:320, baseScore:400,
    tutorial:[
      {img:'Insert_image_here',text:'ด่านสุดท้าย — รวมทุกอย่างที่เรียนมา\n\nวงจรนี้มี 8 ชิ้น ต่อ 8 เส้น\nอย่ารีบต่อ ให้วางแผนก่อนลงมือ\n\nหลักการเรียงลำดับที่ดี:\n1. ป้องกันก่อน   → ฟิวส์\n2. ควบคุมถัดมา  → สวิตช์\n3. กระจายสาย    → Breadboard\n4. โหลดท้ายสุด   → LED, มอเตอร์, บัซเซอร์\n\nอย่าลืม: LED ต้องมีตัวต้านทานนำหน้าเสมอ'},
      {img:'Insert_image_here',text:'Breadboard คืออะไร?\n\nแผงต่อวงจรทดลองแบบไม่ต้องบัดกรี\nแค่เสียบขาอุปกรณ์ลงในรู ก็ต่อถึงกันแล้ว\n\n• แถวบน-ล่าง (แดง + / น้ำเงิน −)\n  = รางจ่ายไฟ ต่อถึงกันตลอดแนวยาว\n• แถวกลาง = ต่อถึงกันเป็นชุดละ 5 รู แนวตั้ง\n• ร่องกลาง = แบ่งซ้าย-ขวาออกจากกัน\n\nช่างและนักเรียนใช้ทดลองวงจรก่อนผลิตจริง\nรื้อแก้ได้ไม่จำกัด ไม่ต้องบัดกรี'},
      {img:'Insert_image_here',text:'ลำดับการต่อของด่านนี้ (8 เส้น)\n\n  แบต 9V (+) → ฟิวส์\n  ฟิวส์       → สวิตช์\n  สวิตช์      → Breadboard\n  Breadboard  → ตัวต้านทาน\n  ตัวต้านทาน  → LED (+)\n  LED (−)     → มอเตอร์ (+)\n  มอเตอร์ (−) → บัซเซอร์ (+)\n  บัซเซอร์ (−) → แบต 9V (−)\n\nอุปกรณ์มีขั้ว 3 ตัว (LED, มอเตอร์, บัซเซอร์)\nต่อเรียงกันแบบ ขั้วลบตัวหน้า → ขั้วบวกตัวถัดไป\n\nถ้าตัวไหนหันผิด กด R หมุนแก้ได้'},
    ],
    check:function(items,wires){
      var ids=items.map(function(i){return i.deviceId;});
      var need=['battery_9v','fuse','switch','breadboard','resistor','led','motor','buzzer'];
      for(var i=0;i<need.length;i++){
        if(ids.indexOf(need[i])<0) return {ok:false,msg:'ยังขาด: '+DEVICES[need[i]].name};
      }
      var c=isClosedCircuit(items,wires); if(!c.ok) return c;
      return {ok:true,msg:'วงจรผสมสมบูรณ์! ผ่านครบ 20 ด่านแล้ว ยอดเยี่ยมมาก!'};
    }
  },
];
