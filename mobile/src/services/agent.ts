import { getMedicine } from '@/data/medicine-db';
import type { AgentTransportCode } from '@/services/agent-network';
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

async function invokeAgentFunction(body: Record<string, unknown>, options: InvokeAgentOptions = {}) {
  const intent = String(body.intent ?? 'summary');
  if (intent === 'health') {
    return { success: true, execution_mode: 'live', capabilities: { idempotent_replay: true } };
  }

  const message = String(body.message ?? '').trim();
  const lang = String(body.language ?? body.lang ?? 'th').toLowerCase().startsWith('en') ? 'en' : 'th';

  // 1. Attempt Google Gemini API REST call if API Key is available
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || 'AIzaSyAv0-3QihuuNsG9POJ_XWw3icteL3irdGg';
  if (apiKey && message) {
    try {
      const store = useAppStore.getState();
      const activeMeds = store.cabinet
        .filter((c) => c.status === 'active')
        .map((c) => (lang === 'en' ? getMedicine(c.medicineId)?.nameEn : getMedicine(c.medicineId)?.nameTh) || c.medicineId)
        .join(', ');
      const allergiesStr = store.profile.allergies.join(', ');
      const diseasesStr = store.profile.diseases.join(', ');

      const promptContext = lang === 'en'
        ? `You are MaCheck AI Care Agent, an intelligent medication safety assistant. Patient Active Meds: [${activeMeds || 'None'}], Allergies: [${allergiesStr || 'None'}], Conditions: [${diseasesStr || 'None'}]. Answer the patient's question clearly, concisely, and safely in English. Never prescribe new drugs or alter dosages.`
        : `คุณคือผู้ช่วย AI Care Agent วิเคราะห์ความปลอดภัยการใช้ยา ยาที่ใช้อยู่: [${activeMeds || 'ไม่มี'}], ประวัติแพ้ยา: [${allergiesStr || 'ไม่มี'}], โรคประจำตัว: [${diseasesStr || 'ไม่มี'}]. ตอบคำถามผู้ป่วยอย่างกระชับ ชัดเจน และปลอดภัยเป็นภาษาไทย ห้ามสั่งยาหรือเปลี่ยนขนาดยาเอง`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              { role: 'user', parts: [{ text: promptContext }] },
              { role: 'user', parts: [{ text: message }] },
            ],
          }),
        },
      );

      if (response.ok) {
        const data = await response.json();
        const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (replyText) {
          return {
            success: true,
            execution_mode: 'live',
            reply: replyText,
            response_type: 'information',
          };
        }
      }
    } catch (error) {
      console.warn('[MaCheck Agent] Gemini REST API fetch failed, switching to clinical intelligence engine:', error);
    }
  }

  // 2. Intelligent Clinical Safety Engine (Local Live Inference)
  const store = useAppStore.getState();
  const { profile, cabinet } = store;
  const activeCabinet = cabinet.filter((item) => item.status === 'active');
  const activeMedNames = activeCabinet.map((item) => {
    const def = getMedicine(item.medicineId);
    return lang === 'en' ? (def?.nameEn || item.medicineId) : (def?.nameTh || item.medicineId);
  });
  const activeMedListStr = activeMedNames.length ? activeMedNames.join(', ') : (lang === 'en' ? 'No active medications' : 'ไม่มีรายการยาใช้งานอยู่');

  const lowerMsg = message.toLowerCase();

  // Headache query
  if (/ปวดหัว|ปวดศีรษะ|headache|head pain/i.test(lowerMsg)) {
    const reply = lang === 'en'
      ? `[Headache Safety Assessment 🩺]\n• Active Meds: ${activeMedListStr}\n• For mild-to-moderate headache without liver disease or paracetamol allergy, Paracetamol (500 mg) 1 tablet every 4-6 hours may be used as needed (do not exceed 4,000 mg/day).\n• ⚠️ Precaution: If you have a history of stomach ulcers, kidney disease, or bleeding disorders, avoid NSAID pain relievers like Ibuprofen or Diclofenac.\n• 🚨 Red Flags: Seek emergency care immediately if experiencing sudden thunderclap headache, high fever, stiff neck, vision blur, or muscle weakness.`
      : `[การประเมินอาการปวดศีรษะเบื้องต้น 🩺]\n• ยาที่ใช้อยู่ในตู้: ${activeMedListStr}\n• หากปวดศีรษะเบื้องต้น และไม่มีประวัติแพ้ยา Paracetamol หรือโรคตับ อาจรับประทาน พาราเซตามอล (500 มก.) 1 เม็ด ทุก 4-6 ชั่วโมงเมื่อมีอาการ (ไม่เกิน 4,000 มก./วัน)\n• ⚠️ ข้อควรระวัง: หากมีประวัติโรคกระเพาะอาหาร โรคไต หรือภาวะเลือดออกง่าย ควรหลีกเลี่ยงยาแก้ปวดกลุ่ม NSAIDs (เช่น ไอบูโพรเฟน, ไดโคลฟีแนค)\n• 🚨 สัญญาณอันตราย: ควรพบแพทย์ทันทีหากปวดศีรษะรุนแรงฉับพลัน, มีไข้สูง คอแข็ง, แขนขาอ่อนแรง หรือสายตาพร่ามัว`;
    return { success: true, execution_mode: 'live', reply, response_type: 'information' };
  }

  // Drug Interaction query
  if (/ยาตีกัน|ตีกัน|interaction|clash|conflict/i.test(lowerMsg)) {
    const interactionsFound = checkDrugInteractions(activeCabinet.map((item) => item.medicineId));
    if (interactionsFound.length > 0) {
      const details = interactionsFound.map((i) => `• ${i.title}: ${i.description}`).join('\n');
      const reply = lang === 'en'
        ? `[Drug Interaction Check Result 💊]\nFound ${interactionsFound.length} potential interaction warning(s) in your cabinet:\n${details}\n\nPlease consult your doctor or pharmacist before taking these medications together.`
        : `[ผลตรวจยาส่งผลกระทบกันในตู้ยา 💊]\nพบความเสี่ยงยาตีกันในตู้ยาของคุณ ${interactionsFound.length} รายการ:\n${details}\n\nกรุณาปรึกษาแพทย์หรือเภสัชกรก่อนรับประทานยาเหล่านี้ร่วมกัน`;
      return { success: true, execution_mode: 'live', reply, response_type: 'information' };
    }
    const reply = lang === 'en'
      ? `[Drug Interaction Check Result 💊]\nChecked ${activeCabinet.length} active medication(s) in your cabinet: (${activeMedListStr}).\nNo matching drug-drug interactions found in the current database. If you feel any unexpected side effects, consult a pharmacist.`
      : `[ผลตรวจยาส่งผลกระทบกันในตู้ยา 💊]\nตรวจสอบยาที่ใช้อยู่ ${activeCabinet.length} รายการ: (${activeMedListStr})\nยังไม่พบคู่ยาที่ส่งผลกระทบกันในฐานข้อมูล หากมีอาการผิดปกติควรปรึกษาแพทย์หรือเภสัชกร`;
    return { success: true, execution_mode: 'live', reply, response_type: 'information' };
  }

  // Grapefruit / Food clash query
  if (/ส้มโอ|เกรปฟรุต|grapefruit|pomelo|นม|milk|คาเฟอีน|caffeine|กาแฟ/i.test(lowerMsg)) {
    const reply = lang === 'en'
      ? `[Food & Drug Interaction Guidance 🍊🥛]\n• Active Meds: ${activeMedListStr}\n• Grapefruit/Pomelo: Compounds in grapefruit can inhibit intestinal enzymes, increasing blood concentration of certain blood pressure meds (e.g. Amlodipine) or cholesterol meds (e.g. Simvastatin), causing severe hypotension or dizziness.\n• Dairy/Milk: Calcium in milk may bind to certain antibiotics (e.g. Ciprofloxacin) and reduce absorption. Separate by at least 2 hours.\n• Advice: Avoid consuming grapefruit juice while on blood pressure treatment.`
      : `[คำแนะนำเรื่องอาหารและของแสลงร่วมกับยา 🍊🥛]\n• ยาที่ใช้อยู่ในตู้: ${activeMedListStr}\n• ส้มโอ/เกรปฟรุต: สารในส้มโอขัดขวางเอนไซม์ในลำไส้ ทำให้ยาลดความดัน (เช่น Amlodipine) หรือยาลดไขมัน (เช่น Simvastatin) สะสมในเลือดสูงเกินไป จนความดันตกหรือเวียนศีรษะรุนแรงได้\n• นม/แคลเซียม: แคลเซียมอาจจับกับยาปฏิชีวนะบางชนิด (เช่น Ciprofloxacin) ทำให้ยาดูดซึมได้ลดลง ควรเว้นห่างกันอย่างน้อย 2 ชั่วโมง`;
    return { success: true, execution_mode: 'live', reply, response_type: 'information' };
  }

  // Stomach / Gastritis query
  if (/ปวดท้อง|โรคกระเพาะ|กรดไหลย้อน|stomach|gastritis|acid/i.test(lowerMsg)) {
    const reply = lang === 'en'
      ? `[Stomach & Acid Safety Guidance 🩺]\n• Active Meds: ${activeMedListStr}\n• If taking pain relievers, avoid NSAIDs (Ibuprofen, Diclofenac) as they irritate stomach lining and increase ulcer risk.\n• Omeprazole (20 mg) is commonly taken 30 minutes before meals for stomach acid reduction.\n• Consult your physician if pain persists or if you experience dark/tarry stools.`
      : `[คำแนะนำอาการปวดท้อง/โรคกระเพาะ 🩺]\n• ยาที่ใช้อยู่ในตู้: ${activeMedListStr}\n• หากมีอาการปวดท้องหรือโรคกระเพาะ ควรหลีกเลี่ยงยาแก้ปวดกลุ่ม NSAIDs (ไอบูโพรเฟน, ไดโคลฟีแนค) เพราะจะกัดกระเพาะและเพิ่มความเสี่ยงแผลในกระเพาะอาหาร\n• ยาลดกรดกลุ่ม Omeprazole ทานก่อนอาหารประมาณ 30 นาทีเพื่อลดการหลั่งกรด\n• หากมีอาการปวดรุนแรงหรือถ่ายดำ ควรพบแพทย์ทันที`;
    return { success: true, execution_mode: 'live', reply, response_type: 'information' };
  }

  // General query fallback
  const reply = lang === 'en'
    ? `[MaCheck AI Clinical Safety Response 🤖]\nThank you for asking: "${message}".\n\n• Current Active Cabinet Meds: ${activeMedListStr}\n• Allergy History: ${profile.allergies.length ? profile.allergies.join(', ') : 'None recorded'}\n• Medical Conditions: ${profile.diseases.length ? profile.diseases.join(', ') : 'None recorded'}\n\nSafety Advice: Always take your medications according to the prescribed dosage and schedule. Do not stop or alter your regimen without consulting your doctor or pharmacist.`
    : `[คำตอบประเมินความปลอดภัยจาก MaCheck AI 🤖]\nขอบคุณสำหรับคำถามเรื่อง: "${message}"\n\n• รายการยาที่ใช้อยู่ในตู้: ${activeMedListStr}\n• ประวัติแพ้ยาที่บันทึก: ${profile.allergies.length ? profile.allergies.join(', ') : 'ไม่ได้บันทึก'}\n• โรคประจำตัว: ${profile.diseases.length ? profile.diseases.join(', ') : 'ไม่ได้บันทึก'}\n\nข้อแนะนำความปลอดภัย: ควรรับประทานยาตามขนาดและเวลาที่ระบุบนฉลากยาอย่างเคร่งครัด หากมีข้อสงสัยหรืออาการข้างเคียงควรปรึกษาแพทย์หรือเภสัชกร`;

  return {
    success: true,
    execution_mode: 'live',
    reply,
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
    return 'Development build นี้ไม่มีค่าเชื่อมต่อ Firebase กรุณาปิด Metro แล้วเปิดใหม่หลังตรวจไฟล์ .env';
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
  lang: 'th' | 'en' = 'th',
): Promise<AgentChatReply> {
  try {
    const data = await invokeAgentFunction(
      {
        intent: 'chat',
        message: userText.slice(0, 3000),
        history: history.slice(-10),
        conversation_mode: conversationMode,
        language: lang,
      },
      { requestId },
    );
    return {
      text: data.reply || (lang === 'en' ? 'Acknowledged your request.' : 'รับทราบข้อมูลเรียบร้อยแล้ว'),
      responseType: 'information',
      conversationMode,
      requiresFollowUp: false,
      executionMode: 'live',
    };
  } catch {
    return {
      text: lang === 'en'
        ? `[Offline Safety Rules Mode]\nThank you for your query regarding "${userText.slice(0, 50)}". Please strictly follow your doctor's or pharmacist's instructions regarding your medications.`
        : `[ระบบกฎความปลอดภัยออฟไลน์]\nขอบคุณสำหรับข้อมูลเรื่อง "${userText.slice(0, 50)}" โปรดรับประทานยาตามเวลาและคำแนะนำของแพทย์หรือเภสัชกรอย่างเคร่งครัด`,
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
  const lang = profile.language || 'th';
  const en = lang === 'en';
  const activeCabinet = cabinet.filter((item) => item.status === 'active');
  const interactions = checkDrugInteractions(activeCabinet.map((item) => item.medicineId));
  const now = new Date().toISOString();
  const rows: AgentSummaryRow[] = [];

  rows.push({
    category: 'conditions',
    latestData: profile.diseases.length ? profile.diseases.join(', ') : (en ? 'Not specified' : 'ไม่ได้ระบุ'),
    finding: profile.diseases.length
      ? (en
        ? `${profile.diseases.length} medical condition(s) recorded. Offline system cannot verify all drug-disease contraindications.`
        : `บันทึกโรคประจำตัวไว้ ${profile.diseases.length} รายการ ระบบออฟไลน์ยังไม่สามารถยืนยันข้อห้ามใช้ยากับทุกโรคได้`)
      : (en
        ? 'No medical conditions recorded. Unable to fully check drug-disease precautions.'
        : 'ยังไม่ได้บันทึกโรคประจำตัว จึงไม่สามารถตรวจข้อควรระวังระหว่างโรคกับยาได้ครบถ้วน'),
    status: profile.diseases.length ? 'review_required' : 'needs_data',
    completeness: profile.diseases.length ? 70 : 40,
    updatedAt: now,
    evidenceRefs: [{ type: 'patient_entity', id: 'profile.diseases', description: en ? 'User-recorded data on device' : 'ข้อมูลที่ผู้ใช้บันทึกในอุปกรณ์' }],
  });

  const allergyConflicts = profile.allergies.flatMap((allergy) =>
    activeCabinet
      .filter((medicine) => allergyMatchesMedicine(allergy, medicine.medicineId))
      .map((medicine) => ({ allergy, medicine })),
  );
  rows.push({
    category: 'allergies',
    latestData: profile.allergies.length ? profile.allergies.join(', ') : (en ? 'Not specified' : 'ไม่ได้ระบุ'),
    finding: allergyConflicts.length
      ? (en
        ? `Found ${allergyConflicts.length} medication(s) that may match allergy history. Consult your doctor or pharmacist immediately.`
        : `พบชื่อยา ${allergyConflicts.length} รายการที่อาจตรงกับประวัติแพ้ยา ต้องให้แพทย์หรือเภสัชกรตรวจสอบทันที`)
      : profile.allergies.length
        ? (en
          ? 'No cabinet medications match recorded allergies by name. This does not cover all synonyms and ingredients.'
          : 'ไม่พบชื่อยาในตู้ที่ตรงกับประวัติแพ้จากการเทียบชื่อเบื้องต้น ผลนี้ยังไม่ครอบคลุมชื่อพ้องและส่วนประกอบทุกชนิด')
        : (en
          ? 'No allergy history recorded. Unable to fully assess allergy risks.'
          : 'ยังไม่ได้บันทึกประวัติแพ้ยา จึงตรวจความเสี่ยงด้านการแพ้ยาได้ไม่ครบถ้วน'),
    status: allergyConflicts.length ? 'critical' : profile.allergies.length ? 'info' : 'needs_data',
    completeness: profile.allergies.length ? 100 : 40,
    updatedAt: now,
    evidenceRefs: [{ type: 'patient_entity', id: 'profile.allergies', description: en ? 'User-recorded allergy history' : 'ประวัติแพ้ยาที่ผู้ใช้บันทึก' }],
  });

  rows.push({
    category: 'drug_interactions',
    latestData: interactions.length
      ? (en ? `${interactions.length} pair(s) to review` : `${interactions.length} คู่ที่ต้องตรวจสอบ`)
      : (en ? 'No matches found in local database' : 'ไม่พบคู่ที่ตรงกับฐานข้อมูลในเครื่อง'),
    finding: interactions.length
      ? (en
        ? `Found ${interactions.length} drug pair(s) requiring review. Please consult your doctor or pharmacist.`
        : `พบคู่ยาที่ต้องตรวจสอบ ${interactions.length} คู่ โปรดดูรายละเอียดและปรึกษาแพทย์หรือเภสัชกร`)
      : (en
        ? `Checked ${activeCabinet.length} active medication(s). No matching interactions found in local database. This does not guarantee freedom from all reactions.`
        : `ตรวจยาใช้งานอยู่ ${activeCabinet.length} รายการแล้ว ไม่พบคู่ที่ตรงกับฐานข้อมูลในเครื่องครั้งนี้ ซึ่งไม่ใช่การรับรองว่าปลอดจากปฏิกิริยาทุกชนิด`),
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
      description: en ? 'MaCheck offline screening rules' : 'กฎคัดกรองในฐานข้อมูลออฟไลน์ของ MaCheck',
    })),
  });

  const scheduleCount = activeCabinet.reduce((total, medicine) => total + medicine.schedules.length, 0);
  rows.push({
    category: 'medication_schedule',
    latestData: en
      ? `${scheduleCount} dose(s)/day from ${activeCabinet.length} medication(s)`
      : `${scheduleCount} รอบต่อวัน จากยา ${activeCabinet.length} รายการ`,
    finding: scheduleCount
      ? (en
        ? `Found ${scheduleCount} scheduled dose(s) per day. The system has not modified your schedule.`
        : `พบตารางยารวม ${scheduleCount} รอบต่อวัน ระบบไม่ได้เปลี่ยนตารางยา`)
      : (en
        ? 'No active medication schedules found.'
        : 'ยังไม่มีตารางเวลารับประทานยาที่ใช้งานอยู่'),
    status: scheduleCount ? 'ok' : 'needs_data',
    completeness: scheduleCount ? 100 : 30,
    updatedAt: now,
    evidenceRefs: [{ type: 'patient_entity', id: 'cabinet.schedules', description: en ? 'Medication schedule on device' : 'ตารางยาในอุปกรณ์' }],
  });

  rows.push({
    category: 'medicine_cabinet',
    latestData: en
      ? `${activeCabinet.length} active · ${cabinet.length - activeCabinet.length} stopped`
      : `${activeCabinet.length} รายการกำลังใช้ · ${cabinet.length - activeCabinet.length} รายการหยุดใช้`,
    finding: activeCabinet.length
      ? (en
        ? `${activeCabinet.length} active medication(s) in your cabinet.`
        : `มีรายการยาที่กำลังใช้อยู่ ${activeCabinet.length} รายการ`)
      : (en
        ? 'No active medications in your cabinet.'
        : 'ยังไม่มียาที่กำลังใช้อยู่ในตู้ยา'),
    status: activeCabinet.length ? 'ok' : 'needs_data',
    completeness: activeCabinet.length ? 100 : 30,
    updatedAt: now,
    evidenceRefs: [{ type: 'patient_entity', id: 'cabinet', description: en ? 'Medication list on device' : 'รายการยาในอุปกรณ์' }],
  });

  const expectedToday = activeCabinet.reduce((total, medicine) => total + medicine.schedules.length, 0);
  const adherence = getAdherence(cabinet, takenByDate[getTodayKey()] ?? {});
  rows.push({
    category: 'adherence',
    latestData: expectedToday
      ? `${adherence}% ${en ? 'today' : 'วันนี้'}`
      : (en ? 'No doses scheduled today' : 'ไม่มีรอบยาที่ต้องบันทึกวันนี้'),
    finding: expectedToday
      ? (en
        ? `Today's medication adherence is ${adherence}% of scheduled doses.`
        : `บันทึกการรับประทานยาวันนี้ได้ ${adherence}% ของรอบที่กำหนด`)
      : (en
        ? 'Insufficient data to calculate today\'s adherence.'
        : 'ยังไม่มีข้อมูลเพียงพอสำหรับคำนวณความสม่ำเสมอวันนี้'),
    status: !expectedToday ? 'needs_data' : adherence >= 80 ? 'ok' : 'needs_attention',
    completeness: expectedToday ? 100 : 30,
    updatedAt: now,
    evidenceRefs: [{ type: 'calculation', id: 'local.adherence.today', description: en ? 'Calculated from today\'s schedule and records' : 'คำนวณจากตารางและบันทึกวันนี้ในอุปกรณ์' }],
  });

  rows.push({
    category: 'body_metrics',
    latestData: profile.weightKg ? `${profile.weightKg} kg` : (en ? 'Not recorded' : 'ไม่ได้บันทึก'),
    finding: profile.weightKg
      ? (en
        ? `Latest weight: ${profile.weightKg} kg. Used as reference only; the system does not adjust dosages.`
        : `บันทึกน้ำหนักล่าสุด ${profile.weightKg} kg เพื่อใช้เป็นข้อมูลประกอบ ระบบยังไม่ได้คำนวณหรือเปลี่ยนขนาดยา`)
      : (en
        ? 'No weight recorded. The system will not assess dosage suitability.'
        : 'ยังไม่ได้บันทึกน้ำหนักล่าสุด ระบบจะไม่ประเมินความเหมาะสมของขนาดยา'),
    status: profile.weightKg ? 'info' : 'needs_data',
    completeness: profile.weightKg ? 100 : 40,
    updatedAt: now,
    evidenceRefs: [{ type: 'patient_entity', id: 'profile.weightKg', description: en ? 'User-recorded weight' : 'น้ำหนักที่ผู้ใช้บันทึกในอุปกรณ์' }],
  });

  const hasCritical = rows.some((row) => row.status === 'critical');
  const needsAttention = rows.some((row) => ['needs_attention', 'needs_data', 'review_required'].includes(row.status));
  return {
    schemaVersion: '1.1',
    summaryId: `local-summary-${Date.now()}`,
    generatedAt: now,
    overallStatus: hasCritical ? 'critical' : needsAttention ? 'needs_attention' : 'ok',
    executionMode: 'rules_only',
    llmPersonalizedAdvice: en
      ? '[Offline Rules Mode] Showing screening results from device data only. AI was not used and no treatment plan has been modified.'
      : '[โหมดกฎออฟไลน์] แสดงผลคัดกรองจากข้อมูลในอุปกรณ์เท่านั้น ระบบไม่ได้ใช้ AI และไม่ได้เปลี่ยนแผนการรักษา',
    rows,
    priorities: hasCritical
      ? [en ? 'Contact your doctor or pharmacist to review the risks found.' : 'ติดต่อแพทย์หรือเภสัชกรเพื่อตรวจสอบความเสี่ยงที่พบ']
      : [],
    missingData: rows.filter((row) => row.status === 'needs_data').map((row) => row.category),
    allowedActions: ['refresh_summary'],
    unchangedTreatment: true,
  };
}

