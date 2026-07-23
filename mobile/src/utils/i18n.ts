/**
 * MaCheck Mobile — Typed Bilingual i18n Translation Dictionary (TH / EN)
 * Complete coverage for 100% of app screens, modals, alerts, and components
 */

export type Language = 'th' | 'en';

export const translations = {
  th: {
    // General & Common
    app_title: 'MaCheck',
    confirm: 'ยืนยัน',
    cancel: 'ยกเลิก',
    back: 'ย้อนกลับ',
    delete: 'ลบ',
    save: 'บันทึก',
    search: 'ค้นหา',
    save_success: 'บันทึกข้อมูลเรียบร้อยแล้ว',
    delete_success: 'ลบข้อมูลเรียบร้อยแล้ว',
    now: 'ตอนนี้',
    
    // Navigation & Tabs
    tab_today: 'วันนี้',
    tab_cabinet: 'ตู้ยา',
    tab_add_rx: 'เพิ่มยา',
    tab_safety: 'ปลอดภัย',
    tab_more: 'เพิ่มเติม',
    tab_home: 'หน้าหลัก',
    tab_scanner: 'สแกนฉลากยา',
    tab_caregiver: 'ผู้ดูแล',
    tab_agent: 'AI ผู้ช่วย',
    tab_settings: 'ตั้งค่าและโปรไฟล์',

    // Home / Today Screen
    greeting: 'สวัสดี',
    added_med_success: 'เพิ่มยาเรียบร้อยแล้ว',
    added_med_schedule_prefix: 'จะแสดงในช่วง',
    today_adherence: 'ความสม่ำเสมอวันนี้',
    water_tracking: 'การดื่มน้ำ',
    water_progress: 'แก้ว',
    record_water_btn: 'บันทึกดื่มน้ำ 1 แก้ว',
    today_schedule: 'ตารางยาวันนี้',
    tap_checkbox_hint: 'แตะช่องสี่เหลี่ยมเมื่อรับประทานยาแล้ว',
    no_meds_in_slot: 'ยังไม่มียาที่กำหนดไว้',
    taken_status: 'ทานแล้ว',

    // Slots & Meal Timings
    slot_morning: 'เช้า',
    slot_noon: 'กลางวัน',
    slot_evening: 'เย็น',
    slot_bedtime: 'ก่อนนอน',
    meal_before: 'ก่อนอาหาร',
    meal_after: 'หลังอาหาร',
    meal_any: 'ไม่จำกัดมื้อ',

    // Cabinet Screen
    cabinet_title: 'ตู้ยาส่วนตัว',
    cabinet_subtitle: 'รายการยาที่คุณกำลังรับประทานอยู่',
    tab_active: 'กำลังใช้',
    tab_stopped: 'หยุดแล้ว',
    add_med_to_cabinet: 'เพิ่มยาเข้าตู้',
    empty_category: 'ยังไม่มีรายการในหมวดนี้',
    pause_use: 'หยุดใช้',
    resume_use: 'กลับมาใช้',
    delete_med_confirm_title: 'ลบรายการยานี้?',
    delete_med_confirm_desc: 'ข้อมูลการตั้งเวลาของรายการนี้จะถูกลบออกจากเครื่อง',

    // Add Medicine Screen
    step1_select_drug: '1. เลือกยา',
    search_drug_label: 'ค้นหาชื่อยา หมวดหมู่ หรือสรรพคุณ',
    search_drug_placeholder: 'เช่น เมทฟอร์มิน เบาหวาน หรือแก้ปวด',
    step2_dose_and_time: '2. จำนวนเม็ดและเวลา',
    dose_per_time: 'จำนวนยาที่กินต่อครั้ง (เม็ด)',
    dose_placeholder: 'เช่น 1 หรือ 2',
    dose_half: '½ เม็ด',
    dose_one: '1 เม็ด',
    dose_two: '2 เม็ด',
    dose_guidance_hint: 'กรอกจำนวนเม็ดตามฉลากหรือคำแนะนำของแพทย์/เภสัชกร ระบบไม่คำนวณจำนวนเม็ดจากน้ำหนักยาให้เอง',
    time_slot_label: 'ช่วงเวลา',
    meal_timing_title: 'คำแนะนำมื้ออาหาร',
    add_error_validation: 'กรุณาเลือกยา ระบุจำนวนเม็ด และเลือกเวลาอย่างน้อย 1 ช่วง',
    save_med_btn: 'บันทึกยาเข้าตู้',

    // Safety Screen
    pair_check_title: 'ตรวจยาสองตัว',
    pair_check_subtitle: 'เลือกยาสองตัวเพื่อค้นหาคำเตือน',
    directory_title: 'รายการคู่ยาที่ควรระวัง',
    directory_subtitle: 'ค้นหาและกรองคู่ยาที่เผยแพร่แล้ว',
    cabinet_active_title: 'ยาที่กำลังใช้ร่วมกัน',
    empty_cabinet_text: 'ยังไม่มียาในตู้',
    no_interactions_found: 'ยังไม่พบคู่ยาที่ตรงกับรายการคำเตือน',
    no_interactions_disclaimer: 'ผลนี้ไม่ได้ยืนยันว่าปลอดภัยทุกกรณี โดยเฉพาะยาที่ฐานข้อมูลยังไม่ครอบคลุม',
    food_herb_section: 'ตรวจอาหารและสมุนไพร',
    food_herb_label: 'ชื่ออาหาร เครื่องดื่ม หรือสมุนไพร',
    food_herb_placeholder: 'เช่น ส้มโอ กาแฟ กล้วย',
    check_risk_btn: 'ตรวจความเสี่ยง',
    no_matching_food_warning: 'ยังไม่พบคำเตือนที่ตรงกัน',
    food_warning_disclaimer: 'ฐานข้อมูลอาจไม่ครอบคลุมอาหาร ยา ขนาดยา และโรคทั้งหมด หากไม่แน่ใจให้สอบถามเภสัชกร',
    clinical_limitation: 'ข้อจำกัดทางคลินิก: ระบบใช้เฉพาะข้อมูลที่เผยแพร่จากฐานข้อมูลกลาง ผลการไม่พบคำเตือนไม่สามารถยืนยันว่าปลอดภัย และไม่แทนการตรวจสอบโดยแพทย์หรือเภสัชกร',

    // Pair Checker Screen
    select_drug_1: 'เลือกยาตัวที่ 1',
    select_drug_2: 'เลือกยาตัวที่ 2',
    check_pair_btn: 'ตรวจสอบคู่ยานี้',
    select_both_warning: 'กรุณาเลือกยาทั้ง 2 ตัวก่อนกดตรวจ',

    // More Screen
    more_title: 'เพิ่มเติมและประวัติ',
    history_menu: 'ประวัติการทานยา',
    history_subtitle: 'ดูสถิติตารางการทานยาย้อนหลัง',
    caregiver_menu: 'ผู้ดูแลและฉุกเฉิน',
    caregiver_subtitle: 'จัดการผู้ดูแลและเบอร์ติดต่อฉุกเฉิน',
    settings_menu: 'ตั้งค่าและโปรไฟล์',
    settings_subtitle: 'ปรับขนาดอักษร ภาษา และลบข้อมูล',

    // Scanner Screen
    scanner_title: 'สแกนฉลากยา',
    scanner_instruction: 'วางฉลากยาให้อยู่ในกรอบเพื่อเริ่มสแกนด้วย Gemini AI',
    scanning_progress: 'กำลังวิเคราะห์ฉลากยา...',
    scan_success: 'อ่านข้อมูลฉลากยาสำเร็จ',
    scan_failed: 'ไม่สามารถอ่านฉลากยาได้ กรุณาลองใหม่อีกครั้ง',
    camera_perm_title: 'ต้องใช้สิทธิ์กล้อง',
    camera_perm_desc: 'MaCheck ใช้กล้องเฉพาะตอนสแกนฉลากหรือ barcode ภาพไม่ถูกอัปโหลดโดยอัตโนมัติ',
    camera_perm_btn: 'อนุญาตให้ใช้กล้อง',
    scanner_search_title: 'ค้นจากผลสแกน ชื่อ หรือสรรพคุณ',
    scanner_field_label: 'ข้อความบนฉลาก ชื่อยา หรือสรรพคุณ',
    scanner_field_placeholder: 'เช่น พาราเซตามอล หรือแก้ปวดลดไข้',
    rescan_btn: 'สแกนอีกครั้ง',

    // Caregiver Screen
    caregiver_title: 'ผู้ดูแลและฉุกเฉิน',
    caregiver_invite_btn: '+ เชิญผู้ดูแลผ่าน Handle',
    caregiver_handle_placeholder: 'พิมพ์ Handle ผู้ดูแล (เช่น doctor_smith)...',
    caregiver_list_title: 'ผู้ดูแลที่ได้รับสิทธิ์',
    no_caregivers: 'ยังไม่มีผู้ดูแลเชื่อมต่อในระบบ',

    // Agent Screen
    agent_title: 'MaCheck AI Care Agent',
    agent_subtitle: 'ผู้ช่วย AI ดูแลความปลอดภัยการใช้ยา',
    agent_disclaimer: 'AI ให้คำแนะนำเบื้องต้นเท่านั้น ไม่ทดแทนคำสั่งแพทย์หรือเภสัชกร',
    agent_input_placeholder: 'พิมพ์ข้อความสอบถาม...',
    agent_send: 'ส่ง',

    // Settings Screen
    settings_title: 'ตั้งค่าและโปรไฟล์',
    profile_section: 'โปรไฟล์',
    display_name_label: 'ชื่อที่ใช้เรียกบนอุปกรณ์นี้',
    weight_label: 'น้ำหนักตัวล่าสุด (กก.)',
    profile_help: 'ชื่อที่ใช้เรียก น้ำหนักตัว และผู้ติดต่อฉุกเฉินจะเก็บปลอดภัยบนอุปกรณ์และนำไปใช้คำนวณความปลอดภัย AI',
    diseases_section: 'โรคประจำตัว',
    allergies_section: 'ประวัติแพ้ยา',
    allergy_input_label: 'ชื่อยาหรือกลุ่มยาที่แพ้',
    add_allergy_btn: 'เพิ่มประวัติแพ้ยา',
    emergency_section: 'ผู้ติดต่อฉุกเฉิน',
    emergency_name_label: 'ชื่อผู้ติดต่อ',
    emergency_phone_label: 'เบอร์โทรฉุกเฉิน',
    language_section: 'App Language / ภาษา',
    accessibility_section: 'การเข้าถึงและการแสดงผล AI',
    font_normal: 'ปกติ',
    font_large: 'ใหญ่',
    font_xlarge: 'ใหญ่มาก',
    ai_bubble_label: 'แสดงปุ่มลอย AI Care Agent',
    ai_bubble_desc: 'แสดงปุ่มลอยที่ลากเคลื่อนย้ายได้บนหน้าจอมือถือ',
    sound_alert_label: 'อ่านคำเตือนด้วยเสียง',
    sound_alert_desc: 'ใช้เสียงภาษาไทยในหน้าตรวจอาหาร',
    reset_data_btn: 'ลบข้อมูลทั้งหมดในเครื่อง',
    logout_btn: 'Log out',
    logout_logging_out: 'กำลังออกจากระบบ…',
    logout_help: 'ทั้งการลบข้อมูลในเครื่องและการออกจากระบบจะไม่ลบบัญชีหรือข้อมูลที่ซิงก์ไว้บนฐานข้อมูลกลาง',
    logout_confirm_title: 'ออกจากระบบ?',
    logout_confirm_desc: 'ข้อมูลในเครื่องนี้จะถูกล้างเพื่อความเป็นส่วนตัว แต่บัญชีและข้อมูลที่ซิงก์ไว้บนฐานข้อมูลกลางจะไม่ถูกลบ',
    reset_confirm_title: 'ลบข้อมูลในเครื่องทั้งหมด?',
    reset_confirm_desc: 'ตู้ยา ประวัติ และโปรไฟล์จะถูกลบออกจากอุปกรณ์นี้',
    confirm_delete: 'ลบข้อมูล',
    confirm_logout: 'ออกจากระบบ',

    // Registration / Auth Screen
    register_title: 'เริ่มต้นใช้งาน MaCheck',
    register_subtitle: 'กรอกข้อมูลเบื้องต้นเพื่อความปลอดภัยในการทานยา',
    username_label: 'Username (ชื่อเข้าใช้งาน)',
    create_account_btn: 'สร้างบัญชีใช้งาน'
  },
  en: {
    // General & Common
    app_title: 'MaCheck',
    confirm: 'Confirm',
    cancel: 'Cancel',
    back: 'Back',
    delete: 'Delete',
    save: 'Save',
    search: 'Search',
    save_success: 'Data saved successfully',
    delete_success: 'Item removed successfully',
    now: 'NOW',

    // Navigation & Tabs
    tab_today: 'Today',
    tab_cabinet: 'Cabinet',
    tab_add_rx: 'Add Rx',
    tab_safety: 'Safety',
    tab_more: 'More',
    tab_home: 'Home',
    tab_scanner: 'Rx Scanner',
    tab_caregiver: 'Caregiver',
    tab_agent: 'AI Care Agent',
    tab_settings: 'Settings & Profile',

    // Home / Today Screen
    greeting: 'Hello',
    added_med_success: 'Medication added successfully',
    added_med_schedule_prefix: 'Scheduled for',
    today_adherence: "Today's Adherence",
    water_tracking: 'Water Intake',
    water_progress: 'glasses',
    record_water_btn: '+ Drink 1 Glass',
    today_schedule: "Today's Schedule",
    tap_checkbox_hint: 'Tap checkbox after taking medication',
    no_meds_in_slot: 'No medications scheduled for this time',
    taken_status: 'Taken',

    // Slots & Meal Timings
    slot_morning: 'Morning',
    slot_noon: 'Noon',
    slot_evening: 'Evening',
    slot_bedtime: 'Bedtime',
    meal_before: 'Before Meals',
    meal_after: 'After Meals',
    meal_any: 'Anytime / With Food',

    // Cabinet Screen
    cabinet_title: 'My Medicine Cabinet',
    cabinet_subtitle: 'Medications you are currently taking',
    tab_active: 'Active',
    tab_stopped: 'Stopped',
    add_med_to_cabinet: '+ Add Medication to Cabinet',
    empty_category: 'No medications in this category',
    pause_use: 'Pause',
    resume_use: 'Resume',
    delete_med_confirm_title: 'Delete this medication?',
    delete_med_confirm_desc: 'Schedule and reminder data for this item will be removed from device.',

    // Add Medicine Screen
    step1_select_drug: '1. Select Medication',
    search_drug_label: 'Search drug name, category, or indication',
    search_drug_placeholder: 'e.g. Metformin, Diabetes, or Pain relief',
    step2_dose_and_time: '2. Dosage & Time Slots',
    dose_per_time: 'Dose per time (tablets)',
    dose_placeholder: 'e.g. 1 or 2',
    dose_half: '½ Tablet',
    dose_one: '1 Tablet',
    dose_two: '2 Tablets',
    dose_guidance_hint: 'Enter tablet count according to your prescription label. System does not auto-calculate dosage by body weight.',
    time_slot_label: 'Time Slots',
    meal_timing_title: 'Meal Timing Instructions',
    add_error_validation: 'Please select a drug, specify tablet count, and select at least 1 time slot',
    save_med_btn: 'Save Medication to Cabinet',

    // Safety Screen
    pair_check_title: 'Check 2 Drugs',
    pair_check_subtitle: 'Select two medications to check interaction risks',
    directory_title: 'Drug Interaction Directory',
    directory_subtitle: 'Browse and search published drug pair warnings',
    cabinet_active_title: 'Current Cabinet Medications',
    empty_cabinet_text: 'No active medications in cabinet',
    no_interactions_found: 'No matching interaction warnings found',
    no_interactions_disclaimer: 'This result does not guarantee 100% safety, especially for drugs not yet covered in database.',
    food_herb_section: 'Food & Herbal Supplement Check',
    food_herb_label: 'Food, Beverage, or Supplement Name',
    food_herb_placeholder: 'e.g. Grapefruit, Coffee, Banana',
    check_risk_btn: 'Check Safety Risks',
    no_matching_food_warning: 'No matching warnings found',
    food_warning_disclaimer: 'Database may not cover all foods, dosages, and medical conditions. Consult your pharmacist when unsure.',
    clinical_limitation: 'Clinical Disclaimer: System relies strictly on published central clinical data. Absence of warnings does not replace professional medical or pharmaceutical advice.',

    // Pair Checker Screen
    select_drug_1: 'Select Drug 1',
    select_drug_2: 'Select Drug 2',
    check_pair_btn: 'Check Drug Pair',
    select_both_warning: 'Please select both drugs before checking',

    // More Screen
    more_title: 'More & History',
    history_menu: 'Medication History',
    history_subtitle: 'View historical adherence statistics and logs',
    caregiver_menu: 'Caregiver & Emergency',
    caregiver_subtitle: 'Manage caregivers and emergency contact details',
    settings_menu: 'Settings & Profile',
    settings_subtitle: 'Adjust font size, app language, or reset local data',

    // Scanner Screen
    scanner_title: 'Rx Label Scanner',
    scanner_instruction: 'Align medication label inside frame for Gemini AI OCR scan',
    scanning_progress: 'Analyzing medication label...',
    scan_success: 'Medication label read successfully',
    scan_failed: 'Could not read label. Please try again.',
    camera_perm_title: 'Camera Permission Required',
    camera_perm_desc: 'MaCheck uses the camera solely for scanning labels or barcodes. Images are not uploaded automatically.',
    camera_perm_btn: 'Allow Camera Access',
    scanner_search_title: 'Search Scanned Result, Drug Name, or Indication',
    scanner_field_label: 'Label text, drug name, or indication',
    scanner_field_placeholder: 'e.g. Paracetamol or Pain reliever',
    rescan_btn: 'Scan Again',

    // Caregiver Screen
    caregiver_title: 'Caregiver & Emergency',
    caregiver_invite_btn: '+ Invite Caregiver via Handle',
    caregiver_handle_placeholder: 'Enter caregiver handle (e.g. doctor_smith)...',
    caregiver_list_title: 'Authorized Caregivers',
    no_caregivers: 'No connected caregivers yet',

    // Agent Screen
    agent_title: 'MaCheck AI Care Agent',
    agent_subtitle: 'Medication Safety & Health AI Assistant',
    agent_disclaimer: 'AI provides general info only. Does not replace professional medical advice.',
    agent_input_placeholder: 'Type your message...',
    agent_send: 'Send',

    // Settings Screen
    settings_title: 'Settings & Profile',
    profile_section: 'Profile',
    display_name_label: 'Display Name on Device',
    weight_label: 'Current Weight (kg)',
    profile_help: 'Display name, weight, and emergency contacts are stored securely on device for AI safety calculations.',
    diseases_section: 'Medical Conditions',
    allergies_section: 'Allergy History',
    allergy_input_label: 'Allergic Drug or Class Name',
    add_allergy_btn: 'Add Allergy Entry',
    emergency_section: 'Emergency Contact',
    emergency_name_label: 'Contact Name',
    emergency_phone_label: 'Emergency Phone',
    language_section: 'App Language / ภาษา',
    accessibility_section: 'Accessibility & AI Display',
    font_normal: 'Normal',
    font_large: 'Large',
    font_xlarge: 'Extra Large',
    ai_bubble_label: 'Show Floating AI Care Agent Button',
    ai_bubble_desc: 'Show draggable floating button on app screens',
    sound_alert_label: 'Voice Read-Aloud Warnings',
    sound_alert_desc: 'Use voice guidance on food safety checks',
    reset_data_btn: 'Clear All Local Device Data',
    logout_btn: 'Log Out',
    logout_logging_out: 'Logging out…',
    logout_help: 'Neither clearing local data nor logging out will delete account data synced to cloud database.',
    logout_confirm_title: 'Log out?',
    logout_confirm_desc: 'Device data will be cleared for privacy, but your account synced to cloud database remains safe.',
    reset_confirm_title: 'Delete All Local Data?',
    reset_confirm_desc: 'Cabinet, history, and profile will be deleted from this device.',
    confirm_delete: 'Delete Data',
    confirm_logout: 'Log Out',

    // Registration / Auth Screen
    register_title: 'Get Started with MaCheck',
    register_subtitle: 'Enter basic profile information for medication safety',
    username_label: 'Username',
    create_account_btn: 'Create Account'
  }
};

