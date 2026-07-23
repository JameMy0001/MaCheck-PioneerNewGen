-- Runtime configuration for the YaCheck AI Agent.
-- Non-secret settings live in Postgres. Provider API keys are encrypted in
-- Supabase Vault and are never stored in this table.

BEGIN;

CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

CREATE TABLE IF NOT EXISTS public.agent_runtime_config (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  provider TEXT NOT NULL DEFAULT 'nvidia' CHECK (provider IN ('nvidia')),
  primary_model TEXT NOT NULL DEFAULT 'meta/llama-3.1-70b-instruct' CHECK (
    primary_model IN (
      'meta/llama-3.1-70b-instruct',
      'meta/llama-3.1-8b-instruct',
      'nvidia/llama-3.1-nemotron-70b-instruct'
    )
  ),
  fallback_model TEXT NOT NULL DEFAULT 'meta/llama-3.1-8b-instruct' CHECK (
    fallback_model IN (
      'meta/llama-3.1-70b-instruct',
      'meta/llama-3.1-8b-instruct',
      'nvidia/llama-3.1-nemotron-70b-instruct'
    )
  ),
  temperature NUMERIC(3, 2) NOT NULL DEFAULT 0.20 CHECK (temperature BETWEEN 0 AND 0.30),
  max_tokens INT NOT NULL DEFAULT 500 CHECK (max_tokens BETWEEN 128 AND 800),
  request_timeout_ms INT NOT NULL DEFAULT 15000 CHECK (request_timeout_ms BETWEEN 3000 AND 30000),
  ai_enabled BOOLEAN NOT NULL DEFAULT true,
  prompt_version TEXT NOT NULL DEFAULT 'agent-safe-v1.1.0' CHECK (char_length(prompt_version) BETWEEN 3 AND 80),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.agent_runtime_config(id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.agent_config_audit (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  action TEXT NOT NULL CHECK (action IN ('CONFIG_UPDATED', 'API_KEY_ROTATED', 'CONNECTION_TESTED')),
  config_before JSONB,
  config_after JSONB,
  changed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agent_config_audit_changed_at_idx
ON public.agent_config_audit(changed_at DESC);

ALTER TABLE public.agent_runtime_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_config_audit ENABLE ROW LEVEL SECURITY;

-- Configuration is accessed only through trusted Edge Functions. This keeps
-- write authorization and secret-rotation rules out of the browser bundle.
REVOKE ALL ON public.agent_runtime_config, public.agent_config_audit FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.server_get_agent_provider_secret(p_provider TEXT DEFAULT 'nvidia')
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_secret TEXT;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Service role required';
  END IF;
  IF p_provider <> 'nvidia' THEN
    RAISE EXCEPTION 'Unsupported provider';
  END IF;
  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = 'yacheck_nvidia_api_key'
  LIMIT 1;
  RETURN v_secret;
END;
$$;

CREATE OR REPLACE FUNCTION public.server_agent_provider_secret_status(p_provider TEXT DEFAULT 'nvidia')
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Service role required';
  END IF;
  IF p_provider <> 'nvidia' THEN
    RAISE EXCEPTION 'Unsupported provider';
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM vault.secrets WHERE name = 'yacheck_nvidia_api_key'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.server_set_agent_provider_secret(
  p_provider TEXT,
  p_secret TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_secret_id UUID;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Service role required';
  END IF;
  IF p_provider <> 'nvidia' THEN
    RAISE EXCEPTION 'Unsupported provider';
  END IF;
  IF p_secret IS NULL OR char_length(p_secret) < 20 OR char_length(p_secret) > 512 THEN
    RAISE EXCEPTION 'Invalid provider secret';
  END IF;

  SELECT id INTO v_secret_id
  FROM vault.secrets
  WHERE name = 'yacheck_nvidia_api_key'
  LIMIT 1;

  IF v_secret_id IS NULL THEN
    PERFORM vault.create_secret(
      p_secret,
      'yacheck_nvidia_api_key',
      'YaCheck NVIDIA NIM key managed by the Clinical Admin Owner'
    );
  ELSE
    PERFORM vault.update_secret(
      v_secret_id,
      p_secret,
      'yacheck_nvidia_api_key',
      'YaCheck NVIDIA NIM key managed by the Clinical Admin Owner'
    );
  END IF;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.server_get_agent_provider_secret(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.server_agent_provider_secret_status(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.server_set_agent_provider_secret(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_get_agent_provider_secret(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.server_agent_provider_secret_status(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.server_set_agent_provider_secret(TEXT, TEXT) TO service_role;

COMMIT;
