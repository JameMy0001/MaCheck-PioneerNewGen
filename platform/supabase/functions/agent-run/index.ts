import { adminClient, corsHeaders, json, parseBody } from "../_shared/auth.ts";
import {
  clampAgentTemperature,
  isUnsafeClinicalOutput,
} from "../_shared/agent-safety.ts";

type Status =
  | "ok"
  | "info"
  | "needs_data"
  | "needs_attention"
  | "review_required"
  | "critical";

interface EvidenceRef {
  type: string;
  id: string;
  version?: string;
  description?: string;
}

interface SummaryRow {
  category: string;
  latestData: string;
  finding: string;
  status: Status;
  completeness: number;
  updatedAt: string;
  evidenceRefs: EvidenceRef[];
}

interface RuntimeConfig {
  primary_model: string;
  fallback_model: string;
  temperature: number;
  max_tokens: number;
  request_timeout_ms: number;
  ai_enabled: boolean;
  prompt_version: string;
}

const allowedModels = new Set([
  "meta/llama-3.1-70b-instruct",
  "meta/llama-3.1-8b-instruct",
  "nvidia/llama-3.1-nemotron-70b-instruct",
]);

const defaultRuntimeConfig: RuntimeConfig = {
  primary_model: "meta/llama-3.1-70b-instruct",
  fallback_model: "meta/llama-3.1-8b-instruct",
  temperature: 0.2,
  max_tokens: 500,
  request_timeout_ms: 15_000,
  ai_enabled: true,
  prompt_version: "agent-safe-v1.1.0",
};

const normalize = (value: unknown) =>
  String(value ?? "").trim().toLocaleLowerCase("th");
const asArray = <T>(value: unknown): T[] =>
  Array.isArray(value) ? value as T[] : [];

function uniqueStrings(values: unknown[]) {
  return [
    ...new Set(
      values.map((value) => String(value ?? "").trim()).filter(Boolean),
    ),
  ];
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(
    new Uint8Array(digest),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
}

async function callNvidia(
  messages: { role: "system" | "user"; content: string }[],
  model: string,
  temperature: number,
  maxTokens: number,
  requestTimeoutMs: number,
  apiKey: string | null,
) {
  if (!apiKey) return null;

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    Math.min(Math.max(requestTimeoutMs, 3000), 30_000),
  );
  try {
    const response = await fetch(
      "https://integrate.api.nvidia.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          messages,
          temperature: clampAgentTemperature(temperature),
          max_tokens: Math.min(Math.max(maxTokens, 128), 800),
        }),
      },
    );
    if (!response.ok) return null;
    const payload = await response.json();
    const text = payload?.choices?.[0]?.message?.content;
    if (typeof text !== "string") return null;
    const cleaned = text.trim().slice(0, 1600);
    if (cleaned.length < 10 || isUnsafeClinicalOutput(cleaned)) return null;
    return cleaned;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function callConfiguredNvidia(
  messages: { role: "system" | "user"; content: string }[],
  config: RuntimeConfig,
  apiKey: string | null,
) {
  if (!config.ai_enabled) return null;
  const models = [...new Set([config.primary_model, config.fallback_model])]
    .filter((model) => allowedModels.has(model));
  for (const model of models) {
    const text = await callNvidia(
      messages,
      model,
      config.temperature,
      config.max_tokens,
      config.request_timeout_ms,
      apiKey,
    );
    if (text) return { text, model };
  }
  return null;
}

function medicationDefinition(medication: Record<string, any>) {
  const joined = Array.isArray(medication.medications)
    ? medication.medications[0]
    : medication.medications;
  return joined ?? {};
}

