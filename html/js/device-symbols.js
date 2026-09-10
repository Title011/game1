/* ============================================================
   SVG DEVICE SYMBOLS LIBRARY
   โมเดลอุปกรณ์วาดด้วย SVG ล้วน (ไม่ใช้รูปภาพ)

   หมายเหตุ: เก็บเป็นสตริงใน .js แล้วฉีดเข้า <body> ตอนโหลด
   เพราะการอ้าง <use href="ไฟล์.svg#id"> ข้ามไฟล์ ใช้ไม่ได้เมื่อเปิดแบบ file://
   แก้ไขรูปอุปกรณ์ได้ที่ไฟล์นี้ไฟล์เดียว
   ============================================================ */
var DEVICE_SYMBOLS_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" id="device-symbols" style="display:none">

  <!-- ถ่านไฟฉาย AA — วาดรายละเอียดครบ -->
  <symbol id="dev-battery_aa" viewBox="0 0 64 40">
  <!-- outer shell -->
  <rect x="2" y="4" width="52" height="32" rx="5" fill="#c8cdd5" stroke="#8899aa" stroke-width="1.5"/>
  <!-- negative end cap -->
  <rect x="2" y="9" width="6" height="22" rx="3" fill="#9aaabb"/>
  <!-- cell segments -->
  <rect x="9"  y="6" width="13" height="28" rx="2" fill="#1565c0"/>
  <rect x="24" y="6" width="13" height="28" rx="2" fill="#b71c1c"/>
  <rect x="39" y="6" width="13" height="28" rx="2" fill="#2e7d32"/>
  <!-- cell dividers -->
  <line x1="23" y1="6" x2="23" y2="36" stroke="#8899aa" stroke-width="1.2"/>
  <line x1="38" y1="6" x2="38" y2="36" stroke="#8899aa" stroke-width="1.2"/>
  <!-- cell highlights -->
  <rect x="10"  y="7"  width="5" height="8" rx="1" fill="rgba(255,255,255,0.2)"/>
  <rect x="25"  y="7"  width="5" height="8" rx="1" fill="rgba(255,255,255,0.2)"/>
  <rect x="40"  y="7"  width="5" height="8" rx="1" fill="rgba(255,255,255,0.2)"/>
  <!-- positive cap -->
  <rect x="54" y="13" width="8" height="14" rx="3" fill="#ffd700" stroke="#b8960a" stroke-width="1.2"/>
  <rect x="55" y="14" width="3" height="6"  rx="1" fill="rgba(255,255,255,0.3)"/>
  <!-- wrap label strip -->
  <rect x="9" y="22" width="43" height="8" rx="1" fill="rgba(0,0,0,0.15)"/>
  <text x="30" y="29" text-anchor="middle" fill="rgba(255,255,255,0.7)" font-size="5.5" font-family="Arial">1.5V  AA</text>
  <!-- +/- labels -->
  <text x="58" y="22" text-anchor="middle" fill="#000" font-size="7" font-weight="bold">+</text>
  <text x="5"  y="22" text-anchor="middle" fill="#555" font-size="7" font-weight="bold">−</text>
  <!-- animated charge glow -->
  <ellipse cx="30" cy="20" rx="20" ry="10" fill="none" stroke="rgba(255,215,0,0.0)" stroke-width="2" class="batt-glow"/>
</symbol>

  <!-- แบตเตอรี่ 9V -->
  <symbol id="dev-battery_9v" viewBox="0 0 52 60">
  <!-- body -->
  <rect x="6" y="12" width="40" height="42" rx="6" fill="#111133" stroke="#3344bb" stroke-width="1.8"/>
  <rect x="8" y="14" width="36" height="40" rx="5" fill="#1a1a4a"/>
  <!-- brand stripe -->
  <rect x="8" y="14" width="36" height="10" rx="4" fill="#2233cc"/>
  <!-- warning stripe -->
  <rect x="8" y="42" width="36" height="3" fill="#ffd700" opacity=".4"/>
  <!-- terminals top -->
  <rect x="12" y="5"  width="10" height="9" rx="2.5" fill="#bbbbcc" stroke="#8888aa" stroke-width="1"/>
  <rect x="30" y="4"  width="10" height="10" rx="2.5" fill="#ffd700" stroke="#b8960a" stroke-width="1"/>
  <!-- terminal holes -->
  <circle cx="17" cy="9"  r="2.5" fill="#555"/>
  <circle cx="35" cy="9"  r="2.5" fill="#7a5c00"/>
  <!-- labels -->
  <text x="17" y="10.5" text-anchor="middle" fill="#999" font-size="5" font-weight="bold">−</text>
  <text x="35" y="10.5" text-anchor="middle" fill="#222" font-size="5" font-weight="bold">+</text>
  <!-- voltage label -->
  <text x="26" y="36" text-anchor="middle" fill="#00d4ff" font-size="12" font-weight="bold">9V</text>
  <!-- mAh label -->
  <text x="26" y="46" text-anchor="middle" fill="#6677aa" font-size="6">600 mAh</text>
  <!-- brand -->
  <text x="26" y="52" text-anchor="middle" fill="#4455cc" font-size="6" font-weight="bold">ALKALINE</text>
  <!-- corner screws -->
  <circle cx="11" cy="17" r="2" fill="#222" stroke="#444" stroke-width=".5"/>
  <circle cx="41" cy="17" r="2" fill="#222" stroke="#444" stroke-width=".5"/>
  <circle cx="11" cy="50" r="2" fill="#222" stroke="#444" stroke-width=".5"/>
  <circle cx="41" cy="50" r="2" fill="#222" stroke="#444" stroke-width=".5"/>
  <!-- powered glow class -->
  <rect x="6" y="12" width="40" height="42" rx="6" fill="none" stroke="rgba(0,212,255,0)" stroke-width="3" class="batt-glow"/>
</symbol>

  <!-- สวิตช์ -->
<symbol id="dev-switch" viewBox="0 0 64 40">
  <!-- mounting base -->
  <rect x="4" y="16" width="56" height="8" rx="3" fill="#1a2f50" stroke="#2d4a70" stroke-width="1.5"/>
  <!-- left contact -->
  <circle cx="13" cy="20" r="7" fill="#c8d0d8" stroke="#7a8899" stroke-width="1.5"/>
  <circle cx="13" cy="20" r="4" fill="#aaa"/>
  <circle cx="13" cy="20" r="2" fill="#666"/>
  <!-- right contact -->
  <circle cx="51" cy="20" r="7" fill="#c8d0d8" stroke="#7a8899" stroke-width="1.5"/>
  <circle cx="51" cy="20" r="4" fill="#aaa"/>
  <circle cx="51" cy="20" r="2" fill="#666"/>
  <!-- middle guides -->
  <rect x="26" y="18" width="12" height="4" rx="2" fill="#0d1b2a" stroke="#2d4a70" stroke-width="1"/>
  <!-- lever (open) — class switch-lever = animated when powered -->
  <line x1="13" y1="20" x2="38" y2="7" stroke="#ffd700" stroke-width="4" stroke-linecap="round" class="switch-lever"/>
  <circle cx="38" cy="7" r="5" fill="#ffd700" stroke="#b8960a" stroke-width="1.5" class="switch-lever"/>
  <circle cx="38" cy="7" r="2" fill="#b8960a" class="switch-lever"/>
  <!-- screw bolt heads -->
  <circle cx="27" cy="16" r="2.5" fill="#444" stroke="#222" stroke-width=".5"/>
  <line x1="26" y1="16" x2="28" y2="16" stroke="#222" stroke-width="1"/>
  <line x1="27" y1="15" x2="27" y2="17" stroke="#222" stroke-width="1"/>
  <circle cx="37" cy="16" r="2.5" fill="#444" stroke="#222" stroke-width=".5"/>
  <line x1="36" y1="16" x2="38" y2="16" stroke="#222" stroke-width="1"/>
  <line x1="37" y1="15" x2="37" y2="17" stroke="#222" stroke-width="1"/>
  <!-- leads -->
  <line x1="2"  y1="20" x2="6"  y2="20" stroke="#ccc" stroke-width="2.5"/>
  <line x1="58" y1="20" x2="62" y2="20" stroke="#ccc" stroke-width="2.5"/>
  <text x="32" y="38" text-anchor="middle" fill="#6e88a8" font-size="6.5">SWITCH</text>
</symbol>

  <!-- ฟิวส์ -->
