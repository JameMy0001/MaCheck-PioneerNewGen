import { useMemo, useState } from 'react';
import { SectionList, Share, Text, View } from 'react-native';

import { FeatureIcon } from '@/components/feature-icon';
import { PrimaryButton, useFontMultiplier } from '@/components/ui';
import { colors, slots } from '@/constants/theme';
import { useAppStore } from '@/store/use-app-store';
import type { MedicationHistoryItem } from '@/utils/medication-history';
import { buildMedicationHistory, formatMedicationHistoryShare, historyMealTimingLabel } from '@/utils/medication-history';
import { getSlotLabel } from '@/utils/i18n';

type HistoryRange = 7 | 30;

export default function MedicationHistoryScreen() {
  const multiplier = useFontMultiplier();
  const profile = useAppStore((state) => state.profile);
  const lang = profile?.language || 'th';
  const cabinet = useAppStore((state) => state.cabinet);
  const archivedCabinet = useAppStore((state) => state.archivedCabinet);
  const takenByDate = useAppStore((state) => state.takenByDate);
  const [range, setRange] = useState<HistoryRange>(7);

  const sections = useMemo(
    () => buildMedicationHistory(takenByDate, cabinet, archivedCabinet, range, lang),
    [takenByDate, cabinet, archivedCabinet, range, lang],
  );
  const totalDoses = sections.reduce((sum, section) => sum + section.data.length, 0);

  const shareHistory = async () => {
    if (!sections.length) return;
    await Share.share({ message: formatMedicationHistoryShare(sections, range, lang) });
  };

  const renderItem = ({ item }: { item: MedicationHistoryItem }) => (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: colors.surface, paddingHorizontal: 15, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <View style={{ width: 44, height: 44, borderRadius: 14, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.successSoft }}>
        <FeatureIcon name="success" size={36} accessibilityLabel={lang === 'en' ? 'Taken' : 'ทานแล้ว'} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
          <Text selectable style={{ flex: 1, color: colors.text, fontSize: 16 * multiplier, fontWeight: '900' }}>{item.medicineName}</Text>
          <Text selectable style={{ color: colors.primaryDark, fontSize: 13 * multiplier, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{slots[item.slot].time.hour.toString().padStart(2, '0')}:{slots[item.slot].time.minute.toString().padStart(2, '0')}</Text>
        </View>
        {item.medicineNameEn && lang !== 'en' ? <Text selectable style={{ color: colors.muted, fontSize: 12 * multiplier }}>{item.medicineNameEn}</Text> : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <FeatureIcon name={slots[item.slot].icon} size={22} accessibilityLabel={getSlotLabel(item.slot, lang)} />
          <Text selectable style={{ flex: 1, color: colors.muted, fontSize: 13 * multiplier }}>{getSlotLabel(item.slot, lang)} · {item.dose} · {historyMealTimingLabel(item.mealTiming, lang)}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SectionList
      contentInsetAdjustmentBehavior="automatic"
      sections={sections}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      stickySectionHeadersEnabled={false}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      renderSectionHeader={({ section }) => (
        <View style={{ paddingTop: 13, paddingBottom: 8, backgroundColor: colors.background }}>
          <Text selectable style={{ color: colors.text, fontSize: 16 * multiplier, fontWeight: '900' }}>{section.title}</Text>
          <Text selectable style={{ color: colors.muted, fontSize: 12 * multiplier, fontVariant: ['tabular-nums'] }}>
            {section.data.length.toLocaleString(lang === 'en' ? 'en-US' : 'th-TH')} {lang === 'en' ? 'recorded dose(s)' : 'รายการที่บันทึกว่าทานแล้ว'}
          </Text>
        </View>
      )}
      ListHeaderComponent={(
        <View style={{ gap: 13, paddingBottom: 4 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {([7, 30] as const).map((value) => {
              const active = range === value;
              return (
                <View key={value} style={{ flex: 1 }}>
                  <PrimaryButton
                    label={value === 7 ? (lang === 'en' ? '7 Days' : '7 วัน') : (lang === 'en' ? '1 Month' : '1 เดือน')}
                    tone={active ? 'primary' : 'neutral'}
                    onPress={() => setRange(value)}
                  />
                </View>
              );
            })}
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1, borderRadius: 17, borderCurve: 'continuous', padding: 14, gap: 4, backgroundColor: colors.primarySoft }}>
              <Text selectable style={{ color: colors.primaryDark, fontSize: 27 * multiplier, fontWeight: '900', fontVariant: ['tabular-nums'] }}>
                {totalDoses.toLocaleString(lang === 'en' ? 'en-US' : 'th-TH')}
              </Text>
              <Text selectable style={{ color: colors.primaryDark, fontSize: 13 * multiplier, fontWeight: '700' }}>
                {lang === 'en' ? 'Recorded Doses' : 'ครั้งที่บันทึกว่าทานแล้ว'}
              </Text>
            </View>
            <View style={{ flex: 1, borderRadius: 17, borderCurve: 'continuous', padding: 14, gap: 4, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
              <Text selectable style={{ color: colors.text, fontSize: 27 * multiplier, fontWeight: '900', fontVariant: ['tabular-nums'] }}>
                {sections.length.toLocaleString(lang === 'en' ? 'en-US' : 'th-TH')}
              </Text>
              <Text selectable style={{ color: colors.muted, fontSize: 13 * multiplier, fontWeight: '700' }}>
                {lang === 'en' ? 'Recorded Days' : 'วันที่มีการบันทึก'}
              </Text>
            </View>
          </View>

          <PrimaryButton
            label={lang === 'en' ? 'Share summary with doctor or family' : 'แชร์สรุปให้แพทย์หรือครอบครัว'}
            tone="neutral"
            disabled={!sections.length}
            onPress={() => void shareHistory()}
          />
          <View style={{ borderRadius: 14, borderCurve: 'continuous', padding: 12, backgroundColor: colors.warningSoft }}>
            <Text selectable style={{ color: colors.warning, fontSize: 13 * multiplier, lineHeight: 19 * multiplier, fontWeight: '700' }}>
              {lang === 'en'
                ? 'This history shows only items marked as "Taken". Timestamps reflect scheduled times, not exact tap times, and should not be used to self-adjust dosages.'
                : 'ประวัตินี้แสดงเฉพาะรายการที่ผู้ใช้กด “ทานแล้ว” เวลาที่แสดงคือเวลาตามตารางเตือน ไม่ใช่เวลาจริงที่กดบันทึก และไม่ควรใช้ปรับยาด้วยตนเอง'}
            </Text>
          </View>
        </View>
      )}
      ListEmptyComponent={(
        <View style={{ paddingVertical: 42, alignItems: 'center', gap: 7 }}>
          <FeatureIcon name="medication-history" size={66} accessibilityLabel={lang === 'en' ? 'Medication History' : 'ประวัติการทานยา'} />
          <Text selectable style={{ color: colors.text, fontSize: 18 * multiplier, fontWeight: '900' }}>
            {lang === 'en' ? 'No history in this period' : 'ยังไม่มีประวัติในช่วงนี้'}
          </Text>
          <Text selectable style={{ color: colors.muted, textAlign: 'center', lineHeight: 21 * multiplier }}>
            {lang === 'en'
              ? 'When you check off medications on the Today screen, your history will appear here automatically.'
              : 'เมื่อกดเครื่องหมายทานยาแล้วบนหน้าวันนี้ ประวัติจะมาแสดงที่นี่อัตโนมัติ'}
          </Text>
        </View>
      )}
    />
  );
}
