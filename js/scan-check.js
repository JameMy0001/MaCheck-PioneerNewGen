// ระบบสแกนซองยาจำลองเพื่อเช็กยาตีกันและแพ้ยา (AI Medication Safety Scanner Simulator)
// ออกแบบโดยรักษาสไตล์ UX/UI ดั้งเดิมของ YaCheck 100%

const ScanCheck = {
  activeCase: 'case1', // 'case1' | 'case2' | 'case3' | 'case4' | 'unknown'
  isScanning: false,
  result: null,

  render() {
    const container = document.querySelector('#page-scan-check .page-content');
    if (!container) return;

    const state = App.getState();
    const fontOffset = state.user.fontSize === 'large' ? 1.15 : (state.user.fontSize === 'xlarge' ? 1.35 : 1.0);

    let mainHtml = '';

    if (this.isScanning) {
      // หน้าจอกำลังสแกน (Loading)
      mainHtml = `
        <div class="scanner-overlay" style="height: 240px; background: #000; border-radius: var(--radius-lg); display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; overflow: hidden; margin-bottom: var(--space-md);">
          <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #FFF; flex-direction: column; gap: var(--space-md);">
            <div class="scanner-loading" style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
              <div style="border: 4px solid rgba(255,255,255,0.3); border-top: 4px solid var(--color-safe); border-radius: 50%; width: 44px; height: 44px; animation: spin 1s linear infinite;"></div>
              <p style="font-size: calc(1.05rem * ${fontOffset}); font-weight: 600; color: #FFF; margin-top: var(--space-sm);">กำลังวิเคราะห์ภาพซองยาด้วย AI ออฟไลน์...</p>
            </div>
          </div>
          <div style="position: absolute; width: 100%; height: 4px; background: var(--color-safe); top: 0; left: 0; box-shadow: 0 0 10px var(--color-safe); animation: scanLine 1.8s ease-in-out infinite;"></div>
        </div>
      `;
    } else if (this.result) {
      // หน้าจอแสดงผลลัพธ์การสแกน
      const r = this.result;
      const isSevere = r.severity === 'red';
      const isModerate = r.severity === 'yellow';
      const alertClass = isSevere ? 'alert-danger' : (isModerate ? 'alert-warning' : 'alert-safe');
      const alertIcon = isSevere ? Utils.getIconSvg('emergency', 'icon-lg') : (isModerate ? Utils.getIconSvg('alertTriangle', 'icon-lg') : Utils.getIconSvg('checkCircle', 'icon-lg'));
      const severityLabel = isSevere ? 'ห้ามรับประทานร่วมกัน' : (isModerate ? 'โปรดสอบถามแพทย์หรือเภสัชกรก่อน' : 'ยังไม่พบคู่ยาที่ตรงกัน');

      mainHtml = `
        <div class="alert-card ${alertClass}" style="animation: slideUp 0.4s ease; text-align: left; padding: var(--space-md); border-radius: var(--radius-lg); margin-bottom: var(--space-md);">
          <div class="alert-icon" style="text-align: center; margin-bottom: var(--space-sm);">${alertIcon}</div>
          <h2 class="alert-title" style="text-align: center; font-size: calc(1.3rem * ${fontOffset});">${severityLabel}</h2>
          <h3 class="alert-subtitle" style="text-align: center; font-size: calc(1.05rem * ${fontOffset}); color: var(--color-text); margin-bottom: var(--space-md);">${r.nameTh} (${r.nameEn})</h3>

          <div style="font-size: calc(0.95rem * ${fontOffset}); line-height: 1.6; color: var(--color-text-secondary); background: rgba(255, 255, 255, 0.5); padding: var(--space-md); border-radius: var(--radius-md); border: 1px solid var(--color-border); margin-bottom: var(--space-md);">
            <strong>รายละเอียดความปลอดภัย:</strong><br>
            ${r.descTh}
          </div>

          <div class="recommendation-section" style="margin-top: 12px; margin-bottom: 8px;">
            <h4 style="display: flex; align-items: center; gap: 6px; font-size: calc(0.95rem * ${fontOffset}); margin-bottom: var(--space-xs); font-weight:700;">
              ${Utils.getIconSvg('sparkles', 'icon-sm', 'color: var(--color-primary)')}
              ข้อเสนอแนะความปลอดภัย:
            </h4>
            <ul style="padding-left: 20px; font-size: calc(0.9rem * ${fontOffset}); line-height: 1.55; color: var(--color-text-secondary);">
              ${isSevere ? `
                <li style="margin-bottom: 4px;">❌ <strong>ห้ามนำยากล่องนี้มาทานร่วมกับยาปัจจุบัน</strong></li>
                <li style="margin-bottom: 4px;">🩺 โปรดติดต่อแพทย์หรือเภสัชกรทันทีเพื่อตรวจสอบความปลอดภัย</li>
              ` : isModerate ? `
                <li style="margin-bottom: 4px;">⚠️ <strong>อย่ารับประทานยาคู่นี้ร่วมกันในตอนนี้</strong></li>
                <li style="margin-bottom: 4px;">🩺 สอบถามแพทย์หรือเภสัชกรให้แน่ใจก่อน</li>
              ` : `
                <li style="margin-bottom: 4px;">🟢 ใช้ตามฉลากหรือคำสั่งแพทย์ ผลนี้ไม่ใช่การรับรองความปลอดภัย</li>
              `}
            </ul>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: var(--space-sm); width: 100%;">
          ${r.severity === 'green' && r.medicineId ? `
            <button class="btn btn-primary btn-full" onclick="ScanCheck.addScannedToCabinet('${r.medicineId}')" style="background-color: var(--color-safe); border-color: var(--color-safe); display: flex; align-items: center; justify-content: center; gap: 6px;">
              ${Utils.getIconSvg('plus', 'icon-sm')} นำเข้าตู้ยาของคุณ
            </button>
          ` : ''}
          <div style="display: flex; gap: var(--space-sm); width: 100%;">
            <button class="btn btn-outline" style="flex: 1;" onclick="ScanCheck.resetScan()">
              สแกนซองอื่น
            </button>
            <button class="btn btn-primary" style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px;" onclick="App.navigate('dashboard')">
              ${Utils.getIconSvg('home', 'icon-sm')} กลับหน้าแรก
            </button>
          </div>
        </div>
      `;
    } else {
      // หน้าจอปกติสำหรับเลือกเคสทดสอบและเริ่มสแกน
      mainHtml = `
        <div class="card" style="padding: var(--space-md); border-radius: var(--radius-lg); background: var(--color-surface); box-shadow: var(--shadow-sm); border: 1.5px solid var(--color-border); margin-bottom: var(--space-md); text-align: left;">
          <h3 style="font-size: calc(1.1rem * ${fontOffset}); font-weight: 700; color: var(--color-primary); margin-bottom: var(--space-sm);">เลือกตัวอย่างซองยาที่จะส่งเข้ากล้อง:</h3>
          <p class="text-secondary" style="font-size: calc(0.9rem * ${fontOffset}); margin-bottom: var(--space-md); line-height: 1.45;">
            เนื่องจากรันอยู่บนเบราว์เซอร์ หลานทำปุ่มจำลองการเปลี่ยนซองยาต่าง ๆ มาให้เลือกจำลองสถานการณ์การสแกนครับ
          </p>

          <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: var(--space-lg);">
            <label class="role-card ${this.activeCase === 'case1' ? 'selected' : ''}" style="display: flex; align-items: center; gap: 10px; padding: 12px; border: 1.5px solid ${this.activeCase === 'case1' ? 'var(--color-primary)' : 'var(--color-border)'}; border-radius: var(--radius-md); cursor: pointer; background: ${this.activeCase === 'case1' ? 'var(--color-primary-light)' : 'none'};" onclick="ScanCheck.setCase('case1')">
              <input type="radio" name="case" value="case1" ${this.activeCase === 'case1' ? 'checked' : ''} style="display:none">
              <span style="font-size: 1.3rem;">💊</span>
              <div>
                <strong style="font-size: 0.95rem; color: var(--color-text);">กรณีที่ 1: ซองยาไอบูโพรเฟน (Ibuprofen)</strong>
                <p style="margin: 2px 0 0 0; font-size: 0.8rem; color: var(--color-text-muted);">ทดสอบเคสยาตีกันรุนแรง (เมื่อในตู้มีวาร์ฟาริน / แอสไพริน)</p>
              </div>
            </label>

            <label class="role-card ${this.activeCase === 'case2' ? 'selected' : ''}" style="display: flex; align-items: center; gap: 10px; padding: 12px; border: 1.5px solid ${this.activeCase === 'case2' ? 'var(--color-primary)' : 'var(--color-border)'}; border-radius: var(--radius-md); cursor: pointer; background: ${this.activeCase === 'case2' ? 'var(--color-primary-light)' : 'none'};" onclick="ScanCheck.setCase('case2')">
              <input type="radio" name="case" value="case2" ${this.activeCase === 'case2' ? 'checked' : ''} style="display:none">
              <span style="font-size: 1.3rem;">💊</span>
              <div>
                <strong style="font-size: 0.95rem; color: var(--color-text);">กรณีที่ 2: ซองยาลดความดัน (Amlodipine)</strong>
                <p style="margin: 2px 0 0 0; font-size: 0.8rem; color: var(--color-text-muted);">ทดสอบเคสที่ยังไม่พบคู่ยาที่ตรงกัน (ไม่ใช่การรับรองว่าปลอดภัย)</p>
              </div>
            </label>

            <label class="role-card ${this.activeCase === 'case3' ? 'selected' : ''}" style="display: flex; align-items: center; gap: 10px; padding: 12px; border: 1.5px solid ${this.activeCase === 'case3' ? 'var(--color-primary)' : 'var(--color-border)'}; border-radius: var(--radius-md); cursor: pointer; background: ${this.activeCase === 'case3' ? 'var(--color-primary-light)' : 'none'};" onclick="ScanCheck.setCase('case3')">
              <input type="radio" name="case" value="case3" ${this.activeCase === 'case3' ? 'checked' : ''} style="display:none">
              <span style="font-size: 1.3rem;">💊</span>
              <div>
                <strong style="font-size: 0.95rem; color: var(--color-text);">กรณีที่ 3: ซองยาไอบูโพรเฟน (Ibuprofen)</strong>
                <p style="margin: 2px 0 0 0; font-size: 0.8rem; color: var(--color-text-muted);">ทดสอบเคสตรวจพบข้อควรระวังปานกลาง (ให้ทานห่างกัน 2 ชม.)</p>
              </div>
            </label>

            <label class="role-card ${this.activeCase === 'case4' ? 'selected' : ''}" style="display: flex; align-items: center; gap: 10px; padding: 12px; border: 1.5px solid ${this.activeCase === 'case4' ? 'var(--color-primary)' : 'var(--color-border)'}; border-radius: var(--radius-md); cursor: pointer; background: ${this.activeCase === 'case4' ? 'var(--color-primary-light)' : 'none'};" onclick="ScanCheck.setCase('case4')">
              <input type="radio" name="case" value="case4" ${this.activeCase === 'case4' ? 'checked' : ''} style="display:none">
              <span style="font-size: 1.3rem;">⚠️</span>
              <div>
                <strong style="font-size: 0.95rem; color: var(--color-text);">กรณีที่ 4: ซองยาที่มีประวัติแพ้ยา (Allergy)</strong>
                <p style="margin: 2px 0 0 0; font-size: 0.8rem; color: var(--color-text-muted);">ทดสอบสแกนแล้วเจอประวัติเคยแพ้ยาตัวนี้มาก่อนในข้อมูลประวัติ</p>
              </div>
            </label>

            <label class="role-card ${this.activeCase === 'unknown' ? 'selected' : ''}" style="display: flex; align-items: center; gap: 10px; padding: 12px; border: 1.5px solid ${this.activeCase === 'unknown' ? 'var(--color-primary)' : 'var(--color-border)'}; border-radius: var(--radius-md); cursor: pointer; background: ${this.activeCase === 'unknown' ? 'var(--color-primary-light)' : 'none'};" onclick="ScanCheck.setCase('unknown')">
              <input type="radio" name="case" value="unknown" ${this.activeCase === 'unknown' ? 'checked' : ''} style="display:none">
              <span style="font-size: 1.3rem;">❓</span>
              <div>
                <strong style="font-size: 0.95rem; color: var(--color-text);">กรณีอื่น ๆ: ซองยาไม่ชัดเจน / ไม่มีในคลัง</strong>
                <p style="margin: 2px 0 0 0; font-size: 0.8rem; color: var(--color-text-muted);">ทดสอบสแกนแล้วอ่านบาร์โค้ดไม่สำเร็จ หรือไม่มีข้อมูลในระบบ</p>
              </div>
            </label>
          </div>

          <button class="btn btn-primary btn-full" style="display: flex; align-items: center; justify-content: center; gap: var(--space-sm);" onclick="ScanCheck.startScanning()">
            ${Utils.getIconSvg('camera', 'icon-sm')} เริ่มต้นถ่ายรูปสแกนจำลอง
          </button>
        </div>
      `;
    }

    container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-md);">
        <h2 class="page-title" style="display: flex; align-items: center; gap: var(--space-sm); margin: 0; font-size: calc(1.4rem * ${fontOffset});">
          📸 สแกนเช็กปฏิกิริยายา
        </h2>
        <button class="btn btn-ghost" style="padding: 6px 12px; height: auto; font-size: calc(0.9rem * ${fontOffset});" onclick="App.navigate('dashboard')">
          ← กลับ
        </button>
      </div>

      <div id="scan-check-body">
        ${mainHtml}
      </div>
    `;
  },

  setCase(caseId) {
    this.activeCase = caseId;
    this.render();
  },

  startScanning() {
    this.isScanning = true;
    this.render();
    Utils.speak("กำลังสแกนซองยาเพื่อวิเคราะห์ความปลอดภัย กรุณารอสักครู่นะคะ");

    setTimeout(() => {
      this.isScanning = false;
      this.analyzeScanResult();
    }, 2000);
  },

  analyzeScanResult() {
    const state = App.getState();
    const myMeds = state.myMedicines || [];
    const allergyLog = state.allergyLog || [];

    let caseResult = {};

    if (this.activeCase === 'case1') {
      // Ibuprofen scanned, clashes with warfarin/aspirin (severe)
      caseResult = {
        medicineId: 'ibuprofen',
        nameTh: 'ไอบูโพรเฟน',
        nameEn: 'Ibuprofen',
        severity: 'red',
        descTh: 'ห้ามรับประทานยาคู่นี้ร่วมกัน ระบบไม่แสดงรายละเอียดผลกระทบเพื่อความปลอดภัย อย่าปรับหรือหยุดยาเดิมเอง ให้ติดต่อแพทย์หรือเภสัชกรทันที',
        speechTh: 'อันตรายค่ะ ยาไอบูโพรเฟนที่สแกนนี้ห้ามทานร่วมกับยาในตู้ยานะคะ'
      };
    } else if (this.activeCase === 'case2') {
      // Amlodipine scanned, safe to take
      caseResult = {
        medicineId: 'amlodipine',
        nameTh: 'แอมโลดิพีน',
        nameEn: 'Amlodipine',
        severity: 'green',
        descTh: 'ยังไม่พบคู่ยาที่ตรงกันในข้อมูลปัจจุบัน แต่ผลนี้ไม่ใช่การยืนยันว่ายาปลอดภัยสำหรับทุกคน',
        speechTh: 'ยังไม่พบคู่ยาที่ตรงกันค่ะ กรุณาใช้ตามฉลากหรือคำสั่งแพทย์และสอบถามเภสัชกรเมื่อไม่แน่ใจค่ะ'
      };
    } else if (this.activeCase === 'case3') {
      // Ibuprofen scanned, moderate caution
      caseResult = {
        medicineId: 'ibuprofen',
        nameTh: 'ไอบูโพรเฟน',
        nameEn: 'Ibuprofen',
        severity: 'yellow',
        descTh: 'โปรดสอบถามแพทย์หรือเภสัชกรก่อนใช้ยาคู่นี้ร่วมกัน ระบบไม่แสดงรายละเอียดผลกระทบเพื่อความปลอดภัย',
        speechTh: 'อย่ารับประทานยาคู่นี้ร่วมกันจนกว่าจะสอบถามแพทย์หรือเภสัชกรค่ะ'
      };
    } else if (this.activeCase === 'case4') {
      // Scanned medicine has allergy log match (severe)
      caseResult = {
        medicineId: 'aspirin',
        nameTh: 'แอสไพริน',
        nameEn: 'Aspirin',
        severity: 'red',
        descTh: '🚨 ตรวจพบประวัติแพ้ยา! ยาตัวนี้มีตัวยาขัดกับประวัติการแพ้ยาที่บันทึกไว้ในฐานข้อมูล ห้ามทานเด็ดขาด',
        speechTh: 'อันตรายสูงสุดค่ะ ตรวจพบว่ามีประวัติแพ้ยาตัวนี้นะคะ ห้ามทานโดยเด็ดขาดค่ะ'
      };
    } else {
      // unknown sachet
      caseResult = {
        medicineId: null,
        nameTh: 'ซองยาไม่ทราบชนิด',
        nameEn: 'Unknown Medicine',
        severity: 'red',
        descTh: 'ขออภัยค่ะ ระบบสแกนไม่สามารถตรวจสอบตัวยาตัวนี้ได้เนื่องจากข้อมูลบาร์โค้ดไม่ชัดเจน หรือไม่มีระบุในคลังยา',
        speechTh: 'ขออภัยค่ะ ไม่พบข้อมูลซองยาตัวนี้ในระบบค่ะ'
      };
    }

    this.result = caseResult;
    this.render();

    if (caseResult.severity === 'red') {
      Utils.playAlarm();
    }
    Utils.speak(caseResult.speechTh);

    // บันทึกลง scanHistory
    if (caseResult.medicineId) {
      const newScan = {
        id: 'scan_' + Date.now(),
        timestamp: new Date().toISOString(),
        medicineName: `${caseResult.nameTh} (${caseResult.nameEn})`,
        medicineId: caseResult.medicineId,
        dosageMg: 500, // mock dosage
        status: 'scanned_only'
      };
      const scanHistory = [newScan, ...(state.scanHistory || [])];
      App.updateState('scanHistory', scanHistory);
    }
  },

  addScannedToCabinet(medId) {
    if (!medId) return;
    const dbMed = MedicineDB.medicines.find(m => m.id === medId);
    if (!dbMed) return;

    // เปิดหน้าเพิ่มยาขั้นตอนกรอกฟอร์มพร้อมใส่ข้อมูลออโต้
    AddMedicine.formData.method = 'manual';
    AddMedicine.formData.medicineId = medId;
    AddMedicine.formData.dosageMg = dbMed.commonDosages[0];
    AddMedicine.formData.scannedSuccessfully = true;

    // เลือกช่วงเวลาปัจจุบัน
    const currentSlot = Utils.getCurrentTimeSlot();
    AddMedicine.formData.timeSlots = [currentSlot];

    App.navigate('add');
    AddMedicine.goToStep(2);
    Utils.showToast('ดึงข้อมูลยาเข้าสู่ขั้นตอนกรอกตู้ยาแล้วค่ะ', 'success');
  },

  resetScan() {
    this.result = null;
    this.isScanning = false;
    this.render();
  }
};
