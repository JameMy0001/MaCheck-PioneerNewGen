import { slots } from '@/constants/theme';
import { getMedicine } from '@/data/medicine-db';
import type { CabinetMedicine, ScheduleSlot } from '@/types/models';
import { formatMedicineDose } from '@/utils/medicine-dose';
import { getTodayKey } from '@/utils/safety';

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

function formatDateTitle(value: string) {
  return new Intl.DateTimeFormat('th-TH', {
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
          return {
            id: `${date}:${key}`,
            date,
            slot,
            medicineName: medicine?.customName || definition?.nameTh || 'รายการยาที่ลบแล้ว',
            medicineNameEn: definition?.nameEn,
            dose: medicine ? formatMedicineDose(medicine) : 'ไม่พบข้อมูลจำนวน',
            mealTiming: medicine?.mealTiming ?? 'any',
          };
        })
        .filter((item): item is MedicationHistoryItem => item !== null)
        .sort((a, b) => slotOrder.indexOf(a.slot) - slotOrder.indexOf(b.slot));
      return { date, title: formatDateTitle(date), data };
    })
    .filter((section) => section.data.length > 0);
}

function mealTimingLabel(value: CabinetMedicine['mealTiming']) {
  if (value === 'before') return 'ก่อนอาหาร';
  if (value === 'after') return 'หลังอาหาร';
  return 'ไม่จำกัดมื้อ';
}

export function formatMedicationHistoryShare(sections: MedicationHistorySection[], days: number) {
  const lines = sections.flatMap((section) => [
    section.title,
    ...section.data.map((item) => `• ${slots[item.slot].label} ${item.medicineName} ${item.dose} (${mealTimingLabel(item.mealTiming)})`),
    '',
  ]);
  return [`สรุปประวัติการทานยา YaCheck ย้อนหลัง ${days} วัน`, 'แสดงเฉพาะรายการที่ผู้ใช้กดบันทึกว่า “ทานแล้ว”', '', ...lines].join('\n').trim();
}

export function historyMealTimingLabel(value: CabinetMedicine['mealTiming']) {
  return mealTimingLabel(value);
}
