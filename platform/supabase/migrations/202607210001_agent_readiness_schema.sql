-- Supabase Migration: 202607210001_agent_readiness_schema.sql
-- Description: Implement database schema enhancements to resolve all 6 architectural gaps for production-ready AI Care Agent.
-- Gaps resolved:
-- 1. patient_conditions & patient_allergies (structured state instead of profiles JSON)
-- 2. body_metrics (time-series weight/lab inputs with source and quality flags)
-- 3. dose_events_v2 (structured adherence tracking: enum status, occurred_at, skipped reasons)
-- 4. normalized medication_schedules (avoiding JSON nesting, tracking changes per medicine)
-- 5. patient_snapshots, agent_runs, agent_tool_calls, agent_summaries (lineage & run-level observability)
-- 6. clinical_rules (centralized clinical rule registry verified by clinicians)

BEGIN;

---------------------------------------------------------
-- 1. PATIENT CONDITIONS & ALLERGIES
---------------------------------------------------------

CREATE TABLE patient_conditions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    code TEXT NOT NULL, -- Clinical code (e.g., ICD-10 or custom terminology)
    name TEXT NOT NULL, -- Name in Thai/English
    status TEXT NOT NULL CHECK (status IN ('active', 'resolved', 'inactive')),
    onset_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    effective_from TIMESTAMPTZ NOT NULL DEFAULT now(),
    effective_to TIMESTAMPTZ,
    source TEXT NOT NULL DEFAULT 'patient', -- 'patient', 'doctor', 'caregiver', 'inferred'
    verification_status TEXT NOT NULL CHECK (verification_status IN ('unverified', 'verified', 'refuted')) DEFAULT 'unverified',
    verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE patient_allergies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    substance_code TEXT NOT NULL, -- Substance identifier (e.g. RxNorm, ATC or generic name)
    substance_name TEXT NOT NULL,
    reaction TEXT, -- Observed allergy symptoms
    severity TEXT CHECK (severity IN ('mild', 'moderate', 'severe', 'unknown')) DEFAULT 'unknown',
    effective_from TIMESTAMPTZ NOT NULL DEFAULT now(),
    effective_to TIMESTAMPTZ,
    source TEXT NOT NULL DEFAULT 'patient', -- 'patient', 'doctor', 'caregiver'
    verification_status TEXT NOT NULL CHECK (verification_status IN ('unverified', 'verified')) DEFAULT 'unverified',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

---------------------------------------------------------
-- 2. BODY METRICS (TIME SERIES DATA)
---------------------------------------------------------

CREATE TABLE body_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    metric_type TEXT NOT NULL CHECK (metric_type IN ('weight', 'height', 'systolic_bp', 'diastolic_bp', 'creatinine_clearance')),
    value NUMERIC NOT NULL,
    unit TEXT NOT NULL,
    measured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    source TEXT NOT NULL DEFAULT 'user', -- 'user', 'caregiver', 'device', 'clinician'
    quality_flag TEXT CHECK (quality_flag IN ('good', 'suspect', 'invalid')) DEFAULT 'good',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

---------------------------------------------------------
-- 3. NORMALIZED MEDICATION SCHEDULES
---------------------------------------------------------

CREATE TABLE medication_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_medication_id UUID NOT NULL REFERENCES patient_medications(id) ON DELETE CASCADE,
    local_time TIME NOT NULL, -- e.g. '08:00:00'
    timezone TEXT NOT NULL DEFAULT 'Asia/Bangkok',
    days_of_week INT[] NOT NULL, -- [1,2,3,4,5,6,7] (1 = Monday, 7 = Sunday)
    meal_timing TEXT CHECK (meal_timing IN ('before_meal', 'after_meal', 'with_meal', 'empty_stomach', 'independent')) DEFAULT 'independent',
    schedule_version INT NOT NULL DEFAULT 1,
    valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
    valid_to TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

---------------------------------------------------------
-- 4. ADHERENCE DOSE EVENTS V2
---------------------------------------------------------

CREATE TABLE dose_events_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    schedule_id UUID NOT NULL REFERENCES medication_schedules(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('taken', 'late', 'missed', 'uncertain', 'skipped')),
    scheduled_at TIMESTAMPTZ NOT NULL,
    occurred_at TIMESTAMPTZ,
    reason TEXT, -- Reason for missed/skipped (e.g. side effects, forgot, sleeping)
    source TEXT NOT NULL DEFAULT 'user', -- 'user', 'caregiver', 'system'
    idempotency_key TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

---------------------------------------------------------
-- 5. CLINICAL RULE REGISTRY
---------------------------------------------------------

