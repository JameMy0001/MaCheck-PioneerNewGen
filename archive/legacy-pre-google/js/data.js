// คลังยาและข้อมูลยาตีกันสำหรับผู้ใช้งานทั่วไป (อ้างอิงฐานข้อมูลของแอปตัวล่าสุด)

const MedicineDB = {
  // รายการยาทั้งหมดในระบบ (33 รายการ)
  medicines: [
    { id: 'metformin', nameEn: 'Metformin', nameTh: 'เมทฟอร์มิน', category: 'ยาเบาหวาน', commonDosages: [500, 850, 1000], pillColor: '#2196F3', pillShape: 'oval', description: 'ช่วยควบคุมระดับน้ำตาลในเลือดสำหรับเบาหวานชนิดที่ 2' },
    { id: 'amlodipine', nameEn: 'Amlodipine', nameTh: 'แอมโลดิพีน', category: 'ยาความดัน', commonDosages: [2.5, 5, 10], pillColor: '#FFFFFF', pillShape: 'round', description: 'ยาขยายหลอดเลือดเพื่อลดความดันโลหิต' },
    { id: 'aspirin', nameEn: 'Aspirin', nameTh: 'แอสไพริน', category: 'ยาต้านเกล็ดเลือด', commonDosages: [75, 81, 100, 325], pillColor: '#FFFFFF', pillShape: 'round', description: 'ลดการเกาะตัวของเกล็ดเลือดตามคำสั่งแพทย์' },
    { id: 'simvastatin', nameEn: 'Simvastatin', nameTh: 'Simvastatin', category: 'ยาลดไขมัน', commonDosages: [10, 20, 40], pillColor: '#F8BBD0', pillShape: 'round', description: 'ช่วยลดคอเลสเตอรอลในเลือด' },
    { id: 'warfarin', nameEn: 'Warfarin', nameTh: 'วาร์ฟาริน', category: 'ยาต้านการแข็งตัวของเลือด', commonDosages: [1, 2, 3, 5], pillColor: '#7B1FA2', pillShape: 'round', description: 'ต้องติดตามค่า INR และใช้ตามคำสั่งแพทย์อย่างเคร่งครัด' },
    { id: 'omeprazole', nameEn: 'Omeprazole', nameTh: 'โอเมพราโซล', category: 'ยาลดกรด', commonDosages: [20, 40], pillColor: '#E040FB', pillShape: 'capsule', description: 'ลดการหลั่งกรดในกระเพาะอาหาร' },
    { id: 'enalapril', nameEn: 'Enalapril', nameTh: 'อีนาลาพริล', category: 'ยาความดัน', commonDosages: [5, 10, 20], pillColor: '#FF7043', pillShape: 'round', description: 'ยาลดความดันกลุ่ม ACE inhibitor' },
    { id: 'losartan', nameEn: 'Losartan', nameTh: 'ลอซาร์แทน', category: 'ยาความดัน', commonDosages: [25, 50, 100], pillColor: '#4CAF50', pillShape: 'oval', description: 'ยาลดความดันกลุ่ม ARB' },
    { id: 'hydrochlorothiazide', nameEn: 'Hydrochlorothiazide', nameTh: 'ไฮโดรคลอโรไทอาไซด์', category: 'ยาขับปัสสาวะ', commonDosages: [12.5, 25], pillColor: '#FFB74D', pillShape: 'round', description: 'ยาขับปัสสาวะที่ช่วยลดความดัน' },
    { id: 'glipizide', nameEn: 'Glipizide', nameTh: 'ไกลพิไซด์', category: 'ยาเบาหวาน', commonDosages: [5, 10], pillColor: '#42A5F5', pillShape: 'round', description: 'ช่วยกระตุ้นการหลั่งอินซูลิน' },
    { id: 'atorvastatin', nameEn: 'Atorvastatin', nameTh: 'อะทอร์วาสแตติน', category: 'ยาลดไขมัน', commonDosages: [10, 20, 40, 80], pillColor: '#FFFFFF', pillShape: 'oval', description: 'ช่วยลดคอเลสเตอรอลและไตรกลีเซอไรด์' },
    { id: 'diclofenac', nameEn: 'Diclofenac', nameTh: 'ไดโคลฟีแนค', category: 'ยาแก้ปวด NSAID', commonDosages: [25, 50], pillColor: '#FF7043', pillShape: 'round', description: 'ยาแก้ปวดและต้านการอักเสบ' },
    { id: 'ibuprofen', nameEn: 'Ibuprofen', nameTh: 'ไอบูโพรเฟน', category: 'ยาแก้ปวด NSAID', commonDosages: [200, 400, 600], pillColor: '#F44336', pillShape: 'round', description: 'ยาแก้ปวด ลดไข้ และต้านการอักเสบ' },
    { id: 'paracetamol', nameEn: 'Paracetamol', nameTh: 'พาราเซตามอล', category: 'ยาแก้ปวด/ลดไข้', commonDosages: [325, 500], pillColor: '#FFFFFF', pillShape: 'round', description: 'ยาแก้ปวดและลดไข้ทั่วไป' },
    { id: 'gabapentin', nameEn: 'Gabapentin', nameTh: 'กาบาเพนติน', category: 'ยาแก้ปวดเส้นประสาท', commonDosages: [100, 300, 600], pillColor: '#FF9800', pillShape: 'capsule', description: 'ใช้รักษาอาการปวดเส้นประสาทหรือโรคลมชัก' },
    { id: 'clopidogrel', nameEn: 'Clopidogrel', nameTh: 'โคลพิโดเกรล', category: 'ยาต้านเกล็ดเลือด', commonDosages: [75], pillColor: '#E91E63', pillShape: 'round', description: 'ช่วยป้องกันลิ่มเลือดอุดตัน' },
    { id: 'levothyroxine', nameEn: 'Levothyroxine', nameTh: 'เลโวไทร็อกซิน', category: 'ยาไทรอยด์', commonDosages: [25, 50, 75, 100], pillColor: '#B39DDB', pillShape: 'round', description: 'ฮอร์โมนทดแทนสำหรับภาวะไทรอยด์ต่ำ' },
    { id: 'prednisolone', nameEn: 'Prednisolone', nameTh: 'เพรดนิโซโลน', category: 'ยาสเตียรอยด์', commonDosages: [5, 10, 20], pillColor: '#FFFFFF', pillShape: 'round', description: 'ยาต้านการอักเสบและกดภูมิคุ้มกัน' },
    { id: 'digoxin', nameEn: 'Digoxin', nameTh: 'ดิจ็อกซิน', category: 'ยาหัวใจ', commonDosages: [0.0625, 0.125, 0.25], pillColor: '#FFF176', pillShape: 'round', description: 'ใช้ในภาวะหัวใจเต้นผิดจังหวะหรือหัวใจล้มเหลว' },
    { id: 'furosemide', nameEn: 'Furosemide', nameTh: 'ฟูโรซีไมด์', category: 'ยาขับปัสสาวะ', commonDosages: [20, 40, 80], pillColor: '#FFFFFF', pillShape: 'round', description: 'ยาขับปัสสาวะเพื่อลดอาการบวม' },
    { id: 'pioglitazone', nameEn: 'Pioglitazone', nameTh: 'ไพโอกลิตาโซน', category: 'ยาเบาหวาน', commonDosages: [15, 30, 45], pillColor: '#CE93D8', pillShape: 'round', description: 'ช่วยเพิ่มความไวต่ออินซูลิน' },
    { id: 'metoprolol', nameEn: 'Metoprolol', nameTh: 'เมโทโปรลอล', category: 'ยาความดัน', commonDosages: [50, 100], pillColor: '#E0F7FA', pillShape: 'round', description: 'ควบคุมความดันและอัตราการเต้นหัวใจ' },
    { id: 'atenolol', nameEn: 'Atenolol', nameTh: 'อะทีโนลอล', category: 'ยาความดัน', commonDosages: [25, 50, 100], pillColor: '#FFF9C4', pillShape: 'round', description: 'ยาลดความดันกลุ่ม beta blocker' },
    { id: 'spironolactone', nameEn: 'Spironolactone', nameTh: 'สไปโรโนแลคโตน', category: 'ยาขับปัสสาวะ', commonDosages: [25, 50, 100], pillColor: '#C8E6C9', pillShape: 'round', description: 'ยาขับปัสสาวะแบบเก็บโพแทสเซียม' },
    { id: 'naproxen', nameEn: 'Naproxen', nameTh: 'นาโพรเซน', category: 'ยาแก้ปวด NSAID', commonDosages: [250, 500], pillColor: '#80DEEA', pillShape: 'oval', description: 'ยาแก้ปวดต้านการอักเสบชนิดออกฤทธิ์นาน' },
    { id: 'celecoxib', nameEn: 'Celecoxib', nameTh: 'ซีลีค็อกซิบ', category: 'ยาแก้ปวด NSAID', commonDosages: [100, 200], pillColor: '#FFE082', pillShape: 'capsule', description: 'ยาแก้ปวดข้ออักเสบกลุ่ม COX-2' },
    { id: 'tramadol', nameEn: 'Tramadol', nameTh: 'ทรามาดอล', category: 'ยาแก้ปวดรุนแรง', commonDosages: [50], pillColor: '#EF9A9A', pillShape: 'capsule', description: 'ยาแก้ปวดกลุ่ม opioid ที่ต้องใช้ด้วยความระมัดระวัง' },
    { id: 'ginkgo', nameEn: 'Ginkgo Biloba', nameTh: 'สารสกัดใบแปะก๊วย', category: 'สมุนไพร/อาหารเสริม', commonDosages: [40, 60, 120], pillColor: '#A5D6A7', pillShape: 'round', description: 'อาหารเสริมที่อาจมีผลต่อการแข็งตัวของเลือด' },
    { id: 'ginseng', nameEn: 'Ginseng', nameTh: 'โสมสกัด', category: 'สมุนไพร/อาหารเสริม', commonDosages: [100, 250, 500], pillColor: '#D7CCC8', pillShape: 'oval', description: 'อาหารเสริมสมุนไพร' },
    { id: 'calcium', nameEn: 'Calcium Carbonate', nameTh: 'แคลเซียมคาร์บอเนต', category: 'แร่ธาตุเสริม', commonDosages: [600, 1250], pillColor: '#FFFFFF', pillShape: 'oval', description: 'แคลเซียมเสริมที่อาจรบกวนการดูดซึมยาบางชนิด' },
    { id: 'alendronate', nameEn: 'Alendronate', nameTh: 'อะเลนโดรเนต', category: 'ยาโรคกระดูก', commonDosages: [10, 70], pillColor: '#F5F5F5', pillShape: 'oval', description: 'ยารักษาและป้องกันโรคกระดูกพรุน' },
    { id: 'amiodarone', nameEn: 'Amiodarone', nameTh: 'อะมิโอดาโรน', category: 'ยาหัวใจ', commonDosages: [200], pillColor: '#FFCC80', pillShape: 'round', description: 'ยารักษาภาวะหัวใจเต้นผิดจังหวะ' },
    { id: 'ciprofloxacin', nameEn: 'Ciprofloxacin', nameTh: 'ไซโปรฟลอกซาซิน', category: 'ยาปฏิชีวนะ', commonDosages: [250, 500], pillColor: '#E2E8F0', pillShape: 'oval', description: 'ยาปฏิชีวนะกลุ่ม fluoroquinolone' }
  ],

  // รายการคู่ยาที่กินร่วมกันไม่ได้ (21 คู่)
  interactions: [
    { id: 'warfarin_aspirin', drug1: 'warfarin', drug2: 'aspirin', severity: 'severe' },
    { id: 'warfarin_ibuprofen', drug1: 'warfarin', drug2: 'ibuprofen', severity: 'severe' },
    { id: 'warfarin_diclofenac', drug1: 'warfarin', drug2: 'diclofenac', severity: 'severe' },
    { id: 'enalapril_losartan', drug1: 'enalapril', drug2: 'losartan', severity: 'severe' },
    { id: 'simvastatin_amlodipine', drug1: 'simvastatin', drug2: 'amlodipine', severity: 'moderate' },
    { id: 'digoxin_furosemide', drug1: 'digoxin', drug2: 'furosemide', severity: 'moderate' },
    { id: 'metformin_furosemide', drug1: 'metformin', drug2: 'furosemide', severity: 'moderate' },
    { id: 'aspirin_ibuprofen', drug1: 'aspirin', drug2: 'ibuprofen', severity: 'moderate' },
    { id: 'clopidogrel_omeprazole', drug1: 'clopidogrel', drug2: 'omeprazole', severity: 'moderate' },
    { id: 'levothyroxine_omeprazole', drug1: 'levothyroxine', drug2: 'omeprazole', severity: 'moderate' },
    { id: 'spironolactone_enalapril', drug1: 'spironolactone', drug2: 'enalapril', severity: 'severe' },
    { id: 'spironolactone_losartan', drug1: 'spironolactone', drug2: 'losartan', severity: 'severe' },
    { id: 'ibuprofen_enalapril', drug1: 'ibuprofen', drug2: 'enalapril', severity: 'moderate' },
    { id: 'amiodarone_simvastatin', drug1: 'amiodarone', drug2: 'simvastatin', severity: 'severe' },
    { id: 'warfarin_ginkgo', drug1: 'warfarin', drug2: 'ginkgo', severity: 'severe' },
    { id: 'aspirin_ginkgo', drug1: 'aspirin', drug2: 'ginkgo', severity: 'moderate' },
    { id: 'calcium_levothyroxine', drug1: 'calcium', drug2: 'levothyroxine', severity: 'moderate' },
    { id: 'alendronate_calcium', drug1: 'alendronate', drug2: 'calcium', severity: 'moderate' },
    { id: 'ciprofloxacin_calcium', drug1: 'ciprofloxacin', drug2: 'calcium', severity: 'moderate' },
    { id: 'tramadol_gabapentin', drug1: 'tramadol', drug2: 'gabapentin', severity: 'moderate' },
    { id: 'digoxin_amiodarone', drug1: 'digoxin', drug2: 'amiodarone', severity: 'severe' }
  ],

  // รายการอาหาร/สมุนไพรแสลงและข้อขัดกัน (Food Clashes - 9 รายการ)
  foodClashes: [
    { id: 'grapefruit', food: 'เกรปฟรุต/ส้มโอ', keywords: ['เกรปฟรุต', 'grapefruit', 'น้ำส้มโอ', 'ส้มโอ'], medicineIds: ['simvastatin', 'amlodipine'], severity: 'severe', description: 'อาจเพิ่มระดับยาบางชนิดในเลือด ควรสอบถามเภสัชกรตามชื่อผลิตภัณฑ์และปริมาณที่กิน' },
    { id: 'licorice', food: 'ชะเอมเทศ', keywords: ['ชะเอม', 'licorice', 'ชะเอมเทศ'], medicineIds: ['digoxin'], diseases: ['hypertension', 'heart'], severity: 'severe', description: 'อาจกระทบโพแทสเซียม ความดัน และจังหวะหัวใจ' },
    { id: 'sugar', food: 'อาหารหวานจัด', keywords: ['น้ำผึ้ง', 'ชาเย็น', 'น้ำหวาน', 'ทุเรียน', 'ลำไย'], diseases: ['diabetes'], severity: 'severe', description: 'อาจทำให้ควบคุมระดับน้ำตาลได้ยาก' },
    { id: 'sodium', food: 'อาหารเค็มจัด/โซเดียมสูง', keywords: ['เค็ม', 'มาม่า', 'น้ำปลา', 'ปลาร้า', 'ของหมักดอง'], diseases: ['hypertension', 'kidney', 'heart'], severity: 'severe', description: 'เพิ่มภาระต่อความดัน หัวใจ และไต' },
    { id: 'herbs-bleeding', food: 'แปะก๊วย/กระเทียมอัดเม็ด/โสม', keywords: ['แปะก๊วย', 'ginkgo', 'กระเทียม', 'garlic', 'โสม', 'ginseng'], medicineIds: ['warfarin', 'aspirin'], severity: 'severe', description: 'อาหารเสริมบางชนิดอาจเพิ่มความเสี่ยงเลือดออก' },
    { id: 'dairy-calcium', food: 'นม/โยเกิร์ต/แคลเซียม', keywords: ['นม', 'แคลเซียม', 'โยเกิร์ต', 'ชีส'], medicineIds: ['ciprofloxacin'], severity: 'moderate', description: 'แคลเซียมอาจลดการดูดซึมยาปฏิชีวนะ ควรเว้นช่วงตามฉลากหรือคำแนะนำเภสัชกร' },
    { id: 'caffeine', food: 'ชา/กาแฟ/คาเฟอีน', keywords: ['กาแฟ', 'ชา', 'คาเฟอีน', 'เครื่องดื่มชูกำลัง'], diseases: ['heart', 'hypertension'], severity: 'moderate', description: 'อาจเพิ่มอัตราการเต้นหัวใจหรือความดันในบางคน' },
    { id: 'alcohol', food: 'แอลกอฮอล์/ยาดอง', keywords: ['แอลกอฮอล์', 'เหล้า', 'เบียร์', 'ไวน์', 'ยาดอง'], diseases: ['liver', 'heart', 'hypertension', 'diabetes', 'stomach'], severity: 'severe', description: 'อาจเพิ่มผลข้างเคียงของยาและทำให้โรคประจำตัวควบคุมยากขึ้น' },
    { id: 'potassium', food: 'อาหารโพแทสเซียมสูง', keywords: ['กล้วย', 'มะเขือเทศ', 'แคนตาลูป', 'มะละกอ'], medicineIds: ['enalapril', 'losartan', 'spironolactone'], diseases: ['kidney'], severity: 'severe', description: 'ผู้ป่วยไตหรือผู้ใช้ยาบางชนิดอาจมีโพแทสเซียมสูง ต้องปรึกษาทีมรักษาเรื่องปริมาณที่เหมาะสม' }
  ],

  // ค้นหายาด้วยไอดี
  getMedicine(id) {
    return this.medicines.find(m => m.id === id) || null;
  },

  // ดึงหมวดหมู่ยาทั้งหมดที่มีแบบไม่ซ้ำกัน
  getCategories() {
    return [...new Set(this.medicines.map(m => m.category))];
  }
};
