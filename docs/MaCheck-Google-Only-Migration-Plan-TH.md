# แผนปรับ YaCheck เป็น MaCheck สำหรับส่งแข่งขัน Google

> เอกสารส่งต่อให้ Antigravity  
> อ้างอิงสถานะ repository ณ วันที่ 23 กรกฎาคม 2026  
> ขอบเขต: วางแผนเท่านั้น ยังไม่ถือว่าระบบ Firebase/Gemini ใน repository ใช้งานจริง

## 1. เป้าหมายและกติกาที่ต้องยึด

เปลี่ยนแอปสำเนา YaCheck ให้เป็น MaCheck โดย:

1. โมเดล Generative AI ทุกตัวต้องเป็นโมเดลของ Google เท่านั้น
2. ฐานข้อมูลหลักและข้อมูลผู้ใช้ทั้งหมดต้องอยู่ใน Firebase Cloud Firestore
3. Authentication ใช้ Firebase Authentication
4. Backend ใช้ Cloud Functions for Firebase รุ่นที่ 2
5. Push notification ใช้ Firebase Cloud Messaging (FCM)
6. ไฟล์ภาพหรือไฟล์แนบที่ต้องอัปโหลดใช้ Cloud Storage for Firebase
7. AI ที่เรียกจากแอปต้องผ่าน Firebase AI Logic หรือ Cloud Functions ที่เรียก Vertex AI/Gemini ห้ามฝัง Gemini API key ใน mobile app
8. Admin web ต้องโฮสต์ด้วย Firebase Hosting หรือ Firebase App Hosting
9. ต้องไม่มี Supabase, NVIDIA NIM/RAPIDS, OpenAI SDK/provider, Anthropic, Vercel runtime, Cloudflare D1/R2 หรือโมเดลจากผู้ให้บริการอื่นใน submission build
10. ฟังก์ชันด้านความปลอดภัยของยาใช้ deterministic rule engine และฐาน clinical ที่ผู้เชี่ยวชาญตรวจทานแล้ว ส่วน Gemini มีหน้าที่อ่านภาพ จัดโครงสร้างข้อมูล อธิบาย และสนทนา ห้ามให้ LLM เป็นผู้ตัดสินผล drug interaction เพียงลำพัง

### ขอบเขตคำว่า “Google-only” ที่ใช้ในแผนนี้

- Expo/React Native, TypeScript และ Zustand เป็น framework/library ไม่ใช่โมเดลหรือฐานข้อมูล จึงคงไว้ได้
- EAS อาจใช้เพื่อ build binary ได้ถ้ากติกาการแข่งขันห้ามเฉพาะโมเดลและฐานข้อมูล แต่ production runtime ห้ามพึ่ง Expo Push Service ให้ใช้ FCM โดยตรง
- ถ้ากติกาจริงกำหนดว่า cloud service ทุกตัวต้องเป็น Google ด้วย ให้ใช้ Firebase Hosting/App Hosting, Cloud Functions, Cloud Storage, FCM, Crashlytics, Analytics, Remote Config และ Cloud Logging ตามแผนนี้
- BigQuery ให้เป็นเพียง analytics export แบบไม่ใช่ source of truth และไม่ต้องเปิดใช้ใน submission รุ่นแรก หากข้อความกติกาตีความว่าฐานเก็บข้อมูลทุกชนิดต้องเป็น Firebase

## 2. ผลตรวจ repository ปัจจุบัน

### 2.1 สิ่งที่มีอยู่จริงและใช้ต่อได้

- Mobile app อยู่ใน `mobile/` ใช้ Expo Router, React Native, TypeScript และ Zustand
- มี local-first state, SecureStore, SQLite/local storage, กล้อง, local notification และ deterministic medication safety utilities
- มีข้อมูลยาและกฎ interaction แบบ bundled fallback ใน `mobile/src/data/medicine-db.ts`
- มีหน้าจอหลัก ได้แก่ home, cabinet, add medicine, scanner, safety, history, caregiver, settings และ AI agent
- `mobile/app.json` เปลี่ยน display name, slug, scheme, iOS bundle ID และ Android package เป็น MaCheck ในระดับ Expo config แล้ว
- `npm run typecheck` ผ่าน ณ วันที่ตรวจ
- มีข้อมูล migration และเอกสาร clinical import ที่นำมาแปลงเป็น seed สำหรับ Firestore ได้

### 2.2 สิ่งที่ดูเหมือนย้ายแล้ว แต่ยังไม่ใช่ระบบจริง

ห้าม Antigravity ถือว่างานต่อไปนี้เสร็จแล้ว:

- `mobile/src/services/auth.ts` คืน token ปลอมจาก `Date.now()` ทั้ง register/login/recovery
- `mobile/src/services/caregiver.ts` เป็น stub: รายการความสัมพันธ์และข้อความคืน array ว่าง ฟังก์ชันเขียนส่วนใหญ่ไม่มี implementation
- `mobile/src/services/agent.ts` มี backend response แบบ hard-code และรายงาน connectivity ว่า ready จาก config จำลอง
- `mobile/src/services/firebase.ts` เรียก Firestore REST API โดยตรงด้วย API key และไม่มี Firebase Auth ID token
- การ sync profile เขียนลง `user_profiles/current_user` ทำให้ผู้ใช้ทุกคนชน document เดียวกัน
- การ sync medication อ่านทั้ง collection `patient_medications` โดยไม่จำกัด `uid`
- `deleteRemoteMedication()` แค่ log แต่ไม่ได้ลบหรือทำ soft-delete
- profile, dose events, taken history และ caregiver data ยังไม่ได้ sync อย่างครบถ้วน
- Firestore decoder/encoder รองรับชนิดข้อมูลไม่ครบ เช่น nested map, timestamp, null และ array ที่ไม่ใช่ string
- `EXPO_PUBLIC_GEMINI_API_KEY` ถูกออกแบบให้ไปอยู่ใน client และโค้ดเรียก Generative Language API โดยตรง
- fallback ของ scanner คืนผล Paracetamol ที่ดูเหมือน AI วิเคราะห์สำเร็จ แม้ไม่มี model จริง
- `platform/gcp_functions/gemini_agent.py` เป็น mock response ไม่ได้เรียก Gemini SDK จริง
- `tools/migrate_to_firebase.mjs` ใช้ demo API key, seed ขนาดเล็ก และ Firestore REST ไม่ใช่ migration ที่ตรวจสอบความครบถ้วนได้

