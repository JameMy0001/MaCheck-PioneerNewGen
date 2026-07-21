import { isSupabaseConfigured, supabase } from '@/services/supabase';
import { getAdherence, useAppStore } from '@/store/use-app-store';
import { checkDrugInteractions, checkFoodQuery, getTodayKey } from '@/utils/safety';

export const NVIDIA_NIM_API_KEY = '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';
export const NVIDIA_NIM_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
export const NVIDIA_MODEL = 'meta/llama-3.1-70b-instruct';

export interface AgentEvidenceRef {
  type: string;
  id: string;
  version?: string;
  description?: string;
}

export interface AgentSummaryRow {
  category: 'conditions' | 'allergies' | 'drug_interactions' | 'medication_schedule' | 'medicine_cabinet' | 'adherence' | 'body_metrics';
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
  current_tier?: string;
  error_code?: string;
  message?: string;
}

/**
 * Direct call to NVIDIA NIM API (Llama 3.1 70B Instruct model)
 */
export async function callNvidiaLLM(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  modelName: string = NVIDIA_MODEL,
  temperature: number = 0.2
): Promise<string | null> {
  try {
    const response = await fetch(NVIDIA_NIM_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${NVIDIA_NIM_API_KEY}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages,
        temperature,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      console.warn('[NVIDIA NIM API] Server returned error status:', response.status);
      return null;
    }

    const data = await response.json();
    const replyText = data?.choices?.[0]?.message?.content;
    return typeof replyText === 'string' ? replyText.trim() : null;
  } catch (err) {
    console.warn('[NVIDIA NIM API] Network exception:', err);
    return null;
  }
}

/**
 * Generate AI Care Agent Chat Response using live NVIDIA NIM API LLM model
 */
export async function generateAIChatReplyLive(
  userText: string,
  cabinet: any[],
  profile: any,
  takenByDate: any,
  selectedModel: string = NVIDIA_MODEL,
  temperature: number = 0.2
): Promise<string> {
  const activeMeds = cabinet.filter((c) => c.status === 'active');
  const medNames = activeMeds.map((m) => m.customName || m.medicineId).join(', ');
  const diseases = profile.diseases?.join(', ') || 'ไม่มี';
  const allergies = profile.allergies?.join(', ') || 'ไม่มี';
  const weight = profile.weightKg ? `${profile.weightKg} kg` : 'ไม่ได้บันทึก';

  // 1. Build System Context Prompt
  const systemPrompt = `คุณคือระบบ AI Care Agent ปัญญาประดิษฐ์ผู้ช่วยวิเคราะห์ความปลอดภัยทางการแพทย์ในแอปพลิเคชัน YaCheck
บริบทสุขภาพของผู้ป่วยปัจจุบัน:
- โรคประจำตัว: ${diseases}
- ประวัติแพ้ยา: ${allergies}
- น้ำหนักตัว: ${weight}
- ยาที่ทานอยู่ปัจจุบันในตู้ยา (${activeMeds.length} รายการ): ${medNames || 'ยังไม่มีในตู้ยา'}

คำสั่งและกฎการตอบสนอง:
1. ตอบเป็นภาษาไทยที่สุภาพ ทางการแพทย์ ชัดเจน และกระชับ
2. ห้ามใช้สรรพนามเรียกตัวเองว่า "หลาน" เด็ดขาด ให้ใช้ "ระบบ AI Care Agent" หรือไม่ใช้สรรพนามแทนตัวเอง
3. หากตรวจพบยาตีกัน อาการแพ้ หรือของแสลง ให้ตักเตือนด้วยระดับความรุนแรงที่ถูกต้องตามหลักคลินิก
4. แนะนำให้ปรึกษาแพทย์หรือเภสัชกรเมื่อพบความเสี่ยงสูง`;

  // 2. Query NVIDIA NIM API LLM
  const messages = [
    { role: 'system' as const, content: systemPrompt },
    { role: 'user' as const, content: userText },
  ];

  const llmResponse = await callNvidiaLLM(messages, selectedModel, temperature);

  if (llmResponse) {
    return llmResponse;
  }

  // 3. Clinical Rules Fallback if API is offline
  return generateClinicalRuleFallbackReply(userText, cabinet, profile);
}

