/* ============================================================
   HAZARD — ระบบความเสียหายและอันตรายเหมือนของจริง

   ของเดิมตัดสินครั้งเดียวว่า "พัง/ไม่พัง" แล้วขึ้นข้อความบรรทัดเดียว
   ของจริงไม่ได้เป็นแบบนั้น ของจริงมันเป็น "กระบวนการ":

       จ่ายไฟ → ร้อนขึ้นเรื่อย ๆ → มีควัน → พัง → แล้วลามไปตัวอื่น

   ไฟล์นี้จำลองกระบวนการนั้นตามเวลาจริง โดยอาศัยกระแส/แรงดัน/กำลังไฟ
   ที่ได้จากการแก้สมการวงจรจริง (js/solver.js) ทุก ๆ 50 มิลลิวินาที

   ── ความร้อนสะสม ──────────────────────────────────────────
   หาค่า "ภาระ" (stress) ของอุปกรณ์แต่ละตัว = เกินพิกัดไปกี่เท่า
   (เทียบทั้งกระแส I/imax และกำลังไฟ P/pmax เอาค่าที่หนักกว่า)

       stress ≤ 1  → เย็นลงเรื่อย ๆ  (อยู่ในพิกัด ใช้ได้ตลอด)
       stress > 1  → heat += (stress − 1) / tburn  ต่อวินาที

   heat เดินจาก 0 ถึง 1 แล้วอุปกรณ์ "พัง" ระหว่างทางจะเห็น
       0.35 = เริ่มร้อนผิดปกติ (เตือน)   0.70 = ร้อนจัด มีควัน

   ผลคือเกินพิกัดนิดเดียวก็ค่อย ๆ ตาย ใช้เวลาสิบกว่าวินาที
   แต่เกินสิบเท่า (เช่น LED ต่อตรงเข้า 9V) พังในเสี้ยววินาที
   ตรงกับพฤติกรรมจริงของอุปกรณ์

   ── การลามต่อ ────────────────────────────────────────────
   อุปกรณ์ที่พังจะกลายเป็น "วงจรเปิด" (ดู br.dead ใน js/solver.js)
   วงจรอนุกรมจึงดับทั้งวงเมื่อมีตัวใดตัวหนึ่งขาด เหมือนไฟประดับรุ่นเก่า
   และฟิวส์ที่ขาดก่อนก็ตัดไฟช่วยตัวอื่นไว้ได้จริง

   ── สิ่งที่ตอบให้ผู้เรียน ────────────────────────────────
   ทุกเหตุการณ์บันทึกไว้ครบ 4 ข้อ: ต่อแบบนี้ / พังตรงไหน /
   อันตรายยังไง / ป้องกันยังไง พร้อมตัวเลขที่วัดได้จริง ณ ตอนนั้น
   ============================================================ */

var HAZARD = {
  WARN:0.35, HOT:0.70,     /* ขีดเตือน และขีด "ร้อนจัดมีควัน" */
  COOL:6,                  /* วินาทีที่ใช้เย็นลงจากร้อนสุดจนหมด */
  CAP:8,                   /* เพดานของ stress กันพังไวเกินจนไม่ทันเห็น */
  incidents:[],            /* เหตุการณ์ทั้งหมดในรอบนี้ */
  wireHeat:0, wiresBurned:false,
  t:0,
  live:false               /* กำลังเดินจริงบนหน้าจอ (ไม่ใช่การคำนวณล่วงหน้า) */
};

/* ============================================================
   ข้อความประจำเหตุการณ์ — คีย์คือ "อุปกรณ์:รูปแบบการพัง"
   ถ้าไม่เจอจะถอยไปใช้ "*:รูปแบบ" เป็นค่ากลาง
   ============================================================ */
