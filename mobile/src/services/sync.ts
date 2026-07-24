/**
 * Firestore Bidirectional Sync Service for MaCheck App
 * (Phase 1 Mock - Full Implementation in Phase 2)
 */

import type { CabinetMedicine, UserProfile } from '@/types/models';

export interface MaCheckSnapshot {
  profile?: UserProfile;
  cabinet: CabinetMedicine[];
  archivedCabinet?: Record<string, CabinetMedicine>;
  takenByDate: Record<string, Record<string, boolean>>;
}

export type YaCheckSnapshot = MaCheckSnapshot;

export async function pushMaCheckSnapshot(snapshot: MaCheckSnapshot) {
  console.log('[Sync Mock] pushMaCheckSnapshot skipped for Phase 1');
}

export const pushYaCheckSnapshot = pushMaCheckSnapshot;

export async function pullMaCheckSnapshot(): Promise<MaCheckSnapshot | null> {
  console.log('[Sync Mock] pullMaCheckSnapshot skipped for Phase 1');
  return null;
}

export const pullYaCheckSnapshot = pullMaCheckSnapshot;

export async function deleteRemoteMedication(clientId: string) {
  console.log('[Sync Mock] deleteRemoteMedication skipped for Phase 1');
}
