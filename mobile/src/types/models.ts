export type UserRole = 'patient' | 'caregiver';
export type FontScale = 'normal' | 'large' | 'xlarge';
export type ScheduleSlot = 'morning' | 'noon' | 'evening' | 'bedtime';
export type MedicineStatus = 'active' | 'stopped';
export type MealTiming = 'before' | 'after' | 'any';
export type Severity = 'info' | 'moderate' | 'severe';

export interface UserProfile {
  username: string;
  displayName: string;
  role: UserRole;
  diseases: string[];
  allergies: string[];
  weightKg?: number;
  fontScale: FontScale;
  language?: 'th' | 'en';
  soundEnabled: boolean;
  emergencyName: string;
  emergencyPhone: string;
}

export interface MedicineDefinition {
  id: string;
  nameEn: string;
  nameTh: string;
  category: string;
  categoryEn?: string;
  dosages: number[];
  description: string;
  descriptionEn?: string;
}

export interface CabinetMedicine {
  id: string;
  medicineId: string;
  customName?: string;
  tabletCount?: number;
  dosageMg?: number;
  schedules: ScheduleSlot[];
  mealTiming: MealTiming;
  status: MedicineStatus;
  createdAt: string;
}

export interface DrugInteraction {
  id: string;
  drug1: string;
  drug2: string;
  severity: Exclude<Severity, 'info'>;
  title: string;
  description: string;
  advice: string;
  datasetVersion?: number;
  reviewedAt?: string | null;
}

export interface FoodClash {
  id: string;
  food: string;
  keywords: string[];
  medicineIds?: string[];
  diseases?: string[];
  severity: Exclude<Severity, 'info'>;
  description: string;
}

export interface SafetyFinding {
  id: string;
  severity: Severity;
  title: string;
  description: string;
  advice?: string;
}
