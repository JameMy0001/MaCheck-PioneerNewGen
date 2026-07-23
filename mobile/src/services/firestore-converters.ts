/**
 * Strongly-typed Firestore converters for MaCheck Data Models
 */

import {
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  SnapshotOptions,
  Timestamp,
} from 'firebase/firestore';
import type {
  UserProfileDoc,
  MedicationDoc,
  DoseEventDoc,
  RiskSummaryDoc,
} from '@/services/firebase';

export const profileConverter: FirestoreDataConverter<UserProfileDoc> = {
  toFirestore(profile: UserProfileDoc) {
    return {
      ...profile,
      updatedAt: Timestamp.now(),
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): UserProfileDoc {
    const data = snapshot.data(options);
    return {
      uid: snapshot.id,
      handle: data.handle,
      displayName: data.displayName,
      role: data.role || 'patient',
      diseases: data.diseases || [],
      allergies: data.allergies || [],
      weightKg: data.weightKg,
      fontScale: data.fontScale || 'normal',
      soundEnabled: data.soundEnabled ?? true,
      emergencyContact: data.emergencyContact,
      consentVersion: data.consentVersion || '1.0',
      privacyPolicyVersion: data.privacyPolicyVersion || '1.0',
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
      schemaVersion: data.schemaVersion || 1,
    };
  },
};

export const medicationConverter: FirestoreDataConverter<MedicationDoc> = {
  toFirestore(med: MedicationDoc) {
    return {
      ...med,
      updatedAt: Timestamp.now(),
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): MedicationDoc {
    const data = snapshot.data(options);
    return {
      id: snapshot.id,
      medicationCode: data.medicationCode,
      customName: data.customName,
      tabletCount: data.tabletCount,
      dosageMg: data.dosageMg,
      dosageText: data.dosageText,
      schedules: data.schedules || [],
      mealTiming: data.mealTiming || 'any',
      status: data.status || 'active',
      sourceApp: 'macheck',
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
      deletedAt: data.deletedAt instanceof Timestamp ? data.deletedAt.toDate().toISOString() : data.deletedAt,
      schemaVersion: data.schemaVersion || 1,
    };
  },
};

export const doseEventConverter: FirestoreDataConverter<DoseEventDoc> = {
  toFirestore(event: DoseEventDoc) {
    return {
      ...event,
      occurredAt: event.occurredAt ? Timestamp.fromDate(new Date(event.occurredAt)) : Timestamp.now(),
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): DoseEventDoc {
    const data = snapshot.data(options);
    return {
      id: snapshot.id,
      medicationClientId: data.medicationClientId,
      slot: data.slot,
      eventDate: data.eventDate,
      taken: Boolean(data.taken),
      occurredAt: data.occurredAt instanceof Timestamp ? data.occurredAt.toDate().toISOString() : data.occurredAt,
      sourceApp: 'macheck',
      idempotencyKey: data.idempotencyKey || `${data.medicationClientId}_${data.eventDate}_${data.slot}`,
    };
  },
};

export const riskSummaryConverter: FirestoreDataConverter<RiskSummaryDoc> = {
  toFirestore(summary: RiskSummaryDoc) {
    return {
      ...summary,
      rankedAt: Timestamp.now(),
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): RiskSummaryDoc {
    const data = snapshot.data(options);
    return {
      score: data.score || 0,
      tier: data.tier || 'low',
      reasonCodes: data.reasonCodes || [],
      rankedAt: data.rankedAt instanceof Timestamp ? data.rankedAt.toDate().toISOString() : data.rankedAt,
      adherence7d: data.adherence7d || 1.0,
      missedStreak: data.missedStreak || 0,
      explanationTh: data.explanationTh,
      schemaVersion: data.schemaVersion || 1,
    };
  },
};
