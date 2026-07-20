import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { colors } from '@/constants/theme';
import { useAppStore } from '@/store/use-app-store';

export default function IndexScreen() {
  const hydrated = useAppStore((state) => state.hydrated);
  const registered = useAppStore((state) => state.registered);
  const authReady = useAppStore((state) => state.authReady);
  const authenticated = useAppStore((state) => state.authenticated);

  if (!hydrated || !authReady) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={colors.primary} size="large" /></View>;
  }
  return <Redirect href={registered && authenticated ? '/home' : '/register'} />;
}
