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

export default function SafetyScreen() {
  const cabinet = useAppStore((state) => state.cabinet);
  const diseases = useAppStore((state) => state.profile.diseases);
  const soundEnabled = useAppStore((state) => state.profile.soundEnabled);
  const catalogRevision = useClinicalCatalogStore((state) => state.revision);
  const multiplier = useFontMultiplier();
  const [food, setFood] = useState('');
  const [foodSubmitted, setFoodSubmitted] = useState('');
  const active = useMemo(() => cabinet.filter((item) => item.status === 'active'), [cabinet]);
  const drugFindings = useMemo(() => {
    void catalogRevision;
    return checkDrugInteractions(active.map((item) => item.medicineId));
  }, [active, catalogRevision]);
  const foodFindings = useMemo(() => {
    void catalogRevision;
    return checkFoodQuery(foodSubmitted, active, diseases);
  }, [foodSubmitted, active, diseases, catalogRevision]);

  const checkFood = () => {
    setFoodSubmitted(food);
    const findings = checkFoodQuery(food, active, diseases);
    if (soundEnabled) {
      void Speech.speak(findings[0]?.description ?? 'ยังไม่พบคำเตือนที่ตรงกับข้อมูลในเครื่อง แต่ควรตรวจสอบกับเภสัชกรหากไม่แน่ใจค่ะ', { language: 'th-TH', rate: 0.92 });
    }
  };

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
      <ClinicalCatalogStatus />

      <View style={{ gap: 10 }}>
        <ActionTile icon={<FeatureIcon name="drug-pair-check" size={40} />} title="ตรวจยาสองตัว" subtitle="เลือกยาสองตัวเพื่อค้นหาคำเตือน" onPress={() => router.push('./pair-checker')} />
        <ActionTile icon={<FeatureIcon name="interaction-directory" size={40} />} title="รายการคู่ยาที่ควรระวัง" subtitle="ค้นหาและกรองคู่ยาที่เผยแพร่แล้ว" onPress={() => router.push('./interaction-directory')} />
      </View>

      <SectionCard title="ยาที่กำลังใช้ร่วมกัน">
        <Text selectable style={{ color: colors.muted, lineHeight: 22, fontSize: 15 * multiplier }}>{active.length ? active.map((item) => getMedicine(item.medicineId)?.nameTh ?? item.medicineId).join(' · ') : 'ยังไม่มียาในตู้'}</Text>
        {drugFindings.length === 0 ? (
          <View accessibilityRole="alert" style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 15, borderCurve: 'continuous', padding: 14, gap: 5, backgroundColor: colors.background }}>
            <Text selectable style={{ color: colors.text, fontWeight: '900', fontSize: 16 * multiplier }}>ยังไม่พบคู่ยาที่ตรงกับรายการคำเตือน</Text>
            <Text selectable style={{ color: colors.muted, fontSize: 14 * multiplier, lineHeight: 21 * multiplier }}>ผลนี้ไม่ได้ยืนยันว่าปลอดภัยทุกกรณี โดยเฉพาะยาที่ฐานข้อมูลยังไม่ครอบคลุม</Text>
          </View>
        ) : drugFindings.map((finding) => <SafetyBanner key={finding.id} severity={finding.severity} title={finding.title} description={`${finding.description} ${finding.advice ?? ''}`} />)}
      </SectionCard>

      <SectionCard title="ตรวจอาหารและสมุนไพร">
        <Field label="ชื่ออาหาร เครื่องดื่ม หรือสมุนไพร" value={food} onChangeText={setFood} placeholder="เช่น ส้มโอ กาแฟ กล้วย" returnKeyType="search" onSubmitEditing={checkFood} />
        <PrimaryButton label="ตรวจความเสี่ยง" onPress={checkFood} disabled={!food.trim()} />
        {foodSubmitted && foodFindings.length === 0 ? <SafetyBanner severity="safe" title="ยังไม่พบคำเตือนที่ตรงกัน" description="ฐานข้อมูลอาจไม่ครอบคลุมอาหาร ยา ขนาดยา และโรคทั้งหมด หากไม่แน่ใจให้สอบถามเภสัชกร" /> : null}
        {foodFindings.map((finding) => <SafetyBanner key={finding.id} severity={finding.severity} title={finding.title} description={`${finding.description} ${finding.advice ?? ''}`} />)}
      </SectionCard>

      <View style={{ padding: 13, borderRadius: 14, borderCurve: 'continuous', backgroundColor: colors.warningSoft }}>
        <Text selectable style={{ color: colors.warning, fontWeight: '800', lineHeight: 21 }}>ข้อจำกัดทางคลินิก: ระบบใช้เฉพาะข้อมูลที่เผยแพร่จากฐานข้อมูลกลาง ผลการไม่พบคำเตือนไม่สามารถยืนยันว่าปลอดภัย และไม่แทนการตรวจสอบโดยแพทย์หรือเภสัชกร</Text>
      </View>
    </ScrollView>
  );
}
