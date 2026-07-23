import 'expo-sqlite/localStorage/install';

import { foodClashes, interactions, medicines } from '@/data/medicine-db';
import { getInteractionSafetyCopy } from '@/constants/interaction-safety';
import { useClinicalCatalogStore, type ClinicalCatalogSource } from '@/store/use-clinical-catalog-store';
import type { DrugInteraction, FoodClash, MedicineDefinition } from '@/types/models';

const CATALOG_CACHE_KEY = 'macheck-clinical-catalog-v1';

interface ClinicalCatalogCache {
  version: 1;
  cachedAt: string;
  medicines: MedicineDefinition[];
  interactions: DrugInteraction[];
  foodClashes: FoodClash[];
}

function applyCatalog(catalog: Pick<ClinicalCatalogCache, 'medicines' | 'interactions' | 'foodClashes'>) {
  medicines.splice(0, medicines.length, ...catalog.medicines);
  interactions.splice(0, interactions.length, ...catalog.interactions);
  foodClashes.splice(0, foodClashes.length, ...catalog.foodClashes);
}

function loadCachedCatalog() {
  try {
    const value = localStorage.getItem(CATALOG_CACHE_KEY);
    if (!value) return null;
    const parsed = JSON.parse(value) as ClinicalCatalogCache;
    if (parsed.version !== 1 || !Array.isArray(parsed.medicines) || !Array.isArray(parsed.interactions) || !Array.isArray(parsed.foodClashes)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveCachedCatalog(catalog: ClinicalCatalogCache) {
  try {
    localStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(catalog));
  } catch (error) {
    console.warn('Clinical catalogue cache write deferred:', error);
  }
}

export async function refreshClinicalCatalog() {
  const state = useClinicalCatalogStore.getState();
  state.beginRefresh();
  const cached = loadCachedCatalog();
  let fallbackSource: ClinicalCatalogSource = 'fallback';
  if (cached?.medicines.length) {
    applyCatalog(cached);
    state.applySource('cached', cached.cachedAt);
    fallbackSource = 'cached';
    useClinicalCatalogStore.getState().beginRefresh();
  }

  try {
    // When offline or emulator without live catalog, use bundled catalog fallback
    useClinicalCatalogStore.getState().applySource(fallbackSource, new Date().toISOString());
  } catch (error) {
    const message = error instanceof Error ? error.message : 'โหลดฐานข้อมูล Firebase ไม่สำเร็จ';
    useClinicalCatalogStore.getState().failRefresh(fallbackSource, message);
  }
}
