import { useMemo, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';

import { ClinicalCatalogStatus } from '@/components/clinical-catalog-status';
import { Field, useFontMultiplier } from '@/components/ui';
import { getInteractionSafetyCopy } from '@/constants/interaction-safety';
import { colors } from '@/constants/theme';
import { getMedicine, interactions, searchMedicines } from '@/data/medicine-db';
import { useClinicalCatalogStore } from '@/store/use-clinical-catalog-store';
import type { DrugInteraction } from '@/types/models';

type InteractionFilter = 'all' | 'severe' | 'moderate';

function formatReviewedAt(value?: string | null) {
  if (!value) return 'ข้อมูลสำรองในแอป';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 'ตรวจทานแล้ว';
  return `ตรวจทาน ${new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium' }).format(date)}`;
}

export default function InteractionDirectoryScreen() {
  const multiplier = useFontMultiplier();
  const revision = useClinicalCatalogStore((state) => state.revision);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<InteractionFilter>('all');
  const filtered = useMemo(() => {
    void revision;
    const normalized = query.trim().toLocaleLowerCase('th');
    const matchingMedicineIds = normalized ? new Set(searchMedicines(query).map((item) => item.id)) : null;
    return interactions
      .filter((item) => filter === 'all' || item.severity === filter)
      .filter((item) => {
        if (!matchingMedicineIds) return true;
        return matchingMedicineIds.has(item.drug1) || matchingMedicineIds.has(item.drug2);
      })
      .sort((a, b) => {
        if (a.severity !== b.severity) return a.severity === 'severe' ? -1 : 1;
        const nameA = getMedicine(a.drug1)?.nameTh ?? a.drug1;
        const nameB = getMedicine(b.drug1)?.nameTh ?? b.drug1;
        return nameA.localeCompare(nameB, 'th');
      });
  }, [query, filter, revision]);

  const renderItem = ({ item }: { item: DrugInteraction }) => {
    const drug1 = getMedicine(item.drug1);
    const drug2 = getMedicine(item.drug2);
    const copy = getInteractionSafetyCopy(item.severity);
    const severe = item.severity === 'severe';
    return (
      <View style={{ borderWidth: 1, borderColor: severe ? '#F4B8B4' : '#F2D28C', backgroundColor: colors.surface, borderRadius: 17, borderCurve: 'continuous', padding: 15, gap: 9 }}>
        <View style={{ gap: 3 }}>
          <Text selectable style={{ color: colors.text, fontWeight: '900', fontSize: 17 * multiplier }}>{drug1?.nameTh ?? item.drug1}</Text>
          <Text selectable style={{ color: colors.muted, fontSize: 13 * multiplier }}>{drug1?.nameEn ?? item.drug1}</Text>
          <Text style={{ color: colors.muted, fontSize: 19, fontWeight: '900' }}>↕</Text>
          <Text selectable style={{ color: colors.text, fontWeight: '900', fontSize: 17 * multiplier }}>{drug2?.nameTh ?? item.drug2}</Text>
          <Text selectable style={{ color: colors.muted, fontSize: 13 * multiplier }}>{drug2?.nameEn ?? item.drug2}</Text>
        </View>
        <View style={{ alignSelf: 'flex-start', borderRadius: 999, backgroundColor: severe ? colors.dangerSoft : colors.warningSoft, paddingHorizontal: 10, paddingVertical: 6 }}>
          <Text selectable style={{ color: severe ? colors.danger : colors.warning, fontWeight: '900', fontSize: 13 * multiplier }}>{severe ? 'ห้ามใช้ร่วมกัน' : 'ต้องสอบถามผู้เชี่ยวชาญ'}</Text>
        </View>
        <Text selectable style={{ color: colors.text, fontWeight: '700', fontSize: 14 * multiplier, lineHeight: 21 * multiplier }}>{copy.advice}</Text>
        <Text selectable style={{ color: colors.muted, fontSize: 12 * multiplier }}>{formatReviewedAt(item.reviewedAt)}{item.datasetVersion ? ` · v${item.datasetVersion}` : ''}</Text>
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
          <Field label="ค้นหาชื่อยา หมวดหมู่ หรือสรรพคุณ" value={query} onChangeText={setQuery} placeholder="เช่น วาร์ฟาริน หัวใจ หรือเบาหวาน" returnKeyType="search" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {([['all', 'ทุกระดับ'], ['severe', 'ห้ามใช้ร่วมกัน'], ['moderate', 'สอบถามผู้เชี่ยวชาญ']] as const).map(([value, label]) => {
              const active = filter === value;
              return (
                <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => setFilter(value)} style={({ pressed }) => ({ borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primarySoft : colors.surface, opacity: pressed ? 0.68 : 1 })}>
                  <Text style={{ color: active ? colors.primaryDark : colors.text, fontWeight: '800', fontSize: 13 * multiplier }}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text selectable style={{ color: colors.muted, fontSize: 14 * multiplier, fontVariant: ['tabular-nums'] }}>{filtered.length.toLocaleString('th-TH')} คู่ที่ตรงกับตัวกรอง</Text>
          <View style={{ padding: 12, borderRadius: 13, borderCurve: 'continuous', backgroundColor: colors.warningSoft }}>
            <Text selectable style={{ color: colors.warning, fontSize: 13 * multiplier, lineHeight: 19 * multiplier, fontWeight: '700' }}>รายการนี้แสดงเฉพาะคู่ยาที่มีคำเตือนและผ่านการเผยแพร่แล้ว การไม่พบคู่ยาไม่ได้ยืนยันว่าปลอดภัย</Text>
          </View>
        </View>
      )}
      ListEmptyComponent={<View style={{ paddingVertical: 32, alignItems: 'center', gap: 5 }}><Text selectable style={{ color: colors.text, fontWeight: '900', fontSize: 17 * multiplier }}>ไม่พบคู่ยาที่ตรงกับคำค้นหา</Text><Text selectable style={{ color: colors.muted, textAlign: 'center' }}>ลองเปลี่ยนชื่อยาหรือตัวกรอง</Text></View>}
      initialNumToRender={16}
      windowSize={7}
    />
  );
}
