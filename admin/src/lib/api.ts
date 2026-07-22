import { supabase } from './supabase';
import type {
  AccountSummary,
  AgentRuntimeConfig,
  AdminMember,
  AdminRole,
  AuditEntry,
  BulkClinicalResult,
  DashboardStats,
  DrugInteraction,
  FoodInteraction,
  Medication,
} from '../types';
import { getInteractionSafetyCopy } from './interaction-safety';

function unwrap<T>(data: T | null, error: { message: string } | null): T {
  if (error) throw new Error(error.message);
  if (data === null) throw new Error('ไม่พบข้อมูลจากระบบ');
  return data;
}

export async function getAdminRole() {
  const { data, error } = await supabase.rpc('current_admin_role');
  return unwrap(data as AdminRole | null, error);
}

export async function getDashboardStats() {
  const { data, error } = await supabase.rpc('admin_dashboard_stats');
  return unwrap(data as DashboardStats | null, error);
}

export async function listMedications() {
  const { data, error } = await supabase.from('medications').select('*').order('updated_at', { ascending: false });
  return unwrap(data as Medication[] | null, error);
}

export async function listDrugInteractions() {
  const { data, error } = await supabase.from('drug_interactions').select('*').order('updated_at', { ascending: false });
  return unwrap(data as DrugInteraction[] | null, error);
}

export async function listFoodInteractions() {
  const { data, error } = await supabase.from('food_interactions').select('*').order('updated_at', { ascending: false });
  return unwrap(data as FoodInteraction[] | null, error);
}

export async function listAudit(limit = 200) {
  const { data, error } = await supabase.rpc('admin_list_audit', { row_limit: limit });
  return unwrap(data as AuditEntry[] | null, error);
}

export async function listAccounts(search = '') {
  const { data, error } = await supabase.rpc('admin_list_accounts', {
    search_text: search,
    row_limit: 200,
    row_offset: 0,
  });
  return unwrap(data as AccountSummary[] | null, error);
}

export async function listAdminMembers() {
  const { data, error } = await supabase.rpc('admin_list_members');
  return unwrap(data as AdminMember[] | null, error);
}

export async function setAdminMember(handle: string, role: AdminRole, active: boolean) {
  const { error } = await supabase.rpc('admin_set_member', {
    member_handle: handle,
    member_role: role,
    member_active: active,
  });
  if (error) throw new Error(error.message);
}

export async function bulkUpdateMedications(
  medicationCodes: string[],
  targetStatus: 'in_review' | 'published',
  reviewedAt: string,
) {
  const { data, error } = await supabase.rpc('admin_bulk_update_medications', {
    p_medication_codes: medicationCodes,
    p_target_status: targetStatus,
    p_reviewed_at: reviewedAt,
  });
  return unwrap(data as BulkClinicalResult | null, error);
}

export async function bulkUpdateDrugInteractions(
  interactionIds: number[],
  targetStatus: 'in_review' | 'published',
  reviewedAt: string,
) {
  const { data, error } = await supabase.rpc('admin_bulk_update_drug_interactions', {
    p_interaction_ids: interactionIds,
    p_target_status: targetStatus,
    p_reviewed_at: reviewedAt,
  });
  return unwrap(data as BulkClinicalResult | null, error);
}

export async function bulkUpdateFoodInteractions(
  foodInteractionCodes: string[],
  targetStatus: 'in_review' | 'published',
  reviewedAt: string,
) {
  const { data, error } = await supabase.rpc('admin_bulk_update_food_interactions', {
    p_food_interaction_codes: foodInteractionCodes,
    p_target_status: targetStatus,
    p_reviewed_at: reviewedAt,
  });
  return unwrap(data as BulkClinicalResult | null, error);
}

export async function saveMedication(record: Partial<Medication>, originalCode?: string) {
  const payload = {
    code: record.code?.trim().toLowerCase(),
    name_en: record.name_en?.trim(),
    name_th: record.name_th?.trim(),
    category: record.category?.trim(),
    common_dosages_mg: record.common_dosages_mg ?? [],
    description_th: record.description_th?.trim() ?? '',
    active: record.active ?? true,
    status: record.status ?? 'draft',
    source_references: record.source_references ?? [],
    review_notes: record.review_notes?.trim() ?? '',
    reviewed_at: record.reviewed_at || null,
  };
  if (originalCode) {
    const { error } = await supabase.from('medications').update(payload).eq('code', originalCode);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from('medications').insert(payload);
    if (error) throw new Error(error.message);
  }
}

