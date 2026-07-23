# MaCheck — Competition Track Addendum

> เอกสารนี้แก้และมีลำดับเหนือกว่า `MaCheck-Google-Only-Migration-Plan-TH.md` เฉพาะเรื่องการแข่งขัน Data Analytics / Visualization / Decision Support
>
> ส่งเอกสารนี้พร้อมแผนหลักให้ Antigravity และให้ถือว่า “คง NVIDIA RAPIDS” ไม่ใช่ลบ NVIDIA ทั้งหมด

## 1. ข้อแก้ไขสำคัญจากแผนเดิม

แผนเดิมแนะนำให้ลบ NVIDIA ออกจาก submission เพราะเข้าใจว่าเงื่อนไข Google-only ครอบคลุมทุกเทคโนโลยี แต่ competition track ที่ได้รับภายหลังบังคับให้ใช้ NVIDIA acceleration layer ดังนั้นให้แก้เป็น:

- **ต้องคงและทำให้ NVIDIA RAPIDS/cuDF ทำงานจริง** บน NVIDIA GPU ที่รันบน Google Cloud
- **ต้องลบ NVIDIA NIM และโมเดลภาษา NVIDIA เท่านั้น** เพราะโมเดล AI ต้องเป็น Google Gemini เท่านั้น
- **ต้องใช้ Google Cloud data/application services อย่างน้อย 2 รายการ**; MaCheck ต้องมี **Cloud Storage และ BigQuery** เป็นขั้นต่ำ และแนะนำเพิ่ม **Looker** เป็นชั้น visualization ที่มีคะแนนนำเสนอชัดเจน
- Firebase Cloud Firestore ยังคงเป็นฐานข้อมูลหลักของแอปและข้อมูล operational ของผู้ใช้
- BigQuery เป็น analytical warehouse แบบ de-identified/aggregated ไม่ใช่ source of truth ของบัญชีหรือข้อมูลสุขภาพรายบุคคล

สรุป policy ที่ถูกต้อง:

| ประเภท | อนุญาต/ต้องใช้ | ห้ามใช้ |
|---|---|---|
| Generative model | Google Gemini ผ่าน Vertex AI หรือ Firebase AI Logic | NVIDIA NIM, OpenAI, Anthropic, โมเดลอื่น |
| Transactional database | Firebase Authentication + Cloud Firestore | Supabase เป็น runtime database |
| Data lake / raw analytics | Google Cloud Storage | storage อื่นสำหรับ pipeline การแข่งขัน |
| Analytical warehouse | BigQuery | ให้ Firestore แบกงาน aggregate ขนาดใหญ่ |
| Visualization | Looker หรือ Looker Studio ที่อ่าน BigQuery | dashboard ที่ไม่มี query/data lineage |
| Acceleration | NVIDIA L4/RTX PRO 6000 บน Google Cloud + RAPIDS/cuDF | อ้าง GPU แต่ run จริงด้วย CPU/fallback |

## 2. Reframe โจทย์ MaCheck ให้ตรง Track

### ผู้ใช้และปัญหาจริง

**ผู้ใช้หลัก:** ผู้ดูแลผู้สูงอายุ, caregiver ในครอบครัว, เภสัชกรชุมชน หรือทีมคลินิกขนาดเล็ก

**ปัญหา:** เมื่อมีผู้ใช้หลายคนและมี dose events จำนวนมาก ผู้ดูแลไม่รู้ว่า “วันนี้ควรติดตามใครก่อน” จึงต้องไล่เปิดประวัติยาแต่ละคนด้วยมือ และมักเห็นการขาดยาซ้ำหรือความเสี่ยงช้าเกินไป

**การตัดสินใจที่ MaCheck สนับสนุน:**

> ในรอบเช้า/บ่ายนี้ ผู้ดูแลควรติดต่อผู้ป่วยคนใดก่อน และเหตุผลเชิงข้อมูลคืออะไร?

