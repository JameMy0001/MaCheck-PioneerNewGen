/**
 * Firebase / Firestore Configuration Service for MaCheck App
 * Replaces Supabase with Google Cloud Firebase Firestore 100%
 */

import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra ?? {};

export const FIREBASE_CONFIG = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || extra.EXPO_PUBLIC_FIREBASE_API_KEY || 'AIzaSyDemoKeyForMaCheckHackathon',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || extra.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'gen-lang-client-0740402744.firebaseapp.com',
  projectId: process.env.EXPO_PUBLIC_GCP_PROJECT_ID || extra.EXPO_PUBLIC_GCP_PROJECT_ID || 'gen-lang-client-0740402744',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || extra.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'gen-lang-client-0740402744.appspot.com',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || extra.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '1234567890',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || extra.EXPO_PUBLIC_FIREBASE_APP_ID || '1:1234567890:web:abcdef123456',
};

export const isFirebaseConfigured = Boolean(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId);

export interface FirestoreMedicationDoc {
  id?: string;
  code: string;
  nameEn: string;
  nameTh: string;
  category: string;
  commonDosagesMg: number[];
  descriptionTh: string;
  active: boolean;
  status: string;
}

export interface FirestoreDrugInteractionDoc {
  id?: string;
  drug1: string;
  drug2: string;
  severity: 'mild' | 'moderate' | 'severe';
  descriptionTh: string;
  safetyWarning: string;
}

/**
 * REST API client helper for Firebase Firestore (works across Expo Web, iOS, and Android without native binary dependencies)
 */
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents`;

export async function fetchFirestoreCollection<T>(collectionName: string): Promise<T[]> {
  try {
    const url = `${FIRESTORE_BASE_URL}/${collectionName}?key=${FIREBASE_CONFIG.apiKey}`;
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`[Firestore Fetch Note] ${collectionName} endpoint returned status ${response.status}`);
      return [];
    }
    const json = await response.json();
    const documents = json.documents || [];
    
    return documents.map((doc: any) => {
      const fields = doc.fields || {};
      const obj: any = { id: doc.name.split('/').pop() };
      for (const [key, val] of Object.entries<any>(fields)) {
        if ('stringValue' in val) obj[key] = val.stringValue;
        else if ('integerValue' in val) obj[key] = Number(val.integerValue);
        else if ('doubleValue' in val) obj[key] = Number(val.doubleValue);
        else if ('booleanValue' in val) obj[key] = val.booleanValue;
        else if ('arrayValue' in val) {
          obj[key] = (val.arrayValue.values || []).map((v: any) => v.stringValue || v.integerValue || v);
        }
      }
      return obj as T;
    });
  } catch (error) {
    console.warn(`[Firestore REST] Network fallback for ${collectionName}:`, error);
    return [];
  }
}

export async function setFirestoreDocument(collectionName: string, docId: string, data: Record<string, any>) {
  try {
    const url = `${FIRESTORE_BASE_URL}/${collectionName}/${docId}?key=${FIREBASE_CONFIG.apiKey}`;
    const fields: Record<string, any> = {};

    for (const [key, val] of Object.entries(data)) {
      if (typeof val === 'string') fields[key] = { stringValue: val };
      else if (typeof val === 'number') fields[key] = { doubleValue: val };
      else if (typeof val === 'boolean') fields[key] = { booleanValue: val };
      else if (Array.isArray(val)) {
        fields[key] = {
          arrayValue: {
            values: val.map((item) => ({ stringValue: String(item) })),
          },
        };
      }
    }

    const response = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
    });

    return response.ok;
  } catch (error) {
    console.warn('[Firestore Set Document Error]:', error);
    return false;
  }
}
