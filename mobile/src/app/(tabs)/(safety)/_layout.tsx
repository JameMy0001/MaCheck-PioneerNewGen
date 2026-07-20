import { Stack } from 'expo-router/stack';

import { colors } from '@/constants/theme';

export default function SafetyLayout() {
  return (
    <Stack screenOptions={{ contentStyle: { backgroundColor: colors.background }, headerShadowVisible: false, headerTintColor: colors.primaryDark }}>
      <Stack.Screen name="safety" options={{ title: 'ตรวจความปลอดภัย', headerBackVisible: false }} />
      <Stack.Screen name="pair-checker" options={{ title: 'ตรวจคู่ยา' }} />
      <Stack.Screen name="interaction-directory" options={{ title: 'รายการคู่ยาที่ควรระวัง' }} />
    </Stack>
  );
}
