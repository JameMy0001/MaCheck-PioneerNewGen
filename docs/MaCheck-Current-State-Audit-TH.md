# MaCheck — Current-State Technical Audit

> ตรวจแบบ read-only ณ 23 กรกฎาคม 2026; ไม่ได้แก้ source code ระหว่าง audit
>
> ขอบเขต: mobile application, Firebase backend, security rules, Gemini integration, NVIDIA/BigQuery analytics, native configuration, dependency และความพร้อมส่ง competition track

## Executive verdict

**สถานะ: ยังไม่พร้อมส่งแข่งขัน หรือ claim ว่าเป็น Firebase/Gemini/RAPIDS integration ที่ใช้งานจริงได้**

ระบบอยู่ในช่วง “migration scaffold”: มี UI ใช้งานได้, Firebase Functions build ผ่าน, Firestore Rules มีโครง default-deny และ Android branding เปลี่ยนเป็น MaCheck แล้ว แต่แกนที่ต้องพิสูจน์ตามโจทย์ยังเป็น local/mock/stub เป็นส่วนใหญ่

สิ่งที่แสดงต่อกรรมการได้อย่างซื่อสัตย์ในตอนนี้คือ local medication UX, deterministic offline safety rules, UI ของ decision-support และโครง architecture เท่านั้น ไม่ควร claim ว่า sync Firebase, Google Gemini live, caregiver remote access, BigQuery pipeline, Looker หรือ NVIDIA GPU acceleration ทำงานจริง

## 1. ผลการตรวจคำสั่ง

| รายการ | ผล | หมายเหตุ |
|---|---|---|
| `git status` / `git diff --check` | ผ่าน | working tree สะอาด ไม่มี whitespace error |
| `npm run typecheck` ที่ root | ผ่าน | mobile TypeScript และ Functions TypeScript build ผ่าน |
| `npm run lint` ใน `mobile/` | ผ่านแบบมี 18 warnings | ไม่มี error แต่มี unused imports/variables ใน service สำคัญ |
| `npm run doctor` ใน `mobile/` | ไม่ผ่าน 1/21 checks | native directories มีอยู่ จึงไม่ sync fields จาก `app.json` อัตโนมัติ |
| Functions lint | ไม่ผ่าน | scripts เรียก `eslint` แต่ package ไม่มี ESLint |
| Mobile test | ไม่ผ่าน | ไม่มี test runner/ESM setup; `node --test` โหลด HTTPS import ไม่ได้ |
| Expo static web export | ผ่าน | export HTML ได้; ยืนยันเฉพาะ bundling ไม่ใช่ live integration |
| Python import analytics service | ไม่ผ่าน | `main.py` import function ที่ไม่มีใน `rapids_pipeline.py` |
| Firebase CLI discovery | ไม่ผ่าน | CLI ไม่ถูกติดตั้งใน project/toolchain (`npx firebase` หา executable ไม่พบ) |
| Mobile production dependency audit | ไม่ผ่าน | 11 moderate vulnerabilities |
| Functions production dependency audit | ไม่ผ่าน | 9 moderate vulnerabilities |

## 2. สิ่งที่ทำงานหรือมีโครงสร้างที่ดี

### Mobile/UI

- Expo Router/React Native/TypeScript compile ได้
- Web static export สร้างหน้า home, cabinet, add medicine, safety, scanner, caregiver และ agent route ได้
- local-first Zustand state, local medication cabinet, dose tracking, barcode/camera UI และ deterministic interaction/food safety utilities ยังมีอยู่
- local offline agent summary ระบุอย่างถูกต้องว่าเป็น “โหมดกฎออฟไลน์” ในหลายส่วน

### Firebase backend scaffold

- มี `firebase.json`, `.firebaserc`, `firestore.rules`, `storage.rules`, Functions TypeScript และ emulator ports
- `.firebaserc` แยก project alias `dev` = `macheck-app-dev`, `prod` = `macheck-app-prod`
- Firestore Rules เริ่มต้นด้วย default-deny
- private handle mapping ถูก deny จาก direct client access
- Functions มี callable workflow เบื้องต้นสำหรับ reserve handle, invite, accept/reject และ revoke caregiver
- Functions ใช้ Firebase Admin SDK และ Google Generative AI SDK; ไม่พบ NVIDIA NIM/OpenAI runtime ใน `functions/`

