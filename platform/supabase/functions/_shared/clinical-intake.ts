export type ClinicalConversationMode = "general" | "symptom_intake";

export interface ClinicalChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface ClinicalIntakeDecision {
  kind: "none" | "clarify" | "emergency" | "urgent" | "continue";
  conversationMode: ClinicalConversationMode;
  reply?: string;
  requiresFollowUp: boolean;
}

const symptomTerms = [
  "ปวด",
  "เจ็บ",
  "บวม",
  "ไข้",
  "ไอ",
  "เวียนหัว",
  "คลื่นไส้",
  "อาเจียน",
  "ผื่น",
  "ชา",
  "อ่อนแรง",
  "ท้องเสีย",
  "หายใจ",
];

const medicineRequestPatterns = [
  /(?:กิน|ทาน|ใช้)ยาอะไร/,
  /ควร(?:กิน|ทาน|ใช้)ยา/,
  /ยา(?:ตัว)?ไหนดี/,
  /แนะนำยา/,
  /มียาอะไร(?:ช่วย|รักษา|แก้)/,
];

const emergencyPatterns = [
  /หายใจ(?:ไม่ออก|ลำบาก|ติดขัด)/,
  /เจ็บ(?:แน่น|จุก)?หน้าอก/,
  /หมดสติ|ไม่รู้สึกตัว/,
  /ชัก(?:เกร็ง)?/,
  /ปากบวม|ลิ้นบวม|คอบวม/,
  /หน้าเบี้ยว/,
];

const urgentPatterns = [
  /ขา(?:ข้างเดียว|ข้างหนึ่ง).{0,20}(?:บวม|แดง|ร้อน)/,
  /(?:บวม|แดง|ร้อน).{0,20}ขา(?:ข้างเดียว|ข้างหนึ่ง)/,
  /เดินลงน้ำหนักไม่ได้/,
  /เลือด(?:ไหล|ออก).{0,12}(?:ไม่หยุด|มาก)/,
  /ไข้.{0,20}(?:บวม|แดง|ร้อน)/,
  /(?:ชา|อ่อนแรง).{0,20}(?:มากขึ้น|ทันที|เฉียบพลัน)/,
];

const negationPrefix = /(?:ไม่มี|ไม่ได้มี|ไม่ได้|ไม่พบ|ปฏิเสธว่า|ไม่รู้สึก)(?:อาการ)?\s*$/;

function normalize(value: unknown) {
  return String(value ?? "").trim().toLocaleLowerCase("th");
}

function hasAffirmedPattern(text: string, pattern: RegExp) {
  const normalized = normalize(text);
  const matcher = new RegExp(pattern.source, "gu");
  for (const match of normalized.matchAll(matcher)) {
    if (match.index === undefined) continue;
    const prefix = normalized.slice(Math.max(0, match.index - 24), match.index);
    if (!negationPrefix.test(prefix)) return true;
  }
  return false;
}

export function isSymptomMedicineRequest(message: string) {
  const query = normalize(message);
  return symptomTerms.some((term) => query.includes(term)) &&
    medicineRequestPatterns.some((pattern) => pattern.test(query));
}

export function sanitizeClinicalHistory(value: unknown): ClinicalChatTurn[] {
  if (!Array.isArray(value)) return [];
  return value.slice(-10).flatMap((candidate) => {
    if (!candidate || typeof candidate !== "object") return [];
    const role = (candidate as Record<string, unknown>).role;
    if (role !== "user" && role !== "assistant") return [];
    const content = String(
      (candidate as Record<string, unknown>).content ?? "",
    )
      .replace(/^\[(?:AI Live|กฎความปลอดภัยจากเซิร์ฟเวอร์|โหมดกฎออฟไลน์)\]\s*/u, "")
      .trim()
      .slice(0, 2000);
    return content ? [{ role, content }] : [];
  });
}

function initialClarifyingReply() {
  return [
    "ก่อนประเมินเรื่องยา ขอถามอาการเพิ่มเติมเพื่อคัดกรองความเร่งด่วนก่อนครับ",
    "1. ปวดตรงไหน ข้างเดียวหรือสองข้าง และปวดระดับ 0–10 เท่าไร?",
    "2. เริ่มปวดเมื่อไร เป็นตลอดหรือเป็น ๆ หาย ๆ และปวดแบบตื้อ แปลบ แสบ หรือเกร็ง?",
    "3. ก่อนเริ่มอาการมีหกล้ม กระแทก ออกกำลังหนัก เดินทางนาน ผ่าตัด หรือนอนนิ่งนานไหม?",
    "4. มีบวม แดง ร้อน ชา อ่อนแรง ไข้ หรือเดินลงน้ำหนักไม่ได้ไหม?",
    "5. ตอนนี้มีหายใจลำบาก เจ็บหน้าอก หน้ามืด หรือหมดสติไหม?",
    "ตอบเป็นข้อ ๆ เท่าที่ทราบได้เลย หากมีอาการในข้อ 5 ให้ขอความช่วยเหลือฉุกเฉินทันที ไม่ต้องรอคำตอบจาก AI",
  ].join("\n");
}

export function evaluateClinicalIntake(
  message: string,
  history: ClinicalChatTurn[],
  requestedMode: unknown,
): ClinicalIntakeDecision {
  const userText = [
    ...history.filter((turn) => turn.role === "user").map((turn) =>
      turn.content
    ),
    message,
  ]
    .join("\n");

  if (
    emergencyPatterns.some((pattern) => hasAffirmedPattern(userText, pattern))
  ) {
    return {
      kind: "emergency",
      conversationMode: "symptom_intake",
      requiresFollowUp: false,
      reply:
        "อาการที่แจ้งอาจเป็นภาวะฉุกเฉิน ระบบจะไม่ประเมินยาในแชตนี้ กรุณาโทร 1669 หรือไปห้องฉุกเฉินทันที และอย่าขับรถเอง หากทำได้ให้นำรายการยาที่ใช้อยู่ไปด้วย",
    };
  }

  if (urgentPatterns.some((pattern) => hasAffirmedPattern(userText, pattern))) {
    return {
      kind: "urgent",
      conversationMode: "symptom_intake",
      requiresFollowUp: false,
      reply:
        "ข้อมูลที่แจ้งมีสัญญาณที่ควรได้รับการตรวจโดยบุคลากรทางการแพทย์โดยเร็ว ระบบจะไม่เลือกยาให้ในตอนนี้ กรุณาติดต่อสถานพยาบาลหรือเภสัชกรวันนี้ และหากมีหายใจลำบาก เจ็บหน้าอก หน้ามืด หรืออาการทรุดลง ให้โทร 1669 ทันที",
    };
  }

  const activeMode = requestedMode === "symptom_intake";
  if (!activeMode && isSymptomMedicineRequest(message)) {
    return {
      kind: "clarify",
      conversationMode: "symptom_intake",
      requiresFollowUp: true,
      reply: initialClarifyingReply(),
    };
  }

  if (activeMode) {
    return {
      kind: "continue",
      conversationMode: "symptom_intake",
      requiresFollowUp: true,
    };
  }

  return {
    kind: "none",
    conversationMode: "general",
    requiresFollowUp: false,
  };
}
