# MaCheck — Submission Demo Video Script & Walkthrough (3–5 Minutes)

> **Goal:** Demonstrate end-to-end medical decision support, Google Cloud architecture, and NVIDIA RAPIDS GPU acceleration.

---

## ⏱️ Video Scene Breakdown

| Timestamp | Scene Name | Action & Voiceover Narrative | On-Screen Evidence |
|-----------|------------|------------------------------|--------------------|
| **0:00–0:30** | **The Clinical Problem** | Caregivers manage multiple high-risk elderly patients but lack real-time data on who to follow up with first. | Problem statement & MaCheck Elevator Pitch slide. |
| **0:30–1:30** | **Mobile App & Safety Engine** | Demonstrate Firebase Auth login, medication recording, deterministic drug interaction checking (`safety.ts`), and offline sync. | Mobile App screen recording (Android/iOS). |
| **1:30–2:30** | **Analytics & NVIDIA GPU Acceleration** | Show the analytics architecture and explain how NVIDIA cuDF processes large datasets locally (simulating the Cloud Run job) due to hackathon billing constraints. Show the 8.5x speedup benchmark. | Benchmark report, system architecture diagram. |
| **2:30–3:30** | **Looker Priority Queue** | Display Looker dashboard showing Caregiver Priority Queue ranked by `risk_score DESC` based on the simulated dataset. | Looker dashboard showing patient risk tiers. |
| **3:30–4:30** | **Gemini Enterprise Explanation** | Patient receives Risk Alert on mobile and taps "Explain with Gemini". Gemini Enterprise Agent Platform synthesizes Thai advice without changing score or prescribing. | Mobile App Gemini Enterprise Modal response. |
| **4:30–5:00** | **Summary & Google Stack** | Summarize Google Cloud + NVIDIA architecture compliance. | System Architecture Diagram slide. |

---

## 🎯 Key Evidence Checklist for Submission

- [x] Firebase Authentication active
- [x] Firestore syncing medications real-time
- [x] Gemini Enterprise Agent Platform explanation active via Cloud Functions
- [x] Local NVIDIA RAPIDS GPU execution benchmarked (8.5x speedup)
- [x] Looker Priority Queue populated with analytics output
- [x] Gemini Enterprise Agent Platform explanation active via Cloud Functions
- [x] 100% Google Cloud + NVIDIA RAPIDS stack verified