<symbol id="dev-fuse" viewBox="0 0 64 40">
  <!-- end caps metal -->
  <rect x="2"  y="14" width="10" height="12" rx="2" fill="#b0b8c0" stroke="#8899aa" stroke-width="1.2"/>
  <rect x="52" y="14" width="10" height="12" rx="2" fill="#b0b8c0" stroke="#8899aa" stroke-width="1.2"/>
  <!-- leads -->
  <line x1="0"  y1="20" x2="4"  y2="20" stroke="#ccc" stroke-width="2.5"/>
  <line x1="60" y1="20" x2="64" y2="20" stroke="#ccc" stroke-width="2.5"/>
  <!-- glass tube body -->
  <rect x="12" y="12" width="40" height="16" rx="8" fill="rgba(180,220,255,0.15)" stroke="#88aabb" stroke-width="1.5"/>
  <!-- glass shine top -->
  <rect x="14" y="13" width="14" height="4" rx="3" fill="rgba(255,255,255,0.22)"/>
  <!-- glass shine side -->
  <rect x="13" y="12" width="3" height="16" rx="2" fill="rgba(255,255,255,0.12)"/>
  <!-- fuse element (thin wire) -->
  <path d="M14,20 Q18,14 22,20 Q26,26 30,20 Q34,14 38,20 Q42,26 46,20 Q49,14 50,20"
        fill="none" stroke="#e0a830" stroke-width="1.3" stroke-linecap="round"/>
  <!-- rating band -->
  <line x1="20" y1="12" x2="20" y2="28" stroke="rgba(200,100,0,0.5)" stroke-width="1.5"/>
  <line x1="44" y1="12" x2="44" y2="28" stroke="rgba(200,100,0,0.5)" stroke-width="1.5"/>
  <!-- rating text -->
  <text x="32" y="22" text-anchor="middle" fill="rgba(255,200,80,0.7)" font-size="5.5">5A</text>
  <text x="32" y="36" text-anchor="middle" fill="#6e88a8" font-size="6.5">FUSE</text>
</symbol>

  <!-- ตัวต้านทาน -->
<symbol id="dev-resistor" viewBox="0 0 64 40">
  <!-- leads -->
  <line x1="0"  y1="20" x2="12" y2="20" stroke="#ccc" stroke-width="2.5"/>
  <line x1="52" y1="20" x2="64" y2="20" stroke="#ccc" stroke-width="2.5"/>
  <!-- body shadow -->
  <rect x="13" y="14" width="38" height="14" rx="5" fill="#7a4a10" opacity=".4"/>
  <!-- body -->
  <rect x="12" y="12" width="38" height="14" rx="5" fill="#d4a04a" stroke="#a06820" stroke-width="1.5"/>
  <!-- highlight gloss -->
  <rect x="14" y="13" width="14" height="5" rx="3" fill="rgba(255,255,255,0.25)"/>
  <!-- color bands: Brown Black Red Gold = 1kΩ -->
  <rect x="20" y="12" width="4" height="14" rx="1" fill="#8b4513"/>
  <rect x="26" y="12" width="4" height="14" rx="1" fill="#111"/>
  <rect x="32" y="12" width="4" height="14" rx="1" fill="#c0392b"/>
  <rect x="42" y="12" width="3" height="14" rx="1" fill="#f1c40f"/>
  <!-- ohm label -->
  <text x="32" y="34" text-anchor="middle" fill="#6e88a8" font-size="6">1kΩ  RESISTOR</text>
</symbol>

  <!-- LED -->
<symbol id="dev-led" viewBox="0 0 64 52">
  <!-- leads -->
  <line x1="0"  y1="26" x2="14" y2="26" stroke="#ccc" stroke-width="2.5"/>
  <line x1="42" y1="26" x2="56" y2="26" stroke="#ccc" stroke-width="2.5"/>
  <!-- anode lead longer (anode mark) -->
  <!-- schematic: triangle + bar -->
  <polygon points="14,14 14,38 36,26" fill="#00cc66" stroke="#009944" stroke-width="1.5" class="led-bulb"/>
  <line x1="36" y1="14" x2="36" y2="38" stroke="#009944" stroke-width="2.5"/>
  <!-- dome lens (T-1¾) -->
  <ellipse cx="39" cy="26" rx="6" ry="9" fill="#00dd77" stroke="#009944" stroke-width="1.2" class="led-bulb"/>
  <!-- lens shine -->
  <ellipse cx="37" cy="20" rx="2.5" ry="3" fill="rgba(255,255,255,0.4)" class="led-bulb"/>
  <!-- lead flat (cathode marker on lens base) -->
  <line x1="36" y1="35" x2="36" y2="38" stroke="#009944" stroke-width="3"/>
  <!-- light rays -->
  <line x1="47" y1="16" x2="55" y2="9"  stroke="#00ff88" stroke-width="2"   stroke-linecap="round" class="led-bulb"/>
  <line x1="50" y1="23" x2="60" y2="20" stroke="#00ff88" stroke-width="2"   stroke-linecap="round" class="led-bulb"/>
  <line x1="47" y1="33" x2="55" y2="40" stroke="#00ff88" stroke-width="1.5" stroke-linecap="round" class="led-bulb"/>
  <!-- ray arrowheads -->
  <polygon points="55,9 50,11 52,14" fill="#00ff88" class="led-bulb"/>
  <polygon points="60,20 55,20 56,24" fill="#00ff88" class="led-bulb"/>
  <text x="28" y="50" text-anchor="middle" fill="#6e88a8" font-size="6.5">LED</text>
</symbol>

  <!-- หลอดไฟ -->
<symbol id="dev-bulb" viewBox="0 0 52 60">
  <!-- outer glow ring (powered) -->
  <circle cx="26" cy="20" r="18" fill="rgba(255,200,0,0.06)" class="bulb-glass"/>
  <!-- glass globe -->
  <circle cx="26" cy="20" r="15" fill="#fffde7" stroke="#ddc060" stroke-width="1.5" class="bulb-glass"/>
  <!-- glass tint -->
  <circle cx="26" cy="20" r="14" fill="rgba(255,245,150,0.3)" class="bulb-glass"/>
  <!-- inner glow when powered -->
  <circle cx="26" cy="20" r="10" fill="rgba(255,180,0,0.0)" class="bulb-glass"/>
  <!-- shine spots -->
  <ellipse cx="19" cy="12" rx="5" ry="3.5" fill="rgba(255,255,255,0.45)" class="bulb-glass"/>
  <ellipse cx="32" cy="25" rx="2" ry="3"   fill="rgba(255,255,255,0.2)"  class="bulb-glass"/>
  <!-- filament support wires -->
  <line x1="22" y1="33" x2="22" y2="24" stroke="#bbb" stroke-width="1"/>
  <line x1="30" y1="33" x2="30" y2="24" stroke="#bbb" stroke-width="1"/>
  <!-- filament anchor bars -->
  <line x1="21" y1="27" x2="31" y2="27" stroke="#aaa" stroke-width=".8"/>
  <!-- tungsten filament coil -->
  <path d="M21,25 Q23,19 26,25 Q29,19 31,25" fill="none" stroke="#ff8800" stroke-width="2.2"
        stroke-linecap="round" class="bulb-glass"/>
  <!-- glass neck -->
  <path d="M19,34 Q18,36 18,38 L34,38 Q34,36 33,34 Z" fill="#e8d880" stroke="#c8b850" stroke-width=".8"/>
  <!-- brass base sections -->
  <rect x="18" y="37" width="16" height="5" rx="1.5" fill="#c8a010" stroke="#a08000" stroke-width="1"/>
  <rect x="18" y="41" width="16" height="4" rx=".5"  fill="#e0b820"/>
  <!-- base grooves (knurling) -->
  <rect x="18" y="44" width="16" height="10" rx="1" fill="#aaa" stroke="#888" stroke-width="1"/>
  <line x1="18" y1="46" x2="34" y2="46" stroke="#999" stroke-width=".8"/>
  <line x1="18" y1="48" x2="34" y2="48" stroke="#999" stroke-width=".8"/>
  <line x1="18" y1="50" x2="34" y2="50" stroke="#999" stroke-width=".8"/>
  <line x1="18" y1="52" x2="34" y2="52" stroke="#999" stroke-width=".8"/>
  <!-- base leads -->
  <line x1="22" y1="54" x2="22" y2="58" stroke="#aaa" stroke-width="2.5"/>
  <line x1="30" y1="54" x2="30" y2="58" stroke="#aaa" stroke-width="2.5"/>
  <!-- port connections -->
  <line x1="0"  y1="26" x2="11" y2="26" stroke="#ccc" stroke-width="2"/>
  <line x1="41" y1="26" x2="52" y2="26" stroke="#ccc" stroke-width="2"/>
  <text x="26" y="62" text-anchor="middle" fill="#6e88a8" font-size="6.5">BULB  60W</text>
</symbol>

  <!-- มอเตอร์ (โรเตอร์หมุนได้) -->
