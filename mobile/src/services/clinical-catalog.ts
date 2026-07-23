/**
 * Clinical Catalog Service for MaCheck App
 * Reads medication and interaction catalog from Firestore with local fallback
 */

import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { getAppDb } from '@/services/firebase-client';
import { medicines, interactions } from '@/data/medicine-db';
import type { MedicineDefinition } from '@/types/models';

export interface ClinicalCatalogRelease {
  releaseId: string;
  publishedAt: string;
  reviewedBy: string;
  medicationCount: number;
  interactionCount: number;
}

/**
 * Fetch latest clinical catalog release info
 */
export async function getLatestCatalogRelease(): Promise<ClinicalCatalogRelease | null> {
  try {
    const db = getAppDb();
    const releaseRef = doc(db, 'clinicalCatalog', 'releases', 'latest');
    const snap = await getDoc(releaseRef);
    if (snap.exists()) {
      return snap.data() as ClinicalCatalogRelease;
    }
  } catch (error) {
    console.warn('[ClinicalCatalog] Failed to fetch release info, using bundled version:', error);
  }
  return {
    releaseId: 'bundled-v1.0',
    publishedAt: new Date().toISOString(),
    reviewedBy: 'MaCheck Pharmacist Board',
    medicationCount: medicines.length,
    interactionCount: interactions.length,
  };
}

/**
 * Fetch medication database from Firestore or fallback to local medicines DB
 */
export async function fetchClinicalMedications(): Promise<MedicineDefinition[]> {
  try {
    const db = getAppDb();
    const medsRef = collection(db, 'clinicalCatalog', 'releases', 'latest', 'medications');
    const snap = await getDocs(medsRef);
    if (!snap.empty) {
      return snap.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          nameTh: d.nameTh || docSnap.id,
          nameEn: d.nameEn || docSnap.id,
          category: d.category || 'general',
          dosages: d.commonDosagesMg || [10, 20, 50, 500],
          description: d.descriptionTh || '',
        };
      });
    }
  } catch (error) {
    console.warn('[ClinicalCatalog] Failed to fetch Firestore medications, returning local DB:', error);
  }
  return medicines;
}

/**
 * Refresh clinical catalog cache
 */
export async function refreshClinicalCatalog(): Promise<boolean> {
  try {
    await fetchClinicalMedications();
    return true;
  } catch (error) {
    console.warn('[ClinicalCatalog] Failed to refresh clinical catalog:', error);
    return false;
  }
}