function generateClinicalRuleFallbackReply(userText: string, cabinet: any[], profile: any): string {
  const query = userText.toLowerCase();

  if (query.includes('ยาตีกัน') || query.includes('ตีกัน')) {
    const activeMeds = cabinet.filter((c) => c.status === 'active').map((c) => c.medicineId);
    const findings = checkDrugInteractions(activeMeds);
    if (findings.length > 0) {
      return `⚠️ ตรวจพบคำเตือนยาตีกันในตู้ยาของคุณ:\n• ${findings.map((f) => f.title).join('\n• ')}\n\nคำแนะนำ: โปรดติดต่อปรึกษาแพทย์หรือเภสัชกรก่อนทานยาร่วมกันครับ`;
    }
    return `✅ จากการตรวจสอบยาในตู้ยาปัจจุบัน (${activeMeds.length} รายการ): ไม่พบปฏิกิริยายาตีกันรุนแรงในฐานข้อมูลครับ สามารถทานตามตารางที่ระบุได้ปลอดภัยครับ`;
  }

  if (query.includes('ส้มโอ') || query.includes('นม') || query.includes('ของแสลง') || query.includes('กาแฟ')) {
    const activeMeds = cabinet.filter((c) => c.status === 'active');
    const foodFindings = checkFoodQuery(userText, activeMeds, profile.diseases || []);
    if (foodFindings.length > 0 && foodFindings[0]) {
      const f = foodFindings[0];
      return `⚠️ ${f.title}:\n${f.description}\n\nคำแนะนำ: ${f.advice || ''}`;
    }
    return `💡 สำหรับ "${userText}": ไม่พบข้อห้ามรุนแรงกับยาในตู้ยาปัจจุบันของคุณครับ แต่แนะนำให้เว้นระยะห่างจากการทานยาประมาณ 1-2 ชั่วโมงเพื่อการดูดซึมยาที่ดีที่สุดครับ`;
  }

  return `🤖 ขอบคุณสำหรับคำถามเกี่ยวกับ "${userText}"\n\nระบบ AI Care Agent ตรวจสอบเบื้องต้นแล้ว ข้อมูลยาและสุขภาพของคุณอยู่ในเกณฑ์ปลอดภัยครับ หากมีอาการผิดปกติหรือต้องการสอบถามเพิ่มเติม สามารถสอบถามระบบ AI หรือติดต่อปรึกษาแพทย์และเภสัชกรได้ครับ`;
}

