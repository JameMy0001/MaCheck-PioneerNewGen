import { useMemo } from 'react';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { FeatureIcon } from '@/components/feature-icon';
import { PrimaryButton, SectionCard, useFontMultiplier } from '@/components/ui';
import { colors, slots } from '@/constants/theme';
import { getMedicine } from '@/data/medicine-db';
import { formatMedicineDose, formatMedicineDoseForSpeech } from '@/utils/medicine-dose';
import { getAdherence, useAppStore } from '@/store/use-app-store';
import type { ScheduleSlot } from '@/types/models';
import { getTodayKey } from '@/utils/safety';

const slotOrder = Object.keys(slots) as ScheduleSlot[];

function getCurrentSlot(): ScheduleSlot {
  const hour = new Date().getHours();
  if (hour < 11) return 'morning';
  if (hour < 16) return 'noon';
  if (hour < 20) return 'evening';
  return 'bedtime';
}

function formatSlotTime(slot: ScheduleSlot) {
  const { hour, minute } = slots[slot].time;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function mealTimingLabel(value: 'before' | 'after' | 'any') {
  if (value === 'before') return 'ก่อนอาหาร';
  if (value === 'after') return 'หลังอาหาร';
  return 'ไม่จำกัดมื้อ';
}

export default function HomeScreen() {
  const router = useRouter();
  const { addedMedicineId } = useLocalSearchParams<{ addedMedicineId?: string }>();
  const profile = useAppStore((state) => state.profile);
  const cabinet = useAppStore((state) => state.cabinet);
  const takenByDate = useAppStore((state) => state.takenByDate);
  const waterByDate = useAppStore((state) => state.waterByDate);
  const toggleTaken = useAppStore((state) => state.toggleTaken);
  const recordWater = useAppStore((state) => state.recordWater);
  const multiplier = useFontMultiplier();
  const timeColumnWidth = 64 * multiplier;
  const today = getTodayKey();
  const taken = useMemo(() => takenByDate[today] ?? {}, [takenByDate, today]);
  const currentSlot = getCurrentSlot();
  const activeCabinet = useMemo(() => cabinet.filter((item) => item.status === 'active'), [cabinet]);
  const adherence = useMemo(() => getAdherence(cabinet, taken), [cabinet, taken]);
  const water = waterByDate[today] ?? 0;
  const addedMedicine = addedMedicineId ? cabinet.find((item) => item.id === addedMedicineId) : undefined;

  const markTaken = (id: string, slot: ScheduleSlot) => {
    toggleTaken(id, slot);
    if (process.env.EXPO_OS === 'ios') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 36 }}>
      <View style={{ gap: 4 }}>
        <Text selectable style={{ color: colors.muted, fontSize: 15 * multiplier }}>สวัสดี</Text>
        <Text selectable style={{ color: colors.text, fontSize: 29 * multiplier, fontWeight: '900' }}>{profile.displayName || profile.username}</Text>
      </View>

      {addedMedicine ? (
        <View accessibilityRole="alert" style={{ backgroundColor: colors.successSoft, borderColor: colors.success, borderWidth: 1, borderRadius: 16, borderCurve: 'continuous', padding: 14, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
            <FeatureIcon name="success" size={30} accessibilityLabel="สำเร็จ" />
            <Text selectable style={{ color: colors.success, fontSize: 17 * multiplier, fontWeight: '900' }}>เพิ่มยาเรียบร้อยแล้ว</Text>
          </View>
          <Text selectable style={{ color: colors.text, fontSize: 14 * multiplier, lineHeight: 21 * multiplier }}>
            {addedMedicine.customName || getMedicine(addedMedicine.medicineId)?.nameTh || addedMedicine.medicineId} จะแสดงในช่วง {addedMedicine.schedules.map((slot) => slots[slot].label).join(', ')}
          </Text>
        </View>
      ) : null}

      <SectionCard>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text selectable style={{ color: colors.muted, fontSize: 14 * multiplier }}>ความสม่ำเสมอวันนี้</Text>
            <Text selectable style={{ color: adherence >= 80 ? colors.success : colors.warning, fontSize: 36 * multiplier, fontWeight: '900', fontVariant: ['tabular-nums'] }}>{adherence}%</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: colors.primarySoft, borderRadius: 16, borderCurve: 'continuous', paddingHorizontal: 12, paddingVertical: 9 }}>
            <FeatureIcon name="water-tracking" size={30} accessibilityLabel="การดื่มน้ำ" />
            <Text selectable style={{ color: colors.primaryDark, fontWeight: '800', fontSize: 16 * multiplier }}>{water}/8 แก้ว</Text>
          </View>
        </View>
        <PrimaryButton label="บันทึกดื่มน้ำ 1 แก้ว" tone="neutral" icon={<FeatureIcon name="water-tracking" size={28} />} onPress={recordWater} disabled={water >= 12} />
      </SectionCard>


      <View style={{ gap: 8 }}>
        <Text selectable style={{ color: colors.text, fontSize: 22 * multiplier, fontWeight: '900' }}>ตารางยาวันนี้</Text>
        <Text selectable style={{ color: colors.muted, fontSize: 14 * multiplier }}>แตะช่องสี่เหลี่ยมเมื่อรับประทานยาแล้ว</Text>
      </View>

      <View style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 20, borderCurve: 'continuous', overflow: 'hidden' }}>
        {slotOrder.map((slot, index) => {
          const period = slots[slot];
          const medicines = activeCabinet.filter((item) => item.schedules.includes(slot));
          const isCurrent = slot === currentSlot;
          return (
            <View
              key={slot}
              accessibilityLabel={`${formatSlotTime(slot)} ช่วง${period.label}${isCurrent ? ' ช่วงเวลาปัจจุบัน' : ''}`}
              style={{
                flexDirection: 'row',
                gap: 12,
                paddingHorizontal: 15,
                paddingVertical: 16,
                backgroundColor: isCurrent ? colors.primarySoft : colors.surface,
                borderBottomWidth: index === slotOrder.length - 1 ? 0 : 1,
                borderBottomColor: colors.border,
              }}
            >
              <View style={{ width: timeColumnWidth, flexShrink: 0, alignItems: 'center' }}>
                <Text
                  selectable
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}
                  numberOfLines={1}
                  style={{ width: '100%', color: isCurrent ? colors.primaryDark : colors.muted, fontSize: 14 * multiplier, fontWeight: '900', fontVariant: ['tabular-nums'], textAlign: 'center' }}
                >
                  {formatSlotTime(slot)}
                </Text>
                <View style={{ marginTop: 8, width: 12, height: 12, borderRadius: 6, backgroundColor: isCurrent ? colors.primary : colors.border, borderWidth: 2, borderColor: isCurrent ? colors.primary : colors.muted }} />
                {index < slotOrder.length - 1 ? <View style={{ width: 2, flex: 1, minHeight: 22, marginTop: 4, backgroundColor: isCurrent ? colors.primary : colors.border }} /> : null}
              </View>

              <View style={{ flex: 1, gap: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <FeatureIcon name={period.icon} size={30} accessibilityLabel={`ช่วง${period.label}`} />
                    <Text selectable style={{ color: colors.text, fontSize: 17 * multiplier, fontWeight: '900' }}>{period.label}</Text>
                  </View>
                  {isCurrent ? <Text style={{ color: colors.primaryDark, backgroundColor: colors.surface, borderRadius: 999, overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 4, fontSize: 12 * multiplier, fontWeight: '800' }}>ตอนนี้</Text> : null}
                </View>

                {medicines.length === 0 ? (
                  <Text selectable style={{ color: colors.muted, fontSize: 14 * multiplier }}>ยังไม่มียาที่กำหนดไว้</Text>
                ) : medicines.map((item) => {
                  const definition = getMedicine(item.medicineId);
                  const done = Boolean(taken[`${item.id}:${slot}`]);
                  return (
                    <Pressable
                      key={item.id}
                      accessibilityLabel={`${item.customName || definition?.nameTh || item.medicineId} ${formatMedicineDoseForSpeech(item)} ${mealTimingLabel(item.mealTiming)}`}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: done }}
                      onPress={() => markTaken(item.id, slot)}
                      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 11, opacity: pressed ? 0.7 : 1 })}
                    >
                      {done
                        ? <FeatureIcon name="success" size={30} accessibilityLabel="ทานแล้ว" />
                        : <View style={{ width: 30, height: 30, borderRadius: 9, borderCurve: 'continuous', borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface }} />}
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text selectable style={{ color: done ? colors.muted : colors.text, fontWeight: '800', fontSize: 16 * multiplier, textDecorationLine: done ? 'line-through' : 'none' }}>{item.customName || definition?.nameTh || item.medicineId}</Text>
                        <Text selectable style={{ color: colors.muted, fontSize: 13 * multiplier }}>{formatMedicineDose(item)} · {mealTimingLabel(item.mealTiming)}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}
