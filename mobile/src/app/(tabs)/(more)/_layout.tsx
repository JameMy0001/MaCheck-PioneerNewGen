import { Stack } from 'expo-router/stack';

import { colors } from '@/constants/theme';

export default function MoreLayout() {
  return (
    <Stack screenOptions={{ contentStyle: { backgroundColor: colors.background }, headerShadowVisible: false, headerTintColor: colors.primaryDark }}>
      <Stack.Screen name="more" options={{ title: 'เพิ่มเติม', headerBackVisible: false }} />
      <Stack.Screen name="medication-history" options={{ title: 'ประวัติการทานยา' }} />
    </Stack>
  );
}
