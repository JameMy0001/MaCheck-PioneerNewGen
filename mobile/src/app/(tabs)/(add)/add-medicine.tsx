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
import { t, getSlotLabel, getMealTimingLabel } from '@/utils/i18n';

export default function AddMedicineScreen() {
  const params = useLocalSearchParams<{ medicineId?: string; query?: string }>();
  const profile = useAppStore((state) => state.profile);
  const cabinet = useAppStore((state) => state.cabinet);
  const allergies = useAppStore((state) => state.profile.allergies);
  const addMedicine = useAppStore((state) => state.addMedicine);
  const catalogRevision = useClinicalCatalogStore((state) => state.revision);
  const lang = profile.language || 'th';

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
    setQuery(lang === 'en' ? (definition?.nameEn ?? id) : (definition?.nameTh ?? id));
    setTabletCount('1');
  };

  const toggleSlot = (slot: ScheduleSlot) => setSchedules((current) =>
    current.includes(slot) ? current.filter((item) => item !== slot) : [...current, slot],
  );

  const save = async () => {
    const parsedTabletCount = Number(tabletCount.replace(',', '.'));
    if (!medicineId || !Number.isFinite(parsedTabletCount) || parsedTabletCount <= 0 || schedules.length === 0) {
      setError(t('add_error_validation', lang));
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
      <SectionCard title={t('step1_select_drug', lang)}>
        <Field label={t('search_drug_label', lang)} value={query} onChangeText={(text) => { setQuery(text); setMedicineId(''); }} placeholder={t('search_drug_placeholder', lang)} />
        {!medicineId ? results.map((item) => (
          <Pressable key={item.id} onPress={() => select(item.id)} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text selectable style={{ color: colors.text, fontWeight: '800', fontSize: 17 * multiplier }}>{lang === 'en' ? item.nameEn : item.nameTh}</Text>
            <Text selectable style={{ color: colors.muted, fontSize: 14 * multiplier }}>{item.nameEn} · {lang === 'en' ? (item.categoryEn || item.category) : item.category}</Text>
            {item.description ? <Text selectable numberOfLines={2} style={{ color: colors.muted, fontSize: 13 * multiplier, lineHeight: 18 * multiplier }}>{lang === 'en' ? (item.descriptionEn || item.description) : item.description}</Text> : null}
          </Pressable>
        )) : (
          <View style={{ padding: 12, borderRadius: 14, borderCurve: 'continuous', backgroundColor: colors.primarySoft, gap: 4 }}>
            <Text selectable style={{ color: colors.primaryDark, fontWeight: '900', fontSize: 18 * multiplier }}>{lang === 'en' ? selected?.nameEn : selected?.nameTh}</Text>
            <Text selectable style={{ color: colors.muted }}>{lang === 'en' ? (selected?.descriptionEn || selected?.description) : selected?.description}</Text>
          </View>
        )}
      </SectionCard>

      {findings.map((finding) => <SafetyBanner key={finding.id} severity={finding.severity} title={finding.title} description={`${finding.description} ${finding.advice ?? ''}`} />)}

      <SectionCard title={t('step2_dose_and_time', lang)}>
        <View style={{ gap: 8 }}>
          <Field label={t('dose_per_time', lang)} value={tabletCount} onChangeText={setTabletCount} keyboardType="decimal-pad" placeholder={t('dose_placeholder', lang)} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {([['0.5', t('dose_half', lang)], ['1', t('dose_one', lang)], ['2', t('dose_two', lang)]] as const).map(([value, label]) => {
              const active = tabletCount === value;
              return (
                <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => setTabletCount(value)} style={{ flex: 1, paddingVertical: 9, borderRadius: 12, borderCurve: 'continuous', borderWidth: 1.5, borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primarySoft : colors.surface }}>
                  <Text style={{ color: active ? colors.primaryDark : colors.text, textAlign: 'center', fontWeight: '800' }}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text selectable style={{ color: colors.muted, fontSize: 13 * multiplier, lineHeight: 18 * multiplier }}>{t('dose_guidance_hint', lang)}</Text>
        </View>

        <View style={{ gap: 8 }}>
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 * multiplier }}>{t('time_slot_label', lang)}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {(['morning', 'noon', 'evening', 'bedtime'] as const).map((slot) => {
              const active = schedules.includes(slot);
              return (
                <Pressable key={slot} onPress={() => toggleSlot(slot)} style={{ paddingHorizontal: 13, paddingVertical: 10, borderRadius: 999, backgroundColor: active ? colors.primary : colors.surface, borderWidth: 1, borderColor: active ? colors.primary : colors.border }}>
                  <Text style={{ color: active ? '#FFFFFF' : colors.text, fontWeight: '700' }}>{getSlotLabel(slot, lang)}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={{ gap: 8 }}>
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 * multiplier }}>{t('meal_timing_title', lang)}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['before', 'after', 'any'] as const).map((timing) => {
              const active = mealTiming === timing;
              return (
                <Pressable key={timing} onPress={() => setMealTiming(timing)} style={{ flex: 1, paddingVertical: 10, borderRadius: 12, borderCurve: 'continuous', backgroundColor: active ? colors.primary : colors.surface, borderWidth: 1, borderColor: active ? colors.primary : colors.border }}>
                  <Text style={{ textAlign: 'center', color: active ? '#FFFFFF' : colors.text, fontWeight: '800' }}>{getMealTimingLabel(timing, lang)}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </SectionCard>

      {error ? <Text style={{ color: colors.danger, fontWeight: '800', textAlign: 'center' }}>{error}</Text> : null}
      <PrimaryButton label={t('save_med_btn', lang)} onPress={save} />
    </ScrollView>
  );
}
