// MaCheck — Comprehensive i18n Translation Engine & Dictionary (TH / EN)

const I18n = {
  currentLang: localStorage.getItem('macheck_language') || 'th',

  translations: {
    th: {
      // Header & Navigation
      app_title: 'MaCheck — ระบบจัดการยาและสแกนความปลอดภัย',
      nav_dashboard: 'แดชบอร์ด',
      nav_cabinet: 'ตู้ยาส่วนตัว',
      nav_add: 'เพิ่มยา',
      nav_safety: 'ตรวจความปลอดภัย',
      nav_scanner: 'สแกนฉลากยา',
      nav_food_clash: 'ยา-อาหารตีกัน',
      nav_pitch: 'พรีเซนต์เดโม',
      nav_agent: 'AI ผู้ช่วย',
      nav_settings: 'ตั้งค่า',
      
      // Language Toggle
      lang_th: 'ไทย',
      lang_en: 'English',
      switch_lang: 'เปลี่ยนภาษา / Switch Language',

      // Dashboard
      dash_welcome: 'ยินดีต้อนรับสู่ MaCheck',
      dash_subtitle: 'ระบบดูแลและติดตามการทานยาของคุณให้ปลอดภัย 100%',
      dash_today_title: 'ตารางการทานยาวันนี้',
      dash_adherence: 'ความสม่ำเสมอในการทานยา',
      dash_water_title: 'บันทึกการดื่มน้ำวันนี้',
      dash_water_btn: '+ ดื่มน้ำ 1 แก้ว',
      dash_glass_unit: 'แก้ว',
      dash_no_meds_today: 'ไม่มีรายการยาที่ต้องทานในเวลานี้',
      dash_quick_scan: 'สแกนฉลากยาแบบด่วน',
      dash_safety_status: 'สถานะความปลอดภัยตู้ยา',
      dash_status_safe: 'ปลอดภัย — ไม่พบคู่ยาตีกันในตู้ยาของคุณ',
      dash_status_warning: 'คำเตือน — พบคู่ยาที่มีความเสี่ยงตีกัน',

      // Cabinet
      cabinet_title: 'ตู้ยาส่วนตัวของคุณ',
      cabinet_subtitle: 'รายการยาทั้งหมดที่คุณกำลังรับประทานอยู่',
      cabinet_empty: 'ยังไม่มีรายการยาในตู้ยา',
      cabinet_add_btn: '+ เพิ่มยาใหม่เข้าตู้',
      cabinet_status_active: 'กำลังรับประทาน',
      cabinet_status_stopped: 'หยุดรับประทานแล้ว',
      cabinet_stop_btn: 'หยุดยา',
      cabinet_resume_btn: 'ทานต่อ',
      cabinet_delete_btn: 'ลบออก',
      cabinet_dosage: 'ขนาดยา',
      cabinet_schedule: 'เวลาทานยา',
      cabinet_meal_timing: 'มื้ออาหาร',
      meal_before: 'ก่อนอาหาร',
      meal_after: 'หลังอาหาร',
      meal_any: 'พร้อมอาหาร / เวลาใดก็ได้',

      // Add Medicine
      add_med_title: 'เพิ่มยาเข้าตู้ยา',
      add_med_search_placeholder: 'พิมพ์ชื่อยาภาษาไทยหรืออังกฤษ...',
      add_med_custom_btn: '+ ระบุชื่อยาด้วยตนเอง',
      add_med_name_label: 'ชื่อยา (ภาษาไทย หรือ อังกฤษ)',
      add_med_dosage_label: 'ขนาดยา (มิลลิกรัม/เม็ด)',
      add_med_schedule_label: 'เวลาที่ต้องรับประทาน',
      add_med_timing_label: 'คำแนะนำมื้ออาหาร',
      add_med_save_btn: 'บันทึกยาเข้าตู้',

      // Safety & Drug Interactions
      safety_title: 'ระบบตรวจสอบยาตีกัน และอาการแพ้ยา',
      safety_subtitle: 'วิเคราะห์ความปลอดภัยระหว่างยาในตู้ยา โรคประจำตัว และประวัติแพ้ยา',
      safety_check_btn: 'เริ่มวิเคราะห์ความปลอดภัยตู้ยา',
      safety_result_safe: 'ไม่พบประวัติยาตีกัน หรือข้อห้ามรุนแรงในตู้ยาของคุณ',
      safety_result_severe: 'พบคู่ยาตีกันระดับรุนแรง (Severe Warning)',
      safety_result_moderate: 'พบคู่ยาตีกันระดับปานกลาง (Moderate Warning)',
      safety_advice_title: 'ข้อแนะนำทางเภสัชกรรม',

      // Food Clash
      food_clash_title: 'ระบบตรวจสอบข้อห้าม ยา-อาหาร/สมุนไพร',
      food_clash_subtitle: 'ตรวจสอบว่าอาหาร สมุนไพร หรือเครื่องดื่มที่ทาน มีผลต้านฤทธิ์ยาหรือไม่',
      food_clash_search_placeholder: 'ค้นหาชื่ออาหาร สมุนไพร เครื่องดื่ม (เช่น ส้มโอ, นม, ชา, เหล้า)...',

      // Settings
      settings_title: 'ตั้งค่าระบบ',
      settings_font_label: 'ขนาดตัวอักษรสำหรับผู้สูงอายุ',
      font_normal: 'ปกติ (Normal)',
      font_large: 'ใหญ่ (Large)',
      font_xlarge: 'ใหญ่พิเศษ (Extra Large)',
      settings_emergency_label: 'เบอร์ติดต่อฉุกเฉิน',
      settings_save_btn: 'บันทึกการตั้งค่า',
      settings_export_btn: 'ส่งออกข้อมูลสำรอง (JSON Backup)',
      settings_import_btn: 'นำเข้าข้อมูลสำรอง (Restore JSON)',

      // AI Agent
      agent_title: 'MaCheck AI Care Agent',
      agent_welcome: 'สวัสดีครับ ผมคือผู้ช่วย AI เช็คสุขภาพและยา (MaCheck Care Agent) ยินดีต้อนรับครับ สามารถพิมพ์สอบถามข้อมูลยา โรค หรืออาการแพ้ได้ครับ',
      agent_input_placeholder: 'พิมพ์ข้อความสอบถามเกี่ยวกับยาหรือสุขภาพ...',
      agent_send_btn: 'ส่งข้อความ',

      // Pitch Portal
      pitch_title: 'MaCheck — High-Tech Pitch Portal',
      pitch_subtitle: 'ระบบสาธิตนวัตกรรม AI บริหารจัดการยาสำหรับผู้ป่วยและผู้ดูแล',

      // General / Common
      btn_confirm: 'ยืนยัน',
      btn_cancel: 'ยกเลิก',
      btn_back: 'ย้อนกลับ',
      toast_save_success: 'บันทึกข้อมูลเรียบร้อยแล้ว',
      toast_delete_success: 'ลบข้อมูลเรียบร้อยแล้ว'
    },
    en: {
      // Header & Navigation
      app_title: 'MaCheck — Medication Management & Safety Scanner',
      nav_dashboard: 'Dashboard',
      nav_cabinet: 'My Cabinet',
      nav_add: 'Add Medicine',
      nav_safety: 'Safety Check',
      nav_scanner: 'Rx Scanner',
      nav_food_clash: 'Food Clash',
      nav_pitch: 'Pitch Portal',
      nav_agent: 'AI Care Agent',
      nav_settings: 'Settings',

      // Language Toggle
      lang_th: 'ไทย',
      lang_en: 'English',
      switch_lang: 'Switch Language / เปลี่ยนภาษา',

      // Dashboard
      dash_welcome: 'Welcome to MaCheck',
      dash_subtitle: 'Your 100% safe medication management & tracking assistant',
      dash_today_title: "Today's Schedule",
      dash_adherence: 'Medication Adherence Rate',
      dash_water_title: "Today's Water Tracker",
      dash_water_btn: '+ Drink 1 Glass',
      dash_glass_unit: 'glasses',
      dash_no_meds_today: 'No medications scheduled for this time',
      dash_quick_scan: 'Quick Rx Label Scanner',
      dash_safety_status: 'Cabinet Safety Status',
      dash_status_safe: 'Safe — No drug interactions detected in your cabinet',
      dash_status_warning: 'Warning — Drug interaction risk detected',

      // Cabinet
      cabinet_title: 'My Medicine Cabinet',
      cabinet_subtitle: 'All active medications you are currently taking',
      cabinet_empty: 'No medications in cabinet',
      cabinet_add_btn: '+ Add New Medication',
      cabinet_status_active: 'Active',
      cabinet_status_stopped: 'Stopped',
      cabinet_stop_btn: 'Pause',
      cabinet_resume_btn: 'Resume',
      cabinet_delete_btn: 'Remove',
      cabinet_dosage: 'Dosage',
      cabinet_schedule: 'Schedule',
      cabinet_meal_timing: 'Meal Timing',
      meal_before: 'Before Meals',
      meal_after: 'After Meals',
      meal_any: 'With Food / Anytime',

      // Add Medicine
      add_med_title: 'Add Medication to Cabinet',
      add_med_search_placeholder: 'Type drug name in English or Thai...',
      add_med_custom_btn: '+ Specify Custom Drug Name',
      add_med_name_label: 'Medication Name (Thai or English)',
      add_med_dosage_label: 'Dosage (mg/tablet)',
      add_med_schedule_label: 'Scheduled Times',
      add_med_timing_label: 'Meal Timing Instructions',
      add_med_save_btn: 'Save Medication to Cabinet',

      // Safety & Drug Interactions
      safety_title: 'Drug Interaction & Allergy Safety Engine',
      safety_subtitle: 'Clinical analysis across cabinet medications, medical conditions, and allergy history',
      safety_check_btn: 'Run Cabinet Safety Analysis',
      safety_result_safe: 'No severe drug interactions or contraindications found',
      safety_result_severe: 'Severe Drug Interaction Risk Detected',
      safety_result_moderate: 'Moderate Drug Interaction Risk Detected',
      safety_advice_title: 'Clinical Pharmaceutical Advice',

      // Food Clash
      food_clash_title: 'Medication & Food/Herbs Clash Engine',
      food_clash_subtitle: 'Check whether foods, beverages, or herbal supplements interfere with your medications',
      food_clash_search_placeholder: 'Search food, herb, or drink (e.g. Grapefruit, Milk, Tea, Alcohol)...',

      // Settings
      settings_title: 'System Settings',
      settings_font_label: 'Elderly Font Size Scaling',
      font_normal: 'Normal',
      font_large: 'Large',
      font_xlarge: 'Extra Large',
      settings_emergency_label: 'Emergency Contact Number',
      settings_save_btn: 'Save Settings',
      settings_export_btn: 'Export Data Backup (JSON)',
      settings_import_btn: 'Restore Data Backup (JSON)',

      // AI Agent
      agent_title: 'MaCheck AI Care Agent',
      agent_welcome: 'Hello! I am your AI Care & Medication Safety Assistant (MaCheck Care Agent). Feel free to ask about your medications, symptoms, or food clashes.',
      agent_input_placeholder: 'Type your message about medications or health...',
      agent_send_btn: 'Send Message',

      // Pitch Portal
      pitch_title: 'MaCheck — High-Tech Pitch Portal',
      pitch_subtitle: 'Interactive AI Medication Management & Safety Demo System',

      // General / Common
      btn_confirm: 'Confirm',
      btn_cancel: 'Cancel',
      btn_back: 'Back',
      toast_save_success: 'Data saved successfully',
      toast_delete_success: 'Item removed successfully'
    }
  },

  getLang() {
    return this.currentLang;
  },

  setLang(lang) {
    if (lang === 'th' || lang === 'en') {
      this.currentLang = lang;
      localStorage.setItem('macheck_language', lang);
      document.documentElement.lang = lang;
      window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
    }
  },

  t(key, fallback = '') {
    const dict = this.translations[this.currentLang] || this.translations.th;
    return dict[key] || this.translations.th[key] || fallback || key;
  }
};

if (typeof window !== 'undefined') {
  window.I18n = I18n;
}