var HAZ_TEXT = {

  'capacitor:reverse_polarity':{
    sev:'critical', title:'ตัวเก็บประจุระเบิด — ต่อกลับขั้ว',
    cause:'ขั้วลบ (−) ของตัวเก็บประจุไปรับไฟจากฝั่งบวกของแหล่งจ่าย',
    mech:'ข้างในตัวเก็บประจุชนิดอิเล็กโทรไลต์มีฟิล์มออกไซด์บางมากทำหน้าที่เป็นฉนวน ฟิล์มนี้เกิดขึ้นได้ทางเดียวเท่านั้น พอจ่ายไฟย้อนขั้ว ฟิล์มจะสลายตัว กระแสรั่วทะลุ ความร้อนทำให้สารละลายข้างในเดือดจนดันฝาระบายแตกออก',
    danger:'ฝาด้านบนปลิว มีเสียงดัง สารละลายร้อนและเศษกระดาษฟอยล์กระเด็นออกมา เข้าตาได้ และไอระเหยมีกลิ่นฉุนแสบจมูก การทดลองจริงจึงต้องใส่แว่นนิรภัยและไม่ก้มมองใกล้',
    prevent:'ดูแถบสีเข้มที่มีเครื่องหมาย − บนตัวถัง นั่นคือขั้วลบ ต้องต่อเข้าฝั่งลบเสมอ ขาที่ยาวกว่าคือขั้วบวก ถ้าไม่แน่ใจให้วัดก่อนจ่ายไฟ'
  },
  'capacitor:over_voltage':{
    sev:'critical', title:'ตัวเก็บประจุระเบิด — แรงดันเกินพิกัด',
    cause:'แรงดันคร่อมตัวเก็บประจุสูงเกินตัวเลขที่พิมพ์ไว้บนตัวถัง',
    mech:'ฟิล์มออกไซด์ที่เป็นฉนวนหนาแค่ระดับไมโครเมตร ออกแบบให้ทนได้ถึงแรงดันพิกัดเท่านั้น เกินกว่านั้นไฟจะทะลุฉนวน เกิดความร้อนและแก๊สข้างในจนดันฝาระบายแตก',
    danger:'ระเบิดแบบเดียวกับการต่อกลับขั้ว มีสารเคมีร้อนและเศษวัสดุกระเด็น',
    prevent:'เลือกตัวเก็บประจุที่พิกัดแรงดันสูงกว่าที่ใช้จริงอย่างน้อย 1.5 เท่า เช่นวงจร 9V ควรใช้ตัวที่ทน 16V ขึ้นไป'
  },

  'led:reverse_breakdown':{
    sev:'danger', title:'LED พังจากแรงดันย้อนขั้ว',
    cause:'ต่อ LED กลับด้าน ขั้วลบไปรับไฟบวก',
    mech:'LED ทนแรงดันย้อนได้แค่ราว 5 โวลต์ เกินกว่านั้นรอยต่อ p-n จะพังถาวร (reverse breakdown) กลายเป็นตัวนำที่ไม่จำกัดกระแส แล้วไหม้ในทันที',
    danger:'ตัว LED ร้อนจัดในเสี้ยววินาที พลาสติกอาจแตกและมีควัน และเมื่อมันกลายเป็นตัวนำ กระแสจะพุ่งไปทำให้แหล่งจ่ายกับสายไฟร้อนตามไปด้วย',
    prevent:'ขายาว = ขั้วบวก · ขาสั้นและด้านที่ตัวถังบากเรียบ = ขั้วลบ ต่อถูกขั้วแล้วต้องมีตัวต้านทานจำกัดกระแสเสมอ'
  },
  'led:over_current':{
    sev:'danger', title:'LED ไหม้เพราะกระแสเกินพิกัด',
    cause:'ต่อ LED เข้าแหล่งจ่ายโดยไม่มีตัวต้านทานจำกัดกระแส',
    mech:'LED ไม่ได้จำกัดกระแสให้ตัวเอง พอแรงดันเกินแรงดันเกณฑ์เพียงเล็กน้อย กระแสจะพุ่งขึ้นแบบก้าวกระโดด ความร้อนที่รอยต่อสูงจนสารกึ่งตัวนำละลายและขาดใน',
    danger:'ตัวถังร้อนจนลวกมือได้และอาจแตก มีควันกับกลิ่นพลาสติกไหม้ ถ้าเป็นวงจรจริงที่กระแสสูงกว่านี้ ความร้อนจุดติดวัสดุรอบข้างได้',
    prevent:'ใส่ตัวต้านทานอนุกรมเสมอ คำนวณจาก R = (แรงดันแหล่งจ่าย − แรงดันตกคร่อม LED) ÷ กระแสที่ต้องการ เช่น 9V กับ LED ที่ 20mA ใช้ประมาณ 360 โอห์ม'
  },
  'led:over_power':{ ref:'led:over_current' },

  'diode:over_current':{
    sev:'danger', title:'ไดโอดไหม้',
    cause:'กระแสผ่านไดโอดมากเกินพิกัด',
    mech:'ไดโอดมีแรงดันตกคร่อมคงที่ราว 0.7 โวลต์ กระแสยิ่งมาก ความร้อนที่รอยต่อยิ่งสูงตามสมการ P = V × I จนสารกึ่งตัวนำเสียสภาพ',
    danger:'ไดโอดที่พังมักกลายเป็นตัวนำหรือขาดใน ทำให้วงจรที่ใช้มันป้องกันหมดการป้องกันไปพร้อมกัน',
    prevent:'เลือกไดโอดที่พิกัดกระแสสูงกว่าที่ใช้จริง และจำกัดกระแสด้วยตัวต้านทานหรือโหลดเสมอ'
  },

  'bulb:over_power':{
    sev:'danger', title:'หลอดไฟขาด — ไส้หลอดไหม้',
    cause:'แรงดันที่จ่ายให้หลอดสูงเกินพิกัดของหลอด',
    mech:'ไส้หลอดเป็นลวดทังสเตนเส้นเล็กมาก แรงดันเกินทำให้กระแสสูงตามกฎของโอห์ม ไส้ร้อนเกินจุดที่ทนได้ ทังสเตนระเหยเร็วขึ้นจนเส้นบางลงแล้วขาดในที่สุด',
    danger:'หลอดจะสว่างวาบผิดปกติแล้วดับ ของจริงแก้วอาจร้าวหรือแตกจากความร้อน มีเศษแก้วบาดมือได้ และถ้าเป็นหลอดในโคมปิดอาจทำให้โคมไหม้',
    prevent:'ใช้หลอดให้ตรงพิกัดแรงดัน หรือใส่ตัวต้านทานลดแรงดันก่อนเข้าหลอด สังเกตตัวเลขโวลต์ที่พิมพ์บนขั้วหลอด'
  },
  'bulb:over_current':{ ref:'bulb:over_power' },

  'motor:over_current':{
    sev:'danger', title:'มอเตอร์ไหม้ — ขดลวดร้อนจัด',
    cause:'กระแสผ่านมอเตอร์สูงเกินพิกัด (แรงดันเกิน หรือเพลาถูกล็อกจนหมุนไม่ได้)',
    mech:'ขดลวดทองแดงข้างในเคลือบด้วยน้ำยาวานิชบาง ๆ เป็นฉนวน ความร้อนจากกระแสเกินทำให้วานิชอ่อนตัวและลอก ขดลวดจึงลัดถึงกันเอง กระแสยิ่งพุ่ง ความร้อนยิ่งสูงจนไหม้ขาด',
    danger:'ตัวมอเตอร์ร้อนจนจับไม่ได้ มีควันขาวและกลิ่นวานิชไหม้ ซึ่งเป็นพิษเมื่อสูดดม หากอยู่ใกล้วัสดุติดไฟง่ายอาจลุกไหม้',
    prevent:'ใช้แรงดันตามพิกัดที่ระบุบนตัวมอเตอร์ ไม่จับเพลาให้หยุดหมุนขณะจ่ายไฟ และควรมีฟิวส์หรือตัวจำกัดกระแสในวงจร'
  },
  'motor:over_power':{ ref:'motor:over_current' },

  'buzzer:over_current':{
    sev:'danger', title:'บัซเซอร์ไหม้',
    cause:'จ่ายไฟให้บัซเซอร์โดยไม่มีตัวต้านทานจำกัดกระแส หรือแรงดันเกินพิกัด',
    mech:'แผ่นเพียโซกับวงจรขับข้างในออกแบบมาสำหรับกระแสระดับสิบมิลลิแอมป์ กระแสเกินทำให้วงจรขับร้อนจนเสียหายถาวร',
    danger:'มีควันและกลิ่นไหม้จากตัวถัง เสียงจะเพี้ยนแล้วเงียบไป',
    prevent:'ต่อตัวต้านทานอนุกรมก่อนเข้าบัซเซอร์เสมอ และดูพิกัดแรงดันที่ระบุไว้'
  },

  'resistor:over_power':{
    sev:'danger', title:'ตัวต้านทานไหม้ — กำลังไฟเกินพิกัด',
    cause:'กำลังไฟที่ตัวต้านทานต้องทิ้งเป็นความร้อนสูงเกินพิกัดวัตต์ของมัน',
    mech:'ตัวต้านทานเปลี่ยนพลังงานไฟฟ้าเป็นความร้อนทั้งหมดตามสมการ P = I² × R ตัวขนาด 1/4 วัตต์ระบายความร้อนได้จำกัด เกินกว่านั้นสีเคลือบจะไหม้ดำ ค่าความต้านทานเพี้ยน แล้วขาดใน',
    danger:'ตัวมันร้อนพอจะลวกมือและจุดกระดาษให้ไหม้ได้ มีควันและกลิ่นฉุน นี่คือสาเหตุที่ตัวต้านทานไม่ควรวางชิดสายไฟหรือวัสดุติดไฟ',
    prevent:'คำนวณกำลังไฟก่อนเลือกตัว P = I² × R แล้วเลือกพิกัดวัตต์สูงกว่าที่คำนวณได้อย่างน้อย 2 เท่า'
  },
  'resistor:over_current':{ ref:'resistor:over_power' },

  'transistor:over_current':{
    sev:'danger', title:'ทรานซิสเตอร์พัง',
    cause:'กระแสหรือกำลังไฟผ่านทรานซิสเตอร์เกินพิกัด',
    mech:'ความร้อนสะสมที่รอยต่อจนซิลิคอนเสียสภาพ ทรานซิสเตอร์ที่พังมักลัดวงจรจากขา C ถึง E ก่อนแล้วค่อยขาดใน',
    danger:'ช่วงที่มันลัดวงจร โหลดที่อยู่ปลายทางจะได้รับไฟเต็มโดยไม่มีอะไรควบคุม — มอเตอร์หมุนเองหยุดไม่ได้ หรือหลอดสว่างจนไหม้ นี่คืออันตรายของวงจรควบคุมที่ไม่มีฟิวส์',
    prevent:'ใส่ตัวต้านทานจำกัดกระแสที่ขาเบส เลือกทรานซิสเตอร์ให้พิกัดกระแสสูงกว่าโหลด และติดแผ่นระบายความร้อนเมื่อใช้กำลังสูง'
  },
  'transistor:over_power':{ ref:'transistor:over_current' },

  'ldr:over_current':{
    sev:'warning', title:'LDR เสียหาย',
    cause:'กระแสผ่าน LDR เกินพิกัด',
    mech:'ผิวสารกึ่งตัวนำไวแสงเป็นแผ่นบางมาก กระแสเกินทำให้ลายบนผิวไหม้ขาด ค่าความต้านทานจึงเพี้ยนถาวร',
    danger:'เซ็นเซอร์อ่านค่าผิด วงจรที่พึ่งมันจะทำงานผิดพลาดโดยไม่มีสัญญาณเตือน ซึ่งอันตรายกว่าการพังแบบเห็นชัด',
    prevent:'ต่อ LDR อนุกรมกับตัวต้านทานเสมอ อย่าต่อคร่อมแหล่งจ่ายตรง ๆ'
  },
  'ldr:over_power':{ ref:'ldr:over_current' },

  'source:over_current':{
    sev:'critical', title:'แหล่งจ่ายร้อนจัด — จ่ายกระแสเกินตัว',
    cause:'วงจรดึงกระแสจากแหล่งจ่ายมากเกินกว่าที่มันจ่ายไหว (มักเกิดจากการลัดวงจร)',
    mech:'ถ่านมีความต้านทานภายในของตัวเอง กระแสที่ไหลออกจึงทำให้ตัวถ่านเองร้อนตามสมการ P = I² × r ยิ่งลัดวงจร กระแสยิ่งสูง ความร้อนยิ่งพุ่งจนปฏิกิริยาเคมีข้างในเดินเร็วผิดปกติและเกิดแก๊ส',
    danger:'ตัวถ่านร้อนจนจับไม่ได้ ปลอกพลาสติกละลาย มีน้ำยาด่างรั่วซึม กัดผิวหนังและกัดกร่อนรางถ่าน ถ้าเป็นถ่านลิเธียมอาจลุกไหม้หรือระเบิด — ถ่าน 9V อันตรายเป็นพิเศษเพราะขั้วสองขั้วอยู่ติดกัน วางปนกับกุญแจหรือเหรียญในกระเป๋าก็ลัดวงจรเองได้',
    prevent:'อย่าต่อขั้วบวกกับขั้วลบถึงกันโดยไม่มีโหลดคั่น ใส่ฟิวส์ไว้ใกล้แหล่งจ่ายที่สุด และเก็บถ่าน 9V โดยครอบฝาขั้วไว้เสมอ'
  },
  'source:reverse_charge':{
    sev:'critical', title:'ถ่านถูกอัดไฟย้อน',
    cause:'มีแหล่งจ่ายอีกตัวที่แรงดันสูงกว่าดันไฟย้อนเข้าขั้วบวกของถ่านก้อนนี้',
    mech:'ถ่านธรรมดา (อัลคาไลน์/คาร์บอน) ออกแบบมาให้จ่ายไฟทางเดียว อัดไฟกลับเข้าไปจะเกิดแก๊สไฮโดรเจนข้างในและความร้อน โดยไม่มีทางระบายออก',
    danger:'ตัวถ่านบวม รั่ว หรือระเบิด น้ำยาด่างที่พุ่งออกมากัดผิวหนังและตา นี่คือเหตุผลที่ห้ามนำถ่านธรรมดาไปชาร์จ และห้ามใส่ถ่านเก่าปนถ่านใหม่ในเครื่องเดียวกัน',
    prevent:'ต่อแหล่งจ่ายหลายตัวแบบอนุกรมให้ขั้วเรียงทางเดียวกันเสมอ (บวกต่อลบ) และห้ามต่อขนานถ่านที่แรงดันไม่เท่ากัน'
  },

  'wire:over_current':{
    sev:'critical', title:'สายไฟร้อนจนฉนวนละลาย',
    cause:'กระแสรวมในวงจรสูงเกินกว่าที่ขนาดสายจะรับไหว',
    mech:'สายไฟก็มีความต้านทานเล็กน้อย กระแสสูงทำให้เกิดความร้อน P = I² × R ตลอดทั้งเส้น ฉนวนพีวีซีจะอ่อนตัวที่ราว 100 องศาแล้วละลายไหลออก เหลือทองแดงเปลือย',
    danger:'ทองแดงเปลือยสองเส้นแตะกันเมื่อไรก็ลัดวงจรซ้ำและเกิดประกายไฟ ความร้อนและประกายไฟจุดฉนวนกับวัสดุรอบข้างให้ลุกไหม้ได้ — นี่คือสาเหตุอันดับต้น ๆ ของไฟไหม้จากไฟฟ้าในบ้าน',
    prevent:'เลือกขนาดสายให้เหมาะกับกระแส ใส่ฟิวส์หรือเบรกเกอร์ที่พิกัดต่ำกว่าพิกัดสาย และห้ามพ่วงโหลดหลายตัวในสายเส้นเดียว'
  },

  'fuse:blow':{
    sev:'warning', title:'ฟิวส์ขาด — ระบบป้องกันทำงาน',
    cause:'กระแสในวงจรสูงเกินพิกัดฟิวส์',
    mech:'ข้างในฟิวส์เป็นลวดโลหะจุดหลอมเหลวต่ำ ออกแบบให้ขาดก่อนอุปกรณ์อื่นเสมอ พอกระแสเกิน ลวดจะหลอมขาดภายในเสี้ยววินาทีและตัดวงจรทันที',
    danger:'ตัวฟิวส์เองไม่อันตราย แต่การที่มันขาดแปลว่ามีความผิดปกติจริงในวงจร ต้องหาสาเหตุก่อนเปลี่ยนฟิวส์ใหม่ ห้ามใช้ลวดทองแดงหรือฟอยล์แทนฟิวส์เด็ดขาด เพราะจะไม่มีอะไรขาดอีกแล้วและกลายเป็นไฟไหม้แทน',
    prevent:'ใส่ฟิวส์ไว้ใกล้แหล่งจ่ายที่สุดเพื่อให้คุ้มครองทั้งวงจร และเลือกพิกัดให้ต่ำกว่าพิกัดของสายไฟ'
  },

  'motor:back_emf':{
    sev:'danger', title:'แรงดันย้อนกลับจากมอเตอร์ (Back-EMF)',
    cause:'ตัดไฟมอเตอร์กะทันหันขณะกำลังหมุน โดยไม่มีไดโอดคายพลังงานให้',
    mech:'ขดลวดของมอเตอร์เก็บพลังงานไว้ในสนามแม่เหล็ก พอตัดวงจร กระแสถูกบังคับให้หยุดในเวลาไม่กี่ไมโครวินาที สนามแม่เหล็กยุบตัวและเหนี่ยวนำแรงดันย้อนกลับตามสมการ V = L × (di/dt) ซึ่งสูงกว่าแรงดันแหล่งจ่ายได้หลายสิบเท่า',
    danger:'แรงดันหลายสิบถึงหลายร้อยโวลต์นี้พุ่งเข้าทำลายสารกึ่งตัวนำที่อยู่ใกล้ที่สุดในพริบตา และทำให้หน้าสัมผัสสวิตช์เกิดประกายไฟจนไหม้ติดกัน ของจริงเรามองไม่เห็นและวัดไม่ทัน จึงมักพังโดยไม่รู้สาเหตุ',
    prevent:'ต่อไดโอดคายพลังงาน (flyback diode) ไว้กับขดลวดทุกครั้ง เพื่อเปิดทางให้กระแสวนกลับเข้าตัวมันเองจนหมดแรงไปเอง อุปกรณ์ที่เป็นขดลวดทุกชนิด — มอเตอร์ รีเลย์ โซลินอยด์ — ต้องมีไดโอดคู่กันเสมอ'
  },

  '*:running_hot':{
    sev:'danger', title:'ร้อนเกินพิกัด — ใช้งานต่อเนื่องไม่ได้',
    cause:'กระแสหรือกำลังไฟที่ผ่านอุปกรณ์สูงกว่าพิกัดของมัน',
    mech:'ความร้อนเกิดเร็วกว่าที่ตัวอุปกรณ์จะระบายทิ้งได้ ตอนนี้ยังทำงานอยู่ก็จริง แต่อุณหภูมิจะไต่ขึ้นเรื่อย ๆ จนวัสดุข้างในเสียสภาพ',
    danger:'ของจริงจะพังตอนใช้งานไปสักพัก ไม่ใช่ตอนเปิดสวิตช์ครั้งแรก จึงอันตรายเพราะไม่ทันระวัง ตัวอุปกรณ์ร้อนพอจะลวกมือและจุดวัสดุติดไฟรอบข้างได้',
    prevent:'ลดแรงดันลง เพิ่มตัวต้านทานจำกัดกระแส หรือเปลี่ยนไปใช้อุปกรณ์ที่พิกัดสูงกว่า'
  },

  '*:over_current':{
    sev:'danger', title:'อุปกรณ์ไหม้เพราะกระแสเกิน',
    cause:'กระแสที่ไหลผ่านสูงเกินพิกัดของอุปกรณ์',
    mech:'ความร้อนที่เกิดจากกระแสสะสมเร็วกว่าที่ตัวอุปกรณ์จะระบายทิ้งได้ จนวัสดุข้างในเสียสภาพถาวร',
    danger:'ตัวอุปกรณ์ร้อนจัด มีควันและกลิ่นไหม้ และอาจลามไปทำให้ส่วนอื่นของวงจรเสียหายต่อ',
    prevent:'จำกัดกระแสด้วยตัวต้านทาน เลือกอุปกรณ์ให้พิกัดสูงพอ และใส่ฟิวส์ป้องกัน'
  },
  '*:over_power':{ ref:'*:over_current' },
  '*:reverse_polarity':{
    sev:'danger', title:'อุปกรณ์พังเพราะต่อกลับขั้ว',
    cause:'ต่อขั้วบวก-ลบสลับกัน',
    mech:'อุปกรณ์ที่มีขั้วออกแบบให้กระแสไหลทางเดียว ไฟที่ไหลย้อนทำให้โครงสร้างข้างในเสียหาย',
    danger:'อุปกรณ์เสียหายถาวร และอาจร้อนจัดหรือมีควัน',
    prevent:'ตรวจเครื่องหมาย + / − บนตัวอุปกรณ์ทุกครั้งก่อนจ่ายไฟ'
  }
};

