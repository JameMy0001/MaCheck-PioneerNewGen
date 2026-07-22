-- Harden the AI Agent boundary and provide one authenticated sync path for
-- the health context consumed by the server-side Agent.

BEGIN;

---------------------------------------------------------
-- 1. TRACE OWNERSHIP AND SERVER-ONLY WRITES
---------------------------------------------------------

ALTER TABLE public.agent_summaries
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

UPDATE public.agent_summaries AS summary
SET user_id = run.user_id
FROM public.agent_runs AS run
WHERE run.id = summary.run_id
  AND summary.user_id IS NULL;

ALTER TABLE public.agent_summaries ALTER COLUMN user_id SET NOT NULL;

DROP POLICY IF EXISTS owner_all ON public.patient_snapshots;
DROP POLICY IF EXISTS owner_read ON public.patient_snapshots;
CREATE POLICY owner_read ON public.patient_snapshots
FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS owner_all ON public.agent_runs;
DROP POLICY IF EXISTS owner_read ON public.agent_runs;
CREATE POLICY owner_read ON public.agent_runs
FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS owner_all ON public.agent_tool_calls;
DROP POLICY IF EXISTS owner_read ON public.agent_tool_calls;
CREATE POLICY owner_read ON public.agent_tool_calls
FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.agent_runs AS run
    WHERE run.id = agent_tool_calls.run_id
      AND run.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS owner_all ON public.agent_summaries;
DROP POLICY IF EXISTS owner_read ON public.agent_summaries;
CREATE POLICY owner_read ON public.agent_summaries
FOR SELECT TO authenticated USING (auth.uid() = user_id);

REVOKE ALL ON public.patient_snapshots, public.agent_runs, public.agent_tool_calls, public.agent_summaries FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.patient_snapshots, public.agent_runs, public.agent_tool_calls, public.agent_summaries FROM authenticated;
GRANT SELECT ON public.patient_snapshots, public.agent_runs, public.agent_tool_calls, public.agent_summaries TO authenticated;

DROP POLICY IF EXISTS read_all_clinical_rules ON public.clinical_rules;
DROP POLICY IF EXISTS read_published_clinical_rules ON public.clinical_rules;
CREATE POLICY read_published_clinical_rules ON public.clinical_rules
FOR SELECT TO authenticated USING (status = 'published');
REVOKE ALL ON public.clinical_rules FROM anon;
GRANT SELECT ON public.clinical_rules TO authenticated;

---------------------------------------------------------
-- 2. REVIEW REQUESTS (HONEST PENDING WORKFLOW)
---------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.agent_review_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  summary_id UUID NOT NULL REFERENCES public.agent_summaries(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'reviewed', 'closed', 'cancelled')),
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_review_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS owner_read ON public.agent_review_requests;
CREATE POLICY owner_read ON public.agent_review_requests
FOR SELECT TO authenticated USING (auth.uid() = user_id);
REVOKE ALL ON public.agent_review_requests FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.agent_review_requests FROM authenticated;
GRANT SELECT ON public.agent_review_requests TO authenticated;
CREATE INDEX IF NOT EXISTS agent_review_requests_user_created_idx
ON public.agent_review_requests(user_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS agent_review_requests_open_summary_uidx
ON public.agent_review_requests(user_id, summary_id)
WHERE status IN ('pending', 'assigned');

---------------------------------------------------------
-- 3. CANONICAL HEALTH-CONTEXT SYNC
---------------------------------------------------------

WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY user_id, code
           ORDER BY (verification_status = 'verified') DESC,
                    (source IN ('doctor', 'clinician')) DESC,
                    created_at DESC,
                    id DESC
         ) AS duplicate_rank
  FROM public.patient_conditions
)
DELETE FROM public.patient_conditions
WHERE id IN (SELECT id FROM ranked WHERE duplicate_rank > 1);

WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY user_id, substance_code
           ORDER BY (verification_status = 'verified') DESC,
                    (source IN ('doctor', 'clinician')) DESC,
                    created_at DESC,
                    id DESC
         ) AS duplicate_rank
  FROM public.patient_allergies
)
DELETE FROM public.patient_allergies
WHERE id IN (SELECT id FROM ranked WHERE duplicate_rank > 1);

