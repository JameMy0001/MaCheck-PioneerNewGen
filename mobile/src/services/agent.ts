import { getMedicine } from '@/data/medicine-db';
import { isSupabaseConfigured, supabase } from '@/services/supabase';
import { getAdherence, useAppStore } from '@/store/use-app-store';
import { checkDrugInteractions, checkFoodQuery, getTodayKey } from '@/utils/safety';

export interface AgentEvidenceRef {
  type: string;
  id: string;
  version?: string;
  description?: string;
}

export interface AgentSummaryRow {
  category:
    | 'conditions'
    | 'allergies'
    | 'drug_interactions'
    | 'medication_schedule'
    | 'medicine_cabinet'
    | 'adherence'
    | 'body_metrics';
  latestData?: string;
  finding: string;
  status: 'ok' | 'info' | 'needs_data' | 'needs_attention' | 'review_required' | 'critical';
  completeness: number;
  updatedAt: string;
  evidenceRefs: AgentEvidenceRef[];
}

export interface UnifiedAgentSummary {
  schemaVersion: string;
  summaryId: string;
  generatedAt: string;
  overallStatus: 'ok' | 'critical' | 'needs_attention';
  executionMode?: 'live' | 'rules_only';
  modelName?: string;
  llmPersonalizedAdvice?: string;
  rows: AgentSummaryRow[];
  priorities: string[];
  missingData: string[];
  allowedActions: string[];
  unchangedTreatment: boolean;
}

export interface AgentRunResponse {
  success: boolean;
  runId?: string;
  status?: string;
  summary?: UnifiedAgentSummary;
  quota_remaining?: number;
  max_weekly_quota?: number;
  current_tier?: string;
  execution_mode?: 'live' | 'rules_only';
  error_code?: string;
  message?: string;
}

export type AgentConversationMode = 'general' | 'symptom_intake';

export interface AgentChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface AgentChatReply {
  text: string;
  responseType: 'information' | 'clarifying_questions' | 'clinical_screening_summary' | 'urgent_escalation' | 'emergency_escalation';
  conversationMode: AgentConversationMode;
  requiresFollowUp: boolean;
}

interface AgentQuotaResponse {
  allowed: boolean;
  quota_remaining: number;
  current_tier: string;
  runs_this_week?: number;
  max_weekly_quota: number;
  message?: string;
}

const normalize = (value: unknown) => String(value ?? '').trim().toLocaleLowerCase('th');

function allergyMatchesMedicine(allergy: string, medicineId: string) {
  const medicine = getMedicine(medicineId);
  const allergen = normalize(allergy);
  if (!allergen) return false;
  if (normalize(medicineId) === allergen) return true;
  if (allergen.length < 4) return false;
  return [medicine?.nameEn, medicine?.nameTh]
    .filter(Boolean)
    .some((value) => {
      const candidate = normalize(value);
      return candidate.length >= 4 && (candidate === allergen || candidate.includes(allergen) || allergen.includes(candidate));
    });
}

const symptomMedicineRequest = (text: string) => {
  const query = normalize(text);
  const hasSymptom = ['ปวด', 'เจ็บ', 'บวม', 'ไข้', 'ไอ', 'เวียนหัว', 'คลื่นไส้', 'อาเจียน', 'ผื่น', 'ชา', 'อ่อนแรง', 'หายใจ']
    .some((term) => query.includes(term));
  return hasSymptom && [/(?:กิน|ทาน|ใช้)ยาอะไร/, /ควร(?:กิน|ทาน|ใช้)ยา/, /ยา(?:ตัว)?ไหนดี/, /แนะนำยา/]
    .some((pattern) => pattern.test(query));
};

const hasAffirmedEmergencySymptom = (text: string) => {
  const query = normalize(text);
  const patterns = [/หายใจ(?:ไม่ออก|ลำบาก|ติดขัด)/, /เจ็บ(?:แน่น|จุก)?หน้าอก/, /หมดสติ|ไม่รู้สึกตัว/, /ชัก(?:เกร็ง)?/, /ปากบวม|ลิ้นบวม|คอบวม/];
  return patterns.some((pattern) => {
    const matcher = new RegExp(pattern.source, 'gu');
    for (const match of query.matchAll(matcher)) {
      if (match.index === undefined) continue;
      const prefix = query.slice(Math.max(0, match.index - 24), match.index);
      if (!/(?:ไม่มี|ไม่ได้มี|ไม่ได้|ไม่พบ|ไม่รู้สึก)(?:อาการ)?\s*$/.test(prefix)) return true;
    }
    return false;
  });
};

