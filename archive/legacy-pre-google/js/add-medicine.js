// หน้าเพิ่มยา มี 4 ขั้นตอน: เลือกวิธี -> กรอกข้อมูล -> ข้อมูลเพิ่มเติม -> ยืนยัน
const AddMedicine = {

  currentStep: 1,
  totalSteps: 4,

  // เก็บข้อมูลในฟอร์มชั่วคราว จะเคลียร์ใหม่ทุกครั้งที่เปิดหน้า
  formData: {
    method: null,        // 'camera' | 'manual'
    medicineId: null,    // id ที่ตรงกับ MedicineDB
    customName: '',      // ชื่อกรอกเอง (กรณีไม่พบใน DB)
    dosageMg: null,
    lotNumber: '',
    timeSlots: [],       // ['morning', 'noon', ...]
    type: 'regular',     // 'regular' | 'occasional'
    duration: null,      // 'new' | 'short' | 'medium' | 'long'
    efficacy: null,      // 'good' | 'neutral' | 'bad'
    mealTiming: 'after_meal', // 'before_meal' | 'after_meal'
    stopDate: ''         // YYYY-MM-DD
  },

  // เริ่มวาดหน้าเพิ่มยา

  render() {
    // รีเซ็ตฟอร์มเมื่อเปิดหน้าใหม่
    this.currentStep = 1;
    this.formData = {
      method: null, medicineId: null, customName: '',
      dosageMg: null, lotNumber: '', timeSlots: [],
      type: 'regular', duration: null, efficacy: null,
      scannedSuccessfully: false,
      mealTiming: 'after_meal',
      stopDate: ''
    };
    this.renderStep();
  },

  // วาดหน้าจอตามขั้นตอนปัจจุบัน
  renderStep() {
    const container = document.querySelector('#page-add .page-content');
    if (!container) return;

    let html = this.renderStepIndicator();

    switch (this.currentStep) {
      case 1: html += this.renderStep1(); break;
      case 2: html += this.renderStep2(); break;
      case 3: html += this.renderStep3(); break;
      case 4: html += this.renderStep4(); break;
    }

    container.innerHTML = html;
    this.attachStepListeners();
  },

  // แถบจุดบอกขั้นตอน (Step Indicator)
  renderStepIndicator() {
    let html = '<div class="step-indicator">';
    for (let i = 1; i <= this.totalSteps; i++) {
      const isActive = i === this.currentStep;
      const isCompleted = i < this.currentStep;
      html += `<div class="step-dot ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}"></div>`;
      if (i < this.totalSteps) {
        html += `<div class="step-line ${isCompleted ? 'completed' : ''}"></div>`;
      }
    }
    html += '</div>';
    return html;
  },

  // ขั้นตอนที่ 1: เลือกวิธีว่าจะถ่ายรูปหรือพิมพ์ชื่อเอง
  renderStep1() {
    const state = App.getState();
    const scanHistory = state.scanHistory || [];
    
    let scanHistoryHtml = '';
    if (scanHistory.length > 0) {
      scanHistoryHtml = `
        <div class="scan-history-section" style="margin-top:24px; width: 100%;">
          <h3 style="font-size:1.15rem; font-weight:700; margin-bottom:12px; color:var(--color-text-secondary); text-align:left;">ประวัติการสแกนซองยาล่าสุด</h3>
          <div style="display:flex; flex-direction:column; gap:8px;">
            ${scanHistory.slice(0, 5).map(log => `
              <div class="scan-history-item card" style="display:flex; justify-content:space-between; align-items:center; padding:12px; border-radius: var(--radius-sm); background-color: var(--color-surface); box-shadow: var(--shadow-sm);">
                <div style="text-align:left; flex:1; padding-right:12px;">
                  <strong style="color:var(--color-text); font-size:0.95rem;">${log.medicineName} (${log.dosageMg} mg)</strong>
                  <div style="font-size:0.8rem; color:var(--color-text-secondary); margin-top:2px;">สแกนเมื่อ: ${Utils.formatThaiDateShort(new Date(log.timestamp))} ${new Date(log.timestamp).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})}</div>
                </div>
                <button class="btn btn-outline btn-sm" onclick="AddMedicine.selectScannedMed('${log.medicineId}', ${log.dosageMg})" style="font-size:0.85rem; padding:4px 8px; height:auto; border-width:1.5px;">
                  ใช้ข้อมูล
                </button>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    return `
      <h2 class="step-title">เพิ่มยาใหม่</h2>
      <p class="step-subtitle">เลือกวิธีเพิ่มยา</p>
      <div class="method-cards">
        <div class="method-card card" onclick="AddMedicine.selectMethod('camera')">
          <span class="method-icon" style="color: var(--color-primary);">${Utils.getIconSvg('camera', 'icon-md')}</span>
          <div class="method-text">
            <h3>ถ่ายรูปซองยา</h3>
            <p>AI จะอ่านชื่อยาให้อัตโนมัติ</p>
          </div>
          <span class="method-arrow" style="display: inline-flex;">${Utils.getIconSvg('chevronRight', 'icon-sm')}</span>
        </div>
        <div class="method-card card" onclick="AddMedicine.selectMethod('manual')">
          <span class="method-icon" style="color: var(--color-primary);">${Utils.getIconSvg('write', 'icon-md')}</span>
          <div class="method-text">
            <h3>พิมพ์ชื่อยาเอง</h3>
            <p>ค้นหาจากรายชื่อยา</p>
          </div>
          <span class="method-arrow" style="display: inline-flex;">${Utils.getIconSvg('chevronRight', 'icon-sm')}</span>
        </div>
      </div>
      ${scanHistoryHtml}
    `;
  },

  selectScannedMed(medId, dosageMg) {
    const med = MedicineDB.medicines.find(m => m.id === medId);
    if (!med) return;
    this.formData.method = 'manual';
    this.formData.medicineId = medId;
    this.formData.dosageMg = dosageMg;
    this.formData.scannedSuccessfully = true;
    
    // Auto-select current time slot
    const currentSlot = Utils.getCurrentTimeSlot();
    if (!this.formData.timeSlots.includes(currentSlot)) {
      this.formData.timeSlots = [currentSlot];
    }
    
    this.goToStep(2);
  },

  // ขั้นตอนที่ 2: สแกน หรือ กรอกข้อมูลยาเอง
  renderStep2() {
    return this.formData.method === 'camera'
      ? this.renderCameraScan()
      : this.renderManualEntry();
  },

  // หน้าจำลองสแกนซองยา
  renderCameraScan() {
    return `
      <h2 class="step-title" style="display: flex; align-items: center; justify-content: center; gap: 8px;">
        ${Utils.getIconSvg('camera', 'icon-md')} สแกนซองยา
      </h2>
      <div class="scanner-overlay" id="scanner-view">
        <div class="scanner-frame">
          <div class="scanner-line"></div>
        </div>
        <p class="scanner-hint">วางซองยาในกรอบ</p>
      </div>
      <button class="btn btn-primary btn-full mt-lg" style="display: flex; align-items: center; justify-content: center; gap: var(--space-sm);" onclick="AddMedicine.simulateScan()">
        ${Utils.getIconSvg('camera', 'icon-sm')} ถ่ายรูป (จำลอง)
      </button>
      <div id="scan-result" style="display:none"></div>
      <button class="btn btn-ghost mt-md" style="display: inline-flex; align-items: center; justify-content: center; gap: var(--space-xs);" onclick="AddMedicine.goToStep(1)">
        ${Utils.getIconSvg('chevronLeft', 'icon-sm')} ย้อนกลับ
      </button>
    `;
  },

  // ฟอร์มกรอกข้อมูลยาเอง มีลิสต์รายชื่อยาช่วยค้นหาตอนพิมพ์
  renderManualEntry() {
    const selectedMed = this.formData.medicineId
      ? MedicineDB.medicines.find(m => m.id === this.formData.medicineId)
      : null;

    // เตรียมข้อมูลตัวเลือกขนาดยาแนะนำ (ถ้ามี)
    const recommendedDosages = selectedMed ? selectedMed.commonDosages : [250, 500];
    const dosageChipsHtml = recommendedDosages.map(d => {
      const isActive = Number(this.formData.dosageMg) === d;
      return `<button type="button" class="dosage-chip ${isActive ? 'active' : ''}" onclick="AddMedicine.selectDosage(${d})">${d} mg</button>`;
    }).join('');

    // สร้างการ์ดช่วงเวลา
    const timeSlotsHtml = ['morning', 'noon', 'evening', 'bedtime'].map(slot => {
      const info = Utils.getTimeSlotInfo(slot);
      const isSelected = this.formData.timeSlots.includes(slot);
      return `
        <div class="selection-card ${isSelected ? 'selected' : ''}"
          onclick="AddMedicine.toggleTimeSlot('${slot}')">
          <span class="selection-emoji" style="color: ${info.accentColor}; display: inline-flex;">${Utils.getIconSvg(info.iconName, 'icon-md')}</span>
          <span class="selection-label">${info.nameTh}</span>
          <span class="selection-time">${info.time}</span>
        </div>
      `;
    }).join('');

    // ค่าที่แสดงในช่องชื่อยา
    const nameValue = selectedMed
      ? `${selectedMed.nameTh} (${selectedMed.nameEn})`
      : this.formData.customName;

    // ปุ่มถัดไปจะ disabled ถ้ายังไม่เลือกยา
    const canProceed = this.formData.medicineId || this.formData.customName;

    return `
      <h2 class="step-title" style="display: flex; align-items: center; justify-content: center; gap: 8px;">
        ${Utils.getIconSvg('write', 'icon-md')} กรอกข้อมูลยา
      </h2>

      ${this.formData.scannedSuccessfully ? `
        <div class="alert-card alert-safe mb-md text-center py-md" style="border-radius: var(--radius-md); border-left: none; box-shadow: none; margin-bottom: 16px;">
          <p class="font-semibold" style="color: var(--color-safe); font-size: 1.15rem; margin-bottom: 2px; display: flex; align-items: center; justify-content: center; gap: 6px;">
            ${Utils.getIconSvg('checkCircle', 'icon-sm')} สแกนยาสำเร็จแล้ว!
          </p>
          <p class="text-secondary" style="font-size: 0.95rem;">โปรดตรวจสอบข้อมูล เลือกช่วงเวลาทานยา แล้วกด "ถัดไป" ด้านล่าง</p>
        </div>
      ` : ''}

      <div class="form-group">
        <label class="form-label">ชื่อยา</label>
        <div class="autocomplete-wrapper">
          <input type="text" class="form-input" id="medicine-search"
            placeholder="พิมพ์ชื่อยา (ไทยหรืออังกฤษ)"
            value="${nameValue}"
            oninput="AddMedicine.onSearchInput(this.value)">
          <div class="autocomplete-list" id="autocomplete-results" style="display:none"></div>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">ขนาดยา (mg)</label>
        <input type="number" class="form-input" id="dosage-input" 
          placeholder="กรอกขนาดยา เช่น 500" 
          value="${this.formData.dosageMg || ''}"
          oninput="AddMedicine.onDosageInput(this.value)">
        <div class="dosage-chips-container">
          ${dosageChipsHtml}
        </div>
      </div>

      <div class="form-group">
        <label class="form-label" style="display: flex; align-items: center; gap: 4px;">
          เลขล็อตผลิต / บาร์โค้ด (ไม่บังคับ)
          <button class="btn-icon-small" style="display: inline-flex; align-items: center; justify-content: center; color: var(--color-primary); background: none; border: none; padding: 0; cursor: pointer; vertical-align: middle;" onclick="AddMedicine.showLotHelp()">
            ${Utils.getIconSvg('help', 'icon-sm')}
          </button>
        </label>
        <input type="text" class="form-input" id="lot-input" placeholder="เลขล็อต (ถ้ามี)"
          value="${this.formData.lotNumber}"
          oninput="AddMedicine.formData.lotNumber = this.value">
      </div>

      <div class="form-group">
        <label class="form-label">ช่วงเวลาทานยา</label>
        <div class="selection-grid">${timeSlotsHtml}</div>
      </div>

      <div class="form-group">
        <label class="form-label">เวลาทานยากับอาหาร</label>
        <div class="selection-grid">
          <div class="selection-card ${this.formData.mealTiming === 'before_meal' ? 'selected' : ''}"
            onclick="AddMedicine.selectMealTiming('before_meal')">
            <span class="selection-emoji" style="color: var(--color-primary); display: inline-flex;">🌅</span>
            <span class="selection-label">ก่อนอาหาร</span>
          </div>
          <div class="selection-card ${this.formData.mealTiming !== 'before_meal' ? 'selected' : ''}"
            onclick="AddMedicine.selectMealTiming('after_meal')">
            <span class="selection-emoji" style="color: var(--color-primary); display: inline-flex;">🍲</span>
            <span class="selection-label">หลังอาหาร</span>
          </div>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">วันสิ้นสุดการทานยา (ถ้ามีกำหนดหยุดยา)</label>
        <input type="date" class="form-input" id="stop-date-input" 
          value="${this.formData.stopDate || ''}"
          onchange="AddMedicine.formData.stopDate = this.value">
      </div>

      <div class="form-group">
        <label class="form-label">ประเภทยา</label>
        <div class="selection-grid">
          <div class="selection-card ${this.formData.type === 'regular' ? 'selected' : ''}"
            onclick="AddMedicine.selectType('regular')">
            <span class="selection-emoji" style="color: var(--color-primary); display: inline-flex;">${Utils.getIconSvg('pill', 'icon-md')}</span>
            <span class="selection-label">ยากินประจำ</span>
          </div>
          <div class="selection-card ${this.formData.type === 'occasional' ? 'selected' : ''}"
            onclick="AddMedicine.selectType('occasional')">
            <span class="selection-emoji" style="color: var(--color-primary); display: inline-flex;">${Utils.getIconSvg('syringe', 'icon-md')}</span>
            <span class="selection-label">ยาเฉพาะกิจ</span>
          </div>
        </div>
      </div>

      <div class="step-actions">
        <button class="btn btn-ghost" style="display: inline-flex; align-items: center; justify-content: center; gap: var(--space-xs);" onclick="AddMedicine.goToStep(1)">
          ${Utils.getIconSvg('chevronLeft', 'icon-sm')} ย้อนกลับ
        </button>
        <button class="btn btn-primary" style="display: inline-flex; align-items: center; justify-content: center; gap: var(--space-xs);" onclick="AddMedicine.goToStep(3)"
          ${!canProceed ? 'disabled' : ''}>
          ถัดไป ${Utils.getIconSvg('chevronRight', 'icon-sm')}
        </button>
      </div>
    `;
  },

  // ขั้นตอนที่ 3: เลือกข้อมูลเพิ่มเติม เช่น กินมานานแค่ไหนแล้ว
  renderStep3() {
    const durations = [
      { value: 'new',    label: 'เพิ่งเริ่มกิน',    sublabel: '< 1 สัปดาห์', iconName: 'sparkles' },
      { value: 'short',  label: 'กินมาสักพัก',      sublabel: '1-4 สัปดาห์', iconName: 'calendar' },
      { value: 'medium', label: 'กินมาต่อเนื่อง',   sublabel: '1-6 เดือน',   iconName: 'calendarRange' },
      { value: 'long',   label: 'กินเป็นประจำ',     sublabel: '> 6 เดือน',   iconName: 'pin' }
    ];

    const durationCards = durations.map(d => `
      <div class="selection-card ${this.formData.duration === d.value ? 'selected' : ''}"
        onclick="AddMedicine.selectDuration('${d.value}')">
        <span class="selection-emoji" style="color: var(--color-primary); display: inline-flex;">${Utils.getIconSvg(d.iconName, 'icon-md')}</span>
        <span class="selection-label">${d.label}</span>
        <span class="selection-sublabel">${d.sublabel}</span>
      </div>
    `).join('');

    const efficacyButtons = [
      { value: 'good',    iconName: 'smile', label: 'ดีขึ้น' },
      { value: 'neutral', iconName: 'meh', label: 'เหมือนเดิม' },
      { value: 'bad',     iconName: 'frown', label: 'แย่ลง' }
    ].map(e => `
      <button class="emoji-btn ${this.formData.efficacy === e.value ? 'selected' : ''}"
        onclick="AddMedicine.selectEfficacy('${e.value}')">
        <span class="emoji" style="color: var(--color-primary); display: inline-flex;">${Utils.getIconSvg(e.iconName, 'icon-lg')}</span>
        <span class="emoji-label">${e.label}</span>
      </button>
    `).join('');

    return `
      <h2 class="step-title">ข้อมูลเพิ่มเติม</h2>

      <div class="form-group">
        <label class="form-label">กินยานี้มานานเท่าไหร่?</label>
        <div class="selection-grid">${durationCards}</div>
      </div>

      <div class="form-group">
        <label class="form-label">รู้สึกอย่างไรหลังทานยานี้?</label>
        <div class="emoji-selector">${efficacyButtons}</div>
      </div>

      <div class="step-actions">
        <button class="btn btn-ghost" style="display: inline-flex; align-items: center; justify-content: center; gap: var(--space-xs);" onclick="AddMedicine.goToStep(2)">
          ${Utils.getIconSvg('chevronLeft', 'icon-sm')} ย้อนกลับ
        </button>
        <button class="btn btn-primary" style="display: inline-flex; align-items: center; justify-content: center; gap: var(--space-xs);" onclick="AddMedicine.goToStep(4)">
          ถัดไป ${Utils.getIconSvg('chevronRight', 'icon-sm')}
        </button>
      </div>
    `;
  },

  // ขั้นตอนที่ 4: สรุปข้อมูลทั้งหมดให้เช็คอีกรอบ
  renderStep4() {
    const med = this.formData.medicineId
      ? MedicineDB.medicines.find(m => m.id === this.formData.medicineId)
      : null;
    const medName = med ? `${med.nameTh} (${med.nameEn})` : this.formData.customName;

    const durationLabels = {
      new: 'เพิ่งเริ่มกิน', short: 'กินมาสักพัก',
      medium: 'กินมาต่อเนื่อง', long: 'กินเป็นประจำ'
    };
    const efficacyLabels = {
      good: `<span style="display: inline-flex; align-items: center; gap: 4px; color: var(--color-primary); vertical-align: middle;">${Utils.getIconSvg('smile', 'icon-sm')} ดีขึ้น</span>`,
      neutral: `<span style="display: inline-flex; align-items: center; gap: 4px; color: var(--color-primary); vertical-align: middle;">${Utils.getIconSvg('meh', 'icon-sm')} เหมือนเดิม</span>`,
      bad: `<span style="display: inline-flex; align-items: center; gap: 4px; color: var(--color-primary); vertical-align: middle;">${Utils.getIconSvg('frown', 'icon-sm')} แย่ลง</span>`
    };

    const timeSlotsText = this.formData.timeSlots.length > 0
      ? this.formData.timeSlots.map(s => Utils.getTimeSlotInfo(s).nameTh).join(', ')
      : '-';

    return `
      <h2 class="step-title">ยืนยันข้อมูลยา</h2>

      <div class="card summary-card">
        <div class="summary-row">
          <span class="summary-label">ชื่อยา</span>
          <span class="summary-value">${medName}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">ขนาด</span>
          <span class="summary-value">${this.formData.dosageMg || '-'} mg</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">ช่วงเวลา</span>
          <span class="summary-value">${timeSlotsText}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">ทานสัมพันธ์อาหาร</span>
          <span class="summary-value">${this.formData.mealTiming === 'before_meal' ? 'ก่อนอาหาร' : 'หลังอาหาร'}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">วันสิ้นสุดการทานยา</span>
          <span class="summary-value">${this.formData.stopDate ? Utils.formatThaiDateShort(this.formData.stopDate) : 'ทานต่อเนื่อง'}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">ประเภท</span>
          <span class="summary-value">${this.formData.type === 'regular' ? `<span style="display: inline-flex; align-items: center; gap: 4px; color: var(--color-primary); vertical-align: middle;">${Utils.getIconSvg('pill', 'icon-sm')} ยาประจำ</span>` : `<span style="display: inline-flex; align-items: center; gap: 4px; color: var(--color-primary); vertical-align: middle;">${Utils.getIconSvg('syringe', 'icon-sm')} ยาเฉพาะกิจ</span>`}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">ระยะเวลา</span>
          <span class="summary-value">${durationLabels[this.formData.duration] || '-'}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">ความรู้สึก</span>
          <span class="summary-value">${efficacyLabels[this.formData.efficacy] || '-'}</span>
        </div>
      </div>

      <div class="step-actions">
        <button class="btn btn-ghost" style="display: inline-flex; align-items: center; justify-content: center; gap: var(--space-xs);" onclick="AddMedicine.goToStep(3)">
          ${Utils.getIconSvg('chevronLeft', 'icon-sm')} แก้ไข
        </button>
        <button class="btn btn-primary btn-full" style="display: flex; align-items: center; justify-content: center; gap: var(--space-sm);" onclick="AddMedicine.saveMedicine()">
          ${Utils.getIconSvg('pill', 'icon-sm')} บันทึกยา
        </button>
      </div>
    `;
  },

  // จัดการสิ่งที่ผู้ใช้กดบนหน้าจอ
  selectMethod(method) {
    this.formData.method = method;
    this.formData.scannedSuccessfully = false; // Reset scan flag
    this.goToStep(2);
  },

  // จำลองระบบสแกนด้วยกล้อง AI
  simulateScan() {
    const scannerView = document.getElementById('scanner-view');
    if (!scannerView) return;

    // แสดง loading animation
    scannerView.innerHTML = `
      <div class="scanner-loading">
        <div class="loading-dots">
          <div class="loading-dot"></div>
          <div class="loading-dot"></div>
          <div class="loading-dot"></div>
        </div>
        <p class="scanner-loading-text">กำลังสแกน...</p>
      </div>
    `;

    // จำลอง delay → เลือกยาแบบสุ่ม → แสดงผล
    setTimeout(() => {
      const pool = MedicineDB.medicines.slice(0, Math.min(5, MedicineDB.medicines.length));
      const randomMed = pool[Math.floor(Math.random() * pool.length)];

      this.formData.medicineId = randomMed.id;
      this.formData.dosageMg = randomMed.commonDosages[0];
      this.formData.method = 'manual'; // สลับไปโหมดแก้ไขข้อมูล
      this.formData.scannedSuccessfully = true; // Set scan flag

      // Auto-select current time slot
      const currentSlot = Utils.getCurrentTimeSlot();
      if (!this.formData.timeSlots.includes(currentSlot)) {
        this.formData.timeSlots = [currentSlot];
      }

      // บันทึกประวัติการสแกน
      const state = App.getState();
      const newScan = {
        id: 'scan_' + Date.now(),
        timestamp: new Date().toISOString(),
        medicineName: `${randomMed.nameTh} (${randomMed.nameEn})`,
        medicineId: randomMed.id,
        dosageMg: randomMed.commonDosages[0],
        status: 'scanned_only'
      };
      const scanHistory = [newScan, ...(state.scanHistory || [])];
      App.updateState('scanHistory', scanHistory);

      Utils.showToast('สแกนสำเร็จ!', 'success');
      
      // เล่นเสียงยืนยันสแกนสำเร็จ
      Utils.speak("สแกนซองยาสำเร็จ ตรวจพบยา " + randomMed.nameTh + " ค่ะ");
      
      this.goToStep(2); // แสดงฟอร์มพร้อมข้อมูลที่สแกนได้
    }, 2000);
  },

  // ดึงรายชื่อยามาโชว์ตอนคนไข้พิมพ์ค้นหา
  onSearchInput(query) {
    const resultsDiv = document.getElementById('autocomplete-results');
    if (!resultsDiv) return;

    if (!query || query.length < 1) {
      resultsDiv.style.display = 'none';
      this.formData.customName = query || '';
      return;
    }

    this.formData.customName = query;
    const matches = Utils.searchMedicines(query);

    if (matches.length === 0) {
      resultsDiv.style.display = 'none';
      return;
    }

    resultsDiv.innerHTML = matches.map(med => `
      <div class="autocomplete-item" onclick="AddMedicine.selectMedicine('${med.id}')">
        <strong>${med.nameTh}</strong> (${med.nameEn})
        <br><small>${med.category}</small>
      </div>
    `).join('');
    resultsDiv.style.display = 'block';
  },

  // กดเลือกยาจากรายชื่อที่เด้งขึ้นมา
  selectMedicine(medId) {
    const med = MedicineDB.medicines.find(m => m.id === medId);
    if (!med) return;
    this.formData.medicineId = medId;
    this.formData.dosageMg = med.commonDosages[0];
    this.renderStep();
  },

  // สลับการติ๊กเลือกช่วงเวลาทานยา
  toggleTimeSlot(slot) {
    const idx = this.formData.timeSlots.indexOf(slot);
    if (idx >= 0) {
      this.formData.timeSlots.splice(idx, 1);
    } else {
      this.formData.timeSlots.push(slot);
    }
    this.renderStep();
  },

  // ติ๊กประเภท (กินประจำ หรือ กินเฉพาะตอนมีอาการ)
  selectType(type) {
    this.formData.type = type;
    this.renderStep();
  },

  // เลือกระยะเวลาที่เคยกินยาตัวนี้มา
  selectDuration(dur) {
    this.formData.duration = dur;
    this.renderStep();
  },

  // ติ๊กความรู้สึกหลังกิน
  selectEfficacy(eff) {
    this.formData.efficacy = eff;
    this.renderStep();
  },

  selectMealTiming(val) {
    this.formData.mealTiming = val;
    this.renderStep();
  },

  // สลับหน้าขั้นตอน
  goToStep(step) {
    this.currentStep = step;
    this.renderStep();
    const pageAdd = document.getElementById('page-add');
    if (pageAdd) {
      pageAdd.scrollTop = 0;
    }
  },

  // แสดงป๊อปอัพอธิบายเรื่องเลขล็อตผลิต
  showLotHelp() {
    Utils.showModal('lot-help-modal');
  },

  // เซฟข้อมูลยาลงเครื่อง และเช็คว่ายาตีกันไหม
  saveMedicine() {
    const med = this.formData.medicineId
      ? MedicineDB.medicines.find(m => m.id === this.formData.medicineId)
      : null;

    const newMed = {
      id: Utils.generateId(),
      medicineId: this.formData.medicineId || 'custom',
      dosageMg: this.formData.dosageMg,
      type: this.formData.type,
      timeSlots: this.formData.timeSlots.length > 0 ? this.formData.timeSlots : ['morning'],
      mealTiming: this.formData.mealTiming || 'after_meal',
      stopDate: this.formData.stopDate || '',
      status: 'active',
      duration: this.formData.duration || 'new',
      efficacy: this.formData.efficacy || 'neutral',
      addedDate: new Date().toISOString().split('T')[0],
      pillColor: med ? med.pillColor : '#90A4AE'
    };

    // ตรวจสอบประวัติการแพ้ยา
    const state = App.getState();
    const allergies = state.allergyLog || [];
    const medName = med ? `${med.nameTh} (${med.nameEn})` : this.formData.customName;

    const matchedAllergies = allergies.filter(allergy => {
      if (this.formData.medicineId && allergy.medicineId !== 'custom' && allergy.medicineId === this.formData.medicineId) {
        return true;
      }
      const query = allergy.medicineName.toLowerCase();
      const targetEn = med ? med.nameEn.toLowerCase() : '';
      const targetTh = med ? med.nameTh.toLowerCase() : '';
      const targetCustom = this.formData.customName.toLowerCase();
      return (targetEn.includes(query) || targetTh.includes(query) || targetCustom.includes(query));
    });

    if (matchedAllergies.length > 0) {
      const severityOrder = { severe: 0, moderate: 1, mild: 2 };
      matchedAllergies.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
      const worstAllergy = matchedAllergies[0];

      // เปิดโมดอลเตือนแพ้ยา
      App.openAllergyWarningModal(
        medName, 
        worstAllergy.severity, 
        worstAllergy.symptoms,
        "AddMedicine.bypassAllergyAndSave",
        "AddMedicine.cancelSave"
      );
      this._pendingMedToSave = newMed;
    } else {
      this.executeSave(newMed);
    }
  },

  executeSave(newMed) {
    const state = App.getState();
    const myMedicines = [...state.myMedicines, newMed];
    App.setState({ myMedicines });

    // ตรวจสอบยาตีกัน
    const interactions = Utils.checkInteractions(newMed.medicineId, state.myMedicines);

    if (interactions.length > 0) {
      App._lastInteractions = interactions;
      App._lastAddedMed = newMed;
      Utils.showToast('พบยาที่อาจตีกัน!', 'warning');
      Utils.playAlarm();
      Utils.speak("คำเตือนภัย ตรวจพบการใช้ยาตีกันในระบบค่ะ กรุณาตรวจสอบรายละเอียดความปลอดภัย");
      App.navigate('analysis');
    } else {
      Utils.showToast('บันทึกยาสำเร็จ! ไม่พบยาตีกัน', 'success');
      Utils.speak("บันทึกข้อมูลยาเข้าตู้ยาเรียบร้อยแล้วค่ะ");
      App.navigate('dashboard');
    }
    this._pendingMedToSave = null;
  },

  bypassAllergyAndSave() {
    if (this._pendingMedToSave) {
      this.executeSave(this._pendingMedToSave);
    }
  },

  cancelSave() {
    this._pendingMedToSave = null;
    Utils.showToast('ยกเลิกการบันทึกเนื่องจากข้อมูลการแพ้ยา', 'info');
  },

  /** เลือกขนาดยาจากปุ่มแนะนำ */
  selectDosage(d) {
    this.formData.dosageMg = Number(d);
    
    // อัปเดตค่าในกล่องพิมพ์
    const input = document.getElementById('dosage-input');
    if (input) {
      input.value = d;
    }
    
    // อัปเดตคลาส active ของปุ่มลัด
    const chips = document.querySelectorAll('.dosage-chip');
    chips.forEach(chip => {
      const chipDose = Number(chip.textContent.replace(' mg', ''));
      if (chipDose === d) {
        chip.classList.add('active');
      } else {
        chip.classList.remove('active');
      }
    });
  },

  /** กรอกขนาดยาเอง */
  onDosageInput(val) {
    this.formData.dosageMg = val ? Number(val) : null;
    
    // อัปเดตคลาส active ของปุ่มลัดตามค่าที่พิมพ์โดยไม่เรนเดอร์ใหม่ เพื่อป้องกันโฟกัสหลุด
    const numVal = Number(val);
    const chips = document.querySelectorAll('.dosage-chip');
    chips.forEach(chip => {
      const chipDose = Number(chip.textContent.replace(' mg', ''));
      if (chipDose === numVal) {
        chip.classList.add('active');
      } else {
        chip.classList.remove('active');
      }
    });
  },

  // เอาไว้ดักจับพวก event เพิ่มเติมในอนาคต
  attachStepListeners() {
    // placeholder สำหรับ event listener พิเศษที่ต้องผูกหลัง render
  }
};
