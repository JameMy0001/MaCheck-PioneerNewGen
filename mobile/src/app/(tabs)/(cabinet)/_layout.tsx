import { Stack } from 'expo-router/stack';

import { colors } from '@/constants/theme';
import { useAppStore } from '@/store/use-app-store';

export default function CabinetLayout() {
  const profile = useAppStore((state) => state.profile);
  const lang = profile.language || 'th';

  return (
    <Stack screenOptions={{ contentStyle: { backgroundColor: colors.background }, headerShadowVisible: false, headerTintColor: colors.primaryDark }}>
      <Stack.Screen name="cabinet" options={{ title: lang === 'en' ? 'My Medicine Cabinet' : 'ตู้ยาของฉัน', headerBackVisible: false }} />
    </Stack>
  );
}
