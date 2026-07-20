export type InteractionSeverity = 'moderate' | 'severe';

export const INTERACTION_SAFETY_COPY: Record<InteractionSeverity, {
  title: string;
  description: string;
  advice: string;
}> = {
  severe: {
    title: 'ห้ามรับประทานยาคู่นี้ร่วมกัน',
    description: 'ตรวจพบว่ายาคู่นี้อยู่ในกลุ่มห้ามใช้ร่วมกัน ระบบไม่แสดงรายละเอียดผลกระทบเพื่อความปลอดภัย',
    advice: 'อย่าปรับหรือหยุดยาที่ใช้อยู่เอง ให้ติดต่อแพทย์หรือเภสัชกรทันที',
  },
  moderate: {
    title: 'โปรดสอบถามแพทย์หรือเภสัชกรก่อนใช้ร่วมกัน',
    description: 'ตรวจพบว่ายาคู่นี้ต้องได้รับการตรวจสอบก่อนใช้ร่วมกัน ระบบไม่แสดงรายละเอียดผลกระทบเพื่อความปลอดภัย',
    advice: 'อย่ารับประทานยาคู่นี้ร่วมกันจนกว่าจะได้รับคำแนะนำจากแพทย์หรือเภสัชกร',
  },
};

export const getInteractionSafetyCopy = (severity: InteractionSeverity) =>
  INTERACTION_SAFETY_COPY[severity];
