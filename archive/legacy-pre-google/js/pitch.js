// ตัวควบคุมและจำลองเดโมสำหรับหน้าพรีเซนต์ (MaCheck High-Tech Pitch Portal Logic)

const PitchApp = {
  currentSlide: 0,
  totalSlides: 6,
  
  // Audio Context & Oscilloscope properties
  audioContext: null,
  analyserNode: null,
  canvasContext: null,
  animationId: null,

  // ฐานข้อมูลยาและปฏิกิริยายาตีกัน (DDI) สำหรับตัวจำลอง
  db: {
    medicines: [
      { id: 'warfarin', nameTh: 'วาฟาริน', nameEn: 'Warfarin', category: 'ยาต้านการแข็งตัวของเลือด' },
      { id: 'aspirin', nameTh: 'แอสไพริน', nameEn: 'Aspirin', category: 'ยาต้านเกล็ดเลือด / แก้ปวด' },
      { id: 'diclofenac', nameTh: 'ไดโคลฟีแนค', nameEn: 'Diclofenac', category: 'ยาแก้ปวดกระดูกข้อกลุ่ม NSAIDs' },
      { id: 'metformin', nameTh: 'เมทฟอร์มิน', nameEn: 'Metformin', category: 'ยารักษาโรคเบาหวาน' },
      { id: 'enalapril', nameTh: 'อีนาลาพริล', nameEn: 'Enalapril', category: 'ยาลดความดันโลหิตกลุ่ม ACEI' },
      { id: 'losartan', nameTh: 'โลซาร์แทน', nameEn: 'Losartan', category: 'ยาลดความดันโลหิตกลุ่ม ARB' },
      { id: 'amlodipine', nameTh: 'แอมโลดิปีน', nameEn: 'Amlodipine', category: 'ยาลดความดันโลหิตกลุ่ม CCB' },
      { id: 'digoxin', nameTh: 'ไดจ็อกซิน', nameEn: 'Digoxin', category: 'ยารักษาโรคหัวใจล้มเหลว' }
    ],
    interactions: [
      {
        drug1: 'warfarin', drug2: 'aspirin',
        severity: 'severe',
        titleTh: 'ห้ามรับประทานยาคู่นี้ร่วมกัน',
        descriptionTh: 'ระบบไม่แสดงรายละเอียดผลกระทบเพื่อความปลอดภัย กรุณาติดต่อแพทย์หรือเภสัชกรทันที'
      },
      {
        drug1: 'warfarin', drug2: 'diclofenac',
        severity: 'severe',
        titleTh: 'ห้ามรับประทานยาคู่นี้ร่วมกัน',
        descriptionTh: 'ระบบไม่แสดงรายละเอียดผลกระทบเพื่อความปลอดภัย กรุณาติดต่อแพทย์หรือเภสัชกรทันที'
      },
      {
        drug1: 'enalapril', drug2: 'losartan',
        severity: 'severe',
        titleTh: 'ห้ามรับประทานยาคู่นี้ร่วมกัน',
        descriptionTh: 'ระบบไม่แสดงรายละเอียดผลกระทบเพื่อความปลอดภัย กรุณาติดต่อแพทย์หรือเภสัชกรทันที'
      },
      {
        drug1: 'aspirin', drug2: 'diclofenac',
        severity: 'moderate',
        titleTh: 'โปรดสอบถามแพทย์หรือเภสัชกรก่อนใช้ร่วมกัน',
        descriptionTh: 'ระบบไม่แสดงรายละเอียดผลกระทบเพื่อความปลอดภัย อย่ารับประทานร่วมกันจนกว่าจะได้รับคำแนะนำ'
      }
    ],
    profiles: {
      somsee: {
        name: 'อาม่าสมศรี',
        age: 82,
        conditions: 'เบาหวาน + ความดัน + ลิ่มเลือด',
        meds: ['metformin', 'enalapril', 'amlodipine', 'warfarin'],
        allergies: [],
        adherence: 85
      },
      somsak: {
        name: 'อากงสมศักดิ์',
        age: 75,
        conditions: 'โรคหัวใจ + ไตเสื่อม',
        meds: ['digoxin', 'losartan', 'aspirin'],
        allergies: ['metformin'],
        adherence: 60
      },
      somchai: {
        name: 'คุณปู่สมชาย',
        age: 68,
        conditions: 'โรคข้ออักเสบ + ปวดกระดูกเรื้อรัง',
        meds: ['amlodipine', 'diclofenac'],
        allergies: [],
        adherence: 95
      }
    }
  },

  // เริ่มต้นแอป
  init() {
    this.setupSlideNavigation();
    this.setupTAMCalculator();
    this.setupDDISimulator();
    this.setupAllergySimulator();
    this.setupLINESimulator();
    this.setupPatientProfiles();
    this.setupDDINetworkMatrix();
    this.setupCustomDataRulesAdder();
    this.setupJSONExporter();
    this.initVisualizer();
    
    this.logConsole('🚀 ระบบจำลอง Sandbox พรีเซนต์เริ่มต้นสำเร็จ', 'info');
    this.logConsole('📢 เสียงสังเคราะห์ภาษาไทย และเสียงไซเรนพร้อมทำงานแบบออฟไลน์ 100%', 'info');
    this.logConsole('🎛️ ระบบ Canvas Oscilloscope ความถี่เสียงฉุกเฉินพร้อมประมวลผล', 'info');

    // โหลดเคสแรกตั้งต้นอาม่าสมศรีเพื่อความสวยงามใน HUD
    setTimeout(() => {
      document.querySelector('.profile-card[data-profile="somsee"]')?.click();
    }, 300);
  },

  // ตั้งค่า Canvas คลื่นเสียง
  initVisualizer() {
    const canvas = document.getElementById('oscilloscope');
    if (canvas) {
      this.canvasContext = canvas.getContext('2d');
      // วาดเส้นเริ่มต้นนิ่งๆ
      const w = canvas.width;
      const h = canvas.height;
      this.canvasContext.fillStyle = '#030504';
      this.canvasContext.fillRect(0, 0, w, h);
      this.canvasContext.beginPath();
      this.canvasContext.moveTo(0, h / 2);
      this.canvasContext.lineTo(w, h / 2);
      this.canvasContext.strokeStyle = 'rgba(0, 255, 102, 0.4)';
      this.canvasContext.lineWidth = 2;
      this.canvasContext.stroke();
    }
  },

  // วาดคลื่นเสียง Oscilloscope
  drawOscilloscope() {
    if (!this.analyserNode || !this.canvasContext) return;
    
    const bufferLength = this.analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const canvas = document.getElementById('oscilloscope');
    if (!canvas) return;
    const width = canvas.width;
    const height = canvas.height;
    
    const draw = () => {
      this.animationId = requestAnimationFrame(draw);
      
      this.analyserNode.getByteTimeDomainData(dataArray);
      
      this.canvasContext.fillStyle = '#030504';
      this.canvasContext.fillRect(0, 0, width, height);
      
      this.canvasContext.lineWidth = 2;
      this.canvasContext.strokeStyle = '#00FF66';
      
      // เพิ่มความเรืองแสง (glow effect)
      this.canvasContext.shadowBlur = 6;
      this.canvasContext.shadowColor = '#00FF66';
      
      this.canvasContext.beginPath();
      
      const sliceWidth = width * 1.0 / bufferLength;
      let x = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = v * height / 2;
        
        if (i === 0) {
          this.canvasContext.moveTo(x, y);
        } else {
          this.canvasContext.lineTo(x, y);
        }
        
        x += sliceWidth;
      }
      
      this.canvasContext.lineTo(width, height / 2);
      this.canvasContext.stroke();
      
      // รีเซ็ต shadow
      this.canvasContext.shadowBlur = 0;
    };
    
    draw();
  },

  // คอนโทรลสไลด์
  setupSlideNavigation() {
    const dotsContainer = document.getElementById('slide-dots');
    if (dotsContainer) {
      dotsContainer.innerHTML = '';
      for (let i = 0; i < this.totalSlides; i++) {
        const dot = document.createElement('div');
        dot.className = `dot ${i === 0 ? 'active' : ''}`;
        dot.addEventListener('click', () => this.goToSlide(i));
        dotsContainer.appendChild(dot);
      }
    }

    document.getElementById('btn-prev')?.addEventListener('click', () => this.prevSlide());
    document.getElementById('btn-next')?.addEventListener('click', () => this.nextSlide());
    
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.target;
        if (!target) return;
        navButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // สลับแสดงผลหน้าย่อย
        const views = document.querySelectorAll('.pitch-page-view');
        views.forEach(v => {
          v.classList.toggle('active', v.id === 'view-' + target);
          v.style.display = (v.id === 'view-' + target) ? 'grid' : 'none';
        });

        if (target === 'network') {
          // สั่งรันแอนิเมชันกราฟเฉพาะเมื่ออยู่หน้าเครือข่ายยา
          this.netRunning = true;
          this.tickPitchNetwork();
          this.logConsole('🕸️ เปิดแผงเครือข่ายความปลอดภัยยา (เปิดใช้งาน Force Simulation)', 'info');
        } else {
          // หยุดแอนิเมชันเพื่อประหยัด CPU เมื่ออยู่หน้าอื่น
          this.netRunning = false;
        }

        if (target === 'presentation') {
          this.goToSlide(0);
        }
      });
    });
  },

  goToSlide(index) {
    if (index < 0 || index >= this.totalSlides) return;
    
    const slides = document.querySelectorAll('.slide');
    slides.forEach(s => s.classList.remove('active'));
    
    this.currentSlide = index;
    slides[index].classList.add('active');

    const dots = document.querySelectorAll('.dot');
    dots.forEach((d, idx) => {
      d.classList.toggle('active', idx === index);
    });

    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(b => b.classList.remove('active'));
    
    // ตั้งค่าแท็บพรีเซนต์ให้แอคทีฟเสมอเมื่อกำลังเลื่อนสไลด์
    document.querySelector('.nav-btn[data-target="presentation"]')?.classList.add('active');
    
    // ตรวจสอบความถูกต้องของหน้าเพจที่แอคทีฟ
    const views = document.querySelectorAll('.pitch-page-view');
    views.forEach(v => {
      v.classList.toggle('active', v.id === 'view-presentation');
      v.style.display = (v.id === 'view-presentation') ? 'grid' : 'none';
    });
    this.netRunning = false; // สไลด์ทำงานอยู่ ปิดแรงจำลองชั่วคราว

    if (index === 1) {
      setTimeout(() => {
        document.getElementById('bar-1').style.height = '13%';
        document.getElementById('bar-2').style.height = '50%';
        document.getElementById('bar-3').style.height = '100%';
      }, 200);
    } else {
      const bars = ['bar-1', 'bar-2', 'bar-3'];
      bars.forEach(bId => {
        const bar = document.getElementById(bId);
        if (bar) bar.style.height = '0%';
      });
    }

    this.logConsole(`🔄 สลับไปยังสไลด์ที่ ${index + 1}: ${document.querySelectorAll('.slide-title')[index].innerText}`, 'info');
  },

  prevSlide() {
    this.goToSlide(this.currentSlide - 1);
  },

  nextSlide() {
    this.goToSlide(this.currentSlide + 1);
  },

  // เครื่องคิดเลข TAM SAM SOM
  setupTAMCalculator() {
    const rateSlider = document.getElementById('calc-rate');
    const rateVal = document.getElementById('calc-rate-val');
    
    if (!rateSlider) return;

    const calculate = () => {
      const rate = parseInt(rateSlider.value, 10);
      rateVal.innerText = rate;

      const tam = 13000000 * rate;
      const sam = 3900000 * rate;
      const som = 117000 * rate;

      document.getElementById('val-tam').innerText = tam.toLocaleString('th-TH') + ' ฿';
      document.getElementById('val-sam').innerText = sam.toLocaleString('th-TH') + ' ฿';
      document.getElementById('val-som').innerText = som.toLocaleString('th-TH') + ' ฿';
    };

    rateSlider.addEventListener('input', calculate);
    calculate();
  },

  // ห้องทดลองยาตีกัน (DDI Simulator Dropdown)
  setupDDISimulator() {
    const select1 = document.getElementById('sim-drug-1');
    const select2 = document.getElementById('sim-drug-2');
    const btnCheck = document.getElementById('btn-sim-ddi-check');
    const alertCard = document.getElementById('sim-ddi-alert-card');

    if (!select1 || !select2 || !btnCheck) return;

    const populateSelects = () => {
      let optionsHtml = '<option value="">-- เลือกยา --</option>';
      this.db.medicines.forEach(m => {
        optionsHtml += `<option value="${m.id}">${m.nameTh} (${m.nameEn})</option>`;
      });
      select1.innerHTML = optionsHtml;
      select2.innerHTML = optionsHtml;
    };

    populateSelects();

    btnCheck.addEventListener('click', () => {
      const d1 = select1.value;
      const d2 = select2.value;
      this.checkDDI(d1, d2, alertCard);
    });
  },

  // ตรวจสอบอันตรกิริยา (DDI Check Shared)
  checkDDI(d1, d2, displayCard) {
    if (!d1 || !d2) {
      this.logConsole('❌ โปรดระบุชื่อยาทั้งสองตัวเพื่อทำรายการ', 'err');
      return;
    }
    if (d1 === d2) {
      this.logConsole('❌ ไม่สามารถระบุยาชนิดเดียวกันตรวจสอบคู่ได้', 'err');
      return;
    }

    this.logConsole(`🔍 ตรวจสอบความปลอดภัยคู่ยา ${d1} + ${d2}...`);
    const match = this.db.interactions.find(i => 
      (i.drug1 === d1 && i.drug2 === d2) || (i.drug1 === d2 && i.drug2 === d1)
    );

    const med1 = this.db.medicines.find(m => m.id === d1);
    const med2 = this.db.medicines.find(m => m.id === d2);

    if (displayCard) displayCard.style.display = 'none';

    if (match) {
      const safeTitle = match.severity === 'severe' ? 'ห้ามรับประทานร่วมกันเด็ดขาด' : 'ควรหลีกเลี่ยงหรือปรึกษาแพทย์';
      const safeDesc = match.severity === 'severe' 
        ? 'ยาทั้งสองตัวนี้มีฤทธิ์ขัดกันอย่างรุนแรง ห้ามทานร่วมกันเด็ดขาดเพื่อความปลอดภัยสูงสุด' 
        : 'ยาทั้งสองตัวนี้มีข้อควรระวังในการกินร่วมกัน ควรปรึกษาแพทย์หรือเภสัชกรก่อนใช้';

      if (displayCard) {
        displayCard.className = `ddi-alert-card ${match.severity}`;
        const severityLabels = { severe: 'อันตรายร้ายแรง!', moderate: 'ข้อควรระวังพิเศษ' };
        const iconStr = match.severity === 'severe' ? '🚨' : '⚠️';
        displayCard.innerHTML = `
          <div class="ddi-alert-title"><span>${iconStr}</span> ${severityLabels[match.severity]}: ${safeTitle}</div>
          <div class="ddi-alert-desc">${safeDesc}</div>
        `;
        setTimeout(() => displayCard.style.display = 'block', 50);
      }

      this.logConsole(`[DDI Alert: ${match.severity.toUpperCase()}] ตรวจพบอันตราย ${med1.nameEn} + ${med2.nameEn}`, match.severity === 'severe' ? 'err' : 'warn');
      
      if (match.severity === 'severe') {
        this.playSiren();
        this.speak(`คำเตือนภัยอันตรายระดับวิกฤตค่ะ ตรวจพบ ยา ${med1.nameTh} ตีกับยา ${med2.nameTh} ห้ามรับประทานร่วมกันเด็ดขาดค่ะ`);
      } else {
        this.speak(`ข้อควรระวังปานกลางค่ะ ยา ${med1.nameTh} กับ ยา ${med2.nameTh} ควรหลีกเลี่ยงหรือปรึกษาแพทย์ก่อนทานร่วมกันค่ะ`);
      }
    } else {
      if (displayCard) {
        displayCard.className = 'ddi-alert-card safe';
        displayCard.innerHTML = `
          <div class="ddi-alert-title"><span>✅</span> ผลตรวจปลอดภัย</div>
          <div class="ddi-alert-desc">ไม่พบรายงานยาตีกันระหว่าง ยา ${med1.nameTh} และ ยา ${med2.nameTh} สามารถทานร่วมกันได้</div>
        `;
        setTimeout(() => displayCard.style.display = 'block', 50);
      }
      this.logConsole(`[DDI Safe] ยาคู่ ${med1.nameEn} และ ${med2.nameEn} ทานร่วมกันได้ปลอดภัย`, 'info');
      this.speak(`ไม่พบประวัติปฏิกิริยายาตีกันระหว่างยา ${med1.nameTh} กับ ยา ${med2.nameTh} ทานร่วมกันได้ปลอดภัยค่ะ`);
    }
  },

  // โหลดเคสผู้สูงอายุจำลอง (Patient Profiles)
  setupPatientProfiles() {
    const profileButtons = document.querySelectorAll('.profile-card');
    profileButtons.forEach(card => {
      card.addEventListener('click', () => {
        const key = card.dataset.profile;
        const profile = this.db.profiles[key];
        if (!profile) return;

        // ซิงค์ปุ่มแอคทีฟข้ามหน้าจอ (ทั้งหน้า 1 และ หน้า 2)
        profileButtons.forEach(c => c.classList.remove('active'));
        document.querySelectorAll(`.profile-card[data-profile="${key}"]`).forEach(c => c.classList.add('active'));

        this.logConsole(`📋 โหลดข้อมูลเวชระเบียนเคส: ${profile.name} (${profile.age} ปี) โรคประจำตัว: ${profile.conditions}`, 'info');
        
        // จำลองข้อมูลยาตู้ยาของเคสนี้
        const medNames = profile.meds.map(mId => {
          const m = this.db.medicines.find(x => x.id === mId);
          return m ? m.nameTh : mId;
        });

        this.logConsole(`💊 รายการยาในตู้ยาคนไข้ (${profile.meds.length} ชนิด): ${medNames.join(', ')}`, 'info');
        
        // วิเคราะห์ความเสี่ยงยาตีกันในเคสนี้
        let hasConflict = false;
        let worstSeverity = 'safe';
        
        for (let i = 0; i < profile.meds.length; i++) {
          for (let j = i + 1; j < profile.meds.length; j++) {
            const conflict = this.db.interactions.find(x => 
              (x.drug1 === profile.meds[i] && x.drug2 === profile.meds[j]) ||
              (x.drug1 === profile.meds[j] && x.drug2 === profile.meds[i])
            );
            if (conflict) {
              hasConflict = true;
              if (conflict.severity === 'severe') worstSeverity = 'severe';
              else if (worstSeverity !== 'severe') worstSeverity = 'moderate';
              
              const m1 = this.db.medicines.find(x => x.id === profile.meds[i]);
              const m2 = this.db.medicines.find(x => x.id === profile.meds[j]);
              this.logConsole(`⚠️ ตรวจพบยาจ่ายตีกันในประวัติคนไข้: ${m1.nameEn} + ${m2.nameEn} (${conflict.titleTh})`, conflict.severity === 'severe' ? 'err' : 'warn');
            }
          }
        }

        if (!hasConflict) {
          this.logConsole(`✅ เคสตู้ยาของ ${profile.name} ตรวจสอบแล้วปลอดภัยดี ไม่มีจ่ายยาขัดกัน`, 'info');
        }

        // รายงานความสม่ำเสมอในการทานยา (Adherence)
        this.logConsole(`📊 อัตราการทานยาสม่ำเสมอ (Adherence rate): ${profile.adherence}%`, profile.adherence < 70 ? 'warn' : 'info');

        // สังเคราะห์รายงานเสียงสรุปคนไข้
        const allergyMsg = profile.allergies.length > 0 ? `มีประวัติแพ้ยา ${profile.allergies.join(', ')}` : 'ไม่มีประวัติแพ้ยา';
        const speechText = `โหลดแฟ้มข้อมูลคนไข้ ${profile.name} อายุ ${profile.age} ปี โรคประจำตัว ${profile.conditions} มีความสม่ำเสมอทานยา ${profile.adherence} เปอร์เซ็นต์ และ${allergyMsg}ค่ะ`;
        this.speak(speechText);

        // อัปเดตข้อมูลยาตู้และแพ้ยาของแผนภาพเครือข่ายความปลอดภัยยาบนเว็บบอร์ดพรีเซนต์
        this._activeCabinetMeds = profile.meds || [];
        this._activeAllergies = profile.allergies || [];
        this.rebuildPitchGraphSVG();

        // อัปเดตข้อมูลบนแดชบอร์ดตรวจสอบ Active Patient HUD
        const hudName = document.getElementById('hud-patient-name');
        const hudAge = document.getElementById('hud-patient-age');
        const hudConditions = document.getElementById('hud-patient-conditions');
        const hudMeds = document.getElementById('hud-patient-meds');
        const hudAllergies = document.getElementById('hud-patient-allergies');
        const hudAdherenceVal = document.getElementById('hud-patient-adherence-val');
        const hudAdherenceBar = document.getElementById('hud-patient-adherence-bar');

        if (hudName) hudName.innerText = profile.name;
        if (hudAge) hudAge.innerText = profile.age + ' ปี';
        if (hudConditions) hudConditions.innerText = profile.conditions;
        if (hudMeds) hudMeds.innerText = medNames.join(', ') || 'ไม่มี';
        if (hudAllergies) {
          const allergyThNames = profile.allergies.map(a => {
            const m = this.db.medicines.find(x => x.id === a);
            return m ? m.nameTh : a;
          });
          hudAllergies.innerText = allergyThNames.join(', ') || 'ไม่มีประวัติแพ้ยา';
        }
        if (hudAdherenceVal) hudAdherenceVal.innerText = profile.adherence + '%';
        if (hudAdherenceBar) hudAdherenceBar.style.width = profile.adherence + '%';
      });
    });
  },

  // ตั้งค่าโครงข่ายปฏิกิริยายาตีกัน DDI Matrix (ปรับเป็นระบบ SVG Network Graph)
  setupDDINetworkMatrix() {
    this.netNodes = [];
    this.netLinks = [];
    this.netZoom = 1.0;
    this.netPanX = 0;
    this.netPanY = 0;
    this._activeCabinetMeds = [];
    this._activeAllergies = [];

    const medicines = this.db.medicines;
    const width = 800;
    const height = 500;

    // 1. กระจายพิกัดโหนดเป็นวงกลมในสเกลแผนภาพ 800x500
    medicines.forEach((m, idx) => {
      const theta = (idx / medicines.length) * 2.0 * Math.PI;
      const r = 170;
      this.netNodes.push({
        id: m.id,
        nameEn: m.nameEn,
        nameTh: m.nameTh,
        category: m.category,
        x: width / 2 + r * Math.cos(theta),
        y: height / 2 + r * Math.sin(theta),
        vx: 0,
        vy: 0
      });
    });

    // 2. ผูกโยงเส้นสัมพันธ์ DDI
    this.db.interactions.forEach(inter => {
      this.netLinks.push({
        id: `${inter.drug1}_${inter.drug2}`,
        source: inter.drug1,
        target: inter.drug2,
        severity: inter.severity,
        titleTh: inter.titleTh,
        descriptionTh: inter.descriptionTh
      });
    });

    // 3. ผูกคำสั่ง drag, pan, zoom
    this.initPitchSVG();

    // 4. ตั้งค่าปุ่มควบคุมรีเซ็ตมุมมองและเขย่ากราฟ
    document.getElementById('btn-graph-reset')?.addEventListener('click', () => {
      this.netZoom = 1.0;
      this.netPanX = 0;
      this.netPanY = 0;
      this.updatePitchViewportTransform();
      this.logConsole('🔄 รีเซ็ตมุมมองและพิกัดซูมเครือข่ายยาเรียบร้อย', 'info');
    });

    document.getElementById('btn-graph-randomize')?.addEventListener('click', () => {
      this.netNodes.forEach(n => {
        n.x = width / 2 + (Math.random() - 0.5) * 300;
        n.y = height / 2 + (Math.random() - 0.5) * 200;
        n.vx = 0;
        n.vy = 0;
      });
      this.logConsole('🔀 เขย่าแรงดึงของเส้นใยความปลอดภัยสำเร็จ', 'info');
    });

    // 5. สั่งลูปรันแอนิเมชันสปริง
    this.netRunning = true;
    this.tickPitchNetwork();
  },

  // ผูกคำสั่งควบคุม Pan / Zoom และ drag บน SVG พรีเซนต์
  initPitchSVG() {
    const svg = document.getElementById('pitch-network-svg');
    const panGroup = document.getElementById('pitch-svg-pan-group');
    if (!svg || !panGroup) return;

    this.updatePitchViewportTransform();

    // Pan ด้วยการลากพื้นหลัง
    svg.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'svg' || e.target.id === 'pitch-svg-pan-group' || e.target.id === 'pitch-svg-links-group') {
        this._isPanning = true;
        this._panStartX = e.clientX - this.netPanX;
        this._panStartY = e.clientY - this.netPanY;
        svg.style.cursor = 'grabbing';
      }
    });

    svg.addEventListener('mousemove', (e) => {
      if (this._isPanning) {
        this.netPanX = e.clientX - this._panStartX;
        this.netPanY = e.clientY - this._panStartY;
        this.updatePitchViewportTransform();
      } else if (this.netDraggedNode) {
        const rect = svg.getBoundingClientRect();
        const mX = e.clientX - rect.left;
        const mY = e.clientY - rect.top;
        this.netDraggedNode.x = (mX - this.netPanX) / this.netZoom;
        this.netDraggedNode.y = (mY - this.netPanY) / this.netZoom;
        this.netDraggedNode.vx = 0;
        this.netDraggedNode.vy = 0;
      }
    });

    window.addEventListener('mouseup', () => {
      this._isPanning = false;
      this.netDraggedNode = null;
      if (svg) svg.style.cursor = 'grab';
    });

    // Zoom ด้วยลูกกลิ้ง
    svg.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
      this.netZoom = Math.max(0.4, Math.min(3.0, this.netZoom * zoomFactor));
      this.updatePitchViewportTransform();
    }, { passive: false });

    // สลักทัชสกรีน
    svg.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        if (target && (target.tagName === 'svg' || target.id === 'pitch-svg-pan-group')) {
          this._isPanning = true;
          this._panStartX = touch.clientX - this.netPanX;
          this._panStartY = touch.clientY - this.netPanY;
        }
      }
    });

    svg.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        if (this._isPanning) {
          this.netPanX = touch.clientX - this._panStartX;
          this.netPanY = touch.clientY - this._panStartY;
          this.updatePitchViewportTransform();
        } else if (this.netDraggedNode) {
          const rect = svg.getBoundingClientRect();
          const mX = touch.clientX - rect.left;
          const mY = touch.clientY - rect.top;
          this.netDraggedNode.x = (mX - this.netPanX) / this.netZoom;
          this.netDraggedNode.y = (mY - this.netPanY) / this.netZoom;
          this.netDraggedNode.vx = 0;
          this.netDraggedNode.vy = 0;
        }
      }
    });

    svg.addEventListener('touchend', () => {
      this._isPanning = false;
      this.netDraggedNode = null;
    });

    this.rebuildPitchGraphSVG();
  },

  updatePitchViewportTransform() {
    const panGroup = document.getElementById('pitch-svg-pan-group');
    if (panGroup) {
      panGroup.setAttribute('transform', `translate(${this.netPanX}, ${this.netPanY}) scale(${this.netZoom})`);
    }
  },

  // วาดโครงสร้าง SVG
  rebuildPitchGraphSVG() {
    const nodesGroup = document.getElementById('pitch-svg-nodes-group');
    const linksGroup = document.getElementById('pitch-svg-links-group');
    if (!nodesGroup || !linksGroup) return;

    nodesGroup.innerHTML = '';
    linksGroup.innerHTML = '';

    // 1. เขียนเส้นเชื่อมโยง
    this.netLinks.forEach(l => {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('id', `pitch-line-${l.id}`);
      
      let stroke = 'rgba(255,255,255,0.1)';
      let width = '1.5';
      let isAnimated = false;
      let filter = '';

      const isD1Active = this._activeCabinetMeds.includes(l.source);
      const isD2Active = this._activeCabinetMeds.includes(l.target);

      if (isD1Active && isD2Active) {
        if (l.severity === 'severe') {
          stroke = '#DC2626';
          width = '3.5';
          isAnimated = true;
          filter = 'url(#pitch-glow-danger)';
        } else {
          stroke = '#D97706';
          width = '2.5';
          isAnimated = true;
          filter = 'url(#pitch-glow-warning)';
        }
      } else {
        stroke = l.severity === 'severe' ? 'rgba(220,38,38,0.2)' : 'rgba(217,119,6,0.15)';
      }

      line.setAttribute('stroke', stroke);
      line.setAttribute('stroke-width', width);
      if (filter) line.setAttribute('filter', filter);

      if (isAnimated) {
        line.setAttribute('stroke-dasharray', '8, 6');
        line.classList.add(l.severity === 'severe' ? 'animated-ddi-link-severe' : 'animated-ddi-link-moderate');
      }

      linksGroup.appendChild(line);
    });

    // 2. เขียนโหนด
    this.netNodes.forEach(n => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'node-element');
      g.setAttribute('id', `pitch-node-g-${n.id}`);

      g.addEventListener('mouseenter', () => this.highlightPitchConnections(n));
      g.addEventListener('mouseleave', () => this.clearPitchHighlights());

      // คลิกแล้วจำลองยัดค่าเข้าช่องทดสอบ DDI ทันที!
      g.addEventListener('click', () => {
        const select1 = document.getElementById('sim-drug-1');
        const select2 = document.getElementById('sim-drug-2');
        if (select1 && select2) {
          if (select1.value === n.id) {
            select1.value = '';
          } else if (!select1.value || select1.value === select2.value) {
            select1.value = n.id;
          } else {
            select2.value = n.id;
          }
          this.logConsole(`🎯 คลิกกราฟเลือดยา: ${n.nameTh} (${n.nameEn}) เข้าช่องเปรียบเทียบ`, 'info');
        }
      });

      g.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        this.netDraggedNode = n;
      });
      g.addEventListener('touchstart', (e) => {
        e.stopPropagation();
        this.netDraggedNode = n;
      });

      const isCabinet = this._activeCabinetMeds.includes(n.id);
      const isAllergy = this._activeAllergies.includes(n.id) || this._activeAllergies.includes(n.nameEn);

      // วงแหวนชีพจรกะพริบแจ้งเตือนแพ้ยา
      if (isAllergy) {
        const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        ring.setAttribute('r', '20');
        ring.setAttribute('fill', 'none');
        ring.setAttribute('stroke', '#DC2626');
        ring.setAttribute('stroke-width', '2');
        ring.classList.add('pulse-allergy-ring');
        g.appendChild(ring);
      }

      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('r', isCabinet ? '14' : '11');
      
      let fill = 'rgba(255,255,255,0.15)';
      let stroke = 'rgba(255,255,255,0.3)';
      let strokeWidth = '1';

      if (isAllergy) {
        fill = '#DC2626';
        stroke = '#FFF';
        strokeWidth = '2';
      } else if (isCabinet) {
        fill = '#00E676';
        stroke = '#FFF';
        strokeWidth = '2';
      }

      circle.setAttribute('fill', fill);
      circle.setAttribute('stroke', stroke);
      circle.setAttribute('stroke-width', strokeWidth);
      circle.setAttribute('class', 'node-circle');
      g.appendChild(circle);

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.textContent = n.nameEn;
      text.setAttribute('y', '20');
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('fill', '#CFD8DC');
      text.setAttribute('font-size', '0.72rem');
      text.setAttribute('font-weight', isCabinet ? '700' : '500');
      text.setAttribute('style', 'font-family: Sarabun, sans-serif; pointer-events: none;');
      g.appendChild(text);

      nodesGroup.appendChild(g);
    });

    this.updatePitchSVGCoords();
  },

  updatePitchSVGCoords() {
    this.netLinks.forEach(l => {
      const line = document.getElementById(`pitch-line-${l.id}`);
      const sNode = this.netNodes.find(n => n.id === l.source);
      const tNode = this.netNodes.find(n => n.id === l.target);
      if (line && sNode && tNode) {
        line.setAttribute('x1', sNode.x);
        line.setAttribute('y1', sNode.y);
        line.setAttribute('x2', tNode.x);
        line.setAttribute('y2', tNode.y);
      }
    });

    this.netNodes.forEach(n => {
      const g = document.getElementById(`pitch-node-g-${n.id}`);
      if (g) {
        g.setAttribute('transform', `translate(${n.x}, ${n.y})`);
      }
    });
  },

  tickPitchNetwork() {
    if (!this.netRunning) return;

    const width = 800;
    const height = 500;
    const centerX = width / 2;
    const centerY = height / 2;

    const kRepulsion = 25000;
    const kAttraction = 0.055;
    const gravity = 0.04;
    const damping = 0.82;
    const idealLength = 135;

    for (let i = 0; i < this.netNodes.length; i++) {
      const n1 = this.netNodes[i];
      for (let j = i + 1; j < this.netNodes.length; j++) {
        const n2 = this.netNodes[j];
        let dx = n2.x - n1.x;
        let dy = n2.y - n1.y;
        if (dx === 0) dx = 0.5;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 300) {
          const force = kRepulsion / (dist * dist + 100);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          if (n1 !== this.netDraggedNode) {
            n1.vx -= fx;
            n1.vy -= fy;
          }
          if (n2 !== this.netDraggedNode) {
            n2.vx += fx;
            n2.vy += fy;
          }
        }
      }
    }

    this.netLinks.forEach(l => {
      const sNode = this.netNodes.find(n => n.id === l.source);
      const tNode = this.netNodes.find(n => n.id === l.target);
      if (sNode && tNode) {
        let dx = tNode.x - sNode.x;
        let dy = tNode.y - sNode.y;
        if (dx === 0) dx = 0.5;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const force = kAttraction * (dist - idealLength);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        if (sNode !== this.netDraggedNode) {
          sNode.vx += fx;
          sNode.vy += fy;
        }
        if (tNode !== this.netDraggedNode) {
          tNode.vx -= fx;
          tNode.vy -= fy;
        }
      }
    });

    this.netNodes.forEach(n => {
      if (n === this.netDraggedNode) return;

      const dx = centerX - n.x;
      const dy = centerY - n.y;
      n.vx += dx * gravity;
      n.vy += dy * gravity;

      n.vx *= damping;
      n.vy *= damping;

      n.x += n.vx;
      n.y += n.vy;
    });

    this.updatePitchSVGCoords();
    this.netAnimationId = requestAnimationFrame(() => this.tickPitchNetwork());
  },

  highlightPitchConnections(node) {
    const connectedIds = new Set([node.id]);
    this.netLinks.forEach(l => {
      const line = document.getElementById(`pitch-line-${l.id}`);
      if (!line) return;

      if (l.source === node.id || l.target === node.id) {
        line.setAttribute('opacity', '1.0');
        const otherId = l.source === node.id ? l.target : l.source;
        connectedIds.add(otherId);
      } else {
        line.setAttribute('opacity', '0.15');
      }
    });

    this.netNodes.forEach(n => {
      const g = document.getElementById(`pitch-node-g-${n.id}`);
      if (g) {
        g.setAttribute('opacity', connectedIds.has(n.id) ? '1.0' : '0.2');
      }
    });

    const tooltip = document.getElementById('pitch-node-tooltip');
    if (tooltip) {
      tooltip.innerHTML = `
        <strong style="color:var(--neon-purple);">${node.nameEn}</strong> (${node.nameTh})<br>
        <span style="font-size:0.7rem; color:#90A4AE;">หมวดหมู่: ${node.category}</span>
      `;
      tooltip.style.display = 'block';
    }
  },

  clearPitchHighlights() {
    const tooltip = document.getElementById('pitch-node-tooltip');
    if (tooltip) tooltip.style.display = 'none';

    this.netNodes.forEach(n => {
      const g = document.getElementById(`pitch-node-g-${n.id}`);
      if (g) g.setAttribute('opacity', '1.0');
    });

    this.netLinks.forEach(l => {
      const line = document.getElementById(`pitch-line-${l.id}`);
      if (line) line.setAttribute('opacity', '1.0');
    });
  },

  updateMatrixHighlight(focusId) {
    this.netNodes.forEach(n => {
      const g = document.getElementById(`pitch-node-g-${n.id}`);
      if (g) {
        if (!focusId || n.id === focusId) {
          g.setAttribute('opacity', '1.0');
          const circle = g.querySelector('.node-circle');
          if (circle && focusId) {
            circle.setAttribute('stroke', '#EAB308');
            circle.setAttribute('stroke-width', '3');
          }
        } else {
          g.setAttribute('opacity', '0.25');
        }
      }
    });
  },

  // ห้องทดลองการแพ้ยา (Allergy Pre-Save Simulator)
  setupAllergySimulator() {
    const medInput = document.getElementById('allergy-sim-med');
    const severityInput = document.getElementById('allergy-sim-severity');
    const btnSimulate = document.getElementById('btn-sim-allergy-save');
    const overlay = document.getElementById('sim-alert-overlay');

    if (!medInput || !severityInput || !btnSimulate || !overlay) return;

    btnSimulate.addEventListener('click', () => {
      const medName = medInput.value.trim() || 'เมทฟอร์มิน (Metformin)';
      const severity = severityInput.value;

      this.logConsole(`💾 กำลังจำลองการกดบันทึกยา ${medName} เข้าระบบ...`);

      if (severity === 'severe') {
        overlay.className = 'sim-alert-overlay';
        overlay.innerHTML = `
          <div class="sim-alert-modal">
            <svg class="sim-alert-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <div class="sim-alert-title" style="color: var(--neon-danger)">🚫 บล็อกการบันทึกยา!</div>
            <div class="sim-alert-body">
              ตรวจพบประวัติการแพ้ยาขั้นรุนแรง (Severe Allergy) ต่อ <strong>${medName}</strong> ระบบขอยับยั้งการบันทึกยาตัวนี้ เพื่อป้องกันความเสี่ยงเป็นอันตรายถึงชีวิตของคนไข้
            </div>
            <button class="sandbox-btn btn-danger" onclick="PitchApp.closeAllergyOverlay()">ตกลงและยกเลิกบันทึก</button>
          </div>
        `;
        overlay.style.display = 'flex';
        this.logConsole(`[Allergy Blocked] บล็อกการบันทึกยา ${medName} เนื่องจากแพ้ยาขั้นวิกฤต (Severe)`, 'err');
        
        this.playSiren();
        this.speak(`คำเตือนวิกฤต! ตรวจพบประวัติการแพ้ยารุนแรงต่อ ${medName} ระบบระงับการบันทึกยาเพื่อความปลอดภัยค่ะ`);

      } else if (severity === 'moderate') {
        overlay.className = 'sim-alert-overlay';
        overlay.innerHTML = `
          <div class="sim-alert-modal warning">
            <svg class="sim-alert-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <div class="sim-alert-title" style="color: var(--neon-warning)">⚠️ คำเตือนความเสี่ยง</div>
            <div class="sim-alert-body">
              พบว่าคนไข้มีประวัติแพ้ยาระดับปานกลางต่อ <strong>${medName}</strong> (อาการ: ปากบวม ตาบวม) ต้องการกดยืนยันเพื่อบันทึกต่อไปหรือไม่?
            </div>
            <div style="display:flex; gap:10px;">
              <button class="sandbox-btn" style="background:#555; color:#fff" onclick="PitchApp.closeAllergyOverlay()">ยกเลิก</button>
              <button class="sandbox-btn" onclick="PitchApp.bypassAllergyAndSave('${medName}')">บันทึกต่อไป</button>
            </div>
          </div>
        `;
        overlay.style.display = 'flex';
        this.logConsole(`[Allergy Warned] แสดงการแจ้งเตือนความเสี่ยงปานกลาง (Moderate) สำหรับยา ${medName}`, 'warn');
        this.speak(`ตรวจพบประวัติแพ้ยาระดับปานกลางต่อยา ${medName} โปรดตรวจสอบอาการแพ้ก่อนกดยืนยันบันทึกยาค่ะ`);

      } else {
        this.logConsole(`[Allergy Checked] ผ่านด่านตรวจสอบแพ้ยา บันทึกข้อมูลยา ${medName} สำเร็จ`, 'info');
        this.speak(`ผ่านการตรวจสอบ บันทึกข้อมูลยา ${medName} เรียบร้อยแล้วค่ะ`);
      }
    });
  },

  closeAllergyOverlay() {
    document.getElementById('sim-alert-overlay').style.display = 'none';
  },

  bypassAllergyAndSave(medName) {
    this.closeAllergyOverlay();
    this.logConsole(`[Override Save] ผู้ใช้งานเลือก Override บันทึกยา ${medName} ลงตู้ยาสำเร็จ`, 'info');
    this.speak(`ทำการบันทึกข้อมูลยา ${medName} ตามที่ผู้ใช้สั่งเรียบร้อยค่ะ`);
  },

  // หน้าต่างส่งสัญญาณ LINE Notify จำลอง
  setupLINESimulator() {
    const tokenInput = document.getElementById('sim-line-token');
    const btnSendMsg = document.getElementById('btn-sim-line-send');

    if (!tokenInput || !btnSendMsg) return;

    btnSendMsg.addEventListener('click', async () => {
      const token = tokenInput.value.trim();
      const message = "📢 [MaCheck Pitch] ขอรายงานความคืบหน้า: คนไข้ทานยาประเมินความปลอดภัยมื้อเช้าเรียบร้อยแล้วค่ะ";

      if (!token) {
        this.logConsole('❌ โปรดระบุ LINE Notify Token ในการตั้งค่าเพื่อทดสอบส่งจริง', 'err');
        return;
      }

      this.logConsole(`📤 เริ่มยิงข้อความส่งแจ้งเตือนจริงทาง LINE Notify...`);
      
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
          this.logConsole(`✅ [LINE Success] ยิงข้อความจริงสำเร็จทาง LINE Notify!`, 'info');
        } else {
          this.logConsole(`❌ [LINE Failed] ส่งข้อความไม่สำเร็จ สถานะ: ${response.status}`, 'err');
        }
      } catch (err) {
        this.logConsole(`❌ [LINE Connect Error] การส่งผ่าน CORS Proxy ล้มเหลว: ${err.message}`, 'err');
      }
    });
  },

  // เล่นเสียงไซเรนฉุกเฉิน Web Audio API และวาดคลื่นความถี่ใน Canvas Oscilloscope
  playSiren() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      
      if (!this.audioContext) {
        this.audioContext = new AudioContext();
      }
      
      const ctx = this.audioContext;
      
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
      }
      
      if (!this.analyserNode) {
        this.analyserNode = ctx.createAnalyser();
        this.analyserNode.fftSize = 256;
      }
      
      const playBeep = (time, freq, duration) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, time);
        
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.35, time + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        
        osc.connect(gain);
        gain.connect(this.analyserNode);
        osc.start(time);
        osc.stop(time + duration);
      };
      
      this.analyserNode.connect(ctx.destination);
      
      const now = ctx.currentTime;
      playBeep(now, 850, 0.22);
      playBeep(now + 0.22, 600, 0.22);
      playBeep(now + 0.44, 850, 0.22);
      playBeep(now + 0.66, 600, 0.22);
      
      // เริ่มต้นวาดคลื่นบน Canvas
      this.drawOscilloscope();
      
      // ปิดแอนิเมชันหลังเสียงหมด
      setTimeout(() => {
        if (this.animationId) {
          cancelAnimationFrame(this.animationId);
          // วาดเส้นแนวนอนสงบนิ่งกลับมา
          this.initVisualizer();
        }
      }, 1000);
      
    } catch (e) {
      console.warn("ไม่สามารถสังเคราะห์ไซเรน:", e);
    }
  },

  // ออกเสียงสังเคราะห์ภาษาไทย (SpeechSynthesis)
  speak(message) {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.lang = 'th-TH';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  },

  // พิมพ์ข้อความลงคอนโซลจำลอง
  logConsole(message, type = '') {
    const consoleBox = document.getElementById('sim-console-list');
    if (!consoleBox) return;

    const timeStr = new Date().toLocaleTimeString('th-TH', { hour12: false });
    const line = document.createElement('div');
    line.className = `console-line ${type}`;
    line.innerText = `[${timeStr}] ${message}`;

    consoleBox.appendChild(line);
    consoleBox.scrollTop = consoleBox.scrollHeight;
  },

  // ตั้งค่าปุ่มเพิ่มยาและกฎโยง DDI แบบไดนามิก
  setupCustomDataRulesAdder() {
    const btnMed = document.getElementById('tab-add-med');
    const btnRule = document.getElementById('tab-add-rule');
    const formMed = document.getElementById('form-add-med');
    const formRule = document.getElementById('form-add-rule');

    if (!btnMed || !btnRule || !formMed || !formRule) return;

    // ระบบสลับแท็บฟอร์ม
    btnMed.addEventListener('click', () => {
      btnMed.classList.add('active');
      btnRule.classList.remove('active');
      formMed.style.display = 'flex';
      formRule.style.display = 'none';
    });

    btnRule.addEventListener('click', () => {
      btnRule.classList.add('active');
      btnMed.classList.remove('active');
      formRule.style.display = 'flex';
      formMed.style.display = 'none';
      
      // อัปเดตรายชื่อยาในตัวเลือกล่าสุด
      const sel1 = document.getElementById('new-rule-drug-1');
      const sel2 = document.getElementById('new-rule-drug-2');
      if (sel1 && sel2) {
        let options = '<option value="">-- เลือกยา --</option>';
        this.db.medicines.forEach(m => {
          options += `<option value="${m.id}">${m.nameTh} (${m.nameEn})</option>`;
        });
        sel1.innerHTML = options;
        sel2.innerHTML = options;
      }
    });

    // การกดบันทึกยาสามัญตัวใหม่
    document.getElementById('btn-add-med-submit')?.addEventListener('click', () => {
      const idInput = document.getElementById('new-med-id');
      const thInput = document.getElementById('new-med-name-th');
      const enInput = document.getElementById('new-med-name-en');
      const catInput = document.getElementById('new-med-category');

      const id = idInput.value.trim().toLowerCase();
      const nameTh = thInput.value.trim();
      const nameEn = enInput.value.trim();
      const category = catInput.value.trim();

      if (!id || !nameTh || !nameEn || !category) {
        this.logConsole('❌ กรุณากรอกข้อมูลยาสามัญใหม่ให้ครบถ้วนก่อนบันทึก', 'err');
        return;
      }

      // ตรวจสอบไอดีซ้ำ
      if (this.db.medicines.some(x => x.id === id)) {
        this.logConsole(`❌ ยารหัส ID "${id}" มีอยู่ในฐานข้อมูลแล้ว`, 'err');
        return;
      }

      const newMed = { id, nameTh, nameEn, category };
      this.db.medicines.push(newMed);

      // เพิ่มโหนดใหม่ลงแผนภาพเครือข่าย
      const width = 800;
      const height = 500;
      this.netNodes.push({
        id: id,
        nameEn: nameEn,
        nameTh: nameTh,
        category: category,
        x: width / 2 + (Math.random() - 0.5) * 300,
        y: height / 2 + (Math.random() - 0.5) * 200,
        vx: 0,
        vy: 0
      });

      // โหลด Dropdown เครื่องมือ Sandbox DDI ใหม่
      this.setupDDISimulator();

      this.rebuildPitchGraphSVG();
      this.logConsole(`[Database] เพิ่มยาสามัญใหม่สำเร็จ: ${nameEn} (${nameTh})`, 'info');
      this.speak(`บันทึกข้อมูลยาสามัญใหม่ ${nameTh} เข้าระบบสำเร็จค่ะ`);

      // ล้างข้อมูลฟอร์ม
      idInput.value = '';
      thInput.value = '';
      enInput.value = '';
      catInput.value = '';
    });

    // การกดบันทึกกฎ DDI ตัวใหม่
    document.getElementById('btn-add-rule-submit')?.addEventListener('click', () => {
      const sel1 = document.getElementById('new-rule-drug-1');
      const sel2 = document.getElementById('new-rule-drug-2');
      const severityInput = document.getElementById('new-rule-severity');
      const titleInput = document.getElementById('new-rule-title');
      const descInput = document.getElementById('new-rule-desc');

      const d1 = sel1.value;
      const d2 = sel2.value;
      const severity = severityInput.value;
      const title = titleInput.value.trim();
      const desc = descInput.value.trim();

      if (!d1 || !d2 || !title || !desc) {
        this.logConsole('❌ กรุณากรอกรายละเอียดและคู่ยาสำหรับตั้งกฎคู่ DDI ให้ครบถ้วน', 'err');
        return;
      }

      if (d1 === d2) {
        this.logConsole('❌ ไม่สามารถเลือกยาสามัญตัวเดียวกันมาตั้งกฎ DDI ได้', 'err');
        return;
      }

      // ตรวจสอบว่ามีคู่กฎนี้ซ้ำอยู่แล้วหรือไม่
      const exist = this.db.interactions.some(x => 
        (x.drug1 === d1 && x.drug2 === d2) || (x.drug1 === d2 && x.drug2 === d1)
      );
      if (exist) {
        this.logConsole('❌ มีกฎ DDI ความเสี่ยงของยาคู่นี้ถูกบัญญัติอยู่ในระบบแล้ว', 'err');
        return;
      }

      const newInteraction = {
        drug1: d1,
        drug2: d2,
        severity: severity,
        titleTh: title,
        descriptionTh: desc
      };
      this.db.interactions.push(newInteraction);

      // โยงเส้นเชื่อมใหม่บนแผนภาพ
      this.netLinks.push({
        id: `${d1}_${d2}`,
        source: d1,
        target: d2,
        severity: severity,
        titleTh: title,
        descriptionTh: desc
      });

      this.rebuildPitchGraphSVG();
      const med1 = this.db.medicines.find(m => m.id === d1);
      const med2 = this.db.medicines.find(m => m.id === d2);
      this.logConsole(`[Database] บัญญัติกฎความเสี่ยงยาใหม่สำเร็จ: ${med1.nameEn} + ${med2.nameEn} -> ${title}`, 'warn');
      this.speak(`บันทึกกฎเกณฑ์ความปลอดภัยของยาคู่ใหม่สำเร็จค่ะ`);

      // ล้างข้อมูลฟอร์ม
      sel1.value = '';
      sel2.value = '';
      titleInput.value = '';
      descInput.value = '';
    });
  },

  // ตั้งค่าปุ่มส่งออกข้อมูล AI JSON
  setupJSONExporter() {
    const area = document.getElementById('json-export-area');
    const btnDDI = document.getElementById('btn-export-ddi');
    const btnMeds = document.getElementById('btn-export-meds');

    if (!area || !btnDDI || !btnMeds) return;

    btnDDI.addEventListener('click', () => {
      area.value = JSON.stringify(this.db.interactions, null, 2);
      this.logConsole(`[AI Dataset] สกัดโครงสร้างกฎ DDI (${this.db.interactions.length} กฎ) เรียบร้อย`, 'info');
    });

    btnMeds.addEventListener('click', () => {
      area.value = JSON.stringify(this.db.medicines, null, 2);
      this.logConsole(`[AI Dataset] สกัดรายชื่อยาสามัญ (${this.db.medicines.length} รายการ) เรียบร้อย`, 'info');
    });
  }
};

// เริ่มต้นทำงานทันทีเมื่อโหลดหน้าจอเสร็จ
window.addEventListener('DOMContentLoaded', () => {
  PitchApp.init();
});
