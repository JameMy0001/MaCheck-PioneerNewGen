import type { DrugInteraction, FoodClash, MedicineDefinition } from '@/types/models';
import { getInteractionSafetyCopy } from '@/constants/interaction-safety';

const med = (
  id: string,
  nameEn: string,
  nameTh: string,
  category: string,
  categoryEn: string,
  dosages: number[],
  description: string,
  descriptionEn: string,
): MedicineDefinition => ({ id, nameEn, nameTh, category, categoryEn, dosages, description, descriptionEn });

export const medicines: MedicineDefinition[] = [
  med('metformin', 'Metformin', 'เมทฟอร์มิน', 'ยาเบาหวาน', 'Antidiabetic', [500, 850, 1000], 'ช่วยควบคุมระดับน้ำตาลในเลือดสำหรับเบาหวานชนิดที่ 2', 'Helps control blood sugar levels for type 2 diabetes'),
  med('amlodipine', 'Amlodipine', 'แอมโลดิพีน', 'ยาความดัน', 'Antihypertensive', [2.5, 5, 10], 'ยาขยายหลอดเลือดเพื่อลดความดันโลหิต', 'Vasodilator to lower blood pressure'),
  med('aspirin', 'Aspirin', 'แอสไพริน', 'ยาต้านเกล็ดเลือด', 'Antiplatelet', [75, 81, 100, 325], 'ลดการเกาะตัวของเกล็ดเลือดตามคำสั่งแพทย์', 'Prevents platelet aggregation as prescribed'),
  med('simvastatin', 'Simvastatin', 'ซิมวาสแตติน', 'ยาลดไขมัน', 'Lipid-lowering', [10, 20, 40], 'ช่วยลดคอเลสเตอรอลในเลือด', 'Helps lower blood cholesterol'),
  med('warfarin', 'Warfarin', 'วาร์ฟาริน', 'ยาต้านการแข็งตัวของเลือด', 'Anticoagulant', [1, 2, 3, 5], 'ต้องติดตามค่า INR และใช้ตามคำสั่งแพทย์อย่างเคร่งครัด', 'Requires INR monitoring and strict medical supervision'),
  med('omeprazole', 'Omeprazole', 'โอเมพราโซล', 'ยาลดกรด', 'Antacid / PPI', [20, 40], 'ลดการหลั่งกรดในกระเพาะอาหาร', 'Reduces stomach acid secretion'),
  med('enalapril', 'Enalapril', 'อีนาลาพริล', 'ยาความดัน', 'Antihypertensive', [5, 10, 20], 'ยาลดความดันกลุ่ม ACE inhibitor', 'ACE inhibitor for blood pressure control'),
  med('losartan', 'Losartan', 'ลอซาร์แทน', 'ยาความดัน', 'Antihypertensive', [25, 50, 100], 'ยาลดความดันกลุ่ม ARB', 'ARB for blood pressure control'),
  med('hydrochlorothiazide', 'Hydrochlorothiazide', 'ไฮโดรคลอโรไทอาไซด์', 'ยาขับปัสสาวะ', 'Diuretic', [12.5, 25], 'ยาขับปัสสาวะที่ช่วยลดความดัน', 'Thiazide diuretic to lower blood pressure'),
  med('glipizide', 'Glipizide', 'ไกลพิไซด์', 'ยาเบาหวาน', 'Antidiabetic', [5, 10], 'ช่วยกระตุ้นการหลั่งอินซูลิน', 'Stimulates insulin secretion'),
  med('atorvastatin', 'Atorvastatin', 'อะทอร์วาสแตติน', 'ยาลดไขมัน', 'Lipid-lowering', [10, 20, 40, 80], 'ช่วยลดคอเลสเตอรอลและไตรกลีเซอไรด์', 'Lowers blood cholesterol and triglycerides'),
  med('diclofenac', 'Diclofenac', 'ไดโคลฟีแนค', 'ยาแก้ปวด NSAID', 'NSAID Pain Reliever', [25, 50], 'ยาแก้ปวดและต้านการอักเสบ', 'Analgesic and anti-inflammatory medication'),
  med('ibuprofen', 'Ibuprofen', 'ไอบูโพรเฟน', 'ยาแก้ปวด NSAID', 'NSAID Pain Reliever', [200, 400, 600], 'ยาแก้ปวด ลดไข้ และต้านการอักเสบ', 'Pain reliever, fever reducer, and anti-inflammatory'),
  med('paracetamol', 'Paracetamol', 'พาราเซตามอล', 'ยาแก้ปวด/ลดไข้', 'Analgesic / Antipyretic', [325, 500], 'ยาแก้ปวดและลดไข้ทั่วไป', 'Common pain reliever and fever reducer'),
  med('gabapentin', 'Gabapentin', 'กาบาเพนติน', 'ยาแก้ปวดเส้นประสาท', 'Nerve Pain Reliever', [100, 300, 600], 'ใช้รักษาอาการปวดเส้นประสาทหรือโรคลมชัก', 'For neuropathic pain or seizure control'),
  med('clopidogrel', 'Clopidogrel', 'โคลพิโดเกรล', 'ยาต้านเกล็ดเลือด', 'Antiplatelet', [75], 'ช่วยป้องกันลิ่มเลือดอุดตัน', 'Helps prevent blood clots'),
  med('levothyroxine', 'Levothyroxine', 'เลโวไทร็อกซิน', 'ยาไทรอยด์', 'Thyroid Hormone', [25, 50, 75, 100], 'ฮอร์โมนทดแทนสำหรับภาวะไทรอยด์ต่ำ', 'Hormone replacement for hypothyroidism'),
  med('prednisolone', 'Prednisolone', 'เพรดนิโซโลน', 'ยาสเตียรอยด์', 'Steroid', [5, 10, 20], 'ยาต้านการอักเสบและกดภูมิคุ้มกัน', 'Anti-inflammatory and immunosuppressant'),
  med('digoxin', 'Digoxin', 'ดิจ็อกซิน', 'ยาหัวใจ', 'Cardiac Medication', [0.0625, 0.125, 0.25], 'ใช้ในภาวะหัวใจเต้นผิดจังหวะหรือหัวใจล้มเหลว', 'For heart arrhythmia or heart failure'),
  med('furosemide', 'Furosemide', 'ฟูโรซีไมด์', 'ยาขับปัสสาวะ', 'Loop Diuretic', [20, 40, 80], 'ยาขับปัสสาวะเพื่อลดอาการบวม', 'Diuretic to reduce swelling and fluid retention'),
  med('pioglitazone', 'Pioglitazone', 'ไพโอกลิตาโซน', 'ยาเบาหวาน', 'Antidiabetic', [15, 30, 45], 'ช่วยเพิ่มความไวต่ออินซูลิน', 'Increases insulin sensitivity'),
  med('metoprolol', 'Metoprolol', 'เมโทโปรลอล', 'ยาความดัน', 'Antihypertensive', [50, 100], 'ควบคุมความดันและอัตราการเต้นหัวใจ', 'Controls blood pressure and heart rate'),
  med('atenolol', 'Atenolol', 'อะทีโนลอล', 'ยาความดัน', 'Antihypertensive', [25, 50, 100], 'ยาลดความดันกลุ่ม beta blocker', 'Beta-blocker for blood pressure control'),
  med('spironolactone', 'Spironolactone', 'สไปโรโนแลคโตน', 'ยาขับปัสสาวะ', 'Diuretic', [25, 50, 100], 'ยาขับปัสสาวะแบบเก็บโพแทสเซียม', 'Potassium-sparing diuretic'),
  med('naproxen', 'Naproxen', 'นาโพรเซน', 'ยาแก้ปวด NSAID', 'NSAID Pain Reliever', [250, 500], 'ยาแก้ปวดต้านการอักเสบชนิดออกฤทธิ์นาน', 'Long-acting anti-inflammatory pain reliever'),
  med('celecoxib', 'Celecoxib', 'ซีลีค็อกซิบ', 'ยาแก้ปวด NSAID', 'NSAID (COX-2)', [100, 200], 'ยาแก้ปวดข้ออักเสบกลุ่ม COX-2', 'COX-2 inhibitor for arthritis and pain'),
  med('tramadol', 'Tramadol', 'ทรามาดอล', 'ยาแก้ปวดรุนแรง', 'Opioid Analgesic', [50], 'ยาแก้ปวดกลุ่ม opioid ที่ต้องใช้ด้วยความระมัดระวัง', 'Prescription pain reliever to be used with caution'),
  med('ginkgo', 'Ginkgo Biloba', 'สารสกัดใบแปะก๊วย', 'สมุนไพร/อาหารเสริม', 'Herbal Supplement', [40, 60, 120], 'อาหารเสริมที่อาจมีผลต่อการแข็งตัวของเลือด', 'Supplement that may affect blood clotting'),
  med('ginseng', 'Ginseng', 'โสมสกัด', 'สมุนไพร/อาหารเสริม', 'Herbal Supplement', [100, 250, 500], 'อาหารเสริมสมุนไพร', 'Herbal supplement'),
  med('calcium', 'Calcium Carbonate', 'แคลเซียมคาร์บอเนต', 'แร่ธาตุเสริม', 'Calcium Supplement', [600, 1250], 'แคลเซียมเสริมที่อาจรบกวนการดูดซึมยาบางชนิด', 'May interfere with absorption of certain drugs'),
  med('alendronate', 'Alendronate', 'อะเลนโดรเนต', 'ยาโรคกระดูก', 'Bone Medication', [10, 70], 'ยารักษาและป้องกันโรคกระดูกพรุน', 'Prevents and treats osteoporosis'),
  med('amiodarone', 'Amiodarone', 'อะมิโอดาโรน', 'ยาหัวใจ', 'Antiarrhythmic', [200], 'ยารักษาภาวะหัวใจเต้นผิดจังหวะ', 'Treats irregular heartbeats'),
  med('ciprofloxacin', 'Ciprofloxacin', 'ไซโปรฟลอกซาซิน', 'ยาปฏิชีวนะ', 'Antibiotic', [250, 500], 'ยาปฏิชีวนะกลุ่ม fluoroquinolone', 'Fluoroquinolone antibiotic'),
];

