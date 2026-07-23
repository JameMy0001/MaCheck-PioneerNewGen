# MaCheck — Decision-Support App for Caregivers & Medication Safety

**MaCheck** คือระบบสนับสนุนการตัดสินใจ (Decision-Support Application) สำหรับผู้ดูแลและคลินิกชุมชน เพื่อตอบคำถามสำคัญ:
> *"วันนี้ควรติดตามผู้ป่วยคนใดก่อน และเหตุผลเชิงข้อมูลคืออะไร?"*

ขับเคลื่อนด้วย **Google Cloud Platform (Firebase, GCS, BigQuery, Cloud Run, Gemini AI)** ร่วมกับ **NVIDIA Acceleration (RAPIDS cuDF)**

---

## 🏛️ สถาปัตยกรรมระบบ (Target Architecture)

```text
MaCheck Mobile (Expo/RN) 
   │ Firebase SDK (Auth, Firestore, FCM)
   ▼
Firebase Layer (Auth, Firestore, Cloud Functions)
   │ Scheduled Export (HMAC de-identified Parquet)
   ▼
Google Cloud Storage (Raw Zone: gs://macheck-analytics-raw)
   │ Cloud Run Job Trigger
   ▼
Cloud Run Job + NVIDIA L4 GPU + RAPIDS/cuDF
   │ 
   ├──► Google BigQuery (macheck_analytics.*) ──► Looker Studio Dashboard
   └──► Firestore Write-back (users/{uid}/riskSummary) ──► Mobile Alert + Gemini Explanation
```

---

## 📁 โครงสร้างโปรเจกต์

- [`mobile/`](./mobile): แอปพลิเคชันผู้ใช้/ผู้ดูแล (Expo / React Native)
- [`functions/`](./functions): Firebase Cloud Functions (TypeScript) — Gemini AI, Export, & Admin tasks
- [`platform/analytics/`](./platform/analytics): Analytics Pipeline (Python / cuDF / Cloud Run Job with GPU)
- [`docs/`](./docs): เอกสารสถาปัตยกรรมและแผนการปรับปรุง (`MaCheck-Improvement-Plan-TH.md`)
- [`archive/legacy-pre-google/`](./archive/legacy-pre-google): โค้ดต้นแบบและระบบเก่าที่ถูกยกเลิก (Supabase / Vercel / NIM)

---

## 🚀 การเริ่มต้นพัฒนา (Quick Start)

### 1. Mobile App
```bash
cd mobile
npm install
cp .env.example .env
npm run typecheck
npm start
```

### 2. Firebase Cloud Functions
```bash
cd functions
npm install
npm run build
```

### 3. Analytics Pipeline (RAPIDS cuDF)
```bash
cd platform/analytics
pytest
```

