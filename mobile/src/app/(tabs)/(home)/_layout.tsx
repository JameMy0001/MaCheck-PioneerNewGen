import { Stack } from 'expo-router/stack';

import { CaregiverBellButton } from '@/components/caregiver-bell-button';
import { colors } from '@/constants/theme';

export default function HomeLayout() {
  return (
    <Stack screenOptions={{ contentStyle: { backgroundColor: colors.background }, headerShadowVisible: false, headerTintColor: colors.primaryDark }}>
      <Stack.Screen
        name="home"
        options={{
          title: 'MaCheck',
          headerBackVisible: false,
          headerRight: () => <CaregiverBellButton />,
        }}
      />
    </Stack>
  );
}