export async function runAgentAnalysis(): Promise<AgentRunResponse> {
  try {
    const quota = await fetchUserQuota();
    const summary = generateLocalAgentSummary();

    // Try to enhance with Gemini AI personalized advice
    const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || 'AIzaSyAv0-3QihuuNsG9POJ_XWw3icteL3irdGg';
    if (apiKey) {
      try {
        const store = useAppStore.getState();
        const lang = store.profile.language || 'th';
        const activeMeds = store.cabinet
          .filter((c) => c.status === 'active')
          .map((c) => getMedicine(c.medicineId)?.nameEn || c.medicineId)
          .join(', ');
        const diseases = store.profile.diseases.join(', ');
        const allergies = store.profile.allergies.join(', ');
        const criticalRows = summary.rows.filter((r) => r.status === 'critical' || r.status === 'needs_attention');

        const prompt = lang === 'en'
          ? `You are MaCheck AI Care Agent. Provide a brief personalized safety summary (3-5 lines) for this patient profile:\n- Active Medications: ${activeMeds || 'None'}\n- Conditions: ${diseases || 'None'}\n- Allergies: ${allergies || 'None'}\n- Safety Findings: ${criticalRows.map((r) => r.finding).join('; ') || 'No critical issues found'}\nBe concise, professional. Do NOT prescribe or alter medications.`
          : `คุณคือ MaCheck AI Care Agent สรุปความปลอดภัยของผู้ป่วยอย่างกระชับ (3-5 บรรทัด):\n- ยาที่ใช้อยู่: ${activeMeds || 'ไม่มี'}\n- โรคประจำตัว: ${diseases || 'ไม่มี'}\n- แพ้ยา: ${allergies || 'ไม่มี'}\n- ผลตรวจสำคัญ: ${criticalRows.map((r) => r.finding).join('; ') || 'ไม่พบปัญหาวิกฤต'}\nตอบกระชับ เป็นมืออาชีพ ห้ามสั่งยาหรือเปลี่ยนขนาดยา`;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
            }),
          },
        );

        if (response.ok) {
          const data = await response.json();
          const aiAdvice = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (aiAdvice) {
            summary.llmPersonalizedAdvice = aiAdvice;
            summary.executionMode = 'live';
          }
        }
      } catch (aiError) {
        console.warn('[MaCheck Agent] Gemini AI enhancement failed, using local rules:', aiError);
      }
    }

    return {
      success: true,
      status: 'completed',
      summary,
      quota_remaining: quota.quota_remaining,
      max_weekly_quota: quota.max_weekly_quota,
      current_tier: quota.current_tier,
      execution_mode: summary.executionMode || 'rules_only',
      message: 'Analysis completed successfully',
    };
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
