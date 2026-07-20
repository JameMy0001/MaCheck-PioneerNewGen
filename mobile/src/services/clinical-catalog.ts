import 'expo-sqlite/localStorage/install';

import { foodClashes, interactions, medicines } from '@/data/medicine-db';
import { getInteractionSafetyCopy } from '@/constants/interaction-safety';
import { supabase } from '@/services/supabase';
import { useClinicalCatalogStore, type ClinicalCatalogSource } from '@/store/use-clinical-catalog-store';
import type { DrugInteraction, FoodClash, MedicineDefinition } from '@/types/models';

const CATALOG_CACHE_KEY = 'yacheck-clinical-catalog-v1';

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
    const [medicinesResult, interactionsResult, foodResult] = await Promise.all([
      supabase.from('medications').select('code,name_en,name_th,category,common_dosages_mg,description_th,dataset_version,reviewed_at').eq('active', true).eq('status', 'published'),
      supabase.from('drug_interactions').select('id,drug_1,drug_2,severity,dataset_version,reviewed_at').eq('status', 'published'),
      supabase.from('food_interactions').select('code,food_th,keywords,medicine_codes,disease_codes,severity,description_th,dataset_version,reviewed_at').eq('status', 'published'),
    ]);

    if (medicinesResult.error) throw medicinesResult.error;
    if (interactionsResult.error) throw interactionsResult.error;
    if (foodResult.error) throw foodResult.error;
    if (!medicinesResult.data.length) throw new Error('ไม่พบรายการยาที่เผยแพร่แล้วในฐานข้อมูลกลาง');

    const remoteMedicines: MedicineDefinition[] = medicinesResult.data.map((item) => ({
      id: item.code,
      nameEn: item.name_en,
      nameTh: item.name_th,
      category: item.category,
      dosages: (item.common_dosages_mg ?? []).map(Number),
      description: item.description_th,
    }));
    const remoteInteractions: DrugInteraction[] = interactionsResult.data.map((item) => ({
      id: String(item.id),
      drug1: item.drug_1,
      drug2: item.drug_2,
      severity: item.severity,
      datasetVersion: item.dataset_version,
      reviewedAt: item.reviewed_at,
      ...getInteractionSafetyCopy(item.severity),
    }));
    const remoteFoodClashes: FoodClash[] = foodResult.data.map((item) => ({
      id: item.code,
      food: item.food_th,
      keywords: item.keywords ?? [],
      medicineIds: item.medicine_codes ?? [],
      diseases: item.disease_codes ?? [],
      severity: item.severity,
      description: item.description_th,
    }));

    const nextCatalog: ClinicalCatalogCache = {
      version: 1,
      cachedAt: new Date().toISOString(),
      medicines: remoteMedicines,
      interactions: remoteInteractions,
      foodClashes: remoteFoodClashes,
    };
    applyCatalog(nextCatalog);
    saveCachedCatalog(nextCatalog);
    useClinicalCatalogStore.getState().applySource('fresh', nextCatalog.cachedAt);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'โหลดฐานข้อมูลกลางไม่สำเร็จ';
    useClinicalCatalogStore.getState().failRefresh(fallbackSource, message);
    throw error;
  }
}