### 2.3 โฟลเดอร์ที่ชื่อ Firebase แต่ภายในยังเป็น Supabase

`platform/firebase/` ปัจจุบันเป็นไฟล์ Supabase เดิมที่ถูกย้ายชื่อ:

- `config.toml` เป็นรูปแบบ Supabase CLI
- `migrations/*.sql` เป็น PostgreSQL schema, RLS, RPC, `auth.users` และ `supabase_vault`
- `functions/*` เป็น Deno Supabase Edge Functions
- หลาย function ยัง import `@supabase/supabase-js`
- `agent-run` และ `agent-admin` ยังเรียก NVIDIA NIM

ต้อง archive เพื่ออ้างอิง schema เท่านั้น แล้วสร้าง Firebase backend ใหม่จากศูนย์ ห้ามแก้ชื่อ class/comment แล้วถือว่าเป็น Firebase

### 2.4 ของเดิมที่ขัดกับ submission

- Root `package.json` มี `@langchain/openai` และ OpenAI-compatible stack
- `api/chat.js` เรียก NVIDIA NIM ผ่าน LangChain/OpenAI provider บน Vercel
- `platform/analytics/` ใช้ NVIDIA RAPIDS/CUDA
- `js/agent.js` มี NVIDIA model selector และ NIM calls
- `js/app.js` ยังอ้าง `SupabaseService`
- `platform/README.md`, `mobile/README.md`, production checklist และเอกสาร output หลายไฟล์ยังอธิบาย Supabase/NVIDIA
- native iOS/Android ยังมีชื่อ `YaCheck`, `com.yacheck.app` และ URL schemes เดิม แม้ `app.json` จะเป็น MaCheck แล้ว
- `vercel.json` และ prototype บางส่วนยังอ้าง Vercel/OpenAI/Cloudflare
- Admin console เดิมถูกลบจาก working tree แต่ยังไม่มี Firebase Admin console ตัวใหม่

### 2.5 ข้อควรระวังเรื่อง working tree

working tree ปัจจุบันมีการแก้และลบไฟล์จำนวนมากอยู่แล้ว ก่อนเริ่ม implementation ต้อง:

1. ตรวจ `git status` และบันทึก snapshot ที่กู้คืนได้
2. ห้าม `git reset --hard`, ห้าม checkout ทับ และห้ามลบงานที่ยังไม่ได้ commit
3. สร้าง branch สำหรับ migration หลังยืนยันว่า snapshot ปลอดภัย
4. แยก legacy reference ออกจาก production source โดยเก็บไว้ใน tag/branch ไม่ใช่ค้างใน submission branch

## 3. สถาปัตยกรรมเป้าหมาย

```text
MaCheck Mobile (Expo development build / React Native)
  ├─ Firebase Authentication
  ├─ Cloud Firestore native SDK + offline persistence
  ├─ Cloud Storage for Firebase
  ├─ Firebase Cloud Messaging
  ├─ Firebase App Check
  ├─ Firebase Remote Config
  ├─ Crashlytics / Performance / Analytics
  └─ HTTPS Callable Functions
       ├─ caregiver invitation and messaging
       ├─ account lifecycle
       ├─ clinical catalog publishing
       ├─ agent orchestration and quotas
       ├─ audit logging
       └─ Gemini on Vertex AI / Firebase AI Logic
            ├─ label and package image extraction
            ├─ structured clinical intake
            ├─ safe explanation of deterministic findings
            └─ chat with safety guardrails

Cloud Firestore
  ├─ private user data
  ├─ medication cabinet and dose events
  ├─ caregiver access and messages
  ├─ reviewed clinical catalog
  ├─ agent runs and evidence references
  └─ admin audit trail

MaCheck Admin Web
  ├─ Firebase Authentication + admin custom claims
  ├─ callable admin functions
  └─ Firebase Hosting / App Hosting
```

### เทคโนโลยีที่ให้ Antigravity ใช้

| งาน | เทคโนโลยีเป้าหมาย |
|---|---|
| Mobile | Expo/React Native + development build |
| Firebase native integration | `@react-native-firebase/app`, `auth`, `firestore`, `functions`, `messaging`, `app-check`, `storage`, `crashlytics`, `analytics`, `remote-config` |
| Database | Cloud Firestore Native mode |
| Offline | Firestore native offline persistence; Zustand ใช้เป็น view/session state ไม่เป็นฐานข้อมูล cloud จำลอง |
| Backend | Cloud Functions for Firebase 2nd gen, Node.js + TypeScript |
| AI orchestration | Google Gen AI SDK/Vertex AI SDK หรือ Genkit ที่ใช้ Google provider เท่านั้น |
| Default AI model | stable Gemini Flash model ที่ Firebase AI Logic/Vertex AI รองรับ ณ วัน implement; pin model ID ผ่าน server config |
| Higher-reasoning model | stable Gemini Pro model เฉพาะ admin-reviewed workflow และต้อง allowlist |
| Vision/OCR | Gemini multimodal model ผ่าน backend/Firebase AI Logic |
| Push | FCM; iOS ส่งผ่าน FCM-to-APNs ซึ่งเป็นข้อกำหนดของแพลตฟอร์ม Apple |
| Web admin | Firebase Hosting สำหรับ SPA หรือ App Hosting สำหรับ Next.js |
| Secrets | Google Cloud Secret Manager ผ่าน Functions secret parameters |
| Security | Firebase Auth + Firestore/Storage Rules + App Check + IAM |
| Local test | Firebase Local Emulator Suite |
| Monitoring | Crashlytics, Performance Monitoring, Cloud Logging/Error Reporting |