/* หาข้อความของเหตุการณ์ (ตามด้วย fallback) */
function hazText(key){
  var t = HAZ_TEXT[key];
  if(t && t.ref) t = HAZ_TEXT[t.ref];
  return t || null;
}
function hazLookup(deviceId, mode){
  return hazText(deviceId + ':' + mode) || hazText('*:' + mode) || hazText('*:over_current');
}

/* ============================================================
   สถานะ
   ============================================================ */
function resetHazards(){
  HAZARD.incidents = [];
  HAZARD.wireHeat = 0;
  HAZARD.wiresBurned = false;
  HAZARD.t = 0;
  G.wsItems.forEach(function(it){
    it.heat = 0; it.failed = false; it.failMode = null;
    it.blown = false;
    it.stress = 0;
    if(it.el){
      it.el.classList.remove('heat-warn','heat-hot','failed','burst','burned','fuse-blown');
      it.el.style.removeProperty('--heat');
    }
  });
  G.wires.forEach(function(w){
    if(w.pathEl) w.pathEl.classList.remove('wire-hot','wire-burned');
  });
  _hzBarCache = null;
  renderHazardBar();
}

/* ภาระของอุปกรณ์หนึ่งตัว — เกินพิกัดไปกี่เท่า และเกินเพราะอะไร */
function itemStressor(it, sol){
  var sp = ESPEC[it.deviceId], r = sol.byItem[it.id];
  if(!sp || !r) return null;
  var best = { stress:0, mode:'over_current' };
  function bid(s, mode){ if(s > best.stress) best = { stress:s, mode:mode }; }

  if(sp.imax) bid(Math.abs(r.I) / sp.imax, 'over_current');
  if(sp.pmax) bid(r.P / sp.pmax,           'over_power');

  /* ตัวเก็บประจุอิเล็กโทรไลต์: ย้อนขั้วคือหายนะ ไม่ต้องรอกระแสเกิน */
  if(sp.kind === 'cap'){
    if(sp.vrev && r.V < -sp.vrev) bid(1 + Math.abs(r.V) / sp.vrev, 'reverse_polarity');
    if(sp.vmax && Math.abs(r.V) > sp.vmax) bid(2 * Math.abs(r.V) / sp.vmax, 'over_voltage');
  }
  /* LED/ไดโอดโดนแรงดันย้อนเกินจุดพัง */
  if(sp.kind === 'diode' && sp.vrev && r.V < -sp.vrev){
    bid(1 + 4 * Math.abs(r.V) / sp.vrev, 'reverse_breakdown');
  }
  /* ถ่านถูกอัดไฟย้อน (กระแสไหลเข้าขั้วบวกแทนที่จะไหลออก) */
  if(sp.kind === 'source' && r.I < -0.05){
    bid(1 + Math.abs(r.I) / Math.max(0.2, sp.imax || 1), 'reverse_charge');
  }
  return best;
}