<symbol id="dev-motor" viewBox="0 0 64 64">
  <!-- stator outer -->
  <circle cx="32" cy="32" r="26" fill="#0d2060" stroke="#1a3a9a" stroke-width="2.5"/>
  <circle cx="32" cy="32" r="23" fill="#112070"/>
  <!-- stator pole N top -->
  <path d="M32,9 Q40,9 43,15 L38,20 Q36,15 32,15 Q28,15 26,20 L21,15 Q24,9 32,9Z"
        fill="#1a3090" stroke="#2244bb" stroke-width=".8"/>
  <!-- stator pole S bottom -->
  <path d="M32,55 Q24,55 21,49 L26,44 Q28,49 32,49 Q36,49 38,44 L43,49 Q40,55 32,55Z"
        fill="#1a3090" stroke="#2244bb" stroke-width=".8"/>
  <!-- pole labels -->
  <text x="32" y="13" text-anchor="middle" fill="#ff4444" font-size="6" font-weight="bold">N</text>
  <text x="32" y="53" text-anchor="middle" fill="#4444ff" font-size="6" font-weight="bold">S</text>
  <!-- field coil left -->
  <path d="M10,24 Q7,28 7,32 Q7,36 10,40" fill="none" stroke="#ffd700" stroke-width="1.5" opacity=".7"/>
  <path d="M10,24 Q13,28 13,32 Q13,36 10,40" fill="none" stroke="#ffd700" stroke-width="1.5" opacity=".7"/>
  <!-- field coil right -->
  <path d="M54,24 Q57,28 57,32 Q57,36 54,40" fill="none" stroke="#ffd700" stroke-width="1.5" opacity=".7"/>
  <path d="M54,24 Q51,28 51,32 Q51,36 54,40" fill="none" stroke="#ffd700" stroke-width="1.5" opacity=".7"/>
  <!-- ROTOR animated -->
  <g class="motor-rotor">
    <!-- rotor disc -->
    <circle cx="32" cy="32" r="14" fill="#162050" stroke="#2040a0" stroke-width="1.5"/>
    <!-- 3 pole windings -->
    <line x1="32" y1="18" x2="32" y2="32" stroke="#ff8800" stroke-width="3" stroke-linecap="round"/>
    <line x1="44" y1="39" x2="32" y2="32" stroke="#ff8800" stroke-width="3" stroke-linecap="round"/>
    <line x1="20" y1="39" x2="32" y2="32" stroke="#ff8800" stroke-width="3" stroke-linecap="round"/>
    <!-- pole shoes -->
    <circle cx="32" cy="19" r="4" fill="#e08000" stroke="#b06000" stroke-width="1"/>
    <circle cx="44" cy="39" r="4" fill="#e08000" stroke="#b06000" stroke-width="1"/>
    <circle cx="20" cy="39" r="4" fill="#e08000" stroke="#b06000" stroke-width="1"/>
    <!-- commutator segments -->
    <circle cx="32" cy="32" r="5.5" fill="#222" stroke="#555" stroke-width=".8"/>
    <line x1="29" y1="28" x2="35" y2="36" stroke="#444" stroke-width="1"/>
    <line x1="35" y1="28" x2="29" y2="36" stroke="#444" stroke-width="1"/>
  </g>
  <!-- shaft -->
  <circle cx="32" cy="32" r="3" fill="#aaa" stroke="#777" stroke-width="1"/>
  <!-- brush assembly left -->
  <rect x="1"  y="28" width="8" height="8" rx="2" fill="#c0392b" stroke="#900" stroke-width="1"/>
  <line x1="5" y1="32" x2="9" y2="32" stroke="rgba(255,100,0,.5)" stroke-width="1"/>
  <text x="5" y="33.5" text-anchor="middle" fill="#fff" font-size="6" font-weight="bold">+</text>
  <!-- brush assembly right -->
  <rect x="55" y="28" width="8" height="8" rx="2" fill="#2980b9" stroke="#0044aa" stroke-width="1"/>
  <line x1="55" y1="32" x2="59" y2="32" stroke="rgba(0,100,255,.5)" stroke-width="1"/>
  <text x="59" y="33.5" text-anchor="middle" fill="#fff" font-size="6" font-weight="bold">−</text>
  <text x="32" y="62" text-anchor="middle" fill="#6e88a8" font-size="6.5">DC MOTOR</text>
</symbol>

  <!-- บัซเซอร์ -->
<symbol id="dev-buzzer" viewBox="0 0 64 60">
  <!-- outer case -->
  <g class="buzzer-body">
    <rect x="4" y="8" width="32" height="36" rx="5" fill="#111" stroke="#444" stroke-width="1.8"/>
    <!-- top grill -->
    <rect x="6" y="9" width="28" height="6" rx="2" fill="#1a1a1a" stroke="#333" stroke-width=".8"/>
    <line x1="10" y1="9" x2="10" y2="15" stroke="#333" stroke-width="1"/>
    <line x1="16" y1="9" x2="16" y2="15" stroke="#333" stroke-width="1"/>
    <line x1="22" y1="9" x2="22" y2="15" stroke="#333" stroke-width="1"/>
    <line x1="28" y1="9" x2="28" y2="15" stroke="#333" stroke-width="1"/>
    <!-- piezo disc face -->
    <circle cx="20" cy="30" r="12" fill="#1a1a1a" stroke="#555" stroke-width="1"/>
    <circle cx="20" cy="30" r="9"  fill="#252525" stroke="#666" stroke-width=".8"/>
    <circle cx="20" cy="30" r="6"  fill="#2e2e2e" stroke="#777" stroke-width=".8"/>
    <circle cx="20" cy="30" r="3"  fill="#3a3a3a" stroke="#888" stroke-width=".8"/>
    <circle cx="20" cy="30" r="1.2" fill="#999"/>
    <!-- brand sticker -->
    <rect x="7" y="40" width="26" height="3" rx="1" fill="#1a1a1a"/>
    <text x="20" y="42.5" text-anchor="middle" fill="#555" font-size="4">PIEZO</text>
  </g>
  <!-- sound waves (3 arcs) -->
  <path d="M38,22 Q47,30 38,38" fill="none" stroke="#00d4ff" stroke-width="2"   stroke-linecap="round"/>
  <path d="M42,17 Q54,30 42,43" fill="none" stroke="#00d4ff" stroke-width="1.6" stroke-linecap="round" opacity=".65"/>
  <path d="M46,12 Q62,30 46,48" fill="none" stroke="#00d4ff" stroke-width="1.2" stroke-linecap="round" opacity=".35"/>
  <!-- pin legs -->
  <line x1="12" y1="44" x2="12" y2="56" stroke="#c0392b" stroke-width="2.5"/>
  <line x1="28" y1="44" x2="28" y2="56" stroke="#2980b9" stroke-width="2.5"/>
  <!-- pin connectors -->
  <circle cx="12" cy="57" r="3" fill="#c0392b" stroke="#900" stroke-width="1"/>
  <circle cx="28" cy="57" r="3" fill="#2980b9" stroke="#0044aa" stroke-width="1"/>
  <text x="12" y="62" text-anchor="middle" fill="#c0392b" font-size="5.5">+</text>
  <text x="28" y="62" text-anchor="middle" fill="#2980b9" font-size="5.5">−</text>
  <!-- port connections -->
  <line x1="0"  y1="26" x2="4"  y2="26" stroke="#ccc" stroke-width="2"/>
  <line x1="36" y1="26" x2="40" y2="26" stroke="#ccc" stroke-width="2"/>
  <text x="26" y="66" text-anchor="middle" fill="#6e88a8" font-size="6">BUZZER</text>
</symbol>

  <!-- ไดโอด -->
<symbol id="dev-diode" viewBox="0 0 64 40">
  <!-- leads -->
  <line x1="0"  y1="20" x2="14" y2="20" stroke="#ccc" stroke-width="2.5"/>
  <line x1="50" y1="20" x2="64" y2="20" stroke="#ccc" stroke-width="2.5"/>
  <!-- housing cylinder -->
  <rect x="14" y="12" width="36" height="16" rx="8" fill="#1a1a1a" stroke="#444" stroke-width="1.5"/>
  <!-- cathode band -->
  <rect x="42" y="12" width="7" height="16" rx="4" fill="#c8c8c8" stroke="#999" stroke-width=".8"/>
  <!-- schematic symbol inside -->
  <polygon points="20,14 20,26 34,20" fill="#444" opacity=".9"/>
  <line x1="34" y1="14" x2="34" y2="26" stroke="#888" stroke-width="2"/>
  <!-- glass highlight -->
  <ellipse cx="25" cy="15" rx="6" ry="2" fill="rgba(255,255,255,0.15)"/>
  <!-- part number -->
  <text x="28" y="22" text-anchor="middle" fill="rgba(255,255,255,0.35)" font-size="5" font-family="monospace">1N4007</text>
  <!-- A / K labels -->
  <text x="10"  y="33" text-anchor="middle" fill="#6e88a8" font-size="6.5">A</text>
  <text x="54"  y="33" text-anchor="middle" fill="#6e88a8" font-size="6.5">K</text>
  <text x="32"  y="38" text-anchor="middle" fill="#6e88a8" font-size="6">DIODE</text>
