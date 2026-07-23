-- MaCheck Google BigQuery Analytical Warehouse Schemas
-- Dataset: macheck_analytics

CREATE SCHEMA IF NOT EXISTS `macheck_analytics`
  OPTIONS(
    location="asia-southeast1",
    description="MaCheck De-identified Adherence & Caregiver Priority Analytics Warehouse"
  );

-- 1. Cleaned Dose Events Table (Partitioned by event_date, Clustered by analytics_subject_id)
CREATE TABLE IF NOT EXISTS `macheck_analytics.cleaned_dose_events` (
  record_id INT64,
  analytics_subject_id STRING,
  medication_code STRING,
  slot STRING,
  event_date DATE,
  status STRING,
  delay_minutes FLOAT64,
  has_severe_interaction BOOL,
  idempotency_key STRING,
  ingested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY event_date
CLUSTER BY analytics_subject_id, status;

-- 2. Patient Daily Features Table
CREATE TABLE IF NOT EXISTS `macheck_analytics.patient_daily_features` (
  analytics_subject_id STRING,
  feature_date DATE,
  total_events_7d INT64,
  skipped_events_7d INT64,
  late_events_7d INT64,
  missed_dose_rate_7d FLOAT64,
  late_dose_rate_7d FLOAT64,
  missed_streak_count INT64,
  severe_interaction_flag INT64,
  worsening_trend_flag INT64,
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY feature_date
CLUSTER BY analytics_subject_id;

-- 3. Caregiver Priority Queue Table (Core Decision Support View Output)
CREATE TABLE IF NOT EXISTS `macheck_analytics.caregiver_priority_queue` (
  analytics_subject_id STRING,
  risk_score FLOAT64,
  priority_tier STRING, -- "critical", "high", "medium", "low"
  missed_dose_rate_7d FLOAT64,
  skipped_events INT64,
  late_events INT64,
  reason_codes ARRAY<STRING>,
  ranked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY DATE(ranked_at)
CLUSTER BY priority_tier, risk_score;

-- 4. Acceleration Benchmarks Table (CPU vs GPU RAPIDS Evidence Record)
CREATE TABLE IF NOT EXISTS `macheck_analytics.acceleration_benchmarks` (
  run_id STRING,
  model_version STRING,
  total_records_processed INT64,
  total_patients_analyzed INT64,
  cpu_wall_time_ms FLOAT64,
  gpu_wall_time_ms FLOAT64,
  speedup_factor FLOAT64,
  checksum_match BOOL,
  checksum STRING,
  acceleration_mode STRING,
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);
