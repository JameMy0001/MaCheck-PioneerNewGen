import type { CabinetMedicine, UserProfile } from '@/types/models';
import { parseMedicineDose, serializeMedicineDose } from '@/utils/medicine-dose';
import { fetchFirestoreCollection, setFirestoreDocument } from '@/services/firebase';

const scheduleSlots = ['morning', 'noon', 'evening', 'bedtime'] as const;
const normalizeSchedule = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return value.map((slot) => {
    if (scheduleSlots.includes(slot)) return slot;
    const hour = Number(String(slot).split(':')[0]);
    if (!Number.isFinite(hour)) return null;
    return hour < 11 ? 'morning' : hour < 16 ? 'noon' : hour < 20 ? 'evening' : 'bedtime';
  }).filter((slot): slot is CabinetMedicine['schedules'][number] => slot !== null);
};

export interface MaCheckSnapshot {
  profile: UserProfile;
  cabinet: CabinetMedicine[];
  archivedCabinet?: Record<string, CabinetMedicine>;
  takenByDate: Record<string, Record<string, boolean>>;
}

export type YaCheckSnapshot = MaCheckSnapshot;

function mapRemoteMedicine(item: Record<string, any>): CabinetMedicine {
  return {
    id: item.id || item.client_id,
    medicineId: item.medication_code || item.code || '',
    customName: item.custom_name ?? undefined,
    ...parseMedicineDose(item.dosage),
    schedules: normalizeSchedule(item.schedule),
    mealTiming: item.meal_timing ?? 'any',
    status: item.status ?? 'active',
    createdAt: item.created_at || new Date().toISOString(),
  };
}

export async function pushMaCheckSnapshot(snapshot: MaCheckSnapshot) {
  try {
    await setFirestoreDocument('user_profiles', 'current_user', {
      role: snapshot.profile.role,
      diseases: snapshot.profile.diseases,
      allergies: snapshot.profile.allergies,
      source_app: 'macheck',
    });

    for (const item of snapshot.cabinet) {
      await setFirestoreDocument('patient_medications', item.id, {
        medication_code: item.medicineId || '',
        custom_name: item.customName ?? '',
        dosage: serializeMedicineDose(item),
        schedule: item.schedules,
        meal_timing: item.mealTiming,
        status: item.status,
        source_app: 'macheck',
      });
    }
  } catch (error) {
    console.warn('[Sync] Firestore sync deferred:', error);
  }
}

export const pushYaCheckSnapshot = pushMaCheckSnapshot;

export async function pullMaCheckSnapshot() {
  try {
    const medRows = await fetchFirestoreCollection<any>('patient_medications');
    const activeCabinet: CabinetMedicine[] = [];
    const archivedCabinet: Record<string, CabinetMedicine> = {};

    for (const row of medRows) {
      const item = mapRemoteMedicine(row);
      if (item.status === 'stopped') archivedCabinet[item.id] = item;
      else activeCabinet.push(item);
    }

    return {
      profile: undefined,
      cabinet: activeCabinet,
      archivedCabinet,
      takenByDate: {},
    };
  } catch {
    return null;
  }
}

export const pullYaCheckSnapshot = pullMaCheckSnapshot;

export async function deleteRemoteMedication(clientId: string) {
  console.log('[Sync] Remote medication deletion in Firestore:', clientId);
}
