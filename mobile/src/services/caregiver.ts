import { isFirebaseConfigured } from '@/services/firebase';
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

export async function getCaregiverRelationships(): Promise<CaregiverRelationship[]> {
  return [];
}

export async function inviteCaregiver(username: string): Promise<void> {
  console.log('[Caregiver] Inviting via Firebase Firestore:', username);
}

export async function respondToCaregiverInvitation(invitationId: string, accept: boolean): Promise<void> {}
export async function cancelCaregiverInvitation(invitationId: string): Promise<void> {}
export async function revokeCaregiverAccess(linkId: string): Promise<void> {}

export async function sendCaregiverNudge(patientUserId: string, kind: 'check_schedule' | 'contact_caregiver'): Promise<void> {}
export async function sendCaregiverMessage(patientUserId: string, text: string): Promise<string> {
  return `msg_${Date.now()}`;
}
export async function markCaregiverNudgeRead(nudgeId: string): Promise<void> {}
export async function getMyCaregiverNudges(): Promise<CaregiverNudge[]> {
  return [];
}

export async function getRemotePatientSnapshot(patientUserId: string, days: 7 | 30): Promise<RemotePatientSnapshot> {
  return {
    diseases: [],
    allergies: [],
    medicines: [],
    doseEvents: [],
    nudges: [],
  };
}