function allergyMatches(
  allergy: Record<string, any>,
  medication: Record<string, any>,
) {
  const definition = medicationDefinition(medication);
  const allergenCode = normalize(allergy.substance_code);
  const medicineCode = normalize(medication.medication_code);
  if (allergenCode && medicineCode && allergenCode === medicineCode) {
    return true;
  }

  const allergenValues = [allergy.substance_name, allergy.name].map(normalize)
    .filter((value) => value.length >= 4);
  const medicineValues = [
    medication.custom_name,
    definition.name_th,
    definition.name_en,
  ]
    .map(normalize)
    .filter((value) => value.length >= 4);
  return allergenValues.some((allergen) =>
    medicineValues.some((medicine) =>
      medicine === allergen || medicine.includes(allergen) ||
      allergen.includes(medicine)
    )
  );
}

function localDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function buildAdherence(
  activeMedications: Record<string, any>[],
  doseEvents: Record<string, any>[],
) {
  const now = new Date();
  const dates = Array.from({ length: 7 }, (_, offset) => {
    const date = new Date(now);
    date.setUTCDate(date.getUTCDate() - offset);
    return localDateKey(date);
  });
  const validKeys = new Set<string>();
  for (const medication of activeMedications) {
    for (const date of dates) {
      for (const slot of asArray<string>(medication.schedule)) {
        validKeys.add(`${date}|${medication.client_id}|${slot}`);
      }
    }
  }
  const expected = validKeys.size;
  if (!expected) return { rate: null, expected: 0, taken: 0 };
  const takenKeys = new Set(
    doseEvents
      .filter((event) => event.taken)
      .map((event) =>
        `${event.event_date}|${event.patient_medication_client_id}|${event.slot}`
      )
      .filter((key) => validKeys.has(key)),
  );
  return {
    rate: Math.round((takenKeys.size / expected) * 100),
    expected,
    taken: takenKeys.size,
  };
}

function overallStatus(rows: SummaryRow[]) {
  if (rows.some((row) => row.status === "critical")) return "critical";
  if (
    rows.some((row) =>
      ["needs_attention", "needs_data", "review_required"].includes(row.status)
    )
  ) return "needs_attention";
  return "ok";
}