const interaction = (
  drug1: string,
  drug2: string,
  severity: 'moderate' | 'severe',
): DrugInteraction => ({
  id: `${drug1}_${drug2}`,
  drug1,
  drug2,
  severity,
  ...getInteractionSafetyCopy(severity),
});

export const interactions: DrugInteraction[] = [
  interaction('warfarin', 'aspirin', 'severe'),
  interaction('warfarin', 'ibuprofen', 'severe'),
  interaction('warfarin', 'diclofenac', 'severe'),
  interaction('enalapril', 'losartan', 'severe'),
  interaction('simvastatin', 'amlodipine', 'moderate'),
  interaction('digoxin', 'furosemide', 'moderate'),
  interaction('metformin', 'furosemide', 'moderate'),
  interaction('aspirin', 'ibuprofen', 'moderate'),
  interaction('clopidogrel', 'omeprazole', 'moderate'),
  interaction('levothyroxine', 'omeprazole', 'moderate'),
  interaction('spironolactone', 'enalapril', 'severe'),
  interaction('spironolactone', 'losartan', 'severe'),
  interaction('ibuprofen', 'enalapril', 'moderate'),
  interaction('amiodarone', 'simvastatin', 'severe'),
  interaction('warfarin', 'ginkgo', 'severe'),
  interaction('aspirin', 'ginkgo', 'moderate'),
  interaction('calcium', 'levothyroxine', 'moderate'),
  interaction('alendronate', 'calcium', 'moderate'),
  interaction('ciprofloxacin', 'calcium', 'moderate'),
  interaction('tramadol', 'gabapentin', 'moderate'),
  interaction('digoxin', 'amiodarone', 'severe'),
];

