/**
 * Clinical Catalog Service for MaCheck App
 * (Phase 2 - Firestore Integration)
 */

import { getAppDb } from '@/services/firebase-client';
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
    const snapshot = await db.collection('clinicalReleases')
      .orderBy('publishedAt', 'desc')
      .limit(1)
      .get();
      
    if (snapshot.empty) {
      return null;
    }
    
    const doc = snapshot.docs[0];
    if (!doc) return null;
    const data = doc.data();
    
    return {
      releaseId: doc.id,
      publishedAt: data.publishedAt,
      reviewedBy: data.reviewedBy || 'System',
      medicationCount: data.medicationCount || 0,
      interactionCount: data.interactionCount || 0,
    };
  } catch (error) {
    console.error('[ClinicalCatalog] Failed to fetch latest release:', error);
    return null;
  }
}

/**
 * Fetch medication database from Firestore
 */
export async function fetchClinicalMedications(): Promise<MedicineDefinition[]> {
  try {
    const db = getAppDb();
    const snapshot = await db.collection('clinicalMedications').get();
    
    if (snapshot.empty) {
      return [];
    }
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        nameTh: data.nameTh || '',
        nameEn: data.nameEn || '',
        category: data.category || '',
        categoryEn: data.categoryEn || '',
        dosages: data.dosages || [],
        description: data.description || '',
        descriptionEn: data.descriptionEn || ''
      } as MedicineDefinition;
    });
  } catch (error) {
    console.error('[ClinicalCatalog] Failed to fetch medications:', error);
    return [];
  }
}

/**
 * Refresh clinical catalog cache
 */
export async function refreshClinicalCatalog(): Promise<boolean> {
  // In a full implementation, this might sync data to local SQLite/AsyncStorage
  console.log('[ClinicalCatalog] Refresh requested');
  return true;
}