ห้ามใช้ generic OpenAI-compatible client แม้ชี้ endpoint ไป Google เพราะทำให้ audit ยาก ให้ใช้ Google/Firebase SDK โดยตรง

## 4. Authentication ที่แนะนำ

### ตัวเลือกหลัก: Firebase Auth + Google Sign-In

ใช้ Google Sign-In เป็นวิธีหลักสำหรับงานแข่งขัน เพราะเป็น Google-only, ใช้งานจริง และไม่ต้องทำ password gateway เอง

- Firebase Auth UID เป็น canonical user ID
- เก็บ email ไว้เฉพาะ Firebase Auth ไม่คัดลอกลง Firestore โดยไม่จำเป็น
- ใน Firestore เก็บ `handle`, `displayName`, `role`, settings และ health data
- ผู้ใช้เลือก unique handle หลัง sign-in เพื่อใช้เชิญ caregiver
- handle mapping อ่านได้เฉพาะ callable function เพื่อไม่เปิด directory ผู้ใช้

### ตัวเลือกเสริม: Anonymous Auth สำหรับกรรมการทดลองเร็ว

- เพิ่ม “ทดลองใช้” ด้วย Anonymous Auth
- สร้าง demo data เฉพาะ UID นั้น
- เตือนว่าต้อง link บัญชี Google ก่อนเปลี่ยนเครื่อง/ลบแอป
- ห้ามใช้ anonymous account เป็นวิธีหลักของ caregiver production flow

### สิ่งที่ไม่ควรทำ

- ไม่เก็บ password hash เองใน Firestore
- ไม่สร้าง token ปลอม
- ไม่ใช้ shared `current_user`
- ไม่ใช้ API key เป็นหลักฐาน authentication
- ไม่ฝัง service account JSON ใน repository หรือ app
- ไม่ทำ username/password custom auth จนกว่าจะมีเหตุผลชัดเจนและ security review

## 5. Firestore data model

ใช้ `uid` จาก Firebase Auth เป็น partition หลัก และใช้ server timestamp ทุกจุดที่เป็นเวลา authoritative

### 5.1 ข้อมูลผู้ใช้

```text
users/{uid}
  handle: string
  displayName: string
  role: "patient" | "caregiver"
  diseases: string[]
  allergies: Allergy[]
  weightKg?: number
  fontScale: "normal" | "large" | "xlarge"
  soundEnabled: boolean
  emergencyContact?: { name, phone }
  consentVersion: string
  privacyPolicyVersion: string
  createdAt: timestamp
  updatedAt: timestamp
  schemaVersion: number

privateHandles/{normalizedHandle}
  uid: string
  createdAt: timestamp
```

`privateHandles` ต้อง deny direct client read/write ทั้งหมด ใช้ callable function ค้นหาเท่านั้น

### 5.2 ตู้ยาและประวัติการกิน

```text
users/{uid}/medications/{clientId}
  medicationCode?: string
  customName?: string
  tabletCount?: number
  dosageMg?: number
  dosageText?: string
  schedules: string[]
  mealTiming: "before" | "after" | "any"
  status: "active" | "stopped"
  sourceApp: "macheck"
  createdAt: timestamp
  updatedAt: timestamp
  deletedAt?: timestamp
  schemaVersion: number

users/{uid}/doseEvents/{eventId}
  medicationClientId: string
  slot: string
  eventDate: "YYYY-MM-DD"
  taken: boolean
  occurredAt: timestamp
  sourceApp: "macheck"
  idempotencyKey: string

users/{uid}/activityLogs/{eventId}
  type: string
  text: string
  occurredAt: timestamp
  sourceApp: "macheck"
```

กำหนด `eventId` แบบ deterministic จาก `uid + medicineClientId + localDate + slot` หรือใช้ idempotency key เพื่อป้องกัน event ซ้ำเมื่อ offline retry

### 5.3 Caregiver consent และข้อความ

```text
users/{patientUid}/caregiverAccess/{caregiverUid}
  status: "active" | "revoked"
  permissions:
    readProfile: boolean
    readMedications: boolean
    readDoseEvents: boolean
    sendMessages: boolean
  createdAt: timestamp
  revokedAt?: timestamp

caregiverInvites/{inviteId}
  patientUid: string
  caregiverUid: string
  invitedByUid: string
  status: "pending" | "accepted" | "declined" | "cancelled" | "expired"
  expiresAt: timestamp
  createdAt: timestamp

caregiverThreads/{threadId}
  patientUid: string
  caregiverUid: string
  participantUids: string[]
  active: boolean
  updatedAt: timestamp

caregiverThreads/{threadId}/messages/{messageId}
  senderUid: string
  kind: "message" | "check_schedule" | "contact_caregiver"
  text: string
  createdAt: timestamp
  readBy: map<uid, timestamp>
```

สร้าง `threadId = hash(patientUid + caregiverUid)` หรือ deterministic canonical pair เพื่อไม่เกิด thread ซ้ำ

### 5.4 Device token

```text
users/{uid}/devices/{deviceId}
  fcmToken: string
  platform: "android" | "ios"
  appVersion: string
  enabled: boolean
  updatedAt: timestamp
```

client เขียน token ของ UID ตัวเองได้ แต่ Cloud Function เท่านั้นที่อ่าน token และส่ง FCM

### 5.5 Clinical catalog

```text
clinicalReleases/{releaseId}
  version: number
  status: "draft" | "published" | "retired"
  sourceSummary: string
  checksum: string
  reviewedBy: string
  reviewedAt: timestamp
  publishedAt?: timestamp

clinicalMedications/{medicationCode}
  nameEn: string
  nameTh: string
  category: string
  commonDosagesMg: number[]
  descriptionTh: string
  active: boolean
  releaseId: string
  reviewedAt: timestamp

clinicalInteractions/{canonicalPairId}
  drug1: string
  drug2: string
  severity: "moderate" | "severe"
  titleTh: string
  descriptionTh: string
  adviceTh: string
  releaseId: string
  reviewedAt: timestamp

clinicalFoodInteractions/{code}
  foodTh: string
  keywords: string[]
  medicationCodes: string[]
  diseaseCodes: string[]
  severity: "moderate" | "severe"
  descriptionTh: string
  releaseId: string
  reviewedAt: timestamp
```

