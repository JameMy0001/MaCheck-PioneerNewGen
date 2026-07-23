-- Supabase Migration: 202607210002_agent_operational_functions.sql
-- Description: Complete bulletproof subscription tier management, automatic user profile seed, and RPCs for AI Care Agent.

BEGIN;

---------------------------------------------------------
-- 1. PROFILE SUBSCRIPTION COLUMNS & AUTO SEED
---------------------------------------------------------

ALTER TABLE public.app_profiles 
ADD COLUMN IF NOT EXISTS subscription_tier TEXT NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'family', 'admin')),
ADD COLUMN IF NOT EXISTS custom_quota_override INT DEFAULT NULL;

-- Seed missing app_profiles rows for existing account_handles
INSERT INTO public.app_profiles (user_id, role, subscription_tier)
SELECT h.user_id, 'patient', 'free'
FROM private.account_handles h
ON CONFLICT (user_id) DO NOTHING;

---------------------------------------------------------
-- 2. ADMIN UPDATE SUBSCRIPTION RPC (WITH UPSERT & HANDLE RESOLUTION)
---------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_update_user_subscription(
    p_target_user_id UUID DEFAULT NULL,
    p_new_tier TEXT DEFAULT 'free',
    p_quota_override INT DEFAULT NULL,
    p_target_handle TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_uid UUID := p_target_user_id;
    v_handle TEXT := p_target_handle;
BEGIN
    IF v_uid IS NULL AND v_handle IS NOT NULL THEN
        SELECT user_id INTO v_uid
        FROM private.account_handles
        WHERE LOWER(handle) = LOWER(TRIM(REPLACE(v_handle, '@', '')));
    END IF;

    IF v_uid IS NULL AND v_handle IS NOT NULL THEN
        BEGIN
            v_uid := v_handle::UUID;
        EXCEPTION WHEN OTHERS THEN
            v_uid := NULL;
        END;
    END IF;

    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Target user not found for handle: %', p_target_handle;
    END IF;

    -- UPSERT into public.app_profiles
    INSERT INTO public.app_profiles (user_id, subscription_tier, custom_quota_override, updated_at)
    VALUES (v_uid, p_new_tier, p_quota_override, now())
    ON CONFLICT (user_id) DO UPDATE
    SET subscription_tier = EXCLUDED.subscription_tier,
        custom_quota_override = EXCLUDED.custom_quota_override,
        updated_at = now();

    RETURN jsonb_build_object(
        'success', true,
        'user_id', v_uid,
        'subscription_tier', p_new_tier,
        'custom_quota_override', p_quota_override
    );
END;
$$;

---------------------------------------------------------
-- 3. CHECK USER QUOTA BY HANDLE RPC FOR MOBILE APP
---------------------------------------------------------

CREATE OR REPLACE FUNCTION public.check_user_agent_quota_by_handle(p_handle TEXT)
RETURNS TABLE (
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
    v_role TEXT := 'patient';
    v_tier TEXT := 'free';
    v_override INT := NULL;
    v_runs_count INT := 0;
    v_max_quota INT := 7;
    v_remaining INT := 7;
    v_clean_handle TEXT;
BEGIN
    v_clean_handle := LOWER(TRIM(REPLACE(p_handle, '@', '')));

    SELECT user_id INTO v_user_id
    FROM private.account_handles
    WHERE LOWER(handle) = v_clean_handle;

    IF v_user_id IS NOT NULL THEN
        SELECT role, COALESCE(subscription_tier, 'free'), custom_quota_override
        INTO v_role, v_tier, v_override
        FROM public.app_profiles
        WHERE user_id = v_user_id;

        SELECT COUNT(*)::INT INTO v_runs_count
        FROM public.agent_runs
        WHERE user_id = v_user_id
          AND created_at >= (now() - INTERVAL '7 days');
    END IF;

    IF v_tier IS NULL THEN
        v_tier := 'free';
    END IF;

    IF v_role = 'admin' OR v_tier = 'admin' THEN
        RETURN QUERY SELECT true, 9999, 'admin'::TEXT, v_runs_count, 9999;
        RETURN;
    END IF;

    IF v_override IS NOT NULL THEN
        v_max_quota := v_override;
    ELSIF v_tier = 'pro' THEN
        v_max_quota := 50;
    ELSIF v_tier = 'family' THEN
        v_max_quota := 200;
    ELSE
        v_max_quota := 7;
    END IF;

    v_remaining := v_max_quota - v_runs_count;

    IF v_remaining > 0 THEN
        RETURN QUERY SELECT true, v_remaining, v_tier, v_runs_count, v_max_quota;
    ELSE
        RETURN QUERY SELECT false, 0, v_tier, v_runs_count, v_max_quota;
    END IF;
END;
$$;

---------------------------------------------------------
-- 4. CHECK USER QUOTA BY UUID RPC
---------------------------------------------------------

CREATE OR REPLACE FUNCTION public.check_user_agent_quota(p_user_id UUID DEFAULT auth.uid())
RETURNS TABLE (
    allowed BOOLEAN,
    quota_remaining INT,
    current_tier TEXT,
    runs_this_week INT,
    max_weekly_quota INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_role TEXT;
    v_tier TEXT;
    v_override INT;
    v_runs_count INT;
    v_max_quota INT;
    v_remaining INT;
BEGIN
    SELECT role, COALESCE(subscription_tier, 'free'), custom_quota_override
    INTO v_role, v_tier, v_override
    FROM public.app_profiles
    WHERE user_id = p_user_id;

    IF NOT FOUND THEN
        v_role := 'patient';
        v_tier := 'free';
        v_override := NULL;
    END IF;

    SELECT COUNT(*)::INT INTO v_runs_count
    FROM public.agent_runs
    WHERE user_id = p_user_id
      AND created_at >= (now() - INTERVAL '7 days');

    IF v_role = 'admin' OR v_tier = 'admin' THEN
        RETURN QUERY SELECT true, 9999, 'admin'::TEXT, v_runs_count, 9999;
        RETURN;
    END IF;

    IF v_override IS NOT NULL THEN
        v_max_quota := v_override;
    ELSIF v_tier = 'pro' THEN
        v_max_quota := 50;
    ELSIF v_tier = 'family' THEN
        v_max_quota := 200;
    ELSE
        v_max_quota := 7;
    END IF;

    v_remaining := v_max_quota - v_runs_count;

    IF v_remaining > 0 THEN
        RETURN QUERY SELECT true, v_remaining, v_tier, v_runs_count, v_max_quota;
    ELSE
        RETURN QUERY SELECT false, 0, v_tier, v_runs_count, v_max_quota;
    END IF;
END;
$$;

---------------------------------------------------------
-- 5. ADMIN LIST ACCOUNTS RPC (EXPOSES SUBSCRIPTION TIER)
---------------------------------------------------------

DROP FUNCTION IF EXISTS public.admin_list_accounts(text, integer, integer);

CREATE OR REPLACE FUNCTION public.admin_list_accounts(
    search_text text default '',
    row_limit integer default 100,
    row_offset integer default 0
)
RETURNS TABLE(
    user_id uuid,
    handle text,
    profile_role text,
    source_app public.app_kind,
    subscription_tier text,
    custom_quota_override int,
    created_at timestamptz,
    last_login_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin access required'; END IF;
  RETURN QUERY
  SELECT 
    h.user_id,
    h.handle,
    COALESCE(p.role, 'patient'),
    p.source_app,
    COALESCE(p.subscription_tier, 'free') AS subscription_tier,
    p.custom_quota_override,
    h.created_at,
    h.last_login_at
  FROM private.account_handles h
  LEFT JOIN public.app_profiles p ON p.user_id = h.user_id
  WHERE search_text = '' OR h.handle ILIKE '%' || search_text || '%'
  ORDER BY h.created_at DESC
  LIMIT LEAST(GREATEST(row_limit, 1), 200) OFFSET GREATEST(row_offset, 0);
END;
$$;

---------------------------------------------------------
-- 6. GRANTS
---------------------------------------------------------

GRANT EXECUTE ON FUNCTION public.check_user_agent_quota(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_user_agent_quota_by_handle(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_user_subscription(UUID, TEXT, INT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_list_accounts(text, integer, integer) TO authenticated, service_role;

COMMIT;