const offlineIntakeQuestions = [
  'ก่อนประเมินเรื่องยา ขอถามอาการเพิ่มเติมเพื่อคัดกรองความเร่งด่วนก่อนครับ',
  '1. ปวดตรงไหน ข้างเดียวหรือสองข้าง และปวดระดับ 0–10 เท่าไร?',
  '2. เริ่มปวดเมื่อไร เป็นตลอดหรือเป็น ๆ หาย ๆ และปวดแบบตื้อ แปลบ แสบ หรือเกร็ง?',
  '3. ก่อนเริ่มอาการมีหกล้ม กระแทก ออกกำลังหนัก เดินทางนาน ผ่าตัด หรือนอนนิ่งนานไหม?',
  '4. มีบวม แดง ร้อน ชา อ่อนแรง ไข้ หรือเดินลงน้ำหนักไม่ได้ไหม?',
  '5. ตอนนี้มีหายใจลำบาก เจ็บหน้าอก หน้ามืด หรือหมดสติไหม?',
  'ตอบเป็นข้อ ๆ เท่าที่ทราบได้เลย หากมีอาการในข้อ 5 ให้โทร 1669 ทันที ไม่ต้องรอคำตอบจาก AI',
].join('\n');

function safeOfflineChatReply(
  userText: string,
  _history: AgentChatTurn[] = [],
  conversationMode: AgentConversationMode = 'general',
) {
  const store = useAppStore.getState();
  const activeCabinet = store.cabinet.filter((item) => item.status === 'active');
  const query = normalize(userText);

  if (hasAffirmedEmergencySymptom(userText)) {
    return 'อาการที่แจ้งอาจเป็นภาวะฉุกเฉิน ระบบจะไม่ประเมินยาในแชตนี้ กรุณาโทร 1669 หรือไปห้องฉุกเฉินทันที และอย่าขับรถเอง หากทำได้ให้นำรายการยาที่ใช้อยู่ไปด้วย';
  }

  if (conversationMode !== 'symptom_intake' && symptomMedicineRequest(userText)) {
    return offlineIntakeQuestions;
  }

  if (conversationMode === 'symptom_intake') {
    return 'ขอบคุณสำหรับข้อมูลเพิ่มเติม ขณะนี้ระบบอยู่ในโหมดกฎออฟไลน์และยังไม่สามารถประเมินอาการหรือเลือกยาให้ได้อย่างน่าเชื่อถือ กรุณานำข้อมูลอาการนี้พร้อมรายการยา โรคประจำตัว และประวัติแพ้ยาไปสอบถามแพทย์หรือเภสัชกร โดยอย่าเริ่มหรือปรับยาเอง';
  }

  if (query.includes('ยาตีกัน') || query.includes('ตีกัน')) {
    const findings = checkDrugInteractions(activeCabinet.map((item) => item.medicineId));
    if (findings.length) {
      return `⚠️ [โหมดกฎออฟไลน์] พบคู่ยาที่ต้องตรวจสอบ ${findings.length} คู่:\n• ${findings
        .map((finding) => finding.title)
        .join('\n• ')}\n\nอย่าปรับหรือหยุดยาเอง โปรดติดต่อแพทย์หรือเภสัชกรเพื่อยืนยันแนวทางที่เหมาะสม`;
    }
    return '[โหมดกฎออฟไลน์] ไม่พบคู่ยาที่ตรงกับฐานข้อมูลในเครื่องที่ตรวจครั้งนี้ ผลนี้ไม่ใช่การรับรองว่ายาทุกชนิดใช้ร่วมกันได้ โปรดตรวจสอบกับแพทย์หรือเภสัชกรเมื่อมีการเปลี่ยนยา';
  }

  if (query.includes('ส้มโอ') || query.includes('นม') || query.includes('ของแสลง') || query.includes('กาแฟ')) {
    const findings = checkFoodQuery(userText, activeCabinet, store.profile.diseases ?? []);
    if (findings.length) {
      return `⚠️ [โหมดกฎออฟไลน์] ${findings
        .map((finding) => `${finding.title}: ${finding.description}\n${finding.advice ?? ''}`)
        .join('\n\n')}`;
    }
    return '[โหมดกฎออฟไลน์] ไม่พบข้อมูลที่ตรงกับคำถามในฐานข้อมูลอาหารและยาที่มีอยู่ ระบบไม่สามารถกำหนดช่วงห่างที่เหมาะสมให้ยาทุกชนิดได้ โปรดดูฉลากยาหรือสอบถามเภสัชกร';
  }

  return '[โหมดกฎออฟไลน์] ระบบยังไม่มีข้อมูลที่เพียงพอสำหรับตอบคำถามนี้อย่างปลอดภัย กรุณาตรวจฉลากยาและสอบถามแพทย์หรือเภสัชกร โดยอย่าปรับ เพิ่ม ลด หรือหยุดยาเอง';
}

