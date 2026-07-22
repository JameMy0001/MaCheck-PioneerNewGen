import type { CabinetMedicine, UserProfile } from '@/types/models';
import { supabase } from '@/services/supabase';
import { parseMedicineDose, serializeMedicineDose } from '@/utils/medicine-dose';

const scheduleSlots = ['morning', 'noon', 'evening', 'bedtime'] as const;
const normalizeSchedule = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return value.map((slot) => {
    if (scheduleSlots.includes(slot)) return slot;
    const hour = Number(String(slot).split(':')[0]);
    if (!Number.isFinite(hour)) return null;
    return hour < 11 ? 'morning' : hour < 16 ? 'noon' : hour < 20 ? 'evening' : 'bedtime';
  }).filter((slot): slot is CabinetMedicine['schedules'][number] => slot !== null);
};

export interface YaCheckSnapshot {
  profile: UserProfile;
  cabinet: CabinetMedicine[];
  takenByDate: Record<string, Record<string, boolean>>;
}

function mapRemoteMedicine(item: Record<string, any>): CabinetMedicine {
  return {
    id: item.client_id,
    medicineId: item.medication_code ?? '',
    customName: item.custom_name ?? undefined,
    ...parseMedicineDose(item.dosage),
    schedules: normalizeSchedule(item.schedule),
    mealTiming: item.meal_timing ?? 'any',
    status: item.status,
    createdAt: item.created_at,
  };
}

export async function pushYaCheckSnapshot(snapshot: YaCheckSnapshot) {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) return;

  const { error: profileError } = await supabase.from('app_profiles').upsert({
    user_id: userId,
    role: snapshot.profile.role,
    diseases: snapshot.profile.diseases,
    allergies: snapshot.profile.allergies.map((name) => ({ name, severity: 'moderate' })),
    font_scale: snapshot.profile.fontScale,
    sound_enabled: snapshot.profile.soundEnabled,
    source_app: 'yacheck',
  });
  if (profileError) throw profileError;

  // Keep the canonical Agent context in sync without exposing server credentials.
  // The RPC is authenticated and writes only to auth.uid().
  const { error: agentContextError } = await supabase.rpc('sync_agent_health_context', {
    p_diseases: snapshot.profile.diseases,
    p_allergies: snapshot.profile.allergies,
    p_weight_kg: snapshot.profile.weightKg ?? null,
  });
  if (agentContextError) {
    console.warn('[Sync] Agent health context deferred:', agentContextError.message);
  }

  if (snapshot.cabinet.length) {
    const { error } = await supabase.from('patient_medications').upsert(snapshot.cabinet.map((medicine) => ({
      user_id: userId,
      client_id: medicine.id,
      medication_code: medicine.medicineId || null,
      custom_name: medicine.customName || null,
      dosage: serializeMedicineDose(medicine),
      schedule: medicine.schedules,
      meal_timing: medicine.mealTiming,
      status: medicine.status,
      source_app: 'yacheck',
      deleted_at: null,
    })), { onConflict: 'user_id,client_id' });
    if (error) throw error;
  }

  const doseEvents = Object.entries(snapshot.takenByDate).flatMap(([date, slots]) => Object.entries(slots).map(([key, taken]) => {
    const separator = key.lastIndexOf(':');
    const medicineId = key.slice(0, separator);
    const slot = key.slice(separator + 1);
    return {
      user_id: userId,
      client_event_id: `${date}:${key}`,
      patient_medication_client_id: medicineId,
      slot,
      event_date: date,
      taken,
      source_app: 'yacheck',
    };
  }));
  if (doseEvents.length) {
    const { error } = await supabase.from('dose_events').upsert(doseEvents, { onConflict: 'user_id,client_event_id' });
    if (error) throw error;
  }
}

export async function pullYaCheckSnapshot() {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return null;
  const [profileResult, medicinesResult, dosesResult, conditionsResult, allergiesResult, weightResult] = await Promise.all([
    supabase.from('app_profiles').select('role,diseases,allergies,font_scale,sound_enabled').single(),
    supabase.from('patient_medications').select('*'),
    supabase.from('dose_events').select('client_event_id,taken,event_date,patient_medication_client_id,slot'),
    supabase.from('patient_conditions').select('code,name').eq('status', 'active'),
    supabase.from('patient_allergies').select('substance_code,substance_name,severity').is('effective_to', null),
    supabase.from('body_metrics').select('value,unit,measured_at').eq('metric_type', 'weight').eq('quality_flag', 'good').order('measured_at', { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (medicinesResult.error) throw medicinesResult.error;
  if (dosesResult.error) throw dosesResult.error;
  const remoteMedicines = medicinesResult.data.map(mapRemoteMedicine);
  const archivedCabinet = medicinesResult.data.reduce<Record<string, CabinetMedicine>>((all, item) => {
    if (item.deleted_at) all[item.client_id] = mapRemoteMedicine(item);
    return all;
  }, {});
  const legacyProfile = (profileResult.data ?? {}) as {
    role?: UserProfile['role'];
    diseases?: string[];
    allergies?: { name?: string; severity?: string }[];
    font_scale?: UserProfile['fontScale'];
    sound_enabled?: boolean;
  };
  const structuredDiseases = (conditionsResult.data ?? []).map((item) => item.code || item.name).filter(Boolean);
  const structuredAllergies = (allergiesResult.data ?? []).map((item) => ({
    name: item.substance_name || item.substance_code,
    severity: item.severity || 'unknown',
  }));

  return {
    profile: {
      ...legacyProfile,
      diseases: structuredDiseases.length ? structuredDiseases : (legacyProfile.diseases ?? []),
      allergies: structuredAllergies.length ? structuredAllergies : (legacyProfile.allergies ?? []),
      weight_kg: weightResult.data?.unit === 'kg' ? Number(weightResult.data.value) : undefined,
    },
    cabinet: remoteMedicines.filter((_, index) => !medicinesResult.data[index].deleted_at),
    archivedCabinet,
    takenByDate: dosesResult.data.reduce<Record<string, Record<string, boolean>>>((all, item) => {
      const dateEvents = all[item.event_date] ?? {};
      dateEvents[`${item.patient_medication_client_id}:${item.slot}`] = item.taken;
      all[item.event_date] = dateEvents;
      return all;
    }, {}),
  };
}

export async function deleteRemoteMedication(clientId: string) {
  const { data } = await supabase.auth.getSession();
  if (!data.session) return;
  const { error } = await supabase.from('patient_medications')
    .update({ deleted_at: new Date().toISOString() })
    .eq('user_id', data.session.user.id)
    .eq('client_id', clientId);
  if (error) throw error;
}
