// หน้าการตั้งค่าและการปรับปรุงโปรไฟล์คนไข้ (Settings Manager Module)
// แยกโค้ดออกจาก app.js เพื่อความสะอาดในการจัดระเบียบโครงสร้าง

const Settings = {
  // วาดข้อมูลเดิมลงในหน้าตั้งค่า
  render() {
    const state = App.getState();
    
    const nameInput = document.getElementById('settings-name');
    if (nameInput) {
      nameInput.value = state.user.name || '';
    }

    const weightInput = document.getElementById('settings-weight');
    if (weightInput) {
      weightInput.value = state.user.weight || '';
    }

    const heightInput = document.getElementById('settings-height');
    if (heightInput) {
      heightInput.value = state.user.height || '';
    }

    // Render Allergy Logs
    const allergyListContainer = document.getElementById('settings-allergies-list');
    if (allergyListContainer) {
      const allergyLog = state.allergyLog || [];
      if (allergyLog.length === 0) {
        allergyListContainer.innerHTML = '<div class="text-secondary" style="font-size:0.9rem; text-align:center; padding: 8px;">ไม่มีประวัติการแพ้ยา</div>';
      } else {
        const severityLabels = { mild: 'เล็กน้อย', moderate: 'ปานกลาง', severe: 'รุนแรง' };
        const severityColors = { mild: 'var(--color-safe)', moderate: '#F57C00', severe: 'var(--color-danger)' };
        const severityBg = { mild: '#E8F5E9', moderate: '#FFF3E0', severe: '#FFEBEE' };
        
        allergyListContainer.innerHTML = allergyLog.map(allergy => `
          <div class="allergy-card-item card" style="display:flex; justify-content:space-between; align-items:center; padding: 10px 12px; margin-bottom: 4px; border-left: 4px solid ${severityColors[allergy.severity]}; background-color: var(--color-surface); box-shadow: var(--shadow-sm); border-radius: var(--radius-sm); width: 100%;">
            <div style="flex:1; text-align:left;">
              <div style="display:flex; align-items:center; gap:8px;">
                <strong style="color:var(--color-text); font-size: 1rem;">${allergy.medicineName}</strong>
                <span style="font-size:0.75rem; padding: 2px 6px; border-radius: 10px; background:${severityBg[allergy.severity]}; color:${severityColors[allergy.severity]}; font-weight:700;">
                  ${severityLabels[allergy.severity]}
                </span>
              </div>
              <div class="text-secondary" style="font-size:0.85rem; margin-top:2px;">อาการ: ${allergy.symptoms || '-'}</div>
            </div>
            <button class="btn btn-ghost btn-sm" onclick="Settings.removeAllergen('${allergy.id}')" style="color:var(--color-danger); padding:4px 8px; font-size:0.85rem; height:auto; display:inline-flex; align-items:center; justify-content:center; border:none; background:none;">
              ลบ
            </button>
          </div>
        `).join('');
      }
    }

    // Toggle Add Button display
    const btnAddAllergy = document.getElementById('btn-add-allergy');
    if (btnAddAllergy) {
      btnAddAllergy.style.display = 'inline-block';
    }

    // Render Sound Settings
    const soundEnabled = state.soundEnabled !== false;
    const soundOnBtn = document.getElementById('sound-on-btn');
    const soundOffBtn = document.getElementById('sound-off-btn');
    if (soundOnBtn && soundOffBtn) {
      soundOnBtn.classList.toggle('active', soundEnabled);
      soundOffBtn.classList.toggle('active', !soundEnabled);
    }
    
    const emergencyNameInput = document.getElementById('settings-emergency-name');
    if (emergencyNameInput) {
      emergencyNameInput.value = state.emergencyContact.name || '';
    }
    
    const emergencyPhoneInput = document.getElementById('settings-emergency-phone');
    if (emergencyPhoneInput) {
      emergencyPhoneInput.value = state.emergencyContact.phone || '';
    }

    const lineTokenInput = document.getElementById('settings-line-token');
    if (lineTokenInput) {
      lineTokenInput.value = state.lineToken || '';
    }

    // Highlight active font size option button
    const sizeKey = state.user.fontSize || 'normal';
    const buttons = document.querySelectorAll('.size-option');
    buttons.forEach(btn => {
      const optionTexts = { normal: 'ปกติ', large: 'ใหญ่', xlarge: 'ใหญ่มาก' };
      const text = btn.textContent.trim();
      
      if (text === optionTexts.normal && sizeKey === 'normal' ||
          text === optionTexts.large && sizeKey === 'large' ||
          text === optionTexts.xlarge && sizeKey === 'xlarge') {
        btn.classList.add('active');
      } else if (btn.id !== 'sound-on-btn' && btn.id !== 'sound-off-btn') {
        btn.classList.remove('active');
      }
    });

    // Render Diseases Grid
    const diseasesGrid = document.getElementById('settings-diseases-grid');
    if (diseasesGrid) {
      const diseases = state.user.diseases || [];
      const diseaseList = [
        { id: 'diabetes', name: 'โรคเบาหวาน' },
        { id: 'hypertension', name: 'โรคความดันสูง' },
        { id: 'kidney', name: 'โรคไต' },
        { id: 'heart', name: 'โรคหัวใจ' },
        { id: 'lipid', name: 'โรคไขมันสูง' },
        { id: 'stomach', name: 'โรคกระเพาะ' },
        { id: 'liver', name: 'โรคตับ' }
      ];

      diseasesGrid.innerHTML = diseaseList.map(d => {
        const isSelected = diseases.includes(d.id);
        return `
          <button type="button" class="role-card ${isSelected ? 'selected' : ''}" 
            onclick="Settings.toggleDisease('${d.id}')"
            style="border: 2px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'};
                   border-radius: var(--radius-md);
                   padding: 10px;
                   text-align: center;
                   cursor: pointer;
                   font-weight: 600;
                   background: ${isSelected ? 'var(--color-primary-light)' : 'var(--color-surface)'};
                   color: ${isSelected ? 'var(--color-primary)' : 'var(--color-text-secondary)'};
                   display: flex;
                   align-items: center;
                   justify-content: center;
                   gap: 6px;
                   font-size: 0.95rem;
                   width: 100%;
                   height: 48px;
                   box-shadow: var(--shadow-sm);
                   transition: all var(--transition-fast);">
            ${isSelected ? '✅' : ''} ${d.name}
          </button>
        `;
      }).join('');
    }

    // อัปเดตป้ายบอกบทบาทในหน้าตั้งค่า
    const roleLabel = document.getElementById('settings-role-label');
    if (roleLabel) {
      roleLabel.textContent = state.currentRole === 'patient' ? 'ผู้ใช้งานทั่วไป' : 'แพทย์ / ผู้ดูแล';
    }
  },

  // อัปเดตข้อมูลหน้าตั้งค่า
  updateUserName(name) {
    const state = App.getState();
    state.user.name = name;
    App.setState(state);
    Utils.showToast('บันทึกชื่อผู้ใช้แล้ว', 'success', 1500);
    App._renderPage(App.currentPage);
  },

  updateUserAttribute(key, value) {
    const state = App.getState();
    state.user[key] = value;
    App.setState(state);
    Utils.showToast('บันทึกข้อมูลแล้ว', 'success', 1500);
    App._renderPage(App.currentPage);
  },

  toggleDisease(diseaseId) {
    if (App.state.currentRole === 'patient') {
      const confirmEdit = confirm('⚠️ คำเตือนความปลอดภัย: ข้อมูลโรคประจำตัวส่งผลต่อการวิเคราะห์คู่ยาแสลงและยาตีกัน หากระบุไม่ถูกต้องระบบจะไม่สามารถดักเตือนความเสี่ยงได้ คุณแน่ใจหรือไม่ว่าต้องการแก้ไขข้อมูลนี้ด้วยตนเอง?');
      if (!confirmEdit) return;
    }
    const state = App.getState();
    if (!state.user.diseases) {
      state.user.diseases = [];
    }
    const diseases = [...state.user.diseases];
    const idx = diseases.indexOf(diseaseId);
    if (idx >= 0) {
      diseases.splice(idx, 1);
    } else {
      diseases.push(diseaseId);
    }
    this.updateUserAttribute('diseases', diseases);
  },

  setFontSize(size) {
    const state = App.getState();
    state.user.fontSize = size;
    App.setState(state);
    App.applyFontSize();
    Utils.showToast(`เปลี่ยนขนาดตัวอักษรเป็น: ${App._fontSizes[size].label}`, 'success', 1500);
    App._renderPage(App.currentPage);
  },

  updateEmergencyContact(field, value) {
    const state = App.getState();
    state.emergencyContact[field] = value;
    App.setState(state);
    Utils.showToast('บันทึกข้อมูลติดต่อฉุกเฉินแล้ว', 'success', 1500);
    App._renderPage(App.currentPage);
  },

  updateLineToken(value) {
    const state = App.getState();
    state.lineToken = value;
    App.setState(state);
    Utils.showToast('บันทึก LINE Token แล้ว', 'success', 1500);
    App._renderPage(App.currentPage);
  },

  setSoundSetting(enabled) {
    const state = App.getState();
    state.soundEnabled = enabled;
    App.setState(state);
    Utils.showToast(enabled ? 'เปิดเสียงแจ้งเตือนแล้ว' : 'ปิดเสียงแจ้งเตือนแล้ว', 'success', 1500);
    this.render();
  },

  // ประวัติการแพ้ยา
  async removeAllergen(allergyId) {
    if (App.state.currentRole === 'patient') {
      const confirmDelete = confirm('⚠️ คำเตือนความปลอดภัย: การลบประวัติแพ้ยาจะทำให้ระบบยกเลิกการดักเตือนความเสี่ยงการแพ้ยาตัวนี้ คุณแน่ใจหรือไม่ว่าต้องการดำเนินการต่อ?');
      if (!confirmDelete) return;
    } else {
      const confirmDelete = confirm('คุณต้องการลบประวัติการแพ้ยานี้ใช่หรือไม่?');
      if (!confirmDelete) return;
    }

    const state = App.getState();
    state.allergyLog = state.allergyLog.filter(a => a.id !== allergyId);
    App.setState(state);
    Utils.showToast('ลบประวัติการแพ้ยาเรียบร้อยแล้ว', 'success');
    this.render();
  },

  async addAllergyLog(medicineName, severity, symptoms) {
    if (App.state.currentRole === 'patient') {
      const confirmAdd = confirm('⚠️ คำเตือนความปลอดภัย: ประวัติการแพ้ยามีความสำคัญอย่างยิ่งต่อการตรวจสอบความปลอดภัยของยา หากระบุไม่ถูกต้องอาจส่งผลต่อการตรวจจับสารอันตราย คุณแน่ใจหรือไม่ว่าต้องการเพิ่มข้อมูลนี้ด้วยตนเอง?');
      if (!confirmAdd) return;
    }
    if (!medicineName) {
      Utils.showToast('กรุณากรอกชื่อยาที่แพ้ด้วยค่ะ', 'error');
      return;
    }
    const state = App.getState();
    const newAllergy = {
      id: 'allergy_' + Date.now(),
      medicineName: medicineName.trim(),
      severity: severity, // 'mild' | 'moderate' | 'severe'
      symptoms: symptoms.trim() || 'ไม่ระบุอาการ'
    };
    state.allergyLog = [newAllergy, ...(state.allergyLog || [])];
    App.setState(state);
    Utils.showToast('เพิ่มประวัติการแพ้ยาเรียบร้อยแล้ว', 'success');
    this.render();
    Utils.hideBottomSheet('allergy-form-sheet');
  }
};