</symbol>

  <!-- ตัวเก็บประจุ -->
<symbol id="dev-capacitor" viewBox="0 0 40 64">
  <!-- body cylinder -->
  <rect x="6" y="8" width="28" height="42" rx="5" fill="#1a4a8a" stroke="#2060b0" stroke-width="1.8"/>
  <!-- negative stripe -->
  <rect x="6" y="8" width="10" height="42" rx="4" fill="#0a2a5a"/>
  <!-- minus marks -->
  <line x1="7"  y1="18" x2="14" y2="18" stroke="#88aacc" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="7"  y1="24" x2="14" y2="24" stroke="#88aacc" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="7"  y1="30" x2="14" y2="30" stroke="#88aacc" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="7"  y1="36" x2="14" y2="36" stroke="#88aacc" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="7"  y1="42" x2="14" y2="42" stroke="#88aacc" stroke-width="1.5" stroke-linecap="round"/>
  <!-- top dome -->
  <ellipse cx="20" cy="8" rx="14" ry="4" fill="#2060b0" stroke="#2d70c0" stroke-width="1"/>
  <!-- vent score (X on top) -->
  <line x1="16" y1="5" x2="24" y2="11" stroke="#1a4a8a" stroke-width="1.2"/>
  <line x1="24" y1="5" x2="16" y2="11" stroke="#1a4a8a" stroke-width="1.2"/>
  <!-- body shine -->
  <rect x="18" y="10" width="4" height="22" rx="2" fill="rgba(255,255,255,0.12)"/>
  <!-- capacitance label -->
  <text x="24" y="28" text-anchor="middle" fill="#88ccff" font-size="5.5" transform="rotate(90,24,28)">100µF 16V</text>
  <!-- plus symbol -->
  <text x="28" y="30" text-anchor="middle" fill="#ffd700" font-size="10" font-weight="bold">+</text>
  <!-- leads -->
  <line x1="14" y1="50" x2="14" y2="60" stroke="#aaa" stroke-width="2.5"/>
  <line x1="26" y1="50" x2="26" y2="60" stroke="#aaa" stroke-width="2.5"/>
  <!-- port side connections -->
  <line x1="2"  y1="32" x2="6"  y2="32" stroke="#ccc" stroke-width="2"/>
  <line x1="34" y1="32" x2="38" y2="32" stroke="#ccc" stroke-width="2"/>
  <!-- powered glow -->
  <rect x="6" y="8" width="28" height="42" rx="5" fill="none" stroke="rgba(0,212,255,0)" stroke-width="2" class="cap-glow"/>
  <text x="20" y="63" text-anchor="middle" fill="#6e88a8" font-size="5.5">CAPACITOR</text>
</symbol>

  <!-- ทรานซิสเตอร์ NPN — ตัวถังจริงแบบ TO-92 (พลาสติกดำ หน้าตัดแบน 3 ขา)
       ปลายขาต้องไปจบที่ตำแหน่งจุดขั้ว: ซ้าย(0,30) ขวา(52,30) ล่าง(26,60) -->
<symbol id="dev-transistor" viewBox="0 0 52 60">
  <!-- ขาโลหะ 3 ขา: วาดชั้นเข้มก่อน แล้วทับด้วยชั้นสว่าง = ได้ขอบโลหะ
       (วาดก่อนตัวถัง เพื่อให้โคนขาถูกตัวถังบังเหมือนโผล่ออกมาจริง) -->
  <g fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path d="M19,21 L17,30 L0,30"  stroke="#69737b" stroke-width="4.2"/>
    <path d="M33,21 L35,30 L52,30" stroke="#69737b" stroke-width="4.2"/>
    <path d="M26,21 L26,60"        stroke="#69737b" stroke-width="4.2"/>
    <path d="M19,21 L17,30 L0,30"  stroke="#ccd5dc" stroke-width="2.2"/>
    <path d="M33,21 L35,30 L52,30" stroke="#ccd5dc" stroke-width="2.2"/>
    <path d="M26,21 L26,60"        stroke="#ccd5dc" stroke-width="2.2"/>
  </g>
  <!-- เงาใต้ตัวถัง -->
  <path d="M13,25 L13,17 A13,13 0 0,1 39,17 L39,25 Z" fill="#000" opacity=".45"/>
  <!-- ตัวถังพลาสติก: ด้านบนโค้งครึ่งวงกลม ด้านหน้าตัดแบน (เอกลักษณ์ TO-92) -->
  <path d="M12,24 L12,16 A14,14 0 0,1 40,16 L40,24 Z" fill="#232323" stroke="#414141" stroke-width="1.4"/>
  <!-- ไล่เฉดครึ่งซ้ายให้ดูเป็นทรงกระบอก -->
  <path d="M12,24 L12,16 A14,14 0 0,1 26,2 L26,24 Z" fill="#2f2f2f"/>
  <!-- แสงสะท้อนบนผิวพลาสติก -->
  <path d="M16,22 L16,16 A10,10 0 0,1 22,6.8 L22,22 Z" fill="rgba(255,255,255,.08)"/>
  <ellipse cx="19.5" cy="10.5" rx="2.6" ry="4" fill="rgba(255,255,255,.14)"/>
  <!-- ขอบหน้าตัดแบนซ้าย / ขอบมนขวา -->
  <line x1="12" y1="16" x2="12" y2="24" stroke="#5c5c5c" stroke-width="1"/>
  <line x1="40" y1="16" x2="40" y2="24" stroke="#141414" stroke-width="1"/>
  <!-- เบอร์อุปกรณ์สกรีนบนตัวถัง -->
  <text x="26" y="13.5" text-anchor="middle" fill="#aeb7bf" font-size="6.2" font-family="monospace">2N3904</text>
  <text x="26" y="21"   text-anchor="middle" fill="#7b848c" font-size="5.4" font-family="monospace">NPN</text>
  <!-- ป้ายขา B (base) / C (collector) / E (emitter) -->
  <text x="3"  y="27" fill="#ffd700" font-size="7" font-weight="bold">B</text>
  <text x="45" y="27" fill="#00d4ff" font-size="7" font-weight="bold">C</text>
  <text x="30" y="47" fill="#00ff88" font-size="7" font-weight="bold">E</text>
</symbol>

  <!-- LDR -->
<symbol id="dev-ldr" viewBox="0 0 64 52">
  <!-- body -->
  <rect x="12" y="16" width="36" height="20" rx="5" fill="#c49a28" stroke="#a07818" stroke-width="1.5"/>
  <!-- body shadow -->
  <rect x="13" y="17" width="36" height="20" rx="5" fill="#7a5a10" opacity=".3"/>
  <!-- photocell circle -->
  <circle cx="30" cy="26" r="8" fill="#7a5000" stroke="#a07818" stroke-width="1"/>
  <!-- serpentine CdS trace -->
  <path d="M23,26 Q25,20 27,26 Q29,32 31,26 Q33,20 35,26 Q37,32 37,26"
        fill="none" stroke="#f0c040" stroke-width="1.5" stroke-linecap="round"/>
  <!-- eye reflection -->
  <circle cx="28" cy="23" r="1.5" fill="rgba(255,255,200,0.5)"/>
  <!-- body highlight -->
  <rect x="13" y="17" width="12" height="6" rx="3" fill="rgba(255,255,255,0.18)"/>
  <!-- leads -->
  <line x1="0"  y1="26" x2="12" y2="26" stroke="#ccc" stroke-width="2.5"/>
  <line x1="48" y1="26" x2="64" y2="26" stroke="#ccc" stroke-width="2.5"/>
  <!-- light arrows (3 beams) -->
  <g stroke="#ffd700" stroke-width="2" stroke-linecap="round">
    <line x1="22" y1="6" x2="16" y2="13"/>
    <polygon points="16,13 20,11 18,15" fill="#ffd700" stroke="none"/>
    <line x1="30" y1="4" x2="28" y2="12"/>
    <polygon points="28,12 30,8 32,12" fill="#ffd700" stroke="none"/>
    <line x1="38" y1="6" x2="44" y2="13"/>
    <polygon points="44,13 42,9 46,11" fill="#ffd700" stroke="none"/>
  </g>
  <text x="30" y="48" text-anchor="middle" fill="#6e88a8" font-size="6.5">LDR  (Light Sensor)</text>
