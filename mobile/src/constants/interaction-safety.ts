export type InteractionSeverity = 'moderate' | 'severe';

export const INTERACTION_SAFETY_COPY: Record<InteractionSeverity, {
  title: string;
  description: string;
  advice: string;
  titleEn: string;
  descriptionEn: string;
  adviceEn: string;
}> = {
  severe: {
    title: 'ห้ามรับประทานยาคู่นี้ร่วมกัน',
    titleEn: 'Do Not Combine These Medications',
    description: 'ตรวจพบว่ายาคู่นี้อยู่ในกลุ่มห้ามใช้ร่วมกัน ระบบไม่แสดงรายละเอียดผลกระทบเพื่อความปลอดภัย',
    descriptionEn: 'This drug pair is flagged as unsafe to combine. Impact details are suppressed for safety.',
    advice: 'อย่าปรับหรือหยุดยาที่ใช้อยู่เอง ให้ติดต่อแพทย์หรือเภสัชกรทันที',
    adviceEn: 'Do not adjust or stop your prescribed medication on your own. Contact your doctor or pharmacist immediately.',
  },
  moderate: {
    title: 'โปรดสอบถามแพทย์หรือเภสัชกรก่อนใช้ร่วมกัน',
    titleEn: 'Consult Doctor or Pharmacist Before Co-administration',
    description: 'ตรวจพบว่ายาคู่นี้ต้องได้รับการตรวจสอบก่อนใช้ร่วมกัน ระบบไม่แสดงรายละเอียดผลกระทบเพื่อความปลอดภัย',
    descriptionEn: 'This drug pair requires professional review before co-administration.',
    advice: 'อย่ารับประทานยาคู่นี้ร่วมกันจนกว่าจะได้รับคำแนะนำจากแพทย์หรือเภสัชกร',
    adviceEn: 'Do not take these medications together until advised by a doctor or pharmacist.',
  },
};

export const getInteractionSafetyCopy = (severity: InteractionSeverity, lang: 'th' | 'en' = 'th') => {
  const item = INTERACTION_SAFETY_COPY[severity];
  if (lang === 'en') {
    return {
      title: item.titleEn,
      description: item.descriptionEn,
      advice: item.adviceEn,
    };
  }
  return {
    title: item.title,
    description: item.description,
    advice: item.advice,
  };
};
