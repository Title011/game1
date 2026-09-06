/* ============================================================
   LEVELS — ข้อมูลด่านทั้ง 10 ด่าน

   แต่ละด่านประกอบด้วย:
     title     ชื่อด่าน
     goal      คำอธิบายเป้าหมาย
     inventory อุปกรณ์ที่ให้ใช้ + จำนวน
     solution  เฉลยการต่อสาย (คู่จุด) — ใช้ตรวจและสร้างคำใบ้
     topology  โครงสร้างวงจร series / parallel
     timeLimit เวลาจำกัด (วินาที), baseScore คะแนนพื้นฐาน
     tutorial  หน้าคู่มือของด่าน (รูป + ข้อความ)
     check     ฟังก์ชันตรวจเงื่อนไขเฉพาะของด่าน
   ============================================================ */
var LEVELS = [
  {
    title:'ด่านที่ 1 — วงจรอย่างง่าย',
    goal:'ต่อ ถ่านไฟฉาย + สวิตช์ + หลอดไฟ แล้วเชื่อมสายไฟให้ครบวงจร',
    inventory:{battery_aa:1,switch:1,bulb:1},
    solution:[["battery_aa.right", "switch.left"], ["switch.right", "bulb.left"], ["bulb.right", "battery_aa.left"]],
    topology:{type:'series'},
    timeLimit:180, baseScore:100,
    tutorial:[
      {img:'Insert_image_here',text:'วงจรไฟฟ้าอย่างง่ายต้องมี 3 ส่วน:\n1. แหล่งพลังงาน (ถ่านไฟฉาย)\n2. อุปกรณ์ใช้ไฟ (หลอดไฟ)\n3. ตัวควบคุม (สวิตช์)\n\nต้องต่อเป็น "วงจรปิด" ไฟถึงจะไหลได้'},
      {img:'Insert_image_here',text:'เรื่องขั้ว + และ − สำคัญมาก!\n\n🔴 จุดสีแดง = ขั้วบวก (+)\n🔵 จุดสีน้ำเงิน = ขั้วลบ (−)\n\nกระแสไหล: ขั้ว+ ถ่าน → ขั้ว+ ของอุปกรณ์ → ผ่านตัวมัน → ขั้ว− → กลับ ขั้ว− ถ่าน\n\nกฎการต่อ: ขั้ว "เดียวกัน" ต่อถึงกัน\n• ขั้ว+ ของถ่าน → ขั้ว+ ของ LED\n• ขั้ว− ของถ่าน → ขั้ว− ของ LED\n\nถ้าต่อ LED กลับด้าน (+ ไปเจอ −) LED จะไม่ติด — กด R หมุนแก้ได้!'},
      {img:'Insert_image_here',text:'วิธีต่อสายไฟ:\n1. กดปุ่ม "ต่อสายไฟ" หรือกดคีย์ E\n2. คลิกที่จุดขั้วของอุปกรณ์ต้นทาง\n3. ลากไปปล่อยที่จุดขั้วของอุปกรณ์ปลายทาง\n\nวิธีลบสายไฟ:\n• คอมพิวเตอร์: คลิกขวาที่เส้นสาย\n• มือถือ/แท็บเล็ต: ออกจากโหมดต่อสาย แล้วแตะที่เส้นสาย'},
    ],
    check:function(items,wires){
      var ids=items.map(function(i){return i.deviceId;});
      if(ids.indexOf('battery_aa')<0) return {ok:false,msg:'ยังขาด ถ่านไฟฉาย AA'};
      if(ids.indexOf('switch')<0)     return {ok:false,msg:'ยังขาด สวิตช์'};
      if(ids.indexOf('bulb')<0)       return {ok:false,msg:'ยังขาด หลอดไฟ'};
      /* ตรวจวงจรปิดจริง — ทุกอุปกรณ์ต่อครบ 2 ขั้ว และวนเป็น loop */
      var circuit=isClosedCircuit(items,wires);
      if(!circuit.ok) return circuit;
      return {ok:true,msg:'หลอดไฟติดสว่างแล้ว! วงจรปิดสมบูรณ์'};
    }
  },
  {
    title:'ด่านที่ 2 — วงจรอนุกรม',
    goal:'ต่อหลอดไฟ 2 ดวงแบบอนุกรมกับแบตเตอรี่และฟิวส์',
    inventory:{battery_9v:1,bulb:2,switch:1,fuse:1},
    solution:[["battery_9v.right", "switch.left"], ["switch.right", "fuse.left"], ["fuse.right", "bulb.left"], ["bulb.right", "bulb.left"], ["bulb.right", "battery_9v.left"]],
    topology:{type:'series'},
    timeLimit:200, baseScore:120,
    tutorial:[{img:'Insert_image_here',text:'วงจรอนุกรม: อุปกรณ์ต่อกันเป็นทอดเดียว\nกระแสเท่ากันทุกจุด\nถ้าตัวใดขาด วงจรทั้งหมดหยุดทำงาน\n\nใส่ข้อความสอน'}],
    check:function(items,wires){
      var ids=items.map(function(i){return i.deviceId;});
      var bulbs=items.filter(function(i){return i.deviceId==='bulb';});
      if(ids.indexOf('battery_9v')<0) return {ok:false,msg:'ยังขาดแบตเตอรี่ 9V'};
      if(bulbs.length<2) return {ok:false,msg:'ต้องมีหลอดไฟ 2 ดวง (มีแค่ '+bulbs.length+')'};
      var c=isClosedCircuit(items,wires); if(!c.ok) return c;
      return {ok:true,msg:'วงจรอนุกรมสมบูรณ์!'};
    }
  },
  {
    title:'ด่านที่ 3 — วงจรขนาน',
    goal:'ต่อหลอดไฟ 2 ดวงแบบขนาน แต่ละดวงมีสวิตช์ของตัวเอง',
    inventory:{battery_9v:1,bulb:2,switch:2},
    solution:[["battery_9v.right", "switch.left"], ["switch.right", "bulb.left"], ["bulb.right", "battery_9v.left"], ["battery_9v.right", "switch.left"], ["switch.right", "bulb.left"], ["bulb.right", "battery_9v.left"]],
    topology:{type:'parallel',branches:2,mustHave:['switch','bulb']},
    timeLimit:220, baseScore:140,
    tutorial:[{img:'Insert_image_here',text:'วงจรขนาน: อุปกรณ์แต่ละสาขาได้รับแรงดันเท่ากัน\nตัดสาขาหนึ่ง สาขาอื่นยังทำงานต่อ\n\nใส่ข้อความสอน'}],
    check:function(items,wires){
      var bulbs=items.filter(function(i){return i.deviceId==='bulb';});
      if(bulbs.length<2) return {ok:false,msg:'ต้องมีหลอดไฟ 2 ดวง'};
      var c=isClosedCircuit(items,wires); if(!c.ok) return c;
      return {ok:true,msg:'วงจรขนานสมบูรณ์!'};
    }
  },
  {
    title:'ด่านที่ 4 — LED + ตัวต้านทาน',
    goal:'ต่อตัวต้านทานป้องกัน LED จากถ่านไฟฉาย',
    inventory:{battery_aa:1,resistor:1,led:1,switch:1},
    solution:[["battery_aa.right", "resistor.left"], ["resistor.right", "switch.left"], ["switch.right", "led.left"], ["led.right", "battery_aa.left"]],
    topology:{type:'series'},
    timeLimit:200, baseScore:150,
    tutorial:[{img:'Insert_image_here',text:'LED ต้องการตัวต้านทานเสมอ\nสูตร: R = (Vs - Vf) / If\nVf LED ทั่วไป ≈ 2V, If ≈ 20mA\n\nใส่ข้อความสอน'}],
    check:function(items,wires){
      var ids=items.map(function(i){return i.deviceId;});
      if(ids.indexOf('resistor')<0) return {ok:false,msg:'ต้องใส่ตัวต้านทานป้องกัน LED!'};
      if(ids.indexOf('led')<0)      return {ok:false,msg:'ยังไม่มี LED'};
      var c=isClosedCircuit(items,wires); if(!c.ok) return c;
      return {ok:true,msg:'LED ติดอย่างปลอดภัย!'};
    }
  },
  {
    title:'ด่านที่ 5 — หม้อแปลง + ฟิวส์',
    goal:'ใช้หม้อแปลงเป็นแหล่งจ่าย แล้วต่อฟิวส์ป้องกันก่อนเข้าสวิตช์และหลอดไฟ',
    inventory:{transformer:1,fuse:1,switch:1,bulb:1},
    solution:[["transformer.right", "fuse.left"], ["fuse.right", "switch.left"], ["switch.right", "bulb.left"], ["bulb.right", "transformer.left"]],
    topology:{type:'series'},
    timeLimit:210, baseScore:160,
    tutorial:[
      {img:'Insert_image_here',text:'หม้อแปลง (Transformer) แปลงระดับแรงดันไฟฟ้า\n\nขดลวดปฐมภูมิ (PRIMARY, สีทอง) รับไฟเข้า\nขดลวดทุติยภูมิ (SECONDARY, สีฟ้า) จ่ายไฟออก\n\nอัตราส่วนรอบขดลวด = อัตราส่วนแรงดัน\nตัวอย่าง 1:2 → แรงดันขาออกเป็น 2 เท่าของขาเข้า\n\nหม้อแปลงทำงานกับ "ไฟสลับ (AC)" เท่านั้น\nจึงไม่มีขั้ว + และ − ตายตัวเหมือนถ่านไฟฉาย\nต่อด้านไหนก่อนก็ได้ จุดขั้วจะเป็นสีเหลืองทั้งหมด'},
      {img:'Insert_image_here',text:'ทำไมต้องมีฟิวส์ และต่อตรงไหน?\n\nฟิวส์คือลวดโลหะจุดหลอมเหลวต่ำ\nเมื่อกระแสเกินพิกัด (ตัวนี้ 5A) ลวดจะหลอมขาด\nตัดวงจรทันที ป้องกันสายไหม้และอุปกรณ์เสียหาย\n\nกฎสำคัญ: ต่อฟิวส์ "อนุกรม" และวางไว้\nใกล้แหล่งจ่ายที่สุด (ก่อนสวิตช์และโหลด)\nเพื่อให้ตัดไฟได้ทั้งวงจรเมื่อเกิดปัญหา\n\nลำดับที่ถูกต้อง:\nหม้อแปลง → ฟิวส์ → สวิตช์ → หลอดไฟ → กลับหม้อแปลง'},
    ],
    check:function(items,wires){
      var ids=items.map(function(i){return i.deviceId;});
      if(ids.indexOf('transformer')<0) return {ok:false,msg:'ด่านนี้ใช้หม้อแปลงเป็นแหล่งจ่าย — ยังไม่ได้วางหม้อแปลง'};
      if(ids.indexOf('fuse')<0)        return {ok:false,msg:'ต้องใส่ฟิวส์ป้องกันกระแสเกิน!'};
      if(ids.indexOf('switch')<0)      return {ok:false,msg:'ยังขาดสวิตช์'};
      if(ids.indexOf('bulb')<0)        return {ok:false,msg:'ยังขาดหลอดไฟ'};
      var c=isClosedCircuit(items,wires); if(!c.ok) return c;
      return {ok:true,msg:'หม้อแปลงจ่ายไฟ ฟิวส์ป้องกันเรียบร้อย หลอดไฟติดแล้ว!'};
    }
  },
  {
    title:'ด่านที่ 6 — มอเตอร์ไฟฟ้า',
    goal:'ต่อมอเตอร์ + สวิตช์ + ไดโอดป้องกัน Back-EMF',
    inventory:{battery_9v:1,motor:1,switch:1,diode:1},
    solution:[["battery_9v.right", "diode.left"], ["diode.right", "switch.left"], ["switch.right", "motor.left"], ["motor.right", "battery_9v.left"]],
    topology:{type:'series'},
    timeLimit:200, baseScore:170,
    tutorial:[{img:'Insert_image_here',text:'มอเตอร์แปลงไฟฟ้าเป็นพลังงานกล\nต่อ Flyback Diode ขนานมอเตอร์เพื่อป้องกัน Back-EMF\n\nเมื่อต่อถูก โรเตอร์จะหมุน!'}],
    check:function(items,wires){
      var ids=items.map(function(i){return i.deviceId;});
      if(ids.indexOf('motor')<0) return {ok:false,msg:'ยังขาดมอเตอร์!'};
      var c=isClosedCircuit(items,wires); if(!c.ok) return c;
      return {ok:true,msg:'มอเตอร์หมุนแล้ว!'};
    }
  },
  {
    title:'ด่านที่ 7 — บัซเซอร์แจ้งเตือน',
    goal:'ต่อบัซเซอร์ + ตัวต้านทาน + สวิตช์',
    inventory:{battery_aa:1,buzzer:1,switch:1,resistor:1},
    solution:[["battery_aa.right", "switch.left"], ["switch.right", "resistor.left"], ["resistor.right", "buzzer.left"], ["buzzer.right", "battery_aa.left"]],
    topology:{type:'series'},
    timeLimit:200, baseScore:180,
    tutorial:[{img:'Insert_image_here',text:'บัซเซอร์แปลงพลังงานไฟฟ้าเป็นเสียง\nระวังขั้ว + และ - เสมอ\n\nใส่ข้อความสอน'}],
    check:function(items,wires){
      var ids=items.map(function(i){return i.deviceId;});
      if(ids.indexOf('buzzer')<0) return {ok:false,msg:'ยังขาดบัซเซอร์!'};
      var c=isClosedCircuit(items,wires); if(!c.ok) return c;
      return {ok:true,msg:'บัซเซอร์ดังแล้ว!'};
    }
  },
  {
    title:'ด่านที่ 8 — LDR ตามแสง',
    goal:'สร้างวงจรให้ LED ติดเมื่อมืด ใช้ LDR + ทรานซิสเตอร์',
    inventory:{battery_9v:1,ldr:1,led:1,resistor:1,transistor:1},
    solution:[["battery_9v.right", "ldr.left"], ["ldr.right", "transistor.left"], ["transistor.right", "led.left"], ["led.right", "resistor.left"], ["resistor.right", "battery_9v.left"]],
    topology:{type:'series'},
    timeLimit:240, baseScore:200,
    tutorial:[{img:'Insert_image_here',text:'LDR: มืด = ความต้านทานสูง, สว่าง = ต่ำ\nทรานซิสเตอร์ทำหน้าที่ switch รับสัญญาณจาก LDR\n\nใส่ข้อความสอน'}],
    check:function(items,wires){
      var ids=items.map(function(i){return i.deviceId;});
      if(ids.indexOf('ldr')<0)        return {ok:false,msg:'ต้องใช้ LDR!'};
      if(ids.indexOf('led')<0)        return {ok:false,msg:'ต้องมี LED!'};
      if(ids.indexOf('transistor')<0) return {ok:false,msg:'ต้องมีทรานซิสเตอร์!'};
      var c=isClosedCircuit(items,wires); if(!c.ok) return c;
      return {ok:true,msg:'วงจรตามแสงสมบูรณ์!'};
    }
  },
  {
    title:'ด่านที่ 9 — วงจร RC หน่วงเวลา',
    goal:'ต่อตัวเก็บประจุ + ตัวต้านทาน + LED สร้าง Time Delay',
    inventory:{battery_9v:1,capacitor:1,resistor:1,led:1,switch:1},
    solution:[["battery_9v.right", "switch.left"], ["switch.right", "resistor.left"], ["resistor.right", "capacitor.left"], ["capacitor.right", "led.left"], ["led.right", "battery_9v.left"]],
    topology:{type:'series'},
    timeLimit:240, baseScore:210,
    tutorial:[{img:'Insert_image_here',text:'ตัวเก็บประจุสร้างการหน่วงเวลา\nTime constant: t = R x C\nตัวอย่าง: 10kOhm x 100uF = 1 วินาที\n\nใส่ข้อความสอน'}],
    check:function(items,wires){
      var ids=items.map(function(i){return i.deviceId;});
      if(ids.indexOf('capacitor')<0) return {ok:false,msg:'ต้องใช้ตัวเก็บประจุ!'};
      if(ids.indexOf('resistor')<0)  return {ok:false,msg:'ต้องมีตัวต้านทาน!'};
      var c=isClosedCircuit(items,wires); if(!c.ok) return c;
      return {ok:true,msg:'วงจร RC สมบูรณ์!'};
    }
  },
  {
    title:'ด่านที่ 10 — วงจรผสม (Final)',
    goal:'สร้างวงจรผสม: แบตเตอรี่ + ฟิวส์ + สวิตช์ + LED + มอเตอร์ + บัซเซอร์',
    inventory:{battery_9v:1,fuse:1,switch:2,led:1,motor:1,buzzer:1,resistor:1,breadboard:1},
    solution:[["battery_9v.right", "fuse.left"], ["fuse.right", "switch.left"], ["switch.right", "breadboard.left"], ["breadboard.right", "resistor.left"], ["resistor.right", "led.left"], ["led.right", "switch.left"], ["switch.right", "motor.left"], ["motor.right", "buzzer.left"], ["buzzer.right", "battery_9v.left"]],
    topology:{type:'series'},
    timeLimit:300, baseScore:300,
    tutorial:[
      {img:'Insert_image_here',text:'วงจรผสมรวมอุปกรณ์หลายชนิด\nวางแผนก่อนลงมือเสมอ\nใช้ Breadboard ช่วยจัดระเบียบสาย\n\nใส่ข้อความสอน'},
      {img:'Insert_image_here',text:'ลำดับที่แนะนำ:\n1. แบตเตอรี่ > ฟิวส์ (ป้องกันก่อน)\n2. ฟิวส์ > สวิตช์\n3. สวิตช์ > โหลด\n4. LED ต้องผ่านตัวต้านทาน'},
    ],
    check:function(items,wires){
      var ids=items.map(function(i){return i.deviceId;});
      var need=['battery_9v','fuse','switch','led','motor','buzzer'];
      for(var i=0;i<need.length;i++){
        if(ids.indexOf(need[i])<0) return {ok:false,msg:'ยังขาด: '+DEVICES[need[i]].name};
      }
      var c=isClosedCircuit(items,wires); if(!c.ok) return c;
      return {ok:true,msg:'วงจรผสมสมบูรณ์! ผ่านครบ 10 ด่านแล้ว!'};
    }
  },
];
