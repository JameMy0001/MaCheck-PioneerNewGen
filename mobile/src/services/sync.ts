/**
 * Firestore Bidirectional Sync Service for MaCheck App
 * (Phase 2 - Firestore Integration)
 */

import { getAppAuth, getAppDb } from '@/services/firebase-client';
import type { CabinetMedicine, UserProfile } from '@/types/models';

export interface MaCheckSnapshot {
  profile?: UserProfile;
  cabinet: CabinetMedicine[];
  archivedCabinet?: Record<string, CabinetMedicine>;
  takenByDate: Record<string, Record<string, boolean>>;
}

export type YaCheckSnapshot = MaCheckSnapshot;

export async function pushMaCheckSnapshot(snapshot: MaCheckSnapshot) {
  try {
    const auth = getAppAuth();
    const uid = auth.currentUser?.uid;
    if (!uid) {
      console.warn('[Sync] Cannot push snapshot, user not authenticated');
      return;
    }

    const db = getAppDb();
    const batch = db.batch();
    const userRef = db.collection('users').doc(uid);

    // Update User Profile and takenByDate history on the main document
    const userUpdate: any = {
      updatedAt: new Date().toISOString(),
      takenByDate: snapshot.takenByDate,
    };
    if (snapshot.profile) {
      userUpdate.profile = snapshot.profile;
    }
    batch.set(userRef, userUpdate, { merge: true });

    // Sync active cabinet medicines to subcollection
    const medsRef = userRef.collection('medications');
    for (const med of snapshot.cabinet) {
      const medDocRef = medsRef.doc(med.id);
      batch.set(medDocRef, med, { merge: true });
    }

    await batch.commit();
    console.log('[Sync] Successfully pushed snapshot to Firestore');
  } catch (error) {
    console.error('[Sync] Failed to push snapshot:', error);
  }
}

export const pushYaCheckSnapshot = pushMaCheckSnapshot;

export async function pullMaCheckSnapshot(): Promise<MaCheckSnapshot | null> {
  try {
    const auth = getAppAuth();
    const uid = auth.currentUser?.uid;
    if (!uid) {
      return null;
    }

    const db = getAppDb();
    const userRef = db.collection('users').doc(uid);
    const userSnap = await userRef.get();
    
    let profile: UserProfile | undefined = undefined;
    let takenByDate: Record<string, Record<string, boolean>> = {};

    if (userSnap.data()) {
      const data = userSnap.data();
      profile = data?.profile;
      takenByDate = data?.takenByDate || {};
    }

    // Fetch medications subcollection
    const medsSnap = await userRef.collection('medications').get();
    const cabinet: CabinetMedicine[] = [];
    
    if (!medsSnap.empty) {
      medsSnap.forEach(doc => {
        cabinet.push(doc.data() as CabinetMedicine);
      });
    }

    console.log('[Sync] Successfully pulled snapshot from Firestore');
    return {
      profile,
      cabinet,
      takenByDate,
      archivedCabinet: {} // Not fully implemented in Phase 2 for simplicity
    };
  } catch (error) {
    console.error('[Sync] Failed to pull snapshot:', error);
    return null;
  }
}

export const pullYaCheckSnapshot = pullMaCheckSnapshot;

export async function deleteRemoteMedication(medicationId: string) {
  try {
    const auth = getAppAuth();
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const db = getAppDb();
    await db.collection('users').doc(uid).collection('medications').doc(medicationId).delete();
    console.log(`[Sync] Deleted remote medication ${medicationId}`);
  } catch (error) {
    console.error('[Sync] Failed to delete remote medication:', error);
  }
}
