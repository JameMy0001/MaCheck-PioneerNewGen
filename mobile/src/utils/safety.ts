import { foodClashes, getMedicine, interactions } from '@/data/medicine-db';
import { getInteractionSafetyCopy } from '@/constants/interaction-safety';
import type { CabinetMedicine, SafetyFinding } from '@/types/models';

export function getDrugPairKey(drugA: string, drugB: string) {
  return [drugA, drugB].sort().join('|');
}

export function findDrugInteraction(drugA: string, drugB: string) {
  const pairKey = getDrugPairKey(drugA, drugB);
  return interactions.find((item) => getDrugPairKey(item.drug1, item.drug2) === pairKey);
}

export function checkDrugPair(drugA: string, drugB: string, lang: 'th' | 'en' = 'th'): SafetyFinding | null {
  const interaction = findDrugInteraction(drugA, drugB);
  if (!interaction) return null;
  const safeCopy = getInteractionSafetyCopy(interaction.severity, lang);
  const drug1 = getMedicine(interaction.drug1);
  const drug2 = getMedicine(interaction.drug2);
  const name1 = (lang === 'en' ? drug1?.nameEn : drug1?.nameTh) ?? interaction.drug1;
  const name2 = (lang === 'en' ? drug2?.nameEn : drug2?.nameTh) ?? interaction.drug2;

  return {
    id: interaction.id,
    severity: interaction.severity,
    title: `${safeCopy.title}: ${name1} + ${name2}`,
    description: safeCopy.description,
    advice: safeCopy.advice,
  };
}

export function checkDrugInteractions(medicineIds: string[], lang: 'th' | 'en' = 'th'): SafetyFinding[] {
  const uniqueIds = new Set(medicineIds);
  return interactions
    .filter((item) => uniqueIds.has(item.drug1) && uniqueIds.has(item.drug2))
    .map((item) => checkDrugPair(item.drug1, item.drug2, lang))
    .filter((item): item is SafetyFinding => item !== null)
    .sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'severe' ? -1 : 1));
}

export function checkCandidateMedicine(
  candidateId: string,
  cabinet: CabinetMedicine[],
  allergies: string[],
  lang: 'th' | 'en' = 'th',
): SafetyFinding[] {
  const activeIds = cabinet.filter((item) => item.status === 'active').map((item) => item.medicineId);
  const medicine = getMedicine(candidateId);
  const allergyMatch = allergies.some((allergy) => {
    const normalized = allergy.toLocaleLowerCase('th');
    return medicine
      ? [medicine.id, medicine.nameEn, medicine.nameTh].some((value) => value.toLocaleLowerCase('th').includes(normalized) || normalized.includes(value.toLocaleLowerCase('th')))
      : false;
  });

  const activeSet = new Set(activeIds);
  const findings = interactions
    .filter((item) =>
      (item.drug1 === candidateId && activeSet.has(item.drug2)) ||
      (item.drug2 === candidateId && activeSet.has(item.drug1)),
    )
    .map((item) => checkDrugPair(item.drug1, item.drug2, lang))
    .filter((item): item is SafetyFinding => item !== null)
    .sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'severe' ? -1 : 1));

  if (allergyMatch) {
    const drugName = (lang === 'en' ? medicine?.nameEn : medicine?.nameTh) ?? candidateId;
    findings.unshift({
      id: `allergy_${candidateId}`,
      severity: 'severe',
      title: lang === 'en' ? 'Drug Name Matches Allergy History' : 'พบชื่อยาตรงกับประวัติแพ้ยา',
      description: lang === 'en'
        ? `Medication ${drugName} may match your saved allergy profile.`
        : `รายการ ${drugName} อาจตรงกับข้อมูลที่ผู้ใช้บันทึกไว้`,
      advice: lang === 'en'
        ? 'Do not start this medication on your own. Check label and contact your doctor or pharmacist immediately.'
        : 'อย่าเริ่มยาเอง ให้ตรวจฉลากและติดต่อแพทย์หรือเภสัชกรทันที',
    });
  }
  return findings;
}

export function checkFoodQuery(
  query: string,
  cabinet: CabinetMedicine[],
  diseases: string[],
  lang: 'th' | 'en' = 'th',
): SafetyFinding[] {
  const normalized = query.trim().toLocaleLowerCase('th');
  if (!normalized) return [];
  const activeIds = new Set(cabinet.filter((item) => item.status === 'active').map((item) => item.medicineId));
  const diseaseIds = new Set(diseases);

  return foodClashes
    .filter((item) => item.keywords.some((keyword) => normalized.includes(keyword.toLocaleLowerCase('th')) || keyword.toLocaleLowerCase('th').includes(normalized)))
    .filter((item) =>
      (item.medicineIds?.some((id) => activeIds.has(id)) ?? false) ||
      (item.diseases?.some((id) => diseaseIds.has(id)) ?? false),
    )
    .map((item) => ({
      id: item.id,
      severity: item.severity,
      title: lang === 'en' ? `Use Caution With ${item.food}` : `ควรระวัง ${item.food}`,
      description: item.description,
      advice: lang === 'en'
        ? 'This info is for initial screening only and does not replace personalized medical advice.'
        : 'ข้อมูลนี้ใช้คัดกรองเบื้องต้น ไม่แทนคำแนะนำเฉพาะบุคคลจากแพทย์หรือเภสัชกร',
    }));
}

export function getTodayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