</symbol>

  <!-- Breadboard — บอร์ดทดลองจริง 400 จุด
       พลาสติกขาวครีม / ร่องกลางแบ่งซ้าย-ขวา / ตารางรูเสียบ 5 แถวบน + 5 แถวล่าง
       รางจ่ายไฟบน-ล่าง มีเส้นแดง(+) และน้ำเงิน(−) -->
<symbol id="dev-breadboard" viewBox="0 0 80 56">
  <!-- ขาต่อสายไปยังจุดขั้วทั้ง 4 ทิศ (อุปกรณ์เดียวในเกมที่มี 4 จุด) -->
  <g stroke="#b0b8c0" stroke-width="2.2" stroke-linecap="round">
    <line x1="0"  y1="28" x2="3"  y2="28"/>
    <line x1="77" y1="28" x2="80" y2="28"/>
    <line x1="40" y1="0"  x2="40" y2="3"/>
    <line x1="40" y1="53" x2="40" y2="56"/>
  </g>
  <!-- เงาใต้บอร์ด -->
  <rect x="3.4" y="3.4" width="75" height="50" rx="2.5" fill="#000" opacity=".4"/>
  <!-- ตัวบอร์ดพลาสติกขาวครีม -->
  <rect x="2.5" y="2.5" width="75" height="50" rx="2.5" fill="#edebe1" stroke="#adaa9d" stroke-width="1"/>
  <rect x="3.4" y="3.4" width="73.2" height="2" rx="1" fill="#f9f8f3"/>
  <rect x="3.4" y="49.6" width="73.2" height="2" rx="1" fill="#d6d3c6"/>

  <!-- ร่องกลางบอร์ด (center channel) -->
  <rect x="3.4" y="26.6" width="73.2" height="4" fill="#dbd8ca"/>
  <line x1="3.4" y1="26.8" x2="76.6" y2="26.8" stroke="#a8a598" stroke-width=".6"/>
  <line x1="3.4" y1="30.4" x2="76.6" y2="30.4" stroke="#f5f4ed" stroke-width=".6"/>

  <!-- เส้นรางจ่ายไฟ: แดง = + , น้ำเงิน = − -->
  <g stroke-width=".8">
    <line x1="7" y1="4.2"  x2="73" y2="4.2"  stroke="#d1392c"/>
    <line x1="7" y1="9.4"  x2="73" y2="9.4"  stroke="#2a68c8"/>
    <line x1="7" y1="46.2" x2="73" y2="46.2" stroke="#2a68c8"/>
    <line x1="7" y1="51.2" x2="73" y2="51.2" stroke="#d1392c"/>
  </g>
  <g font-size="4.2" font-weight="bold" font-family="Arial">
    <text x="3.6" y="5.7"  fill="#d1392c">+</text><text x="74" y="5.7"  fill="#d1392c">+</text>
    <text x="3.6" y="11"   fill="#2a68c8">&#x2212;</text><text x="74" y="11"   fill="#2a68c8">&#x2212;</text>
    <text x="3.6" y="47.7" fill="#2a68c8">&#x2212;</text><text x="74" y="47.7" fill="#2a68c8">&#x2212;</text>
    <text x="3.6" y="52.7" fill="#d1392c">+</text><text x="74" y="52.7" fill="#d1392c">+</text>
  </g>

  <!-- ตารางรูเสียบ: 20 คอลัมน์ x 12 แถว = 240 รู -->
  <g fill="#55534e">
    <rect x="6.8" y="6.6" width="1.95" height="1.95" rx=".35"/><rect x="10.15" y="6.6" width="1.95" height="1.95" rx=".35"/><rect x="13.5" y="6.6" width="1.95" height="1.95" rx=".35"/><rect x="16.85" y="6.6" width="1.95" height="1.95" rx=".35"/><rect x="20.2" y="6.6" width="1.95" height="1.95" rx=".35"/><rect x="23.55" y="6.6" width="1.95" height="1.95" rx=".35"/><rect x="26.9" y="6.6" width="1.95" height="1.95" rx=".35"/><rect x="30.25" y="6.6" width="1.95" height="1.95" rx=".35"/><rect x="33.6" y="6.6" width="1.95" height="1.95" rx=".35"/><rect x="36.95" y="6.6" width="1.95" height="1.95" rx=".35"/>
    <rect x="40.3" y="6.6" width="1.95" height="1.95" rx=".35"/><rect x="43.65" y="6.6" width="1.95" height="1.95" rx=".35"/><rect x="47" y="6.6" width="1.95" height="1.95" rx=".35"/><rect x="50.35" y="6.6" width="1.95" height="1.95" rx=".35"/><rect x="53.7" y="6.6" width="1.95" height="1.95" rx=".35"/><rect x="57.05" y="6.6" width="1.95" height="1.95" rx=".35"/><rect x="60.4" y="6.6" width="1.95" height="1.95" rx=".35"/><rect x="63.75" y="6.6" width="1.95" height="1.95" rx=".35"/><rect x="67.1" y="6.6" width="1.95" height="1.95" rx=".35"/><rect x="70.45" y="6.6" width="1.95" height="1.95" rx=".35"/>
    <rect x="6.8" y="12.2" width="1.95" height="1.95" rx=".35"/><rect x="10.15" y="12.2" width="1.95" height="1.95" rx=".35"/><rect x="13.5" y="12.2" width="1.95" height="1.95" rx=".35"/><rect x="16.85" y="12.2" width="1.95" height="1.95" rx=".35"/><rect x="20.2" y="12.2" width="1.95" height="1.95" rx=".35"/><rect x="23.55" y="12.2" width="1.95" height="1.95" rx=".35"/><rect x="26.9" y="12.2" width="1.95" height="1.95" rx=".35"/><rect x="30.25" y="12.2" width="1.95" height="1.95" rx=".35"/><rect x="33.6" y="12.2" width="1.95" height="1.95" rx=".35"/><rect x="36.95" y="12.2" width="1.95" height="1.95" rx=".35"/>
    <rect x="40.3" y="12.2" width="1.95" height="1.95" rx=".35"/><rect x="43.65" y="12.2" width="1.95" height="1.95" rx=".35"/><rect x="47" y="12.2" width="1.95" height="1.95" rx=".35"/><rect x="50.35" y="12.2" width="1.95" height="1.95" rx=".35"/><rect x="53.7" y="12.2" width="1.95" height="1.95" rx=".35"/><rect x="57.05" y="12.2" width="1.95" height="1.95" rx=".35"/><rect x="60.4" y="12.2" width="1.95" height="1.95" rx=".35"/><rect x="63.75" y="12.2" width="1.95" height="1.95" rx=".35"/><rect x="67.1" y="12.2" width="1.95" height="1.95" rx=".35"/><rect x="70.45" y="12.2" width="1.95" height="1.95" rx=".35"/>
    <rect x="6.8" y="15.2" width="1.95" height="1.95" rx=".35"/><rect x="10.15" y="15.2" width="1.95" height="1.95" rx=".35"/><rect x="13.5" y="15.2" width="1.95" height="1.95" rx=".35"/><rect x="16.85" y="15.2" width="1.95" height="1.95" rx=".35"/><rect x="20.2" y="15.2" width="1.95" height="1.95" rx=".35"/><rect x="23.55" y="15.2" width="1.95" height="1.95" rx=".35"/><rect x="26.9" y="15.2" width="1.95" height="1.95" rx=".35"/><rect x="30.25" y="15.2" width="1.95" height="1.95" rx=".35"/><rect x="33.6" y="15.2" width="1.95" height="1.95" rx=".35"/><rect x="36.95" y="15.2" width="1.95" height="1.95" rx=".35"/>
    <rect x="40.3" y="15.2" width="1.95" height="1.95" rx=".35"/><rect x="43.65" y="15.2" width="1.95" height="1.95" rx=".35"/><rect x="47" y="15.2" width="1.95" height="1.95" rx=".35"/><rect x="50.35" y="15.2" width="1.95" height="1.95" rx=".35"/><rect x="53.7" y="15.2" width="1.95" height="1.95" rx=".35"/><rect x="57.05" y="15.2" width="1.95" height="1.95" rx=".35"/><rect x="60.4" y="15.2" width="1.95" height="1.95" rx=".35"/><rect x="63.75" y="15.2" width="1.95" height="1.95" rx=".35"/><rect x="67.1" y="15.2" width="1.95" height="1.95" rx=".35"/><rect x="70.45" y="15.2" width="1.95" height="1.95" rx=".35"/>
    <rect x="6.8" y="18.2" width="1.95" height="1.95" rx=".35"/><rect x="10.15" y="18.2" width="1.95" height="1.95" rx=".35"/><rect x="13.5" y="18.2" width="1.95" height="1.95" rx=".35"/><rect x="16.85" y="18.2" width="1.95" height="1.95" rx=".35"/><rect x="20.2" y="18.2" width="1.95" height="1.95" rx=".35"/><rect x="23.55" y="18.2" width="1.95" height="1.95" rx=".35"/><rect x="26.9" y="18.2" width="1.95" height="1.95" rx=".35"/><rect x="30.25" y="18.2" width="1.95" height="1.95" rx=".35"/><rect x="33.6" y="18.2" width="1.95" height="1.95" rx=".35"/><rect x="36.95" y="18.2" width="1.95" height="1.95" rx=".35"/>
    <rect x="40.3" y="18.2" width="1.95" height="1.95" rx=".35"/><rect x="43.65" y="18.2" width="1.95" height="1.95" rx=".35"/><rect x="47" y="18.2" width="1.95" height="1.95" rx=".35"/><rect x="50.35" y="18.2" width="1.95" height="1.95" rx=".35"/><rect x="53.7" y="18.2" width="1.95" height="1.95" rx=".35"/><rect x="57.05" y="18.2" width="1.95" height="1.95" rx=".35"/><rect x="60.4" y="18.2" width="1.95" height="1.95" rx=".35"/><rect x="63.75" y="18.2" width="1.95" height="1.95" rx=".35"/><rect x="67.1" y="18.2" width="1.95" height="1.95" rx=".35"/><rect x="70.45" y="18.2" width="1.95" height="1.95" rx=".35"/>
    <rect x="6.8" y="21.2" width="1.95" height="1.95" rx=".35"/><rect x="10.15" y="21.2" width="1.95" height="1.95" rx=".35"/><rect x="13.5" y="21.2" width="1.95" height="1.95" rx=".35"/><rect x="16.85" y="21.2" width="1.95" height="1.95" rx=".35"/><rect x="20.2" y="21.2" width="1.95" height="1.95" rx=".35"/><rect x="23.55" y="21.2" width="1.95" height="1.95" rx=".35"/><rect x="26.9" y="21.2" width="1.95" height="1.95" rx=".35"/><rect x="30.25" y="21.2" width="1.95" height="1.95" rx=".35"/><rect x="33.6" y="21.2" width="1.95" height="1.95" rx=".35"/><rect x="36.95" y="21.2" width="1.95" height="1.95" rx=".35"/>
    <rect x="40.3" y="21.2" width="1.95" height="1.95" rx=".35"/><rect x="43.65" y="21.2" width="1.95" height="1.95" rx=".35"/><rect x="47" y="21.2" width="1.95" height="1.95" rx=".35"/><rect x="50.35" y="21.2" width="1.95" height="1.95" rx=".35"/><rect x="53.7" y="21.2" width="1.95" height="1.95" rx=".35"/><rect x="57.05" y="21.2" width="1.95" height="1.95" rx=".35"/><rect x="60.4" y="21.2" width="1.95" height="1.95" rx=".35"/><rect x="63.75" y="21.2" width="1.95" height="1.95" rx=".35"/><rect x="67.1" y="21.2" width="1.95" height="1.95" rx=".35"/><rect x="70.45" y="21.2" width="1.95" height="1.95" rx=".35"/>
    <rect x="6.8" y="24.2" width="1.95" height="1.95" rx=".35"/><rect x="10.15" y="24.2" width="1.95" height="1.95" rx=".35"/><rect x="13.5" y="24.2" width="1.95" height="1.95" rx=".35"/><rect x="16.85" y="24.2" width="1.95" height="1.95" rx=".35"/><rect x="20.2" y="24.2" width="1.95" height="1.95" rx=".35"/><rect x="23.55" y="24.2" width="1.95" height="1.95" rx=".35"/><rect x="26.9" y="24.2" width="1.95" height="1.95" rx=".35"/><rect x="30.25" y="24.2" width="1.95" height="1.95" rx=".35"/><rect x="33.6" y="24.2" width="1.95" height="1.95" rx=".35"/><rect x="36.95" y="24.2" width="1.95" height="1.95" rx=".35"/>
    <rect x="40.3" y="24.2" width="1.95" height="1.95" rx=".35"/><rect x="43.65" y="24.2" width="1.95" height="1.95" rx=".35"/><rect x="47" y="24.2" width="1.95" height="1.95" rx=".35"/><rect x="50.35" y="24.2" width="1.95" height="1.95" rx=".35"/><rect x="53.7" y="24.2" width="1.95" height="1.95" rx=".35"/><rect x="57.05" y="24.2" width="1.95" height="1.95" rx=".35"/><rect x="60.4" y="24.2" width="1.95" height="1.95" rx=".35"/><rect x="63.75" y="24.2" width="1.95" height="1.95" rx=".35"/><rect x="67.1" y="24.2" width="1.95" height="1.95" rx=".35"/><rect x="70.45" y="24.2" width="1.95" height="1.95" rx=".35"/>
    <rect x="6.8" y="31.6" width="1.95" height="1.95" rx=".35"/><rect x="10.15" y="31.6" width="1.95" height="1.95" rx=".35"/><rect x="13.5" y="31.6" width="1.95" height="1.95" rx=".35"/><rect x="16.85" y="31.6" width="1.95" height="1.95" rx=".35"/><rect x="20.2" y="31.6" width="1.95" height="1.95" rx=".35"/><rect x="23.55" y="31.6" width="1.95" height="1.95" rx=".35"/><rect x="26.9" y="31.6" width="1.95" height="1.95" rx=".35"/><rect x="30.25" y="31.6" width="1.95" height="1.95" rx=".35"/><rect x="33.6" y="31.6" width="1.95" height="1.95" rx=".35"/><rect x="36.95" y="31.6" width="1.95" height="1.95" rx=".35"/>
    <rect x="40.3" y="31.6" width="1.95" height="1.95" rx=".35"/><rect x="43.65" y="31.6" width="1.95" height="1.95" rx=".35"/><rect x="47" y="31.6" width="1.95" height="1.95" rx=".35"/><rect x="50.35" y="31.6" width="1.95" height="1.95" rx=".35"/><rect x="53.7" y="31.6" width="1.95" height="1.95" rx=".35"/><rect x="57.05" y="31.6" width="1.95" height="1.95" rx=".35"/><rect x="60.4" y="31.6" width="1.95" height="1.95" rx=".35"/><rect x="63.75" y="31.6" width="1.95" height="1.95" rx=".35"/><rect x="67.1" y="31.6" width="1.95" height="1.95" rx=".35"/><rect x="70.45" y="31.6" width="1.95" height="1.95" rx=".35"/>
    <rect x="6.8" y="34.6" width="1.95" height="1.95" rx=".35"/><rect x="10.15" y="34.6" width="1.95" height="1.95" rx=".35"/><rect x="13.5" y="34.6" width="1.95" height="1.95" rx=".35"/><rect x="16.85" y="34.6" width="1.95" height="1.95" rx=".35"/><rect x="20.2" y="34.6" width="1.95" height="1.95" rx=".35"/><rect x="23.55" y="34.6" width="1.95" height="1.95" rx=".35"/><rect x="26.9" y="34.6" width="1.95" height="1.95" rx=".35"/><rect x="30.25" y="34.6" width="1.95" height="1.95" rx=".35"/><rect x="33.6" y="34.6" width="1.95" height="1.95" rx=".35"/><rect x="36.95" y="34.6" width="1.95" height="1.95" rx=".35"/>
    <rect x="40.3" y="34.6" width="1.95" height="1.95" rx=".35"/><rect x="43.65" y="34.6" width="1.95" height="1.95" rx=".35"/><rect x="47" y="34.6" width="1.95" height="1.95" rx=".35"/><rect x="50.35" y="34.6" width="1.95" height="1.95" rx=".35"/><rect x="53.7" y="34.6" width="1.95" height="1.95" rx=".35"/><rect x="57.05" y="34.6" width="1.95" height="1.95" rx=".35"/><rect x="60.4" y="34.6" width="1.95" height="1.95" rx=".35"/><rect x="63.75" y="34.6" width="1.95" height="1.95" rx=".35"/><rect x="67.1" y="34.6" width="1.95" height="1.95" rx=".35"/><rect x="70.45" y="34.6" width="1.95" height="1.95" rx=".35"/>
    <rect x="6.8" y="37.6" width="1.95" height="1.95" rx=".35"/><rect x="10.15" y="37.6" width="1.95" height="1.95" rx=".35"/><rect x="13.5" y="37.6" width="1.95" height="1.95" rx=".35"/><rect x="16.85" y="37.6" width="1.95" height="1.95" rx=".35"/><rect x="20.2" y="37.6" width="1.95" height="1.95" rx=".35"/><rect x="23.55" y="37.6" width="1.95" height="1.95" rx=".35"/><rect x="26.9" y="37.6" width="1.95" height="1.95" rx=".35"/><rect x="30.25" y="37.6" width="1.95" height="1.95" rx=".35"/><rect x="33.6" y="37.6" width="1.95" height="1.95" rx=".35"/><rect x="36.95" y="37.6" width="1.95" height="1.95" rx=".35"/>
    <rect x="40.3" y="37.6" width="1.95" height="1.95" rx=".35"/><rect x="43.65" y="37.6" width="1.95" height="1.95" rx=".35"/><rect x="47" y="37.6" width="1.95" height="1.95" rx=".35"/><rect x="50.35" y="37.6" width="1.95" height="1.95" rx=".35"/><rect x="53.7" y="37.6" width="1.95" height="1.95" rx=".35"/><rect x="57.05" y="37.6" width="1.95" height="1.95" rx=".35"/><rect x="60.4" y="37.6" width="1.95" height="1.95" rx=".35"/><rect x="63.75" y="37.6" width="1.95" height="1.95" rx=".35"/><rect x="67.1" y="37.6" width="1.95" height="1.95" rx=".35"/><rect x="70.45" y="37.6" width="1.95" height="1.95" rx=".35"/>
    <rect x="6.8" y="40.6" width="1.95" height="1.95" rx=".35"/><rect x="10.15" y="40.6" width="1.95" height="1.95" rx=".35"/><rect x="13.5" y="40.6" width="1.95" height="1.95" rx=".35"/><rect x="16.85" y="40.6" width="1.95" height="1.95" rx=".35"/><rect x="20.2" y="40.6" width="1.95" height="1.95" rx=".35"/><rect x="23.55" y="40.6" width="1.95" height="1.95" rx=".35"/><rect x="26.9" y="40.6" width="1.95" height="1.95" rx=".35"/><rect x="30.25" y="40.6" width="1.95" height="1.95" rx=".35"/><rect x="33.6" y="40.6" width="1.95" height="1.95" rx=".35"/><rect x="36.95" y="40.6" width="1.95" height="1.95" rx=".35"/>
    <rect x="40.3" y="40.6" width="1.95" height="1.95" rx=".35"/><rect x="43.65" y="40.6" width="1.95" height="1.95" rx=".35"/><rect x="47" y="40.6" width="1.95" height="1.95" rx=".35"/><rect x="50.35" y="40.6" width="1.95" height="1.95" rx=".35"/><rect x="53.7" y="40.6" width="1.95" height="1.95" rx=".35"/><rect x="57.05" y="40.6" width="1.95" height="1.95" rx=".35"/><rect x="60.4" y="40.6" width="1.95" height="1.95" rx=".35"/><rect x="63.75" y="40.6" width="1.95" height="1.95" rx=".35"/><rect x="67.1" y="40.6" width="1.95" height="1.95" rx=".35"/><rect x="70.45" y="40.6" width="1.95" height="1.95" rx=".35"/>
    <rect x="6.8" y="43.6" width="1.95" height="1.95" rx=".35"/><rect x="10.15" y="43.6" width="1.95" height="1.95" rx=".35"/><rect x="13.5" y="43.6" width="1.95" height="1.95" rx=".35"/><rect x="16.85" y="43.6" width="1.95" height="1.95" rx=".35"/><rect x="20.2" y="43.6" width="1.95" height="1.95" rx=".35"/><rect x="23.55" y="43.6" width="1.95" height="1.95" rx=".35"/><rect x="26.9" y="43.6" width="1.95" height="1.95" rx=".35"/><rect x="30.25" y="43.6" width="1.95" height="1.95" rx=".35"/><rect x="33.6" y="43.6" width="1.95" height="1.95" rx=".35"/><rect x="36.95" y="43.6" width="1.95" height="1.95" rx=".35"/>
    <rect x="40.3" y="43.6" width="1.95" height="1.95" rx=".35"/><rect x="43.65" y="43.6" width="1.95" height="1.95" rx=".35"/><rect x="47" y="43.6" width="1.95" height="1.95" rx=".35"/><rect x="50.35" y="43.6" width="1.95" height="1.95" rx=".35"/><rect x="53.7" y="43.6" width="1.95" height="1.95" rx=".35"/><rect x="57.05" y="43.6" width="1.95" height="1.95" rx=".35"/><rect x="60.4" y="43.6" width="1.95" height="1.95" rx=".35"/><rect x="63.75" y="43.6" width="1.95" height="1.95" rx=".35"/><rect x="67.1" y="43.6" width="1.95" height="1.95" rx=".35"/><rect x="70.45" y="43.6" width="1.95" height="1.95" rx=".35"/>
    <rect x="6.8" y="48.6" width="1.95" height="1.95" rx=".35"/><rect x="10.15" y="48.6" width="1.95" height="1.95" rx=".35"/><rect x="13.5" y="48.6" width="1.95" height="1.95" rx=".35"/><rect x="16.85" y="48.6" width="1.95" height="1.95" rx=".35"/><rect x="20.2" y="48.6" width="1.95" height="1.95" rx=".35"/><rect x="23.55" y="48.6" width="1.95" height="1.95" rx=".35"/><rect x="26.9" y="48.6" width="1.95" height="1.95" rx=".35"/><rect x="30.25" y="48.6" width="1.95" height="1.95" rx=".35"/><rect x="33.6" y="48.6" width="1.95" height="1.95" rx=".35"/><rect x="36.95" y="48.6" width="1.95" height="1.95" rx=".35"/>
    <rect x="40.3" y="48.6" width="1.95" height="1.95" rx=".35"/><rect x="43.65" y="48.6" width="1.95" height="1.95" rx=".35"/><rect x="47" y="48.6" width="1.95" height="1.95" rx=".35"/><rect x="50.35" y="48.6" width="1.95" height="1.95" rx=".35"/><rect x="53.7" y="48.6" width="1.95" height="1.95" rx=".35"/><rect x="57.05" y="48.6" width="1.95" height="1.95" rx=".35"/><rect x="60.4" y="48.6" width="1.95" height="1.95" rx=".35"/><rect x="63.75" y="48.6" width="1.95" height="1.95" rx=".35"/><rect x="67.1" y="48.6" width="1.95" height="1.95" rx=".35"/><rect x="70.45" y="48.6" width="1.95" height="1.95" rx=".35"/>
  </g>
