import { useState } from 'react';
import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { FeatureIcon } from '@/components/feature-icon';
import { PrimaryButton, SectionCard, useFontMultiplier } from '@/components/ui';
import { colors, slots } from '@/constants/theme';
import { getMedicine } from '@/data/medicine-db';
import { rescheduleMedicationNotifications } from '@/services/notifications';
import { deleteRemoteMedication } from '@/services/sync';
import { useAppStore } from '@/store/use-app-store';
import { formatMedicineDose } from '@/utils/medicine-dose';
import { t, getSlotLabel, getMealTimingLabel } from '@/utils/i18n';

export default function CabinetScreen() {
  const profile = useAppStore((state) => state.profile);
  const cabinet = useAppStore((state) => state.cabinet);
  const stopMedicine = useAppStore((state) => state.stopMedicine);
  const resumeMedicine = useAppStore((state) => state.resumeMedicine);
  const removeMedicine = useAppStore((state) => state.removeMedicine);
  const lang = profile.language || 'th';

  const multiplier = useFontMultiplier();
  const [tab, setTab] = useState<'active' | 'stopped'>('active');
  const visible = cabinet.filter((item) => item.status === tab);

  const refreshNotifications = async () => {
    await rescheduleMedicationNotifications(useAppStore.getState().cabinet);
  };

  const remove = (id: string) => Alert.alert(
    t('delete_med_confirm_title', lang),
    t('delete_med_confirm_desc', lang),
    [
      { text: t('cancel', lang), style: 'cancel' },
      { text: t('delete', lang), style: 'destructive', onPress: () => { removeMedicine(id); void deleteRemoteMedication(id).catch((error: unknown) => console.warn('Remote delete deferred:', error)); void refreshNotifications(); } },
    ]
  );

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
      <View style={{ flexDirection: 'row', gap: 9 }}>
        {([['active', t('tab_active', lang)], ['stopped', t('tab_stopped', lang)]] as const).map(([value, label]) => (
          <Pressable key={value} onPress={() => setTab(value)} style={{ flex: 1, padding: 12, borderRadius: 14, borderCurve: 'continuous', backgroundColor: tab === value ? colors.primary : colors.surface, borderWidth: 1, borderColor: tab === value ? colors.primary : colors.border }}>
            <Text style={{ textAlign: 'center', fontWeight: '800', color: tab === value ? '#FFFFFF' : colors.text, fontSize: 16 * multiplier }}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <PrimaryButton label={t('add_med_to_cabinet', lang)} icon={<FeatureIcon name="add-medicine" size={30} />} onPress={() => router.push('/add-medicine')} />
      {visible.length === 0 ? (
        <SectionCard><Text selectable style={{ color: colors.muted, textAlign: 'center', fontSize: 16 * multiplier }}>{t('empty_category', lang)}</Text></SectionCard>
      ) : visible.map((item) => {
        const definition = getMedicine(item.medicineId);
        const medName = item.customName || (lang === 'en' ? definition?.nameEn : definition?.nameTh) || item.medicineId;
        return (
          <SectionCard key={item.id}>
            <View style={{ gap: 4 }}>
              <Text selectable style={{ color: colors.text, fontSize: 20 * multiplier, fontWeight: '900' }}>{medName}</Text>
              <Text selectable style={{ color: colors.muted, fontSize: 15 * multiplier }}>{definition?.nameEn} · {formatMedicineDose(item, lang)} · {getMealTimingLabel(item.mealTiming, lang)}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9, paddingTop: 3 }}>
                {item.schedules.map((slot) => (
                  <View key={slot} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <FeatureIcon name={slots[slot].icon} size={24} accessibilityLabel={getSlotLabel(slot, lang)} />
                    <Text selectable style={{ color: colors.primaryDark, fontSize: 14 * multiplier, fontWeight: '700' }}>{getSlotLabel(slot, lang)}</Text>
                  </View>
                ))}
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 9 }}>
              <View style={{ flex: 1 }}>
                <PrimaryButton label={item.status === 'active' ? t('pause_use', lang) : t('resume_use', lang)} tone="neutral" onPress={() => { if (item.status === 'active') stopMedicine(item.id); else resumeMedicine(item.id); void refreshNotifications(); }} />
              </View>
              <View style={{ flex: 1 }}>
                <PrimaryButton label={t('delete', lang)} tone="danger" onPress={() => remove(item.id)} />
              </View>
            </View>
          </SectionCard>
        );
      })}
    </ScrollView>
  );
}
