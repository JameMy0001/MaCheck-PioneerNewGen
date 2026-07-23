import { Stack } from 'expo-router/stack';

import { colors } from '@/constants/theme';
import { useAppStore } from '@/store/use-app-store';

export default function SafetyLayout() {
  const profile = useAppStore((state) => state.profile);
  const lang = profile.language || 'th';

  return (
    <Stack screenOptions={{ contentStyle: { backgroundColor: colors.background }, headerShadowVisible: false, headerTintColor: colors.primaryDark }}>
      <Stack.Screen name="safety" options={{ title: lang === 'en' ? 'Safety Check' : 'ตรวจความปลอดภัย', headerBackVisible: false }} />
      <Stack.Screen name="pair-checker" options={{ title: lang === 'en' ? 'Drug Pair Checker' : 'ตรวจคู่ยา' }} />
      <Stack.Screen name="interaction-directory" options={{ title: lang === 'en' ? 'Interaction Directory' : 'รายการคู่ยาที่ควรระวัง' }} />
    </Stack>
  );
}
