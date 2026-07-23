import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { secureStateStorage } from '@/services/secure-storage';
import type { CabinetMedicine, FontScale, ScheduleSlot, UserProfile } from '@/types/models';
import { getTodayKey } from '@/utils/safety';

interface AppState {
  hydrated: boolean;
  authReady: boolean;
  authenticated: boolean;
  registered: boolean;
  profile: UserProfile;
  cabinet: CabinetMedicine[];
  archivedCabinet: Record<string, CabinetMedicine>;
  takenByDate: Record<string, Record<string, boolean>>;
  waterByDate: Record<string, number>;
  setHydrated: (hydrated: boolean) => void;
  setAuthState: (ready: boolean, authenticated: boolean) => void;
  mergeRemoteSnapshot: (snapshot: { profile?: Partial<UserProfile>; cabinet: CabinetMedicine[]; archivedCabinet?: Record<string, CabinetMedicine>; takenByDate: Record<string, Record<string, boolean>> }) => void;
  register: (profile: Partial<UserProfile>) => void;
  updateProfile: (profile: Partial<UserProfile>) => void;
  setFontScale: (fontScale: FontScale) => void;
  addAllergy: (name: string) => void;
  removeAllergy: (name: string) => void;
  toggleDisease: (disease: string) => void;
  addMedicine: (medicine: Omit<CabinetMedicine, 'id' | 'createdAt' | 'status'>) => CabinetMedicine;
  stopMedicine: (id: string) => void;
  resumeMedicine: (id: string) => void;
  removeMedicine: (id: string) => void;
  toggleTaken: (id: string, slot: ScheduleSlot) => void;
  recordWater: () => void;
  reset: () => void;
}

const initialProfile: UserProfile = {
  username: '',
  displayName: '',
  role: 'patient',
  diseases: [],
  allergies: [],
  fontScale: 'normal',
  soundEnabled: true,
  emergencyName: '',
  emergencyPhone: '',
};

const generateId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      authReady: false,
      authenticated: false,
      registered: false,
      profile: initialProfile,
      cabinet: [],
      archivedCabinet: {},
      takenByDate: {},
      waterByDate: {},
      setHydrated: (hydrated) => set({ hydrated }),
      setAuthState: (authReady, authenticated) => set({ authReady, authenticated }),
      mergeRemoteSnapshot: (snapshot) => set((state) => {
        const remoteMedicineIds = new Set([
          ...snapshot.cabinet.map((medicine) => medicine.id),
          ...Object.keys(snapshot.archivedCabinet ?? {}),
        ]);
        return {
          profile: { ...state.profile, ...snapshot.profile, username: state.profile.username, displayName: state.profile.displayName || state.profile.username },
          cabinet: [...state.cabinet.filter((local) => !remoteMedicineIds.has(local.id)), ...snapshot.cabinet],
          archivedCabinet: { ...state.archivedCabinet, ...(snapshot.archivedCabinet ?? {}) },
          takenByDate: Object.entries(snapshot.takenByDate).reduce((all, [date, values]) => ({ ...all, [date]: { ...(all[date] ?? {}), ...values } }), state.takenByDate),
        };
      }),
      register: (profile) => set((state) => ({ registered: true, profile: { ...state.profile, ...profile } })),
      updateProfile: (profile) => set((state) => ({ profile: { ...state.profile, ...profile } })),
      setFontScale: (fontScale) => set((state) => ({ profile: { ...state.profile, fontScale } })),
      addAllergy: (name) => set((state) => {
        const trimmed = name.trim();
        if (!trimmed || state.profile.allergies.includes(trimmed)) return state;
        return { profile: { ...state.profile, allergies: [...state.profile.allergies, trimmed] } };
      }),
      removeAllergy: (name) => set((state) => ({
        profile: { ...state.profile, allergies: state.profile.allergies.filter((item) => item !== name) },
      })),
      toggleDisease: (disease) => set((state) => ({
        profile: {
          ...state.profile,
          diseases: state.profile.diseases.includes(disease)
            ? state.profile.diseases.filter((item) => item !== disease)
            : [...state.profile.diseases, disease],
        },
      })),
      addMedicine: (medicine) => {
        const created: CabinetMedicine = {
          ...medicine,
          id: generateId(),
          status: 'active',
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ cabinet: [...state.cabinet, created] }));
        return created;
      },
      stopMedicine: (id) => set((state) => ({
        cabinet: state.cabinet.map((item) => item.id === id ? { ...item, status: 'stopped' } : item),
      })),
      resumeMedicine: (id) => set((state) => ({
        cabinet: state.cabinet.map((item) => item.id === id ? { ...item, status: 'active' } : item),
      })),
      removeMedicine: (id) => set((state) => {
        const medicine = state.cabinet.find((item) => item.id === id);
        return {
          cabinet: state.cabinet.filter((item) => item.id !== id),
          archivedCabinet: medicine ? { ...state.archivedCabinet, [id]: medicine } : state.archivedCabinet,
        };
      }),
      toggleTaken: (id, slot) => set((state) => {
        const date = getTodayKey();
        const key = `${id}:${slot}`;
        const current = state.takenByDate[date] ?? {};
        return { takenByDate: { ...state.takenByDate, [date]: { ...current, [key]: !current[key] } } };
      }),
      recordWater: () => set((state) => {
        const date = getTodayKey();
        return { waterByDate: { ...state.waterByDate, [date]: Math.min((state.waterByDate[date] ?? 0) + 1, 12) } };
      }),
      reset: () => set({ registered: false, authenticated: false, profile: initialProfile, cabinet: [], archivedCabinet: {}, takenByDate: {}, waterByDate: {} }),
    }),
    {
      name: 'macheck-mobile-state',
      version: 1,
      storage: createJSONStorage(() => secureStateStorage),
      partialize: ({ hydrated: _hydrated, authReady: _authReady, authenticated: _authenticated, ...state }) => state,
      onRehydrateStorage: () => (state) => state?.setHydrated(true),
    },
  ),
);

export function getAdherence(cabinet: CabinetMedicine[], taken: Record<string, boolean>) {
  const active = cabinet.filter((item) => item.status === 'active');
  const expected = active.reduce((sum, item) => sum + item.schedules.length, 0);
  if (expected === 0) return 100;
  const completed = active.reduce(
    (sum, item) => sum + item.schedules.filter((slot) => taken[`${item.id}:${slot}`]).length,
    0,
  );
  return Math.round((completed / expected) * 100);
}