export const generateOfflineChatReply = safeOfflineChatReply;

export function generateOfflineChatResponse(
  userText: string,
  history: AgentChatTurn[] = [],
  conversationMode: AgentConversationMode = 'general',
): AgentChatReply {
  const text = safeOfflineChatReply(userText, history, conversationMode);
  const emergency = hasAffirmedEmergencySymptom(userText);
  const clarifying = conversationMode !== 'symptom_intake' && symptomMedicineRequest(userText);
  return {
    text: `[โหมดกฎออฟไลน์]\n${text}`,
    responseType: emergency ? 'emergency_escalation' : clarifying ? 'clarifying_questions' : 'information',
    conversationMode: clarifying || conversationMode === 'symptom_intake' ? 'symptom_intake' : 'general',
    requiresFollowUp: clarifying,
  };
}

async function invokeAgentFunction(body: Record<string, unknown>) {
  if (!isSupabaseConfigured) throw new Error('AGENT_BACKEND_NOT_CONFIGURED');
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) throw new Error('AUTH_REQUIRED');

  const { data, error } = await supabase.functions.invoke('agent-run', { body });
  if (error) throw new Error(error.message || 'AGENT_REQUEST_FAILED');
  return data as Record<string, any>;
}

export async function generateAIChatReplyLive(
  userText: string,
  history: AgentChatTurn[] = [],
  conversationMode: AgentConversationMode = 'general',
): Promise<AgentChatReply> {
  try {
    const data = await invokeAgentFunction({
      intent: 'chat',
      message: userText.slice(0, 1000),
      history: history.slice(-10),
      conversation_mode: conversationMode,
    });
    if (!data.success || typeof data.reply !== 'string') {
      throw new Error(data.message || 'AGENT_CHAT_FAILED');
    }
    return {
      text: data.execution_mode === 'live'
        ? `[AI Live]\n${data.reply}`
        : `[กฎความปลอดภัยจากเซิร์ฟเวอร์]\n${data.reply}`,
      responseType: data.response_type ?? 'information',
      conversationMode: data.conversation_mode === 'symptom_intake' ? 'symptom_intake' : 'general',
      requiresFollowUp: Boolean(data.requires_follow_up),
    };
  } catch {
    return generateOfflineChatResponse(userText, history, conversationMode);
  }
}

