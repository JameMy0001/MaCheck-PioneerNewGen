# MaCheck Looker Enterprise Visualization Specification

> **Target Competition Track:** Data Analytics, Visualization, and Decision Support
> **Core Decision Support Question:** *"Which patient should the caregiver / clinic follow up with first today, and why?"*

---

## 1. Overview of Looker Architecture

Looker Enterprise (currently prototyped via Looker Studio) connects directly to **Google BigQuery (`macheck_analytics`)** read-only analytical views and displays real-time patient priority rankings, population adherence trends, and NVIDIA RAPIDS GPU acceleration benchmarks.

```text
Google Cloud Storage (gs://macheck-analytics-raw/)
        ↓
NVIDIA RAPIDS cuDF GPU Batch Job (Cloud Run Job)
        ↓
Google BigQuery (macheck_analytics)
        ├── caregiver_priority_queue
        ├── patient_daily_features
        └── acceleration_benchmarks
        ↓
Looker Enterprise Dashboard (Prototyped on Studio)
```

---

## 2. Dashboard Page Breakdown

### Page 1: Caregiver Priority Queue ("Who to follow up first?")
- **Primary Visual:** Ranked Data Table ordered by `risk_score DESC`
- **Columns:**
  - `Caregiver Priority Tier` (Color-coded Badge: Critical = Red, High = Orange, Medium = Yellow, Low = Green)
  - `Analytics Subject ID` (De-identified HMAC User Key)
  - `Risk Score (0–100)` (Deterministic Formula Output)
  - `7-Day Missed Dose Rate (%)`
  - `Reason Codes` (e.g. `MISSED_STREAK_3`, `ADHERENCE_BELOW_70`, `SEVERE_INTERACTION_REVIEW`)
- **Filters:** Priority Tier, Caregiver Group, Date Range

### Page 2: Population Adherence & Risk Hotspots
- **KPI Summary Tiles:** Total Patients Managed, High-Risk Patient Count, Overall System Adherence Rate (%).
- **Time Series Line Chart:** 30-Day Daily Adherence Trend by Age Group.
- **Bar Chart:** Distribution of Missed Events by Scheduled Time Slot (Morning, Noon, Evening, Bedtime).

### Page 3: NVIDIA RAPIDS GPU Acceleration Evidence
- **Benchmark Summary Card:**
  - Total Records Processed: `180,000` (Synthetic reproducible benchmark dataset)
  - CPU Pandas Wall Time: `96.53 ms`
  - GPU cuDF Wall Time: `11.36 ms`
  - Measured Acceleration Speedup: `8.5x`
  - Checksum Validation Match: `TRUE` (`e8aebc27...`)

---

## 3. Sample BigQuery Looker Query

```sql
SELECT
  priority_tier,
  analytics_subject_id,
  risk_score,
  missed_dose_rate_7d,
  skipped_events,
  late_events,
  ranked_at
FROM
  `macheck_analytics.caregiver_priority_queue`
WHERE
  DATE(ranked_at) = CURRENT_DATE()
ORDER BY
  risk_score DESC;
```