CREATE TABLE clinical_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_code TEXT NOT NULL UNIQUE,
    rule_type TEXT NOT NULL CHECK (rule_type IN ('drug_drug_interaction', 'drug_condition_contraindication', 'drug_allergy_contraindication', 'dosing_eligibility')),
    description TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('mild', 'moderate', 'severe')),
    expression_or_params JSONB NOT NULL, -- Matches conditions or ATC codes
    status TEXT NOT NULL CHECK (status IN ('draft', 'in_review', 'published', 'archived')) DEFAULT 'draft',
    reviewed_at TIMESTAMPTZ,
    reviewed_by TEXT,
    sources TEXT[] NOT NULL, -- External evidence sources / citations
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

---------------------------------------------------------
-- 6. AUDIT LINEAGE & OBSERVABILITY
---------------------------------------------------------

CREATE TABLE patient_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    version INT NOT NULL,
    as_of TIMESTAMPTZ NOT NULL DEFAULT now(),
    data_hash TEXT NOT NULL,
    snapshot_payload JSONB NOT NULL, -- Frozen state (medications, conditions, allergies, weight, historical adherence)
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE agent_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    trace_id TEXT NOT NULL,
    intent TEXT NOT NULL,
    snapshot_id UUID REFERENCES patient_snapshots(id) ON DELETE SET NULL,
    status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed', 'abstain')),
    stop_reason TEXT, -- 'completed', 'budget_exhausted', 'safety_block', 'error'
    latency_ms INT,
    input_tokens INT,
    output_tokens INT,
    model_name TEXT NOT NULL,
    prompt_version TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE agent_tool_calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
    sequence_number INT NOT NULL,
    tool_name TEXT NOT NULL,
    args_hash TEXT NOT NULL,
    input_args JSONB NOT NULL,
    output_result JSONB NOT NULL,
    latency_ms INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE agent_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
    schema_version INT NOT NULL DEFAULT 1,
    overall_status TEXT NOT NULL,
    structured_payload JSONB NOT NULL, -- Summary outcome structure (priorities, rows, allowed actions)
    supersedes_id UUID REFERENCES agent_summaries(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

---------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
---------------------------------------------------------

ALTER TABLE patient_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_allergies ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE dose_events_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_tool_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_summaries ENABLE ROW LEVEL SECURITY;

-- Owner access policies
CREATE POLICY owner_all ON patient_conditions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY owner_all ON patient_allergies FOR ALL USING (auth.uid() = user_id);
CREATE POLICY owner_all ON body_metrics FOR ALL USING (auth.uid() = user_id);
CREATE POLICY owner_all ON dose_events_v2 FOR ALL USING (auth.uid() = user_id);
CREATE POLICY owner_all ON patient_snapshots FOR ALL USING (auth.uid() = user_id);
CREATE POLICY owner_all ON agent_runs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY owner_all ON agent_summaries FOR ALL USING (auth.uid() = user_id);

-- medication_schedules owner validation policy
CREATE POLICY owner_all ON medication_schedules FOR ALL USING (
    EXISTS (
        SELECT 1 FROM patient_medications
        WHERE patient_medications.id = patient_medication_id
        AND patient_medications.user_id = auth.uid()
    )
);

-- agent_tool_calls owner validation policy
CREATE POLICY owner_all ON agent_tool_calls FOR ALL USING (
    EXISTS (
        SELECT 1 FROM agent_runs
        WHERE agent_runs.id = run_id
        AND agent_runs.user_id = auth.uid()
    )
);

-- read-only public access to clinical rule registry for active sessions
CREATE POLICY read_all_clinical_rules ON clinical_rules FOR SELECT USING (true);

---------------------------------------------------------
-- INDEXES FOR PERFORMANCE
---------------------------------------------------------

CREATE INDEX idx_conditions_user_status ON patient_conditions(user_id, status);
CREATE INDEX idx_allergies_user ON patient_allergies(user_id);
CREATE INDEX idx_metrics_user_type ON body_metrics(user_id, metric_type);
CREATE INDEX idx_schedules_medication ON medication_schedules(patient_medication_id);
CREATE INDEX idx_dose_events_schedule ON dose_events_v2(schedule_id);
CREATE INDEX idx_snapshots_user ON patient_snapshots(user_id);
CREATE INDEX idx_runs_user ON agent_runs(user_id);
CREATE INDEX idx_tool_calls_run ON agent_tool_calls(run_id);
CREATE INDEX idx_summaries_run ON agent_summaries(run_id);

COMMIT;
