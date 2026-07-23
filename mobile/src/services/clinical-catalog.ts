import 'expo-sqlite/localStorage/install';

import { foodClashes, interactions, medicines } from '@/data/medicine-db';
import { getInteractionSafetyCopy } from '@/constants/interaction-safety';
import { fetchFirestoreCollection } from '@/services/firebase';
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
    const [medicinesData, interactionsData, foodData] = await Promise.all([
      fetchFirestoreCollection<any>('medications'),
      fetchFirestoreCollection<any>('drug_interactions'),
      fetchFirestoreCollection<any>('food_interactions'),
    ]);

    if (medicinesData.length > 0) {
      const remoteMedicines: MedicineDefinition[] = medicinesData.map((item) => ({
        id: item.code || item.id,
        nameEn: item.nameEn || item.name_en || '',
        nameTh: item.nameTh || item.name_th || '',
        category: item.category || '',
        dosages: ((item.commonDosagesMg || item.common_dosages_mg) ?? []).map(Number),
        description: item.descriptionTh || item.description_th || '',
      }));

      const remoteInteractions: DrugInteraction[] = interactionsData.map((item) => ({
        id: String(item.id || item.code),
        drug1: item.drug1 || item.drug_1,
        drug2: item.drug2 || item.drug_2,
        severity: item.severity || 'moderate',
        ...getInteractionSafetyCopy(item.severity || 'moderate'),
      }));

      const remoteFoodClashes: FoodClash[] = foodData.map((item) => ({
        id: item.code || item.id,
        food: item.foodTh || item.food_th || '',
        keywords: item.keywords ?? [],
        medicineIds: (item.medicineCodes || item.medicine_codes) ?? [],
        diseases: (item.diseaseCodes || item.disease_codes) ?? [],
        severity: item.severity || 'moderate',
        description: item.descriptionTh || item.description_th || '',
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
    } else {
      useClinicalCatalogStore.getState().applySource(fallbackSource, new Date().toISOString());
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'โหลดฐานข้อมูล Firebase ไม่สำเร็จ';
    useClinicalCatalogStore.getState().failRefresh(fallbackSource, message);
  }
}