- Client อ่านเฉพาะ release ที่ `published`
- Client ห้ามเขียน clinical catalog
- Admin ไม่เขียน Firestore ตรง ให้เรียก callable function ที่ validate schema, custom claim และ audit
- publish เป็น atomic transaction: validate draft, เปลี่ยน active release pointer และบันทึก audit

### 5.6 AI runs และ audit

```text
users/{uid}/agentRuns/{runId}
  intent: string
  status: "queued" | "running" | "completed" | "failed"
  modelId: string
  promptVersion: string
  executionMode: "live" | "rules_only"
  safetyFlags: string[]
  evidenceRefs: EvidenceRef[]
  requestHash: string
  createdAt: timestamp
  completedAt?: timestamp
  expiresAt: timestamp

adminAuditLogs/{auditId}
  actorUid: string
  action: string
  targetType: string
  targetId: string
  beforeHash?: string
  afterHash?: string
  requestId: string
  createdAt: timestamp
```

ไม่เก็บ raw image, full prompt หรือ health text ระยะยาวถ้าไม่จำเป็น กำหนด retention และลบด้วย scheduled function

## 6. Firestore Security Rules ที่ต้องมี

### หลักการ

1. default deny
2. clinical published data: authenticated read-only
3. user เป็นเจ้าของ document ใต้ `users/{uid}`
4. caregiver อ่านได้เฉพาะ patient ที่มี active access document และ permission ตรงประเภทข้อมูล
5. caregiver ห้ามแก้ profile, medication และ dose event ของ patient
6. invitation, access grant/revoke, admin publish และ FCM send ทำผ่าน callable functions
7. server-side Admin SDK bypass rules จึงต้องตรวจ Auth/App Check/custom claims ซ้ำใน function
8. validate allowed fields, enum, string length, array length, timestamp และ ownership ใน rules
9. queries ต้องมี constraint สอดคล้องกับ rules เพราะ Firestore Rules ไม่ใช่ตัวกรองข้อมูล

### Test matrix ขั้นต่ำ

| กรณี | ผลที่ต้องได้ |
|---|---|
| unauthenticated อ่าน user data | deny |
| user A อ่าน/เขียน user A | allow ตาม field |
| user A อ่าน user B | deny |
| active caregiver อ่าน medication/dose ของ patient | allow |
| caregiver เขียน medication ของ patient | deny |
| revoked caregiver อ่าน patient | deny ทันที |
| client เขียน clinical catalog | deny |
| non-admin เรียก publish function | deny |
| admin custom claim ถูกต้อง + App Check | allow |
| client อ่าน private handle mapping | deny |
| client อ่าน FCM token ของคนอื่น | deny |
| malformed field/oversized message | deny |

ต้องมี automated tests ด้วย Emulator Suite และ `@firebase/rules-unit-testing` ไม่ยอมรับเฉพาะการลองกดด้วยมือ

## 7. AI design แบบ Google-only และปลอดภัย

### 7.1 Workflow ที่ถูกต้อง

```text
User input/image
  → client validation
  → Firebase Auth + App Check
  → callable Cloud Function
  → schema validation + rate limit + consent check
  → fetch minimum necessary Firestore context
  → deterministic safety engine
  → Gemini structured extraction/explanation
  → post-generation safety validator
  → store evidence/model/prompt metadata
  → return typed response
```

### 7.2 แบ่งหน้าที่ model

- Scanner: Gemini multimodal อ่านชื่อยา, generic name, strength และข้อความบนฉลากเป็น structured JSON
- Clinical intake: Gemini ถามข้อมูลต่อที่จำเป็นและจัด structured symptom summary
- Agent summary: deterministic engine คำนวณ adherence, allergy name match และ interaction ก่อน แล้ว Gemini เรียบเรียงให้อ่านง่าย
- Chat: Gemini ให้ข้อมูลทั่วไปและอธิบายข้อมูลในแอป แต่ห้ามวินิจฉัย ห้ามสั่งหยุดยา ห้ามปรับ dose
- Red flags: code/rule engine บังคับ emergency escalation โดยไม่รอ model ตัดสินใจ

### 7.3 ข้อกำหนดทางเทคนิค

- ใช้ response schema/structured output
- temperature ต่ำสำหรับ clinical extraction
- allowlist model ID ฝั่ง server
- model ID และ prompt version มาจาก server config/Remote Config ไม่รับค่าตามใจ client
- ไม่แสดง prefix ปลอม เช่น `[Google Gemini ...]` ถ้าไม่ได้เรียก model สำเร็จจริง
- offline fallback ต้องระบุชัดว่า “โหมดกฎความปลอดภัยในเครื่อง” ไม่ใช่ผล AI
- network/model error ต้องคืน typed error ห้ามคืน hard-coded success
- sanitize output และจำกัด Markdown/URL
- ป้องกัน prompt injection: รูปฉลากและข้อความผู้ใช้เป็น untrusted content; ห้ามให้แก้ system policy หรือสั่ง tool
- tool/function calling ใช้ allowlist และ read-only default
- ห้าม Gemini เขียน medication, dose event หรือ caregiver access โดยตรง การเปลี่ยนข้อมูลต้องยืนยันจากผู้ใช้และผ่าน domain validator
- ข้อมูลสุขภาพส่งให้ model เท่าที่จำเป็นและต้องมี consent

### 7.4 AI evaluation

สร้างชุดทดสอบ versioned อย่างน้อย:

- 20 เคส drug interaction จาก clinical catalog
- 10 เคส allergy/name ambiguity
- 10 เคส red-flag symptom
- 10 เคส instruction บนฉลากยาไทย
- 10 เคส prompt injection/adversarial
- 10 เคส missing/blurred image และ low confidence

เกณฑ์:

