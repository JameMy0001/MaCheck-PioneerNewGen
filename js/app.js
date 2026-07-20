// ตัวคอนโทรลเลอร์หลักของแอป YaCheck คอยคุม state และการเปลี่ยนหน้า

const App = {
  currentPage: 'dashboard', // หน้าปัจจุบันที่แสดงอยู่
  STORAGE_KEY: 'yacheck_state', // คีย์สำหรับเก็บข้อมูลลงในเบราว์เซอร์
  signupRole: 'patient', // บทบาทการสมัครสมาชิกเริ่มต้น
  tempSignUpData: null,  // ข้อมูลการสมัครสมาชิกชั่วคราวรอการยืนยัน OTP
  state: { // ข้อมูลการทำงานหลักของแอป
    accounts: [
      { username: 'patient123', password: 'password123', email: 'patient@gmail.com', role: 'patient' },
      { username: 'caregiver123', password: 'password123', email: 'caregiver@gmail.com', role: 'caregiver' }
    ],
    currentUser: null, // ชื่อผู้ใช้ปัจจุบัน
    user: {
      name: 'คุณ...',
      fontSize: 'normal', // 'normal' | 'large' | 'xlarge'
      weight: '',
      height: '',
      allergies: '',
      diseases: []
    },
    currentRole: null, // 'patient' | 'caregiver' | null
    activeChallenge: null,
    myMedicines: [],
    // โครงสร้างข้อมูลง่ายๆ:
    // id: ไอดีสุ่มของยาตัวนี้
    // medicineId: ไอดีอ้างอิงจาก MedicineDB
    // dosageMg: ขนาด (mg)
    // type: กินประจำ (regular) หรือเฉพาะกิจ (occasional)
    // timeSlots: ช่วงเวลาที่ต้องกิน (morning/noon/evening/bedtime)
    // duration: กินมานานเท่าไหร่
    // efficacy: ความรู้สึกหลังกิน

    todayLog: {
      date: '',         // วันที่บันทึกปัจจุบัน
      taken: {}         // รายการยาที่กินไปแล้ว
    },

    emergencyContact: {
      name: 'ลูกชาย',
      phone: '081-234-5678'
    },
    allergyLog: [],
    scanHistory: [],
    soundEnabled: true,
    lineToken: '',
    customMedicines: [],
    customInteractions: []
  },

  // สเกลขนาดตัวอักษรของระบบ
  _fontSizes: {
    normal: { label: 'ปกติ', scale: 1.0 },
    large:  { label: 'ใหญ่', scale: 1.2 },
    xlarge: { label: 'ใหญ่มาก', scale: 1.4 }
  },
  _fontSizeOrder: ['normal', 'large', 'xlarge'],

  // เริ่มต้นทำงานทันทีเมื่อเปิดแอป
  async init() {
    try {
      // เริ่มต้นเชื่อมต่อฐานข้อมูลออฟไลน์ IndexedDB
      await DB.init();

      // ดึงข้อมูลจากฐานข้อมูลมาใส่ในเมมโมรี่แอป
      await this.loadState();
    } catch (e) {
      console.error('[App] เกิดข้อผิดพลาดในการโหลดคลังข้อมูล IndexedDB:', e);
      // โหลดระบบสำรองถ้าโหลดหลักล้มเหลว
      this.loadStateFromLocalStorageFallback();
    }

    // เริ่มต้นบัญชีผู้ใช้จำลองถ้ายังไม่มีในระบบ
    if (!this.state.accounts || this.state.accounts.length === 0) {
      this.state.accounts = [
        { username: 'patient123', password: 'password123', email: 'patient@gmail.com', role: 'patient' },
        { username: 'caregiver123', password: 'password123', email: 'caregiver@gmail.com', role: 'caregiver' }
      ];
      this.saveState();
    }

    // กู้คืนสถานะผู้ใช้หากมีบทบาทค้างอยู่แต่ไม่มีชื่อผู้ใช้งาน
    if (this.state.currentRole && !this.state.currentUser) {
      this.state.currentUser = this.state.currentRole === 'patient' ? 'patient123' : 'caregiver123';
      this.saveState();
    }

    // เช็คประวัติการทานยาวันนี้ ถ้าคนละวันให้เคลียร์ค่าใหม่
    this._ensureTodayLog();

    // ถ้าไม่มีข้อมูลยาเลย ให้ใส่ตัวอย่างเดโมไป
    if (this.state.myMedicines.length === 0) {
      this.initSampleData();
    }

    // ตั้งค่าขนาดอักษรตามเดิม
    this.applyFontSize();

    // ผูกคำสั่งการทำงานเมนูล่าง
    this._setupNavigation();

    // ผูกคำสั่งการทำงานปุ่มขนาดอักษร
    this._setupFontSizeControls();

    // ผูกระบบปิดโมดอล/บานพับอัตโนมัติ
    this._setupGlobalCloseHandlers();

    // เริ่มต้นเช็คการล็อกอินบทบาทผู้ใช้
    if (this.state.currentRole === undefined) {
      this.state.currentRole = null;
    }

    if (this.state.currentRole === null) {
      this.navigate('login');
    } else {
      this.navigate('dashboard');
    }

    // ระบบนับถอยหลังภารกิจเว้นระยะยา (Spacing & Water Challenge Timer)
    setInterval(() => {
      if (typeof Challenge !== 'undefined' && Challenge.tick) Challenge.tick();
    }, 1000);

    console.log('[YaCheck] แอปเริ่มต้นและโหลดข้อมูลจาก IndexedDB สำเร็จ');
  },

  // ฟังก์ชันสลับหน้าเพจหลัก
  navigate(page) {
    // ซ่อนทุกหน้า
    const pages = document.querySelectorAll('.page');
    pages.forEach(p => p.classList.remove('active'));

    // เปิดเฉพาะหน้าเป้าหมาย
    const target = document.getElementById(`page-${page}`);
    if (target) {
      target.classList.add('active');
      target.scrollTop = 0; // เลื่อนกลับไปด้านบนสุด
    }

    // ซ่อน/แสดง เมนูนำทางล่างและส่วนหัวตามการเข้าสู่ระบบ
    const isLogin = page === 'login';
    const header = document.getElementById('app-header');
    const bottomNav = document.getElementById('bottom-nav');
    
    if (header) header.style.display = isLogin ? 'none' : 'flex';
    if (bottomNav) bottomNav.style.display = isLogin ? 'none' : 'flex';

    // ซ่อนปุ่มเพิ่มยาในเมนูล่างสำหรับคนไข้ (แสดงเฉพาะผู้ดูแล)
    const addNavItem = document.querySelector('.nav-item[data-page="add"]');
    if (addNavItem) {
      addNavItem.style.display = this.state.currentRole === 'patient' ? 'none' : 'flex';
    }

    // ไฮไลท์เมนูนำทางล่างตามหน้าปัจจุบัน
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.classList.toggle('active', item.dataset.page === page);
    });

    // จำหน้าปัจจุบัน
    this.currentPage = page;

    // สั่งวาดหน้านั้นๆ ใหม่
    this._renderPage(page);

    // สั่นเตือนเบาๆ ตอนเปลี่ยนหน้า
    Utils.hapticFeedback();
  },

  // สั่งรันหน้า render ย่อยของหน้าอื่น
  _renderPage(page) {
    switch (page) {
      case 'dashboard':
        if (typeof Dashboard !== 'undefined' && Dashboard.render) Dashboard.render();
        break;
      case 'add':
        if (typeof AddMedicine !== 'undefined' && AddMedicine.render) AddMedicine.render();
        break;
      case 'analysis':
        if (typeof Analysis !== 'undefined' && Analysis.render) Analysis.render();
        break;
      case 'cabinet':
        if (typeof Cabinet !== 'undefined' && Cabinet.render) Cabinet.render();
        break;
      case 'network':
        if (typeof Network !== 'undefined' && Network.render) Network.render();
        break;
      case 'food-clash':
        if (typeof FoodClash !== 'undefined' && FoodClash.render) FoodClash.render();
        break;
      case 'scan-check':
        if (typeof ScanCheck !== 'undefined' && ScanCheck.render) ScanCheck.render();
        break;
      case 'settings':
        if (typeof Settings !== 'undefined' && Settings.render) Settings.render();
        break;
      default:
        break;
    }
  },



  // ตั้งค่าดักคลิกปุ่มนำทางด้านล่าง
  _setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const page = item.dataset.page;
        if (page) this.navigate(page);
      });
    });
  },

  // =========================================================================
  // จัดการเก็บข้อมูลลงเครื่อง
  getState() {
    return this.state;
  },

  setState(newState) {
    this.state = { ...this.state, ...newState };
    this.saveState();
  },

  // อัปเดตข้อมูลย่อยในเครื่อง
  updateState(key, value) {
    this.state[key] = value;
    this.saveState();
  },

  async saveState() {
    try {
      // 1. บันทึกข้อมูลโปรไฟล์หลัก
      await DB.put('userProfile', { key: 'name', value: this.state.user.name });
      await DB.put('userProfile', { key: 'fontSize', value: this.state.user.fontSize });
      await DB.put('userProfile', { key: 'weight', value: this.state.user.weight });
      await DB.put('userProfile', { key: 'height', value: this.state.user.height });
      await DB.put('userProfile', { key: 'currentRole', value: this.state.currentRole });
      await DB.put('userProfile', { key: 'currentUser', value: this.state.currentUser });
      await DB.put('userProfile', { key: 'soundEnabled', value: this.state.soundEnabled });
      await DB.put('userProfile', { key: 'lineToken', value: this.state.lineToken });
      await DB.put('userProfile', { key: 'emergencyContact', value: this.state.emergencyContact });
      await DB.put('userProfile', { key: 'accounts', value: this.state.accounts });
      await DB.put('userProfile', { key: 'diseases', value: this.state.user.diseases || [] });
      await DB.put('userProfile', { key: 'activeChallenge', value: this.state.activeChallenge });

      // 2. บันทึก todayLog
      await DB.put('todayLog', this.state.todayLog);

      // 3. บันทึกตู้ยา
      await DB.clear('myMedicines');
      for (const m of this.state.myMedicines) {
        await DB.put('myMedicines', m);
      }

      // 4. บันทึกประวัติแพ้ยา
      await DB.clear('allergyLog');
      for (const a of this.state.allergyLog) {
        await DB.put('allergyLog', a);
      }

      // 5. บันทึกประวัติสแกน
      await DB.clear('scanHistory');
      for (const s of this.state.scanHistory) {
        await DB.put('scanHistory', s);
      }

      // 6. บันทึกยาส่วนตัวและกฎ DDI เพิ่มเติม
      if (this.state.customMedicines && Array.isArray(this.state.customMedicines)) {
        for (const cm of this.state.customMedicines) {
          await DB.put('medicines', cm);
        }
      }
      if (this.state.customInteractions && Array.isArray(this.state.customInteractions)) {
        for (const ci of this.state.customInteractions) {
          const copy = { ...ci };
          copy.id = copy.id || `${copy.drug1}_${copy.drug2}`;
          await DB.put('interactions', copy);
        }
      }
    } catch (e) {
      console.warn('[DB] เกิดความล้มเหลวในการบันทึกข้อมูลลง IndexedDB:', e);
    }
  },

  async loadState() {
    await this.loadStateFromDB();
  },

  async loadStateFromDB() {
    const userProfileList = await DB.getAll('userProfile');
    const myMedicines = await DB.getAll('myMedicines');
    const allergyLog = await DB.getAll('allergyLog');
    const scanHistory = await DB.getAll('scanHistory');
    
    const profile = {};
    userProfileList.forEach(item => {
      profile[item.key] = item.value;
    });

    this.state.user = {
      name: profile.name !== undefined ? profile.name : 'คุณ...',
      fontSize: profile.fontSize !== undefined ? profile.fontSize : 'normal',
      weight: profile.weight !== undefined ? profile.weight : '',
      height: profile.height !== undefined ? profile.height : '',
      diseases: profile.diseases !== undefined ? profile.diseases : []
    };
    
    this.state.currentRole = profile.currentRole !== undefined ? profile.currentRole : null;
    this.state.currentUser = profile.currentUser !== undefined ? profile.currentUser : null;
    this.state.soundEnabled = profile.soundEnabled !== undefined ? profile.soundEnabled : true;
    this.state.lineToken = profile.lineToken !== undefined ? profile.lineToken : '';
    this.state.emergencyContact = profile.emergencyContact !== undefined ? profile.emergencyContact : { name: 'ลูกชาย', phone: '081-234-5678' };
    this.state.activeChallenge = profile.activeChallenge !== undefined ? profile.activeChallenge : null;
    
    if (profile.accounts) {
      this.state.accounts = profile.accounts;
    }

    this.state.myMedicines = myMedicines;
    this.state.allergyLog = allergyLog;
    this.state.scanHistory = scanHistory;

    const todayKey = Utils.getTodayKey();
    const todayLog = await DB.get('todayLog', todayKey);
    this.state.todayLog = todayLog || { date: todayKey, taken: {} };

    // โหลดยาและคู่ยาตีกันทั้งหมด
    const allMeds = await DB.getAll('medicines');
    const allInters = await DB.getAll('interactions');

    // กรองและแยกยาที่ยูสเซอร์เพิ่มเอง (สำหรับ RAG AI & Exporter)
    const defaultMedIds = new Set([
      'metformin', 'amlodipine', 'aspirin', 'simvastatin', 'warfarin', 
      'omeprazole', 'enalapril', 'losartan', 'hydrochlorothiazide', 'glipizide', 
      'atorvastatin', 'diclofenac', 'ibuprofen', 'paracetamol', 'gabapentin', 
      'clopidogrel', 'levothyroxine', 'prednisolone', 'digoxin', 'furosemide',
      'pioglitazone', 'metoprolol', 'atenolol', 'spironolactone', 'naproxen',
      'celecoxib', 'tramadol', 'ginkgo', 'ginseng', 'calcium', 'alendronate',
      'amiodarone', 'ciprofloxacin'
    ]);
    
    const defaultInterIds = new Set([
      'warfarin_aspirin', 'warfarin_ibuprofen', 'warfarin_diclofenac',
      'enalapril_losartan', 'simvastatin_amlodipine', 'digoxin_furosemide',
      'metformin_furosemide', 'aspirin_ibuprofen', 'clopidogrel_omeprazole',
      'levothyroxine_omeprazole', 'spironolactone_enalapril', 'spironolactone_losartan',
      'ibuprofen_enalapril', 'amiodarone_simvastatin', 'warfarin_ginkgo',
      'aspirin_ginkgo', 'calcium_levothyroxine', 'alendronate_calcium',
      'ciprofloxacin_calcium', 'tramadol_gabapentin', 'digoxin_amiodarone'
    ]);

    this.state.customMedicines = allMeds.filter(m => !defaultMedIds.has(m.id));
    this.state.customInteractions = allInters.filter(i => {
      const id = i.id || `${i.drug1}_${i.drug2}`;
      const reverseId = `${i.drug2}_${i.drug1}`;
      return !defaultInterIds.has(id) && !defaultInterIds.has(reverseId);
    });

    // ลงทะเบียนเข้าระบบ MedicineDB สำหรับการใช้งานส่วนย่อยของแอป
    allMeds.forEach(m => {
      if (!MedicineDB.medicines.some(x => x.id === m.id)) {
        MedicineDB.medicines.push(m);
      }
    });

    allInters.forEach(i => {
      const alreadyExists = MedicineDB.interactions.some(x => 
        (x.drug1 === i.drug1 && x.drug2 === i.drug2) ||
        (x.drug1 === i.drug2 && x.drug2 === i.drug1)
      );
      if (!alreadyExists) {
        MedicineDB.interactions.push(i);
      }
    });
  },

  loadStateFromLocalStorageFallback() {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.state = this._deepMerge(this.state, parsed);
      }
    } catch (e) {
      console.warn('[YaCheck] โหลด LocalStorage ล้มเหลว:', e);
    }
  },

  _deepMerge(target, source) {
    const result = { ...target };
    for (const key of Object.keys(source)) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this._deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  },

  async resetState() {
    try {
      if (DB.db) {
        await DB.clear('userProfile');
        await DB.clear('medicines');
        await DB.clear('interactions');
        await DB.clear('myMedicines');
        await DB.clear('allergyLog');
        await DB.clear('scanHistory');
        await DB.clear('todayLog');
      }
    } catch (e) {
      console.warn('[DB] เคลียร์ข้อมูล IndexedDB ล้มเหลว:', e);
    }
    localStorage.removeItem(this.STORAGE_KEY);
    location.reload();
  },

  // ส่งออกไฟล์ JSON สำรองข้อมูล
  async exportDatabase() {
    try {
      const jsonStr = await DB.exportDatabaseJSON();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `yacheck_db_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      Utils.showToast('ส่งออกไฟล์ข้อมูลสำรองเรียบร้อย', 'success');
    } catch (e) {
      console.error('[App] ส่งออกฐานข้อมูลล้มเหลว:', e);
      Utils.showToast('เกิดข้อผิดพลาดในการส่งออก', 'error');
    }
  },

  // นำเข้าไฟล์ JSON เพื่อคืนค่าหรือซิงค์ข้อมูล
  async importDatabase(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target.result;
        await DB.importDatabaseJSON(content);
        
        // อัปเดตข้อมูล State ใน Runtime Memory ใหม่
        await this.loadStateFromDB();
        
        Utils.hapticFeedback();
        Utils.showToast('📥 นำเข้าคลังข้อมูลและตั้งค่าสำเร็จ!', 'success');
        
        // รีเฟรชแสดงหน้าหลัก/หน้าปัจจุบัน
        this.navigate(this.currentPage);
        
        event.target.value = '';
      } catch (err) {
        console.error('[App] นำเข้าข้อมูลสำรองผิดพลาด:', err);
        Utils.showToast('ไฟล์สำรองไม่ถูกต้องหรือโครงสร้างชำรุด', 'error');
      }
    };
    reader.readAsText(file);
  },

  // จัดการประวัติการทานยาวันนี้
  _ensureTodayLog() {
    const todayKey = Utils.getTodayKey();
    if (this.state.todayLog.date !== todayKey) {
      // ข้ามวันใหม่ ให้รีเซ็ตประวัติวันนี้
      this.state.todayLog = {
        date: todayKey,
        taken: {}
      };
      this.saveState();
    }
  },

  // บันทึกว่าทานยาตัวนี้ไปแล้ว
  markMedicineTaken(medId, timeSlot) {
    this._ensureTodayLog();
    const logKey = `${medId}_${timeSlot}`;
    this.state.todayLog.taken[logKey] = Date.now();
    this.saveState();
    Utils.hapticFeedback();
    Utils.showToast('บันทึกการทานยาสำเร็จ', 'success', 2000);
  },

  // ยกเลิกทานยา
  unmarkMedicineTaken(medId, timeSlot) {
    this._ensureTodayLog();
    const logKey = `${medId}_${timeSlot}`;
    delete this.state.todayLog.taken[logKey];
    this.saveState();
  },

  // ตรวจสอบว่าทานยาหรือยัง
  isMedicineTaken(medId, timeSlot) {
    this._ensureTodayLog();
    const logKey = `${medId}_${timeSlot}`;
    return !!this.state.todayLog.taken[logKey];
  },

  // จัดการข้อมูลตู้ยา
  // เพิ่มยาใหม่เข้าตู้
  addMedicine(medicineEntry) {
    // สุ่มไอดีถ้าไม่มี
    if (!medicineEntry.id) {
      medicineEntry.id = Utils.generateId();
    }
    // ลงบันทึกวันที่เพิ่ม
    if (!medicineEntry.addedDate) {
      medicineEntry.addedDate = Utils.getTodayKey();
    }

    this.state.myMedicines.push(medicineEntry);
    this.saveState();
    return medicineEntry;
  },

  // ลบยาออกจากตู้
  removeMedicine(medId) {
    this.state.myMedicines = this.state.myMedicines.filter(m => m.id !== medId);
    // ล้างประวัติทานยาวันนี้ของยาที่เพิ่งถูกลบด้วย
    const taken = this.state.todayLog.taken;
    for (const key of Object.keys(taken)) {
      if (key.startsWith(medId + '_')) {
        delete taken[key];
      }
    }
    this.saveState();
  },

  // อัปเดตข้อมูลยาที่มีอยู่
  updateMedicine(medId, updates) {
    const idx = this.state.myMedicines.findIndex(m => m.id === medId);
    if (idx !== -1) {
      this.state.myMedicines[idx] = { ...this.state.myMedicines[idx], ...updates };
      this.saveState();
    }
  },

  // ค้นหายา
  getMedicine(medId) {
    return this.state.myMedicines.find(m => m.id === medId) || null;
  },

  // ดึงรายการยากินประจำในช่วงเวลานั้น
  getMedicinesForSlot(timeSlot) {
    return this.state.myMedicines.filter(med => {
      return med.type === 'regular' && med.timeSlots && med.timeSlots.includes(timeSlot);
    });
  },

  // ควบคุมขนาดตัวอักษร
  increaseFontSize() {
    const currentIdx = this._fontSizeOrder.indexOf(this.state.user.fontSize);
    if (currentIdx < this._fontSizeOrder.length - 1) {
      this.state.user.fontSize = this._fontSizeOrder[currentIdx + 1];
      this.applyFontSize();
      this.saveState();
      const info = this._fontSizes[this.state.user.fontSize];
      Utils.showToast(`ขนาดตัวอักษร: ${info.label}`, 'info', 1500);
    }
  },

  decreaseFontSize() {
    const currentIdx = this._fontSizeOrder.indexOf(this.state.user.fontSize);
    if (currentIdx > 0) {
      this.state.user.fontSize = this._fontSizeOrder[currentIdx - 1];
      this.applyFontSize();
      this.saveState();
      const info = this._fontSizes[this.state.user.fontSize];
      Utils.showToast(`ขนาดตัวอักษร: ${info.label}`, 'info', 1500);
    }
  },

  applyFontSize() {
    const sizeKey = this.state.user.fontSize || 'normal';
    const info = this._fontSizes[sizeKey];
    if (info) {
      document.documentElement.style.setProperty('--font-scale', info.scale);
      document.documentElement.setAttribute('data-font-size', sizeKey);
    }
  },

  // ดักคลิกปุ่มขนาดอักษรบนหน้าเว็บ
  _setupFontSizeControls() {
    const btnIncrease = document.getElementById('btn-font-increase');
    const btnDecrease = document.getElementById('btn-font-decrease');

    if (btnIncrease) {
      btnIncrease.addEventListener('click', () => this.increaseFontSize());
    }
    if (btnDecrease) {
      btnDecrease.addEventListener('click', () => this.decreaseFontSize());
    }
  },

  // จัดการปุ่มกดปิดทั่วไป
  _setupGlobalCloseHandlers() {
    // กด Escape บนคีย์บอร์ดเพื่อปิดหน้าต่างลอยทั้งหมด
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        // ปิดโมดอลป๊อปอัป
        document.querySelectorAll('.modal-overlay.active').forEach(modal => {
          Utils.hideModal(modal.id);
        });
        // ปิดบานพับล่าง
        document.querySelectorAll('.bottom-sheet.active').forEach(sheet => {
          Utils.hideBottomSheet(sheet.id);
        });
      }
    });

    // คลิกข้างนอกเพื่อปิดหน้าต่างลอย
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-overlay') && e.target.classList.contains('active')) {
        Utils.hideModal(e.target.id);
      }
    });
  },

  // เริ่มต้นใส่ข้อมูลยาตัวอย่าง
  initSampleData() {
    const sampleMedicines = [
      {
        id: Utils.generateId(),
        medicineId: 'metformin',
        dosageMg: 500,
        type: 'regular',
        timeSlots: ['morning', 'evening'],
        duration: 'continuous',
        efficacy: null,
        addedDate: '2026-01-15',
        pillColor: '#2196F3',
        notes: 'ทานหลังอาหาร'
      },
      {
        id: Utils.generateId(),
        medicineId: 'amlodipine',
        dosageMg: 5,
        type: 'regular',
        timeSlots: ['morning'],
        duration: 'continuous',
        efficacy: null,
        addedDate: '2026-01-15',
        pillColor: '#FFFFFF',
        notes: ''
      },
      {
        id: Utils.generateId(),
        medicineId: 'aspirin',
        dosageMg: 81,
        type: 'regular',
        timeSlots: ['morning'],
        duration: 'continuous',
        efficacy: null,
        addedDate: '2026-02-01',
        pillColor: '#FFFFFF',
        notes: 'ทานหลังอาหารเช้า'
      },
      {
        id: Utils.generateId(),
        medicineId: 'simvastatin',
        dosageMg: 20,
        type: 'regular',
        timeSlots: ['bedtime'],
        duration: 'continuous',
        efficacy: null,
        addedDate: '2026-02-01',
        pillColor: '#F8BBD0',
        notes: 'ทานก่อนนอน'
      },
      {
        id: Utils.generateId(),
        medicineId: 'omeprazole',
        dosageMg: 20,
        type: 'regular',
        timeSlots: ['morning'],
        duration: 'continuous',
        efficacy: null,
        addedDate: '2026-03-10',
        pillColor: '#E040FB',
        notes: 'ทานก่อนอาหารเช้า 30 นาที'
      },
      {
        id: Utils.generateId(),
        medicineId: 'paracetamol',
        dosageMg: 500,
        type: 'occasional',
        timeSlots: [],
        duration: 'asNeeded',
        efficacy: null,
        addedDate: '2026-04-20',
        pillColor: '#FFFFFF',
        notes: 'ทานเมื่อปวด ไม่เกิน 4 ครั้ง/วัน'
      }
    ];

    this.state.myMedicines = sampleMedicines;
    
    // Add default sample allergy log & scan history
    this.state.allergyLog = [
      { id: 'allergy_sample_1', medicineName: 'Diclofenac', medicineId: 'diclofenac', severity: 'severe', symptoms: 'หายใจไม่ออก แน่นหน้าอก ช็อก', dateRecorded: '2026-06-10' }
    ];
    this.state.scanHistory = [
      { id: 'scan_sample_1', timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), medicineName: 'Metformin', medicineId: 'metformin', dosageMg: 500, status: 'added' }
    ];
    this.state.soundEnabled = true;

    this.saveState();
    console.log('[YaCheck] เพิ่มข้อมูลยาตัวอย่าง', sampleMedicines.length, 'รายการสำเร็จ');
  },

  // อัปเดตข้อมูลหน้าตั้งค่า
  updateUserName(name) {
    const state = this.getState();
    state.user.name = name;
    this.setState(state);
    Utils.showToast('บันทึกชื่อผู้ใช้แล้ว', 'success', 1500);
    this._renderPage(this.currentPage);
  },

  updateUserAttribute(key, value) {
    const state = this.getState();
    state.user[key] = value;
    this.setState(state);
    Utils.showToast('บันทึกข้อมูลแล้ว', 'success', 1500);
    this._renderPage(this.currentPage);
  },

  toggleDisease(diseaseId) {
    if (this.state.currentRole === 'patient') {
      Utils.showToast('สิทธิ์คนไข้ไม่สามารถแก้ไขข้อมูลได้', 'warning');
      return;
    }
    const state = this.getState();
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

  recordWaterCup() {
    if (typeof Challenge !== 'undefined' && Challenge.recordWaterCup) {
      Challenge.recordWaterCup();
    }
  },

  toggleSpeedUpChallenge() {
    if (typeof Challenge !== 'undefined' && Challenge.toggleSpeedUp) {
      Challenge.toggleSpeedUp();
    }
  },

  finishChallenge() {
    if (typeof Challenge !== 'undefined' && Challenge.finish) {
      Challenge.finish();
    }
  },

  startMedSpacing(medName) {
    if (typeof Challenge !== 'undefined' && Challenge.start) {
      Challenge.start(medName);
    }
  },

  setFontSize(size) {
    if (typeof Settings !== 'undefined' && Settings.setFontSize) {
      Settings.setFontSize(size);
    }
  },

  updateEmergencyContact(field, value) {
    if (typeof Settings !== 'undefined' && Settings.updateEmergencyContact) {
      Settings.updateEmergencyContact(field, value);
    }
  },

  updateLineToken(value) {
    if (typeof Settings !== 'undefined' && Settings.updateLineToken) {
      Settings.updateLineToken(value);
    }
  },

  setSoundSetting(enabled) {
    if (typeof Settings !== 'undefined' && Settings.setSoundSetting) {
      Settings.setSoundSetting(enabled);
    }
  },

  // หน้าต่างลอยบันทึกแพ้ยาแบบละเอียด
  openAddAllergyModal() {
    const nameInput = document.getElementById('allergy-med-name');
    const symptomsInput = document.getElementById('allergy-symptoms');
    if (nameInput) nameInput.value = '';
    if (symptomsInput) symptomsInput.value = '';
    
    Utils.showModal('add-allergy-modal');
  },

  closeAddAllergyModal() {
    Utils.hideModal('add-allergy-modal');
  },

  saveAllergyEntry() {
    const nameInput = document.getElementById('allergy-med-name');
    const severityInput = document.getElementById('allergy-severity');
    const symptomsInput = document.getElementById('allergy-symptoms');
    
    if (!nameInput || !severityInput || !symptomsInput) return;
    
    const medName = nameInput.value.trim();
    const severity = severityInput.value;
    const symptoms = symptomsInput.value.trim();
    
    if (!medName) {
      Utils.showToast('กรุณากรอกชื่อยาที่แพ้', 'warning');
      return;
    }
    
    const state = this.getState();
    const allergyLog = state.allergyLog || [];
    
    // ค้นหายาสามัญที่ชื่อตรงกันเพื่อโยง ID ในระบบ (ถ้ามี)
    const matches = Utils.searchMedicines(medName);
    const medicineId = matches.length > 0 ? matches[0].id : 'custom';
    
    const newAllergy = {
      id: 'allergy_' + Date.now(),
      medicineName: medName,
      medicineId: medicineId,
      severity: severity,
      symptoms: symptoms || 'ไม่ระบุอาการ',
      dateRecorded: new Date().toISOString().split('T')[0]
    };
    
    allergyLog.push(newAllergy);
    this.updateState('allergyLog', allergyLog);
    this.closeAddAllergyModal();
    Utils.showToast('บันทึกประวัติแพ้ยาเรียบร้อยแล้ว', 'success');
    this._renderPage(this.currentPage);
    
    Utils.speak("บันทึกประวัติการแพ้ยาเรียบร้อยแล้วค่ะ");
  },

  removeAllergen(id) {
    if (confirm('คุณต้องการลบประวัติการแพ้ยานี้ใช่หรือไม่?')) {
      const state = this.getState();
      const allergyLog = (state.allergyLog || []).filter(a => a.id !== id);
      this.updateState('allergyLog', allergyLog);
      Utils.showToast('ลบประวัติการแพ้ยาแล้ว', 'success');
      this._renderPage(this.currentPage);
      
      Utils.speak("ลบประวัติการแพ้ยาเรียบร้อยแล้วค่ะ");
    }
  },

  // หน้าต่างลอยแจ้งเตือนภัยแพ้ยาอัตโนมัติ
  openAllergyWarningModal(medName, severity, symptoms, onConfirm, onCancel) {
    const titleEl = document.getElementById('allergy-warning-title');
    const bodyEl = document.getElementById('allergy-warning-body');
    const actionsEl = document.getElementById('allergy-warning-actions');
    
    if (!titleEl || !bodyEl || !actionsEl) return;
    
    const severityLabels = { mild: 'เล็กน้อย', moderate: 'ปานกลาง', severe: 'รุนแรงมาก' };
    
    if (severity === 'severe') {
      titleEl.textContent = 'วิกฤต: คนไข้แพ้ยานี้รุนแรง!';
      bodyEl.innerHTML = `ยา <strong>${medName}</strong> มีประวัติแพ้ยาระดับ <strong>${severityLabels[severity]}</strong><br>อาการที่ระบุ: <span style="color:var(--color-danger)">${symptoms}</span><br><br><strong>* ระบบไม่อนุญาตให้จ่ายยานี้โดยเด็ดขาด!</strong>`;
      actionsEl.innerHTML = `
        <button class="btn btn-primary btn-full" onclick="App.closeAllergyWarningModal(); ${onCancel}();">
          รับทราบและยกเลิก
        </button>
      `;
      // เล่นเสียงหวอเตือนภัยวิกฤต
      Utils.playAlarm();
      Utils.speak(`เตือนภัยวิกฤต คนไข้แพ้ยา ${medName} รุนแรง ห้ามบันทึกเข้าระบบค่ะ`);
    } else {
      titleEl.textContent = 'เตือนอันตราย: มีประวัติแพ้ยา!';
      titleEl.style.color = '#F57C00';
      bodyEl.innerHTML = `ยา <strong>${medName}</strong> มีประวัติแพ้ยาระดับ <strong>${severityLabels[severity]}</strong><br>อาการที่ระบุ: <span>${symptoms}</span><br><br>ยืนยันที่จะข้ามคำเตือนและบันทึกยานี้เข้าระบบหรือไม่?`;
      actionsEl.innerHTML = `
        <button class="btn btn-ghost" style="flex:1" onclick="App.closeAllergyWarningModal(); ${onCancel}();">ยกเลิก</button>
        <button class="btn btn-primary" style="flex:1; background-color:#F57C00; border-color:#F57C00;" onclick="App.closeAllergyWarningModal(); ${onConfirm}();">ยืนยันบันทึกยา</button>
      `;
      Utils.playAlarm();
      Utils.speak(`เตือนภัย คนไข้มีประวัติแพ้ยา ${medName} ค่ะ ยืนยันบันทึกยาหรือไม่`);
    }
    
    Utils.showModal('allergy-warning-modal');
  },

  closeAllergyWarningModal() {
    Utils.hideModal('allergy-warning-modal');
  },

  resetData() {
    if (confirm('คุณต้องการล้างข้อมูลทั้งหมดในแอปใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้')) {
      this.resetState();
    }
  },

  loginAs(role) {
    const state = this.getState();
    state.currentRole = role;
    state.currentUser = role === 'patient' ? 'patient123' : 'caregiver123';
    this.setState(state);
    
    Utils.showToast(`เข้าสู่ระบบสำเร็จในฐานะ: ${role === 'patient' ? 'คนไข้' : 'ผู้ดูแล'}`, 'success');
    this.navigate('dashboard');
  },

  logout() {
    if (confirm('คุณต้องการออกจากระบบใช่หรือไม่?')) {
      const state = this.getState();
      state.currentRole = null;
      state.currentUser = null;
      this.setState(state);
      this.navigate('login');
    }
  },

  switchAuthTab(tab) {
    const formSignin = document.getElementById('form-signin');
    const formSignup = document.getElementById('form-signup');
    const btnSignin = document.getElementById('btn-signin-tab');
    const btnSignup = document.getElementById('btn-signup-tab');
    
    if (tab === 'signin') {
      if (formSignin) formSignin.style.display = 'block';
      if (formSignup) formSignup.style.display = 'none';
      if (btnSignin) {
        btnSignin.classList.add('active');
        btnSignin.style.borderBottom = '3px solid var(--color-primary)';
        btnSignin.style.color = 'var(--color-primary)';
        btnSignin.style.fontWeight = '700';
      }
      if (btnSignup) {
        btnSignup.classList.remove('active');
        btnSignup.style.borderBottom = 'none';
        btnSignup.style.color = 'var(--color-text-secondary)';
        btnSignup.style.fontWeight = '500';
      }
    } else {
      if (formSignin) formSignin.style.display = 'none';
      if (formSignup) formSignup.style.display = 'block';
      if (btnSignin) {
        btnSignin.classList.remove('active');
        btnSignin.style.borderBottom = 'none';
        btnSignin.style.color = 'var(--color-text-secondary)';
        btnSignin.style.fontWeight = '500';
      }
      if (btnSignup) {
        btnSignup.classList.add('active');
        btnSignup.style.borderBottom = '3px solid var(--color-primary)';
        btnSignup.style.color = 'var(--color-primary)';
        btnSignup.style.fontWeight = '700';
      }
    }
  },

  selectSignUpRole(role) {
    this.signupRole = role;
    const btnPatient = document.getElementById('signup-role-patient');
    const btnCaregiver = document.getElementById('signup-role-caregiver');
    
    if (role === 'patient') {
      if (btnPatient) {
        btnPatient.classList.add('selected');
        btnPatient.style.border = '2px solid var(--color-primary)';
        btnPatient.style.background = 'rgba(46, 125, 111, 0.08)';
        btnPatient.style.color = 'var(--color-primary)';
      }
      if (btnCaregiver) {
        btnCaregiver.classList.remove('selected');
        btnCaregiver.style.border = '2px solid var(--color-border)';
        btnCaregiver.style.background = 'none';
        btnCaregiver.style.color = 'var(--color-text-secondary)';
      }
    } else {
      if (btnPatient) {
        btnPatient.classList.remove('selected');
        btnPatient.style.border = '2px solid var(--color-border)';
        btnPatient.style.background = 'none';
        btnPatient.style.color = 'var(--color-text-secondary)';
      }
      if (btnCaregiver) {
        btnCaregiver.classList.add('selected');
        btnCaregiver.style.border = '2px solid var(--color-primary)';
        btnCaregiver.style.background = 'rgba(46, 125, 111, 0.08)';
        btnCaregiver.style.color = 'var(--color-primary)';
      }
    }
  },

  handleSignIn(event) {
    if (event) event.preventDefault();
    const usernameInput = document.getElementById('signin-username');
    const passwordInput = document.getElementById('signin-password');
    if (!usernameInput || !passwordInput) return;

    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    if (!username || !password) {
      Utils.showToast('กรุณากรอกข้อมูลให้ครบถ้วน', 'warning');
      return;
    }

    const accounts = this.state.accounts || [];
    const user = accounts.find(acc => acc.username.toLowerCase() === username.toLowerCase());

    if (user) {
      if (user.password === password) {
        this.state.currentUser = user.username;
        this.state.currentRole = user.role;
        this.state.user.name = user.username;
        this.saveState();

        Utils.showToast(`เข้าสู่ระบบสำเร็จในฐานะ: ${user.role === 'patient' ? 'คนไข้' : 'ผู้ดูแล'}`, 'success');
        
        usernameInput.value = '';
        passwordInput.value = '';

        this.navigate('dashboard');
      } else {
        Utils.showToast('รหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง', 'error');
      }
    } else {
      Utils.showToast('ไม่พบบัญชีผู้ใช้นี้ กรุณาสมัครสมาชิกก่อนเข้าใช้งาน', 'warning');
    }
  },

  handleSignUp(event) {
    if (event) event.preventDefault();
    const usernameInput = document.getElementById('signup-username');
    const passwordInput = document.getElementById('signup-password');
    const emailInput = document.getElementById('signup-email');

    if (!usernameInput || !passwordInput || !emailInput) return;

    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    const email = emailInput.value.trim();
    const role = this.signupRole || 'patient';

    if (!username || !password || !email) {
      Utils.showToast('กรุณากรอกข้อมูลให้ครบถ้วน', 'warning');
      return;
    }

    if (password.length < 6) {
      Utils.showToast('รหัสผ่านต้องมีอย่างน้อย 6 หลัก', 'warning');
      return;
    }

    if (!email.toLowerCase().endsWith('@gmail.com')) {
      Utils.showToast('กรุณากรอกอีเมล @gmail.com เท่านั้น', 'warning');
      return;
    }

    const accounts = this.state.accounts || [];
    const exists = accounts.some(acc => acc.username.toLowerCase() === username.toLowerCase());

    if (exists) {
      Utils.showToast('ชื่อผู้ใช้นี้ถูกใช้งานแล้ว', 'warning');
      return;
    }

    this.tempSignUpData = { username, password, email, role };

    const otpEmailDisplay = document.getElementById('otp-modal-email');
    if (otpEmailDisplay) {
      otpEmailDisplay.textContent = email;
    }

    const otpInput = document.getElementById('gmail-otp-input');
    if (otpInput) {
      otpInput.value = '';
    }

    Utils.showModal('gmail-otp-modal');
  },

  verifyOtpCode() {
    const otpInput = document.getElementById('gmail-otp-input');
    if (!otpInput) return;

    const otpCode = otpInput.value.trim();

    if (otpCode === '123456') {
      if (!this.tempSignUpData) {
        Utils.showToast('ข้อมูลการสมัครไม่สมบูรณ์ กรุณาสมัครใหม่อีกครั้ง', 'error');
        Utils.hideModal('gmail-otp-modal');
        return;
      }

      if (!this.state.accounts) {
        this.state.accounts = [];
      }
      this.state.accounts.push(this.tempSignUpData);
      this.state.currentUser = this.tempSignUpData.username;
      this.state.currentRole = this.tempSignUpData.role;
      this.state.user.name = this.tempSignUpData.username;
      this.saveState();

      Utils.hideModal('gmail-otp-modal');
      Utils.showToast('สมัครสมาชิกและยืนยัน Gmail สำเร็จ!', 'success');

      this.tempSignUpData = null;
      
      const suUser = document.getElementById('signup-username');
      const suPass = document.getElementById('signup-password');
      const suEmail = document.getElementById('signup-email');
      if (suUser) suUser.value = '';
      if (suPass) suPass.value = '';
      if (suEmail) suEmail.value = '';

      this.navigate('dashboard');
    } else {
      Utils.showToast('รหัส OTP ไม่ถูกต้อง กรุณาลองอีกครั้ง', 'error');
    }
  },

  // โหลดกฎปฏิกิริยายาและคลังยาส่วนตัวที่ผู้ใช้เพิ่มด้วยตัวเอง
  loadCustomRulesAndDrugs() {
    // 1. โหลดกลุ่มยาส่วนตัวที่ยูสเซอร์เพิ่มเอง
    if (this.state.customMedicines && Array.isArray(this.state.customMedicines)) {
      this.state.customMedicines.forEach(m => {
        if (!MedicineDB.medicines.some(x => x.id === m.id)) {
          MedicineDB.medicines.push(m);
        }
      });
    }

    // 2. โหลดกฎความสัมพันธ์ยาตีกันที่ยูสเซอร์เพิ่มเอง
    if (this.state.customInteractions && Array.isArray(this.state.customInteractions)) {
      this.state.customInteractions.forEach(i => {
        const alreadyExists = MedicineDB.interactions.some(x => 
          (x.drug1 === i.drug1 && x.drug2 === i.drug2) ||
          (x.drug1 === i.drug2 && x.drug2 === i.drug1)
        );
        if (!alreadyExists) {
          MedicineDB.interactions.push(i);
        }
      });
    }
  },

  closeOtpModal() {
    Utils.hideModal('gmail-otp-modal');
    this.tempSignUpData = null;
  }
};

// สั่งรันแอปพลิเคชันทันทีเมื่อเว็บโหลดเสร็จ
document.addEventListener('DOMContentLoaded', () => App.init());