### Data pipeline ที่ต้องเล่าใน demo

```text
1. MaCheck mobile บันทึก dose event, schedule และ medication context
        ↓
2. Firebase Cloud Firestore = operational source of truth
        ↓
3. Cloud Function export ข้อมูลที่ลดความสามารถระบุตัวตนแล้ว เป็น JSONL/Parquet แบ่ง partition
        ↓
4. Google Cloud Storage = raw analytics zone
        ↓
5. Cloud Run Job + NVIDIA GPU + RAPIDS/cuDF
   ทำความสะอาด, deduplicate, feature engineering, risk scoring และ ranking
        ↓
6. BigQuery = curated analytical tables + benchmark tables
        ↓                          ↓
7a. เขียน personal risk summary กลับ Firestore  7b. Looker dashboard
    เพื่อให้ mobile แสดง alert                    เพื่อให้ caregiver/admin ตัดสินใจ
        ↓
8. Gemini อธิบายผลที่ rule/risk engine คำนวณแล้วเป็นภาษาไทยที่เข้าใจง่าย
```

นี่ตอบทุกข้อของ track: real-world user/problem, workflow/decision ที่พึ่งข้อมูล, ingest-clean-analyze-model-visualize pipeline, output เป็น risk ranking/alert/dashboard และมี measurable acceleration

## 3. สถาปัตยกรรม submission ที่ต้องทำ

### 3.1 Services ที่นับตามเงื่อนไขการแข่งขัน

| Service | บทบาทใน MaCheck | หลักฐานที่ต้องแสดง |
|---|---|---|
| Firebase Auth + Firestore | บัญชี, consent, medication cabinet, dose events และ personal risk summary | Firestore document path + security rules + mobile demo |
| Cloud Storage | raw de-identified dose-event partitions และภาพฉลากยาที่ได้รับ consent | bucket layout, lifecycle rule, sample partition, IAM |
| Cloud Run Job + NVIDIA GPU | รัน RAPIDS/cuDF batch analytics และ benchmark | Cloud Run revision/job config ที่แสดง GPU + log `GPU=true` |
| BigQuery | tables สำหรับ cleaned events, daily features, risk ranking, benchmark result | query, schema, row count และ job lineage |
| Looker (แนะนำ) | dashboard “Who to follow up first?” และ data quality/operations views | live dashboard screenshot/video + BigQuery connection |
| Gemini on Vertex AI/Firebase AI Logic | อธิบาย risk and scan label; ไม่เป็นคนคำนวณ score | model invocation log, prompt/version, safety disclaimer |

