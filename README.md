# MaCheck — Decision-Support App for Caregivers & Medication Safety

**MaCheck** คือระบบสนับสนุนการตัดสินใจ (Decision-Support Application) สำหรับผู้ดูแลและคลินิกชุมชน เพื่อตอบคำถามสำคัญ:
> *"วันนี้ควรติดตามผู้ป่วยคนใดก่อน และเหตุผลเชิงข้อมูลคืออะไร?"*

ขับเคลื่อนด้วย **Google Cloud Platform (Firebase, GCS, BigQuery, Cloud Run, Gemini Enterprise Agent Platform)** ร่วมกับ **NVIDIA Acceleration (RAPIDS cuDF)**

---

## 📸 Demo & Screenshots

| หน้าจอ Mobile App (React Native) | หน้าจอ Looker Dashboard (Prototype) | 
|:---:|:---:|
| ![Mobile App Placeholder](https://placehold.co/300x600?text=Mobile+App+UI) | ![Looker Dashboard Placeholder](https://placehold.co/800x600?text=Looker+Dashboard) |
| *ตัวอย่างการแจ้งเตือนความเสี่ยงและคำแนะนำจาก Gemini Enterprise* | *ตัวอย่าง Caregiver Priority Queue (จัดอันดับผู้ป่วยที่ต้องติดตามก่อน)* |

*(สามารถอัปเดตลิงก์รูปภาพของจริงทับ placeholder ด้านบนได้เลย)*

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
   ├──► Google BigQuery (macheck_analytics.*) ──► Looker Enterprise (ปัจจุบันใช้ Looker Studio เป็น Prototype)
   └──► Firestore Write-back (users/{uid}/riskSummary) ──► Mobile Alert + Gemini Enterprise Agent Platform
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
python3 rapids_pipeline.py
```
> 📊 **GPU Acceleration Benchmark:** สามารถดูผลการทดสอบประสิทธิภาพที่พิสูจน์แล้วว่า cuDF บน NVIDIA L4 เร็วกว่า CPU ได้ที่ [Benchmark Report](platform/analytics/benchmark_report.md)

