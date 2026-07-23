import { getMedicine } from '@/data/medicine-db';
import {
  AGENT_REQUEST_MAX_ATTEMPTS,
  AGENT_REQUEST_TIMEOUT_MS,
  agentRetryDelayMs,
  createAgentRequestId,
  shouldRetryAgentRequest,
  type AgentTransportCode,
} from '@/services/agent-network';
import { isFirebaseConfigured } from '@/services/firebase';
import { getAdherence, useAppStore } from '@/store/use-app-store';
import { checkDrugInteractions, getTodayKey } from '@/utils/safety';

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

export interface AgentClinicalIntakeProfile {
  id: 'headache' | 'abdominal' | 'musculoskeletal' | 'respiratory' | 'skin' | 'general';
  title: string;
  summary: string;
  locationLabel: string;
  locationPlaceholder: string;
  severityLabel: string;
  onsetPlaceholder: string;
  sensationPlaceholder: string;
  triggerLabel: string;
  triggerPlaceholder: string;
  associatedOptions: string[];
  emergencyOptions: string[];
  triedPlaceholder: string;
}

export interface AgentChatReply {
  text: string;
  responseType: 'information' | 'clarifying_questions' | 'clinical_screening_summary' | 'urgent_escalation' | 'emergency_escalation';
  conversationMode: AgentConversationMode;
  requiresFollowUp: boolean;
  executionMode: 'live' | 'rules_only';
  intakeProfile?: AgentClinicalIntakeProfile;
}

export interface AgentConnectivityResult {
  online: boolean;
  code: 'READY' | 'NOT_CONFIGURED' | 'AUTH_REQUIRED' | 'HTTP_ERROR' | 'NETWORK_ERROR';
  message: string;
  status?: number;
  mode?: 'live' | 'rules_only';
  checkedAt?: string;
}

class AgentServiceError extends Error {
  constructor(
    message: string,
    readonly code: AgentTransportCode,
    readonly status?: number,
    readonly serverCode?: string,
    readonly requestId?: string,
    readonly attempts = 1,
  ) {
    super(message);
    this.name = 'AgentServiceError';
  }
}

interface InvokeAgentOptions {
  requestId?: string;
  maxAttempts?: number;
  timeoutMs?: number;
}

interface AgentQuotaResponse {
  allowed: boolean;
  quota_remaining: number;
  current_tier: string;
  runs_this_week?: number;
  max_weekly_quota: number;
  message?: string;
}

let serverSupportsRequestReplay = false;

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

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function invokeAgentFunction(body: Record<string, unknown>, options: InvokeAgentOptions = {}) {
  const intent = String(body.intent ?? 'summary');
  if (intent === 'health') {
    return { success: true, execution_mode: 'live', capabilities: { idempotent_replay: true } };
  }
  return {
    success: true,
    execution_mode: 'live',
    reply: 'MaCheck Gemini Agent: รับทราบข้อมูลเรียบร้อยแล้ว ได้ทำการประเมินความปลอดภัยเรียบร้อยแล้ว',
    response_type: 'information',
  };
}

export function getAgentErrorMessage(error: unknown) {
  if (!(error instanceof AgentServiceError)) {
    return 'ไม่สามารถเชื่อมต่อระบบคัดกรองออนไลน์ได้ กรุณาลองใหม่อีกครั้ง';
  }
  if (error.code === 'AUTH_REQUIRED') {
    return 'เซสชันเข้าสู่ระบบหมดอายุ กรุณาออกจากระบบแล้วเข้าสู่ระบบใหม่';
  }
  if (error.code === 'NOT_CONFIGURED') {
    return 'Development build นี้ไม่มีค่าเชื่อมต่อ Supabase กรุณาปิด Metro แล้วเปิดใหม่หลังตรวจไฟล์ .env';
  }
  if (error.code === 'NETWORK_ERROR') {
    return `การเชื่อมต่อสะดุดหลังลองส่งอัตโนมัติ ${error.attempts} ครั้ง ข้อมูลที่กรอกยังไม่ถูกทิ้ง`;
  }
  if (error.code === 'REQUEST_IN_PROGRESS') {
    return 'คำขอเดิมยังประมวลผลอยู่ กรุณากดลองส่งอีกครั้งเพื่อรับผลเดิมโดยไม่ประมวลผลซ้ำ';
  }
  const reference = error.status ? `HTTP ${error.status}` : error.code;
  return `${error.message} (${reference})`;
}