/* ============================================================
   หนึ่งก้าวเวลาของระบบความเสียหาย
   คืนรายการเหตุการณ์ที่ "เพิ่งเกิด" ในก้าวนี้
   ============================================================ */
function hazardStep(sol, dt){
  var fresh = [];
  if(!sol || !sol.ok) return fresh;
  HAZARD.t += dt;

  G.wsItems.forEach(function(it){
    if(it.failed) return;
    var sp = ESPEC[it.deviceId];
    if(!sp) return;

    /* ฟิวส์มีกติกาของตัวเอง: ต้องขาดก่อนเพื่อนเสมอ นั่นคือหน้าที่ของมัน */
    if(sp.kind === 'fuse'){
      var rf = sol.byItem[it.id];
      var sf = rf ? Math.abs(rf.I) / sp.irate : 0;
      it.stress = sf;
      if(sf > 1){
        it.heat = (it.heat || 0) + dt * (Math.min(sf, HAZARD.CAP) - 1) / sp.tburn;
        if(it.heat >= 1){
          it.blown = true; it.failed = true; it.failMode = 'blow';
          fresh.push(makeIncident(it, 'blow', sol, {
            measured:'กระแสที่ไหลผ่าน ' + fmtCurrent(Math.abs(rf.I)) +
                     ' · พิกัดฟิวส์ ' + fmtCurrent(sp.irate)
          }));
        }
      } else {
        it.heat = Math.max(0, (it.heat || 0) - dt / HAZARD.COOL);
      }
      return;
    }

    var st = itemStressor(it, sol);
    if(!st) return;
    it.stress = st.stress;
    var tb = sp.tburn || 4;

    if(st.stress > 1){
      it.heat = (it.heat || 0) + dt * (Math.min(st.stress, HAZARD.CAP) - 1) / tb;
      if(it.heat >= 1){
        it.heat = 1;
        it.failed = true;
        it.failMode = st.mode;
        fresh.push(makeIncident(it, st.mode, sol, null));
      }
    } else {
      it.heat = Math.max(0, (it.heat || 0) - dt / HAZARD.COOL);
    }
  });

  /* ---- สายไฟทั้งวง ---- */
  var ws = sol.supplyI / WIRE_IMAX;
  if(ws > 1 && !HAZARD.wiresBurned){
    HAZARD.wireHeat += dt * (Math.min(ws, HAZARD.CAP) - 1) / WIRE_TBURN;
    if(HAZARD.wireHeat >= 1){
      HAZARD.wiresBurned = true;
      fresh.push(makeWireIncident(sol));
    }
  } else if(ws <= 1){
    HAZARD.wireHeat = Math.max(0, HAZARD.wireHeat - dt / HAZARD.COOL);
  }

  fresh.forEach(function(inc){ if(inc) HAZARD.incidents.push(inc); });
  return fresh.filter(Boolean);
}

