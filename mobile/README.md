# MaCheck Mobile

แอปพลิเคชัน Expo / React Native แบบ Mobile & Cloud Connected ที่รองรับ Firebase Auth, Firestore real-time sync, deterministic medication safety engine และ Google Gemini AI ผ่าน Firebase Callable Functions

## เริ่มใช้งาน

ต้องใช้ Node.js 20.19 ขึ้นไป

```bash
cd mobile
npm install
cp .env.example .env
# กำหนดค่า EXPO_PUBLIC_GCP_PROJECT_ID และ Firebase config
npm run typecheck
npm run lint
npm start
```

## สถาปัตยกรรมและส่วนประกอบหลัก (Google Cloud Stack)

- **Authentication**: Firebase Auth (Google Sign-In & Anonymous Auth)
- **Data Persistence & Sync**: Firebase Firestore (`users/{uid}`, `medications`, `doseEvents`, `riskSummary`)
- **Safety Engine**: Deterministic rules Engine (`safety.ts`, `medicine-db.ts`) ประมวลผลบนเครื่องทันที
- **AI Decision Support**: Google Gemini AI ผ่าน Firebase Callable Functions (`chatAgent`, `scanMedicationLabel`, `explainRiskScore`)
- **Analytics Pipeline**: Firestore → GCS (Parquet) → Cloud Run Job (NVIDIA RAPIDS cuDF GPU) → BigQuery → Looker Studio

## ฟังก์ชันที่ทำงานบนเครื่องแล้ว

- บันทึกการกินยาแบบ Real-time และ Offline-first
- ตรวจสอบ Drug-Drug Interaction และ Allergen/Disease Warnings แบบ Deterministic
- ซิงก์ข้อมูลสองทางกับ Firebase Firestore
- รับ Risk Alert และขอคำอธิบายเพิ่มเติมจาก Google Gemini AI ภาษาไทย
- สแกนฉลากยาผ่าน Cloud Functions Multimodal Vision

