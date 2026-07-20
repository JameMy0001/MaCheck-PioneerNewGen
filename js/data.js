// คลังยาและข้อมูลยาตีกันสำหรับผู้ใช้งานทั่วไป
// ชุดข้อมูลขยายสำหรับ YaCheck ฐานข้อมูลหลักที่รองรับออฟไลน์และ RAG AI

const MedicineDB = {
  // รายการยาทั้งหมดในระบบที่ผู้ใช้งานใช้บ่อย (ขยายเป็น 33 รายการ)
  medicines: [
    {
      id: 'metformin',
      nameEn: 'Metformin',
      nameTh: 'เมทฟอร์มิน',
      category: 'ยาเบาหวาน',
      commonDosages: [500, 850, 1000],
      pillColor: '#2196F3',
      pillShape: 'oval',
      description: 'ลดน้ำตาลในเลือด ใช้รักษาเบาหวานชนิดที่ 2'
    },
    {
      id: 'amlodipine',
      nameEn: 'Amlodipine',
      nameTh: 'แอมโลดิพีน',
      category: 'ยาความดัน',
      commonDosages: [2.5, 5, 10],
      pillColor: '#FFFFFF',
      pillShape: 'round',
      description: 'ลดความดันโลหิตสูง ขยายหลอดเลือด'
    },
    {
      id: 'aspirin',
      nameEn: 'Aspirin',
      nameTh: 'แอสไพริน',
      category: 'ยาต้านเกล็ดเลือด',
      commonDosages: [75, 81, 100, 325],
      pillColor: '#FFFFFF',
      pillShape: 'round',
      description: 'ป้องกันลิ่มเลือดอุดตัน ลดความเสี่ยงโรคหัวใจ'
    },
    {
      id: 'simvastatin',
      nameEn: 'Simvastatin',
      nameTh: 'ซิมวาสแตติน',
      category: 'ยาลดไขมัน',
      commonDosages: [10, 20, 40],
      pillColor: '#F8BBD0',
      pillShape: 'round',
      description: 'ลดคอเลสเตอรอลในเลือด'
    },
    {
      id: 'warfarin',
      nameEn: 'Warfarin',
      nameTh: 'วาร์ฟาริน',
      category: 'ยาละลายลิ่มเลือด',
      commonDosages: [1, 2, 3, 5],
      pillColor: '#7B1FA2',
      pillShape: 'round',
      description: 'ป้องกันลิ่มเลือดอุดตัน ต้องตรวจเลือดเป็นประจำ'
    },
    {
      id: 'omeprazole',
      nameEn: 'Omeprazole',
      nameTh: 'โอเมพราโซล',
      category: 'ยาลดกรด',
      commonDosages: [20, 40],
      pillColor: '#E040FB',
      pillShape: 'capsule',
      description: 'ลดกรดในกระเพาะอาหาร รักษาโรคกรดไหลย้อน'
    },
    {
      id: 'enalapril',
      nameEn: 'Enalapril',
      nameTh: 'อีนาลาพริล',
      category: 'ยาความดัน',
      commonDosages: [5, 10, 20],
      pillColor: '#FF7043',
      pillShape: 'round',
      description: 'ยาลดความดันกลุ่ม ACE inhibitor'
    },
    {
      id: 'losartan',
      nameEn: 'Losartan',
      nameTh: 'ลอซาร์แทน',
      category: 'ยาความดัน',
      commonDosages: [25, 50, 100],
      pillColor: '#4CAF50',
      pillShape: 'oval',
      description: 'ยาลดความดันกลุ่ม ARB ปกป้องไต'
    },
    {
      id: 'hydrochlorothiazide',
      nameEn: 'Hydrochlorothiazide',
      nameTh: 'ไฮโดรคลอโรไทอาไซด์',
      category: 'ยาขับปัสสาวะ',
      commonDosages: [12.5, 25],
      pillColor: '#FFB74D',
      pillShape: 'round',
      description: 'ยาขับปัสสาวะลดความดัน'
    },
    {
      id: 'glipizide',
      nameEn: 'Glipizide',
      nameTh: 'ไกลพิไซด์',
      category: 'ยาเบาหวาน',
      commonDosages: [5, 10],
      pillColor: '#42A5F5',
      pillShape: 'round',
      description: 'กระตุ้นตับอ่อนผลิตอินซูลิน'
    },
    {
      id: 'atorvastatin',
      nameEn: 'Atorvastatin',
      nameTh: 'อะทอร์วาสแตติน',
      category: 'ยาลดไขมัน',
      commonDosages: [10, 20, 40, 80],
      pillColor: '#FFFFFF',
      pillShape: 'oval',
      description: 'ลดคอเลสเตอรอลและไตรกลีเซอไรด์'
    },
    {
      id: 'diclofenac',
      nameEn: 'Diclofenac',
      nameTh: 'ไดโคลฟีแนค',
      category: 'ยาแก้ปวด/ต้านอักเสบ',
      commonDosages: [25, 50],
      pillColor: '#FF7043',
      pillShape: 'round',
      description: 'ยาแก้ปวดต้านอักเสบ NSAIDs'
    },
    {
      id: 'ibuprofen',
      nameEn: 'Ibuprofen',
      nameTh: 'ไอบูโพรเฟน',
      category: 'ยาแก้ปวด/ต้านอักเสบ',
      commonDosages: [200, 400, 600],
      pillColor: '#F44336',
      pillShape: 'round',
      description: 'ยาแก้ปวดลดไข้ต้านอักเสบ'
    },
    {
      id: 'paracetamol',
      nameEn: 'Paracetamol',
      nameTh: 'พาราเซตามอล',
      category: 'ยาแก้ปวด/ลดไข้',
      commonDosages: [325, 500],
      pillColor: '#FFFFFF',
      pillShape: 'round',
      description: 'ยาแก้ปวดลดไข้ทั่วไป'
    },
    {
      id: 'gabapentin',
      nameEn: 'Gabapentin',
      nameTh: 'กาบาเพนติน',
      category: 'ยาแก้ปวดเส้นประสาท',
      commonDosages: [100, 300, 600],
      pillColor: '#FF9800',
      pillShape: 'capsule',
      description: 'รักษาอาการปวดเส้นประสาท โรคลมชัก'
    },
    {
      id: 'clopidogrel',
      nameEn: 'Clopidogrel',
      nameTh: 'โคลพิโดเกรล',
      category: 'ยาต้านเกล็ดเลือด',
      commonDosages: [75],
      pillColor: '#E91E63',
      pillShape: 'round',
      description: 'ป้องกันลิ่มเลือดอุดตัน'
    },
    {
      id: 'levothyroxine',
      nameEn: 'Levothyroxine',
      nameTh: 'เลโวไทร็อกซิน',
      category: 'ยาไทรอยด์',
      commonDosages: [25, 50, 75, 100],
      pillColor: '#B39DDB',
      pillShape: 'round',
      description: 'ทดแทนฮอร์โมนไทรอยด์'
    },
    {
      id: 'prednisolone',
      nameEn: 'Prednisolone',
      nameTh: 'เพรดนิโซโลน',
      category: 'ยาสเตียรอยด์',
      commonDosages: [5, 10, 20],
      pillColor: '#FFFFFF',
      pillShape: 'round',
      description: 'ยาแก้อักเสบ ภูมิแพ้ กดภูมิคุ้มกัน'
    },
    {
      id: 'digoxin',
      nameEn: 'Digoxin',
      nameTh: 'ดิจ็อกซิน',
      category: 'ยาหัวใจ',
      commonDosages: [0.0625, 0.125, 0.25],
      pillColor: '#FFF176',
      pillShape: 'round',
      description: 'รักษาหัวใจเต้นผิดจังหวะ หัวใจล้มเหลว'
    },
    {
      id: 'furosemide',
      nameEn: 'Furosemide',
      nameTh: 'ฟูโรซีไมด์',
      category: 'ยาขับปัสสาวะ',
      commonDosages: [20, 40, 80],
      pillColor: '#FFFFFF',
      pillShape: 'round',
      description: 'ยาขับปัสสาวะ ลดบวม'
    },
    // ยาเพิ่มเติมเพื่อขยายฐานข้อมูล (21 - 33)
    {
      id: 'pioglitazone',
      nameEn: 'Pioglitazone',
      nameTh: 'ไพโอกลิตาโซน',
      category: 'ยาเบาหวาน',
      commonDosages: [15, 30, 45],
      pillColor: '#CE93D8',
      pillShape: 'round',
      description: 'ยาลดระดับน้ำตาลในเลือดกลุ่ม Thiazolidinedione'
    },
    {
      id: 'metoprolol',
      nameEn: 'Metoprolol',
      nameTh: 'เมโทโปรลอล',
      category: 'ยาความดัน',
      commonDosages: [50, 100],
      pillColor: '#E0F7FA',
      pillShape: 'round',
      description: 'ยาลดความดันและควบคุมอัตราการเต้นหัวใจกลุ่ม Beta-blocker'
    },
    {
      id: 'atenolol',
      nameEn: 'Atenolol',
      nameTh: 'อะทีโนลอล',
      category: 'ยาความดัน',
      commonDosages: [25, 50, 100],
      pillColor: '#FFF9C4',
      pillShape: 'round',
      description: 'ยาลดความดันกลุ่ม Beta-blocker ชนิดเจาะจงที่หัวใจ'
    },
    {
      id: 'spironolactone',
      nameEn: 'Spironolactone',
      nameTh: 'สไปโรโนแลคโตน',
      category: 'ยาขับปัสสาวะ',
      commonDosages: [25, 50, 100],
      pillColor: '#C8E6C9',
      pillShape: 'round',
      description: 'ยาขับปัสสาวะกลุ่มประหยัดโพแทสเซียม รักษาภาวะบวมน้ำ'
    },
    {
      id: 'naproxen',
      nameEn: 'Naproxen',
      nameTh: 'นาโพรเซน',
      category: 'ยาแก้ปวด/ต้านอักเสบ',
      commonDosages: [250, 500],
      pillColor: '#80DEEA',
      pillShape: 'oval',
      description: 'ยาแก้ปวดต้านอักเสบกลุ่ม NSAIDs ออกฤทธิ์ยาวนาน'
    },
    {
      id: 'celecoxib',
      nameEn: 'Celecoxib',
      nameTh: 'ซีลีค็อกซิบ',
      category: 'ยาแก้ปวด/ต้านอักเสบ',
      commonDosages: [100, 200],
      pillColor: '#FFE082',
      pillShape: 'capsule',
      description: 'ยาแก้ปวดข้ออักเสบกลุ่ม Selective COX-2 inhibitor ระคายเคืองกระเพาะน้อยกว่า'
    },
    {
      id: 'tramadol',
      nameEn: 'Tramadol',
      nameTh: 'ทรามาดอล',
      category: 'ยาแก้ปวดรุนแรง',
      commonDosages: [50],
      pillColor: '#EF9A9A',
      pillShape: 'capsule',
      description: 'ยาแก้ปวดกลุ่มโอปิออยด์ รักษาปวดปานกลางถึงรุนแรง'
    },
    {
      id: 'ginkgo',
      nameEn: 'Ginkgo Biloba',
      nameTh: 'สารสกัดใบแปะก๊วย',
      category: 'อาหารเสริมสมุนไพร',
      commonDosages: [40, 60, 120],
      pillColor: '#A5D6A7',
      pillShape: 'round',
      description: 'สารสกัดสมุนไพรบำรุงสมองและการไหลเวียนโลหิต'
    },
    {
      id: 'ginseng',
      nameEn: 'Ginseng',
      nameTh: 'โสมสกัด',
      category: 'อาหารเสริมสมุนไพร',
      commonDosages: [100, 250, 500],
      pillColor: '#D7CCC8',
      pillShape: 'oval',
      description: 'อาหารเสริมบำรุงพละกำลังและลดความเหนื่อยล้า'
    },
    {
      id: 'calcium',
      nameEn: 'Calcium Carbonate',
      nameTh: 'แคลเซียมคาร์บอเนต',
      category: 'อาหารเสริมแร่ธาตุ',
      commonDosages: [600, 1250],
      pillColor: '#FFFFFF',
      pillShape: 'oval',
      description: 'อาหารเสริมสร้างกระดูกและฟัน หรือใช้เป็นยาลดกรด'
    },
    {
      id: 'alendronate',
      nameEn: 'Alendronate',
      nameTh: 'อะเลนโดรเนต',
      category: 'ยาโรคกระดูก',
      commonDosages: [10, 70],
      pillColor: '#F5F5F5',
      pillShape: 'oval',
      description: 'ยาต้านการสลายกระดูก ใช้รักษาและป้องกันโรคกระดูกพรุน'
    },
    {
      id: 'amiodarone',
      nameEn: 'Amiodarone',
      nameTh: 'อะมิโอดาโรน',
      category: 'ยาหัวใจ',
      commonDosages: [200],
      pillColor: '#FFCC80',
      pillShape: 'round',
      description: 'ยารักษาภาวะหัวใจเต้นผิดจังหวะรุนแรงชนิดกว้าง'
    },
    {
      id: 'ciprofloxacin',
      nameEn: 'Ciprofloxacin',
      nameTh: 'ไซโปรฟลอกซาซิน',
      category: 'ยาปฏิชีวนะ',
      commonDosages: [250, 500],
      pillColor: '#E2E8F0',
      pillShape: 'oval',
      description: 'ยาฆ่าเชื้อแบคทีเรียกลุ่ม Fluoroquinolone'
    }
  ],

  // รายการคู่ยาที่กินร่วมกันไม่ได้ (ขยายเป็น 21 คู่ครอบคลุมกรณี DDI ร้ายแรง)
  interactions: [
    {
      id: 'warfarin_aspirin',
      drug1: 'warfarin',
      drug2: 'aspirin',
      severity: 'severe',
      titleTh: 'คำสั่งความปลอดภัยตามระดับ',
      descriptionTh: 'ระบบไม่แสดงรายละเอียดผลกระทบเพื่อความปลอดภัย',
      adviceTh: ['สอบถามแพทย์หรือเภสัชกรก่อนใช้ร่วมกัน']
    },
    {
      id: 'warfarin_ibuprofen',
      drug1: 'warfarin',
      drug2: 'ibuprofen',
      severity: 'severe',
      titleTh: 'คำสั่งความปลอดภัยตามระดับ',
      descriptionTh: 'ระบบไม่แสดงรายละเอียดผลกระทบเพื่อความปลอดภัย',
      adviceTh: ['สอบถามแพทย์หรือเภสัชกรก่อนใช้ร่วมกัน']
    },
    {
      id: 'warfarin_diclofenac',
      drug1: 'warfarin',
      drug2: 'diclofenac',
      severity: 'severe',
      titleTh: 'คำสั่งความปลอดภัยตามระดับ',
      descriptionTh: 'ระบบไม่แสดงรายละเอียดผลกระทบเพื่อความปลอดภัย',
      adviceTh: ['สอบถามแพทย์หรือเภสัชกรก่อนใช้ร่วมกัน']
    },
    {
      id: 'enalapril_losartan',
      drug1: 'enalapril',
      drug2: 'losartan',
      severity: 'severe',
      titleTh: 'คำสั่งความปลอดภัยตามระดับ',
      descriptionTh: 'ระบบไม่แสดงรายละเอียดผลกระทบเพื่อความปลอดภัย',
      adviceTh: ['สอบถามแพทย์หรือเภสัชกรก่อนใช้ร่วมกัน']
    },
    {
      id: 'simvastatin_amlodipine',
      drug1: 'simvastatin',
      drug2: 'amlodipine',
      severity: 'moderate',
      titleTh: 'คำสั่งความปลอดภัยตามระดับ',
      descriptionTh: 'ระบบไม่แสดงรายละเอียดผลกระทบเพื่อความปลอดภัย',
      adviceTh: ['สอบถามแพทย์หรือเภสัชกรก่อนใช้ร่วมกัน']
    },
    {
      id: 'digoxin_furosemide',
      drug1: 'digoxin',
      drug2: 'furosemide',
      severity: 'moderate',
      titleTh: 'คำสั่งความปลอดภัยตามระดับ',
      descriptionTh: 'ระบบไม่แสดงรายละเอียดผลกระทบเพื่อความปลอดภัย',
      adviceTh: ['สอบถามแพทย์หรือเภสัชกรก่อนใช้ร่วมกัน']
    },
    {
      id: 'metformin_furosemide',
      drug1: 'metformin',
      drug2: 'furosemide',
      severity: 'moderate',
      titleTh: 'คำสั่งความปลอดภัยตามระดับ',
      descriptionTh: 'ระบบไม่แสดงรายละเอียดผลกระทบเพื่อความปลอดภัย',
      adviceTh: ['สอบถามแพทย์หรือเภสัชกรก่อนใช้ร่วมกัน']
    },
    {
      id: 'aspirin_ibuprofen',
      drug1: 'aspirin',
      drug2: 'ibuprofen',
      severity: 'moderate',
      titleTh: 'คำสั่งความปลอดภัยตามระดับ',
      descriptionTh: 'ระบบไม่แสดงรายละเอียดผลกระทบเพื่อความปลอดภัย',
      adviceTh: ['สอบถามแพทย์หรือเภสัชกรก่อนใช้ร่วมกัน']
    },
    {
      id: 'clopidogrel_omeprazole',
      drug1: 'clopidogrel',
      drug2: 'omeprazole',
      severity: 'moderate',
      titleTh: 'คำสั่งความปลอดภัยตามระดับ',
      descriptionTh: 'ระบบไม่แสดงรายละเอียดผลกระทบเพื่อความปลอดภัย',
      adviceTh: ['สอบถามแพทย์หรือเภสัชกรก่อนใช้ร่วมกัน']
    },
    {
      id: 'levothyroxine_omeprazole',
      drug1: 'levothyroxine',
      drug2: 'omeprazole',
      severity: 'minor',
      titleTh: 'คำสั่งความปลอดภัยตามระดับ',
      descriptionTh: 'ระบบไม่แสดงรายละเอียดผลกระทบเพื่อความปลอดภัย',
      adviceTh: ['สอบถามแพทย์หรือเภสัชกรก่อนใช้ร่วมกัน']
    },
    // กฎคู่ยาตีกันเพิ่มเพื่อขยายระบบ (11 - 21)
    {
      id: 'spironolactone_enalapril',
      drug1: 'spironolactone',
      drug2: 'enalapril',
      severity: 'severe',
      titleTh: 'คำสั่งความปลอดภัยตามระดับ',
      descriptionTh: 'ระบบไม่แสดงรายละเอียดผลกระทบเพื่อความปลอดภัย',
      adviceTh: ['สอบถามแพทย์หรือเภสัชกรก่อนใช้ร่วมกัน']
    },
    {
      id: 'spironolactone_losartan',
      drug1: 'spironolactone',
      drug2: 'losartan',
      severity: 'severe',
      titleTh: 'คำสั่งความปลอดภัยตามระดับ',
      descriptionTh: 'ระบบไม่แสดงรายละเอียดผลกระทบเพื่อความปลอดภัย',
      adviceTh: ['สอบถามแพทย์หรือเภสัชกรก่อนใช้ร่วมกัน']
    },
    {
      id: 'ibuprofen_enalapril',
      drug1: 'ibuprofen',
      drug2: 'enalapril',
      severity: 'moderate',
      titleTh: 'คำสั่งความปลอดภัยตามระดับ',
      descriptionTh: 'ระบบไม่แสดงรายละเอียดผลกระทบเพื่อความปลอดภัย',
      adviceTh: ['สอบถามแพทย์หรือเภสัชกรก่อนใช้ร่วมกัน']
    },
    {
      id: 'amiodarone_simvastatin',
      drug1: 'amiodarone',
      drug2: 'simvastatin',
      severity: 'severe',
      titleTh: 'คำสั่งความปลอดภัยตามระดับ',
      descriptionTh: 'ระบบไม่แสดงรายละเอียดผลกระทบเพื่อความปลอดภัย',
      adviceTh: ['สอบถามแพทย์หรือเภสัชกรก่อนใช้ร่วมกัน']
    },
    {
      id: 'warfarin_ginkgo',
      drug1: 'warfarin',
      drug2: 'ginkgo',
      severity: 'severe',
      titleTh: 'คำสั่งความปลอดภัยตามระดับ',
      descriptionTh: 'ระบบไม่แสดงรายละเอียดผลกระทบเพื่อความปลอดภัย',
      adviceTh: ['สอบถามแพทย์หรือเภสัชกรก่อนใช้ร่วมกัน']
    },
    {
      id: 'aspirin_ginkgo',
      drug1: 'aspirin',
      drug2: 'ginkgo',
      severity: 'moderate',
      titleTh: 'คำสั่งความปลอดภัยตามระดับ',
      descriptionTh: 'ระบบไม่แสดงรายละเอียดผลกระทบเพื่อความปลอดภัย',
      adviceTh: ['สอบถามแพทย์หรือเภสัชกรก่อนใช้ร่วมกัน']
    },
    {
      id: 'calcium_levothyroxine',
      drug1: 'calcium',
      drug2: 'levothyroxine',
      severity: 'moderate',
      titleTh: 'คำสั่งความปลอดภัยตามระดับ',
      descriptionTh: 'ระบบไม่แสดงรายละเอียดผลกระทบเพื่อความปลอดภัย',
      adviceTh: ['สอบถามแพทย์หรือเภสัชกรก่อนใช้ร่วมกัน']
    },
    {
      id: 'alendronate_calcium',
      drug1: 'alendronate',
      drug2: 'calcium',
      severity: 'moderate',
      titleTh: 'คำสั่งความปลอดภัยตามระดับ',
      descriptionTh: 'ระบบไม่แสดงรายละเอียดผลกระทบเพื่อความปลอดภัย',
      adviceTh: ['สอบถามแพทย์หรือเภสัชกรก่อนใช้ร่วมกัน']
    },
    {
      id: 'ciprofloxacin_calcium',
      drug1: 'ciprofloxacin',
      drug2: 'calcium',
      severity: 'moderate',
      titleTh: 'คำสั่งความปลอดภัยตามระดับ',
      descriptionTh: 'ระบบไม่แสดงรายละเอียดผลกระทบเพื่อความปลอดภัย',
      adviceTh: ['สอบถามแพทย์หรือเภสัชกรก่อนใช้ร่วมกัน']
    },
    {
      id: 'tramadol_gabapentin',
      drug1: 'tramadol',
      drug2: 'gabapentin',
      severity: 'moderate',
      titleTh: 'คำสั่งความปลอดภัยตามระดับ',
      descriptionTh: 'ระบบไม่แสดงรายละเอียดผลกระทบเพื่อความปลอดภัย',
      adviceTh: ['สอบถามแพทย์หรือเภสัชกรก่อนใช้ร่วมกัน']
    },
    {
      id: 'digoxin_amiodarone',
      drug1: 'digoxin',
      drug2: 'amiodarone',
      severity: 'severe',
      titleTh: 'คำสั่งความปลอดภัยตามระดับ',
      descriptionTh: 'ระบบไม่แสดงรายละเอียดผลกระทบเพื่อความปลอดภัย',
      adviceTh: ['สอบถามแพทย์หรือเภสัชกรก่อนใช้ร่วมกัน']
    }
  ],

  // รายการอาหาร/สมุนไพรแสลงและข้อขัดกัน (Food Clashes)
  foodClashes: [
    {
      food: 'ส้มโอ (Grapefruit)',
      keywords: ['ส้มโอ', 'grapefruit', 'น้ำส้มโอ'],
      conditions: { meds: ['simvastatin', 'amlodipine', 'nifedipine'], diseases: ['hypertension', 'heart'] },
      severity: 'red',
      descTh: 'ส้มโอกระทบกับยาลดความดันและยาลดไขมัน หลีกเลี่ยงการรับประทานร่วมกันเพื่อความปลอดภัย',
      speechTh: 'หลีกเลี่ยงการทานส้มโอร่วมกับยาลดความดันและยาลดไขมัน เพื่อความปลอดภัยสูงสุดค่ะ'
    },
    {
      food: 'ชะเอมเทศ (Licorice)',
      keywords: ['ชะเอม', 'licorice', 'ชะเอมเทศ', 'น้ำชะเอม'],
      conditions: { diseases: ['hypertension', 'heart'], meds: ['digoxin'] },
      severity: 'red',
      descTh: 'ชะเอมเทศส่งผลต่อระดับความดันโลหิตและหัวใจ หลีกเลี่ยงการรับประทานร่วมกันเพื่อความปลอดภัย',
      speechTh: 'หลีกเลี่ยงการทานชะเอมเทศร่วมกับยาและโรคประจำตัวเพื่อความปลอดภัยค่ะ'
    },
    {
      food: 'ของหวานจัด (ทุเรียน / ลำไย / น้ำผึ้ง)',
      keywords: ['น้ำผึ้ง', 'ชาเย็น', 'กาแฟเย็น', 'น้ำหวาน', 'ทองหยิบ', 'ทองหยอด', 'ผลไม้หวาน', 'ทุเรียน', 'ลำไย', 'มะม่วงสุก'],
      conditions: { diseases: ['diabetes'], meds: ['metformin'] },
      severity: 'red',
      descTh: 'อาหารและผลไม้รสหวานจัดส่งผลกระทบต่อระดับน้ำตาลในผู้ป่วยเบาหวาน หลีกเลี่ยงเพื่อความปลอดภัย',
      speechTh: 'สำหรับผู้มีโรคเบาหวาน ควรหลีกเลี่ยงของหวานจัดเพื่อความปลอดภัยค่ะ'
    },
    {
      food: 'อาหารเค็มจัด / โซเดียมสูง',
      keywords: ['เค็ม', 'มาม่า', 'บะหมี่กึ่งสำเร็จรูป', 'น้ำปลา', 'ปลาร้า', 'ของหมักดอง', 'ผักกาดดอง', 'กะปิ', 'เกลือ'],
      conditions: { diseases: ['hypertension', 'kidney', 'heart'] },
      severity: 'red',
      descTh: 'อาหารโซเดียมสูงส่งผลกระทบต่อโรคความดันโลหิตสูงและโรคไต หลีกเลี่ยงการรับประทานเพื่อความปลอดภัย',
      speechTh: 'ควรหลีกเลี่ยงอาหารเค็มจัดและโซเดียมสูงเพื่อความปลอดภัยค่ะ'
    },
    {
      food: 'แปะก๊วย / กระเทียมอัดเม็ด / โสม',
      keywords: ['แปะก๊วย', 'ginkgo', 'ใบแปะก๊วย', 'กระเทียม', 'garlic', 'โสม', 'ginseng', 'ตังกุย'],
      conditions: { meds: ['warfarin', 'aspirin'], diseases: ['heart', 'hypertension'] },
      severity: 'red',
      descTh: 'สมุนไพรเหล่านี้ขัดกันกับยาละลายลิ่มเลือด หลีกเลี่ยงการรับประทานร่วมกันเพื่อความปลอดภัย',
      speechTh: 'หลีกเลี่ยงการทานสมุนไพรโสม แปะก๊วย ร่วมกับยาละลายลิ่มเลือดเพื่อความปลอดภัยค่ะ'
    },
    {
      food: 'น้ำมันมะพร้าว / เนย / ครีม / ของทอด',
      keywords: ['กะทิ', 'น้ำมันหมู', 'หมูกรอบ', 'แคบหมู', 'เบเกอรี่', 'เนย', 'ครีม', 'ของทอด', 'ไขมันสัตว์'],
      conditions: { diseases: ['lipid', 'heart'] },
      severity: 'yellow',
      descTh: 'ไขมันอิ่มตัวสูงส่งผลต่อระดับไขมันในเลือดและโรคหัวใจ หลีกเลี่ยงหรือจำกัดปริมาณเพื่อความปลอดภัย',
      speechTh: 'หลีกเลี่ยงของมันของทอดเพื่อสุขภาพและความปลอดภัยที่ดีค่ะ'
    },
    {
      food: 'นม / โยเกิร์ต / แคลเซียม',
      keywords: ['นม', 'แคลเซียม', 'โยเกิร์ต', 'ชีส'],
      conditions: { meds: ['roxithromycin', 'azithromycin', 'ciprofloxacin', 'amoxicillin'] },
      severity: 'yellow',
      descTh: 'โปรดสอบถามแพทย์หรือเภสัชกรก่อนรับประทานรายการนี้ร่วมกับยาที่เกี่ยวข้อง ระบบไม่แสดงรายละเอียดผลกระทบเพื่อความปลอดภัย',
      speechTh: 'อย่ารับประทานรายการนี้ร่วมกับยาที่เกี่ยวข้องจนกว่าจะสอบถามแพทย์หรือเภสัชกรค่ะ'
    },
    {
      food: 'ชา / กาแฟ / คาเฟอีน',
      keywords: ['กาแฟ', 'ชา', 'เครื่องดื่มชูกำลัง', 'คาเฟอีน', 'โคล่า'],
      conditions: { diseases: ['heart', 'hypertension'] },
      severity: 'yellow',
      descTh: 'คาเฟอีนส่งผลต่อระดับความดันและอัตราการเต้นของหัวใจ ควรจำกัดปริมาณเพื่อความปลอดภัย',
      speechTh: 'เครื่องดื่มที่มีคาเฟอีนควรดื่มแต่พอเหมาะเพื่อความปลอดภัยค่ะ'
    },
    {
      food: 'แอลกอฮอล์ / ยาดอง',
      keywords: ['แอลกอฮอล์', 'เหล้า', 'เบียร์', 'ไวน์', 'ยาดอง', 'สุรา'],
      conditions: { diseases: ['liver', 'heart', 'hypertension', 'diabetes', 'stomach'] },
      severity: 'red',
      descTh: 'แอลกอฮอล์ขัดกันอย่างรุนแรงกับยาและโรคประจำตัวหลายประเภท หลีกเลี่ยงโดยเด็ดขาดเพื่อความปลอดภัย',
      speechTh: 'หลีกเลี่ยงการดื่มเครื่องดื่มแอลกอฮอล์หรือยาดองร่วมกับยาและโรคประจำตัวเพื่อความปลอดภัยค่ะ'
    },
    {
      food: 'กล้วย / ส้ม / มะเขือเทศ',
      keywords: ['กล้วย', 'ส้ม', 'มะเขือเทศ', 'แคนตาลูป', 'มะละกอ'],
      conditions: { diseases: ['kidney'], meds: ['enalapril', 'losartan'] },
      severity: 'red',
      descTh: 'ผลไม้โพแทสเซียมสูงส่งผลกระทบต่อผู้ป่วยโรคไตหรือผู้ทานยาลดความดันบางชนิด หลีกเลี่ยงเพื่อความปลอดภัย',
      speechTh: 'สำหรับผู้ป่วยโรคไตหรือทานยาความดันบางชนิด ควรหลีกเลี่ยงผลไม้ที่มีโพแทสเซียมสูงเพื่อความปลอดภัยค่ะ'
    }
  ],

  // ค้นหายาด้วยไอดี
  getMedicineById(id) {
    return this.medicines.find(m => m.id === id) || null;
  },

  // ดึงหมวดหมู่ยาทั้งหมดที่มีแบบไม่ซ้ำกัน
  getCategories() {
    return [...new Set(this.medicines.map(m => m.category))];
  }
};