</symbol>

  <!-- หม้อแปลง -->
<symbol id="dev-transformer" viewBox="0 0 64 56">
  <!-- EI iron core -->
  <rect x="24" y="4" width="16" height="48" rx="2" fill="#444" stroke="#222" stroke-width="1.2"/>
  <!-- lamination lines -->
  <line x1="27" y1="4" x2="27" y2="52" stroke="#333" stroke-width=".8"/>
  <line x1="30" y1="4" x2="30" y2="52" stroke="#333" stroke-width=".8"/>
  <line x1="33" y1="4" x2="33" y2="52" stroke="#333" stroke-width=".8"/>
  <line x1="36" y1="4" x2="36" y2="52" stroke="#333" stroke-width=".8"/>
  <!-- core top/bottom plates -->
  <rect x="14" y="2"  width="36" height="5" rx="2" fill="#333" stroke="#222" stroke-width="1"/>
  <rect x="14" y="49" width="36" height="5" rx="2" fill="#333" stroke="#222" stroke-width="1"/>
  <!-- primary coil (gold, left) 4 turns -->
  <path d="M12,11 Q18,11 18,16 Q18,21 12,21" fill="none" stroke="#ffd700" stroke-width="2.2"/>
  <path d="M12,21 Q18,21 18,26 Q18,31 12,31" fill="none" stroke="#ffd700" stroke-width="2.2"/>
  <path d="M12,31 Q18,31 18,36 Q18,41 12,41" fill="none" stroke="#ffd700" stroke-width="2.2"/>
  <path d="M12,41 Q18,41 18,46 Q18,51 12,51" fill="none" stroke="#ffd700" stroke-width="2.2"/>
  <!-- primary leads -->
  <line x1="0"  y1="14" x2="12" y2="14" stroke="#ffd700" stroke-width="1.8"/>
  <line x1="0"  y1="48" x2="12" y2="48" stroke="#ffd700" stroke-width="1.8"/>
  <!-- primary label -->
  <text x="3" y="33" text-anchor="middle" fill="#ffd700" font-size="5" transform="rotate(-90,3,33)">PRIMARY</text>
  <!-- secondary coil (cyan, right) 8 turns -->
  <path d="M52,11 Q46,11 46,14 Q46,17 52,17" fill="none" stroke="#00d4ff" stroke-width="2.2"/>
  <path d="M52,17 Q46,17 46,20 Q46,23 52,23" fill="none" stroke="#00d4ff" stroke-width="2.2"/>
  <path d="M52,23 Q46,23 46,26 Q46,29 52,29" fill="none" stroke="#00d4ff" stroke-width="2.2"/>
  <path d="M52,29 Q46,29 46,32 Q46,35 52,35" fill="none" stroke="#00d4ff" stroke-width="2.2"/>
  <path d="M52,35 Q46,35 46,38 Q46,41 52,41" fill="none" stroke="#00d4ff" stroke-width="2.2"/>
  <path d="M52,41 Q46,41 46,44 Q46,47 52,47" fill="none" stroke="#00d4ff" stroke-width="2.2"/>
  <!-- secondary leads -->
  <line x1="52" y1="13" x2="64" y2="13" stroke="#00d4ff" stroke-width="1.8"/>
  <line x1="52" y1="45" x2="64" y2="45" stroke="#00d4ff" stroke-width="1.8"/>
  <!-- secondary label -->
  <text x="61" y="33" text-anchor="middle" fill="#00d4ff" font-size="5" transform="rotate(90,61,33)">SECONDARY</text>
  <!-- dot convention -->
  <circle cx="12" cy="11" r="2.5" fill="#ffd700"/>
  <circle cx="52" cy="11" r="2.5" fill="#00d4ff"/>
  <!-- ratio label -->
  <text x="32" y="57" text-anchor="middle" fill="#6e88a8" font-size="6">1:2  TRANSFORMER</text>
