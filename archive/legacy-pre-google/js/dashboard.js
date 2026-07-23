// หน้าแรก (แดชบอร์ดหลัก) - อ้างอิงและจำลองแบบจากแอปตัวล่าสุด (Today)

const Dashboard = {
  // ดึงรายการยากินประจำของวันนี้
  getTodayMedications(medicines) {
    return (medicines || []).filter(m => m.type === 'regular' && m.status !== 'stopped');
  },

  // วาดหน้าแดชบอร์ดหลัก
  render() {
    const container = document.querySelector('#page-dashboard .page-content');
    if (!container) return;

    const state = App.getState();
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // เช็ควันใหม่
    if (!state.todayLog || state.todayLog.date !== todayStr) {
      App.setState({ todayLog: { date: todayStr, taken: {} } });
    }

    // คำนวณความสม่ำเสมอในการทานยา (Adherence วันนี้)
    const todayMeds = this.getTodayMedications(state.myMedicines);
    let expectedCount = 0;
    let takenCount = 0;

    todayMeds.forEach(med => {
      const slots = med.timeSlots || [];
      expectedCount += slots.length;
      slots.forEach(slot => {
        const logKey = `${med.id}_slot_${slot}`;
        if (state.todayLog.taken && state.todayLog.taken[logKey]) {
          takenCount++;
        }
      });
    });

    const progressPercent = expectedCount > 0 ? Math.round((takenCount / expectedCount) * 100) : 100;
    
    // ดึงข้อมูลประวัติน้ำดื่มวันนี้
    const water = state.waterByDate ? (state.waterByDate[todayStr] || 0) : 0;

    // ส่วนประมวลผลข้อห้ามการหยุดยา
    let forgotStopWarningsHtml = '';
    (state.myMedicines || []).forEach(med => {
      if (med.status !== 'stopped' && med.stopDate) {
        if (todayStr > med.stopDate) {
          const dbMed = MedicineDB.getMedicine(med.medicineId);
          const medName = dbMed ? dbMed.nameTh : 'ยาไม่ระบุชื่อ';
          forgotStopWarningsHtml += `
            <div class="stop-warning-card" style="border-left: 4px solid var(--color-danger); background: var(--color-danger-bg); padding: 14px; border-radius: var(--radius-md); margin-bottom: 12px; display: flex; flex-direction: column; gap: 4px;">
              <strong style="color: var(--color-danger); font-size: 1rem; font-family: 'Prompt', sans-serif; display: flex; align-items: center; gap: 6px;">
                ⚠️ เลยกำหนดเวลาหยุดทานยาแล้ว
              </strong>
              <div style="font-size: 0.88rem; color: var(--color-text);">
                ยา <strong>${medName}</strong> เลยกำหนดหยุดทานยาเมื่อ <strong>${Utils.formatThaiDateShort(med.stopDate)}</strong>
              </div>
              <button class="btn btn-ghost btn-sm mt-xs" style="align-self: flex-start; padding: 4px 8px; font-size: 0.8rem; border: 1.5px solid var(--color-danger); color: var(--color-danger); background: none;" onclick="App.navigate('cabinet')">
                ไปหน้าทำรายการหยุดยา
              </button>
            </div>
          `;
        }
      }
    });

    // 1. หัวข้อโปรไฟล์สวัสดี
    const isCloudUser = state.currentUser && state.currentUser !== 'patient123' && state.currentUser !== 'caregiver123';

    let greetingHtml = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; text-align: left; margin-bottom: 14px;">
        <div style="display: flex; flex-direction: column; gap: 2px;">
          <span style="color: var(--color-secondary); font-size: 0.95rem;">สวัสดี</span>
          <h1 style="color: var(--color-text); font-size: 1.85rem; font-weight: 900; font-family: 'Prompt', sans-serif; margin: 0;">
            ${state.user.name || 'คุณผู้ไข้'}
          </h1>
        </div>
        ${isCloudUser ? `
          <span style="background-color: var(--color-safe-bg); color: var(--color-safe); font-size: 0.78rem; font-weight: 700; padding: 4px 10px; border-radius: var(--radius-full); display: inline-flex; align-items: center; gap: 4px; border: 1px solid var(--color-safe);">
            ☁️ ซิงค์คลาวด์แล้ว
          </span>
        ` : `
          <span style="background-color: var(--color-primary-light); color: var(--color-secondary); font-size: 0.78rem; font-weight: 700; padding: 4px 10px; border-radius: var(--radius-full); display: inline-flex; align-items: center; gap: 4px; border: 1px solid var(--color-border);">
            📴 โหมดจำลอง
          </span>
        `}
      </div>
    `;

    // 2. การ์ดความสม่ำเสมอวันนี้ + ดื่มน้ำ (SectionCard)
    const adherenceColor = progressPercent >= 80 ? 'var(--color-safe)' : 'var(--color-warning)';
    let statsCardHtml = `
      <div class="card" style="padding: 16px; border-radius: var(--radius-lg); background: var(--color-surface); border: 1px solid var(--color-border); box-shadow: var(--shadow-sm); display: flex; flex-direction: column; gap: 12px; margin-bottom: 14px;">
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
          <div style="text-align: left; flex: 1; display: flex; flex-direction: column; gap: 2px;">
            <span style="color: var(--color-secondary); font-size: 0.88rem;">ความสม่ำเสมอวันนี้</span>
            <strong style="color: ${adherenceColor}; font-size: 2.2rem; font-weight: 900; font-family: monospace;">
              ${progressPercent}%
            </strong>
          </div>
          <div style="display: flex; align-items: center; gap: 8px; background-color: var(--color-primary-light); border-radius: var(--radius-md); padding: 8px 12px;">
            <span style="font-size: 1.5rem;">💧</span>
            <strong style="color: var(--color-primary-dark); font-size: 1.05rem; font-family: 'Prompt', sans-serif;">
              ${water}/8 แก้ว
            </strong>
          </div>
        </div>
        <button class="btn btn-outline btn-full" onclick="Dashboard.recordWater()" ${water >= 12 ? 'disabled' : ''} style="height: 48px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; gap: 8px; font-weight: 700;">
          🥛 บันทึกดื่มน้ำ 1 แก้ว
        </button>
      </div>
    `;

    // 3. รายการเวลาทานยาวันนี้ (ตารางยาวันนี้)
    let scheduleHeaderHtml = `
      <div style="text-align: left; margin-bottom: 10px; margin-top: 6px;">
        <h3 style="font-family: 'Prompt', sans-serif; font-size: 1.35rem; font-weight: 900; color: var(--color-text); margin: 0 0 2px 0;">ตารางยาวันนี้</h3>
        <span style="color: var(--color-secondary); font-size: 0.88rem;">แตะช่องสี่เหลี่ยมเมื่อรับประทานยาแล้ว</span>
      </div>
    `;

    // จัดกลุ่มและวาดแต่ละมื้อ
    const timeSlots = ['morning', 'noon', 'evening', 'bedtime'];
    const currentSlot = Utils.getCurrentTimeSlot();
    let scheduleGridHtml = '<div style="background-color: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); overflow: hidden; margin-bottom: 24px;">';

    timeSlots.forEach((slot, index) => {
      const slotMeds = todayMeds.filter(m => m.timeSlots.includes(slot));
      const slotInfo = Utils.getTimeSlotInfo(slot);
      const isCurrent = slot === currentSlot;
      const isLast = index === timeSlots.length - 1;

      let medRowsHtml = '';
      if (slotMeds.length === 0) {
        medRowsHtml = `<div style="color: var(--color-secondary); font-size: 0.88rem; text-align: left; padding: 2px 0;">ยังไม่มียาที่กำหนดไว้</div>`;
      } else {
        slotMeds.forEach(med => {
          const dbMed = MedicineDB.getMedicine(med.medicineId);
          if (!dbMed) return;

          const logKey = `${med.id}_slot_${slot}`;
          const isTaken = state.todayLog.taken && state.todayLog.taken[logKey];
          const timingLabel = med.mealTiming === 'before_meal' ? 'ก่อนอาหาร' : med.mealTiming === 'after_meal' ? 'หลังอาหาร' : 'ไม่จำกัดมื้อ';

          medRowsHtml += `
            <div style="display: flex; align-items: center; gap: 12px; padding: 6px 0; cursor: pointer; opacity: ${isTaken ? '0.6' : '1'};" onclick="Dashboard.toggleTaken('${med.id}', '${slot}')">
              <div style="width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                ${isTaken 
                  ? `<div style="color: var(--color-safe);">${Utils.getIconSvg('checkCircle', 'icon-md')}</div>`
                  : `<div style="width: 24px; height: 24px; border-radius: 6px; border: 2px solid var(--color-border); background-color: var(--color-surface);"></div>`
                }
              </div>
              <div style="flex: 1; text-align: left;">
                <strong style="font-size: 1rem; color: var(--color-text); font-family: 'Prompt', sans-serif; text-decoration: ${isTaken ? 'line-through' : 'none'};">
                  ${med.customName || dbMed.nameTh}
                </strong>
                <div style="font-size: 0.8rem; color: var(--color-secondary); margin-top: 1px;">
                  ${med.dosageMg}mg · ${timingLabel}
                </div>
              </div>
            </div>
          `;
        });
      }

      scheduleGridHtml += `
        <div style="display: flex; gap: 14px; padding: 14px 16px; background-color: ${isCurrent ? 'var(--color-primary-light)' : 'var(--color-surface)'}; border-bottom: ${isLast ? 'none' : '1px solid var(--color-border)'};">
          <!-- แถบระบุเวลาด้านซ้าย -->
          <div style="width: 50px; flex-shrink: 0; display: flex; flex-direction: column; align-items: center;">
            <strong style="color: ${isCurrent ? 'var(--color-primary-dark)' : 'var(--color-secondary)'}; font-size: 0.88rem; font-family: monospace;">
              ${slotInfo.time}
            </strong>
            <div style="margin-top: 6px; width: 10px; height: 10px; border-radius: 50%; background-color: ${isCurrent ? 'var(--color-primary)' : 'var(--color-border)'}; border: 1.5px solid ${isCurrent ? 'var(--color-primary)' : 'var(--color-secondary)'};"></div>
          </div>

          <!-- ฝั่งรายการยามื้อยาด้านขวา -->
          <div style="flex: 1; display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; width: 100%;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="font-size: 1.25rem;">${slot === 'morning' ? '🌅' : slot === 'noon' ? '☀️' : slot === 'evening' ? '🌇' : '🌙'}</span>
                <strong style="font-size: 1.02rem; color: var(--color-text); font-family: 'Prompt', sans-serif;">มื้อ${slotInfo.nameTh}</strong>
              </div>
              ${isCurrent ? `<span style="background-color: var(--color-surface); color: var(--color-primary); font-size: 0.72rem; font-weight: 900; padding: 2px 8px; border-radius: 12px; border: 1px solid var(--color-primary-dark);">ตอนนี้</span>` : ''}
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 2px;">
              ${medRowsHtml}
            </div>
          </div>
        </div>
      `;
    });

    scheduleGridHtml += '</div>';

    // เพิ่ม Simulator Panel สำหรับจำลองไลน์เตือน (แสดงเฉพาะผู้ดูแล)
    let simulatorHtml = '';
    if (state.currentRole !== 'patient') {
      const notifs = state.notifications || [];
      let logsHtml = '';
      if (notifs.length === 0) {
        logsHtml = '<div class="simulator-log-entry" style="text-align:center; color:var(--color-text-muted)">ยังไม่มีประวัติการส่งแจ้งเตือน</div>';
      } else {
        notifs.slice(0, 10).forEach(n => {
          let typeClass = 'success';
          if (n.message.includes('ยังไม่ได้ทานยา') || n.message.includes('เตือนซ้ำสอง') || n.message.includes('ไลน์') || n.message.includes('แจ้งเตือน')) {
            typeClass = n.message.includes('เตือนด่วนซ้ำสอง') || n.message.includes('วิกฤต') ? 'danger' : 'warning';
          }
          const timeStr = new Date(n.time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
          logsHtml += `<div class="simulator-log-entry ${typeClass}">[${timeStr}] ${n.message}</div>`;
        });
      }

      simulatorHtml = `
        <div class="simulator-panel card" style="margin-top: 20px; padding: 14px; border-radius: var(--radius-md); background: var(--color-surface); border: 1.5px solid var(--color-border); box-shadow: var(--shadow-sm); text-align: left;">
          <div style="display: flex; align-items: center; gap: 8px; border-bottom: 1.2px solid var(--color-border); padding-bottom: 6px; margin-bottom: 8px;">
            <span style="font-size:1.2rem;">💬</span>
            <strong style="color: var(--color-primary); font-family: 'Prompt', sans-serif;">จำลองไลน์เตือนผู้ดูแล (Caregiver Alert Sim)</strong>
          </div>
          <p style="font-size:0.8rem; color:var(--color-text-secondary); margin: 0 0 10px 0; line-height: 1.4;">
            ทดสอบระบบแจ้งเตือนไลน์แบบจำลองอัตโนมัติเมื่อคนไข้ลืมทานยา
          </p>
          <div style="display: flex; gap: 8px; margin-bottom: 10px;">
            <button class="btn btn-outline btn-sm" onclick="Dashboard.simulateMissedDoseCheck(1)" style="flex:1; font-size:0.75rem; height:34px; padding: 0;">
              ⏰ เช็คครั้งที่ 1 (เตือนเบา)
            </button>
            <button class="btn btn-outline btn-sm" onclick="Dashboard.simulateMissedDoseCheck(2)" style="flex:1; font-size:0.75rem; height:34px; padding: 0;">
              🚨 เช็คครั้งที่ 2 (ด่วนพิเศษ)
            </button>
          </div>
          <div style="font-size: 0.8rem; font-weight: 700; color:var(--color-text-secondary); margin-bottom: 6px;">ประวัติการส่ง LINE แจ้งเตือน:</div>
          <div class="simulator-logs" id="simulator-logs-list" style="max-height: 80px; overflow-y: auto; background-color: var(--color-bg); padding: 8px; border-radius: var(--radius-sm); border: 1px solid var(--color-border); font-size: 0.78rem; font-family: monospace;">
            ${logsHtml}
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="dashboard-page-wrapper" style="animation: fadeIn 0.4s ease; padding-bottom: 80px;">
        ${greetingHtml}
        ${forgotStopWarningsHtml}
        ${statsCardHtml}
        ${scheduleHeaderHtml}
        ${scheduleGridHtml}
        ${simulatorHtml}
      </div>
    `;
  },

  // Actions
  toggleTaken(medId, slot) {
    const state = App.getState();
    const logKey = `${medId}_slot_${slot}`;
    const taken = { ...(state.todayLog.taken || {}) };

    if (taken[logKey]) {
      delete taken[logKey];
      Utils.showToast('ยกเลิกบันทึกการทานยา', 'info', 1500);
    } else {
      taken[logKey] = Date.now();
      Utils.hapticFeedback();
      Utils.showToast('บันทึกการทานยาสำเร็จ', 'success', 1500);
    }

    App.setState({
      todayLog: {
        ...state.todayLog,
        taken
      }
    });

    this.render();
  },

  recordWater() {
    const state = App.getState();
    const todayStr = new Date().toISOString().split('T')[0];
    const waterByDate = { ...(state.waterByDate || {}) };
    const current = waterByDate[todayStr] || 0;
    
    waterByDate[todayStr] = Math.min(current + 1, 12);
    
    App.setState({ waterByDate });
    Utils.showToast('บันทึกการดื่มน้ำสำเร็จ 🥛', 'success', 1500);
    this.render();
  },

  simulateMissedDoseCheck(step) {
    const state = App.getState();
    const todayMeds = this.getTodayMedications(state.myMedicines);
    const taken = state.todayLog.taken || {};
    
    // ค้นหายาที่ยังไม่ได้กิน
    const missedList = [];
    const currentSlot = Utils.getCurrentTimeSlot();
    const slotInfo = Utils.getTimeSlotInfo(currentSlot);

    todayMeds.forEach(med => {
      if (med.timeSlots.includes(currentSlot)) {
        const logKey = `${med.id}_slot_${currentSlot}`;
        if (!taken[logKey]) {
          const dbMed = MedicineDB.getMedicine(med.medicineId);
          missedList.push(med.customName || dbMed?.nameTh || med.medicineId);
        }
      }
    });

    let message = '';
    if (missedList.length === 0) {
      message = `[จำลอง] คนไข้กินยารอบมื้อ${slotInfo.nameTh}ครบเรียบร้อยดีทั้งหมด`;
    } else {
      if (step === 1) {
        message = `⚠️ แจ้งเตือนผู้ดูแล: คนไข้ยังไม่ได้ทานยามื้อ${slotInfo.nameTh} (${missedList.join(', ')})`;
      } else {
        message = `🚨 เตือนด่วนซ้ำสอง! คนไข้เลยกำหนดกินยามื้อ${slotInfo.nameTh}มา 1 ชั่วโมงแล้ว (${missedList.join(', ')})`;
      }
    }

    const notifs = [...(state.notifications || [])];
    notifs.unshift({
      time: Date.now(),
      message
    });

    App.setState({ notifications: notifs });
    Utils.showToast('ส่งแจ้งเตือนจำลองสำเร็จ', 'success', 2000);
    this.render();
  },

  clearSimulatorLogs() {
    App.setState({ notifications: [] });
    Utils.showToast('ล้างประวัติการจำลองแจ้งเตือนเรียบร้อยแล้ว', 'success', 1500);
    this.render();
  }
};