### Branding

- Android package/namespace, Java/Kotlin package, display name และ deep link เป็น `com.macheck.app` / `macheck`
- iOS workspace และ schemes เป็น MaCheck / MaCheck Dev / MaCheck Production
- `mobile/app.json` ระบุ name, slug, scheme และ bundle identifier เป็น MaCheck

### Competition design assets

- มี BigQuery DDL สำหรับ cleaned events, daily features, caregiver priority queue และ acceleration benchmarks
- มี RAPIDS/cuDF prototype และ synthetic dataset generator
- มีแผนหลักและ competition addendum ที่กำหนด decision workflow ได้ชัดเจน

## 3. Critical blockers (ต้องแก้ก่อนเดโม/ส่ง)

### C1 — Mobile ไม่มี Firebase client integration จริง

หลักฐาน:

- `mobile/package.json` ไม่มี `firebase` หรือ `@react-native-firebase/*`
- ไม่พบ client code ที่เรียก `initializeApp`, `getAuth`, `getFirestore` หรือ `httpsCallable`
- ไม่มี `google-services.json` หรือ `GoogleService-Info.plist`
- `mobile/src/services/firebase.ts` มีเพียง config/types ไม่ได้ initialize Firebase SDK

ผลกระทบ: แอปไม่สามารถ Authenticate, อ่าน/เขียน Firestore, เรียก callable function, ใช้ Storage, FCM หรือ App Check ได้จริง

การแก้:

1. เลือกและติดตั้ง Firebase React Native integration ที่รองรับ Expo development build
2. เพิ่ม native Firebase config ให้ Android/iOS แยก dev/prod
3. สร้าง single Firebase client module พร้อม emulator switching
4. ตรวจด้วย device จริงและ Firebase Emulator ก่อนต่อ production

### C2 — Authentication เป็น local fabricated session

หลักฐาน:

- [auth.ts](/Users/mac/Desktop/MaCheck-google/mobile/src/services/auth.ts:70) สร้าง anonymous UID จาก `Date.now()` และ random string
- [auth.ts](/Users/mac/Desktop/MaCheck-google/mobile/src/services/auth.ts:87) รับ UID ที่ caller ส่งมาเองแล้ว save ใน SecureStore
- [register.tsx](/Users/mac/Desktop/MaCheck-google/mobile/src/app/register.tsx:46) สร้าง UID `user_${handle}_${Date.now()}`; password ไม่ถูกส่งไปตรวจหรือเก็บอย่างถูกต้อง
- account deletion ทำเพียง sign-out

ผลกระทบ: ไม่มี Firebase Auth token; Firestore Rules/Callable Functions จริงจะปฏิเสธ request ทั้งหมด และ username/password UI หลอกว่าทำงาน

การแก้: ใช้ Firebase Auth Google Sign-In เป็น primary flow (หรือ Firebase Auth flow ที่เลือกอย่างเป็นทางการ), ใช้ `onAuthStateChanged`, handle reservation callable และ account-deletion callable จริง

### C3 — Firestore sync และ clinical catalog ยังไม่ทำงาน

หลักฐาน:

- [sync.ts](/Users/mac/Desktop/MaCheck-google/mobile/src/services/sync.ts:13) `push` แค่ `console.log`
- [sync.ts](/Users/mac/Desktop/MaCheck-google/mobile/src/services/sync.ts:29) `pull` คืน cabinet/dose history ว่างเสมอ
- [sync.ts](/Users/mac/Desktop/MaCheck-google/mobile/src/services/sync.ts:43) delete แค่ log
- `clinical-catalog.ts` ไม่อ่าน Firestore และเลือก bundled fallback เสมอ

ผลกระทบ: ข้อมูลยา, profile, dose events และ catalog ไม่ sync ข้ามเครื่อง ไม่สร้าง data สำหรับ analytics pipeline และไม่มี Firestore source of truth

การแก้: implement UID-scoped repositories, Firestore converters, listeners, offline mutation/idempotency, soft-delete และ catalog release reader

