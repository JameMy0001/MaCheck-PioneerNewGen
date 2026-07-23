import { slots } from '@/constants/theme';
import { getMedicine } from '@/data/medicine-db';
import type { CabinetMedicine, ScheduleSlot } from '@/types/models';
import { formatMedicineDose } from '@/utils/medicine-dose';
import { getTodayKey } from '@/utils/safety';
import { getMealTimingLabel, getSlotLabel } from '@/utils/i18n';

const slotOrder: ScheduleSlot[] = ['morning', 'noon', 'evening', 'bedtime'];

export interface MedicationHistoryItem {
  id: string;
  date: string;
  slot: ScheduleSlot;
  medicineName: string;
  medicineNameEn?: string;
  dose: string;
  mealTiming: CabinetMedicine['mealTiming'];
}

export interface MedicationHistorySection {
  date: string;
  title: string;
  data: MedicationHistoryItem[];
}

function parseDateKey(value: string) {
  const [year = 1970, month = 1, day = 1] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatDateTitle(value: string, lang: 'th' | 'en' = 'th') {
  return new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'th-TH', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(parseDateKey(value));
}

function isDateInRange(dateKey: string, days: number) {
  const target = parseDateKey(dateKey);
  const today = parseDateKey(getTodayKey());
  const start = new Date(today);
  start.setDate(start.getDate() - (days - 1));
  return target >= start && target <= today;
}

function resolveMedicine(id: string, cabinet: CabinetMedicine[], archivedCabinet: Record<string, CabinetMedicine>) {
  return cabinet.find((item) => item.id === id) ?? archivedCabinet[id];
}

export function buildMedicationHistory(
  takenByDate: Record<string, Record<string, boolean>>,
  cabinet: CabinetMedicine[],
  archivedCabinet: Record<string, CabinetMedicine>,
  days: number,
  lang: 'th' | 'en' = 'th',
): MedicationHistorySection[] {
  return Object.entries(takenByDate)
    .filter(([date]) => isDateInRange(date, days))
    .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
    .map(([date, records]) => {
      const data = Object.entries(records)
        .filter(([, taken]) => taken)
        .map(([key]): MedicationHistoryItem | null => {
          const separator = key.lastIndexOf(':');
          const cabinetMedicineId = key.slice(0, separator);
          const slot = key.slice(separator + 1) as ScheduleSlot;
          if (!slotOrder.includes(slot)) return null;
          const medicine = resolveMedicine(cabinetMedicineId, cabinet, archivedCabinet);
          const definition = medicine ? getMedicine(medicine.medicineId) : undefined;
          const fallbackDeleted = lang === 'en' ? 'Deleted Medication' : 'รายการยาที่ลบแล้ว';
          const fallbackDose = lang === 'en' ? 'No dose data' : 'ไม่พบข้อมูลจำนวน';

          return {
            id: `${date}:${key}`,
            date,
            slot,
            medicineName: medicine?.customName || (lang === 'en' ? (definition?.nameEn || definition?.nameTh) : definition?.nameTh) || fallbackDeleted,
            medicineNameEn: definition?.nameEn,
            dose: medicine ? formatMedicineDose(medicine) : fallbackDose,
            mealTiming: medicine?.mealTiming ?? 'any',
          };
        })
        .filter((item): item is MedicationHistoryItem => item !== null)
        .sort((a, b) => slotOrder.indexOf(a.slot) - slotOrder.indexOf(b.slot));
      return { date, title: formatDateTitle(date, lang), data };
    })
    .filter((section) => section.data.length > 0);
}

export function historyMealTimingLabel(value: CabinetMedicine['mealTiming'], lang: 'th' | 'en' = 'th') {
  return getMealTimingLabel(value, lang);
}

export function formatMedicationHistoryShare(sections: MedicationHistorySection[], days: number, lang: 'th' | 'en' = 'th') {
  const lines = sections.flatMap((section) => [
    section.title,
    ...section.data.map((item) => `• ${getSlotLabel(item.slot, lang)} ${item.medicineName} ${item.dose} (${getMealTimingLabel(item.mealTiming, lang)})`),
    '',
  ]);

  if (lang === 'en') {
    return [`MaCheck Medication Adherence History (Past ${days} Days)`, 'Shows only items marked as "Taken"', '', ...lines].join('\n').trim();
  }
  return [`สรุปประวัติการทานยา MaCheck ย้อนหลัง ${days} วัน`, 'แสดงเฉพาะรายการที่ผู้ใช้กดบันทึกว่า “ทานแล้ว”', '', ...lines].join('\n').trim();
}
