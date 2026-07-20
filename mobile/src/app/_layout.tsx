import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { colors } from '@/constants/theme';
import { refreshClinicalCatalog } from '@/services/clinical-catalog';
import { startCaregiverMessaging, stopCaregiverMessaging } from '@/services/caregiver-messaging';
import { supabase } from '@/services/supabase';
import { pullYaCheckSnapshot, pushYaCheckSnapshot } from '@/services/sync';
import { useAppStore } from '@/store/use-app-store';

export default function RootLayout() {
  const hydrated = useAppStore((state) => state.hydrated);
  useEffect(() => {
    if (!hydrated) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let syncStarted = false;
    const setAuthState = useAppStore.getState().setAuthState;

    const startSync = async () => {
      if (syncStarted) return;
      syncStarted = true;
      try {
        await refreshClinicalCatalog().catch((error) => console.warn('Clinical catalogue refresh deferred:', error));
        const remote = await pullYaCheckSnapshot();
        if (remote) useAppStore.getState().mergeRemoteSnapshot({
          profile: remote.profile ? {
            role: remote.profile.role,
            diseases: remote.profile.diseases ?? [],
            allergies: (remote.profile.allergies ?? []).map((item: { name?: string }) => item.name).filter(Boolean) as string[],
            fontScale: remote.profile.font_scale,
            soundEnabled: remote.profile.sound_enabled,
          } : undefined,
          cabinet: remote.cabinet,
          archivedCabinet: remote.archivedCabinet,
          takenByDate: remote.takenByDate,
        });
        await startCaregiverMessaging();
      } catch (error) {
        console.warn('Initial sync deferred:', error);
      }
    };

    void supabase.auth.getSession().then(({ data }) => {
      const authenticated = Boolean(data.session);
      setAuthState(true, authenticated);
      if (authenticated) void startSync();
      else stopCaregiverMessaging();
    });
    const authSubscription = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthState(true, Boolean(session));
      if (session) void startSync();
      else stopCaregiverMessaging();
    });
    const storeSubscription = useAppStore.subscribe((state, previous) => {
      if (!state.authenticated || !state.hydrated) return;
      if (state.profile === previous.profile && state.cabinet === previous.cabinet && state.takenByDate === previous.takenByDate) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void pushYaCheckSnapshot({ profile: state.profile, cabinet: state.cabinet, takenByDate: state.takenByDate }).catch((error) => console.warn('Sync deferred:', error));
      }, 1200);
    });
    return () => {
      if (timer) clearTimeout(timer);
      authSubscription.data.subscription.unsubscribe();
      storeSubscription();
      stopCaregiverMessaging();
    };
  }, [hydrated]);

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.background },
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.primaryDark,
          headerBackButtonDisplayMode: 'minimal',
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ title: 'เริ่มต้นใช้งาน', headerBackVisible: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="scanner" options={{ title: 'สแกนฉลากยา' }} />
        <Stack.Screen name="caregiver" options={{ title: 'ผู้ดูแลและฉุกเฉิน' }} />
        <Stack.Screen name="caregiver-messages" options={{ title: 'ข้อความจากผู้ดูแล' }} />
        <Stack.Screen name="settings" options={{ title: 'ตั้งค่าและโปรไฟล์' }} />
      </Stack>
    </>
  );
}
