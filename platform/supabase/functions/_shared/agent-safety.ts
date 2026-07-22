export function clampAgentTemperature(value: number) {
  return Math.min(Math.max(Number.isFinite(value) ? value : 0.2, 0), 0.3);
}

export function isUnsafeClinicalOutput(text: string) {
  const unsafePatterns = [
    /\b\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml)\b/i,
    /\d+(?:\.\d+)?\s*(?:มก|ไมโครกรัม|กรัม|มล)\.?/i,
    /(?:ให้|ควร|ต้อง)\s*(?:เพิ่ม|ลด|หยุด|เริ่ม|เปลี่ยน)\s*(?:ยา|ขนาดยา)/i,
    /(?:^|[.!?\n]\s*)(?:โปรด\s*)?(?:เพิ่ม|ลด|หยุด|เริ่ม|เปลี่ยน)\s*(?:ยา|ขนาดยา)/i,
    /(?:รับประทาน|กิน)\s*\d+\s*(?:เม็ด|ครั้ง)/i,
  ];
  return unsafePatterns.some((pattern) => pattern.test(text));
}

export function isUnsafeSymptomIntakeOutput(text: string) {
  const medicationRecommendationPatterns = [
    /(?:แนะนำ|ควร|ลอง|สามารถ|อาจ(?:จะ)?)(?:ให้)?\s*(?:กิน|ทาน|รับประทาน|ใช้)\s*ยา/iu,
    /(?:แนะนำ|เลือก|เหมาะ)(?:ให้|สำหรับ)?[^\n.!?]{0,24}(?:ยา|พาราเซตามอล|ไอบูโพรเฟน|ibuprofen|paracetamol)/iu,
    /(?:กิน|ทาน|รับประทาน|ใช้)\s*(?:พาราเซตามอล|ไอบูโพรเฟน|ibuprofen|paracetamol)/iu,
  ];
  return isUnsafeClinicalOutput(text) ||
    medicationRecommendationPatterns.some((pattern) => pattern.test(text));
}