- severe deterministic cases ต้องไม่ตกหล่น
- ห้ามมีคำสั่งหยุดยา/เพิ่มยา/ลด dose โดยไม่ได้บอกให้พบแพทย์หรือเภสัชกร
- invalid JSON ต้อง retry อย่างจำกัดหรือ fail closed
- low confidence scanner ต้องให้ผู้ใช้ยืนยัน ห้ามเพิ่มยาเข้าตู้อัตโนมัติ
- ทุกผล AI มี `modelId`, `promptVersion`, `generatedAt`, `confidence/limitations` และ evidence reference

## 8. Mapping จากโค้ดเดิมไปโค้ดใหม่

| ของเดิม | การดำเนินการ |
|---|---|
| `mobile/src/services/firebase.ts` | เขียนใหม่เป็น Firebase native initialization/modules ห้าม REST CRUD เอง |
| `mobile/src/services/auth.ts` | เขียนใหม่ด้วย Firebase Auth Google Sign-In + Anonymous/link flow |
| `mobile/src/services/sync.ts` | แยก profile/medication/dose repositories ใช้ UID path, listeners, batch/transaction และ server timestamps |
| `mobile/src/services/caregiver.ts` | implement ด้วย callable functions + Firestore listeners |
| `mobile/src/services/caregiver-messaging.ts` | เปลี่ยน Expo remote push flow เป็น FCM; local notification ยังใช้ได้ |
| `mobile/src/services/clinical-catalog.ts` | อ่าน published Firestore catalog + cache metadata/checksum + bundled fallback |
| `mobile/src/services/google-cloud.ts` | ยกเลิก public Gemini key และ direct REST; เหลือ typed function/AI Logic client |
| `mobile/src/services/agent.ts` | ต่อ callable agent backend จริง ลบ hard-coded success และแก้ข้อความ Supabase |
| `mobile/src/store/use-app-store.ts` | ให้ store สะท้อน Firestore state; เก็บ pending offline mutation/idempotency |
| `mobile/src/services/secure-storage.ts` | ไม่เก็บ fabricated token; Firebase SDK จัดการ auth session ส่วน SecureStore เก็บเฉพาะ app-local secret/settings ที่จำเป็น |
| `platform/firebase/` ปัจจุบัน | ย้ายไป legacy reference นอก submission แล้วสร้าง Firebase CLI project ใหม่ |
| `platform/gcp_functions/gemini_agent.py` | ลบ mock หรือแทนด้วย Functions TypeScript ที่เรียก Google SDK จริง |
| `tools/migrate_to_firebase.mjs` | เขียนใหม่ด้วย Firebase Admin SDK + ADC/service account + dry-run + validation report |
| `api/chat.js` | ลบ; แทนด้วย callable Cloud Function |
| `platform/analytics/` | ลบจาก submission; ถ้าต้องการ analytics ใช้ Firebase Analytics/BigQuery export ภายหลัง |
| root LangChain/OpenAI dependencies | ถอนออก |
| `vercel.json` | ลบเมื่อ Firebase Hosting/App Hosting ทำงานแล้ว |
| `admin/` เดิม | สร้างใหม่โดยใช้ Firebase Auth/custom claims/callables และโฮสต์ Firebase |
| `js/*.js` web prototype | ตัดสินใจ archive หรือ migrate; ห้ามค้าง vendor เดิมใน submission |
| เอกสาร/output เก่า | regenerate หรือย้ายออกจาก submission เพราะมี Supabase/NVIDIA claims |

## 9. แผนดำเนินงานเป็น Phase

Antigravity ต้องทำทีละ phase และ commit แยก ห้ามทำ big-bang rewrite ครั้งเดียว

### Phase 0 — Preserve และ baseline

งาน:

- ตรวจ working tree และทำ recoverable snapshot/tag/branch
- บันทึกรายการไฟล์ที่ลบ/แก้/เพิ่มอยู่ก่อนเริ่ม
- รัน baseline: typecheck, lint, unit tests, Expo doctor, Android/iOS build status
- สร้าง `docs/architecture/ADR-001-google-only-stack.md`
- กำหนด banned dependency/string list สำหรับ CI

ผลส่งมอบ:

- baseline report
- branch สำหรับ migration
- ไม่มี user change สูญหาย

Acceptance:

- สามารถกลับสู่ snapshot ก่อน migration ได้
- ระบุ test ที่ผ่าน/ไม่ผ่านจริง ไม่มีการเขียนว่า pass ถ้ายังไม่ได้รัน

### Phase 1 — สร้าง Firebase project structure

งาน:

- ใช้ Firebase project แยก `dev`, `staging`, `prod` ถ้าทรัพยากรพอ อย่างน้อยต้องมี dev และ prod
- รัน Firebase CLI init สำหรับ Firestore, Functions, Storage, Hosting และ Emulators
- สร้าง:

```text
firebase.json
.firebaserc
firestore.rules
firestore.indexes.json
storage.rules
functions/
  src/
  test/
```

- เลือก region ใกล้ผู้ใช้ไทยและใช้ region เดียวกันเท่าที่บริการรองรับ
- เปิด billing budget alert และ quota
- ตั้ง Secret Manager
- ห้าม commit `.env`, service account JSON, GoogleService-Info.plist หรือ google-services.json ที่ไม่ควรเผยแพร่ตามนโยบายทีม

Acceptance:

- Emulator Auth + Firestore + Functions + Storage เปิดพร้อมกันได้
- `firebase deploy --only firestore:rules --project <dev>` ทำได้หลังมีสิทธิ์
- production rules ไม่ใช่ allow-all

### Phase 2 — Rename YaCheck เป็น MaCheck ให้ครบ

งาน:

- เปลี่ยน Android namespace/applicationId/package folders, manifest schemes และ app name
- เปลี่ยน iOS project, target, scheme, product name, bundle identifier, entitlements, bridging header, Podfile และ workspace references
- ตรวจ EAS project ownership และสร้าง MaCheck project ID ใหม่ถ้าของเดิมเป็น YaCheck
- เปลี่ยน deep link `yacheck` → `macheck`
- ตรวจ icon, splash, permission text, notification channel, app display name
- เปลี่ยน package lock metadata, docs และ runtime strings
- อย่า blind replace ชื่อใน historical migration input จนเสีย provenance; legacy archive ระบุชื่อเดิมได้แต่ไม่อยู่ใน submission artifact