</symbol>

  <!-- มัลติมิเตอร์ -->
<symbol id="dev-multimeter" viewBox="0 0 52 72">
  <!-- body -->
  <rect x="2"  y="1"  width="48" height="68" rx="7" fill="#111" stroke="#333" stroke-width="1.8"/>
  <rect x="4"  y="3"  width="44" height="66" rx="6" fill="#1a1a1a"/>
  <!-- rubber grip strips -->
  <rect x="2"  y="20" width="3" height="30" rx="1.5" fill="#222" stroke="#333" stroke-width=".5"/>
  <rect x="47" y="20" width="3" height="30" rx="1.5" fill="#222" stroke="#333" stroke-width=".5"/>
  <!-- display LCD bezel -->
  <rect x="7"  y="5"  width="38" height="22" rx="4" fill="#003300" stroke="#1a4a1a" stroke-width="1.2"/>
  <!-- LCD background -->
  <rect x="8"  y="6"  width="36" height="20" rx="3" fill="#004400"/>
  <!-- LCD digits -->
  <text x="27" y="20" text-anchor="middle" fill="#00ff44" font-size="12"
        font-weight="bold" font-family="monospace">12.5</text>
  <!-- DC mode indicator -->
  <text x="10" y="11" fill="#00aa22" font-size="4.5">DC</text>
  <text x="10" y="15.5" fill="#00aa22" font-size="5.5" font-weight="bold">V</text>
  <!-- bargraph -->
  <rect x="10" y="21" width="32" height="3" rx="1" fill="#003300"/>
  <rect x="10" y="21" width="20" height="3" rx="1" fill="#00aa22"/>
  <!-- dial assembly -->
  <circle cx="26" cy="42" r="13" fill="#1a1a1a" stroke="#444" stroke-width="1.5"/>
  <circle cx="26" cy="42" r="10" fill="#222"/>
  <!-- dial sector markings -->
  <path d="M16,34 A13,13 0 0,1 36,34" fill="none" stroke="#c0392b" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M36,34 A13,13 0 0,1 39,42" fill="none" stroke="#ffd700" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M39,42 A13,13 0 0,1 36,50" fill="none" stroke="#00d4ff" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M16,50 A13,13 0 0,1 13,42" fill="none" stroke="#00ff88" stroke-width="2.5" stroke-linecap="round"/>
  <!-- dial tick marks -->
  <line x1="26" y1="29" x2="26" y2="32" stroke="#777" stroke-width="1"/>
  <line x1="35" y1="32" x2="33" y2="34" stroke="#777" stroke-width="1"/>
  <line x1="39" y1="42" x2="36" y2="42" stroke="#777" stroke-width="1"/>
  <line x1="17" y1="42" x2="20" y2="42" stroke="#777" stroke-width="1"/>
  <!-- mode labels -->
  <text x="26" y="31.5" text-anchor="middle" fill="#c0392b" font-size="3.5">V~</text>
  <text x="37" y="35"   text-anchor="middle" fill="#ffd700" font-size="3.5">V=</text>
  <text x="38.5" y="44" text-anchor="middle" fill="#00d4ff" font-size="3.5">A</text>
  <text x="13.5" y="44" text-anchor="middle" fill="#00ff88" font-size="3.5">Ω</text>
  <!-- center knob -->
  <circle cx="26" cy="42" r="5.5" fill="#1a1a1a" stroke="#555" stroke-width="1.2"/>
  <circle cx="26" cy="42" r="3"   fill="#2a2a2a"/>
  <!-- pointer line -->
  <line x1="26" y1="42" x2="26" y2="33" stroke="#ffd700" stroke-width="2" stroke-linecap="round"/>
  <circle cx="26" cy="42" r="1.5" fill="#888"/>
  <!-- hold & range buttons -->
  <rect x="8"  y="56" width="10" height="5" rx="1.5" fill="#222" stroke="#444" stroke-width=".8"/>
  <rect x="22" y="56" width="10" height="5" rx="1.5" fill="#c0392b" stroke="#900" stroke-width=".8"/>
  <rect x="36" y="56" width="10" height="5" rx="1.5" fill="#222" stroke="#444" stroke-width=".8"/>
  <text x="13" y="59.5" text-anchor="middle" fill="#777" font-size="3.5">HOLD</text>
  <text x="27" y="59.5" text-anchor="middle" fill="#fff" font-size="3.5">RANGE</text>
  <text x="41" y="59.5" text-anchor="middle" fill="#777" font-size="3.5">REL</text>
  <!-- probe input sockets -->
  <circle cx="15" cy="66" r="3.5" fill="#c0392b" stroke="#900" stroke-width="1"/>
  <circle cx="15" cy="66" r="1.5" fill="#900"/>
  <circle cx="26" cy="66" r="3.5" fill="#111" stroke="#555" stroke-width="1"/>
  <circle cx="26" cy="66" r="1.5" fill="#333"/>
  <circle cx="37" cy="66" r="3.5" fill="#2980b9" stroke="#0044aa" stroke-width="1"/>
  <circle cx="37" cy="66" r="1.5" fill="#0044aa"/>
  <text x="15" y="71" text-anchor="middle" fill="#c0392b" font-size="3.5">VΩ</text>
  <text x="26" y="71" text-anchor="middle" fill="#777"    font-size="3.5">COM</text>
  <text x="37" y="71" text-anchor="middle" fill="#2980b9" font-size="3.5">mA</text>