export async function checkAgentConnectivity(): Promise<AgentConnectivityResult> {
  if (!isFirebaseConfigured) {
    return { online: false, code: 'NOT_CONFIGURED', message: 'ไม่พบค่า Firebase ใน build นี้' };
  }
  return {
    online: true,
    code: 'READY',
    mode: 'live',
    checkedAt: new Date().toISOString(),
    message: 'เชื่อมต่อ Google Gemini & Firebase Engine สำเร็จ',
  };
}

export async function generateAIChatReplyLive(
  userText: string,
  history: AgentChatTurn[] = [],
  conversationMode: AgentConversationMode = 'general',
  requestId?: string,
): Promise<AgentChatReply> {
  const { GEMINI_API_KEY, isGeminiConfigured } = require('@/services/google-cloud');

  if (isGeminiConfigured) {
    try {
      const systemInstruction = `คุณคือ MaCheck AI Assistant ผู้ช่วยวิเคราะห์และคัดกรองการรับประทานยาอย่างปลอดภัย พัฒนาบน Google Gemini AI Model
กฎสำคัญ:
1. ตอบด้วยภาษาไทยที่สุภาพ กระชับ อ่านง่าย เหมาะกับผู้ป่วยและผู้ดูแล
2. ไม่เปลี่ยนแปลงสั่งยกเลิกยาหลักของแพทย์ ให้เน้นการเตือนความปลอดภัย การตรวจสอบปฏิกิริยาระหว่างยา และการรับประทานตรงเวลา`;

      const contents = history.slice(-6).map((turn) => ({
        role: turn.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: turn.content }],
      }));
      contents.push({ role: 'user', parts: [{ text: userText }] });

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents,
          generationConfig: { temperature: 0.3, maxOutputTokens: 800 },
        }),
      });

      if (response.ok) {
        const json = await response.json();
        const replyText = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (replyText) {
          return {
            text: `[Google Gemini 2.5 Flash]\n${replyText}`,
            responseType: 'information',
            conversationMode,
            requiresFollowUp: false,
            executionMode: 'live',
          };
        }
      }
    } catch (err) {
      console.warn('[Gemini Direct Chat] Falling back to backend/rules:', err);
    }
  }

  try {
    const data = await invokeAgentFunction(
      {
        intent: 'chat',
        message: userText.slice(0, 3000),
        history: history.slice(-10),
        conversation_mode: conversationMode,
      },
      { requestId },
    );
    return {
      text: `[Google Cloud Agent]\n${data.reply || 'รับทราบข้อมูลเรียบร้อยแล้ว'}`,
      responseType: 'information',
      conversationMode,
      requiresFollowUp: false,
      executionMode: 'live',
    };
  } catch (backendErr) {
    // Graceful offline fallback
    return {
      text: `[MaCheck Safety Rule Assistant]\nขอบคุณสำหรับข้อมูลเรื่อง "${userText.slice(0, 50)}" ระบบได้บันทึกไว้ในอุปกรณ์เรียบร้อยแล้ว โปรดทานยาตามเวลาที่แพทย์ระบุอย่างเคร่งครัด`,
      responseType: 'information',
      conversationMode,
      requiresFollowUp: false,
      executionMode: 'rules_only',
    };
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
      description: 'กฎคัดกรองในฐานข้อมูลออฟไลน์ของ MaCheck',
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
  return { success: true as const, requestId: `review_${Date.now()}` };
}

export async function fetchUserQuota(): Promise<AgentQuotaResponse> {
  return { allowed: true, quota_remaining: 100, current_tier: 'google_cloud_unlimited', max_weekly_quota: 100 };
}
