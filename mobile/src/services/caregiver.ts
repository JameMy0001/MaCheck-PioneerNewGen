import { supabase } from '@/services/supabase';
import type { MealTiming, MedicineStatus, ScheduleSlot } from '@/types/models';
import { getTodayKey } from '@/utils/safety';

export type CaregiverRelationKind =
  | 'active_caregiver'
  | 'active_patient'
  | 'outgoing_invitation'
  | 'incoming_invitation';

export interface CaregiverRelationship {
  id: string;
  kind: CaregiverRelationKind;
  otherUserId: string;
  username: string;
  status: string;
  createdAt: string;
  expiresAt: string | null;
}

export interface CaregiverNudge {
  id: string;
  patientUserId: string;
  caregiverUserId: string;
  kind: string;
  text: string;
  createdAt: string;
  readAt: string | null;
}

export function mapCaregiverNudge(row: Record<string, unknown>): CaregiverNudge {
  return {
    id: String(row.id),
    patientUserId: String(row.patient_user_id),
    caregiverUserId: String(row.caregiver_user_id),
    kind: String(row.kind),
    text: String(row.text),
    createdAt: String(row.created_at),
    readAt: row.read_at ? String(row.read_at) : null,
  };
}

export interface RemotePatientMedicine {
  clientId: string;
  medicationCode: string | null;
  nameTh: string;
  nameEn: string;
  dosage: string;
  schedules: ScheduleSlot[];
  mealTiming: MealTiming;
  status: MedicineStatus;
  createdAt: string;
}

export interface RemoteDoseEvent {
  id: string;
  medicineClientId: string;
  slot: ScheduleSlot;
  eventDate: string;
  taken: boolean;
  occurredAt: string;
}

export interface RemotePatientSnapshot {
  diseases: string[];
  allergies: string[];
  medicines: RemotePatientMedicine[];
  doseEvents: RemoteDoseEvent[];
  nudges: CaregiverNudge[];
}

const scheduleSlots: ScheduleSlot[] = ['morning', 'noon', 'evening', 'bedtime'];

function throwIfError(error: { message: string } | null) {
  if (error) throw new Error(error.message || 'เชื่อมต่อฐานข้อมูลกลางไม่สำเร็จ');
}

async function requireUserId() {
  const { data, error } = await supabase.auth.getSession();
  throwIfError(error);
  const userId = data.session?.user.id;
  if (!userId) throw new Error('เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง');
  return userId;
}

function dateKeyDaysAgo(daysAgo: number) {
  const [year = 1970, month = 1, day = 1] = getTodayKey().split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() - daysAgo);
  const normalizedYear = date.getFullYear();
  const normalizedMonth = String(date.getMonth() + 1).padStart(2, '0');
  const normalizedDay = String(date.getDate()).padStart(2, '0');
  return `${normalizedYear}-${normalizedMonth}-${normalizedDay}`;
}

function normalizeSchedules(value: unknown): ScheduleSlot[] {
  if (!Array.isArray(value)) return [];
  return value.filter((slot): slot is ScheduleSlot => scheduleSlots.includes(slot as ScheduleSlot));
}

function normalizeMealTiming(value: unknown): MealTiming {
  return value === 'before' || value === 'after' ? value : 'any';
}

function normalizeMedicineDefinition(value: unknown) {
  const definition = Array.isArray(value) ? value[0] : value;
  if (!definition || typeof definition !== 'object') return { name_th: '', name_en: '' };
  return definition as { name_th?: string; name_en?: string };
}

export async function getCaregiverRelationships(): Promise<CaregiverRelationship[]> {
  await requireUserId();
  const { data, error } = await supabase.rpc('caregiver_relationships');
  throwIfError(error);
  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: String(row.relationship_id),
    kind: row.relation_kind as CaregiverRelationKind,
    otherUserId: String(row.other_user_id),
    username: String(row.other_username),
    status: String(row.relationship_status),
    createdAt: String(row.relationship_created_at),
    expiresAt: row.expires_at ? String(row.expires_at) : null,
  }));
}

export async function inviteCaregiver(username: string) {
  await requireUserId();
  const { error } = await supabase.rpc('caregiver_invite_by_handle', { p_caregiver_handle: username.trim().toLowerCase() });
  throwIfError(error);
}

export async function respondToCaregiverInvitation(invitationId: string, accept: boolean) {
  await requireUserId();
  const { error } = await supabase.rpc('caregiver_respond_to_invitation', {
    p_invitation_id: invitationId,
    p_accept: accept,
  });
  throwIfError(error);
}

export async function cancelCaregiverInvitation(invitationId: string) {
  await requireUserId();
  const { error } = await supabase.rpc('caregiver_cancel_invitation', { p_invitation_id: invitationId });
  throwIfError(error);
}

