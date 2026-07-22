-- Edge Functions access agent runtime settings exclusively with the service
-- role. Keep browser roles revoked while making the trusted server path
-- explicit and independent of project default privileges.

BEGIN;

REVOKE ALL ON public.agent_runtime_config, public.agent_config_audit
FROM PUBLIC, anon, authenticated;

GRANT SELECT, UPDATE ON public.agent_runtime_config TO service_role;
GRANT SELECT, INSERT ON public.agent_config_audit TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.agent_config_audit_id_seq TO service_role;

COMMIT;
