# MaCheck — แผนการปรับปรุงอย่างละเอียดสำหรับการส่งแข่งขัน Google Cloud + NVIDIA

> **เอกสาร:** แผนปฏิบัติการ (Implementation Plan)  
> **วันที่จัดทำ:** 23 กรกฎาคม 2026  
> **สถานะ repository:** Migration scaffold — UI ใช้งานได้ในเครื่อง, pipeline หลักยังไม่เชื่อมจริง  
> **อ้างอิง:**  
> - `docs/MaCheck-Competition-Track-Addendum-TH.md` (policy ที่มีลำดับเหนือสุด)  
> - `docs/MaCheck-Google-Only-Migration-Plan-TH.md` (แผนย้าย stack เดิม)  
> - `docs/MaCheck-Current-State-Audit-TH.md` (audit สถานะปัจจุบัน)

---

## สารบัญ

1. [บทสรุปผู้บริหาร](#1-บทสรุปผู้บริหาร)
2. [เป้าหมายและ Definition of Done](#2-เป้าหมายและ-definition-of-done)
3. [สถานะปัจจุบัน vs เป้าหมาย](#3-สถานะปัจจุบัน-vs-เป้าหมาย)
4. [แผนภาพสถาปัตยกรรมเป้าหมาย](#4-แผนภาพสถาปัตยกรรมเป้าหมาย)
5. [Phase 0 — ล้างสิ่งที่ขัดกติกา (1–2 วัน)](#phase-0--ล้างสิ่งที่ขัดกติกา-12-วัน)
6. [Phase 1 — Firebase Mobile Integration (3–5 วัน)](#phase-1--firebase-mobile-integration-35-วัน)
7. [Phase 2 — Firestore Data Layer & Sync (4–6 วัน)](#phase-2--firestore-data-layer--sync-46-วัน)
8. [Phase 3 — Analytics Pipeline: GCS → RAPIDS → BigQuery (5–7 วัน)](#phase-3--analytics-pipeline-gcs--rapids--bigquery-57-วัน)
9. [Phase 4 — Looker Visualization (2–3 วัน)](#phase-4--looker-visualization-23-วัน)
10. [Phase 5 — Gemini Backend & Decision Explanation (2–3 วัน)](#phase-5--gemini-backend--decision-explanation-23-วัน)
11. [Phase 6 — Caregiver Workflow & FCM (3–4 วัน)](#phase-6--caregiver-workflow--fcm-34-วัน)
12. [Phase 7 — Security, Testing & CI (2–3 วัน)](#phase-7--security-testing--ci-23-วัน)
13. [Phase 8 — Demo, Documentation & Submission Pack (2–3 วัน)](#phase-8--demo-documentation--submission-pack-23-วัน)
14. [Timeline รวมและ Critical Path](#14-timeline-รวมและ-critical-path)
15. [Checklist ตามเกณฑ์การแข่งขัน](#15-checklist-ตามเกณฑ์การแข่งขัน)
16. [Evidence Pack ที่ต้องเก็บ](#16-evidence-pack-ที่ต้องเก็บ)
17. [ความเสี่ยงและแผนรองรับ](#17-ความเสี่ยงและแผนรองรับ)
18. [สิ่งที่ห้าม claim ก่อนพร้อม](#18-สิ่งที่ห้าม-claim-ก่อนพร้อม)
19. [Narrative สำหรับการนำเสนอ](#19-narrative-สำหรับการนำเสนอ)
20. [ภาคผนวก: รายการไฟล์ที่ต้องแก้/สร้าง/ลบ](#20-ภาคผนวก-รายการไฟล์ที่ต้องแก้สร้างลบ)

---

## 1. บทสรุปผู้บริหาร

MaCheck เป็นแอป **Decision-Support** สำหรับ caregiver/คลินิกเล็ก ที่ตอบคำถาม:

> *"วันนี้ควรติดตามผู้ป่วยคนใดก่อน และเหตุผลเชิงข้อมูลคืออะไร?"*

**จุดแข็งปัจจุบัน:** แนวคิดตรง track, mobile UX ใช้งานได้ในเครื่อง, deterministic safety rules, Cloud Functions scaffold ใช้ Gemini ถูกต้อง, BigQuery DDL และ Looker spec พร้อม

**จุดอ่อนหลัก:** Pipeline ยังไม่ end-to-end, mobile ไม่เชื่อม Firebase จริง, GPU benchmark จำลอง, มี legacy code (Supabase/NVIDIA NIM/Vercel) ขัดกติกา, Gemini API key leak ใน client

**เวลาโดยประมาณ:** 24–36 วันทำงาน (parallel บาง phase ได้) สำหรับ submission ที่พิสูจน์ได้จริง

**Critical Path:** Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4/8

---

## 2. เป้าหมายและ Definition of Done

### 2.1 เป้าหมายหลัก

| # | เป้าหมาย | เกณฑ์สำเร็จ |
|---|----------|-------------|
| G1 | โมเดล Generative AI เป็น Google Gemini เท่านั้น | ไม่มี NIM/OpenAI/Anthropic ใน submission build |
| G2 | Operational DB = Firebase Auth + Firestore | Mobile login/sync จริง 2 เครื่อง |
| G3 | Analytics pipeline ครบ | Firestore → GCS → cuDF GPU → BigQuery → Looker |
| G4 | NVIDIA acceleration พิสูจน์ได้ | CPU vs GPU benchmark ด้วย checksum เดียวกัน |
| G5 | Output ใช้ตัดสินใจได้ | Priority queue + alert + dashboard |
| G6 | Gemini อธิบาย ไม่คำนวณ score | Deterministic engine คำนวณ, Gemini explain เท่านั้น |

### 2.2 Definition of Done (Submission Ready)

- [ ] Mobile ใช้ Firebase Auth จริง (Google Sign-In หรือ Anonymous + handle registration)
- [ ] Dose events sync ขึ้น Firestore และ pull ได้ข้ามเครื่อง
- [ ] Cloud Function export de-identified data ลง GCS (Parquet/JSONL)
- [ ] Cloud Run Job ใช้ NVIDIA GPU + cuDF อ่าน GCS เขียน BigQuery
- [ ] ตาราง BigQuery มีข้อมูลจริง ≥ 1 demo tenant
- [ ] Looker Studio/Looker dashboard แสดง priority queue
- [ ] Risk summary เขียนกลับ Firestore ให้ mobile แสดง alert
- [ ] CPU/GPU benchmark บันทึกใน `acceleration_benchmarks` จริง
- [ ] Gemini เรียกผ่าน Cloud Functions เท่านั้น (ไม่มี client API key)
- [ ] ไม่มี legacy Supabase/NIM/Vercel ใน submission scope
- [ ] Demo video 3–5 นาที แสดง workflow ครบ
- [ ] Evidence pack ครบตาม [หมวด 16](#16-evidence-pack-ที่ต้องเก็บ)

---

## 3. สถานะปัจจุบัน vs เป้าหมาย

| องค์ประกอบ | ปัจจุบัน | เป้าหมาย | Gap |
|------------|----------|----------|-----|
| **Mobile Auth** | UID ปลอมใน SecureStore | Firebase Auth + token | 🔴 Critical |
| **Firestore Sync** | `console.log` only | Bidirectional sync | 🔴 Critical |
| **Gemini (Mobile)** | REST จาก client + hardcoded key | Callable Functions | 🔴 Critical |
| **Cloud Functions** | Scaffold พร้อม Gemini | Deployed + App Check | 🟡 Partial |
| **GCS Analytics** | ไม่มี | Partitioned raw zone | 🔴 Critical |
| **RAPIDS/cuDF** | Synthetic + simulated 8.5× | Cloud Run GPU จริง | 🔴 Critical |
| **BigQuery** | DDL only | Live tables + data | 🔴 Critical |
| **Looker** | Spec document | Live dashboard | 🔴 Critical |
| **Caregiver** | Stub functions | 2-account workflow | 🟡 Partial |
| **Legacy Code** | Supabase/NIM/Vercel อยู่ใน repo | Archive หรือลบ | 🔴 Critical |
| **Safety Rules** | Local deterministic | ทำงาน + sync catalog | 🟢 OK (local) |
| **Mobile UI** | ใช้งานได้ | เชื่อม backend | 🟢 OK (UI) |

---

## 4. แผนภาพสถาปัตยกรรมเป้าหมาย

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                        MaCheck Mobile (Expo/RN)                          │
│  Cabinet │ Dose Events │ Safety Rules │ Priority Alerts │ Gemini Chat   │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ Firebase SDK (Auth, Firestore, FCM)
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    Firebase (Operational Layer)                          │
│  Auth │ Firestore (users, medications, doseEvents, riskSummaries)       │
│  Storage (label images) │ Cloud Functions (callable) │ FCM              │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ Scheduled/Manual Export (de-identify)
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              Google Cloud Storage (Analytics Raw Zone)                   │
│  gs://macheck-analytics-raw/dose-events/dt=YYYY-MM-DD/part-*.parquet    │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ Cloud Run Job trigger
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│         Cloud Run Job + NVIDIA L4 GPU + RAPIDS/cuDF                      │
│  Clean │ Dedupe │ Feature Engineering │ Risk Score │ Rank              │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
              ┌─────────────────┴─────────────────┐
              ▼                                   ▼
┌──────────────────────────┐        ┌──────────────────────────┐
│   Google BigQuery         │        │   Firestore (write-back)  │
│   macheck_analytics.*     │        │   users/{uid}/riskSummary │
└─────────────┬────────────┘        └──────────────────────────┘
              │
              ▼
┌──────────────────────────┐
│   Looker / Looker Studio  │
│   Priority Queue Dashboard│
└──────────────────────────┘

Gemini (via Cloud Functions): อธิบาย risk score/reason codes เป็นภาษาไทย
                              อ่านฉลากยาจากภาพ (multimodal)
```

### Data Flow รายละเอียด

```text
1. User บันทึก dose event ใน mobile
2. sync.ts push ไป Firestore: users/{uid}/doseEvents/{eventId}
3. Cloud Scheduler หรือ manual trigger → exportDoseEvents Cloud Function
4. Function อ่าน Firestore, HMAC de-identify, เขียน Parquet ลง GCS
5. Cloud Run Job ถูก trigger (Pub/Sub หรือ HTTP)
6. Job อ่าน GCS ด้วย cuDF, คำนวณ features + risk_score, rank
7. Job เขียน BigQuery: cleaned_dose_events, patient_daily_features,
   caregiver_priority_queue, acceleration_benchmarks
8. Job เขียน Firestore: users/{uid}/riskSummary (personal alert)
9. Looker อ่าน BigQuery แสดง dashboard
10. User เปิด mobile เห็น alert; กด "อธิบาย" → chatAgent callable → Gemini
```

---

## Phase 0 — ล้างสิ่งที่ขัดกติกา (1–2 วัน)

> **เป้าหมาย:** Submission scope สะอาด ไม่มี vendor ที่ขัดกติกา  
> **Blocker ถัดไป:** ต้องทำก่อน Phase 1

### 0.1 Rotate และลบ API Key ที่ leak

| Task | ไฟล์ | การกระทำ |
|------|------|----------|
| 0.1.1 | `mobile/src/services/agent.ts:155` | ลบ hardcoded fallback key `'AIzaSyAv0-...'` |
| 0.1.2 | Google Cloud Console | **Rotate Gemini API key ทันที** (key ถูก commit ใน repo) |
| 0.1.3 | `mobile/.env.example` | ลบ `EXPO_PUBLIC_GEMINI_API_KEY` — Gemini ต้องผ่าน backend เท่านั้น |

**Acceptance:** `grep -r "AIzaSy" mobile/` ไม่พบผลลัพธ์

### 0.2 Archive Legacy Runtime

ย้ายไป `archive/legacy-pre-google/` (อย่าลบทิ้ง — อาจอ้างอิง schema):

```text
archive/legacy-pre-google/
├── api/chat.js                    # NVIDIA NIM + Vercel
├── vercel.json
├── js/                            # Web prototype + Supabase
├── platform/firebase/             # จริง ๆ คือ Supabase
├── prototypes/adherence-intelligence/
└── platform/gcp_functions/gemini_agent.py  # mock
```

| Task | การกระทำ |
|------|----------|
| 0.2.1 | สร้าง `archive/legacy-pre-google/` |
| 0.2.2 | `git mv` ไฟล์/โฟลเดอร์ด้านบน |
| 0.2.3 | เพิ่ม `archive/` ใน `.gitignore` ถ้าไม่ต้องการ track (หรือเก็บไว้เป็น reference) |
| 0.2.4 | ลบ root `package-lock.json` dependencies: `@langchain/openai` |

### 0.3 อัปเดตเอกสารที่ misleading

| ไฟล์ | ปัญหา | การแก้ |
|------|-------|--------|
| `mobile/README.md` | อธิบาย Supabase | เขียนใหม่: Firebase stack |
| `mobile/PRODUCTION_CHECKLIST.md` | Supabase checklist | แทนด้วย Firebase checklist |
| `platform/README.md` | Supabase credentials | ลบหรือ redirect ไป `docs/` |
| `README.md` (root) | สั้นเกินไป | เพิ่ม architecture overview + link docs |

### 0.4 ล้าง Environment Variables

| ไฟล์ | ลบ |
|------|-----|
| `mobile/.env.example` | `EXPO_PUBLIC_SUPABASE_*`, `EXPO_PUBLIC_GEMINI_API_KEY` |
| root `.env` (ถ้ามี) | `VERCEL_*`, `NVIDIA_*`, `SUPABASE_*` |

**Acceptance Phase 0:**
- [ ] ไม่มี NVIDIA NIM / OpenAI / Supabase runtime ใน submission paths
- [ ] Gemini key rotated และไม่มีใน client code
- [ ] README สะท้อน Google-only stack
- [ ] `npm run typecheck` ยังผ่าน

---

## Phase 1 — Firebase Mobile Integration (3–5 วัน)

> **เป้าหมาย:** Mobile เชื่อม Firebase Auth จริง  
> **ขึ้นกับ:** Phase 0

### 1.1 ติดตั้ง Firebase SDK

```bash
cd mobile
npx expo install @react-native-firebase/app @react-native-firebase/auth @react-native-firebase/firestore
```

| Task | รายละเอียด |
|------|------------|
| 1.1.1 | เพิ่ม dependencies ใน `mobile/package.json` |
| 1.1.2 | สร้าง Firebase project dev: `macheck-app-dev` (ถ้ายังไม่มี) |
| 1.1.3 | ดาวน์โหลด `google-services.json` → `mobile/android/app/` |
| 1.1.4 | ดาวน์โหลด `GoogleService-Info.plist` → `mobile/ios/MaCheck/` |
| 1.1.5 | แก้ iOS bundle ID เป็น `com.macheck.app` ใน Xcode (ปัจจุบันยัง `com.yacheck.app`) |
| 1.1.6 | ใช้ Expo development build (`eas build --profile development`) |

### 1.2 สร้าง Firebase Client Module

**ไฟล์:** `mobile/src/services/firebase-client.ts` (ใหม่)

```typescript
// โครงสร้างที่ต้องมี
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import functions from '@react-native-firebase/functions';

export function initFirebase() { /* emulator switch ถ้า __DEV__ */ }
export { auth, firestore, functions };
export async function callFunction<T>(name: string, data: object): Promise<T> {
  return functions().httpsCallable(name)(data);
}
```

| Task | รายละเอียด |
|------|------------|
| 1.2.1 | สร้าง `firebase-client.ts` |
| 1.2.2 | แก้ `firebase.ts` ให้ re-export จาก client module |
| 1.2.3 | เพิ่ม emulator config ใน `__DEV__` mode |
| 1.2.4 | เรียก `initFirebase()` ใน `mobile/src/app/_layout.tsx` |

### 1.3 Implement Firebase Auth

**ไฟล์:** `mobile/src/services/auth.ts` (แก้ทั้งไฟล์)

| Task | รายละเอียด |
|------|------------|
| 1.3.1 | แทน `signInAnonymously()` ด้วย `auth().signInAnonymously()` |
| 1.3.2 | เพิ่ม Google Sign-In: `@react-native-google-signin/google-signin` |
| 1.3.3 | ใช้ `auth().onAuthStateChanged()` แทน local session |
| 1.3.4 | ลบ `signInWithCredentials(uid)` ที่รับ UID ปลอม |
| 1.3.5 | หลัง login เรียก `setupUserHandle` callable ถ้ามี handle |
| 1.3.6 | Account deletion เรียก callable function จริง |

**Acceptance:**
- [ ] Login ด้วย Google บน device จริงได้
- [ ] Firebase Console แสดง user ใหม่
- [ ] `getCurrentUid()` คืน Firebase UID จริง
- [ ] Logout ล้าง session ถูกต้อง

### 1.4 เชื่อม Callable Functions

**ไฟล์:** `mobile/src/services/agent.ts`

| Task | รายละเอียด |
|------|------------|
| 1.4.1 | ลบ direct Gemini REST call ทั้งหมด |
| 1.4.2 | `invokeAgentFunction()` เรียก `callFunction('chatAgent', {...})` |
| 1.4.3 | Handle `executionMode: 'rules_only'` เมื่อ backend unavailable |
| 1.4.4 | แสดง error อย่างตรงไปตรงมา ไม่ hardcode success |

**ไฟล์:** `mobile/src/services/google-cloud.ts`

| Task | รายละเอียด |
|------|------------|
| 1.4.5 | Scanner เรียก `callFunction('scanMedicationLabel', { base64Image })` |
| 1.4.6 | ลบ fallback ที่คืน Paracetamol ปลอม |

**Acceptance Phase 1:**
- [ ] Auth flow ทำงานบน Android + iOS device
- [ ] Chat agent เรียก Cloud Function ได้ (ต้อง deploy functions ก่อน)
- [ ] Scanner ส่งภาพไป backend ได้
- [ ] ไม่มี Gemini API call จาก client

---

## Phase 2 — Firestore Data Layer & Sync (4–6 วัน)

> **เป้าหมาย:** Dose events ไหลเข้า Firestore เป็น pipeline input  
> **ขึ้นกับ:** Phase 1

### 2.1 Firestore Schema Design

```text
users/{uid}/
├── profile: { handle, displayName, allergies[], diseases[], ... }
├── medications/{medId}: { medicineId, dosage, schedule, status, ... }
├── doseEvents/{eventId}: { medicationId, scheduledAt, status, takenAt, ... }
├── riskSummary/current: { score, tier, reasonCodes[], rankedAt, ... }
└── caregiverAccess/{caregiverUid}: { status, grantedAt, ... }

caregiverInvites/{inviteId}: { patientUid, caregiverUid, status, ... }
clinicalCatalog/releases/{releaseId}/medications/{medId}
clinicalCatalog/releases/{releaseId}/interactions/{intId}
privateHandles/{handle}: { uid }  # server-managed only
```

### 2.2 Implement Sync Service

**ไฟล์:** `mobile/src/services/sync.ts` (เขียนใหม่)

| Task | รายละเอียด |
|------|------------|
| 2.2.1 | `pushMaCheckSnapshot()`: batch write medications + dose events |
| 2.2.2 | `pullMaCheckSnapshot()`: read + merge with local state |
| 2.2.3 | ใช้ `idempotencyKey` ป้องกัน duplicate |
| 2.2.4 | Soft-delete: ตั้ง `status: 'deleted'` แทน hard delete |
| 2.2.5 | Offline queue: เก็บ pending mutations ใน local storage |
| 2.2.6 | Firestore listener สำหรับ real-time updates |

**ไฟล์:** `mobile/src/services/firestore-converters.ts` (ใหม่)

| Task | รายละเอียด |
|------|------------|
| 2.2.7 | Type-safe converters สำหรับ Medication, DoseEvent, Profile |
| 2.2.8 | Handle Timestamp, nested maps, arrays |

### 2.3 Clinical Catalog Reader

**ไฟล์:** `mobile/src/services/clinical-catalog.ts`

| Task | รายละเอียด |
|------|------------|
| 2.3.1 | อ่าน `clinicalCatalog/releases/latest` จาก Firestore |
| 2.3.2 | Cache ใน SQLite (expo-sqlite) สำหรับ offline |
| 2.3.3 | Fallback bundled catalog เมื่อ offline + ไม่มี cache |

### 2.4 Seed Clinical Data

**ไฟล์:** `tools/seed_clinical_catalog.mjs` (ใหม่ หรือแก้ migrate tool)

| Task | รายละเอียด |
|------|------------|
| 2.4.1 | ใช้ Firebase Admin SDK (ไม่ใช่ REST + demo key) |
| 2.4.2 | Import จาก `outputs/clinical-import-20260718/` |
| 2.4.3 | ตั้ง `releaseId`, `publishedAt`, `reviewedBy` |
| 2.4.4 | แก้ interaction ที่อ้าง `simvastatin` แต่ไม่มีใน medication set |

### 2.5 Firestore Rules Hardening

**ไฟล์:** `firestore.rules`

| Task | รายละเอียด |
|------|------------|
| 2.5.1 | เพิ่ม field validation ใน `users/{userId}` |
| 2.5.2 | `caregiverAccess` write ผ่าน callable เท่านั้น |
| 2.5.3 | Clinical catalog: ตรวจ `published == true` |
| 2.5.4 | เขียน Rules unit tests ด้วย `@firebase/rules-unit-testing` |

**Acceptance Phase 2:**
- [ ] Add medicine → sync → pull บน device ที่ 2 เห็นข้อมูลเดียวกัน
- [ ] Dose event บันทึกใน Firestore พร้อม timestamp
- [ ] Offline: queue mutations → sync เมื่อ online
- [ ] Emulator rules tests ผ่าน
- [ ] Clinical catalog โหลดจาก Firestore ได้

---

## Phase 3 — Analytics Pipeline: GCS → RAPIDS → BigQuery (5–7 วัน)

> **เป้าหมาย:** Pipeline analytics ทำงานจริงบน Google Cloud + NVIDIA GPU  
> **ขึ้นกับ:** Phase 2 (ต้องมี dose events ใน Firestore)

### 3.1 GCP Infrastructure Setup

| Resource | ชื่อ/Config |
|----------|-------------|
| Cloud Storage bucket | `gs://macheck-analytics-raw` (region: asia-southeast1) |
| BigQuery dataset | `macheck_analytics` (location: asia-southeast1) |
| Artifact Registry | `asia-southeast1-docker.pkg.dev/{project}/macheck/analytics` |
| Cloud Run Job | `macheck-rapids-pipeline` (GPU: nvidia-l4, 1 GPU) |
| Secret Manager | `macheck-hmac-secret` สำหรับ de-identify |
| Service Account | `macheck-analytics@` with roles: storage.objectAdmin, bigquery.dataEditor, datastore.user |

| Task | รายละเอียด |
|------|------------|
| 3.1.1 | สร้าง resources ด้วย gcloud หรือ Terraform |
| 3.1.2 | ตั้ง billing alert |
| 3.1.3 | ขอ GPU quota สำหรับ Cloud Run (region asia-southeast1) |
| 3.1.4 | Run BigQuery DDL: `platform/analytics/bigquery_schema.sql` |

### 3.2 Export Cloud Function

**ไฟล์:** `functions/src/exportDoseEvents.ts` (ใหม่)

```typescript
// Scheduled function (Cloud Scheduler: ทุก 1 ชม.) หรือ manual trigger
export const exportDoseEvents = onSchedule('every 1 hours', async () => {
  // 1. Query Firestore doseEvents ที่ updated ตั้งแต่ lastExport
  // 2. HMAC de-identify: analytics_subject_id = HMAC(uid, secret)
  // 3. ลบ PHI: email, phone, username, free text
  // 4. เขียน Parquet ลง GCS: dose-events/dt=YYYY-MM-DD/hour=HH/part-{uuid}.parquet
  // 5. เขียน manifest.json พร้อม row count, checksum
  // 6. Publish Pub/Sub message trigger pipeline job
});
```

| Task | รายละเอียด |
|------|------------|
| 3.2.1 | Implement export function |
| 3.2.2 | ใช้ `@google-cloud/storage` + `parquetjs` หรือ Apache Arrow |
| 3.2.3 | อ่าน HMAC secret จาก Secret Manager |
| 3.2.4 | Deploy + test ด้วย Firestore emulator data |

### 3.3 Refactor Analytics Pipeline

**เปลี่ยนจาก:** FastAPI public endpoint + synthetic data  
**เป็น:** Cloud Run Job batch processor

**ไฟล์ที่ต้องแก้/สร้าง:**

| ไฟล์ | การกระทำ |
|------|----------|
| `platform/analytics/main.py` | เปลี่ยนเป็น job entrypoint (ไม่ใช่ FastAPI server) |
| `platform/analytics/rapids_pipeline.py` | แก้ให้ใช้ cuDF จริง, ลบ simulated speedup |
| `platform/analytics/gcs_io.py` | ใหม่: อ่าน/เขียน GCS |
| `platform/analytics/bigquery_io.py` | ใหม่: load/write BigQuery tables |
| `platform/analytics/firestore_io.py` | ใหม่: เขียน risk summary |
| `platform/analytics/feature_engineering.py` | ใหม่: rolling 7d/14d/30d features จริง |
| `platform/analytics/risk_model.py` | ใหม่: versioned formula + reason codes |
| `platform/analytics/benchmark.py` | ใหม่: CPU vs GPU benchmark ด้วย checksum |
| `platform/analytics/Dockerfile` | ใช้ RAPIDS base image + job entrypoint |
| `platform/analytics/deploy/cloudrun-job.yaml` | ใหม่: Cloud Run Job config with GPU |

### 3.4 แก้ Risk Model ให้ถูกต้อง

**ปัญหาปัจจุบันใน `rapids_pipeline.py`:**
- Feature ชื่อ `*_7d` แต่คำนวณจาก 30 วันทั้งหมด
- `missed_streak` = `skipped/5` ไม่ใช่ consecutive streak

**แก้ไขใน `feature_engineering.py`:**

```python
# Rolling window จริง
def compute_7d_features(events_df, reference_date):
    window_start = reference_date - timedelta(days=7)
    window_events = events_df[events_df.event_date >= window_start]
    # missed_dose_rate_7d, late_dose_rate_7d จาก window 7 วันจริง

def compute_missed_streak(events_df, subject_id):
    # นับ consecutive skipped จาก event ล่าสุดย้อนหลัง
    # return จำนวนวันที่ skip ติดต่อกัน
```

**Risk formula v1.0 (คงเดิม แต่ input ถูกต้อง):**

```text
risk_score =
  35 × missed_dose_rate_7d
+ 25 × min(missed_streak / 3, 1)
+ 15 × late_dose_rate_7d
+ 15 × severe_interaction_flag
+ 10 × worsening_trend_flag

reason_codes:
  - MISSED_STREAK_{n}           if missed_streak >= 2
  - ADHERENCE_7D_BELOW_0_70     if adherence < 0.70
  - LATE_DOSE_RATE_HIGH         if late_dose_rate_7d > 0.20
  - SEVERE_INTERACTION_REVIEW   if severe_interaction_flag == 1
  - WORSENING_TREND             if trend worse than 14d baseline
```

### 3.5 Implement cuDF Pipeline

**ไฟล์:** `platform/analytics/rapids_pipeline.py` (เขียนใหม่)

```python
import cudf
from gcs_io import read_parquet_from_gcs
from bigquery_io import write_to_bigquery
from firestore_io import write_risk_summaries

def run_pipeline(gcs_input_uri: str, run_id: str) -> dict:
    # 1. Read Parquet from GCS into cuDF DataFrame
    df = read_parquet_from_gcs(gcs_input_uri)
    
    # 2. Clean & dedupe
    df = df.drop_duplicates(subset=['idempotency_key'])
    
    # 3. Feature engineering (cuDF groupby + rolling)
    features = compute_features_cudf(df)
    
    # 4. Risk scoring
    scores = compute_risk_scores_cudf(features)
    
    # 5. Rank priority queue
    queue = rank_priority_queue_cudf(scores)
    
    # 6. Write to BigQuery
    write_to_bigquery('cleaned_dose_events', df)
    write_to_bigquery('patient_daily_features', features)
    write_to_bigquery('caregiver_priority_queue', queue)
    
    # 7. Write personal summaries to Firestore
    write_risk_summaries(queue)
    
    return {'run_id': run_id, 'rows_processed': len(df), ...}
```

### 3.6 CPU vs GPU Benchmark

**ไฟล์:** `platform/analytics/benchmark.py`

| Task | รายละเอียด |
|------|------------|
| 3.6.1 | รัน pipeline เดียวกันบน CPU (pandas) และ GPU (cuDF) |
| 3.6.2 | Input: GCS manifest เดียวกัน |
| 3.6.3 | Output: checksum ต้องตรงกัน |
| 3.6.4 | บันทึก metrics ลง `acceleration_benchmarks` table |
| 3.6.5 | **ลบ** `gpu_duration = cpu_duration / 8.5` simulated fallback |

**Metrics ที่ต้องบันทึก:**

```json
{
  "run_id": "bench_20260723_001",
  "engine": "cudf_gpu",
  "gpu_type": "nvidia-l4",
  "cuda_version": "12.2",
  "rapids_version": "24.04",
  "input_rows": 3285000,
  "output_rows": 10000,
  "output_checksum": "e8aebc27...",
  "wall_clock_seconds": 11.36,
  "records_per_second": 289000,
  "speedup_vs_cpu": 8.5
}
```

### 3.7 Deploy Cloud Run Job

**ไฟล์:** `platform/analytics/deploy/cloudrun-job.yaml`

```yaml
apiVersion: run.googleapis.com/v1
kind: Job
metadata:
  name: macheck-rapids-pipeline
spec:
  template:
    spec:
      template:
        spec:
          containers:
          - image: asia-southeast1-docker.pkg.dev/PROJECT/macheck/analytics:latest
            resources:
              limits:
                nvidia.com/gpu: "1"
          nodeSelector:
            run.googleapis.com/accelerator: nvidia-l4
```

| Task | รายละเอียด |
|------|------------|
| 3.7.1 | Build Docker image ด้วย RAPIDS base |
| 3.7.2 | Push to Artifact Registry |
| 3.7.3 | Deploy Cloud Run Job with GPU |
| 3.7.4 | Test manual execution |
| 3.7.5 | ตั้ง Pub/Sub trigger จาก export function |

**Acceptance Phase 3:**
- [ ] Export function เขียน Parquet ลง GCS จริง
- [ ] Cloud Run Job log แสดง `GPU=true`, cuDF version
- [ ] BigQuery tables มี rows จาก demo tenant
- [ ] Firestore `riskSummary` อัปเดตหลัง job run
- [ ] `acceleration_benchmarks` มี CPU + GPU timings จริง (ไม่ simulated)
- [ ] Checksum match ระหว่าง CPU และ GPU run

---

## Phase 4 — Looker Visualization (2–3 วัน)

> **เป้าหมาย:** Dashboard แสดง priority queue และ acceleration evidence  
> **ขึ้นกับ:** Phase 3 (ต้องมี BigQuery data)

### 4.1 เลือก Looker Product

| Option | ข้อดี | ข้อเสีย |
|--------|-------|---------|
| **Looker Studio** (ฟรี) | ไม่ต้อง entitlement, เชื่อม BigQuery ได้ทันที | Features จำกัดกว่า Looker |
| **Looker (Enterprise)** | Powerful, version control | ต้องมี license/entitlement |

**แนะนำ:** เริ่มด้วย **Looker Studio** ถ้าไม่มี Looker license

### 4.2 สร้าง Dashboard ตาม Spec

**อ้างอิง:** `docs/architecture/LOOKER_DASHBOARD_SPEC.md`

#### Page 1: Caregiver Priority Queue

| Visual | Data Source | Config |
|--------|-------------|--------|
| Ranked Table | `caregiver_priority_queue` | Sort by `risk_score DESC` |
| Tier Badge | `priority_tier` | Color: critical=red, high=orange, medium=yellow, low=green |
| Filters | Date range, tier | |

#### Page 2: Population Adherence Trends

| Visual | Data Source |
|--------|-------------|
| KPI: Total Patients | `COUNT(DISTINCT analytics_subject_id)` |
| KPI: High-Risk Count | `COUNT WHERE priority_tier IN ('critical','high')` |
| Line Chart: 30-day adherence | `patient_daily_features` |

#### Page 3: NVIDIA Acceleration Evidence

| Visual | Data Source |
|--------|-------------|
| Benchmark Table | `acceleration_benchmarks` |
| Speedup Chart | CPU vs GPU wall time |
| Checksum Validation | `checksum_match = TRUE` |

### 4.3 Data Freshness Indicator

| Task | รายละเอียด |
|------|------------|
| 4.3.1 | แสดง `MAX(ranked_at)` จาก priority queue |
| 4.3.2 | แสดง pipeline run status จาก `pipeline_runs` table |
| 4.3.3 | Alert ถ้า data stale > 24 ชม. |

**Acceptance Phase 4:**
- [ ] Dashboard URL shareable
- [ ] แสดง priority queue จาก BigQuery data จริง
- [ ] Screenshot/video ของ dashboard ใน evidence pack
- [ ] **อย่าใส่ตัวเลข pre-filled** — ต้องมาจาก query จริง

---

## Phase 5 — Gemini Backend & Decision Explanation (2–3 วัน)

> **เป้าหมาย:** Gemini อธิบายผลที่ rule engine คำนวณแล้ว  
> **ขึ้นกับ:** Phase 1, Phase 3

### 5.1 Harden Cloud Functions

**ไฟล์:** `functions/src/index.ts`

| Task | รายละเอียด |
|------|------------|
| 5.1.1 | ย้าย `GEMINI_API_KEY` ไป Secret Manager |
| 5.1.2 | เปิด `enforceAppCheck: true` ทุก callable |
| 5.1.3 | เพิ่ม input validation: message length, base64 size |
| 5.1.4 | Rate limiting ด้วย Firestore counter |
| 5.1.5 | Parse Gemini JSON response ด้วย schema validation |

### 5.2 Risk Explanation Function

**ไฟล์:** `functions/src/explainRiskScore.ts` (ใหม่)

```typescript
export const explainRiskScore = onCall(async (request) => {
  const uid = assertAuth(request);
  // 1. อ่าน riskSummary จาก Firestore (ไม่คำนวณใหม่)
  const summary = await getRiskSummary(uid);
  // 2. ส่ง structured data ให้ Gemini อธิบาย
  const prompt = `
    ผู้ป่วยมี risk score ${summary.score} (tier: ${summary.tier})
    เหตุผล: ${summary.reasonCodes.join(', ')}
    อธิบายเป็นภาษาไทยที่เข้าใจง่าย ไม่สั่งยา ไม่เปลี่ยน dosage
    แนะนำ action ที่ปลอดภัย เช่น ติดต่อเภสัชกร, ทบทวนตารางยา
  `;
  // 3. Return Gemini explanation
});
```

### 5.3 UI Integration

**ไฟล์:** `mobile/src/app/(tabs)/(home)/index.tsx` (หรือหน้า alert)

| Task | รายละเอียด |
|------|------------|
| 5.3.1 | แสดง risk alert จาก Firestore `riskSummary` |
| 5.3.2 | ปุ่ม "อธิบายเพิ่มเติม" → เรียก `explainRiskScore` |
| 5.3.3 | แสดง disclaimer: "คำแนะนำจาก AI ไม่ใช่การวินิจฉัย" |

**Acceptance Phase 5:**
- [ ] Gemini อธิบาย score/reason codes เป็นภาษาไทย
- [ ] Gemini ไม่แก้ score/tier/reason codes
- [ ] Functions log แสดง model ID: `gemini-2.5-flash`
- [ ] App Check enforced

---

## Phase 6 — Caregiver Workflow & FCM (3–4 วัน)

> **เป้าหมาย:** Caregiver เห็น priority queue และรับ notification  
> **ขึ้นกับ:** Phase 2, Phase 3  
> **Priority:** P1 — ทำหลัง pipeline หลักเสร็จ

### 6.1 Implement Caregiver Service

**ไฟล์:** `mobile/src/services/caregiver.ts` (เขียนใหม่)

| Task | รายละเอียด |
|------|------------|
| 6.1.1 | `getRelationships()`: query Firestore caregiverAccess |
| 6.1.2 | `sendInvite()`: call `inviteCaregiver` callable |
| 6.1.3 | `respondInvite()`: call `respondCaregiverInvite` callable |
| 6.1.4 | `getPriorityQueue()`: read de-identified queue (via callable) |
| 6.1.5 | Firestore listener สำหรับ invite status |

### 6.2 FCM Push Notifications

| Task | รายละเอียด |
|------|------------|
| 6.2.1 | ติดตั้ง `@react-native-firebase/messaging` |
| 6.2.2 | เก็บ FCM token ใน Firestore `users/{uid}/fcmTokens` |
| 6.2.3 | Cloud Function ส่ง push เมื่อ risk tier เปลี่ยนเป็น critical |
| 6.2.4 | Caregiver notification เมื่อ patient missed dose |

### 6.3 Two-Account Integration Test

| Scenario | Expected |
|----------|----------|
| Patient add medicine → Caregiver sees in queue | ✅ |
| Patient missed dose → Caregiver gets push | ✅ |
| Caregiver revoke → Patient data hidden | ✅ |

**Acceptance Phase 6:**
- [ ] Invite flow ทำงาน 2 บัญชีจริง
- [ ] Caregiver เห็น priority queue (de-identified)
- [ ] Push notification ส่งได้

---

## Phase 7 — Security, Testing & CI (2–3 วัน)

> **เป้าหมาย:** Security posture และ automated quality gates  
> **ขึ้นกับ:** Phase 1–3

### 7.1 Security Hardening

| Area | Task |
|------|------|
| Firestore Rules | Unit tests ด้วย emulator |
| Storage Rules | จำกัด file size, content type |
| Functions | App Check, rate limit, input validation |
| Secrets | ทุก API key ใน Secret Manager |
| Mobile | ไม่มี sensitive data ใน client |

### 7.2 Test Suite

| Test Type | Tool | Coverage |
|-----------|------|----------|
| Firestore Rules | `@firebase/rules-unit-testing` | All collections |
| Functions unit | Jest | Callable handlers |
| Risk model | pytest | Feature engineering, scoring |
| E2E | Manual + video | Login → dose → sync → alert |
| Vendor scan | `grep`/script | No banned providers |

### 7.3 CI Pipeline

**ไฟล์:** `.github/workflows/ci.yml` (ใหม่)

```yaml
jobs:
  typecheck:
    - npm run typecheck (mobile + functions)
  lint:
    - npm run lint
  rules-test:
    - firebase emulators:exec 'npm run test:rules'
  functions-test:
    - npm run test (functions)
  analytics-test:
    - pytest platform/analytics/
  vendor-scan:
    - ./scripts/check-google-only.sh
```

**Acceptance Phase 7:**
- [ ] CI green on main branch
- [ ] Rules tests pass
- [ ] Vendor scan ไม่พบ banned providers

---

## Phase 8 — Demo, Documentation & Submission Pack (2–3 วัน)

> **เป้าหมาย:** Package พร้อมส่งพร้อม demo ที่น่าเชื่อถือ  
> **ขึ้นกับ:** Phase 1–7

### 8.1 Demo Script (3–5 นาที)

| นาที | Scene | สิ่งที่แสดง |
|------|-------|------------|
| 0:00–0:30 | Problem | "Caregiver มีผู้ป่วย 10 คน ไม่รู้ว่าควรติดตามใครก่อน" |
| 0:30–1:30 | Mobile | Login → Add medicine → Record dose (taken/skipped) |
| 1:30–2:30 | Pipeline | GCS bucket → Cloud Run Job log → BigQuery tables |
| 2:30–3:30 | Dashboard | Looker priority queue + acceleration benchmark |
| 3:30–4:30 | Alert | Mobile แสดง risk alert → Gemini อธิบายเป็นภาษาไทย |
| 4:30–5:00 | Summary | Architecture diagram + key metrics |

### 8.2 Documentation Update

| ไฟล์ | เนื้อหา |
|------|--------|
| `README.md` | Architecture overview, quick start, demo link |
| `docs/DEPLOYMENT.md` | gcloud commands, env setup |
| `docs/DEMO.md` | Demo script, test accounts |
| `docs/ARCHITECTURE.md` | Diagram, data flow, tech stack |

### 8.3 Submission Checklist

ดู [หมวด 15](#15-checklist-ตามเกณฑ์การแข่งขัน) และ [หมวด 16](#16-evidence-pack-ที่ต้องเก็บ)

**Acceptance Phase 8:**
- [ ] Demo video uploaded (YouTube unlisted หรือ Drive)
- [ ] README ครบถ้วน
- [ ] Evidence pack ครบ
- [ ] Submission form filled

---

## 14. Timeline รวมและ Critical Path

```text
Week 1:  Phase 0 (2d) + Phase 1 start (3d)
Week 2:  Phase 1 finish (2d) + Phase 2 (5d)
Week 3:  Phase 2 finish (1d) + Phase 3 (6d)
Week 4:  Phase 3 finish (1d) + Phase 4 (3d) + Phase 5 (3d)
Week 5:  Phase 6 (4d) + Phase 7 (3d)
Week 6:  Phase 8 (3d) + buffer (2d)
```

### Gantt Chart (Simplified)

| Phase | W1 | W2 | W3 | W4 | W5 | W6 |
|-------|:--:|:--:|:--:|:--:|:--:|:--:|
| 0 Cleanup | ██ | | | | | |
| 1 Firebase | ███ | ██ | | | | |
| 2 Firestore | | █████ | █ | | | |
| 3 Analytics | | | ██████ | █ | | |
| 4 Looker | | | | ███ | | |
| 5 Gemini | | | | ███ | | |
| 6 Caregiver | | | | | ████ | |
| 7 Testing | | | | | ███ | |
| 8 Demo | | | | | | ███ |

### Critical Path

```text
Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4/8
                              ↓
                         Phase 5 (parallel กับ 4)
```

**Blockers ที่อาจ delay:**
- GPU quota approval (Phase 3)
- iOS bundle ID fix + Apple developer account (Phase 1)
- Looker entitlement (Phase 4) → fallback Looker Studio

---

## 15. Checklist ตามเกณฑ์การแข่งขัน

### Track Requirements

| เกณฑ์ | Phase | Status |
|-------|-------|--------|
| Real-world user + problem | — | ⬜ ต้อง demo ให้เห็น |
| Decision/workflow ที่พึ่งข้อมูล | 2, 3, 4 | ⬜ |
| Pipeline: ingest → clean → analyze → visualize | 2, 3, 4 | ⬜ |
| Useful output (dashboard, alert, ranking) | 3, 4, 5 | ⬜ |

### Google Cloud Services (≥ 2)

| Service | Phase | Status |
|---------|-------|--------|
| Firebase Auth + Firestore | 1, 2 | ⬜ |
| Cloud Storage | 3 | ⬜ |
| BigQuery | 3 | ⬜ |
| Cloud Run + GPU | 3 | ⬜ |
| Looker / Looker Studio | 4 | ⬜ |
| Gemini (Cloud Functions) | 5 | ⬜ |

### NVIDIA Acceleration

| Requirement | Phase | Status |
|-------------|-------|--------|
| RAPIDS / cuDF | 3 | ⬜ |
| GPU บน Google Cloud | 3 | ⬜ |
| CPU vs GPU benchmark | 3 | ⬜ |
| Measurable speedup | 3 | ⬜ |

### Google-Only Models

| Requirement | Phase | Status |
|-------------|-------|--------|
| Gemini only (generative) | 0, 1, 5 | ⬜ |
| ไม่มี NVIDIA NIM | 0 | ⬜ |
| ไม่มี OpenAI/Anthropic | 0 | ⬜ |
| ไม่มี client-side API key | 0, 1 | ⬜ |

---

## 16. Evidence Pack ที่ต้องเก็บ

### 16.1 Firebase

- [ ] Screenshot: Firebase Console → Authentication → Users
- [ ] Screenshot: Firestore → `users/{uid}/doseEvents`
- [ ] Screenshot: Firestore Rules deployed
- [ ] Video: Login บน device จริง

### 16.2 Analytics Pipeline

- [ ] Screenshot: GCS bucket → `dose-events/dt=.../part-*.parquet`
- [ ] Screenshot: GCS manifest.json
- [ ] Cloud Run Job log: `GPU=true`, cuDF version, row count
- [ ] BigQuery: `SELECT COUNT(*) FROM macheck_analytics.caregiver_priority_queue`
- [ ] BigQuery: `SELECT * FROM macheck_analytics.acceleration_benchmarks ORDER BY executed_at DESC LIMIT 5`

### 16.3 Visualization

- [ ] Screenshot: Looker/Studio dashboard — Priority Queue page
- [ ] Screenshot: Acceleration benchmark page
- [ ] Dashboard URL (shareable)

### 16.4 Gemini

- [ ] Cloud Functions log: model ID `gemini-2.5-flash`
- [ ] Screenshot: Mobile chat with Gemini explanation
- [ ] Screenshot: Label scanner result

### 16.5 Testing

- [ ] Firestore Rules test results
- [ ] Vendor scan output (no banned providers)
- [ ] CI pipeline green

### 16.6 Demo

- [ ] Demo video (3–5 min, unlisted YouTube or Drive link)
- [ ] Architecture diagram (PNG/PDF)

---

## 17. ความเสี่ยงและแผนรองรับ

| ความเสี่ยง | ผลกระทบ | แผนรองรับ |
|-----------|---------|----------|
| GPU quota ไม่ approved | ไม่มี benchmark จริง | ใช้ region us-central1; ขอ quota ล่วงหน้า; fallback benchmark บน GCE GPU |
| Looker ไม่มี license | ไม่มี dashboard | ใช้ Looker Studio (ฟรี) |
| iOS build fail | Demo ได้แค่ Android | Focus Android demo; iOS เป็น stretch goal |
| Firebase project billing | ไม่ deploy ได้ | ใช้ free tier + Blaze plan สำหรับ Cloud Run |
| Gemini rate limit | Chat ช้า/lfail | Cache common responses; fallback rules_only |
| Team bandwidth | Delay timeline | Cut Phase 6 (caregiver) ถ้าจำเป็น; focus pipeline |

---

## 18. สิ่งที่ห้าม Claim ก่อนพร้อม

### ❌ ห้าม Claim

| Claim | เหตุผล |
|-------|--------|
| "Firebase sync ทำงานแล้ว" | sync.ts ยังเป็น console.log |
| "GPU acceleration 8.5×" | ยัง simulated |
| "BigQuery pipeline live" | มี DDL แต่ไม่มี data |
| "Looker dashboard ready" | มี spec อย่างเดียว |
| "Gemini AI live" | Mobile ยัง hardcode/mock |
| "Caregiver remote access" | caregiver.ts เป็น stub |
| "Production ready" | ยังเป็น scaffold |

### ✅ Claim ได้ตอนนี้

| Claim | หลักฐาน |
|-------|---------|
| "Local medication UX ทำงานได้" | Mobile app runnable |
| "Deterministic safety rules" | safety.ts, medicine-db.ts |
| "Architecture design พร้อม" | docs/, BigQuery DDL, Looker spec |
| "Cloud Functions scaffold ใช้ Gemini" | functions/src/index.ts |
| "Competition narrative ชัดเจน" | Competition addendum |

---

## 19. Narrative สำหรับการนำเสนอ

### Elevator Pitch (30 วินาที)

> "MaCheck ช่วย caregiver ตัดสินใจว่าวันนี้ควรติดตามผู้ป่วยคนไหนก่อน — โดยเปลี่ยน dose events ที่กระจัดกระจายให้เป็น priority queue ที่อธิบายได้ พร้อม Gemini อธิบายเหตุผลเป็นภาษาไทย"

### Full Narrative (3–5 นาที)

> **ปัญหา:** ผู้ดูแลผู้สูงอายุหรือเภสัชกรชุมชนมีผู้ป่วยหลายคน แต่ไม่รู้ว่าวันนี้ควรติดตามใครก่อน — ต้องไล่เปิดประวัติทีละคน และมักพลาดการขาดยาซ้ำ
>
> **วิธีแก้:** MaCheck บันทึก dose events ผ่าน mobile app → sync ขึ้น Firebase Firestore → export แบบ de-identify ลง Cloud Storage → ประมวลผลด้วย NVIDIA cuDF บน Cloud Run GPU → เก็บผลใน BigQuery → แสดง priority queue ใน Looker dashboard → ส่ง alert กลับ mobile
>
> **Acceleration:** บนชุดข้อมูล 3.2 ล้าน dose events RAPIDS/cuDF บน NVIDIA L4 ประมวลผลได้ X เท่าเร็วกว่า pandas CPU โดยผลลัพธ์ผ่าน checksum validation เท่ากัน
>
> **AI Role:** Gemini อธิบาย risk score และ reason codes เป็นภาษาไทยที่เข้าใจง่าย — ไม่ใช่ผู้คำนวณ score (deterministic engine ทำหน้าที่นั้น)
>
> **Output:** Caregiver เห็น "Patient SUBJ_abc123 — Risk 78 (Critical) — MISSED_STREAK_3, ADHERENCE_7D_BELOW_0_70" และรู้ว่าควรติดตามคนนี้ก่อน

---

## 20. ภาคผนวก: รายการไฟล์ที่ต้องแก้/สร้าง/ลบ

### 20.1 ไฟล์ที่ต้องลบ/Archive (Phase 0)

```text
archive/legacy-pre-google/
├── api/chat.js
├── vercel.json
├── js/
├── platform/firebase/
├── prototypes/adherence-intelligence/
└── platform/gcp_functions/gemini_agent.py
```

### 20.2 ไฟล์ที่ต้องแก้

| ไฟล์ | Phase | การเปลี่ยนแปลง |
|------|-------|----------------|
| `mobile/src/services/auth.ts` | 1 | Firebase Auth จริง |
| `mobile/src/services/sync.ts` | 2 | Firestore read/write |
| `mobile/src/services/agent.ts` | 1, 5 | Callable functions, ลบ client Gemini |
| `mobile/src/services/google-cloud.ts` | 1 | Callable scanner |
| `mobile/src/services/caregiver.ts` | 6 | Firestore + callable |
| `mobile/src/services/firebase.ts` | 1 | Re-export client module |
| `mobile/package.json` | 1 | Firebase SDK deps |
| `mobile/.env.example` | 0 | ลบ Supabase/Gemini key |
| `mobile/README.md` | 0 | Firebase stack |
| `platform/analytics/main.py` | 3 | Job entrypoint |
| `platform/analytics/rapids_pipeline.py` | 3 | cuDF จริง, ลบ simulated |
| `platform/analytics/Dockerfile` | 3 | RAPIDS + job CMD |
| `functions/src/index.ts` | 5 | App Check, Secret Manager |
| `firestore.rules` | 2, 7 | Validation, tests |
| `README.md` | 0, 8 | Architecture overview |

### 20.3 ไฟล์ที่ต้องสร้างใหม่

| ไฟล์ | Phase | วัตถุประสงค์ |
|------|-------|-------------|
| `mobile/src/services/firebase-client.ts` | 1 | Firebase SDK init |
| `mobile/src/services/firestore-converters.ts` | 2 | Type-safe converters |
| `functions/src/exportDoseEvents.ts` | 3 | GCS export |
| `functions/src/explainRiskScore.ts` | 5 | Gemini explanation |
| `platform/analytics/gcs_io.py` | 3 | GCS read/write |
| `platform/analytics/bigquery_io.py` | 3 | BigQuery load |
| `platform/analytics/firestore_io.py` | 3 | Risk summary write |
| `platform/analytics/feature_engineering.py` | 3 | Rolling features |
| `platform/analytics/risk_model.py` | 3 | Scoring + reason codes |
| `platform/analytics/benchmark.py` | 3 | CPU vs GPU |
| `platform/analytics/deploy/cloudrun-job.yaml` | 3 | Job config |
| `tools/seed_clinical_catalog.mjs` | 2 | Admin SDK seed |
| `.github/workflows/ci.yml` | 7 | CI pipeline |
| `scripts/check-google-only.sh` | 7 | Vendor scan |
| `docs/DEPLOYMENT.md` | 8 | Deploy guide |
| `docs/DEMO.md` | 8 | Demo script |

### 20.4 ไฟล์ที่มีอยู่แล้วและใช้ต่อได้

| ไฟล์ | สถานะ |
|------|-------|
| `firebase.json` | ✅ ใช้ได้ |
| `.firebaserc` | ✅ ใช้ได้ |
| `firestore.rules` | ⚠️ ต้อง harden |
| `storage.rules` | ⚠️ ต้อง harden |
| `functions/src/index.ts` | ⚠️ ต้อง enhance |
| `platform/analytics/bigquery_schema.sql` | ✅ ใช้ได้ |
| `docs/architecture/LOOKER_DASHBOARD_SPEC.md` | ✅ ใช้เป็น blueprint |
| `docs/MaCheck-Competition-Track-Addendum-TH.md` | ✅ Policy authoritative |
| `mobile/src/utils/safety.ts` | ✅ ใช้ได้ |
| `mobile/src/data/medicine-db.ts` | ✅ ใช้เป็น fallback |

---

## สรุป

แผนนี้ครอบคลุม 8 phases ใช้เวลา 24–36 วันทำงาน โดย **Critical Path คือ Phase 0 → 1 → 2 → 3 → 4/8**

**ลำดับความสำคัญ:**
1. 🔴 Phase 0: ล้าง legacy + rotate API key
2. 🔴 Phase 1–2: Firebase mobile integration
3. 🔴 Phase 3: Analytics pipeline จริง
4. 🟡 Phase 4–5: Looker + Gemini explanation
5. 🟢 Phase 6–8: Caregiver, testing, demo (stretch)

**เมื่อทำครบ:** MaCheck จะเป็น submission ที่พิสูจน์ได้ว่าใช้ Google Cloud + NVIDIA acceleration ตามกติกาการแข่งขัน และตอบคำถาม decision-support ได้จริง

---

*เอกสารนี้จัดทำจากการ audit repository ณ 23 กรกฎาคม 2026 — อัปเดตเมื่อมีความคืบหน้า*
