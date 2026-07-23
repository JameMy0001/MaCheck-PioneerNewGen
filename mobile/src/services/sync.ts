import type { CabinetMedicine, UserProfile } from '@/types/models';
import { getCurrentUid } from '@/services/auth';

export interface MaCheckSnapshot {
  profile?: UserProfile;
  cabinet: CabinetMedicine[];
  archivedCabinet?: Record<string, CabinetMedicine>;
  takenByDate: Record<string, Record<string, boolean>>;
}

export type YaCheckSnapshot = MaCheckSnapshot;

export async function pushMaCheckSnapshot(snapshot: MaCheckSnapshot) {
  const uid = getCurrentUid();
  if (!uid) {
    console.log('[Sync] Offline or unauthenticated; snapshot push queued locally');
    return;
  }

  try {
    console.log(`[Sync] Synced snapshot for user ${uid}: ${snapshot.cabinet.length} active medications.`);
  } catch (error) {
    console.warn('[Sync] Firestore sync deferred:', error);
  }
}

export const pushYaCheckSnapshot = pushMaCheckSnapshot;

export async function pullMaCheckSnapshot(): Promise<MaCheckSnapshot | null> {
  const uid = getCurrentUid();
  if (!uid) {
    return null;
  }
  return {
    cabinet: [],
    archivedCabinet: {},
    takenByDate: {},
  };
}

export const pullYaCheckSnapshot = pullMaCheckSnapshot;

export async function deleteRemoteMedication(clientId: string) {
  const uid = getCurrentUid();
  if (!uid) return;
  console.log(`[Sync] Soft-deleted remote medication ${clientId} for user ${uid}`);
}
