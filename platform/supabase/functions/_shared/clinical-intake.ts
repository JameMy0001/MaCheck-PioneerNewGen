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
  profile?: ClinicalIntakeProfile;
}

export interface ClinicalIntakeProfile {
  id:
    | "headache"
    | "abdominal"
    | "musculoskeletal"
    | "respiratory"
    | "skin"
    | "general";
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
  /ปวด(?:หัว|ศีรษะ).{0,24}(?:ฉับพลัน|ทันที).{0,24}(?:รุนแรง|ที่สุด)/,
  /ปวด(?:หัว|ศีรษะ).{0,24}(?:รุนแรงที่สุด|ปวดที่สุดในชีวิต)/,
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

const noAssociatedSymptoms = "ไม่มีอาการเหล่านี้";

const intakeProfiles: Record<
  ClinicalIntakeProfile["id"],
  ClinicalIntakeProfile
> = {
  headache: {
    id: "headache",
    title: "อาการปวดศีรษะ",
    summary: "คำถามต่อไปนี้เน้นรูปแบบการปวดศีรษะ อาการทางระบบประสาท และสัญญาณอันตราย",
    locationLabel: "ปวดบริเวณใดของศีรษะ ข้างเดียวหรือสองข้าง?",
    locationPlaceholder: "เช่น ขมับซ้าย รอบตา หน้าผาก หรือท้ายทอยสองข้าง",
    severityLabel: "ระดับความปวดศีรษะ 0–10",
    onsetPlaceholder: "เช่น เริ่มฉับพลันเมื่อ 2 ชั่วโมงก่อน หรือค่อย ๆ ปวดมา 2 วัน",
    sensationPlaceholder: "เช่น ตุบ ๆ ตื้อ ๆ บีบรัด หรือปวดแปลบ",
    triggerLabel: "ก่อนเริ่มปวดมีเหตุการณ์หรือปัจจัยกระตุ้นอะไรไหม?",
    triggerPlaceholder: "เช่น อดนอน เครียด ขาดน้ำ กระแทกศีรษะ หรือไม่มี",
    associatedOptions: [
      "คลื่นไส้",
      "อาเจียน",
      "แพ้แสงหรือเสียง",
      "ตามัวหรือเห็นภาพผิดปกติ",
      "ชา หรืออ่อนแรง",
      "มีไข้หรือคอแข็ง",
      noAssociatedSymptoms,
    ],
    emergencyOptions: [
      "ปวดรุนแรงฉับพลันที่สุดในชีวิต",
      "หน้าเบี้ยว พูดไม่ชัด หรือแขนขาอ่อนแรง",
      "ชัก หมดสติ หรือสับสนมาก",
      "หลังศีรษะกระแทกรุนแรง",
      noAssociatedSymptoms,
    ],
    triedPlaceholder: "เช่น พักในห้องมืด ดื่มน้ำ ใช้ยาอะไรไปแล้ว หรือยังไม่ได้ลอง",
  },
  abdominal: {
    id: "abdominal",
    title: "อาการปวดท้อง",
    summary: "คำถามต่อไปนี้เน้นตำแหน่งปวด ความสัมพันธ์กับอาหาร การขับถ่าย และสัญญาณเลือดออก",
    locationLabel: "ปวดท้องบริเวณใด และปวดย้ายตำแหน่งหรือไม่?",
    locationPlaceholder: "เช่น ลิ้นปี่ ท้องขวาล่าง รอบสะดือ หรือทั่วท้อง",
    severityLabel: "ระดับความปวดท้อง 0–10",
    onsetPlaceholder: "เช่น เริ่มหลังอาหารเมื่อ 3 ชั่วโมงก่อน เป็นมา 1 วัน",
    sensationPlaceholder: "เช่น บิดเกร็ง แสบร้อน จุกแน่น หรือปวดแปลบ",
    triggerLabel: "ก่อนเริ่มปวดกินอะไร ทำอะไร หรือมีปัจจัยเกี่ยวข้องอะไรไหม?",
    triggerPlaceholder: "เช่น อาหารมื้อใหญ่ แอลกอฮอล์ เดินทาง ประจำเดือน หรือไม่มี",
    associatedOptions: [
      "คลื่นไส้หรืออาเจียน",
      "ท้องเสีย",
      "ท้องผูก",
      "มีไข้",
      "ปัสสาวะแสบขัด",
      "มีเลือดออกผิดปกติ",
      noAssociatedSymptoms,
    ],
    emergencyOptions: [
      "ปวดรุนแรงฉับพลันหรือท้องแข็ง",
      "อาเจียนเป็นเลือดหรือถ่ายดำ",
      "หน้ามืด เป็นลม หรือเหงื่อแตกมาก",
      "อาจตั้งครรภ์และมีปวดรุนแรงหรือเลือดออก",
      noAssociatedSymptoms,
    ],
    triedPlaceholder: "เช่น พัก ดื่มน้ำ งดอาหารบางชนิด ใช้ยาอะไรไปแล้ว หรือยังไม่ได้ลอง",
  },
  musculoskeletal: {
    id: "musculoskeletal",
    title: "อาการปวดกล้ามเนื้อ ข้อ หรือแขนขา",
    summary:
      "คำถามต่อไปนี้เน้นตำแหน่ง การบาดเจ็บ การใช้งาน และการไหลเวียนเลือดหรือเส้นประสาท",
    locationLabel: "ปวดหรือมีอาการบริเวณใด ข้างเดียวหรือสองข้าง?",
    locationPlaceholder: "เช่น น่องขาขวา เข่าซ้าย ไหล่ หรือหลังส่วนล่าง",
    severityLabel: "ระดับความปวด 0–10",
    onsetPlaceholder: "เช่น เริ่มหลังยกของเมื่อวาน เป็นมา 1 วัน",
    sensationPlaceholder: "เช่น ปวดตื้อ แปลบ เกร็ง หรือปวดเมื่อขยับ",
    triggerLabel: "ก่อนเกิดอาการทำกิจกรรมอะไรหรือมีอุบัติเหตุไหม?",
    triggerPlaceholder: "เช่น วิ่ง หกล้ม ยกของ เดินทางนาน หรือไม่มี",
    associatedOptions: [
      "บวม",
      "แดงหรือร้อน",
      "ชา",
      "อ่อนแรง",
      "ขยับหรือเดินลงน้ำหนักไม่ได้",
      "มีไข้",
      noAssociatedSymptoms,
    ],
    emergencyOptions: [
      "หายใจลำบากหรือเจ็บหน้าอก",
      "แขนขาซีด เย็น เขียว หรือไม่มีความรู้สึก",
      "บาดเจ็บรุนแรงหรือผิดรูป",
      "หน้ามืดหรือหมดสติ",
      noAssociatedSymptoms,
    ],
    triedPlaceholder: "เช่น พัก ประคบ ใช้ยาอะไรไปแล้ว หรือยังไม่ได้ลอง",
  },
  respiratory: {
    id: "respiratory",
    title: "อาการทางเดินหายใจ คอ หรือไข้",
    summary: "คำถามต่อไปนี้เน้นการหายใจ ไข้ ไอ เสมหะ และความรุนแรงของอาการ",
    locationLabel: "อาการหลักอยู่บริเวณใด และอาการใดรบกวนมากที่สุด?",
    locationPlaceholder: "เช่น เจ็บคอ คัดจมูก ไอจากหน้าอก หรือมีไข้",
    severityLabel: "ระดับความรุนแรงของอาการ 0–10",
    onsetPlaceholder: "เช่น เริ่มเมื่อคืน เป็นมา 12 ชั่วโมง",
    sensationPlaceholder: "เช่น ไอแห้ง ไอมีเสมหะ แสบคอ หรือแน่นหน้าอก",
    triggerLabel: "ก่อนเริ่มอาการมีสัมผัสผู้ป่วย ฝุ่น ควัน หรือสารก่อภูมิแพ้ไหม?",
    triggerPlaceholder: "เช่น คนใกล้ชิดป่วย เจอฝุ่น ควัน อากาศเย็น หรือไม่ทราบ",
    associatedOptions: [
      "มีไข้",
      "ไอมีเสมหะ",
      "น้ำมูกหรือคัดจมูก",
      "เจ็บคอ",
      "หอบหรือมีเสียงหวีด",
      "ปวดเมื่อยมาก",
      noAssociatedSymptoms,
    ],
    emergencyOptions: [
      "หายใจลำบากหรือพูดไม่เป็นประโยค",
      "เจ็บหรือแน่นหน้าอก",
      "ริมฝีปากเขียวหรือซีดมาก",
      "หมดสติ สับสนมาก หรือปลุกไม่ตื่น",
      noAssociatedSymptoms,
    ],
    triedPlaceholder: "เช่น พัก ดื่มน้ำ วัดไข้ ใช้ยาอะไรไปแล้ว หรือยังไม่ได้ลอง",
  },
  skin: {
    id: "skin",
    title: "อาการผิวหนัง ผื่น หรือบวม",
    summary: "คำถามต่อไปนี้เน้นตำแหน่ง ลักษณะผื่น สิ่งสัมผัสใหม่ และอาการแพ้รุนแรง",
    locationLabel: "ผื่น บวม หรืออาการผิวหนังอยู่บริเวณใด และกระจายหรือไม่?",
    locationPlaceholder: "เช่น แขนทั้งสองข้าง ใบหน้า หรือเริ่มที่ลำตัวแล้วลาม",
    severityLabel: "ระดับความรุนแรงหรือความรบกวน 0–10",
    onsetPlaceholder: "เช่น เริ่มหลังอาหาร 30 นาที หรือเป็นมา 3 วัน",
    sensationPlaceholder: "เช่น คัน แสบ เจ็บ เป็นปื้น ตุ่มน้ำ หรือลอก",
    triggerLabel: "ก่อนเกิดอาการได้ใช้ยา อาหาร หรือผลิตภัณฑ์ใหม่ไหม?",
    triggerPlaceholder: "เช่น เริ่มยาใหม่ กินอาหารใหม่ เปลี่ยนสบู่ หรือไม่ทราบ",
    associatedOptions: [
      "คัน",
      "เจ็บหรือแสบ",
      "บวม",
      "ตุ่มน้ำหรือผิวลอก",
      "มีไข้",
      "มีหนอง",
      noAssociatedSymptoms,
    ],
    emergencyOptions: [
      "ปาก ลิ้น คอ หรือใบหน้าบวม",
      "หายใจลำบากหรือเสียงแหบฉับพลัน",
      "ผื่นลามเร็วร่วมกับตุ่มพองหรือผิวลอก",
      "หน้ามืด หมดสติ หรืออ่อนแรงมาก",
      noAssociatedSymptoms,
    ],
    triedPlaceholder: "เช่น ล้างบริเวณผื่น หยุดผลิตภัณฑ์ใหม่ ใช้ยาอะไรไปแล้ว หรือยังไม่ได้ลอง",
  },
  general: {
    id: "general",
    title: "อาการที่ต้องซักข้อมูลเพิ่มเติม",
    summary: "คำถามต่อไปนี้เป็นการคัดกรองทั่วไปและจะไม่สมมุติว่าอาการเกิดจากขาหรือการบาดเจ็บ",
    locationLabel: "มีอาการอะไร และเกิดที่บริเวณใดของร่างกาย?",
    locationPlaceholder: "เช่น เวียนศีรษะ เจ็บคอ ปวดหลัง หรือคลื่นไส้",
    severityLabel: "ระดับความรุนแรงของอาการ 0–10",
    onsetPlaceholder: "เช่น เริ่มเมื่อเช้า เป็นต่อเนื่องมา 4 ชั่วโมง",
    sensationPlaceholder: "อธิบายว่าอาการเป็นแบบใด เป็นตลอดหรือเป็น ๆ หาย ๆ",
    triggerLabel: "ก่อนเริ่มอาการมีเหตุการณ์ กิจกรรม อาหาร หรือยาใหม่อะไรไหม?",
    triggerPlaceholder: "เช่น ออกแรง อดนอน กินอาหาร เริ่มยาใหม่ หรือไม่มี",
    associatedOptions: [
      "มีไข้",
      "คลื่นไส้หรืออาเจียน",
      "ชา",
      "อ่อนแรง",
      "บวม",
      "อาการแย่ลงเร็ว",
      noAssociatedSymptoms,
    ],
    emergencyOptions: [
      "หายใจลำบาก",
      "เจ็บหรือแน่นหน้าอก",
      "ชัก หมดสติ หรือสับสนมาก",
      "หน้าเบี้ยว พูดไม่ชัด หรือแขนขาอ่อนแรง",
      noAssociatedSymptoms,
    ],
    triedPlaceholder: "ระบุสิ่งที่ลองทำหรือยาที่ใช้ไปแล้ว หรือพิมพ์ว่า ยังไม่ได้ลอง",
  },
};

export function buildClinicalIntakeProfile(
  message: string,
): ClinicalIntakeProfile {
  const query = normalize(message);
  if (/ปวด(?:หัว|ศีรษะ)|เจ็บศีรษะ|ไมเกรน/u.test(query)) {
    return intakeProfiles.headache;
  }
  if (/ปวดท้อง|เจ็บท้อง|จุกท้อง|แน่นท้อง|ท้องอืด/u.test(query)) {
    return intakeProfiles.abdominal;
  }
  if (/ไอ|เจ็บคอ|คัดจมูก|น้ำมูก|มีไข้|เป็นไข้|หอบ|เสียงหวีด/u.test(query)) {
    return intakeProfiles.respiratory;
  }
  if (/ผื่น|คัน|ลมพิษ|ผิว(?:แดง|บวม|ลอก)|ตุ่มน้ำ/u.test(query)) {
    return intakeProfiles.skin;
  }
  if (
    /ปวด(?:ขา|เข่า|น่อง|ข้อเท้า|เท้า|แขน|ไหล่|ข้อศอก|ข้อมือ|หลัง|เอว|คอ)|เจ็บ(?:ขา|เข่า|น่อง|ข้อเท้า|เท้า|แขน|ไหล่|ข้อศอก|ข้อมือ|หลัง|เอว|คอ)/u
      .test(query)
  ) {
    return intakeProfiles.musculoskeletal;
  }
  return intakeProfiles.general;
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
      profile: buildClinicalIntakeProfile(message),
    };
  }

  if (activeMode) {
    return {
      kind: "continue",
      conversationMode: "symptom_intake",
      requiresFollowUp: true,
      profile: buildClinicalIntakeProfile(userText),
    };
  }

  return {
    kind: "none",
    conversationMode: "general",
    requiresFollowUp: false,
  };
}