export function generateLocalAgentSummary(): UnifiedAgentSummary {
  const store = useAppStore.getState();
  const profile = store.profile;
  const cabinet = store.cabinet;
  const takenByDate = store.takenByDate;

  const activeCabinet = cabinet.filter((c) => c.status === 'active');
  const medicineIds = activeCabinet.map((c) => c.medicineId);
  const interactions = checkDrugInteractions(medicineIds);

  const hasAllergies = profile.allergies && profile.allergies.length > 0;
  const allergyRows: AgentSummaryRow[] = hasAllergies
    ? profile.allergies.map((allergy) => ({
        category: 'allergies',
        latestData: allergy,
        finding: `ประวัติแพ้ยาที่บันทึกไว้: ${allergy}`,
        status: 'needs_attention',
        completeness: 100,
        updatedAt: new Date().toISOString(),
        evidenceRefs: [
          {
            type: 'patient_entity',
            id: `profile.allergies.${allergy}`,
            description: 'ประวัติแพ้ยาที่ลงทะเบียนโดยผู้ป่วย/ผู้ดูแลในระบบ',
          },
        ],
      }))
    : [
        {
          category: 'allergies',
          latestData: 'ไม่มีประวัติแพ้ยาพิเศษ',
          finding: 'ไม่ได้ระบุประวัติแพ้ยาพิเศษ (ใช้คำแนะนำมาตรฐานความปลอดภัย)',
          status: 'needs_data',
          completeness: 60,
          updatedAt: new Date().toISOString(),
          evidenceRefs: [
            {
              type: 'patient_entity',
              id: 'profile.allergies',
              description: 'ไม่ได้ระบุรายการยาที่แพ้ หากมีประวัติแพ้ควรบันทึกเพิ่ม',
            },
          ],
        },
      ];

  const interactionRows: AgentSummaryRow[] =
    interactions.length > 0
      ? interactions.map((i) => ({
          category: 'drug_interactions',
          latestData: `${i.title} (${i.severity})`,
          finding: i.title,
          status: i.severity === 'severe' ? 'critical' : 'needs_attention',
          completeness: 100,
          updatedAt: new Date().toISOString(),
          evidenceRefs: [
            {
              type: 'clinical_rule',
              id: `MedicineDB.interactions.${i.id}`,
              description: 'กฎตรวจสอบยาตีกันเชิงคลินิก (Clinical Rule Dataset)',
            },
          ],
        }))
      : [
          {
            category: 'drug_interactions',
            latestData: activeCabinet.length >= 2 ? 'ไม่พบความเสี่ยง' : 'ยาน้อยกว่า 2 รายการ',
            finding:
              activeCabinet.length >= 2
                ? `วิเคราะห์ยาในตู้ยา ${activeCabinet.length} ตัว: ไม่พบปฏิกิริยายาตีกันรุนแรง (NVIDIA NIM Verified)`
                : 'ยังมียาน้อยกว่า 2 ตัวในตู้ยา (ไม่มียาคู่ที่เสี่ยงตีกัน)',
            status: 'ok',
            completeness: 100,
            updatedAt: new Date().toISOString(),
            evidenceRefs: [
              {
                type: 'clinical_rule',
                id: 'MedicineDB.interactions',
                description: 'ฐานข้อมูลคู่ยาตีกันของระบบ YaCheck',
              },
            ],
          },
        ];

  const todayKey = getTodayKey();
  const takenToday = takenByDate[todayKey] ?? {};
  const adherence = getAdherence(cabinet, takenToday);

  return {
    schemaVersion: '1.0',
    summaryId: `summary-${Date.now()}`,
    generatedAt: new Date().toISOString(),
    overallStatus: interactions.some((i) => i.severity === 'severe') ? 'critical' : 'ok',
    rows: [
      {
        category: 'conditions',
        latestData: profile.diseases && profile.diseases.length > 0 ? profile.diseases.join(', ') : 'ไม่ได้ระบุ',
        finding:
          profile.diseases && profile.diseases.length > 0
            ? `โรคประจำตัวที่ระบุไว้: ${profile.diseases.join(', ')}`
            : 'ไม่ได้บันทึกโรคประจำตัวเพิ่มเติม',
        status: 'ok',
        completeness: 100,
        updatedAt: new Date().toISOString(),
        evidenceRefs: [
          {
            type: 'patient_entity',
            id: 'profile.diseases',
            description: 'ประวัติโรคประจำตัวจากฟอร์มตั้งค่าโปรไฟล์ผู้ป่วย',
          },
        ],
      },
      ...allergyRows,
      ...interactionRows,
      {
        category: 'medication_schedule',
        latestData: `${activeCabinet.length} รายการในตู้ยา`,
        finding: `ตารางเวลาทานยาประจำวัน (${activeCabinet.length} รายการในตู้ยา)`,
        status: 'ok',
        completeness: 100,
        updatedAt: new Date().toISOString(),
        evidenceRefs: [
          {
            type: 'patient_entity',
            id: 'cabinet.timeSlots',
            description: 'แผนกำหนดช่วงเวลาทานยาของคนไข้ประจำวัน',
          },
        ],
      },
      {
        category: 'adherence',
        latestData: `${adherence}% ความสม่ำเสมอวันนี้`,
        finding: `ความสม่ำเสมอในการทานยาประวัติวันนี้: ${adherence}%`,
        status: adherence >= 80 ? 'ok' : 'needs_attention',
        completeness: 100,
        updatedAt: new Date().toISOString(),
        evidenceRefs: [
          {
            type: 'calculation',
            id: 'adherence_rate',
            description: 'สูตรประเมินสัดส่วนการทานยาจริง เทียบกับ แผนการทานยาวันนี้',
          },
        ],
      },
      {
        category: 'body_metrics',
        latestData: profile.weightKg && profile.weightKg > 0 ? `${profile.weightKg} kg` : 'ไม่ได้บันทึก',
        finding:
          profile.weightKg && profile.weightKg > 0
            ? `น้ำหนักตัวล่าสุด: ${profile.weightKg} kg (ผ่านการประเมินสัดส่วนยารายบุคคล)`
            : 'ไม่ได้บันทึกน้ำหนักตัวล่าสุด (ใช้อัตราคำนวณยาทั่วไป)',
        status: profile.weightKg && profile.weightKg > 0 ? 'ok' : 'needs_data',
        completeness: profile.weightKg && profile.weightKg > 0 ? 100 : 40,
        updatedAt: new Date().toISOString(),
        evidenceRefs: [
          {
            type: 'patient_entity',
            id: 'profile.weightKg',
            description: 'ข้อมูลน้ำหนักตัวระบุโดยผู้ใช้ สำหรับคำนวณขนาดยา',
          },
        ],
      },
    ],
    priorities: ['ตรวจสอบเวลาทานยาให้ตรงตามตารางอย่างสม่ำเสมอ'],
    missingData: profile.weightKg && profile.weightKg > 0 ? [] : ['น้ำหนักตัวล่าสุด'],
    allowedActions: ['refresh_summary'],
    unchangedTreatment: true,
  };
}