/* ============================================================
   สร้างบันทึกเหตุการณ์
   ============================================================ */
function makeIncident(it, mode, sol, extra){
  var sp = ESPEC[it.deviceId];
  var dev = DEVICES[it.deviceId];
  var key = (sp.kind === 'source') ? 'source' : it.deviceId;
  var txt = hazLookup(key, mode) || hazLookup(it.deviceId, mode);
  var r = sol.byItem[it.id];

  var measured = extra && extra.measured ? extra.measured : buildMeasured(it, sp, r, mode);

  return {
    id: it.deviceId + ':' + mode,
    sev: txt.sev,
    titleTh: txt.title,
    device: dev.name,
    targets: [it.id],
    causeTh: txt.cause,
    mechTh: txt.mech,
    dangerTh: txt.danger,
    preventTh: txt.prevent,
    measuredTh: measured,
    brokeTh: (mode === 'blow')
      ? (dev.name + ' ขาด — ตัดไฟทั้งวงจร อุปกรณ์ตัวอื่นรอด')
      : (dev.name + ' เสียหายถาวร กลายเป็นวงจรเปิด'),
    cascadeTh: (mode === 'blow') ? '' : cascadeText(it),
    t: HAZARD.t
  };
}

function buildMeasured(it, sp, r, mode){
  if(!r) return '';
  var parts = [];
  if(mode === 'reverse_polarity' || mode === 'reverse_breakdown'){
    parts.push('แรงดันย้อนขั้ว ' + fmtVolt(Math.abs(r.V)));
    if(sp.vrev) parts.push('ทนได้เพียง ' + fmtVolt(sp.vrev));
  } else if(mode === 'over_voltage'){
    parts.push('แรงดันคร่อม ' + fmtVolt(Math.abs(r.V)));
    if(sp.vmax) parts.push('พิกัด ' + fmtVolt(sp.vmax));
  } else if(mode === 'reverse_charge'){
    parts.push('กระแสไหลย้อนเข้าตัวถ่าน ' + fmtCurrent(Math.abs(r.I)));
  } else if(mode === 'over_power'){
    parts.push('กำลังไฟ ' + fmtPower(r.P));
    if(sp.pmax) parts.push('พิกัด ' + fmtPower(sp.pmax));
    parts.push('กระแส ' + fmtCurrent(r.I));
  } else {
    parts.push('กระแส ' + fmtCurrent(r.I));
    if(sp.imax) parts.push('พิกัด ' + fmtCurrent(sp.imax));
    if(r.P > 0) parts.push('กำลังไฟ ' + fmtPower(r.P));
  }
  return parts.join(' · ');
}

/* อธิบายผลลูกโซ่ — อุปกรณ์ตัวนี้พังแล้วอะไรดับตามบ้าง */
function cascadeText(failedItem){
  var others = [];
  G.wsItems.forEach(function(x){
    if(x.id === failedItem.id || x.failed) return;
    var sp = ESPEC[x.deviceId];
    if(sp && (sp.pnom || sp.inom)) others.push(DEVICES[x.deviceId].name);
  });
  if(!others.length) return '';
  return 'วงจรขาดตรงนี้ ' + others.join(' ') + ' จึงหยุดทำงานตามไปด้วย — ' +
         'นี่คือลักษณะของวงจรอนุกรม เสียจุดเดียวดับทั้งวง';
}

