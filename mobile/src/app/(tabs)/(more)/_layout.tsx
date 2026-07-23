import { Stack } from 'expo-router/stack';

import { colors } from '@/constants/theme';
import { useAppStore } from '@/store/use-app-store';

export default function MoreLayout() {
  const profile = useAppStore((state) => state.profile);
  const lang = profile.language || 'th';

  return (
    <Stack screenOptions={{ contentStyle: { backgroundColor: colors.background }, headerShadowVisible: false, headerTintColor: colors.primaryDark }}>
      <Stack.Screen name="more" options={{ title: lang === 'en' ? 'More' : 'เพิ่มเติม', headerBackVisible: false }} />
      <Stack.Screen name="medication-history" options={{ title: lang === 'en' ? 'Medication History' : 'ประวัติการทานยา' }} />
    </Stack>
  );
}
