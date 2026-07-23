import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { FeatureIcon } from '@/components/feature-icon';
import { Field, useFontMultiplier } from '@/components/ui';
import { colors } from '@/constants/theme';
import { getMedicine, searchMedicines } from '@/data/medicine-db';
import { useClinicalCatalogStore } from '@/store/use-clinical-catalog-store';
import { useAppStore } from '@/store/use-app-store';

interface MedicineSearchSelectProps {
  label: string;
  query: string;
  selectedId: string;
  onChangeQuery: (query: string) => void;
  onSelect: (medicineId: string, name: string) => void;
}

export function MedicineSearchSelect({ label, query, selectedId, onChangeQuery, onSelect }: MedicineSearchSelectProps) {
  const multiplier = useFontMultiplier();
  const revision = useClinicalCatalogStore((state) => state.revision);
  const profile = useAppStore((state) => state.profile);
  const lang = profile.language || 'th';
  const selected = selectedId ? getMedicine(selectedId) : undefined;
  const results = useMemo(() => {
    void revision;
    return query.trim() && !selectedId ? searchMedicines(query).slice(0, 8) : [];
  }, [query, selectedId, revision]);

  return (
    <View style={{ gap: 9 }}>
      <Field
        label={label}
        value={query}
        onChangeText={onChangeQuery}
        placeholder={lang === 'en' ? 'Search drug name, category, or indication' : 'ค้นหาชื่อยา หมวดหมู่ หรือสรรพคุณ'}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {selected ? (
        <View style={{ padding: 12, borderRadius: 14, borderCurve: 'continuous', borderWidth: 1.5, borderColor: colors.primary, backgroundColor: colors.primarySoft, gap: 3 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <FeatureIcon name="success" size={28} accessibilityLabel={lang === 'en' ? 'Selected' : 'เลือกแล้ว'} />
            <Text selectable style={{ flex: 1, color: colors.primaryDark, fontWeight: '900', fontSize: 17 * multiplier }}>{lang === 'en' ? selected.nameEn : selected.nameTh}</Text>
          </View>
          <Text selectable style={{ color: colors.muted, fontSize: 13 * multiplier }}>{lang === 'en' ? `${selected.nameTh} · ${selected.categoryEn || selected.category}` : `${selected.nameEn} · ${selected.category}`}</Text>
        </View>
      ) : null}
      {!selectedId && query.trim() ? (
        <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 14, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: colors.surface }}>
          {results.length ? results.map((item, index) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              onPress={() => onSelect(item.id, lang === 'en' ? item.nameEn : item.nameTh)}
              style={({ pressed }) => ({ paddingHorizontal: 13, paddingVertical: 11, opacity: pressed ? 0.65 : 1, borderBottomWidth: index === results.length - 1 ? 0 : 1, borderBottomColor: colors.border })}
            >
              <Text selectable style={{ color: colors.text, fontWeight: '800', fontSize: 16 * multiplier }}>{lang === 'en' ? item.nameEn : item.nameTh}</Text>
              <Text selectable style={{ color: colors.muted, fontSize: 13 * multiplier }}>{lang === 'en' ? `${item.nameTh} · ${item.categoryEn || item.category}` : `${item.nameEn} · ${item.category}`}</Text>
              {item.description ? <Text selectable numberOfLines={2} style={{ color: colors.muted, fontSize: 12 * multiplier, lineHeight: 17 * multiplier }}>{lang === 'en' ? (item.descriptionEn || item.description) : item.description}</Text> : null}
            </Pressable>
          )) : (
            <Text selectable style={{ color: colors.muted, padding: 13, fontSize: 14 * multiplier }}>{lang === 'en' ? 'No matching medications found' : 'ไม่พบยาที่ตรงกับคำค้นหา'}</Text>
          )}
        </View>
      ) : null}
    </View>
  );
}
