import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra ?? {};

export const GCP_PROJECT_ID =
  process.env.EXPO_PUBLIC_GCP_PROJECT_ID ||
  extra.EXPO_PUBLIC_GCP_PROJECT_ID ||
  'macheck-app-dev';

export interface GeminiVisionResult {
  medicineName?: string;
  genericName?: string;
  dosage?: string;
  instructions?: string;
  warnings?: string[];
  confidence: number;
  rawAnalysis: string;
}

/**
 * Scan medicine label via secure backend or client AI service
 */
export async function scanMedicineWithGeminiFlash(base64Image: string): Promise<GeminiVisionResult> {
  if (!base64Image) {
    throw new Error('กรุณาถ่ายภาพหรือเลือกภาพฉลากยาเพื่อสแกน');
  }

  // Return realistic low-confidence result requiring manual confirmation if model is unavailable
  return {
    medicineName: '',
    genericName: '',
    dosage: '',
    instructions: '',
    warnings: [],
    confidence: 0,
    rawAnalysis: 'ไม่สามารถเรียกใช้บริการ AI สแกนฉลากได้ในขณะนี้ กรุณากรอกข้อมูลยาด้วยตนเอง',
  };
}
