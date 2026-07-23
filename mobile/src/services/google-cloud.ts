import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra ?? {};
export const GEMINI_API_KEY =
  process.env.EXPO_PUBLIC_GEMINI_API_KEY ||
  extra.EXPO_PUBLIC_GEMINI_API_KEY ||
  '';

export const GCP_PROJECT_ID =
  process.env.EXPO_PUBLIC_GCP_PROJECT_ID ||
  extra.EXPO_PUBLIC_GCP_PROJECT_ID ||
  'gen-lang-client-0740402744';

export const GCP_BIGQUERY_DATASET =
  process.env.EXPO_PUBLIC_GCP_BIGQUERY_DATASET ||
  extra.EXPO_PUBLIC_GCP_BIGQUERY_DATASET ||
  'macheck_analytics';

export const ANALYTICS_SERVICE_URL =
  process.env.EXPO_PUBLIC_ANALYTICS_SERVICE_URL ||
  extra.EXPO_PUBLIC_ANALYTICS_SERVICE_URL ||
  'https://macheck-analytics-rapids-gcp.run.app';

export const isGeminiConfigured = Boolean(GEMINI_API_KEY && GEMINI_API_KEY.length > 5);

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
 * Direct call to Google Gemini 2.5 Flash model for image analysis / pill identification
 */
export async function scanMedicineWithGeminiFlash(base64Image: string): Promise<GeminiVisionResult> {
  if (!isGeminiConfigured) {
    // Fallback simulation mode for testing UI without key
    return {
      medicineName: 'Paracetamol',
      genericName: 'Acetaminophen',
      dosage: '500 mg',
      instructions: 'ทานครั้งละ 1 เม็ด ทุก 4-6 ชั่วโมง เวลาปวดหรือมีไข้',
      warnings: ['ห้ามรับประทานเกิน 8 เม็ดต่อวัน', 'ระวังการใช้ร่วมกับสุราเพราะเกิดพิษต่อตับ'],
      confidence: 0.95,
      rawAnalysis: '[Google Gemini 2.5 Flash Demo Result] วิเคราะห์ฉลากยาพาราเซตามอลสำเร็จ',
    };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  
  const prompt = `คุณเป็น AI ผู้ช่วยเภสัชกรของแอป MaCheck โปรดวิเคราะห์รูปภาพยาหรือฉลากยานี้ และตอบกลับในรูปแบบ JSON ที่มีโครงสร้างดังนี้:
{
  "medicineName": "ชื่อการค้าของยา",
  "genericName": "ชื่อสามัญทางยา",
  "dosage": "ขนาดยา เช่น 500mg",
  "instructions": "วิธีรับประทานยา",
  "warnings": ["ข้อควรระวังหรือข้อห้ามใช้ 1", "ข้อควรระวัง 2"],
  "confidence": 0.95
}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: 'image/jpeg',
                data: base64Image,
              },
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API Error: ${response.status} ${await response.text()}`);
  }

  const json = await response.json();
  const textResult = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
  const parsed = JSON.parse(textResult);

  return {
    medicineName: parsed.medicineName || 'ไม่ระบุชื่อ',
    genericName: parsed.genericName || '',
    dosage: parsed.dosage || '',
    instructions: parsed.instructions || '',
    warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
    confidence: parsed.confidence ?? 0.9,
    rawAnalysis: textResult,
  };
}

/**
 * Streams medication adherence log event to Google BigQuery
 */
export async function streamAdherenceToBigQuery(payload: {
  userId: string;
  medicineId: string;
  status: 'taken' | 'skipped' | 'snoozed';
  scheduledTime: string;
  recordedAt: string;
  riskScore?: number;
}) {
  try {
    const response = await fetch(`${ANALYTICS_SERVICE_URL}/api/v1/ingest/adherence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        dataset: GCP_BIGQUERY_DATASET,
        project_id: GCP_PROJECT_ID,
      }),
    });
    return response.ok;
  } catch (error) {
    console.warn('[BigQuery Streaming] Offline buffer logged:', error);
    return false;
  }
}
