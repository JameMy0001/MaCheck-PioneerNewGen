// หน้าตู้ยาของฉัน แสดงรายการยาทั้งหมด แยกตามการกิน และสามารถเปิดให้หมอดูได้เต็มจอ
const Cabinet = {

  // แท็บปัจจุบัน: ยาประจำ หรือ ยาเฉพาะกิจ
  currentTab: 'regular',

  // วาดหน้าหลักตู้ยา

  render() {
    const container = document.querySelector('#page-cabinet .page-content');
    if (!container) return;

    const state = App.getState();

    // วาดหัวข้อและแท็บเมนู
    let html = `
      <h2 class="page-title" style="display: flex; align-items: center; gap: var(--space-sm);">
        ${Utils.getIconSvg('pill', 'icon-md')}
        ตู้ยาของฉัน
      </h2>

      <div class="tab-container">
        <button class="tab-btn ${this.currentTab === 'regular' ? 'active' : ''}"
          onclick="Cabinet.switchTab('regular')">ยาประจำ</button>
        <button class="tab-btn ${this.currentTab === 'occasional' ? 'active' : ''}"
          onclick="Cabinet.switchTab('occasional')">ยาเฉพาะกิจ</button>
      </div>
    `;

    // แยกเฉพาะยากำลังทาน และยาที่หยุดทานแล้ว
    const activeMeds = (state.myMedicines || []).filter(m => m.type === this.currentTab && m.status !== 'stopped');
    const stoppedMeds = (state.myMedicines || []).filter(m => m.type === this.currentTab && m.status === 'stopped');

    if (activeMeds.length === 0) {
      // หน้าตาตอนไม่มีรายการยา
      html += `
        <div class="empty-state">
          <p class="empty-icon" style="color: var(--color-primary); margin-bottom: var(--space-md);">${Utils.getIconSvg('pill', 'icon-xl')}</p>
          <p class="empty-text">ยังไม่มียากำลังทานในหมวดนี้</p>
        </div>
      `;
    } else {
      // ดึงรายการยามาแสดง
      html += '<div class="medicine-list">';
      activeMeds.forEach(med => {
        const dbMed = MedicineDB.medicines.find(m => m.id === med.medicineId);
        if (!dbMed) return;

        const durationLabels = {
          new: 'เพิ่งเริ่มกิน', short: '1-4 สัปดาห์',
          medium: '1-6 เดือน', long: '6+ เดือน'
        };
        const efficacyEmoji = {
          good: Utils.getIconSvg('smile', 'icon-sm text-safe'),
          neutral: Utils.getIconSvg('meh', 'icon-sm text-warning'),
          bad: Utils.getIconSvg('frown', 'icon-sm text-danger')
        };
        
        const mealText = med.mealTiming === 'before_meal' ? 'ก่อนอาหาร' : 'หลังอาหาร';

        html += `
          <div class="cabinet-medicine-card card" onclick="Cabinet.showDetail('${med.id}')">
            <div class="pill-icon" style="background-color: ${med.pillColor || dbMed.pillColor}">
              ${Utils.getIconSvg('pill')}
            </div>
            <div class="medicine-info">
              <h3 class="medicine-name">${dbMed.category}</h3>
              <p class="medicine-name-en">${dbMed.nameTh} (${dbMed.nameEn}) ${med.dosageMg}mg <span class="meal-badge ${med.mealTiming === 'before_meal' ? 'before-meal' : 'after-meal'}" style="margin-top:0; font-size:0.7rem; padding: 1px 5px;">${mealText}</span></p>
              <div class="medicine-meta">
                <span class="duration-badge">${durationLabels[med.duration] || ''}</span>
                <span class="efficacy-emoji" style="display: inline-flex; align-items: center;">${efficacyEmoji[med.efficacy] || ''}</span>
              </div>
            </div>
            <span class="card-arrow">${Utils.getIconSvg('chevronRight', 'icon-sm')}</span>
          </div>
        `;
      });
      html += '</div>';
    }

    // แสดงรายการยาที่หยุดทานแล้ว (ถ้ามี)
    if (stoppedMeds.length > 0) {
      html += `
        <div class="stopped-medicine-section" style="margin-top: 24px;">
          <h3 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 12px; color: var(--color-text-secondary); display: flex; align-items: center; gap: 8px;">
            <span>🚫</span> รายการยาที่หยุดทานแล้ว (Stopped)
          </h3>
          <div class="medicine-list">
      `;
      stoppedMeds.forEach(med => {
        const dbMed = MedicineDB.medicines.find(m => m.id === med.medicineId);
        if (!dbMed) return;

        const roleLabels = { patient: 'คนไข้', caregiver: 'ผู้ดูแล', doctor: 'แพทย์' };
        const stopUser = roleLabels[med.stoppedBy] || 'ผู้ใช้';
        const stopDateStr = med.stoppedDate ? Utils.formatThaiDateShort(med.stoppedDate) : '';

        html += `
          <div class="cabinet-medicine-card card stopped" onclick="Cabinet.showDetail('${med.id}')" style="opacity: 0.65; border-left: 4px solid var(--color-text-muted); background: #f9f9f9;">
            <div class="pill-icon" style="background-color: var(--color-text-muted)">
              ${Utils.getIconSvg('pill')}
            </div>
            <div class="medicine-info">
              <h3 class="medicine-name" style="text-decoration: line-through; color: var(--color-text-muted);">${dbMed.category}</h3>
              <p class="medicine-name-en" style="color: var(--color-text-muted);">${dbMed.nameTh} (${dbMed.nameEn}) ${med.dosageMg}mg</p>
              <p class="medicine-desc" style="color: var(--color-text-muted);">ระงับโดย: ${stopUser} เมื่อ ${stopDateStr}</p>
            </div>
            <span class="card-arrow">${Utils.getIconSvg('chevronRight', 'icon-sm')}</span>
          </div>
        `;
      });
      html += '</div></div>';
    }

    // ปุ่มทางเลือกให้แพทย์ดูข้อมูลยาขยายเต็มจอ
    html += `
      <button class="btn btn-outline btn-full mt-lg" onclick="Cabinet.showDoctorView()" style="display: flex; align-items: center; justify-content: center; gap: var(--space-sm);">
        ${Utils.getIconSvg('user', 'icon-sm')}
        เปิดให้หมอดู (ขยายเต็มจอ)
      </button>
    `;

    container.innerHTML = html;
  },

  // สลับแท็บยากินประจำ / ยาเฉพาะกิจ

  switchTab(tab) {
    this.currentTab = tab;
    this.render();
  },

  // แสดงหน้าต่างรายละเอียดของยาแต่ละตัว (บานพับขึ้นจากขอบล่าง)

  showDetail(medId) {
    const state = App.getState();
    const med = state.myMedicines.find(m => m.id === medId);
    if (!med) return;

    const dbMed = MedicineDB.medicines.find(m => m.id === med.medicineId);
    if (!dbMed) return;

    const durationLabels = {
      new: 'เพิ่งเริ่มกิน', short: '1-4 สัปดาห์',
      medium: '1-6 เดือน', long: '6+ เดือน'
    };
    const efficacyLabels = {
      good: `<span style="display:inline-flex; align-items:center; gap:6px;">${Utils.getIconSvg('smile', 'icon-sm text-safe')} ดีขึ้น</span>`,
      neutral: `<span style="display:inline-flex; align-items:center; gap:6px;">${Utils.getIconSvg('meh', 'icon-sm text-warning')} เหมือนเดิม</span>`,
      bad: `<span style="display:inline-flex; align-items:center; gap:6px;">${Utils.getIconSvg('frown', 'icon-sm text-danger')} แย่ลง</span>`
    };

    const sheetContent = document.getElementById('detail-sheet-content');
    if (!sheetContent) return;

    // แสดงรายการช่วงเวลาทาน
    const timeSlotsText = (med.timeSlots || [])
      .map(s => Utils.getTimeSlotInfo(s).nameTh)
      .join(', ');

    const isStopped = med.status === 'stopped';
    let stopLogHtml = '';
    let actionButtonsHtml = '';

    if (state.currentRole === 'patient') {
      actionButtonsHtml = `
        <div style="text-align:center; padding: 16px; background: #F5F5F5; border-radius: var(--radius-md); color: var(--color-text-secondary); font-size: 0.95rem; margin-top: 20px; font-weight: 500; border: 1.5px dashed var(--color-border);">
          🔒 การแก้ไขข้อมูลยาถูกจำกัดสิทธิ์เฉพาะผู้ดูแล
        </div>
      `;
      if (isStopped) {
        const roleLabels = { patient: 'คนไข้', caregiver: 'ผู้ดูแล', doctor: 'แพทย์' };
        const stopUser = roleLabels[med.stoppedBy] || 'ผู้ใช้';
        const stopDateStr = med.stoppedDate ? Utils.formatThaiDateShort(med.stoppedDate) : '';
        stopLogHtml = `
          <div class="stop-warning-card" style="border-left: 5px solid var(--color-text-muted); background: #F5F5F5; padding: 12px; border-radius: var(--radius-md); margin-top: 16px; margin-bottom: 16px;">
            <div class="stop-warning-title" style="color: var(--color-text-secondary); font-weight: 700;">
              🛑 หยุดทานยาตัวนี้แล้ว
            </div>
            <div class="stop-warning-desc" style="font-size: 0.9rem; color: var(--color-text-muted); margin-top: 4px;">
              สั่งหยุดทานโดย: <strong>${stopUser}</strong> เมื่อ <strong>${stopDateStr}</strong>
            </div>
          </div>
        `;
      }
    } else if (isStopped) {
      const roleLabels = { patient: 'คนไข้', caregiver: 'ผู้ดูแล', doctor: 'แพทย์' };
      const stopUser = roleLabels[med.stoppedBy] || 'ผู้ใช้';
      const stopDateStr = med.stoppedDate ? Utils.formatThaiDateShort(med.stoppedDate) : '';
      stopLogHtml = `
        <div class="stop-warning-card" style="border-left: 5px solid var(--color-text-muted); background: #F5F5F5; padding: 12px; border-radius: var(--radius-md); margin-top: 16px; margin-bottom: 16px;">
          <div class="stop-warning-title" style="color: var(--color-text-secondary); font-weight: 700;">
            🛑 หยุดทานยาตัวนี้แล้ว
          </div>
          <div class="stop-warning-desc" style="font-size: 0.9rem; color: var(--color-text-muted); margin-top: 4px;">
            สั่งหยุดทานโดย: <strong>${stopUser}</strong> เมื่อ <strong>${stopDateStr}</strong>
          </div>
        </div>
      `;
      actionButtonsHtml = `
        <button class="btn btn-primary btn-full mt-lg" onclick="Cabinet.resumeMedicine('${med.id}')" style="display: flex; align-items: center; justify-content: center; gap: var(--space-sm); background-color: var(--color-safe); border-color: var(--color-safe);">
          🔄 กลับมาทานยาต่อ (เลิกทำ/กู้คืน)
        </button>
        <button class="btn btn-ghost btn-full mt-md text-danger" onclick="Cabinet.deleteMedicine('${med.id}')">
          ลบข้อมูลยาถาวร
        </button>
      `;
    } else {
      actionButtonsHtml = `
        <button class="btn btn-outline btn-full mt-lg" onclick="Cabinet.promptStopMedicine('${med.id}')" style="display: flex; align-items: center; justify-content: center; gap: var(--space-sm); border-color: #E65100; color: #E65100;">
          🚫 สั่งหยุดทานยานี้ (Stop Medication)
        </button>
        <button class="btn btn-ghost btn-full mt-md text-danger" onclick="Cabinet.deleteMedicine('${med.id}')">
          ลบยาออก
        </button>
      `;
    }

    sheetContent.innerHTML = `
      <div class="detail-header">
        <div class="pill-icon large" style="background-color: ${isStopped ? 'var(--color-text-muted)' : (med.pillColor || dbMed.pillColor)}">
          ${Utils.getIconSvg('pill')}
        </div>
        <h2>${dbMed.category}</h2>
        <p class="text-secondary">${dbMed.nameTh} (${dbMed.nameEn}) ${med.dosageMg}mg</p>
      </div>
      
      ${stopLogHtml}

      ${!isStopped ? `
        <button class="btn btn-outline btn-full" onclick="Utils.hideBottomSheet('detail-sheet'); App.startMedSpacing('${dbMed.nameTh}')" style="display: flex; align-items: center; justify-content: center; gap: var(--space-sm); border-color: var(--color-safe); color: var(--color-safe); margin-bottom: 16px; border-width: 1.5px; font-weight: 700;">
          💧 เริ่มภารกิจเว้นระยะยาและจิบน้ำ
        </button>
      ` : ''}
      
      <div class="detail-info">
        <div class="detail-row"><span>หมวดหมู่</span><span>${dbMed.category}</span></div>
        <div class="detail-row"><span>คำอธิบาย</span><span>${dbMed.description}</span></div>
        <div class="detail-row"><span>ช่วงเวลา</span><span>${timeSlotsText}</span></div>
        <div class="detail-row"><span>สัมพันธ์อาหาร</span><span>${med.mealTiming === 'before_meal' ? 'ก่อนอาหาร' : 'หลังอาหาร'}</span></div>
        <div class="detail-row"><span>วันหยุดยา</span><span>${med.stopDate ? Utils.formatThaiDateShort(med.stopDate) : 'ทานต่อเนื่อง'}</span></div>
        <div class="detail-row"><span>ระยะเวลา</span><span>${durationLabels[med.duration] || '-'}</span></div>
        <div class="detail-row"><span>ความรู้สึก</span><span>${efficacyLabels[med.efficacy] || '-'}</span></div>
        <div class="detail-row"><span>เพิ่มเมื่อ</span><span>${med.addedDate}</span></div>
      </div>
      
      ${actionButtonsHtml}
    `;

    Utils.showBottomSheet('detail-sheet');
  },

  deleteMedicine(medId) {
    const state = App.getState();
    const myMedicines = state.myMedicines.filter(m => m.id !== medId);
    App.setState({ myMedicines });

    Utils.hideBottomSheet('detail-sheet');
    Utils.showToast('ลบยาเรียบร้อยแล้ว', 'info');
    this.render();
  },

  promptStopMedicine(medId) {
    const state = App.getState();
    const med = state.myMedicines.find(m => m.id === medId);
    if (!med) return;

    const dbMed = MedicineDB.medicines.find(m => m.id === med.medicineId);
    if (!dbMed) return;

    const sheetContent = document.getElementById('detail-sheet-content');
    if (!sheetContent) return;

    const isEssential = ['aspirin', 'warfarin', 'clopidogrel', 'digoxin', 'amlodipine', 'enalapril', 'losartan', 'metformin', 'glipizide'].includes(med.medicineId);
    
    let warningHtml = '';
    if (isEssential) {
      warningHtml = `
        <div class="stop-warning-card" style="border-left: 5px solid var(--color-danger); background: #FFF3F3; padding: 16px; border-radius: var(--radius-md); margin-bottom: 20px;">
          <div class="stop-warning-title" style="color: var(--color-danger); font-weight: 700; font-size: 1.1rem; display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
            ⚠️ คำเตือน: ยานี้เป็นยาสำคัญยิ่งยวด!
          </div>
          <div class="stop-warning-desc" style="font-size: 0.95rem; color: #721C24; line-height: 1.5;">
            ยา <strong>${dbMed.nameTh} (${dbMed.category})</strong> จัดเป็นยาสำคัญหลักสำหรับดูแลโรคประจำตัว การหยุดยาเองกะทันหันอาจมีความเสี่ยงเป็นอันตรายรุนแรง โปรดแน่ใจว่าแพทย์อนุญาตให้หยุดยาแล้วจริงๆ
          </div>
        </div>
      `;
    }

    sheetContent.innerHTML = `
      <div class="detail-header">
        <h2 style="color: var(--color-danger); margin-bottom: 4px;">ยืนยันการหยุดทานยา</h2>
        <p class="text-secondary" style="font-size:0.95rem;">โปรดระบุผู้สั่งหยุดยาและข้อมูลยืนยัน</p>
      </div>

      ${warningHtml}

      <div class="form-group" style="margin-top: 16px;">
        <label class="form-label" style="font-weight:700;">ระบุผู้สั่งให้หยุดยา:</label>
        <div class="role-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 8px;">
          <div class="role-card selected" id="role-patient" onclick="Cabinet.selectStopRole('patient')" style="border: 2px solid var(--color-border); border-radius: var(--radius-md); padding: 12px 8px; text-align: center; cursor: pointer; font-weight: 600;">คนไข้</div>
          <div class="role-card" id="role-caregiver" onclick="Cabinet.selectStopRole('caregiver')" style="border: 2px solid var(--color-border); border-radius: var(--radius-md); padding: 12px 8px; text-align: center; cursor: pointer; font-weight: 600;">ผู้ดูแล</div>
          <div class="role-card" id="role-doctor" onclick="Cabinet.selectStopRole('doctor')" style="border: 2px solid var(--color-border); border-radius: var(--radius-md); padding: 12px 8px; text-align: center; cursor: pointer; font-weight: 600;">แพทย์</div>
        </div>
      </div>

      <div class="form-group" style="margin-top: 20px;">
        <label class="form-label" style="font-weight:700;">สาเหตุการหยุดยา:</label>
        <select class="form-input" id="stop-reason" style="width: 100%; height: 48px; border: 2px solid var(--color-border); border-radius: var(--radius-md); padding: 0 12px; font-size: 1rem; background-color: var(--color-bg);">
          <option value="doctor_ordered">สิ้นสุดระยะเวลาตามสั่งแพทย์</option>
          <option value="side_effects">มีอาการแพ้หรือผลข้างเคียง</option>
          <option value="recovered">อาการหายดีขึ้นแล้ว</option>
          <option value="other">อื่นๆ</option>
        </select>
      </div>

      <div class="step-actions" style="margin-top: 24px; display: flex; gap: 12px;">
        <button class="btn btn-ghost btn-full" onclick="Cabinet.showDetail('${medId}')">ยกเลิก</button>
        <button class="btn btn-danger btn-full" onclick="Cabinet.confirmStopMedicine('${medId}')" style="background-color: var(--color-danger); border-color: var(--color-danger);">ยืนยันหยุดยา</button>
      </div>
    `;
    
    this._selectedStopRole = 'patient';
  },

  selectStopRole(role) {
    this._selectedStopRole = role;
    const roles = ['patient', 'caregiver', 'doctor'];
    roles.forEach(r => {
      const btn = document.getElementById(`role-${r}`);
      if (btn) {
        if (r === role) {
          btn.classList.add('selected');
          btn.style.borderColor = 'var(--color-primary)';
          btn.style.backgroundColor = 'rgba(46, 125, 111, 0.08)';
          btn.style.color = 'var(--color-primary)';
        } else {
          btn.classList.remove('selected');
          btn.style.borderColor = 'var(--color-border)';
          btn.style.backgroundColor = '';
          btn.style.color = '';
        }
      }
    });
  },

  confirmStopMedicine(medId) {
    const state = App.getState();
    const idx = state.myMedicines.findIndex(m => m.id === medId);
    if (idx === -1) return;

    const med = state.myMedicines[idx];
    const dbMed = MedicineDB.medicines.find(m => m.id === med.medicineId);
    const medName = dbMed ? `${dbMed.nameTh} (${dbMed.nameEn})` : 'ยาบางตัว';
    const role = this._selectedStopRole || 'patient';
    const reasonSelect = document.getElementById('stop-reason');
    const reason = reasonSelect ? reasonSelect.value : 'other';

    // อัปเดตข้อมูลการหยุดยา
    med.status = 'stopped';
    med.stoppedBy = role;
    med.stoppedDate = new Date().toISOString().split('T')[0];

    // บันทึก LINE แจ้งเตือนผู้ดูแล
    const roleLabels = { patient: 'คนไข้', caregiver: 'ผู้ดูแล', doctor: 'แพทย์' };
    const reasonLabels = { doctor_ordered: 'ตามแพทย์สั่ง', side_effects: 'พบผลข้างเคียง/แพ้ยา', recovered: 'หายดีขึ้นแล้ว', other: 'อื่นๆ' };
    
    const notifMsg = `📢 แจ้งหยุดทานยา: ยา ${medName} ถูกสั่งหยุดโดย *${roleLabels[role]}* ด้วยสาเหตุ *${reasonLabels[reason]}* มีผลทันที`;
    const notifications = state.notifications || [];
    notifications.unshift({
      id: 'notif_' + Date.now(),
      type: 'warning',
      time: new Date().toISOString(),
      message: notifMsg
    });

    App.updateState('notifications', notifications);
    App.setState({ myMedicines: state.myMedicines });

    // ส่ง LINE จริง
    const realMsg = `[YaCheck] แจ้งการหยุดยา:\nยา ${medName} ถูกสั่งหยุดโดย ${roleLabels[role]} ด้วยสาเหตุ ${reasonLabels[reason]} มีผลทันที`;
    Utils.sendRealLineNotification(realMsg);

    Utils.hideBottomSheet('detail-sheet');
    Utils.showToast(`หยุดทานยา ${medName} เรียบร้อยแล้ว`, 'info');
    
    this.render();
  },

  resumeMedicine(medId) {
    const state = App.getState();
    const idx = state.myMedicines.findIndex(m => m.id === medId);
    if (idx === -1) return;

    const med = state.myMedicines[idx];
    const dbMed = MedicineDB.medicines.find(m => m.id === med.medicineId);
    const medName = dbMed ? `${dbMed.nameTh} (${dbMed.nameEn})` : 'ยาบางตัว';

    // กู้คืนสถานะเป็น active
    med.status = 'active';
    delete med.stoppedBy;
    delete med.stoppedDate;

    // บันทึก LINE แจ้งเตือนผู้ดูแล
    const notifMsg = `🔄 แจ้งทานยาต่อ: ยา ${medName} ได้ถูกกู้คืนกลับมาเป็นรายการยากำลังทานปกติแล้ว`;
    const notifications = state.notifications || [];
    notifications.unshift({
      id: 'notif_' + Date.now(),
      type: 'success',
      time: new Date().toISOString(),
      message: notifMsg
    });

    App.updateState('notifications', notifications);
    App.setState({ myMedicines: state.myMedicines });

    // ส่ง LINE จริง
    const realMsg = `[YaCheck] แจ้งทานยาต่อ:\nยา ${medName} ได้ถูกกู้คืนกลับมาเป็นรายการยากำลังทานปกติแล้วค่ะ`;
    Utils.sendRealLineNotification(realMsg);

    Utils.hideBottomSheet('detail-sheet');
    Utils.showToast(`นำยา ${medName} กลับมาทานปกติเรียบร้อย`, 'success');
    
    this.render();
  },

  // เปิดหน้ารายชื่อยาทั้งหมดขยายใหญ่เต็มจอให้แพทย์อ่าน

  showDoctorView() {
    const state = App.getState();
    const doctorView = document.getElementById('doctor-view');
    if (!doctorView) return;

    let html = `
      <button class="btn btn-icon close-btn" onclick="Cabinet.hideDoctorView()">${Utils.getIconSvg('cross', 'icon-sm')}</button>
      <h1 style="text-align:center; margin-bottom: 24px; display: flex; align-items: center; justify-content: center; gap: var(--space-sm);">${Utils.getIconSvg('pill', 'icon-md')} รายการยาทั้งหมด</h1>
    `;

    if (!state.myMedicines || state.myMedicines.length === 0) {
      html += '<p style="text-align:center; font-size:1.5rem; color:var(--color-text-muted)">ยังไม่มียาในรายการ</p>';
    } else {
      state.myMedicines.forEach(med => {
        const dbMed = MedicineDB.medicines.find(m => m.id === med.medicineId);
        if (!dbMed) return;

        html += `
          <div class="doctor-med-item">
            <p class="med-name">${dbMed.nameEn}</p>
            <p class="med-dose">${med.dosageMg} mg</p>
            <p class="med-category">${dbMed.category}</p>
          </div>
          <hr>
        `;
      });
    }

    doctorView.innerHTML = html;
    doctorView.classList.add('active');
  },

  // ปิดหน้าจอแสดงยาสำหรับแพทย์
  hideDoctorView() {
    const doctorView = document.getElementById('doctor-view');
    if (doctorView) {
      doctorView.classList.remove('active');
    }
  }
};
