BEGIN;

CREATE TABLE IF NOT EXISTS public.agent_request_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_request_id TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'completed', 'failed')),
  response_payload JSONB,
  response_status INTEGER
    CHECK (response_status IS NULL OR response_status BETWEEN 100 AND 599),
  attempt_count INTEGER NOT NULL DEFAULT 1 CHECK (attempt_count > 0),
  first_received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  CONSTRAINT agent_request_ledger_user_request_unique
    UNIQUE (user_id, client_request_id),
  CONSTRAINT agent_request_ledger_request_id_format
    CHECK (client_request_id ~ '^[a-zA-Z0-9][a-zA-Z0-9._:-]{7,127}$')
);

CREATE INDEX IF NOT EXISTS idx_agent_request_ledger_expiry
  ON public.agent_request_ledger (expires_at);

ALTER TABLE public.agent_request_ledger ENABLE ROW LEVEL SECURITY;

-- The ledger may contain a short-lived copy of a clinical response. It is
-- intentionally server-only; mobile clients receive the response through the
-- authenticated Edge Function and cannot query the table directly.
REVOKE ALL ON public.agent_request_ledger FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_request_ledger TO service_role;

COMMIT;
