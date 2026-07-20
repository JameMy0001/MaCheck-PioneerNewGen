import { Text, View } from 'react-native';

import { useFontMultiplier } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useClinicalCatalogStore } from '@/store/use-clinical-catalog-store';

function formatUpdatedAt(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function ClinicalCatalogStatus() {
  const source = useClinicalCatalogStore((state) => state.source);
  const lastUpdated = useClinicalCatalogStore((state) => state.lastUpdated);
  const refreshing = useClinicalCatalogStore((state) => state.refreshing);
  const multiplier = useFontMultiplier();
  const fresh = source === 'fresh';
  const updatedLabel = formatUpdatedAt(lastUpdated);
  const message = refreshing
    ? 'กำลังตรวจสอบข้อมูลล่าสุดจากฐานข้อมูลกลาง…'
    : fresh
      ? `เชื่อมต่อฐานข้อมูลกลางแล้ว${updatedLabel ? ` · อัปเดต ${updatedLabel}` : ''}`
      : source === 'cached'
        ? `กำลังใช้ข้อมูลที่บันทึกไว้ในเครื่อง${updatedLabel ? ` · อัปเดต ${updatedLabel}` : ''}`
        : 'กำลังใช้ข้อมูลสำรองในแอป ควรเชื่อมต่ออินเทอร์เน็ตก่อนตัดสินใจ';

  return (
    <View accessibilityRole="alert" style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 13, borderCurve: 'continuous', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: fresh ? colors.successSoft : colors.warningSoft }}>
      <Text style={{ fontSize: 15 }}>{fresh ? '●' : '!'}</Text>
      <Text selectable style={{ flex: 1, color: fresh ? colors.success : colors.warning, fontWeight: '700', fontSize: 13 * multiplier, lineHeight: 19 * multiplier }}>{message}</Text>
    </View>
  );
}
