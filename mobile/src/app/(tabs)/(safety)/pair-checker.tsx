import { useMemo, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { Link } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { ClinicalCatalogStatus } from '@/components/clinical-catalog-status';
import { MedicineSearchSelect } from '@/components/medicine-search-select';
import { PrimaryButton, SafetyBanner, SectionCard, useFontMultiplier } from '@/components/ui';
import { colors } from '@/constants/theme';
import { getMedicine } from '@/data/medicine-db';
import { useClinicalCatalogStore } from '@/store/use-clinical-catalog-store';
import { useAppStore } from '@/store/use-app-store';
import { checkDrugPair } from '@/utils/safety';
import { t } from '@/utils/i18n';

interface CheckedPair {
  drugA: string;
  drugB: string;
}

export default function PairCheckerScreen() {
  const profile = useAppStore((state) => state.profile);
  const lang = profile.language || 'th';

  const multiplier = useFontMultiplier();
  const revision = useClinicalCatalogStore((state) => state.revision);
  const [queryA, setQueryA] = useState('');
  const [queryB, setQueryB] = useState('');
  const [drugA, setDrugA] = useState('');
  const [drugB, setDrugB] = useState('');
  const [checkedPair, setCheckedPair] = useState<CheckedPair | null>(null);
  const [error, setError] = useState('');
  const finding = useMemo(() => {
    void revision;
    return checkedPair ? checkDrugPair(checkedPair.drugA, checkedPair.drugB) : null;
  }, [checkedPair, revision]);

  const changeQueryA = (value: string) => {
    setQueryA(value);
    setDrugA('');
    setCheckedPair(null);
    setError('');
  };

  const changeQueryB = (value: string) => {
    setQueryB(value);
    setDrugB('');
    setCheckedPair(null);
    setError('');
  };

  const swap = () => {
    setQueryA(queryB);
    setQueryB(queryA);
    setDrugA(drugB);
    setDrugB(drugA);
    setCheckedPair(null);
    setError('');
  };

  const checkPair = () => {
    if (!drugA || !drugB) {
      setError(lang === 'en' ? 'Please select both drugs from list' : 'กรุณาเลือกยาจากรายการให้ครบทั้งสองตัว');
      return;
    }
    if (drugA === drugB) {
      setError(lang === 'en' ? 'Please select two different drugs' : 'กรุณาเลือกยาคนละตัว');
      return;
    }
    setError('');
    setCheckedPair({ drugA, drugB });
    if (process.env.EXPO_OS === 'ios') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  const checkedNameA = checkedPair ? ((lang === 'en' ? getMedicine(checkedPair.drugA)?.nameEn : getMedicine(checkedPair.drugA)?.nameTh) ?? checkedPair.drugA) : '';
  const checkedNameB = checkedPair ? ((lang === 'en' ? getMedicine(checkedPair.drugB)?.nameEn : getMedicine(checkedPair.drugB)?.nameTh) ?? checkedPair.drugB) : '';

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
      <ClinicalCatalogStatus />

      <SectionCard title={lang === 'en' ? 'Select 2 Medications' : 'เลือกยาสองตัว'}>
        <MedicineSearchSelect
          label={lang === 'en' ? 'Medication 1' : 'ยาตัวที่ 1'}
          query={queryA}
          selectedId={drugA}
          onChangeQuery={changeQueryA}
          onSelect={(id, name) => { setDrugA(id); setQueryA(name); setCheckedPair(null); setError(''); }}
        />

        <Pressable accessibilityRole="button" accessibilityLabel={lang === 'en' ? 'Swap medication 1 and 2' : 'สลับยาตัวที่หนึ่งและตัวที่สอง'} onPress={swap} style={({ pressed }) => ({ alignSelf: 'center', minWidth: 48, minHeight: 44, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.65 : 1 })}>
          <Text style={{ color: colors.primary, fontSize: 22, fontWeight: '900' }}>⇅</Text>
        </Pressable>

        <MedicineSearchSelect
          label={lang === 'en' ? 'Medication 2' : 'ยาตัวที่ 2'}
          query={queryB}
          selectedId={drugB}
          onChangeQuery={changeQueryB}
          onSelect={(id, name) => { setDrugB(id); setQueryB(name); setCheckedPair(null); setError(''); }}
        />

        {error ? <Text selectable accessibilityRole="alert" style={{ color: colors.danger, fontWeight: '700', fontSize: 14 * multiplier }}>{error}</Text> : null}
        <PrimaryButton label={lang === 'en' ? 'Check Drug Pair' : 'ตรวจสอบคู่ยา'} onPress={checkPair} disabled={!drugA || !drugB} />
      </SectionCard>

      {checkedPair ? (
        <View style={{ gap: 10 }}>
          <Text selectable style={{ color: colors.text, fontSize: 20 * multiplier, fontWeight: '900' }}>{lang === 'en' ? 'Result:' : 'ผลตรวจ:'} {checkedNameA} + {checkedNameB}</Text>
          {finding ? (
            <SafetyBanner severity={finding.severity} title={finding.title} description={`${finding.description} ${finding.advice ?? ''}`} />
          ) : (
            <View accessibilityRole="alert" style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 16, borderCurve: 'continuous', padding: 15, gap: 6, backgroundColor: colors.surface }}>
              <Text selectable style={{ color: colors.text, fontWeight: '900', fontSize: 17 * multiplier }}>{lang === 'en' ? 'No interaction warnings found in database' : 'ไม่พบข้อมูลคู่นี้ในรายการที่เผยแพร่แล้ว'}</Text>
              <Text selectable style={{ color: colors.muted, fontSize: 14 * multiplier, lineHeight: 21 * multiplier }}>{lang === 'en' ? 'This does not guarantee safety. Consult your doctor or pharmacist before taking together.' : 'ผลนี้ไม่ได้ยืนยันว่ายาทั้งสองตัวปลอดภัยเมื่อใช้ร่วมกัน กรุณาสอบถามแพทย์หรือเภสัชกรก่อนรับประทานร่วมกัน'}</Text>
            </View>
          )}
        </View>
      ) : null}

      <Link href="./interaction-directory" asChild>
        <Pressable accessibilityRole="link" style={({ pressed }) => ({ minHeight: 48, borderRadius: 14, borderCurve: 'continuous', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.68 : 1 })}>
          <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 16 * multiplier }}>{t('directory_title', lang)}</Text>
        </Pressable>
      </Link>

      <Text selectable style={{ color: colors.muted, textAlign: 'center', fontSize: 13 * multiplier, lineHeight: 20 * multiplier }}>{t('clinical_limitation', lang)}</Text>
    </ScrollView>
  );
}
