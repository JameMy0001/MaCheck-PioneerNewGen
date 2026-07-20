// หน้าแรก แสดงความคืบหน้าการกินยาวันนี้ แยกตามช่วงเวลา
const Dashboard = {

  // วาดหน้าแดชบอร์ดหลัก
  render() {
    const container = document.querySelector('#page-dashboard .page-content');
    if (!container) return;

    const state = App.getState();
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // ล้างสถิติเก่าถ้าข้ามวันใหม่
    if (!state.todayLog || state.todayLog.date !== todayStr) {
      App.setState({ todayLog: { date: todayStr, taken: {} } });
    }

    // คำนวณความคืบหน้าในการทาน
    const allTodayMeds = this.getTodayMedications(state.myMedicines);
    const takenCount = Object.values(state.todayLog.taken || {}).filter(v => v).length;
    const totalCount = allTodayMeds.length;
    const progressPercent = totalCount > 0 ? Math.round((takenCount / totalCount) * 100) : 0;

    // ตรวจสอบยาที่เลยกำหนดวันหยุดทานยา (Forgot to stop warning)
    let forgotStopWarningsHtml = '';
    (state.myMedicines || []).forEach(med => {
      if (med.status !== 'stopped' && med.stopDate) {
        if (todayStr > med.stopDate) {
          const dbMed = MedicineDB.medicines.find(m => m.id === med.medicineId);
          const medName = dbMed ? `${dbMed.nameTh} (${dbMed.nameEn})` : 'ยาไม่ระบุชื่อ';
          forgotStopWarningsHtml += `
            <div class="stop-warning-card" style="border-left: 5px solid var(--color-danger); background: #FFF3F3; padding: 16px; border-radius: var(--radius-md); margin-bottom: 16px; display: flex; flex-direction: column; gap: 6px;">
              <div class="stop-warning-title" style="color: var(--color-danger); font-weight: 700; font-size: 1.05rem; display: flex; align-items: center; gap: 8px;">
                ⚠️ เลยกำหนดเวลาหยุดทานยาแล้ว!
              </div>
              <div class="stop-warning-desc" style="font-size: 0.95rem; color: var(--color-text-secondary);">
                ยา <strong>${medName}</strong> เลยกำหนดวันหยุดยาเมื่อ <strong>${Utils.formatThaiDateShort(med.stopDate)}</strong> แต่ยังไม่ได้กดยืนยันการหยุดทานยา
              </div>
              <button class="btn btn-outline btn-sm mt-sm" style="align-self: flex-start; padding: 6px 12px; font-size: 0.85rem; border-color: var(--color-danger); color: var(--color-danger);" onclick="App.navigate('cabinet'); Cabinet.showDetail('${med.id}')">
                ไปหน้าทำรายการหยุดยา
              </button>
            </div>
          `;
        }
      }
    });

    // ดึงรหัสเวลานับถอยหลังภารกิจเว้นระยะยา (Spacing & Water Challenge)
    let challengeHtml = '';
    if (state.activeChallenge) {
      const active = state.activeChallenge;
      const hours = Math.floor(active.timeLeft / 3600);
      const minutes = Math.floor((active.timeLeft % 3600) / 60);
      const seconds = active.timeLeft % 60;
      const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      
      const percent = Math.round(((active.maxTime - active.timeLeft) / active.maxTime) * 100);
      const cups = active.waterCups || 0;
      
      let waterCupsHtml = '';
      for (let i = 1; i <= 4; i++) {
        const isDrunk = cups >= i;
        waterCupsHtml += `
          <span style="font-size: 1.8rem; margin-right: 6px; opacity: ${isDrunk ? '1' : '0.25'}; display: inline-block; transition: all var(--transition-fast);">
            🥛
          </span>
        `;
      }

      challengeHtml = `
        <div class="card" style="margin-bottom: 16px; padding: 16px; border-radius: var(--radius-md); border-left: 5px solid var(--color-safe); background: var(--color-surface); box-shadow: var(--shadow-sm); text-align: left; animation: slideUp 0.3s ease;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-xs);">
            <div style="display: flex; align-items: center; gap: 8px; font-weight: 700; color: var(--color-safe); font-size: 1.05rem;">
              💧 ภารกิจความปลอดภัย (จิบน้ำสะสม)
            </div>
            ${active.timeLeft > 0 ? `
              <span class="pulse-warning" style="background: var(--color-warning-bg); color: var(--color-warning); font-size: 0.8rem; font-weight: 700; padding: 2px 8px; border-radius: var(--radius-full); display: inline-flex; align-items: center; gap: 4px;">
                ${Utils.getIconSvg('clock', 'icon-xs')} รอสอบถามผู้เชี่ยวชาญ
              </span>
            ` : `
              <span style="background: var(--color-safe-bg); color: var(--color-safe); font-size: 0.8rem; font-weight: 700; padding: 2px 8px; border-radius: var(--radius-full);">
                ⚠️ ยังไม่ยืนยันความปลอดภัย
              </span>
            `}
          </div>
          
          <p style="font-size: 0.92rem; color: var(--color-text-secondary); margin: 0 0 12px 0; line-height: 1.45;">
            ระบบไม่สามารถใช้การจับเวลาเพื่อยืนยันว่าคู่ยาปลอดภัย กรุณาสอบถามแพทย์หรือเภสัชกรก่อนใช้ยา <strong>${active.medName}</strong> ร่วมกับยาเดิม
          </p>

          <!-- แถบเวลา / Progress Bar -->
          <div class="progress-bar-track" style="margin-bottom: 8px; height: 10px; background: var(--color-border); border-radius: var(--radius-full); overflow: hidden; width: 100%;">
            <div class="progress-bar-fill" style="width: ${percent}%; height: 100%; background: var(--color-safe); border-radius: var(--radius-full); transition: width 0.5s ease;"></div>
          </div>
          
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <span style="font-size: 0.82rem; color: var(--color-text-muted); font-weight: 600;">สำเร็จ ${percent}%</span>
            <span style="font-size: 1.25rem; font-weight: 800; color: var(--color-text); font-family: monospace;">${timeStr}</span>
          </div>

          <!-- แก้วน้ำสะสม -->
          <div style="background: var(--color-bg); padding: 12px; border-radius: var(--radius-md); margin-bottom: 4px;">
            <div style="font-size: 0.88rem; font-weight: 700; color: var(--color-text-secondary); margin-bottom: 6px;">
              จิบน้ำสะสม: ${cups} / 4 แก้ว
            </div>
            <div style="display: flex; align-items: center; margin-bottom: 8px;">
              ${waterCupsHtml}
            </div>

            ${active.timeLeft > 0 ? `
              <div style="display: flex; gap: 8px; width: 100%;">
                <button class="btn btn-primary btn-sm" onclick="App.recordWaterCup()" style="flex: 2; height: 38px; font-size: 0.88rem; display: flex; align-items: center; justify-content: center; gap: 4px;">
                  🥛 จิบน้ำ 1 แก้ว
                </button>
                <button class="btn btn-outline btn-sm" onclick="App.toggleSpeedUpChallenge()" style="flex: 1; height: 38px; font-size: 0.8rem; padding: 0;">
                  ⚡ จำลองเวลา
                </button>
              </div>
            ` : `
              <button class="btn btn-primary btn-sm btn-full" onclick="App.finishChallenge()" style="height: 38px; font-size: 0.9rem; background-color: var(--color-safe); border-color: var(--color-safe);">
                🎉 เสร็จสิ้นภารกิจ
              </button>
            `}
          </div>
        </div>
      `;
    }

    // วาดโครงสร้าง HTML
    let html = `
      <div class="dashboard-greeting">
        <h1>สวัสดีครับ ${state.user.name}</h1>
        <p class="dashboard-date">${Utils.formatThaiDate(today)}</p>
      </div>

      ${forgotStopWarningsHtml}

      ${challengeHtml}

      <div class="progress-container card">
        <div class="progress-info">
          <span class="progress-label" style="display: inline-flex; align-items: center; gap: 6px;">
            ${Utils.getIconSvg('calendar', 'icon-sm')}
            วันนี้ทานแล้ว
          </span>
          <span class="progress-count">${takenCount}/${totalCount} รายการ</span>
        </div>
        <div class="progress-bar-track">
          <div class="progress-bar-fill" style="width: ${progressPercent}%"></div>
        </div>
        <p class="progress-text">${progressPercent}% สำเร็จ</p>
      </div>

      <div class="card" style="margin-top: 16px; padding: 16px; border-radius: var(--radius-md); background: var(--color-surface); box-shadow: var(--shadow-sm); border: 1.5px solid var(--color-border); display: flex; align-items: center; justify-content: space-between; cursor: pointer; transition: all var(--transition-fast);" onclick="App.navigate('food-clash')">
        <div style="display: flex; align-items: center; gap: 12px; text-align: left;">
          <div style="background: var(--color-primary-light); width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.3rem;">
            🍊
          </div>
          <div>
            <h3 style="margin: 0; font-size: 1.05rem; font-weight: 700; color: var(--color-primary);">ตรวจสอบของแสลงอัจฉริยะ</h3>
            <p style="margin: 2px 0 0 0; font-size: 0.85rem; color: var(--color-text-secondary);">เช็กว่าอาหาร ผลไม้ สมุนไพร ขัดกับยาหรือโรคประจำตัวหรือไม่</p>
          </div>
        </div>
        <span style="color: var(--color-secondary); display: inline-flex;">
          ${Utils.getIconSvg('chevronRight', 'icon-sm')}
        </span>
      </div>

      <div class="card" style="margin-top: 12px; padding: 16px; border-radius: var(--radius-md); background: var(--color-surface); box-shadow: var(--shadow-sm); border: 1.5px solid var(--color-border); display: flex; align-items: center; justify-content: space-between; cursor: pointer; transition: all var(--transition-fast);" onclick="App.navigate('scan-check')">
        <div style="display: flex; align-items: center; gap: 12px; text-align: left;">
          <div style="background: var(--color-primary-light); width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.3rem;">
            📸
          </div>
          <div>
            <h3 style="margin: 0; font-size: 1.05rem; font-weight: 700; color: var(--color-primary);">สแกนเช็กความปลอดภัยยา</h3>
            <p style="margin: 2px 0 0 0; font-size: 0.85rem; color: var(--color-text-secondary);">จำลองกล้องสแกนตรวจยาตีกันหรือประวัติแพ้ยาทันที</p>
          </div>
        </div>
        <span style="color: var(--color-secondary); display: inline-flex;">
          ${Utils.getIconSvg('chevronRight', 'icon-sm')}
        </span>
      </div>
    `;

    // จัดกลุ่มยาแยกตามช่วงเวลา
    const timeSlots = ['morning', 'noon', 'evening', 'bedtime'];
    const currentSlot = Utils.getCurrentTimeSlot();

    timeSlots.forEach(slot => {
      const slotMeds = allTodayMeds.filter(m => m.timeSlots.includes(slot));
      if (slotMeds.length === 0) return;

      const slotInfo = Utils.getTimeSlotInfo(slot);
      const isCurrent = slot === currentSlot;

      html += `
        <div class="time-slot-section ${isCurrent ? 'current' : ''}">
          <div class="time-slot-header" style="--slot-color: ${slotInfo.accentColor}">
            <span class="slot-emoji">${Utils.getIconSvg(slotInfo.iconName, 'icon-md')}</span>
            <span class="slot-name">${slotInfo.nameTh}</span>
            <span class="slot-time">(${slotInfo.time})</span>
          </div>
          <div class="medicine-list">
      `;

      slotMeds.forEach(med => {
        const dbMed = MedicineDB.medicines.find(m => m.id === med.medicineId);
        if (!dbMed) return;

        const takenKey = `${med.id}_slot_${slot}`;
        const isTaken = state.todayLog.taken && state.todayLog.taken[takenKey];
        const takenTime = isTaken ? new Date(state.todayLog.taken[takenKey]) : null;

        html += `
          <div class="medicine-card ${isTaken ? 'taken' : ''}" data-med-id="${med.id}" data-slot="${slot}">
            <div class="pill-icon" style="background-color: ${med.pillColor || dbMed.pillColor}">
              ${Utils.getIconSvg('pill')}
            </div>
            <div class="medicine-info">
              <h3 class="medicine-name">${dbMed.category}</h3>
              <p class="medicine-name-en">${dbMed.nameTh} (${dbMed.nameEn}) ${med.dosageMg}mg</p>
              <p class="medicine-desc">
                ${med.mealTiming === 'before_meal' ? '<span class="meal-badge before-meal">ก่อนอาหาร</span>' : '<span class="meal-badge after-meal">หลังอาหาร</span>'}
              </p>
            </div>
            <button class="taken-btn ${isTaken ? 'checked' : ''}" onclick="Dashboard.toggleTaken('${med.id}', '${slot}')" aria-label="ทานแล้ว">
              <span class="taken-label">${isTaken ? `ทานแล้ว ${Utils.formatThaiTime(takenTime)}` : 'กดเมื่อทานแล้ว'}</span>
            </button>
          </div>
        `;
      });

      html += '</div></div>';
    });

    // ปุ่มแสดงผลกรณีหน้าเปล่า
    if (allTodayMeds.length === 0) {
      html += `
        <div class="empty-state">
          <p class="empty-icon" style="color: var(--color-primary); margin-bottom: var(--space-md);">${Utils.getIconSvg('pill', 'icon-xl')}</p>
          <p class="empty-text">ยังไม่มียาในรายการ</p>
          <button class="btn btn-primary" onclick="App.navigate('add')">+ เพิ่มยาใหม่</button>
        </div>
      `;
    }

    // เพิ่ม Simulator Panel สำหรับแสดงไลน์เตือนและปุ่มจำลอง (แสดงเฉพาะผู้ดูแล)
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

      html += `
        <div class="simulator-panel card" style="margin-top: 24px;">
          <div class="simulator-header" style="margin-bottom: 8px;">
            <span style="font-size:1.3rem;">💬</span>
            <strong>จำลองไลน์เตือนผู้ดูแล (Caregiver Alert Sim)</strong>
          </div>
          <p style="font-size:0.9rem; color:var(--color-text-secondary); margin-bottom:12px;">
            กดปุ่มจำลองเพื่อทดสอบระบบดักเตือนอัตโนมัติเมื่อคนไข้ลืมทานยา
          </p>
          <div class="simulator-actions" style="margin-bottom: 12px;">
            <button class="simulator-btn btn-full" onclick="Dashboard.simulateMissedDoseCheck(1)">
              <span>⏰</span> เช็คผู้ดูแลครั้งที่ 1 (ลืมทานยา)
            </button>
            <button class="simulator-btn btn-full" onclick="Dashboard.simulateMissedDoseCheck(2)">
              <span>🚨</span> เช็คผู้ดูแลครั้งที่ 2 (เตือนซ้ำสอง)
            </button>
            <button class="btn btn-ghost btn-sm mt-xs" style="padding: 6px; font-size: 0.85rem;" onclick="Dashboard.clearSimulatorLogs()">
              🧹 เคลียร์ประวัติแจ้งเตือน
            </button>
          </div>
          <div style="font-size: 0.85rem; font-weight: 700; color:var(--color-text-secondary); margin-bottom: 6px;">ประวัติการส่ง LINE แจ้งเตือน:</div>
          <div class="simulator-logs" id="simulator-logs-list">
            ${logsHtml}
          </div>
        </div>
      `;
    }

    container.innerHTML = html;
  },

  // กรองเฉพาะรายชื่อยากินประจำ
  getTodayMedications(medicines) {
    return (medicines || []).filter(m => m.type === 'regular' && m.status !== 'stopped');
  },

  // กดบันทึกทานยาหรือยกเลิกการทาน
  toggleTaken(medId, slot) {
    Utils.hapticFeedback();
    const state = App.getState();
    const takenKey = `${medId}_slot_${slot}`;
    const todayLog = { ...state.todayLog };

    if (!todayLog.taken) todayLog.taken = {};

    const med = state.myMedicines.find(m => m.id === medId);
    const dbMed = med ? MedicineDB.medicines.find(x => x.id === med.medicineId) : null;
    const medName = dbMed ? dbMed.nameTh : 'ยา';
    const slotTh = Utils.getTimeSlotInfo(slot).nameTh;

    if (todayLog.taken[takenKey]) {
      // ลบประวัติทาน
      delete todayLog.taken[takenKey];
      Utils.showToast('ยกเลิกการบันทึก', 'info');
      Utils.speak("ยกเลิกการบันทึกทานยาค่ะ");
    } else {
      // บันทึก
      todayLog.taken[takenKey] = new Date().toISOString();
      Utils.showToast('บันทึกเรียบร้อย!', 'success');

      // ตรวจสอบว่ากินยาครบมื้อนี้หรือยัง (Smart Notifications)
      const allTodayMeds = this.getTodayMedications(state.myMedicines);
      const slotMeds = allTodayMeds.filter(m => m.timeSlots.includes(slot));
      
      let allTaken = true;
      for (const m of slotMeds) {
        const k = `${m.id}_slot_${slot}`;
        if (!todayLog.taken || !todayLog.taken[k]) {
          allTaken = false;
          break;
        }
      }
      
      if (allTaken && slotMeds.length > 0) {
        const timeSlotTh = Utils.getTimeSlotInfo(slot).nameTh;
        const msg = `ส่งข้อความหาผู้ดูแล (${state.emergencyContact.name}): ${state.user.name} ทานยารอบ ${timeSlotTh} ครบเรียบร้อยแล้ว`;
        
        // บันทึกข้อความการเตือน
        const notifications = state.notifications || [];
        notifications.unshift({
          id: 'notif_' + Date.now(),
          type: 'success',
          time: new Date().toISOString(),
          message: msg
        });
        
        // อัปเดต state
        App.updateState('notifications', notifications);
        Utils.showToast('ส่งไลน์รายงานผู้ดูแลแล้ว', 'success');
        
        // ส่ง LINE จริง
        const realMsg = `[YaCheck] รายงานของ ${state.user.name}:\nทานยารอบ ${timeSlotTh} ครบเรียบร้อยแล้วค่ะ`;
        Utils.sendRealLineNotification(realMsg);
        
        // เล่นเสียงแจ้งกินยาครบส่งเตือนแล้ว
        Utils.speak(`ทานยารอบ ${timeSlotTh} ครบถ้วนและส่งรายงานแจ้งเตือนผู้ดูแลเรียบร้อยแล้วค่ะ`);
      } else {
        // เล่นเสียงบันทึกยามื้อเดี่ยว
        Utils.speak(`บันทึกการทานยา ${medName} รอบ ${slotTh} เรียบร้อยแล้วค่ะ`);
      }
    }

    App.setState({ todayLog });
    this.render(); // สั่งวาดหน้าจอใหม่ทันที
  },

  simulateMissedDoseCheck(level) {
    const state = App.getState();
    const currentSlot = Utils.getCurrentTimeSlot();
    const allTodayMeds = this.getTodayMedications(state.myMedicines);
    
    let slotToCheck = currentSlot;
    let slotMeds = allTodayMeds.filter(m => m.timeSlots.includes(slotToCheck));
    
    if (slotMeds.length === 0) {
      const slots = ['morning', 'noon', 'evening', 'bedtime'];
      for (const s of slots) {
        const meds = allTodayMeds.filter(m => m.timeSlots.includes(s));
        if (meds.length > 0) {
          slotToCheck = s;
          slotMeds = meds;
          break;
        }
      }
    }
    
    if (slotMeds.length === 0) {
      Utils.showToast('ไม่มียาประจำในระบบที่จะต้องทานวันนี้', 'warning');
      return;
    }
    
    const untakenMeds = [];
    slotMeds.forEach(m => {
      const k = `${m.id}_slot_${slotToCheck}`;
      if (!state.todayLog || !state.todayLog.taken || !state.todayLog.taken[k]) {
        const dbMed = MedicineDB.medicines.find(x => x.id === m.medicineId);
        untakenMeds.push(dbMed ? dbMed.nameTh : 'ยาบางตัว');
      }
    });
    
    const timeSlotTh = Utils.getTimeSlotInfo(slotToCheck).nameTh;
    const notifications = state.notifications || [];
    
    if (untakenMeds.length === 0) {
      Utils.showToast(`ทานยาคิวรอบ ${timeSlotTh} ครบถ้วนแล้ว ไม่จำเป็นต้องส่งเตือน`, 'success');
      return;
    }
    
    let msg = '';
    let realMsg = '';
    if (level === 1) {
      msg = `⚠️ ไลน์แจ้งเตือนผู้ดูแล (${state.emergencyContact.name}): คนไข้ยังไม่ได้ทานยารอบ ${timeSlotTh} (${untakenMeds.join(', ')})`;
      realMsg = `⚠️ [YaCheck] คำเตือนระดับ 1:\n${state.user.name} ยังไม่ได้ทานยารอบ ${timeSlotTh} (${untakenMeds.join(', ')})`;
      Utils.showToast('จำลองส่งเตือนลืมทานยา (ครั้งที่ 1) แล้ว', 'warning');
      
      // อ่านออกเสียงเตือนล่าช้ารอบ 1
      Utils.speak(`แจ้งเตือนความล่าช้าการกินยาระดับที่หนึ่งค่ะ คนไข้ยังไม่ได้ทานยารอบ ${timeSlotTh} รายการ ${untakenMeds.join(', ')} ค่ะ`);
    } else {
      msg = `🚨 ไลน์เตือนด่วนซ้ำสอง (${state.emergencyContact.name}): คำเตือนวิกฤต! คนไข้ยังไม่ยอมทานยารอบ ${timeSlotTh} (${untakenMeds.join(', ')}) เกินเวลากำหนด 1 ชม.!`;
      realMsg = `🚨 [YaCheck] คำเตือนวิกฤตระดับ 2:\nคนไข้ยังไม่ยอมทานยารอบ ${timeSlotTh} (${untakenMeds.join(', ')}) เกินเวลากำหนด 1 ชั่วโมงแล้ว!`;
      Utils.showToast('จำลองส่งเตือนด่วนซ้ำสอง (ครั้งที่ 2) แล้ว', 'error');
      
      // เล่นเสียงไซเรนและเตือนภัยวิกฤต
      Utils.playAlarm();
      Utils.speak(`เตือนภัยระดับวิกฤตค่ะ คนไข้ยังไม่ยอมทานยารอบ ${timeSlotTh} เกินเวลากำหนดหนึ่งชั่วโมงแล้วค่ะ กรุณาตรวจสอบโดยด่วนค่ะ`);
    }
    
    notifications.unshift({
      id: 'notif_' + Date.now(),
      type: level === 1 ? 'warning' : 'danger',
      time: new Date().toISOString(),
      message: msg
    });
    
    App.updateState('notifications', notifications);
    
    // ส่ง LINE จริง
    Utils.sendRealLineNotification(realMsg);
    this.updateSimulatorLogs();
  },

  clearSimulatorLogs() {
    App.updateState('notifications', []);
    this.updateSimulatorLogs();
    Utils.showToast('ล้างประวัติการแจ้งเตือนแล้ว', 'success');
  },

  updateSimulatorLogs() {
    const list = document.getElementById('simulator-logs-list');
    if (!list) return;
    
    const state = App.getState();
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
    list.innerHTML = logsHtml;
  }
};
