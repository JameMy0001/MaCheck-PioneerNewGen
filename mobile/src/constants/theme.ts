export const colors = {
  primary: '#216E63',
  primaryDark: '#174E47',
  primarySoft: '#E5F4F0',
  accent: '#F2A65A',
  background: '#F6F8F7',
  surface: '#FFFFFF',
  text: '#17211F',
  muted: '#64716E',
  border: '#DDE5E2',
  danger: '#B42318',
  dangerSoft: '#FEE4E2',
  warning: '#9A6700',
  warningSoft: '#FFF3C4',
  success: '#067647',
  successSoft: '#D1FADF',
};

export const slots = {
  morning: { label: 'เช้า', time: { hour: 8, minute: 0 }, icon: 'morning' },
  noon: { label: 'กลางวัน', time: { hour: 12, minute: 0 }, icon: 'noon' },
  evening: { label: 'เย็น', time: { hour: 18, minute: 0 }, icon: 'evening' },
  bedtime: { label: 'ก่อนนอน', time: { hour: 21, minute: 0 }, icon: 'bedtime' },
} as const;

export const diseaseOptions = [
  { id: 'diabetes', label: 'เบาหวาน' },
  { id: 'hypertension', label: 'ความดันโลหิตสูง' },
  { id: 'heart', label: 'โรคหัวใจ' },
  { id: 'kidney', label: 'โรคไต' },
  { id: 'liver', label: 'โรคตับ' },
  { id: 'lipid', label: 'ไขมันในเลือดสูง' },
  { id: 'stomach', label: 'โรคกระเพาะ' },
] as const;

export const fontMultipliers = { normal: 1, large: 1.15, xlarge: 1.3 } as const;
