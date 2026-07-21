import { useState } from 'react';
import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, Switch, Text, View } from 'react-native';

import { Field, PrimaryButton, SectionCard, useFontMultiplier } from '@/components/ui';
import { colors, diseaseOptions } from '@/constants/theme';
import { useAppStore } from '@/store/use-app-store';
import { deleteAccount, signOut } from '@/services/auth';
import type { FontScale } from '@/types/models';

import { useAgentStore } from '@/store/use-agent-store';

export default function SettingsScreen() {
  const profile = useAppStore((state) => state.profile);
  const updateProfile = useAppStore((state) => state.updateProfile);
  const setFontScale = useAppStore((state) => state.setFontScale);
  const toggleDisease = useAppStore((state) => state.toggleDisease);
  const addAllergy = useAppStore((state) => state.addAllergy);
  const removeAllergy = useAppStore((state) => state.removeAllergy);
  const reset = useAppStore((state) => state.reset);

  const isBubbleVisible = useAgentStore((state) => state.isBubbleVisible);
  const setBubbleVisible = useAgentStore((state) => state.setBubbleVisible);

  const multiplier = useFontMultiplier();
  const [allergy, setAllergy] = useState('');

  const resetAll = () => Alert.alert('ลบข้อมูลในเครื่องทั้งหมด?', 'ตู้ยา ประวัติ และโปรไฟล์จะถูกลบออกจากอุปกรณ์นี้', [
    { text: 'ยกเลิก', style: 'cancel' },
    { text: 'ลบข้อมูล', style: 'destructive', onPress: () => { void signOut().finally(() => { reset(); router.replace('/register'); }); } },
  ]);
  const deleteCloudAccount = () => Alert.alert('ลบบัญชีถาวร?', 'บัญชี ตู้ยา โรค แพ้ยา และประวัติที่ซิงก์ไว้จะถูกลบจากฐานกลางและไม่สามารถกู้คืนได้', [
    { text: 'ยกเลิก', style: 'cancel' },
    { text: 'ลบบัญชีถาวร', style: 'destructive', onPress: () => { void deleteAccount().then(() => { reset(); router.replace('/register'); }).catch((error) => Alert.alert('ลบไม่สำเร็จ', error instanceof Error ? error.message : 'กรุณาลองใหม่')); } },
  ]);

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 44 }}>
      <SectionCard title="โปรไฟล์">
        <Field label="Username" value={profile.username} editable={false} />
        <Field label="ชื่อที่ใช้เรียกบนอุปกรณ์นี้" value={profile.displayName} onChangeText={(displayName) => updateProfile({ displayName })} />
        <Field
          label="น้ำหนักตัวล่าสุด (กก.)"
          value={profile.weightKg ? String(profile.weightKg) : ''}
          onChangeText={(val) => {
            const num = parseFloat(val);
            updateProfile({ weightKg: isNaN(num) ? undefined : num });
          }}
          placeholder="เช่น 65"
          keyboardType="numeric"
        />
        <Text selectable style={{ color: colors.muted, lineHeight: 20 }}>ชื่อที่ใช้เรียก น้ำหนักตัว และผู้ติดต่อฉุกเฉินจะเก็บปลอดภัยบนอุปกรณ์และนำไปใช้คำนวณความปลอดภัย AI</Text>
      </SectionCard>

      <SectionCard title="โรคประจำตัว">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {diseaseOptions.map((item) => {
            const active = profile.diseases.includes(item.id);
            return <Pressable key={item.id} onPress={() => toggleDisease(item.id)} style={{ paddingHorizontal: 13, paddingVertical: 10, borderRadius: 999, backgroundColor: active ? colors.primary : colors.surface, borderWidth: 1, borderColor: active ? colors.primary : colors.border }}><Text style={{ color: active ? '#FFFFFF' : colors.text, fontWeight: '700' }}>{item.label}</Text></Pressable>;
          })}
        </View>
      </SectionCard>

      <SectionCard title="ประวัติแพ้ยา">
        <Field label="ชื่อยาหรือกลุ่มยาที่แพ้" value={allergy} onChangeText={setAllergy} placeholder="เช่น Penicillin" />
        <PrimaryButton label="เพิ่มประวัติแพ้ยา" tone="neutral" onPress={() => { addAllergy(allergy); setAllergy(''); }} disabled={!allergy.trim()} />
        {profile.allergies.map((item) => (
          <View key={item} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: 11, backgroundColor: colors.dangerSoft, borderRadius: 12, borderCurve: 'continuous' }}>
            <Text selectable style={{ color: colors.danger, fontWeight: '800', fontSize: 16 * multiplier }}>{item}</Text>
            <Pressable accessibilityRole="button" onPress={() => removeAllergy(item)}><Text style={{ color: colors.danger, fontWeight: '900' }}>ลบ</Text></Pressable>
          </View>
        ))}
      </SectionCard>

      <SectionCard title="ผู้ติดต่อฉุกเฉิน">
        <Field label="ชื่อผู้ติดต่อ" value={profile.emergencyName} onChangeText={(emergencyName) => updateProfile({ emergencyName })} />
        <Field label="เบอร์โทรฉุกเฉิน" value={profile.emergencyPhone} onChangeText={(emergencyPhone) => updateProfile({ emergencyPhone })} keyboardType="phone-pad" />
      </SectionCard>

      <SectionCard title="การเข้าถึงและการแสดงผล AI">
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {([['normal', 'ปกติ'], ['large', 'ใหญ่'], ['xlarge', 'ใหญ่มาก']] as const).map(([value, label]) => (
            <Pressable key={value} onPress={() => setFontScale(value as FontScale)} style={{ flex: 1, padding: 11, borderRadius: 12, borderCurve: 'continuous', backgroundColor: profile.fontScale === value ? colors.primary : colors.surface, borderWidth: 1, borderColor: profile.fontScale === value ? colors.primary : colors.border }}><Text style={{ color: profile.fontScale === value ? '#FFFFFF' : colors.text, fontWeight: '800', textAlign: 'center' }}>{label}</Text></Pressable>
          ))}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text selectable style={{ color: colors.text, fontSize: 17 * multiplier, fontWeight: '800' }}>แสดงปุ่มลอย AI Care Agent</Text>
            <Text selectable style={{ color: colors.muted }}>แสดงปุ่มลอยที่ลากเคลื่อนย้ายได้บนหน้าจอมือถือ</Text>
          </View>
          <Switch value={isBubbleVisible} onValueChange={(val) => setBubbleVisible(val)} trackColor={{ true: colors.primary }} />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <View style={{ flex: 1 }}><Text selectable style={{ color: colors.text, fontSize: 17 * multiplier, fontWeight: '800' }}>อ่านคำเตือนด้วยเสียง</Text><Text selectable style={{ color: colors.muted }}>ใช้เสียงภาษาไทยในหน้าตรวจอาหาร</Text></View>
          <Switch value={profile.soundEnabled} onValueChange={(soundEnabled) => updateProfile({ soundEnabled })} trackColor={{ true: colors.primary }} />
        </View>
      </SectionCard>

      <PrimaryButton label="ลบข้อมูลทั้งหมดในเครื่อง" tone="danger" onPress={resetAll} />
      <PrimaryButton label="ลบบัญชีและข้อมูลบนฐานกลางถาวร" tone="danger" onPress={deleteCloudAccount} />
      <Text selectable style={{ color: colors.muted, textAlign: 'center', lineHeight: 20 }}>การลบข้อมูลในเครื่องจะออกจากระบบ แต่ไม่ลบบัญชีหรือข้อมูลสำรองบนฐานกลาง</Text>
    </ScrollView>
  );
}