export const foodClashes: FoodClash[] = [
  { id: 'grapefruit', food: 'เกรปฟรุต/ส้มโอ', keywords: ['เกรปฟรุต', 'grapefruit', 'น้ำส้มโอ', 'ส้มโอ'], medicineIds: ['simvastatin', 'amlodipine'], severity: 'severe', description: 'อาจเพิ่มระดับยาบางชนิดในเลือด ควรสอบถามเภสัชกรตามชื่อผลิตภัณฑ์และปริมาณที่กิน' },
  { id: 'licorice', food: 'ชะเอมเทศ', keywords: ['ชะเอม', 'licorice', 'ชะเอมเทศ'], medicineIds: ['digoxin'], diseases: ['hypertension', 'heart'], severity: 'severe', description: 'อาจกระทบโพแทสเซียม ความดัน และจังหวะหัวใจ' },
  { id: 'sugar', food: 'อาหารหวานจัด', keywords: ['น้ำผึ้ง', 'ชาเย็น', 'น้ำหวาน', 'ทุเรียน', 'ลำไย'], diseases: ['diabetes'], severity: 'severe', description: 'อาจทำให้ควบคุมระดับน้ำตาลได้ยาก' },
  { id: 'sodium', food: 'อาหารเค็มจัด/โซเดียมสูง', keywords: ['เค็ม', 'มาม่า', 'น้ำปลา', 'ปลาร้า', 'ของหมักดอง'], diseases: ['hypertension', 'kidney', 'heart'], severity: 'severe', description: 'เพิ่มภาระต่อความดัน หัวใจ และไต' },
  { id: 'herbs-bleeding', food: 'แปะก๊วย/กระเทียมอัดเม็ด/โสม', keywords: ['แปะก๊วย', 'ginkgo', 'กระเทียม', 'garlic', 'โสม', 'ginseng'], medicineIds: ['warfarin', 'aspirin'], severity: 'severe', description: 'อาหารเสริมบางชนิดอาจเพิ่มความเสี่ยงเลือดออก' },
  { id: 'dairy-calcium', food: 'นม/โยเกิร์ต/แคลเซียม', keywords: ['นม', 'แคลเซียม', 'โยเกิร์ต', 'ชีส'], medicineIds: ['ciprofloxacin'], severity: 'moderate', description: 'แคลเซียมอาจลดการดูดซึมยาปฏิชีวนะ ควรเว้นช่วงตามฉลากหรือคำแนะนำเภสัชกร' },
  { id: 'caffeine', food: 'ชา/กาแฟ/คาเฟอีน', keywords: ['กาแฟ', 'ชา', 'คาเฟอีน', 'เครื่องดื่มชูกำลัง'], diseases: ['heart', 'hypertension'], severity: 'moderate', description: 'อาจเพิ่มอัตราการเต้นหัวใจหรือความดันในบางคน' },
  { id: 'alcohol', food: 'แอลกอฮอล์/ยาดอง', keywords: ['แอลกอฮอล์', 'เหล้า', 'เบียร์', 'ไวน์', 'ยาดอง'], diseases: ['liver', 'heart', 'hypertension', 'diabetes', 'stomach'], severity: 'severe', description: 'อาจเพิ่มผลข้างเคียงของยาและทำให้โรคประจำตัวควบคุมยากขึ้น' },
  { id: 'potassium', food: 'อาหารโพแทสเซียมสูง', keywords: ['กล้วย', 'มะเขือเทศ', 'แคนตาลูป', 'มะละกอ'], medicineIds: ['enalapril', 'losartan', 'spironolactone'], diseases: ['kidney'], severity: 'severe', description: 'ผู้ป่วยไตหรือผู้ใช้ยาบางชนิดอาจมีโพแทสเซียมสูง ต้องปรึกษาทีมรักษาเรื่องปริมาณที่เหมาะสม' },
];

export function getMedicine(id: string) {
  return medicines.find((item) => item.id === id);
}

export function searchMedicines(query: string): MedicineDefinition[] {
  const q = query.trim().toLowerCase();
  if (!q) return medicines;
  return medicines.filter((m) =>
    m.nameEn.toLowerCase().includes(q) ||
    m.nameTh.toLowerCase().includes(q) ||
    m.category.toLowerCase().includes(q) ||
    (m.categoryEn && m.categoryEn.toLowerCase().includes(q)) ||
    m.description.toLowerCase().includes(q) ||
    (m.descriptionEn && m.descriptionEn.toLowerCase().includes(q))
  );
}
