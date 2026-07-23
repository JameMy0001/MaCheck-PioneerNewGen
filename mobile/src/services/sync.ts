/**
 * Firestore Bidirectional Sync Service for MaCheck App
 * Synchronizes user profile, medications, and dose events with Firestore
 */

import {
  collection,
  doc,
  getDocs,
  writeBatch,
  updateDoc,
  serverTimestamp,
  query,
  where,
} from 'firebase/firestore';
import type { CabinetMedicine, UserProfile, ScheduleSlot } from '@/types/models';
import { getCurrentUid } from '@/services/auth';
import { getAppDb } from '@/services/firebase-client';
import {
  medicationConverter,
  doseEventConverter,
  profileConverter,
} from '@/services/firestore-converters';

export interface MaCheckSnapshot {
  profile?: UserProfile;
  cabinet: CabinetMedicine[];
  archivedCabinet?: Record<string, CabinetMedicine>;
  takenByDate: Record<string, Record<string, boolean>>;
}

export type YaCheckSnapshot = MaCheckSnapshot;

/**
 * Push snapshot of local profile, cabinet, and dose events to Firestore
 */
export async function pushMaCheckSnapshot(snapshot: MaCheckSnapshot) {
  const uid = getCurrentUid();
  if (!uid) {
    console.log('[Sync] Unauthenticated or offline; snapshot push queued locally');
    return;
  }

  const db = getAppDb();

  try {
    const batch = writeBatch(db);

    // 1. Sync Profile
    if (snapshot.profile) {
      const profileRef = doc(db, 'users', uid).withConverter(profileConverter);
      batch.set(
        profileRef,
        {
          uid,
          displayName: snapshot.profile.displayName,
          role: snapshot.profile.role || 'patient',
          diseases: snapshot.profile.diseases || [],
          allergies: snapshot.profile.allergies || [],
          weightKg: snapshot.profile.weightKg,
          fontScale: snapshot.profile.fontScale || 'normal',
          soundEnabled: snapshot.profile.soundEnabled ?? true,
          emergencyContact: {
            name: snapshot.profile.emergencyName || '',
            phone: snapshot.profile.emergencyPhone || '',
          },
          consentVersion: '1.0',
          privacyPolicyVersion: '1.0',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          schemaVersion: 1,
        },
        { merge: true }
      );
    }

    // 2. Sync Active Medications
    const medsColl = collection(db, 'users', uid, 'medications').withConverter(medicationConverter);
    for (const item of snapshot.cabinet) {
      const medRef = doc(medsColl, item.id);
      batch.set(
        medRef,
        {
          id: item.id,
          medicationCode: item.medicineId,
          customName: item.customName,
          dosageMg: item.dosageMg,
          dosageText: item.dosageMg ? `${item.dosageMg}mg` : '',
          schedules: item.schedules || [],
          mealTiming: item.mealTiming || 'any',
          status: item.status || 'active',
          sourceApp: 'macheck',
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          schemaVersion: 1,
        },
        { merge: true }
      );
    }

    // 3. Sync Dose Events from takenByDate
    const doseEventsColl = collection(db, 'users', uid, 'doseEvents').withConverter(doseEventConverter);
    if (snapshot.takenByDate) {
      for (const [dateKey, slotObj] of Object.entries(snapshot.takenByDate)) {
        if (!slotObj) continue;
        for (const [slotKey, taken] of Object.entries(slotObj)) {
          const parts = slotKey.split('_');
          const medClientId = parts[0] || 'med';
          const slotTime = parts.slice(1).join('_') || 'dose';
          const eventId = `${medClientId}_${dateKey}_${slotTime}`;
          const eventRef = doc(doseEventsColl, eventId);

          batch.set(
            eventRef,
            {
              id: eventId,
              medicationClientId: medClientId,
              slot: slotTime,
              eventDate: dateKey,
              taken: Boolean(taken),
              occurredAt: new Date().toISOString(),
              sourceApp: 'macheck',
              idempotencyKey: eventId,
            },
            { merge: true }
          );
        }
      }
    }

    await batch.commit();
    console.log(`[Sync] Successfully committed snapshot to Firestore for user ${uid}`);
  } catch (error) {
    console.warn('[Sync] Firestore sync batch write error:', error);
  }
}

export const pushYaCheckSnapshot = pushMaCheckSnapshot;

/**
 * Pull remote user medications and dose events from Firestore
 */
export async function pullMaCheckSnapshot(): Promise<MaCheckSnapshot | null> {
  const uid = getCurrentUid();
  if (!uid) return null;

  const db = getAppDb();

  try {
    const medsColl = collection(db, 'users', uid, 'medications').withConverter(medicationConverter);
    const medsQuery = query(medsColl, where('status', '==', 'active'));
    const medsSnap = await getDocs(medsQuery);

    const cabinet: CabinetMedicine[] = medsSnap.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: data.id,
        medicineId: data.medicationCode || data.id,
        customName: data.customName,
        dosageMg: data.dosageMg,
        schedules: (data.schedules || []) as ScheduleSlot[],
        mealTiming: data.mealTiming || 'any',
        status: data.status || 'active',
        createdAt: data.createdAt || new Date().toISOString(),
      };
    });

    const doseEventsColl = collection(db, 'users', uid, 'doseEvents').withConverter(doseEventConverter);
    const doseSnap = await getDocs(doseEventsColl);

    const takenByDate: Record<string, Record<string, boolean>> = {};
    for (const docSnap of doseSnap.docs) {
      const e = docSnap.data();
      if (!takenByDate[e.eventDate]) {
        takenByDate[e.eventDate] = {};
      }
      const slotKey = `${e.medicationClientId}_${e.slot}`;
      const targetMap = takenByDate[e.eventDate];
      if (targetMap) {
        targetMap[slotKey] = Boolean(e.taken);
      }
    }


    return {
      cabinet,
      archivedCabinet: {},
      takenByDate,
    };
  } catch (error) {
    console.warn('[Sync] Failed to pull Firestore snapshot:', error);
    return null;
  }
}

export const pullYaCheckSnapshot = pullMaCheckSnapshot;

/**
 * Soft-delete medication in Firestore
 */
export async function deleteRemoteMedication(clientId: string) {
  const uid = getCurrentUid();
  if (!uid) return;

  const db = getAppDb();
  try {
    const medRef = doc(db, 'users', uid, 'medications', clientId);
    await updateDoc(medRef, {
      status: 'stopped',
      deletedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    console.log(`[Sync] Soft-deleted remote medication ${clientId} for user ${uid}`);
  } catch (error) {
    console.warn(`[Sync] Failed to soft-delete remote medication ${clientId}:`, error);
  }
}
