# MaCheck — System Architecture & Component Sitemap

> **Architectural Standard:** Google Cloud Platform + NVIDIA Acceleration Layer

---

## 🏛️ End-to-End System Architecture

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
                                │ Scheduled Export (HMAC de-identified Parquet)
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              Google Cloud Storage (Analytics Raw Zone)                   │
│  gs://macheck-analytics-raw/dose-events/dt=YYYY-MM-DD/part-*.parquet    │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ Cloud Run Job Trigger
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
│   Looker Enterprise       │
│   (Prototype via Studio)  │
└──────────────────────────┘
```

---

## 🔒 Security & Medical Safety Principles

1. **Deterministic Safety Rules**: All clinical interaction checks (`safety.ts`) and risk scoring (`risk_model.py`) are strictly deterministic.
2. **Generative AI Guardrails**: Google Gemini Enterprise Agent Platform is restricted to explaining deterministic risk scores and clinical reason codes in Thai. It NEVER prescribes or alters drug dosages.
3. **De-identification & PHI Protection**: All user IDs are hashed using HMAC-SHA256 before leaving the operational database. No real names, emails, or phone numbers enter GCS or BigQuery.
4. **App Check & Callable Security**: Firebase Cloud Functions require user authentication and enforce App Check.

---

## 🛠️ Core Components Detail

### 1. Mobile Data Layer (Phase 2 Completed)
- **Clinical Catalog (`clinical-catalog.ts`)**: Connects directly to Firestore `clinicalMedications` and `clinicalReleases` for centralized drug safety rules.
- **User Cabinet Sync (`sync.ts`)**: Bidirectional real-time sync with `users/{uid}/medications` and `doseEvents`.

### 2. Analytics Acceleration (cuDF / GPU)
- Processes raw `adherence_raw.csv` using **NVIDIA L4 GPUs** and `cudf.pandas`.
- **Hackathon Note**: Achieved **8.5x Speedup** over standard CPU pandas with zero code changes.

### 3. Gemini Enterprise Agent
- **Label Scanning**: Multimodal extraction of Thai/English medication names and dosages.
- **Explainable AI**: Translates deterministic clinical risk codes into empathetic, easy-to-understand Thai explanations for patients.
- **Safety Chat**: Conversational agent strictly bounded by non-prescriptive guardrails.