export async function revokeCaregiverAccess(linkId: string) {
  await requireUserId();
  const { error } = await supabase.rpc('caregiver_revoke_access', { p_link_id: linkId });
  throwIfError(error);
}

export async function sendCaregiverNudge(patientUserId: string, kind: 'check_schedule' | 'contact_caregiver') {
  await requireUserId();
  const { error } = await supabase.rpc('caregiver_send_nudge', {
    p_patient_user_id: patientUserId,
    p_kind: kind,
  });
  throwIfError(error);
}

export async function sendCaregiverMessage(patientUserId: string, text: string) {
  await requireUserId();
  const normalized = text.replace(/[\u0000-\u001F\u007F]/g, ' ').trim();
  if (!normalized) throw new Error('กรุณาพิมพ์ข้อความ');
  if (normalized.length > 300) throw new Error('ข้อความยาวเกิน 300 ตัวอักษร');
  const { data, error } = await supabase.functions.invoke('send-caregiver-message', {
    body: { patientUserId, text: normalized },
  });
  if (error) {
    let message = error.message || 'ส่งข้อความไม่สำเร็จ';
    const context = (error as { context?: unknown }).context;
    if (context instanceof Response) {
      const body = await context.clone().json().catch(() => null) as { error?: string } | null;
      if (body?.error) message = body.error;
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(String(data.error));
  return String(data?.messageId ?? '');
}

export async function markCaregiverNudgeRead(nudgeId: string) {
  await requireUserId();
  const { error } = await supabase.rpc('caregiver_mark_nudge_read', { p_nudge_id: nudgeId });
  throwIfError(error);
}

export async function getMyCaregiverNudges(): Promise<CaregiverNudge[]> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('caregiver_nudges')
    .select('id,patient_user_id,caregiver_user_id,kind,text,created_at,read_at')
    .eq('patient_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);
  throwIfError(error);
  return (data ?? []).map((row) => mapCaregiverNudge(row));
}

export async function getRemotePatientSnapshot(patientUserId: string, days: 7 | 30): Promise<RemotePatientSnapshot> {
  await requireUserId();
  const fromDate = dateKeyDaysAgo(days - 1);
  const [profileResult, medicinesResult, doseResult, nudgeResult] = await Promise.all([
    supabase
      .from('app_profiles')
      .select('diseases,allergies')
      .eq('user_id', patientUserId)
      .maybeSingle(),
    supabase
      .from('patient_medications')
      .select('client_id,medication_code,custom_name,dosage,schedule,meal_timing,status,created_at,medications(name_th,name_en)')
      .eq('user_id', patientUserId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
    supabase
      .from('dose_events')
      .select('id,patient_medication_client_id,slot,event_date,taken,occurred_at')
      .eq('user_id', patientUserId)
      .gte('event_date', fromDate)
      .order('event_date', { ascending: false })
      .order('occurred_at', { ascending: false }),
    supabase
      .from('caregiver_nudges')
      .select('id,patient_user_id,caregiver_user_id,kind,text,created_at,read_at')
      .eq('patient_user_id', patientUserId)
      .order('created_at', { ascending: false })
      .limit(10),
  ]);
  throwIfError(profileResult.error);
  throwIfError(medicinesResult.error);
  throwIfError(doseResult.error);
  throwIfError(nudgeResult.error);

  const medicines = (medicinesResult.data ?? []).map((row): RemotePatientMedicine => {
    const definition = normalizeMedicineDefinition(row.medications);
    return {
      clientId: row.client_id,
      medicationCode: row.medication_code,
      nameTh: row.custom_name || definition.name_th || row.medication_code || 'ไม่พบชื่อยา',
      nameEn: definition.name_en || '',
      dosage: row.dosage || 'ไม่ได้ระบุจำนวน',
      schedules: normalizeSchedules(row.schedule),
      mealTiming: normalizeMealTiming(row.meal_timing),
      status: row.status as MedicineStatus,
      createdAt: row.created_at,
    };
  });
  const doseEvents = (doseResult.data ?? [])
    .filter((row) => scheduleSlots.includes(row.slot as ScheduleSlot))
    .map((row): RemoteDoseEvent => ({
      id: row.id,
      medicineClientId: row.patient_medication_client_id,
      slot: row.slot as ScheduleSlot,
      eventDate: row.event_date,
      taken: row.taken,
      occurredAt: row.occurred_at,
    }));
  const nudges = (nudgeResult.data ?? []).map((row) => mapCaregiverNudge(row));
  const allergies = Array.isArray(profileResult.data?.allergies)
    ? profileResult.data.allergies
      .map((item: unknown) => typeof item === 'string' ? item : (item as { name?: string })?.name)
      .filter((item: unknown): item is string => typeof item === 'string' && Boolean(item))
    : [];
  return {
    diseases: profileResult.data?.diseases ?? [],
    allergies,
    medicines,
    doseEvents,
    nudges,
  };
}