CREATE UNIQUE INDEX IF NOT EXISTS patient_conditions_user_code_uidx
ON public.patient_conditions(user_id, code);

CREATE UNIQUE INDEX IF NOT EXISTS patient_allergies_user_substance_uidx
ON public.patient_allergies(user_id, substance_code);

CREATE OR REPLACE FUNCTION public.sync_agent_health_context(
  p_diseases TEXT[] DEFAULT '{}',
  p_allergies TEXT[] DEFAULT '{}',
  p_weight_kg NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_item TEXT;
  v_clean TEXT;
  v_latest_weight NUMERIC;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  UPDATE public.patient_conditions
  SET status = 'inactive', effective_to = now(), updated_at = now()
  WHERE user_id = v_user_id
    AND source = 'patient'
    AND NOT (code = ANY(COALESCE(p_diseases, '{}'::TEXT[])));

  FOREACH v_item IN ARRAY COALESCE(p_diseases, '{}'::TEXT[]) LOOP
    v_clean := trim(v_item);
    IF v_clean <> '' THEN
      INSERT INTO public.patient_conditions(user_id, code, name, status, source, verification_status)
      VALUES (v_user_id, v_clean, v_clean, 'active', 'patient', 'unverified')
      ON CONFLICT (user_id, code) DO UPDATE
      SET name = EXCLUDED.name,
          status = 'active',
          effective_to = NULL,
          updated_at = now()
      WHERE public.patient_conditions.source = 'patient';
    END IF;
  END LOOP;

  UPDATE public.patient_allergies
  SET effective_to = now(), updated_at = now()
  WHERE user_id = v_user_id
    AND source = 'patient'
    AND effective_to IS NULL
    AND NOT (substance_code = ANY(COALESCE(p_allergies, '{}'::TEXT[])));

  FOREACH v_item IN ARRAY COALESCE(p_allergies, '{}'::TEXT[]) LOOP
    v_clean := trim(v_item);
    IF v_clean <> '' THEN
      INSERT INTO public.patient_allergies(
        user_id, substance_code, substance_name, severity, source, verification_status
      ) VALUES (
        v_user_id, v_clean, v_clean, 'unknown', 'patient', 'unverified'
      )
      ON CONFLICT (user_id, substance_code) DO UPDATE
      SET substance_name = EXCLUDED.substance_name,
          effective_to = NULL,
          updated_at = now()
      WHERE public.patient_allergies.source = 'patient';
    END IF;
  END LOOP;

  IF p_weight_kg IS NOT NULL AND p_weight_kg > 0 AND p_weight_kg <= 500 THEN
    SELECT value INTO v_latest_weight
    FROM public.body_metrics
    WHERE user_id = v_user_id AND metric_type = 'weight' AND quality_flag = 'good'
    ORDER BY measured_at DESC
    LIMIT 1;

    IF v_latest_weight IS NULL OR abs(v_latest_weight - p_weight_kg) >= 0.01 THEN
      INSERT INTO public.body_metrics(user_id, metric_type, value, unit, source, quality_flag)
      VALUES (v_user_id, 'weight', p_weight_kg, 'kg', 'user', 'good');
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true, 'synced_at', now());
END;
$$;

REVOKE ALL ON FUNCTION public.sync_agent_health_context(TEXT[], TEXT[], NUMERIC) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_agent_health_context(TEXT[], TEXT[], NUMERIC) TO authenticated;

---------------------------------------------------------
-- 4. QUOTA AND ADMIN AUTHORIZATION
---------------------------------------------------------

ALTER TABLE public.app_profiles
DROP CONSTRAINT IF EXISTS app_profiles_custom_quota_override_check;

ALTER TABLE public.app_profiles
ADD CONSTRAINT app_profiles_custom_quota_override_check
CHECK (custom_quota_override IS NULL OR custom_quota_override BETWEEN 0 AND 10000);

