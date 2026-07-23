import { useMemo, useState } from 'react';
import * as Speech from 'expo-speech';
import { router } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

import { ClinicalCatalogStatus } from '@/components/clinical-catalog-status';
import { FeatureIcon } from '@/components/feature-icon';
import { ActionTile, Field, PrimaryButton, SafetyBanner, SectionCard, useFontMultiplier } from '@/components/ui';
import { colors } from '@/constants/theme';
import { getMedicine } from '@/data/medicine-db';
import { useClinicalCatalogStore } from '@/store/use-clinical-catalog-store';
import { useAppStore } from '@/store/use-app-store';
import { checkDrugInteractions, checkFoodQuery } from '@/utils/safety';
import { t } from '@/utils/i18n';

export default function SafetyScreen() {
  const profile = useAppStore((state) => state.profile);
  const cabinet = useAppStore((state) => state.cabinet);
  const diseases = useAppStore((state) => state.profile.diseases);
  const soundEnabled = useAppStore((state) => state.profile.soundEnabled);
  const catalogRevision = useClinicalCatalogStore((state) => state.revision);
  const lang = profile.language || 'th';

  const multiplier = useFontMultiplier();
  const [food, setFood] = useState('');
  const [foodSubmitted, setFoodSubmitted] = useState('');
  const active = useMemo(() => cabinet.filter((item) => item.status === 'active'), [cabinet]);

  const drugFindings = useMemo(() => {
    void catalogRevision;
    return checkDrugInteractions(active.map((item) => item.medicineId), lang);
  }, [active, catalogRevision, lang]);

  const foodFindings = useMemo(() => {
    void catalogRevision;
    return checkFoodQuery(foodSubmitted, active, diseases, lang);
  }, [foodSubmitted, active, diseases, catalogRevision, lang]);

  const checkFood = () => {
    setFoodSubmitted(food);
    const findings = checkFoodQuery(food, active, diseases, lang);
    if (soundEnabled) {
      void Speech.speak(findings[0]?.description ?? (lang === 'en' ? 'No matching food warnings found in database.' : 'ยังไม่พบคำเตือนที่ตรงกับข้อมูลในเครื่อง แต่ควรตรวจสอบกับเภสัชกรหากไม่แน่ใจค่ะ'), { language: lang === 'en' ? 'en-US' : 'th-TH', rate: 0.92 });
    }
  };

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
      <ClinicalCatalogStatus />

      <View style={{ gap: 10 }}>
        <ActionTile icon={<FeatureIcon name="drug-pair-check" size={40} />} title={t('pair_check_title', lang)} subtitle={t('pair_check_subtitle', lang)} onPress={() => router.push('./pair-checker')} />
        <ActionTile icon={<FeatureIcon name="interaction-directory" size={40} />} title={t('directory_title', lang)} subtitle={t('directory_subtitle', lang)} onPress={() => router.push('./interaction-directory')} />
      </View>

      <SectionCard title={t('cabinet_active_title', lang)}>
        <Text selectable style={{ color: colors.muted, lineHeight: 22, fontSize: 15 * multiplier }}>
          {active.length ? active.map((item) => (lang === 'en' ? getMedicine(item.medicineId)?.nameEn : getMedicine(item.medicineId)?.nameTh) ?? item.medicineId).join(' · ') : t('empty_cabinet_text', lang)}
        </Text>
        {drugFindings.length === 0 ? (
          <View accessibilityRole="alert" style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 15, borderCurve: 'continuous', padding: 14, gap: 5, backgroundColor: colors.background }}>
            <Text selectable style={{ color: colors.text, fontWeight: '900', fontSize: 16 * multiplier }}>{t('no_interactions_found', lang)}</Text>
            <Text selectable style={{ color: colors.muted, fontSize: 14 * multiplier, lineHeight: 21 * multiplier }}>{t('no_interactions_disclaimer', lang)}</Text>
          </View>
        ) : drugFindings.map((finding) => <SafetyBanner key={finding.id} severity={finding.severity} title={finding.title} description={`${finding.description} ${finding.advice ?? ''}`} />)}
      </SectionCard>

      <SectionCard title={t('food_herb_section', lang)}>
        <Field label={t('food_herb_label', lang)} value={food} onChangeText={setFood} placeholder={t('food_herb_placeholder', lang)} returnKeyType="search" onSubmitEditing={checkFood} />
        <PrimaryButton label={t('check_risk_btn', lang)} onPress={checkFood} disabled={!food.trim()} />
        {foodSubmitted && foodFindings.length === 0 ? <SafetyBanner severity="safe" title={t('no_matching_food_warning', lang)} description={t('food_warning_disclaimer', lang)} /> : null}
        {foodFindings.map((finding) => <SafetyBanner key={finding.id} severity={finding.severity} title={finding.title} description={`${finding.description} ${finding.advice ?? ''}`} />)}
      </SectionCard>

      <View style={{ padding: 13, borderRadius: 14, borderCurve: 'continuous', backgroundColor: colors.warningSoft }}>
        <Text selectable style={{ color: colors.warning, fontWeight: '800', lineHeight: 21 }}>{t('clinical_limitation', lang)}</Text>
      </View>
    </ScrollView>
  );
}
