export type AdminRole = 'owner' | 'clinical_editor' | 'clinical_reviewer' | 'auditor';
export type ClinicalStatus = 'draft' | 'in_review' | 'published' | 'archived';
export type Severity = 'moderate' | 'severe';
export type Section = 'overview' | 'medications' | 'interactions' | 'food' | 'accounts' | 'admins' | 'audit';

export interface BulkClinicalResult {
  updated: number;
  status: 'in_review' | 'published';
  active?: boolean;
}

export interface ReviewFields {
  status: ClinicalStatus;
  source_references: string[];
  review_notes: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  published_at: string | null;
  dataset_version: number;
}

export interface Medication extends ReviewFields {
  code: string;
  name_en: string;
  name_th: string;
  category: string;
  common_dosages_mg: number[];
  description_th: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DrugInteraction extends ReviewFields {
  id: number;
  drug_1: string;
  drug_2: string;
  severity: Severity;
  title_th: string;
  description_th: string;
  advice_th: string;
  created_at: string;
  updated_at: string;
}

export interface FoodInteraction extends ReviewFields {
  code: string;
  food_th: string;
  keywords: string[];
  medicine_codes: string[];
  disease_codes: string[];
  severity: Severity;
  description_th: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  medications: number;
  drug_interactions: number;
  food_interactions: number;
  awaiting_review: number;
  needs_review: number;
  missing_sources: number;
  accounts: number;
  patient_medications: number;
  dose_events_30d: number;
  active_admins: number;
}

export interface AuditEntry {
  id: number;
  table_name: 'medications' | 'drug_interactions' | 'food_interactions';
  record_key: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  changed_by: string | null;
  changed_by_handle: string | null;
  changed_at: string;
}

export interface AdminMember {
  user_id: string;
  handle: string;
  role: AdminRole;
  active: boolean;
  created_at: string;
}

export interface AccountSummary {
  user_id: string;
  handle: string;
  profile_role: string | null;
  source_app: 'yacheck' | 'macheck' | null;
  subscription_tier?: 'free' | 'pro' | 'family' | 'admin';
  custom_quota_override?: number | null;
  created_at: string;
  last_login_at: string | null;
}
