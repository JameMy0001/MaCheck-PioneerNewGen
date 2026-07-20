import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Linking, ScrollView, Text, View } from 'react-native';

import { FeatureIcon } from '@/components/feature-icon';
import { ActionTile, PrimaryButton } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useAppStore } from '@/store/use-app-store';

export default function MoreScreen() {
  const profile = useAppStore((state) => state.profile);

  const callEmergency = () => {
    const phone = profile.emergencyPhone.replace(/[^\d+]/g, '');
    if (phone) void Linking.openURL(`tel:${phone}`);
    else router.push('/caregiver');
  };

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
      <View style={{ gap: 10 }}>
        <ActionTile icon={<FeatureIcon name="medication-history" size={40} />} title="ประวัติการทานยา" subtitle="ดูย้อนหลัง 7 วันหรือ 30 วัน และแชร์สรุป" onPress={() => router.push('./medication-history')} />
        <ActionTile icon={<FeatureIcon name="medicine-scanner" size={40} />} title="สแกนยา" subtitle="อ่านบาร์โค้ดหรือค้นหาจากชื่อยา" onPress={() => router.push('/scanner')} />
        <ActionTile icon={<FeatureIcon name="remote-caregiver" size={40} />} title="ผู้ดูแลระยะไกลและฉุกเฉิน" subtitle="เชิญผู้ดูแล ดูข้อมูลข้ามบัญชี และส่งข้อความเตือน" onPress={() => router.push('/caregiver')} />
        <ActionTile icon={<SymbolView name={{ ios: 'bell.fill', android: 'notifications' }} size={32} tintColor={colors.primaryDark} style={{ width: 36, height: 36 }} />} title="ข้อความจากผู้ดูแล" subtitle="ดูข้อความใหม่และประวัติข้อความย้อนหลัง" onPress={() => router.push('/caregiver-messages')} />
        <ActionTile icon={<FeatureIcon name="settings" size={40} />} title="ตั้งค่า" subtitle="โปรไฟล์ โรคประจำตัว และประวัติแพ้ยา" onPress={() => router.push('/settings')} />
      </View>

      <PrimaryButton label={profile.emergencyPhone ? `โทรฉุกเฉิน: ${profile.emergencyName || profile.emergencyPhone}` : 'ตั้งค่าผู้ติดต่อฉุกเฉิน'} tone="danger" onPress={callEmergency} />
      <Text selectable style={{ color: colors.muted, textAlign: 'center', lineHeight: 20 }}>หากมีอาการรุนแรง เช่น หายใจลำบาก หมดสติ หรือเลือดออกมาก โทร 1669 ทันที</Text>
    </ScrollView>
  );
}