function makeWireIncident(sol){
  var txt = hazText('wire:over_current');
  var hasFuse = false;
  G.wsItems.forEach(function(x){ if(x.deviceId === 'fuse') hasFuse = true; });
  return {
    id:'wire:over_current',
    sev: txt.sev,
    titleTh: txt.title,
    device:'สายไฟและรางบนแผง',
    targets: [],
    wires: true,
    causeTh: txt.cause,
    mechTh: txt.mech,
    dangerTh: txt.danger,
    preventTh: txt.prevent + (hasFuse ? '' : ' — วงจรนี้ยังไม่มีฟิวส์เลย'),
    measuredTh:'กระแสรวม ' + fmtCurrent(sol.supplyI) + ' · สายรับได้ ' + fmtCurrent(WIRE_IMAX),
    brokeTh:'ฉนวนสายไฟละลาย ทองแดงเปลือยออกมา วงจรใช้งานต่อไม่ได้',
    cascadeTh:'ไฟดับทั้งวงจร และจุดที่ทองแดงแตะกันจะเกิดประกายไฟซ้ำได้ทุกครั้งที่จ่ายไฟใหม่',
    t: HAZARD.t
  };
}

/* ============================================================
   แรงดันย้อนกลับจากขดลวด — ตรวจตอน "ตัดไฟ" เท่านั้น
   เรียกจาก toggleSwitchItem() ใน js/workspace.js ก่อนสับสวิตช์ออก
   ============================================================ */
function checkBackEMF(){
  if(!PowerSim.on || !PowerSim.sol || !PowerSim.sol.ok) return null;
  var sol = PowerSim.sol;

  /* มีขดลวดที่กำลังมีกระแสไหลอยู่ไหม */
  var coil = null, coilI = 0;
  G.wsItems.forEach(function(it){
    if(it.failed) return;
    var sp = ESPEC[it.deviceId];
    if(!sp || !sp.inductive) return;
    var r = sol.byItem[it.id];
    var i = r ? Math.abs(r.I) : 0;
    if(i > coilI){ coil = it; coilI = i; }
  });
  if(!coil || coilI < 0.02) return null;

  /* มีไดโอดคายพลังงานอยู่ในวงจรไหม (เกมสอนแบบนี้ในด่าน 15) */
  var protectedByDiode = false;
  G.wsItems.forEach(function(it){
    if(it.deviceId === 'diode' && !it.failed) protectedByDiode = true;
  });
  if(protectedByDiode) return null;

  /* V = L × di/dt  — ขดลวดมอเตอร์เล็ก ๆ ราว 20 mH ตัดไฟในราว 15 ไมโครวินาที */
  var L = 0.02, topen = 15e-6;
  var spike = L * coilI / topen;

  /* สารกึ่งตัวนำที่เปราะที่สุดในวงจรคือเหยื่อ */
  var victim = null;
  ['transistor','led','diode'].forEach(function(id){
    if(victim) return;
    G.wsItems.forEach(function(it){
      if(!victim && it.deviceId === id && !it.failed) victim = it;
    });
  });

  var txt = hazText('motor:back_emf');
  var inc = {
    id:'motor:back_emf',
    sev: txt.sev,
    titleTh: txt.title,
    device: DEVICES[coil.deviceId].name,
    targets: victim ? [victim.id] : [],
    arcAt: coil.id,
    causeTh: txt.cause,
    mechTh: txt.mech,
    dangerTh: txt.danger,
    preventTh: txt.prevent,
    measuredTh:'กระแสก่อนตัดไฟ ' + fmtCurrent(coilI) +
               ' · แรงดันย้อนที่เกิดขึ้นประมาณ ' + spike.toFixed(0) + ' V' +
               ' (แหล่งจ่ายมีแค่ ' + fmtVolt(sourceVoltage(G.wsItems)) + ')',
    brokeTh: victim
      ? (DEVICES[victim.deviceId].name + ' พังทันทีจากแรงดันย้อน')
      : 'หน้าสัมผัสสวิตช์เกิดประกายไฟและสึกกร่อน',
    cascadeTh: victim ? cascadeText(victim) : '',
    t: HAZARD.t
  };

  if(victim){ victim.failed = true; victim.failMode = 'back_emf'; victim.heat = 1; }
  HAZARD.incidents.push(inc);
  return inc;
}

/* ============================================================
   ประจุที่ค้างอยู่ในตัวเก็บประจุหลังตัดไฟ — คำเตือน ไม่ใช่ความเสียหาย
   ============================================================ */
function storedChargeWarning(){
  if(!PowerSim.sol || !PowerSim.sol.ok) return null;
  var worst = null, wv = 0;
  G.wsItems.forEach(function(it){
    if(it.deviceId !== 'capacitor' || it.failed) return;
    var v = Math.abs((PowerSim.capV && PowerSim.capV[it.id]) || 0);
    if(v > wv){ wv = v; worst = it; }
  });
  if(!worst || wv < 2) return null;
  return {
    id:'capacitor:stored_charge',
    sev:'warning',
    titleTh:'ตัวเก็บประจุยังมีไฟค้างอยู่',
    device:'ตัวเก็บประจุ',
    targets:[worst.id],
    causeTh:'ตัดไฟแล้ว แต่ตัวเก็บประจุยังเก็บประจุที่ชาร์จไว้',
    mechTh:'ตัวเก็บประจุเก็บพลังงานไว้ในสนามไฟฟ้าระหว่างแผ่นตัวนำ เมื่อไม่มีทางให้คายออก ประจุจะค้างอยู่ได้นานหลายนาทีถึงหลายชั่วโมง',
    dangerTh:'ที่แรงดันระดับนี้ยังไม่อันตรายต่อร่างกาย แต่ในเครื่องใช้ไฟฟ้าจริง เช่น จอภาพ ไมโครเวฟ หรือแหล่งจ่ายไฟคอมพิวเตอร์ ตัวเก็บประจุค้างไฟหลายร้อยโวลต์และเคยทำให้ช่างเสียชีวิตมาแล้ว แม้ถอดปลั๊กไปนานแล้วก็ตาม',
    preventTh:'ถอดไฟแล้วต้องคายประจุทิ้งก่อนเสมอ โดยต่อตัวต้านทานคร่อมขาทั้งสอง แล้ววัดให้แน่ใจว่าแรงดันเป็นศูนย์ก่อนใช้มือจับ',
    measuredTh:'แรงดันค้างอยู่ ' + fmtVolt(wv) + ' · พลังงานสะสม ' +
               (0.5 * ESPEC.capacitor.c * wv * wv * 1000).toFixed(0) + ' มิลลิจูล',
    brokeTh:'ไม่มีอะไรเสียหาย — แต่ยังถือว่าวงจรมีไฟอยู่',
    cascadeTh:'',
    t: HAZARD.t
  };
}

/* ============================================================
   คำเตือนเชิงป้องกัน — ยังไม่พัง แต่ต่อแบบนี้ไม่ปลอดภัย
   ============================================================ */