Acceptance:

- `rg "YaCheck|yacheck|com\\.yacheck"` ใน tracked production files เป็นศูนย์ ยกเว้น migration provenance ที่ allowlist ไว้
- Android debug build ติดตั้งเป็น `com.macheck.app`
- iOS build product และ scheme เป็น MaCheck
- deep link `macheck://` เปิด route ได้

### Phase 3 — ติดตั้ง Firebase native SDK และ App Check

งาน:

- ติดตั้ง React Native Firebase modules ที่จำเป็น
- วาง `google-services.json` และ `GoogleService-Info.plist` ตาม environment
- เพิ่ม Expo config plugins/build properties ที่จำเป็น
- ตั้ง App Check:
  - Android: Play Integrity
  - iOS: App Attest และ fallback DeviceCheck ตามที่รองรับ
  - Debug token เฉพาะ dev
- สร้าง typed `firebase-client` module และ emulator switch
- ลบ demo/hard-coded Firebase config defaults

Acceptance:

- แอป dev เชื่อม Firebase Emulator ได้
- build ที่ไม่มี config แสดง `NOT_CONFIGURED` จริง ไม่แกล้ง ready
- App Check debug ผ่าน dev และ production enforcement plan มีหลักฐาน

### Phase 4 — Authentication จริง

งาน:

- Google Sign-In → Firebase Auth
- Anonymous demo → link to Google account
- สร้าง onboarding handle ด้วย callable transaction เพื่อรับประกัน unique
- `onAuthStateChanged` เป็น source of truth
- account deletion callable ลบ Firestore subcollections, Storage files, FCM tokens และ Auth account ตาม retention policy
- sign out ล้าง sensitive local cache
- แก้ register/login/settings screens ให้ตรง flow ใหม่

Acceptance:

- token ปลอมทั้งหมดถูกลบ
- restart app แล้ว session จริงคงอยู่
- user A/B มี UID ต่างกันและไม่เห็นข้อมูลกัน
- delete account ผ่าน integration test
- handle collision ถูกปฏิเสธแบบ deterministic

### Phase 5 — Firestore schema, repositories และ sync

งาน:

- implement schema ตามหัวข้อ 5
- สร้าง converters ที่ validate runtime schema
- เปลี่ยน snapshot sync แบบ shared collection เป็น UID-scoped repositories
- ใช้ Firestore listeners + offline persistence
- ใช้ server timestamps และ deterministic IDs
- implement create/update/soft-delete medication
- implement dose event and taken history sync
- จัด conflict policy:
  - server timestamp สำหรับ profile/settings
  - deterministic event ID สำหรับ dose event
  - soft-delete tombstone สำหรับ medication
- แสดงสถานะ `offline`, `syncing`, `synced`, `sync error`

Acceptance:

- ไม่มี document ชื่อ `current_user`
- offline create/toggle แล้วกลับ online ซิงก์ครั้งเดียว
- delete ทำงานจริงและไม่ฟื้นจาก stale client
- profile/cabinet/dose history ครบหลัง login เครื่องใหม่
- cross-user read/write tests ถูก deny

### Phase 6 — ย้าย clinical catalog จาก Supabase/ไฟล์

งาน:

- export source data เป็น canonical JSON พร้อม provenance
- เขียน Admin SDK migration tool:
  - `--dry-run`
  - `--project`
  - `--input`
  - schema validation
  - deterministic IDs
  - batched writes
  - resume/checkpoint
  - count/checksum report
- canonical interaction pair ต้อง sort drug codes ก่อนสร้าง ID
- import เป็น draft release
- ให้ผู้มีสิทธิ์ publish ผ่าน admin workflow
- app อ่าน release ที่ published และ fallback เป็น bundled catalog เมื่อ offline/empty

Acceptance:

- จำนวน medication/interactions/food interactions ก่อนและหลังตรงกัน
- duplicate/conflict report เป็นศูนย์หรือมี signed review
- checksum ตรง
- ไม่มี demo key/hard-coded project ใน migration script
- ไม่มี empty production collection ที่ UI แสดงว่า fresh
- clinical fields สำคัญผ่าน pharmacist/manual sampling

### Phase 7 — Caregiver consent และ FCM

งาน:

- callable functions: invite, accept, decline, cancel, revoke, send message
- lookup handle ฝั่ง server
- ใช้ transaction ป้องกัน invite/link ซ้ำ
- Security Rules ให้ caregiver อ่านอย่างเดียวตาม permission
- Firestore listener สำหรับ inbox/unread state
- register/rotate/revoke FCM token
- Firestore trigger หรือ callable ส่ง FCM จาก trusted environment
- local medication reminders คง on-device

Acceptance:

- invite/accept/revoke ทำงานสองบัญชีจริง
- revoke แล้ว read access หายทันที
- caregiver ไม่สามารถแก้ตู้ยาของ patient
- push ถึง Android device จริง; iOS ทดสอบตาม signing/APNs credential ที่มี
- message retry ไม่ส่งซ้ำ
- FCM token ไม่อ่านได้จาก client คนอื่น

### Phase 8 — Gemini agent และ scanner จริง

งาน:

- สร้าง callable `runAgent`, `chatAgent`, `scanMedicationLabel`
- เรียก Gemini ผ่าน Google SDK/Vertex AI หรือ Firebase AI Logic เท่านั้น
- ย้าย API key/credential ออกจาก client
- structured output schemas
- ต่อ deterministic safety functions ที่มีอยู่
- rate limit ต่อ UID/device, request idempotency, timeout, retry แบบจำกัด
- บันทึก model ID, prompt version, safety flags, evidence refs
- แยก offline rules-only response ให้ชัดเจน
- ลบ mock Paracetamol, hard-coded success และ fake connectivity

