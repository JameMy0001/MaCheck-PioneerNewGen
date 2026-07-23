import { Text, View } from 'react-native';

import { useFontMultiplier } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useClinicalCatalogStore } from '@/store/use-clinical-catalog-store';
import { useAppStore } from '@/store/use-app-store';

function formatUpdatedAt(value: string | null, lang: 'th' | 'en' = 'th') {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'th-TH', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function ClinicalCatalogStatus() {
  const source = useClinicalCatalogStore((state) => state.source);
  const lastUpdated = useClinicalCatalogStore((state) => state.lastUpdated);
  const refreshing = useClinicalCatalogStore((state) => state.refreshing);
  const profile = useAppStore((state) => state.profile);
  const lang = profile.language || 'th';
  const multiplier = useFontMultiplier();
  const fresh = source === 'fresh';
  const updatedLabel = formatUpdatedAt(lastUpdated, lang);

  let message: string;
  if (refreshing) {
    message = lang === 'en'
      ? 'Checking for latest data from central database…'
      : 'กำลังตรวจสอบข้อมูลล่าสุดจากฐานข้อมูลกลาง…';
  } else if (fresh) {
    message = lang === 'en'
      ? `Connected to central database${updatedLabel ? ` · Updated ${updatedLabel}` : ''}`
      : `เชื่อมต่อฐานข้อมูลกลางแล้ว${updatedLabel ? ` · อัปเดต ${updatedLabel}` : ''}`;
  } else if (source === 'cached') {
    message = lang === 'en'
      ? `Using locally cached data${updatedLabel ? ` · Updated ${updatedLabel}` : ''}`
      : `กำลังใช้ข้อมูลที่บันทึกไว้ในเครื่อง${updatedLabel ? ` · อัปเดต ${updatedLabel}` : ''}`;
  } else {
    message = lang === 'en'
      ? 'Using built-in app data. Connect to the internet for the most accurate results.'
      : 'กำลังใช้ข้อมูลสำรองในแอป ควรเชื่อมต่ออินเทอร์เน็ตก่อนตัดสินใจ';
  }

  return (
    <View accessibilityRole="alert" style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 13, borderCurve: 'continuous', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: fresh ? colors.successSoft : colors.warningSoft }}>
      <Text style={{ fontSize: 15 }}>{fresh ? '●' : '!'}</Text>
      <Text selectable style={{ flex: 1, color: fresh ? colors.success : colors.warning, fontWeight: '700', fontSize: 13 * multiplier, lineHeight: 19 * multiplier }}>{message}</Text>
    </View>
  );
}