function deterministicChatReply(message: string, rows: SummaryRow[]) {
  const query = normalize(message);
  const interaction = rows.find((row) => row.category === "drug_interactions");
  const allergy = rows.find((row) => row.category === "allergies");
  const adherence = rows.find((row) => row.category === "adherence");

  if (
    query.includes("เพิ่มยา") || query.includes("ลดยา") ||
    query.includes("หยุดยา") || query.includes("ปรับยา") ||
    query.includes("ขนาดยา")
  ) {
    return "ระบบไม่สามารถกำหนดหรือเปลี่ยนขนาดยาให้เองได้ ระบบสามารถจัดเตรียมข้อมูลล่าสุดเพื่อให้แพทย์หรือเภสัชกรตรวจทาน โปรดอย่าปรับ เพิ่ม ลด หรือหยุดยาเอง";
  }
  if (
    query.includes("ลืมยา") || query.includes("กินซ้ำ") || query.includes("เบิ้ลยา")
  ) {
    return "วิธีจัดการเมื่อลืมหรืออาจรับประทานยาซ้ำขึ้นอยู่กับยาชนิดนั้นและเวลาที่เกิดเหตุ ระบบยังไม่ควรให้คำตอบแบบเดียวกับยาทุกชนิด โปรดตรวจฉลากยา ติดต่อเภสัชกร หรือขอความช่วยเหลือฉุกเฉินหากมีอาการผิดปกติ และอย่ารับประทานชดเชยเอง";
  }
  if (query.includes("ยาตีกัน") || query.includes("ตีกัน")) {
    return interaction?.finding ?? "ไม่มีข้อมูลเพียงพอสำหรับตรวจยาตีกัน";
  }
  if (query.includes("แพ้ยา") || query.includes("อาการแพ้")) {
    return allergy?.finding ?? "ไม่มีข้อมูลเพียงพอสำหรับตรวจประวัติแพ้ยา";
  }
  if (
    query.includes("ลืมกิน") || query.includes("ตรงเวลา") ||
    query.includes("adherence")
  ) return adherence?.finding ?? "ไม่มีข้อมูลเพียงพอสำหรับคำนวณความสม่ำเสมอ";
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let runIdForFailure: string | null = null;
  let adminForFailure: ReturnType<typeof adminClient> | null = null;
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) return json({ error: "Unauthorized" }, 401);

    const admin = adminClient();
    adminForFailure = admin;
    const { data: { user }, error: authError } = await admin.auth.getUser(
      token,
    );
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const body = await parseBody(req);
    const intent = String(body.intent ?? "summary");
    if (!["summary", "chat", "request_review"].includes(intent)) {
      return json({ error: "Unsupported intent" }, 400);
    }
    const chatMessage = intent === "chat"
      ? String(body.message ?? "").trim().slice(0, 1000)
      : "";
    if (intent === "chat" && !chatMessage) {
      return json({ success: false, message: "กรุณาระบุคำถาม" }, 400);
    }

    if (intent === "request_review") {
      const requestedSummaryId = String(body.summaryId ?? "").trim();
      if (!requestedSummaryId) {
        return json(
          { success: false, message: "กรุณาระบุผลสรุปที่ต้องการส่งตรวจทาน" },
          400,
        );
      }
      const { data: summary } = await admin
        .from("agent_summaries")
        .select("id")
        .eq("id", requestedSummaryId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!summary) {
        return json(
          { success: false, message: "ไม่พบผลสรุปที่พร้อมส่งตรวจทาน" },
          400,
        );
      }
      const { data: existingRequest } = await admin
        .from("agent_review_requests")
        .select("id,status")
        .eq("user_id", user.id)
        .eq("summary_id", summary.id)
        .in("status", ["pending", "assigned"])
        .limit(1)
        .maybeSingle();
      if (existingRequest) {
        return json({
          success: true,
          requestId: existingRequest.id,
          status: existingRequest.status,
        });
      }
      const { data: request, error } = await admin
        .from("agent_review_requests")
        .insert({ user_id: user.id, summary_id: summary.id, status: "pending" })
        .select("id")
        .single();
      if (error) throw error;
      return json({ success: true, requestId: request.id, status: "pending" });
    }

    const { data: quotaData, error: quotaError } = await admin.rpc(
      "check_user_agent_quota",
      { p_user_id: user.id },
    );
    if (quotaError) {
      return json({
        success: false,
        error_code: "QUOTA_UNAVAILABLE",
        message: "ไม่สามารถตรวจสอบโควตาได้",
      }, 503);
    }
    const quota = Array.isArray(quotaData) ? quotaData[0] : quotaData;
    if (!quota?.allowed) {
      return json({
        success: false,
        error_code: "QUOTA_EXCEEDED",
        message: `คุณใช้โควตาครบ ${
          quota?.max_weekly_quota ?? 7
        } ครั้งในช่วง 7 วันที่ผ่านมาแล้ว`,
        current_tier: quota?.current_tier ?? "free",
        quota_remaining: 0,
        max_weekly_quota: quota?.max_weekly_quota ?? 7,
      }, 429);
    }

    const { data: configuredRuntime, error: runtimeConfigError } = await admin
      .from("agent_runtime_config")
      .select(
        "primary_model,fallback_model,temperature,max_tokens,request_timeout_ms,ai_enabled,prompt_version",
      )
      .eq("id", 1)
      .maybeSingle();
    if (runtimeConfigError) {
      console.warn(
        "[AgentRun] Runtime config unavailable; using locked defaults:",
        runtimeConfigError.code ?? "unknown",
      );
    }
    const runtimeConfig: RuntimeConfig = configuredRuntime
      ? {
        ...configuredRuntime,
        temperature: Number(configuredRuntime.temperature),
      } as RuntimeConfig
      : defaultRuntimeConfig;
    const { data: vaultedApiKey } = await admin.rpc(
      "server_get_agent_provider_secret",
      { p_provider: "nvidia" },
    );
    const providerApiKey = typeof vaultedApiKey === "string" && vaultedApiKey
      ? vaultedApiKey
      : Deno.env.get("NVIDIA_API_KEY") ?? null;
    const model = allowedModels.has(runtimeConfig.primary_model)
      ? runtimeConfig.primary_model
      : defaultRuntimeConfig.primary_model;

    const sevenDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
      .toISOString().slice(0, 10);
    const [
      profileResult,
      medicationsResult,
      conditionsResult,
      allergiesResult,
      metricsResult,
      dosesResult,
    ] = await Promise.all([
      admin.from("app_profiles").select("diseases,allergies").eq(
        "user_id",
        user.id,
      ).maybeSingle(),
      admin
        .from("patient_medications")
        .select(
          "id,client_id,medication_code,custom_name,dosage,schedule,status,created_at,medications(name_th,name_en,dataset_version,reviewed_at)",
        )
        .eq("user_id", user.id)
        .is("deleted_at", null),
      admin.from("patient_conditions").select(
        "id,code,name,status,verification_status,updated_at",
      ).eq("user_id", user.id).eq("status", "active"),
      admin.from("patient_allergies").select(
        "id,substance_code,substance_name,reaction,severity,verification_status,updated_at",
      ).eq("user_id", user.id).is("effective_to", null),
      admin.from("body_metrics").select(
        "id,metric_type,value,unit,measured_at,quality_flag",
      ).eq("user_id", user.id).eq("metric_type", "weight").eq(
        "quality_flag",
        "good",
      ).order("measured_at", { ascending: false }).limit(1),
      admin.from("dose_events").select(
        "patient_medication_client_id,slot,event_date,taken,occurred_at",
      ).eq("user_id", user.id).gte("event_date", sevenDaysAgo),
    ]);

    for (
      const result of [
        profileResult,
        medicationsResult,
        conditionsResult,
        allergiesResult,
        metricsResult,
        dosesResult,
      ]
    ) {
      if (result.error) throw result.error;
    }
    const profile = profileResult.data ?? { diseases: [], allergies: [] };
    const medications = medicationsResult.data ?? [];
    const activeMedications = medications.filter((medication) =>
      medication.status === "active"
    );
    const legacyDiseases = asArray<string>(profile.diseases);
    const conditions = conditionsResult.data?.length
      ? conditionsResult.data
      : legacyDiseases.map((name) => ({
        id: `legacy:${name}`,
        code: name,
        name,
        verification_status: "unverified",
      }));
    const legacyAllergies = asArray<Record<string, any> | string>(
      profile.allergies,
    ).map((item) =>
      typeof item === "string"
        ? { name: item, substance_name: item, substance_code: item }
        : item
    );
    const allergies = allergiesResult.data?.length
      ? allergiesResult.data
      : legacyAllergies;
    const metrics = metricsResult.data ?? [];
    const latestWeight = metrics.find((metric) =>
      metric.metric_type === "weight"
    );
    const adherence = buildAdherence(activeMedications, dosesResult.data ?? []);

    const activeCodes = uniqueStrings(
      activeMedications.map((medication) => medication.medication_code),
    );
    const interactionsResult = activeCodes.length >= 2
      ? await admin
        .from("drug_interactions")
        .select(
          "id,drug_1,drug_2,severity,title_th,description_th,advice_th,dataset_version,reviewed_at,source_references",
        )
        .eq("status", "published")
        .in("drug_1", activeCodes)
        .in("drug_2", activeCodes)
      : { data: [], error: null };
    if (interactionsResult.error) throw interactionsResult.error;
    const interactions = interactionsResult.data ?? [];
    const allergyConflicts = allergies.flatMap((allergy: Record<string, any>) =>
      activeMedications.filter((medication) =>
        allergyMatches(allergy, medication)
      ).map((medication) => ({ allergy, medication }))
    );
    const now = new Date().toISOString();
    const scheduleCount = activeMedications.reduce(
      (total, medication) => total + asArray(medication.schedule).length,
      0,
    );

    const rows: SummaryRow[] = [
      {
        category: "conditions",
        latestData: conditions.length
          ? uniqueStrings(
            conditions.map((condition: any) =>
              condition.name || condition.code
            ),
          ).join(", ")
          : "ไม่ได้ระบุ",
        finding: conditions.length
          ? `มีโรคประจำตัวที่บันทึกไว้ ${conditions.length} รายการ ใช้เป็นบริบทได้ แต่ยังต้องให้ผู้เชี่ยวชาญตรวจข้อควรระวังระหว่างโรคกับยา`
          : "ยังไม่ได้บันทึกโรคประจำตัว จึงตรวจข้อควรระวังระหว่างโรคกับยาได้ไม่ครบถ้วน",
        status: conditions.length ? "review_required" : "needs_data",
        completeness: conditions.length ? 70 : 40,
        updatedAt: now,
        evidenceRefs: conditions.map((condition: any) => ({
          type: "patient_entity",
          id: String(condition.id),
          description: "ข้อมูลโรคประจำตัวล่าสุด",
        })),
      },
      {
        category: "allergies",
        latestData: allergies.length ? `${allergies.length} รายการ` : "ไม่ได้ระบุ",
        finding: allergyConflicts.length
          ? `พบชื่อยาที่อาจตรงกับประวัติแพ้ ${allergyConflicts.length} รายการ ต้องให้แพทย์หรือเภสัชกรตรวจสอบทันที`
          : allergies.length
          ? "ไม่พบชื่อยาที่ตรงกับประวัติแพ้ในการเปรียบเทียบครั้งนี้ ผลยังไม่ครอบคลุมชื่อพ้องและส่วนประกอบทุกชนิด"
          : "ยังไม่ได้บันทึกประวัติแพ้ยา จึงตรวจความเสี่ยงได้ไม่ครบถ้วน",
        status: allergyConflicts.length
          ? "critical"
          : allergies.length
          ? "info"
          : "needs_data",
        completeness: allergies.length ? 90 : 40,
        updatedAt: now,
        evidenceRefs: allergies.map((allergy: any) => ({
          type: "patient_entity",
          id: String(allergy.id ?? allergy.substance_code),
          description: "ประวัติแพ้ยาล่าสุด",
        })),
      },
      {
        category: "drug_interactions",
        latestData: interactions.length
          ? `${interactions.length} คู่ที่ต้องตรวจสอบ`
          : "ไม่พบคู่ที่ตรงกับฐานข้อมูลที่เผยแพร่",
        finding: interactions.length
          ? `พบคู่ยาที่ต้องตรวจสอบ ${interactions.length} คู่ โปรดเปิดหลักฐานและปรึกษาแพทย์หรือเภสัชกร`
          : `ตรวจยาใช้งานอยู่ ${activeMedications.length} รายการแล้ว ไม่พบคู่ที่ตรงกับฐานข้อมูลที่เผยแพร่ครั้งนี้ ซึ่งไม่ใช่การรับรองว่าปลอดจากปฏิกิริยาทุกชนิด`,
        status: interactions.some((item: any) => item.severity === "severe")
          ? "critical"
          : interactions.length
          ? "needs_attention"
          : "info",
        completeness: activeMedications.length ? 95 : 40,
        updatedAt: now,
        evidenceRefs: interactions.map((item: any) => ({
          type: "clinical_rule",
          id: `drug_interactions.${item.id}`,
          version: String(item.dataset_version ?? ""),
          description: `ฐานข้อมูลเผยแพร่และตรวจทานล่าสุด ${
            item.reviewed_at ?? "ไม่ระบุวันที่"
          }${
            asArray<string>(item.source_references).length
              ? ` · ${asArray<string>(item.source_references).join(", ")}`
              : ""
          }`,
        })),
      },
      {
        category: "medication_schedule",
        latestData: `${scheduleCount} รอบต่อวัน`,
        finding: scheduleCount
          ? `พบตารางยารวม ${scheduleCount} รอบต่อวัน ระบบไม่ได้เปลี่ยนตารางยา`
          : "ยังไม่มีตารางยาที่ใช้งานอยู่",
        status: scheduleCount ? "ok" : "needs_data",
        completeness: scheduleCount ? 100 : 30,
        updatedAt: now,
        evidenceRefs: activeMedications.map((medication) => ({
          type: "patient_entity",
          id: String(medication.id),
          description: "รายการยาและตารางล่าสุด",
        })),
      },
      {
        category: "medicine_cabinet",
        latestData: `${activeMedications.length} รายการกำลังใช้ · ${
          medications.length - activeMedications.length
        } รายการหยุดใช้`,
        finding: activeMedications.length
          ? `มียาที่กำลังใช้อยู่ ${activeMedications.length} รายการ`
          : "ยังไม่มียาที่กำลังใช้อยู่ในตู้ยา",
        status: activeMedications.length ? "ok" : "needs_data",
        completeness: activeMedications.length ? 100 : 30,
        updatedAt: now,
        evidenceRefs: activeMedications.map((medication) => ({
          type: "patient_entity",
          id: String(medication.id),
          description: "รายการยาในตู้ยาล่าสุด",
        })),
      },
      {
        category: "adherence",
        latestData: adherence.rate === null
          ? "ข้อมูลไม่เพียงพอ"
          : `${adherence.rate}% ใน 7 วัน`,
        finding: adherence.rate === null
          ? "ยังไม่มีตารางยาที่เพียงพอสำหรับคำนวณความสม่ำเสมอ"
          : `บันทึกรับประทานยา ${adherence.taken}/${adherence.expected} รอบในช่วง 7 วันที่ตรวจ คิดเป็น ${adherence.rate}%`,
        status: adherence.rate === null
          ? "needs_data"
          : adherence.rate >= 80
          ? "ok"
          : "needs_attention",
        completeness: adherence.rate === null ? 30 : 100,
        updatedAt: now,
        evidenceRefs: [{
          type: "calculation",
          id: "dose_events.rolling_7_days",
          description: "คำนวณจากตารางยาและบันทึกรับประทานยา 7 วันล่าสุด",
        }],
      },
      {
        category: "body_metrics",
        latestData: latestWeight
          ? `${latestWeight.value} ${latestWeight.unit}`
          : "ไม่ได้บันทึก",
        finding: latestWeight
          ? `บันทึกน้ำหนักล่าสุด ${latestWeight.value} ${latestWeight.unit} เพื่อเป็นข้อมูลประกอบ ระบบไม่ได้คำนวณหรือเปลี่ยนขนาดยา`
          : "ยังไม่ได้บันทึกน้ำหนักล่าสุด ระบบจะไม่ประเมินความเหมาะสมของขนาดยา",
        status: latestWeight ? "info" : "needs_data",
        completeness: latestWeight ? 100 : 40,
        updatedAt: now,
        evidenceRefs: latestWeight
          ? [{
            type: "patient_entity",
            id: String(latestWeight.id),
            description: `วัดเมื่อ ${latestWeight.measured_at}`,
          }]
          : [],
      },
    ];

    const snapshotPayload = {
      asOf: now,
      medications: activeMedications.map((medication) => ({
        id: medication.id,
        code: medication.medication_code,
        customName: medication.custom_name,
        dosage: medication.dosage,
        schedule: medication.schedule,
        status: medication.status,
      })),
      conditions: conditions.map((condition: any) => ({
        id: condition.id,
        code: condition.code,
        name: condition.name,
        verificationStatus: condition.verification_status,
      })),
      allergies: allergies.map((allergy: any) => ({
        id: allergy.id ?? allergy.substance_code,
        code: allergy.substance_code,
        name: allergy.substance_name ?? allergy.name,
        severity: allergy.severity,
        verificationStatus: allergy.verification_status,
      })),
      latestWeight: latestWeight
        ? {
          id: latestWeight.id,
          value: latestWeight.value,
          unit: latestWeight.unit,
          measuredAt: latestWeight.measured_at,
        }
        : null,
      adherence,
    };
    const snapshotHash = await sha256(JSON.stringify(snapshotPayload));
    const { data: snapshot, error: snapshotError } = await admin.from(
      "patient_snapshots",
    ).insert({
      user_id: user.id,
      version: Math.floor(Date.now() / 1000),
      as_of: now,
      data_hash: snapshotHash,
      snapshot_payload: snapshotPayload,
    }).select("id").single();
    if (snapshotError) {
      return json({
        success: true,
        status: "rules_only",
        execution_mode: "rules_only",
        summary: {
          schemaVersion: "1.1",
          summaryId: crypto.randomUUID(),
          generatedAt: now,
          overallStatus: overallStatus(rows),
          executionMode: "rules_only",
          llmPersonalizedAdvice:
            "[โหมดกฎเท่านั้น] ระบบบันทึกเส้นทางการวิเคราะห์ไม่ได้ จึงไม่เรียก AI และไม่เปลี่ยนแผนการรักษา",
          rows,
          priorities: [],
          missingData: rows.filter((row) => row.status === "needs_data").map((
            row,
          ) => row.category),
          allowedActions: ["refresh_summary"],
          unchangedTreatment: true,
        },
        quota_remaining: quota.quota_remaining,
        current_tier: quota.current_tier,
        max_weekly_quota: quota.max_weekly_quota,
      }, 200);
    }

    const { data: run, error: runError } = await admin.from("agent_runs")
      .insert({
        user_id: user.id,
        trace_id: crypto.randomUUID(),
        intent,
        snapshot_id: snapshot.id,
        status: "running",
        model_name: model,
        prompt_version: runtimeConfig.prompt_version,
      }).select("id").single();
    if (runError) throw runError;
    runIdForFailure = run.id;

    await admin.from("agent_tool_calls").insert({
      run_id: run.id,
      sequence_number: 1,
      tool_name: "deterministic_clinical_screen",
      args_hash: snapshotHash,
      input_args: {
        medication_count: activeMedications.length,
        condition_count: conditions.length,
        allergy_count: allergies.length,
      },
      output_result: {
        overall_status: overallStatus(rows),
        interaction_count: interactions.length,
        allergy_conflict_count: allergyConflicts.length,
        adherence_rate: adherence.rate,
      },
    });

    if (intent === "chat") {
      const message = chatMessage;
      let reply = deterministicChatReply(message, rows);
      let executionMode: "live" | "rules_only" = "rules_only";
      let executionModel: string | undefined;
      if (!reply) {
        const compactContext = rows.map((row) =>
          `${row.category}: ${row.finding}`
        ).join("\n");
        const completion = await callConfiguredNvidia(
          [
            {
              role: "system",
              content:
                "คุณคือผู้ช่วยจัดระเบียบข้อมูลยา ตอบเฉพาะจากผลคัดกรองที่ให้มา ห้ามกำหนดขนาดยา ห้ามสั่งเริ่ม เพิ่ม ลด หยุด หรือเปลี่ยนยา หากข้อมูลไม่พอให้บอกว่าไม่พอและแนะนำให้สอบถามแพทย์หรือเภสัชกร ตอบภาษาไทยสั้นและไม่รับรองว่าปลอดภัยเด็ดขาด",
            },
            {
              role: "user",
              content: `ผลคัดกรอง:\n${compactContext}\n\nคำถาม: ${message}`,
            },
          ],
          runtimeConfig,
          providerApiKey,
        );
        reply = completion?.text ?? null;
        executionModel = completion?.model;
        if (completion) executionMode = "live";
      }
      if (!reply) {
        reply =
          "ระบบไม่มีข้อมูลเพียงพอสำหรับตอบคำถามนี้อย่างปลอดภัย โปรดตรวจฉลากยาและสอบถามแพทย์หรือเภสัชกร โดยอย่าปรับยาเอง";
      }
      await admin.from("agent_runs").update({
        status: "completed",
        stop_reason: executionMode === "live" ? "completed" : "rules_only",
      }).eq("id", run.id);
      return json({
        success: true,
        runId: run.id,
        reply,
        execution_mode: executionMode,
        model_name: executionModel,
        quota_remaining: quota.current_tier === "admin"
          ? 9999
          : Math.max(0, Number(quota.quota_remaining) - 1),
        max_weekly_quota: quota.max_weekly_quota,
        current_tier: quota.current_tier,
      });
    }

    const compactContext = rows.map((row) => `${row.category}: ${row.finding}`)
      .join("\n");
    const completion = await callConfiguredNvidia(
      [
        {
          role: "system",
          content:
            "เรียบเรียงผลคัดกรองยาเป็นภาษาไทย 2-3 ประโยค อ้างเฉพาะข้อมูลที่ให้ ห้ามรับรองว่าปลอดภัย ห้ามกำหนดขนาดยา และห้ามสั่งเริ่ม เพิ่ม ลด หยุด หรือเปลี่ยนยา หากข้อมูลไม่ครบให้บอกข้อจำกัด",
        },
        { role: "user", content: compactContext },
      ],
      runtimeConfig,
      providerApiKey,
    );
    const advice = completion?.text ?? null;
    const executionMode: "live" | "rules_only" = advice ? "live" : "rules_only";
    const summaryPayload = {
      schemaVersion: "1.1",
      summaryId: crypto.randomUUID(),
      generatedAt: now,
      overallStatus: overallStatus(rows),
      executionMode,
      modelName: executionMode === "live" ? completion?.model : undefined,
      llmPersonalizedAdvice: advice ??
        "[โหมดกฎเท่านั้น] ระบบสรุปผลคัดกรองจากข้อมูลล่าสุดโดยไม่ใช้ AI และไม่ได้เปลี่ยนแผนการรักษา",
      rows,
      priorities: rows.filter((row) =>
        ["critical", "needs_attention", "review_required"].includes(row.status)
      ).map((row) => row.category),
      missingData: rows.filter((row) => row.status === "needs_data").map((
        row,
      ) => row.category),
      allowedActions: ["refresh_summary", "request_professional_review"],
      unchangedTreatment: true,
    };

    const { error: summaryError } = await admin.from("agent_summaries").insert({
      id: summaryPayload.summaryId,
      user_id: user.id,
      run_id: run.id,
      schema_version: 1,
      overall_status: summaryPayload.overallStatus,
      structured_payload: summaryPayload,
    });
    if (summaryError) throw summaryError;
    await admin.from("agent_runs").update({
      status: "completed",
      stop_reason: executionMode === "live" ? "completed" : "rules_only",
    }).eq("id", run.id);

    return json({
      success: true,
      runId: run.id,
      status: "completed",
      summary: summaryPayload,
      execution_mode: executionMode,
      quota_remaining: quota.current_tier === "admin"
        ? 9999
        : Math.max(0, Number(quota.quota_remaining) - 1),
      max_weekly_quota: quota.max_weekly_quota,
      current_tier: quota.current_tier,
    });
  } catch (error) {
    if (adminForFailure && runIdForFailure) {
      await adminForFailure
        .from("agent_runs")
        .update({ status: "failed", stop_reason: "internal_error" })
        .eq("id", runIdForFailure);
    }
    console.error(
      "[AgentRun] Request failed without logging patient content:",
      error instanceof Error ? error.message : String(error),
    );
    return json({
      error: "Internal Server Error",
      message: "ระบบ AI Agent ไม่พร้อมใช้งาน กรุณาลองใหม่ภายหลัง",
    }, 500);
  }
});
