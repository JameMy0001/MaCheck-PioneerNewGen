-- Grant the trusted Agent Edge Function the minimum database privileges it
-- needs to read patient context and persist its audit lineage. Browser roles
-- remain unchanged and continue to be restricted by RLS.

BEGIN;

GRANT USAGE ON SCHEMA public TO service_role;

GRANT SELECT ON
  public.agent_runtime_config,
  public.app_profiles,
  public.medications,
  public.drug_interactions,
  public.patient_medications,
  public.patient_conditions,
  public.patient_allergies,
  public.body_metrics,
  public.dose_events
TO service_role;

-- INSERT ... RETURNING requires SELECT as well as INSERT through PostgREST.
GRANT SELECT, INSERT ON public.patient_snapshots TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.agent_runs TO service_role;
GRANT INSERT ON public.agent_tool_calls TO service_role;
GRANT SELECT, INSERT ON public.agent_summaries TO service_role;
GRANT SELECT, INSERT ON public.agent_review_requests TO service_role;

-- A non-mutating readiness probe used by the Edge Function health endpoint.
-- It prevents the mobile client from reporting a shallow false-positive when
-- the Function is reachable but its database ACL is incomplete.
CREATE OR REPLACE FUNCTION public.server_agent_runtime_readiness()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_ready BOOLEAN;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Service role required';
  END IF;

  v_ready :=
    has_schema_privilege('service_role', 'public', 'USAGE')
    AND has_table_privilege('service_role', 'public.agent_runtime_config', 'SELECT')
    AND has_table_privilege('service_role', 'public.app_profiles', 'SELECT')
    AND has_table_privilege('service_role', 'public.medications', 'SELECT')
    AND has_table_privilege('service_role', 'public.drug_interactions', 'SELECT')
    AND has_table_privilege('service_role', 'public.patient_medications', 'SELECT')
    AND has_table_privilege('service_role', 'public.patient_conditions', 'SELECT')
    AND has_table_privilege('service_role', 'public.patient_allergies', 'SELECT')
    AND has_table_privilege('service_role', 'public.body_metrics', 'SELECT')
    AND has_table_privilege('service_role', 'public.dose_events', 'SELECT')
    AND has_table_privilege('service_role', 'public.patient_snapshots', 'SELECT')
    AND has_table_privilege('service_role', 'public.patient_snapshots', 'INSERT')
    AND has_table_privilege('service_role', 'public.agent_runs', 'SELECT')
    AND has_table_privilege('service_role', 'public.agent_runs', 'INSERT')
    AND has_table_privilege('service_role', 'public.agent_runs', 'UPDATE')
    AND has_table_privilege('service_role', 'public.agent_tool_calls', 'INSERT')
    AND has_table_privilege('service_role', 'public.agent_summaries', 'SELECT')
    AND has_table_privilege('service_role', 'public.agent_summaries', 'INSERT')
    AND has_table_privilege('service_role', 'public.agent_review_requests', 'SELECT')
    AND has_table_privilege('service_role', 'public.agent_review_requests', 'INSERT');

  RETURN jsonb_build_object(
    'ready', v_ready,
    'schema_version', 'agent-runtime-acl-v1'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_agent_runtime_readiness()
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_agent_runtime_readiness()
TO service_role;

COMMIT;