### C4 — Gemini ใน mobile และ agent เป็น mock

หลักฐาน:

- [google-cloud.ts](/Users/mac/Desktop/MaCheck-google/mobile/src/services/google-cloud.ts:23) scanner คืน confidence 0/fallback โดยไม่เรียก backend
- [agent.ts](/Users/mac/Desktop/MaCheck-google/mobile/src/services/agent.ts:156) `invokeAgentFunction()` คืน success/reply hard-coded
- [agent.ts](/Users/mac/Desktop/MaCheck-google/mobile/src/services/agent.ts:189) connectivity บอก READY เพียงเพราะ project ID มี default value

ผลกระทบ: UI อาจแสดงว่า Gemini/Firebase live ทั้งที่ไม่มี network call หรือ model invocation

การแก้: ใช้ `httpsCallable` จาก authenticated Firebase client, return typed backend response, fail honestly เมื่อ config/backend unavailable และแสดง `rules_only` เฉพาะเมื่อใช้ deterministic local rules จริง

### C5 — Caregiver feature เป็น stub

หลักฐาน: [caregiver.ts](/Users/mac/Desktop/MaCheck-google/mobile/src/services/caregiver.ts:72) คืน relationship/inbox ว่าง, invitation แค่ log, revoke/send/mark read เป็น empty function และ message ID ถูก fabricate

ผลกระทบ: caregiver consent, remote data visibility, messaging และ notification ยังไม่ทำงาน แม้ UI มีหน้าให้ใช้งาน

การแก้: ต่อ service เข้ากับ callable functions/Firestore listeners, implement invitation lifecycle, active access checks, FCM token management และ two-account integration tests

### C6 — RAPIDS/BigQuery pipeline ใช้ไม่ได้และมีตัวเลข acceleration จำลอง

หลักฐาน:

- `python3 -c 'import main'` ใน `platform/analytics/` fail เพราะ [main.py](/Users/mac/Desktop/MaCheck-google/platform/analytics/main.py:23) import `run_nvidia_rapids_analysis` ที่ไม่มีแล้ว
- endpoint ingest ใน [main.py](/Users/mac/Desktop/MaCheck-google/platform/analytics/main.py:61) return `streamed_to_bigquery: true` โดยไม่เขียน BigQuery
- endpoint risk score สร้าง synthetic data จาก request แทน GCS/Firestore data
- [rapids_pipeline.py](/Users/mac/Desktop/MaCheck-google/platform/analytics/rapids_pipeline.py:225) กำหนด GPU time เป็น `cpu_duration / 8.5` เมื่อไม่มี GPU แล้วระบุว่า simulated GPU
- ไม่มี Cloud Run Job YAML/gcloud deployment, GCS reader/writer, BigQuery writer, Firestore result writer หรือ Looker dashboard artifact

ผลกระทบ: ยังไม่มี evidence ที่แข่งขันต้องการ: GPU บน Google Cloud, RAPIDS/cuDF จริง, data lineage, BigQuery output, visualization และ measured speedup

การแก้: refactor analytics เป็น Cloud Run Job ที่อ่าน partitioned Parquet/JSONL จาก GCS, ใช้ explicit cuDF transform, เขียน BigQuery/Firestore จริง, และ benchmark CPU-vs-GPU ด้วย manifest/checksum เดียวกันเท่านั้น

## 4. Backend/Rules risks ที่ต้องแก้

### Firestore Rules

สิ่งที่ดี: default deny, private handles deny และ caregiver read permission pattern มีอยู่

แต่ยังมีความเสี่ยง:

1. `match /users/{userId}` อนุญาต owner `read, write` ทุก field โดยไม่มี schema/field validation จึงเขียน role, metadata หรือ shape ที่ไม่คาดไว้ได้
2. `caregiverAccess` อนุญาต patient owner เขียนตรง ขัดกับ comment ที่บอกว่าควรจัดการผ่าน trusted callable และทำให้ consent path กระจัดกระจาย
3. clinical collections อนุญาต authenticated read ทุก document ไม่ตรวจ published release/active state
4. client สร้าง caregiver thread ที่ใส่ participant arbitrary ได้ โดย Rules ไม่ยืนยัน active caregiver link หรือ consent
5. Storage Rules ตรวจแค่ owner path ไม่ตรวจ content type, file size หรือ path สำหรับ label image โดยเฉพาะ
6. ไม่มี Firestore/Storage Rules unit test กับ Emulator

