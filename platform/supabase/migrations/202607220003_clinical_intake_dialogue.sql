-- Record the prompt revision that adds multi-turn symptom intake before any
-- model-generated medication information. Preserve explicitly customized
-- prompt version labels.

BEGIN;

UPDATE public.agent_runtime_config
SET
  prompt_version = 'agent-safe-v1.2.0',
  updated_at = now()
WHERE id = 1
  AND prompt_version = 'agent-safe-v1.1.0';

COMMIT;