CREATE OR REPLACE FUNCTION public.admin_update_user_subscription(
  p_target_user_id UUID DEFAULT NULL,
  p_new_tier TEXT DEFAULT 'free',
  p_quota_override INT DEFAULT NULL,
  p_target_handle TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := p_target_user_id;
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  IF p_new_tier NOT IN ('free', 'pro', 'family', 'admin') THEN
    RAISE EXCEPTION 'Invalid subscription tier';
  END IF;
  IF p_quota_override IS NOT NULL AND (p_quota_override < 0 OR p_quota_override > 10000) THEN
    RAISE EXCEPTION 'Quota override must be between 0 and 10000';
  END IF;

  IF v_uid IS NULL AND p_target_handle IS NOT NULL THEN
    SELECT user_id INTO v_uid
    FROM private.account_handles
    WHERE lower(handle) = lower(trim(replace(p_target_handle, '@', '')));
  END IF;
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Target user not found'; END IF;

  INSERT INTO public.app_profiles(user_id, role, subscription_tier, custom_quota_override, updated_at)
  VALUES (v_uid, 'patient', p_new_tier, p_quota_override, now())
  ON CONFLICT (user_id) DO UPDATE
  SET subscription_tier = EXCLUDED.subscription_tier,
      custom_quota_override = EXCLUDED.custom_quota_override,
      updated_at = now();

  RETURN jsonb_build_object('success', true, 'user_id', v_uid, 'subscription_tier', p_new_tier, 'custom_quota_override', p_quota_override);
END;
$$;

CREATE OR REPLACE FUNCTION public.check_user_agent_quota(p_user_id UUID DEFAULT auth.uid())
RETURNS TABLE(
  allowed BOOLEAN,
  quota_remaining INT,
  current_tier TEXT,
  runs_this_week INT,
  max_weekly_quota INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := COALESCE(p_user_id, auth.uid());
  v_role TEXT := 'patient';
  v_tier TEXT := 'free';
  v_override INT;
  v_runs INT := 0;
  v_max INT := 7;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF auth.role() <> 'service_role' AND v_user_id <> auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not allowed to inspect another user quota';
  END IF;

  SELECT role, COALESCE(subscription_tier, 'free'), custom_quota_override
  INTO v_role, v_tier, v_override
  FROM public.app_profiles WHERE user_id = v_user_id;

  IF NOT FOUND THEN
    v_role := 'patient';
    v_tier := 'free';
    v_override := NULL;
  END IF;

  SELECT count(*)::INT INTO v_runs
  FROM public.agent_runs
  WHERE user_id = v_user_id AND created_at >= now() - interval '7 days';

  IF v_role = 'admin' OR v_tier = 'admin' THEN
    RETURN QUERY SELECT true, 9999, 'admin'::TEXT, v_runs, 9999;
    RETURN;
  END IF;

  v_max := COALESCE(v_override, CASE v_tier WHEN 'pro' THEN 50 WHEN 'family' THEN 200 ELSE 7 END);
  RETURN QUERY SELECT v_runs < v_max, GREATEST(v_max - v_runs, 0), v_tier, v_runs, v_max;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_user_agent_quota_by_handle(p_handle TEXT)
RETURNS TABLE(
  allowed BOOLEAN,
  quota_remaining INT,
  current_tier TEXT,
  runs_this_week INT,
  max_weekly_quota INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT user_id INTO v_user_id
  FROM private.account_handles
  WHERE lower(handle) = lower(trim(replace(p_handle, '@', '')));
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'User not found'; END IF;
  IF auth.role() <> 'service_role' AND v_user_id <> auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not allowed to inspect another user quota';
  END IF;
  RETURN QUERY SELECT * FROM public.check_user_agent_quota(v_user_id);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_user_subscription(UUID, TEXT, INT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_user_subscription(UUID, TEXT, INT, TEXT) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.check_user_agent_quota(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_user_agent_quota(UUID) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.check_user_agent_quota_by_handle(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_user_agent_quota_by_handle(TEXT) TO authenticated, service_role;

COMMIT;
