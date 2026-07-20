// ระบบจัดการภารกิจความปลอดภัยเว้นระยะยาและจิบน้ำสะสม (Medication Spacing & Water Challenge Module)
// แยกโค้ดออกจาก app.js เพื่อความสะอาดในการจัดระเบียบโครงสร้าง

const Challenge = {
  speedUp: false,

  recordWaterCup() {
    const state = App.getState();
    if (!state.activeChallenge) return;
    const currentCups = state.activeChallenge.waterCups || 0;
    const newCups = Math.min(4, currentCups + 1);
    
    const active = {
      ...state.activeChallenge,
      waterCups: newCups
    };
    App.setState({ activeChallenge: active });
    
    const speeches = [
      'จิบน้ำแก้วแรกเรียบร้อย สดชื่นขึ้นทันทีเลยค่ะ',
      'แก้วที่สองเรียบร้อย ช่วยเจือจางยาและดูแลกระเพาะอาหารนะคะ',
      'ยอดเยี่ยมค่ะแก้วที่สามแล้ว ช่วยลดความตึงเครียดและถนอมการทำงานของไตค่ะ',
      'สุดยอดเลยค่ะดื่มน้ำครบสี่แก้วแล้ว ร่างกายได้รับน้ำสะอาดถนอมตับและไตอย่างสมบูรณ์แล้วค่ะ'
    ];
    
    Utils.speak(speeches[newCups - 1]);
    Utils.showToast(`จิบน้ำแก้วที่ ${newCups}/4 เรียบร้อยแล้ว`, 'success');
    
    const notifications = state.notifications || [];
    notifications.unshift({
      id: 'notif_' + Date.now(),
      type: 'success',
      time: new Date().toISOString(),
      message: `[จิบน้ำสะสม] จิบน้ำแก้วที่ ${newCups}/4 เพื่อความปลอดภัย`
    });
    App.updateState('notifications', notifications);
  },

  toggleSpeedUp() {
    this.speedUp = !this.speedUp;
    Utils.showToast(this.speedUp ? 'เร่งเวลาจำลองภารกิจ' : 'ปิดการเร่งเวลาจำลอง', 'info');
  },

  finish() {
    const state = App.getState();
    if (!state.activeChallenge) return;
    App.setState({ activeChallenge: null });
    Utils.speak("สิ้นสุดภารกิจความปลอดภัยเว้นระยะยาและจิบน้ำสะสมเรียบร้อยแล้วค่ะ ขอให้สุขภาพร่างกายแข็งแรงนะคะ");
    Utils.showToast("เสร็จสิ้นภารกิจความปลอดภัย", "success");
    
    const notifications = state.notifications || [];
    notifications.unshift({
      id: 'notif_' + Date.now(),
      type: 'success',
      time: new Date().toISOString(),
      message: `[เสร็จสิ้นภารกิจ] ผ่านภารกิจความปลอดภัยเว้นระยะยาสำเร็จ`
    });
    App.updateState('notifications', notifications);
  },

  start(medName) {
    App.setState({ activeChallenge: null });
    Utils.speak('ไม่สามารถใช้การเว้นเวลาเพื่อยืนยันความปลอดภัยของคู่ยาได้ กรุณาสอบถามแพทย์หรือเภสัชกรค่ะ');
    Utils.showToast(`ยังไม่ควรรับประทาน ${medName} ร่วมกับยาเดิมจนกว่าจะสอบถามแพทย์หรือเภสัชกร`, 'warning');
  },

  tick() {
    const state = App.getState();
    if (state.activeChallenge && state.activeChallenge.timeLeft > 0) {
      const active = { ...state.activeChallenge };
      const step = this.speedUp ? 120 : 1; // เร่งเวลาจำลองทีละ 120 วินาที
      active.timeLeft = Math.max(0, active.timeLeft - step);
      
      // เช็คกรณีเวลาหมดลง
      if (active.timeLeft === 0) {
        this.speedUp = false;
        Utils.speak('ครบเวลาแล้ว แต่ระบบไม่สามารถยืนยันว่าคู่ยาปลอดภัย กรุณาสอบถามแพทย์หรือเภสัชกรค่ะ');
        Utils.showToast('ระบบไม่สามารถยืนยันความปลอดภัยของคู่ยาได้', 'warning');
      }
      
      App.setState({ activeChallenge: active });
      
      // อัปเดตวิดเจ็ตหน้าแรกแดชบอร์ด
      if (App.currentPage === 'dashboard') {
        if (typeof Dashboard !== 'undefined' && Dashboard.render) Dashboard.render();
      }
    }
  }
};
