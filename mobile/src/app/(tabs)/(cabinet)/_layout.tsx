import { Stack } from 'expo-router/stack';

import { colors } from '@/constants/theme';

export default function CabinetLayout() {
  return (
    <Stack screenOptions={{ contentStyle: { backgroundColor: colors.background }, headerShadowVisible: false, headerTintColor: colors.primaryDark }}>
      <Stack.Screen name="cabinet" options={{ title: 'ตู้ยาของฉัน', headerBackVisible: false }} />
    </Stack>
  );
}
