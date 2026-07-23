import Constants from 'expo-constants';
import { callCallableFunction } from '@/services/firebase-client';

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
 * Scan medicine label via secure Firebase Callable Cloud Function (Multimodal Gemini Vision)
 */
export async function scanMedicineWithGeminiFlash(base64Image: string): Promise<GeminiVisionResult> {
  if (!base64Image) {
    throw new Error('กรุณาถ่ายภาพหรือเลือกภาพฉลากยาเพื่อสแกน');
  }

  try {
    const result = await callCallableFunction<GeminiVisionResult>('scanMedicationLabel', {
      base64Image,
    });
    if (result && (result.medicineName || result.rawAnalysis)) {
      return result;
    }
  } catch (error) {
    console.warn('[GoogleCloud] scanMedicationLabel callable function failed:', error);
  }

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
