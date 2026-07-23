# MaCheck Platform (Google Cloud & NVIDIA Acceleration Architecture)

เอกสารอธิบายโครงสร้าง Backend และ Analytics Pipeline บน Google Cloud Platform (GCP) ร่วมกับ NVIDIA Acceleration

## ส่วนประกอบหลักของระบบ (Google Cloud Stack)

1. **Firebase Layer (Operational Data)**
   - **Firebase Auth**: จัดการความปลอดภัยและการเข้าสู่ระบบ (Google Sign-In / Anonymous)
   - **Firestore**: เก็บข้อมูลสุขภาพ (`users/{uid}/profile`, `medications`, `doseEvents`, `riskSummary`)
   - **Cloud Functions**: Node.js/TypeScript Callable Functions (`chatAgent`, `scanMedicationLabel`, `exportDoseEvents`, `explainRiskScore`)

2. **Google Cloud Storage (Analytics Raw Zone)**
   - Bucket: `gs://macheck-analytics-raw`
   - จัดเก็บข้อมูล dose events ที่ de-identified (HMAC hashed) ในรูปแบบ Parquet partitioned ตามวันที่

3. **Cloud Run Job + NVIDIA L4 GPU + RAPIDS / cuDF**
   - Container Job: `macheck-rapids-pipeline`
   - ดึงข้อมูล Parquet จาก GCS มาประมวลผลความเร็วสูงด้วย NVIDIA cuDF
   - คำนวณ 7d/14d/30d rolling adherence, consecutive missed streak, risk score และ priority ranking
   - เปรียบเทียบประสิทธิภาพ CPU (pandas) vs GPU (cuDF) พร้อมตรวจสอบ SHA-256 Checksum

4. **Google BigQuery (Enterprise Data Warehouse)**
   - Dataset: `macheck_analytics`
   - ตาราง: `cleaned_dose_events`, `patient_daily_features`, `caregiver_priority_queue`, `acceleration_benchmarks`

5. **Looker / Looker Studio (Visualization & Decision Support)**
   - แสดงผล Caregiver Priority Queue dashboard เพื่อให้ผู้ดูแลตัดสินใจติดตามผู้ป่วยเสี่ยงสูงได้ทันที

## เอกสารอ้างอิง
- `docs/MaCheck-Improvement-Plan-TH.md`
- `docs/architecture/LOOKER_DASHBOARD_SPEC.md`
- `platform/analytics/bigquery_schema.sql`

