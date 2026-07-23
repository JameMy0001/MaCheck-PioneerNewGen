// หน้าตู้ยาเก็บรายการยาทั้งหมด - อ้างอิงและจำลองแบบจากแอปตัวล่าสุด (Cabinet)

const Cabinet = {
  currentTab: 'active', // 'active' | 'stopped'

  // วาดหน้าหลักตู้ยา
  render() {
    const container = document.querySelector('#page-cabinet .page-content');
    if (!container) return;

    const state = App.getState();
    const multiplier = parseFloat(document.documentElement.style.getPropertyValue('--font-scale') || '1');

    // กรองยาตามแท็บ
    const visibleMeds = (state.myMedicines || []).filter(m => {
      if (this.currentTab === 'active') {
        return m.status !== 'stopped';
      } else {
        return m.status === 'stopped';
      }
    });

    let headerHtml = `
      <div style="text-align: left; margin-bottom: var(--space-md);">
        <h2 class="page-title" style="display: flex; align-items: center; gap: var(--space-sm); font-family: 'Prompt', sans-serif; margin-bottom: 4px;">
          <svg class="svg-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: var(--color-primary); width:26px; height:26px;"><line x1="8.5" y1="15.5" x2="15.5" y2="8.5"/><path d="M12 2a15.3 15.3 0 0 1 4 7l-9 9a15.3 15.3 0 0 1-7-4l9-9Z"/><path d="M16 8a1 1 0 1 0 2 2 1 1 0 1 0-2-2Z"/></svg>
          ตู้ยาของฉัน (Cabinet)
        </h2>
        <p class="text-secondary" style="font-size: 0.95rem;">จัดการรายการยาทั้งหมด ปรับสถานะ หรือเพิ่มยาใหม่เข้าตู้</p>
      </div>
    `;

    // 1. เมนูสลับแท็บ กำลังใช้ / หยุดแล้ว (Segmented Control)
    let tabsHtml = `
      <div style="display: flex; gap: 8px; margin-bottom: 14px; width: 100%;">
        <button class="btn ${this.currentTab === 'active' ? 'btn-primary' : 'btn-outline'}" onclick="Cabinet.switchTab('active')" style="flex: 1; height: 44px; border-radius: var(--radius-md); font-weight: 800; font-size: 0.95rem;">
          กำลังใช้
        </button>
        <button class="btn ${this.currentTab === 'stopped' ? 'btn-primary' : 'btn-outline'}" onclick="Cabinet.switchTab('stopped')" style="flex: 1; height: 44px; border-radius: var(--radius-md); font-weight: 800; font-size: 0.95rem;">
          หยุดแล้ว
        </button>
      </div>
    `;

    // 2. ปุ่มเพิ่มยาเข้าตู้
    let addBtnHtml = `
      <button class="btn btn-primary btn-full" onclick="App.navigate('add')" style="height: 52px; border-radius: var(--radius-md); margin-bottom: 14px; font-weight: 800; font-size: 1.05rem; display: flex; align-items: center; justify-content: center; gap: 8px;">
        ${Utils.getIconSvg('write', 'icon-sm')}
        เพิ่มยาเข้าตู้
      </button>
    `;

    // 3. รายการยา
    let medsListHtml = '';
    if (visibleMeds.length === 0) {
      medsListHtml = `
        <div class="card" style="padding: 24px; text-align: center; border-radius: var(--radius-lg); background: var(--color-surface); border: 1.5px solid var(--color-border); box-shadow: var(--shadow-sm);">
          <span style="font-size: 2.2rem; display: block; margin-bottom: 10px;">💊</span>
          <span style="color: var(--color-secondary); font-size: 0.95rem;">ยังไม่มีรายการในหมวดนี้</span>
        </div>
      `;
    } else {
      visibleMeds.forEach(med => {
        const dbMed = MedicineDB.getMedicine(med.medicineId);
        const nameText = med.customName || dbMed?.nameTh || med.medicineId;
        const nameEnText = dbMed?.nameEn || 'Custom Medicine';
        const dosageLabel = med.dosageMg ? `${med.dosageMg}mg` : '';
        const timingLabel = med.mealTiming === 'before_meal' ? 'ก่อนอาหาร' : med.mealTiming === 'after_meal' ? 'หลังอาหาร' : 'ไม่จำกัดมื้อ';

        // วาดส่วนช่วงเวลาทานยา
        let scheduleSlotsHtml = '';
        if (med.timeSlots && med.timeSlots.length > 0) {
          med.timeSlots.forEach(slot => {
            const slotInfo = Utils.getTimeSlotInfo(slot);
            scheduleSlotsHtml += `
              <div style="display: flex; align-items: center; gap: 4px;">
                <span style="font-size: 1rem;">${slot === 'morning' ? '🌅' : slot === 'noon' ? '☀️' : slot === 'evening' ? '🌇' : '🌙'}</span>
                <span style="font-size: 0.85rem; color: var(--color-primary-dark); font-weight: 700;">${slotInfo.nameTh}</span>
              </div>
            `;
          });
        }

        medsListHtml += `
          <div class="card" style="padding: 16px; border-radius: var(--radius-lg); background: var(--color-surface); border: 1.5px solid var(--color-border); box-shadow: var(--shadow-sm); display: flex; flex-direction: column; gap: 12px; margin-bottom: 12px; text-align: left; animation: slideUp 0.3s ease;">
            <div style="display: flex; flex-direction: column; gap: 2px;">
              <strong style="color: var(--color-text); font-size: 1.2rem; font-weight: 900; font-family: 'Prompt', sans-serif;">${nameText}</strong>
              <div style="font-size: 0.9rem; color: var(--color-secondary);">
                ${nameEnText} · ${dosageLabel} · ${timingLabel}
              </div>
              <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px;">
                ${scheduleSlotsHtml}
              </div>
            </div>

            <!-- ปุ่มคำสั่ง -->
            <div style="display: flex; gap: 8px; border-top: 1.2px solid var(--color-border); padding-top: 10px; margin-top: 2px;">
              <button class="btn btn-outline btn-sm" onclick="Cabinet.toggleStatus('${med.id}')" style="flex: 1; height: 38px; font-size: 0.85rem; border-radius: var(--radius-md); font-weight: 700;">
                ${med.status === 'stopped' ? 'กลับมาใช้' : 'หยุดใช้'}
              </button>
              <button class="btn btn-outline btn-sm" onclick="Cabinet.deleteMed('${med.id}')" style="flex: 1; height: 38px; font-size: 0.85rem; border-radius: var(--radius-md); font-weight: 700; color: var(--color-danger); border-color: var(--color-danger-bg); background-color: var(--color-danger-bg);">
                ลบ
              </button>
            </div>
          </div>
        `;
      });
    }

    container.innerHTML = `
      <div class="cabinet-page-wrapper" style="animation: fadeIn 0.4s ease; padding-bottom: 80px;">
        ${headerHtml}
        ${tabsHtml}
        ${addBtnHtml}
        ${medsListHtml}
      </div>
    `;
  },

  // Actions
  switchTab(tab) {
    this.currentTab = tab;
    this.render();
  },

  toggleStatus(id) {
    const state = App.getState();
    const meds = (state.myMedicines || []).map(m => {
      if (m.id === id) {
        const newStatus = m.status === 'stopped' ? 'active' : 'stopped';
        const msg = newStatus === 'stopped' ? 'หยุดทานยาตัวนี้แล้ว' : 'เปิดใช้งานยาตัวนี้อีกครั้ง';
        Utils.showToast(msg, 'success', 2000);
        return {
          ...m,
          status: newStatus,
          stoppedDate: newStatus === 'stopped' ? new Date().toISOString().split('T')[0] : null,
          stoppedBy: newStatus === 'stopped' ? 'patient' : null
        };
      }
      return m;
    });

    App.setState({ myMedicines: meds });
    this.render();
  },

  async deleteMed(id) {
    const confirmDelete = confirm('คุณแน่ใจหรือไม่ว่าต้องการลบยาตัวนี้ออกจากตู้ยา?');
    if (!confirmDelete) return;

    const state = App.getState();
    const meds = (state.myMedicines || []).filter(m => m.id !== id);

    if (typeof SupabaseService !== 'undefined') {
      try {
        await SupabaseService.deleteRemoteMedication(id);
      } catch (e) {
        console.warn('[Cabinet] Failed to delete medicine on Supabase:', e);
      }
    }

    App.setState({ myMedicines: meds });
    Utils.showToast('ลบรายการยาเรียบร้อยแล้ว', 'success', 2000);
    this.render();
  }
};