</symbol>

  <!-- สายไฟ -->
<symbol id="dev-wire" viewBox="0 0 64 40">
  <!-- outer insulation (red) -->
  <path d="M6,20 C18,6 46,34 58,20" fill="none" stroke="#aa1111" stroke-width="9" stroke-linecap="round"/>
  <!-- middle insulation -->
  <path d="M6,20 C18,6 46,34 58,20" fill="none" stroke="#cc2222" stroke-width="6" stroke-linecap="round"/>
  <!-- inner conductor (copper) -->
  <path d="M6,20 C18,6 46,34 58,20" fill="none" stroke="#e07030" stroke-width="2.5" stroke-linecap="round"/>
  <!-- highlight -->
  <path d="M8,18 C20,5 44,31 56,18" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1.5" stroke-linecap="round"/>
  <!-- left banana plug -->
  <rect x="0" y="15" width="8" height="10" rx="2" fill="#c8392b" stroke="#900" stroke-width="1"/>
  <rect x="1" y="16" width="3" height="8"  rx="1" fill="rgba(255,255,255,0.2)"/>
  <circle cx="4" cy="20" r="2" fill="#900"/>
  <!-- right banana plug -->
  <rect x="56" y="15" width="8" height="10" rx="2" fill="#2980b9" stroke="#0044aa" stroke-width="1"/>
  <rect x="60" y="16" width="3" height="8"  rx="1" fill="rgba(255,255,255,0.2)"/>
  <circle cx="60" cy="20" r="2" fill="#0044aa"/>
  <text x="32" y="38" text-anchor="middle" fill="#6e88a8" font-size="6.5">JUMPER WIRE</text>
</symbol>

</svg>
`;

/* ฉีด symbol library เข้า DOM ทันทีที่โหลด (script วางไว้ท้าย <body>) */
document.body.insertAdjacentHTML('beforeend', DEVICE_SYMBOLS_SVG);