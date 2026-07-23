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

const emptyTaken: Record<string, boolean> = {};
const scheduleOrder: ScheduleSlot[] = ['morning', 'noon', 'evening', 'bedtime'];

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('th-TH', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatDate(value: string) {
  const [year = 1970, month = 1, day = 1] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
    .format(new Date(year, month - 1, day));
}

function mealTimingLabel(value: MealTiming) {
  if (value === 'before') return 'ก่อนอาหาร';
  if (value === 'after') return 'หลังอาหาร';
  return 'ไม่จำกัดมื้อ';
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
      setError(caught instanceof Error ? caught.message : 'โหลดข้อมูลผู้ดูแลไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, []);

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
          if (!cancelled) setError(caught instanceof Error ? caught.message : 'โหลดข้อมูลผู้ป่วยไม่สำเร็จ');
        })
        .finally(() => {
          if (!cancelled) setRemoteLoading(false);
        });
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [range, selectedPatientId]);

  const runAction = async (action: () => Promise<void>, successMessage: string) => {
    setActionBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
      setNotice(successMessage);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'ดำเนินการไม่สำเร็จ');
    } finally {
      setActionBusy(false);
    }
  };

  const submitInvitation = () => {
    const normalized = username.trim().toLowerCase();
    if (!normalized) {
      setError('กรุณากรอก Username ของผู้ดูแล');
      return;
    }
    void runAction(async () => {
      await inviteCaregiver(normalized);
      setUsername('');
    }, `ส่งคำเชิญให้ @${normalized} แล้ว`);
  };

  const confirmRevoke = (relationship: CaregiverRelationship) => {
    const isCaregiver = relationship.kind === 'active_caregiver';
    Alert.alert(
      isCaregiver ? 'ยกเลิกสิทธิ์ผู้ดูแล?' : 'หยุดดูแลบัญชีนี้?',
      `@${relationship.username} จะไม่สามารถดูข้อมูลสุขภาพข้ามบัญชีได้อีก`,
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'ยืนยัน',
          style: 'destructive',
          onPress: () => void runAction(
            () => revokeCaregiverAccess(relationship.id),
            'ยกเลิกการเชื่อมต่อแล้ว',
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
        <SectionCard key={nudge.id} title="ข้อความจากผู้ดูแล">
          <Text selectable style={{ color: colors.text, fontSize: 16 * multiplier, lineHeight: 23 * multiplier }}>{nudge.text}</Text>
          <Text selectable style={{ color: colors.muted, fontSize: 13 * multiplier }}>{formatDateTime(nudge.createdAt)}</Text>
          <PrimaryButton
            label="รับทราบ"
            tone="neutral"
            disabled={actionBusy}
            onPress={() => void runAction(() => markCaregiverNudgeRead(nudge.id), 'ทำเครื่องหมายว่าอ่านแล้ว')}
          />
        </SectionCard>
      ))}

      <SectionCard title="สรุปของฉันวันนี้">
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1, backgroundColor: colors.primarySoft, padding: 14, borderRadius: 14, gap: 4 }}>
            <Text selectable style={{ color: colors.muted }}>ความสม่ำเสมอ</Text>
            <Text selectable style={{ color: colors.primaryDark, fontSize: 30 * multiplier, fontWeight: '900', fontVariant: ['tabular-nums'] }}>{adherence}%</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: colors.primarySoft, padding: 14, borderRadius: 14, gap: 4 }}>
            <Text selectable style={{ color: colors.muted }}>ยาที่ใช้อยู่</Text>
            <Text selectable style={{ color: colors.primaryDark, fontSize: 30 * multiplier, fontWeight: '900', fontVariant: ['tabular-nums'] }}>{cabinet.filter((item) => item.status === 'active').length}</Text>
          </View>
        </View>
      </SectionCard>

      <SectionCard title="เชิญผู้ดูแลระยะไกล">
        <Text selectable style={{ color: colors.muted, lineHeight: 22 * multiplier }}>เพื่อนหรือสมาชิกครอบครัวต้องสมัคร MaCheck ด้วย Username ก่อน จากนั้นส่งคำเชิญและรอให้อีกฝ่ายกดยอมรับ</Text>
        <Field
          label="Username ของผู้ดูแล"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="เช่น family_01"
        />
        <PrimaryButton label={actionBusy ? 'กำลังดำเนินการ…' : 'ส่งคำเชิญ'} onPress={submitInvitation} disabled={actionBusy || loading} />
        <Text selectable style={{ color: colors.warning, fontSize: 13 * multiplier, lineHeight: 19 * multiplier, fontWeight: '700' }}>ข้อมูลยา โรค แพ้ยา และประวัติการทานยาเป็นข้อมูลสุขภาพที่อ่อนไหว ควรเชิญเฉพาะบุคคลที่ไว้วางใจ คำเชิญหมดอายุใน 7 วัน</Text>
      </SectionCard>

      {incomingInvitations.length ? (
        <SectionCard title={`คำเชิญให้เป็นผู้ดูแล (${incomingInvitations.length})`}>
          {incomingInvitations.map((invitation) => (
            <View key={invitation.id} style={{ gap: 10, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 13 }}>
              <UsernameBadge username={invitation.username} />
              <Text selectable style={{ color: colors.muted, lineHeight: 21 }}>บัญชีนี้ขออนุญาตให้คุณดูตู้ยาและประวัติที่ผู้ใช้บันทึกไว้</Text>
              <View style={{ flexDirection: 'row', gap: 9 }}>
                <View style={{ flex: 1 }}><PrimaryButton label="ปฏิเสธ" tone="neutral" disabled={actionBusy} onPress={() => void runAction(() => respondToCaregiverInvitation(invitation.id, false), 'ปฏิเสธคำเชิญแล้ว')} /></View>
                <View style={{ flex: 1 }}><PrimaryButton label="ยอมรับ" disabled={actionBusy} onPress={() => void runAction(() => respondToCaregiverInvitation(invitation.id, true), 'เชื่อมต่อผู้ดูแลสำเร็จ')} /></View>
              </View>
            </View>
          ))}
        </SectionCard>
      ) : null}

      {outgoingInvitations.length ? (
        <SectionCard title="คำเชิญที่กำลังรอ">
          {outgoingInvitations.map((invitation) => (
            <View key={invitation.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ flex: 1, gap: 5 }}>
                <UsernameBadge username={invitation.username} />
                <Text selectable style={{ color: colors.muted, fontSize: 13 * multiplier }}>รอการยอมรับ · หมดอายุ {invitation.expiresAt ? formatDateTime(invitation.expiresAt) : '-'}</Text>
              </View>
              <Pressable disabled={actionBusy} onPress={() => void runAction(() => cancelCaregiverInvitation(invitation.id), 'ยกเลิกคำเชิญแล้ว')}>
                <Text style={{ color: colors.danger, fontWeight: '800', padding: 8 }}>ยกเลิก</Text>
              </Pressable>
            </View>
          ))}
        </SectionCard>
      ) : null}

      {activeCaregivers.length ? (
        <SectionCard title="ผู้ดูแลที่ได้รับสิทธิ์">
          {activeCaregivers.map((caregiver) => (
            <View key={caregiver.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ flex: 1, gap: 5 }}>
                <UsernameBadge username={caregiver.username} />
                <Text selectable style={{ color: colors.success, fontSize: 13 * multiplier, fontWeight: '700' }}>เชื่อมต่อแล้ว</Text>
              </View>
              <Pressable disabled={actionBusy} onPress={() => confirmRevoke(caregiver)}>
                <Text style={{ color: colors.danger, fontWeight: '800', padding: 8 }}>ยกเลิกสิทธิ์</Text>
              </Pressable>
            </View>
          ))}
        </SectionCard>
      ) : null}

      {activePatients.length ? (
        <SectionCard title="บัญชีที่ฉันดูแล">
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
                  <Text selectable style={{ color: colors.muted, fontSize: 13 * multiplier }}>{selected ? 'กำลังแสดงข้อมูลด้านล่าง' : 'แตะเพื่อดูข้อมูล'}</Text>
                </View>
                <Pressable disabled={actionBusy} onPress={() => confirmRevoke(patient)} hitSlop={8}>
                  <Text style={{ color: colors.danger, fontWeight: '800', padding: 6 }}>หยุดดูแล</Text>
                </Pressable>
              </Pressable>
            );
          })}
        </SectionCard>
      ) : null}

      {selectedPatient ? (
        <SectionCard title={`ข้อมูลของ @${selectedPatient.username}`}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {([7, 30] as const).map((value) => (
              <View key={value} style={{ flex: 1 }}>
                <PrimaryButton label={value === 7 ? 'ย้อนหลัง 7 วัน' : 'ย้อนหลัง 1 เดือน'} tone={range === value ? 'primary' : 'neutral'} onPress={() => setRange(value)} />
              </View>
            ))}
          </View>
          {remoteLoading || !remoteSnapshot ? (
            <Text selectable style={{ color: colors.muted, textAlign: 'center', paddingVertical: 16 }}>กำลังโหลดข้อมูลที่ได้รับอนุญาต…</Text>
          ) : (
            <View style={{ gap: 14 }}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1, backgroundColor: colors.primarySoft, borderRadius: 14, padding: 13, gap: 3 }}>
                  <Text selectable style={{ color: colors.primaryDark, fontSize: 25 * multiplier, fontWeight: '900' }}>{remoteSnapshot.medicines.filter((item) => item.status === 'active').length}</Text>
                  <Text selectable style={{ color: colors.primaryDark, fontSize: 12 * multiplier, fontWeight: '700' }}>รายการยาที่ใช้อยู่</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: colors.successSoft, borderRadius: 14, padding: 13, gap: 3 }}>
                  <Text selectable style={{ color: colors.success, fontSize: 25 * multiplier, fontWeight: '900' }}>{takenEvents.length}</Text>
                  <Text selectable style={{ color: colors.success, fontSize: 12 * multiplier, fontWeight: '700' }}>ครั้งที่บันทึกว่าทานแล้ว</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 14, padding: 13, gap: 3, borderWidth: 1, borderColor: colors.border }}>
                  <Text selectable style={{ color: colors.text, fontSize: 25 * multiplier, fontWeight: '900' }}>{historyDays}</Text>
                  <Text selectable style={{ color: colors.muted, fontSize: 12 * multiplier, fontWeight: '700' }}>วันที่มีบันทึก</Text>
                </View>
              </View>

              <View style={{ gap: 6 }}>
                <Text selectable style={{ color: colors.text, fontSize: 16 * multiplier, fontWeight: '900' }}>ข้อมูลที่ผู้ใช้แจ้งไว้</Text>
                <Text selectable style={{ color: colors.muted, lineHeight: 21 * multiplier }}>โรคประจำตัว: {remoteSnapshot.diseases.length ? remoteSnapshot.diseases.join(', ') : 'ไม่ได้ระบุ'}</Text>
                <Text selectable style={{ color: colors.muted, lineHeight: 21 * multiplier }}>ประวัติแพ้ยา: {remoteSnapshot.allergies.length ? remoteSnapshot.allergies.join(', ') : 'ไม่ได้ระบุ'}</Text>
              </View>

              <View style={{ gap: 9 }}>
                <Text selectable style={{ color: colors.text, fontSize: 16 * multiplier, fontWeight: '900' }}>ตู้ยา</Text>
                {remoteSnapshot.medicines.filter((item) => item.status === 'active').map((medicine) => (
                  <View key={medicine.clientId} style={{ padding: 12, borderRadius: 13, borderWidth: 1, borderColor: colors.border, gap: 4 }}>
                    <Text selectable style={{ color: colors.text, fontSize: 15 * multiplier, fontWeight: '900' }}>{medicine.nameTh}</Text>
                    {medicine.nameEn ? <Text selectable style={{ color: colors.muted, fontSize: 12 * multiplier }}>{medicine.nameEn}</Text> : null}
                    <Text selectable style={{ color: colors.primaryDark, fontSize: 13 * multiplier, fontWeight: '700' }}>{medicine.dosage} · {mealTimingLabel(medicine.mealTiming)}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {medicine.schedules.map((slot) => (
                        <View key={slot} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <FeatureIcon name={slots[slot].icon} size={22} accessibilityLabel={`ช่วง${slots[slot].label}`} />
                          <Text selectable style={{ color: colors.muted, fontSize: 12 * multiplier }}>{slots[slot].label}</Text>
                        </View>
                      ))}
                      {!medicine.schedules.length ? <Text selectable style={{ color: colors.muted, fontSize: 12 * multiplier }}>ไม่ได้ตั้งเวลา</Text> : null}
                    </View>
                  </View>
                ))}
                {!remoteSnapshot.medicines.some((item) => item.status === 'active') ? <Text selectable style={{ color: colors.muted }}>ยังไม่มียาที่ใช้อยู่</Text> : null}
              </View>

              <View style={{ gap: 9 }}>
                <Text selectable style={{ color: colors.text, fontSize: 16 * multiplier, fontWeight: '900' }}>ประวัติที่บันทึกว่าทานแล้ว</Text>
                {takenEvents.slice(0, 30).map((event) => {
                  const medicine = medicineByClientId.get(event.medicineClientId);
                  return (
                    <View key={event.id} style={{ flexDirection: 'row', gap: 10, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 9 }}>
                      <FeatureIcon name="success" size={25} accessibilityLabel="ทานแล้ว" />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text selectable style={{ color: colors.text, fontWeight: '800' }}>{medicine?.nameTh || 'รายการยาที่นำออกจากตู้แล้ว'}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                          <FeatureIcon name={slots[event.slot].icon} size={20} accessibilityLabel={`ช่วง${slots[event.slot].label}`} />
                          <Text selectable style={{ flex: 1, color: colors.muted, fontSize: 12 * multiplier }}>{formatDate(event.eventDate)} · {slots[event.slot].label} · {medicine?.dosage || 'ไม่พบข้อมูลจำนวน'}</Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
                {!takenEvents.length ? <Text selectable style={{ color: colors.muted }}>ไม่มีรายการที่ผู้ใช้กดบันทึกว่าทานแล้วในช่วงนี้</Text> : null}
                {takenEvents.length > 30 ? <Text selectable style={{ color: colors.muted, textAlign: 'center' }}>แสดง 30 รายการล่าสุดจากทั้งหมด {takenEvents.length} รายการ</Text> : null}
              </View>

              <PrimaryButton
                label={actionBusy ? 'กำลังส่ง…' : 'เตือนให้ตรวจสอบตารางยาวันนี้'}
                disabled={actionBusy}
                onPress={() => void runAction(() => sendCaregiverNudge(selectedPatient.otherUserId, 'check_schedule'), 'ส่งข้อความเตือนแล้ว')}
              />
              <PrimaryButton
                label="ขอให้ติดต่อกลับ"
                tone="neutral"
                disabled={actionBusy}
                onPress={() => void runAction(() => sendCaregiverNudge(selectedPatient.otherUserId, 'contact_caregiver'), 'ส่งข้อความแล้ว')}
              />
              <View style={{ gap: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 14 }}>
                <Text selectable style={{ color: colors.text, fontSize: 17 * multiplier, fontWeight: '900' }}>เขียนข้อความถึง @{selectedPatient.username}</Text>
                <Field
                  label="ข้อความทั่วไป"
                  value={messageText}
                  onChangeText={setMessageText}
                  placeholder="เช่น วันนี้เป็นอย่างไรบ้าง ถ้าสะดวกโทรกลับหาหน่อยนะ"
                  multiline
                  maxLength={300}
                  textAlignVertical="top"
                  style={{ minHeight: 108 }}
                />
                <Text selectable style={{ color: colors.muted, textAlign: 'right', fontSize: 12 * multiplier }}>{messageText.length}/300</Text>
                <PrimaryButton
                  label={actionBusy ? 'กำลังส่ง…' : 'ส่งข้อความและแจ้งเตือน'}
                  disabled={actionBusy || !messageText.trim()}
                  onPress={() => void runAction(async () => {
                    await sendCaregiverMessage(selectedPatient.otherUserId, messageText);
                    setMessageText('');
                  }, 'ส่งข้อความและแจ้งเตือนแล้ว')}
                />
                <Text selectable style={{ color: colors.warning, fontSize: 13 * multiplier, lineHeight: 19 * multiplier, fontWeight: '700' }}>พิมพ์ข้อความทั่วไปได้ แต่ระบบจะไม่ส่งข้อความที่มีลักษณะสั่งเพิ่ม หยุด เปลี่ยน หรือระบุขนาดยาโดยตรง</Text>
              </View>
              <Text selectable style={{ color: colors.warning, fontSize: 13 * multiplier, lineHeight: 19 * multiplier, fontWeight: '700' }}>ข้อมูลนี้มาจากสิ่งที่ผู้ใช้บันทึกเอง อาจไม่ครบถ้วนและไม่ใช่คำยืนยันว่ารับประทานยาจริง ห้ามใช้เพื่อปรับยา เพิ่มยา หยุดยา หรือเปลี่ยนขนาดยาเอง</Text>
            </View>
          )}
        </SectionCard>
      ) : null}

      {!loading && !activePatients.length && !incomingInvitations.length ? (
        <View style={{ alignItems: 'center', gap: 6, paddingVertical: 8 }}>
          <FeatureIcon name="remote-caregiver" size={66} accessibilityLabel="ผู้ดูแลระยะไกล" />
          <Text selectable style={{ color: colors.text, fontWeight: '900', fontSize: 17 * multiplier }}>ยังไม่มีบัญชีที่คุณดูแล</Text>
          <Text selectable style={{ color: colors.muted, textAlign: 'center', lineHeight: 21 * multiplier }}>เมื่อมีผู้ใช้ส่งคำเชิญมาที่ Username ของคุณ คำเชิญจะแสดงในหน้านี้</Text>
        </View>
      ) : null}

      <SectionCard title="ผู้ติดต่อฉุกเฉินของฉัน">
        <Text selectable style={{ color: colors.text, fontSize: 19 * multiplier, fontWeight: '800' }}>{profile.emergencyName || 'ยังไม่ได้ตั้งชื่อ'}</Text>
        <Text selectable style={{ color: colors.muted, fontSize: 17 * multiplier }}>{profile.emergencyPhone || 'ยังไม่ได้ตั้งเบอร์โทร'}</Text>
        <PrimaryButton label={phone ? 'โทรหาผู้ติดต่อ' : 'ยังไม่ได้ตั้งค่าเบอร์โทร'} onPress={() => phone ? void Linking.openURL(`tel:${phone}`) : undefined} disabled={!phone} />
        <PrimaryButton label="โทรสายด่วนฉุกเฉิน 1669" tone="danger" onPress={() => void Linking.openURL('tel:1669')} />
      </SectionCard>
    </ScrollView>
  );
}
