import { useMemo, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';

import { ClinicalCatalogStatus } from '@/components/clinical-catalog-status';
import { Field, useFontMultiplier } from '@/components/ui';
import { getInteractionSafetyCopy } from '@/constants/interaction-safety';
import { colors } from '@/constants/theme';
import { getMedicine, interactions, searchMedicines } from '@/data/medicine-db';
import { useClinicalCatalogStore } from '@/store/use-clinical-catalog-store';
import { useAppStore } from '@/store/use-app-store';
import type { DrugInteraction } from '@/types/models';

type InteractionFilter = 'all' | 'severe' | 'moderate';

function formatReviewedAt(value?: string | null, lang: 'th' | 'en' = 'th') {
  if (!value) return lang === 'en' ? 'App offline data' : 'ข้อมูลสำรองในแอป';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return lang === 'en' ? 'Reviewed' : 'ตรวจทานแล้ว';
  return `${lang === 'en' ? 'Reviewed ' : 'ตรวจทาน '}${new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'th-TH', { dateStyle: 'medium' }).format(date)}`;
}

export default function InteractionDirectoryScreen() {
  const profile = useAppStore((state) => state.profile);
  const lang = profile.language || 'th';

  const multiplier = useFontMultiplier();
  const revision = useClinicalCatalogStore((state) => state.revision);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<InteractionFilter>('all');
  const filtered = useMemo(() => {
    void revision;
    const normalized = query.trim().toLocaleLowerCase();
    const matchingMedicineIds = normalized ? new Set(searchMedicines(query).map((item) => item.id)) : null;
    return interactions
      .filter((item) => filter === 'all' || item.severity === filter)
      .filter((item) => {
        if (!matchingMedicineIds) return true;
        return matchingMedicineIds.has(item.drug1) || matchingMedicineIds.has(item.drug2);
      })
      .sort((a, b) => {
        if (a.severity !== b.severity) return a.severity === 'severe' ? -1 : 1;
        const nameA = (lang === 'en' ? getMedicine(a.drug1)?.nameEn : getMedicine(a.drug1)?.nameTh) ?? a.drug1;
        const nameB = (lang === 'en' ? getMedicine(b.drug1)?.nameEn : getMedicine(b.drug1)?.nameTh) ?? b.drug1;
        return nameA.localeCompare(nameB, lang === 'en' ? 'en' : 'th');
      });
  }, [query, filter, revision, lang]);

  const renderItem = ({ item }: { item: DrugInteraction }) => {
    const drug1 = getMedicine(item.drug1);
    const drug2 = getMedicine(item.drug2);
    const copy = getInteractionSafetyCopy(item.severity);
    const severe = item.severity === 'severe';
    const mainName1 = (lang === 'en' ? drug1?.nameEn : drug1?.nameTh) ?? item.drug1;
    const subName1 = (lang === 'en' ? drug1?.nameTh : drug1?.nameEn) ?? item.drug1;
    const mainName2 = (lang === 'en' ? drug2?.nameEn : drug2?.nameTh) ?? item.drug2;
    const subName2 = (lang === 'en' ? drug2?.nameTh : drug2?.nameEn) ?? item.drug2;

    return (
      <View style={{ borderWidth: 1, borderColor: severe ? '#F4B8B4' : '#F2D28C', backgroundColor: colors.surface, borderRadius: 17, borderCurve: 'continuous', padding: 15, gap: 9 }}>
        <View style={{ gap: 3 }}>
          <Text selectable style={{ color: colors.text, fontWeight: '900', fontSize: 17 * multiplier }}>{mainName1}</Text>
          <Text selectable style={{ color: colors.muted, fontSize: 13 * multiplier }}>{subName1}</Text>
          <Text style={{ color: colors.muted, fontSize: 19, fontWeight: '900' }}>↕</Text>
          <Text selectable style={{ color: colors.text, fontWeight: '900', fontSize: 17 * multiplier }}>{mainName2}</Text>
          <Text selectable style={{ color: colors.muted, fontSize: 13 * multiplier }}>{subName2}</Text>
        </View>
        <View style={{ alignSelf: 'flex-start', borderRadius: 999, backgroundColor: severe ? colors.dangerSoft : colors.warningSoft, paddingHorizontal: 10, paddingVertical: 6 }}>
          <Text selectable style={{ color: severe ? colors.danger : colors.warning, fontWeight: '900', fontSize: 13 * multiplier }}>{severe ? (lang === 'en' ? 'Do Not Combine' : 'ห้ามใช้ร่วมกัน') : (lang === 'en' ? 'Consult Professional' : 'ต้องสอบถามผู้เชี่ยวชาญ')}</Text>
        </View>
        <Text selectable style={{ color: colors.text, fontWeight: '700', fontSize: 14 * multiplier, lineHeight: 21 * multiplier }}>{copy.advice}</Text>
        <Text selectable style={{ color: colors.muted, fontSize: 12 * multiplier }}>{formatReviewedAt(item.reviewedAt, lang)}{item.datasetVersion ? ` · v${item.datasetVersion}` : ''}</Text>
      </View>
    );
  };

  return (
    <FlatList
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      data={filtered}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      ListHeaderComponent={(
        <View style={{ gap: 13, paddingBottom: 14 }}>
          <ClinicalCatalogStatus />
          <Field label={lang === 'en' ? 'Search medication name or category' : 'ค้นหาชื่อยา หมวดหมู่ หรือสรรพคุณ'} value={query} onChangeText={setQuery} placeholder={lang === 'en' ? 'e.g. Warfarin, Heart, or Diabetes' : 'เช่น วาร์ฟาริน หัวใจ หรือเบาหวาน'} returnKeyType="search" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {([['all', lang === 'en' ? 'All Levels' : 'ทุกระดับ'], ['severe', lang === 'en' ? 'Do Not Combine' : 'ห้ามใช้ร่วมกัน'], ['moderate', lang === 'en' ? 'Consult Professional' : 'สอบถามผู้เชี่ยวชาญ']] as const).map(([value, label]) => {
              const active = filter === value;
              return (
                <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => setFilter(value)} style={({ pressed }) => ({ borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primarySoft : colors.surface, opacity: pressed ? 0.68 : 1 })}>
                  <Text style={{ color: active ? colors.primaryDark : colors.text, fontWeight: '800', fontSize: 13 * multiplier }}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text selectable style={{ color: colors.muted, fontSize: 14 * multiplier, fontVariant: ['tabular-nums'] }}>{filtered.length.toLocaleString(lang === 'en' ? 'en-US' : 'th-TH')} {lang === 'en' ? 'matching pairs' : 'คู่ที่ตรงกับตัวกรอง'}</Text>
          <View style={{ padding: 12, borderRadius: 13, borderCurve: 'continuous', backgroundColor: colors.warningSoft }}>
            <Text selectable style={{ color: colors.warning, fontSize: 13 * multiplier, lineHeight: 19 * multiplier, fontWeight: '700' }}>{lang === 'en' ? 'This directory shows published warnings only. Absence of a pair does not guarantee safety.' : 'รายการนี้แสดงเฉพาะคู่ยาที่มีคำเตือนและผ่านการเผยแพร่แล้ว การไม่พบคู่ยาไม่ได้ยืนยันว่าปลอดภัย'}</Text>
          </View>
        </View>
      )}
      ListEmptyComponent={<View style={{ paddingVertical: 32, alignItems: 'center', gap: 5 }}><Text selectable style={{ color: colors.text, fontWeight: '900', fontSize: 17 * multiplier }}>{lang === 'en' ? 'No matching drug pairs found' : 'ไม่พบคู่ยาที่ตรงกับคำค้นหา'}</Text><Text selectable style={{ color: colors.muted, textAlign: 'center' }}>{lang === 'en' ? 'Try changing your search term or filter' : 'ลองเปลี่ยนชื่อยาหรือตัวกรอง'}</Text></View>}
      initialNumToRender={16}
      windowSize={7}
    />
  );
}
