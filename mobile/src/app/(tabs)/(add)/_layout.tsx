import { Stack } from 'expo-router/stack';

import { colors } from '@/constants/theme';
import { useAppStore } from '@/store/use-app-store';

export default function AddLayout() {
  const profile = useAppStore((state) => state.profile);
  const lang = profile.language || 'th';

  return (
    <Stack screenOptions={{ contentStyle: { backgroundColor: colors.background }, headerShadowVisible: false, headerTintColor: colors.primaryDark }}>
      <Stack.Screen name="add-medicine" options={{ title: lang === 'en' ? 'Add Medication' : 'เพิ่มยา', headerBackVisible: false }} />
    </Stack>
  );
}
