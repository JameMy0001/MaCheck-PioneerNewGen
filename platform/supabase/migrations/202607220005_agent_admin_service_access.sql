-- agent-admin verifies the caller with Auth, then loads the corresponding
-- admin membership using the trusted service client. Make that server-only
-- read path explicit; browser access remains governed by authenticated RLS.

BEGIN;

GRANT SELECT ON public.admin_members TO service_role;

COMMIT;