### Callable Functions

สิ่งที่ดี: ใช้ Firebase Admin SDK, transaction สำหรับ handle และตรวจ auth ในทุก callable ปัจจุบัน

ช่องว่าง:

1. ไม่มี `enforceAppCheck: true`
2. ไม่มี input schema/length limits/rate limit โดยเฉพาะ base64 image และ chat text
3. `GEMINI_API_KEY` อ่านจาก `process.env`; ยังไม่มี Functions secret parameter/Secret Manager declaration และไม่มี deployment evidence
4. Gemini label output เป็น plain text ไม่บังคับ response schema/JSON parse/validation
5. ไม่มี deterministic safety context/post-validation สำหรับ chat
6. invite ไม่ deduplicate, ไม่ตรวจ role, ไม่ตรวจ expiration ตอน accept และ revoke fail หาก document ไม่เคยมี
7. ไม่มี FCM sender, delete-account, clinical publish/admin claim, audit log หรือ analytics exporter

## 5. Native, config และ dependency issues

### Native branding/config mismatch

- Android ถูกต้อง
- Xcode project ยังตั้ง `PRODUCT_BUNDLE_IDENTIFIER = com.yacheck.app` ในทั้ง Debug/Release/Standalone แม้ `app.json` ระบุ `com.macheck.app`
- Expo Doctor จึงเตือนว่า app config จะไม่ sync เข้า native project อัตโนมัติ
- iOS scheme/Info.plist เปลี่ยนชื่อแล้ว แต่ product bundle ID จริงยังเป็น YaCheck

ต้องแก้ Xcode build settings ให้ตรง แล้วทำ iOS build/install test

### Environment/config

