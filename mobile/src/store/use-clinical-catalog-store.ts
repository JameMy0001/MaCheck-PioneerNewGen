import { create } from 'zustand';

export type ClinicalCatalogSource = 'fresh' | 'cached' | 'fallback';

interface ClinicalCatalogState {
  source: ClinicalCatalogSource;
  lastUpdated: string | null;
  refreshing: boolean;
  revision: number;
  error: string;
  beginRefresh: () => void;
  applySource: (source: ClinicalCatalogSource, lastUpdated: string | null) => void;
  failRefresh: (source: ClinicalCatalogSource, message: string) => void;
}

export const useClinicalCatalogStore = create<ClinicalCatalogState>((set) => ({
  source: 'fallback',
  lastUpdated: null,
  refreshing: false,
  revision: 0,
  error: '',
  beginRefresh: () => set({ refreshing: true, error: '' }),
  applySource: (source, lastUpdated) => set((state) => ({
    source,
    lastUpdated,
    refreshing: false,
    error: '',
    revision: state.revision + 1,
  })),
  failRefresh: (source, message) => set({ source, refreshing: false, error: message }),
}));
