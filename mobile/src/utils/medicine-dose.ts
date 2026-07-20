import type { CabinetMedicine } from '@/types/models';

function formatAmount(value: number) {
  return new Intl.NumberFormat('th-TH', { maximumFractionDigits: 2 }).format(value);
}

export function formatMedicineDose(medicine: Pick<CabinetMedicine, 'tabletCount' | 'dosageMg'>) {
  if (Number.isFinite(medicine.tabletCount) && medicine.tabletCount! > 0) {
    return `${formatAmount(medicine.tabletCount!)} เม็ด`;
  }
  if (Number.isFinite(medicine.dosageMg) && medicine.dosageMg! > 0) {
    return `${formatAmount(medicine.dosageMg!)} mg`;
  }
  return 'ไม่ระบุจำนวน';
}

export function formatMedicineDoseForSpeech(medicine: Pick<CabinetMedicine, 'tabletCount' | 'dosageMg'>) {
  if (Number.isFinite(medicine.tabletCount) && medicine.tabletCount! > 0) {
    return `${formatAmount(medicine.tabletCount!)} เม็ด`;
  }
  if (Number.isFinite(medicine.dosageMg) && medicine.dosageMg! > 0) {
    return `${formatAmount(medicine.dosageMg!)} มิลลิกรัม`;
  }
  return 'ไม่ระบุจำนวน';
}

export function serializeMedicineDose(medicine: Pick<CabinetMedicine, 'tabletCount' | 'dosageMg'>) {
  if (Number.isFinite(medicine.tabletCount) && medicine.tabletCount! > 0) {
    return `${medicine.tabletCount} เม็ด`;
  }
  if (Number.isFinite(medicine.dosageMg) && medicine.dosageMg! > 0) {
    return `${medicine.dosageMg} mg`;
  }
  return '';
}

export function parseMedicineDose(value: unknown): Pick<CabinetMedicine, 'tabletCount' | 'dosageMg'> {
  const text = String(value ?? '').trim();
  const numericText = text.match(/\d+(?:[.,]\d+)?/)?.[0] ?? '';
  const numericValue = Number.parseFloat(numericText.replace(',', '.'));
  if (!Number.isFinite(numericValue) || numericValue <= 0) return {};

  if (/เม็ด|tablet|tab\b/i.test(text)) return { tabletCount: numericValue };
  return { dosageMg: numericValue };
}