export function generateLocalAgentSummary(): UnifiedAgentSummary {
  const store = useAppStore.getState();
  const { profile, cabinet, takenByDate } = store;
  const activeCabinet = cabinet.filter((item) => item.status === 'active');
  const interactions = checkDrugInteractions(activeCabinet.map((item) => item.medicineId));
  const now = new Date().toISOString();
  const rows: AgentSummaryRow[] = [];

  rows.push({
    category: 'conditions',
    latestData: profile.diseases.length ? profile.diseases.join(', ') : 'ไม่ได้ระบุ',
    finding: profile.diseases.length
      ? `บันทึกโรคประจำตัวไว้ ${profile.diseases.length} รายการ ระบบออฟไลน์ยังไม่สามารถยืนยันข้อห้ามใช้ยากับทุกโรคได้`
      : 'ยังไม่ได้บันทึกโรคประจำตัว จึงไม่สามารถตรวจข้อควรระวังระหว่างโรคกับยาได้ครบถ้วน',
    status: profile.diseases.length ? 'review_required' : 'needs_data',
    completeness: profile.diseases.length ? 70 : 40,
    updatedAt: now,
    evidenceRefs: [{ type: 'patient_entity', id: 'profile.diseases', description: 'ข้อมูลที่ผู้ใช้บันทึกในอุปกรณ์' }],
  });

  const allergyConflicts = profile.allergies.flatMap((allergy) =>
    activeCabinet
      .filter((medicine) => allergyMatchesMedicine(allergy, medicine.medicineId))
      .map((medicine) => ({ allergy, medicine })),
  );
  rows.push({
    category: 'allergies',
    latestData: profile.allergies.length ? profile.allergies.join(', ') : 'ไม่ได้ระบุ',
    finding: allergyConflicts.length
      ? `พบชื่อยา ${allergyConflicts.length} รายการที่อาจตรงกับประวัติแพ้ยา ต้องให้แพทย์หรือเภสัชกรตรวจสอบทันที`
      : profile.allergies.length
        ? 'ไม่พบชื่อยาในตู้ที่ตรงกับประวัติแพ้จากการเทียบชื่อเบื้องต้น ผลนี้ยังไม่ครอบคลุมชื่อพ้องและส่วนประกอบทุกชนิด'
        : 'ยังไม่ได้บันทึกประวัติแพ้ยา จึงตรวจความเสี่ยงด้านการแพ้ยาได้ไม่ครบถ้วน',
    status: allergyConflicts.length ? 'critical' : profile.allergies.length ? 'info' : 'needs_data',
    completeness: profile.allergies.length ? 100 : 40,
    updatedAt: now,
    evidenceRefs: [{ type: 'patient_entity', id: 'profile.allergies', description: 'ประวัติแพ้ยาที่ผู้ใช้บันทึก' }],
  });

  rows.push({
    category: 'drug_interactions',
    latestData: interactions.length ? `${interactions.length} คู่ที่ต้องตรวจสอบ` : 'ไม่พบคู่ที่ตรงกับฐานข้อมูลในเครื่อง',
    finding: interactions.length
      ? `พบคู่ยาที่ต้องตรวจสอบ ${interactions.length} คู่ โปรดดูรายละเอียดและปรึกษาแพทย์หรือเภสัชกร`
      : `ตรวจยาใช้งานอยู่ ${activeCabinet.length} รายการแล้ว ไม่พบคู่ที่ตรงกับฐานข้อมูลในเครื่องครั้งนี้ ซึ่งไม่ใช่การรับรองว่าปลอดจากปฏิกิริยาทุกชนิด`,
    status: interactions.some((item) => item.severity === 'severe')
      ? 'critical'
      : interactions.length
        ? 'needs_attention'
        : 'info',
    completeness: activeCabinet.length ? 90 : 40,
    updatedAt: now,
    evidenceRefs: interactions.map((item) => ({
      type: 'clinical_rule',
      id: `local.interactions.${item.id}`,
      description: 'กฎคัดกรองในฐานข้อมูลออฟไลน์ของ YaCheck',
    })),
  });

  const scheduleCount = activeCabinet.reduce((total, medicine) => total + medicine.schedules.length, 0);
  rows.push({
    category: 'medication_schedule',
    latestData: `${scheduleCount} รอบต่อวัน จากยา ${activeCabinet.length} รายการ`,
    finding: scheduleCount
      ? `พบตารางยารวม ${scheduleCount} รอบต่อวัน ระบบไม่ได้เปลี่ยนตารางยา`
      : 'ยังไม่มีตารางเวลารับประทานยาที่ใช้งานอยู่',
    status: scheduleCount ? 'ok' : 'needs_data',
    completeness: scheduleCount ? 100 : 30,
    updatedAt: now,
    evidenceRefs: [{ type: 'patient_entity', id: 'cabinet.schedules', description: 'ตารางยาในอุปกรณ์' }],
  });

  rows.push({
    category: 'medicine_cabinet',
    latestData: `${activeCabinet.length} รายการกำลังใช้ · ${cabinet.length - activeCabinet.length} รายการหยุดใช้`,
    finding: activeCabinet.length
      ? `มีรายการยาที่กำลังใช้อยู่ ${activeCabinet.length} รายการ`
      : 'ยังไม่มียาที่กำลังใช้อยู่ในตู้ยา',
    status: activeCabinet.length ? 'ok' : 'needs_data',
    completeness: activeCabinet.length ? 100 : 30,
    updatedAt: now,
    evidenceRefs: [{ type: 'patient_entity', id: 'cabinet', description: 'รายการยาในอุปกรณ์' }],
  });

  const expectedToday = activeCabinet.reduce((total, medicine) => total + medicine.schedules.length, 0);
  const adherence = getAdherence(cabinet, takenByDate[getTodayKey()] ?? {});
  rows.push({
    category: 'adherence',
    latestData: expectedToday ? `${adherence}% วันนี้` : 'ไม่มีรอบยาที่ต้องบันทึกวันนี้',
    finding: expectedToday
      ? `บันทึกการรับประทานยาวันนี้ได้ ${adherence}% ของรอบที่กำหนด`
      : 'ยังไม่มีข้อมูลเพียงพอสำหรับคำนวณความสม่ำเสมอวันนี้',
    status: !expectedToday ? 'needs_data' : adherence >= 80 ? 'ok' : 'needs_attention',
    completeness: expectedToday ? 100 : 30,
    updatedAt: now,
    evidenceRefs: [{ type: 'calculation', id: 'local.adherence.today', description: 'คำนวณจากตารางและบันทึกวันนี้ในอุปกรณ์' }],
  });

  rows.push({
    category: 'body_metrics',
    latestData: profile.weightKg ? `${profile.weightKg} kg` : 'ไม่ได้บันทึก',
    finding: profile.weightKg
      ? `บันทึกน้ำหนักล่าสุด ${profile.weightKg} kg เพื่อใช้เป็นข้อมูลประกอบ ระบบยังไม่ได้คำนวณหรือเปลี่ยนขนาดยา`
      : 'ยังไม่ได้บันทึกน้ำหนักล่าสุด ระบบจะไม่ประเมินความเหมาะสมของขนาดยา',
    status: profile.weightKg ? 'info' : 'needs_data',
    completeness: profile.weightKg ? 100 : 40,
    updatedAt: now,
    evidenceRefs: [{ type: 'patient_entity', id: 'profile.weightKg', description: 'น้ำหนักที่ผู้ใช้บันทึกในอุปกรณ์' }],
  });

  const hasCritical = rows.some((row) => row.status === 'critical');
  const needsAttention = rows.some((row) => ['needs_attention', 'needs_data', 'review_required'].includes(row.status));
  return {
    schemaVersion: '1.1',
    summaryId: `local-summary-${Date.now()}`,
    generatedAt: now,
    overallStatus: hasCritical ? 'critical' : needsAttention ? 'needs_attention' : 'ok',
    executionMode: 'rules_only',
    llmPersonalizedAdvice:
      '[โหมดกฎออฟไลน์] แสดงผลคัดกรองจากข้อมูลในอุปกรณ์เท่านั้น ระบบไม่ได้ใช้ AI และไม่ได้เปลี่ยนแผนการรักษา',
    rows,
    priorities: hasCritical ? ['ติดต่อแพทย์หรือเภสัชกรเพื่อตรวจสอบความเสี่ยงที่พบ'] : [],
    missingData: rows.filter((row) => row.status === 'needs_data').map((row) => row.category),
    allowedActions: ['refresh_summary'],
    unchangedTreatment: true,
  };
}