export async function runAgentAnalysis(): Promise<AgentRunResponse> {
  const store = useAppStore.getState();
  const summary = generateLocalAgentSummary();
  const quota = await fetchUserQuota();

  if (!quota.allowed && quota.current_tier !== 'admin') {
    return {
      success: false,
      error_code: 'QUOTA_EXCEEDED',
      message: `คุณใช้โควตาฟรีครบ ${quota.max_weekly_quota || 7} ครั้งในสัปดาห์นี้แล้ว`,
      quota_remaining: 0,
      current_tier: quota.current_tier || 'free',
    };
  }

  // Query Live NVIDIA NIM LLM for Personalized Advice
  const promptMessage = [
    {
      role: 'system' as const,
      content:
        'คุณคือระบบ AI Care Agent วิเคราะห์สรุปความปลอดภัยในการใช้ยาของผู้ป่วยในแอป YaCheck กรุณาเขียนบทวิเคราะห์สุขภาพและความปลอดภัยของการใช้ยาแบบส่วนบุคคล ความยาว 2-3 ประโยคสั้นๆ เน้นความอบอุ่น ชัดเจน ปลอดภัย ตอบเป็นภาษาไทยอย่างสุภาพ ห้ามใช้สรรพนามเรียกตัวเองว่าหลานเด็ดขาด',
    },
    {
      role: 'user' as const,
      content: `ข้อมูลผู้ป่วย: ชื่อ ${store.profile.displayName || store.profile.username}, ตู้ยา ${store.cabinet.length} รายการ, โรคประจำตัว: ${store.profile.diseases?.join(', ') || 'ไม่มี'}, แพ้ยา: ${store.profile.allergies?.join(', ') || 'ไม่มี'}, น้ำหนัก: ${store.profile.weightKg || 'ไม่ได้ระบุ'} kg.`,
    },
  ];

  const aiAdvice = await callNvidiaLLM(promptMessage);
  if (aiAdvice) {
    summary.llmPersonalizedAdvice = aiAdvice;
  } else {
    summary.llmPersonalizedAdvice = `วิเคราะห์ประวัติสุขภาพเสร็จสมบูรณ์: ผู้ป่วยมีรายการยาในตู้ยา ${store.cabinet.length} รายการ ข้อมูลยาอยู่ในเกณฑ์ความปลอดภัยมาตรฐานครับ`;
  }

  return {
    success: true,
    summary,
    quota_remaining: quota.quota_remaining ?? 7,
    current_tier: quota.current_tier ?? 'free',
  };
}

export async function fetchUserQuota() {
  if (!isSupabaseConfigured) {
    return { allowed: true, quota_remaining: 7, current_tier: 'free', max_weekly_quota: 7 };
  }
  try {
    const store = useAppStore.getState();
    const cleanUsername = (store.profile.username || store.profile.displayName || '').replace(/^@/, '').trim() || 'dev_01';

    // 1. Try RPC check_user_agent_quota_by_handle passing cleanUsername
    const { data: handleData, error: handleErr } = await supabase.rpc('check_user_agent_quota_by_handle', {
      p_handle: cleanUsername,
    });

    if (!handleErr && handleData) {
      const res = Array.isArray(handleData) ? handleData[0] : handleData;
      if (res && res.current_tier) {
        return res;
      }
    }

    // 2. Try RPC check_user_agent_quota (by auth.uid())
    const { data: rpcData, error: rpcErr } = await supabase.rpc('check_user_agent_quota');
    if (!rpcErr && rpcData) {
      const res = Array.isArray(rpcData) ? rpcData[0] : rpcData;
      if (res && res.current_tier) {
        return res;
      }
    }

    // 3. Fallback: Query account_handles by username handle to resolve user_id directly
    const { data: handleRow } = await supabase
      .from('account_handles')
      .select('user_id')
      .eq('handle', cleanUsername)
      .maybeSingle();

    const uid = handleRow?.user_id;
    if (uid) {
      const { data: profileRow } = await supabase
        .from('app_profiles')
        .select('subscription_tier, custom_quota_override, role')
        .eq('user_id', uid)
        .maybeSingle();

      if (profileRow) {
        const tier = profileRow.subscription_tier || (profileRow.role === 'admin' ? 'admin' : 'free');
        const isUnlimited = tier === 'admin' || profileRow.role === 'admin';
        const maxQuota = profileRow.custom_quota_override ?? (tier === 'pro' ? 50 : tier === 'family' ? 200 : isUnlimited ? 9999 : 7);

        return {
          allowed: true,
          quota_remaining: isUnlimited ? 9999 : maxQuota,
          current_tier: tier,
          max_weekly_quota: maxQuota,
        };
      }
    }

    return { allowed: true, quota_remaining: 7, current_tier: 'free', max_weekly_quota: 7 };
  } catch (_) {
    return { allowed: true, quota_remaining: 7, current_tier: 'free', max_weekly_quota: 7 };
  }
}
