import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { colors } from '@/constants/theme';
import { refreshClinicalCatalog } from '@/services/clinical-catalog';
import { startCaregiverMessaging, stopCaregiverMessaging } from '@/services/caregiver-messaging';
import { rescheduleMedicationNotifications } from '@/services/notifications';
import { pullMaCheckSnapshot, pushMaCheckSnapshot } from '@/services/sync';
import { useAppStore } from '@/store/use-app-store';

import { DraggableAgentButton } from '@/components/agent/draggable-agent-button';

export default function RootLayout() {
  const hydrated = useAppStore((state) => state.hydrated);
  const authenticated = useAppStore((state) => state.authenticated);
  const registered = useAppStore((state) => state.registered);
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
        const remote = await pullMaCheckSnapshot();
        if (remote) useAppStore.getState().mergeRemoteSnapshot({
          cabinet: remote.cabinet,
          archivedCabinet: remote.archivedCabinet ?? {},
          takenByDate: remote.takenByDate,
        });
        const currentCabinet = useAppStore.getState().cabinet;
        if (currentCabinet.some((medicine) => medicine.status === 'active')) {
          await rescheduleMedicationNotifications(currentCabinet).catch((error) => console.warn('Medication reminders refresh deferred:', error));
        }
        await startCaregiverMessaging();
      } catch (error) {
        console.warn('Initial sync deferred:', error);
      }
    };

    setAuthState(true, true);
    void startSync();

    const storeSubscription = useAppStore.subscribe((state, previous) => {
      if (!state.authenticated || !state.hydrated) return;
      if (state.profile === previous.profile && state.cabinet === previous.cabinet && state.takenByDate === previous.takenByDate) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void pushMaCheckSnapshot({ profile: state.profile, cabinet: state.cabinet, takenByDate: state.takenByDate }).catch((error: unknown) => console.warn('Sync deferred:', error));
      }, 1200);
    });
    return () => {
      if (timer) clearTimeout(timer);
      storeSubscription();
      stopCaregiverMessaging();
    };
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated || !authenticated) return;
    const currentCabinet = useAppStore.getState().cabinet;
    if (!currentCabinet.some((medicine) => medicine.status === 'active')) return;
    void rescheduleMedicationNotifications(currentCabinet).catch((error) => console.warn('Medication reminders restore deferred:', error));
  }, [authenticated, hydrated]);

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
        <Stack.Screen name="agent-run" options={{ title: 'AI Care Agent', headerShown: false }} />
      </Stack>
      {authenticated && registered ? <DraggableAgentButton /> : null}
    </>
  );
}