export async function saveDrugInteraction(record: Partial<DrugInteraction>, id?: number) {
  const sorted = [record.drug_1 ?? '', record.drug_2 ?? ''].sort();
  const severity = record.severity ?? 'moderate';
  const payload = {
    drug_1: sorted[0],
    drug_2: sorted[1],
    severity,
    ...getInteractionSafetyCopy(severity),
    status: record.status ?? 'draft',
    source_references: record.source_references ?? [],
    review_notes: record.review_notes?.trim() ?? '',
    reviewed_at: record.reviewed_at || null,
  };
  if (id) {
    const { error } = await supabase.from('drug_interactions').update(payload).eq('id', id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from('drug_interactions').insert(payload);
    if (error) throw new Error(error.message);
  }
}

export async function saveFoodInteraction(record: Partial<FoodInteraction>, originalCode?: string) {
  const payload = {
    code: record.code?.trim().toLowerCase(),
    food_th: record.food_th?.trim(),
    keywords: record.keywords ?? [],
    medicine_codes: record.medicine_codes ?? [],
    disease_codes: record.disease_codes ?? [],
    severity: record.severity ?? 'moderate',
    description_th: record.description_th?.trim(),
    status: record.status ?? 'draft',
    source_references: record.source_references ?? [],
    review_notes: record.review_notes?.trim() ?? '',
    reviewed_at: record.reviewed_at || null,
  };
  if (originalCode) {
    const { error } = await supabase.from('food_interactions').update(payload).eq('code', originalCode);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from('food_interactions').insert(payload);
    if (error) throw new Error(error.message);
  }
}

export async function deleteClinicalRecord(table: 'medications' | 'drug_interactions' | 'food_interactions', key: string | number) {
  const column = table === 'drug_interactions' ? 'id' : 'code';
  const { error } = await supabase.from(table).delete().eq(column, key);
  if (error) throw new Error(error.message);
}

export async function updateUserSubscription(targetUserIdOrHandle: string, newTier: string, customQuota: number | null = null) {
  const cleanHandle = targetUserIdOrHandle.replace(/^@/, '').trim();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanHandle);

  // 1. Call RPC function passing either UUID or Handle
  const { data: rpcData, error: rpcErr } = await supabase.rpc('admin_update_user_subscription', {
    p_target_user_id: isUuid ? cleanHandle : null,
    p_target_handle: isUuid ? null : cleanHandle,
    p_new_tier: newTier,
    p_quota_override: customQuota,
  });

  if (!rpcErr) return rpcData;

  // 2. Fallback: try direct app_profiles table update if UUID
  if (isUuid) {
    const { error: appErr } = await supabase.from('app_profiles').update({
      subscription_tier: newTier,
      custom_quota_override: customQuota,
      updated_at: new Date().toISOString(),
    }).eq('user_id', cleanHandle);

    if (!appErr) return { success: true };
  }

  throw new Error(`ไม่สามารถอัปเดตสิทธิ์ของ @${cleanHandle}: ${rpcErr.message}`);
}

async function invokeAgentAdmin<T>(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('agent-admin', { body });
  if (error) {
    const response = (error as { context?: unknown }).context;
    if (response && typeof response === 'object' && 'clone' in response) {
      const cloned = (response as Response).clone();
      const payload = await cloned.json().catch(() => null) as { error?: string; message?: string; code?: string } | null;
      if (payload?.error || payload?.message) throw new Error(payload.error || payload.message);
      if ((response as Response).status === 401) throw new Error('เซสชันหมดอายุ กรุณาออกจากระบบแล้วเข้าสู่ระบบใหม่');
      if ((response as Response).status === 403) throw new Error('บัญชีนี้ไม่มีสิทธิ์จัดการ AI Agent');
      throw new Error(`ระบบจัดการ AI Agent ตอบกลับผิดพลาด (HTTP ${(response as Response).status})`);
    }
    throw new Error((data as { error?: string } | null)?.error || error.message);
  }
  if (!(data as { success?: boolean } | null)?.success) {
    throw new Error((data as { error?: string } | null)?.error || 'คำสั่ง AI Agent ไม่สำเร็จ');
  }
  return data as T;
}

export async function getAgentRuntimeConfig() {
  const data = await invokeAgentAdmin<{ success: true; role: AdminRole; config: AgentRuntimeConfig }>({ intent: 'get_config' });
  return data.config;
}

export async function updateAgentRuntimeConfig(config: AgentRuntimeConfig) {
  const data = await invokeAgentAdmin<{ success: true; config: AgentRuntimeConfig }>({
    intent: 'update_config',
    primaryModel: config.primaryModel,
    fallbackModel: config.fallbackModel,
    temperature: config.temperature,
    maxTokens: config.maxTokens,
    requestTimeoutMs: config.requestTimeoutMs,
    aiEnabled: config.aiEnabled,
    promptVersion: config.promptVersion,
  });
  return data.config;
}

export async function rotateAgentApiKey(apiKey: string) {
  return await invokeAgentAdmin<{ success: true; fingerprint: string; message: string }>({
    intent: 'rotate_api_key',
    apiKey,
  });
}

export async function testAgentConnection() {
  return await invokeAgentAdmin<{ success: true; code: string; latencyMs: number }>({ intent: 'test_connection' });
}