Acceptance:

- เมื่อไม่มี backend/model ระบบต้อง fail honestly หรือ rules-only ไม่ใช่ fake live
- secret scan ไม่พบ Gemini key ใน mobile bundle
- App Check/Auth ขาดแล้ว function ปฏิเสธ
- scanner low confidence ต้องให้ผู้ใช้ยืนยัน
- AI evaluation ผ่านเกณฑ์หัวข้อ 7.4
- ไม่มีชื่อ NVIDIA/OpenAI/Anthropic/model นอก Google ใน runtime/config

### Phase 9 — Admin console บน Firebase

งาน:

- สร้าง admin web ใหม่
- Firebase Auth + `admin`/`clinicalReviewer` custom claims
- dashboard อ่านผ่าน scoped queries หรือ callable functions
- draft/edit/validate/publish clinical release
- audit log ทุก mutation
- ห้าม client web ใช้ Admin SDK/service account
- deploy Firebase Hosting/App Hosting

Acceptance:

- non-admin เปิด route หรือเรียก function ไม่ได้
- publish ต้องมี validation + audit
- secret ไม่อยู่ใน web bundle
- URL production อยู่บน Firebase

### Phase 10 — ล้าง non-Google stack และเอกสาร

งาน:

- ถอน `@supabase/supabase-js`
- ถอน `@langchain/openai`, `openai` และ NVIDIA packages/images
- ลบ `api/chat.js`, Vercel config และ NVIDIA analytics จาก submission
- ลบ/ย้าย Supabase SQL/Edge Functions ไป legacy tag/branch
- ตรวจ prototype และ generated outputs ไม่ให้กรรมการเข้าใจผิด
- เขียน README, architecture, setup, privacy, data flow และ model disclosure ใหม่

ใช้ CI gate อย่างน้อย:

```bash
rg -n -i \
  'supabase|nvidia|nemotron|openai|anthropic|claude|vercel|cloudflare|d1|r2' \
  --glob '!package-lock.json' \
  --glob '!docs/legacy/**' \
  .
```

ผลต้องเป็นศูนย์ใน submission scope หรือมี allowlist พร้อมเหตุผลที่ไม่ใช่ runtime/dependency

Acceptance:

- dependency tree ไม่มี SDK/provider ต้องห้าม
- source/runtime/config ไม่มี endpoint ต้องห้าม
- README ระบุ architecture ที่ตรงกับของจริง
- ไม่มีเอกสาร claim ว่าฟีเจอร์ live ถ้ายังเป็น mock

### Phase 11 — Verification และ submission

ต้องรัน:

- TypeScript typecheck
- ESLint
- unit tests
- Firestore/Storage Rules tests
- Functions unit/integration tests
- Emulator end-to-end tests
- Android build/install/smoke test
- iOS build/smoke test เท่าที่ credential รองรับ
- offline/online sync test
- two-account caregiver test
- App Check enforcement test
- secret/dependency/vendor scan
- AI safety evaluation
- accessibility and Thai font/large text test
- account deletion/privacy test

Submission artifacts:

- architecture diagram
- 3–5 นาที demo script
- test report
- model disclosure: model IDs และหน้าที่
- Firebase products list
- clinical safety limitations
- privacy/consent statement
- README setup ที่ทำซ้ำได้
- screenshots/video ที่มาจาก live integration ไม่ใช่ mock

## 10. ลำดับความสำคัญหากเวลาจำกัด

### P0 — ต้องเสร็จก่อนส่ง

- Firebase Auth จริง
- UID-scoped Firestore + Security Rules tests
- medication/profile/dose sync จริง
- clinical catalog บน Firestore
- Gemini จริงผ่าน secure Google path
- ลบ fake success/demo data ที่แอบทำเหมือน live
- ลบ Supabase/NVIDIA/OpenAI runtime และ claims
- rename MaCheck ครบ

### P1 — ควรเสร็จ

- caregiver consent จริง
- FCM จริง
- App Check enforced
- admin publish workflow
- AI evaluation report

### P2 — ทำเมื่อ P0/P1 เสถียร

- advanced analytics
- BigQuery export
- Pro-model workflow
- dashboard เชิงลึก
- multi-environment automation เต็มรูปแบบ

อย่าเสียเวลาเพิ่ม NVIDIA/GPU analytics เพื่อให้ demo ดูใหญ่ เพราะขัดกติกาและไม่ได้แก้ core safety/use case

## 11. Definition of Done ของทั้งโครงการ

งานจะถือว่าเสร็จเมื่อครบทุกข้อ:

- [ ] MaCheck build ได้ทั้ง target ที่จะส่งและติดตั้งบนเครื่องจริง
- [ ] ไม่มี YaCheck identifier ใน production artifact
- [ ] Firebase Auth เป็น authentication จริง ไม่มี fabricated token
- [ ] ข้อมูลผู้ใช้ทุกชนิดอยู่ใต้ UID และแยก tenant ถูกต้อง
- [ ] Firestore/Storage default deny และ Rules tests ผ่าน
- [ ] clinical catalog อยู่ใน Firestore และมี published release
- [ ] offline edits ซิงก์โดยไม่ซ้ำและไม่สูญหาย
- [ ] caregiver consent/revoke บังคับได้จริง
- [ ] FCM มาจาก trusted backend
- [ ] Gemini เป็นโมเดล Google เท่านั้นและเรียกผ่าน secure path
- [ ] ไม่มี Gemini API key ใน client/repository
- [ ] deterministic safety engine เป็นผู้คำนวณ interaction/red flags หลัก
- [ ] model failure ไม่ถูกปลอมเป็น success
- [ ] Supabase/NVIDIA/OpenAI/Vercel/Cloudflare ไม่อยู่ใน submission runtime
- [ ] Admin mutation มี custom claim, validation และ audit
- [ ] secret scan/vendor scan/test/build ผ่าน
- [ ] README และ presentation ตรงกับระบบที่ deploy จริง
- [ ] demo ทำงานจาก Firebase/Gemini จริง ไม่ใช้ hard-coded response

