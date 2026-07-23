import type { CabinetMedicine } from '@/types/models';

function formatAmount(value: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);
}

export function formatMedicineDose(
  medicine: Pick<CabinetMedicine, 'tabletCount' | 'dosageMg'>,
  lang: 'th' | 'en' = 'th',
) {
  if (Number.isFinite(medicine.tabletCount) && medicine.tabletCount! > 0) {
    const unit = lang === 'en' ? (medicine.tabletCount === 1 ? 'Pill' : 'Pills') : 'เม็ด';
    return `${formatAmount(medicine.tabletCount!)} ${unit}`;
  }
  if (Number.isFinite(medicine.dosageMg) && medicine.dosageMg! > 0) {
    return `${formatAmount(medicine.dosageMg!)} mg`;
  }
  return lang === 'en' ? 'Unspecified dose' : 'ไม่ระบุจำนวน';
}

export function formatMedicineDoseForSpeech(
  medicine: Pick<CabinetMedicine, 'tabletCount' | 'dosageMg'>,
  lang: 'th' | 'en' = 'th',
) {
  if (Number.isFinite(medicine.tabletCount) && medicine.tabletCount! > 0) {
    const unit = lang === 'en' ? (medicine.tabletCount === 1 ? 'pill' : 'pills') : 'เม็ด';
    return `${formatAmount(medicine.tabletCount!)} ${unit}`;
  }
  if (Number.isFinite(medicine.dosageMg) && medicine.dosageMg! > 0) {
    return `${formatAmount(medicine.dosageMg!)} ${lang === 'en' ? 'milligrams' : 'มิลลิกรัม'}`;
  }
  return lang === 'en' ? 'Unspecified dose' : 'ไม่ระบุจำนวน';
}

export function serializeMedicineDose(
  medicine: Pick<CabinetMedicine, 'tabletCount' | 'dosageMg'>,
  lang: 'th' | 'en' = 'th',
) {
  if (Number.isFinite(medicine.tabletCount) && medicine.tabletCount! > 0) {
    const unit = lang === 'en' ? (medicine.tabletCount === 1 ? 'Pill' : 'Pills') : 'เม็ด';
    return `${medicine.tabletCount} ${unit}`;
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
