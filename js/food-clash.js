// ระบบตรวจเช็กของแสลง (Food Clash Analyzer)
// ออกแบบโดยเน้นสไตล์ที่สอดคล้องกับ UX/UI ดั้งเดิมของ YaCheck 100%

const FoodClash = {
  inputText: '',
  result: null,

  // เรนเดอร์หน้าจอหลัก
  render() {
    const container = document.querySelector('#page-food-clash .page-content');
    if (!container) return;

    const state = App.getState();
    const isPatient = state.currentRole === 'patient';
    const fontOffset = state.user.fontSize === 'large' ? 1.15 : (state.user.fontSize === 'xlarge' ? 1.35 : 1.0);

    let contentHtml = '';

    if (!this.result) {
      // หน้าจอเริ่มต้นค้นหา
      contentHtml = `
        <div class="card" style="padding: var(--space-md); border-radius: var(--radius-lg); background: var(--color-surface); box-shadow: var(--shadow-sm); border: 1.5px solid var(--color-border); text-align: center; margin-bottom: var(--space-md);">
          <p class="text-secondary" style="font-size: calc(1.05rem * ${fontOffset}); line-height: 1.6; margin-bottom: var(--space-md);">
            สามารถพิมพ์ชื่ออาหาร สมุนไพร หรือผลไม้ หรือคลิกปุ่มเลือกด่วนด้านล่าง ระบบจะช่วยเช็กความปลอดภัยออฟไลน์ทันทีว่าตีกับยาในตู้หรือโรคประจำตัวหรือไม่ค่ะ!
          </p>
          
          <div style="font-weight: 700; color: var(--color-primary); font-size: calc(0.95rem * ${fontOffset}); text-align: left; margin-bottom: var(--space-sm); display: flex; align-items: center; gap: 6px;">
            💡 รายการที่พบบ่อย (กดเพื่อเช็ก):
          </div>
          <div class="food-suggestions-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-sm);">
            <button class="btn btn-outline" onclick="FoodClash.checkFoodQuick('ส้มโอ')" style="font-size: calc(0.9rem * ${fontOffset}); padding: 10px 6px; height: auto; text-align: center; border-radius: var(--radius-md); font-weight:600;">🍊 ส้มโอ</button>
            <button class="btn btn-outline" onclick="FoodClash.checkFoodQuick('เค็ม')" style="font-size: calc(0.9rem * ${fontOffset}); padding: 10px 6px; height: auto; text-align: center; border-radius: var(--radius-md); font-weight:600;">🍜 ของเค็มจัด</button>
            <button class="btn btn-outline" onclick="FoodClash.checkFoodQuick('น้ำผึ้ง')" style="font-size: calc(0.9rem * ${fontOffset}); padding: 10px 6px; height: auto; text-align: center; border-radius: var(--radius-md); font-weight:600;">🍯 ของหวานจัด</button>
            <button class="btn btn-outline" onclick="FoodClash.checkFoodQuick('นม')" style="font-size: calc(0.9rem * ${fontOffset}); padding: 10px 6px; height: auto; text-align: center; border-radius: var(--radius-md); font-weight:600;">🥛 นมสด / แคลเซียม</button>
            <button class="btn btn-outline" onclick="FoodClash.checkFoodQuick('แปะก๊วย')" style="font-size: calc(0.9rem * ${fontOffset}); padding: 10px 6px; height: auto; text-align: center; border-radius: var(--radius-md); font-weight:600;">🌿 ใบแปะก๊วย / โสม</button>
            <button class="btn btn-outline" onclick="FoodClash.checkFoodQuick('กาแฟ')" style="font-size: calc(0.9rem * ${fontOffset}); padding: 10px 6px; height: auto; text-align: center; border-radius: var(--radius-md); font-weight:600;">☕ ชา / กาแฟ</button>
            <button class="btn btn-outline" onclick="FoodClash.checkFoodQuick('แอลกอฮอล์')" style="font-size: calc(0.9rem * ${fontOffset}); padding: 10px 6px; height: auto; text-align: center; border-radius: var(--radius-md); font-weight:600;">🍺 ยาดอง / เหล้า</button>
            <button class="btn btn-outline" onclick="FoodClash.checkFoodQuick('กล้วย')" style="font-size: calc(0.9rem * ${fontOffset}); padding: 10px 6px; height: auto; text-align: center; border-radius: var(--radius-md); font-weight:600;">🍌 กล้วย / ส้ม</button>
          </div>
        </div>
      `;
    } else {
      // หน้าจอแสดงการแจ้งเตือนความปลอดภัย
      const r = this.result;
      const isSevere = r.severity === 'red';
      const isModerate = r.severity === 'yellow';
      const alertClass = isSevere ? 'alert-danger' : (isModerate ? 'alert-warning' : 'alert-safe');
      const alertIcon = isSevere ? Utils.getIconSvg('emergency', 'icon-lg') : (isModerate ? Utils.getIconSvg('alertTriangle', 'icon-lg') : Utils.getIconSvg('checkCircle', 'icon-lg'));
      const severityLabel = isSevere ? 'ห้ามรับประทานร่วมกัน' : (isModerate ? 'โปรดสอบถามแพทย์หรือเภสัชกรก่อน' : 'ยังไม่พบรายการที่ตรงกัน');

      contentHtml = `
        <div class="alert-card ${alertClass}" style="animation: slideUp 0.4s ease; text-align: left; padding: var(--space-md); border-radius: var(--radius-lg); margin-bottom: var(--space-md);">
          <div class="alert-icon" style="text-align: center; margin-bottom: var(--space-sm);">${alertIcon}</div>
          <h2 class="alert-title" style="text-align: center; font-size: calc(1.3rem * ${fontOffset});">${severityLabel}</h2>
          <h3 class="alert-subtitle" style="text-align: center; font-size: calc(1.05rem * ${fontOffset}); color: var(--color-text); margin-bottom: var(--space-md);">${r.food}</h3>

          <div style="font-size: calc(0.95rem * ${fontOffset}); line-height: 1.6; color: var(--color-text-secondary); background: rgba(255, 255, 255, 0.5); padding: var(--space-md); border-radius: var(--radius-md); border: 1px solid var(--color-border); margin-bottom: var(--space-md);">
            <strong>ผลการวิเคราะห์:</strong><br>
            ${r.descTh}
          </div>

          <div class="recommendation-section" style="margin-top: 12px;">
            <h4 style="display: flex; align-items: center; gap: 6px; font-size: calc(0.95rem * ${fontOffset}); margin-bottom: var(--space-xs); font-weight:700;">
              ${Utils.getIconSvg('sparkles', 'icon-sm', 'color: var(--color-primary)')}
              ข้อควรปฏิบัติ:
            </h4>
            <ul style="padding-left: 20px; font-size: calc(0.9rem * ${fontOffset}); line-height: 1.55; color: var(--color-text-secondary);">
              ${isSevere ? `
                <li style="margin-bottom: 4px;">❌ <strong>หลีกเลี่ยงการทานอาหารชนิดนี้โดยเด็ดขาด</strong></li>
                <li style="margin-bottom: 4px;">📞 ปรึกษาแพทย์หรือเภสัชกร หากมีความจำเป็นต้องใช้</li>
                <li style="margin-bottom: 4px;">💬 แจ้งลูกหลานและผู้ดูแลเกี่ยวกับการเตือนนี้</li>
              ` : isModerate ? `
                <li style="margin-bottom: 4px;">⚠️ <strong>อย่ารับประทานร่วมกับยาที่เกี่ยวข้องในตอนนี้</strong></li>
                <li style="margin-bottom: 4px;">🩺 สอบถามแพทย์หรือเภสัชกรให้แน่ใจก่อน</li>
              ` : `
                <li style="margin-bottom: 4px;">🟢 <strong>ผลนี้ไม่ใช่การยืนยันว่าปลอดภัยสำหรับทุกคน</strong></li>
                <li style="margin-bottom: 4px;">ใช้ตามคำแนะนำแพทย์หรือเภสัชกรเมื่อไม่แน่ใจ</li>
              `}
            </ul>
          </div>
        </div>

        <div style="display: flex; gap: var(--space-sm); width:100%;">
          <button class="btn btn-outline" style="flex:1; font-size: calc(0.95rem * ${fontOffset});" onclick="FoodClash.resetSearch()">
            ค้นหาใหม่
          </button>
          <button class="btn btn-primary" style="flex:1.2; font-size: calc(0.95rem * ${fontOffset}); display:flex; align-items:center; justify-content:center; gap: 6px;" onclick="App.navigate('dashboard')">
            ${Utils.getIconSvg('home', 'icon-sm')} กลับหน้าแรก
          </button>
        </div>
      `;
    }

    // เรนเดอร์ส่วนของหน้าจอทั้งหมด
    container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-md);">
        <h2 class="page-title" style="display: flex; align-items: center; gap: var(--space-sm); margin: 0; font-size: calc(1.4rem * ${fontOffset});">
          🍊 เช็กของแสลง
        </h2>
        <button class="btn btn-ghost" style="padding: 6px 12px; height: auto; font-size: calc(0.9rem * ${fontOffset});" onclick="App.navigate('dashboard')">
          ← กลับ
        </button>
      </div>

      <div class="form-group" style="display: flex; gap: 8px; margin-bottom: var(--space-md); width:100%;">
        <input type="text" class="form-input" id="food-search-input" 
          placeholder="พิมพ์ชื่ออาหารหรือสมุนไพร..." 
          value="${this.inputText}" 
          style="flex: 1; height: 50px; font-size: calc(1rem * ${fontOffset}); border: 1.5px solid var(--color-border); border-radius: var(--radius-md); padding-left: 12px; background: var(--color-surface);"
          oninput="FoodClash.inputText = this.value"
          onkeydown="if(event.key === 'Enter') FoodClash.checkFood()">
        <button class="btn btn-primary" style="width: 50px; height: 50px; padding:0; display:flex; align-items:center; justify-content:center; border-radius: var(--radius-md);" onclick="FoodClash.checkFood()">
          ${Utils.getIconSvg('search', 'icon-sm')}
        </button>
      </div>

      <div id="food-clash-body-container">
        ${contentHtml}
      </div>
    `;

    // ผูก Event เพิ่มเติมหลังจาก Render เสร็จ
    const searchInput = document.getElementById('food-search-input');
    if (searchInput) {
      searchInput.focus();
    }
  },

  // เช็กด่วนจากปุ่มคีย์เวิร์ดลัด
  checkFoodQuick(foodKeyword) {
    this.inputText = foodKeyword;
    const input = document.getElementById('food-search-input');
    if (input) input.value = foodKeyword;
    this.checkFood();
  },

  // ดำเนินการวิเคราะห์และตรวจสอบความปลอดภัย
  checkFood() {
    const query = this.inputText.trim().toLowerCase();
    if (!query) {
      Utils.showToast('กรุณากรอกชื่ออาหารก่อนค่ะ', 'warning');
      return;
    }

    Utils.hapticFeedback();

    const state = App.getState();
    const myMeds = state.myMedicines || [];
    const diseases = state.user.diseases || [];

    // 1. ค้นหาในคลังข้อมูลแสลง (MedicineDB.foodClashes)
    const foundFood = MedicineDB.foodClashes.find(item => 
      item.keywords.some(k => query.includes(k.toLowerCase()) || k.toLowerCase().includes(query))
    );

    if (!foundFood) {
      // เคสที่ 1: ไม่พบในประวัติแสลง
      this.result = {
        food: this.inputText,
        severity: 'green',
        descTh: `ยังไม่พบรายการที่ตรงกับ "${this.inputText}" ในข้อมูลปัจจุบัน แต่ผลนี้ไม่ใช่การยืนยันว่าปลอดภัยสำหรับทุกคน`,
        speechTh: `ยังไม่พบข้อมูลที่ตรงกันสำหรับ ${this.inputText} ค่ะ กรุณาสอบถามเภสัชกรเมื่อไม่แน่ใจค่ะ`
      };
      this.render();
      Utils.speak(this.result.speechTh);
      this.logActivity(`เช็กของแสลง: "${this.inputText}" (ยังไม่พบข้อมูลที่ตรงกัน)`);
      return;
    }

    // 2. ตรวจความขัดแย้งโรคประจำตัว
    const clashingDiseases = diseases.filter(d => 
      foundFood.conditions && foundFood.conditions.diseases && foundFood.conditions.diseases.includes(d)
    );

    // 3. ตรวจความขัดแย้งยาในตู้ยา
    const clashingMeds = myMeds.filter(med => {
      const dbMed = MedicineDB.medicines.find(m => m.id === med.medicineId);
      if (!dbMed) return false;
      const nameEn = dbMed.nameEn.toLowerCase();
      const nameTh = dbMed.nameTh.toLowerCase();

      const inMeds = foundFood.conditions && foundFood.conditions.meds && foundFood.conditions.meds.some(k => 
        nameEn.includes(k.toLowerCase()) || nameTh.includes(k.toLowerCase()) || k.toLowerCase().includes(nameEn)
      );
      const inClash = foundFood.clashWith && foundFood.clashWith.some(k => 
        nameEn.includes(k.toLowerCase()) || nameTh.includes(k.toLowerCase()) || k.toLowerCase().includes(nameEn)
      );
      return inMeds || inClash;
    });

    // 4. แสดงความขัดแย้ง
    if (clashingDiseases.length > 0 || clashingMeds.length > 0) {
      const isRed = foundFood.severity === 'red';
      
      let clashReason = '';
      if (clashingDiseases.length > 0) {
        clashReason += `⚠️ ขัดกับโรคประจำตัวที่เลือกไว้ในประวัติสุขภาพ<br>`;
      }
      if (clashingMeds.length > 0) {
        clashReason += `💊 ขัดกับยากลุ่มสำคัญที่บันทึกไว้ในตู้ยาประจำตัว<br>`;
      }

      const safeDescText = isRed
        ? 'ห้ามรับประทานรายการนี้ร่วมกับยาที่เกี่ยวข้อง ระบบไม่แสดงรายละเอียดผลกระทบเพื่อความปลอดภัย'
        : 'อย่ารับประทานรายการนี้ร่วมกับยาที่เกี่ยวข้องจนกว่าจะสอบถามแพทย์หรือเภสัชกร ระบบไม่แสดงรายละเอียดผลกระทบ';

      const clashDesc = `
        ${clashReason}<br>
        <strong>ข้อแนะนำเพื่อความปลอดภัย:</strong><br>
        ${safeDescText}
      `;

      this.result = {
        food: foundFood.food,
        severity: foundFood.severity,
        descTh: clashDesc,
        speechTh: isRed 
          ? `ห้ามรับประทานรายการนี้ร่วมกับยาที่เกี่ยวข้องค่ะ อย่าปรับหรือหยุดยาเดิมเอง ให้ติดต่อแพทย์หรือเภสัชกรทันทีค่ะ`
          : `อย่ารับประทานรายการนี้ร่วมกับยาที่เกี่ยวข้องจนกว่าจะสอบถามแพทย์หรือเภสัชกรค่ะ`
      };
      
      this.render();
      
      if (isRed) {
        Utils.playAlarm(); // เปิดแจ้งไซเรนเบาๆ เมื่อเกิดอันตรายสูง
      }
      
      Utils.speak(this.result.speechTh);
      this.logActivity(`เช็กของแสลง: "${this.inputText}" (ตรวจพบอันตรายระดับ: ${foundFood.severity})`);
    } else {
      // ของแสลงตัวนี้มีในฐานข้อมูล แต่คนไข้ไม่ได้เป็นโรคและไม่ได้กินยากลุ่มนี้
      const detailInfo = [];
      const diseaseMapping = {
        diabetes: 'เบาหวาน', hypertension: 'ความดันสูง', kidney: 'โรคไต',
        heart: 'โรคหัวใจ', lipid: 'ไขมันสูง', stomach: 'โรคกระเพาะ', liver: 'โรคตับ'
      };
      
      if (foundFood.conditions && foundFood.conditions.diseases) {
        detailInfo.push(`โรคประจำตัว (${foundFood.conditions.diseases.map(d => diseaseMapping[d] || d).join(', ')})`);
      }
      if (foundFood.conditions && foundFood.conditions.meds) {
        detailInfo.push(`ยากลุ่ม (${foundFood.conditions.meds.join(', ')})`);
      }

      const safeDesc = `
        🟢 <strong>ยังไม่พบความเสี่ยงที่ตรงกับข้อมูลปัจจุบัน</strong><br><br>
        รายการนี้มีข้อควรระวังสำหรับผู้ที่มี ${detailInfo.join(' หรือ ')} แต่ระบบยังไม่พบข้อมูลเหล่านั้นในบัญชีนี้ ผลนี้ไม่ใช่การยืนยันว่าปลอดภัยสำหรับทุกคน
      `;

      this.result = {
        food: foundFood.food,
        severity: 'green',
        descTh: safeDesc,
        speechTh: `ยังไม่พบความเสี่ยงที่ตรงกับข้อมูลในระบบค่ะ กรุณาสอบถามเภสัชกรเมื่อไม่แน่ใจค่ะ`
      };
      this.render();
      Utils.speak(this.result.speechTh);
      this.logActivity(`เช็กของแสลง: "${this.inputText}" (ยังไม่พบความเสี่ยงที่ตรงกับข้อมูลปัจจุบัน)`);
    }
  },

  resetSearch() {
    this.result = null;
    this.inputText = '';
    this.render();
    Utils.speak("พร้อมเช็กอาหารรายการต่อไปแล้วค่ะ");
  },

  logActivity(text) {
    const state = App.getState();
    const notifications = state.notifications || [];
    notifications.unshift({
      id: 'notif_' + Date.now(),
      type: 'info',
      time: new Date().toISOString(),
      message: `[YaCheck ออฟไลน์] ` + text
    });
    App.updateState('notifications', notifications);
  }
};