export type TranslationKey = keyof typeof translations.th;

export function t(key: TranslationKey, lang: Language = 'th'): string {
  const dict = translations[lang] || translations.th;
  return dict[key] || translations.th[key] || key;
}

export function getDiseaseLabel(diseaseId: string, lang: Language = 'th'): string {
  const map: Record<string, { th: string; en: string }> = {
    diabetes: { th: 'เบาหวาน', en: 'Diabetes' },
    hypertension: { th: 'ความดันโลหิตสูง', en: 'Hypertension' },
    heart: { th: 'โรคหัวใจ', en: 'Heart Disease' },
    kidney: { th: 'โรคไต', en: 'Kidney Disease' },
    liver: { th: 'โรคตับ', en: 'Liver Disease' },
    lipid: { th: 'ไขมันในเลือดสูง', en: 'Hyperlipidemia' },
    stomach: { th: 'โรคกระเพาะ', en: 'Peptic Ulcer' },
  };
  return map[diseaseId]?.[lang] || diseaseId;
}

export function getSlotLabel(slot: 'morning' | 'noon' | 'evening' | 'bedtime', lang: Language = 'th'): string {
  const map: Record<string, { th: string; en: string }> = {
    morning: { th: 'เช้า', en: 'Morning' },
    noon: { th: 'กลางวัน', en: 'Noon' },
    evening: { th: 'เย็น', en: 'Evening' },
    bedtime: { th: 'ก่อนนอน', en: 'Bedtime' },
  };
  return map[slot]?.[lang] || slot;
}

export function getMealTimingLabel(timing: 'before' | 'after' | 'any', lang: Language = 'th'): string {
  const map: Record<string, { th: string; en: string }> = {
    before: { th: 'ก่อนอาหาร', en: 'Before Meals' },
    after: { th: 'หลังอาหาร', en: 'After Meals' },
    any: { th: 'ไม่จำกัดมื้อ', en: 'Anytime' },
  };
  return map[timing]?.[lang] || timing;
}
