import { Stack } from 'expo-router/stack';

import { colors } from '@/constants/theme';

export default function AddLayout() {
  return (
    <Stack screenOptions={{ contentStyle: { backgroundColor: colors.background }, headerShadowVisible: false, headerTintColor: colors.primaryDark }}>
      <Stack.Screen name="add-medicine" options={{ title: 'เพิ่มยา', headerBackVisible: false }} />
    </Stack>
  );
}
