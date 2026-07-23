// รวมฟังก์ชันช่วยเหลือทั่วไปในแอป

const Utils = {
  // ชื่อวันและเดือนภาษาไทย
  _thaiDayNames: ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'],
  _thaiDayNamesShort: ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'],
  _thaiMonthNames: [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ],
  _thaiMonthNamesShort: [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
  ],

  // ดึงโค้ดรูปไอคอน (SVG) ตามชื่อที่ระบุ
  getIconSvg(name, extraClass = '') {
    const icons = {
      pill: `<svg class="svg-icon ${extraClass}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8.5" y1="15.5" x2="15.5" y2="8.5"/><path d="M12 2a15.3 15.3 0 0 1 4 7l-9 9a15.3 15.3 0 0 1-7-4l9-9Z"/><path d="M16 8a1 1 0 1 0 2 2 1 1 0 1 0-2-2Z"/></svg>`,
      home: `<svg class="svg-icon ${extraClass}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
      camera: `<svg class="svg-icon ${extraClass}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>`,
      settings: `<svg class="svg-icon ${extraClass}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1 1 1.73l-.43.25a2 2 0 0 1 2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`,
      user: `<svg class="svg-icon ${extraClass}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
      text: `<svg class="svg-icon ${extraClass}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg>`,
      trash: `<svg class="svg-icon ${extraClass}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`,
      phone: `<svg class="svg-icon ${extraClass}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
      sunrise: `<svg class="svg-icon ${extraClass}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v8M5.22 10.22l1.42 1.42M18.78 10.22l-1.42 1.42M1 18h22M12 18a6 6 0 0 0-6-6M2 22h20M12 14v4"/></svg>`,
      sun: `<svg class="svg-icon ${extraClass}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>`,
      sunset: `<svg class="svg-icon ${extraClass}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v8M5.22 10.22l1.42 1.42M18.78 10.22l-1.42 1.42M1 18h22M12 18a6 6 0 0 0-6-6M2 22h20M12 14l-4 4M12 14l4 4"/></svg>`,
      moon: `<svg class="svg-icon ${extraClass}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`,
      write: `<svg class="svg-icon ${extraClass}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`,
      ambulance: `<svg class="svg-icon ${extraClass}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM5 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM13 18H7V6h4l2 2h7a2 2 0 0 1 2 2v5h-3M18 10h-3v4h4v-3a1 1 0 0 0-1-1ZM3 14h4v4H3z"/></svg>`,
      hospital: `<svg class="svg-icon ${extraClass}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M4 21V10a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v11M9 22v-4h6v4M8 12h8M12 8v8"/></svg>`,
      emergency: `<svg class="svg-icon ${extraClass}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
      syringe: `<svg class="svg-icon ${extraClass}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21 3-9 9M10 14l-6.5 6.5M19 5l.5.5a1.5 1.5 0 0 1 0 2.12l-3 3a1.5 1.5 0 0 1-2.12 0L14 10M11 11l-3 3a1.5 1.5 0 0 1-2.12 0L5 13M8 11.5l1.5 1.5M12 7.5l1.5 1.5"/></svg>`,
      sparkles: `<svg class="svg-icon ${extraClass}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>`,
      calendar: `<svg class="svg-icon ${extraClass}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
      calendarRange: `<svg class="svg-icon ${extraClass}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><rect x="7" y="14" width="10" height="4" rx="1"/></svg>`,
      pin: `<svg class="svg-icon ${extraClass}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z"/><circle cx="12" cy="10" r="3"/></svg>`,
      smile: `<svg class="svg-icon ${extraClass}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/></svg>`,
      meh: `<svg class="svg-icon ${extraClass}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="8" y1="15" x2="16" y2="15"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>`,
      frown: `<svg class="svg-icon ${extraClass}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 16s-1.5-2-4-2-4 2-4 2M9 9h.01M15 9h.01"/></svg>`,
      checkCircle: `<svg class="svg-icon ${extraClass}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
      alertTriangle: `<svg class="svg-icon ${extraClass}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
      chevronRight: `<svg class="svg-icon ${extraClass}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`,
      chevronLeft: `<svg class="svg-icon ${extraClass}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`,
      cross: `<svg class="svg-icon ${extraClass}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
      help: `<svg class="svg-icon ${extraClass}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`
    };
    return icons[name] || '';
  },

  // จัดรูปแบบวันที่ภาษาไทยแบบเต็ม (เช่น วันอังคาร 17 มิ.ย. 2569)
  formatThaiDate(date) {
    if (!(date instanceof Date)) date = new Date(date);
    const dayName = this._thaiDayNames[date.getDay()];
    const day = date.getDate();
    const monthShort = this._thaiMonthNamesShort[date.getMonth()];
    const thaiYear = date.getFullYear() + 543;
    return `วัน${dayName} ${day} ${monthShort} ${thaiYear}`;
  },

  // จัดรูปแบบวันที่ภาษาไทยแบบสั้น (เช่น 17 มิ.ย. 69)
  formatThaiDateShort(date) {
    if (!(date instanceof Date)) date = new Date(date);
    const day = date.getDate();
    const monthShort = this._thaiMonthNamesShort[date.getMonth()];
    const thaiYear = (date.getFullYear() + 543).toString().slice(-2);
    return `${day} ${monthShort} ${thaiYear}`;
  },

  // จัดรูปแบบเวลาเป็นภาษาไทย (เช่น 07:00 น.)
  formatThaiTime(date) {
    if (!(date instanceof Date)) date = new Date(date);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes} น.`;
  },

  // เช็คว่าเวลาตอนนี้อยู่ในช่วงไหน (มื้อเช้า, กลางวัน, เย็น, ก่อนนอน)
  getCurrentTimeSlot() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return 'morning';
    if (hour >= 11 && hour < 16) return 'noon';
    if (hour >= 16 && hour < 20) return 'evening';
    return 'bedtime'; // 20:00 - 04:59
  },

  // ดึงรายละเอียดแต่ละช่วงเวลา (ไอคอน, ชื่อไทย, เวลา, สี)
  getTimeSlotInfo(slot) {
    const slots = {
      morning: {
        iconName: 'sunrise',
        nameTh: 'มื้อเช้า',
        time: '07:00',
        accentColor: '#FF9800'
      },
      noon: {
        iconName: 'sun',
        nameTh: 'กลางวัน',
        time: '12:00',
        accentColor: '#FFC107'
      },
      evening: {
        iconName: 'sunset',
        nameTh: 'มื้อเย็น',
        time: '18:00',
        accentColor: '#E91E63'
      },
      bedtime: {
        iconName: 'moon',
        nameTh: 'ก่อนนอน',
        time: '21:00',
        accentColor: '#7B1FA2'
      }
    };
    return slots[slot] || slots.morning;
  },

  // รายการช่วงเวลาทั้งหมดที่มีในแอป
  getAllTimeSlots() {
    return ['morning', 'noon', 'evening', 'bedtime'];
  },

  // แสดงกล่องแจ้งเตือนสั้นๆ ด้านบน (Toast)
  showToast(message, type = 'info', duration = 3000) {
    // Ensure toast container exists
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }

    // Icon map per type
    const icons = {
      info: this.getIconSvg('pill', 'icon-md'),
      success: this.getIconSvg('checkCircle', 'icon-md'),
      warning: this.getIconSvg('alertTriangle', 'icon-md'),
      error: this.getIconSvg('cross', 'icon-md')
    };

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || icons.info}</span>
      <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);

    // Trigger entrance animation (allow DOM to paint first)
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    // Auto-dismiss
    setTimeout(() => {
      toast.classList.remove('show');
      toast.classList.add('toast-hiding');
      // Remove from DOM after exit animation
      toast.addEventListener('transitionend', () => toast.remove(), { once: true });
      // Fallback removal if transitionend doesn't fire
      setTimeout(() => toast.remove(), 400);
    }, duration);
  },

  // เปิดป๊อปอัพ Modal
  showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.add('active');
    const content = modal.querySelector('.modal-content');
    if (content) content.classList.add('active');
    document.body.classList.add('modal-open');
    this.hapticFeedback();
  },

  // ปิดป๊อปอัพ Modal
  hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.remove('active');
    const content = modal.querySelector('.modal-content');
    if (content) content.classList.remove('active');
    document.body.classList.remove('modal-open');
  },

  // ดึงรายละเอียดขึ้นมาจากขอบล่าง (Bottom Sheet)
  showBottomSheet(sheetId) {
    const sheet = document.getElementById(sheetId);
    if (!sheet) return;
    sheet.classList.add('active');
    document.body.classList.add('modal-open');
    this.hapticFeedback();

    // Close when tapping overlay backdrop
    const handleBackdrop = (e) => {
      if (e.target === sheet) {
        this.hideBottomSheet(sheetId);
        sheet.removeEventListener('click', handleBackdrop);
      }
    };
    sheet.addEventListener('click', handleBackdrop);
  },

  // ปิดบานพับรายละเอียดด้านล่าง
  hideBottomSheet(sheetId) {
    const sheet = document.getElementById(sheetId);
    if (!sheet) return;
    sheet.classList.remove('active');
    document.body.classList.remove('modal-open');
  },

  // สุ่มไอดีขึ้นมาใหม่
  generateId() {
    return 'med_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  },

  // เช็คว่ายาตัวใหม่ที่กดเพิ่ม จะไปตีกับยาเดิมที่เคยกินอยู่แล้วหรือเปล่า
  checkInteractions(newMedId, existingMeds) {
    const results = [];

    if (!newMedId || !existingMeds || existingMeds.length === 0) {
      return results;
    }

    // Get existing medicine IDs (deduplicated)
    const existingIds = [...new Set(existingMeds.map(m => m.medicineId))];

    // Check against every interaction pair in the database
    for (const interaction of MedicineDB.interactions) {
      for (const existingId of existingIds) {
        // Skip checking a drug against itself
        if (newMedId === existingId) continue;

        // Match bidirectionally: (drug1, drug2) or (drug2, drug1)
        const isMatch =
          (interaction.drug1 === newMedId && interaction.drug2 === existingId) ||
          (interaction.drug1 === existingId && interaction.drug2 === newMedId);

        if (isMatch) {
          const otherMed = MedicineDB.getMedicineById(existingId);
          results.push({
            interaction: interaction,
            otherMed: otherMed
          });
        }
      }
    }

    // Sort by severity: severe first, then moderate, then minor
    const severityOrder = { severe: 0, moderate: 1, minor: 2 };
    results.sort((a, b) => {
      return (severityOrder[a.interaction.severity] || 3) -
             (severityOrder[b.interaction.severity] || 3);
    });

    return results;
  },

  // ดึงรายละเอียดสีกับป้ายบอกระดับความรุนแรงของยาที่ตีกัน
  getSeverityInfo(severity) {
    const map = {
      severe: {
        color: '#D32F2F',
        bgColor: '#FFEBEE',
        iconName: 'emergency',
        emoji: this.getIconSvg('emergency', 'icon-md'),
        labelTh: 'อันตราย',
        labelEn: 'Severe'
      },
      moderate: {
        color: '#F57C00',
        bgColor: '#FFF3E0',
        iconName: 'alertTriangle',
        emoji: this.getIconSvg('alertTriangle', 'icon-md'),
        labelTh: 'ระวัง',
        labelEn: 'Moderate'
      },
      minor: {
        color: '#388E3C',
        bgColor: '#E8F5E9',
        iconName: 'checkCircle',
        emoji: this.getIconSvg('checkCircle', 'icon-md'),
        labelTh: 'เล็กน้อย',
        labelEn: 'Minor'
      }
    };
    return map[severity] || map.minor;
  },

  // หน่วงเวลารอให้ผู้ใช้พิมพ์เสร็จก่อนค่อยค้นหา (ช่วยไม่ให้ระบบทำงานหนักไป)
  debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func.apply(this, args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // ค้นหาชื่อยาจากฐานข้อมูล (ค้นได้ทั้งไทยและอังกฤษ)
  searchMedicines(query) {
    if (!query || query.trim().length === 0) return [];

    const q = query.trim().toLowerCase();

    return MedicineDB.medicines.filter(med => {
      return med.nameEn.toLowerCase().includes(q) ||
             med.nameTh.includes(q) ||
             med.category.includes(q) ||
             med.id.includes(q);
    });
  },

  // สั่งเครื่องสั่นเบาๆ ตอนกดปุ่ม (ถ้าอุปกรณ์รองรับ)
  hapticFeedback() {
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  },

  // ดึงวันที่วันนี้เป็นแบบ ปี-เดือน-วัน (คีย์สำหรับเซฟประวัติ)
  getTodayKey() {
    const now = new Date();
    return now.getFullYear() + '-' +
      String(now.getMonth() + 1).padStart(2, '0') + '-' +
      String(now.getDate()).padStart(2, '0');
  },

  // คำกล่าวสวัสดีทักทายตามช่วงเวลาของวัน
  getGreeting() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'สวัสดีตอนเช้า';
    if (hour >= 12 && hour < 17) return 'สวัสดีตอนบ่าย';
    if (hour >= 17 && hour < 21) return 'สวัสดีตอนเย็น';
    return 'สวัสดีตอนค่ำ';
  },

  // คำนวณเปอร์เซ็นต์ความคืบหน้าในการทานยาวันนี้
  calculateAdherence(myMedicines, todayLog) {
    // Only count regular medicines with assigned time slots
    const regularMeds = myMedicines.filter(m => m.type === 'regular' && m.timeSlots && m.timeSlots.length > 0);
    if (regularMeds.length === 0) return 100;

    let totalSlots = 0;
    let takenSlots = 0;

    for (const med of regularMeds) {
      for (const slot of med.timeSlots) {
        totalSlots++;
        const logKey = `${med.id}_${slot}`;
        if (todayLog.taken && todayLog.taken[logKey]) {
          takenSlots++;
        }
      }
    }

    return totalSlots > 0 ? Math.round((takenSlots / totalSlots) * 100) : 100;
  },

  // ดึงรูปทรงยาเป็นรูปวาด SVG (วงรี, กลม, แคปซูล)
  getPillShapeSVG(shape, color, size = 40) {
    const half = size / 2;
    switch (shape) {
      case 'round':
        return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
          <circle cx="${half}" cy="${half}" r="${half - 2}" fill="${color}" stroke="#ccc" stroke-width="1.5"/>
        </svg>`;
      case 'oval':
        return `<svg width="${size * 1.6}" height="${size}" viewBox="0 0 ${size * 1.6} ${size}">
          <ellipse cx="${size * 0.8}" cy="${half}" rx="${size * 0.7}" ry="${half - 2}" fill="${color}" stroke="#ccc" stroke-width="1.5"/>
        </svg>`;
      case 'capsule':
        return `<svg width="${size * 1.8}" height="${size}" viewBox="0 0 ${size * 1.8} ${size}">
          <rect x="2" y="2" width="${size * 1.8 - 4}" height="${size - 4}" rx="${half - 2}" fill="${color}" stroke="#ccc" stroke-width="1.5"/>
          <line x1="${size * 0.9}" y1="2" x2="${size * 0.9}" y2="${size - 2}" stroke="#ccc" stroke-width="1" opacity="0.5"/>
        </svg>`;
      default:
        return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
          <circle cx="${half}" cy="${half}" r="${half - 2}" fill="${color}" stroke="#ccc" stroke-width="1.5"/>
        </svg>`;
    }
  },

  // อ่านออกเสียงสังเคราะห์ภาษาไทย (TTS)
  speak(message) {
    const state = typeof App !== 'undefined' ? App.getState() : null;
    const isSoundEnabled = state ? (state.soundEnabled !== false) : true;
    if (!isSoundEnabled) return;

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.lang = 'th-TH';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  },

  // เล่นเสียงแจ้งเตือนไซเรนฉุกเฉินจำลอง (Web Audio API)
  playAlarm() {
    const state = typeof App !== 'undefined' ? App.getState() : null;
    const isSoundEnabled = state ? (state.soundEnabled !== false) : true;
    if (!isSoundEnabled) return;

    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      
      const ctx = new AudioContext();
      const playBeep = (time, freq, duration) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.3, time + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + duration);
      };
      
      const now = ctx.currentTime;
      playBeep(now, 800, 0.25);
      playBeep(now + 0.25, 600, 0.25);
      playBeep(now + 0.5, 800, 0.25);
      playBeep(now + 0.75, 600, 0.25);
    } catch (e) {
      console.warn("ไม่สามารถเล่นเสียงแจ้งเตือนไซเรนได้เนื่องจากข้อจำกัดบราวเซอร์:", e);
    }
  },

  // ส่งแจ้งเตือนจริงผ่าน LINE Notify API
  async sendRealLineNotification(message) {
    const state = typeof App !== 'undefined' ? App.getState() : null;
    const token = state ? state.lineToken : null;
    if (!token) {
      console.log('[LINE Notify] ไม่พบ Token สำหรับแจ้งเตือนจริง');
      return;
    }

    console.log('[LINE Notify] เริ่มส่งข้อความ:', message);

    const proxyUrl = 'https://thingproxy.freeboard.io/fetch/';
    const targetUrl = 'https://notify-api.line.me/api/notify';

    try {
      const response = await fetch(proxyUrl + targetUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'message=' + encodeURIComponent(message)
      });

      if (response.ok) {
        console.log('[LINE Notify] ส่งข้อความสำเร็จ');
        this.showToast('ส่งแจ้งเตือน LINE สำเร็จ', 'success');
      } else {
        const errText = await response.text();
        console.error('[LINE Notify] ส่งข้อความล้มเหลว:', response.status, errText);
        this.showToast(`ส่ง LINE ล้มเหลว (${response.status})`, 'error');
      }
    } catch (error) {
      console.error('[LINE Notify] เกิดข้อผิดพลาด:', error);
      // ลองใช้วิธีส่งตรงกรณีเชื่อมต่อได้เอง
      try {
        const directResponse = await fetch(targetUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: 'message=' + encodeURIComponent(message)
        });
        if (directResponse.ok) {
          console.log('[LINE Notify] ส่งตรงสำเร็จ');
          this.showToast('ส่งแจ้งเตือน LINE สำเร็จ (ส่งตรง)', 'success');
          return;
        }
      } catch (directErr) {
        console.error('[LINE Notify] ลองส่งตรงแล้วเกิดข้อผิดพลาด:', directErr);
      }
      this.showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ LINE', 'error');
    }
  }
};
