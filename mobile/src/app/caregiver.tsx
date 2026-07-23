import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';

import { FeatureIcon } from '@/components/feature-icon';
import { Field, PrimaryButton, SectionCard, useFontMultiplier } from '@/components/ui';
import { colors, slots } from '@/constants/theme';
import {
  cancelCaregiverInvitation,
  getCaregiverRelationships,
  getMyCaregiverNudges,
  getRemotePatientSnapshot,
  inviteCaregiver,
  markCaregiverNudgeRead,
  respondToCaregiverInvitation,
  revokeCaregiverAccess,
  sendCaregiverMessage,
  sendCaregiverNudge,
  type CaregiverNudge,
  type CaregiverRelationship,
  type RemotePatientSnapshot,
} from '@/services/caregiver';
import { getAdherence, useAppStore } from '@/store/use-app-store';
import type { MealTiming, ScheduleSlot } from '@/types/models';
import { getTodayKey } from '@/utils/safety';
import { getMealTimingLabel, getSlotLabel } from '@/utils/i18n';

const emptyTaken: Record<string, boolean> = {};
const scheduleOrder: ScheduleSlot[] = ['morning', 'noon', 'evening', 'bedtime'];

function formatDateTime(value: string, lang: 'th' | 'en' = 'th') {
  return new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'th-TH', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatDate(value: string, lang: 'th' | 'en' = 'th') {
  const [year = 1970, month = 1, day = 1] = value.split('-').map(Number);
  return new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
    .format(new Date(year, month - 1, day));
}

function mealTimingLabel(value: MealTiming, lang: 'th' | 'en' = 'th') {
  return getMealTimingLabel(value, lang);
}

function UsernameBadge({ username }: { username: string }) {
  return (
    <View style={{ alignSelf: 'flex-start', backgroundColor: colors.primarySoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
      <Text selectable style={{ color: colors.primaryDark, fontWeight: '800' }}>@{username}</Text>
    </View>
  );
}

export default function CaregiverScreen() {
  const profile = useAppStore((state) => state.profile);
  const lang = profile?.language || 'th';
  const cabinet = useAppStore((state) => state.cabinet);
  const taken = useAppStore((state) => state.takenByDate[getTodayKey()]) ?? emptyTaken;
  const multiplier = useFontMultiplier();
  const adherence = getAdherence(cabinet, taken);
  const phone = profile.emergencyPhone.replace(/[^\d+]/g, '');

  const [username, setUsername] = useState('');
  const [relationships, setRelationships] = useState<CaregiverRelationship[]>([]);
  const [nudges, setNudges] = useState<CaregiverNudge[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [remoteSnapshot, setRemoteSnapshot] = useState<RemotePatientSnapshot | null>(null);
  const [range, setRange] = useState<7 | 30>(7);
  const [loading, setLoading] = useState(true);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [messageText, setMessageText] = useState('');

  const incomingInvitations = relationships.filter((item) => item.kind === 'incoming_invitation');
  const outgoingInvitations = relationships.filter((item) => item.kind === 'outgoing_invitation');
  const activeCaregivers = relationships.filter((item) => item.kind === 'active_caregiver');
  const activePatients = relationships.filter((item) => item.kind === 'active_patient');
  const selectedPatient = activePatients.find((item) => item.otherUserId === selectedPatientId);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [relationshipData, nudgeData] = await Promise.all([
        getCaregiverRelationships(),
        getMyCaregiverNudges(),
      ]);
      setRelationships(relationshipData);
      setNudges(nudgeData);
      const patients = relationshipData.filter((item) => item.kind === 'active_patient');
      setSelectedPatientId((current) => patients.some((item) => item.otherUserId === current)
        ? current
        : patients[0]?.otherUserId ?? null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : (lang === 'en' ? 'Failed to load caregiver data' : 'โหลดข้อมูลผู้ดูแลไม่สำเร็จ'));
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useEffect(() => {
    const timer = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(timer);
  }, [refresh]);

  useEffect(() => {
    if (!selectedPatientId) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      setRemoteLoading(true);
      setError('');
      void getRemotePatientSnapshot(selectedPatientId, range)
        .then((snapshot) => {
          if (!cancelled) setRemoteSnapshot(snapshot);
        })
        .catch((caught) => {
          if (!cancelled) setError(caught instanceof Error ? caught.message : (lang === 'en' ? 'Failed to load patient data' : 'โหลดข้อมูลผู้ป่วยไม่สำเร็จ'));
        })
        .finally(() => {
          if (!cancelled) setRemoteLoading(false);
        });
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [range, selectedPatientId, lang]);

  const runAction = async (action: () => Promise<void>, successMessage: string) => {
    setActionBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
      setNotice(successMessage);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : (lang === 'en' ? 'Action failed' : 'ดำเนินการไม่สำเร็จ'));
    } finally {
      setActionBusy(false);
    }
  };

  const submitInvitation = () => {
    const normalized = username.trim().toLowerCase();
    if (!normalized) {
      setError(lang === 'en' ? 'Please enter caregiver username' : 'กรุณากรอก Username ของผู้ดูแล');
      return;
    }
    void runAction(async () => {
      await inviteCaregiver(normalized);
      setUsername('');
    }, lang === 'en' ? `Invitation sent to @${normalized}` : `ส่งคำเชิญให้ @${normalized} แล้ว`);
  };

  const confirmRevoke = (relationship: CaregiverRelationship) => {
    const isCaregiver = relationship.kind === 'active_caregiver';
    Alert.alert(
      isCaregiver
        ? (lang === 'en' ? 'Revoke Caregiver Access?' : 'ยกเลิกสิทธิ์ผู้ดูแล?')
        : (lang === 'en' ? 'Stop Managing Account?' : 'หยุดดูแลบัญชีนี้?'),
      lang === 'en'
        ? `@${relationship.username} will no longer be able to view cross-account health data.`
        : `@${relationship.username} จะไม่สามารถดูข้อมูลสุขภาพข้ามบัญชีได้อีก`,
      [
        { text: lang === 'en' ? 'Cancel' : 'ยกเลิก', style: 'cancel' },
        {
          text: lang === 'en' ? 'Confirm' : 'ยืนยัน',
          style: 'destructive',
          onPress: () => void runAction(
            () => revokeCaregiverAccess(relationship.id),
            lang === 'en' ? 'Connection revoked' : 'ยกเลิกการเชื่อมต่อแล้ว',
          ),
        },
      ],
    );
  };

  const medicineByClientId = useMemo(() => new Map(
    (remoteSnapshot?.medicines ?? []).map((medicine) => [medicine.clientId, medicine]),
  ), [remoteSnapshot?.medicines]);
  const takenEvents = useMemo(() => (remoteSnapshot?.doseEvents ?? [])
    .filter((event) => event.taken)
    .sort((a, b) => b.eventDate.localeCompare(a.eventDate)
      || scheduleOrder.indexOf(b.slot) - scheduleOrder.indexOf(a.slot)), [remoteSnapshot?.doseEvents]);
  const historyDays = new Set(takenEvents.map((event) => event.eventDate)).size;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void refresh()} tintColor={colors.primary} />}
      contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 50 }}
    >
      {error ? (
        <View style={{ borderRadius: 14, padding: 13, backgroundColor: colors.dangerSoft }}>
          <Text selectable style={{ color: colors.danger, lineHeight: 21, fontWeight: '700' }}>{error}</Text>
        </View>
      ) : null}
      {notice ? (
        <View style={{ borderRadius: 14, padding: 13, backgroundColor: colors.successSoft }}>
          <Text selectable style={{ color: colors.success, lineHeight: 21, fontWeight: '700' }}>{notice}</Text>
        </View>
      ) : null}

      {nudges.filter((item) => !item.readAt).map((nudge) => (
        <SectionCard key={nudge.id} title={lang === 'en' ? 'Caregiver Message' : 'ข้อความจากผู้ดูแล'}>
          <Text selectable style={{ color: colors.text, fontSize: 16 * multiplier, lineHeight: 23 * multiplier }}>{nudge.text}</Text>
          <Text selectable style={{ color: colors.muted, fontSize: 13 * multiplier }}>{formatDateTime(nudge.createdAt, lang)}</Text>
          <PrimaryButton
            label={lang === 'en' ? 'Acknowledge' : 'รับทราบ'}
            tone="neutral"
            disabled={actionBusy}
            onPress={() => void runAction(() => markCaregiverNudgeRead(nudge.id), lang === 'en' ? 'Marked as read' : 'ทำเครื่องหมายว่าอ่านแล้ว')}
          />
        </SectionCard>
      ))}

      <SectionCard title={lang === 'en' ? 'My Summary Today' : 'สรุปของฉันวันนี้'}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1, backgroundColor: colors.primarySoft, padding: 14, borderRadius: 14, gap: 4 }}>
            <Text selectable style={{ color: colors.muted }}>{lang === 'en' ? 'Adherence' : 'ความสม่ำเสมอ'}</Text>
            <Text selectable style={{ color: colors.primaryDark, fontSize: 30 * multiplier, fontWeight: '900', fontVariant: ['tabular-nums'] }}>{adherence}%</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: colors.primarySoft, padding: 14, borderRadius: 14, gap: 4 }}>
            <Text selectable style={{ color: colors.muted }}>{lang === 'en' ? 'Active Meds' : 'ยาที่ใช้อยู่'}</Text>
            <Text selectable style={{ color: colors.primaryDark, fontSize: 30 * multiplier, fontWeight: '900', fontVariant: ['tabular-nums'] }}>{cabinet.filter((item) => item.status === 'active').length}</Text>
          </View>
        </View>
      </SectionCard>

      <SectionCard title={lang === 'en' ? 'Invite Remote Caregiver' : 'เชิญผู้ดูแลระยะไกล'}>
        <Text selectable style={{ color: colors.muted, lineHeight: 22 * multiplier }}>
          {lang === 'en'
            ? 'Friends or family members must sign up for MaCheck with a Username first, then send an invitation and wait for acceptance.'
            : 'เพื่อนหรือสมาชิกครอบครัวต้องสมัคร MaCheck ด้วย Username ก่อน จากนั้นส่งคำเชิญและรอใหีกฝ่ายกดยอมรับ'}
        </Text>
        <Field
          label={lang === 'en' ? 'Caregiver Username' : 'Username ของผู้ดูแล'}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder={lang === 'en' ? 'e.g. family_01' : 'เช่น family_01'}
        />
        <PrimaryButton
          label={actionBusy ? (lang === 'en' ? 'Processing…' : 'กำลังดำเนินการ…') : (lang === 'en' ? 'Send Invitation' : 'ส่งคำเชิญ')}
          onPress={submitInvitation}
          disabled={actionBusy || loading}
        />
        <Text selectable style={{ color: colors.warning, fontSize: 13 * multiplier, lineHeight: 19 * multiplier, fontWeight: '700' }}>
          {lang === 'en'
            ? 'Medication, disease, allergy, and adherence history are sensitive health data. Invite only trusted individuals. Invitations expire in 7 days.'
            : 'ข้อมูลยา โรค แพ้ยา และประวัติการทานยาเป็นข้อมูลสุขภาพที่อ่อนไหว ควรเชิญเฉพาะบุคคลที่ไว้วางใจ คำเชิญหมดอายุใน 7 วัน'}
        </Text>
      </SectionCard>

      {incomingInvitations.length ? (
        <SectionCard title={lang === 'en' ? `Caregiver Invitations (${incomingInvitations.length})` : `คำเชิญให้เป็นผู้ดูแล (${incomingInvitations.length})`}>
          {incomingInvitations.map((invitation) => (
            <View key={invitation.id} style={{ gap: 10, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 13 }}>
              <UsernameBadge username={invitation.username} />
              <Text selectable style={{ color: colors.muted, lineHeight: 21 }}>
                {lang === 'en' ? 'This account requests permission for you to view their cabinet and adherence history.' : 'บัญชีนี้ขออนุญาตให้คุณดูตู้ยาและประวัติที่ผู้ใช้บันทึกไว้'}
              </Text>
              <View style={{ flexDirection: 'row', gap: 9 }}>
                <View style={{ flex: 1 }}>
                  <PrimaryButton
                    label={lang === 'en' ? 'Decline' : 'ปฏิเสธ'}
                    tone="neutral"
                    disabled={actionBusy}
                    onPress={() => void runAction(() => respondToCaregiverInvitation(invitation.id, false), lang === 'en' ? 'Invitation declined' : 'ปฏิเสธคำเชิญแล้ว')}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <PrimaryButton
                    label={lang === 'en' ? 'Accept' : 'ยอมรับ'}
                    disabled={actionBusy}
                    onPress={() => void runAction(() => respondToCaregiverInvitation(invitation.id, true), lang === 'en' ? 'Caregiver connected' : 'เชื่อมต่อผู้ดูแลสำเร็จ')}
                  />
                </View>
              </View>
            </View>
          ))}
        </SectionCard>
      ) : null}

      {outgoingInvitations.length ? (
        <SectionCard title={lang === 'en' ? 'Pending Invitations' : 'คำเชิญที่กำลังรอ'}>
          {outgoingInvitations.map((invitation) => (
            <View key={invitation.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ flex: 1, gap: 5 }}>
                <UsernameBadge username={invitation.username} />
                <Text selectable style={{ color: colors.muted, fontSize: 13 * multiplier }}>
                  {lang === 'en' ? 'Pending acceptance · Expires' : 'รอการยอมรับ · หมดอายุ'} {invitation.expiresAt ? formatDateTime(invitation.expiresAt, lang) : '-'}
                </Text>
              </View>
              <Pressable disabled={actionBusy} onPress={() => void runAction(() => cancelCaregiverInvitation(invitation.id), lang === 'en' ? 'Invitation cancelled' : 'ยกเลิกคำเชิญแล้ว')}>
                <Text style={{ color: colors.danger, fontWeight: '800', padding: 8 }}>{lang === 'en' ? 'Cancel' : 'ยกเลิก'}</Text>
              </Pressable>
            </View>
          ))}
        </SectionCard>
      ) : null}

      {activeCaregivers.length ? (
        <SectionCard title={lang === 'en' ? 'Authorized Caregivers' : 'ผู้ดูแลที่ได้รับสิทธิ์'}>
          {activeCaregivers.map((caregiver) => (
            <View key={caregiver.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ flex: 1, gap: 5 }}>
                <UsernameBadge username={caregiver.username} />
                <Text selectable style={{ color: colors.success, fontSize: 13 * multiplier, fontWeight: '700' }}>{lang === 'en' ? 'Connected' : 'เชื่อมต่อแล้ว'}</Text>
              </View>
              <Pressable disabled={actionBusy} onPress={() => confirmRevoke(caregiver)}>
                <Text style={{ color: colors.danger, fontWeight: '800', padding: 8 }}>{lang === 'en' ? 'Revoke' : 'ยกเลิกสิทธิ์'}</Text>
              </Pressable>
            </View>
          ))}
        </SectionCard>
      ) : null}

      {activePatients.length ? (
        <SectionCard title={lang === 'en' ? 'Accounts I Manage' : 'บัญชีที่ฉันดูแล'}>
          {activePatients.map((patient) => {
            const selected = patient.otherUserId === selectedPatientId;
            return (
              <Pressable
                key={patient.id}
                onPress={() => setSelectedPatientId(patient.otherUserId)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, borderWidth: 1.5, borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primarySoft : colors.surface }}
              >
                <View style={{ flex: 1, gap: 5 }}>
                  <UsernameBadge username={patient.username} />
                  <Text selectable style={{ color: colors.muted, fontSize: 13 * multiplier }}>
                    {selected ? (lang === 'en' ? 'Showing details below' : 'กำลังแสดงข้อมูลด้านล่าง') : (lang === 'en' ? 'Tap to view details' : 'แตะเพื่อดูข้อมูล')}
                  </Text>
                </View>
                <Pressable disabled={actionBusy} onPress={() => confirmRevoke(patient)} hitSlop={8}>
                  <Text style={{ color: colors.danger, fontWeight: '800', padding: 6 }}>{lang === 'en' ? 'Stop Managing' : 'หยุดดูแล'}</Text>
                </Pressable>
              </Pressable>
            );
          })}
        </SectionCard>
      ) : null}

      {selectedPatient ? (
        <SectionCard title={lang === 'en' ? `Details for @${selectedPatient.username}` : `ข้อมูลของ @${selectedPatient.username}`}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {([7, 30] as const).map((value) => (
              <View key={value} style={{ flex: 1 }}>
                <PrimaryButton
                  label={value === 7 ? (lang === 'en' ? 'Past 7 Days' : 'ย้อนหลัง 7 วัน') : (lang === 'en' ? 'Past 30 Days' : 'ย้อนหลัง 1 เดือน')}
                  tone={range === value ? 'primary' : 'neutral'}
                  onPress={() => setRange(value)}
                />
              </View>
            ))}
          </View>
          {remoteLoading || !remoteSnapshot ? (
            <Text selectable style={{ color: colors.muted, textAlign: 'center', paddingVertical: 16 }}>
              {lang === 'en' ? 'Loading authorized data…' : 'กำลังโหลดข้อมูลที่ได้รับอนุญาต…'}
            </Text>
          ) : (
            <View style={{ gap: 14 }}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1, backgroundColor: colors.primarySoft, borderRadius: 14, padding: 13, gap: 3 }}>
                  <Text selectable style={{ color: colors.primaryDark, fontSize: 25 * multiplier, fontWeight: '900' }}>{remoteSnapshot.medicines.filter((item) => item.status === 'active').length}</Text>
                  <Text selectable style={{ color: colors.primaryDark, fontSize: 12 * multiplier, fontWeight: '700' }}>{lang === 'en' ? 'Active Meds' : 'รายการยาที่ใช้อยู่'}</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: colors.successSoft, borderRadius: 14, padding: 13, gap: 3 }}>
                  <Text selectable style={{ color: colors.success, fontSize: 25 * multiplier, fontWeight: '900' }}>{takenEvents.length}</Text>
                  <Text selectable style={{ color: colors.success, fontSize: 12 * multiplier, fontWeight: '700' }}>{lang === 'en' ? 'Recorded Doses' : 'ครั้งที่บันทึกว่าทานแล้ว'}</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 14, padding: 13, gap: 3, borderWidth: 1, borderColor: colors.border }}>
                  <Text selectable style={{ color: colors.text, fontSize: 25 * multiplier, fontWeight: '900' }}>{historyDays}</Text>
                  <Text selectable style={{ color: colors.muted, fontSize: 12 * multiplier, fontWeight: '700' }}>{lang === 'en' ? 'Recorded Days' : 'วันที่มีบันทึก'}</Text>
                </View>
              </View>

              <View style={{ gap: 6 }}>
                <Text selectable style={{ color: colors.text, fontSize: 16 * multiplier, fontWeight: '900' }}>{lang === 'en' ? 'User Profile Info' : 'ข้อมูลที่ผู้ใช้แจ้งไว้'}</Text>
                <Text selectable style={{ color: colors.muted, lineHeight: 21 * multiplier }}>
                  {lang === 'en' ? 'Medical Conditions: ' : 'โรคประจำตัว: '}{remoteSnapshot.diseases.length ? remoteSnapshot.diseases.join(', ') : (lang === 'en' ? 'Not specified' : 'ไม่ได้ระบุ')}
                </Text>
                <Text selectable style={{ color: colors.muted, lineHeight: 21 * multiplier }}>
                  {lang === 'en' ? 'Allergies: ' : 'ประวัติแพ้ยา: '}{remoteSnapshot.allergies.length ? remoteSnapshot.allergies.join(', ') : (lang === 'en' ? 'Not specified' : 'ไม่ได้ระบุ')}
                </Text>
              </View>

              <View style={{ gap: 9 }}>
                <Text selectable style={{ color: colors.text, fontSize: 16 * multiplier, fontWeight: '900' }}>{lang === 'en' ? 'Cabinet' : 'ตู้ยา'}</Text>
                {remoteSnapshot.medicines.filter((item) => item.status === 'active').map((medicine) => (
                  <View key={medicine.clientId} style={{ padding: 12, borderRadius: 13, borderWidth: 1, borderColor: colors.border, gap: 4 }}>
                    <Text selectable style={{ color: colors.text, fontSize: 15 * multiplier, fontWeight: '900' }}>
                      {lang === 'en' ? (medicine.nameEn || medicine.nameTh) : medicine.nameTh}
                    </Text>
                    {medicine.nameEn && lang !== 'en' ? <Text selectable style={{ color: colors.muted, fontSize: 12 * multiplier }}>{medicine.nameEn}</Text> : null}
                    <Text selectable style={{ color: colors.primaryDark, fontSize: 13 * multiplier, fontWeight: '700' }}>{medicine.dosage} · {mealTimingLabel(medicine.mealTiming, lang)}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {medicine.schedules.map((slot) => (
                        <View key={slot} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <FeatureIcon name={slots[slot].icon} size={22} accessibilityLabel={getSlotLabel(slot, lang)} />
                          <Text selectable style={{ color: colors.muted, fontSize: 12 * multiplier }}>{getSlotLabel(slot, lang)}</Text>
                        </View>
                      ))}
                      {!medicine.schedules.length ? <Text selectable style={{ color: colors.muted, fontSize: 12 * multiplier }}>{lang === 'en' ? 'No schedule set' : 'ไม่ได้ตั้งเวลา'}</Text> : null}
                    </View>
                  </View>
                ))}
                {!remoteSnapshot.medicines.some((item) => item.status === 'active') ? <Text selectable style={{ color: colors.muted }}>{lang === 'en' ? 'No active medications' : 'ยังไม่มียาที่ใช้อยู่'}</Text> : null}
              </View>

              <View style={{ gap: 9 }}>
                <Text selectable style={{ color: colors.text, fontSize: 16 * multiplier, fontWeight: '900' }}>{lang === 'en' ? 'Dose History (Taken)' : 'ประวัติที่บันทึกว่าทานแล้ว'}</Text>
                {takenEvents.slice(0, 30).map((event) => {
                  const medicine = medicineByClientId.get(event.medicineClientId);
                  const drugName = lang === 'en' ? (medicine?.nameEn || medicine?.nameTh) : medicine?.nameTh;
                  return (
                    <View key={event.id} style={{ flexDirection: 'row', gap: 10, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 9 }}>
                      <FeatureIcon name="success" size={25} accessibilityLabel={lang === 'en' ? 'Taken' : 'ทานแล้ว'} />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text selectable style={{ color: colors.text, fontWeight: '800' }}>{drugName || (lang === 'en' ? 'Removed medication' : 'รายการยาที่นำออกจากตู้แล้ว')}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                          <FeatureIcon name={slots[event.slot].icon} size={20} accessibilityLabel={getSlotLabel(event.slot, lang)} />
                          <Text selectable style={{ flex: 1, color: colors.muted, fontSize: 12 * multiplier }}>
                            {formatDate(event.eventDate, lang)} · {getSlotLabel(event.slot, lang)} · {medicine?.dosage || (lang === 'en' ? 'No dose data' : 'ไม่พบข้อมูลจำนวน')}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
                {!takenEvents.length ? <Text selectable style={{ color: colors.muted }}>{lang === 'en' ? 'No taken dose records in this period' : 'ไม่มีรายการที่ผู้ใช้กดบันทึกว่าทานแล้วในช่วงนี้'}</Text> : null}
                {takenEvents.length > 30 ? (
                  <Text selectable style={{ color: colors.muted, textAlign: 'center' }}>
                    {lang === 'en' ? `Showing latest 30 of ${takenEvents.length} records` : `แสดง 30 รายการล่าสุดจากทั้งหมด ${takenEvents.length} รายการ`}
                  </Text>
                ) : null}
              </View>

              <PrimaryButton
                label={actionBusy ? (lang === 'en' ? 'Sending…' : 'กำลังส่ง…') : (lang === 'en' ? 'Nudge to check today schedule' : 'เตือนให้ตรวจสอบตารางยาวันนี้')}
                disabled={actionBusy}
                onPress={() => void runAction(() => sendCaregiverNudge(selectedPatient.otherUserId, 'check_schedule'), lang === 'en' ? 'Nudge sent' : 'ส่งข้อความเตือนแล้ว')}
              />
              <PrimaryButton
                label={lang === 'en' ? 'Request callback' : 'ขอให้ติดต่อกลับ'}
                tone="neutral"
                disabled={actionBusy}
                onPress={() => void runAction(() => sendCaregiverNudge(selectedPatient.otherUserId, 'contact_caregiver'), lang === 'en' ? 'Message sent' : 'ส่งข้อความแล้ว')}
              />
              <View style={{ gap: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 14 }}>
                <Text selectable style={{ color: colors.text, fontSize: 17 * multiplier, fontWeight: '900' }}>
                  {lang === 'en' ? `Write message to @${selectedPatient.username}` : `เขียนข้อความถึง @${selectedPatient.username}`}
                </Text>
                <Field
                  label={lang === 'en' ? 'General Message' : 'ข้อความทั่วไป'}
                  value={messageText}
                  onChangeText={setMessageText}
                  placeholder={lang === 'en' ? 'e.g. How are you doing today? Call me back when free.' : 'เช่น วันนี้เป็นอย่างไรบ้าง ถ้าสะดวกโทรกลับหาหน่อยนะ'}
                  multiline
                  maxLength={300}
                  textAlignVertical="top"
                  style={{ minHeight: 108 }}
                />
                <Text selectable style={{ color: colors.muted, textAlign: 'right', fontSize: 12 * multiplier }}>{messageText.length}/300</Text>
                <PrimaryButton
                  label={actionBusy ? (lang === 'en' ? 'Sending…' : 'กำลังส่ง…') : (lang === 'en' ? 'Send Message & Notify' : 'ส่งข้อความและแจ้งเตือน')}
                  disabled={actionBusy || !messageText.trim()}
                  onPress={() => void runAction(async () => {
                    await sendCaregiverMessage(selectedPatient.otherUserId, messageText);
                    setMessageText('');
                  }, lang === 'en' ? 'Message and notification sent' : 'ส่งข้อความและแจ้งเตือนแล้ว')}
                />
                <Text selectable style={{ color: colors.warning, fontSize: 13 * multiplier, lineHeight: 19 * multiplier, fontWeight: '700' }}>
                  {lang === 'en'
                    ? 'General messages permitted. System blocks direct dosage changes, additions, or stops.'
                    : 'พิมพ์ข้อความทั่วไปได้ แต่ระบบจะไม่ส่งข้อความที่มีลักษณะสั่งเพิ่ม หยุด เปลี่ยน หรือระบุขนาดยาโดยตรง'}
                </Text>
              </View>
              <Text selectable style={{ color: colors.warning, fontSize: 13 * multiplier, lineHeight: 19 * multiplier, fontWeight: '700' }}>
                {lang === 'en'
                  ? 'This data is self-reported by user. Not a proof of actual ingestion. Do not use to modify prescriptions.'
                  : 'ข้อมูลนี้มาจากสิ่งที่ผู้ใช้บันทึกเอง อาจไม่ครบถ้วนและไม่ใช่คำยืนยันว่ารับประทานยาจริง ห้ามใช้เพื่อปรับยา เพิ่มยา หยุดยา หรือเปลี่ยนขนาดยาเอง'}
              </Text>
            </View>
          )}
        </SectionCard>
      ) : null}

      {!loading && !activePatients.length && !incomingInvitations.length ? (
        <View style={{ alignItems: 'center', gap: 6, paddingVertical: 8 }}>
          <FeatureIcon name="remote-caregiver" size={66} accessibilityLabel={lang === 'en' ? 'Remote Caregiver' : 'ผู้ดูแลระยะไกล'} />
          <Text selectable style={{ color: colors.text, fontWeight: '900', fontSize: 17 * multiplier }}>
            {lang === 'en' ? 'No Managed Accounts Yet' : 'ยังไม่มีบัญชีที่คุณดูแล'}
          </Text>
          <Text selectable style={{ color: colors.muted, textAlign: 'center', lineHeight: 21 * multiplier }}>
            {lang === 'en'
              ? 'When a user sends an invitation to your Username, it will appear here.'
              : 'เมื่อมีผู้ใช้ส่งคำเชิญมาที่ Username ของคุณ คำเชิญจะแสดงในหน้านี้'}
          </Text>
        </View>
      ) : null}

      <SectionCard title={lang === 'en' ? 'My Emergency Contact' : 'ผู้ติดต่อฉุกเฉินของฉัน'}>
        <Text selectable style={{ color: colors.text, fontSize: 19 * multiplier, fontWeight: '800' }}>
          {profile.emergencyName || (lang === 'en' ? 'Name not set' : 'ยังไม่ได้ตั้งชื่อ')}
        </Text>
        <Text selectable style={{ color: colors.muted, fontSize: 17 * multiplier }}>
          {profile.emergencyPhone || (lang === 'en' ? 'Phone number not set' : 'ยังไม่ได้ตั้งเบอร์โทร')}
        </Text>
        <PrimaryButton
          label={phone ? (lang === 'en' ? 'Call Contact' : 'โทรหาผู้ติดต่อ') : (lang === 'en' ? 'Phone number not configured' : 'ยังไม่ได้ตั้งค่าเบอร์โทร')}
          onPress={() => phone ? void Linking.openURL(`tel:${phone}`) : undefined}
          disabled={!phone}
        />
        <PrimaryButton
          label={lang === 'en' ? 'Call Emergency Hotline (1669)' : 'โทรสายด่วนฉุกเฉิน 1669'}
          tone="danger"
          onPress={() => void Linking.openURL('tel:1669')}
        />
      </SectionCard>
    </ScrollView>
  );
}