function protectionWarnings(sol){
  var out = [];
  if(!sol || !sol.ok) return out;

  /* ถ่านถูกอัดไฟย้อน — เสียหายช้าเกินกว่าจะพังในไม่กี่วินาที
     แต่เป็นอันตรายจริง จึงเตือนทันทีที่ตรวจพบ ไม่ต้องรอให้พัง */
  G.wsItems.forEach(function(it){
    var sp = ESPEC[it.deviceId];
    var r  = sol.byItem[it.id];
    if(!sp || sp.kind !== 'source' || !r || it.failed) return;
    if(r.I >= -0.02) return;
    var txt = hazText('source:reverse_charge');
    out.push({
      id:'source:reverse_charge', sev:'critical',
      titleTh: txt.title, device: DEVICES[it.deviceId].name, targets:[it.id],
      causeTh: txt.cause, mechTh: txt.mech, dangerTh: txt.danger, preventTh: txt.prevent,
      measuredTh:'กระแสไหลย้อนเข้าตัว ' + DEVICES[it.deviceId].name + ' ' +
                 fmtCurrent(Math.abs(r.I)) + ' (ปกติต้องไหลออกเท่านั้น)',
      brokeTh:'ยังไม่พังในทันที แต่ความเสียหายสะสมอยู่ตลอดเวลาที่จ่ายไฟ',
      cascadeTh:'', t:HAZARD.t
    });
  });

  var fuse = null;
  G.wsItems.forEach(function(it){ if(it.deviceId === 'fuse' && !fuse) fuse = it; });
  if(fuse && !fuse.blown && sol.supplyI > 0.001){
    /* ถ้าถอดฟิวส์ออกแล้วไฟยังไหลได้เกือบเท่าเดิม แปลว่าฟิวส์ไม่ได้คุ้มทั้งวงจร */
    fuse.blown = true;
    var test = solveCircuit(G.wsItems, G.wires, {});
    fuse.blown = false;
    if(test.ok && test.supplyI > sol.supplyI * 0.5){
      out.push({
        id:'fuse:bypassed', sev:'warning',
        titleTh:'ฟิวส์ไม่ได้ป้องกันวงจรนี้จริง',
        device:'ฟิวส์', targets:[fuse.id],
        causeTh:'มีเส้นทางให้ไฟไหลอ้อมฟิวส์ไปได้ (ต่อคร่อม หรือเสียบขาลงรางเดียวกันจนลัดผ่าน)',
        mechTh:'ฟิวส์จะป้องกันได้ก็ต่อเมื่อกระแสทั้งหมดต้องไหลผ่านตัวมัน ถ้ามีทางอ้อม กระแสจะเลือกไหลทางที่ต้านทานน้อยกว่าและฟิวส์จะไม่มีวันขาด',
        dangerTh:'วงจรดูเหมือนมีระบบป้องกัน แต่จริง ๆ ไม่มี เมื่อเกิดความผิดปกติจะไม่มีอะไรตัดไฟ และลุกลามเป็นไฟไหม้ได้ — อันตรายกว่าการไม่มีฟิวส์เลย เพราะทำให้ประมาท',
        preventTh:'วางฟิวส์ให้อยู่ระหว่างขั้วบวกของแหล่งจ่ายกับวงจรทั้งหมด และตรวจว่าไม่มีสายหรือรางใดลัดข้ามตัวฟิวส์',
        measuredTh:'ถอดฟิวส์ออกแล้วกระแสยังไหล ' + fmtCurrent(test.supplyI) +
                   ' จากปกติ ' + fmtCurrent(sol.supplyI),
        brokeTh:'', cascadeTh:'', t:HAZARD.t
      });
    }
  }
  return out;
}

/* ============================================================
   คำนวณล่วงหน้าว่าถ้าจ่ายไฟต่อไป จะพังอะไรบ้าง
   ใช้ตอนกด "ตรวจวงจร" เพื่อให้ผลลัพธ์แน่นอน ไม่ขึ้นกับความเร็วเครื่อง
   ทำบนสถานะจำลอง แล้วคืนค่าสถานะเดิมทั้งหมด
   ============================================================ */
function predictHazards(seconds){
  var snap = G.wsItems.map(function(it){
    return { it:it, heat:it.heat||0, failed:!!it.failed, failMode:it.failMode,
             blown:!!it.blown, stress:it.stress||0 };
  });
  var keepInc = HAZARD.incidents, keepWH = HAZARD.wireHeat,
      keepWB = HAZARD.wiresBurned, keepT = HAZARD.t;

  HAZARD.incidents = []; HAZARD.wireHeat = 0; HAZARD.wiresBurned = false; HAZARD.t = 0;
  G.wsItems.forEach(function(it){ it.heat = 0; it.failed = false; it.failMode = null; it.blown = false; });

  var dt = 0.05, steps = Math.round((seconds || 6) / dt);
  var capV = {}, got = [];
  for(var i=0;i<steps;i++){
    var sol = solveCircuit(G.wsItems, G.wires, {dt:dt, capV:capV});
    if(!sol.ok) break;
    capV = sol.capV;
    var ev = hazardStep(sol, dt);
    if(ev.length) got = got.concat(ev);
    /* ไม่มีไฟไหลแล้ว (ฟิวส์ขาด/วงจรเปิด) ก็ไม่มีอะไรพังต่อ */
    if(got.length && sol.supplyI < 0.0005) break;
  }

  /* ยังไม่พังในกรอบเวลาที่ดู แต่ความร้อนยังไต่ขึ้นอยู่ = คุกรุ่น
     ของจริงพวกนี้จะพังตอนใช้งานไปสักพัก ต้องเตือนไว้ก่อน */
  var hotWarn = [];
  G.wsItems.forEach(function(it){
    if(it.failed || (it.heat || 0) < 0.25) return;
    var sp = ESPEC[it.deviceId];
    if(!sp || sp.kind === 'fuse') return;
    var txt = hazText('*:running_hot');
    var pct = Math.round((it.stress || 0) * 100);
    hotWarn.push({
      id:'device:running_hot', sev:txt.sev,
      titleTh: DEVICES[it.deviceId].name + ' ' + txt.title,
      device: DEVICES[it.deviceId].name, targets:[it.id],
      causeTh: txt.cause, mechTh: txt.mech, dangerTh: txt.danger, preventTh: txt.prevent,
      measuredTh: DEVICES[it.deviceId].name + ' ทำงานอยู่ที่ ' + pct + '% ของพิกัด' +
                  (sp.pmax ? ' · พิกัดกำลังไฟ ' + fmtPower(sp.pmax) : '') +
                  (sp.imax ? ' · พิกัดกระแส ' + fmtCurrent(sp.imax) : ''),
      brokeTh:'ยังไม่พัง แต่ความร้อนสะสมขึ้นเรื่อย ๆ จนพังในที่สุดถ้าเปิดทิ้งไว้',
      cascadeTh:'', t:HAZARD.t
    });
  });

  /* คืนสถานะเดิมก่อน แล้วค่อยตรวจคำเตือนเชิงป้องกัน
     ไม่งั้นจะไปตรวจบนวงจรที่ "พังไปแล้วในจินตนาการ" ซึ่งให้คำตอบผิด */
  snap.forEach(function(s){
    s.it.heat = s.heat; s.it.failed = s.failed;
    s.it.failMode = s.failMode; s.it.blown = s.blown; s.it.stress = s.stress;
  });
  HAZARD.incidents = keepInc; HAZARD.wireHeat = keepWH;
  HAZARD.wiresBurned = keepWB; HAZARD.t = keepT;

  var steady = solveCircuit(G.wsItems, G.wires, {});
  var warns  = hotWarn.concat(protectionWarnings(steady));

  return { incidents:got, warnings:warns };
}

