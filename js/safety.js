// หน้าตรวจสอบความปลอดภัยยาและของแสลง (Safety Screen Module)
// อ้างอิงโครงสร้างหน้าจอความปลอดภัยล่าสุดของแอปจริง

const Safety = {
  foodQuery: '',
  foodSubmitted: '',
  pairCheckMed1: '',
  pairCheckMed2: '',
  showPairChecker: false,
  showDirectory: false,

  // วาดหน้าจอความปลอดภัยหลัก
  render() {
    const container = document.querySelector('#page-safety .page-content');
    if (!container) return;

    if (this.showPairChecker) {
      this.renderPairChecker(container);
      return;
    }

    if (this.showDirectory) {
      this.renderDirectory(container);
      return;
    }

    const state = App.getState();
    const activeMeds = (state.myMedicines || []).filter(m => m.status === 'active');
    
    // ตรวจคู่ยาตีกันในตู้ยาปัจจุบัน
    const drugFindings = this.checkDrugInteractions(activeMeds.map(m => m.medicineId));
    
    // ตรวจอาหารแสลง
    const foodFindings = this.checkFoodQuery(this.foodSubmitted, activeMeds, state.user.diseases || []);

    let activeMedsHtml = activeMeds.length > 0
      ? activeMeds.map(m => {
          const dbMed = MedicineDB.getMedicine(m.medicineId);
          return dbMed ? dbMed.nameTh : m.medicineId;
        }).join(' · ')
      : 'ยังไม่มียาในตู้';

    let drugWarningsHtml = '';
    if (drugFindings.length === 0) {
      drugWarningsHtml = `
        <div class="safety-banner-item" style="border: 1.5px solid var(--color-border); background-color: var(--color-bg); border-radius: var(--radius-md); padding: 14px; display: flex; flex-direction: column; gap: 4px; text-align: left;">
          <strong style="color: var(--color-text); font-size: 1rem; font-family: 'Prompt', sans-serif;">ยังไม่พบคู่ยาที่ตรงกับรายการคำเตือน</strong>
          <span style="font-size: 0.85rem; color: var(--color-text-secondary); line-height: 1.4;">ผลนี้ไม่ได้ยืนยันว่าปลอดภัยทุกกรณี โดยเฉพาะยาที่ฐานข้อมูลยังไม่ครอบคลุม</span>
        </div>
      `;
    } else {
      drugFindings.forEach(finding => {
        drugWarningsHtml += this.renderSafetyBanner(finding.severity, finding.title, `${finding.description} ${finding.advice}`);
      });
    }

    let foodWarningsHtml = '';
    if (this.foodSubmitted) {
      if (foodFindings.length === 0) {
        foodWarningsHtml = this.renderSafetyBanner('safe', 'ยังไม่พบคำเตือนที่ตรงกัน', 'ฐานข้อมูลอาจไม่ครอบคลุมอาหาร ยา ขนาดยา และโรคทั้งหมด หากไม่แน่ใจให้สอบถามเภสัชกร');
      } else {
        foodFindings.forEach(finding => {
          foodWarningsHtml += this.renderSafetyBanner(finding.severity, finding.title, `${finding.description} ${finding.advice}`);
        });
      }
    }

    container.innerHTML = `
      <div class="safety-page-wrapper" style="display: flex; flex-direction: column; gap: var(--space-md); animation: fadeIn 0.4s ease;">
        
        <!-- ส่วนหัวแสดงเวอร์ชันฐานข้อมูล -->
        <div class="catalog-status-card" style="background-color: var(--color-primary-light); color: var(--color-primary-dark); padding: 12px 14px; border-radius: var(--radius-md); font-size: 0.85rem; display: flex; align-items: center; justify-content: space-between; font-weight: 700; border: 1px solid var(--color-border);">
          <span style="display: flex; align-items: center; gap: 6px;">
            ${Utils.getIconSvg('checkCircle', 'icon-xs')}
            ฐานข้อมูลยา: เผยแพร่แล้ว (v1.42)
          </span>
          <span style="font-size: 0.78rem; opacity: 0.8;">ทบทวนล่าสุด: กรกฎาคม 2569</span>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 8px;">
          <div>
            <h2 class="page-title" style="display: flex; align-items: center; gap: var(--space-sm); font-family: 'Prompt', sans-serif; margin-bottom: 4px;">
              <svg class="svg-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: var(--color-primary); width:26px; height:26px;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              ระบบเช็คความปลอดภัยยา (Safety)
            </h2>
            <p class="text-secondary" style="font-size: 0.95rem;">เครื่องมือวิเคราะห์ความปลอดภัยทางคลินิกที่ผ่านการอนุมัติแล้ว</p>
          </div>
        </div>

        <!-- Action Tiles -->
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <div class="action-tile-item card" onclick="Safety.openPairChecker()" style="display: flex; align-items: center; gap: 14px; padding: 14px 16px; border-radius: var(--radius-md); background: var(--color-surface); border: 1.5px solid var(--color-border); box-shadow: var(--shadow-sm); cursor: pointer; transition: all var(--transition-fast);">
            <div style="background-color: var(--color-primary-light); width: 44px; height: 44px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; color: var(--color-primary);">
              ${Utils.getIconSvg('sparkles', 'icon-md')}
            </div>
            <div style="flex: 1; text-align: left; display: flex; flex-direction: column; gap: 2px;">
              <strong style="font-size: 1.05rem; color: var(--color-text); font-family: 'Prompt', sans-serif;">ตรวจยาสองตัว (Pair Checker)</strong>
              <span style="font-size: 0.85rem; color: var(--color-text-secondary);">เลือกยาสองตัวเพื่อตรวจสอบความปลอดภัยและผลกระทบ</span>
            </div>
            <span style="color: var(--color-secondary);">${Utils.getIconSvg('chevronRight', 'icon-sm')}</span>
          </div>

          <div class="action-tile-item card" onclick="Safety.openDirectory()" style="display: flex; align-items: center; gap: 14px; padding: 14px 16px; border-radius: var(--radius-md); background: var(--color-surface); border: 1.5px solid var(--color-border); box-shadow: var(--shadow-sm); cursor: pointer; transition: all var(--transition-fast);">
            <div style="background-color: var(--color-primary-light); width: 44px; height: 44px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; color: var(--color-primary);">
              ${Utils.getIconSvg('calendar', 'icon-md')}
            </div>
            <div style="flex: 1; text-align: left; display: flex; flex-direction: column; gap: 2px;">
              <strong style="font-size: 1.05rem; color: var(--color-text); font-family: 'Prompt', sans-serif;">บัญชีคู่ยาที่ควรระวัง (Directory)</strong>
              <span style="font-size: 0.85rem; color: var(--color-text-secondary);">ดูและกรองคู่ยาตีกันร้ายแรงทั้งหมดในคลังระบบ</span>
            </div>
            <span style="color: var(--color-secondary);">${Utils.getIconSvg('chevronRight', 'icon-sm')}</span>
          </div>
        </div>

        <!-- Section: ยาที่ใช้ร่วมกันในตู้ยา -->
        <div class="card" style="padding: 16px; border-radius: var(--radius-md); background: var(--color-surface); border: 1.5px solid var(--color-border); box-shadow: var(--shadow-sm); display: flex; flex-direction: column; gap: 12px; text-align: left;">
          <h3 style="font-family: 'Prompt', sans-serif; font-size: 1.15rem; font-weight: 700; color: var(--color-primary); margin: 0;">ยาที่กำลังใช้ร่วมกัน</h3>
          <p class="text-secondary" style="font-size: 0.95rem; line-height: 1.45; margin: 0;">
            ${activeMedsHtml}
          </p>
          <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 4px;">
            ${drugWarningsHtml}
          </div>
        </div>

        <!-- Section: ตรวจอาหารและสมุนไพร -->
        <div class="card" style="padding: 16px; border-radius: var(--radius-md); background: var(--color-surface); border: 1.5px solid var(--color-border); box-shadow: var(--shadow-sm); display: flex; flex-direction: column; gap: 12px; text-align: left;">
          <h3 style="font-family: 'Prompt', sans-serif; font-size: 1.15rem; font-weight: 700; color: var(--color-primary); margin: 0;">ตรวจอาหารและสมุนไพร</h3>
          
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <label style="font-size: 0.92rem; font-weight: 700; color: var(--color-text);">ชื่ออาหาร เครื่องดื่ม หรือสมุนไพร</label>
            <input type="text" id="safety-food-input" placeholder="เช่น ส้มโอ กาแฟ โสม หรือแอลกอฮอล์" value="${this.foodQuery}" oninput="Safety.foodQuery = this.value" style="width: 100%; height: 44px; border: 1.5px solid var(--color-border); border-radius: var(--radius-md); padding: 0 12px; font-size: 0.95rem; background-color: var(--color-bg); color: var(--color-text);">
          </div>
          
          <button class="btn btn-primary btn-full" onclick="Safety.checkFood()" style="height: 48px; border-radius: var(--radius-md); font-weight: 700;">
            ตรวจความเสี่ยงอาหาร
          </button>
          
          <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 4px;">
            ${foodWarningsHtml}
          </div>
        </div>

        <!-- ข้อจำกัดทางคลินิกด้านล่าง -->
        <div style="padding: 12px; border-radius: var(--radius-md); background-color: var(--color-warning-bg); border-left: 4.5px solid var(--color-warning); text-align: left; animation: fadeIn 0.4s ease;">
          <span style="color: var(--color-warning); font-size: 0.85rem; font-weight: 700; line-height: 1.5; display: block;">
            ⚠️ ข้อจำกัดทางคลินิก: ระบบใช้ข้อมูลคัดกรองเบื้องต้นตามคู่ที่เผยแพร่แล้ว ผลสรุปที่ปลอดภัยไม่สามารถทดแทนคำยืนยันเฉพาะบุคคลจากแพทย์หรือเภสัชกรผู้รักษาได้
          </span>
        </div>

      </div>
    `;
  },

  // เรนเดอร์ Safety Banner
  renderSafetyBanner(severity, title, description) {
    const isSevere = severity === 'severe';
    const isModerate = severity === 'moderate';
    const isSafe = severity === 'safe';

    const bg = isSevere ? 'var(--color-danger-bg)' : isModerate ? 'var(--color-warning-bg)' : 'var(--color-safe-bg)';
    const border = isSevere ? 'var(--color-danger)' : isModerate ? 'var(--color-warning)' : 'var(--color-safe)';
    const text = isSevere ? 'var(--color-danger)' : isModerate ? 'var(--color-warning)' : 'var(--color-safe)';
    const icon = isSevere ? Utils.getIconSvg('emergency', 'icon-md') : isModerate ? Utils.getIconSvg('alertTriangle', 'icon-md') : Utils.getIconSvg('checkCircle', 'icon-md');

    return `
      <div class="safety-banner-item" style="border: 1.5px solid ${border}; background-color: ${bg}; border-radius: var(--radius-md); padding: 14px; display: flex; gap: 12px; align-items: flex-start; text-align: left; animation: slideUp 0.3s ease;">
        <div style="color: ${text}; flex-shrink: 0; margin-top: 2px;">
          ${icon}
        </div>
        <div style="flex: 1; display: flex; flex-direction: column; gap: 3px;">
          <strong style="color: ${text}; font-size: 1.02rem; font-family: 'Prompt', sans-serif;">${title}</strong>
          <span style="font-size: 0.88rem; color: var(--color-text); line-height: 1.45;">${description}</span>
        </div>
      </div>
    `;
  },

  // หน้าตรวจยาสองตัว (Pair Checker Interface)
  renderPairChecker(container) {
    const state = App.getState();
    const allMeds = MedicineDB.medicines;

    // คำนวณผลการตรวจยาสองตัว
    let resultHtml = '';
    if (this.pairCheckMed1 && this.pairCheckMed2) {
      if (this.pairCheckMed1 === this.pairCheckMed2) {
        resultHtml = this.renderSafetyBanner('safe', 'กรุณาเลือกยาที่ต่างกัน', 'ไม่สามารถจับคู่ตรวจยาตัวเดียวกันได้');
      } else {
        const finding = this.checkDrugPair(this.pairCheckMed1, this.pairCheckMed2);
        if (finding) {
          resultHtml = this.renderSafetyBanner(finding.severity, finding.title, `${finding.description} ${finding.advice}`);
        } else {
          resultHtml = this.renderSafetyBanner('safe', 'ไม่พบความเสี่ยงยาตีกันในคู่นี้', 'ยาสองตัวนี้ไม่พบข้อห้ามใช้ขัดแย้งในคลังข้อมูลความปลอดภัย แต่อย่างไรก็ตาม ควรใช้ตามที่แพทย์หรือเภสัชกรแนะนำ');
        }
      }
    }

    container.innerHTML = `
      <div class="safety-pair-checker" style="display: flex; flex-direction: column; gap: var(--space-md); animation: fadeIn 0.3s ease; text-align: left;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <button class="btn btn-ghost" onclick="Safety.closeSubPages()" style="border:none; padding:4px; height:auto; color:var(--color-primary);">
            ${Utils.getIconSvg('chevronLeft', 'icon-md')}
          </button>
          <h2 class="page-title" style="font-family: 'Prompt', sans-serif; margin: 0;">ตรวจยาสองตัว (Pair Checker)</h2>
        </div>

        <div class="card" style="padding: 16px; border-radius: var(--radius-md); background: var(--color-surface); border: 1.5px solid var(--color-border); box-shadow: var(--shadow-sm); display: flex; flex-direction: column; gap: 14px;">
          <!-- ตัวเลือกที่ 1 -->
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <label style="font-size: 0.92rem; font-weight: 700; color: var(--color-text);">เลือกยาตัวที่ 1</label>
            <select id="pair-med-1" onchange="Safety.setPairMed(1, this.value)" style="width: 100%; height: 44px; background-color: var(--color-bg); border: 1.5px solid var(--color-border); border-radius: var(--radius-md); padding: 0 10px; font-size: 0.95rem; color: var(--color-text);">
              <option value="">-- เลือกยาตัวที่ 1 --</option>
              ${allMeds.map(m => `<option value="${m.id}" ${this.pairCheckMed1 === m.id ? 'selected' : ''}>${m.nameTh} (${m.nameEn})</option>`).join('')}
            </select>
          </div>

          <!-- สลับไอคอน -->
          <div style="display:flex; justify-content:center; color: var(--color-secondary);">
            🗙
          </div>

          <!-- ตัวเลือกที่ 2 -->
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <label style="font-size: 0.92rem; font-weight: 700; color: var(--color-text);">เลือกยาตัวที่ 2</label>
            <select id="pair-med-2" onchange="Safety.setPairMed(2, this.value)" style="width: 100%; height: 44px; background-color: var(--color-bg); border: 1.5px solid var(--color-border); border-radius: var(--radius-md); padding: 0 10px; font-size: 0.95rem; color: var(--color-text);">
              <option value="">-- เลือกยาตัวที่ 2 --</option>
              ${allMeds.map(m => `<option value="${m.id}" ${this.pairCheckMed2 === m.id ? 'selected' : ''}>${m.nameTh} (${m.nameEn})</option>`).join('')}
            </select>
          </div>
        </div>

        <div style="margin-top: var(--space-xs); display: flex; flex-direction: column; gap: 10px;">
          ${resultHtml}
        </div>
      </div>
    `;
  },

  // หน้าแสดงคู่ยาทั้งหมด (Directory)
  renderDirectory(container) {
    const list = MedicineDB.interactions;

    let itemsHtml = '';
    list.forEach(item => {
      const med1 = MedicineDB.getMedicine(item.drug1);
      const med2 = MedicineDB.getMedicine(item.drug2);
      const isSevere = item.severity === 'severe';

      itemsHtml += `
        <div class="directory-list-item card" style="padding: 12px 14px; border-radius: var(--radius-md); border-left: 4.5px solid ${isSevere ? 'var(--color-danger)' : 'var(--color-warning)'}; background: var(--color-surface); border-top: 1.5px solid var(--color-border); border-right: 1.5px solid var(--color-border); border-bottom: 1.5px solid var(--color-border); display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <div style="text-align: left; display: flex; flex-direction: column; gap: 2px;">
            <strong style="color: var(--color-text); font-size: 0.98rem;">${med1 ? med1.nameTh : item.drug1} + ${med2 ? med2.nameTh : item.drug2}</strong>
            <span style="font-size: 0.8rem; color: var(--color-text-secondary);">${med1 ? med1.category : ''} · ${med2 ? med2.category : ''}</span>
          </div>
          <span style="font-size: 0.78rem; font-weight: 700; color: ${isSevere ? 'var(--color-danger)' : 'var(--color-warning)'}; background-color: ${isSevere ? 'var(--color-danger-bg)' : 'var(--color-warning-bg)'}; padding: 3px 8px; border-radius: 10px;">
            ${isSevere ? 'ห้ามใช้ร่วมกัน' : 'ปรึกษาแพทย์'}
          </span>
        </div>
      `;
    });

    container.innerHTML = `
      <div class="safety-directory" style="display: flex; flex-direction: column; gap: var(--space-md); animation: fadeIn 0.3s ease; text-align: left;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <button class="btn btn-ghost" onclick="Safety.closeSubPages()" style="border:none; padding:4px; height:auto; color:var(--color-primary);">
            ${Utils.getIconSvg('chevronLeft', 'icon-md')}
          </button>
          <h2 class="page-title" style="font-family: 'Prompt', sans-serif; margin: 0;">รายการคู่ยาที่ควรระวัง</h2>
        </div>

        <p class="text-secondary" style="font-size:0.9rem; line-height:1.4; margin-bottom: 4px;">
          คู่ยาตีกันที่ได้รับการทบทวนทางเภสัชกรรมคลินิกแล้วในฐานข้อมูลออฟไลน์ YaCheck (รวมทั้งหมด ${list.length} คู่)
        </p>

        <div style="height: 380px; overflow-y: auto; padding-right: 2px;">
          ${itemsHtml}
        </div>
      </div>
    `;
  },

  // ฟังก์ชันช่วยเหลือสำหรับตรวจคู่ยา
  getDrugPairKey(drugA, drugB) {
    return [drugA, drugB].sort().join('|');
  },

  findDrugInteraction(drugA, drugB) {
    const pairKey = this.getDrugPairKey(drugA, drugB);
    return MedicineDB.interactions.find(item => this.getDrugPairKey(item.drug1, item.drug2) === pairKey);
  },

  checkDrugPair(drugA, drugB) {
    const interaction = this.findDrugInteraction(drugA, drugB);
    if (!interaction) return null;
    
    const isSevere = interaction.severity === 'severe';
    const title = isSevere ? 'ห้ามรับประทานยาคู่นี้ร่วมกัน' : 'โปรดสอบถามแพทย์หรือเภสัชกรก่อนใช้ร่วมกัน';
    const description = isSevere
      ? 'ตรวจพบว่ายาคู่นี้อยู่ในกลุ่มห้ามใช้ร่วมกัน ระบบไม่แสดงรายละเอียดผลกระทบเพื่อความปลอดภัย'
      : 'ตรวจพบว่ายาคู่นี้ต้องได้รับการตรวจสอบก่อนใช้ร่วมกัน ระบบไม่แสดงรายละเอียดผลกระทบเพื่อความปลอดภัย';
    const advice = isSevere
      ? 'อย่าปรับหรือหยุดยาที่ใช้อยู่เอง ให้ติดต่อแพทย์หรือเภสัชกรทันที'
      : 'อย่ารับประทานยาคู่นี้ร่วมกันจนกว่าจะได้รับคำแนะนำจากแพทย์หรือเภสัชกร';

    return {
      id: interaction.id,
      severity: interaction.severity,
      title: `${title}: ${MedicineDB.getMedicine(interaction.drug1)?.nameTh ?? interaction.drug1} + ${MedicineDB.getMedicine(interaction.drug2)?.nameTh ?? interaction.drug2}`,
      description,
      advice
    };
  },

  checkDrugInteractions(medicineIds) {
    const uniqueIds = new Set(medicineIds);
    const findings = [];

    MedicineDB.interactions.forEach(item => {
      if (uniqueIds.has(item.drug1) && uniqueIds.has(item.drug2)) {
        const check = this.checkDrugPair(item.drug1, item.drug2);
        if (check) findings.push(check);
      }
    });

    return findings.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'severe' ? -1 : 1));
  },

  checkFoodQuery(query, cabinet, diseases) {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];
    
    const activeIds = new Set(cabinet.map(item => item.medicineId));
    const diseaseIds = new Set(diseases);

    const findings = [];
    MedicineDB.foodClashes.forEach(item => {
      const matchKeyword = item.keywords.some(k => normalized.includes(k.toLowerCase()) || k.toLowerCase().includes(normalized));
      if (matchKeyword) {
        const matchCondition = 
          (item.medicineIds && item.medicineIds.some(id => activeIds.has(id))) ||
          (item.diseases && item.diseases.some(id => diseaseIds.has(id)));
        
        if (matchCondition) {
          findings.push({
            id: item.id,
            severity: item.severity,
            title: `ควรระวัง ${item.food}`,
            description: item.description,
            advice: 'ข้อมูลนี้ใช้คัดกรองเบื้องต้น ไม่แทนคำแนะนำเฉพาะบุคคลจากแพทย์หรือเภสัชกร'
          });
        }
      }
    });

    return findings;
  },

  // Actions
  openPairChecker() {
    this.showPairChecker = true;
    this.render();
  },

  openDirectory() {
    this.showDirectory = true;
    this.render();
  },

  closeSubPages() {
    this.showPairChecker = false;
    this.showDirectory = false;
    this.render();
  },

  setPairMed(num, val) {
    if (num === 1) this.pairCheckMed1 = val;
    else this.pairCheckMed2 = val;
    this.render();
  },

  checkFood() {
    const input = document.getElementById('safety-food-input');
    if (input) {
      this.foodSubmitted = input.value;
      this.render();
    }
  }
};
