import { useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { FeatureIcon } from '@/components/feature-icon';
import { Field, PrimaryButton, SafetyBanner, SectionCard, useFontMultiplier } from '@/components/ui';
import { colors, slots } from '@/constants/theme';
import { getMedicine, searchMedicines } from '@/data/medicine-db';
import { rescheduleMedicationNotifications } from '@/services/notifications';
import { useAppStore } from '@/store/use-app-store';
import { useClinicalCatalogStore } from '@/store/use-clinical-catalog-store';
import type { ScheduleSlot } from '@/types/models';
import { checkCandidateMedicine } from '@/utils/safety';

export default function AddMedicineScreen() {
  const params = useLocalSearchParams<{ medicineId?: string; query?: string }>();
  const cabinet = useAppStore((state) => state.cabinet);
  const allergies = useAppStore((state) => state.profile.allergies);
  const addMedicine = useAppStore((state) => state.addMedicine);
  const catalogRevision = useClinicalCatalogStore((state) => state.revision);
  const multiplier = useFontMultiplier();
  const [query, setQuery] = useState(params.query ?? '');
  const [medicineId, setMedicineId] = useState(params.medicineId ?? '');
  const selected = getMedicine(medicineId);
  const [tabletCount, setTabletCount] = useState('1');
  const [schedules, setSchedules] = useState<ScheduleSlot[]>(['morning']);
  const [mealTiming, setMealTiming] = useState<'before' | 'after' | 'any'>('after');
  const [error, setError] = useState('');
  const results = useMemo(() => {
    void catalogRevision;
    return searchMedicines(query).slice(0, 12);
  }, [query, catalogRevision]);
  const findings = medicineId ? checkCandidateMedicine(medicineId, cabinet, allergies) : [];

  const select = (id: string) => {
    const definition = getMedicine(id);
    setMedicineId(id);
    setQuery(definition?.nameTh ?? id);
    setTabletCount('1');
  };

  const toggleSlot = (slot: ScheduleSlot) => setSchedules((current) =>
    current.includes(slot) ? current.filter((item) => item !== slot) : [...current, slot],
  );

  const save = async () => {
    const parsedTabletCount = Number(tabletCount.replace(',', '.'));
    if (!medicineId || !Number.isFinite(parsedTabletCount) || parsedTabletCount <= 0 || schedules.length === 0) {
      setError('กรุณาเลือกยา ระบุจำนวนเม็ด และเลือกเวลาอย่างน้อย 1 ช่วง');
      return;
    }
    const created = addMedicine({ medicineId, tabletCount: parsedTabletCount, schedules, mealTiming });
    await rescheduleMedicationNotifications(useAppStore.getState().cabinet);
    setQuery('');
    setMedicineId('');
    setTabletCount('1');
    setSchedules(['morning']);
    setMealTiming('after');
    setError('');
    router.replace({ pathname: '/home', params: { addedMedicineId: created.id } });
  };

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
      <SectionCard title="1. เลือกยา">
        <Field label="ค้นหาชื่อยา หมวดหมู่ หรือสรรพคุณ" value={query} onChangeText={(text) => { setQuery(text); setMedicineId(''); }} placeholder="เช่น เมทฟอร์มิน เบาหวาน หรือแก้ปวด" />
        {!medicineId ? results.map((item) => (
          <Pressable key={item.id} onPress={() => select(item.id)} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text selectable style={{ color: colors.text, fontWeight: '800', fontSize: 17 * multiplier }}>{item.nameTh}</Text>
            <Text selectable style={{ color: colors.muted, fontSize: 14 * multiplier }}>{item.nameEn} · {item.category}</Text>
            {item.description ? <Text selectable numberOfLines={2} style={{ color: colors.muted, fontSize: 13 * multiplier, lineHeight: 18 * multiplier }}>{item.description}</Text> : null}
          </Pressable>
        )) : (
          <View style={{ padding: 12, borderRadius: 14, borderCurve: 'continuous', backgroundColor: colors.primarySoft, gap: 4 }}>
            <Text selectable style={{ color: colors.primaryDark, fontWeight: '900', fontSize: 18 * multiplier }}>{selected?.nameTh}</Text>
            <Text selectable style={{ color: colors.muted }}>{selected?.description}</Text>
          </View>
        )}
      </SectionCard>

      {findings.map((finding) => <SafetyBanner key={finding.id} severity={finding.severity} title={finding.title} description={`${finding.description} ${finding.advice ?? ''}`} />)}

      <SectionCard title="2. จำนวนเม็ดและเวลา">
        <View style={{ gap: 8 }}>
          <Field label="จำนวนยาที่กินต่อครั้ง (เม็ด)" value={tabletCount} onChangeText={setTabletCount} keyboardType="decimal-pad" placeholder="เช่น 1 หรือ 2" />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {([['0.5', '½ เม็ด'], ['1', '1 เม็ด'], ['2', '2 เม็ด']] as const).map(([value, label]) => {
              const active = tabletCount === value;
              return (
                <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => setTabletCount(value)} style={{ flex: 1, paddingVertical: 9, borderRadius: 12, borderCurve: 'continuous', borderWidth: 1.5, borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primarySoft : colors.surface }}>
                  <Text style={{ color: active ? colors.primaryDark : colors.text, textAlign: 'center', fontWeight: '800' }}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text selectable style={{ color: colors.muted, fontSize: 13 * multiplier, lineHeight: 18 * multiplier }}>กรอกจำนวนเม็ดตามฉลากหรือคำแนะนำของแพทย์/เภสัชกร ระบบไม่คำนวณจำนวนเม็ดจากน้ำหนักยาให้เอง</Text>
        </View>
        <View style={{ gap: 8 }}>
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 * multiplier }}>ช่วงเวลา</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {(Object.keys(slots) as ScheduleSlot[]).map((slot) => {
              const active = schedules.includes(slot);
              return (
                <Pressable key={slot} onPress={() => toggleSlot(slot)} style={{ flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: active ? colors.primary : colors.surface, borderWidth: 1, borderColor: active ? colors.primary : colors.border }}>
                  <FeatureIcon name={slots[slot].icon} size={25} accessibilityLabel={`ช่วง${slots[slot].label}`} />
                  <Text style={{ color: active ? '#FFFFFF' : colors.text, fontWeight: '800' }}>{slots[slot].label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <View style={{ gap: 8 }}>
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 * multiplier }}>ความสัมพันธ์กับอาหาร</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {([['before', 'ก่อนอาหาร'], ['after', 'หลังอาหาร'], ['any', 'ไม่จำกัด']] as const).map(([value, label]) => (
              <Pressable key={value} onPress={() => setMealTiming(value)} style={{ flex: 1, padding: 10, borderRadius: 12, borderCurve: 'continuous', backgroundColor: mealTiming === value ? colors.primarySoft : colors.surface, borderWidth: 1.5, borderColor: mealTiming === value ? colors.primary : colors.border }}><Text style={{ textAlign: 'center', color: colors.text, fontWeight: '700' }}>{label}</Text></Pressable>
            ))}
          </View>
        </View>
        {error ? <Text selectable style={{ color: colors.danger, fontWeight: '700' }}>{error}</Text> : null}
        <PrimaryButton label={findings.some((item) => item.severity === 'severe') ? 'บันทึก (พบคำเตือนรุนแรง)' : 'บันทึกและตั้งเตือน'} onPress={() => void save()} />
      </SectionCard>
      <Text selectable style={{ color: colors.muted, textAlign: 'center', lineHeight: 20 }}>คำเตือนนี้เป็นระบบคัดกรองจากชุดข้อมูลในแอป ควรตรวจสอบกับแพทย์หรือเภสัชกรก่อนเริ่ม เปลี่ยน หรือหยุดยา</Text>
    </ScrollView>
  );
}
