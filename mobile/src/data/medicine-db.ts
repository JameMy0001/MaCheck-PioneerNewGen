import type { DrugInteraction, FoodClash, MedicineDefinition } from '@/types/models';
import { getInteractionSafetyCopy } from '@/constants/interaction-safety';

const med = (
  id: string,
  nameEn: string,
  nameTh: string,
  category: string,
  dosages: number[],
  description: string,
): MedicineDefinition => ({ id, nameEn, nameTh, category, dosages, description });

export const medicines: MedicineDefinition[] = [
  med('metformin', 'Metformin', 'เมทฟอร์มิน', 'ยาเบาหวาน', [500, 850, 1000], 'ช่วยควบคุมระดับน้ำตาลในเลือดสำหรับเบาหวานชนิดที่ 2'),
  med('amlodipine', 'Amlodipine', 'แอมโลดิพีน', 'ยาความดัน', [2.5, 5, 10], 'ยาขยายหลอดเลือดเพื่อลดความดันโลหิต'),
  med('aspirin', 'Aspirin', 'แอสไพริน', 'ยาต้านเกล็ดเลือด', [75, 81, 100, 325], 'ลดการเกาะตัวของเกล็ดเลือดตามคำสั่งแพทย์'),
  med('simvastatin', 'Simvastatin', 'ซิมวาสแตติน', 'ยาลดไขมัน', [10, 20, 40], 'ช่วยลดคอเลสเตอรอลในเลือด'),
  med('warfarin', 'Warfarin', 'วาร์ฟาริน', 'ยาต้านการแข็งตัวของเลือด', [1, 2, 3, 5], 'ต้องติดตามค่า INR และใช้ตามคำสั่งแพทย์อย่างเคร่งครัด'),
  med('omeprazole', 'Omeprazole', 'โอเมพราโซล', 'ยาลดกรด', [20, 40], 'ลดการหลั่งกรดในกระเพาะอาหาร'),
  med('enalapril', 'Enalapril', 'อีนาลาพริล', 'ยาความดัน', [5, 10, 20], 'ยาลดความดันกลุ่ม ACE inhibitor'),
  med('losartan', 'Losartan', 'ลอซาร์แทน', 'ยาความดัน', [25, 50, 100], 'ยาลดความดันกลุ่ม ARB'),
  med('hydrochlorothiazide', 'Hydrochlorothiazide', 'ไฮโดรคลอโรไทอาไซด์', 'ยาขับปัสสาวะ', [12.5, 25], 'ยาขับปัสสาวะที่ช่วยลดความดัน'),
  med('glipizide', 'Glipizide', 'ไกลพิไซด์', 'ยาเบาหวาน', [5, 10], 'ช่วยกระตุ้นการหลั่งอินซูลิน'),
  med('atorvastatin', 'Atorvastatin', 'อะทอร์วาสแตติน', 'ยาลดไขมัน', [10, 20, 40, 80], 'ช่วยลดคอเลสเตอรอลและไตรกลีเซอไรด์'),
  med('diclofenac', 'Diclofenac', 'ไดโคลฟีแนค', 'ยาแก้ปวด NSAID', [25, 50], 'ยาแก้ปวดและต้านการอักเสบ'),
  med('ibuprofen', 'Ibuprofen', 'ไอบูโพรเฟน', 'ยาแก้ปวด NSAID', [200, 400, 600], 'ยาแก้ปวด ลดไข้ และต้านการอักเสบ'),
  med('paracetamol', 'Paracetamol', 'พาราเซตามอล', 'ยาแก้ปวด/ลดไข้', [325, 500], 'ยาแก้ปวดและลดไข้ทั่วไป'),
  med('gabapentin', 'Gabapentin', 'กาบาเพนติน', 'ยาแก้ปวดเส้นประสาท', [100, 300, 600], 'ใช้รักษาอาการปวดเส้นประสาทหรือโรคลมชัก'),
  med('clopidogrel', 'Clopidogrel', 'โคลพิโดเกรล', 'ยาต้านเกล็ดเลือด', [75], 'ช่วยป้องกันลิ่มเลือดอุดตัน'),
  med('levothyroxine', 'Levothyroxine', 'เลโวไทร็อกซิน', 'ยาไทรอยด์', [25, 50, 75, 100], 'ฮอร์โมนทดแทนสำหรับภาวะไทรอยด์ต่ำ'),
  med('prednisolone', 'Prednisolone', 'เพรดนิโซโลน', 'ยาสเตียรอยด์', [5, 10, 20], 'ยาต้านการอักเสบและกดภูมิคุ้มกัน'),
  med('digoxin', 'Digoxin', 'ดิจ็อกซิน', 'ยาหัวใจ', [0.0625, 0.125, 0.25], 'ใช้ในภาวะหัวใจเต้นผิดจังหวะหรือหัวใจล้มเหลว'),
  med('furosemide', 'Furosemide', 'ฟูโรซีไมด์', 'ยาขับปัสสาวะ', [20, 40, 80], 'ยาขับปัสสาวะเพื่อลดอาการบวม'),
  med('pioglitazone', 'Pioglitazone', 'ไพโอกลิตาโซน', 'ยาเบาหวาน', [15, 30, 45], 'ช่วยเพิ่มความไวต่ออินซูลิน'),
  med('metoprolol', 'Metoprolol', 'เมโทโปรลอล', 'ยาความดัน', [50, 100], 'ควบคุมความดันและอัตราการเต้นหัวใจ'),
  med('atenolol', 'Atenolol', 'อะทีโนลอล', 'ยาความดัน', [25, 50, 100], 'ยาลดความดันกลุ่ม beta blocker'),
  med('spironolactone', 'Spironolactone', 'สไปโรโนแลคโตน', 'ยาขับปัสสาวะ', [25, 50, 100], 'ยาขับปัสสาวะแบบเก็บโพแทสเซียม'),
  med('naproxen', 'Naproxen', 'นาโพรเซน', 'ยาแก้ปวด NSAID', [250, 500], 'ยาแก้ปวดต้านการอักเสบชนิดออกฤทธิ์นาน'),
  med('celecoxib', 'Celecoxib', 'ซีลีค็อกซิบ', 'ยาแก้ปวด NSAID', [100, 200], 'ยาแก้ปวดข้ออักเสบกลุ่ม COX-2'),
  med('tramadol', 'Tramadol', 'ทรามาดอล', 'ยาแก้ปวดรุนแรง', [50], 'ยาแก้ปวดกลุ่ม opioid ที่ต้องใช้ด้วยความระมัดระวัง'),
  med('ginkgo', 'Ginkgo Biloba', 'สารสกัดใบแปะก๊วย', 'สมุนไพร/อาหารเสริม', [40, 60, 120], 'อาหารเสริมที่อาจมีผลต่อการแข็งตัวของเลือด'),
  med('ginseng', 'Ginseng', 'โสมสกัด', 'สมุนไพร/อาหารเสริม', [100, 250, 500], 'อาหารเสริมสมุนไพร'),
  med('calcium', 'Calcium Carbonate', 'แคลเซียมคาร์บอเนต', 'แร่ธาตุเสริม', [600, 1250], 'แคลเซียมเสริมที่อาจรบกวนการดูดซึมยาบางชนิด'),
  med('alendronate', 'Alendronate', 'อะเลนโดรเนต', 'ยาโรคกระดูก', [10, 70], 'ยารักษาและป้องกันโรคกระดูกพรุน'),
  med('amiodarone', 'Amiodarone', 'อะมิโอดาโรน', 'ยาหัวใจ', [200], 'ยารักษาภาวะหัวใจเต้นผิดจังหวะ'),
  med('ciprofloxacin', 'Ciprofloxacin', 'ไซโปรฟลอกซาซิน', 'ยาปฏิชีวนะ', [250, 500], 'ยาปฏิชีวนะกลุ่ม fluoroquinolone'),
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

function normalizeMedicineSearchText(value: string) {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase('th')
    .replace(/[\s_/,.-]+/g, ' ')
    .trim();
}

export function searchMedicines(query: string) {
  const normalized = normalizeMedicineSearchText(query);
  if (!normalized) return medicines;

  // Everyday Thai Search Synonyms Mapping
  const synonymMap: Record<string, string[]> = {
    แก้ปวด: ['paracetamol', 'ibuprofen', 'diclofenac', 'naproxen', 'celecoxib', 'tramadol', 'aspirin'],
    ปวดหัว: ['paracetamol', 'ibuprofen'],
    ลดไข้: ['paracetamol', 'ibuprofen'],
    พารา: ['paracetamol'],
    ความดัน: ['amlodipine', 'enalapril', 'losartan', 'hydrochlorothiazide', 'metoprolol', 'atenolol'],
    เบาหวาน: ['metformin', 'glipizide', 'pioglitazone'],
    น้ำตาล: ['metformin', 'glipizide', 'pioglitazone'],
    ไขมัน: ['simvastatin', 'atorvastatin'],
    คอเลสเตอรอล: ['simvastatin', 'atorvastatin'],
    กระเพาะ: ['omeprazole'],
    แสบท้อง: ['omeprazole'],
    ลดกรด: ['omeprazole'],
    ขับปัสสาวะ: ['furosemide', 'spironolactone', 'hydrochlorothiazide'],
    บวม: ['furosemide'],
    หัวใจ: ['digoxin', 'amiodarone', 'metoprolol'],
    เลือดอุดตัน: ['aspirin', 'warfarin', 'clopidogrel'],
    ลิ่มเลือด: ['aspirin', 'warfarin', 'clopidogrel'],
    ไทรอยด์: ['levothyroxine'],
    กระดูก: ['alendronate', 'calcium'],
    แคลเซียม: ['calcium'],
    สมุนไพร: ['ginkgo', 'ginseng'],
    แปะก๊วย: ['ginkgo'],
    โสม: ['ginseng'],
  };

  const matchedSynonymIds = Object.keys(synonymMap)
    .filter((key) => normalized.includes(key))
    .flatMap((key) => synonymMap[key]);

  const terms = normalized.split(/\s+/).filter(Boolean);

  return medicines
    .map((item, index) => {
      const nameTh = normalizeMedicineSearchText(item.nameTh);
      const nameEn = normalizeMedicineSearchText(item.nameEn);
      const id = normalizeMedicineSearchText(item.id);
      const category = normalizeMedicineSearchText(item.category);
      const description = normalizeMedicineSearchText(item.description ?? '');
      const searchableText = [nameTh, nameEn, id, category, description].join(' ');

      const matchesSearch = terms.every((term) => searchableText.includes(term));
      const matchesSynonym = matchedSynonymIds.includes(item.id);

      if (!matchesSearch && !matchesSynonym) return null;

      let rank = 4;
      if (matchesSynonym) rank = 0;
      else if ([nameTh, nameEn, id].some((value) => value === normalized)) rank = 1;
      else if ([nameTh, nameEn, id].some((value) => value.startsWith(normalized))) rank = 2;
      else if ([nameTh, nameEn, id, category].some((value) => value.includes(normalized))) rank = 3;

      return { item, rank, index };
    })
    .filter((result): result is { item: MedicineDefinition; rank: number; index: number } => Boolean(result))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map((result) => result.item);
}