Cloud Run รองรับ NVIDIA L4 และ NVIDIA RTX PRO 6000 GPU และสามารถ scale to zero ได้ จึงเหมาะกับ batch job ของ hackathon หากตั้ง quota/region และ instance-based billing ให้ถูกต้อง. [Google Cloud Run GPU documentation](https://cloud.google.com/run/docs/configuring/services/gpu)

### 3.2 แก้ `platform/analytics/` เดิม

โฟลเดอร์นี้ต้อง **retain และ refactor** ไม่ใช่ลบ:

- เปลี่ยนจาก FastAPI endpoint ที่รับ `records_count` แล้วสร้างข้อมูลปลอมทุก request เป็น **Cloud Run Job** ที่รับ input URI และ run ID
- ใช้ `cudf` โดยตรง (prefer explicit cuDF APIs) แทนเพียง `cudf.pandas.install()` ที่อาจทำให้ benchmark พิสูจน์ GPU ได้ยาก
- นำเข้า `google-cloud-storage` เพื่ออ่าน raw partition จาก GCS
- นำเข้า `google-cloud-bigquery` เพื่อเขียน curated tables และ benchmark results
- ใช้ `google-cloud-firestore` ผ่าน service identity เพื่อเขียนเฉพาะ personal risk summary กลับ Firestore
- health/metadata ต้องรายงานชื่อ GPU, CUDA/RAPIDS version, `gpu_enabled`, record count, throughput และ run ID จากของจริง
- ปิด CORS `*`; Cloud Run Job ไม่ต้องเปิด public HTTP endpoint หากไม่จำเป็น
- `ingest_adherence_log` ที่ปัจจุบันตอบว่า BigQuery สำเร็จโดยไม่เขียนจริง ต้องลบหรือแทนด้วย ingestion ที่มีผลจริง
- `generate_synthetic_adherence_dataset` คงไว้เฉพาะ benchmark generator ที่มี seed/version/ground truth ชัดเจน ห้ามเป็น live production data source

### 3.3 Bucket และ BigQuery design

```text
gs://macheck-analytics-raw/
  dose-events/dt=YYYY-MM-DD/hour=HH/part-*.parquet
  benchmark/run_id=<id>/input/*.parquet
  benchmark/run_id=<id>/manifest.json

gs://macheck-medication-images/
  users/<uid>/labels/<object-id>       # Firebase Storage; access by user rules

BigQuery dataset: macheck_analytics
  raw_event_manifest                   # lineage only; no raw PHI payload
  cleaned_dose_events
  patient_daily_features
  caregiver_priority_queue
  population_metrics_daily
  pipeline_runs
  acceleration_benchmarks
```

การป้องกันข้อมูล:

- raw analytics event ใช้ `analytics_subject_id = HMAC(uid, secret)`; ห้าม export email, phone, username, emergency contact, free text และภาพ
- secret สำหรับ HMAC อยู่ใน Secret Manager เท่านั้น
- mapping UID ↔ analytics subject อยู่ใน Firestore/server scope ไม่เข้า BigQuery/Looker
- Looker แสดง aggregate หรือ access ตาม role; dashboard สำหรับกรรมการใช้ synthetic dataset หรือ de-identified demo tenant
- ตั้ง retention/lifecycle สำหรับ raw objects, BigQuery partitions และ AI artifacts

## 4. Analytical model ที่ต้อง implement

อย่าเรียก “AI risk score” ถ้าคะแนนเป็นเพียง mock ให้ใช้ deterministic, auditable score แล้วใช้ Gemini ช่วยอธิบาย

### 4.1 Pipeline ต่อ patient ต่อวัน

1. Validate schema และ deduplicate ด้วย `idempotencyKey`
2. Normalize timezone เป็น `Asia/Bangkok`; แปลง status และ schedule slots ให้เป็น canonical form
3. Join dose events กับ medication/schedule metadata ที่ export แบบลดข้อมูลระบุตัวตน
4. สร้าง features 7/14/30 วัน เช่น adherence rate, missed-dose streak, late-dose rate, schedule complexity, high-severity interaction flag และ trend slope
5. คำนวณ `risk_score` 0–100 ด้วยสูตร versioned
6. จัด tier: low, medium, high, critical
7. สร้าง `reason_codes` ที่อธิบายได้ เช่น `MISSED_STREAK_3`, `ADHERENCE_7D_BELOW_0_70`, `SEVERE_INTERACTION_REVIEW`
8. Rank caregiver queue โดย risk, change from yesterday, time since last outreach และ consent/active relationship
9. เขียน curated result ลง BigQuery; personal result กลับ Firestore

### 4.2 สูตรตั้งต้นที่ตรวจสอบได้

```text
risk_score =
  35 × missed_dose_rate_7d
+ 25 × min(missed_streak / 3, 1)
+ 15 × late_dose_rate_7d
+ 15 × severe_interaction_flag
+ 10 × worsening_trend_flag
```

- clamp ให้อยู่ใน 0–100
- version สูตร เช่น `risk_model_version = "v1.0"`
- clinician/pharmacist ต้อง review weight/threshold ก่อนใช้กับข้อมูลจริง
- Gemini ห้ามแก้ score, tier หรือ reason code

### 4.3 Output ที่กรรมการต้องเห็น

| Output | ผู้ใช้ | Decision ที่ช่วย |
|---|---|---|
| Personal alert ใน MaCheck | patient | รู้ว่าควรทบทวนตารางยา/ติดต่อผู้ดูแลหรือเภสัชกร |
| Caregiver priority queue | caregiver | เลือกว่าจะ follow-up คนใดก่อนพร้อมเหตุผล |
| Looker population dashboard | clinic/admin | เห็น adherence trend, high-risk count, missed-dose hotspot และ pipeline freshness |
| Data-quality panel | operator | เห็น duplicate, invalid schedule, late partition และ failed pipeline run |

## 5. แผนพิสูจน์ NVIDIA acceleration

### 5.1 กติกา benchmark

ต้อง benchmark workload เดียวกัน, input เดียวกัน, สูตรเดียวกัน และ output checksum เดียวกัน ระหว่าง CPU และ GPU

| องค์ประกอบ | CPU baseline | GPU accelerated |
|---|---|---|
| Runtime | Cloud Run Job CPU หรือเครื่อง reference ที่ระบุชัด | Cloud Run Job ที่มี NVIDIA L4/RTX PRO 6000 |
| Engine | pandas | cuDF/RAPIDS |
| Input | Parquet จาก GCS manifest เดียวกัน | input เดียวกัน |
| Transform | clean, dedupe, groupby, rolling features, rank | logic เดียวกัน |
| Output | BigQuery table/checksum | table/checksum เดียวกัน |
| Metrics | wall time, throughput, cost estimate, output rows | metrics เดียวกัน |

### 5.2 ขนาดข้อมูลที่แนะนำ

ใช้ทั้ง data จาก demo จริงขนาดเล็ก และ synthetic-but-realistic benchmark ที่ reproducible:

- 1,000 patients × 365 days × 3 medications × 3 scheduled events = **3,285,000 dose events**
- 10,000 patients ด้วยรูปแบบเดียวกัน = **32,850,000 dose events**

ต้องเก็บ generator seed, schema version, row counts และ manifest ไว้ใน GCS/BigQuery เพื่อให้ตรวจซ้ำได้

### 5.3 Metrics ที่ต้องรายงาน (ห้ามกรอกตัวเลขล่วงหน้า)

```text
run_id
engine: pandas_cpu | cudf_gpu
gpu_type / CUDA / RAPIDS version
input_rows / output_rows / output_checksum
wall_clock_seconds
records_per_second
BigQuery load time
estimated cost per run
speedup = cpu_wall_clock_seconds / gpu_wall_clock_seconds
```

หลักฐานต้องมาจาก Cloud Run logs และตาราง `acceleration_benchmarks` จริง ไม่ใช้ benchmark จาก laptop ที่ไม่มี GPU แล้วระบุว่า GPU

### 5.4 Claim ที่ปลอดภัยใน presentation

ใช้ข้อความนี้หลังมีผลจริงเท่านั้น:

> “บนชุดข้อมูล `<N>` dose events ที่มี manifest เดียวกัน RAPIDS/cuDF บน `<GPU>` ประมวลผล feature engineering และ patient ranking ได้ `<x>` เท่าเร็วกว่า pandas CPU ทำให้รอบ insight ลดจาก `<CPU time>` เหลือ `<GPU time>` โดยผลลัพธ์ผ่าน checksum validation เท่ากัน”

อย่า claim clinical outcome, diagnosis accuracy หรือ cost saving หากยังไม่มีหลักฐาน

## 6. Phase ที่ต้องแก้ในแผนหลัก

### เปลี่ยน Phase 1

เพิ่ม Cloud project setup สำหรับ:

- Cloud Run, Artifact Registry, Cloud Storage, BigQuery, Looker
- GPU quota, billing alert, service identity และ IAM least privilege
- region/colocation design: Firestore/Firebase, GCS, BigQuery และ Cloud Run เลือก location ให้ latency/egress เหมาะสม

### เปลี่ยน Phase 6

Phase นี้ไม่ใช่เพียง clinical catalog migration ให้เพิ่ม:

- Firestore → de-identified GCS export manifest
- Parquet writer/schema contract
- BigQuery DDL/partition/cluster strategy
- backfill ระหว่าง synthetic dataset และ demo tenant

### แทน Phase 8 เดิมด้วย 2 workstreams ที่แยกกัน

**8A — RAPIDS analytics pipeline**

- Refactor `platform/analytics/`
- GCS input → cuDF clean/feature/rank → BigQuery output → Firestore summary
- Cloud Run Job deployment with GPU
- CPU/GPU benchmark and checksum validation

**8B — Gemini decision explanation**

- Gemini อ่านผล score/reason codes ที่คำนวณแล้ว
- ตอบภาษาไทยพร้อม limitation/next action
- Gemini scanner/chat ต่อ Firebase Auth/App Check
- ห้าม Gemini แทน analytics pipeline หรือ clinical rule engine

### เพิ่ม Phase 9A — Looker dashboard (แนะนำมาก)

- เชื่อม Looker กับ BigQuery read-only
- ทำ dashboard 3 หน้า: Caregiver Priority, Population Trends, Pipeline & Acceleration Evidence
- ตั้ง data freshness indicator และ filter วันที่/tenant demo
- สร้าง screenshot/export/demo path สำหรับกรรมการ

### เปลี่ยน Phase 10 cleanup

- ลบ NVIDIA NIM, Nemotron, CUDA mock และ NVIDIA claims ที่ไม่ได้ใช้จริง
- **เก็บ** RAPIDS/cuDF/GPU Cloud Run artifacts ที่ run ได้จริง
- ลบ Vercel/Supabase/OpenAI runtime เหมือนเดิม

## 7. Definition of Done เพิ่มเติมสำหรับ Track นี้

- [ ] มี BigQuery และ Cloud Storage ใช้จริงใน architecture/demo; Looker ใช้จริงหาก project มี entitlement
- [ ] Firestore เป็น operational source of truth; BigQuery มีเฉพาะ analytical mirror/de-identified data
- [ ] Cloud Storage มี partitioned raw data + manifest + retention policy
- [ ] Cloud Run Job ใช้ NVIDIA GPU และ log ยืนยัน cuDF/RAPIDS จริง
- [ ] pipeline ทำ ingest → clean → feature engineer → score → rank → visualize ได้ครบ
- [ ] personal result กลับเข้า Firestore และ priority queue/dashboard ใช้ BigQuery output เดียวกัน
- [ ] CPU/GPU benchmark ใช้ input/output checksum เดียวกันและมีตารางผลจริง
- [ ] Looker dashboard อธิบายว่าควร follow-up ใครก่อนและทำไม
- [ ] Google Gemini เป็นโมเดล generative เพียงชนิดเดียว
- [ ] ไม่มี NVIDIA NIM/LLM แม้จะมี NVIDIA GPU/RAPIDS
- [ ] demo script เล่า decision workflow, pipeline lineage และ acceleration evidence ได้ภายใน 3–5 นาที

## 8. Master Prompt ฉบับแก้สำหรับ Antigravity

คัดลอกข้อความนี้แทน Master Prompt เดิม:

---

อ่าน `docs/MaCheck-Google-Only-Migration-Plan-TH.md` และ `docs/MaCheck-Competition-Track-Addendum-TH.md` ทั้งหมดก่อนเริ่ม เอกสาร Addendum มีลำดับเหนือกว่าเมื่อขัดกับแผนเดิม

เป้าหมายคือ MaCheck สำหรับ track Data Analytics, Visualization, and Decision Support:

1. Firebase Auth + Cloud Firestore เป็น source of truth ของแอปและข้อมูลผู้ใช้
2. ต้องใช้ Cloud Storage และ BigQuery ใน data pipeline ที่ทำงานจริง และใช้ Looker เป็น visualization layer หาก project มี entitlement
3. ต้องใช้ NVIDIA RAPIDS/cuDF บน NVIDIA GPU ที่รันบน Google Cloud เพื่อเร่ง analytics workload จริง
4. โมเดล Generative AI ทุกตัวต้องเป็น Google Gemini เท่านั้น ห้าม NVIDIA NIM/Nemotron/OpenAI/Anthropic
5. ปัญหาที่ต้องแก้คือ caregiver/clinic ต้องตัดสินใจว่า “วันนี้ควร follow-up ผู้ป่วยคนใดก่อน” จาก dose events, adherence trend, risk score และ safety flags
6. Pipeline ต้องเป็น Firestore → de-identified GCS partitions → RAPIDS/cuDF GPU Cloud Run Job → BigQuery → Looker และเขียน personal risk summary กลับ Firestore
7. Gemini ทำได้เฉพาะ scan/extract/explain structured results; deterministic engine เป็นผู้คำนวณ risk score, interaction flags และ ranking
8. ต้อง benchmark pandas CPU กับ cuDF GPU ด้วย input manifest เดียวกัน, feature logic เดียวกัน และ output checksum เดียวกัน ห้ามสร้างตัวเลข speedup เอง
9. เก็บ evidence จริง: Cloud Run GPU configuration/log, BigQuery lineage/table, Looker dashboard, benchmark table และ demo video/screenshots
10. รักษา working tree เดิม ห้าม reset/checkout ทับ ห้าม claim feature live หากยังเป็น mock

ทำงานทีละ phase และหยุดรายงานเมื่อเจอ blocker ด้าน credential, billing, GPU quota หรือ Looker entitlement ห้ามปลอม deployment result

เริ่มจาก audit: แยก NVIDIA RAPIDS ที่ต้อง retain ออกจาก NVIDIA NIM/LLM ที่ต้องลบ, ตรวจว่า `platform/analytics` ส่วนใดเป็น mock, แล้วเสนอ file-by-file implementation plan สำหรับ analytics pipeline ก่อนแก้โค้ด

---

## 9. สิ่งที่ต้องเปลี่ยนในคำอธิบาย/pitch

อย่านำเสนอ MaCheck เป็นเพียง “แอปเตือนกินยา + chatbot” เพราะไม่ตอบแกน data decision-support ของ track

ให้ใช้ narrative นี้:

> MaCheck เปลี่ยน dose events ที่กระจัดกระจายจากผู้ใช้จำนวนมากให้เป็น priority queue ที่อธิบายได้สำหรับ caregiver/คลินิก ระบบใช้ Firebase เป็น operational layer, Cloud Storage และ BigQuery เป็น analytics pipeline, NVIDIA RAPIDS/cuDF บน Google Cloud GPU เพื่อย่นเวลาประมวลผลข้อมูลระดับล้านเหตุการณ์ และ Looker เพื่อทำให้ทีมเห็นว่าควรติดตามใครก่อน ขณะที่ Gemini ช่วยสื่อสารผลที่ผ่านกฎความปลอดภัยแล้วเป็นภาษาไทยที่เข้าใจง่าย

## 10. แหล่งอ้างอิงที่ Antigravity ควรตรวจซ้ำ

- [Cloud Run GPU support](https://cloud.google.com/run/docs/configuring/services/gpu)
- [NVIDIA RAPIDS documentation](https://docs.nvidia.com/rapids/index.html)
- [BigQuery + Looker](https://cloud.google.com/bigquery/docs/looker)
- [Firebase Firestore offline persistence](https://firebase.google.com/docs/firestore/manage-data/enable-offline)
- [Firebase AI Logic + App Check](https://firebase.google.com/docs/ai-logic/app-check)

ก่อน deploy ต้องตรวจ pricing, GPU quota, supported regions และ model lifecycle ใน project จริง เพราะข้อจำกัดเหล่านี้เปลี่ยนได้
