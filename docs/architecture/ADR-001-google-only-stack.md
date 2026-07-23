# ADR-001: Google-Only Stack Architecture Migration for MaCheck

- **Status:** Accepted
- **Date:** 2026-07-23
- **Context:** Transitioning YaCheck application prototype into MaCheck for Google Competition.

## 1. Context and Problem Statement

The application was originally prototyped with a hybrid stack (including Supabase, PostgreSQL, NVIDIA NIM, LangChain/OpenAI, and Vercel). To fulfill the requirements of the Google Competition, all core cloud services, databases, authentication, backend APIs, push notifications, storage, and Generative AI models MUST use Google Cloud & Firebase services exclusively ("Google-only stack").

## 2. Decision Drivers

1. **Google Competition Compliance:** Strictly use Google Gemini for Generative AI, Firebase Cloud Firestore for database, Firebase Auth for user authentication, Cloud Functions v2 for backend logic, Cloud Storage for Firebase, FCM for notifications, and Firebase Hosting for administrative web dashboard.
2. **Clinical Safety & Determinism:** LLMs (Gemini) must never act as sole decision makers for drug safety, drug-drug interactions, or clinical rules. Deterministic clinical rule engines and verified clinical catalogs must compute interaction severity, red flags, and adherence. Gemini's role is restricted to OCR/multimodal label reading, structured intake parsing, safe user explanation, and conversational assistance with strict safety guardrails.
3. **Security & Zero Secret Leakage:** No Gemini API keys or backend credentials in client bundles (React Native / web). All AI logic must flow through authenticated Cloud Functions v2 (or Firebase AI Logic / Vertex AI SDK) with App Check enforcement.
4. **Data Isolation & Security Rules:** All Firestore user data must be scoped by Firebase Auth `uid` (`users/{uid}`). Default security rules must deny all unauthenticated or cross-user access, enforcing strict role-based access for caregivers and admins.

## 3. Architecture Blueprint

- **Mobile App:** Expo / React Native (`mobile/`), using `@react-native-firebase/*` native SDKs for Auth, Firestore (with offline persistence), Storage, Cloud Functions, FCM, Crashlytics, Remote Config, and App Check.
- **Backend Services:** Cloud Functions for Firebase (2nd Gen, Node.js + TypeScript).
- **Database:** Cloud Firestore in Native mode.
- **Generative AI:** Google Vertex AI / Genkit / Firebase AI Logic with pinned Google Gemini models (`gemini-2.5-flash` / stable multimodal).
- **Admin Console:** React SPA hosted on Firebase Hosting with Firebase Auth & custom claims (`admin`, `clinicalReviewer`).

## 4. Banned Vendors & Dependencies

The following vendors and libraries are strictly forbidden in production submission scope:
- Supabase (`@supabase/supabase-js`, Supabase CLI `config.toml`, PostgreSQL migrations)
- NVIDIA NIM / RAPIDS / CUDA dependencies
- OpenAI SDK / `@langchain/openai` / OpenAI API keys
- Anthropic SDK / models
- Vercel runtime configuration (`vercel.json`)
- Cloudflare D1/R2

## 5. Migration Execution Strategy

The migration is executed in 12 structured phases (Phase 0 to Phase 11), ensuring zero data loss and verifiable test checkpoints at each phase.
