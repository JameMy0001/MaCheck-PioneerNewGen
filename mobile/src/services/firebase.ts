/**
 * Firebase Service Client for MaCheck App
 * Provides typed Firestore and Auth interfaces with emulator support
 */

import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra ?? {};

export const FIREBASE_CONFIG = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || extra.EXPO_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || extra.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.EXPO_PUBLIC_GCP_PROJECT_ID || extra.EXPO_PUBLIC_GCP_PROJECT_ID || 'macheck-app-dev',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || extra.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || extra.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || extra.EXPO_PUBLIC_FIREBASE_APP_ID || '',
};

export const USE_EMULATOR = Boolean(
  process.env.EXPO_PUBLIC_USE_EMULATORS === 'true' || __DEV__
);

export const EMULATOR_HOST = process.env.EXPO_PUBLIC_EMULATOR_HOST || '127.0.0.1';

export const isFirebaseConfigured = Boolean(FIREBASE_CONFIG.projectId);

export interface UserProfileDoc {
  uid: string;
  handle?: string;
  displayName?: string;
  role: 'patient' | 'caregiver';
  diseases: string[];
  allergies: any[];
  weightKg?: number;
  fontScale: 'normal' | 'large' | 'xlarge';
  soundEnabled: boolean;
  emergencyContact?: { name: string; phone: string };
  consentVersion: string;
  privacyPolicyVersion: string;
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
}

export interface MedicationDoc {
  id: string;
  medicationCode?: string;
  customName?: string;
  tabletCount?: number;
  dosageMg?: number;
  dosageText?: string;
  schedules: string[];
  mealTiming: 'before' | 'after' | 'any';
  status: 'active' | 'stopped';
  sourceApp: 'macheck';
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  schemaVersion: number;
}

export interface DoseEventDoc {
  id: string;
  medicationClientId: string;
  slot: string;
  eventDate: string;
  taken: boolean;
  occurredAt: string;
  sourceApp: 'macheck';
  idempotencyKey: string;
}

export interface ClinicalMedicationDoc {
  medicationCode: string;
  nameEn: string;
  nameTh: string;
  category: string;
  commonDosagesMg: number[];
  descriptionTh: string;
  active: boolean;
  releaseId: string;
  reviewedAt: string;
}

export interface ClinicalInteractionDoc {
  canonicalPairId: string;
  drug1: string;
  drug2: string;
  severity: 'moderate' | 'severe';
  titleTh: string;
  descriptionTh: string;
  adviceTh: string;
  releaseId: string;
  reviewedAt: string;
}

export interface RiskSummaryDoc {
  score: number;
  tier: 'low' | 'medium' | 'high' | 'critical';
  reasonCodes: string[];
  rankedAt: string;
  adherence7d: number;
  missedStreak: number;
  explanationTh?: string;
  schemaVersion: number;
}

