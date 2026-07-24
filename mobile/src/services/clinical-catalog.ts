/**
 * Clinical Catalog Service for MaCheck App
 * (Phase 1 Mock - Full Implementation in Phase 2)
 */

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
  console.log('[ClinicalCatalog] getLatestCatalogRelease mock used for Phase 1');
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
  console.log('[ClinicalCatalog] fetchClinicalMedications mock used for Phase 1');
  return medicines;
}

/**
 * Refresh clinical catalog cache
 */
export async function refreshClinicalCatalog(): Promise<boolean> {
  return true;
}
