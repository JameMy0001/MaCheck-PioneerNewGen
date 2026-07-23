# MaCheck — Submission Demo Video Script & Walkthrough (3–5 Minutes)

> **Goal:** Demonstrate end-to-end medical decision support, Google Cloud architecture, and NVIDIA RAPIDS GPU acceleration.

---

## ⏱️ Video Scene Breakdown

| Timestamp | Scene Name | Action & Voiceover Narrative | On-Screen Evidence |
|-----------|------------|------------------------------|--------------------|
| **0:00–0:30** | **The Clinical Problem** | Caregivers manage multiple high-risk elderly patients but lack real-time data on who to follow up with first. | Problem statement & MaCheck Elevator Pitch slide. |
| **0:30–1:30** | **Mobile App & Safety Engine** | Demonstrate Firebase Auth login, medication recording, deterministic drug interaction checking (`safety.ts`), and offline sync. | Mobile App screen recording (Android/iOS). |
| **1:30–2:30** | **GCS & NVIDIA GPU Analytics** | Show dose events exported to GCS (`gs://macheck-analytics-raw`), Cloud Run Job running NVIDIA cuDF GPU container, and BigQuery data tables. | GCP Console, Cloud Run Job logs showing `GPU=true`, BigQuery table query. |
| **2:30–3:30** | **Looker Priority Queue** | Display Looker Enterprise report showing Caregiver Priority Queue ranked by `risk_score DESC` and CPU vs GPU acceleration speedup benchmarks. | Looker Enterprise dashboard (via Studio) with SHA-256 Checksum match (`TRUE`). |
| **3:30–4:30** | **Gemini Enterprise Explanation** | Patient receives Risk Alert on mobile and taps "Explain with Gemini". Gemini Enterprise Agent Platform synthesizes Thai advice without changing score or prescribing. | Mobile App Gemini Enterprise Modal response. |
| **4:30–5:00** | **Summary & Google Stack** | Summarize Google Cloud + NVIDIA architecture compliance. | System Architecture Diagram slide. |

---

## 🎯 Key Evidence Checklist for Submission

- [x] Firebase Authentication active
- [x] GCS Parquet exports verified
- [x] Cloud Run Job NVIDIA GPU execution logs verified
- [x] BigQuery `macheck_analytics` populated
- [x] Looker Enterprise Priority Queue live
- [x] Gemini Enterprise Agent Platform explanation active via Cloud Functions
- [x] 100% Google Cloud + NVIDIA RAPIDS stack verified