/* ลงมือทำให้พังจริงตามผลที่ทำนายไว้ (ใช้ตอนจบลำดับเหตุการณ์) */
function commitHazards(list){
  list.forEach(function(inc){
    (inc.targets || []).forEach(function(id){
      G.wsItems.forEach(function(it){
        if(it.id !== id) return;
        it.failed = true;
        it.heat = 1;
        it.failMode = inc.id.split(':')[1];
        if(it.deviceId === 'fuse') it.blown = true;
      });
    });
    if(inc.wires) HAZARD.wiresBurned = true;
  });
  HAZARD.incidents = list.slice();
  applyHazardVisuals();
}

/* ============================================================
   หน้าตาบนจอ
   ============================================================ */
function applyHazardVisuals(){
  G.wsItems.forEach(function(it){
    if(!it.el) return;
    var h = it.heat || 0;
    it.el.style.setProperty('--heat', h.toFixed(3));
    it.el.classList.toggle('heat-warn', !it.failed && h >= HAZARD.WARN && h < HAZARD.HOT);
    it.el.classList.toggle('heat-hot',  !it.failed && h >= HAZARD.HOT);
    it.el.classList.toggle('failed',    !!it.failed && it.failMode !== 'blow');
    it.el.classList.toggle('burned',    !!it.failed && it.failMode !== 'blow');
    it.el.classList.toggle('burst',     it.failMode === 'reverse_polarity' || it.failMode === 'over_voltage');
    it.el.classList.toggle('fuse-blown', !!it.blown);
    if(it.failed) it.el.classList.remove('lit','powered');
  });
  var hot = HAZARD.wireHeat >= HAZARD.WARN;
  G.wires.forEach(function(w){
    if(!w.pathEl) return;
    w.pathEl.classList.toggle('wire-hot', hot && !HAZARD.wiresBurned);
    w.pathEl.classList.toggle('wire-burned', HAZARD.wiresBurned);
  });
  renderHazardBar();
}

/* แถบสถานะความปลอดภัยเหนือพื้นที่ทำงาน — บอกสดว่าตอนนี้ตรงไหนเริ่มร้อน */
var _hzBarCache = null;

/* เขียนแถบสถานะโดยตรง — ใช้โดยแผงพยากรณ์ของโหมดอิสระ (js/sandbox.js)
   ผ่านแคชตัวเดียวกัน จะได้ไม่เขียนทับกันไปมาระหว่างสองระบบ */
function setHazardBar(html){
  var bar = document.getElementById('hazard-bar');
  if(!bar) return;
  if(html === _hzBarCache) return;
  _hzBarCache = html;
  bar.style.display = html ? 'flex' : 'none';
  bar.innerHTML = html || '';
}

function renderHazardBar(){
  var bar = document.getElementById('hazard-bar');
  if(!bar) return;
  var rows = [];

  G.wsItems.forEach(function(it){
    if(!it.el) return;
    var name = DEVICES[it.deviceId].name;
    var pct = Math.round((it.stress || 0) * 100);
    if(it.failed){
      rows.push({ cls:'hz-fail', txt:(it.failMode === 'blow' ? 'ฟิวส์ขาด ตัดไฟแล้ว' : name + ' เสียหาย') });
    } else if((it.heat || 0) >= HAZARD.HOT){
      rows.push({ cls:'hz-hot', txt:name + ' ร้อนจัด ' + pct + '% ของพิกัด' });
    } else if((it.heat || 0) >= HAZARD.WARN){
      rows.push({ cls:'hz-warn', txt:name + ' เริ่มร้อน ' + pct + '% ของพิกัด' });
    }
  });
  if(HAZARD.wiresBurned) rows.push({ cls:'hz-fail', txt:'สายไฟไหม้' });
  else if(HAZARD.wireHeat >= HAZARD.WARN) rows.push({ cls:'hz-hot', txt:'สายไฟร้อน กระแสรวมเกินพิกัด' });

  var html = rows.slice(0, 4).map(function(r){
    return '<span class="hz-chip ' + r.cls + '">' + r.txt + '</span>';
  }).join('');
  /* เขียน DOM เฉพาะตอนข้อความเปลี่ยนจริง — ลูปนี้เดิน 20 ครั้งต่อวินาที */
  if(html === _hzBarCache) return;
  _hzBarCache = html;
  bar.style.display = html ? 'flex' : 'none';
  bar.innerHTML = html;
}

/* ============================================================
   รายงานเหตุการณ์ — ตอบ 4 คำถามที่ผู้เรียนต้องรู้
   ============================================================ */
var SEV_LABEL = { critical:'อันตรายมาก', danger:'อันตราย', warning:'ควรระวัง' };

function incidentReportHTML(list){
  if(!list || !list.length) return '';
  return '<div class="incident-wrap">' + list.map(function(inc){
    var rows = [
      ['ต่อแบบนี้',  inc.causeTh],
      ['พังตรงไหน',  inc.brokeTh + (inc.cascadeTh ? ' — ' + inc.cascadeTh : '')],
      ['เกิดอะไรขึ้น', inc.mechTh],
      ['อันตรายยังไง', inc.dangerTh],
      ['ป้องกันยังไง', inc.preventTh]
    ].filter(function(r){ return r[1]; });

    return '<div class="incident sev-' + inc.sev + '">'
      + '<div class="inc-head">'
      +   '<span class="inc-sev">' + (SEV_LABEL[inc.sev] || '') + '</span>'
      +   '<span class="inc-title">' + inc.titleTh + '</span>'
      + '</div>'
      + (inc.measuredTh ? '<div class="inc-measured">วัดได้ ' + inc.measuredTh + '</div>' : '')
      + '<dl class="inc-rows">' + rows.map(function(r){
          return '<dt>' + r[0] + '</dt><dd>' + r[1] + '</dd>';
        }).join('') + '</dl>'
      + '</div>';
  }).join('') + '</div>';
}

/* ข้อความสั้นสำหรับบรรทัดสรุป (ใช้ใน modal ผลการตรวจและ toast) */
function incidentSummary(list){
  if(!list || !list.length) return '';
  var first = list[0];
  var more = list.length > 1 ? (' และอีก ' + (list.length - 1) + ' เหตุการณ์') : '';
  return first.titleTh + more;
}
