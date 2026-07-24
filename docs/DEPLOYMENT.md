# MaCheck — Google Cloud Platform & Firebase Deployment Guide

> **Document:** Production & Demo Deployment Instructions  
> **Target Architecture:** Firebase Auth + Firestore + Cloud Functions + GCS + Cloud Run Job (NVIDIA GPU) + BigQuery + Looker Studio

---

## 1. Prerequisites & GCP Setup

1. Install Google Cloud SDK (`gcloud`) & Firebase CLI (`firebase-tools`).
2. Login to GCP & Firebase:
   ```bash
   gcloud auth login
   gcloud config set project macheck-app-dev
   firebase login
   ```
3. Enable required GCP APIs:
   ```bash
   gcloud services enable \
     firestore.googleapis.com \
     cloudfunctions.googleapis.com \
     run.googleapis.com \
     storage.googleapis.com \
     bigquery.googleapis.com \
     secretmanager.googleapis.com \
     artifactregistry.googleapis.com
   ```

---

## 2. Firebase Deployment (Auth, Firestore, Cloud Functions)

1. Deploy Security Rules & Indexes:
   ```bash
   firebase deploy --only firestore:rules,storage:rules
   ```

2. Seed Clinical Catalog:
   ```bash
   node tools/seed_clinical_catalog.mjs
   ```

3. Deploy Cloud Functions:
   ```bash
   cd functions
   npm run build
   firebase deploy --only functions
   ```

---

## 3. Google Cloud Storage & BigQuery Setup

> ⚠️ **Hackathon Billing Constraint Note**: If you are deploying on a Google Cloud Free Tier / Student account without an attached credit card, you will NOT be able to provision Cloud Storage or BigQuery. You can bypass this step and ingest CSV files directly into Looker Studio for prototyping.

1. Create GCS Analytics Bucket:
   ```bash
   gcloud storage buckets create gs://macheck-analytics-raw --location=asia-southeast1
   ```

2. Initialize BigQuery Schema:
   ```bash
   bq mk --dataset --location=asia-southeast1 macheck-app-dev:macheck_analytics
   bq query --use_legacy_sql=false < platform/analytics/bigquery_schema.sql
   ```

---

## 4. NVIDIA RAPIDS Cloud Run GPU Job Deployment

> ⚠️ **Hackathon Billing Constraint Note**: Cloud Run jobs with NVIDIA L4 GPUs require sufficient quota and a linked billing account. For the hackathon demonstration, this pipeline can be executed locally, and the resulting `caregiver_priority_queue.csv` can be uploaded to Looker Studio.

1. Create Artifact Registry repository:
   ```bash
   gcloud artifacts repositories create macheck \
     --repository-format=docker \
     --location=asia-southeast1
   ```

2. Build & Push Docker image:
   ```bash
   cd platform/analytics
   docker build -t asia-southeast1-docker.pkg.dev/macheck-app-dev/macheck/analytics:latest .
   docker push asia-southeast1-docker.pkg.dev/macheck-app-dev/macheck/analytics:latest
   ```

3. Deploy Cloud Run Job with NVIDIA L4 GPU:
   ```bash
   gcloud run jobs replace platform/analytics/deploy/cloudrun-job.yaml
   ```

4. Execute Analytics Job:
   ```bash
   gcloud run jobs execute macheck-rapids-pipeline --region=asia-southeast1
   ```
