import * as Notifications from 'expo-notifications';

import { getMedicine } from '@/data/medicine-db';
import { slots } from '@/constants/theme';
import type { CabinetMedicine } from '@/types/models';
import { formatMedicineDose } from '@/utils/medicine-dose';

Notifications.setNotificationHandler({
  handleNotification: async (notification) => ({
    shouldPlaySound: true,
    shouldSetBadge: notification.request.content.data?.type === 'caregiver_message',
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function ensureNotificationChannels() {
  if (process.env.EXPO_OS === 'android') {
    await Notifications.setNotificationChannelAsync('medication-reminders', {
      name: 'เตือนกินยา',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#216E63',
    });
    await Notifications.setNotificationChannelAsync('caregiver-messages', {
      name: 'ข้อความจากผู้ดูแล',
      description: 'แจ้งเตือนเมื่อผู้ดูแลระยะไกลส่งข้อความใหม่',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 120, 250],
      lightColor: '#216E63',
    });
  }
}

export async function requestNotificationPermission() {
  await ensureNotificationChannels();
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function rescheduleMedicationNotifications(medicines: CabinetMedicine[]) {
  const allowed = await requestNotificationPermission();
  if (!allowed) return false;

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(scheduled
    .filter((notification) => notification.content.data?.type === 'medication_reminder')
    .map((notification) => Notifications.cancelScheduledNotificationAsync(notification.identifier)));
  for (const cabinetMedicine of medicines.filter((item) => item.status === 'active')) {
    const definition = getMedicine(cabinetMedicine.medicineId);
    const displayName = cabinetMedicine.customName || definition?.nameTh || cabinetMedicine.medicineId;
    for (const slot of cabinetMedicine.schedules) {
      const schedule = slots[slot];
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `ถึงเวลากินยา · ช่วง${schedule.label}`,
          body: `${displayName} ${formatMedicineDose(cabinetMedicine)}`,
          sound: 'default',
          data: { type: 'medication_reminder', medicineId: cabinetMedicine.id, slot },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          channelId: process.env.EXPO_OS === 'android' ? 'medication-reminders' : undefined,
          hour: schedule.time.hour,
          minute: schedule.time.minute,
        },
      });
    }
  }
  return true;
}

export async function presentCaregiverMessageNotification(messageId: string, text: string) {
  const allowed = await requestNotificationPermission();
  if (!allowed) return false;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'ข้อความใหม่จากผู้ดูแล',
      body: text,
      sound: 'default',
      data: { type: 'caregiver_message', messageId, url: '/caregiver-messages' },
    },
    trigger: null,
  });
  return true;
}
