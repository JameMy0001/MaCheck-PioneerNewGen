# MaCheck Production Checklist (Google Cloud & Firebase Stack)

## สถานะปัจจุบัน

แอปเป็น Mobile & Cloud Connected Decision-Support System:
Firebase Auth, Firestore real-time sync, deterministic safety engine (`safety.ts`), Google Gemini AI ผ่าน Callable Cloud Functions (`chatAgent`, `scanMedicationLabel`, `explainRiskScore`), GCS Analytics Export, Cloud Run Job (NVIDIA RAPIDS cuDF GPU), BigQuery และ Looker Studio Dashboard

## P0 — ต้องเสร็จก่อน Pilot หรือ Submission

- [x] ลบ Gemini API Key ออกจาก Client Code และใช้ Firebase Callable Functions เท่านั้น
- [x] ย้าย Legacy pre-google Runtimes (Supabase, Vercel, NIM) เข้า `archive/legacy-pre-google/`
- [ ] เชื่อมต่อ Firebase Auth (Google Sign-In & Anonymous Auth) จริง
- [ ] ซิงก์ Firestore snapshot (`users/{uid}/medications` & `doseEvents`) สองทาง
- [ ] Firebase Security Rules hardening & unit tests (Emulator)
- [ ] Export de-identified dose events ลง GCS Parquet (HMAC hashing)
- [ ] Cloud Run Job ประมวลผล cuDF บน NVIDIA L4 GPU และเขียน BigQuery (`macheck_analytics`)
- [ ] บันทึก CPU vs GPU Acceleration Benchmarks พร้อม SHA-256 Checksum Verification
- [ ] Looker Studio Dashboard แสดง Caregiver Priority Queue และ Acceleration Evidence
- [ ] Gemini AI อธิบาย Risk Alert ภาษาไทยผ่าน Cloud Functions (ไม่คำนวณ score เอง)

## P1 — Quality & Security Gates

- [ ] Firebase App Check enforcement บนทุก Callable Functions
- [ ] CI Pipeline (`.github/workflows/ci.yml`) ผ่าน `typecheck`, `lint`, rules tests, pytest
- [ ] Vendor Compliance Scan (`scripts/check-google-only.sh`) ไม่พบ unapproved SDKs
- [ ] Evidence Pack สะสม screenshots, video demo, Cloud Run logs, BigQuery queries

## เกณฑ์ Go/No-Go

อนุญาตให้ Submission เมื่อทุกรายการใน P0 และ P1 ครบถ้วน พร้อมหลักฐานเชิงประจักษ์ใน Evidence Pack

