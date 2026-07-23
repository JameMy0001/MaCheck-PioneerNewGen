import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';

import { FeatureIcon } from '@/components/feature-icon';
import { PrimaryButton, SectionCard, useFontMultiplier } from '@/components/ui';
import { colors } from '@/constants/theme';
import {
  getCaregiverRelationships,
  markCaregiverNudgeRead,
  type CaregiverRelationship,
} from '@/services/caregiver';
import { markCaregiverMessageReadLocally, refreshCaregiverInbox } from '@/services/caregiver-messaging';
import { useCaregiverInboxStore } from '@/store/use-caregiver-inbox-store';
import { useAppStore } from '@/store/use-app-store';

function formatDateTime(value: string, lang: 'th' | 'en' = 'th') {
  return new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function CaregiverMessagesScreen() {
  const messages = useCaregiverInboxStore((state) => state.messages);
  const loading = useCaregiverInboxStore((state) => state.loading);
  const inboxError = useCaregiverInboxStore((state) => state.error);
  const multiplier = useFontMultiplier();
  const profile = useAppStore((state) => state.profile);
  const lang = profile.language || 'th';
  const [relationships, setRelationships] = useState<CaregiverRelationship[]>([]);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setError('');
    try {
      const [nextRelationships] = await Promise.all([
        getCaregiverRelationships(),
        refreshCaregiverInbox(),
      ]);
      setRelationships(nextRelationships);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : (lang === 'en' ? 'Failed to load messages' : 'โหลดข้อความไม่สำเร็จ'));
    }
  }, [lang]);

  useEffect(() => {
    const timer = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(timer);
  }, [refresh]);

  const caregiverNames = useMemo(() => new Map(
    relationships
      .filter((item) => item.kind === 'active_caregiver')
      .map((item) => [item.otherUserId, item.username]),
  ), [relationships]);
  const unreadMessages = messages.filter((message) => !message.readAt);

  const markRead = async (messageId: string) => {
    setBusyId(messageId);
    setError('');
    try {
      await markCaregiverNudgeRead(messageId);
      await markCaregiverMessageReadLocally(messageId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : (lang === 'en' ? 'Failed to mark as read' : 'บันทึกสถานะอ่านแล้วไม่สำเร็จ'));
    } finally {
      setBusyId('');
    }
  };

  const markAllRead = async () => {
    setBusyId('all');
    setError('');
    try {
      for (const message of unreadMessages) {
        await markCaregiverNudgeRead(message.id);
        await markCaregiverMessageReadLocally(message.id);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : (lang === 'en' ? 'Failed to mark as read' : 'บันทึกสถานะอ่านแล้วไม่สำเร็จ'));
    } finally {
      setBusyId('');
    }
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void refresh()} tintColor={colors.primary} />}
      contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 46 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 54, height: 54, borderRadius: 17, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
          <FeatureIcon name="remote-caregiver" size={43} accessibilityLabel={lang === 'en' ? 'Caregiver Messages' : 'ข้อความจากผู้ดูแล'} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text selectable style={{ color: colors.text, fontSize: 24 * multiplier, fontWeight: '900' }}>{lang === 'en' ? 'Caregiver Messages' : 'ข้อความจากผู้ดูแล'}</Text>
          <Text selectable style={{ color: colors.muted, fontSize: 14 * multiplier }}>{unreadMessages.length ? (lang === 'en' ? `${unreadMessages.length} unread message(s)` : `ยังไม่ได้อ่าน ${unreadMessages.length} ข้อความ`) : (lang === 'en' ? 'All read' : 'อ่านครบแล้ว')}</Text>
        </View>
      </View>

      <View style={{ borderRadius: 15, padding: 14, backgroundColor: colors.warningSoft, borderWidth: 1, borderColor: colors.warning }}>
        <Text selectable style={{ color: colors.warning, fontWeight: '900', fontSize: 15 * multiplier }}>{lang === 'en' ? 'These messages are NOT medical orders' : 'ข้อความนี้ไม่ใช่คำสั่งจากแพทย์'}</Text>
        <Text selectable style={{ color: colors.text, marginTop: 4, lineHeight: 21 * multiplier, fontSize: 14 * multiplier }}>{lang === 'en' ? 'Do not add, stop, change medications, or adjust dosages based on these messages. Always verify with your doctor or pharmacist first.' : 'อย่าเพิ่ม หยุด เปลี่ยนยา หรือเปลี่ยนจำนวนยาจากข้อความ ให้ตรวจสอบกับแพทย์หรือเภสัชกรก่อนเสมอ'}</Text>
      </View>

      {error || inboxError ? (
        <View accessibilityRole="alert" style={{ borderRadius: 14, padding: 13, backgroundColor: colors.dangerSoft }}>
          <Text selectable style={{ color: colors.danger, fontWeight: '700' }}>{error || inboxError}</Text>
        </View>
      ) : null}

      {unreadMessages.length ? (
        <PrimaryButton label={busyId === 'all' ? (lang === 'en' ? 'Saving…' : 'กำลังบันทึก…') : (lang === 'en' ? 'Mark all as read' : 'ทำเครื่องหมายว่าอ่านทั้งหมด')} tone="neutral" disabled={Boolean(busyId)} onPress={() => void markAllRead()} />
      ) : null}

      {messages.map((message) => {
        const username = caregiverNames.get(message.caregiverUserId);
        const unread = !message.readAt;
        return (
          <SectionCard key={message.id} title={username ? (lang === 'en' ? `From @${username}` : `จาก @${username}`) : (lang === 'en' ? 'From Caregiver' : 'จากผู้ดูแล')}>
            <Text selectable style={{ color: colors.text, fontSize: 17 * multiplier, lineHeight: 25 * multiplier }}>{message.text}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <Text selectable style={{ flex: 1, color: colors.muted, fontSize: 13 * multiplier }}>{formatDateTime(message.createdAt, lang)}</Text>
              <Text style={{ color: unread ? colors.primaryDark : colors.success, fontWeight: '800', fontSize: 12 * multiplier }}>{unread ? (lang === 'en' ? 'New' : 'ข้อความใหม่') : (lang === 'en' ? 'Read' : 'อ่านแล้ว')}</Text>
            </View>
            {unread ? (
              <PrimaryButton label={busyId === message.id ? (lang === 'en' ? 'Saving…' : 'กำลังบันทึก…') : (lang === 'en' ? 'Acknowledge' : 'รับทราบ')} tone="neutral" disabled={Boolean(busyId)} onPress={() => void markRead(message.id)} />
            ) : null}
          </SectionCard>
        );
      })}

      {!loading && !messages.length ? (
        <View style={{ alignItems: 'center', gap: 8, paddingVertical: 36 }}>
          <FeatureIcon name="remote-caregiver" size={70} accessibilityLabel={lang === 'en' ? 'No messages yet' : 'ยังไม่มีข้อความ'} />
          <Text selectable style={{ color: colors.text, fontSize: 18 * multiplier, fontWeight: '900' }}>{lang === 'en' ? 'No Messages Yet' : 'ยังไม่มีข้อความ'}</Text>
          <Text selectable style={{ color: colors.muted, textAlign: 'center', lineHeight: 21 * multiplier }}>{lang === 'en' ? 'When an authorized caregiver sends a message, it will appear here and a notification bell will show on the home screen.' : 'เมื่อผู้ดูแลที่คุณอนุญาตส่งข้อความ ข้อความใหม่จะแสดงที่นี่และมีกระดิ่งแจ้งบนหน้าหลัก'}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}