- mobile env ยังมี `EXPO_PUBLIC_SUPABASE_URL` และ `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- mobile env ไม่มี Firebase API key/app ID หรือ emulator switch ที่ครบ
- root env มี `VERCEL_OIDC_TOKEN` ชื่อ variable ค้างอยู่
- ไม่มี Firebase native config files ใน mobile

### Dependencies

- `npm --prefix mobile ls --depth=0` พบ Supabase packages เป็น extraneous ใน `node_modules`
- root `package.json` ไม่มี dependency แต่ root lockfile ยังชื่อ `yacheck-prototype` และอ้าง LangChain/OpenAI dependencies
- tracked legacy runtime ยังมี `api/chat.js`, `js/*`, `platform/firebase/*` (จริง ๆ คือ Supabase SQL/Edge Functions), `vercel.json`, prototype OpenAI/Cloudflare และ Supabase password reset tool
- production audit: mobile 11 moderate; functions 9 moderate; ต้อง upgrade/resolve lockfiles อย่างระมัดระวัง ไม่ใช้ blind `npm audit fix --force`

## 6. Data/clinical correctness issues

- migration tool ทำเพียง manifest/export; ไม่ได้ import ผ่าน Firebase Admin SDK จริง
- seed clinical catalog มี medication 5 ตัว แต่ interaction อ้าง `simvastatin` ซึ่งไม่อยู่ใน seed medication set
- `reviewedAt` ใช้ current timestamp ทุก run จึงไม่เป็น source provenance ที่ reproducible
- RAPIDS feature ชื่อ `*_7d` แต่คำนวณจาก dataset 30 วันทั้งหมด
- `missed_streak` ใน prototype คือ `skipped_events / 5`, ไม่ใช่ consecutive missed-dose streak
- risk score formula/threshold ยังไม่มี clinical sign-off, version governance หรือ evidence refs

จึงใช้ได้เพียง synthetic engineering prototype ไม่ใช่ clinical decision tool ที่ควรอ้างผลจริง

## 7. Competition-track readiness

| Requirement | สถานะ | หลักฐาน/ช่องว่าง |
|---|---|---|
| Real user + decision workflow | บางส่วนพร้อม | caregiver priority narrative มีในแผน แต่ยังไม่มี output live |
| Firebase operational database | ไม่พร้อม | mobile ไม่เชื่อม Firestore |
| Google generative model only | บางส่วนพร้อม | Functions ใช้ Google SDK; mobile ไม่เรียก และ legacy artifacts ยังเหลือ |
| Cloud Storage | ไม่พร้อม | ไม่มี real upload/analytics raw zone |
| BigQuery | ไม่พร้อม | มี DDL แต่ไม่มี writer/load/query จริง |
| NVIDIA RAPIDS/cuDF/GPU | ไม่พร้อม | prototype + simulated 8.5x; import service fail |
| Looker visualization | ไม่พร้อม | ไม่มี project/dashboard artifact |
| Acceleration evidence | ไม่พร้อม | ไม่มี Cloud Run GPU run, benchmark manifest หรือ real logs |
| Security/privacy proof | ไม่พร้อม | Rules scaffold มี แต่ no tests/App Check/real Auth |

## 8. Prioritized remediation order

### P0 — ก่อนเดโมหรือ submission ใด ๆ

1. ติด Firebase client SDK + native config และ Firebase Auth จริง
2. implement Firestore profile/medications/dose events sync จริง พร้อม emulator tests
3. ลบ/ปิด hard-coded “live” responses จาก agent/scanner/caregiver
4. ต่อ mobile กับ callable functions จริงและ enforce App Check/auth
5. แก้ `platform/analytics/main.py` import break และลบ simulated GPU speedup
6. implement GCS → cuDF GPU → BigQuery → Firestore result pipeline จริง
7. ทำ CPU/GPU benchmark ที่ตรวจ checksum ได้และเก็บผลจริง
8. แก้ iOS bundle ID เป็น `com.macheck.app`

### P1 — เพื่อให้คุณภาพและเกณฑ์แข่งครบ

1. Looker dashboard ที่อ่าน BigQuery result จริง
2. Caregiver workflow/FCM ด้วยสองบัญชีจริง
3. Firestore/Storage Rules validation + Emulator tests
4. Functions input validation, App Check, Secret Manager, rate limiting และ audit log
5. Clinical catalog import/publish workflow จริง พร้อม pharmacist review
6. ล้าง legacy runtime/docs/lockfiles และ update README

### P2 — release hygiene

1. ปิด lint warnings
2. เพิ่ม functions ESLint dependency/config และ test runner ที่ใช้ได้
3. Resolve dependency audits ผ่าน upgrade plan ที่ compatible กับ Expo SDK
4. CI: typecheck, lint, rules tests, functions tests, vendor scan, benchmark checksum
5. native Android/iOS build + physical-device smoke tests

## 9. Minimum evidence pack ที่ต้องมีเมื่อบอกว่า “พร้อมแข่ง”

- Firebase console/CLI proof: Auth, Firestore Rules, Storage Rules, Functions deployed
- device video: login จริง → add medicine → dose event → sync อีกบัญชี/อีกเครื่อง
- GCS object/manifest ของ de-identified analytics input
- Cloud Run Job log ที่ยืนยัน NVIDIA GPU + cuDF version + input row count
- BigQuery lineage/query และ `acceleration_benchmarks` ที่มี CPU/GPU timings/checksum จริง
- Looker dashboard แสดง priority queue + pipeline freshness
- Gemini call log/model ID และ UI ที่ระบุ limitation อย่างตรงไปตรงมา
- Emulator Rules tests, unit/integration tests และ vendor scan result

## Final conclusion

repository มีฐาน UI และโครง design ที่ดีพอจะต่อยอดได้ แต่การ migration ปัจจุบันเป็น **partial implementation**: ผ่าน typecheck ไม่ได้แปลว่าบริการสำคัญใช้งานจริง เพราะหลาย service คืน local/hard-coded output เพื่อให้ UI เดินต่อได้

สิ่งที่ควรส่งให้ agent ที่จะทำต่อคือเริ่ม P0 จาก Firebase client/Auth/Firestore ก่อน แล้วค่อยทำ analytics pipeline จริง; อย่าเริ่ม Looker, polish UI หรือ presentation ก่อนที่ dose event จะไหลผ่าน Firestore → GCS → cuDF GPU → BigQuery ได้ครบและพิสูจน์ได้
