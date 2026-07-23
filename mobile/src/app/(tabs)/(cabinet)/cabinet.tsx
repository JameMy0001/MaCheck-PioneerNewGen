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

export default function CabinetScreen() {
  const cabinet = useAppStore((state) => state.cabinet);
  const stopMedicine = useAppStore((state) => state.stopMedicine);
  const resumeMedicine = useAppStore((state) => state.resumeMedicine);
  const removeMedicine = useAppStore((state) => state.removeMedicine);
  const multiplier = useFontMultiplier();
  const [tab, setTab] = useState<'active' | 'stopped'>('active');
  const visible = cabinet.filter((item) => item.status === tab);

  const refreshNotifications = async () => {
    await rescheduleMedicationNotifications(useAppStore.getState().cabinet);
  };

  const remove = (id: string) => Alert.alert('ลบรายการยานี้?', 'ข้อมูลการตั้งเวลาของรายการนี้จะถูกลบออกจากเครื่อง', [
    { text: 'ยกเลิก', style: 'cancel' },
    { text: 'ลบ', style: 'destructive', onPress: () => { removeMedicine(id); void deleteRemoteMedication(id).catch((error: unknown) => console.warn('Remote delete deferred:', error)); void refreshNotifications(); } },
  ]);

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
      <View style={{ flexDirection: 'row', gap: 9 }}>
        {([['active', 'กำลังใช้'], ['stopped', 'หยุดแล้ว']] as const).map(([value, label]) => (
          <Pressable key={value} onPress={() => setTab(value)} style={{ flex: 1, padding: 12, borderRadius: 14, borderCurve: 'continuous', backgroundColor: tab === value ? colors.primary : colors.surface, borderWidth: 1, borderColor: tab === value ? colors.primary : colors.border }}>
            <Text style={{ textAlign: 'center', fontWeight: '800', color: tab === value ? '#FFFFFF' : colors.text, fontSize: 16 * multiplier }}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <PrimaryButton label="เพิ่มยาเข้าตู้" icon={<FeatureIcon name="add-medicine" size={30} />} onPress={() => router.push('/add-medicine')} />
      {visible.length === 0 ? (
        <SectionCard><Text selectable style={{ color: colors.muted, textAlign: 'center', fontSize: 16 * multiplier }}>ยังไม่มีรายการในหมวดนี้</Text></SectionCard>
      ) : visible.map((item) => {
        const definition = getMedicine(item.medicineId);
        return (
          <SectionCard key={item.id}>
            <View style={{ gap: 4 }}>
              <Text selectable style={{ color: colors.text, fontSize: 20 * multiplier, fontWeight: '900' }}>{item.customName || definition?.nameTh || item.medicineId}</Text>
              <Text selectable style={{ color: colors.muted, fontSize: 15 * multiplier }}>{definition?.nameEn} · {formatMedicineDose(item)}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9, paddingTop: 3 }}>
                {item.schedules.map((slot) => (
                  <View key={slot} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <FeatureIcon name={slots[slot].icon} size={24} accessibilityLabel={`ช่วง${slots[slot].label}`} />
                    <Text selectable style={{ color: colors.primaryDark, fontSize: 14 * multiplier, fontWeight: '700' }}>{slots[slot].label}</Text>
                  </View>
                ))}
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 9 }}>
              <View style={{ flex: 1 }}><PrimaryButton label={item.status === 'active' ? 'หยุดใช้' : 'กลับมาใช้'} tone="neutral" onPress={() => { if (item.status === 'active') stopMedicine(item.id); else resumeMedicine(item.id); void refreshNotifications(); }} /></View>
              <View style={{ flex: 1 }}><PrimaryButton label="ลบ" tone="danger" onPress={() => remove(item.id)} /></View>
            </View>
          </SectionCard>
        );
      })}
    </ScrollView>
  );
}
