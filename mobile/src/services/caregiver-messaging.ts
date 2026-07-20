import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { Platform } from 'react-native';

import { getMyCaregiverNudges, mapCaregiverNudge } from '@/services/caregiver';
import { presentCaregiverMessageNotification, requestNotificationPermission } from '@/services/notifications';
import { supabase } from '@/services/supabase';
import { selectUnreadCaregiverMessageCount, useCaregiverInboxStore } from '@/store/use-caregiver-inbox-store';

let stopActiveMessaging: (() => void) | undefined;

async function updateBadgeCount() {
  if (Platform.OS === 'web') return;
  const unread = selectUnreadCaregiverMessageCount(useCaregiverInboxStore.getState());
  await Notifications.setBadgeCountAsync(unread).catch(() => false);
}

export async function refreshCaregiverInbox() {
  const store = useCaregiverInboxStore.getState();
  store.setLoading(true);
  try {
    store.setMessages(await getMyCaregiverNudges());
    await updateBadgeCount();
  } catch (error) {
    store.setLoading(false);
    store.setError(error instanceof Error ? error.message : 'โหลดข้อความจากผู้ดูแลไม่สำเร็จ');
    throw error;
  }
}

async function registerPushToken() {
  if (Platform.OS === 'web') return false;
  const allowed = await requestNotificationPermission();
  if (!allowed) return false;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return false;
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  const { error } = await supabase.rpc('register_user_push_token', {
    p_expo_push_token: token,
    p_platform: Platform.OS,
  });
  if (error) throw error;
  return true;
}

function openInboxFromNotification(response: Notifications.NotificationResponse) {
  if (response.notification.request.content.data?.type !== 'caregiver_message') return;
  router.push('/caregiver-messages');
}

export async function startCaregiverMessaging() {
  stopCaregiverMessaging();
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) return;

  await refreshCaregiverInbox().catch(() => undefined);
  const pushReady = await registerPushToken().catch((error) => {
    console.warn('Push registration deferred:', error);
    return false;
  });

  const channel = supabase
    .channel(`caregiver-messages:${userId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'caregiver_nudges', filter: `patient_user_id=eq.${userId}` },
      (payload) => {
        const message = mapCaregiverNudge(payload.new as Record<string, unknown>);
        useCaregiverInboxStore.getState().upsertMessage(message);
        void updateBadgeCount();
        if (!pushReady) void presentCaregiverMessageNotification(message.id, message.text).catch(() => undefined);
      },
    )
    .subscribe();

  const receiveSubscription = Notifications.addNotificationReceivedListener((notification) => {
    if (notification.request.content.data?.type === 'caregiver_message') void refreshCaregiverInbox().catch(() => undefined);
  });
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(openInboxFromNotification);
  const lastResponse = await Notifications.getLastNotificationResponseAsync().catch(() => null);
  if (lastResponse?.notification.request.content.data?.type === 'caregiver_message') {
    setTimeout(() => openInboxFromNotification(lastResponse), 200);
    await Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
  }

  stopActiveMessaging = () => {
    void supabase.removeChannel(channel);
    receiveSubscription.remove();
    responseSubscription.remove();
  };
}

export function stopCaregiverMessaging() {
  stopActiveMessaging?.();
  stopActiveMessaging = undefined;
  useCaregiverInboxStore.getState().reset();
}

export async function markCaregiverMessageReadLocally(messageId: string, readAt = new Date().toISOString()) {
  useCaregiverInboxStore.getState().markRead(messageId, readAt);
  await updateBadgeCount();
}
