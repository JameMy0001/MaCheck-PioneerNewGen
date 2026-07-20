// YaCheck — ระบบเครือข่ายความปลอดภัยยาและการจัดการข้อมูลด้วย AI
// เขียนด้วยภาษาจาวาสคริปต์ดิบ (Vanilla JS) รันแบบออฟไลน์

const Network = {
  svg: null,
  panGroup: null,
  width: 600,
  height: 420,
  nodes: [],
  links: [],
  
  // สถานะมุมมอง (Pan & Zoom)
  zoom: 1.0,
  panX: 0,
  panY: 0,
  isPanning: false,
  panStartX: 0,
  panStartY: 0,

  // สถานะการลากโหนด (Dragging)
  draggedNode: null,

  // คีย์เวิร์ดการค้นหาและตัวครอง
  searchQuery: '',
  activeFilter: 'all', // 'all' | 'cabinet' | 'conflicts'
  
  // สถานะแอนิเมชัน
  running: false,
  animationId: null,

  // ตัวแปรคงที่สำหรับ Force-Directed Math (ฟอร์ซเลย์เอาต์สปริง)
  kRepulsion: 35000,   // แรงผลักระหว่างโหนด
  kAttraction: 0.05,   // แรงดึงดูดของเส้นสัมพันธ์
  gravity: 0.04,       // แรงดึงเข้าจุดศูนย์กลาง
  damping: 0.80,       // ค่าหน่วงความเร็ว (Friction)
  idealLength: 130,    // ความยาวเป้าหมายของเส้นเชื่อม

  // ฟังก์ชันเริ่มต้นหน้าเพจ
  render() {
    const container = document.querySelector('#page-network .page-content');
    if (!container) return;

    // เคลียร์แอนิเมชันเดิมถ้าค้างอยู่
    this.stopSimulation();

    // 1. ดึงชุดข้อมูลเพื่อสร้างโหนดและลิงก์
    this.buildGraphData();

    // 2. เรนเดอร์ HTML พื้นฐานของหน้านี้
    container.innerHTML = `
      <div class="network-container" style="display: flex; flex-direction: column; gap: var(--space-md); padding: 4px;">
        <!-- หัวข้อหน้า -->
        <div class="network-header" style="margin-bottom: var(--space-xs);">
          <h2 class="page-title" style="display: flex; align-items: center; gap: var(--space-sm); margin-bottom: 6px; font-family: 'Prompt', sans-serif;">
            <svg class="svg-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--color-primary); width: 26px; height: 26px;"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            เครือข่ายความปลอดภัยยา
          </h2>
          <p class="text-secondary" style="font-size: 0.95rem; line-height: 1.4; color: var(--color-text-secondary);">
            แผนภาพแสดงความเชื่อมโยงปฏิกิริยายาตีกัน ประวัติแพ้ยา ประวัติการสแกนเช็คยา และแผงส่งออกข้อมูลฝึกสอน AI
          </p>
        </div>

        <!-- พื้นที่แสดงผลแบบบนล่าง (Stack Layout) -->
        <div class="network-layout-grid">
          
          <!-- ฝั่งซ้าย: SVG แผนภาพเครือข่ายยา -->
          <div class="network-canvas-card card" style="background: var(--color-surface); border-radius: var(--radius-lg); padding: var(--space-md); border: 1.5px solid var(--color-border); box-shadow: var(--shadow-sm); display: flex; flex-direction: column; gap: var(--space-sm);">
            
            <!-- แถบควบคุมบน -->
            <div class="canvas-control-bar" style="display: flex; gap: var(--space-sm); align-items: center; flex-wrap: wrap;">
              <div class="search-input-wrapper" style="position: relative; flex: 1; min-width: 180px;">
                <input type="text" id="net-search-input" class="form-input" placeholder="ค้นหาชื่อยา เช่น Aspirin, เบาหวาน..." style="width: 100%; padding-right: 36px; height: 44px;" oninput="Network.handleSearch(this.value)">
                <svg class="svg-icon" style="position: absolute; right: 12px; top: 12px; width: 18px; height: 18px; color: var(--color-text-muted);" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </div>
              <div class="canvas-zoom-buttons" style="display: flex; gap: 4px;">
                <button class="btn btn-ghost" style="height: 44px; width: 44px; padding: 0; font-size: 1.3rem; display: flex; justify-content: center; align-items: center;" onclick="Network.adjustZoom(1.25)">+</button>
                <button class="btn btn-ghost" style="height: 44px; width: 44px; padding: 0; font-size: 1.3rem; display: flex; justify-content: center; align-items: center;" onclick="Network.adjustZoom(0.8)">-</button>
                <button class="btn btn-ghost" style="height: 44px; width: 44px; padding: 0; font-size: 1.1rem; display: flex; justify-content: center; align-items: center;" onclick="Network.resetView()">⟲</button>
              </div>
            </div>

            <!-- ฟิลเตอร์ชิป (Filter Chips) -->
            <div class="filter-chips-container" style="display: flex; gap: var(--space-sm); flex-wrap: wrap; margin-bottom: 4px;">
              <button class="chip ${this.activeFilter === 'all' ? 'active' : ''}" onclick="Network.setFilter('all')" style="padding: 6px 14px; border-radius: var(--radius-full); font-size: 0.85rem; cursor: pointer; border: 1.5px solid var(--color-border); background: var(--color-bg); transition: all var(--transition-fast);">ยาทั้งหมด (${this.nodes.length})</button>
              <button class="chip ${this.activeFilter === 'cabinet' ? 'active' : ''}" onclick="Network.setFilter('cabinet')" style="padding: 6px 14px; border-radius: var(--radius-full); font-size: 0.85rem; cursor: pointer; border: 1.5px solid var(--color-border); background: var(--color-bg); transition: all var(--transition-fast);">ยาในตู้และประวัติ</button>
              <button class="chip ${this.activeFilter === 'conflicts' ? 'active' : ''}" onclick="Network.setFilter('conflicts')" style="padding: 6px 14px; border-radius: var(--radius-full); font-size: 0.85rem; cursor: pointer; border: 1.5px solid var(--color-border); background: var(--color-bg); transition: all var(--transition-fast);">เฉพาะยาที่มีอันตราย</button>
            </div>

            <!-- พื้นที่ SVG Canvas วาดกราฟ (สี่เหลี่ยมจัตุรัสสำหรับหน้าจอโมบาย) -->
            <div class="svg-container-wrapper" id="svg-container-wrapper" style="position: relative; border-radius: var(--radius-md); border: 1.5px solid var(--color-border); background: #FAF9F6; aspect-ratio: 1 / 1; max-height: 380px; overflow: hidden; width: 100%;">
              <svg id="network-svg-canvas" width="100%" height="100%" style="cursor: grab; display: block; user-select: none;">
                <defs>
                  <!-- ฟิลเตอร์ไฟกะพริบแจ้งเตือน / เงาสวยงาม -->
                  <filter id="net-glow-danger" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="5" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <filter id="net-glow-warning" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <!-- กลุ่มแพนและซูม -->
                <g id="svg-pan-group">
                  <g id="svg-links-group"></g>
                  <g id="svg-nodes-group"></g>
                </g>
              </svg>

              <!-- กล่องคำอธิบายลอยตัว (Floating Tip) -->
              <div style="position: absolute; bottom: 8px; left: 10px; font-size: 0.72rem; color: var(--color-text-muted); background: rgba(255,255,255,0.85); padding: 4px 8px; border-radius: 6px; border: 1px solid var(--color-border); pointer-events: none;">
                💡 ลากแผนภาพเพื่อขยับ | เลื่อนเมาส์เพื่อซูมเข้า/ออก | ลากโหนดยาได้อิสระ
              </div>

              <!-- รายละเอียดโหนดยาลอยตัวเมื่อ Hover (Floating Detail Tooltip) -->
              <div id="net-node-tooltip" class="card" style="position: absolute; top: 12px; right: 12px; width: 240px; padding: 12px; font-size: 0.85rem; background: rgba(255,255,255,0.96); border: 1.5px solid var(--color-primary); box-shadow: var(--shadow-md); border-radius: var(--radius-md); display: none; z-index: 10; pointer-events: none; animation: fadeIn var(--transition-fast);">
                <!-- รายละเอียดด้านในจะเรนเดอร์ผ่าน JS -->
              </div>
            </div>

            <!-- คำอธิบายสัญลักษณ์ (Legend Panel) -->
            <div class="legend-panel" style="padding: 10px; background: var(--color-primary-light); border-radius: var(--radius-md); font-size: 0.8rem; line-height: 1.45; color: var(--color-text-secondary); border: 1px solid var(--color-border);">
              <div style="font-weight: 700; margin-bottom: 6px; color: var(--color-primary); display: flex; justify-content: space-between; align-items: center;">
                <span>คำอธิบายสัญลักษณ์</span>
                <span id="network-stats-label" style="font-size: 0.75rem; font-weight: 500; opacity: 0.95;"></span>
              </div>
              <div class="legend-items-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px;">
                <div style="display: flex; align-items: center; gap: 6px;"><span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: #16A34A; box-shadow: 0 0 6px rgba(22,163,74,0.4);"></span> ยาในตู้ยา (Active)</div>
                <div style="display: flex; align-items: center; gap: 6px;"><span class="allergy-pulse-legend" style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: #DC2626; box-shadow: 0 0 8px rgba(220,38,38,0.8);"></span> ประวัติแพ้ยา (กะพริบ)</div>
                <div style="display: flex; align-items: center; gap: 6px;"><span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: #2563EB;"></span> ยาเคยสแกนตรวจสอบ</div>
                <div style="display: flex; align-items: center; gap: 6px;"><span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: #94A3B8;"></span> ยาตัวอื่นในระบบคลัง</div>
                <div style="display: flex; align-items: center; gap: 6px;"><span style="display: inline-block; width: 18px; height: 3px; background: #DC2626; border-radius: 2px;"></span> ยาตีกันรุนแรง (Severe)</div>
                <div style="display: flex; align-items: center; gap: 6px;"><span style="display: inline-block; width: 18px; height: 2px; background: #D97706; border-radius: 2px;"></span> ยาตีกันปานกลาง (Moderate)</div>
                <div style="display: flex; align-items: center; gap: 6px;"><span style="display: inline-block; width: 18px; height: 2px; background: #85A3B2; border-radius: 2px;"></span> ยาตีกันเล็กน้อย (Minor)</div>
                <div style="display: flex; align-items: center; gap: 6px;"><span style="display: inline-block; width: 18px; height: 2px; border-top: 2px dashed #94A3B8;"></span> ประวัติการเช็คร่วมกัน</div>
              </div>
            </div>
          </div>

          <!-- ฝั่งขวา: AI Developer Console & Custom Settings -->
          <div class="network-right-panel" style="display: flex; flex-direction: column; gap: var(--space-md);">
            <!-- หัวข้อเมนูขวา (Tabs) -->
            <div class="ai-tabs-menu" style="display: flex; border-bottom: 2px solid var(--color-border); gap: var(--space-sm); margin-bottom: 2px;">
              <button class="ai-tab-btn active" id="btn-tab-rules" onclick="Network.switchRightTab('rules')" style="flex: 1; border: none; background: none; padding: 10px 4px; font-weight: 600; font-size: 0.9rem; color: var(--color-primary); border-bottom: 3px solid var(--color-primary); cursor: pointer; transition: all var(--transition-fast);">เพิ่มข้อมูล/กฎ</button>
              <button class="ai-tab-btn" id="btn-tab-ai-extract" onclick="Network.switchRightTab('ai-extract')" style="flex: 1; border: none; background: none; padding: 10px 4px; font-weight: 600; font-size: 0.9rem; color: var(--color-text-secondary); cursor: pointer; transition: all var(--transition-fast);">ถอดฉลากด้วย AI</button>
              <button class="ai-tab-btn" id="btn-tab-export" onclick="Network.switchRightTab('export')" style="flex: 1; border: none; background: none; padding: 10px 4px; font-weight: 600; font-size: 0.9rem; color: var(--color-text-secondary); cursor: pointer; transition: all var(--transition-fast);">ดึงข้อมูลเทรน AI</button>
            </div>

            <!-- หน้าแท็บที่ 1: เพิ่มคู่ยาตีกัน / ลงทะเบียนยาใหม่ -->
            <div class="ai-tab-content-box" id="panel-tab-rules">
              
              <!-- กล่องที่ 1.1: เพิ่มยาตัวใหม่นอกระบบ -->
              <div class="card" style="background: var(--color-surface); padding: 16px; border: 1.5px solid var(--color-border); border-radius: var(--radius-lg); margin-bottom: var(--space-md); box-shadow: var(--shadow-sm);">
                <h3 style="font-size: 1.05rem; font-weight: 700; color: var(--color-primary); margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                  <span style="background: var(--color-primary-light); padding: 5px; border-radius: 6px; display: inline-flex;"><svg class="svg-icon" style="width:16px; height:16px; color: var(--color-primary);" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg></span>
                  เพิ่มยาตัวใหม่เข้าระบบ
                </h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
                  <div class="form-group" style="margin: 0;">
                    <label class="form-label" style="font-size: 0.78rem; margin-bottom: 4px;">ชื่อยาภาษาอังกฤษ</label>
                    <input type="text" id="custom-drug-en" class="form-input" placeholder="เช่น Ginkgo Biloba" style="height: 38px; font-size: 0.9rem;">
                  </div>
                  <div class="form-group" style="margin: 0;">
                    <label class="form-label" style="font-size: 0.78rem; margin-bottom: 4px;">ชื่อยาภาษาไทย</label>
                    <input type="text" id="custom-drug-th" class="form-input" placeholder="เช่น สารสกัดใบแปะก๊วย" style="height: 38px; font-size: 0.9rem;">
                  </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr; gap: 8px; margin-bottom: 10px;">
                  <div class="form-group" style="margin: 0;">
                    <label class="form-label" style="font-size: 0.78rem; margin-bottom: 4px;">หมวดหมู่ยา</label>
                    <select id="custom-drug-cat" class="form-input" style="height: 38px; font-size: 0.9rem;">
                      <option value="ยาสมุนไพร/อาหารเสริม" selected>ยาสมุนไพร / อาหารเสริม</option>
                      <option value="ยาเบาหวาน">ยาเบาหวาน</option>
                      <option value="ยาความดัน">ยาความดัน</option>
                      <option value="ยาลดไขมัน">ยาลดไขมัน</option>
                      <option value="ยาแก้ปวด/ต้านอักเสบ">ยาแก้ปวด / ต้านอักเสบ</option>
                      <option value="ยาหัวใจ">ยาหัวใจ</option>
                      <option value="ยาอื่นๆ">ยาอื่นๆ</option>
                    </select>
                  </div>
                  <div class="form-group" style="margin: 0;">
                    <label class="form-label" style="font-size: 0.78rem; margin-bottom: 4px;">คำอธิบายสรรพคุณ</label>
                    <input type="text" id="custom-drug-desc" class="form-input" placeholder="เช่น บำรุงระบบประสาทและสมอง" style="height: 38px; font-size: 0.9rem;">
                  </div>
                </div>
                <button class="btn btn-primary btn-sm btn-full" style="height: 40px; font-size: 0.9rem;" onclick="Network.registerCustomDrug()">+ ลงทะเบียนยาใหม่เข้าระบบคลัง</button>
              </div>

              <!-- กล่องที่ 1.2: เพิ่มกฎ DDI ใน LocalStorage -->
              <div class="card" style="background: var(--color-surface); padding: 16px; border: 1.5px solid var(--color-border); border-radius: var(--radius-lg); box-shadow: var(--shadow-sm);">
                <h3 style="font-size: 1.05rem; font-weight: 700; color: var(--color-primary); margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                  <span style="background: var(--color-primary-light); padding: 5px; border-radius: 6px; display: inline-flex;"><svg class="svg-icon" style="width:16px; height:16px; color: var(--color-primary);" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></span>
                  เพิ่มคู่เตือนภัยยาตีกัน (DDI Rule)
                </h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
                  <div class="form-group" style="margin: 0;">
                    <label class="form-label" style="font-size: 0.78rem; margin-bottom: 4px;">เลือกยาตัวที่ 1</label>
                    <select id="custom-ddi-1" class="form-input" style="height: 38px; font-size: 0.9rem;"></select>
                  </div>
                  <div class="form-group" style="margin: 0;">
                    <label class="form-label" style="font-size: 0.78rem; margin-bottom: 4px;">เลือกยาตัวที่ 2</label>
                    <select id="custom-ddi-2" class="form-input" style="height: 38px; font-size: 0.9rem;"></select>
                  </div>
                </div>
                <div class="form-group" style="margin-bottom: 8px;">
                  <label class="form-label" style="font-size: 0.78rem; margin-bottom: 4px;">ความรุนแรง</label>
                  <select id="custom-ddi-severity" class="form-input" style="height: 38px; font-size: 0.9rem;">
                    <option value="severe">Severe (รุนแรงมาก - เส้นสีแดง - ห้ามทานร่วมกัน)</option>
                    <option value="moderate">Moderate (ต้องสอบถามแพทย์หรือเภสัชกรก่อน)</option>
                  </select>
                </div>
                <div class="form-group" style="margin-bottom: 12px; padding: 10px; border-radius: 8px; background: var(--color-primary-light);">
                  ระบบจะสร้างข้อความคำสั่งความปลอดภัยตามระดับที่เลือกโดยอัตโนมัติ และไม่อนุญาตให้บันทึกกลไก อาการ ผลกระทบ วิธีเว้นเวลา หรือยาทดแทน
                </div>
                <button class="btn btn-primary btn-full" style="height: 44px; font-size: 0.95rem;" onclick="Network.saveCustomDDI()">+ เพิ่มกฎความปลอดภัยและปรับปรุงระบบ</button>
              </div>

            </div>

            <!-- หน้าแท็บที่ 2: สแกนถอดข้อความภาษาคลินิกจำลองด้วย AI -->
            <div class="ai-tab-content-box" id="panel-tab-ai-extract" style="display: none;">
              <div class="card" style="background: var(--color-surface); padding: 16px; border: 1.5px solid var(--color-border); border-radius: var(--radius-lg); box-shadow: var(--shadow-sm);">
                <h3 style="font-size: 1.05rem; font-weight: 700; color: var(--color-primary); margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                  <span style="background: var(--color-primary-light); padding: 5px; border-radius: 6px; display: inline-flex;"><svg class="svg-icon" style="width:16px; height:16px; color: var(--color-primary);" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg></span>
                  AI Clinical text extractor (จำลองสแกนฉลากยา)
                </h3>
                <p class="text-secondary" style="font-size: 0.82rem; line-height: 1.4; margin-bottom: 12px;">
                  ระบบจะอ่านเฉพาะชื่อคู่ยาและระดับคำสั่ง โดยไม่สร้างหรือแสดงรายละเอียดผลกระทบ
                </p>
                
                <div class="form-group" style="margin-bottom: 12px;">
                  <label class="form-label" style="font-size: 0.78rem; margin-bottom: 4px;">กล่องป้อนข้อความกำกับยา</label>
                  <textarea id="ai-extract-textarea" class="form-input" style="height: 110px; font-size: 0.85rem; line-height: 1.45; padding: 10px;" placeholder="ตัวอย่างข้อความ:
ระบุชื่อยาสองรายการและคำว่า ห้ามใช้ร่วมกัน หรือ ต้องสอบถามแพทย์ก่อน"></textarea>
                </div>

                <button class="btn btn-primary btn-full" style="height: 44px; font-size: 0.95rem; display: flex; align-items: center; justify-content: center; gap: 8px;" onclick="Network.runAIExtraction()">
                  🤖 วิเคราะห์สกัดข้อมูลความปลอดภัย
                </button>

                <!-- แสดงผลการสกัดของ AI -->
                <div id="ai-extract-result-box" class="alert-card alert-info" style="margin-top: 14px; padding: 12px; border-radius: var(--radius-md); font-size: 0.85rem; line-height: 1.4; display: none;">
                  <!-- ยัดผลด้วย JS -->
                </div>
              </div>
            </div>

            <!-- หน้าแท็บที่ 3: ส่งออกประวัติไปเทรน AI -->
            <div class="ai-tab-content-box" id="panel-tab-export" style="display: none;">
              <div class="card" style="background: var(--color-surface); padding: 16px; border: 1.5px solid var(--color-border); border-radius: var(--radius-lg); box-shadow: var(--shadow-sm);">
                <h3 style="font-size: 1.05rem; font-weight: 700; color: var(--color-primary); margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                  <span style="background: var(--color-primary-light); padding: 5px; border-radius: 6px; display: inline-flex;"><svg class="svg-icon" style="width:16px; height:16px; color: var(--color-primary);" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg></span>
                  ฐานข้อมูลประวัติและปฏิกิริยายาสำหรับ AI
                </h3>
                <p class="text-secondary" style="font-size: 0.82rem; line-height: 1.4; margin-bottom: 12px;">
                  ส่งออกชุดข้อมูลในตู้ยา ประวัติสแกน ประวัติแพ้ยา รวมถึงกฎยาตีกันทั้งหมดในรูปแบบโครงสร้าง JSON-L เพื่อนำไปทำ Fine-tuning หรือสั่ง RAG บนโมเดลภาษาเพื่อให้ตอบคำถามทางการแพทย์เฉพาะเจาะจง
                </p>

                <!-- โค้ดคอนโซลเรืองแสงสีดำ -->
                <div style="background: #0F172A; color: #38BDF8; font-family: 'Courier New', Courier, monospace; font-size: 0.72rem; padding: 12px; border-radius: var(--radius-sm); border: 1.5px solid #1E293B; overflow: auto; max-height: 160px; margin-bottom: 12px;">
                  <pre id="net-export-code" style="margin: 0; white-space: pre-wrap; word-break: break-all; text-align: left;"></pre>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 14px;">
                  <button class="btn btn-ghost" style="height: 40px; font-size: 0.85rem;" onclick="Network.copyDataset()">📋 คัดลอกข้อความ</button>
                  <button class="btn btn-primary" style="height: 40px; font-size: 0.85rem;" onclick="Network.downloadDataset()">💾 ดาวน์โหลดไฟล์</button>
                </div>

                <div class="alert-card alert-info" style="font-size: 0.8rem; padding: 10px; border-radius: var(--radius-md); background: var(--color-primary-light); border-color: rgba(43,62,80,0.1); color: var(--color-primary); line-height: 1.4;">
                  <strong>💡 ตัวอย่าง Prompt สำหรับ AI Training:</strong><br>
                  <div style="font-style: italic; margin-top: 4px; border-left: 2px solid var(--color-primary); padding-left: 6px; font-size: 0.75rem;">
                    "วิเคราะห์ชุดข้อมูล JSON ของคนไข้รายนี้ ประเมินว่าหากผู้ดูแลต้องการซื้อยาไอบูโพรเฟน (Ibuprofen) มาเสริมเพื่อทุเลาอาการปวดเข่า จะเสี่ยงไปตีกับยาเดิมตัวไหนที่เขาทานอยู่เป็นประจำหรือไม่ อ้างอิงประวัติการรักษาและคำแนะนำความปลอดภัยเป็นสำคัญ"
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    `;

    // 3. ผูกคำสั่งควบคุม Pan / Zoom และ drag บน SVG
    this.initSVG();

    // 4. โหลดรายชื่อยาเข้าสู่ดรอปดาวน์ฟอร์ม DDI
    this.populateDrugDropdowns();

    // 5. แสดงผลข้อความ JSON ในแผงส่งออก
    this.updateExportCode();

    // 6. อัปเดตตัวเลขสถิติกราฟ
    this.updateStats();

    // 7. สั่งให้กราฟเริ่มต้นฟอร์ซแอนิเมชันขยับสปริง
    this.running = true;
    this.tickLoop();
  },

  // ดึงประวัติคนไข้และคลังยามาขึ้นรูป Nodes / Links
  buildGraphData() {
    const state = App.state;
    this.nodes = [];
    this.links = [];

    // โหลดคลังยาปกติจากระบบและคลังยาส่วนตัว
    const systemMeds = MedicineDB.medicines;
    
    // เก็บคีย์เวิร์ดของยาที่มีส่วนร่วมในประวัติผู้ป่วย
    const cabinetMeds = state.myMedicines || [];
    const allergyLog = state.allergyLog || [];
    const scanHistory = state.scanHistory || [];

    // ดึงไอดีของยาที่มีการเคลื่อนไหว (ในตู้/เคยสแกน/แพ้ยา)
    const activeMedIds = new Set();
    cabinetMeds.forEach(m => activeMedIds.add(m.medicineId));
    allergyLog.forEach(a => {
      if (a.medicineId) activeMedIds.add(a.medicineId);
    });
    scanHistory.forEach(s => {
      if (s.medicineId) activeMedIds.add(s.medicineId);
    });

    // คัดกรองยาเข้าระบบโหนดตามตัวคัดกรอง (Filters)
    systemMeds.forEach((m, idx) => {
      const isCabinet = cabinetMeds.some(x => x.medicineId === m.id);
      const isAllergy = allergyLog.some(x => x.medicineId === m.id || x.medicineName.toLowerCase() === m.nameEn.toLowerCase());
      const isScanned = scanHistory.some(x => x.medicineId === m.id);
      
      let shouldInclude = true;

      // 1. ฟิลเตอร์ "เฉพาะยาในตู้ยาและประวัติ"
      if (this.activeFilter === 'cabinet') {
        shouldInclude = isCabinet || isAllergy || isScanned;
      }
      // 2. ฟิลเตอร์ "เฉพาะยาที่มีปัญหาอันตราย"
      else if (this.activeFilter === 'conflicts') {
        // เช็คว่ายาตัวนี้มีประวัติแพ้ หรือมีประวัติปฏิกิริยายาตีกันที่มีความรุนแรง
        const hasDDI = MedicineDB.interactions.some(i => 
          (i.drug1 === m.id || i.drug2 === m.id) &&
          (i.severity === 'severe' || i.severity === 'moderate')
        );
        shouldInclude = isAllergy || hasDDI;
      }

      // หากผ่านด่านตรวจสอบ หรือตรงกับคำค้นหา
      if (shouldInclude) {
        // ตำแหน่งเริ่มต้นเป็นวงกลมกระจายรอบจอ
        const theta = (idx / systemMeds.length) * 2.0 * Math.PI;
        const radius = 170;
        const initialX = this.width / 2 + radius * Math.cos(theta);
        const initialY = this.height / 2 + radius * Math.sin(theta);

        this.nodes.push({
          id: m.id,
          nameEn: m.nameEn,
          nameTh: m.nameTh,
          category: m.category,
          description: m.description,
          isCabinet: isCabinet,
          isAllergy: isAllergy,
          isScanned: isScanned,
          x: initialX,
          y: initialY,
          vx: 0,
          vy: 0,
          original: m
        });
      }
    });

    // สร้างเส้นเชื่อมโยง (Links)
    // 1. เส้นเชื่อมโยงยาตีกัน (DDI Interactions)
    MedicineDB.interactions.forEach(inter => {
      const hasD1 = this.nodes.some(n => n.id === inter.drug1);
      const hasD2 = this.nodes.some(n => n.id === inter.drug2);

      if (hasD1 && hasD2) {
        this.links.push({
          id: `${inter.drug1}_${inter.drug2}`,
          source: inter.drug1,
          target: inter.drug2,
          type: 'ddi',
          severity: inter.severity,
          titleTh: inter.titleTh,
          descriptionTh: inter.descriptionTh,
          adviceTh: inter.adviceTh
        });
      }
    });

    // 2. เส้นเชื่อมประวัติการสแกนเช็คพร้อมกัน (Scan History relations)
    if (scanHistory.length > 1) {
      for (let i = 0; i < scanHistory.length - 1; i++) {
        const s1 = scanHistory[i];
        const s2 = scanHistory[i+1];
        if (s1.medicineId && s2.medicineId && s1.medicineId !== s2.medicineId) {
          const hasD1 = this.nodes.some(n => n.id === s1.medicineId);
          const hasD2 = this.nodes.some(n => n.id === s2.medicineId);
          const linkId = `history_${s1.medicineId}_${s2.medicineId}`;
          const reverseLinkId = `history_${s2.medicineId}_${s1.medicineId}`;

          if (hasD1 && hasD2 && !this.links.some(l => l.id === linkId || l.id === reverseLinkId)) {
            this.links.push({
              id: linkId,
              source: s1.medicineId,
              target: s2.medicineId,
              type: 'history'
            });
          }
        }
      }
    }
  },

  // ผูกการทำงาน Drag-and-drop และ Pan-and-zoom
  initSVG() {
    this.svg = document.getElementById('network-svg-canvas');
    this.panGroup = document.getElementById('svg-pan-group');
    if (!this.svg) return;

    // เคลียร์ตำแหน่งภาพ (Reset Pan / Zoom)
    this.updateViewportTransform();

    // 1. ผูกความสามารถ Pan (ลากพื้นหลังเพื่อเลื่อนดูมุมกว้าง)
    this.svg.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'svg' || e.target.id === 'svg-pan-group' || e.target.id === 'svg-links-group') {
        this.isPanning = true;
        this.svg.style.cursor = 'grabbing';
        this.panStartX = e.clientX - this.panX;
        this.panStartY = e.clientY - this.panY;
      }
    });

    this.svg.addEventListener('mousemove', (e) => {
      if (this.isPanning) {
        this.panX = e.clientX - this.panStartX;
        this.panY = e.clientY - this.panY;
        this.updateViewportTransform();
      } else if (this.draggedNode) {
        const rect = this.svg.getBoundingClientRect();
        const mX = e.clientX - rect.left;
        const mY = e.clientY - rect.top;
        
        this.draggedNode.x = (mX - this.panX) / this.zoom;
        this.draggedNode.y = (mY - this.panY) / this.zoom;
        
        this.draggedNode.vx = 0;
        this.draggedNode.vy = 0;
      }
    });

    window.addEventListener('mouseup', () => {
      if (this.isPanning) {
        this.isPanning = false;
        if (this.svg) this.svg.style.cursor = 'grab';
      }
      if (this.draggedNode) {
        this.draggedNode = null;
      }
    });

    // 2. ซูมภาพโดยเลื่อนเมาส์ (Wheel Zoom)
    this.svg.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      this.adjustZoom(zoomFactor);
    }, { passive: false });

    // 3. ผูกพอร์ตสำหรับทัชสกรีนในสมาร์ทโฟน
    this.svg.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        if (target && (target.tagName === 'svg' || target.id === 'svg-pan-group')) {
          this.isPanning = true;
          this.panStartX = touch.clientX - this.panX;
          this.panStartY = touch.clientY - this.panY;
        }
      }
    });

    this.svg.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        if (this.isPanning) {
          this.panX = touch.clientX - this.panStartX;
          this.panY = touch.clientY - this.panStartY;
          this.updateViewportTransform();
        } else if (this.draggedNode) {
          const rect = this.svg.getBoundingClientRect();
          const mX = touch.clientX - rect.left;
          const mY = touch.clientY - rect.top;
          this.draggedNode.x = (mX - this.panX) / this.zoom;
          this.draggedNode.y = (mY - this.panY) / this.zoom;
          this.draggedNode.vx = 0;
          this.draggedNode.vy = 0;
        }
      }
    });

    this.svg.addEventListener('touchend', () => {
      this.isPanning = false;
      this.draggedNode = null;
    });

    // วาดโหนดและเส้นในรอบแรก
    this.rebuildGraphSVG();
  },

  // ล้างค่ามุมมองแผนภาพ
  resetView() {
    this.zoom = 1.0;
    this.panX = 0;
    this.panY = 0;
    this.updateViewportTransform();
  },

  // ปรับการซูมด้วยปุ่มหรือเมาส์
  adjustZoom(factor) {
    this.zoom = Math.max(0.3, Math.min(3.5, this.zoom * factor));
    this.updateViewportTransform();
  },

  // สั่งเขียนสเกล transform ครอบ SVG Group
  updateViewportTransform() {
    if (this.panGroup) {
      this.panGroup.setAttribute('transform', `translate(${this.panX}, ${this.panY}) scale(${this.zoom})`);
    }
  },

  // วาดโครงสร้างเส้นและโหนดลง SVG
  rebuildGraphSVG() {
    const nodesGroup = document.getElementById('svg-nodes-group');
    const linksGroup = document.getElementById('svg-links-group');
    if (!nodesGroup || !linksGroup) return;

    // เคลียร์ผลเก่า
    nodesGroup.innerHTML = '';
    linksGroup.innerHTML = '';

    // 1. วาดเส้นเชื่อมโยง (Links)
    this.links.forEach(l => {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('id', `line-${l.id}`);
      
      // ตั้งค่าสีสไตล์เส้นตามความรุนแรง
      if (l.type === 'ddi') {
        if (l.severity === 'severe') {
          line.setAttribute('stroke', '#DC2626');
          line.setAttribute('stroke-width', '3');
          line.setAttribute('stroke-dasharray', '8, 6');
          line.setAttribute('filter', 'url(#net-glow-danger)');
          line.classList.add('animated-ddi-link-severe');
        } else if (l.severity === 'moderate') {
          line.setAttribute('stroke', '#D97706');
          line.setAttribute('stroke-width', '2');
          line.setAttribute('stroke-dasharray', '5, 4');
          line.setAttribute('filter', 'url(#net-glow-warning)');
          line.classList.add('animated-ddi-link-moderate');
        } else {
          line.setAttribute('stroke', '#85A3B2');
          line.setAttribute('stroke-width', '1.5');
        }
      } else {
        line.setAttribute('stroke', '#94A3B8');
        line.setAttribute('stroke-width', '1.5');
        line.setAttribute('stroke-dasharray', '3, 4');
      }
      
      linksGroup.appendChild(line);
    });

    // 2. วาดโหนดยา (Nodes)
    this.nodes.forEach(n => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'node-element');
      g.setAttribute('id', `node-g-${n.id}`);

      // ผูกคำสั่ง Hover เพื่อแสดงคำอธิบายและไฮไลท์เส้นรอบๆ
      g.addEventListener('mouseenter', () => this.highlightConnections(n));
      g.addEventListener('mouseleave', () => this.clearHighlights());

      // ผูกความสามารถคลิกลากโหนดเพื่อขยับ
      g.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        this.draggedNode = n;
      });
      g.addEventListener('touchstart', (e) => {
        e.stopPropagation();
        this.draggedNode = n;
      });

      // คลื่นวงแหวนกะพริบเรืองสีแดงสำหรับประวัติแพ้ยา (Allergy Ring Glow)
      if (n.isAllergy) {
        const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        ring.setAttribute('r', '22');
        ring.setAttribute('fill', 'none');
        ring.setAttribute('stroke', '#DC2626');
        ring.setAttribute('stroke-width', '2');
        ring.setAttribute('opacity', '0.8');
        ring.classList.add('pulse-allergy-ring');
        g.appendChild(ring);
      }

      // วงกลมหลักของโหนดยา
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('r', n.isCabinet ? '16' : (n.isAllergy ? '15' : '13'));
      
      let fillColor = '#94A3B8';
      let strokeColor = '#64748B';
      let strokeWidth = '1.5';

      if (n.isCabinet) {
        fillColor = '#16A34A';
        strokeColor = '#15803D';
        strokeWidth = '2';
      } else if (n.isAllergy) {
        fillColor = '#DC2626';
        strokeColor = '#991B1B';
        strokeWidth = '2';
      } else if (n.isScanned) {
        fillColor = '#2563EB';
        strokeColor = '#1D4ED8';
        strokeWidth = '1.5';
      }

      circle.setAttribute('fill', fillColor);
      circle.setAttribute('stroke', strokeColor);
      circle.setAttribute('stroke-width', strokeWidth);
      circle.setAttribute('class', 'node-circle');
      g.appendChild(circle);

      // ข้อความชื่อยาใต้โหนด
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.textContent = n.nameEn;
      text.setAttribute('y', '24');
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('fill', 'var(--color-text)');
      text.setAttribute('font-size', '0.78rem');
      text.setAttribute('font-weight', (n.isCabinet || n.isAllergy) ? '700' : '500');
      text.setAttribute('style', 'font-family: Sarabun, sans-serif; pointer-events: none;');
      g.appendChild(text);

      nodesGroup.appendChild(g);
    });

    this.updateSVGCoords();
  },

  // อัปเดตพิกัดเส้นและโหนดจริงตามการคำนวณ Force Math
  updateSVGCoords() {
    this.links.forEach(l => {
      const line = document.getElementById(`line-${l.id}`);
      const sourceNode = this.nodes.find(n => n.id === l.source);
      const targetNode = this.nodes.find(n => n.id === l.target);

      if (line && sourceNode && targetNode) {
        line.setAttribute('x1', sourceNode.x);
        line.setAttribute('y1', sourceNode.y);
        line.setAttribute('x2', targetNode.x);
        line.setAttribute('y2', targetNode.y);
      }
    });

    this.nodes.forEach(n => {
      const g = document.getElementById(`node-g-${n.id}`);
      if (g) {
        g.setAttribute('transform', `translate(${n.x}, ${n.y})`);
      }
    });
  },

  // ดำเนินการฟอร์ซเลย์เอาต์ตามเวลาจริง (Tick Simulation Loop)
  tickLoop() {
    if (!this.running) return;

    const centerX = this.width / 2;
    const centerY = this.height / 2;

    // 1. แรงผลักระหว่างโหนดทุกคู่ (Repulsion force)
    for (let i = 0; i < this.nodes.length; i++) {
      const n1 = this.nodes[i];
      for (let j = i + 1; j < this.nodes.length; j++) {
        const n2 = this.nodes[j];
        let dx = n2.x - n1.x;
        let dy = n2.y - n1.y;
        if (dx === 0) dx = 0.5;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 320) {
          const force = this.kRepulsion / (dist * dist + 100);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          if (n1 !== this.draggedNode) {
            n1.vx -= fx;
            n1.vy -= fy;
          }
          if (n2 !== this.draggedNode) {
            n2.vx += fx;
            n2.vy += fy;
          }
        }
      }
    }

    // 2. แรงดึงดูดเข้าหากันตามเส้นเชื่อมโยง (Attraction force)
    this.links.forEach(l => {
      const sNode = this.nodes.find(n => n.id === l.source);
      const tNode = this.nodes.find(n => n.id === l.target);

      if (sNode && tNode) {
        let dx = tNode.x - sNode.x;
        let dy = tNode.y - sNode.y;
        if (dx === 0) dx = 0.5;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const force = this.kAttraction * (dist - this.idealLength);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        if (sNode !== this.draggedNode) {
          sNode.vx += fx;
          sNode.vy += fy;
        }
        if (tNode !== this.draggedNode) {
          tNode.vx -= fx;
          tNode.vy -= fy;
        }
      }
    });

    // 3. ปรับสมดุลความเร็ว อัปเดตพิกัด และดึงเข้าหาศุนย์กลางหน้าจอ
    this.nodes.forEach(n => {
      if (n === this.draggedNode) return;

      const dx = centerX - n.x;
      const dy = centerY - n.y;
      n.vx += dx * this.gravity;
      n.vy += dy * this.gravity;

      n.vx *= this.damping;
      n.vy *= this.damping;

      const speed = Math.sqrt(n.vx * n.vx + n.vy * n.vy);
      const speedLimit = 16;
      if (speed > speedLimit) {
        n.vx = (n.vx / speed) * speedLimit;
        n.vy = (n.vy / speed) * speedLimit;
      }

      n.x += n.vx;
      n.y += n.vy;
    });

    this.updateSVGCoords();
    this.animationId = requestAnimationFrame(() => this.tickLoop());
  },

  // ปิดลูปแอนิเมชันเพื่อประหยัดแบตเตอรี่
  stopSimulation() {
    this.running = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  },

  // ไฮไลท์เส้นเชื่อมโยงเมื่อวางเมาส์ชี้โหนด (Hover Highlights)
  highlightConnections(node) {
    const connectedNodeIds = new Set([node.id]);
    const activeDDIAlerts = [];

    this.links.forEach(l => {
      const line = document.getElementById(`line-${l.id}`);
      if (!line) return;

      if (l.source === node.id || l.target === node.id) {
        line.setAttribute('opacity', '1.0');
        if (l.type === 'ddi') {
          line.setAttribute('stroke-width', l.severity === 'severe' ? '4.5' : '3.5');
          const otherId = l.source === node.id ? l.target : l.source;
          connectedNodeIds.add(otherId);

          const otherNode = this.nodes.find(n => n.id === otherId);
          const safeTitle = l.severity === 'severe' ? 'ห้ามรับประทานร่วมกันเด็ดขาด' : 'โปรดสอบถามแพทย์หรือเภสัชกรก่อน';
          const safeDesc = l.severity === 'severe'
            ? 'ห้ามรับประทานยาคู่นี้ร่วมกัน ระบบไม่แสดงรายละเอียดผลกระทบเพื่อความปลอดภัย'
            : 'อย่ารับประทานยาคู่นี้ร่วมกันจนกว่าจะสอบถามแพทย์หรือเภสัชกร';

          activeDDIAlerts.push({
            otherName: otherNode ? otherNode.nameTh : 'ยาตัวอื่น',
            severity: l.severity,
            title: safeTitle,
            desc: safeDesc
          });
        } else {
          line.setAttribute('stroke-width', '2.5');
          const otherId = l.source === node.id ? l.target : l.source;
          connectedNodeIds.add(otherId);
        }
      } else {
        line.setAttribute('opacity', '0.15');
      }
    });

    this.nodes.forEach(n => {
      const g = document.getElementById(`node-g-${n.id}`);
      if (g) {
        if (connectedNodeIds.has(n.id)) {
          g.setAttribute('opacity', '1.0');
          if (n.id === node.id) {
            const circle = g.querySelector('.node-circle');
            if (circle) {
              circle.setAttribute('stroke', '#EAB308');
              circle.setAttribute('stroke-width', '3');
            }
          }
        } else {
          g.setAttribute('opacity', '0.2');
        }
      }
    });

    const tooltip = document.getElementById('net-node-tooltip');
    if (tooltip) {
      let statusLabel = `<span style="background: #94A3B8; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.72rem; font-weight: 600;">คลังยาทั่วไป</span>`;
      if (node.isAllergy) {
        statusLabel = `<span style="background: #DC2626; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.72rem; font-weight: 600; display: inline-block;">⚠️ ประวัติแพ้ยา</span>`;
      } else if (node.isCabinet) {
        statusLabel = `<span style="background: #16A34A; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.72rem; font-weight: 600;">💊 ยาในตู้ยาคุณ</span>`;
      } else if (node.isScanned) {
        statusLabel = `<span style="background: #2563EB; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.72rem; font-weight: 600;">🔍 เคยสแกนตรวจ</span>`;
      }

      let warningsHTML = '';
      if (activeDDIAlerts.length > 0) {
        warningsHTML = `
          <div style="margin-top: 10px; border-top: 1px solid var(--color-border); padding-top: 8px;">
            <div style="font-weight: 700; color: #DC2626; margin-bottom: 4px; font-size: 0.8rem;">🚨 ตรวจพบการตีกันของยา:</div>
            ${activeDDIAlerts.map(w => `
              <div style="margin-bottom: 6px; font-size: 0.76rem; line-height: 1.3;">
                • ตีกับ <strong style="color:var(--color-primary);">${w.otherName}</strong> (${w.severity === 'severe' ? 'วิกฤต' : 'ปานกลาง'})<br>
                <span style="color:#D97706; font-weight:600;">${w.title}</span>
              </div>
            `).join('')}
          </div>
        `;
      }

      tooltip.innerHTML = `
        <div style="font-weight: 700; font-size: 1rem; color: var(--color-primary); margin-bottom: 4px; font-family: 'Prompt', sans-serif;">${node.nameEn} (${node.nameTh})</div>
        <div style="font-size: 0.78rem; color: var(--color-text-secondary); margin-bottom: 6px;">หมวดหมู่: ${node.category}</div>
        <div style="margin-bottom: 8px;">${statusLabel}</div>
        <p style="margin: 0; font-size: 0.76rem; color: var(--color-text-muted); line-height: 1.35;">${node.description || 'ไม่มีคำอธิบายในฐานข้อมูล'}</p>
        ${warningsHTML}
      `;
      tooltip.style.display = 'block';
    }
  },

  // ล้างการไฮไลท์ ปรับกลับสู่ค่าความทึบปกติ
  clearHighlights() {
    const tooltip = document.getElementById('net-node-tooltip');
    if (tooltip) tooltip.style.display = 'none';

    this.nodes.forEach(n => {
      const g = document.getElementById(`node-g-${n.id}`);
      if (g) {
        g.setAttribute('opacity', '1.0');
        const circle = g.querySelector('.node-circle');
        if (circle) {
          let strokeColor = '#64748B';
          let strokeWidth = '1.5';
          if (n.isCabinet) {
            strokeColor = '#15803D';
            strokeWidth = '2';
          } else if (n.isAllergy) {
            strokeColor = '#991B1B';
            strokeWidth = '2';
          } else if (n.isScanned) {
            strokeColor = '#1D4ED8';
          }
          circle.setAttribute('stroke', strokeColor);
          circle.setAttribute('stroke-width', strokeWidth);
        }
      }
    });

    this.links.forEach(l => {
      const line = document.getElementById(`line-${l.id}`);
      if (line) {
        line.setAttribute('opacity', '1.0');
        if (l.type === 'ddi') {
          line.setAttribute('stroke-width', l.severity === 'severe' ? '3' : '2');
        } else {
          line.setAttribute('stroke-width', '1.5');
        }
      }
    });
  },

  // พิมพ์ค้นหาและไฮไลท์โหนดที่ต้องการ (Search Highlights & Center viewport)
  handleSearch(query) {
    this.searchQuery = query.trim().toLowerCase();
    
    if (!this.searchQuery) {
      this.nodes.forEach(n => {
        const g = document.getElementById(`node-g-${n.id}`);
        if (g) {
          g.setAttribute('opacity', '1.0');
          const circle = g.querySelector('.node-circle');
          if (circle) {
            let strokeColor = '#64748B';
            let strokeWidth = '1.5';
            if (n.isCabinet) {
              strokeColor = '#15803D';
              strokeWidth = '2';
            } else if (n.isAllergy) {
              strokeColor = '#991B1B';
              strokeWidth = '2';
            }
            circle.setAttribute('stroke', strokeColor);
            circle.setAttribute('stroke-width', strokeWidth);
          }
        }
      });
      return;
    }

    let matchedNode = null;

    this.nodes.forEach(n => {
      const g = document.getElementById(`node-g-${n.id}`);
      if (g) {
        const matches = 
          n.nameEn.toLowerCase().includes(this.searchQuery) ||
          n.nameTh.toLowerCase().includes(this.searchQuery) ||
          n.category.toLowerCase().includes(this.searchQuery);

        if (matches) {
          g.setAttribute('opacity', '1.0');
          const circle = g.querySelector('.node-circle');
          if (circle) {
            circle.setAttribute('stroke', '#EAB308');
            circle.setAttribute('stroke-width', '3.5');
          }
          if (!matchedNode) matchedNode = n;
        } else {
          g.setAttribute('opacity', '0.2');
        }
      }
    });

    if (matchedNode) {
      const centerX = this.width / 2;
      const centerY = this.height / 2;

      this.panX = centerX - matchedNode.x * this.zoom;
      this.panY = centerY - matchedNode.y * this.zoom;
      this.updateViewportTransform();
    }
  },

  // เปลี่ยนกลุ่มตัวกรองกราฟ (Filter Buttons)
  setFilter(filterType) {
    this.activeFilter = filterType;
    
    this.searchQuery = '';
    const sInput = document.getElementById('net-search-input');
    if (sInput) sInput.value = '';

    // รีเฟรชชิปสีพื้นปุ่มแอคทีฟ
    const chips = document.querySelectorAll('.filter-chips-container .chip');
    chips.forEach(c => {
      c.classList.remove('active');
      c.style.background = 'var(--color-bg)';
      c.style.color = 'var(--color-text-secondary)';
      c.style.borderColor = 'var(--color-border)';
    });

    const activeBtn = Array.from(chips).find(c => c.textContent.includes(
      filterType === 'all' ? 'ยาทั้งหมด' : (filterType === 'cabinet' ? 'ยาในตู้' : 'เฉพาะยา')
    ));

    if (activeBtn) {
      activeBtn.classList.add('active');
      activeBtn.style.background = 'var(--color-primary)';
      activeBtn.style.color = '#FFFFFF';
      activeBtn.style.borderColor = 'var(--color-primary)';
    }

    this.buildGraphData();
    this.rebuildGraphSVG();
    this.updateStats();
  },

  // เปลี่ยนแท็บเมนูฝั่งขวา (Rules / AI Extract / JSON Export)
  switchRightTab(tabName) {
    const buttons = document.querySelectorAll('.ai-tab-btn');
    buttons.forEach(btn => {
      const id = btn.id;
      if (id === `btn-tab-${tabName}`) {
        btn.classList.add('active');
        btn.style.color = 'var(--color-primary)';
        btn.style.borderBottom = '3px solid var(--color-primary)';
      } else {
        btn.classList.remove('active');
        btn.style.color = 'var(--color-text-secondary)';
        btn.style.borderBottom = 'none';
      }
    });

    const contents = document.querySelectorAll('.ai-tab-content-box');
    contents.forEach(box => {
      box.style.display = box.id === `panel-tab-${tabName}` ? 'block' : 'none';
    });

    if (tabName === 'export') {
      this.updateExportCode();
    }
  },

  // แสดงผลรายชื่อยาในฟอร์มลงทะเบียนจับคู่ปฏิกิริยายา (DDI Options)
  populateDrugDropdowns() {
    const d1 = document.getElementById('custom-ddi-1');
    const d2 = document.getElementById('custom-ddi-2');
    if (!d1 || !d2) return;

    d1.innerHTML = '';
    d2.innerHTML = '';

    MedicineDB.medicines.forEach(m => {
      const opt1 = document.createElement('option');
      opt1.value = m.id;
      opt1.textContent = `${m.nameEn} (${m.nameTh})`;
      d1.appendChild(opt1);

      const opt2 = document.createElement('option');
      opt2.value = m.id;
      opt2.textContent = `${m.nameEn} (${m.nameTh})`;
      d2.appendChild(opt2.cloneNode(true));
    });
  },

  // บันทึกยาใหม่ลงเครื่องและอัปเดตแผนภาพ
  registerCustomDrug() {
    const en = document.getElementById('custom-drug-en').value.trim();
    const th = document.getElementById('custom-drug-th').value.trim();
    const cat = document.getElementById('custom-drug-cat').value;
    const desc = document.getElementById('custom-drug-desc').value.trim();

    if (!en || !th) {
      Utils.showToast('กรุณากรอกชื่อยาภาษาอังกฤษและภาษาไทย', 'error');
      return;
    }

    const newId = en.toLowerCase().replace(/\s+/g, '-');

    if (MedicineDB.medicines.some(m => m.id === newId)) {
      Utils.showToast('ชื่อยานี้ลงทะเบียนในระบบคลังอยู่แล้ว', 'error');
      return;
    }

    const newMed = {
      id: newId,
      nameEn: en,
      nameTh: th,
      category: cat,
      commonDosages: [10, 20, 50],
      pillColor: '#B0BEC5',
      pillShape: 'round',
      description: desc || 'ยาสมุนไพรที่ลงทะเบียนเอง'
    };

    const customMeds = App.state.customMedicines || [];
    customMeds.push(newMed);
    App.updateState('customMedicines', customMeds);

    MedicineDB.medicines.push(newMed);

    document.getElementById('custom-drug-en').value = '';
    document.getElementById('custom-drug-th').value = '';
    document.getElementById('custom-drug-desc').value = '';

    this.buildGraphData();
    this.rebuildGraphSVG();
    this.populateDrugDropdowns();
    this.updateStats();

    Utils.showToast(`ลงทะเบียนยา ${en} สำเร็จ! ปรากฏโหนดบนกราฟแล้ว`, 'success');
  },

  // บันทึกกฎ DDI ใหม่ลงเครื่องและอัปเดตกราฟ
  saveCustomDDI() {
    const drug1 = document.getElementById('custom-ddi-1').value;
    const drug2 = document.getElementById('custom-ddi-2').value;
    const severity = document.getElementById('custom-ddi-severity').value;

    if (drug1 === drug2) {
      Utils.showToast('กรุณาเลือกยาสองตัวที่แตกต่างกัน', 'error');
      return;
    }

    const isSevere = severity === 'severe';
    const title = isSevere ? 'ห้ามรับประทานยาคู่นี้ร่วมกัน' : 'โปรดสอบถามแพทย์หรือเภสัชกรก่อนใช้ร่วมกัน';
    const desc = isSevere
      ? 'ระบบไม่แสดงรายละเอียดผลกระทบเพื่อความปลอดภัย'
      : 'อย่ารับประทานยาคู่นี้ร่วมกันจนกว่าจะได้รับคำแนะนำ';
    const advices = isSevere
      ? ['อย่าปรับหรือหยุดยาที่ใช้อยู่เอง', 'ติดต่อแพทย์หรือเภสัชกรทันที']
      : ['สอบถามแพทย์หรือเภสัชกรให้แน่ใจก่อน'];

    const newInteraction = {
      drug1: drug1,
      drug2: drug2,
      severity: severity,
      titleTh: title,
      descriptionTh: desc,
      adviceTh: advices
    };

    const customDDIList = App.state.customInteractions || [];
    
    const alreadyExists = customDDIList.some(x => 
      (x.drug1 === drug1 && x.drug2 === drug2) ||
      (x.drug1 === drug2 && x.drug2 === drug1)
    );

    if (alreadyExists) {
      Utils.showToast('กฎเตือนภัยของยากู่นี้เคยถูกสร้างขึ้นแล้ว', 'error');
      return;
    }

    customDDIList.push(newInteraction);
    App.updateState('customInteractions', customDDIList);

    MedicineDB.interactions.push(newInteraction);

    this.buildGraphData();
    this.rebuildGraphSVG();
    this.updateStats();

    Utils.showToast('บันทึกกฎความปลอดภัยปฏิกิริยายาใหม่เสร็จสิ้น!', 'success');
  },

  // ดำเนินการวิเคราะห์ข้อความงานวิจัยสแกน DDI แบบจำลอง (Simulated AI Extractor)
  runAIExtraction() {
    const text = document.getElementById('ai-extract-textarea').value.trim();
    if (!text) {
      Utils.showToast('กรุณาพิมพ์หรือวางข้อความคำแนะนำทางการแพทย์ก่อนวิเคราะห์', 'error');
      return;
    }

    Utils.showToast('🤖 AI กำลังประมวลผลข้อความ...', 'info');

    setTimeout(() => {
      const foundMeds = [];
      MedicineDB.medicines.forEach(m => {
        const enMatch = text.toLowerCase().includes(m.nameEn.toLowerCase());
        const thMatch = text.includes(m.nameTh);
        if (enMatch || thMatch) {
          foundMeds.push(m);
        }
      });

      if (foundMeds.length < 2) {
        const resultBox = document.getElementById('ai-extract-result-box');
        if (resultBox) {
          resultBox.innerHTML = `
            <div style="font-weight:700; color: #DC2626; margin-bottom: 6px;">❌ AI สแกนวิเคราะห์ไม่สำเร็จ</div>
            <span>ไม่พบตัวยาอย่างน้อย 2 ชนิดในข้อความที่สอดคล้องกับฐานข้อมูลปัจจุบัน ลองระบุชื่อยาให้ตรง เช่น Aspirin หรือ Metformin เพื่อทดสอบการสกัดข้อมูล</span>
          `;
          resultBox.style.display = 'block';
        }
        return;
      }

      const m1 = foundMeds[0];
      const m2 = foundMeds[1];

      let severity = 'moderate';
      let severityTh = 'ปานกลาง (Moderate)';
      let color = '#D97706';
      
      const dangerousKeywords = ['รุนแรง', 'วิกฤต', 'ห้ามใช้ร่วมกัน', 'ห้ามกินคู่กัน', 'ห้ามกินร่วมกัน', 'เสียชีวิต', 'หัวใจวาย', 'ไตวาย', 'severe', 'danger', 'fatal'];
      const hasDanger = dangerousKeywords.some(kw => text.includes(kw));
      
      if (hasDanger) {
        severity = 'severe';
        severityTh = 'วิกฤต/รุนแรงมาก (Severe)';
        color = '#DC2626';
      }

      const extractedTitle = severity === 'severe'
        ? 'ห้ามรับประทานยาคู่นี้ร่วมกัน'
        : 'โปรดสอบถามแพทย์หรือเภสัชกรก่อนใช้ร่วมกัน';
      const extractedDesc = 'ระบบไม่แสดงรายละเอียดผลกระทบเพื่อความปลอดภัย';
      const extractedAdvice = severity === 'severe'
        ? 'อย่าปรับหรือหยุดยาที่ใช้อยู่เอง, ติดต่อแพทย์หรือเภสัชกรทันที'
        : 'อย่ารับประทานร่วมกันจนกว่าจะสอบถามแพทย์หรือเภสัชกร';

      const resultBox = document.getElementById('ai-extract-result-box');
      if (resultBox) {
        resultBox.innerHTML = `
          <div style="font-weight:700; color: ${color}; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
            <span>🤖 AI วิเคราะห์สกัดข้อมูลเสร็จสิ้น!</span>
          </div>
          <div style="background: white; padding: 10px; border-radius: 6px; border-left: 3px solid ${color}; font-size: 0.8rem; color: var(--color-text-secondary); text-align: left;">
            <strong>ยาตัวที่ 1:</strong> ${m1.nameEn} (${m1.nameTh})<br>
            <strong>ยาตัวที่ 2:</strong> ${m2.nameEn} (${m2.nameTh})<br>
            <strong>ระดับอันตราย:</strong> <span style="color:${color}; font-weight:700;">${severityTh}</span><br>
            <strong>คำสั่งความปลอดภัย:</strong> ${extractedTitle}<br>
            <strong>นโยบายการเปิดเผย:</strong> ${extractedDesc}<br>
            <strong>สิ่งที่ต้องทำ:</strong> ${extractedAdvice}
          </div>
          <div style="margin-top: 10px; display:flex; justify-content: flex-end;">
            <button class="btn btn-primary btn-sm" onclick="Network.applyAIExtractedRules('${m1.id}', '${m2.id}', '${severity}', '${extractedTitle}', '${extractedDesc}', '${extractedAdvice}')" style="font-size:0.8rem; padding: 4px 12px; height: 32px;">
              ยืนยันเอากฎนี้เข้าระบบ
            </button>
          </div>
        `;
        resultBox.style.display = 'block';
      }
      
      Utils.showToast('สกัดข้อมูลข้อความเรียบร้อย! โปรดตรวจทานความถูกต้องก่อนยืนยัน', 'success');
    }, 700);
  },

  // เอากลุ่มกฎที่ AI ดึงข้อมูลได้จริงไปลงแบบฟอร์มแล้วเซฟทันที
  applyAIExtractedRules(d1, d2, severity, title, desc, advice) {
    document.getElementById('custom-ddi-1').value = d1;
    document.getElementById('custom-ddi-2').value = d2;
    document.getElementById('custom-ddi-severity').value = severity;
    this.switchRightTab('rules');

    const card1 = document.querySelector('#panel-tab-rules .card:last-child');
    if (card1) {
      card1.style.borderColor = 'var(--color-primary)';
      card1.style.boxShadow = '0 0 15px rgba(43,62,80,0.3)';
      setTimeout(() => {
        card1.style.borderColor = 'var(--color-border)';
        card1.style.boxShadow = 'var(--shadow-sm)';
      }, 1500);
    }
  },

  // อัปเดตข้อความชุดข้อมูล JSON คอนโซลขวา
  updateExportCode() {
    const codeBox = document.getElementById('net-export-code');
    if (!codeBox) return;

    const state = App.state;
    const dataset = {
      patientInfo: {
        name: state.user.name,
        weightKg: state.user.weight,
        heightCm: state.user.height,
        allergies: state.allergyLog
      },
      currentCabinetMedicines: state.myMedicines.map(m => {
        const dbMed = MedicineDB.getMedicineById(m.medicineId);
        return {
          id: m.medicineId,
          nameEn: dbMed ? dbMed.nameEn : '',
          nameTh: dbMed ? dbMed.nameTh : '',
          dosageMg: m.dosageMg,
          schedule: m.timeSlots,
          addedDate: m.addedDate,
          notes: m.notes
        };
      }),
      scanAndCheckHistory: state.scanHistory,
      customDDIRules: state.customInteractions || [],
      systemInteractionsCount: MedicineDB.interactions.length
    };

    codeBox.textContent = JSON.stringify(dataset, null, 2);
  },

  // ทำการสถิติตัวเลขโหนดทั้งหมดในเครือข่ายปัจจุบัน
  updateStats() {
    const statsLabel = document.getElementById('network-stats-label');
    if (statsLabel) {
      statsLabel.textContent = `ในกราฟนี้: ${this.nodes.length} ยา | ${this.links.length} การเชื่อมโยง`;
    }
  },

  // คัดลอกข้อมูล JSON
  copyDataset() {
    const code = document.getElementById('net-export-code');
    if (code) {
      navigator.clipboard.writeText(code.textContent).then(() => {
        Utils.showToast('📋 คัดลอกชุดข้อมูล JSON ลง Clipboard แล้ว!', 'success');
      }).catch(err => {
        Utils.showToast('ไม่สามารถคัดลอกได้:', err);
      });
    }
  },

  // ดาวน์โหลดชุดข้อมูลเป็นไฟล์ json
  downloadDataset() {
    const code = document.getElementById('net-export-code');
    if (!code) return;

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(code.textContent);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "yacheck_patient_dataset.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    Utils.showToast('💾 ดาวน์โหลดชุดข้อมูล yacheck_patient_dataset.json เรียบร้อย!', 'success');
  }
};
