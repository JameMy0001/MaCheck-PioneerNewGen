-- Track the dynamic symptom-intake behavior in run lineage. Preserve any
-- independently customized future version by updating only the previous
-- production prompt version.

BEGIN;

UPDATE public.agent_runtime_config
SET prompt_version = 'agent-safe-v1.3.0',
    updated_at = now()
WHERE id = 1
  AND prompt_version = 'agent-safe-v1.2.0';

COMMIT;