## 12. Master Prompt สำหรับส่งให้ Antigravity

คัดลอกข้อความด้านล่างไปใช้ได้:

---

คุณกำลังปรับ repository นี้จากสำเนา YaCheck เป็น MaCheck เพื่อส่งแข่งขัน Google ให้อ่าน `docs/MaCheck-Google-Only-Migration-Plan-TH.md` ทั้งไฟล์ก่อนลงมือ และใช้เอกสารนี้เป็น source of truth

ข้อบังคับ:

1. โมเดล AI ทุกตัวต้องเป็น Google Gemini เท่านั้น
2. ฐานข้อมูลหลักต้องเป็น Firebase Cloud Firestore
3. Auth ใช้ Firebase Authentication, backend ใช้ Cloud Functions for Firebase, push ใช้ FCM, file upload ใช้ Cloud Storage และ web admin ใช้ Firebase Hosting/App Hosting
4. ห้ามใช้ Supabase, NVIDIA, OpenAI provider/SDK, Anthropic, Vercel runtime, Cloudflare database/storage หรือ endpoint ของผู้ให้บริการอื่นใน submission runtime
5. ห้ามฝัง Gemini API key, service account หรือ server secret ใน mobile/web client
6. ห้ามใช้ mock/fake token/hard-coded success แล้วรายงานว่า feature ใช้งานจริง
7. ถ้ายังไม่มี credential หรือ deploy permission ให้ implement + test กับ Emulator แล้วรายงาน blocker ตามจริง ห้ามปลอมผลสำเร็จ
8. deterministic clinical safety engine ต้องเป็นผู้คำนวณ interaction, allergy/red flag และ adherence หลัก Gemini ใช้อ่านภาพ จัดโครงสร้าง และอธิบายเท่านั้น
9. รักษา user changes ใน working tree ห้าม reset/checkout ทับ และต้องทำ recoverable snapshot ก่อน migration
10. ทำทีละ Phase 0–11 commit แยก phase พร้อมรายงานไฟล์ที่เปลี่ยน คำสั่ง test ผล test และงานที่ยังค้าง

เริ่มจาก Phase 0 เท่านั้น:

- ตรวจ `git status`, dependency, vendor references, native identifiers และ test baseline
- ทำ snapshot ที่กู้คืนได้
- สร้าง ADR Google-only
- เสนอ exact file plan สำหรับ Phase 1
- ห้ามเริ่ม deploy หรือลบ legacy จนกว่า snapshot และ baseline จะเรียบร้อย

เมื่อจบแต่ละ phase:

- รัน test/verification ที่เกี่ยวข้อง
- แสดงหลักฐานว่าผ่านจริง
- ตรวจว่าไม่ได้เพิ่ม secret หรือ non-Google model/provider
- อัปเดต checklist ในเอกสาร
- สรุป blocker แบบตรงไปตรงมา

ห้ามตีความว่าโฟลเดอร์ `platform/firebase` ปัจจุบันเป็น Firebase backend ที่ใช้ได้ เพราะภายในยังเป็น Supabase SQL/Deno Edge Functions ต้องสร้าง Firebase CLI backend ใหม่ตามแผน

---

## 13. Prompt แยกตาม Phase สำหรับลดความผิดพลาด

แนะนำให้ส่ง Antigravity ทีละคำสั่ง ไม่สั่ง “ทำทั้งหมด” ในครั้งเดียว:

1. **Audit prompt:** “ทำ Phase 0 เท่านั้น ตรวจและรายงาน ห้ามแก้ business logic”
2. **Firebase bootstrap prompt:** “ทำ Phase 1 พร้อม Emulator tests ห้าม deploy production”
3. **Rename prompt:** “ทำ Phase 2 และพิสูจน์ Android/iOS identifier”
4. **SDK/Auth prompt:** “ทำ Phase 3–4; ห้ามเหลือ fake token”
5. **Firestore prompt:** “ทำ Phase 5 พร้อม Rules tests ของ user A/B/caregiver”
6. **Migration prompt:** “ทำ Phase 6 แบบ dry-run ก่อน ห้าม publish จน count/checksum ผ่าน”
7. **Caregiver prompt:** “ทำ Phase 7 ด้วย two-account integration test”
8. **AI prompt:** “ทำ Phase 8; ลบ public key/direct REST/mock success และแนบ AI eval”
9. **Admin prompt:** “ทำ Phase 9; custom claim + callable + audit เท่านั้น”
10. **Cleanup prompt:** “ทำ Phase 10 โดยอ้าง snapshot; ห้ามลบข้อมูลต้นฉบับที่ยังไม่มี backup”
11. **Release prompt:** “ทำ Phase 11 และสร้าง submission evidence จากผลจริง”

## 14. แหล่งอ้างอิงทางการที่ควรให้ Antigravityตรวจซ้ำก่อน implement

- Firebase AI Logic: https://firebase.google.com/docs/ai-logic
- Protect AI calls with App Check: https://firebase.google.com/docs/ai-logic/app-check
- Firebase Authentication: https://firebase.google.com/docs/auth
- Cloud Firestore Security Rules: https://firebase.google.com/docs/firestore/security/get-started
- Firestore role-based access: https://firebase.google.com/docs/firestore/solutions/role-based-access
- Firestore offline persistence: https://firebase.google.com/docs/firestore/manage-data/enable-offline
- Callable Functions: https://firebase.google.com/docs/functions/callable
- Firebase Cloud Messaging: https://firebase.google.com/docs/cloud-messaging
- Local Emulator Suite: https://firebase.google.com/docs/emulator-suite
- Rules unit testing: https://firebase.google.com/docs/firestore/security/test-rules-emulator
- Firebase App Hosting: https://firebase.google.com/docs/app-hosting
- Vertex AI Gemini function calling/structured output: https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/function-calling

ก่อนเลือก model ID ให้ตรวจ model lifecycle และ stable availability ใน Firebase/Vertex AI console ของ project จริง ห้ามเดาชื่อ model จาก comment หรือเอกสารเก่า
