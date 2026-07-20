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

export function checkDrugPair(drugA: string, drugB: string): SafetyFinding | null {
  const interaction = findDrugInteraction(drugA, drugB);
  if (!interaction) return null;
  const safeCopy = getInteractionSafetyCopy(interaction.severity);
  return {
    id: interaction.id,
    severity: interaction.severity,
    title: `${safeCopy.title}: ${getMedicine(interaction.drug1)?.nameTh ?? interaction.drug1} + ${getMedicine(interaction.drug2)?.nameTh ?? interaction.drug2}`,
    description: safeCopy.description,
    advice: safeCopy.advice,
  };
}

export function checkDrugInteractions(medicineIds: string[]): SafetyFinding[] {
  const uniqueIds = new Set(medicineIds);
  return interactions
    .filter((item) => uniqueIds.has(item.drug1) && uniqueIds.has(item.drug2))
    .map((item) => checkDrugPair(item.drug1, item.drug2))
    .filter((item): item is SafetyFinding => item !== null)
    .sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'severe' ? -1 : 1));
}

export function checkCandidateMedicine(
  candidateId: string,
  cabinet: CabinetMedicine[],
  allergies: string[],
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
    .map((item) => checkDrugPair(item.drug1, item.drug2))
    .filter((item): item is SafetyFinding => item !== null)
    .sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'severe' ? -1 : 1));
  if (allergyMatch) {
    findings.unshift({
      id: `allergy_${candidateId}`,
      severity: 'severe',
      title: 'พบชื่อยาตรงกับประวัติแพ้ยา',
      description: `รายการ ${medicine?.nameTh ?? candidateId} อาจตรงกับข้อมูลที่ผู้ใช้บันทึกไว้`,
      advice: 'อย่าเริ่มยาเอง ให้ตรวจฉลากและติดต่อแพทย์หรือเภสัชกรทันที',
    });
  }
  return findings;
}

export function checkFoodQuery(
  query: string,
  cabinet: CabinetMedicine[],
  diseases: string[],
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
      title: `ควรระวัง ${item.food}`,
      description: item.description,
      advice: 'ข้อมูลนี้ใช้คัดกรองเบื้องต้น ไม่แทนคำแนะนำเฉพาะบุคคลจากแพทย์หรือเภสัชกร',
    }));
}

export function getTodayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