export async function runAgentAnalysis(): Promise<AgentRunResponse> {
  try {
    const data = await invokeAgentFunction({
      intent: 'summary',
    });
    return data as unknown as AgentRunResponse;
  } catch (error) {
    const quota = await fetchUserQuota();
    return {
      success: true,
      status: 'completed_rules_only',
      summary: generateLocalAgentSummary(),
      quota_remaining: quota.quota_remaining,
      max_weekly_quota: quota.max_weekly_quota,
      current_tier: quota.current_tier,
      execution_mode: 'rules_only',
      message: error instanceof Error ? error.message : 'AGENT_BACKEND_UNAVAILABLE',
    };
  }
}

export async function requestAgentReview(summaryId: string) {
  const data = await invokeAgentFunction({ intent: 'request_review', summaryId });
  if (!data.success) throw new Error(data.message || 'REVIEW_REQUEST_FAILED');
  return data as { success: true; requestId: string };
}

export async function fetchUserQuota(): Promise<AgentQuotaResponse> {
  if (!isSupabaseConfigured) {
    return { allowed: true, quota_remaining: 7, current_tier: 'local', max_weekly_quota: 7 };
  }
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      return { allowed: false, quota_remaining: 0, current_tier: 'free', max_weekly_quota: 7, message: 'AUTH_REQUIRED' };
    }
    const { data, error } = await supabase.rpc('check_user_agent_quota');
    if (error) throw error;
    const result = Array.isArray(data) ? data[0] : data;
    if (!result) throw new Error('QUOTA_NOT_AVAILABLE');
    return {
      allowed: Boolean(result.allowed),
      quota_remaining: Number(result.quota_remaining ?? 0),
      current_tier: String(result.current_tier ?? 'free'),
      runs_this_week: Number(result.runs_this_week ?? 0),
      max_weekly_quota: Number(result.max_weekly_quota ?? 7),
    };
  } catch {
    return {
      allowed: false,
      quota_remaining: 0,
      current_tier: 'free',
      max_weekly_quota: 7,
      message: 'ไม่สามารถตรวจสอบโควตาจากเซิร์ฟเวอร์ได้',
    };
  }
}
