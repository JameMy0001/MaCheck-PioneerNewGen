import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { Platform } from 'react-native';

import { getMyCaregiverNudges } from '@/services/caregiver';
import { requestNotificationPermission } from '@/services/notifications';
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

function openInboxFromNotification(response: Notifications.NotificationResponse) {
  if (response.notification.request.content.data?.type !== 'caregiver_message') return;
  router.push('/caregiver-messages');
}

export async function startCaregiverMessaging() {
  stopCaregiverMessaging();
  await refreshCaregiverInbox().catch(() => undefined);

  const receiveSubscription = Notifications.addNotificationReceivedListener((notification) => {
    if (notification.request.content.data?.type === 'caregiver_message') void refreshCaregiverInbox().catch(() => undefined);
  });
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(openInboxFromNotification);

  stopActiveMessaging = () => {
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
